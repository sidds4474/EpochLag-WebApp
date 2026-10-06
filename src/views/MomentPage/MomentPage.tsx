"use client";

import { useState } from "react";
import MomentViewAnalytics from "./MomentViewAnalytics";
import DownloadModal from "../StoryPage/components/DownloadModal";
import { toResponsiveImage } from "../../lib/cloudinary";
import { parseCalendarDay } from "../../lib/moments/date";
import { getMomentIconPath } from "../../lib/moments/icons";
import { APP_STORE_URL, PLAY_STORE_URL } from "../../utils/storeLinks";
import type { Platform } from "../../types/story";
import type { PublicMomentData } from "../../types/moment";

type Props = {
  data: PublicMomentData;
  publicCode: string;
  platform: Platform;
};

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function shortDate(iso: string | null | undefined) {
  const parts = parseCalendarDay(iso);
  if (!parts) return { day: "", month: "" };
  return { day: String(parts.d), month: MONTH_SHORT[parts.m] };
}

const MomentPage = ({ data, publicCode, platform }: Props) => {
  const [modalOpen, setModalOpen] = useState(false);
  const {
    title,
    type,
    date,
    coverImageUrl,
    isRecurring,
    nextOccurrence,
    author,
  } = data;

  const displayDateIso = isRecurring ? nextOccurrence || date : date;
  const { day, month } = shortDate(displayDateIso);
  const authorFirstName = author?.firstName?.trim() || "Someone";
  const headline = `${authorFirstName} shared a moment with you!`;
  const cardTitle = title?.trim() || type || "Moment";

  const handleDownload = () => {
    if (platform === "ios") {
      window.location.href = APP_STORE_URL;
    } else if (platform === "android") {
      window.location.href = PLAY_STORE_URL;
    } else {
      setModalOpen(true);
    }
  };

  return (
    <main
      className="min-h-screen bg-warm-cream flex flex-col"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <MomentViewAnalytics publicCode={publicCode} momentType={type} />

      {/* Centered content */}
      <section className="flex-1 flex flex-col items-center justify-center px-5 sm:px-8">
        <div className="w-full max-w-[340px] sm:max-w-[420px] md:max-w-[480px] flex flex-col items-center">
          <h1 className="font-lora font-medium text-[#151515] text-[24px] md:text-[28px] leading-[120%] text-center max-w-[260px] md:max-w-[320px]">
            {headline}
          </h1>

          <p className="mt-[14px] md:mt-[18px] font-plus-jakarta text-black text-[16px] md:text-[17px] leading-[150%] text-center max-w-[320px] md:max-w-[380px]">
            Sign up to Epoch Lag to be reminded of this moment and cherish it forever.
          </p>

          {/* Event card */}
          <div className="mt-[28px] md:mt-[36px] w-full">
            <EventCard
              day={day}
              month={month}
              title={cardTitle}
              iconUrl={getMomentIconPath(type)}
              coverUrl={coverImageUrl}
            />
          </div>
        </div>
      </section>

      {/* Sticky footer */}
      <footer className="w-full px-5 sm:px-8 pb-8 md:pb-10">
        <div className="mx-auto w-full max-w-[380px] md:max-w-[420px] flex flex-col items-center gap-3">
          <a
            href="/signup"
            className="w-full bg-primary-orange text-primary-white font-plus-jakarta text-[16px] px-6 py-[16px] rounded-full text-center hover:opacity-90 active:opacity-80 transition-opacity leading-none"
          >
            Sign up
          </a>
          <button
            type="button"
            onClick={handleDownload}
            className="font-plus-jakarta text-[#2c2c2c] text-[15px] py-2 hover:opacity-70 transition-opacity"
          >
            Download Epoch Lag
          </button>
        </div>
      </footer>

      <DownloadModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        publicCode={publicCode}
        trackEvent="public_moment_app_cta_clicked"
        position="moment_invite"
      />
    </main>
  );
};

type EventCardProps = {
  day: string;
  month: string;
  title: string;
  iconUrl: string;
  coverUrl: string | null | undefined;
};

function EventCard({ day, month, title, iconUrl, coverUrl }: EventCardProps) {
  const thumb = coverUrl ? toResponsiveImage(coverUrl, 240) : null;

  return (
    <div className="w-full bg-primary-white rounded-[20px] drop-shadow-[0_0_12.5px_rgba(0,0,0,0.2)] pl-[24px] pr-[6px] py-[6px] flex items-stretch">
      <div className="flex-1 flex items-center gap-[24px] min-w-0">
        {/* Date */}
        <div className="flex flex-col items-center shrink-0">
          <span className="font-montserrat font-medium text-[#2c2c2c] text-[38px] leading-[41px]">
            {day}
          </span>
          <span className="font-montserrat font-medium text-[#2c2c2c] text-[19px] leading-[24px]">
            {month}
          </span>
        </div>

        {/* Divider */}
        <div className="w-[1.5px] h-[64px] bg-[#092e4a]/15 shrink-0" />

        {/* Icon + title */}
        <div className="flex-1 min-w-0 flex flex-col items-start gap-[12px]">
          <div className="w-[29px] h-[29px] rounded-full bg-[#f3f1eb] flex items-center justify-center shrink-0">
            <img
              src={iconUrl}
              alt=""
              aria-hidden="true"
              className="w-[16px] h-[16px] object-contain"
              decoding="async"
            />
          </div>
          <span className="font-plus-jakarta text-[#092e4a] text-[16px] leading-[20px] truncate w-full">
            {title}
          </span>
        </div>
      </div>

      {/* Thumbnail — flush right, rounded on left only */}
      {thumb ? (
        <div className="shrink-0 w-[59px] self-stretch rounded-r-[16px] overflow-hidden bg-[#d9d9d9]">
          <img
            src={thumb}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover"
            decoding="async"
          />
        </div>
      ) : null}
    </div>
  );
}

export default MomentPage;
