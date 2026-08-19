"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ApiError } from "../../../../../../lib/api/client";
import { markNotificationSeen } from "../../../../../../lib/notifications/api";
import { fetchMomentById } from "../../../../../../lib/moments/api";
import {
  formatCalendarDay,
  ordinalSuffix,
  parseCalendarDay,
} from "../../../../../../lib/moments/date";
import {
  respondToInviteAction,
  useMomentsState,
} from "../../../../../../lib/moments/cache";
import type { Moment } from "../../../../../../types/moment";
import { ChevronLeftIcon, PersonIcon } from "../../../icons";
import { fallbackGradient, momentTypeIcon } from "../../momentTypeIcon";

function splitDate(iso: string): { day: string; month: string } {
  const parts = parseCalendarDay(iso);
  if (!parts) return { day: "--", month: "" };
  const day = String(parts.d).padStart(2, "0");
  const month = formatCalendarDay(iso, { month: "short" });
  return { day, month };
}

function formatFullDate(iso: string): string {
  const parts = parseCalendarDay(iso);
  if (!parts) return "";
  const month = formatCalendarDay(iso, { month: "long" });
  return `${month} ${parts.d}${ordinalSuffix(parts.d)}, ${parts.y}`;
}

export default function InvitationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const search = useSearchParams();
  const notifId = search.get("from") ?? null;
  const senderName = search.get("sender") ?? null;

  const { byFilter, countdown } = useMomentsState();
  const [busy, setBusy] = useState(false);
  const [seeded, setSeeded] = useState<Moment | null>(null);
  const [notFound, setNotFound] = useState(false);

  // If we already have this moment in our upcoming/past/all cache, we've
  // already accepted this invite. Bounce straight to the detail page.
  const alreadyAccepted = useMemo<boolean>(() => {
    const pools = [byFilter.upcoming, byFilter.past, byFilter.all];
    for (const src of pools) {
      if (!src) continue;
      for (const m of src) if (m._id === id) return true;
    }
    return false;
  }, [byFilter, id]);

  useEffect(() => {
    if (alreadyAccepted) router.replace(`/moments/${id}`);
  }, [alreadyAccepted, id, router]);

  const countdownMoment = useMemo<Moment | null>(() => {
    if (!countdown) return null;
    return countdown.find((m) => m._id === id) ?? null;
  }, [countdown, id]);

  const moment = seeded ?? countdownMoment;

  // Seed synchronously from the notification-stashed payload, then fetch as
  // fallback for direct URL hits (invitee can't GET the moment until accept,
  // so a 404 or 403 both mean "no longer available to you").
  useEffect(() => {
    if (alreadyAccepted || seeded || notFound) return;
    if (typeof window !== "undefined") {
      try {
        const raw = window.sessionStorage.getItem(`momentInvite:${id}`);
        if (raw) {
          const parsed = JSON.parse(raw) as {
            moment?: Record<string, unknown> | null;
          };
          const m = parsed?.moment;
          if (m && typeof m === "object") {
            const asMoment = { ...m, _id: id } as unknown as Moment;
            setSeeded(asMoment);
            return;
          }
        }
      } catch {
        /* ignore malformed stash */
      }
    }
    let cancelled = false;
    fetchMomentById(id)
      .then((m) => {
        if (!cancelled) setSeeded(m);
      })
      .catch((e) => {
        if (cancelled) return;
        const err = e instanceof ApiError ? e : null;
        if (err && (err.status === 404 || err.status === 403)) {
          setNotFound(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, alreadyAccepted, seeded, notFound]);

  const finish = async (response: "accepted" | "declined") => {
    if (busy) return;
    setBusy(true);
    try {
      await respondToInviteAction(id, response);
      if (notifId) {
        // Fire and forget — don't block navigation on notif mark-seen.
        void markNotificationSeen(notifId).catch(() => {});
      }
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(`momentInvite:${id}`);
      }
      toast.success(
        response === "accepted" ? "Added to your calendar" : "Invite declined"
      );
      router.push("/moments");
    } catch (e) {
      const err = e instanceof ApiError ? e : null;
      const code =
        err && typeof err.data === "object" && err.data && "code" in err.data
          ? (err.data as { code?: string }).code
          : null;
      if (code === "NOT_FOUND") {
        toast.error("Something went wrong. Try again.");
        router.replace("/moments");
        return;
      }
      toast.error(err?.message || "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (notFound) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-[16px] bg-white px-[24px] lg:relative lg:min-h-[60vh] lg:bg-transparent">
        <p className="font-montserrat font-medium text-primary-blue text-[16px] text-center">
          This invite is no longer available.
        </p>
        <button
          type="button"
          onClick={() => router.replace("/moments")}
          className="cursor-pointer h-[42px] px-[22px] rounded-full bg-primary-orange text-white font-montserrat font-medium text-[14px]"
        >
          Back to Moments
        </button>
      </div>
    );
  }

  if (!moment) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white lg:relative lg:min-h-[60vh] lg:bg-transparent">
        <span
          aria-label="Loading"
          role="status"
          className="w-[36px] h-[36px] rounded-full border-[3px] border-primary-orange/25 border-t-primary-orange animate-spin"
        />
      </div>
    );
  }

  const heading = `${senderName || "Someone"} wants you to remember this moment.`;
  const { day, month } = splitDate(moment.nextOccurrence || moment.date);
  const cover = moment.coverImageUrl;
  const participantCount = moment.participants?.length ?? 0;

  const buttons = (
    <div className="w-full max-w-[380px] flex flex-col gap-[12px]">
      <button
        type="button"
        onClick={() => finish("accepted")}
        disabled={busy}
        className={`w-full h-[46px] rounded-full font-montserrat font-medium text-white text-[16px] ${
          busy
            ? "bg-primary-orange/60 cursor-not-allowed"
            : "bg-primary-orange cursor-pointer hover:brightness-[1.03]"
        }`}
      >
        Add to my calendar
      </button>
      <button
        type="button"
        onClick={() => finish("declined")}
        disabled={busy}
        className="cursor-pointer w-full h-[46px] rounded-full border border-primary-blue text-primary-blue font-montserrat font-medium text-[16px] hover:bg-primary-blue/[0.03]"
      >
        Not now
      </button>
    </div>
  );

  const compactCard = (
    <div
      className="w-full max-w-[380px] h-[100px] flex items-stretch gap-[16px] bg-white rounded-[20px] pl-[20px] pr-[6px] py-[6px]"
      style={{ filter: "drop-shadow(0 0 12.5px rgba(0,0,0,0.2))" }}
    >
      <div className="shrink-0 flex flex-col items-start justify-center text-primary-blue">
        <div className="font-montserrat font-medium text-[32px] leading-[36px]">
          {day}
        </div>
        <div className="mt-[-2px] font-montserrat font-medium text-[16px] leading-[20px]">
          {month}
        </div>
      </div>
      <div className="shrink-0 self-center w-px h-[54px] bg-[#C9C9C9]" />
      <div className="flex-1 min-w-0 flex flex-col justify-center items-start gap-[8px]">
        <div className="w-[24px] h-[24px] shrink-0 rounded-full bg-[color:var(--color-surface-muted)] text-primary-blue flex items-center justify-center">
          {momentTypeIcon(moment.type, 14)}
        </div>
        <span className="font-montserrat font-medium text-primary-blue text-[15px] leading-[18px] truncate max-w-full">
          {moment.title}
        </span>
      </div>
      <div
        className="w-[64px] shrink-0 self-stretch rounded-r-[16px] overflow-hidden bg-[#D9D9D9]"
        style={!cover ? { backgroundImage: fallbackGradient(moment.type) } : undefined}
      >
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="w-full h-full object-cover" />
        )}
      </div>
    </div>
  );

  const wideCard = (
    <div className="w-[360px] rounded-[20px] overflow-hidden bg-white shadow-[0_2px_18px_rgba(0,0,0,0.10)]">
      <div
        className="relative w-full aspect-square"
        style={!cover ? { backgroundImage: fallbackGradient(moment.type) } : undefined}
      >
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        {participantCount > 0 && (
          <span className="absolute top-[12px] right-[12px] inline-flex items-center gap-[5.7px] bg-white/85 rounded-full px-[10px] py-[5px] font-montserrat font-medium text-primary-blue text-[11.4px]">
            <PersonIcon width={11.4} height={11.4} />
            {participantCount}
          </span>
        )}
      </div>
      <div className="p-[20px] flex flex-col items-center gap-[6px]">
        <div className="w-[32px] h-[32px] rounded-full bg-[color:var(--color-surface-muted)] text-primary-blue flex items-center justify-center">
          {momentTypeIcon(moment.type, 18)}
        </div>
        <h3 className="font-montserrat font-medium text-primary-blue text-[18px]">
          {moment.title}
        </h3>
        <p className="font-montserrat text-primary-blue/70 text-[14px]">
          {formatFullDate(moment.nextOccurrence || moment.date)}
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile / tablet: full-screen */}
      <div className="lg:hidden fixed inset-0 z-40 bg-white flex flex-col">
        <div className="flex items-center px-[16px] pt-[max(env(safe-area-inset-top),16px)] pb-[8px]">
          <button
            type="button"
            onClick={() => router.replace("/moments")}
            aria-label="Close"
            className="cursor-pointer w-[36px] h-[36px] rounded-full bg-[#EDEDED] text-[#092E4A] flex items-center justify-center"
          >
            <ChevronLeftIcon width={16} height={16} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-[24px] pt-[36px] pb-[140px] flex flex-col items-center gap-[40px]">
          <div className="text-center max-w-[320px] flex flex-col gap-[10px]">
            <h1 className="font-montserrat font-medium text-primary-blue text-[20px] leading-[26px]">
              {heading}
            </h1>
            <p className="font-montserrat text-primary-blue text-[14px] leading-[20px]">
              So when the moment comes, you won&apos;t miss it.
            </p>
          </div>
          {compactCard}
        </div>
        <div className="fixed left-0 right-0 bottom-0 z-30 bg-white px-[24px] pt-[12px] pb-[max(env(safe-area-inset-bottom),20px)] flex justify-center">
          {buttons}
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden lg:block pr-[64px]">
        <div className="mb-[16px]">
          <h2 className="font-montserrat font-semibold text-primary-blue text-[24px]">
            Shared Moment
          </h2>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-[64px] items-center">
          <div className="flex flex-col items-start gap-[36px]">
            <div className="text-center w-full flex flex-col items-center gap-[12px] max-w-[520px]">
              <h1 className="font-montserrat font-medium text-primary-blue text-[22px] leading-[30px]">
                {heading}
              </h1>
              <p className="font-montserrat text-primary-blue/80 text-[14px]">
                So when the moment comes, you won&apos;t miss it.
              </p>
            </div>
            <div className="w-full flex justify-center">{buttons}</div>
          </div>
          <div>{wideCard}</div>
        </div>
      </div>
    </>
  );
}
