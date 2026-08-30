"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingShell } from "../../../lib/onboarding/components/OnboardingShell";
import { urlForScreen } from "../../../lib/onboarding";
import { useAppDispatch, useAppSelector } from "../../../lib/onboarding/store";
import {
  addParticipant,
  removeParticipant,
  updateParticipantName,
  hydrateFromServerDraft,
  type Participant,
} from "../../../lib/onboarding/store/slices/createALagSlice";
import { setLastStep } from "../../../lib/onboarding/store/slices/anonDraftSlice";
import {
  apiSaveAnonDraft,
  apiGetAnonDraft,
} from "../../../lib/onboarding/api/anonEndpoints";

const RELATIONSHIPS: Array<{ label: string; slug: string }> = [
  { label: "Mom", slug: "mom" },
  { label: "Dad", slug: "dad" },
  { label: "Sibling", slug: "sibling" },
  { label: "Child", slug: "child" },
  { label: "Partner", slug: "partner" },
  { label: "Friend", slug: "friend" },
  { label: "Grandparent", slug: "grandparent" },
  { label: "Other", slug: "other" },
];

const TITLE = "Who was part of this story?";

export default function AddParticipantsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const participants = useAppSelector((s) => s.createALag.participants);
  const hasDraftToken = useAppSelector((s) => s.anonDraft.hasDraftToken);
  const hydrated = useAppSelector((s) => s.anonDraft.hydrated);
  const hydratedFromServerRef = useRef(false);

  const [name, setName] = useState("");

  const participantsRef = useRef(participants);
  participantsRef.current = participants;
  useEffect(() => {
    if (!hydrated || hydratedFromServerRef.current) return;
    if (!hasDraftToken) return;
    hydratedFromServerRef.current = true;
    apiGetAnonDraft()
      .then((d) => {
        // Skip hydration if the user has already started adding participants —
        // otherwise BE snapshot can wipe in-progress local edits.
        if (participantsRef.current.length > 0) return;
        if (d) dispatch(hydrateFromServerDraft(d));
      })
      .catch(() => {});
  }, [dispatch, hasDraftToken, hydrated]);

  const onPickRelationship = (slug: string) => {
    const seed = name.trim();
    const participant: Participant = {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: seed,
      relationship: slug,
      userId: null,
    };
    dispatch(addParticipant(participant));
    if (seed) setName("");
  };

  const onRemove = (id: string) => dispatch(removeParticipant(id));
  const onRename = (id: string, next: string) => dispatch(updateParticipantName({ id, name: next }));

  const goNext = () => {
    dispatch(setLastStep(3)); // AddParticipants = index 3 in PHASE_A_SCREEN_INDEX
    apiSaveAnonDraft({
      taggedPeople: participants.map((p) => ({
        name: p.name,
        relationshipSlug: p.relationship,
      })),
      screensReached: 3,
    }).catch(() => {});
    router.push(urlForScreen("LagPreview"));
  };

  return (
    <OnboardingShell
      onNext={goNext}
      hideMobileNext
      desktopContent={
        <div className="flex flex-col items-center text-primary-blue w-full">
          <RingDot />
          <h1 className="mt-[16px] font-montserrat font-bold text-[18px] text-center">
            {TITLE}
          </h1>

          <div className="mt-[24px] w-full max-w-[460px]">
            <NameInput value={name} onChange={setName} />
          </div>

          <div className="mt-[16px] w-full max-w-[460px]">
            <RelationshipChips onPick={onPickRelationship} />
          </div>

          <div className="mt-[28px] w-full max-w-[460px] flex flex-col gap-[10px]">
            {participants.map((p) => (
              <ParticipantCard key={p.id} participant={p} onRemove={onRemove} onRename={onRename} />
            ))}
          </div>
        </div>
      }
      mobileContent={
        <div className="flex flex-col min-h-screen px-[24px] pt-[48px] pb-[120px] text-primary-blue">
          <div className="flex flex-col items-center">
            <RingDot />
            <h1 className="mt-[16px] font-montserrat font-bold text-[22px] text-center">
              {TITLE}
            </h1>
          </div>

          <div className="mt-[24px]">
            <NameInput value={name} onChange={setName} />
          </div>

          <div className="mt-[16px]">
            <RelationshipChips onPick={onPickRelationship} />
          </div>

          <div className="mt-[24px] flex flex-col gap-[10px]">
            {participants.map((p) => (
              <ParticipantCard key={p.id} participant={p} onRemove={onRemove} onRename={onRename} />
            ))}
          </div>

          <div className="fixed bottom-0 left-0 right-0 z-30 px-[24px] pb-[24px] pt-[16px] bg-warm-cream">
            <button
              type="button"
              onClick={goNext}
              className="w-full cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[16px] rounded-full py-[16px] hover:opacity-90 transition-opacity"
            >
              Next
            </button>
          </div>
        </div>
      }
    />
  );
}

const AVATAR_PALETTE = [
  "#B7C7DC",
  "#F6C7B6",
  "#FCD6A5",
  "#C8DEC1",
  "#E4CBEA",
  "#F5B7B1",
  "#B7DBE0",
  "#F4E1A1",
  "#D6C8F0",
  "#EAB9C6",
];

function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

function RingDot() {
  return (
    <span
      className="relative block h-[42px] w-[42px] rounded-full"
      style={{ backgroundColor: "#FCD6A5" }}
    >
      <span
        className="absolute inset-[8px] rounded-full"
        style={{ backgroundColor: "#D95F3B" }}
      />
    </span>
  );
}

function NameInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Their Name"
      className="w-full bg-primary-white rounded-full py-[14px] px-[18px] font-montserrat text-[15px] text-primary-blue placeholder:text-primary-blue/40 outline-none shadow-[0_4px_14px_rgba(9,46,74,0.05)]"
    />
  );
}

function RelationshipChips({
  onPick,
}: {
  onPick: (slug: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-[10px]">
      {RELATIONSHIPS.map((r) => (
        <button
          key={r.slug}
          type="button"
          onClick={() => onPick(r.slug)}
          className="cursor-pointer bg-primary-white rounded-full px-[18px] py-[8px] font-montserrat text-[14px] text-primary-blue hover:bg-primary-white/85 transition-colors shadow-[0_2px_8px_rgba(9,46,74,0.05)]"
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

function ParticipantCard({
  participant,
  onRemove,
  onRename,
}: {
  participant: Participant;
  onRemove: (id: string) => void;
  onRename: (id: string, next: string) => void;
}) {
  const label =
    RELATIONSHIPS.find((r) => r.slug === participant.relationship)?.label ||
    participant.relationship;
  return (
    <div className="w-full bg-primary-white rounded-[14px] px-[16px] py-[12px] flex items-center gap-[12px] shadow-[0_2px_10px_rgba(9,46,74,0.06)]">
      <span
        className="h-[40px] w-[40px] rounded-full flex items-center justify-center shrink-0 font-montserrat font-semibold text-[16px] text-primary-blue"
        style={{ backgroundColor: avatarColor(participant.id) }}
      >
        {(participant.name.trim()[0] || "?").toUpperCase()}
      </span>
      <div className="flex-1 min-w-0">
        <input
          type="text"
          value={participant.name}
          onChange={(e) => onRename(participant.id, e.target.value)}
          placeholder="Their name"
          autoFocus={!participant.name}
          className="w-full bg-transparent outline-none font-montserrat font-semibold text-[15px] text-primary-blue placeholder:text-primary-blue/40"
        />
        <p className="font-montserrat text-[13px] text-primary-blue/60 truncate">{label}</p>
      </div>
      <button
        type="button"
        onClick={() => onRemove(participant.id)}
        aria-label="Remove"
        className="h-[24px] w-[24px] rounded-full bg-black/5 text-primary-blue/70 flex items-center justify-center cursor-pointer hover:bg-black/10"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M6 6l12 12M6 18L18 6" />
        </svg>
      </button>
    </div>
  );
}
