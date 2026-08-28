"use client";

import { useState } from "react";

type Props = {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
};

export default function ConfirmationModal({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function handleConfirm() {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  const confirmClasses = destructive
    ? "bg-[#D95F3B] text-white hover:opacity-90"
    : "bg-primary-orange text-primary-white hover:opacity-90";

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center px-[20px]"
      onClick={busy ? undefined : onCancel}
    >
      <div
        className="w-full max-w-[420px] bg-white rounded-[20px] px-[24px] pt-[24px] pb-[22px] md:px-[28px] md:pt-[26px] md:pb-[24px]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-montserrat font-bold text-primary-blue text-[18px] md:text-[20px] text-center">
          {title}
        </h3>
        {body && (
          <p className="mt-[8px] font-montserrat text-primary-blue text-[13px] md:text-[14px] leading-[18px] text-center">
            {body}
          </p>
        )}
        <div className={`mt-[18px] md:mt-[20px] flex items-center gap-[12px] ${destructive ? "flex-row-reverse" : ""}`}>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="cursor-pointer flex-1 bg-white text-[#092E4A] font-montserrat font-semibold text-[14px] md:text-[15px] rounded-full py-[11px] md:py-[12px] border border-[#092E4A] hover:bg-black/[0.03] transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className={`cursor-pointer flex-1 font-montserrat font-semibold text-[14px] md:text-[15px] rounded-full py-[11px] md:py-[12px] transition-opacity disabled:opacity-50 disabled:cursor-not-allowed ${confirmClasses}`}
          >
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
