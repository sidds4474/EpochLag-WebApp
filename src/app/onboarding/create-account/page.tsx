"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
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
  const [email, setEmail] = useState(user?.email || "");
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
    const raw = referralInput.trim();
    if (!raw) return;
    setReferralBusy(true);
    try {
      const res = await resolveReferralCode(raw);
      setReferralResult(res);
      if (res.valid && res.code) {
        // Replace the field with the canonical code (doc §3a) but do NOT
        // persist manual entries to localStorage — a partial signup would
        // leave the code sitting there and auto-prefill on the next visit.
        // Deep-link entries (/r/CODE) are stored by that flow instead.
        setReferralInput(res.code);
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

    // Phone mode requires email; social mode already has email from Google.
    const emailNormalized = email.trim().toLowerCase();
    if (mode === "phone") {
      if (!/^\S+@\S+\.\S+$/.test(emailNormalized)) {
        setError("Please enter a valid email address");
        return;
      }
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
          email: emailNormalized,
          dateOfBirth: dob,
          countryCode: cc,
          phone: digits,
          phoneVerifyToken,
          anonId,
        });
        if (!token || !registered) {
          setError(
            "Account created but sign-in failed. Please log in with your phone."
          );
          setTimeout(() => router.replace("/login"), 1500);
          return;
        }
        applyAuth(token, registered);
        await postLoginSync({ profile: registered });
        trackOnboarding("phone_signup_completed");

        // Redeem referral silently. Prefer the in-form value the user
        // just validated; fall back to a deep-link stored code.
        const refToRedeem =
          referralInput.trim() || getStoredReferralCode() || "";
        if (refToRedeem) {
          try {
            await redeemReferralCode(refToRedeem);
          } catch {}
          clearStoredReferralCode();
        }

        // Fire merge inline. runAnonMergeSync returns null on failure (not
        // throw), so check the return value and queue for the deferred
        // orchestrator to retry when possible.
        let mergeResult: Awaited<
          ReturnType<ReturnType<typeof runAnonMergeSync>>
        > = null;
        try {
          mergeResult = await dispatch(runAnonMergeSync({ source: "phone" }));
        } catch {}
        if (!mergeResult) {
          try {
            await dispatch(
              queueAnonMergeIfNeeded({ source: "CreateAccount/phone" })
            );
          } catch {}
          router.replace("/onboarding/add-relationship");
          return;
        }
        const params = new URLSearchParams({ postSignup: "1" });
        if (mergeResult.threadId)
          params.set("storyThreadId", mergeResult.threadId);
        if (mergeResult.publicCode)
          params.set("publicCode", mergeResult.publicCode);
        router.replace(`/onboarding/share-lag?${params.toString()}`);
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
      // Carry the manually-entered referral through to social-finalize
      // (verify-otp) via URL — we no longer persist to localStorage.
      const manualRef = referralInput.trim();
      if (manualRef) params.set("referralCode", manualRef);
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
            setReferralInput(e.target.value);
            setReferralResult(null);
          }}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
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
          {/* Doc §3a: render `message` verbatim — trial and bonus length
              live server-side, so hard-coded copy silently desyncs. */}
          ✓ {referralResult.message || "Code successfully applied"}
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

      <div className="mt-[16px]">
        <FieldLabel>Date of Birth</FieldLabel>
        <div className="mt-[8px]">
          <DateInput value={dob} onChange={setDob} />
        </div>
      </div>

      {mode === "phone" ? (
        <div className="mt-[16px]">
          <FieldLabel>Email</FieldLabel>
          <div className="mt-[8px] relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="email"
              className="w-full bg-primary-white rounded-full h-[48px] pl-[16px] pr-[44px] font-montserrat text-[14px] text-primary-blue placeholder:text-primary-blue/40 outline-none shadow-[0_4px_14px_rgba(9,46,74,0.05)]"
            />
            <MailIconSvg />
          </div>
        </div>
      ) : (
        <div className="mt-[16px]">
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
      )}

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

const DOB_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DOB_DAY_HEADERS = ["m", "t", "w", "t", "f", "s", "s"];

function DateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  // value shape: YYYY-MM-DD (matches server contract).
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const label = value ? formatDobLabel(value) : "dd/mm/yyyy";
  const isPlaceholder = !value;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full bg-primary-white rounded-full h-[48px] pl-[16px] pr-[42px] text-left font-montserrat text-[14px] outline-none shadow-[0_4px_14px_rgba(9,46,74,0.05)] cursor-pointer ${
          isPlaceholder ? "text-primary-blue/40" : "text-primary-blue"
        }`}
      >
        {label}
      </button>
      <CalendarIconSvg />
      {open && (
        <div className="absolute left-0 right-0 mt-[8px] z-30 bg-primary-white rounded-[16px] shadow-[0_12px_32px_rgba(9,46,74,0.15)] p-[16px]">
          <DobCalendar
            valueYmd={value || null}
            onSelect={(ymd) => {
              onChange(ymd);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

function MailIconSvg() {
  return (
    <svg
      aria-hidden
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      className="absolute right-[16px] top-1/2 -translate-y-1/2 text-primary-blue/60 pointer-events-none"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M3 7l9 6 9-6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIconSvg() {
  return (
    <svg
      aria-hidden
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      className="absolute right-[16px] top-1/2 -translate-y-1/2 pointer-events-none"
    >
      <path
        d="M1.66669 9.99998C1.66669 6.85728 1.66669 5.28593 2.643 4.30962C3.61931 3.33331 5.19066 3.33331 8.33335 3.33331H11.6667C14.8094 3.33331 16.3807 3.33331 17.357 4.30962C18.3334 5.28593 18.3334 6.85728 18.3334 9.99998V11.6666C18.3334 14.8093 18.3334 16.3807 17.357 17.357C16.3807 18.3333 14.8094 18.3333 11.6667 18.3333H8.33335C5.19066 18.3333 3.61931 18.3333 2.643 17.357C1.66669 16.3807 1.66669 14.8093 1.66669 11.6666V9.99998Z"
        stroke="#092E4A"
        strokeWidth="1.5"
      />
      <path d="M5.83331 3.33331V2.08331" stroke="#092E4A" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14.1667 3.33331V2.08331" stroke="#1C274C" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2.08331 7.5H17.9166" stroke="#1C274C" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M15 14.1667C15 14.6269 14.6269 15 14.1666 15C13.7064 15 13.3333 14.6269 13.3333 14.1667C13.3333 13.7064 13.7064 13.3333 14.1666 13.3333C14.6269 13.3333 15 13.7064 15 14.1667Z" fill="#1C274C" />
      <path d="M15 10.8333C15 11.2936 14.6269 11.6667 14.1666 11.6667C13.7064 11.6667 13.3333 11.2936 13.3333 10.8333C13.3333 10.3731 13.7064 10 14.1666 10C14.6269 10 15 10.3731 15 10.8333Z" fill="#1C274C" />
      <path d="M10.8334 14.1667C10.8334 14.6269 10.4603 15 10 15C9.53978 15 9.16669 14.6269 9.16669 14.1667C9.16669 13.7064 9.53978 13.3333 10 13.3333C10.4603 13.3333 10.8334 13.7064 10.8334 14.1667Z" fill="#1C274C" />
      <path d="M10.8334 10.8333C10.8334 11.2936 10.4603 11.6667 10 11.6667C9.53978 11.6667 9.16669 11.2936 9.16669 10.8333C9.16669 10.3731 9.53978 10 10 10C10.4603 10 10.8334 10.3731 10.8334 10.8333Z" fill="#1C274C" />
      <path d="M6.66667 14.1667C6.66667 14.6269 6.29357 15 5.83333 15C5.3731 15 5 14.6269 5 14.1667C5 13.7064 5.3731 13.3333 5.83333 13.3333C6.29357 13.3333 6.66667 13.7064 6.66667 14.1667Z" fill="#1C274C" />
      <path d="M6.66667 10.8333C6.66667 11.2936 6.29357 11.6667 5.83333 11.6667C5.3731 11.6667 5 11.2936 5 10.8333C5 10.3731 5.3731 10 5.83333 10C6.29357 10 6.66667 10.3731 6.66667 10.8333Z" fill="#1C274C" />
    </svg>
  );
}

function DobCalendar({
  valueYmd,
  onSelect,
}: {
  valueYmd: string | null;
  onSelect: (ymd: string) => void;
}) {
  const now = new Date();
  const initial = valueYmd ? parseYmd(valueYmd) : { y: now.getFullYear() - 20, m: now.getMonth(), d: 1 };
  const [viewYear, setViewYear] = useState(initial.y);
  const [viewMonth, setViewMonth] = useState(initial.m);
  const [yearOpen, setYearOpen] = useState(false);

  const selected = valueYmd ? parseYmd(valueYmd) : null;
  const days = useMemo(() => buildDobMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const yearOptions = useMemo(() => {
    const nowY = new Date().getFullYear();
    const list: number[] = [];
    for (let y = nowY; y >= nowY - 120; y--) list.push(y);
    return list;
  }, []);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  const todayYmd = toYmd(now.getFullYear(), now.getMonth(), now.getDate());

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[8px]">
          <span className="font-montserrat font-semibold text-primary-blue text-[14px]">
            {DOB_MONTHS[viewMonth]}
          </span>
          <button type="button" onClick={prevMonth} className="cursor-pointer text-primary-blue h-[24px] w-[24px] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button type="button" onClick={nextMonth} className="cursor-pointer text-primary-blue h-[24px] w-[24px] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 6 15 12 9 18" />
            </svg>
          </button>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setYearOpen((v) => !v)}
            className="cursor-pointer flex items-center gap-[6px] bg-[#EEEEEE] rounded-full px-[10px] py-[4px] font-montserrat text-[12px] text-primary-blue"
          >
            {viewYear}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {yearOpen && (
            <div className="absolute right-0 top-full mt-[6px] z-20 bg-primary-white rounded-[10px] shadow-lg max-h-[220px] overflow-y-auto min-w-[80px]">
              {yearOptions.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => {
                    setViewYear(y);
                    setYearOpen(false);
                  }}
                  className={`w-full text-left cursor-pointer px-[12px] py-[6px] font-montserrat text-[12px] hover:bg-black/[0.05] ${
                    y === viewYear ? "text-primary-orange font-semibold" : "text-primary-blue"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-[12px] grid grid-cols-7 gap-y-[4px]">
        {DOB_DAY_HEADERS.map((d, i) => (
          <div key={i} className="text-center font-montserrat text-primary-blue/50 text-[11px]">
            {d}
          </div>
        ))}
        {days.map((cell, i) => {
          const ymd = toYmd(cell.year, cell.month, cell.day);
          const isFuture = ymd > todayYmd;
          const isSelected =
            selected &&
            cell.inMonth &&
            cell.year === selected.y &&
            cell.month === selected.m &&
            cell.day === selected.d;
          const disabled = !cell.inMonth || isFuture;
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(ymd)}
              className={`h-[30px] flex items-center justify-center rounded-full font-montserrat text-[12px] ${
                disabled
                  ? "text-primary-blue/25 cursor-not-allowed"
                  : isSelected
                    ? "bg-primary-blue text-primary-white"
                    : "text-primary-blue cursor-pointer hover:bg-black/[0.05]"
              }`}
            >
              {String(cell.day).padStart(2, "0")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function buildDobMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const firstDow = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells: Array<{ year: number; month: number; day: number; inMonth: boolean }> = [];
  for (let i = firstDow - 1; i >= 0; i--) {
    cells.push({
      year: month === 0 ? year - 1 : year,
      month: (month + 11) % 12,
      day: prevMonthDays - i,
      inMonth: false,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ year, month, day: d, inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const nextDay = cells.length - firstDow - daysInMonth + 1;
    cells.push({
      year: month === 11 ? year + 1 : year,
      month: (month + 1) % 12,
      day: nextDay,
      inMonth: false,
    });
  }
  return cells;
}

function toYmd(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseYmd(ymd: string): { y: number; m: number; d: number } {
  const [ys, ms, ds] = ymd.split("-");
  return { y: Number(ys), m: Number(ms) - 1, d: Number(ds) };
}

function formatDobLabel(ymd: string): string {
  const { y, m, d } = parseYmd(ymd);
  return `${String(d).padStart(2, "0")}/${String(m + 1).padStart(2, "0")}/${y}`;
}
