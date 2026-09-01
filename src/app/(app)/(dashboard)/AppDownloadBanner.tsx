"use client";

import { useEffect, useState } from "react";
import { CloseIcon } from "./icons";
import { APP_STORE_URL, PLAY_STORE_URL } from "../../../utils/storeLinks";

const STORAGE_KEY = "epoch:app-download-banner-dismissed";

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
