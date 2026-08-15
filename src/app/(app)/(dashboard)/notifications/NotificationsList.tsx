"use client";

import { toast } from "react-hot-toast";
import { groupBySection } from "../../../../lib/notifications/api";
import type { Notification } from "../../../../types/home";
import NotificationRow from "./NotificationRow";

type Props = {
  items: Notification[];
  loading: boolean;
  onSeenChange: (id: string, seen: boolean) => void;
  onClearAll: () => Promise<void>;
  onNavigate?: () => void;
  variant: "popover" | "page";
};

export default function NotificationsList({
  items,
  loading,
  onSeenChange,
  onClearAll,
  onNavigate,
  variant,
}: Props) {
  const sections = groupBySection(items);
  const isPopover = variant === "popover";

  const headerTitleClass = isPopover
    ? "font-montserrat font-bold text-primary-blue text-[20px]"
    : "font-montserrat font-bold text-primary-blue text-[28px] md:text-[36px]";

  const sectionLabelClass = isPopover
    ? "font-montserrat font-bold text-primary-blue text-[13px] mt-[10px] mb-[2px] px-[16px]"
    : "font-montserrat font-bold text-primary-blue text-[15px] mt-[16px] mb-[4px] px-[16px]";

  const dividerClass = "h-px bg-black/[0.08] my-[10px] mx-[16px]";

  const handleClearAll = async () => {
    try {
      await onClearAll();
    } catch {
      toast.error("Could not clear notifications. Please try again.");
    }
  };

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center justify-between px-[20px] pt-[16px] pb-[6px]">
        <h2 className={headerTitleClass}>Notifications</h2>
        {items.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="cursor-pointer font-montserrat font-medium text-primary-blue text-[14px] hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pb-[12px]">
        {loading && items.length === 0 ? (
          <p className="px-[20px] py-[24px] font-montserrat text-primary-blue/60 text-[14px]">
            Loading…
          </p>
        ) : items.length === 0 ? (
          <p className="px-[20px] py-[24px] font-montserrat text-primary-blue/60 text-[14px]">
            You&rsquo;re all caught up.
          </p>
        ) : (
          sections.map((section, idx) => (
            <div key={section.title}>
              {idx > 0 && <div className={dividerClass} />}
              <p className={sectionLabelClass}>{section.title}</p>
              <ul className="flex flex-col">
                {section.items.map((n) => (
                  <NotificationRow
                    key={n._id}
                    notification={n}
                    onSeenChange={onSeenChange}
                    onNavigate={onNavigate}
                  />
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
