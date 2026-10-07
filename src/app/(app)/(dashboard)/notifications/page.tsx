"use client";

import { useRouter } from "next/navigation";
import NotificationsList from "./NotificationsList";
import { useNotifications } from "./useNotifications";

export default function NotificationsPage() {
  const router = useRouter();
  const { items, loading, markSeen, clearAll } = useNotifications();

  return (
    <div className="max-w-[720px] mx-auto px-0 md:px-[24px] lg:px-[40px] pt-0 md:pt-[24px] pb-[16px] md:pb-[24px]">
      {/* Mobile-only header with back button. Desktop keeps the header inside
          NotificationsList (unchanged). */}
      <div className="md:hidden sticky top-0 z-10 bg-white flex items-center gap-[10px] px-[16px] pt-[14px] pb-[10px] border-b border-black/[0.06]">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="cursor-pointer w-[36px] h-[36px] rounded-full bg-[#EFEFEF] flex items-center justify-center text-primary-blue"
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <path
              d="M15 6l-6 6 6 6"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="font-montserrat font-bold text-primary-blue text-[22px] leading-none">
          Notifications
        </h1>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => clearAll()}
            className="ml-auto cursor-pointer font-montserrat font-medium text-primary-blue text-[14px]"
          >
            Clear all
          </button>
        )}
      </div>

      <NotificationsList
        items={items}
        loading={loading}
        onSeenChange={markSeen}
        onClearAll={clearAll}
        variant="page"
        hideHeaderOnMobile
      />
    </div>
  );
}
