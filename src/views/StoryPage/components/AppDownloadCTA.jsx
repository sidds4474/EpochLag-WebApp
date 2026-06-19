"use client";

import AppStoreBadge from "../../../assets/images/app-store-badge.svg";
import GooglePlayBadge from "../../../assets/images/google-play-badge.svg";
import { APP_STORE_URL, PLAY_STORE_URL } from "../../../utils/storeLinks";

function trackStoreClick(store, publicCode) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", "public_story_app_cta_clicked", {
    store,
    public_code: publicCode,
  });
}

const AppDownloadCTA = ({ platform, publicCode }) => {
  const showIos = platform === "ios" || platform === "desktop";
  const showAndroid = platform === "android" || platform === "desktop";

  return (
    <section className="bg-primary-cream">
      <div className="max-w-[860px] mx-auto px-[16px] md:px-[24px] py-[48px] md:py-[64px] text-center">
        <h2 className="font-ivy font-bold text-primary-blue text-[28px] md:text-[36px] leading-[120%]">
          Stories like this live in EpochLag
        </h2>
        <p className="mt-[12px] font-montserrat text-primary-blue text-[16px] md:text-[18px] leading-[160%] opacity-85 max-w-[520px] mx-auto">
          Start your own. Keep the moments that matter close, with the people
          who matter most.
        </p>

        <div className="mt-[28px] flex flex-wrap items-center justify-center gap-[12px] md:gap-[16px]">
          {showIos && (
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackStoreClick("ios", publicCode)}
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
              onClick={() => trackStoreClick("android", publicCode)}
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
      </div>
    </section>
  );
};

export default AppDownloadCTA;
