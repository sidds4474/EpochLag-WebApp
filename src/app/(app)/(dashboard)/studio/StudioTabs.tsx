"use client";

import type { StudioTab } from "../../../../lib/studio/api";

type Props = {
  active: StudioTab;
  onChange: (tab: StudioTab) => void;
};

const TABS: Array<{ id: StudioTab; label: string }> = [
  { id: "received", label: "Received" },
  { id: "sent", label: "Sent" },
  { id: "bookmark", label: "Bookmark" },
  { id: "draft", label: "Draft" },
];

// Horizontal filter row. Active pill = dark blue filled; inactive =
// white outlined. Mobile scrolls horizontally if the four pills don't
// fit; desktop shows them inline with wrap-none.
export default function StudioTabs({ active, onChange }: Props) {
  return (
    <div className="-mx-[16px] px-[16px] md:mx-0 md:px-0 overflow-x-auto scrollbar-hide">
      <div className="flex items-center gap-[8px] w-max md:w-auto">
        {TABS.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className={`cursor-pointer shrink-0 rounded-full px-[18px] h-[36px] inline-flex items-center font-montserrat font-medium text-[14px] transition-colors ${
                on
                  ? "bg-primary-blue text-white"
                  : "bg-white text-primary-blue border-[1.5px] border-primary-blue/80 hover:bg-primary-blue/[0.04]"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
