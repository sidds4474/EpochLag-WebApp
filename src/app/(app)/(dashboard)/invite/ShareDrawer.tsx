"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import logoBg from "../../../../assets/images/logo_bg.png";
import logoText from "../../../../assets/images/epochlag_logotext.png";
import {
  buildChannelShareUrl,
  buildReferralInviteMessage,
  type ShareChannel,
} from "../../../../lib/referral/api";

type Props = {
  open: boolean;
  onClose: () => void;
  onChipTap: (channel: ShareChannel) => void;
  sharerName: string;
  referralCode: string;
  shareUrl: string;
};

// Right-side drawer on desktop, bottom sheet on mobile. Both use the same
// component; layout swaps via responsive classes. Backdrop dismiss + X
// close both call onClose. Chip tap fires onChipTap (parent handles
// credit + navigation) then opens the per-channel URL in a new tab.
export default function ShareDrawer({
  open,
  onClose,
  onChipTap,
  sharerName,
  referralCode,
  shareUrl,
}: Props) {
  const [note, setNote] = useState("");
  useEffect(() => {
    if (!open) setNote("");
  }, [open]);

  const handleChipTap = (channel: ShareChannel) => {
    if (!referralCode) return;
    const message = buildReferralInviteMessage(referralCode, note);
    const url = buildChannelShareUrl(channel, message, shareUrl);
    // Fire parent's credit/nav bookkeeping BEFORE opening the URL — the
    // window.open call yields the event loop and we want the counter write
    // to run first.
    onChipTap(channel);
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener");
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      {/* Panel — mobile bottom sheet, desktop right drawer */}
      <div
        role="dialog"
        aria-label="Invite"
        aria-modal="true"
        className={`fixed z-50 bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.12)] flex flex-col transition-transform duration-300 ease-out
          left-0 right-0 bottom-0 rounded-t-[24px] max-h-[92vh]
          md:left-auto md:right-0 md:top-0 md:bottom-0 md:rounded-t-none md:rounded-l-[24px] md:w-[400px] md:max-h-none md:h-full
          ${
            open
              ? "translate-y-0 md:translate-x-0"
              : "translate-y-full md:translate-y-0 md:translate-x-full"
          }`}
      >
        <div className="flex items-center justify-between px-[20px] pt-[16px] pb-[8px] md:pt-[24px]">
          <h2 className="font-montserrat font-bold text-primary-blue text-[18px] md:text-[20px]">
            Invite
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer w-[32px] h-[32px] rounded-full bg-[#f0f0f0] hover:bg-black/[0.08] flex items-center justify-center text-primary-blue transition-colors"
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6l-12 12"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide px-[20px] pb-[24px]">
          {/* Branded gradient card preview. Static art — designer-supplied
              gradient with the wordmark. Sharer's first name feeds the
              preview line so it reads like a real inbound invite. */}
          <div className="mt-[16px] mx-auto w-full max-w-[280px] rounded-[20px] shadow-[0_0_26.726px_0_rgba(0,0,0,0.25)] bg-white p-[12px]">
            <div
              className="h-[140px] rounded-t-[16px] flex items-center justify-center bg-center bg-cover"
              style={{ backgroundImage: `url(${logoBg.src})` }}
            >
              <Image
                src={logoText}
                alt="Epoch Lag"
                className="w-[130px] h-auto object-contain"
                priority
              />
            </div>
            <div className="flex items-center justify-between gap-[8px] px-[8px] pt-[14px] pb-[6px]">
              <p className="font-montserrat font-medium text-primary-blue text-[14px] leading-[18px]">
                {sharerName} invited you to join Epoch Lag!
              </p>
              <span className="shrink-0 w-[24px] h-[24px] rounded-full bg-[#f0f0f0] flex items-center justify-center text-primary-blue">
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>
          </div>

          <div className="mt-[28px] mx-auto w-full max-w-[280px] bg-[#f0f0f0] rounded-[16px] px-[14px] py-[10px]">
            <label
              htmlFor="invite-note"
              className="block font-montserrat text-primary-blue/60 text-[11px] mb-[4px]"
            >
              Note
            </label>
            <textarea
              id="invite-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={150}
              placeholder=""
              className="w-full bg-transparent border-0 outline-none resize-none font-montserrat text-primary-blue text-[13px] placeholder:text-primary-blue/40"
            />
          </div>

          <div className="mt-[24px] grid grid-cols-4 gap-[12px]">
            <SocialChip
              label="Whatsapp"
              bg="#25D366"
              onTap={() => handleChipTap("whatsapp")}
              icon={<WhatsappGlyph />}
            />
            <SocialChip
              label="Messenger"
              bg="linear-gradient(135deg, #00B2FF 0%, #006AFF 25%, #7A2FFA 60%, #FF3A6C 100%)"
              onTap={() => handleChipTap("messenger")}
              icon={<MessengerGlyph />}
            />
            <SocialChip
              label="Facebook"
              bg="#1877F2"
              onTap={() => handleChipTap("facebook")}
              icon={<FacebookGlyph />}
            />
            <SocialChip
              label="Message"
              bg="#34C759"
              onTap={() => handleChipTap("sms")}
              icon={<MessageGlyph />}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function SocialChip({
  label,
  bg,
  onTap,
  icon,
}: {
  label: string;
  bg: string;
  onTap: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="flex flex-col items-center gap-[6px] cursor-pointer"
    >
      <span
        className="w-[48px] h-[48px] rounded-full flex items-center justify-center text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] hover:opacity-90 transition-opacity"
        style={{ background: bg }}
      >
        {icon}
      </span>
      <span className="font-montserrat text-primary-blue/70 text-[11px]">
        {label}
      </span>
    </button>
  );
}

function WhatsappGlyph() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
    </svg>
  );
}

function FacebookGlyph() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function MessengerGlyph() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.14.26.34.27.55l.05 1.78c.02.57.6.94 1.12.71l1.98-.87c.16-.07.34-.09.51-.04 1.15.31 2.37.48 3.63.48 5.64 0 10-4.13 10-9.7S17.64 2 12 2zm5.99 7.42l-2.94 4.66c-.47.74-1.47.93-2.18.4l-2.34-1.75a.6.6 0 00-.72 0l-3.16 2.4c-.42.32-.97-.18-.68-.62l2.94-4.66c.47-.74 1.47-.93 2.18-.4l2.34 1.75a.6.6 0 00.72 0l3.16-2.4c.42-.32.97.18.68.62z" />
    </svg>
  );
}

function MessageGlyph() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.486 2 2 5.582 2 10c0 2.128 1.028 4.084 2.708 5.53L4 21l5.53-2.708C10.412 18.42 11.19 18.5 12 18.5c5.514 0 10-3.582 10-8s-4.486-8.5-10-8.5z" />
    </svg>
  );
}
