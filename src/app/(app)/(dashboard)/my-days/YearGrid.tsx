"use client";

import { useEffect, useState } from "react";
import { fetchLagsMonth } from "../../../../lib/daily/api";
import {
  getYearCounts,
  setYearCounts,
  subscribeToDailyEntryChanges,
} from "../../../../lib/daily/cache";
import { MONTH_LABELS } from "../../../../lib/daily/date";
import type { LagsResponse } from "../../../../lib/daily/types";

// Module-level in-flight dedupe so React strict-mode double-mount in dev
// doesn't fire 24 requests and doesn't clobber component state with a stale
// cleanup flag. Keyed by year; resolves to the 12-element count array.
const inflight = new Map<number, Promise<number[]>>();

async function loadYearCounts(year: number): Promise<number[]> {
  const cached = getYearCounts(year);
  if (Array.isArray(cached)) return cached;
  const existing = inflight.get(year);
  if (existing) return existing;
  const p = (async () => {
    const responses = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        fetchLagsMonth(i + 1, year).catch((err) => {
          if (process.env.NODE_ENV !== "production") {
            console.warn(`[my-days] lagsMonth ${i + 1}/${year} failed:`, err);
          }
          return null;
        }),
      ),
    );
    const result = responses.map((r) => countLags(r));
    setYearCounts(year, result);
    inflight.delete(year);
    return result;
  })();
  inflight.set(year, p);
  return p;
}

export default function YearGrid({
  year,
  onSelectMonth,
}: {
  year: number;
  onSelectMonth: (monthIdx: number) => void;
}) {
  const [counts, setCounts] = useState<number[] | null>(() => {
    const seed = getYearCounts(year);
    return Array.isArray(seed) ? seed : null;
  });
  const [loading, setLoading] = useState<boolean>(() => !Array.isArray(getYearCounts(year)));

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const cached = getYearCounts(year);
      if (Array.isArray(cached)) {
        if (!cancelled) {
          setCounts(cached);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      const result = await loadYearCounts(year);
      if (!cancelled) {
        setCounts(result);
        setLoading(false);
      }
    };

    void refresh();
    const off = subscribeToDailyEntryChanges(() => {
      setYearCounts(year, undefined);
      void refresh();
    });
    return () => {
      cancelled = true;
      off();
    };
  }, [year]);

  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-x-[48px]">
      {MONTH_LABELS.map((label, i) => {
        const n = counts ? counts[i] : 0;
        const isLast = i === MONTH_LABELS.length - 1;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onSelectMonth(i)}
            className={`cursor-pointer w-full text-left py-[18px] hover:bg-black/[0.02] transition-colors ${
              isLast ? "" : "border-b border-[#C9C9C9]"
            }`}
          >
            <div className="flex items-center justify-between gap-[12px]">
              <span className="font-montserrat font-medium text-[#232323] text-[16px]">
                {label}
              </span>
              <span className="font-montserrat text-[#848484] text-[12px]">
                {loading
                  ? "…"
                  : `${n} day${n === 1 ? "" : "s"} logged`}
              </span>
            </div>
            {n > 0 && (
              <div className="mt-[8px] flex flex-wrap gap-[4px]">
                {Array.from({ length: n }, (_, j) => (
                  <span
                    key={j}
                    className="w-[6px] h-[6px] rounded-full bg-[#232323] inline-block"
                  />
                ))}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function countLags(r: LagsResponse | null): number {
  if (!r) return 0;
  const envelope = r.data ?? (r as unknown as LagsResponse["data"]);
  const lagsLen = envelope?.lag?.lags?.length;
  if (typeof lagsLen === "number") return lagsLen;
  const promptLen = envelope?.promptCards?.length;
  return typeof promptLen === "number" ? promptLen : 0;
}
