"use client";

import { useEffect } from "react";

export default function RemoveFromCountdownModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-[16px]">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-countdown-title"
        className="relative bg-white rounded-[25px] shadow-[0_10px_40px_rgba(0,0,0,0.20)] w-full max-w-[354px] px-[24px] py-[28px] flex flex-col items-center gap-[16px]"
      >
        <div className="flex flex-col gap-[8px] items-center text-center">
          <h2
            id="remove-countdown-title"
            className="font-ivy font-normal text-[#232323] text-[22px] leading-[1.2]"
          >
            Remove from Countdown
          </h2>
          <p className="font-montserrat text-[#2c2c2c]/70 text-[14px] leading-[1.4]">
            This moment won&apos;t show in your countdowns anymore.
          </p>
        </div>
        <div className="flex gap-[8px] w-full">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer flex-1 bg-[#EDEDED] text-[#232323] rounded-full py-[12px] font-montserrat font-medium text-[15px] hover:brightness-95 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="cursor-pointer flex-1 bg-primary-orange text-white rounded-full py-[12px] font-montserrat font-semibold text-[15px] hover:opacity-90 transition"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
