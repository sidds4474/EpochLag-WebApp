"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppDispatch } from "../../../lib/onboarding/store";
import { resetCreateALag } from "../../../lib/onboarding/store/slices/createALagSlice";
import AvatarBrock from "../../../assets/images/newimgs/shareLag/brock.png";
import AvatarEllen from "../../../assets/images/newimgs/shareLag/ellen.png";
import AvatarLouise from "../../../assets/images/newimgs/shareLag/louise.png";
import AvatarNathalie from "../../../assets/images/newimgs/shareLag/nathalie.png";
import AvatarNathan from "../../../assets/images/newimgs/shareLag/nathan.png";
import AvatarPeter from "../../../assets/images/newimgs/shareLag/peter.png";
import AvatarSam from "../../../assets/images/newimgs/shareLag/sam.png";
import AvatarSofia from "../../../assets/images/newimgs/shareLag/sofia.png";
import AvatarTracy from "../../../assets/images/newimgs/shareLag/tracy.png";

const PUBLIC_HOST = "www.epochlag.com";
const PUBLIC_PATH = "story";

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

  const [copied, setCopied] = useState(false);

  const publicUrl = useMemo(() => {
    if (!publicCode) return `${PUBLIC_HOST}/${PUBLIC_PATH}/loading…`;
    return `${PUBLIC_HOST}/${PUBLIC_PATH}/${publicCode}`;
  }, [publicCode]);

  const handleShare = async () => {
    const url = `https://${publicUrl}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "Epoch Lag", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* user cancelled share sheet or clipboard write failed */
    }
  };

  const goNext = () => {
    // Anon flow terminates here — clear the composer state so a future anon
    // flow starts fresh. Then hand off to the preferences flow.
    dispatch(resetCreateALag());
    router.replace("/onboarding/add-relationship");
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#F3F1EB] overflow-hidden">
      <div className="absolute inset-0 overflow-y-auto px-[24px] md:px-[40px] pt-[max(env(safe-area-inset-top),32px)] pb-[160px] lg:pb-[100px]">
        <div className="w-full max-w-[640px] mx-auto flex flex-col items-center">
          <OrbitalPeople />

          <h1 className="mt-[24px] md:mt-[32px] font-ivy font-normal text-[#232323] text-[22px] md:text-[26px] lg:text-[28px] leading-[1.25] text-center max-w-[420px]">
            Stories are better told together
          </h1>
          <p className="mt-[10px] font-montserrat text-[13px] md:text-[13.5px] text-[#2c2c2c]/70 text-center leading-[1.6] max-w-[420px]">
            Lags are most valuable when built through shared storytelling. Add in the special people involved in this memory.
          </p>

          <div className="w-full max-w-[460px] mt-[32px]">
            <p className="font-montserrat text-[#232323] text-[13.5px] mb-[8px]">
              Share story using a link
            </p>
            <div className="flex items-center gap-[10px]">
              <div className="flex-1 bg-white rounded-full h-[44px] px-[18px] flex items-center font-montserrat text-[13.5px] text-[#232323] truncate shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                {publicUrl}
              </div>
              <button
                type="button"
                onClick={handleShare}
                disabled={!publicCode}
                className="shrink-0 h-[44px] px-[22px] rounded-full bg-[#1C1C1C] text-white font-montserrat font-medium text-[13.5px] cursor-pointer hover:brightness-110 transition-[filter] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {copied ? "Copied" : "Share"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Next pill */}
      <button
        type="button"
        onClick={goNext}
        className="hidden lg:inline-flex absolute bottom-[32px] right-[32px] cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[15px] rounded-full px-[40px] py-[12px] hover:opacity-90 transition-opacity"
      >
        Next
      </button>

      {/* Mobile + tablet Next pill */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-[#F3F1EB] px-[24px] md:px-[48px] pb-[max(env(safe-area-inset-bottom),24px)] pt-[16px]">
        <button
          type="button"
          onClick={goNext}
          className="w-full max-w-[520px] mx-auto block cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[16px] rounded-full py-[16px] hover:opacity-90 transition-opacity"
        >
          Next
        </button>
      </div>
    </div>
  );
}

type OrbitPerson = {
  name: string;
  src: string;
  angle: number; // 0 = top, clockwise degrees
  ring: "inner" | "outer";
  size: number;
  notification?: boolean;
  /** Hidden below the lg breakpoint — mobile + tablet only show the core 7
   *  avatars per the Figma. */
  desktopOnly?: boolean;
};

// Inner: Sofia, Ellen, Peter, Nathalie (notif).
// Outer core: Louise (lower-left), Nathalie (below center), Louise (lower-right).
// Desktop-only extras: Nathan, Sam, Tracy fill the right side of the orbit.
const PEOPLE: OrbitPerson[] = [
  { name: "Sofia", src: AvatarSofia.src, angle: 320, ring: "inner", size: 40 },
  { name: "Ellen", src: AvatarEllen.src, angle: 45, ring: "inner", size: 48 },
  { name: "Peter", src: AvatarPeter.src, angle: 120, ring: "inner", size: 44 },
  { name: "Nathalie", src: AvatarNathalie.src, angle: 215, ring: "inner", size: 44, notification: true },
  { name: "Louise", src: AvatarLouise.src, angle: 230, ring: "outer", size: 40 },
  { name: "Nathalie", src: AvatarNathalie.src, angle: 180, ring: "outer", size: 46 },
  { name: "Louise", src: AvatarLouise.src, angle: 130, ring: "outer", size: 40 },
  { name: "Nathan", src: AvatarNathan.src, angle: 20, ring: "outer", size: 42, desktopOnly: true },
  { name: "Sam", src: AvatarSam.src, angle: 70, ring: "outer", size: 42, desktopOnly: true },
  { name: "Tracy", src: AvatarTracy.src, angle: 300, ring: "outer", size: 42, desktopOnly: true },
  { name: "Brock", src: AvatarBrock.src, angle: 0, ring: "outer", size: 0 },
];

function OrbitalPeople() {
  // The canvas is a square — avatars sit absolutely on two concentric ring
  // guides. Sizes scale down slightly on mobile via Tailwind clamp.
  return (
    <div className="relative w-[320px] h-[320px] md:w-[420px] md:h-[420px] mt-[16px] md:mt-[24px]">
      {/* Inner orbit guide */}
      <OrbitRing className="w-[48%] h-[48%]" />
      {/* Outer orbit guide */}
      <OrbitRing className="w-[94%] h-[94%]" />

      {/* Center + button */}
      <button
        type="button"
        aria-label="Invite more people"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[44px] h-[44px] md:w-[52px] md:h-[52px] rounded-full bg-primary-orange text-white flex items-center justify-center shadow-[0_4px_10px_rgba(239,152,73,0.3)] cursor-pointer hover:opacity-90 transition-opacity"
      >
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden>
          <line x1={12} y1={5} x2={12} y2={19} />
          <line x1={5} y1={12} x2={19} y2={12} />
        </svg>
      </button>

      {PEOPLE.filter((p) => p.size > 0).map((p, i) => {
        const rad = (p.angle - 90) * (Math.PI / 180);
        const ringPct = p.ring === "inner" ? 24 : 47;
        const x = 50 + ringPct * Math.cos(rad);
        const y = 50 + ringPct * Math.sin(rad);
        return (
          <OrbitAvatar
            key={i}
            name={p.name}
            src={p.src}
            x={x}
            y={y}
            size={p.size}
            notification={p.notification}
            hiddenOnMobile={p.desktopOnly}
          />
        );
      })}
    </div>
  );
}

function OrbitRing({ className }: { className: string }) {
  return (
    <div
      aria-hidden
      className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#2c2c2c]/15 ${className}`}
    />
  );
}

function OrbitAvatar({
  name,
  src,
  x,
  y,
  size,
  notification,
  hiddenOnMobile,
}: {
  name: string;
  src: string;
  x: number;
  y: number;
  size: number;
  notification?: boolean;
  hiddenOnMobile?: boolean;
}) {
  return (
    <div
      className={`absolute flex-col items-center ${
        hiddenOnMobile ? "hidden lg:flex" : "flex"
      }`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <span
        className="relative rounded-full overflow-hidden bg-[#D9D9D9] block"
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
        />
        {notification && (
          <span className="absolute top-0 right-0 w-[8px] h-[8px] rounded-full bg-primary-orange ring-2 ring-[#F3F1EB]" />
        )}
      </span>
      <span className="mt-[4px] font-montserrat text-[11px] md:text-[12px] text-[#232323] whitespace-nowrap">
        {name}
      </span>
    </div>
  );
}
