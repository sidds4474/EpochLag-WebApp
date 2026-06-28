"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import AboutImage from "../../../assets/images/about-kids-car.png";

const AboutSection = () => {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  return (
    <section
      ref={sectionRef}
      className="w-full bg-warm-cream px-[16px] md:px-[24px] lg:px-[64px] 2xl:px-[95px] 6xl:px-[145px] pt-[120px] md:pt-[184px] lg:pt-[96px] 2xl:pt-[140px] pb-[60px] md:pb-[80px] lg:pb-[120px] 2xl:pb-[140px]"
    >
      <div className="w-full flex flex-col md:flex-row gap-[40px] md:gap-[32px] lg:gap-[48px] xl:gap-[72px] 2xl:gap-[100px] items-center">
        {/* Left - Image (desktop only) */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="hidden md:flex flex-1 md:basis-[45%] justify-start"
        >
          <div className="relative w-full max-w-[460px] 2xl:max-w-[520px]">
            <img
              src={AboutImage.src}
              alt="Kids sitting together in a car"
              loading="lazy"
              decoding="async"
              className="w-full h-auto rounded-[16px] md:rounded-[20px] 2xl:rounded-[24px] object-cover"
            />
          </div>
        </motion.div>

        {/* Right - Text Content */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="flex-1 md:basis-[55%]"
        >
          <span className="font-montserrat text-primary-blue text-[20px] font-medium leading-[131%] tracking-normal uppercase">
            ABOUT
          </span>

          <h2 className="mt-[12px] md:mt-[16px] text-[48px] font-ivy text-primary-blue font-bold leading-[114%] tracking-normal">
            <span className="3xl:block">Epoch Lag: Stories</span>{" "}
            <span className="3xl:block">that connect</span>
          </h2>

          <p className="mt-[20px] md:mt-[24px] text-[20px] font-montserrat text-primary-blue font-bold leading-[141%] tracking-normal">
            [Pronounced: &lsquo;e-pək&rsquo; lag; or epic lag]
          </p>

          <p className="mt-[16px] md:mt-[20px] text-[16px] font-montserrat text-primary-blue font-bold leading-[141%] tracking-normal">
            <span className="3xl:block">The intentional pause between eras, not rushing into the next</span>{" "}
            <span className="3xl:block">epoch, but lingering to absorb lessons, memories, or meaning from</span>{" "}
            <span className="3xl:block">the last.</span>
          </p>

          <p className="mt-[16px] md:mt-[20px] text-[16px] font-montserrat text-primary-blue font-medium leading-[141%] tracking-normal">
            <span className="3xl:block">Epoch Lag is your digital haven to create, connect, and cherish.</span>{" "}
            <span className="3xl:block">Whether it&apos;s sharing everyday moments or preserving unforgettable</span>{" "}
            <span className="3xl:block">memories, we make it easy to stay close to the people who matter</span>{" "}
            <span className="3xl:block">most.</span>
          </p>

          <p className="mt-[16px] md:mt-[20px] text-[16px] font-montserrat text-primary-blue font-medium leading-[141%] tracking-normal">
            <span className="3xl:block">We are and will always be: private, secure. Our mission is simple: to</span>{" "}
            <span className="3xl:block">inspire meaningful storytelling and effortless connection, helping you</span>{" "}
            <span className="3xl:block">turn life&apos;s moments into lasting memories.</span>
          </p>

          {/* Image (mobile/tablet only - after text) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
            className="md:hidden mt-[32px] flex justify-center"
          >
            <div className="relative w-full max-w-[460px]">
              <img
                src={AboutImage.src}
                alt="Kids sitting together in a car"
                loading="lazy"
                decoding="async"
                className="w-full h-auto rounded-[16px] md:rounded-[20px] object-cover"
              />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutSection;
