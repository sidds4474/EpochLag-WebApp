"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { OnboardingShell } from "../../../lib/onboarding/components/OnboardingShell";
import { CountryPicker } from "../../../components/auth/CountryPicker";
import { ApiError } from "../../../lib/api/client";
import { useAuth } from "../../../lib/auth/AuthProvider";
import {
  registerUser,
  resolveReferralCode,
  redeemReferralCode,
  phoneStart,
  type ReferralResolveResult,
} from "../../../lib/auth/api";
import { parsePhoneInput } from "../../../lib/auth/parsePhoneInput";
import {
  peekAnonId,
  setStoredReferralCode,
  getStoredReferralCode,
  clearStoredReferralCode,
} from "../../../lib/onboarding/storage/localStore";
import { postLoginSync } from "../../../lib/auth/postLoginSync";
import { trackOnboarding } from "../../../lib/analytics/track";
import { useAppDispatch } from "../../../lib/onboarding/store";
import { runAnonMergeSync } from "../../../lib/onboarding/merge/runAnonMergeSync";
import { queueAnonMergeIfNeeded } from "../../../lib/onboarding/merge/queueAnonMergeIfNeeded";

type Mode = "phone" | "social";

export default function CreateAccountPage() {
  return (
    <Suspense fallback={null}>
      <CreateAccountContent />
    </Suspense>
  );
}

function CreateAccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { user, applyAuth } = useAuth();

  const mode = (searchParams?.get("mode") || "phone") as Mode;
  const phoneVerifyToken = searchParams?.get("phoneVerifyToken") || "";
  const initialPhone = searchParams?.get("phone") || "";
  const initialCountryCode = searchParams?.get("countryCode") || "+1";

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [dob, setDob] = useState(user?.dateOfBirth?.slice(0, 10) || "");
  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const [phone, setPhone] = useState(initialPhone);
  const [referralInput, setReferralInput] = useState("");
  const [referralResult, setReferralResult] =
    useState<ReferralResolveResult | null>(null);
  const [referralBusy, setReferralBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cached = getStoredReferralCode();
    if (cached && !referralInput) setReferralInput(cached);
  }, [referralInput]);

  const phoneLocked = mode === "phone"; // came from VerifyOtp already verified

  const validateReferral = async () => {
    setReferralResult(null);
    const raw = referralInput.trim().toUpperCase();
    if (!raw) return;
    setReferralBusy(true);
    try {
      const res = await resolveReferralCode(raw);
      setReferralResult(res);
      if (res.valid && res.code) {
        setReferralInput(res.code);
        setStoredReferralCode(res.code);
      }
    } catch (e) {
      setReferralResult({
        valid: false,
        message: e instanceof ApiError ? e.message : "Invalid code",
      });
    } finally {
      setReferralBusy(false);
    }
  };

  const submit = async () => {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your full name");
      return;
    }
    if (!dob) {
      setError("Please select your date of birth");
      return;
    }

    // Normalize phone.
    let cc = countryCode;
    let digits = phone.replace(/[\s\-().]/g, "");
    if (phone.startsWith("+")) {
      const parsed = parsePhoneInput(phone);
      if (parsed) {
        cc = parsed.countryCode;
        digits = parsed.phone;
      }
    }
    if (!/^\d{6,15}$/.test(digits)) {
      setError("Please enter a valid phone number");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "phone") {
        const anonId = peekAnonId() || undefined;
        const { token, user: registered } = await registerUser({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          dateOfBirth: dob,
          countryCode: cc,
          phone: digits,
          phoneVerifyToken,
          anonId,
        });
        if (token && registered) {
          applyAuth(token, registered);
          await postLoginSync({ profile: registered });
        }
        trackOnboarding("phone_signup_completed");

        // Redeem referral silently (phone/email path pattern — not inline).
        const storedRef = getStoredReferralCode();
        if (storedRef) {
          try {
            await redeemReferralCode(storedRef);
          } catch {}
          clearStoredReferralCode();
        }

        // Fire merge inline, fall back to deferred queue.
        try {
          await dispatch(runAnonMergeSync({ source: "phone" }));
        } catch {
          try {
            await dispatch(
              queueAnonMergeIfNeeded({ source: "CreateAccount/phone" })
            );
          } catch {}
        }
        router.replace("/home");
        return;
      }

      // Social mode — just kick off phone/start, then route to VerifyOtp
      // in social-finalize mode. VerifyOtp handles the /social/finalize call.
      await phoneStart(cc, digits);
      trackOnboarding("phone_otp_requested", { countryCode: cc });
      const params = new URLSearchParams({
        mode: "social-finalize",
        phone: digits,
        countryCode: cc,
        dateOfBirth: dob,
      });
      router.push(`/verify-otp?${params.toString()}`);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const referralCard = (
    <div
      className="w-full rounded-[14px] p-[16px]"
      style={{ backgroundColor: "#F8E2C6" }}
    >
      <label className="font-montserrat font-semibold text-[13px] text-primary-blue">
        Referral code
      </label>
      <div className="mt-[8px] flex items-center gap-[8px] bg-primary-white rounded-full pl-[4px] pr-[4px] py-[4px]">
        <input
          type="text"
          value={referralInput}
          onChange={(e) => {
            setReferralInput(e.target.value.toUpperCase());
            setReferralResult(null);
          }}
          placeholder="Enter Code"
          className="flex-1 pl-[14px] py-[8px] font-montserrat text-[14px] text-primary-blue placeholder:text-primary-blue/40 outline-none bg-transparent"
        />
        <button
          type="button"
          onClick={validateReferral}
          disabled={referralBusy || !referralInput.trim()}
          className="h-[36px] px-[18px] rounded-full bg-primary-orange text-primary-white font-montserrat font-semibold text-[13px] cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Validate
        </button>
      </div>
      {referralResult && referralResult.valid && (
        <p className="mt-[8px] font-montserrat text-[12px] text-[#2E7D32]">
          ✓ Code successfully applied
          {referralResult.bonusDays
            ? ` — enjoy ${referralResult.bonusDays} bonus days`
            : ""}
        </p>
      )}
      {referralResult && !referralResult.valid && (
        <p className="mt-[8px] font-montserrat text-[12px] text-[#C0392B]">
          × {referralResult.message || "Invalid code"}
        </p>
      )}
    </div>
  );

  const bodyContent = (
    <div className="w-full flex flex-col text-primary-blue">
      <h1 className="font-montserrat font-bold text-[22px] text-center leading-[130%]">
        Create an account to save your Lag
      </h1>

      <FieldLabel>Full Name</FieldLabel>
      <div className="mt-[8px] grid grid-cols-1 md:grid-cols-2 gap-[10px]">
        <TextInput
          value={firstName}
          onChange={setFirstName}
          placeholder="First Name"
        />
        <TextInput
          value={lastName}
          onChange={setLastName}
          placeholder="Last Name"
        />
      </div>

      <div className="mt-[16px] grid grid-cols-1 md:grid-cols-2 gap-[16px]">
        <div>
          <FieldLabel>Date of Birth</FieldLabel>
          <div className="mt-[8px]">
            <DateInput value={dob} onChange={setDob} />
          </div>
        </div>
        <div>
          <FieldLabel>Phone Number</FieldLabel>
          <div className="mt-[8px] flex items-center gap-[8px]">
            <CountryPicker
              value={countryCode}
              onChange={setCountryCode}
              showChevron={!phoneLocked}
            />
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="123 456 6780"
              disabled={phoneLocked}
              className="flex-1 bg-primary-white rounded-full h-[48px] px-[16px] font-montserrat text-[14px] text-primary-blue placeholder:text-primary-blue/40 outline-none shadow-[0_4px_14px_rgba(9,46,74,0.05)] disabled:opacity-70"
            />
          </div>
        </div>
      </div>

      <div className="mt-[20px]">{referralCard}</div>

      <p className="mt-[16px] font-montserrat text-[12px] text-primary-blue/80 text-center leading-[160%]">
        By selecting <strong>agree and continue</strong> I agree to Epoch Lag&apos;s{" "}
        <Link href="/terms-of-service" className="underline">
          terms of services
        </Link>{" "}
        and{" "}
        <Link href="/privacy-policy" className="underline">
          privacy policy
        </Link>
      </p>

      {error && (
        <p className="mt-[10px] font-montserrat text-[13px] text-[#C0392B] text-center">
          {error}
        </p>
      )}

      <div className="mt-[16px] flex justify-center">
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="w-[220px] h-[46px] cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[15px] rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Working…" : "Agree and Continue"}
        </button>
      </div>
    </div>
  );

  const validReferralUsed = useMemo(
    () => referralResult?.valid || false,
    [referralResult]
  );
  void validReferralUsed;

  return (
    <OnboardingShell
      hideDesktopNext
      hideMobileNext
      desktopContent={
        <div className="w-full flex flex-col items-center justify-center min-h-[78vh] lg:min-h-0 py-[24px]">
          <div className="w-full max-w-[520px]">{bodyContent}</div>
        </div>
      }
      mobileContent={
        <div className="flex flex-col min-h-screen px-[24px] pt-[24px] pb-[48px] text-primary-blue">
          <div className="w-full flex-1 flex items-center">
            <div className="w-full">{bodyContent}</div>
          </div>
        </div>
      }
    />
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mt-[16px] font-montserrat font-semibold text-[13px] text-primary-blue">
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-primary-white rounded-full h-[48px] px-[16px] font-montserrat text-[14px] text-primary-blue placeholder:text-primary-blue/40 outline-none shadow-[0_4px_14px_rgba(9,46,74,0.05)]"
    />
  );
}

function DateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        max={new Date().toISOString().slice(0, 10)}
        className="w-full bg-primary-white rounded-full h-[48px] pl-[16px] pr-[42px] font-montserrat text-[14px] text-primary-blue outline-none shadow-[0_4px_14px_rgba(9,46,74,0.05)]"
      />
      <svg
        aria-hidden
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        className="absolute right-[16px] top-1/2 -translate-y-1/2 text-primary-blue/60 pointer-events-none"
      >
        <rect
          x="3"
          y="5"
          width="18"
          height="16"
          rx="2"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M3 9h18M8 3v4M16 3v4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
