"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { subscribeToDailyEntryChanges } from "../../../../lib/daily/cache";
import { todayISO } from "../../../../lib/daily/date";
import { useDailyEntries } from "../../../../lib/daily/useDailyEntries";
import type { DailyEntry } from "../../../../lib/daily/types";
import { ChevronLeftIcon } from "../icons";
import MonthGrid from "./MonthGrid";
import RecordedDays from "./RecordedDays";
import WeekDots from "./WeekDots";
import YearGrid from "./YearGrid";

type Tab = "week" | "month" | "year";

function parseISO(iso: string | null): { y: number; m: number } | null {
  if (!iso || iso.length < 7) return null;
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  if (!Number.isFinite(y) || !Number.isFinite(m)) return null;
  return { y, m: m - 1 };
}

export default function MyDaysPage() {
  const router = useRouter();
  const search = useSearchParams();
  const seedISO = search.get("dateISO");
  const seedParts = parseISO(seedISO);
  const today = new Date();
  const [tab, setTab] = useState<Tab>(seedParts ? "month" : "week");
  const [year, setYear] = useState<number>(seedParts?.y ?? today.getFullYear());
  const [month, setMonth] = useState<number>(seedParts?.m ?? today.getMonth());

  // Post-publish arrival (?dateISO=...). Delay then force refresh both
  // week + month so the BE cache has settled.
  const [bumpToken, setBumpToken] = useState(0);
  useEffect(() => {
    if (!seedISO) return;
    const timeout = window.setTimeout(() => {
      setBumpToken((n) => n + 1);
      // notify will fan out to both hooks via the event emitter
      import("../../../../lib/daily/cache").then((mod) =>
        mod.notifyDailyEntryChanged(),
      );
    }, 800);
    return () => window.clearTimeout(timeout);
  }, [seedISO]);

  void bumpToken;

  const weekArgs = useMemo(() => ({ range: "week" as const }), []);
  const monthArgs = useMemo(
    () => ({ range: "month" as const, month: month + 1, year }),
    [month, year],
  );

  const week = useDailyEntries(weekArgs);
  const monthHook = useDailyEntries(monthArgs);

  const visibleEntries = tab === "week" ? week.entries : monthHook.entries;

  // Refetch both whenever a daily-change event fires (publish, un-lag).
  useEffect(() => {
    const off = subscribeToDailyEntryChanges(() => {
      void week.refresh();
      void monthHook.refresh();
    });
    return off;
  }, [week, monthHook]);

  const openEntry = useCallback(
    (entry: DailyEntry) => {
      const threadId = entry.threadId || entry.thread?._id;
      if (!threadId) return;
      router.push(`/thread/${threadId}`);
    },
    [router],
  );

  const openComposerFor = useCallback(
    (iso: string) => {
      const params = new URLSearchParams({ source: "daily", dailyDate: iso });
      router.push(`/new-lag?${params.toString()}`);
    },
    [router],
  );

  const handleSelectDay = useCallback(
    (iso: string, hasEntry: boolean) => {
      if (hasEntry) {
        const entry = (tab === "week" ? week.entries : monthHook.entries)[iso];
        if (entry) openEntry(entry);
        return;
      }
      if (iso > todayISO()) return;
      openComposerFor(iso);
    },
    [tab, week.entries, monthHook.entries, openEntry, openComposerFor],
  );

  const recordedEntries = tab === "week" ? week.entries : monthHook.entries;

  const mainCard = (
    <>
      <SegmentedControl tab={tab} onChange={setTab} />
      <div className="mt-[24px]">
        {tab === "week" && (
          <WeekDots entries={week.entries} onSelectDay={handleSelectDay} />
        )}
        {tab === "month" && (
          <div className="p-[4px] md:p-[8px]">
            <MonthGrid
              month={month}
              year={year}
              entries={monthHook.entries}
              onMonthChange={(m, y) => {
                setMonth(m);
                setYear(y);
              }}
              onYearChange={(y) => setYear(y)}
              onSelectDay={handleSelectDay}
            />
          </div>
        )}
        {tab === "year" && (
          <YearGrid
            year={year}
            onSelectMonth={(m) => {
              setMonth(m);
              setTab("month");
            }}
          />
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-full bg-[#F3F1EB] px-[20px] md:px-[32px] py-[20px] md:py-[24px] pb-[48px]">
      <div className="max-w-[1120px] mx-auto">
        <div className="flex items-center gap-[12px] mb-[24px]">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="cursor-pointer w-[28px] h-[28px] text-[#232323] flex items-center justify-center hover:opacity-70 transition-opacity"
          >
            <ChevronLeftIcon width={16} height={16} />
          </button>
          <h1 className="font-ivy font-normal text-[#232323] text-[24px] md:text-[32px] leading-[1.15]">
            My Days
          </h1>
        </div>

        <div
          className={`grid gap-[32px] items-start ${
            tab === "year" ? "" : "xl:grid-cols-[1fr_360px]"
          }`}
        >
          <div className="flex flex-col">{mainCard}</div>
          {tab !== "year" && (
            <aside className="xl:sticky xl:top-[24px]">
              <RecordedDays entries={recordedEntries} onOpenEntry={openEntry} />
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

function SegmentedControl({
  tab,
  onChange,
}: {
  tab: Tab;
  onChange: (next: Tab) => void;
}) {
  const options: Array<{ value: Tab; label: string }> = [
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "year", label: "Year" },
  ];
  return (
    <div className="flex items-center gap-[8px]">
      {options.map((o) => {
        const active = o.value === tab;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`cursor-pointer h-[36px] px-[18px] rounded-full font-montserrat text-[13px] transition-colors ${
              active
                ? "bg-primary-orange text-white font-medium"
                : "bg-[#E8E6DF] text-[#232323] hover:brightness-95"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
