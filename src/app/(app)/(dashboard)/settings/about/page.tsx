"use client";

import { useState } from "react";
import Link from "next/link";
import Gradient1 from "../../../../../assets/images/gradients/1.jpg";
import StoryCardBeach from "../../../../../assets/images/story-card-beach.png";
import StoryCardCostume from "../../../../../assets/images/story-card-costume.png";
import HeroBanner from "../HeroBanner";
import PanelMobileHeader from "../PanelMobileHeader";
import { CheckCircleFillIcon } from "../icons";

type Tab = "about" | "why";

const CHECKLIST = [
  "Share stories with friends & family",
  "Pass stories down to future generations",
  "Create shared stories and albums",
  "Preserve voices and memories",
  "Keep everything completely private",
];

const TIMELINE = [
  {
    day: "30",
    month: "Oct",
    prompt: "What is the best trip you ever had?",
    image: StoryCardBeach,
  },
  {
    day: "13",
    month: "Sept",
    prompt: "What is your best childhood memory?",
    image: StoryCardCostume,
  },
];

export default function AboutPage() {
  const [tab, setTab] = useState<Tab>("about");

  return (
    <div className="flex flex-col gap-[20px] md:gap-[24px]">
      <PanelMobileHeader title="About" />
      <HeroBanner src={Gradient1.src} />

      <div className="inline-flex self-start bg-[#EDEDED] rounded-full p-[4px]">
        <button
          type="button"
          onClick={() => setTab("about")}
          className={`cursor-pointer px-[18px] py-[8px] rounded-full font-montserrat text-[13px] md:text-[14px] font-semibold transition-colors ${
            tab === "about" ? "bg-primary-blue text-white" : "text-primary-blue/70"
          }`}
        >
          About
        </button>
        <button
          type="button"
          onClick={() => setTab("why")}
          className={`cursor-pointer px-[18px] py-[8px] rounded-full font-montserrat text-[13px] md:text-[14px] font-semibold transition-colors ${
            tab === "why" ? "bg-primary-blue text-white" : "text-primary-blue/70"
          }`}
        >
          Why Epoch Lag
        </button>
      </div>

      {tab === "about" ? (
        <div className="flex flex-col gap-[14px] max-w-[500px]">
          <h2 className="font-montserrat font-normal text-primary-blue text-[20px] md:text-[22px]">
            Stories that Connect
          </h2>
          <p className="font-montserrat text-primary-blue text-[14px] md:text-[15px] leading-[160%]">
            The intentional pause between eras, not rushing into the next epoch, but lingering to absorb lessons, memories, or meaning from the last.
          </p>
          <p className="font-montserrat text-primary-blue text-[14px] md:text-[15px] leading-[160%]">
            Epoch Lag is your digital haven to create, connect, and cherish. Whether it&rsquo;s sharing everyday moments or preserving unforgettable memories, we make it easy to stay close to the people who matter most.
          </p>
          <p className="font-montserrat text-primary-blue text-[14px] md:text-[15px] leading-[160%]">
            We are and will always be: private, secure. Our mission is simple: to inspire meaningful storytelling and effortless connection, helping you turn life&rsquo;s moments into lasting memories.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-[24px] lg:gap-[40px]">
          <div className="flex flex-col gap-[14px] max-w-[500px]">
            <h2 className="font-montserrat font-normal text-primary-blue text-[20px] md:text-[22px] leading-[130%]">
              Built for the stories<br />behind the photos
            </h2>
            <p className="font-montserrat text-primary-blue text-[14px] md:text-[15px] leading-[160%]">
              Epoch Lag was built to protect the moments that actually shape us, the stories and conversations, the memories, perspectives, and voices.
            </p>
            <ul className="flex flex-col gap-[10px] mt-[4px]">
              {CHECKLIST.map((item) => (
                <li key={item} className="flex items-start gap-[10px]">
                  <span className="mt-[1px]">
                    <CheckCircleFillIcon width={18} height={18} />
                  </span>
                  <span className="font-montserrat text-primary-blue text-[14px] md:text-[15px] leading-[150%]">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative flex flex-col gap-[20px] pl-[24px] pr-[16px] py-[12px] before:content-[''] before:absolute before:left-[6px] before:top-[20px] before:bottom-[20px] before:w-px before:bg-[#092E4A]">
            <div className="flex flex-col gap-[16px]">
              {TIMELINE.map((entry, i) => (
                <div key={i} className="relative">
                  <span
                    className={`absolute -left-[24px] top-1/2 -translate-y-1/2 w-[13px] h-[13px] rounded-full border-2 ${
                      i === 0 ? "bg-[#EF9849] border-[#FCD6A5]" : "bg-white border-primary-blue/60"
                    }`}
                  />
                  <div className="bg-white shadow-[0_0_29.755px_0_rgba(0,0,0,0.15)] rounded-[12px] p-[10px] flex items-center gap-[10px]">
                    <div className="text-center shrink-0 w-[52px]">
                      <p className="font-montserrat font-normal text-primary-blue text-[36px] leading-none">{entry.day}</p>
                      <p className="font-montserrat text-primary-blue/70 text-[13px] mt-[2px]">{entry.month}</p>
                    </div>
                    <div className="self-stretch w-px bg-[#092E4A]/20" />
                    <p className="flex-1 font-montserrat text-primary-blue text-[13px] leading-[140%]">
                      {entry.prompt}
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={entry.image.src}
                      alt=""
                      className="self-stretch w-[80px] -my-[4px] -mr-[4px] rounded-[8px] object-cover shrink-0"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-center lg:justify-end">
              <Link
                href="/settings/help"
                className="cursor-pointer font-montserrat text-[14px] font-medium text-white bg-[#EF9849] px-[20px] py-[8px] rounded-full hover:opacity-90 transition-opacity"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
