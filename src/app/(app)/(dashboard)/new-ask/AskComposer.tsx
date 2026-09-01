"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { ApiError } from "../../../../lib/api/client";
import {
  createUserCard,
  fetchCardGradients,
  shareUserCard,
  type GradientCover,
} from "../../../../lib/create/api";
import { compressImage } from "../../../../lib/images";
import SendToDrawer from "../../../../components/share/SendToDrawer";
import ChooseCoverModal, { type CoverPick } from "../new-story/ChooseCoverModal";
import {
  ChevronLeftIcon,
  // EyeIcon, // Preview button hidden — see header block below.
  // HelpIcon, // Help button hidden — see header block below.
  ImageIcon,
  PencilIcon,
  UploadIcon,
} from "../icons";

// Hardcoded suggestion strip — matches the Figma copy. If product wants
// these to be dynamic later, swap the source but keep the tap-to-fill
// interaction (chip click just seeds the question field).
const SUGGESTIONS = [
  "What was your first job?",
  "How did you two meet?",
  "What song takes you back?",
  "Tell me about the house you grew up in",
];

type CoverState = {
  file: File | null;
  imageUrl: string | null;
  preview: string | null;
};
const EMPTY_COVER: CoverState = { file: null, imageUrl: null, preview: null };

// Cache the curated gradient list across mounts — same trick the story
// composer's ChooseCoverModal uses.
let cachedCovers: GradientCover[] | null = null;

type Props = {
  onBack: () => void;
};

export default function AskComposer({ onBack }: Props) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [cover, setCover] = useState<CoverState>(EMPTY_COVER);
  const [covers, setCovers] = useState<GradientCover[]>(cachedCovers ?? []);
  const [coversLoading, setCoversLoading] = useState(cachedCovers === null);

  // Mobile two-step flow. Desktop renders both halves at once.
  const [mobileStep, setMobileStep] = useState<"question" | "cover">("question");

  const [creating, setCreating] = useState(false);
  const [promptId, setPromptId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  // Help button removed for now — leaving state stub commented so the wire-up
  // is trivial to restore if product wants the help panel later.
  // const [showHelp, setShowHelp] = useState(false);
  // Mobile/tablet only: below `lg`, tapping the cover area opens the shared
  // ChooseCoverModal (full-screen route-like sheet). Desktop keeps the
  // inline picker panel on the right rail.
  const [coverModalOpen, setCoverModalOpen] = useState(false);

  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (cachedCovers !== null) return;
    let cancelled = false;
    fetchCardGradients()
      .then((list) => {
        if (cancelled) return;
        cachedCovers = list;
        setCovers(list);
      })
      .finally(() => {
        if (!cancelled) setCoversLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const canProceed = question.trim().length > 0;

  // Ensure we have a user-card ID before opening the share modal. The card
  // is minted lazily so users bouncing back and forth between steps don't
  // spawn orphan cards. Once created we keep the same id for subsequent
  // send attempts.
  async function ensurePromptId(): Promise<string | null> {
    if (promptId) return promptId;
    try {
      const card = await createUserCard({
        content: question.trim(),
        type: "WHITE",
        file: cover.file,
        imageUrl: cover.file ? undefined : cover.imageUrl ?? undefined,
      });
      setPromptId(card._id);
      return card._id;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.";
      toast.error(message);
      return null;
    }
  }

  async function handleOpenShare() {
    if (!canProceed || creating) return;
    setCreating(true);
    const id = await ensurePromptId();
    setCreating(false);
    if (id) setShareOpen(true);
  }

  async function handleShareSubmit(
    userIds: string[],
    groupIds: string[],
    note: string
  ) {
    if (!promptId) return;
    try {
      await shareUserCard(promptId, {
        shareWith: userIds,
        groupIds,
        // sendSeparately is dropped in v1 — see share drawer migration notes.
        sendSeparately: false,
        note,
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not send. Please try again.";
      throw new Error(message);
    }
  }

  // Drawer owns the celebration (Prompt Sent). On Done, route straight to
  // Interactions — no second celebration screen.
  const [sentThisSession, setSentThisSession] = useState(false);
  const handleShareDrawerClose = () => {
    setShareOpen(false);
    if (sentThisSession) {
      setSentThisSession(false);
      router.push("/interactions?tab=sent");
    }
  };
  const wrappedSend: typeof handleShareSubmit = async (u, g, n) => {
    await handleShareSubmit(u, g, n);
    setSentThisSession(true);
  };

  function pickSuggestion(text: string) {
    setQuestion(text);
  }

  function handleGradientPick(url: string) {
    setCover({ file: null, imageUrl: url, preview: url });
  }

  async function handleUploadFile(file: File | null | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const compressed = await compressImage(file);
      const preview = URL.createObjectURL(compressed);
      setCover({ file: compressed, imageUrl: null, preview });
    } catch {
      const preview = URL.createObjectURL(file);
      setCover({ file, imageUrl: null, preview });
    }
  }

  return (
    <div className="h-full flex flex-col min-h-0 overflow-y-auto bg-[#FFEFDC] lg:bg-transparent">
      {/* Header */}
      <div className="shrink-0 px-[16px] md:px-[24px] lg:px-[40px] pt-[12px] pb-[12px] flex items-center justify-between gap-[12px] relative">
        <div className="flex items-center gap-[12px] min-w-0">
          <button
            type="button"
            onClick={() => {
              if (mobileStep === "cover") {
                setMobileStep("question");
                return;
              }
              onBack();
            }}
            aria-label="Back"
            className="cursor-pointer w-[36px] h-[36px] rounded-full bg-white lg:bg-[#ededed] text-primary-blue flex items-center justify-center hover:brightness-95 lg:hover:bg-[#e3e3e3] transition-[filter] shrink-0"
          >
            <ChevronLeftIcon width={16} height={16} />
          </button>
          <h1 className="hidden lg:block font-montserrat font-bold text-primary-blue text-[28px] leading-tight truncate">
            Ask a Question
          </h1>
        </div>
        <h1 className="lg:hidden absolute left-1/2 -translate-x-1/2 font-montserrat font-bold text-primary-blue text-[18px] leading-tight">
          Ask a Question
        </h1>
        <div className="flex items-center gap-[8px] lg:gap-[12px] shrink-0">
          {/* Help + Preview buttons removed for now — Help was a no-op toggle
              (state was never read) and Preview had no onClick. Kept as
              comments so they can be re-enabled once the panels are built.
          <button
            type="button"
            aria-label="Help"
            onClick={() => setShowHelp((v) => !v)}
            className={`cursor-pointer w-[32px] h-[32px] rounded-full flex items-center justify-center transition-colors ${
              showHelp
                ? "bg-primary-blue text-white"
                : "text-primary-blue hover:bg-black/[0.04]"
            }`}
          >
            <HelpIcon width={20} height={20} />
          </button>
          <button
            type="button"
            aria-label="Preview"
            className="hidden lg:inline-flex cursor-pointer items-center gap-[8px] border-[1.5px] border-primary-blue text-primary-blue rounded-full h-[44px] px-[40px] font-montserrat font-medium text-[15px] hover:bg-primary-blue/[0.04] transition-colors"
          >
            <EyeIcon width={16} height={16} />
            <span>Preview</span>
          </button>
          */}
          <button
            type="button"
            onClick={handleOpenShare}
            disabled={!canProceed || creating}
            className="hidden lg:flex cursor-pointer items-center justify-center bg-primary-orange text-white rounded-full h-[44px] px-[44px] font-montserrat font-medium text-[15px] hover:brightness-95 transition-[filter] disabled:opacity-60"
          >
            {creating ? "Preparing…" : "Send"}
          </button>
        </div>
      </div>
      <div className="mx-[16px] md:mx-[24px] lg:mx-[40px] h-px bg-[#d9d9d9]" />

      {/* Desktop two-column body */}
      <div className="hidden lg:flex flex-1 min-h-0 flex-row gap-[32px] px-[40px] pt-[20px] pb-[40px]">
        <div className="flex-1 min-w-0 flex flex-col gap-[16px]">
          <QuestionInput value={question} onChange={setQuestion} />
          <SuggestionStrip onPick={pickSuggestion} />
        </div>
        <div className="w-[360px] shrink-0 flex flex-col gap-[16px]">
          <CoverPanel
            cover={cover}
            covers={covers}
            coversLoading={coversLoading}
            onPickGradient={handleGradientPick}
            onOpenUpload={() => uploadInputRef.current?.click()}
          />
        </div>
      </div>

      {/* Mobile 2-step body. No `flex-1` / `min-h-0` here — those cap the
          body at (parent height − header) which means content bigger than
          the fold gets clipped instead of triggering the outer scroll. Let
          it size to content; the composer root's `overflow-y-auto` handles
          scroll when the tall cover tile pushes past the viewport. */}
      <div className="lg:hidden flex flex-col gap-[16px] px-[16px] md:px-[24px] pt-[16px] pb-[120px]">
        <StepDots active={mobileStep === "question" ? 0 : 1} count={4} />
        {mobileStep === "question" ? (
          <div className="flex flex-col gap-[24px] pt-[40px]">
            <h2 className="font-montserrat font-bold text-primary-blue text-[20px] leading-tight text-center">
              What would you like to know?
            </h2>
            <QuestionInput value={question} onChange={setQuestion} />
            <SuggestionStrip onPick={pickSuggestion} />
          </div>
        ) : (
          <div className="flex flex-col gap-[16px] pt-[24px]">
            <h2 className="font-montserrat font-bold text-primary-blue text-[20px] leading-tight text-center">
              Add a Cover image
            </h2>
            <button
              type="button"
              onClick={() => setCoverModalOpen(true)}
              className="cursor-pointer relative w-full aspect-[4/5] rounded-[20px] bg-white overflow-hidden flex items-center justify-center hover:brightness-[0.98] transition-[filter]"
            >
              {cover.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cover.preview}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-[12px] text-primary-blue">
                  <ImageIcon width={44} height={44} />
                  <span className="font-montserrat font-medium text-[14px]">
                    Tap to add a photo
                  </span>
                </div>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Mobile sticky action bar */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 px-[16px] pb-[16px] pt-[12px] bg-[#FFEFDC]">
        <button
          type="button"
          onClick={() => {
            if (mobileStep === "question") {
              if (!canProceed) return;
              setMobileStep("cover");
              return;
            }
            void handleOpenShare();
          }}
          disabled={!canProceed || creating}
          className="cursor-pointer w-full h-[52px] rounded-full bg-primary-orange text-white font-montserrat font-semibold text-[15px] hover:brightness-95 transition-[filter] disabled:opacity-60"
        >
          {mobileStep === "question" ? "Next" : creating ? "Preparing…" : "Next"}
        </button>
      </div>

      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleUploadFile(e.target.files?.[0])}
      />

      <SendToDrawer
        open={shareOpen}
        onClose={handleShareDrawerClose}
        onSend={wrappedSend}
        shareContext="prompt"
        showMessageInput
        shareTarget={promptId ? { kind: "prompt", id: promptId } : undefined}
      />

      <ChooseCoverModal
        open={coverModalOpen}
        selectedUrl={cover.imageUrl}
        onClose={() => setCoverModalOpen(false)}
        onPick={(pick: CoverPick) => {
          if (pick.kind === "curated") {
            setCover({ file: null, imageUrl: pick.imageUrl, preview: pick.preview });
          } else {
            setCover({ file: pick.file, imageUrl: null, preview: pick.preview });
          }
        }}
      />
    </div>
  );
}

function QuestionInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="relative block">
      <span className="absolute left-[18px] top-[18px] text-primary-blue/60 pointer-events-none">
        <PencilIcon width={18} height={18} />
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="What's your favorite memory?"
        rows={2}
        className="w-full resize-none bg-white lg:bg-[#ededed] rounded-[20px] pl-[46px] pr-[16px] py-[16px] font-montserrat font-medium text-primary-blue text-[16px] leading-[22px] placeholder:text-[#848484] focus:outline-none focus:ring-2 focus:ring-primary-blue/15"
      />
    </label>
  );
}

function SuggestionStrip({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div>
      <p className="font-montserrat font-semibold text-primary-blue text-[14px] mb-[10px]">
        Or try one of these
      </p>
      <div className="flex flex-wrap gap-[8px]">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="cursor-pointer rounded-full bg-white lg:bg-[#ededed] border border-[#e3e3e3] lg:border-transparent px-[14px] h-[32px] inline-flex items-center font-montserrat font-medium text-primary-blue text-[13px] hover:brightness-95 transition-[filter]"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function CoverPanel({
  cover,
  covers,
  coversLoading,
  onPickGradient,
  onOpenUpload,
}: {
  cover: CoverState;
  covers: GradientCover[];
  coversLoading: boolean;
  onPickGradient: (url: string) => void;
  onOpenUpload: () => void;
}) {
  return (
    <div className="flex flex-col gap-[14px]">
      <button
        type="button"
        onClick={onOpenUpload}
        className="cursor-pointer relative w-full aspect-square rounded-[20px] bg-[#ededed] overflow-hidden flex items-center justify-center hover:brightness-[0.98] transition-[filter]"
      >
        {cover.preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.preview}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-[12px] text-primary-blue">
            <ImageIcon width={44} height={44} />
            <span className="font-montserrat font-medium text-[15px]">
              Add cover
            </span>
          </div>
        )}
      </button>
      <CoverGrid
        covers={covers}
        loading={coversLoading}
        selectedUrl={cover.imageUrl}
        onPick={onPickGradient}
        onUploadClick={onOpenUpload}
      />
    </div>
  );
}

// The curated grid — top-left is always the Upload slot. Remaining cells
// come from the gradients endpoint.
function CoverGrid({
  covers,
  loading,
  selectedUrl,
  onPick,
  onUploadClick,
}: {
  covers: GradientCover[];
  loading: boolean;
  selectedUrl: string | null;
  onPick: (url: string) => void;
  onUploadClick: () => void;
}) {
  const cells = useMemo(
    () =>
      covers
        .map((c) => c.imageUrl || c.url || "")
        .filter((url): url is string => !!url),
    [covers]
  );
  return (
    <div className="grid grid-cols-3 gap-[10px]">
      <button
        type="button"
        onClick={onUploadClick}
        className="cursor-pointer aspect-square rounded-[12px] bg-[#ededed] border border-[#d9d9d9] flex flex-col items-center justify-center gap-[6px] text-primary-blue hover:bg-[#e3e3e3] transition-colors"
      >
        <UploadIcon width={22} height={22} />
        <span className="font-montserrat font-medium text-[13px]">Upload</span>
      </button>
      {loading &&
        Array.from({ length: 8 }).map((_, i) => (
          <div
            key={`sk-${i}`}
            className="aspect-square rounded-[12px] bg-[#f3f3f3] animate-pulse"
          />
        ))}
      {!loading &&
        cells.map((url, i) => {
          const on = selectedUrl === url;
          return (
            <button
              key={`${url}-${i}`}
              type="button"
              onClick={() => onPick(url)}
              className={`relative cursor-pointer aspect-square rounded-[12px] overflow-hidden transition-[box-shadow] ${
                on
                  ? "ring-[3px] ring-primary-orange"
                  : "ring-1 ring-black/[0.06]"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          );
        })}
    </div>
  );
}

function StepDots({ active, count }: { active: number; count: number }) {
  return (
    <div className="flex items-center justify-center gap-[8px] pt-[8px]">
      {Array.from({ length: count }).map((_, i) => {
        const on = i === active;
        return (
          <span
            key={i}
            className={`h-[8px] rounded-full transition-all ${
              on ? "w-[24px] bg-primary-orange" : "w-[8px] bg-[#d9d9d9]"
            }`}
            aria-hidden
          />
        );
      })}
    </div>
  );
}
