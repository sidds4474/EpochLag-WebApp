"use client";

import { useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import AppStoreBadge from "../../../assets/images/app-store-badge.svg";
import GooglePlayBadge from "../../../assets/images/google-play-badge.svg";
import {
  APP_STORE_URL,
  PLAY_STORE_URL,
} from "../../../utils/storeLinks";

const DownloadModal = ({ isOpen, onClose, publicCode }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const qrTarget =
    typeof window !== "undefined"
      ? `${window.location.origin}/download`
      : "https://www.epochlag.com/download";

  const trackBadge = (store) => {
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;
    window.gtag("event", "public_story_app_cta_clicked", {
      store,
      position: "download_modal",
      public_code: publicCode,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="download-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-[16px]"
    >
      <button
        type="button"
        aria-label="Close download modal"
        onClick={onClose}
        className="absolute inset-0 bg-primary-blue/50 backdrop-blur-sm cursor-pointer"
      />
      <div className="relative w-full max-w-[440px] bg-warm-cream rounded-[20px] shadow-card p-[24px] md:p-[32px]">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-[14px] right-[14px] w-[32px] h-[32px] rounded-full flex items-center justify-center text-primary-blue hover:bg-primary-cream cursor-pointer text-[20px] leading-none"
        >
          ×
        </button>
        <h2
          id="download-modal-title"
          className="font-ivy font-bold text-primary-blue text-[24px] md:text-[28px] leading-[120%] text-center"
        >
          Get Epoch Lag on your phone
        </h2>
        <p className="mt-[10px] font-montserrat text-primary-blue text-[14px] md:text-[15px] leading-[160%] opacity-80 text-center">
          Epoch Lag is a mobile app. Scan the QR with your phone, or tap a
          store badge below.
        </p>

        <div className="mt-[24px] flex justify-center">
          <div className="bg-primary-white p-[14px] rounded-[14px] border border-primary-blue/10">
            <QRCodeSVG
              value={qrTarget}
              size={180}
              level="M"
              includeMargin={false}
              fgColor="#092e4a"
              bgColor="#ffffff"
            />
          </div>
        </div>

        <div className="mt-[24px] flex items-center justify-center gap-[12px]">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackBadge("ios")}
            className="block"
          >
            <img
              src={AppStoreBadge.src}
              alt="Download on the App Store"
              className="h-[44px] w-auto"
            />
          </a>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackBadge("android")}
            className="block"
          >
            <img
              src={GooglePlayBadge.src}
              alt="Get it on Google Play"
              className="h-[44px] w-auto"
            />
          </a>
        </div>
      </div>
    </div>
  );
};

export default DownloadModal;
