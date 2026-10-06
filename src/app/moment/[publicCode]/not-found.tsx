"use client";

import { useState } from "react";
import DownloadModal from "../../../views/StoryPage/components/DownloadModal";

const PEACH = "#FCD6A5";
const ORANGE = "#EF9849";
const TERRACOTTA = "#D95F3B";

export default function MomentNotFound() {
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
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <section className="flex-1 flex flex-col items-center justify-center px-5 sm:px-8">
        <div className="w-full max-w-[340px] sm:max-w-[420px] flex flex-col items-center">
          {/* Error icon — orange concentric circles with X */}
          <div
            style={{ width: 100, height: 100, position: "relative", flexShrink: 0 }}
            aria-hidden="true"
          >
            <svg width={100} height={100} viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="50" fill={PEACH} />
              <circle cx="50" cy="50" r="36" fill={ORANGE} />
              <circle cx="50" cy="50" r="22" fill={TERRACOTTA} />
              {/* X */}
              <path
                d="M40 40 L60 60 M60 40 L40 60"
                stroke="white"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <h1 className="mt-6 font-lora font-medium text-[#151515] text-[24px] md:text-[28px] leading-[120%] text-center max-w-[280px] md:max-w-[320px]">
            This moment isn&apos;t available anymore
          </h1>

          <p className="mt-[14px] md:mt-[18px] font-plus-jakarta text-black text-[16px] md:text-[17px] leading-[150%] text-center max-w-[320px] md:max-w-[380px]">
            The person who shared it may have made it private, or the link has expired. Ask them for a fresh link.
          </p>
        </div>
      </section>

      {/* Sticky footer */}
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
        trackEvent="public_moment_app_cta_clicked"
        position="moment_unavailable"
      />
    </main>
  );
}
