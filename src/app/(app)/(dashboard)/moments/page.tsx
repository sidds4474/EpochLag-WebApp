"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { hydrate, useMomentsState } from "../../../../lib/moments/cache";
import type { Moment, MomentFilter } from "../../../../types/moment";
import { PlusIcon } from "../icons";
import CountdownCarousel from "./CountdownCarousel";
import MomentRow from "./MomentRow";
import MomentsCalendar from "./MomentsCalendar";
import MomentDetailCard from "./MomentDetailCard";
import PeopleTaggedPanel from "./PeopleTaggedPanel";
import DeleteMomentModal from "./DeleteMomentModal";
import { isoDay } from "../../../../lib/moments/recurrence";
import { momentTypeIcon } from "./momentTypeIcon";

export default function MomentsPage() {
  const {
    byFilter,
    loadingByFilter,
    countdown,
  } = useMomentsState();
  const [filter, setFilter] = useState<MomentFilter>("upcoming");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rightMode, setRightMode] = useState<"calendar" | "detail" | "people">(
    "calendar"
  );
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
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    seededSelectionRef.current = true;
    setSelectedId(sel);
    setRightMode("detail");
  }, [searchParams]);

  const isDesktop = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(min-width: 1024px)").matches;

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
    const mq = window.matchMedia("(min-width: 1024px)");
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

  const stepCarousel = (dir: -1 | 1) => {
    // Fires a scroll on the carousel's internal scroller. CountdownCarousel
    // wraps its own scroller; we look it up by data attribute.
    const scroller = carouselRef.current?.querySelector<HTMLElement>(
      "[data-countdown-scroller]"
    );
    if (!scroller) return;
    const w = scroller.clientWidth;
    scroller.scrollBy({ left: dir * w, behavior: "smooth" });
  };

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
      const iso = isoDay(new Date(m.nextOccurrence || m.date));
      return iso === selectedDay;
    });
  }, [allMoments, selectedDay]);

  return (
    <div className="px-[12px] md:px-[20px] lg:px-[24px] pt-[4px] pb-[24px] md:pb-[40px]">
      {/* Header row: title on left with right-aligned carousel chevrons
          spanning the countdown's width, then Add Moment on the far right. */}
      <div className="md:px-[14px] flex items-start gap-[24px] mb-[16px]">
        <div className="w-full lg:flex-1 lg:max-w-[560px] flex items-center justify-between">
          <h1 className="font-montserrat font-bold text-primary-blue text-[26px] md:text-[28px] leading-[1.1]">
            Moments
          </h1>
          <div className="hidden lg:flex items-center gap-[6px]">
            <button
              type="button"
              onClick={() => stepCarousel(-1)}
              aria-label="Previous"
              className="cursor-pointer hover:brightness-95 transition"
            >
              <CarouselArrow direction="left" />
            </button>
            <button
              type="button"
              onClick={() => stepCarousel(1)}
              aria-label="Next"
              className="cursor-pointer hover:brightness-95 transition"
            >
              <CarouselArrow direction="right" />
            </button>
          </div>
        </div>

        <Link
          href="/moments/new"
          aria-label="Add Moment"
          className="lg:hidden cursor-pointer w-[42px] h-[42px] rounded-full bg-primary-orange text-white flex items-center justify-center shrink-0 hover:brightness-[1.03] transition"
        >
          <PlusIcon width={18} height={18} strokeWidth={2.5} />
        </Link>

        <div className="hidden lg:flex lg:w-[380px] shrink-0 justify-end">
          {!(rightMode !== "calendar" && selectedMoment) && (
            <Link
              href="/moments/new"
              className="cursor-pointer inline-flex items-center gap-[8px] bg-primary-orange text-white rounded-full pl-[14px] pr-[18px] py-[10px] font-montserrat font-semibold text-[14px] hover:brightness-[1.03] transition"
            >
              <PlusIcon width={16} height={16} strokeWidth={2.5} />
              Add Moment
            </Link>
          )}
        </div>
      </div>

      {/* Two-column layout on lg+; single column below */}
      <div className="md:px-[14px] flex flex-col lg:flex-row gap-[24px] items-start">
        {/* LEFT: countdown + filter pill + list */}
        <div className="w-full lg:flex-1 lg:max-w-[560px] flex flex-col gap-[20px]">
          <div ref={carouselRef}>
            <CountdownCarouselAdapter
              items={countdown}
              onSelect={(m) => handleRowClick(m)}
            />
          </div>

          <div className="flex items-center justify-between gap-[12px]">
            <FilterPill filter={filter} onChange={setFilter} />
            <ViewToggle
              className="lg:hidden"
              value={mobileView}
              onChange={setMobileView}
            />
          </div>

          {mobileView === "calendar" ? (
            <div className="lg:hidden rounded-[24px] bg-[#EDEDED] p-[16px] flex flex-col gap-[16px]">
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
                <div className="rounded-[16px] bg-[#D9D9D9] py-[44px] flex items-center justify-center">
                  <p className="font-montserrat text-primary-blue text-[14px]">
                    No moment today
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
              {list.map((m) => (
                <MomentRow
                  key={m._id}
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

        {/* RIGHT: swaps between calendar (default), moment detail, and
            people-tagged panel. */}
        <aside
          className={`hidden lg:flex w-full lg:w-[380px] shrink-0 flex-col ${
            rightMode !== "calendar" && selectedMoment ? "lg:-mt-[36px]" : ""
          }`}
        >
          {rightMode === "detail" && selectedMoment ? (
            <MomentDetailCard
              moment={selectedMoment}
              onRequestDelete={(m) => setDeleteTarget(m)}
              onOpenPeopleTagged={() => setRightMode("people")}
              onClose={() => {
                setSelectedId(null);
                setRightMode("calendar");
              }}
            />
          ) : rightMode === "people" && selectedMoment ? (
            <PeopleTaggedPanel
              moment={selectedMoment}
              onDone={() => setRightMode("detail")}
            />
          ) : (
            <div className="rounded-[24px] bg-[#EDEDED] p-[16px] flex flex-col gap-[16px]">
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
                <div className="rounded-[16px] bg-[#D9D9D9] py-[44px] flex items-center justify-center">
                  <p className="font-montserrat text-primary-blue text-[14px]">
                    No moment today
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
    <div className="inline-flex bg-[#EDEDED] rounded-full p-[4px] self-start">
      {opts.map((o) => {
        const active = filter === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`cursor-pointer px-[18px] py-[8px] rounded-full font-montserrat font-semibold text-[13px] transition-colors ${
              active
                ? "bg-[#092E4A] text-white"
                : "text-primary-blue/70 hover:text-primary-blue"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// Custom arrow chevron matching Figma: #EDEDED circle, #092E4A stroke.
function CarouselArrow({ direction }: { direction: "left" | "right" }) {
  const size = 28;
  if (direction === "right") {
    return (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="18" fill="#EDEDED" />
        <path d="M19.0291 11L26.2722 18.2432L19.0291 25.4863" stroke="#092E4A" strokeWidth={2} />
        <path d="M9 18.2422H25.1578" stroke="#092E4A" strokeWidth={2} />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="18" r="18" fill="#EDEDED" />
      <path d="M16.9709 11L9.72778 18.2432L16.9709 25.4863" stroke="#092E4A" strokeWidth={2} />
      <path d="M27 18.2422H10.8422" stroke="#092E4A" strokeWidth={2} />
    </svg>
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
      active ? "bg-[#092E4A] text-white" : "text-primary-blue/70 hover:text-primary-blue"
    }`;
  return (
    <div
      className={`${className ?? ""} inline-flex bg-[#EDEDED] rounded-full p-[3px] gap-[2px]`}
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
