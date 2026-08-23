"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { ApiError } from "../../../../../lib/api/client";
import { useAuth } from "../../../../../lib/auth/AuthProvider";
import { setBackgroundPictureUrl } from "../../../../../lib/profile/api";
import {
  fetchCardGradients,
  type GradientCover,
} from "../../../../../lib/create/api";
import { ChevronLeftIcon } from "../../icons";

// Edit Cover Image — 3-column grid on desktop, 3-column on mobile too
// per Figma (portrait-oriented tiles let more choices fit above the
// fold). Selected tile: orange border + checkmark chip. Save is a no-op
// when the picked gradient is already the active cover (compares by
// filename slug so query-string bust keys don't break the match).
export default function EditCoverPage() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const [gradients, setGradients] = useState<GradientCover[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCardGradients()
      .then((list) => {
        if (!cancelled) setGradients(list);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Selection is keyed by the tile's URL, not by _id — the gradients
  // endpoint sometimes returns `id` and sometimes `_id`, and neither is
  // guaranteed to be present. URL is the one stable, always-there field
  // (and it doubles as what we PUT to the profile endpoint anyway).
  const keyFor = (g: GradientCover) => (g.imageUrl || g.url || "") as string;

  // Detect the currently-selected gradient by matching the filename
  // portion of the URL. Query strings (bust keys) are stripped so the
  // match survives cache-busting. Selection is left null if nothing
  // matches — Save stays disabled until the user picks.
  useEffect(() => {
    if (!user?.backgroundPicture || gradients.length === 0) return;
    const currentFilename = filenameOf(user.backgroundPicture);
    if (!currentFilename) return;
    const current = gradients.find((g) => {
      const url = keyFor(g);
      if (!url) return false;
      return filenameOf(url) === currentFilename;
    });
    const nextId = current ? keyFor(current) : null;
    if (nextId) setSelectedId(nextId);
  }, [user?.backgroundPicture, gradients]);

  const selected = useMemo(
    () => (selectedId ? gradients.find((g) => keyFor(g) === selectedId) ?? null : null),
    [gradients, selectedId]
  );

  async function handleSave() {
    if (!selected || saving) return;
    const url = selected.imageUrl || selected.url;
    if (!url) return;
    // No-op if user picked the currently-active gradient.
    const currentFilename = filenameOf(user?.backgroundPicture ?? "");
    if (currentFilename && currentFilename === filenameOf(url)) {
      router.back();
      return;
    }
    setSaving(true);
    try {
      const next = await setBackgroundPictureUrl(url);
      updateUser(next);
      toast.success("Cover updated");
      router.back();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Couldn't update cover";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-full flex flex-col min-h-0 overflow-y-auto bg-white">
      <div className="px-[16px] md:px-[24px] lg:px-[40px] pt-[16px] md:pt-[20px] pb-[100px] md:pb-[40px] max-w-[1100px] mx-auto w-full">
        <div className="flex items-center justify-between gap-[12px]">
          <div className="flex items-center gap-[10px]">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Back"
              className="cursor-pointer w-[36px] h-[36px] rounded-full text-primary-blue flex items-center justify-center hover:bg-black/[0.06] transition-colors"
            >
              <ChevronLeftIcon width={18} height={18} />
            </button>
            <h1 className="font-montserrat font-bold text-primary-blue text-[22px] md:text-[28px] leading-tight">
              Edit cover image
            </h1>
          </div>
          <button
            type="button"
            disabled={!selected || saving}
            onClick={handleSave}
            className="cursor-pointer bg-primary-orange text-white rounded-full h-[40px] md:h-[44px] px-[24px] font-montserrat font-semibold text-[14px] hover:brightness-95 transition-[filter] disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center min-w-[86px]"
          >
            {saving ? (
              <span className="w-[18px] h-[18px] rounded-full border-2 border-white/40 border-t-white animate-spin" />
            ) : (
              "Save"
            )}
          </button>
        </div>

        {/* Mobile grid is edge-to-edge, no gaps, portrait 3:4 tiles, no
            rounding — matches the phone Figma. Negative margins on the
            container cancel the page's px-[16px] gutter so the mosaic
            bleeds into the safe area. Desktop keeps the framed look with
            gaps, rounding, and the orange-border selection state. */}
        <div className="mt-[20px] -mx-[16px] md:mx-0 grid grid-cols-3 gap-[4px] md:gap-[20px]">
          {loading &&
            Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] md:aspect-[4/3] rounded-none md:rounded-[16px] bg-[#f3f3f3] animate-pulse"
              />
            ))}
          {!loading &&
            gradients.map((g) => {
              const url = keyFor(g);
              if (!url) return null;
              const isSelected = selectedId !== null && url === selectedId;
              // Mobile: no border frame — just a checkmark chip on the
              // selected tile. Desktop: 3px orange border with a 3px
              // inner gap so the frame reads distinct from the image.
              return (
                <button
                  key={url}
                  type="button"
                  onClick={() => setSelectedId(url)}
                  className={`relative cursor-pointer aspect-[3/4] md:aspect-[4/3] rounded-none md:rounded-[18px] p-0 md:p-[3px] border-0 md:border-[3px] transition-colors ${
                    isSelected
                      ? "md:border-primary-orange"
                      : "md:border-transparent hover:brightness-95"
                  }`}
                >
                  <span className="absolute inset-0 md:inset-[3px] rounded-none md:rounded-[12px] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                  </span>
                  {isSelected && (
                    <span className="absolute top-[10px] right-[10px] md:top-[14px] md:right-[14px] w-[26px] h-[26px] rounded-full bg-white/90 text-primary-blue flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.15)]">
                      <CheckIcon width={14} height={14} />
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}

// Filename slug lookup. Strips path + query so `.../gradient-04.png?t=123`
// and `.../gradient-04.png` both resolve to `gradient-04.png`.
function filenameOf(url: string): string {
  if (!url) return "";
  const noQuery = url.split("?")[0];
  const parts = noQuery.split("/");
  return parts[parts.length - 1] ?? "";
}

function CheckIcon({ width = 14, height = 14 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <path
        d="M5 12.5L10 17.5L19 7.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
