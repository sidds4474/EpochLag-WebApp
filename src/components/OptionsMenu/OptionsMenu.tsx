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
      } min-w-[180px] bg-white rounded-[14px] shadow-[0_6px_24px_rgba(0,0,0,0.15)] border border-black/[0.06] py-[6px]`}
    >
      {items.map((item, idx) => (
        <button
          key={`${idx}-${item.label}`}
          type="button"
          role="menuitem"
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className={`cursor-pointer w-full text-left px-[14px] py-[9px] flex items-center gap-[10px] font-montserrat text-[14px] transition-colors ${
            item.destructive
              ? "text-red-600 hover:bg-red-500/[0.08]"
              : "text-primary-blue hover:bg-black/[0.04]"
          }`}
        >
          {item.icon && <span className="shrink-0">{item.icon}</span>}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
