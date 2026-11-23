"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { hydrate, useMomentsState } from "../../../../lib/moments/cache";
import type { Moment, MomentFilter } from "../../../../types/moment";
import { ChevronLeftIcon, PlusIcon } from "../icons";
import CountdownCarousel from "./CountdownCarousel";
import MomentRow from "./MomentRow";
import MomentsCalendar from "./MomentsCalendar";
import MomentDetailCard from "./MomentDetailCard";
import DeleteMomentModal from "./DeleteMomentModal";
import { isoDay } from "../../../../lib/moments/recurrence";
import { isoDayFromCalendar } from "../../../../lib/moments/date";

export default function MomentsPage() {
  const {
    byFilter,
    loadingByFilter,
    countdown,
  } = useMomentsState();
  const [filter, setFilter] = useState<MomentFilter>("upcoming");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rightMode, setRightMode] = useState<"calendar" | "detail">("calendar");
  const [deleteTarget, setDeleteTarget] = useState<Moment | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>(() => isoDay(new Date()));
  const [mobileView, setMobileView] = useState<"list" | "calendar">("list");
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Seed selection from ?selected=<id> (e.g. after edit-save redirect).
  const seededSelectionRef = useRef(false);
  useEffect(() => {
    if (seededSelectionRef.current) return;
    const sel = searchParams.get("selected");
    if (!sel) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(min-width: 1280px)").matches) return;
    seededSelectionRef.current = true;
    setSelectedId(sel);
    setRightMode("detail");
  }, [searchParams]);

  const isDesktop = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(min-width: 1280px)").matches;

  const handleRowClick = (m: Moment) => {
    if (isDesktop()) {
      if (selectedId === m._id && rightMode === "detail") {
        setSelectedId(null);
        setRightMode("calendar");
      } else {
        setSelectedId(m._id);
        setRightMode("detail");
      }
    } else {
      router.push(`/moments/${m._id}`);
    }
  };

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1280px)");
    const handler = () => {
      if (mq.matches) setMobileView("list");
    };
    handler();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const list: Moment[] | null = byFilter[filter];
  const isLoading =
    loadingByFilter[filter] && (list === null || list.length === 0);

  // Pool for calendar dot markers, "moments on this day" summary, and
  // resolving the currently selected moment regardless of active filter
  // (the countdown carousel can surface moments not in the current filter).
  const allMoments = useMemo<Moment[]>(() => {
    const seen = new Map<string, Moment>();
    for (const src of [byFilter.upcoming, byFilter.past, byFilter.all, countdown]) {
      if (!src) continue;
      for (const m of src) if (!seen.has(m._id)) seen.set(m._id, m);
    }
    return [...seen.values()];
  }, [byFilter, countdown]);

  const selectedMoment = useMemo(() => {
    if (!selectedId) return null;
    return allMoments.find((m) => m._id === selectedId) ?? null;
  }, [selectedId, allMoments]);

  const momentsOnSelectedDay = useMemo(() => {
    if (!selectedDay) return [];
    return allMoments.filter((m) => {
      const iso = isoDayFromCalendar(m.nextOccurrence || m.date);
      return iso === selectedDay;
    });
  }, [allMoments, selectedDay]);

  return (
    <div className="h-full min-h-0 flex flex-col overflow-y-auto bg-[#f3f1eb]">
      <div className="px-[12px] md:px-[24px] lg:px-[32px] pt-[16px] pb-[24px] md:pb-[40px] max-w-[1400px] mx-auto w-full">
        {/* Header row: back + Moments title + help, then Add Moment on the right */}
        <div className="flex items-center justify-between gap-[16px] mb-[20px]">
          <div className="flex items-center gap-[12px]">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Back"
              className="cursor-pointer w-[36px] h-[36px] rounded-full bg-white hover:bg-white/90 shadow-[0_1px_3px_rgba(0,0,0,0.08)] text-[#232323] flex items-center justify-center transition-colors shrink-0"
            >
              <ChevronLeftIcon width={16} height={16} />
            </button>
            <h1 className="font-ivy font-normal text-[#232323] text-[26px] md:text-[32px] leading-[1.15]">
              Moments
            </h1>
            <HelpCircleIcon />
          </div>

          <Link
            href="/moments/new"
            aria-label="Add Moment"
            className="xl:hidden cursor-pointer w-[36px] h-[36px] rounded-full bg-[#E8E6DF] text-[#232323] flex items-center justify-center shrink-0 hover:brightness-95 transition"
          >
            <PlusIcon width={16} height={16} strokeWidth={2.5} />
          </Link>

          {!(rightMode !== "calendar" && selectedMoment) && (
            <Link
              href="/moments/new"
              className="hidden xl:inline-flex cursor-pointer items-center gap-[8px] text-[#232323] font-montserrat font-medium text-[14px] hover:opacity-80 transition-opacity"
            >
              <span className="w-[26px] h-[26px] rounded-full bg-[#E8E6DF] text-[#232323] flex items-center justify-center">
                <PlusIcon width={14} height={14} strokeWidth={2.5} />
              </span>
              Add Moment
            </Link>
          )}
        </div>

      {/* Two-column layout on lg+; single column below */}
      <div className="flex flex-col xl:flex-row gap-[24px] items-start">
        {/* LEFT: countdown + filter pill + list */}
        <div className="w-full xl:flex-1 xl:max-w-[560px] flex flex-col gap-[20px]">
          <div ref={carouselRef}>
            <CountdownCarouselAdapter
              items={countdown}
              onSelect={(m) => handleRowClick(m)}
            />
          </div>

          <div className="flex items-center justify-between gap-[12px]">
            <FilterPill filter={filter} onChange={setFilter} />
            <ViewToggle
              className="xl:hidden"
              value={mobileView}
              onChange={setMobileView}
            />
          </div>

          {mobileView === "calendar" ? (
            <div className="xl:hidden flex flex-col gap-[16px]">
              <MomentsCalendar
                moments={allMoments}
                selectedDay={selectedDay}
                onSelectDay={(iso) => setSelectedDay(iso)}
              />
              {momentsOnSelectedDay.length > 0 ? (
                <div className="flex flex-col gap-[10px]">
                  {momentsOnSelectedDay.map((m) => (
                    <MomentRow
                      key={m._id}
                      moment={m}
                      onClick={() => router.push(`/moments/${m._id}`)}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[16px] bg-[#E8E6DF] py-[36px] flex items-center justify-center">
                  <p className="font-montserrat text-[#232323] text-[14px]">
                    No moments today
                  </p>
                </div>
              )}
            </div>
          ) : isLoading ? (
            <div className="flex flex-col gap-[12px]">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-[119px] lg:h-[86px] rounded-[20px] lg:rounded-[16px] bg-black/[0.04] animate-pulse"
                />
              ))}
            </div>
          ) : list && list.length > 0 ? (
            <div className="flex flex-col gap-[12px]">
              {list.map((m, i) => (
                <MomentRow
                  key={m._id || m.id || `row:${i}`}
                  moment={m}
                  selected={selectedId === m._id}
                  onClick={() => handleRowClick(m)}
                />
              ))}
            </div>
          ) : (
            <EmptyState filter={filter} />
          )}
        </div>

        {/* RIGHT: swaps between calendar (default) and moment detail. */}
        <aside
          className={`hidden xl:flex w-full xl:w-[360px] shrink-0 flex-col ${
            rightMode !== "calendar" && selectedMoment ? "xl:-mt-[36px]" : ""
          }`}
        >
          {rightMode === "detail" && selectedMoment ? (
            <MomentDetailCard
              moment={selectedMoment}
              onRequestDelete={(m) => setDeleteTarget(m)}
              onClose={() => {
                setSelectedId(null);
                setRightMode("calendar");
              }}
            />
          ) : (
            <div className="flex flex-col gap-[16px]">
              <MomentsCalendar
                moments={allMoments}
                selectedDay={selectedDay}
                onSelectDay={(iso) => {
                  setSelectedDay(iso);
                  setSelectedId(null);
                  setRightMode("calendar");
                }}
              />
              {momentsOnSelectedDay.length > 0 ? (
                <div className="flex flex-col gap-[10px]">
                  {momentsOnSelectedDay.map((m) => (
                    <MomentRow
                      key={m._id}
                      moment={m}
                      onClick={() => {
                        setSelectedId(m._id);
                        setRightMode("detail");
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[16px] bg-[#E8E6DF] py-[36px] flex items-center justify-center">
                  <p className="font-montserrat text-[#232323] text-[14px]">
                    No moments today
                  </p>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

        <DeleteMomentModal
          moment={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null);
            setSelectedId(null);
            setRightMode("calendar");
          }}
        />
      </div>
    </div>
  );
}

function HelpCircleIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9.25" stroke="#2c2c2c" strokeWidth={1.5} />
      <path
        d="M9.5 9.25a2.5 2.5 0 015 0c0 1.25-1 1.75-2 2.5-.75.5-.75 1.5-.75 1.5"
        stroke="#2c2c2c"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <circle cx="12" cy="17" r="0.85" fill="#2c2c2c" />
    </svg>
  );
}

// Small wrapper so we can attach a data attribute the outer chevrons can
// target without CountdownCarousel needing a forwardRef.
function CountdownCarouselAdapter({
  items,
  onSelect,
}: {
  items: Moment[] | null;
  onSelect?: (m: Moment) => void;
}) {
  return (
    <div data-countdown-scroller-wrap>
      <CountdownCarousel items={items} onSelect={onSelect} />
    </div>
  );
}

function FilterPill({
  filter,
  onChange,
}: {
  filter: MomentFilter;
  onChange: (f: MomentFilter) => void;
}) {
  const opts: { value: MomentFilter; label: string }[] = [
    { value: "upcoming", label: "Upcoming" },
    { value: "past", label: "Past" },
  ];
  return (
    <div className="inline-flex gap-[8px] self-start">
      {opts.map((o) => {
        const active = filter === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`cursor-pointer px-[20px] py-[8px] rounded-full font-montserrat font-medium text-[13px] transition-colors ${
              active
                ? "bg-primary-orange text-white"
                : "bg-[#E8E6DF] text-[#232323] hover:bg-[#dcd8ca]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ViewToggle({
  className,
  value,
  onChange,
}: {
  className?: string;
  value: "list" | "calendar";
  onChange: (v: "list" | "calendar") => void;
}) {
  const btn = (active: boolean) =>
    `cursor-pointer w-[36px] h-[30px] rounded-full flex items-center justify-center transition-colors ${
      active ? "bg-[#2c2c2c] text-white" : "text-[#2c2c2c]/60 hover:text-[#2c2c2c]"
    }`;
  return (
    <div
      className={`${className ?? ""} inline-flex bg-[#E8E6DF] rounded-full p-[3px] gap-[2px]`}
    >
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-label="List view"
        aria-pressed={value === "list"}
        className={btn(value === "list")}
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <circle cx="4" cy="6" r="1" fill="currentColor" />
          <circle cx="4" cy="12" r="1" fill="currentColor" />
          <circle cx="4" cy="18" r="1" fill="currentColor" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => onChange("calendar")}
        aria-label="Calendar view"
        aria-pressed={value === "calendar"}
        className={btn(value === "calendar")}
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="16" y1="2" x2="16" y2="6" />
        </svg>
      </button>
    </div>
  );
}

function EmptyState({ filter }: { filter: MomentFilter }) {
  const copy =
    filter === "upcoming"
      ? "No upcoming moments yet. Tap + Add Moment to get started."
      : "No past moments yet.";
  return (
    <div className="rounded-[16px] border border-dashed border-black/[0.15] px-[16px] py-[32px] text-center">
      <p className="font-montserrat text-primary-blue/60 text-[14px]">{copy}</p>
    </div>
  );
}
