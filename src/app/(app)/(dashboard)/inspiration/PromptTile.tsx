"use client";

import type { UserCard } from "../../../../types/home";
import { momentTypeIcon } from "../moments/momentTypeIcon";

// Static display tile used by the new /inspiration page: sand bg with a
// category header strip (icon + label) above a hairline divider, then the
// prompt body in Lora. The Answer it / Send it CTAs live in the page
// footer, so this tile is pure display — no flip, no bookmark, no icons.
export default function PromptTile({ card }: { card: UserCard }) {
  const tagRaw = card.tags?.[0]?.trim() ?? "";
  const label = tagRaw
    ? tagRaw.charAt(0).toUpperCase() + tagRaw.slice(1)
    : "Prompt";
  const prompt = card.content || card.title || "";
  const iconType = inferMomentType(tagRaw);

  return (
    <div className="w-full h-full bg-[#E8E6DF] p-[10px]">
      <div className="w-full h-full border border-black/30 flex flex-col">
        {/* Header strip: icon cell | category label, divided by a vertical
            hairline and separated from the body by a horizontal one. */}
        <div className="flex items-stretch border-b border-black/30">
          <div className="shrink-0 w-[52px] md:w-[58px] flex items-center justify-center py-[12px] border-r border-black/30">
            <span className="text-[#232323] flex items-center justify-center">
              {momentTypeIcon(iconType, 22)}
            </span>
          </div>
          <div className="flex-1 flex items-center px-[16px] md:px-[18px]">
            <span className="font-montserrat text-[#232323] text-[14px] md:text-[15px]">
              {label}
            </span>
          </div>
        </div>
        {/* Body: prompt text left-aligned, anchored near the bottom-left */}
        <div className="flex-1 flex items-end">
          <p className="w-full px-[20px] md:px-[24px] pb-[24px] md:pb-[28px] pt-[24px] font-ivy font-normal text-[#232323] text-[20px] md:text-[22px] leading-[1.3] text-left">
            {prompt}
          </p>
        </div>
      </div>
    </div>
  );
}

// Map an inspiration tag to the closest moment-icon type so the chip glyph
// matches the card's category without introducing a new icon set. Falls back
// to "Other" (calendar) when the tag doesn't map.
function inferMomentType(tag: string): string {
  const t = tag.trim().toLowerCase();
  if (!t) return "Other";
  if (t.includes("birthday")) return "Birthday";
  if (t.includes("wedding")) return "Wedding";
  if (t.includes("travel") || t.includes("adventure")) return "Travel";
  if (t.includes("graduation") || t.includes("school")) return "Graduation";
  if (t.includes("anniversary") || t.includes("love") || t.includes("relationship")) return "Anniversary";
  if (t.includes("baby") || t.includes("newborn")) return "NewBaby";
  if (t.includes("home") || t.includes("house")) return "FirstHome";
  if (t.includes("retire")) return "Retirement";
  if (t.includes("loss") || t.includes("grief")) return "Loss";
  return "Other";
}
