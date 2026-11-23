"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { useAuth } from "../../../lib/auth/AuthProvider";

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
  const dateChipLabel = date ? formatChipDate(date) : null;
  const headerDateLabel = date ? formatHeaderDate(date) : null;
  const { user } = useAuth();
  const authorFirstName = (user?.firstName ?? "").trim();
  const authorLastName = (user?.lastName ?? "").trim();
  const authorName =
    [authorFirstName, authorLastName].filter(Boolean).join(" ") || "You";
  const authorAvatarUrl = user?.profilePicture ?? null;

  const goNext = () => {
    dispatch(setLastStep(4));
    apiSaveAnonDraft({ screensReached: 4 }).catch(() => {});
    router.push(urlForScreen("SignupScreen"));
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#F3F1EB] overflow-hidden">
      <div className="absolute inset-0 overflow-y-auto px-[24px] md:px-[40px] pt-[max(env(safe-area-inset-top),32px)] pb-[160px] lg:pb-[100px]">
        <div className="w-full max-w-[640px] mx-auto flex flex-col items-center">
          <h1 className="font-ivy font-normal text-[#232323] text-[22px] md:text-[26px] lg:text-[30px] leading-[1.25] text-center">
            {TITLE}
          </h1>

          <PreviewCard
            coverUri={coverUri}
            textBody={textBody}
            locationLabel={locationLabel}
            dateChipLabel={dateChipLabel}
            headerDateLabel={headerDateLabel}
            participants={participants}
            authorName={authorName}
            authorAvatarUrl={authorAvatarUrl}
          />
        </div>
      </div>

      {/* Desktop Next pill */}
      <button
        type="button"
        onClick={goNext}
        disabled={uploading}
        className="hidden lg:inline-flex absolute bottom-[32px] right-[32px] cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[15px] rounded-full px-[40px] py-[12px] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? "Uploading…" : "Next"}
      </button>

      {/* Mobile + tablet Next pill */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-[#F3F1EB] px-[24px] md:px-[48px] pb-[max(env(safe-area-inset-bottom),24px)] pt-[16px]">
        <button
          type="button"
          onClick={goNext}
          disabled={uploading}
          className="w-full max-w-[520px] mx-auto block cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[16px] rounded-full py-[16px] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? "Uploading…" : "Next"}
        </button>
      </div>
    </div>
  );
}

function PreviewCard({
  coverUri,
  textBody,
  locationLabel,
  dateChipLabel,
  headerDateLabel,
  participants,
  authorName,
  authorAvatarUrl,
}: {
  coverUri: string | null;
  textBody: string;
  locationLabel: string | null;
  dateChipLabel: string | null;
  headerDateLabel: string | null;
  participants: Participant[];
  authorName: string;
  authorAvatarUrl: string | null;
}) {
  const paragraphs = textBody
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const bodyText = paragraphs.join("\n\n").trim();
  const firstChar = bodyText.charAt(0);
  const restBody = bodyText.slice(1);

  return (
    <div className="w-full flex flex-col items-center mt-[24px] md:mt-[32px]">
      {coverUri && (
        <div
          className="bg-white p-[10px]"
          style={{
            transform: "rotate(1.513deg)",
            boxShadow: "0 4.957px 4.957px 0 rgba(0, 0, 0, 0.25)",
          }}
        >
          <div className="relative w-[220px] h-[220px] md:w-[240px] md:h-[240px] lg:w-[280px] lg:h-[280px] overflow-hidden bg-[#D9D9D9]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverUri}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      <div className="w-full max-w-[560px] mt-[32px] md:mt-[40px]">
        <div className="flex items-center justify-between gap-[12px] pb-[12px] border-b border-[#2c2c2c]/15">
          <div className="flex items-center gap-[10px] min-w-0">
            <AuthorAvatar name={authorName} src={authorAvatarUrl} />
            <span className="font-montserrat text-[#232323] text-[14px] truncate">
              {authorName}
            </span>
          </div>
          {headerDateLabel && (
            <span className="font-montserrat text-[#2c2c2c]/70 text-[12.5px] shrink-0">
              {headerDateLabel}
            </span>
          )}
        </div>

        {(dateChipLabel || locationLabel) && (
          <div className="mt-[14px] flex flex-wrap gap-[8px]">
            {dateChipLabel && (
              <span
                className="inline-flex items-center rounded-full px-[14px] py-[6px] font-montserrat text-[12.5px] text-[#232323]"
                style={{ backgroundColor: "#E8E6DF" }}
              >
                {dateChipLabel}
              </span>
            )}
            {locationLabel && (
              <span
                className="inline-flex items-center rounded-full px-[14px] py-[6px] font-montserrat text-[12.5px] text-[#232323]"
                style={{ backgroundColor: "#E8E6DF" }}
              >
                {locationLabel}
              </span>
            )}
          </div>
        )}

        {bodyText && (
          <p className="mt-[22px] font-montserrat text-[13.5px] md:text-[14px] leading-[1.6] text-[#232323] whitespace-pre-line">
            {firstChar && (
              <span className="font-ivy text-[28px] md:text-[32px] leading-[0.8] mr-[4px] align-middle">
                {firstChar}
              </span>
            )}
            {restBody}
          </p>
        )}

        {participants.length > 0 && (
          <div className="mt-[18px] flex items-center">
            <ParticipantStack participants={participants} />
          </div>
        )}
      </div>
    </div>
  );
}

function AuthorAvatar({ name, src }: { name: string; src: string | null }) {
  const [failed, setFailed] = useState(false);
  const hasImage = !!src && !failed;
  const initial = (name.trim()[0] || "?").toUpperCase();
  return (
    <span
      className="h-[32px] w-[32px] rounded-full overflow-hidden shrink-0 flex items-center justify-center text-[#232323] font-montserrat font-semibold text-[13px]"
      style={{ backgroundColor: hasImage ? "transparent" : "#C8D1DA" }}
    >
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src ?? undefined}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-white">{initial}</span>
      )}
    </span>
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
              className="h-[28px] w-[28px] rounded-full flex items-center justify-center font-montserrat font-semibold text-[12px] text-[#232323] ring-2 ring-[#F3F1EB]"
              style={{ backgroundColor: avatarColor(p.id) }}
            >
              {(p.name.trim()[0] || "?").toUpperCase()}
            </span>
          );
        })}
      </div>
      {extra > 0 && (
        <span className="ml-[8px] font-montserrat text-[12px] font-semibold text-[#232323]">
          +{extra}
        </span>
      )}
    </div>
  );
}

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sept", "Oct", "Nov", "Dec",
];

function formatChipDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}, ${d.getFullYear()}`;
}

function formatHeaderDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}, ${d.getFullYear()}`;
}
