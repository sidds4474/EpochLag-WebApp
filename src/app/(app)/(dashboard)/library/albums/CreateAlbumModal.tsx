"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onCancel: () => void;
  onCreate: (title: string) => Promise<void>;
};

export default function CreateAlbumModal({ open, onCancel, onCreate }: Props) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setTitle("");
      setBusy(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  if (!open) return null;

  const trimmed = title.trim();
  const canSubmit = trimmed.length > 0 && !busy;

  async function handleSubmit() {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await onCreate(trimmed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center px-[16px]"
      onClick={busy ? undefined : onCancel}
    >
      <div
        className="w-full max-w-[380px] bg-white rounded-[20px] px-[24px] pt-[22px] pb-[20px]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-montserrat font-bold text-primary-blue text-[17px] text-center">
          Create album
        </h3>
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          placeholder="Album name"
          maxLength={80}
          className="mt-[16px] w-full bg-[#f4f4f4] rounded-[12px] px-[14px] py-[10px] font-montserrat text-primary-blue text-[14px] placeholder:text-primary-blue/40 focus:outline-none focus:ring-2 focus:ring-primary-orange"
        />
        <div className="mt-[20px] flex items-center gap-[10px]">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="cursor-pointer flex-1 bg-white text-primary-blue font-montserrat font-semibold text-[14px] rounded-full py-[10px] border border-primary-blue/25 hover:bg-black/[0.03] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="cursor-pointer flex-1 bg-primary-orange text-white font-montserrat font-semibold text-[14px] rounded-full py-[10px] transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
          >
            {busy ? "…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
