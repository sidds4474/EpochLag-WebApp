"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import DownloadModal from "../../views/StoryPage/components/DownloadModal";
import { storeFamilyInviteToken } from "../../lib/familyInvite/token";
import { detectPlatform } from "../../lib/platform";
import { APP_STORE_URL, PLAY_STORE_URL } from "../../utils/storeLinks";

const PEACH = "#FCD6A5";
const ORANGE_FILL = "#EF9849";
const TERRACOTTA = "#D95F3B";

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
  const [modalOpen, setModalOpen] = useState(false);

  const handleDownload = () => {
    const platform = detectPlatform(
      typeof navigator !== "undefined" ? navigator.userAgent : ""
    );
    if (platform === "ios") {
      window.location.href = APP_STORE_URL;
    } else if (platform === "android") {
      window.location.href = PLAY_STORE_URL;
    } else {
      setModalOpen(true);
    }
  };

  return (
    <main
      className="min-h-screen bg-warm-cream flex flex-col"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <section className="flex-1 flex flex-col items-center justify-center px-5 sm:px-8 py-10">
        <div className="w-full max-w-[340px] sm:max-w-[400px] md:max-w-[440px] flex flex-col items-center">
          <h1 className="font-lora font-medium text-[#151515] text-[20px] md:text-[22px] leading-[130%] text-center max-w-[300px]">
            You&apos;ve been added to a family tree on Epoch Lag!
          </h1>

          <div className="mt-[36px] md:mt-[44px] w-full flex justify-center">
            <FamilyTreeIllustration />
          </div>

          <p className="mt-[36px] md:mt-[44px] font-plus-jakarta text-black text-[16px] leading-[20px] text-center max-w-[260px]">
            Sign up to see the stories your family has shared with you.
          </p>
        </div>
      </section>

      <footer className="w-full px-5 sm:px-8 pb-8 md:pb-10">
        <div className="mx-auto w-full max-w-[380px] md:max-w-[420px] flex flex-col items-center gap-3">
          <a
            href="/signup"
            aria-disabled={!ready}
            className={`w-full bg-primary-orange text-primary-white font-plus-jakarta text-[16px] px-6 py-[16px] rounded-full text-center hover:opacity-90 active:opacity-80 transition-opacity leading-none ${
              ready ? "" : "opacity-70 pointer-events-none"
            }`}
          >
            Sign up
          </a>
          <button
            type="button"
            onClick={handleDownload}
            className="font-plus-jakarta text-[#2c2c2c] text-[15px] py-2 hover:opacity-70 transition-opacity"
          >
            Download Epoch Lag
          </button>
        </div>
      </footer>

      <DownloadModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        trackEvent="family_invite_download_clicked"
        position="family_invite"
      />
    </main>
  );
}

function FamilyTreeIllustration() {
  return (
    <div className="relative w-[300px] h-[232px]">
      {/* Parents beige card */}
      <div
        className="absolute bg-[#E8E6DF] rounded-[16px]"
        style={{ left: 20, top: 0, width: 236, height: 113 }}
      />

      {/* Louise avatar + name */}
      <PhotoAvatar
        src="/family-invite/louise.png"
        alt=""
        style={{ left: 46, top: 16 }}
      />
      <PersonLabel
        name="Louise"
        relation="Mom"
        style={{ left: 36, top: 70, width: 67 }}
      />

      {/* Glenn avatar + name */}
      <PhotoAvatar
        src="/family-invite/glenn.png"
        alt=""
        style={{ left: 155, top: 16 }}
      />
      <PersonLabel
        name="Glenn"
        relation="Dad"
        style={{ left: 145, top: 70, width: 67 }}
      />

      {/* + button on right of parent card */}
      <OrangePlus style={{ left: 266, top: 46 }} />

      {/* Connecting lines (SVG) */}
      <svg
        className="absolute"
        style={{ left: 0, top: 113, width: 300, height: 70 }}
        viewBox="0 0 300 70"
        fill="none"
        aria-hidden="true"
      >
        {/* vertical from parent card down to junction */}
        <line x1="138" y1="0" x2="138" y2="25" stroke="#092E4A" strokeOpacity="0.3" strokeWidth="1" strokeLinecap="round" />
        {/* horizontal split */}
        <line x1="98" y1="25" x2="178" y2="25" stroke="#092E4A" strokeOpacity="0.3" strokeWidth="1" strokeLinecap="round" />
        {/* vertical down to Me */}
        <line x1="98" y1="25" x2="98" y2="52" stroke="#092E4A" strokeOpacity="0.3" strokeWidth="1" strokeLinecap="round" />
        {/* vertical down to Alex */}
        <line x1="178" y1="25" x2="178" y2="52" stroke="#092E4A" strokeOpacity="0.3" strokeWidth="1" strokeLinecap="round" />
      </svg>

      {/* Me avatar + name */}
      <PhotoAvatar
        src="/family-invite/me.png"
        alt=""
        style={{ left: 74, top: 160 }}
      />
      <PersonLabel
        name="Me"
        style={{ left: 64, top: 214, width: 67 }}
      />

      {/* Alex initials avatar + name */}
      <InitialsAvatar initials="AS" style={{ left: 154, top: 160 }} />
      <PersonLabel
        name="Alex"
        relation="Brother"
        style={{ left: 144, top: 214, width: 67 }}
      />

      {/* + button on right of children row */}
      <OrangePlus style={{ left: 220, top: 174 }} />
    </div>
  );
}

type PositionStyle = { left: number; top: number; width?: number };

function PhotoAvatar({
  src,
  alt,
  style,
}: {
  src: string;
  alt: string;
  style: PositionStyle;
}) {
  return (
    <div
      className="absolute w-[47px] h-[47px] rounded-full overflow-hidden bg-[#F1F1F1]"
      style={style}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        decoding="async"
      />
    </div>
  );
}

function InitialsAvatar({
  initials,
  style,
}: {
  initials: string;
  style: PositionStyle;
}) {
  return (
    <div
      className="absolute w-[47px] h-[47px] rounded-full bg-[#2C2C2C] flex items-center justify-center"
      style={style}
    >
      <span className="font-montserrat font-medium text-white text-[18px] leading-none">
        {initials}
      </span>
    </div>
  );
}

function PersonLabel({
  name,
  relation,
  style,
}: {
  name: string;
  relation?: string;
  style: PositionStyle;
}) {
  return (
    <div
      className="absolute flex flex-col items-center"
      style={{ left: style.left, top: style.top, width: style.width }}
    >
      <span className="font-plus-jakarta text-[#2C2C2C] text-[16px] leading-[20px]">
        {name}
      </span>
      {relation ? (
        <span className="mt-[6px] font-montserrat font-medium text-[#848484] text-[12px] leading-[16px]">
          {relation}
        </span>
      ) : null}
    </div>
  );
}

function OrangePlus({ style }: { style: PositionStyle }) {
  // Overlay + button (used both on parent card and children row)
  return (
    <div
      className="absolute w-[20px] h-[20px] rounded-full flex items-center justify-center"
      style={{ ...style, backgroundColor: ORANGE_FILL }}
      aria-hidden="true"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M6 2v8M2 6h8"
          stroke="white"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function InvalidInviteState() {
  const [modalOpen, setModalOpen] = useState(false);

  const handleExit = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  return (
    <main
      className="min-h-screen bg-warm-cream flex flex-col"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <section className="flex-1 flex flex-col items-center justify-center px-5 sm:px-8">
        <div className="w-full max-w-[340px] sm:max-w-[400px] flex flex-col items-center">
          <div
            style={{ width: 100, height: 100, position: "relative", flexShrink: 0 }}
            aria-hidden="true"
          >
            <svg width={100} height={100} viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="50" fill={PEACH} />
              <circle cx="50" cy="50" r="36" fill={ORANGE_FILL} />
              <circle cx="50" cy="50" r="22" fill={TERRACOTTA} />
              <path d="M40 40 L60 60 M60 40 L40 60" stroke="white" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>

          <h1 className="mt-6 font-lora font-medium text-[#151515] text-[24px] md:text-[28px] leading-[120%] text-center max-w-[300px]">
            Invitation link is invalid or expired
          </h1>

          <p className="mt-[14px] md:mt-[18px] font-plus-jakarta text-black text-[16px] leading-[150%] text-center max-w-[320px]">
            Ask the person who invited you to send a fresh link.
          </p>
        </div>
      </section>

      <footer className="w-full px-5 sm:px-8 pb-8 md:pb-10">
        <div className="mx-auto w-full max-w-[380px] md:max-w-[420px] flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleExit}
            className="w-full bg-primary-orange text-primary-white font-plus-jakarta text-[16px] px-6 py-[16px] rounded-full hover:opacity-90 active:opacity-80 transition-opacity leading-none"
          >
            Exit
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="font-plus-jakarta text-[#2c2c2c] text-[15px] py-2 hover:opacity-70 transition-opacity"
          >
            Download Epoch Lag
          </button>
        </div>
      </footer>

      <DownloadModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        trackEvent="family_invite_download_clicked"
        position="family_invite_invalid"
      />
    </main>
  );
}
