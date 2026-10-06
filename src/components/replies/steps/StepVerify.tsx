'use client';

import { useState, useEffect, useRef } from 'react';
import { ReplyShell } from '@/components/replies/ReplyShell';
import { OtpInput } from '@/components/auth/OtpInput';
import { api } from '@/lib/api/client';
import { phoneStart, phoneVerify, loginWithGoogle } from '@/lib/auth/api';

const PEACH = '#FCD6A5';
const ORANGE = '#EF9849';
const TERRACOTTA = '#D95F3B';

type VerifyStep = 'phone-entry' | 'otp' | 'quick-signup';

type Props = {
  senderName: string;
  trigger: 'VERIFY_REQUIRED' | 'LOGIN_REQUIRED';
  onVerified: (token: string) => void;
  onBack: () => void;
};

type QuickSignupEnvelope = {
  success?: boolean;
  token?: string;
  data?: { token?: string };
  message?: string;
};

const RESEND_COOLDOWN = 60;

export function StepVerify({ senderName, trigger, onVerified, onBack }: Props) {
  const [step, setStep] = useState<VerifyStep>('phone-entry');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneVerifyToken, setPhoneVerifyToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  // Google GSI
  const googleDivRef = useRef<HTMLDivElement>(null);
  const [googleReady, setGoogleReady] = useState(false);

  useEffect(() => {
    // Load Google GSI script, then wait for `google.accounts.id` to actually
    // populate — the `onload` event fires before the `accounts` namespace is
    // ready, which was crashing the init effect on 401 → verify transitions.
    if (typeof window === 'undefined') return;
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    let cancelled = false;
    const markReady = () => {
      // Poll briefly — `window.google.accounts.id` can take a tick after the
      // script loads to materialise.
      const start = Date.now();
      const tick = () => {
        if (cancelled) return;
        if (window.google?.accounts?.id) {
          setGoogleReady(true);
          return;
        }
        if (Date.now() - start > 5000) return;
        window.setTimeout(tick, 50);
      };
      tick();
    };

    if (document.getElementById('gsi-script')) {
      markReady();
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement('script');
    script.id = 'gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = markReady;
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!googleReady || !googleDivRef.current) return;
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    // Tight guard: `window.google` can be truthy while `google.accounts` is
    // still mid-initialisation. Access `.id` only once the full tree is live.
    if (!clientId || !window.google?.accounts?.id) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: { credential: string }) => {
        setLoading(true);
        setError('');
        try {
          const result = await loginWithGoogle({ idToken: response.credential });
          onVerified(result.token);
        } catch {
          setError('Google sign-in failed. Please try again.');
        } finally {
          setLoading(false);
        }
      },
    });

    window.google.accounts.id.renderButton(googleDivRef.current, {
      type: 'icon',
      shape: 'circle',
      size: 'large',
    });
  }, [googleReady, onVerified]);

  // Resend countdown timer
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      setError('Please enter your first name.');
      return;
    }
    if (!phone.trim()) {
      setError('Please enter your phone number.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await phoneStart(countryCode, phone.replace(/\D/g, ''));
      setStep('otp');
      setResendCountdown(RESEND_COOLDOWN);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpComplete = async (code: string) => {
    setLoading(true);
    setError('');
    try {
      const result = await phoneVerify(countryCode, phone.replace(/\D/g, ''), code);
      if (result.kind === 'existing') {
        onVerified(result.token);
      } else if (result.kind === 'new') {
        setPhoneVerifyToken(result.phoneVerifyToken);
        setStep('quick-signup');
      } else {
        setError('This account has been archived. Please contact support.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid code. Please try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;
    setLoading(true);
    setError('');
    try {
      await phoneStart(countryCode, phone.replace(/\D/g, ''));
      setResendCountdown(RESEND_COOLDOWN);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      setError('Please enter your first name.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post<QuickSignupEnvelope>(
        '/api/auth/quick-signup',
        {
          firstName: firstName.trim(),
          lastName: lastName.trim() || undefined,
          phoneVerifyToken,
        },
        { auth: false }
      );
      const token = res.token || res.data?.token;
      if (!token) throw new Error('No token returned from server.');
      onVerified(token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const heading =
    trigger === 'LOGIN_REQUIRED'
      ? `Log in to reply to ${senderName || 'this prompt'}`
      : `Sign up to reply to ${senderName || 'this prompt'}`;

  return (
    <ReplyShell>
      {/* Header */}
      <div className="flex items-center justify-between pt-4 sm:pt-8 pb-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="p-2 -ml-2 text-primary-blue hover:opacity-70 transition-opacity"
        >
          <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <div className="w-8" aria-hidden="true" />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-0 py-8 gap-6">
        {/* Icon */}
        <div style={{ width: 80, height: 80, flexShrink: 0 }} aria-hidden="true">
          <svg width={80} height={80} viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="40" fill={PEACH} />
            <circle cx="40" cy="40" r="28" fill={ORANGE} />
            <circle cx="40" cy="40" r="17" fill={TERRACOTTA} />
          </svg>
        </div>

        <h2 className="font-plus-jakarta font-semibold text-[22px] sm:text-[24px] text-primary-blue text-center">
          {heading}
        </h2>

        {error && (
          <p className="font-plus-jakarta text-[13px] text-red-600 text-center bg-red-50 px-4 py-2 rounded-[12px] w-full">
            {error}
          </p>
        )}

        <div className="w-full">
          {step === 'phone-entry' && (
            <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-3">
              <div>
                <label className="font-plus-jakarta text-[12px] text-primary-blue opacity-60 mb-1 block">
                  Your name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  required
                  autoComplete="given-name"
                  className="w-full bg-primary-white rounded-[16px] px-4 py-3 font-plus-jakarta text-[15px] text-primary-blue outline-none focus:ring-2 focus:ring-primary-blue/30 shadow-[0_4px_14px_rgba(9,46,74,0.05)]"
                />
              </div>

              <div>
                <label className="font-plus-jakarta text-[12px] text-primary-blue opacity-60 mb-1 block">
                  Phone number
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    placeholder="+1"
                    className="w-16 bg-primary-white rounded-[16px] px-3 py-3 font-plus-jakarta text-[15px] text-primary-blue outline-none focus:ring-2 focus:ring-primary-blue/30 shadow-[0_4px_14px_rgba(9,46,74,0.05)] text-center"
                  />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone number"
                    required
                    autoComplete="tel"
                    className="flex-1 bg-primary-white rounded-[16px] px-4 py-3 font-plus-jakarta text-[15px] text-primary-blue outline-none focus:ring-2 focus:ring-primary-blue/30 shadow-[0_4px_14px_rgba(9,46,74,0.05)]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-orange text-primary-white font-plus-jakarta font-semibold text-[16px] px-6 py-[18px] rounded-full hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-60 disabled:cursor-wait leading-none mt-2"
              >
                {loading ? 'Sending…' : 'Continue'}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <div className="flex flex-col items-center gap-6">
              <p className="font-plus-jakarta text-[14px] text-primary-blue opacity-70 text-center">
                Enter the 6-digit code sent to {countryCode} {phone}
              </p>

              <OtpInput
                length={6}
                value={otp}
                onChange={setOtp}
                onComplete={handleOtpComplete}
                disabled={loading}
                autoFocus
              />

              {loading && (
                <p className="font-plus-jakarta text-[13px] text-primary-blue opacity-50">Verifying…</p>
              )}

              <button
                type="button"
                onClick={handleResend}
                disabled={resendCountdown > 0 || loading}
                className="font-plus-jakarta text-[13px] text-primary-blue opacity-60 underline disabled:opacity-30 disabled:no-underline"
              >
                {resendCountdown > 0
                  ? `Resend in ${resendCountdown}s`
                  : 'Resend code'}
              </button>
            </div>
          )}

          {step === 'quick-signup' && (
            <form onSubmit={handleQuickSignup} className="flex flex-col gap-3">
              <p className="font-plus-jakarta text-[14px] text-primary-blue opacity-70 text-center mb-2">
                One more step — tell us your name.
              </p>

              <div>
                <label className="font-plus-jakarta text-[12px] text-primary-blue opacity-60 mb-1 block">
                  First name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  required
                  autoComplete="given-name"
                  className="w-full bg-primary-white rounded-[16px] px-4 py-3 font-plus-jakarta text-[15px] text-primary-blue outline-none focus:ring-2 focus:ring-primary-blue/30 shadow-[0_4px_14px_rgba(9,46,74,0.05)]"
                />
              </div>

              <div>
                <label className="font-plus-jakarta text-[12px] text-primary-blue opacity-60 mb-1 block">
                  Last name (optional)
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  autoComplete="family-name"
                  className="w-full bg-primary-white rounded-[16px] px-4 py-3 font-plus-jakarta text-[15px] text-primary-blue outline-none focus:ring-2 focus:ring-primary-blue/30 shadow-[0_4px_14px_rgba(9,46,74,0.05)]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-orange text-primary-white font-plus-jakarta font-semibold text-[16px] px-6 py-[18px] rounded-full hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-60 disabled:cursor-wait leading-none mt-2"
              >
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </form>
          )}
        </div>

        {/* "or" divider + Google */}
        {step === 'phone-entry' && (
          <>
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 h-px bg-primary-blue/10" />
              <span className="font-plus-jakarta text-[12px] text-primary-blue opacity-40">or</span>
              <div className="flex-1 h-px bg-primary-blue/10" />
            </div>

            <div className="flex justify-center gap-4">
              {/* Google button rendered by GSI — hidden until ready */}
              <div
                ref={googleDivRef}
                className={[
                  'w-14 h-14 rounded-full bg-primary-white shadow-[0_2px_8px_rgba(9,46,74,0.12)] flex items-center justify-center overflow-hidden',
                  !googleReady ? 'opacity-40' : '',
                ].join(' ')}
                aria-label="Sign in with Google"
              />
            </div>
          </>
        )}
      </main>
    </ReplyShell>
  );
}
