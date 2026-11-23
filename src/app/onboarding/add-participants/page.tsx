"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { urlForScreen } from "../../../lib/onboarding";
import toast from "react-hot-toast";
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
  const [selectedRelationship, setSelectedRelationship] = useState<string | null>(null);

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
    setSelectedRelationship((prev) => (prev === slug ? null : slug));
  };

  const onAdd = () => {
    const seed = name.trim();
    if (!seed) {
      toast.error("Please enter a name");
      return;
    }
    if (!selectedRelationship) {
      toast.error("Please pick a relationship");
      return;
    }
    const participant: Participant = {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: seed,
      relationship: selectedRelationship,
      userId: null,
    };
    dispatch(addParticipant(participant));
    setName("");
    setSelectedRelationship(null);
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
    <div className="fixed inset-0 z-40 bg-[#F3F1EB] overflow-hidden">
      <div className="absolute inset-0 overflow-y-auto px-[24px] md:px-[32px] pt-[max(env(safe-area-inset-top),32px)] pb-[160px] lg:pb-[100px]">
        <div className="w-full max-w-[460px] mx-auto flex flex-col items-center">
          <RingDot />
          <h1 className="mt-[14px] font-ivy font-normal text-[#232323] text-[22px] md:text-[24px] lg:text-[26px] leading-[1.25] text-center">
            {TITLE}
          </h1>

          <div className="mt-[32px] w-full">
            <NameInput value={name} onChange={setName} />
          </div>

          <div className="mt-[20px] w-full">
            <RelationshipChips selected={selectedRelationship} onPick={onPickRelationship} />
          </div>

          <button
            type="button"
            onClick={onAdd}
            className="mt-[24px] w-full h-[48px] cursor-pointer bg-[#1C1C1C] text-white rounded-full font-montserrat font-semibold text-[15px] hover:brightness-110 transition-[filter]"
          >
            Add
          </button>

          {participants.length > 0 && (
            <div className="mt-[20px] w-full flex flex-col gap-[10px]">
              {participants.map((p) => (
                <ParticipantCard key={p.id} participant={p} onRemove={onRemove} onRename={onRename} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Next pill */}
      <button
        type="button"
        onClick={goNext}
        className="hidden lg:inline-flex absolute bottom-[32px] right-[32px] cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[15px] rounded-full px-[40px] py-[12px] hover:opacity-90 transition-opacity"
      >
        Next
      </button>

      {/* Mobile + tablet Next pill */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-[#F3F1EB] px-[24px] md:px-[48px] pb-[max(env(safe-area-inset-bottom),24px)] pt-[16px]">
        <button
          type="button"
          onClick={goNext}
          className="w-full max-w-[520px] mx-auto block cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[16px] rounded-full py-[16px] hover:opacity-90 transition-opacity"
        >
          Next
        </button>
      </div>
    </div>
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
      className="relative block h-[54px] w-[54px] rounded-full"
      style={{ backgroundColor: "#FCD6A5" }}
    >
      <span
        className="absolute inset-[6px] rounded-full"
        style={{ backgroundColor: "#EF9849" }}
      />
      <span
        className="absolute inset-[16px] rounded-full"
        style={{ backgroundColor: "#D95F3B" }}
      />
    </span>
  );
}

function NameInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="w-full flex items-center justify-between gap-[12px] pb-[8px] border-b border-[#2c2c2c]/30">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Name"
        className="flex-1 bg-transparent font-montserrat text-[14px] text-[#232323] placeholder:text-[#2c2c2c]/50 outline-none"
      />
      <PersonGlyph />
    </div>
  );
}

function PersonGlyph() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#232323"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function RelationshipChips({
  selected,
  onPick,
}: {
  selected: string | null;
  onPick: (slug: string) => void;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-[8px]">
      {RELATIONSHIPS.map((r) => {
        const isSelected = selected === r.slug;
        return (
          <button
            key={r.slug}
            type="button"
            onClick={() => onPick(r.slug)}
            className={`cursor-pointer rounded-full px-[18px] py-[8px] font-montserrat text-[13px] transition-colors ${
              isSelected
                ? "bg-[#1C1C1C] text-white"
                : "bg-white text-[#232323] hover:brightness-95"
            }`}
          >
            {r.label}
          </button>
        );
      })}
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
    <div className="w-full bg-white px-[16px] py-[12px] flex items-center gap-[12px] shadow-[0_4px_4px_0_rgba(0,0,0,0.25)]">
      <span
        className="h-[40px] w-[40px] rounded-full flex items-center justify-center shrink-0 font-montserrat font-semibold text-[16px] text-[#232323]"
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
          className="w-full bg-transparent outline-none font-montserrat font-semibold text-[15px] text-[#232323] placeholder:text-[#2c2c2c]/40"
        />
        <p className="font-montserrat text-[12px] text-[#2c2c2c]/60 truncate">{label}</p>
      </div>
      <button
        type="button"
        onClick={() => onRemove(participant.id)}
        aria-label="Remove"
        className="h-[26px] w-[26px] rounded-full bg-black/[0.05] text-[#232323]/70 flex items-center justify-center cursor-pointer hover:bg-black/[0.08] transition-colors"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M6 6l12 12M6 18L18 6" />
        </svg>
      </button>
    </div>
  );
}
