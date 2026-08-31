"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OnboardingShell } from "../../../lib/onboarding/components/OnboardingShell";
import { useAppDispatch, useAppSelector } from "../../../lib/onboarding/store";
import {
  resetCreateALag,
  type Participant,
} from "../../../lib/onboarding/store/slices/createALagSlice";

const PUBLIC_HOST = "epochlag.com";
const DEFAULT_TITLE = "My Favorite Memory";

const AVATAR_PALETTE = [
  "#B7C7DC",
  "#F6C7B6",
  "#FCD6A5",
  "#C8DEC1",
  "#E4CBEA",
  "#F5B7B1",
  "#B7DBE0",
  "#F4E1A1",
  "#D6C8F0",
  "#EAB9C6",
];

function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

export default function ShareLagPage() {
  return (
    <Suspense fallback={null}>
      <ShareLagContent />
    </Suspense>
  );
}

function ShareLagContent() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();

  const publicCode = searchParams?.get("publicCode") || "";

  const coverUri = useAppSelector((s) => s.createALag.coverUri);
  const participants = useAppSelector((s) => s.createALag.participants);
  const title = DEFAULT_TITLE;

  const [copied, setCopied] = useState(false);

  const publicUrl = useMemo(() => {
    if (!publicCode) return `${PUBLIC_HOST}/loading…`;
    return `${PUBLIC_HOST}/${publicCode}`;
  }, [publicCode]);

  const handleShare = async () => {
    const url = `https://${publicUrl}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // silent — user cancelled share sheet or clipboard write failed
    }
  };

  const goNext = () => {
    // Anon flow terminates here — clear the composer state so any future
    // anon flow starts fresh. Then hand off to the preferences flow.
    dispatch(resetCreateALag());
    router.replace("/onboarding/add-relationship");
  };

  const card = (
    <PreviewCard coverUri={coverUri} title={title} />
  );

  const linkCard = (
    <LinkCard
      url={publicUrl}
      copied={copied}
      onShare={handleShare}
      disabled={!publicCode}
    />
  );

  return (
    <OnboardingShell
      hideDesktopNext
      hideMobileNext
      desktopContent={
        <div className="w-full flex flex-col items-center text-primary-blue min-h-[80vh] lg:min-h-0 justify-center">
          <div className="w-full max-w-[380px] flex flex-col items-center">
            {card}
            <h1 className="mt-[28px] font-montserrat font-bold text-[20px] text-center">
              Stories are better told together
            </h1>
            <div className="mt-[14px]">
              <ParticipantStack participants={participants} />
            </div>
            <p className="mt-[14px] font-montserrat text-[13px] text-primary-blue/80 text-center leading-[160%]">
              Lags are most valuable when built through shared storytelling. Add
              in the special people involved in this memory.
            </p>
            <div className="mt-[20px] w-full">{linkCard}</div>
            <div className="mt-[24px] w-full flex justify-end">
              <button
                type="button"
                onClick={goNext}
                className="cursor-pointer bg-primary-orange text-primary-white font-montserrat font-medium text-[15px] rounded-full px-[48px] py-[8px] hover:opacity-90 transition-opacity shadow-[0_6px_20px_rgba(239,152,73,0.35)]"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      }
      mobileContent={
        <div className="flex flex-col min-h-screen px-[24px] pt-[24px] pb-[120px] text-primary-blue">
          <div className="flex-1 flex flex-col items-center">
            <div className="w-full max-w-[400px] flex flex-col items-center">
              {card}
              <h1 className="mt-[28px] font-montserrat font-bold text-[22px] text-center leading-[130%]">
                Stories are better
                <br />
                told together
              </h1>
              <div className="mt-[16px]">
                <ParticipantStack participants={participants} />
              </div>
              <p className="mt-[16px] font-montserrat text-[14px] text-primary-blue/80 text-center leading-[160%]">
                Lags are most valuable when built through shared storytelling.
                Add in the special people involved in this memory.
              </p>
              <div className="mt-[24px] w-full">{linkCard}</div>
            </div>
          </div>
          <div className="fixed bottom-0 left-0 right-0 z-30 px-[24px] pb-[24px] pt-[16px] bg-warm-cream">
            <button
              type="button"
              onClick={goNext}
              className="w-full cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[16px] rounded-full py-[16px] hover:opacity-90 transition-opacity"
            >
              Next
            </button>
          </div>
        </div>
      }
    />
  );
}

function PreviewCard({
  coverUri,
  title,
}: {
  coverUri: string | null;
  title: string;
}) {
  return (
    <div className="w-full bg-primary-white rounded-[18px] p-[12px] shadow-[0_6px_24px_rgba(9,46,74,0.08)]">
      {coverUri ? (
        <div className="relative w-full aspect-[4/3] rounded-[12px] overflow-hidden bg-primary-blue/5">
          <img
            src={coverUri}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="w-full aspect-[4/3] rounded-[12px] bg-primary-blue/5" />
      )}
      <p className="mt-[12px] pb-[6px] font-montserrat font-semibold text-[14px] text-primary-blue text-center">
        {title}
      </p>
    </div>
  );
}

function ParticipantStack({ participants }: { participants: Participant[] }) {
  const shown = participants.slice(0, 4);
  const extra = participants.length - shown.length;
  return (
    <div className="flex items-center">
      <div className="flex -space-x-[10px]">
        {shown.map((p) => (
          <span
            key={p.id}
            title={p.name}
            className="h-[32px] w-[32px] rounded-full flex items-center justify-center font-montserrat font-semibold text-[13px] text-primary-blue ring-2 ring-warm-cream"
            style={{ backgroundColor: avatarColor(p.id) }}
          >
            {(p.name.trim()[0] || "?").toUpperCase()}
          </span>
        ))}
        {extra > 0 && (
          <span className="h-[32px] w-[32px] rounded-full bg-primary-blue text-primary-white flex items-center justify-center font-montserrat font-semibold text-[12px] ring-2 ring-warm-cream">
            +{extra}
          </span>
        )}
      </div>
    </div>
  );
}

function LinkCard({
  url,
  copied,
  onShare,
  disabled,
}: {
  url: string;
  copied: boolean;
  onShare: () => void;
  disabled: boolean;
}) {
  return (
    <div
      className="w-full rounded-[14px] p-[14px]"
      style={{ backgroundColor: "#F8E2C6" }}
    >
      <label className="font-montserrat font-semibold text-[13px] text-primary-blue">
        Share story using a link
      </label>
      <div className="mt-[10px] flex items-center gap-[8px] bg-primary-white rounded-full pl-[16px] pr-[4px] py-[4px]">
        <span className="flex-1 font-montserrat text-[13px] text-primary-blue/80 truncate">
          {url}
        </span>
        <button
          type="button"
          onClick={onShare}
          disabled={disabled}
          className="h-[34px] px-[18px] rounded-full bg-primary-blue text-primary-white font-montserrat font-semibold text-[13px] cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copied ? "Copied" : "Share"}
        </button>
      </div>
    </div>
  );
}
