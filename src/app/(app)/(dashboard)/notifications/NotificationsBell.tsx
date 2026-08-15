"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BellIcon } from "../icons";
import NotificationsList from "./NotificationsList";
import { useNotifications } from "./useNotifications";

type Props = {
  onUnreadChange?: (unread: boolean) => void;
};

export default function NotificationsBell({ onUnreadChange }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const { items, loading, hasUnread, refresh, markSeen, clearAll } =
    useNotifications();

  // Push unread state up so the parent header (and elsewhere) stays in sync
  // — mark-seen and clear-all mutate the shared cache but don't tell layout.
  useEffect(() => {
    onUnreadChange?.(hasUnread);
  }, [hasUnread, onUnreadChange]);

  useEffect(() => {
    if (!open) return;
    refresh();
    const handlePointer = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, refresh]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={(e) => {
          // Tablet (below lg) falls back to the full page — the popover only
          // has room to breathe on desktop.
          if (window.matchMedia("(max-width: 1023px)").matches) {
            router.push("/notifications");
            return;
          }
          e.preventDefault();
          setOpen((v) => !v);
        }}
        aria-label={`Notifications${hasUnread ? ", unread" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative cursor-pointer p-[8px] rounded-full text-primary-blue hover:bg-black/[0.04] transition-colors"
      >
        <BellIcon width={26} height={26} />
        {hasUnread && (
          <span className="absolute top-[6px] right-[6px] w-[8px] h-[8px] rounded-full bg-[#e53e3e] ring-2 ring-white" />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-[48px] w-[360px] max-h-[80vh] bg-white rounded-[24px] shadow-[0_0_29.2px_rgba(0,0,0,0.25)] border border-black/[0.04] overflow-hidden z-20 flex flex-col"
        >
          <NotificationsList
            items={items}
            loading={loading}
            onSeenChange={markSeen}
            onClearAll={clearAll}
            onNavigate={() => setOpen(false)}
            variant="popover"
          />
        </div>
      )}
    </div>
  );
}
