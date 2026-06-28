"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import CheckIcon from "../../../assets/svg/check-icon";
import StoryCardBeach from "../../../assets/images/Childhood 1.png";
import StoryCardCostume from "../../../assets/images/Childhood 1 (1).png";
import StoryCardGrandpa from "../../../assets/images/story-card-grandpa.png";
import StoriesBgCircle from "../../../assets/images/stories-bg-circle.svg";

type DotType = "filled" | "outlined";

type StoryCardData = {
  day: string;
  month: string;
  question: string;
  image: { src: string };
  alt: string;
  dotType: DotType;
  yearMarker?: string;
  imagePosition?: string;
};

const storyCards: StoryCardData[] = [
  {
    day: "13",
    month: "Oct",
    question: "What is the best trip you ever had?",
    image: StoryCardBeach,
    alt: "Girl at the beach",
    dotType: "filled",
  },
  {
    day: "30",
    month: "Sept",
    question: "What is your best childhood memory?",
    image: StoryCardCostume,
    alt: "Boy in costume",
    dotType: "outlined",
  },
  {
    day: "14",
    month: "Nov",
    question: "Grandpa's favorite story",
    image: StoryCardGrandpa,
    alt: "Grandpa",
    dotType: "outlined",
    yearMarker: "2024",
    imagePosition: "top",
  },
];

const features = [
  "Share stories with important friends and family",
  "Pass stories down to future generations",
  "Create shared stories and albums",
  "Preserve voices and memories",
  "Keep everything completely private",
];

const TimelineDot = ({ type }: { type: DotType }) => {
  if (type === "filled") {
    return (
      <div className="shrink-0 w-[14px] h-[14px] md:w-[16px] md:h-[16px] rounded-full bg-primary-orange" />
    );
  }
  return (
    <div className="shrink-0 w-[12px] h-[12px] md:w-[14px] md:h-[14px] rounded-full border-[2px] border-primary-blue bg-warm-cream" />
  );
};

const StoryCard = ({ card }: { card: StoryCardData }) => (
  <div className="bg-primary-white rounded-[14px] md:rounded-[16px] 2xl:rounded-[20px] shadow-card flex items-center p-[10px] md:p-[12px] 2xl:p-[16px] gap-[12px] md:gap-[16px] 2xl:gap-[20px]">
    <div className="shrink-0 flex flex-col items-center min-w-[36px] md:min-w-[44px]">
      <span className="font-ivy text-primary-blue text-[28px] md:text-[36px] 2xl:text-[44px] leading-[100%] font-bold">
        {card.day}
      </span>
      <span className="font-montserrat text-primary-blue text-[12px] md:text-[14px] 2xl:text-[16px] font-normal leading-[100%] mt-[2px]">
        {card.month}
      </span>
    </div>
    <div className="w-[1px] self-stretch bg-primary-blue/20 shrink-0" />
    <p className="flex-1 font-montserrat text-primary-blue text-[14px] md:text-[16px] 2xl:text-[18px] font-semibold leading-[130%]">
      {card.question}
    </p>
    <img
      src={card.image.src}
      alt={card.alt}
      loading="lazy"
      decoding="async"
      style={{ objectPosition: card.imagePosition || "center" }}
      className="shrink-0 w-[80px] h-[80px] md:w-[110px] md:h-[110px] 2xl:w-[130px] 2xl:h-[130px] rounded-[8px] md:rounded-[10px] 2xl:rounded-[12px] object-cover"
    />
  </div>
);

const StoriesSection = () => {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 });

  return (
    <section
      ref={sectionRef}
      className="relative w-full bg-warm-cream overflow-hidden"
    >
      <div className="relative px-[16px] md:px-[24px] lg:px-[64px] 2xl:px-[95px] 6xl:px-[145px] pt-[32px] md:pt-[48px] lg:pt-[80px] 2xl:pt-[100px] pb-0">
        <div className="w-full flex flex-col md:flex-row gap-[16px] md:gap-[40px] lg:gap-[120px] xl:gap-[160px] 2xl:gap-[200px]">
          {/* Text & Features (first on mobile, right on tablet/desktop) */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="relative z-[2] flex-1 md:basis-[50%] lg:basis-[55%] md:order-2 flex flex-col justify-start md:pt-[20px] lg:pt-[40px] 2xl:pt-[60px] pb-[60px] md:pb-[80px] lg:pb-[120px] 2xl:pb-[160px]"
          >
            <h2 className="text-[28px] md:text-[36px] lg:text-[44px] 2xl:text-[50px] 6xl:text-[56px] leading-[110%] font-ivy text-primary-blue font-bold">
              Built for the stories behind the photos
            </h2>

            <p className="mt-[16px] md:mt-[24px] text-[14px] md:text-[15px] 2xl:text-[17px] font-montserrat text-primary-blue font-normal leading-[170%] max-w-[520px]">
              Epoch Lag was built to protect the moments that actually shape us,
              the stories and conversations, the memories, perspectives, and
              voices.
            </p>

            <div className="mt-[24px] md:mt-[36px] flex flex-col gap-[12px] md:gap-[16px]">
              {features.map((text, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={
                    isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }
                  }
                  transition={{
                    duration: 0.5,
                    delay: isInView ? 0.4 + index * 0.1 : 0,
                    ease: "easeOut",
                  }}
                  className="flex items-center gap-[12px]"
                >
                  <div className="w-[22px] h-[22px] md:w-[24px] md:h-[24px] bg-primary-orange/20 rounded-full flex items-center justify-center shrink-0">
                    <CheckIcon className="w-3 h-2.5 text-primary-blue" />
                  </div>
                  <p className="text-[14px] md:text-[15px] 2xl:text-[17px] font-montserrat text-primary-blue font-normal">
                    {text}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Timeline + Story Cards (after text on mobile, left on desktop) */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="relative flex-1 md:basis-[50%] lg:basis-[45%] md:order-1"
          >
            {/* Decorative cream circle */}
            <img
              src={StoriesBgCircle.src}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute left-0 -translate-x-[30%] top-[30%] md:top-[40%] -translate-y-[50%] w-[120%] h-auto md:min-w-[420px] md:min-h-[468px] lg:min-w-0 lg:min-h-0 lg:w-[120%] lg:h-auto z-[1]"
            />
            <div className="relative z-[2] flex flex-col">
              {/* Line extending to top of section */}
              <div className="flex">
                <div className="shrink-0 w-[14px] md:w-[16px] flex justify-center">
                  <div className="w-[1.5px] md:w-[2px] bg-primary-blue/60 h-[4px] md:h-[8px] lg:h-[12px]" />
                </div>
              </div>
              {storyCards.map((card, index) => (
                <div key={index}>
                  {/* Year Marker Row */}
                  {card.yearMarker && (
                    <div className="flex items-stretch">
                      {/* Timeline column with line */}
                      <div className="shrink-0 w-[14px] md:w-[16px] flex flex-col items-center">
                        <div className="w-[1.5px] md:w-[2px] bg-primary-blue/60 flex-1" />
                      </div>
                      {/* Year label */}
                      <div className="pl-[18px] md:pl-[24px] pt-[18px] md:pt-[22px] pb-[6px] md:pb-[8px]">
                        <span className="font-montserrat text-primary-blue text-[15.87px] md:text-[14.11px] lg:text-[24.2px] font-semibold">
                          {card.yearMarker}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Card Row */}
                  <div className="flex items-stretch">
                    {/* Timeline column: line + dot + line */}
                    <div className="shrink-0 w-[14px] md:w-[16px] flex flex-col items-center">
                      {/* Line above dot */}
                      <div className={`w-[1.5px] md:w-[2px] bg-primary-blue/60 ${index === 0 ? "flex-1 min-h-[20px]" : "flex-1"}`} />
                      {/* Dot */}
                      <TimelineDot type={card.dotType} />
                      {/* Line below dot */}
                      <div className={`w-[1.5px] md:w-[2px] bg-primary-blue/60 ${index === storyCards.length - 1 ? "flex-1 min-h-[20px]" : "flex-1"}`} />
                    </div>

                    {/* Card */}
                    <div className="flex-1 pl-[18px] md:pl-[24px] py-[6px] md:py-[8px] 2xl:py-[12px]">
                      <StoryCard card={card} />
                    </div>
                  </div>

                  {/* Spacer line between cards (no year marker) */}
                  {index < storyCards.length - 1 && !storyCards[index + 1]?.yearMarker && (
                    <div className="flex">
                      <div className="shrink-0 w-[14px] md:w-[16px] flex justify-center">
                        <div className="w-[1.5px] md:w-[2px] bg-primary-blue/60 h-[8px] md:h-[10px]" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {/* Line extending to bottom of section */}
              <div className="flex">
                <div className="shrink-0 w-[14px] md:w-[16px] flex justify-center">
                  <div className="w-[1.5px] md:w-[2px] bg-primary-blue/60 h-[60px] md:h-[80px] lg:h-[120px] 2xl:h-[160px]" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default StoriesSection;
