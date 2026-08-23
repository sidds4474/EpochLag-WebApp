"use client";

import type { LibraryThread } from "../../../../lib/library/api";
import { ImageIcon } from "../icons";

type Props = {
  draft: LibraryThread;
  onTap: () => void;
};

// Draft tile — reuses the CardTile silhouette but without a bookmark
// toggle. Shows a small progress bar indicating how "complete" the
// draft is (rough heuristic: title + cover + content each contribute).
export default function DraftTile({ draft, onTap }: Props) {
  const cover =
    draft.promptCard?.imageUrl ||
    draft.latestStory?.media?.[0]?.url ||
    null;
  const title =
    draft.latestStory?.title?.trim() ||
    draft.promptCard?.content?.trim() ||
    "Untitled draft";
  const progress = computeDraftProgress(draft);
  const updated = formatUpdatedAt(draft.latestActivity);
  return (
    <div
      onClick={onTap}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onTap();
        }
      }}
      className="cursor-pointer group relative flex items-stretch gap-[12px] bg-white rounded-[16px] shadow-[0_0_25px_0_rgba(0,0,0,0.20)] p-[10px] transition-shadow"
    >
      <div className="relative w-[80px] h-[80px] md:w-[92px] md:h-[92px] shrink-0 rounded-[12px] overflow-hidden bg-[#ededed]">
        {cover ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={cover}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-primary-blue/30">
            <ImageIcon width={28} height={28} />
          </span>
        )}
      </div>

      {/* Right column — title top, then "Last edited …", then a full-
          width progress bar pinned to the bottom via justify-between. */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-[2px] pr-[4px]">
        <p className="font-montserrat font-semibold text-primary-blue text-[14px] leading-[19px] line-clamp-1">
          {title}
        </p>
        <div className="mt-auto">
          {updated && (
            <p className="font-montserrat text-primary-blue/50 text-[12px]">
              Last edited {updated}
            </p>
          )}
          <div className="mt-[6px] h-[4px] w-full rounded-full bg-[#ededed] overflow-hidden">
            <span
              className="block h-full bg-primary-orange transition-[width]"
              style={{ width: `${progress}%` }}
              aria-hidden
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Rough progress: title present (25%), cover present (25%), latestStory
// content present (50%). Mirrors mobile heuristic — it's a visual cue,
// not a real spec.
function computeDraftProgress(d: LibraryThread): number {
  let p = 0;
  if (d.latestStory?.title?.trim()) p += 25;
  if (d.promptCard?.imageUrl) p += 25;
  if (d.latestStory?.content?.trim()) p += 50;
  return Math.min(100, p);
}

function formatUpdatedAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
