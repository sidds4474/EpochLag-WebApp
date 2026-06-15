"use client";

import { motion } from "motion/react";
import AppStoreBadge from "../../../assets/images/app-store-badge.svg";
import GooglePlayBadge from "../../../assets/images/google-play-badge.svg";
import HeroBgCircles from "../../../assets/images/hero-bg-circles.svg";
import { APP_STORE_URL, PLAY_STORE_URL, handleStoreClick } from "../../../utils/storeLinks";

const HeroSection = () => {
  return (
    <section className="relative w-full bg-warm-cream overflow-hidden">
      {/* Decorative concentric circles - right side */}
      <img
        src={HeroBgCircles.src}
        alt=""
        aria-hidden="true"
        className="hidden lg:block pointer-events-none absolute lg:-right-[60px] lg:top-[130px] lg:w-[380px] 2xl:w-[440px] 6xl:w-[520px] h-auto z-0"
      />

      <div className="relative z-10 px-[16px] md:px-[24px] lg:px-[64px] 2xl:px-[95px] 6xl:px-[145px] pt-[24px] pb-[40px] md:pt-0 md:pb-[60px] lg:pb-[80px]">
        <div className="max-w-[900px] 2xl:max-w-[1000px] mx-auto flex flex-col items-center text-center">
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
            className="text-[36px] md:text-[40px] lg:text-[72px] 2xl:text-[80px] 6xl:text-[96px] leading-[100%] font-ivy text-primary-blue font-bold md:max-w-[580px] lg:max-w-none"
          >
            Stories weren&apos;t meant to disappear in a feed
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
            className="mt-[32px] max-w-[380px] md:max-w-[540px] lg:max-w-[960px] text-[16px] md:font-medium lg:text-[20px] font-montserrat text-primary-blue font-normal leading-[160%]"
          >
            Whether it&apos;s your family history, or sharing important stories
            amongst friends, we make it easy to preserve and share meaningful
            memories with the people who matter most.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease: "easeOut" }}
            className="mt-[32px] flex items-center gap-[12px] md:gap-[16px]"
          >
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
                className="h-[42px] md:h-[48px] 2xl:h-[54px] w-auto"
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
                className="h-[42px] md:h-[48px] 2xl:h-[54px] w-auto"
              />
            </a>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
          className="mt-[40px] md:mt-[56px] lg:mt-[64px] w-full"
        >
          <video
            src="/videos/Epoch_Lag_Hero.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px] 2xl:h-[700px] 6xl:h-[800px] object-cover rounded-[16px] md:rounded-[24px]"
          />
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;