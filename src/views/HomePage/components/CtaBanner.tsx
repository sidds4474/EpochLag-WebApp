"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import AppStoreBadge from "../../../assets/images/app-store-badge.svg";
import GooglePlayBadge from "../../../assets/images/google-play-badge.svg";
import QrCode from "../../../assets/images/qr-code.png";
import CtaBgCircle from "../../../assets/images/cta-bg-circle.svg";
import { APP_STORE_URL, PLAY_STORE_URL, handleStoreClick } from "../../../utils/storeLinks";

const CtaBanner = () => {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.3 });

  return (
    <section
      ref={sectionRef}
      className="relative w-full bg-warm-cream overflow-visible px-[16px] md:px-[24px] lg:px-[64px] 2xl:px-[95px] 6xl:px-[145px] py-[24px] md:py-[48px]"
    >
      {/* Decorative circle - desktop only */}
      <img
        src={CtaBgCircle.src}
        alt=""
        aria-hidden="true"
        className="hidden lg:block pointer-events-none absolute left-0 -translate-x-[5%] top-[0%] -translate-y-[50%] w-[280px] 2xl:w-[325px] h-auto z-[1]"
      />

      <div className="relative z-[2] w-full bg-primary-blue rounded-[20px] md:rounded-[28px] 2xl:rounded-[32px] px-[24px] md:px-[40px] lg:px-[60px] 2xl:px-[80px] py-[40px] md:py-[56px] lg:py-[64px] 2xl:py-[72px]">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-[40px] lg:gap-[48px] xl:gap-[64px]">
          {/* Left - Text & Badges */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="flex-1 text-left md:text-center lg:text-left flex flex-col items-start md:items-center lg:items-start"
          >
            <h2 className="text-[24px] sm:text-[28px] md:text-[28px] lg:text-[44px] 2xl:text-[50px] 6xl:text-[56px] leading-[110%] font-ivy text-primary-white font-bold">
              <span className="md:whitespace-nowrap lg:whitespace-normal">Get the app and start preserving the</span>
              {" "}<span className="text-[#FCD6A5]">moments that matter</span>
            </h2>

            <p className="mt-[16px] md:mt-[20px] text-[14px] md:text-[15px] 2xl:text-[17px] font-montserrat text-primary-white/80 font-normal leading-[160%] max-w-[500px]">
              The stories worth keeping are already happening.
              <br className="hidden md:inline lg:hidden" />
              {" "}Start preserving them today.
            </p>

            <div className="mt-[24px] md:mt-[32px] flex items-center justify-center lg:justify-start gap-[12px] md:gap-[16px]">
              <a 
                href={APP_STORE_URL} 
                onClick={handleStoreClick} 
                className="block"
                target="_blank" 
                rel="noopener noreferrer"
              >
                <img
                  src={AppStoreBadge.src}
                  alt="Download on the App Store"
                  className="h-[48px] md:h-[52px] 2xl:h-[56px] w-auto"
                />
              </a>
              
              <a 
                href={PLAY_STORE_URL} 
                onClick={handleStoreClick} 
                className="block"
                target="_blank" 
                rel="noopener noreferrer"
              >
                <img
                  src={GooglePlayBadge.src}
                  alt="Get it on Google Play"
                  className="h-[48px] md:h-[52px] 2xl:h-[56px] w-auto"
                />
              </a>
            </div>
          </motion.div>

          {/* Right - QR Code */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={
              isInView
                ? { opacity: 1, scale: 1 }
                : { opacity: 0, scale: 0.9 }
            }
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="shrink-0 hidden lg:block"
          >
            <div className="w-[220px] h-[220px] md:w-[240px] md:h-[240px] 2xl:w-[260px] 2xl:h-[260px] bg-primary-white rounded-[16px] md:rounded-[20px] overflow-hidden">
              <img
                src={QrCode.src}
                alt="Scan QR code to download the app"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-contain rounded-[16px] md:rounded-[20px]"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CtaBanner;