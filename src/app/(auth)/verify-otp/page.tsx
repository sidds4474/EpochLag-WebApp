"use client";

import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ClipboardEvent,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import FamilyPhoto from "../../../assets/images/auth/family.jpg";
import FormError from "../../../components/FormError/FormError";
import { useAuth } from "../../../lib/auth/AuthProvider";
import { ApiError } from "../../../lib/api/client";

const OTP_LENGTH = 5;
const RESEND_SECONDS = 15;

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, verifyOtpAndSignIn } = useAuth();
  const emailFromQuery = searchParams?.get("email") || "";

  const [digits, setDigits] = useState<string[]>(() => Array(OTP_LENGTH).fill(""));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [formError, setFormError] = useState<string | null>(null);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const verifiedHereRef = useRef(false);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    // Only auto-redirect when the user is ALREADY signed in on landing.
    // If they became authenticated via the submit on this page, our explicit
    // router.replace("/onboarding/birthday") below handles the routing.
    if (status === "authenticated" && !verifiedHereRef.current) {
      router.replace("/home");
    }
  }, [status, router]);

  useEffect(() => {
    if (!emailFromQuery) router.replace("/signup");
  }, [emailFromQuery, router]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [secondsLeft]);

  const focusInput = (index: number) => {
    const target = inputsRef.current[index];
    if (target) {
      target.focus();
      target.select();
    }
  };

  const updateDigit = (index: number, value: string) => {
    if (formError) setFormError(null);
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      setDigits((prev) => {
        const next = [...prev];
        next[index] = "";
        return next;
      });
      return;
    }
    setDigits((prev) => {
      const next = [...prev];
      // Spread multi-char input across remaining slots (handles autofill / paste-into-single-box)
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
    const advanceTo = Math.min(lastWritten + 1, OTP_LENGTH - 1);
    focusInput(advanceTo);
  };

  const handleKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        setDigits((prev) => {
          const next = [...prev];
          next[index] = "";
          return next;
        });
      } else if (index > 0) {
        e.preventDefault();
        setDigits((prev) => {
          const next = [...prev];
          next[index - 1] = "";
          return next;
        });
        focusInput(index - 1);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focusInput(index - 1);
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      e.preventDefault();
      focusInput(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>, index: number) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!text) return;
    e.preventDefault();
    updateDigit(index, text.slice(0, OTP_LENGTH - index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setResendNotice(null);
    const code = digits.join("");
    if (code.length !== OTP_LENGTH) {
      setFormError("Please enter the full code from your email.");
      return;
    }
    setIsSubmitting(true);
    verifiedHereRef.current = true;
    try {
      await verifyOtpAndSignIn(emailFromQuery, code, false);
      router.replace("/onboarding/birthday");
      // Stay in "Verifying…" until /onboarding/birthday renders.
    } catch (err) {
      verifiedHereRef.current = false;
      const message =
        err instanceof ApiError ? err.message : "Verification failed.";
      setFormError(message);
      setIsSubmitting(false);
    }
  };

  const handleResend = () => {
    if (secondsLeft > 0) return;
    setResendNotice(
      "Resend isn't wired up yet — go back to Sign up to request a new code."
    );
    setSecondsLeft(RESEND_SECONDS);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const codeComplete = digits.every((d) => d !== "");

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
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          className="w-full max-w-[485px] flex flex-col items-center"
        >
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
            className="text-center font-montserrat font-bold text-primary-blue text-[24px] md:text-[26px] lg:text-[28px] xl:text-[32px] leading-[110%] whitespace-nowrap"
          >
            Welcome to Epoch Lag!
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
            className="mt-[40px] md:mt-[56px] text-center w-full"
          >
            <p className="font-montserrat font-bold text-primary-blue text-[20px]">
              Email Verification
            </p>
            <p className="mt-[10px] font-montserrat font-normal text-primary-blue text-[16px] leading-[20px]">
              Enter the OTP sent to your email
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.4 }}
            onSubmit={handleSubmit}
            className="mt-[28px] md:mt-[32px] w-full flex flex-col items-center"
          >
            <div className="flex items-start justify-center gap-[5px]">
              {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputsRef.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  maxLength={1}
                  value={digits[i]}
                  onChange={(e) => updateDigit(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  onPaste={(e) => handlePaste(e, i)}
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
              disabled={isSubmitting || !codeComplete}
              className="cursor-pointer mt-[24px] md:mt-[34px] w-full bg-primary-orange text-primary-white font-montserrat font-semibold text-[16px] rounded-full py-[14px] hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Verifying…" : "Submit"}
            </button>

            <div className="mt-[18px] flex items-center justify-center gap-[6px] font-montserrat text-[16px] leading-[20px]">
              <span className="text-primary-black tabular-nums">
                {formatTimer(secondsLeft)}
              </span>
              <button
                type="button"
                onClick={handleResend}
                disabled={secondsLeft > 0}
                className={`text-primary-black/30 transition-colors ${
                  secondsLeft > 0
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
          </motion.form>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.6 }}
            className="mt-[20px] text-center font-montserrat text-primary-black text-[14px] md:text-[15px]"
          >
            Wrong email?{" "}
            <Link
              href="/signup"
              className="font-medium text-primary-orange underline underline-offset-2 hover:opacity-80"
            >
              Go back
            </Link>
          </motion.p>
        </motion.div>
      </section>
    </main>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpContent />
    </Suspense>
  );
}
