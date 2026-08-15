"use client";

import NotificationsList from "./NotificationsList";
import { useNotifications } from "./useNotifications";

export default function NotificationsPage() {
  const { items, loading, markSeen, clearAll } = useNotifications();

  return (
    <div className="px-[16px] md:px-[24px] lg:px-[40px] py-[16px] md:py-[24px] max-w-[720px] mx-auto">
      <NotificationsList
        items={items}
        loading={loading}
        onSeenChange={markSeen}
        onClearAll={clearAll}
        variant="page"
      />
    </div>
  );
}
