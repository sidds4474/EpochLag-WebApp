"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ApiError } from "../../../../../../lib/api/client";
import { markNotificationSeen } from "../../../../../../lib/notifications/api";
import { fetchMomentById } from "../../../../../../lib/moments/api";
import {
  respondToInviteAction,
  useMomentsState,
} from "../../../../../../lib/moments/cache";
import type { Moment } from "../../../../../../types/moment";
import MomentRow from "../../MomentRow";

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
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-[16px] bg-[#F3F1EB] px-[24px] lg:relative lg:min-h-[60vh] lg:bg-transparent">
        <p className="font-montserrat text-[#232323] text-[16px] text-center">
          This invite is no longer available.
        </p>
        <button
          type="button"
          onClick={() => router.replace("/moments")}
          className="cursor-pointer h-[42px] px-[22px] rounded-full bg-primary-orange text-white font-montserrat font-semibold text-[14px]"
        >
          Back to Moments
        </button>
      </div>
    );
  }

  if (!moment) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#F3F1EB] lg:relative lg:min-h-[60vh] lg:bg-transparent">
        <span
          aria-label="Loading"
          role="status"
          className="w-[36px] h-[36px] rounded-full border-[3px] border-primary-orange/25 border-t-primary-orange animate-spin"
        />
      </div>
    );
  }

  const heading = `${senderName || "Someone"} wants you to remember this moment.`;

  const buttons = (
    <div className="w-full max-w-[420px] flex flex-col gap-[10px]">
      <button
        type="button"
        onClick={() => finish("accepted")}
        disabled={busy}
        className={`w-full h-[46px] rounded-full font-montserrat font-semibold text-white text-[15px] ${
          busy
            ? "bg-primary-orange/60 cursor-not-allowed"
            : "bg-primary-orange cursor-pointer hover:opacity-90"
        }`}
      >
        Add to my calendar
      </button>
      <button
        type="button"
        onClick={() => finish("declined")}
        disabled={busy}
        className="cursor-pointer w-full h-[46px] rounded-full border-[1.5px] border-[#2c2c2c] text-[#232323] font-montserrat font-medium text-[15px] hover:bg-black/[0.03]"
      >
        Not now
      </button>
    </div>
  );

  const content = (
    <div className="w-full max-w-[520px] mx-auto flex flex-col items-center gap-[32px]">
      <div className="text-center flex flex-col gap-[8px] max-w-[440px]">
        <h1 className="font-ivy font-normal text-[#232323] text-[24px] md:text-[30px] leading-[1.2]">
          {heading}
        </h1>
        <p className="font-montserrat text-[#2c2c2c]/70 text-[14px] leading-[1.4]">
          So when the moment comes, you won&apos;t miss it.
        </p>
      </div>

      <div className="w-full max-w-[420px]">
        <MomentRow moment={moment} />
      </div>

      <div className="w-full flex justify-center pt-[16px]">{buttons}</div>
    </div>
  );

  return (
    <>
      {/* Mobile / tablet: full-screen */}
      <div className="lg:hidden fixed inset-0 z-40 bg-[#F3F1EB] flex flex-col overflow-y-auto">
        <div className="flex-1 min-h-0 px-[20px] pt-[max(env(safe-area-inset-top),48px)] pb-[32px] flex flex-col items-center justify-center">
          {content}
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden lg:flex min-h-full bg-[#F3F1EB] px-[32px] py-[48px] items-start justify-center">
        {content}
      </div>
    </>
  );
}
