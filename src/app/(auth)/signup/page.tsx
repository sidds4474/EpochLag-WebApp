"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { CountryPicker } from "../../../components/auth/CountryPicker";
import DecorativePolaroids from "../../../components/auth/DecorativePolaroids";
import { ApiError } from "../../../lib/api/client";
import { useAuth } from "../../../lib/auth/AuthProvider";
import {
  phoneStart,
  loginWithGoogle,
} from "../../../lib/auth/api";
import { parsePhoneInput } from "../../../lib/auth/parsePhoneInput";
import { postLoginSync } from "../../../lib/auth/postLoginSync";
import { trackOnboarding } from "../../../lib/analytics/track";
import { useAppDispatch } from "../../../lib/onboarding/store";
import { queueAnonMergeIfNeeded } from "../../../lib/onboarding/merge/queueAnonMergeIfNeeded";
import { setPendingReturnTo, clearPendingReturnTo } from "../../../lib/auth/pendingReturnTo";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const TITLE_LINES = ["Create an account to", "save your Lag"];

type GoogleCredentialResponse = { credential: string };

function decodeJwtPayload(jwt: string): {
  email?: string;
  given_name?: string;
  family_name?: string;
} | null {
  const parts = jwt.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json =
      typeof window === "undefined"
        ? Buffer.from(padded, "base64").toString("utf-8")
        : decodeURIComponent(
            atob(padded)
              .split("")
              .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
              .join("")
          );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Only accept same-origin relative paths — guards against open-redirect attacks
// where a crafted `?returnTo=https://evil.com` could hijack the post-signup
// navigation.
function safeReturnTo(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export default function SignupPage() {
  // Suspense wrapper: useSearchParams in a client component bails out of
  // Next 15 static prerendering unless its subtree is wrapped in Suspense.
  return (
    <Suspense fallback={null}>
      <SignupPageInner />
    </Suspense>
  );
}

function SignupPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams?.get("returnTo") ?? null);
  const dispatch = useAppDispatch();
  const { status, applyAuth } = useAuth();
  const [countryCode, setCountryCode] = useState("+1");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  // Two refs — mobileContent and desktopContent both render FormBody in
  // separate subtrees. A single ref would only point at whichever one
  // React resolved last, leaving the other slot empty.
  const googleBtnMobileRef = useRef<HTMLDivElement | null>(null);
  const googleBtnDesktopRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (status === "authenticated") router.replace(returnTo || "/home");
  }, [status, router, returnTo]);

  useEffect(() => {
    trackOnboarding("signup_screen_viewed");
  }, []);

  // Persist returnTo so the long new-user onboarding chain can consume it at
  // its terminal redirect (/onboarding/complete) without URL plumbing through
  // every intermediate screen. Also clear any stale entry when a signup starts
  // without an explicit returnTo (otherwise a previous session's intent could
  // bounce this user unexpectedly after onboarding).
  useEffect(() => {
    if (returnTo) setPendingReturnTo(returnTo);
    else clearPendingReturnTo();
  }, [returnTo]);

  const handleGoogleCredential = useCallback(
    async ({ credential }: GoogleCredentialResponse) => {
      setError(null);
      setGoogleBusy(true);
      try {
        const decoded = decodeJwtPayload(credential);
        const { token, user, newRegistration } = await loginWithGoogle({
          idToken: credential,
          email: decoded?.email,
          firstName: decoded?.given_name,
          lastName: decoded?.family_name,
        });
        if (newRegistration) {
          applyAuth(token, user);
          // If signup was initiated with a returnTo, honor it — the user came
          // from a specific context (e.g. public story) and expects to land back
          // there. Full onboarding (DOB, etc.) can be nudged later.
          if (returnTo) {
            router.replace(returnTo);
            return;
          }
          // Match mobile: skip CreateAccount only if Google gave us DOB.
          // (Downstream lands at AddRelationship — routes to /home for now.)
          if (user.dateOfBirth) {
            router.replace("/home");
          } else {
            router.replace("/onboarding/create-account?mode=social");
          }
          return;
        }
        await postLoginSync({ profile: user });
        applyAuth(token, user);
        try {
          await dispatch(queueAnonMergeIfNeeded({ source: "SignupScreen/google" }));
        } catch {}
        router.replace(returnTo || "/home");
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : "Google sign-in failed.";
        setError(msg);
      } finally {
        setGoogleBusy(false);
      }
    },
    [applyAuth, dispatch, router, returnTo]
  );

  useEffect(() => {
    if (typeof window !== "undefined" && window.google?.accounts?.id) {
      setGoogleReady(true);
    }
  }, []);

  useEffect(() => {
    if (!googleReady) return;
    if (!window.google?.accounts?.id) return;
    if (!GOOGLE_CLIENT_ID) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
    });
    const renderInto = (el: HTMLDivElement | null) => {
      if (!el) return;
      el.innerHTML = "";
      window.google!.accounts.id.renderButton(el, {
        theme: "outline",
        size: "large",
        type: "standard",
        shape: "pill",
        text: "signup_with",
        logo_alignment: "center",
        width: 260,
      });
    };
    renderInto(googleBtnMobileRef.current);
    renderInto(googleBtnDesktopRef.current);
  }, [googleReady, handleGoogleCredential]);

  const handleSubmit = async () => {
    setError(null);
    const raw = phone.trim();
    if (!raw) {
      setError("Please enter your phone number");
      return;
    }
    // parsePhoneInput takes priority: if user pasted "+CC number", parsed CC wins.
    let cc = countryCode;
    let digits: string;
    const parsed = parsePhoneInput(raw);
    if (parsed) {
      cc = parsed.countryCode;
      digits = parsed.phone;
    } else {
      digits = raw.replace(/[\s\-().]/g, "");
    }
    if (!/^\d{6,15}$/.test(digits)) {
      setError("Please enter a valid phone number");
      return;
    }
    setSubmitting(true);
    try {
      await phoneStart(cc, digits);
      trackOnboarding("phone_otp_requested", { countryCode: cc });
      const params = new URLSearchParams({
        mode: "phone",
        phone: digits,
        countryCode: cc,
      });
      if (returnTo) params.set("returnTo", returnTo);
      router.push(`/verify-otp?${params.toString()}`);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Couldn't send the code. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // FormBody is mounted twice (mobileContent + desktopContent).
  // Sharing a single ref would let one mount clobber the other.
  const formCommon = {
    countryCode,
    onCountryCode: setCountryCode,
    phone,
    onPhone: setPhone,
    error,
    submitting,
    googleBusy,
    googleReady: googleReady && !!GOOGLE_CLIENT_ID,
    onSubmit: handleSubmit,
  };
  const mobileForm = (
    <FormBody {...formCommon} googleBtnRef={googleBtnMobileRef} />
  );
  const desktopForm = (
    <FormBody {...formCommon} googleBtnRef={googleBtnDesktopRef} />
  );

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => {
          const check = () => {
            if (window.google?.accounts?.id) setGoogleReady(true);
            else setTimeout(check, 100);
          };
          check();
        }}
      />
      <div className="fixed inset-0 z-40 bg-[#F3F1EB] overflow-hidden">
        {/* Decorative polaroids — desktop (lg+) only */}
        <DecorativePolaroids />

        {/* Mobile back chip */}
        <div className="md:hidden absolute top-[max(env(safe-area-inset-top),16px)] left-[16px] z-20">
          <BackChip onClick={() => router.back()} inline />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center px-[24px] overflow-y-auto py-[48px]"
        >
          <div className="w-full max-w-[380px] flex flex-col items-center md:hidden">
            {mobileForm}
          </div>
          <div className="w-full max-w-[380px] hidden md:flex flex-col items-center">
            {desktopForm}
          </div>
        </motion.div>
      </div>
    </>
  );
}

function FormBody({
  countryCode,
  onCountryCode,
  phone,
  onPhone,
  error,
  submitting,
  googleBusy,
  googleReady,
  onSubmit,
  googleBtnRef,
}: {
  countryCode: string;
  onCountryCode: (v: string) => void;
  phone: string;
  onPhone: (v: string) => void;
  error: string | null;
  submitting: boolean;
  googleBusy: boolean;
  googleReady: boolean;
  onSubmit: () => void;
  googleBtnRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <>
      <RingDot />
      <h1 className="mt-[16px] font-ivy font-normal text-[22px] md:text-[24px] text-[#232323] text-center leading-[1.3]">
        Sign up
      </h1>

      <div className="mt-[20px] w-full flex items-center gap-[10px]">
        <CountryPicker
          value={countryCode}
          onChange={onCountryCode}
          showChevron={false}
        />
        <input
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => onPhone(e.target.value)}
          placeholder="Phone number"
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
          }}
          className="flex-1 bg-primary-white rounded-full h-[48px] px-[18px] font-montserrat text-[15px] text-primary-blue placeholder:text-primary-blue/40 outline-none shadow-[0_4px_14px_rgba(9,46,74,0.05)]"
        />
      </div>

      {error && (
        <p className="mt-[10px] w-full font-montserrat text-[12px] text-[#C0392B] text-left">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        className="mt-[16px] w-full h-[50px] cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[16px] rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Sending code…" : "Submit"}
      </button>

      <div className="mt-[24px] w-full flex items-center gap-[12px]">
        <div className="flex-1 h-px bg-[#2c2c2c]/15" />
        <span className="font-montserrat text-[14px] text-[#2c2c2c]/60">
          or
        </span>
        <div className="flex-1 h-px bg-[#2c2c2c]/15" />
      </div>

      <div
        ref={googleBtnRef}
        aria-label="Continue with Google"
        className={`mt-[16px] flex items-center justify-center transition-opacity ${
          !googleReady || googleBusy ? "opacity-50 pointer-events-none" : ""
        }`}
        style={{ minHeight: 44 }}
      />
    </>
  );
}

function BackChip({ onClick }: { onClick: () => void; inline?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Back"
      className="h-[36px] w-[36px] rounded-full bg-white flex items-center justify-center text-[#232323] shadow-[0_2px_8px_rgba(0,0,0,0.08)] cursor-pointer hover:bg-black/[0.02] transition-colors"
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

function RingDot() {
  return (
    <img
      src="/onboarding/Logo.svg"
      alt=""
      className="h-[72px] w-[72px] object-contain"
    />
  );
}
