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
  /** Direction the menu opens. Default "down". */
  direction?: "down" | "up";
};

export default function OptionsMenu({
  open,
  onClose,
  items,
  align = "right",
  direction = "down",
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
      className={`absolute z-40 ${
        direction === "up" ? "bottom-full mb-[6px]" : "top-full mt-[6px]"
      } ${
        align === "right" ? "right-0" : "left-0"
      } min-w-[180px] bg-white rounded-[18px] shadow-[0_0_12px_rgba(0,0,0,0.15)] py-[6px]`}
    >
      {items.map((item, idx) => (
        <div key={`${idx}-${item.label}`}>
          {idx > 0 && (
            <div className="h-px bg-[#C9C9C9] mx-[12px]" aria-hidden />
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={`cursor-pointer w-full text-left px-[12px] py-[9px] flex items-center gap-[10px] font-montserrat font-medium text-[13px] leading-[18px] transition-colors ${
              item.destructive
                ? "text-[#D95F3B] hover:bg-[#D95F3B]/[0.06]"
                : "text-primary-blue hover:bg-black/[0.04]"
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
