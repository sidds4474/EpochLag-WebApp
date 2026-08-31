"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingShell } from "../../../lib/onboarding/components/OnboardingShell";
import { trackOnboarding } from "../../../lib/analytics/track";
import {
  buildReferralInviteMessage,
  buildReferralUrl,
  mintReferralCode,
} from "../../../lib/referral/api";

const TITLE = "Give a month, get a month.";
const SUBTITLE =
  "Invite someone to Epoch Lag. When they join and verify their number, you both get 30 extra days free.";

export default function ReferralPitchPage() {
  const router = useRouter();
  const [code, setCode] = useState<string>("");
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [codeError, setCodeError] = useState(false);
  const [loadingCode, setLoadingCode] = useState(true);

  const loadCode = () => {
    setCodeError(false);
    setLoadingCode(true);
    let cancelled = false;
    mintReferralCode("docking_station")
      .then((c) => {
        if (cancelled) return;
        if (c) setCode(c);
        else setCodeError(true);
      })
      .catch(() => {
        if (!cancelled) setCodeError(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingCode(false);
      });
    return () => {
      cancelled = true;
    };
  };

  useEffect(() => loadCode(), []);

  const goNext = () => {
    trackOnboarding("referral_pitch_completed");
    router.replace("/onboarding/complete");
  };

  const handleShare = async () => {
    if (!code || sharing) return;
    setSharing(true);
    try {
      const url = buildReferralUrl(code);
      const message = buildReferralInviteMessage(code);
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "Epoch Lag", text: message, url });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(message);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }
      trackOnboarding("referral_pitch_shared", { code });
    } catch {
      // silent — user cancelled share sheet
    } finally {
      setSharing(false);
    }
  };

  const hero = (
    <div className="relative w-full max-w-[380px] aspect-[1.15/1] flex items-center justify-center">
      <div
        className="absolute right-[8%] top-[6%] h-[62%] w-[62%] rounded-full"
        style={{ backgroundColor: "#F1B978", opacity: 0.85 }}
      />
      <PhotoCard
        src="/onboarding/childhood.jpg"
        rotate={-6}
        className="absolute left-[6%] top-[6%] w-[62%] aspect-[4/3]"
      />
      <PhotoCard
        src="/onboarding/girl-dad.png"
        rotate={6}
        className="absolute right-[8%] bottom-[6%] w-[46%] aspect-[1/1]"
      />
      <div className="absolute right-[2%] top-[8%] h-[86px] w-[86px] rounded-full bg-primary-white shadow-[0_4px_14px_rgba(9,46,74,0.12)] flex flex-col items-center justify-center">
        <span className="font-montserrat font-bold text-primary-blue text-[18px] leading-[100%]">
          +30
        </span>
        <span className="font-montserrat font-bold text-primary-blue text-[13px] leading-[110%] mt-[2px]">
          Days
        </span>
      </div>
    </div>
  );

  const copy = (
    <>
      <h1 className="font-montserrat font-bold text-primary-blue text-center text-[22px]">
        {TITLE}
      </h1>
      <p className="mt-[12px] font-montserrat text-[13px] text-primary-blue/85 text-center leading-[160%]">
        {SUBTITLE}
      </p>
    </>
  );

  const shareLabel = loadingCode
    ? "Loading your invite…"
    : codeError
      ? "Couldn't load — tap to retry"
      : "Share my invite";

  const actions = (
    <div className="w-full flex flex-col items-center gap-[14px]">
      <button
        type="button"
        onClick={codeError ? loadCode : handleShare}
        disabled={loadingCode || sharing || (!code && !codeError)}
        className="w-full max-w-[360px] cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[15px] rounded-full py-[14px] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {shareLabel}
      </button>
      <button
        type="button"
        onClick={goNext}
        className="cursor-pointer font-montserrat text-[14px] text-primary-blue hover:opacity-70 transition-opacity"
      >
        Maybe later
      </button>
    </div>
  );

  return (
    <>
    {copied && (
      <div className="fixed top-[24px] left-1/2 -translate-x-1/2 z-50 bg-primary-blue text-primary-white font-montserrat text-[13px] px-[18px] py-[10px] rounded-full shadow-[0_6px_20px_rgba(9,46,74,0.25)]">
        Invite copied to clipboard
      </div>
    )}
    <OnboardingShell
      hideDesktopNext
      hideMobileNext
      desktopContent={
        <div className="w-full flex flex-col items-center justify-center min-h-[78vh] lg:min-h-0">
          <div className="w-full max-w-[460px] flex flex-col items-center">
            {hero}
            <div className="mt-[24px]">{copy}</div>
            <div className="mt-[28px] w-full">{actions}</div>
          </div>
        </div>
      }
      mobileContent={
        <div className="flex flex-col min-h-screen px-[24px] pt-[40px] pb-[32px] text-primary-blue">
          <div className="flex-1 flex flex-col items-center">
            <div className="w-full max-w-[360px] flex flex-col items-center">
              {hero}
              <div className="mt-[24px]">{copy}</div>
            </div>
          </div>
          <div className="w-full max-w-[360px] mx-auto mt-[24px]">{actions}</div>
        </div>
      }
    />
    </>
  );
}

function PhotoCard({
  src,
  rotate,
  className,
}: {
  src: string;
  rotate: number;
  className: string;
}) {
  return (
    <div
      className={`bg-primary-white p-[6px] rounded-[8px] shadow-[0_8px_24px_rgba(9,46,74,0.15)] ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <div className="h-full w-full rounded-[4px] overflow-hidden bg-primary-blue/5">
        <img src={src} alt="" className="h-full w-full object-cover" />
      </div>
    </div>
  );
}
