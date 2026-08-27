"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image, { type StaticImageData } from "next/image";
import { toast } from "react-hot-toast";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import { fetchDockingCard, type DockingItem } from "../../../../lib/home/api";
import {
  updateDockingItemProgress,
} from "../../../../lib/home/api";
import {
  buildReferralInviteMessage,
  buildReferralUrl,
  mintReferralCode,
  type ShareChannel,
} from "../../../../lib/referral/api";
import {
  CHALLENGE_INVITE_GOAL,
  creditLinkShareChannel,
  markChallengeCompleted,
} from "../../../../lib/referral/challengeCache";
import AvatarLeft from "../../../../assets/images/Avatar.png";
import AvatarRight from "../../../../assets/images/Avatar (1).png";
import ShareDrawer from "./ShareDrawer";

type Variant = "reward" | "challenge";

const COPY_BY_VARIANT: Record<Variant, { title: string; subtitle: string }> = {
  reward: {
    title: "Give a month, get a month",
    subtitle:
      "Invite a friend to Epoch Lag! When they join, you both get an extra month free.",
  },
  challenge: {
    title: "Epoch Lag is better together!",
    subtitle: "",
  },
};

function resolveCopy(
  variant: Variant,
  enriched: DockingItem | null,
  routeMessage: string
): { title: string; subtitle: string } {
  const enrichedTitle = enriched?.title?.trim() ?? "";
  const enrichedMessage = enriched?.message?.trim() ?? "";
  const staticCopy = COPY_BY_VARIANT[variant];
  const title =
    enrichedTitle || enrichedMessage || routeMessage.trim() || staticCopy.title;
  // Subtitle rules:
  //   1. If BE ships a distinct enriched message (different from the title),
  //      use it — that's editorial subcopy.
  //   2. Otherwise fall back to the variant's static subtitle. BE frequently
  //      ships title === message ("Give a month, get a month." on both), so
  //      without this fallback the subtitle disappears entirely.
  const subtitle =
    enrichedTitle && enrichedMessage && enrichedTitle !== enrichedMessage
      ? enrichedMessage
      : staticCopy.subtitle;
  return { title, subtitle };
}

function InvitePageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();
  const variant: Variant =
    params.get("variant") === "challenge" ? "challenge" : "reward";
  const cardId = params.get("cardId") ?? "";
  const routeMessage = params.get("message") ?? "";
  const sharerName = (user?.firstName ?? "").trim() || "Someone";

  const [enriched, setEnriched] = useState<DockingItem | null>(null);
  const [referralCode, setReferralCode] = useState<string>("");
  const [codeLoading, setCodeLoading] = useState(true);
  const [copyBusy, setCopyBusy] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Inline toast state — react-hot-toast's top-right is viewport-anchored,
  // but the Figma places the pill inline with the "Challenge" header row of
  // the content column. We render our own state-controlled pill for the
  // link-copied confirmation.
  const [linkCopied, setLinkCopied] = useState(false);
  useEffect(() => {
    if (!linkCopied) return;
    const t = window.setTimeout(() => setLinkCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [linkCopied]);

  useEffect(() => {
    let cancelled = false;
    if (!cardId) return;
    fetchDockingCard(cardId).then((card) => {
      if (!cancelled) setEnriched(card);
    });
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  useEffect(() => {
    let cancelled = false;
    setCodeLoading(true);
    mintReferralCode("docking_station")
      .then((code) => {
        if (!cancelled) setReferralCode(code);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Couldn't load your invite link. Try again in a moment.");
        }
      })
      .finally(() => {
        if (!cancelled) setCodeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const shareUrl = referralCode ? buildReferralUrl(referralCode) : "";
  const displayUrl = shareUrl
    ? shareUrl.replace(/^https?:\/\//, "")
    : "epochlag.com/…";

  const copy = useMemo(
    () => resolveCopy(variant, enriched, routeMessage),
    [variant, enriched, routeMessage]
  );

  // Chip tap = "share attempted." For the challenge variant we dedup and
  // count locally; hitting 3 fires the progress write. Reward variant just
  // navigates to the celebration screen — attribution happens server-side
  // when the invitee signs up with the code, not here.
  const handleChipTap = useCallback(
    (channel: ShareChannel) => {
      if (variant === "challenge") {
        const { count } = creditLinkShareChannel(user?._id ?? null, channel);
        if (count >= CHALLENGE_INVITE_GOAL && cardId) {
          markChallengeCompleted(user?._id ?? null);
          updateDockingItemProgress(cardId, { status: "completed" }).catch(
            () => {
              // Fire-and-forget — client state already marks completion;
              // a retry endpoint would be premature.
            }
          );
        }
      }
      setDrawerOpen(false);
      const q = new URLSearchParams({ variant });
      router.push(`/invite/complete?${q.toString()}`);
    },
    [variant, cardId, user?._id, router]
  );

  const canCopy = !!referralCode && !copyBusy;
  const handleCopy = useCallback(async () => {
    if (!canCopy) return;
    setCopyBusy(true);
    try {
      const message = buildReferralInviteMessage(referralCode);
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
        setLinkCopied(true);
      } else {
        toast.error("Clipboard isn't available in this browser.");
      }
    } catch {
      toast.error("Couldn't copy. Try again.");
    } finally {
      setCopyBusy(false);
    }
  }, [canCopy, referralCode]);

  return (
    <div className="flex flex-col h-full min-h-0 px-[16px] md:px-[32px] pt-[16px] pb-[40px] overflow-y-auto scrollbar-hide">
      <div className="flex items-center justify-between gap-[12px]">
        <div className="flex items-center gap-[12px]">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="cursor-pointer w-[36px] h-[36px] rounded-full bg-[#f0f0f0] hover:bg-black/[0.08] flex items-center justify-center text-primary-blue transition-colors"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <path
                d="M15 6l-6 6 6 6"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h1 className="font-montserrat font-bold text-primary-blue text-[20px] md:text-[28px] leading-none">
            Challenge
          </h1>
        </div>
        <div
          aria-live="polite"
          className={`flex items-center gap-[8px] bg-[#FFEFDC] rounded-full pl-[10px] pr-[16px] py-[8px] transition-opacity duration-200 ${
            linkCopied ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <span className="w-[20px] h-[20px] rounded-full bg-[#EF9849] flex items-center justify-center text-white">
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12l5 5L20 7"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="font-montserrat text-primary-blue text-[13px]">
            link copied
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center mt-[48px] md:mt-[64px] w-full max-w-[560px] lg:max-w-[720px] mx-auto">
        <HeroIllustration />
        <h2 className="mt-[24px] font-montserrat font-normal text-primary-blue text-[20px] md:text-[22px] text-center">
          {copy.title}
        </h2>
        {copy.subtitle && (
          <p className="mt-[8px] font-montserrat text-primary-blue/70 text-[13px] md:text-[14px] text-center max-w-[440px] lg:max-w-none lg:whitespace-nowrap">
            {copy.subtitle}
          </p>
        )}

        <div className="mt-[28px] md:mt-[36px] w-full max-w-[440px] bg-[#f0f0f0] rounded-[16px] p-[16px] md:p-[20px]">
          <p className="font-montserrat font-semibold text-primary-blue text-[13px] mb-[10px]">
            Invite via link
          </p>
          <div className="flex items-center gap-[8px] md:gap-[10px]">
            <div className="flex-1 min-w-0 bg-white rounded-full pl-[12px] md:pl-[16px] pr-[12px] py-[10px]">
              <span
                className={`font-montserrat text-[12px] md:text-[13px] truncate block ${
                  codeLoading
                    ? "text-primary-blue/40"
                    : "text-primary-blue"
                }`}
              >
                {displayUrl}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!canCopy}
              className={`shrink-0 font-montserrat font-semibold text-[13px] text-white bg-primary-blue rounded-full px-[18px] md:px-[22px] py-[10px] transition-opacity ${
                canCopy
                  ? "cursor-pointer hover:opacity-90"
                  : "cursor-not-allowed opacity-60"
              }`}
            >
              {copyBusy ? "…" : linkCopied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div className="mt-[28px] md:mt-[36px] w-full max-w-[440px] flex flex-col items-center">
          <p className="font-montserrat font-semibold text-primary-blue text-[13px] mb-[14px]">
            Invite on socials
          </p>
          <div className="grid grid-cols-3 gap-[24px] md:gap-[32px]">
            <LandingSocialChip
              label="Whatsapp"
              bg="#25D366"
              onTap={() => setDrawerOpen(true)}
              icon={<WhatsappGlyph />}
            />
            <LandingSocialChip
              label="Facebook"
              bg="#1877F2"
              onTap={() => setDrawerOpen(true)}
              icon={<FacebookGlyph />}
            />
            <LandingSocialChip
              label="Message"
              bg="#34C759"
              onTap={() => setDrawerOpen(true)}
              icon={<MessageGlyph />}
            />
          </div>
        </div>
      </div>

      <ShareDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onChipTap={handleChipTap}
        sharerName={sharerName}
        referralCode={referralCode}
        shareUrl={shareUrl}
      />
    </div>
  );
}

function LandingSocialChip({
  label,
  bg,
  onTap,
  icon,
}: {
  label: string;
  bg: string;
  onTap: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="flex flex-col items-center gap-[6px] cursor-pointer"
    >
      <span
        className="w-[48px] h-[48px] rounded-full flex items-center justify-center text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] hover:opacity-90 transition-opacity"
        style={{ background: bg }}
      >
        {icon}
      </span>
      <span className="font-montserrat text-primary-blue/70 text-[11px]">
        {label}
      </span>
    </button>
  );
}

function WhatsappGlyph() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
    </svg>
  );
}

function FacebookGlyph() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function MessageGlyph() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.486 2 2 5.582 2 10c0 2.128 1.028 4.084 2.708 5.53L4 21l5.53-2.708C10.412 18.42 11.19 18.5 12 18.5c5.514 0 10-3.582 10-8s-4.486-8.5-10-8.5z" />
    </svg>
  );
}

// Two circular avatars + double-arrow + +1 badges. Uses designer-supplied
// portraits from src/assets/images. The +1 badge is the "you get a bonus
// month, they get a bonus month" affordance for the reward variant.
function HeroIllustration() {
  return (
    <div className="flex items-center gap-[16px]">
      <AvatarPhoto src={AvatarLeft} />
      <ExchangeArrows />
      <AvatarPhoto src={AvatarRight} />
    </div>
  );
}

function AvatarPhoto({ src }: { src: StaticImageData }) {
  return (
    <div className="relative">
      <div className="w-[64px] h-[64px] rounded-full overflow-hidden bg-primary-blue/10">
        <Image
          src={src}
          alt=""
          width={64}
          height={64}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="absolute -bottom-[2px] -right-[2px] w-[32px] h-[32px] rounded-full bg-[#EDEDED] border-2 border-white flex items-center justify-center font-montserrat font-bold text-black text-[15px]">
        +1
      </div>
    </div>
  );
}

function ExchangeArrows() {
  return (
    <svg width={28} height={20} viewBox="0 0 28 20" fill="none">
      <path
        d="M2 6h20l-4-4"
        stroke="#092E4A"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M26 14H6l4 4"
        stroke="#092E4A"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// useSearchParams needs a Suspense boundary in the App Router. The inner
// component is what actually reads the URL.
export default function InvitePage() {
  return (
    <Suspense fallback={<div className="h-full" />}>
      <InvitePageInner />
    </Suspense>
  );
}
