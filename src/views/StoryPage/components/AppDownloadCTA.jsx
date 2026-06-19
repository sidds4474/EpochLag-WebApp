"use client";

import { useState } from "react";
import AppStoreBadge from "../../../assets/images/app-store-badge.svg";
import GooglePlayBadge from "../../../assets/images/google-play-badge.svg";
import DownloadModal from "./DownloadModal";
import { APP_STORE_URL, PLAY_STORE_URL } from "../../../utils/storeLinks";

function isMobileUA() {
  if (typeof navigator === "undefined") return false;
  return /android|iPad|iPhone|iPod/i.test(navigator.userAgent || "");
}

function trackFooterClick(publicCode, store) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", "public_story_app_cta_clicked", {
    store,
    position: "footer",
    public_code: publicCode,
  });
}

const AppDownloadCTA = ({ platform, publicCode }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const onDesktop = platform === "desktop";

  // Desktop: tap either badge → open modal (no direct link to web store page).
  // Mobile: badge routes to the user's matching store.
  const handleBadgeClick = (store) => (e) => {
    if (!isMobileUA()) {
      e.preventDefault();
      setModalOpen(true);
      trackFooterClick(publicCode, "modal");
      return;
    }
    trackFooterClick(publicCode, store);
  };

  const showIos = platform !== "android";
  const showAndroid = platform === "android";

  return (
    <>
      <section className="bg-primary-cream">
        <div className="max-w-[860px] mx-auto px-[16px] md:px-[24px] py-[48px] md:py-[64px] text-center">
          <h2 className="font-ivy font-bold text-primary-blue text-[28px] md:text-[36px] leading-[120%]">
            Stories like this live in Epoch Lag
          </h2>
          <p className="mt-[12px] font-montserrat text-primary-blue text-[16px] md:text-[18px] leading-[160%] opacity-85 max-w-[520px] mx-auto">
            Start your own. Keep the moments that matter close, with the people
            who matter most.
          </p>

          {onDesktop ? (
            <div className="mt-[28px] flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setModalOpen(true);
                  trackFooterClick(publicCode, "modal");
                }}
                className="cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[14px] md:text-[15px] px-[28px] md:px-[36px] py-[12px] md:py-[14px] rounded-full hover:opacity-90 transition-opacity"
              >
                Download the App
              </button>
            </div>
          ) : (
            <div className="mt-[28px] flex flex-wrap items-center justify-center gap-[12px] md:gap-[16px]">
              {showIos && (
                <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleBadgeClick("ios")}
                  className="block"
                >
                  <img
                    src={AppStoreBadge.src}
                    alt="Download on the App Store"
                    className="h-[48px] md:h-[54px] w-auto"
                  />
                </a>
              )}
              {showAndroid && (
                <a
                  href={PLAY_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleBadgeClick("android")}
                  className="block"
                >
                  <img
                    src={GooglePlayBadge.src}
                    alt="Get it on Google Play"
                    className="h-[48px] md:h-[54px] w-auto"
                  />
                </a>
              )}
            </div>
          )}
        </div>
      </section>
      <DownloadModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        publicCode={publicCode}
      />
    </>
  );
};

export default AppDownloadCTA;
