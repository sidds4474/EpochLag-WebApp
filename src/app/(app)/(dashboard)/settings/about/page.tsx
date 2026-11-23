"use client";

import { useState } from "react";
import Link from "next/link";
import PolaroidImg1 from "../../../../../assets/images/newimgs/polaroidImg1.jpg";
import PolaroidImg2 from "../../../../../assets/images/newimgs/polaroidImg2.jpg";
import PolaroidImg3 from "../../../../../assets/images/newimgs/polaroidImg3.png";
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

// Three polaroid photos stacked / overlapping at the bottom of the
// Why Epoch Lag tab. Each one tilts slightly so they feel scattered.
const POLAROIDS: Array<{
  src: string;
  rotate: string;
  z: number;
}> = [
  { src: PolaroidImg2.src, rotate: "-rotate-[5deg]", z: 1 },
  { src: PolaroidImg3.src, rotate: "rotate-[2deg]", z: 2 },
  { src: PolaroidImg1.src, rotate: "-rotate-[3deg]", z: 1 },
];

export default function AboutPage() {
  const [tab, setTab] = useState<Tab>("about");

  return (
    <div className="flex flex-col gap-[20px] md:gap-[24px]">
      <PanelMobileHeader title="About" />

      <div className="inline-flex self-start gap-[8px]">
        <button
          type="button"
          onClick={() => setTab("about")}
          className={`cursor-pointer px-[20px] py-[9px] rounded-full font-montserrat font-medium text-[13px] md:text-[14px] transition-colors ${
            tab === "about"
              ? "bg-[#2c2c2c] text-white"
              : "bg-[#E8E6DF] text-[#232323] hover:bg-[#dcd8ca]"
          }`}
        >
          About
        </button>
        <button
          type="button"
          onClick={() => setTab("why")}
          className={`cursor-pointer px-[20px] py-[9px] rounded-full font-montserrat font-medium text-[13px] md:text-[14px] transition-colors ${
            tab === "why"
              ? "bg-[#2c2c2c] text-white"
              : "bg-[#E8E6DF] text-[#232323] hover:bg-[#dcd8ca]"
          }`}
        >
          Why Epoch Lag
        </button>
      </div>

      {tab === "about" ? (
        <div className="flex flex-col gap-[10px] max-w-[560px]">
          <h2 className="font-ivy font-normal text-[#232323] text-[24px] md:text-[26px] leading-[1.2]">
            Stories that Connect
          </h2>
          <p className="font-montserrat text-[#848484] text-[13px] -mt-[2px]">
            Version 1.0.5
          </p>
          <p className="font-montserrat text-[#092e4a] text-[14px] md:text-[15px] leading-[160%] mt-[6px]">
            Epoch Lag is your digital haven to create, connect, and cherish.
          </p>
          <p className="font-montserrat text-[#092e4a] text-[14px] md:text-[15px] leading-[160%]">
            Whether it&rsquo;s sharing everyday moments or preserving unforgettable memories, we make it easy to stay close to the people who matter most.
          </p>
          <p className="font-montserrat text-[#092e4a] text-[14px] md:text-[15px] leading-[160%]">
            We are and will always be private, secure. Our mission is simple: to inspire meaningful storytelling and effortless connection, helping you turn life&rsquo;s moments into lasting memories.
          </p>

          <div className="mt-[12px]">
            <Link
              href="/settings/help"
              className="inline-flex cursor-pointer font-montserrat font-medium text-white bg-primary-orange rounded-full px-[32px] py-[10px] text-[14px] hover:opacity-90 transition-opacity"
            >
              Learn More
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-[20px] md:gap-[24px] max-w-[760px]">
          <div className="flex flex-col gap-[10px]">
            <h2 className="font-ivy font-normal text-[#232323] text-[22px] md:text-[26px] leading-[1.2]">
              Built for the stories behind the photos
            </h2>
            <p className="font-montserrat text-[#092e4a] text-[14px] md:text-[15px] leading-[160%]">
              Epoch Lag was built to protect the moments that actually shape us, the stories and conversations, the memories, perspectives, and voices.
            </p>
          </div>

          <ul className="flex flex-col gap-[12px]">
            {CHECKLIST.map((item) => (
              <li key={item} className="flex items-start gap-[12px]">
                <span className="mt-[2px] text-[#232323]">
                  <CheckCircleFillIcon width={18} height={18} />
                </span>
                <span className="font-montserrat text-[#232323] text-[14px] md:text-[15px] leading-[150%]">
                  {item}
                </span>
              </li>
            ))}
          </ul>

          {/* Desktop Learn More — inline just below the checklist */}
          <div className="hidden md:block">
            <Link
              href="/settings/help"
              className="inline-flex cursor-pointer font-montserrat font-medium text-white bg-primary-orange rounded-full px-[32px] py-[10px] text-[14px] hover:opacity-90 transition-opacity"
            >
              Learn More
            </Link>
          </div>

          {/* Polaroid cluster */}
          <div className="relative flex items-center justify-center gap-[20px] md:gap-[40px] mt-[12px] md:mt-[16px] pb-[90px] md:pb-0">
            {POLAROIDS.map((p, i) => (
              <div
                key={i}
                style={{ zIndex: p.z }}
                className={`relative bg-white rounded-[4px] p-[6px] md:p-[8px] shadow-[0_6px_16px_rgba(0,0,0,0.18)] ${p.rotate}`}
              >
                <div className="relative w-[96px] h-[120px] md:w-[136px] md:h-[164px] overflow-hidden bg-primary-blue/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.src}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Mobile sticky Learn More */}
          <div className="md:hidden fixed left-0 right-0 bottom-[80px] z-20 px-[16px] py-[14px] bg-gradient-to-t from-[#f3f1eb] via-[#f3f1eb] to-transparent">
            <Link
              href="/settings/help"
              className="block w-full text-center cursor-pointer font-montserrat font-semibold text-white bg-primary-orange rounded-full py-[14px] text-[15px] hover:opacity-90 transition-opacity"
            >
              Learn More
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
