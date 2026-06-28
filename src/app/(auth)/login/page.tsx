"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import LogoDark from "../../../assets/images/logo-dark.webp";
import FamilyPhoto from "../../../assets/images/auth/family.jpg";
import GoogleIcon from "../../../assets/svg/google-icon";
import FormError from "../../../components/FormError/FormError";
import { useAuth } from "../../../lib/auth/AuthProvider";
import { ApiError } from "../../../lib/api/client";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, signIn, signInWithGoogleCredential } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleInitialized, setGoogleInitialized] = useState(false);
  const hiddenGoogleRef = useRef<HTMLDivElement | null>(null);

  const next = searchParams?.get("next") || "/home";

  useEffect(() => {
    if (status === "authenticated") router.replace(next);
  }, [status, router, next]);

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
          router.replace(next);
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
  }, [googleReady, signInWithGoogleCredential, router, next]);

  const triggerGoogleSignIn = () => {
    const hostElement = hiddenGoogleRef.current?.querySelector(
      'div[role="button"]'
    ) as HTMLElement | null;
    hostElement?.click();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    let hasError = false;
    if (!email.trim()) {
      setEmailError("Please enter your email.");
      hasError = true;
    }
    if (!password) {
      setPasswordError("Please enter your password.");
      hasError = true;
    }
    if (hasError) return;

    setIsSubmitting(true);
    try {
      await signIn(email, password);
      router.replace(next);
      // Don't reset isSubmitting here — we're navigating away. Keeping the
      // button in its "Signing in…" state until the new page renders avoids
      // a confusing flash back to "Sign in" while Next.js loads /home.
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Something went wrong.";
      const lower = message.toLowerCase();
      if (
        lower.includes("password") ||
        lower.includes("credentials") ||
        lower.includes("incorrect")
      ) {
        setPasswordError(message);
      } else if (
        lower.includes("not found") ||
        lower.includes("no account") ||
        (lower.includes("email") && !lower.includes("valid"))
      ) {
        setEmailError(message);
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
        <section className="relative flex-1 bg-warm-cream md:rounded-l-[48px] md:-ml-[48px] flex items-center justify-center px-[20px] md:px-[40px] py-[40px] md:py-[64px]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            className="w-full max-w-[485px] flex flex-col items-center"
          >
            <Link href="/" className="block cursor-pointer">
              <img
                src={LogoDark.src}
                alt="Epoch Lag"
                className="w-[150px] md:w-[170px] h-auto object-contain"
              />
            </Link>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.25 }}
              className="mt-[28px] md:mt-[40px] text-center font-montserrat font-bold text-primary-blue text-[28px] md:text-[36px] lg:text-[40px] leading-[110%]"
            >
              Welcome to Epoch Lag
            </motion.h1>

            <motion.form
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.4 }}
              onSubmit={handleSubmit}
              className="mt-[28px] md:mt-[36px] w-full flex flex-col gap-[10px]"
            >
              <div>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                    if (formError) setFormError(null);
                  }}
                  disabled={isSubmitting}
                  className="w-full bg-primary-white rounded-full px-[20px] py-[14px] font-montserrat text-primary-blue text-[16px] placeholder:text-[#a5a5a5] focus:outline-none focus:ring-2 focus:ring-primary-blue/20 disabled:opacity-60"
                />
                {emailError && <FormError message={emailError} />}
              </div>
              <div className="relative w-full">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                    if (formError) setFormError(null);
                  }}
                  disabled={isSubmitting}
                  className="w-full bg-primary-white rounded-full pl-[20px] pr-[48px] py-[14px] font-montserrat text-primary-blue text-[16px] placeholder:text-[#a5a5a5] focus:outline-none focus:ring-2 focus:ring-primary-blue/20 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="cursor-pointer absolute right-[16px] top-1/2 -translate-y-1/2 text-primary-blue/70 hover:text-primary-blue"
                >
                  {showPassword ? (
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
              </div>
              {passwordError && <FormError message={passwordError} />}

              <div className="self-start mt-[2px]">
                <Link
                  href="/forgot-password"
                  className="font-montserrat text-primary-blue text-[14px] md:text-[15px] underline underline-offset-2 hover:opacity-80"
                >
                  Forgot Password?
                </Link>
              </div>

              {formError && (
                <div className="mt-[12px]">
                  <FormError message={formError} />
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="cursor-pointer mt-[16px] md:mt-[24px] w-full bg-primary-orange text-primary-white font-montserrat font-semibold text-[16px] rounded-full py-[14px] hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Signing in…" : "Sign in"}
              </button>

              <button
                type="button"
                onClick={triggerGoogleSignIn}
                disabled={isSubmitting || !googleInitialized}
                className="cursor-pointer mt-[6px] w-full bg-transparent border border-[#797979] text-[#212121] font-montserrat font-medium text-[16px] rounded-full py-[12px] px-[20px] flex items-center justify-center gap-[10px] hover:bg-primary-blue/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <GoogleIcon className="w-5 h-5 shrink-0" />
                Sign in with Google
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
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.6 }}
              className="mt-[24px] text-center font-montserrat text-primary-black text-[14px] md:text-[16px]"
            >
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-medium text-primary-orange underline underline-offset-2 hover:opacity-80"
              >
                Sign up
              </Link>
            </motion.p>
          </motion.div>
        </section>
      </main>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
