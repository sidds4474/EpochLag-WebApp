"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { OnboardingShell } from "../../../lib/onboarding/components/OnboardingShell";
import { CountryPicker } from "../../../components/auth/CountryPicker";
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

export default function SignupPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { status, applyAuth } = useAuth();
  const [countryCode, setCountryCode] = useState("+1");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const hiddenGoogleBtnRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (status === "authenticated") router.replace("/home");
  }, [status, router]);

  useEffect(() => {
    trackOnboarding("signup_screen_viewed");
  }, []);

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
        router.replace("/home");
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : "Google sign-in failed.";
        setError(msg);
      } finally {
        setGoogleBusy(false);
      }
    },
    [applyAuth, dispatch, router]
  );

  useEffect(() => {
    if (typeof window !== "undefined" && window.google) setGoogleReady(true);
  }, []);

  useEffect(() => {
    if (!googleReady || !hiddenGoogleBtnRef.current || !window.google) return;
    if (!GOOGLE_CLIENT_ID) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
    });
    hiddenGoogleBtnRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(hiddenGoogleBtnRef.current, {
      theme: "outline",
      size: "large",
      type: "standard",
      shape: "rectangular",
      text: "signup_with",
      width: 240,
    });
  }, [googleReady, handleGoogleCredential]);

  const triggerGoogle = () => {
    const btn = hiddenGoogleBtnRef.current?.querySelector<HTMLElement>(
      'div[role="button"]'
    );
    btn?.click();
  };

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

  const content = (
    <FormBody
      countryCode={countryCode}
      onCountryCode={setCountryCode}
      phone={phone}
      onPhone={setPhone}
      error={error}
      submitting={submitting}
      googleBusy={googleBusy}
      googleReady={googleReady && !!GOOGLE_CLIENT_ID}
      onSubmit={handleSubmit}
      onGoogle={triggerGoogle}
    />
  );

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGoogleReady(true)}
      />
      <div
        ref={hiddenGoogleBtnRef}
        aria-hidden
        style={{
          position: "absolute",
          left: "-9999px",
          top: "-9999px",
          opacity: 0,
          pointerEvents: "none",
        }}
      />
      <OnboardingShell
        hideDesktopNext
        hideMobileNext
        desktopContent={
          <div className="relative w-full flex flex-col items-center justify-center min-h-[78vh] lg:min-h-0">
            <div className="w-full max-w-[400px] flex flex-col items-center">
              {content}
            </div>
          </div>
        }
        mobileContent={
          <div className="flex flex-col min-h-screen px-[24px] pt-[24px] pb-[48px] text-primary-blue">
            <BackChip onClick={() => router.back()} inline />
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-full max-w-[420px] flex flex-col items-center">
                {content}
              </div>
            </div>
          </div>
        }
      />
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
  onGoogle,
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
  onGoogle: () => void;
}) {
  return (
    <>
      <RingDot />
      <h1 className="mt-[24px] font-montserrat font-bold text-[24px] text-primary-blue text-center leading-[130%]">
        {TITLE_LINES[0]}
        <br />
        {TITLE_LINES[1]}
      </h1>

      <div className="mt-[32px] w-full flex items-center gap-[10px]">
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
        <div className="flex-1 h-px bg-primary-blue/15" />
        <span className="font-montserrat text-[14px] text-primary-blue/60">
          or
        </span>
        <div className="flex-1 h-px bg-primary-blue/15" />
      </div>

      <button
        type="button"
        onClick={onGoogle}
        disabled={!googleReady || googleBusy}
        aria-label="Continue with Google"
        className="mt-[16px] h-[56px] w-[56px] bg-primary-white rounded-[14px] flex items-center justify-center shadow-[0_4px_14px_rgba(9,46,74,0.06)] cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <GoogleGlyph />
      </button>
    </>
  );
}

function BackChip({
  onClick,
  inline = false,
}: {
  onClick: () => void;
  inline?: boolean;
}) {
  const positionClass = inline
    ? "self-start"
    : "absolute top-[16px] left-[16px]";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Back"
      className={`${positionClass} h-[40px] w-[40px] rounded-full bg-primary-white flex items-center justify-center text-primary-blue shadow-[0_2px_8px_rgba(9,46,74,0.08)] cursor-pointer hover:bg-primary-white/85`}
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
      className="h-[64px] w-[64px] object-contain"
    />
  );
}

function GoogleGlyph() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.12c-.22-.66-.35-1.36-.35-2.12s.13-1.46.35-2.12V7.04H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.96l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
        fill="#EA4335"
      />
    </svg>
  );
}
