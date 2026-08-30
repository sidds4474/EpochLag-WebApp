"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OnboardingShell } from "../../../lib/onboarding/components/OnboardingShell";
import { OtpInput } from "../../../components/auth/OtpInput";
import { ApiError } from "../../../lib/api/client";
import { useAuth } from "../../../lib/auth/AuthProvider";
import {
  phoneStart,
  phoneVerify,
  socialFinalize,
  verifyOtp as verifyEmailOtp,
  resendOtp,
  redeemReferralCode,
} from "../../../lib/auth/api";
import { peekAnonId } from "../../../lib/onboarding/storage/localStore";
import {
  getStoredReferralCode,
  clearStoredReferralCode,
} from "../../../lib/onboarding/storage/localStore";
import { postLoginSync } from "../../../lib/auth/postLoginSync";
import { trackOnboarding } from "../../../lib/analytics/track";
import { useAppDispatch } from "../../../lib/onboarding/store";
import { runAnonMergeSync } from "../../../lib/onboarding/merge/runAnonMergeSync";
import { queueAnonMergeIfNeeded } from "../../../lib/onboarding/merge/queueAnonMergeIfNeeded";

type Mode = "phone" | "email" | "social-finalize";

const RESEND_SECONDS = 60;

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpContent />
    </Suspense>
  );
}

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { applyAuth } = useAuth();

  const mode = (searchParams?.get("mode") || "email") as Mode;
  const phone = searchParams?.get("phone") || "";
  const countryCode = searchParams?.get("countryCode") || "";
  const email = searchParams?.get("email") || "";
  const dateOfBirth = searchParams?.get("dateOfBirth") || "";

  const otpLength = mode === "email" ? 5 : 6;
  const identifierLabel =
    mode === "email" ? email : `${countryCode} ${phone}`;

  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(RESEND_SECONDS);
  const [phoneTaken, setPhoneTaken] = useState(false);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = window.setTimeout(() => setResendTimer((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendTimer]);

  useEffect(() => {
    setCode("");
    setError(null);
    setPhoneTaken(false);
  }, [mode, phone, countryCode, email]);

  const finishAsAuthedUser = useCallback(
    async (token: string, user: import("../../../types/user").User) => {
      applyAuth(token, user);
      await postLoginSync({ profile: user });
      trackOnboarding("otp_verified", { mode });
      // Kick anon merge inline; fall back to deferred on failure.
      let mergeResult: Awaited<
        ReturnType<ReturnType<typeof runAnonMergeSync>>
      > = null;
      try {
        mergeResult = await dispatch(
          runAnonMergeSync({
            source: mode === "email" ? "email" : "phone",
          })
        );
      } catch {}
      if (!mergeResult) {
        try {
          await dispatch(
            queueAnonMergeIfNeeded({ source: `VerifyOtp/${mode}` })
          );
        } catch {}
      }
      // ShareLag / AddRelationship not yet on web — land at /home for now.
      router.replace("/home");
    },
    [applyAuth, dispatch, mode, router]
  );

  const submit = async () => {
    if (submitting) return;
    if (code.length !== otpLength) {
      setError("Please enter the full code");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "email") {
        const { token, user } = await verifyEmailOtp(email, code);
        applyAuth(token, user);
        await postLoginSync({ profile: user });
        trackOnboarding("otp_verified", { mode });
        // v4 email path: redeem referral silently, then go to AddRelationship.
        const storedRef = getStoredReferralCode();
        if (storedRef) {
          try {
            await redeemReferralCode(storedRef);
          } catch {}
          clearStoredReferralCode();
        }
        router.replace("/home");
        return;
      }

      // Phone / social-finalize both call phoneVerify first.
      const res = await phoneVerify(countryCode, phone, code);

      if (mode === "phone") {
        if (res.kind === "existing") {
          await finishAsAuthedUser(res.token, res.user);
          return;
        }
        if (res.kind === "new") {
          const params = new URLSearchParams({
            mode: "phone",
            phone,
            countryCode,
            phoneVerifyToken: res.phoneVerifyToken,
          });
          router.replace(`/onboarding/create-account?${params.toString()}`);
          return;
        }
        if (res.kind === "archived") {
          setError(
            "This account was deleted. Contact support if you believe this is an error."
          );
          setTimeout(() => router.replace("/login"), 3000);
          return;
        }
      }

      // Social-finalize mode.
      if (mode === "social-finalize") {
        if (res.kind === "existing") {
          setPhoneTaken(true);
          return;
        }
        if (res.kind === "archived") {
          setError(
            "This account was deleted. Contact support if you believe this is an error."
          );
          setTimeout(() => router.replace("/login"), 3000);
          return;
        }
        if (res.kind === "new") {
          const anonId = peekAnonId() || undefined;
          const referralCode = getStoredReferralCode() || undefined;
          const user = await socialFinalize({
            countryCode,
            phone,
            dateOfBirth,
            phoneVerifyToken: res.phoneVerifyToken,
            anonId,
            referralCode,
          });
          // We're already authed from earlier Google/Apple callback — just
          // update the cached user.
          // (Token is untouched.)
          trackOnboarding("social_finalize_completed");
          // Best-effort merge.
          try {
            await dispatch(
              runAnonMergeSync({ source: "google" })
            );
          } catch {}
          if (referralCode) clearStoredReferralCode();
          // Refresh cached user via applyAuth using a re-fetch? For now
          // just route home.
          void user;
          router.replace("/home");
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const bodyCode =
          (err.data as { code?: string } | null)?.code || undefined;
        if (bodyCode === "PHONE_VERIFY_TOKEN_INVALID") {
          // Auto-resend inline rather than kick back to CreateAccount.
          try {
            await phoneStart(countryCode, phone);
            setResendTimer(RESEND_SECONDS);
            setNotice("Sent a fresh code");
            setCode("");
          } catch {
            setError("Session expired. Please try again.");
          }
          return;
        }
        if (bodyCode === "PHONE_ALREADY_REGISTERED") {
          setPhoneTaken(true);
          return;
        }
        if (
          err.status === 400 ||
          err.status === 401 ||
          /invalid|incorrect|expired|already used/i.test(err.message)
        ) {
          setError("Incorrect or expired code. Try again or send a new one.");
          return;
        }
        setError(err.message || "Something went wrong. Please try again.");
        return;
      }
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError(null);
    setNotice(null);
    try {
      if (mode === "email") {
        await resendOtp(email);
      } else {
        await phoneStart(countryCode, phone);
      }
      setResendTimer(RESEND_SECONDS);
      setNotice("Sent a new code");
      setCode("");
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Couldn't send a new code. Try again in a moment.";
      setError(msg);
    }
  };

  const handleLogInInstead = () => {
    // Sign out of prior social auth, go to LoginScreen.
    try {
      window.localStorage.removeItem("epochlag.token");
      window.localStorage.removeItem("epochlag.user");
    } catch {}
    router.replace("/login");
  };

  const handleUseDifferentNumber = () => {
    router.replace("/onboarding/create-account?mode=social");
  };

  const content = (
    <div className="w-full flex flex-col items-center max-w-[420px]">
      <h1 className="font-montserrat font-bold text-[22px] text-primary-blue text-center">
        {mode === "email" ? "Verify Email" : "Verify Phone Number"}
      </h1>
      <p className="mt-[6px] font-montserrat text-[14px] text-primary-blue/80 text-center">
        Enter the OTP sent to <strong>{identifierLabel}</strong>
      </p>

      <div className="mt-[28px]">
        <OtpInput
          length={otpLength}
          value={code}
          onChange={setCode}
          onComplete={() => submit()}
        />
      </div>

      {phoneTaken && (
        <div
          className="mt-[20px] w-full rounded-[16px] p-[16px]"
          style={{ backgroundColor: "#F8E2C6" }}
        >
          <p className="font-montserrat font-semibold text-[14px] text-primary-blue text-center leading-[150%]">
            This number is already registered
            <br />
            to another account.
          </p>
          <div className="mt-[12px] flex flex-col items-center gap-[8px]">
            <button
              type="button"
              onClick={handleLogInInstead}
              className="font-montserrat font-bold text-[14px] text-primary-blue underline cursor-pointer"
            >
              Log in instead
            </button>
            <button
              type="button"
              onClick={handleUseDifferentNumber}
              className="font-montserrat text-[14px] text-primary-blue underline cursor-pointer"
            >
              Use a different number
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-[12px] font-montserrat text-[13px] text-[#C0392B] text-center">
          {error}
        </p>
      )}

      {notice && !error && (
        <p className="mt-[12px] font-montserrat text-[13px] text-primary-blue/70 text-center">
          {notice}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={submitting || code.length !== otpLength}
        className="mt-[20px] w-full h-[50px] cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[16px] rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Verifying…" : "Submit"}
      </button>

      <p className="mt-[16px] font-montserrat text-[13px] text-primary-blue/70 text-center">
        Didn&apos;t get it?{" "}
        {resendTimer > 0 ? (
          <span className="text-primary-blue/40">
            Send a new code ({formatTimer(resendTimer)})
          </span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            className="text-primary-blue font-semibold underline cursor-pointer"
          >
            Send a new code
          </button>
        )}
      </p>
    </div>
  );

  return (
    <OnboardingShell
      hideDesktopNext
      hideMobileNext
      desktopContent={
        <div className="w-full flex flex-col items-center justify-center min-h-[78vh] lg:min-h-0">
          {content}
        </div>
      }
      mobileContent={
        <div className="flex flex-col min-h-screen px-[24px] pt-[24px] pb-[48px] text-primary-blue">
          <BackChip onClick={() => router.back()} />
          <div className="flex-1 flex flex-col items-center justify-center">
            {content}
          </div>
        </div>
      }
    />
  );
}

function BackChip({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Back"
      className="self-start h-[40px] w-[40px] rounded-full bg-primary-white flex items-center justify-center text-primary-blue shadow-[0_2px_8px_rgba(9,46,74,0.08)] cursor-pointer hover:bg-primary-white/85"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path
          d="M15 6l-6 6 6 6"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function formatTimer(s: number): string {
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
