"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import FamilyPhoto from "../../../assets/images/auth/family.jpg";
import GoogleIcon from "../../../assets/svg/google-icon";
import LegalModal from "../../../components/LegalModal/LegalModal";
import { TERMS_OF_SERVICE_MARKDOWN } from "../../../components/LegalModal/termsContent";
import FormError from "../../../components/FormError/FormError";
import { useAuth } from "../../../lib/auth/AuthProvider";
import { ApiError } from "../../../lib/api/client";
import {
  validateConfirmPassword,
  validateEmail,
  validateFirstName,
  validateLastName,
  validatePassword,
  validatePhone,
} from "../../../lib/auth/validators";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

const FieldError = FormError;

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
  "bg-primary-white rounded-full py-[12px] font-montserrat text-primary-blue text-[16px] placeholder:text-[#a5a5a5] focus:outline-none focus:ring-2 focus:ring-primary-blue/20 disabled:opacity-60";

type FieldKey =
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "password"
  | "confirmPassword";

export default function SignUpPage() {
  const router = useRouter();
  const { status, register, signInWithGoogleCredential } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<FieldKey, string | null>>({
    firstName: null,
    lastName: null,
    email: null,
    phone: null,
    password: null,
    confirmPassword: null,
  });
  const [touched, setTouched] = useState<Record<FieldKey, boolean>>({
    firstName: false,
    lastName: false,
    email: false,
    phone: false,
    password: false,
    confirmPassword: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [agreedError, setAgreedError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleInitialized, setGoogleInitialized] = useState(false);
  const hiddenGoogleRef = useRef<HTMLDivElement | null>(null);
  const fieldRefs = useRef<Record<FieldKey, HTMLInputElement | null>>({
    firstName: null,
    lastName: null,
    email: null,
    phone: null,
    password: null,
    confirmPassword: null,
  });

  useEffect(() => {
    if (status === "authenticated") router.replace("/home");
  }, [status, router]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.google) {
      setGoogleReady(true);
    }
  }, []);

  useEffect(() => {
    if (!googleReady || !hiddenGoogleRef.current || !window.google) return;
    if (!GOOGLE_CLIENT_ID) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response) => {
        setFormError(null);
        try {
          await signInWithGoogleCredential(response.credential);
          router.replace("/home");
        } catch (err) {
          const message =
            err instanceof ApiError ? err.message : "Google sign-in failed.";
          setFormError(message);
        }
      },
    });

    hiddenGoogleRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(hiddenGoogleRef.current, {
      theme: "outline",
      size: "large",
      type: "standard",
      shape: "rectangular",
      text: "signin_with",
      logo_alignment: "left",
    });
    setGoogleInitialized(true);
  }, [googleReady, signInWithGoogleCredential, router]);

  const triggerGoogleSignIn = () => {
    const hostElement = hiddenGoogleRef.current?.querySelector(
      'div[role="button"]'
    ) as HTMLElement | null;
    hostElement?.click();
  };

  const setError = (key: FieldKey, message: string | null) =>
    setErrors((prev) => ({ ...prev, [key]: message }));

  const setTouchedKey = (key: FieldKey) =>
    setTouched((prev) => ({ ...prev, [key]: true }));

  const validateField = (key: FieldKey): string | null => {
    switch (key) {
      case "firstName":
        return validateFirstName(firstName);
      case "lastName":
        return validateLastName(lastName);
      case "email":
        return validateEmail(email);
      case "phone":
        return validatePhone(phone);
      case "password":
        return validatePassword(password);
      case "confirmPassword":
        return validateConfirmPassword(password, confirmPassword);
    }
  };

  const FIELD_ORDER: FieldKey[] = [
    "firstName",
    "lastName",
    "email",
    "phone",
    "password",
    "confirmPassword",
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setAgreedError(null);

    let firstInvalid: FieldKey | null = null;
    let firstError: string | null = null;
    for (const key of FIELD_ORDER) {
      const err = validateField(key);
      if (err && !firstInvalid) {
        firstInvalid = key;
        firstError = err;
      }
    }

    if (firstInvalid) {
      setTouchedKey(firstInvalid);
      setError(firstInvalid, firstError);
      fieldRefs.current[firstInvalid]?.focus({ preventScroll: true });
      return;
    }

    if (!agreed) {
      setAgreedError("Please accept the terms to continue.");
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        firstName,
        lastName,
        email,
        password,
        countryCode: countryCode.trim() || "+1",
        phone: phone.trim() ? phone : undefined,
      });
      router.push(`/verify-otp?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      // Stay in "Creating account…" until /verify-otp renders.
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Something went wrong.";
      const lower = message.toLowerCase();
      if (
        lower.includes("already exists") ||
        lower.includes("already registered") ||
        lower.includes("email is taken") ||
        lower.includes("email taken")
      ) {
        setError("email", message);
        setTouchedKey("email");
        fieldRefs.current.email?.focus({ preventScroll: true });
      } else {
        setFormError(message);
      }
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGoogleReady(true)}
      />
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

        <section className="relative flex-1 bg-warm-cream md:rounded-l-[48px] md:-ml-[48px] flex items-start md:items-center justify-center px-[20px] md:px-[40px] py-[24px] md:py-[32px]">
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

            <motion.form
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.35 }}
              onSubmit={handleSubmit}
              noValidate
              className="mt-[20px] md:mt-[24px] w-full flex flex-col gap-[8px]"
            >
              <div>
                <input
                  ref={(el) => {
                    fieldRefs.current.firstName = el;
                  }}
                  type="text"
                  placeholder="First Name"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    if (touched.firstName)
                      setError("firstName", validateFirstName(e.target.value));
                  }}
                  onBlur={() => {
                    setTouchedKey("firstName");
                    setError("firstName", validateFirstName(firstName));
                  }}
                  disabled={isSubmitting}
                  className={`${inputClass} w-full px-[20px]`}
                />
                {touched.firstName && errors.firstName && (
                  <FieldError message={errors.firstName} />
                )}
              </div>

              <div>
                <input
                  ref={(el) => {
                    fieldRefs.current.lastName = el;
                  }}
                  type="text"
                  placeholder="Last Name"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    if (touched.lastName)
                      setError("lastName", validateLastName(e.target.value));
                  }}
                  onBlur={() => {
                    setTouchedKey("lastName");
                    setError("lastName", validateLastName(lastName));
                  }}
                  disabled={isSubmitting}
                  className={`${inputClass} w-full px-[20px]`}
                />
                {touched.lastName && errors.lastName && (
                  <FieldError message={errors.lastName} />
                )}
              </div>

              <div>
                <input
                  ref={(el) => {
                    fieldRefs.current.email = el;
                  }}
                  type="email"
                  inputMode="email"
                  placeholder="Email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (touched.email)
                      setError("email", validateEmail(e.target.value));
                  }}
                  onBlur={() => {
                    setTouchedKey("email");
                    setError("email", validateEmail(email));
                  }}
                  disabled={isSubmitting}
                  className={`${inputClass} w-full px-[20px]`}
                />
                {touched.email && errors.email && (
                  <FieldError message={errors.email} />
                )}
              </div>

              <div>
                <div className="flex gap-[8px] w-full">
                  <input
                    type="text"
                    placeholder="+1"
                    inputMode="tel"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    disabled={isSubmitting}
                    className={`${inputClass} w-[76px] shrink-0 grow-0 basis-[76px] text-center px-[12px]`}
                  />
                  <input
                    ref={(el) => {
                      fieldRefs.current.phone = el;
                    }}
                    type="tel"
                    inputMode="tel"
                    placeholder="123 456 8998"
                    autoComplete="tel-national"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (touched.phone)
                        setError("phone", validatePhone(e.target.value));
                    }}
                    onBlur={() => {
                      setTouchedKey("phone");
                      setError("phone", validatePhone(phone));
                    }}
                    disabled={isSubmitting}
                    className={`${inputClass} flex-1 min-w-0 px-[20px]`}
                  />
                </div>
                {touched.phone && errors.phone && (
                  <FieldError message={errors.phone} />
                )}
              </div>

              <div>
                <div className="relative w-full">
                  <input
                    ref={(el) => {
                      fieldRefs.current.password = el;
                    }}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (touched.password)
                        setError("password", validatePassword(e.target.value));
                      if (
                        touched.confirmPassword &&
                        confirmPassword === e.target.value
                      ) {
                        setError("confirmPassword", null);
                      }
                    }}
                    onBlur={() => {
                      setTouchedKey("password");
                      setError("password", validatePassword(password));
                    }}
                    disabled={isSubmitting}
                    className={`${inputClass} w-full pl-[20px] pr-[48px]`}
                  />
                  <EyeToggle
                    visible={showPassword}
                    onClick={() => setShowPassword((s) => !s)}
                  />
                </div>
                {touched.password && errors.password && (
                  <FieldError message={errors.password} />
                )}
              </div>

              <div>
                <div className="relative w-full">
                  <input
                    ref={(el) => {
                      fieldRefs.current.confirmPassword = el;
                    }}
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (touched.confirmPassword)
                        setError(
                          "confirmPassword",
                          validateConfirmPassword(password, e.target.value)
                        );
                    }}
                    onBlur={() => {
                      setTouchedKey("confirmPassword");
                      setError(
                        "confirmPassword",
                        validateConfirmPassword(password, confirmPassword)
                      );
                    }}
                    disabled={isSubmitting}
                    className={`${inputClass} w-full pl-[20px] pr-[48px]`}
                  />
                  <EyeToggle
                    visible={showConfirmPassword}
                    onClick={() => setShowConfirmPassword((s) => !s)}
                  />
                </div>
                {touched.confirmPassword && errors.confirmPassword && (
                  <FieldError message={errors.confirmPassword} />
                )}
              </div>

              <label className="mt-[8px] flex items-start gap-[10px] cursor-pointer select-none">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={agreed}
                  onClick={() => {
                    setAgreed((a) => !a);
                    if (agreedError) setAgreedError(null);
                  }}
                  className={`cursor-pointer mt-[2px] shrink-0 w-[16px] h-[16px] rounded-[3px] border border-[#797979] flex items-center justify-center transition-colors ${
                    agreed ? "bg-primary-orange border-primary-orange" : "bg-white"
                  }`}
                >
                  {agreed && (
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M4.5 12.75 10.5 18.75 19.5 5.25" />
                    </svg>
                  )}
                </button>
                <span className="font-montserrat font-medium text-primary-blue text-[14px] leading-[140%]">
                  I agree to the{" "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setTermsOpen(true);
                    }}
                    className="cursor-pointer underline underline-offset-2 hover:opacity-80"
                  >
                    Terms of Service
                  </button>{" "}
                  and{" "}
                  <Link
                    href="/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:opacity-80"
                  >
                    Privacy Policy
                  </Link>
                </span>
              </label>
              {agreedError && <FormError message={agreedError} />}

              {formError && (
                <div className="mt-[8px]">
                  <FormError message={formError} />
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="cursor-pointer mt-[18px] w-full bg-primary-orange text-primary-white font-montserrat font-semibold text-[16px] rounded-full py-[14px] hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Creating account…" : "Sign Up"}
              </button>

              <button
                type="button"
                onClick={triggerGoogleSignIn}
                disabled={isSubmitting || !googleInitialized}
                className="cursor-pointer mt-[6px] w-full bg-transparent border border-[#797979] text-[#212121] font-montserrat font-medium text-[16px] rounded-full py-[12px] px-[20px] flex items-center justify-center gap-[10px] hover:bg-primary-blue/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <GoogleIcon className="w-5 h-5 shrink-0" />
                Sign up with Google
              </button>
              <div
                ref={hiddenGoogleRef}
                aria-hidden="true"
                className="absolute opacity-0 pointer-events-none w-0 h-0 overflow-hidden"
              />
              {!GOOGLE_CLIENT_ID && (
                <p className="text-center text-[12px] font-montserrat text-primary-blue/60">
                  Google sign-in unavailable — missing client ID.
                </p>
              )}
            </motion.form>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.55 }}
              className="mt-[14px] text-center font-montserrat text-primary-black text-[14px] md:text-[16px]"
            >
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-primary-orange underline underline-offset-2 hover:opacity-80"
              >
                Sign in
              </Link>
            </motion.p>
          </motion.div>
        </section>
      </main>
      <LegalModal
        isOpen={termsOpen}
        title="Terms of Service"
        markdown={TERMS_OF_SERVICE_MARKDOWN}
        onClose={() => setTermsOpen(false)}
        onAgree={() => {
          setAgreed(true);
          setTermsOpen(false);
        }}
      />
    </>
  );
}
