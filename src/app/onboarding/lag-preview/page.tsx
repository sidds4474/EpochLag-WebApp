"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { OnboardingShell } from "../../../lib/onboarding/components/OnboardingShell";
import { urlForScreen } from "../../../lib/onboarding";
import { useAppDispatch, useAppSelector } from "../../../lib/onboarding/store";
import {
  hydrateFromServerDraft,
  type Participant,
} from "../../../lib/onboarding/store/slices/createALagSlice";
import { setLastStep } from "../../../lib/onboarding/store/slices/anonDraftSlice";
import {
  apiSaveAnonDraft,
  apiGetAnonDraft,
} from "../../../lib/onboarding/api/anonEndpoints";
import { useAnyUploading } from "../../../lib/onboarding/upload/UploadContext";
import { BookmarkIcon, MapPinIcon, CalendarIcon } from "../../(app)/(dashboard)/icons";

const TITLE = "You created a Lag!";

const RELATIONSHIPS: Record<string, string> = {
  mom: "Mom",
  dad: "Dad",
  sibling: "Sibling",
  child: "Child",
  partner: "Partner",
  friend: "Friend",
  grandparent: "Grandparent",
  other: "Other",
};

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

export default function LagPreviewPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const coverUri = useAppSelector((s) => s.createALag.coverUri);
  const textBody = useAppSelector((s) => s.createALag.textBody);
  const date = useAppSelector((s) => s.createALag.date);
  const location = useAppSelector((s) => s.createALag.location);
  const participants = useAppSelector((s) => s.createALag.participants);
  const hasDraftToken = useAppSelector((s) => s.anonDraft.hasDraftToken);
  const hydrated = useAppSelector((s) => s.anonDraft.hydrated);
  const uploading = useAnyUploading();
  const hydratedFromServerRef = useRef(false);

  useEffect(() => {
    if (!hydrated || hydratedFromServerRef.current) return;
    if (!hasDraftToken) return;
    hydratedFromServerRef.current = true;
    apiGetAnonDraft()
      .then((d) => {
        if (d) dispatch(hydrateFromServerDraft(d));
      })
      .catch(() => {});
  }, [dispatch, hasDraftToken, hydrated]);

  const locationLabel =
    location?.city || location?.country || location?.formattedAddress || null;
  const yearLabel = date ? String(new Date(date).getFullYear()) : null;

  const goNext = () => {
    dispatch(setLastStep(4));
    apiSaveAnonDraft({ screensReached: 4 }).catch(() => {});
    router.push(urlForScreen("LoginScreen"));
  };

  const card = (
    <PreviewCard
      coverUri={coverUri}
      textBody={textBody}
      locationLabel={locationLabel}
      yearLabel={yearLabel}
      participants={participants}
    />
  );

  return (
    <OnboardingShell
      onNext={goNext}
      nextDisabled={uploading}
      hideMobileNext
      desktopContent={
        <div className="flex flex-col items-center justify-center text-primary-blue w-full md:min-h-[78vh] lg:min-h-0">
          <h1 className="font-montserrat font-bold text-[18px] text-center">
            {TITLE}
          </h1>
          <div className="mt-[24px] w-full max-w-[360px] lg:scale-[0.87] lg:origin-top">{card}</div>
        </div>
      }
      mobileContent={
        <div className="flex flex-col justify-center min-h-screen px-[24px] pt-[48px] pb-[120px] text-primary-blue">
          <h1 className="font-montserrat font-bold text-[22px] text-center">
            {TITLE}
          </h1>
          <div className="mt-[24px]">{card}</div>

          <div className="fixed bottom-0 left-0 right-0 z-30 px-[24px] pb-[24px] pt-[16px] bg-warm-cream">
            <button
              type="button"
              onClick={goNext}
              disabled={uploading}
              className="w-full cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[16px] rounded-full py-[16px] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? "Uploading…" : "Next"}
            </button>
          </div>
        </div>
      }
    />
  );
}

function PreviewCard({
  coverUri,
  textBody,
  locationLabel,
  yearLabel,
  participants,
}: {
  coverUri: string | null;
  textBody: string;
  locationLabel: string | null;
  yearLabel: string | null;
  participants: Participant[];
}) {
  const paragraphs = textBody
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="w-full bg-primary-white rounded-[18px] p-[14px] shadow-[0_6px_24px_rgba(9,46,74,0.08)]">
      {coverUri ? (
        <div className="relative w-full aspect-[16/10] rounded-t-[12px] overflow-hidden bg-primary-blue/5">
          <img
            src={coverUri}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <button
            type="button"
            aria-label="Save"
            className="absolute top-[10px] right-[10px] h-[36px] w-[36px] rounded-full bg-primary-white flex items-center justify-center text-primary-blue shadow-[0_2px_8px_rgba(9,46,74,0.15)]"
          >
            <BookmarkIcon width={14} height={18} />
          </button>
        </div>
      ) : null}

      {(locationLabel || yearLabel) && (
        <div className="mt-[14px] flex flex-wrap gap-[8px]">
          {locationLabel && (
            <span className="inline-flex items-center gap-[6px] rounded-full px-[12px] py-[6px] font-montserrat text-[13px] text-primary-blue" style={{ backgroundColor: "#EDEDED" }}>
              <MapPinIcon width={12} height={14} />
              {locationLabel}
            </span>
          )}
          {yearLabel && (
            <span className="inline-flex items-center gap-[6px] rounded-full px-[12px] py-[6px] font-montserrat text-[13px] text-primary-blue" style={{ backgroundColor: "#EDEDED" }}>
              <CalendarIcon width={12} height={12} />
              {yearLabel}
            </span>
          )}
        </div>
      )}

      {paragraphs.length > 0 && (
        <div className="mt-[14px] flex flex-col gap-[10px]">
          {paragraphs.map((p, i) => (
            <p
              key={i}
              className="font-montserrat text-[13.5px] leading-[160%] text-primary-blue whitespace-pre-wrap"
            >
              {p}
            </p>
          ))}
        </div>
      )}

      {participants.length > 0 && (
        <div className="mt-[16px] flex items-center">
          <ParticipantStack participants={participants} />
        </div>
      )}
    </div>
  );
}

function ParticipantStack({ participants }: { participants: Participant[] }) {
  const shown = participants.slice(0, 4);
  const extra = participants.length - shown.length;
  return (
    <div className="flex items-center">
      <div className="flex -space-x-[8px]">
        {shown.map((p) => {
          const label = RELATIONSHIPS[p.relationship] || p.relationship;
          return (
            <span
              key={p.id}
              title={`${p.name || label}`}
              className="h-[28px] w-[28px] rounded-full flex items-center justify-center font-montserrat font-semibold text-[12px] text-primary-blue ring-2 ring-primary-white"
              style={{ backgroundColor: avatarColor(p.id) }}
            >
              {(p.name.trim()[0] || "?").toUpperCase()}
            </span>
          );
        })}
      </div>
      {extra > 0 && (
        <span className="ml-[8px] font-montserrat text-[12px] font-semibold text-primary-blue">
          +{extra}
        </span>
      )}
    </div>
  );
}
