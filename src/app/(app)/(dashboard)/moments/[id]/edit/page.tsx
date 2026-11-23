"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { ApiError } from "../../../../../../lib/api/client";
import { fetchHomePeople } from "../../../../../../lib/home/api";
import {
  inviteToMoment,
  patchMomentJson,
  patchMomentMultipart,
  pinCountdown,
  unpinCountdown,
} from "../../../../../../lib/moments/api";
import {
  hydrate,
  isPinned,
  refreshCountdown,
  removeParticipantAction,
  updateMomentLocal,
  useMomentsState,
} from "../../../../../../lib/moments/cache";
import type {
  FriendSearchResult,
  Moment,
  MomentParticipant,
} from "../../../../../../types/moment";
import { isoDayFromCalendar } from "../../../../../../lib/moments/date";
import { ChevronDownIcon, ChevronLeftIcon, ImageIcon } from "../../../icons";
import ChooseCoverModal from "../../../new-story/ChooseCoverModal";
import WizardCalendar from "../../new/WizardCalendar";
import { CheckboxRow, PersonAvatar } from "../../formShared";
import { fallbackGradient } from "../../momentTypeIcon";

type Freq = "yearly" | "monthly" | "weekly" | "daily";
const FREQ_OPTIONS: Array<{ value: Freq; label: string }> = [
  { value: "yearly", label: "Yearly" },
  { value: "monthly", label: "Monthly" },
  { value: "weekly", label: "Weekly" },
  { value: "daily", label: "Daily" },
];

type FormState = {
  title: string;
  dateISO: string | null;
  coverImageUrl: string | null;
  coverLocalUri: string | null;
  coverFile: Blob | null;
  isRecurring: boolean;
  recurrenceFrequency: Freq;
  addToCountdown: boolean;
  newTaggedUserIds: string[];
  sendInvite: boolean;
};

function seedForm(moment: Moment, pinnedNow: boolean): FormState {
  return {
    title: moment.title || "",
    dateISO: moment.date ? isoDayFromCalendar(moment.date) || null : null,
    coverImageUrl: moment.coverImageUrl || null,
    coverLocalUri: null,
    coverFile: null,
    isRecurring: !!moment.isRecurring,
    recurrenceFrequency: (moment.frequency as Freq) || "yearly",
    addToCountdown: pinnedNow,
    newTaggedUserIds: [],
    sendInvite: true,
  };
}

export default function EditMomentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { byFilter, countdown } = useMomentsState();

  const [hydrating, setHydrating] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [friends, setFriends] = useState<FriendSearchResult[]>([]);
  const [friendsLoaded, setFriendsLoaded] = useState(false);
  const [friendQuery, setFriendQuery] = useState("");
  const [participants, setParticipants] = useState<MomentParticipant[]>([]);

  const moment = useMemo<Moment | null>(() => {
    const pools = [byFilter.upcoming, byFilter.past, byFilter.all, countdown];
    for (const src of pools) {
      if (!src) continue;
      for (const m of src) if (m._id === id) return m;
    }
    return null;
  }, [byFilter, countdown, id]);

  // Guard + seed
  useEffect(() => {
    if (moment) return;
    if (hydrating) return;
    setHydrating(true);
    hydrate(true).finally(() => setHydrating(false));
  }, [moment, hydrating]);

  // Seed the form once we have a moment.
  const seededRef = useRef(false);
  useEffect(() => {
    if (!moment || seededRef.current) return;
    if (moment.role !== "author") {
      toast.error("Only the author can edit this Moment");
      router.replace(`/moments?selected=${id}`);
      return;
    }
    seededRef.current = true;
    setForm(seedForm(moment, isPinned(id)));
    setParticipants(moment.participants ?? []);
  }, [moment, id, router]);

  // Load friends list for the invite picker
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const people = await fetchHomePeople();
        if (cancelled) return;
        setFriends(
          (people.users ?? []).map((u) => ({
            _id: u._id,
            firstName: u.firstName ?? "",
            lastName: u.lastName ?? "",
            epochlagID: u.epochlagID,
            profilePicture: u.profilePicture ?? null,
          }))
        );
      } catch {
        if (!cancelled) setFriends([]);
      } finally {
        if (!cancelled) setFriendsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!moment || !form) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#F3F1EB] lg:relative lg:min-h-[60vh] lg:bg-transparent">
        <p className="font-montserrat text-primary-blue/60 text-[14px]">
          Loading…
        </p>
      </div>
    );
  }

  const patch = (p: Partial<FormState>) => setForm((f) => (f ? { ...f, ...p } : f));

  const activeCoverUrl = form.coverLocalUri ?? form.coverImageUrl;

  // Filter friends by name and exclude already-participants + already-selected new invitees
  const existingParticipantIds = new Set(
    participants
      .map((p) => {
        const u = p.userId as unknown;
        return typeof u === "string" ? u : (u as { _id?: string } | null)?._id;
      })
      .filter(Boolean) as string[]
  );
  const normalizedQuery = friendQuery.trim().replace(/^@/, "").toLowerCase();
  const hasQuery = normalizedQuery.length > 0;
  const friendResults = hasQuery
    ? friends.filter(
        (f) =>
          !existingParticipantIds.has(f._id) &&
          !form.newTaggedUserIds.includes(f._id) &&
          `${f.firstName ?? ""} ${f.lastName ?? ""}`
            .toLowerCase()
            .includes(normalizedQuery)
      )
    : [];

  const newTaggedFriends = friends.filter((f) =>
    form.newTaggedUserIds.includes(f._id)
  );

  const addNewTag = (u: FriendSearchResult) => {
    if (form.newTaggedUserIds.includes(u._id)) return;
    patch({ newTaggedUserIds: [...form.newTaggedUserIds, u._id] });
    setFriendQuery("");
  };

  const removeNewTag = (uid: string) => {
    patch({
      newTaggedUserIds: form.newTaggedUserIds.filter((x) => x !== uid),
    });
  };

  const removeExistingParticipant = async (uid: string) => {
    const before = participants;
    setParticipants((prev) => prev.filter((p) => p.userId?._id !== uid));
    try {
      await removeParticipantAction(id, uid, moment);
    } catch (e) {
      setParticipants(before);
      const msg = e instanceof ApiError ? e.message : "Couldn't remove participant";
      toast.error(msg);
    }
  };

  const canSave =
    form.title.trim().length > 0 && !!form.dateISO && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      // Diff
      const changes: {
        title?: string;
        date?: string;
        isRecurring?: boolean;
        frequency?: Freq;
        coverImageUrl?: string;
      } = {};
      const trimmedTitle = form.title.trim();
      if (trimmedTitle && trimmedTitle !== (moment.title || "")) {
        changes.title = trimmedTitle;
      }
      if (
        form.dateISO &&
        form.dateISO !== (moment.date ? isoDayFromCalendar(moment.date) : null)
      ) {
        changes.date = form.dateISO;
      }
      if (form.isRecurring !== !!moment.isRecurring) {
        changes.isRecurring = form.isRecurring;
      }
      if (form.isRecurring) {
        const currentFreq = (moment.frequency as Freq) || "yearly";
        if (form.recurrenceFrequency !== currentFreq) {
          changes.frequency = form.recurrenceFrequency;
        }
      }
      const nextCoverUrl =
        !form.coverLocalUri && form.coverImageUrl && form.coverImageUrl !== (moment.coverImageUrl || null)
          ? form.coverImageUrl
          : null;
      if (nextCoverUrl) changes.coverImageUrl = nextCoverUrl;

      const hasCoverUpload = !!form.coverFile;
      const hasFieldChanges = Object.keys(changes).length > 0 || hasCoverUpload;
      const newInvitees = form.newTaggedUserIds.filter(
        (uid) => !existingParticipantIds.has(uid)
      );
      const pinnedNow = isPinned(id);
      const pinChanged = form.addToCountdown !== pinnedNow;

      // Silent no-op
      if (!hasFieldChanges && newInvitees.length === 0 && !pinChanged) {
        router.replace(`/moments?selected=${id}`);
        return;
      }

      // PATCH
      let updated: Moment | null = null;
      if (hasFieldChanges) {
        if (hasCoverUpload && form.coverFile) {
          const fd = new FormData();
          if (changes.title !== undefined) fd.append("title", changes.title);
          if (changes.date !== undefined) fd.append("date", changes.date);
          if (changes.isRecurring !== undefined)
            fd.append("isRecurring", String(changes.isRecurring));
          if (changes.frequency !== undefined)
            fd.append("frequency", changes.frequency);
          fd.append("file", form.coverFile, "cover.jpg");
          updated = await patchMomentMultipart(id, fd);
        } else {
          updated = await patchMomentJson(id, changes);
        }
        // Overlay onto cached to preserve computed fields (role, daysUntil).
        updateMomentLocal({ ...moment, ...updated });
      }

      // Invite fan-out
      if (form.sendInvite && newInvitees.length > 0) {
        const results = await Promise.allSettled(
          newInvitees.map((uid) => inviteToMoment(id, uid))
        );
        const successfulIds = results
          .map((r, i) => (r.status === "fulfilled" ? newInvitees[i] : null))
          .filter((x): x is string => !!x);
        if (successfulIds.length > 0) {
          const additions = successfulIds
            .map((uid) => friends.find((f) => f._id === uid))
            .filter((f): f is FriendSearchResult => !!f)
            .map<MomentParticipant>((f) => ({
              userId: {
                _id: f._id,
                firstName: f.firstName,
                lastName: f.lastName,
                epochlagID: f.epochlagID,
                profilePicture: f.profilePicture,
              },
              status: "pending",
              invitedAt: new Date().toISOString(),
              respondedAt: null,
            }));
          const merged = updated ?? moment;
          updateMomentLocal({
            ...merged,
            participants: [...(merged.participants || []), ...additions],
          });
        }
      }

      // Countdown pin toggle
      if (pinChanged) {
        try {
          if (form.addToCountdown) await pinCountdown(id);
          else await unpinCountdown(id);
          await refreshCountdown();
        } catch {
          // silent — user can retry from detail
        }
      }

      router.replace(`/moments?selected=${id}`);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Couldn't update Moment";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const titleInput = (
    <div className="relative">
      <input
        type="text"
        value={form.title}
        onChange={(e) => patch({ title: e.target.value })}
        placeholder="Moment Name"
        className="w-full bg-transparent border-b border-[#2c2c2c]/30 pb-[8px] pr-[32px] font-ivy font-normal text-[#232323] text-[22px] md:text-[26px] leading-[1.2] placeholder:text-[#2c2c2c]/40 focus:outline-none focus:border-[#2c2c2c]/60"
      />
      <span className="pointer-events-none absolute right-0 bottom-[12px] text-[#2c2c2c]/60">
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
      </span>
    </div>
  );

  const freqDropdown = (
    <FrequencyDropdown
      value={form.recurrenceFrequency}
      onChange={(v) => patch({ recurrenceFrequency: v })}
    />
  );

  const recurringBlock = (
    <div className="flex flex-col gap-[12px]">
      <div className="flex items-center justify-between gap-[12px]">
        <CheckboxRow
          checked={form.isRecurring}
          onChange={(next) =>
            patch({
              isRecurring: next,
              recurrenceFrequency: next
                ? form.recurrenceFrequency ?? "yearly"
                : form.recurrenceFrequency,
            })
          }
          label="This is a recurring event"
        />
        {form.isRecurring && <div className="shrink-0">{freqDropdown}</div>}
      </div>
      <CheckboxRow
        checked={form.addToCountdown}
        onChange={(next) => patch({ addToCountdown: next })}
        label="Add to countdown"
      />
    </div>
  );

  const peopleBlock = (
    <div>
      <label className="block font-montserrat font-medium text-primary-blue text-[14px] mb-[10px]">
        People
      </label>
      {(participants.length > 0 || newTaggedFriends.length > 0) && (
        <div className="flex flex-wrap gap-[10px] mb-[10px]">
          {participants.map((p, i) => {
            const rawUser = p.userId as unknown;
            const uid =
              typeof rawUser === "string"
                ? rawUser
                : (rawUser as { _id?: string } | null)?._id;
            const userObj =
              typeof rawUser === "object" && rawUser
                ? (rawUser as {
                    firstName?: string;
                    lastName?: string;
                    profilePicture?: string | null;
                  })
                : null;
            const enrich = uid ? friends.find((f) => f._id === uid) : null;
            const firstName = userObj?.firstName || enrich?.firstName || "";
            const lastName = userObj?.lastName || enrich?.lastName || "";
            const profilePicture = userObj?.profilePicture ?? enrich?.profilePicture ?? null;
            const displayName = [firstName, lastName].filter(Boolean).join(" ");
            return (
            <span
              key={uid ?? `p:${i}`}
              className="inline-flex items-center gap-[10px] bg-[color:var(--color-surface-muted)] rounded-full pl-[6px] pr-[14px] py-[6px]"
            >
              <PersonAvatar
                firstName={firstName}
                profilePicture={profilePicture}
                size={28}
              />
              <span className="font-montserrat text-primary-blue text-[13px]">
                {displayName || "Someone"}
              </span>
              <button
                type="button"
                onClick={() => uid && removeExistingParticipant(uid)}
                aria-label="Remove"
                className="cursor-pointer text-primary-blue/60 hover:text-primary-blue"
              >
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </span>
            );
          })}
          {newTaggedFriends.map((u) => (
            <span
              key={u._id}
              className="inline-flex items-center gap-[10px] bg-[color:var(--color-surface-muted)] rounded-full pl-[6px] pr-[14px] py-[6px]"
            >
              <PersonAvatar
                firstName={u.firstName}
                profilePicture={u.profilePicture}
                size={28}
              />
              <span className="font-montserrat text-primary-blue text-[13px]">
                {[u.firstName, u.lastName].filter(Boolean).join(" ")}
              </span>
              <button
                type="button"
                onClick={() => removeNewTag(u._id)}
                aria-label="Remove"
                className="cursor-pointer text-primary-blue/60 hover:text-primary-blue"
              >
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          type="text"
          value={friendQuery}
          onChange={(e) => setFriendQuery(e.target.value)}
          placeholder="@ Add people"
          className="w-full h-[46px] rounded-full bg-[color:var(--color-surface-muted)] px-[20px] font-montserrat text-[14px] text-primary-blue placeholder:text-primary-blue/40 focus:outline-none"
        />
        {hasQuery && (
          <div className="absolute left-0 right-0 top-[54px] bg-white rounded-[16px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] py-[8px] z-10 max-h-[240px] overflow-y-auto">
            {!friendsLoaded && friendResults.length === 0 && (
              <div className="px-[16px] py-[10px] font-montserrat text-primary-blue/50 text-[13px]">
                Loading…
              </div>
            )}
            {friendsLoaded && friendResults.length === 0 && (
              <div className="px-[16px] py-[10px] font-montserrat text-primary-blue/50 text-[13px]">
                No matches
              </div>
            )}
            {friendResults.map((u) => (
              <button
                key={u._id}
                type="button"
                onClick={() => addNewTag(u)}
                className="cursor-pointer w-full flex items-center gap-[12px] px-[16px] py-[8px] hover:bg-black/[0.03]"
              >
                <PersonAvatar firstName={u.firstName} profilePicture={u.profilePicture} />
                <span className="flex-1 flex flex-col items-start min-w-0">
                  <span className="font-montserrat text-primary-blue text-[14px] truncate max-w-full">
                    {[u.firstName, u.lastName].filter(Boolean).join(" ")}
                  </span>
                  {u.epochlagID && (
                    <span className="font-montserrat text-primary-blue/50 text-[12px] truncate max-w-full">
                      @{u.epochlagID}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mt-[12px]">
        <CheckboxRow
          checked={form.sendInvite}
          onChange={(next) => patch({ sendInvite: next })}
          label="Send a Moment invite to tagged people"
        />
      </div>
    </div>
  );

  const cover = (
    <button
      type="button"
      onClick={() => setPickerOpen(true)}
      className="cursor-pointer relative w-full bg-white p-[10px] pb-[18px] shadow-[0_4px_18px_rgba(0,0,0,0.18)]"
    >
      <div
        className="relative w-full aspect-square overflow-hidden bg-primary-blue/10"
        style={
          !activeCoverUrl
            ? { backgroundImage: fallbackGradient(moment.type) }
            : undefined
        }
      >
        {activeCoverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeCoverUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {!activeCoverUrl && (
          <span className="absolute inset-0 flex items-center justify-center text-white">
            <ImageIcon width={32} height={32} />
          </span>
        )}
      </div>
      <span className="absolute top-[20px] right-[20px] w-[32px] h-[32px] rounded-full bg-white text-[#2c2c2c] flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.15)]">
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
      </span>
    </button>
  );

  return (
    <>
      {/* Mobile / tablet: full-screen */}
      <div className="lg:hidden fixed inset-0 z-40 bg-[#F3F1EB] flex flex-col">
        <div className="flex items-center justify-between px-[16px] pt-[max(env(safe-area-inset-top),16px)] pb-[8px]">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="cursor-pointer w-[36px] h-[36px] rounded-full bg-[#EDEDED] text-[#092E4A] flex items-center justify-center"
          >
            <ChevronLeftIcon width={16} height={16} />
          </button>
          <span className="w-[36px] h-[36px]" aria-hidden />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-[24px] pb-[120px] pt-[8px]">
          <div className="max-w-[520px] mx-auto flex flex-col gap-[20px]">
            {cover}
            {titleInput}
            <WizardCalendar
              value={form.dateISO}
              onChange={(iso) => patch({ dateISO: iso })}
            />
            {recurringBlock}
            {peopleBlock}
          </div>
        </div>
        <div className="fixed left-0 right-0 bottom-0 z-30 bg-[#F3F1EB] px-[24px] pt-[12px] pb-[max(env(safe-area-inset-bottom),20px)]">
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className={`w-full h-[46px] rounded-full font-montserrat font-semibold text-white text-[15px] ${
              canSave
                ? "bg-primary-orange cursor-pointer"
                : "bg-primary-orange/50 cursor-not-allowed"
            }`}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden lg:block min-h-full bg-[#F3F1EB] px-[32px] py-[24px] pb-[80px]">
        <div className="flex items-center gap-[12px] mb-[20px]">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="cursor-pointer w-[28px] h-[28px] text-[#232323] flex items-center justify-center hover:opacity-70 transition-opacity"
          >
            <ChevronLeftIcon width={16} height={16} />
          </button>
          <h2 className="font-ivy font-normal text-[#232323] text-[28px] leading-[1.15]">
            Edit Moment
          </h2>
        </div>

        <div className="grid grid-cols-[1fr_420px] gap-[64px] items-start">
          <div className="flex flex-col gap-[20px]">
            {titleInput}
            <div className="flex flex-col gap-[10px]">
              <span className="font-montserrat font-medium text-[#232323] text-[14px]">
                Moment Date
              </span>
              <div className="bg-white p-[20px] shadow-[0_4px_4px_rgba(0,0,0,0.08)]">
                <WizardCalendar
                  value={form.dateISO}
                  onChange={(iso) => patch({ dateISO: iso })}
                />
              </div>
            </div>
            <div className="mt-[8px]">{recurringBlock}</div>
            {peopleBlock}
          </div>
          <div className="flex flex-col gap-[10px]">
            <span className="font-montserrat font-medium text-[#232323] text-[14px]">
              Cover photo
            </span>
            {cover}
            <div className="mt-[24px] flex justify-end">
              <button
                type="button"
                onClick={save}
                disabled={!canSave}
                className={`h-[42px] px-[28px] rounded-full font-montserrat font-semibold text-white text-[14px] ${
                  canSave
                    ? "bg-primary-orange cursor-pointer hover:opacity-90"
                    : "bg-primary-orange/50 cursor-not-allowed"
                }`}
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ChooseCoverModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedUrl={form.coverImageUrl}
        onPick={(pick) => {
          if (form.coverLocalUri) URL.revokeObjectURL(form.coverLocalUri);
          if (pick.kind === "curated") {
            patch({
              coverImageUrl: pick.imageUrl,
              coverLocalUri: null,
              coverFile: null,
            });
          } else {
            patch({
              coverLocalUri: pick.preview,
              coverFile: pick.file,
              coverImageUrl: null,
            });
          }
        }}
      />
    </>
  );
}

function FrequencyDropdown({
  value,
  onChange,
}: {
  value: Freq;
  onChange: (v: Freq) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const current = FREQ_OPTIONS.find((f) => f.value === value) ?? FREQ_OPTIONS[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="cursor-pointer bg-white rounded-full px-[16px] py-[8px] min-w-[140px] flex items-center justify-between gap-[10px] font-montserrat font-medium text-[#232323] text-[13px] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
      >
        {current.label}
        <ChevronDownIcon width={12} height={12} />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-[44px] bg-white rounded-[12px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] py-[6px] z-10 min-w-[140px]"
        >
          {FREQ_OPTIONS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="option"
              aria-selected={f.value === value}
              onClick={() => {
                onChange(f.value);
                setOpen(false);
              }}
              className={`cursor-pointer w-full text-left px-[14px] py-[8px] font-montserrat text-[13px] transition-colors ${
                f.value === value
                  ? "bg-black/[0.04] text-[#232323] font-semibold"
                  : "text-[#232323]/80 hover:bg-black/[0.04]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

