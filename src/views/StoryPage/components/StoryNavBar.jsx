"use client";

import { useState } from "react";
import Link from "next/link";
import LogoDark from "../../../assets/images/logo-dark.webp";
import DownloadModal from "./DownloadModal";
import {
  APP_STORE_URL,
  PLAY_STORE_URL,
} from "../../../utils/storeLinks";

function isMobileUA() {
  if (typeof navigator === "undefined") return false;
  return /android|iPad|iPhone|iPod/i.test(navigator.userAgent || "");
}

function trackHeaderClick(publicCode, store) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", "public_story_app_cta_clicked", {
    store,
    position: "header",
    public_code: publicCode,
  });
}

const StoryNavBar = ({ publicCode, platform }) => {
  const [modalOpen, setModalOpen] = useState(false);

  const handleClick = (e) => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
    const isAndroid = /android/i.test(ua);
    const isIos = /iPad|iPhone|iPod/.test(ua);

    if (!isMobileUA()) {
      e.preventDefault();
      setModalOpen(true);
      trackHeaderClick(publicCode, "modal");
      return;
    }

    const target = isAndroid ? PLAY_STORE_URL : APP_STORE_URL;
    e.preventDefault();
    window.location.href = target;
    trackHeaderClick(publicCode, isAndroid ? "android" : "ios");
  };

  return (
    <>
      <nav className="w-full bg-warm-cream flex items-center justify-between px-[16px] md:px-[24px] lg:px-[64px] py-[16px] md:py-[20px]">
        <Link href="/" className="block cursor-pointer">
          <img
            src={LogoDark.src}
            alt="Epoch Lag Logo"
            className="w-[120px] md:w-[150px] h-auto object-contain"
            fetchPriority="high"
            decoding="async"
          />
        </Link>
        <a
          href={platform === "android" ? PLAY_STORE_URL : APP_STORE_URL}
          onClick={handleClick}
          className="cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[13px] md:text-[14px] px-[20px] md:px-[28px] py-[10px] md:py-[12px] rounded-full hover:opacity-90 transition-opacity"
        >
          Download the App
        </a>
      </nav>
      <DownloadModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        publicCode={publicCode}
      />
    </>
  );
};

export default StoryNavBar;
