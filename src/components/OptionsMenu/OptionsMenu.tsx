"use client";

import { useEffect, useRef } from "react";

export type OptionsMenuItem = {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  items: OptionsMenuItem[];
  /** Alignment along the anchor's horizontal axis. Default "right". */
  align?: "left" | "right";
};

export default function OptionsMenu({
  open,
  onClose,
  items,
  align = "right",
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Click-outside + Escape close. Attached only while open to keep listener
  // count minimal.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={rootRef}
      role="menu"
      className={`absolute z-40 top-full mt-[6px] ${
        align === "right" ? "right-0" : "left-0"
      } min-w-[180px] bg-white rounded-[22px] shadow-[0_6px_24px_rgba(0,0,0,0.15)] border border-black/[0.06] py-[6px]`}
    >
      {items.map((item, idx) => (
        <div key={`${idx}-${item.label}`}>
          {idx > 0 && (
            <div className="h-px bg-[#C9C9C9] mx-[16px]" aria-hidden />
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={`cursor-pointer w-full text-left px-[16px] py-[12px] flex items-center gap-[12px] font-montserrat text-[15px] text-primary-blue transition-colors ${
              item.destructive ? "hover:bg-red-500/[0.08]" : "hover:bg-black/[0.04]"
            }`}
          >
            <span className="flex-1">{item.label}</span>
            {item.icon && <span className="shrink-0">{item.icon}</span>}
          </button>
        </div>
      ))}
    </div>
  );
}
