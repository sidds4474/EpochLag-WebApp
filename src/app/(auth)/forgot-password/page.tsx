"use client";

import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import FamilyPhoto from "../../../assets/images/auth/family.jpg";
import FormError from "../../../components/FormError/FormError";
import { ApiError } from "../../../lib/api/client";
import {
  requestPasswordReset,
  resendOtp,
  resetPassword,
  verifyOtp,
} from "../../../lib/auth/api";
import {
  validateConfirmPassword,
  validateEmail,
  validatePassword,
} from "../../../lib/auth/validators";

type Step = "email" | "otp" | "newPassword" | "done";

const OTP_LENGTH = 5;
const RESEND_SECONDS = 30;

function EyeToggle({
  visible,
  onClick,
}: {
  visible: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={visible ? "Hide password" : "Show password"}
      className="cursor-pointer absolute right-[16px] top-1/2 -translate-y-1/2 text-primary-blue/70 hover:text-primary-blue"
    >
      {visible ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}

const inputClass =
  "w-full bg-primary-white rounded-full py-[12px] font-montserrat font-medium text-primary-blue text-[16px] placeholder:text-[#a5a5a5] focus:outline-none focus:ring-2 focus:ring-primary-blue/20 disabled:opacity-60";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState<string[]>(() => Array(OTP_LENGTH).fill(""));
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Errors
  const [emailFieldError, setEmailFieldError] = useState<string | null>(null);
  const [passwordFieldError, setPasswordFieldError] = useState<string | null>(null);
  const [confirmFieldError, setConfirmFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // OTP resend timer
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const otpInputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (step !== "otp" || secondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [step, secondsLeft]);

  useEffect(() => {
    if (step === "otp") {
      otpInputsRef.current[0]?.focus();
    }
  }, [step]);

  const clearAllErrors = () => {
    setEmailFieldError(null);
    setPasswordFieldError(null);
    setConfirmFieldError(null);
    setFormError(null);
  };

  // --- Step 1: request reset ---
  const handleRequestReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearAllErrors();
    const err = validateEmail(email);
    if (err) {
      setEmailFieldError(err);
      return;
    }
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email);
      setStep("otp");
      setSecondsLeft(RESEND_SECONDS);
    } catch (e) {
      const message =
        e instanceof ApiError ? e.message : "Couldn't send reset code.";
      const lower = message.toLowerCase();
      if (lower.includes("not found") || lower.includes("no account")) {
        setEmailFieldError(message);
      } else {
        setFormError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Step 2: verify OTP ---
  const focusOtp = (i: number) => {
    const el = otpInputsRef.current[i];
    if (el) {
      el.focus();
      el.select();
    }
  };

  const updateOtp = (index: number, value: string) => {
    if (formError) setFormError(null);
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      setOtp((prev) => {
        const next = [...prev];
        next[index] = "";
        return next;
      });
      return;
    }
    setOtp((prev) => {
      const next = [...prev];
      const chars = clean.split("");
      let writeIndex = index;
      for (const char of chars) {
        if (writeIndex >= OTP_LENGTH) break;
        next[writeIndex] = char;
        writeIndex += 1;
      }
      return next;
    });
    const lastWritten = Math.min(index + clean.length - 1, OTP_LENGTH - 1);
    focusOtp(Math.min(lastWritten + 1, OTP_LENGTH - 1));
  };

  const handleOtpKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === "Backspace") {
      if (otp[index]) {
        setOtp((prev) => {
          const next = [...prev];
          next[index] = "";
          return next;
        });
      } else if (index > 0) {
        e.preventDefault();
        setOtp((prev) => {
          const next = [...prev];
          next[index - 1] = "";
          return next;
        });
        focusOtp(index - 1);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focusOtp(index - 1);
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      e.preventDefault();
      focusOtp(index + 1);
    }
  };

  const handleOtpPaste = (
    e: ClipboardEvent<HTMLInputElement>,
    index: number
  ) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!text) return;
    e.preventDefault();
    updateOtp(index, text.slice(0, OTP_LENGTH - index));
  };

  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setResendNotice(null);
    const code = otp.join("");
    if (code.length !== OTP_LENGTH) {
      setFormError("Please enter the full code from your email.");
      return;
    }
    setIsSubmitting(true);
    try {
      await verifyOtp(email, code, true);
      setStep("newPassword");
    } catch (e) {
      const message =
        e instanceof ApiError ? e.message : "Verification failed.";
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (secondsLeft > 0 || isSubmitting) return;
    setResendNotice(null);
    setFormError(null);
    try {
      await resendOtp(email);
      setResendNotice("A new code was sent to your email.");
      setSecondsLeft(RESEND_SECONDS);
    } catch (e) {
      const message =
        e instanceof ApiError ? e.message : "Couldn't resend the code.";
      setFormError(message);
    }
  };

  // --- Step 3: reset password ---
  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    const pErr = validatePassword(newPassword);
    const cErr = validateConfirmPassword(newPassword, confirmPassword);
    if (pErr) {
      setPasswordFieldError(pErr);
      return;
    }
    if (cErr) {
      setConfirmFieldError(cErr);
      return;
    }
    setPasswordFieldError(null);
    setConfirmFieldError(null);
    setIsSubmitting(true);
    try {
      await resetPassword(email, newPassword);
      setStep("done");
    } catch (e) {
      const message =
        e instanceof ApiError ? e.message : "Couldn't reset your password.";
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <main className="min-h-screen w-full flex bg-warm-cream items-stretch">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="hidden md:block sticky top-0 self-start relative md:w-[42%] lg:w-[44%] xl:w-[46%] h-screen overflow-hidden"
      >
        <Image
          src={FamilyPhoto}
          alt=""
          fill
          priority
          placeholder="blur"
          sizes="(min-width: 1280px) 46vw, (min-width: 1024px) 44vw, (min-width: 768px) 42vw, 0vw"
          className="object-cover object-center"
        />
      </motion.div>

      <section className="relative flex-1 bg-warm-cream md:rounded-l-[48px] md:-ml-[48px] flex items-center justify-center px-[20px] md:px-[40px] py-[40px] md:py-[64px]">
        <AnimatePresence mode="wait">
          {step === "email" && (
            <motion.div
              key="email"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="w-full max-w-[440px] flex flex-col items-center text-center"
            >
              <h1 className="font-montserrat font-bold text-primary-blue text-[22px] md:text-[24px] leading-[110%]">
                Password Reset
              </h1>
              <p className="mt-[10px] font-montserrat text-primary-blue text-[15px] md:text-[16px] leading-[140%] max-w-[400px]">
                Enter your email to reset your password.
              </p>

              <form
                onSubmit={handleRequestReset}
                className="mt-[28px] w-full flex flex-col items-center"
              >
                <div className="w-full">
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailFieldError) setEmailFieldError(null);
                      if (formError) setFormError(null);
                    }}
                    disabled={isSubmitting}
                    className={`${inputClass} px-[20px] text-left`}
                  />
                  {emailFieldError && <FormError message={emailFieldError} />}
                </div>

                {formError && (
                  <div className="mt-[10px] w-full">
                    <FormError message={formError} />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer mt-[20px] w-full h-[44px] bg-primary-orange text-primary-white font-montserrat font-medium text-[16px] rounded-[30px] hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Sending…" : "Send Verification Code"}
                </button>

                <Link
                  href="/login"
                  className="cursor-pointer mt-[18px] flex items-center gap-[8px] font-montserrat font-medium text-primary-blue text-[16px] hover:opacity-80 transition-opacity"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  Back
                </Link>
              </form>
            </motion.div>
          )}

          {step === "otp" && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="w-full max-w-[440px] flex flex-col items-center text-center"
            >
              <h1 className="font-montserrat font-bold text-primary-blue text-[22px] md:text-[24px] leading-[110%]">
                Verification Code
              </h1>
              <p className="mt-[10px] font-montserrat text-primary-blue text-[15px] md:text-[16px] leading-[140%]">
                Enter the OTP sent to your email
              </p>

              <form
                onSubmit={handleVerifyOtp}
                className="mt-[28px] w-full flex flex-col items-center"
              >
                <div className="flex items-start justify-center gap-[5px]">
                  {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        otpInputsRef.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete={i === 0 ? "one-time-code" : "off"}
                      maxLength={1}
                      value={otp[i]}
                      onChange={(e) => updateOtp(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(e, i)}
                      onPaste={(e) => handleOtpPaste(e, i)}
                      onFocus={(e) => e.currentTarget.select()}
                      disabled={isSubmitting}
                      className="bg-primary-white text-center font-montserrat font-bold text-primary-blue text-[28px] md:text-[32px] w-[54px] h-[70px] md:w-[68px] md:h-[90px] rounded-[18px] md:rounded-[22px] focus:outline-none focus:ring-2 focus:ring-primary-blue/30 disabled:opacity-60"
                      aria-label={`Digit ${i + 1}`}
                    />
                  ))}
                </div>

                {formError && (
                  <div className="mt-[12px]">
                    <FormError message={formError} />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || otp.some((d) => !d)}
                  className="cursor-pointer mt-[24px] md:mt-[28px] w-full h-[44px] bg-primary-orange text-primary-white font-montserrat font-medium text-[16px] rounded-[30px] hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Verifying…" : "Submit"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOtp(Array(OTP_LENGTH).fill(""));
                    setFormError(null);
                    setResendNotice(null);
                    setStep("email");
                  }}
                  disabled={isSubmitting}
                  className="cursor-pointer mt-[14px] flex items-center gap-[8px] font-montserrat font-medium text-primary-blue text-[16px] hover:opacity-80 transition-opacity disabled:opacity-60"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  Back
                </button>

                <div className="mt-[14px] flex items-center justify-center gap-[6px] font-montserrat text-[16px] leading-[20px]">
                  <span className="text-primary-black tabular-nums">
                    {formatTimer(secondsLeft)}
                  </span>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={secondsLeft > 0 || isSubmitting}
                    className={`text-primary-black/30 transition-colors ${
                      secondsLeft > 0 || isSubmitting
                        ? "cursor-not-allowed"
                        : "hover:text-primary-orange cursor-pointer"
                    }`}
                  >
                    Send another code
                  </button>
                </div>
                {resendNotice && (
                  <p className="mt-[8px] font-montserrat text-primary-blue/70 text-[13px] text-center">
                    {resendNotice}
                  </p>
                )}
              </form>
            </motion.div>
          )}

          {step === "newPassword" && (
            <motion.div
              key="newPassword"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="w-full max-w-[440px] flex flex-col items-center text-center"
            >
              <h1 className="font-montserrat font-bold text-primary-blue text-[22px] md:text-[24px] leading-[110%]">
                Password Reset
              </h1>
              <p className="mt-[10px] font-montserrat text-primary-blue text-[15px] md:text-[16px] leading-[140%]">
                Choose a new password
              </p>

              <form
                onSubmit={handleResetPassword}
                className="mt-[28px] w-full flex flex-col items-center gap-[8px]"
              >
                <div className="w-full">
                  <div className="relative w-full">
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="New Password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (passwordFieldError) setPasswordFieldError(null);
                        if (
                          confirmFieldError &&
                          confirmPassword === e.target.value
                        ) {
                          setConfirmFieldError(null);
                        }
                        if (formError) setFormError(null);
                      }}
                      disabled={isSubmitting}
                      className={`${inputClass} pl-[20px] pr-[48px] text-left`}
                    />
                    <EyeToggle
                      visible={showPassword}
                      onClick={() => setShowPassword((s) => !s)}
                    />
                  </div>
                  {passwordFieldError && <FormError message={passwordFieldError} />}
                </div>

                <div className="w-full">
                  <div className="relative w-full">
                    <input
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (confirmFieldError) setConfirmFieldError(null);
                        if (formError) setFormError(null);
                      }}
                      disabled={isSubmitting}
                      className={`${inputClass} pl-[20px] pr-[48px] text-left`}
                    />
                    <EyeToggle
                      visible={showConfirm}
                      onClick={() => setShowConfirm((s) => !s)}
                    />
                  </div>
                  {confirmFieldError && <FormError message={confirmFieldError} />}
                </div>

                {formError && (
                  <div className="mt-[6px] w-full">
                    <FormError message={formError} />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer mt-[14px] w-full h-[44px] bg-primary-orange text-primary-white font-montserrat font-medium text-[16px] rounded-[30px] hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Resetting…" : "Reset Password"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewPassword("");
                    setConfirmPassword("");
                    setPasswordFieldError(null);
                    setConfirmFieldError(null);
                    setFormError(null);
                    setStep("otp");
                  }}
                  disabled={isSubmitting}
                  className="cursor-pointer mt-[4px] flex items-center gap-[8px] font-montserrat font-medium text-primary-blue text-[16px] hover:opacity-80 transition-opacity disabled:opacity-60"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  Back
                </button>
              </form>
            </motion.div>
          )}

          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="w-full max-w-[420px] flex flex-col items-center text-center"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.5,
                  ease: [0.34, 1.56, 0.64, 1],
                  delay: 0.1,
                }}
                aria-hidden="true"
              >
                <svg
                  width="57"
                  height="57"
                  viewBox="0 0 57 57"
                  fill="none"
                  stroke="#092E4A"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="28.5" cy="28.5" r="23.7" />
                  <path d="M19.5 28.5 L26.5 35.5 L38 22.5" />
                </svg>
              </motion.div>

              <h1 className="mt-[20px] font-montserrat font-bold text-primary-blue text-[28px] md:text-[32px] leading-[110%]">
                You&rsquo;re All Set!
              </h1>

              <button
                type="button"
                onClick={() => router.replace("/login")}
                className="cursor-pointer mt-[24px] h-[44px] bg-primary-orange text-primary-white font-montserrat font-medium text-[16px] rounded-[30px] px-[36px] hover:opacity-90 transition-opacity"
              >
                Log in
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}
