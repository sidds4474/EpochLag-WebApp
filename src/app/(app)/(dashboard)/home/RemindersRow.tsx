"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { DockingItem } from "../../../../lib/home/api";
import {
  fetchUserCard,
  getCachedUserCard,
} from "../../../../lib/home/api";
import {
  buildInviteHref,
  buildPromptDetailHref,
  resolveDockingAction,
} from "../../../../lib/home/dockingActionRouter";
import { DOCKING_PROGRESS_ENABLED } from "../../../../lib/flags";
import {
  AvatarWithBadge,
  CircleArrowButton,
  SectionHeader,
} from "../../../../components/ui";
import { useRailScroll } from "../../../../lib/nav/useRailScroll";
import { PlusIcon } from "../icons";

// Dimensions ported from the mobile app's HomeTile (Figma node 13147-13258):
//   • Card: h=143, radius=13, padding 14/12/13/12, shadow 17.8/0.15
//   • Thumb circle: 54×54
//   • Icon overlay: 26×26 white circle at bottom-right (offset -2/-2)
//   • Arrow: 28×28 rounded, bg #FFD9AA
// Desktop keeps a larger tile per user-tuned dimensions in the JSX.
const MOBILE_TILE_HEIGHT = 143;
const DESKTOP_TILE_HEIGHT = 200;

export default function RemindersRow({
  items,
  loading,
}: {
  items: DockingItem[] | null;
  loading: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const { canLeft, canRight, scrollLeft, scrollRight } = useRailScroll(scrollerRef);
  return (
    <section className="mt-[24px] md:mt-[32px]">
      <SectionHeader
        title="What's new?"
        onScrollLeft={scrollLeft}
        onScrollRight={scrollRight}
        canScrollLeft={canLeft}
        canScrollRight={canRight}
      />
      {loading || items === null ? (
        <ReminderSkeleton />
      ) : items.length === 0 ? (
        <div className="flex gap-[16px]">
          <AddMomentCTA />
        </div>
      ) : (
        <Carousel scrollerRef={scrollerRef}>
          {items.map((it) => (
            <DockingTile key={it._id} item={it} />
          ))}
        </Carousel>
      )}
    </section>
  );
}

function Carousel({
  children,
  scrollerRef,
}: {
  children: ReactNode;
  scrollerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [tileCount, setTileCount] = useState(0);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setTileCount(el.children.length);
    const onScroll = () => {
      const width = el.clientWidth;
      setActive(Math.round(el.scrollLeft / width));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [children, scrollerRef]);

  return (
    <div>
      <div
        ref={scrollerRef}
        className="flex gap-[16px] overflow-x-auto snap-x snap-mandatory scrollbar-hide py-[14px] px-[14px]"
      >
        {children}
      </div>
      {tileCount > 1 && (
        <div className="md:hidden flex items-center justify-center gap-[6px] mt-[10px]">
          {Array.from({ length: tileCount }).map((_, i) => (
            <span
              key={i}
              className={`h-[6px] rounded-full transition-all ${
                i === active
                  ? "w-[16px] bg-primary-orange"
                  : "w-[6px] bg-[#D0D0D0]"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Two-tier tile thumb fallback. Priority: BE-provided cover → per-type
// bundled/S3 fallback → gradient blob (rendered downstream by TileCover
// when both are null). Matches mobile's HomeTile `thumbUrl || thumbSource`
// rule (see mapDockingItemToTile.js: FALLBACK_TILE_THUMB / HOWS_LIFE_TILE_THUMB).
//
// The hows-life URL is the same S3 mirror used by the composer + share
// preview downstream — keeping the on-screen and persisted covers aligned.
const HOWS_LIFE_TILE_THUMB =
  "https://epochlag-bucket.s3.us-east-1.amazonaws.com/color-gradient/gradient-image-18.png";
const GENERIC_TILE_THUMB = "/gradients/8.jpg";
const CHALLENGE_TILE_THUMB = "/gradients/9.jpg";

const FALLBACK_THUMB_BY_TYPE: Record<string, string> = {
  "hows-life": HOWS_LIFE_TILE_THUMB,
  challenge: CHALLENGE_TILE_THUMB,
  card_of_the_day: GENERIC_TILE_THUMB,
  announcement: GENERIC_TILE_THUMB,
};

// hows-life docking cards are wrappers — the real cover lives on the
// underlying user-card at action.cardId, but BE ships imagePath: null on
// the outer tile. Fetch the wrapped card lazily so cookbook / How's Life /
// other hows-life tiles each show their distinct prompt cover (matches
// what the user sees after tapping through to PromptDetail).
function DockingTile({ item }: { item: DockingItem }) {
  const router = useRouter();
  const isMomentLike = item.type === "moment" || item.type === "birthday";
  const isHowsLifeTile = item.type === "hows-life";
  const innerPromptId =
    isHowsLifeTile && item.action && typeof item.action === "object"
      ? typeof (item.action as Record<string, unknown>).cardId === "string"
        ? ((item.action as Record<string, unknown>).cardId as string)
        : null
      : null;

  const [innerCover, setInnerCover] = useState<string | null>(() => {
    if (!innerPromptId) return null;
    const cached = getCachedUserCard(innerPromptId);
    return cached?.imageUrl ?? null;
  });
  useEffect(() => {
    if (!innerPromptId || innerCover) return;
    let cancelled = false;
    fetchUserCard(innerPromptId)
      .then((card) => {
        if (cancelled) return;
        if (card?.imageUrl) setInnerCover(card.imageUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [innerPromptId, innerCover]);

  // Moment/birthday use the recipient's profile photo when present; other
  // types read imagePath. Then fall through to the wrapped-prompt cover
  // (hows-life only), then the per-type bundled fallback, then the gradient
  // blob rendered inside TileCover.
  const beCover = isMomentLike ? item.profilePhotoPath : item.imagePath;
  const cover =
    beCover || innerCover || FALLBACK_THUMB_BY_TYPE[item.type] || null;
  const isChallenge = item.type === "challenge";
  const isHowsLife = item.type === "hows-life";
  // Progress gating is behind DOCKING_PROGRESS_ENABLED — currently off per BE
  // guidance. When the flag is false, neither `challenge` nor `hows-life`
  // tiles show a Done state or disable on tap, matching mobile.
  const isDone =
    DOCKING_PROGRESS_ENABLED &&
    (isChallenge || isHowsLife) &&
    item.progressStatus === "completed";
  const disabled = isDone;

  // hows-life shares the "Challenge" overline with real challenges — it's a
  // first-class card type on the mobile side (mapDockingItemToTile.js:180).
  const overline =
    item.type === "card_of_the_day"
      ? "Prompt"
      : item.type === "challenge" || item.type === "hows-life"
        ? "Challenge"
        : item.type === "announcement"
          ? "Announcement"
          : "";

  const subLabel = isDone
    ? "Done"
    : isMomentLike && item.source === "birthday"
      ? "Today"
      : "";

  const onOpen = async () => {
    if (disabled) return;
    if (item.type === "card_of_the_day") {
      // Prompt of the Day opens the flip-card read view (mobile parity).
      // User taps "Answer yourself" on the back face to reach the composer,
      // or "Send it to someone" to open the share modal.
      const q = new URLSearchParams({ mode: "curated" });
      router.push(
        `/prompt/detail/${encodeURIComponent(item._id)}?${q.toString()}`
      );
      return;
    }
    if (isMomentLike) {
      const params = new URLSearchParams({
        wishRecipient: item.recipient?.userId ?? "",
        firstName: item.recipient?.firstName ?? "",
        momentType: item.momentIcon ?? item.type,
      });
      router.push(`/new-story?${params.toString()}`);
      return;
    }
    // Challenge / announcement / referral / hows-life tiles all resolve via
    // the docking action router. Unknown action.kind falls through and does
    // nothing — matches mobile's silent fallback for unroutable tiles.
    const route = resolveDockingAction(item);
    if (route.kind === "invite") {
      router.push(buildInviteHref(route));
      return;
    }
    if (route.kind === "prompt-detail") {
      router.push(buildPromptDetailHref(route));
      return;
    }
  };

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={disabled}
      className={`snap-start shrink-0
        w-[calc((100vw-42px)/2)] max-w-[240px] h-[143px]
        md:w-[280px] md:max-w-none md:h-[200px]
        text-left bg-white
        rounded-[13px] md:rounded-[24px]
        shadow-[0_0_17.8px_rgba(0,0,0,0.15)]
        pt-[14px] pb-[13px] px-[12px]
        md:pt-[16px] md:pb-[24px] md:px-[16px]
        flex flex-col justify-between transition-shadow ${
          disabled ? "opacity-70 cursor-default" : "hover:shadow-[0_2px_20px_rgba(0,0,0,0.15)] cursor-pointer"
        }`}
    >
      <div className="flex items-start justify-between">
        <TileCover item={item} cover={cover ?? null} />
        <CircleArrowButton
          as="span"
          ariaLabel="Open"
          size={28}
          variant="cream"
        />
      </div>
      <div className="flex items-end justify-between gap-[6px]">
        <div className="flex-1 min-w-0">
          {overline && (
            <p className="font-montserrat font-medium text-primary-orange text-[11px] leading-[14px] mb-[2px] md:text-[13px] md:leading-[16px]">
              {overline}
            </p>
          )}
          <h3 className="font-montserrat font-medium text-black text-[14px] leading-[16px] md:text-primary-blue md:text-[15px] md:leading-[20px] line-clamp-2">
            {item.title || (isHowsLife ? "How's Life" : "")}
          </h3>
        </div>
        {subLabel && (
          <p className="shrink-0 font-montserrat font-normal text-[#848484] text-[11px] leading-[16px] md:text-[13px] md:leading-[20px]">
            {subLabel}
          </p>
        )}
      </div>
    </button>
  );
}

// Gradient blobs keyed by tile type. These stand in when the BE doesn't
// ship a cover so we don't need to bundle placeholder art on the client.
const GRADIENT_BY_TYPE: Record<string, string> = {
  challenge: "linear-gradient(135deg, #a8c5e0 0%, #6d8fb5 55%, #3a5877 100%)",
  "hows-life": "linear-gradient(135deg, #f5b7a1 0%, #d97a5a 55%, #6b3a2a 100%)",
  card_of_the_day:
    "linear-gradient(135deg, #f2d0a4 0%, #d78a5a 55%, #6b3a2a 100%)",
  announcement:
    "linear-gradient(135deg, #f2a45c 0%, #d76a3a 55%, #4a2a3a 100%)",
  moment: "linear-gradient(135deg, #f5c9a1 0%, #d78a5a 100%)",
  birthday: "linear-gradient(135deg, #f5c9a1 0%, #d78a5a 100%)",
};
const GRADIENT_FALLBACK =
  "linear-gradient(135deg, #d0dae5 0%, #8ca3b7 100%)";

function TileCover({
  item,
  cover,
}: {
  item: DockingItem;
  cover: string | null;
}) {
  const isMomentLike = item.type === "moment" || item.type === "birthday";
  const fallbackChar = (item.recipient?.firstName || item.title || "?")
    .charAt(0)
    .toUpperCase();
  const gradient = GRADIENT_BY_TYPE[item.type] ?? GRADIENT_FALLBACK;
  const badge = isMomentLike ? (
    <MomentIcon icon={item.momentIcon} />
  ) : (
    <TypeIcon type={item.type} />
  );

  // Mobile app HomeTile spec: thumb 54, icon badge 26 white circle at
  // bottom-right offset -2/-2. Desktop retains the larger 64/27 sizes.
  //
  // No cover from BE → render a soft gradient blob keyed to the tile type.
  // Only moment/birthday show an initial fallback (person-shaped context).
  if (!cover) {
    return (
      <div className="relative shrink-0 w-[54px] h-[54px] md:w-[64px] md:h-[64px]">
        <div
          className="w-full h-full rounded-full"
          style={{ background: gradient }}
        >
          {isMomentLike && (
            <div className="w-full h-full flex items-center justify-center font-montserrat font-semibold text-white text-[20px] md:text-[22px]">
              {fallbackChar}
            </div>
          )}
        </div>
        {/* 26×26 white circle at -2/-2 per HomeTile spec */}
        <div className="absolute -bottom-[2px] -right-[2px] w-[26px] h-[26px] md:w-[27px] md:h-[27px] rounded-full bg-white flex items-center justify-center text-primary-blue">
          {badge}
        </div>
      </div>
    );
  }

  // AvatarWithBadge doesn't accept per-breakpoint sizing, so build the
  // mobile-vs-desktop variant inline here.
  return (
    <div className="relative shrink-0 w-[54px] h-[54px] md:w-[64px] md:h-[64px]">
      <div className="w-full h-full rounded-full overflow-hidden bg-primary-blue/15">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cover}
          alt=""
          className="w-full h-full object-cover"
        />
      </div>
      <div className="absolute -bottom-[2px] -right-[2px] w-[26px] h-[26px] md:w-[27px] md:h-[27px] rounded-full bg-white flex items-center justify-center text-primary-blue">
        {badge}
      </div>
    </div>
  );
}

function TypeIcon({ type }: { type: string }) {
  if (type === "challenge" || type === "hows-life") return <FlagIcon />;
  if (type === "card_of_the_day" || type === "announcement")
    return <SparkleIcon />;
  return <SparkleIcon />;
}

function MomentIcon({ icon }: { icon?: string }) {
  if (icon === "wedding" || icon === "anniversary") return <HeartIcon />;
  if (icon === "graduation") return <CapIcon />;
  if (icon === "travel") return <PlaneIcon />;
  if (icon === "newbaby") return <BabyIcon />;
  if (icon === "firsthome") return <HouseIcon />;
  return <CakeIcon />;
}

// Minimal inline icons — kept local so this file is self-contained.
// Birthday cake supplied by the design — the outer white circle is dropped
// because AvatarWithBadge (and the gradient-fallback TileCover) already wrap
// the icon in a white circle.
function CakeIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M36.0652 31.778H35.6485C35.5994 31.778 35.56 31.7338 35.56 31.6787V25.3941L35.5957 25.3155C36.343 24.6934 36.6048 23.9444 36.6048 22.8077C36.6048 20.3566 34.8348 18.3704 32.6507 18.3704H31.2286C31.1855 18.3704 31.1499 18.3304 31.1499 18.2821V13.3935C31.1499 13.3452 31.1142 13.3052 31.0712 13.3052H29.1955C29.1525 13.3052 29.1168 13.3452 29.1168 13.3935V18.2821C29.1168 18.3304 29.0812 18.3704 29.0382 18.3704H24.4311C24.3881 18.3704 24.3524 18.3304 24.3524 18.2821V13.3935C24.3524 13.3452 24.3168 13.3052 24.2738 13.3052H22.3981C22.355 13.3052 22.3194 13.3452 22.3194 13.3935V18.2821C22.3194 18.3304 22.2837 18.3704 22.2407 18.3704H17.6336C17.5906 18.3704 17.555 18.3304 17.555 18.2821V13.3935C17.555 13.3452 17.5193 13.3052 17.4763 13.3052H15.6006C15.5576 13.3052 15.5219 13.3452 15.5219 13.3935V18.2821C15.5219 18.3304 15.4863 18.3704 15.4433 18.3704H14.192C12.6985 18.3704 11.269 19.169 10.448 20.5691C9.29504 22.532 9.82605 24.557 11.0565 25.5817L11.0897 25.6562V31.6788C11.0897 31.7339 11.0503 31.7781 11.0012 31.7781H10.3497C9.68225 31.7781 9.08365 32.3395 9.048 33.0871C9.01113 33.8858 9.57655 34.5451 10.2796 34.5451H36.1329C36.836 34.5451 37.4014 33.8844 37.3645 33.0871C37.3301 32.3381 36.7315 31.7767 36.0628 31.7767L36.0652 31.778ZM33.881 30.0427C33.881 30.0979 33.8417 30.142 33.7925 30.142H12.6237C12.5746 30.142 12.5352 30.0979 12.5352 30.0427V28.4853C12.5352 28.4302 12.5746 28.386 12.6237 28.386H33.7937C33.8429 28.386 33.8822 28.4302 33.8822 28.4853V30.0427H33.881ZM35.313 24.1084C35.2331 24.525 34.8152 24.7347 34.487 24.5195C33.9867 24.1912 33.3082 23.7939 32.9013 23.8312C31.6463 23.9388 31.3513 25.0933 30.0927 25.0933C28.8377 25.0933 28.791 23.9236 27.5323 23.9236C26.2773 23.9236 25.7131 25.0933 24.4569 25.0933C23.1982 25.0933 22.8147 23.7443 21.6236 23.7443C21.0632 23.7443 20.8997 24.3857 20.5887 25.0933C20.2051 25.9775 19.5918 26.9638 17.705 26.9638C16.1734 26.9638 15.6547 25.9568 15.2614 25.0933C14.964 24.445 14.7365 23.8753 14.1969 23.8753C12.9383 23.8753 13.2886 24.4685 12.5117 24.4285C11.7853 24.3885 11.0896 23.936 11.0896 22.6615C11.0896 21.8021 11.4018 21.0173 11.9058 20.4531C12.4098 19.8875 13.1079 19.5371 13.8737 19.5371H32.717C34.2559 19.5371 35.5011 20.9386 35.5011 22.6615C35.5011 23.016 35.4077 23.6146 35.3143 24.1085L35.313 24.1084Z"
        fill="#EF9849"
      />
      <path
        d="M14.3112 10.4714L15.2527 8.24854H15.7252L17.1375 9.91572V11.0272C16.8236 11.2124 16.1018 11.6941 15.7252 12.1386C15.2544 12.6944 14.7819 11.5829 14.3112 11.5829C13.9345 11.5829 14.1542 10.8419 14.3112 10.4714Z"
        fill="#FCD6A5"
      />
      <path
        d="M30.7167 11.7597C31.4106 11.1221 31.4922 10.1112 30.9113 9.36712L29.5492 7.36894C29.4132 7.1941 29.1328 7.19278 28.9997 7.365L27.6191 9.34214C27.051 10.077 27.1512 11.0905 27.8566 11.7386C28.6535 12.4709 29.9341 12.4801 30.7181 11.7597L30.7167 11.7597ZM28.4618 10.0284L29.0899 9.02533C29.1829 8.90439 29.3775 8.90439 29.4719 9.02402L30.0757 10.0507C30.3619 10.4175 30.3247 10.9092 29.9856 11.2207C29.8053 11.3864 29.5621 11.4784 29.3031 11.4784C29.0327 11.4784 28.778 11.3811 28.5848 11.2036C28.2357 10.8829 28.1842 10.3886 28.4632 10.0284L28.4618 10.0284Z"
        fill="#FCD6A5"
      />
      <path
        d="M24.648 11.7597C25.3419 11.1221 25.4235 10.1112 24.8426 9.36712L23.4805 7.36894C23.3445 7.1941 23.0641 7.19278 22.931 7.365L21.5504 9.34214C20.9823 10.077 21.0825 11.0905 21.7879 11.7386C22.5848 12.4709 23.8654 12.4801 24.6494 11.7597L24.648 11.7597ZM22.3916 10.0284L23.0197 9.02533C23.1127 8.90439 23.3073 8.90439 23.4018 9.02402L24.0055 10.0507C24.2917 10.4175 24.2545 10.9092 23.9154 11.2207C23.7351 11.3864 23.4919 11.4784 23.2329 11.4784C22.9625 11.4784 22.7078 11.3811 22.5147 11.2036C22.1656 10.8829 22.1141 10.3886 22.3931 10.0284L22.3916 10.0284Z"
        fill="#FCD6A5"
      />
      <path
        d="M17.568 11.7597C18.2619 11.1221 18.3434 10.1112 17.7626 9.36712L16.4004 7.36894C16.2645 7.1941 15.9841 7.19278 15.851 7.365L14.4703 9.34214C13.9023 10.077 14.0025 11.0905 14.7079 11.7386C15.5048 12.4709 16.7853 12.4801 17.5694 11.7597L17.568 11.7597ZM15.3116 10.0284L15.9397 9.02533C16.0327 8.90439 16.2273 8.90439 16.3217 9.02402L16.9255 10.0507C17.2117 10.4175 17.1745 10.9092 16.8354 11.2207C16.6551 11.3864 16.4119 11.4784 16.1529 11.4784C15.8825 11.4784 15.6278 11.3811 15.4347 11.2036C15.0856 10.8829 15.034 10.3886 15.3131 10.0284L15.3116 10.0284Z"
        fill="#FCD6A5"
      />
      <path
        d="M21.1832 9.98241L22.7004 8.24854L23.7118 9.11547L24.2175 10.8493L23.2061 11.2828H22.1947L21.1832 9.98241Z"
        fill="#FCD6A5"
      />
      <path
        d="M27.2519 9.98241L28.7691 8.24854L30.2862 9.98241L29.7805 11.2828H27.7576L27.2519 9.98241Z"
        fill="#FCD6A5"
      />
      <rect
        x="11.0694"
        y="27.4658"
        width="24.2742"
        height="3.03428"
        fill="#FCD6A5"
      />
    </svg>
  );
}
// Design-supplied shooting-star artwork for the card-of-the-day tile.
function SparkleIcon() {
  return (
    <svg
      width={19}
      height={19}
      viewBox="0 0 31 31"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13.1707 21.1651C13.1766 21.0243 13.4098 20.9684 13.479 21.0911C13.8037 21.6675 14.3575 22.515 14.9859 22.9004C15.6143 23.2858 16.6209 23.3951 17.2817 23.4232C17.4225 23.4291 17.4784 23.6624 17.3556 23.7315C16.7793 24.0562 15.9318 24.61 15.5464 25.2384C15.161 25.8668 15.0517 26.8734 15.0236 27.5342C15.0176 27.675 14.7844 27.7309 14.7153 27.6081C14.3906 27.0318 13.8368 26.1843 13.2084 25.7989C12.58 25.4135 11.5734 25.3042 10.9126 25.2761C10.7718 25.2701 10.7159 25.0369 10.8386 24.9678C11.415 24.6431 12.2625 24.0893 12.6479 23.4609C13.0333 22.8325 13.1426 21.8259 13.1707 21.1651Z"
        fill="#092E4A"
      />
      <path
        d="M23.6988 19.8833C23.6879 19.7428 23.4421 19.6838 23.3687 19.8041C23.1479 20.1662 22.8295 20.6031 22.4755 20.8202C22.1216 21.0372 21.5878 21.1229 21.1649 21.1556C21.0244 21.1664 20.9655 21.4123 21.0858 21.4857C21.4479 21.7065 21.8848 22.0249 22.1019 22.3789C22.3189 22.7328 22.4046 23.2666 22.4373 23.6895C22.4481 23.8299 22.694 23.8889 22.7674 23.7686C22.9882 23.4065 23.3066 22.9696 23.6605 22.7525C24.0145 22.5355 24.5483 22.4498 24.9711 22.4171C25.1116 22.4063 25.1706 22.1604 25.0503 22.087C24.6882 21.8662 24.2512 21.5478 24.0342 21.1939C23.8171 20.8399 23.7314 20.3061 23.6988 19.8833Z"
        fill="#092E4A"
      />
      <path
        d="M18.8437 5.12843L18.5331 4.73617C17.3328 3.21999 16.7326 2.4619 16.0343 2.57381C15.3361 2.68573 15.0022 3.59352 14.3345 5.40911L14.1617 5.87883C13.972 6.39476 13.8771 6.65273 13.6951 6.84207C13.5132 7.03141 13.2647 7.13069 12.7678 7.32924L12.3154 7.51001L11.9978 7.63711C10.4605 8.25387 9.68591 8.60338 9.587 9.28251C9.48151 10.0069 10.2147 10.6266 11.6811 11.866L12.0604 12.1867C12.4771 12.5389 12.6855 12.715 12.8049 12.955C12.9243 13.195 12.9413 13.4718 12.9754 14.0254L13.0063 14.5293C13.126 16.4774 13.1858 17.4514 13.8189 17.7872C14.4519 18.123 15.2389 17.5982 16.8129 16.5486L17.2201 16.277C17.6674 15.9787 17.8911 15.8296 18.1469 15.7886C18.4026 15.7476 18.6616 15.8194 19.1795 15.963L19.651 16.0937C21.4736 16.5989 22.3849 16.8515 22.8816 16.3346C23.3784 15.8178 23.1316 14.8737 22.638 12.9856L22.5103 12.4972C22.3701 11.9606 22.2999 11.6923 22.3386 11.427C22.3772 11.1616 22.5203 10.9292 22.8063 10.4644L23.0668 10.0412C24.0735 8.40539 24.5769 7.58751 24.2509 6.93226C23.9248 6.27702 22.9853 6.21837 21.1062 6.10107L20.6201 6.07072C20.0861 6.03739 19.8191 6.02072 19.5872 5.89771C19.3553 5.7747 19.1848 5.55928 18.8437 5.12843Z"
        fill="#092E4A"
      />
      <path
        d="M11.3226 17.0783C8.58351 18.4165 6.30437 20.5359 5.44461 23.0685C4.48017 17.0355 5.81796 13.1396 7.96241 10.7183C8.14721 11.096 8.38735 11.4087 8.60305 11.653C9.05146 12.1611 9.69521 12.7049 10.3489 13.2571L10.8192 13.6547C10.9084 13.73 10.9778 13.7887 11.0367 13.8396C11.0427 13.9221 11.0487 14.0183 11.0563 14.1431L11.0945 14.7653C11.1459 15.6047 11.1961 16.4241 11.3226 17.0783Z"
        fill="#092E4A"
      />
    </svg>
  );
}
// Design-supplied flag artwork for the challenge tile.
function FlagIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6.50202 1.13086C6.97041 1.13086 7.35011 1.51056 7.35011 1.97895V4.07091L9.29582 3.68176C11.1622 3.30848 13.0969 3.48611 14.8641 4.193L15.3314 4.37993C16.9427 5.02442 18.716 5.14478 20.3996 4.72389C21.1131 4.54552 21.686 5.31885 21.3077 5.9495L19.8619 8.35909C19.4757 9.00269 19.2827 9.32448 19.2369 9.67451C19.2178 9.82052 19.2178 9.9684 19.2369 10.1144C19.2827 10.4644 19.4757 10.7862 19.8619 11.4298L21.6267 14.3711C21.9781 14.9569 21.6638 15.7157 21.0011 15.8814L20.8879 15.9097C18.8869 16.4099 16.7792 16.2669 14.8641 15.5009C13.0969 14.794 11.1622 14.6164 9.29582 14.9896L7.35011 15.3788V24.5947C7.35011 25.0631 6.97041 25.4428 6.50202 25.4428C6.03363 25.4428 5.65393 25.0631 5.65393 24.5947V1.97895C5.65393 1.51056 6.03363 1.13086 6.50202 1.13086Z"
        fill="#092E4A"
      />
    </svg>
  );
}
function HeartIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21s-7-4.35-9-9C1 8 3.5 4 8 4c2 0 3 1 4 2 1-1 2-2 4-2 4.5 0 7 4 5 8-2 4.65-9 9-9 9z" />
    </svg>
  );
}
function CapIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10L12 5 2 10l10 5 10-5z" />
      <path d="M6 12v5c3 2 9 2 12 0v-5" />
    </svg>
  );
}
function PlaneIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 3 20 2s-4 0-5.5 1.5L11 7l-8.2-1.8L1 7l7 3.5L4.5 15 3 14.5 2 15.5l3 3 3-1-.5-1.5 4.5-3.5 3.5 7 1.8-1.8z" />
    </svg>
  );
}
function BabyIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <path d="M9 9h.01M15 9h.01" />
    </svg>
  );
}
function HouseIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12l9-9 9 9" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function AddMomentCTA() {
  return (
    <Link
      href="/new-story?moment=1"
      className="shrink-0 w-[calc((100vw-42px)/2)] max-w-[240px] h-[143px] md:w-[280px] md:max-w-none md:h-[200px] bg-white rounded-[13px] md:rounded-[24px] shadow-[0_0_17.8px_rgba(0,0,0,0.15)] p-[16px] flex flex-col items-center justify-center gap-[10px] text-primary-blue/70 hover:text-primary-blue transition-colors"
    >
      <span className="w-[44px] h-[44px] rounded-full bg-primary-cream flex items-center justify-center">
        <PlusIcon width={18} height={18} strokeWidth={2} />
      </span>
      <span className="font-montserrat font-semibold text-[13px]">
        Add a Moment
      </span>
    </Link>
  );
}

function ReminderSkeleton() {
  return (
    <div className="flex gap-[16px] overflow-hidden">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="shrink-0 w-[calc((100vw-42px)/2)] max-w-[240px] h-[143px] md:w-[280px] md:max-w-none md:h-[200px] bg-white rounded-[13px] md:rounded-[24px] shadow-[0_0_17.8px_rgba(0,0,0,0.15)] p-[14px] md:p-[16px] flex flex-col gap-[12px]"
        >
          <div className="flex items-start justify-between">
            <div className="w-[64px] h-[64px] rounded-full bg-black/[0.06] animate-pulse" />
            <div className="w-[32px] h-[32px] rounded-full bg-black/[0.06] animate-pulse" />
          </div>
          <div className="h-[14px] w-2/3 bg-black/[0.06] rounded animate-pulse" />
          <div className="h-[12px] w-1/3 bg-black/[0.06] rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}
