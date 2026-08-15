"use client";

import { useEffect, useState } from "react";
import { CloseIcon } from "./icons";

const STORAGE_KEY = "epoch:app-download-banner-dismissed";
const APP_STORE_URL = "https://apps.apple.com/app/epoch-lag/id0000000000";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.epochlag.app";

function detectStoreUrl(): string {
  if (typeof navigator === "undefined") return APP_STORE_URL;
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return PLAY_STORE_URL;
  return APP_STORE_URL;
}

export default function AppDownloadBanner() {
  const [visible, setVisible] = useState(false);
  const [storeUrl, setStoreUrl] = useState(APP_STORE_URL);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = window.localStorage.getItem(STORAGE_KEY) === "1";
    if (dismissed) return;
    setStoreUrl(detectStoreUrl());
    setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="md:hidden bg-white border-b border-black/[0.06] px-[16px] py-[10px] flex items-center gap-[10px]">
      <span className="w-[36px] h-[36px] rounded-[8px] bg-primary-cream-dkr flex items-center justify-center shrink-0">
        <img src="/logo.svg" alt="" className="w-[24px] h-[24px]" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-montserrat font-semibold text-primary-blue text-[13px] leading-[16px]">
          Get the Epoch Lag App
        </p>
      </div>
      <a
        href={storeUrl}
        target="_blank"
        rel="noreferrer"
        className="shrink-0 bg-primary-blue text-white rounded-full px-[14px] py-[6px] font-montserrat font-semibold text-[12px]"
      >
        Download
      </a>
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
