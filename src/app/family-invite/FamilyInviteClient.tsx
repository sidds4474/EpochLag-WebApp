"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { storeFamilyInviteToken } from "../../lib/familyInvite/token";

// Token is opaque; only sanity-check length and character set to avoid
// stashing obvious junk. Never log the raw value.
function isPlausibleToken(raw: string | null): raw is string {
  if (!raw) return false;
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > 128) return false;
  return /^[A-Za-z0-9_-]+$/.test(trimmed);
}

export default function FamilyInviteClient() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams?.get("token") ?? null;
  const hasValidToken = useMemo(() => isPlausibleToken(tokenParam), [tokenParam]);
  const [stashed, setStashed] = useState(false);

  useEffect(() => {
    if (hasValidToken && tokenParam) {
      storeFamilyInviteToken(tokenParam.trim());
      setStashed(true);
    }
  }, [hasValidToken, tokenParam]);

  if (!hasValidToken) {
    return <InvalidInviteState />;
  }

  return <ValidInviteState ready={stashed} />;
}

function ValidInviteState({ ready }: { ready: boolean }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-primary-cream px-[24px] py-[48px] text-primary-blue">
      <div className="w-full max-w-[420px] flex flex-col items-center text-center">
        <img
          src="/logo.svg"
          alt="EpochLag"
          className="h-[72px] w-[72px] object-contain"
        />

        <h1 className="mt-[24px] font-montserrat font-bold text-[24px] leading-[130%]">
          You've been added to a family
          <br />
          on EpochLag
        </h1>

        <p className="mt-[16px] font-montserrat text-[15px] leading-[150%] text-primary-blue/70">
          Sign up to see the stories your family has shared with you.
        </p>

        <Link
          href="/signup"
          aria-disabled={!ready}
          className={`mt-[32px] w-full h-[50px] flex items-center justify-center bg-primary-orange text-primary-white font-montserrat font-semibold text-[16px] rounded-full hover:opacity-90 transition-opacity ${
            ready ? "" : "opacity-70 pointer-events-none"
          }`}
        >
          Sign up
        </Link>

        <Link
          href="/login"
          className="mt-[16px] font-montserrat text-[14px] text-primary-blue/70 hover:text-primary-blue underline underline-offset-2"
        >
          I already have an account
        </Link>
      </div>
    </main>
  );
}

function InvalidInviteState() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-primary-cream px-[24px] py-[48px] text-primary-blue">
      <div className="w-full max-w-[420px] flex flex-col items-center text-center">
        <img
          src="/logo.svg"
          alt="EpochLag"
          className="h-[72px] w-[72px] object-contain"
        />

        <h1 className="mt-[24px] font-montserrat font-bold text-[22px] leading-[130%]">
          Invitation link is invalid
          <br />
          or expired
        </h1>

        <p className="mt-[16px] font-montserrat text-[15px] leading-[150%] text-primary-blue/70">
          Ask the person who invited you to send a fresh link.
        </p>

        <Link
          href="/"
          className="mt-[32px] w-full h-[50px] flex items-center justify-center bg-primary-orange text-primary-white font-montserrat font-semibold text-[16px] rounded-full hover:opacity-90 transition-opacity"
        >
          Go to EpochLag
        </Link>
      </div>
    </main>
  );
}
