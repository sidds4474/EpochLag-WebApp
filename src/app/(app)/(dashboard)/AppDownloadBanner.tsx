"use client";

import { useEffect, useState } from "react";
import { CloseIcon } from "./icons";
import { APP_STORE_URL, PLAY_STORE_URL } from "../../../utils/storeLinks";
import { tryOpenApp } from "@/lib/replies/installDetection";

const STORAGE_KEY = "epoch:app-download-banner-dismissed";
const IOS_DEEP_LINK = "epochlag://";
const ANDROID_PACKAGE = "com.epochlag.app";

type Platform = "ios" | "android" | "other";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "other";
}

// Chrome Android honors S.browser_fallback_url: opens the app if installed,
// otherwise navigates to the fallback. No timer or error page needed.
function androidIntentUrl(): string {
  const fallback = encodeURIComponent(PLAY_STORE_URL);
  return `intent://#Intent;scheme=epochlag;package=${ANDROID_PACKAGE};S.browser_fallback_url=${fallback};end`;
}

export default function AppDownloadBanner() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = window.localStorage.getItem(STORAGE_KEY) === "1";
    if (dismissed) return;
    setPlatform(detectPlatform());
    setVisible(true);
  }, []);

  if (!visible) return null;

  const handleDownloadClick = () => {
    if (pending) return;
    if (platform === "android") {
      window.location.href = androidIntentUrl();
      return;
    }
    if (platform === "ios") {
      setPending(true);
      tryOpenApp(IOS_DEEP_LINK, () => {
        setPending(false);
        window.location.href = APP_STORE_URL;
      });
      return;
    }
    window.location.href = APP_STORE_URL;
  };

  return (
    <div
      className="md:hidden bg-white border-b border-black/[0.06] px-[16px] pb-[10px] flex items-center gap-[10px]"
      style={{ paddingTop: "calc(10px + env(safe-area-inset-top))" }}
    >
      <span className="w-[36px] h-[36px] rounded-[8px] bg-primary-cream-dkr flex items-center justify-center shrink-0">
        <img src="/logo.svg" alt="" className="w-[24px] h-[24px]" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-montserrat font-semibold text-primary-blue text-[13px] leading-[16px]">
          Get the Epoch Lag App
        </p>
      </div>
      <button
        type="button"
        onClick={handleDownloadClick}
        disabled={pending}
        className="shrink-0 bg-primary-blue text-white rounded-full px-[14px] py-[6px] font-montserrat font-semibold text-[12px] disabled:opacity-60 disabled:cursor-wait"
      >
        Download
      </button>
      <button
        type="button"
        onClick={() => {
          try {
            window.localStorage.setItem(STORAGE_KEY, "1");
          } catch {}
          setVisible(false);
        }}
        aria-label="Dismiss"
        className="cursor-pointer shrink-0 p-[6px] text-primary-blue/60 hover:text-primary-blue"
      >
        <CloseIcon width={16} height={16} />
      </button>
    </div>
  );
}
