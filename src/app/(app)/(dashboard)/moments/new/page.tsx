"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ApiError } from "../../../../../lib/api/client";
import { createMoment } from "../../../../../lib/moments/cache";
import { ChevronLeftIcon, CloseIcon } from "../../icons";
import StepCelebration from "./StepCelebration";
import StepDetails, { type DetailsSubStep } from "./StepDetails";
import StepEventType from "./StepEventType";
import StepPeople from "./StepPeople";
import { emptyDraft, type Draft } from "./wizardTypes";

type Step = "type" | "details" | "people" | "done";

const STORAGE_KEY = "momentsWizardDraft";

type Persisted = {
  step: Step;
  detailsSubStep: DetailsSubStep;
  draft: Draft;
};

function loadPersisted(): Persisted | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Persisted> | null;
    if (!parsed || !parsed.draft) return null;
    // Blob-based fields don't survive refresh — drop them.
    const draft: Draft = {
      ...emptyDraft,
      ...parsed.draft,
      coverFile: null,
      coverLocalUri: null,
    };
    return {
      step: parsed.step ?? "type",
      detailsSubStep: parsed.detailsSubStep ?? "titleCover",
      draft,
    };
  } catch {
    return null;
  }
}

export default function NewMomentPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("type");
  const [detailsSubStep, setDetailsSubStep] = useState<DetailsSubStep>("titleCover");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [submitting, setSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Restore session state on mount.
  useEffect(() => {
    const saved = loadPersisted();
    if (saved) {
      // Never restore into the celebration screen — treat that as a fresh entry.
      if (saved.step === "done") return;
      setStep(saved.step);
      setDetailsSubStep(saved.detailsSubStep);
      setDraft(saved.draft);
    }
  }, []);

  // Persist on any change (except while on the celebration screen).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (step === "done") return;
    try {
      const { coverFile: _cf, coverLocalUri: _cl, ...rest } = draft;
      void _cf; void _cl;
      const payload: Persisted = {
        step,
        detailsSubStep,
        draft: { ...emptyDraft, ...rest, coverFile: null, coverLocalUri: null },
      };
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // storage full — ignore
    }
  }, [step, detailsSubStep, draft]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 1023px)");
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const patchDraft = (patch: Partial<Draft>) =>
    setDraft((d) => ({ ...d, ...patch }));

  const resetDraft = () => {
    if (draft.coverLocalUri) URL.revokeObjectURL(draft.coverLocalUri);
    setDraft(emptyDraft);
    setDetailsSubStep("titleCover");
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  };

  const goBack = () => {
    if (step === "details" && !isMobile) {
      setStep("type");
    } else if (step === "details" && isMobile) {
      if (detailsSubStep === "date") setDetailsSubStep("titleCover");
      else setStep("type");
    } else if (step === "people") {
      setStep("details");
      if (isMobile) setDetailsSubStep("date");
    } else {
      router.push("/moments");
    }
  };

  const goClose = () => {
    resetDraft();
    router.push("/moments");
  };

  const submit = async () => {
    if (submitting) return;
    if (!draft.type || !draft.title.trim() || !draft.date) {
      toast.error("Missing required fields");
      return;
    }
    setSubmitting(true);
    try {
      if (draft.coverFile) {
        const form = new FormData();
        form.append("type", draft.type);
        form.append("title", draft.title.trim());
        form.append("date", draft.date);
        form.append("isRecurring", String(draft.isRecurring));
        if (draft.isRecurring && draft.frequency) {
          form.append("frequency", draft.frequency);
        }
        form.append("file", draft.coverFile, "cover.jpg");
        await createMoment({
          form,
          taggedUserIds: draft.taggedUserIds,
          sendInvites: draft.sendInvites,
          pinToCountdown: draft.addToCountdown,
        });
      } else {
        await createMoment({
          json: {
            type: draft.type,
            title: draft.title.trim(),
            date: draft.date,
            isRecurring: draft.isRecurring,
            ...(draft.isRecurring && draft.frequency
              ? { frequency: draft.frequency }
              : {}),
            coverImageUrl: draft.coverImageUrl,
          },
          taggedUserIds: draft.taggedUserIds,
          sendInvites: draft.sendInvites,
          pinToCountdown: draft.addToCountdown,
        });
      }
      setStep("done");
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Couldn't create moment";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Progress: desktop = 3 dots, mobile = 4 dots (details split)
  const desktopIdx = step === "type" ? 0 : step === "details" ? 1 : 2;
  const mobileIdx =
    step === "type"
      ? 0
      : step === "details"
        ? detailsSubStep === "titleCover" ? 1 : 2
        : 3;

  const showChrome = step !== "done";

  return (
    <div className="lg:relative lg:min-h-full lg:pb-[80px] lg:pt-[8px]">
      {/* Mobile: full-screen shell */}
      <div className="lg:hidden fixed inset-0 z-40 bg-white flex flex-col">
        {showChrome && (
          <div className="flex items-center justify-between px-[16px] pt-[max(env(safe-area-inset-top),16px)] pb-[8px]">
            <button
              type="button"
              onClick={goBack}
              aria-label="Back"
              className="cursor-pointer w-[36px] h-[36px] rounded-full bg-[#EDEDED] text-[#092E4A] flex items-center justify-center"
            >
              <ChevronLeftIcon width={16} height={16} />
            </button>
            <ProgressDots total={4} active={mobileIdx} />
            <span className="w-[36px] h-[36px]" aria-hidden />
          </div>
        )}
        <div
          className={`relative flex-1 min-h-0 overflow-y-auto px-[24px] pb-[32px] ${
            step === "done" ? "bg-[#FEF5EA] pt-[72px]" : "pt-[24px]"
          } flex flex-col items-center`}
        >
          {step === "done" && (
            <button
              type="button"
              onClick={goClose}
              aria-label="Close"
              className="cursor-pointer absolute top-[max(env(safe-area-inset-top),16px)] right-[16px] w-[36px] h-[36px] rounded-full bg-white text-primary-blue flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.10)] z-10"
            >
              <CloseIcon width={14} height={14} />
            </button>
          )}
          <StepBody
            step={step}
            draft={draft}
            patchDraft={patchDraft}
            detailsSubStep={detailsSubStep}
            setDetailsSubStep={setDetailsSubStep}
            onNextFromType={() => setStep("details")}
            onNextFromDetails={() => setStep("people")}
            onSubmit={submit}
            submitting={submitting}
            isMobile
            onAddAnother={() => {
              resetDraft();
              setStep("type");
            }}
            onReturn={goClose}
          />
        </div>
      </div>

      {/* Desktop shell */}
      <div className="hidden lg:block">
        {showChrome && (
          <>
            <div className="flex items-center gap-[12px] mb-[16px]">
              <button
                type="button"
                onClick={goBack}
                aria-label="Back"
                className="cursor-pointer w-[36px] h-[36px] rounded-full bg-[#EDEDED] text-[#092E4A] flex items-center justify-center"
              >
                <ChevronLeftIcon width={16} height={16} />
              </button>
              <h2 className="font-montserrat font-semibold text-primary-blue text-[24px]">
                Add Moment
              </h2>
            </div>
            <div className="flex justify-center mb-[24px]">
              <ProgressDots total={3} active={desktopIdx} />
            </div>
          </>
        )}
        <div className="flex flex-col items-center">
          <StepBody
            step={step}
            draft={draft}
            patchDraft={patchDraft}
            detailsSubStep={detailsSubStep}
            setDetailsSubStep={setDetailsSubStep}
            onNextFromType={() => setStep("details")}
            onNextFromDetails={() => setStep("people")}
            onSubmit={submit}
            submitting={submitting}
            isMobile={false}
            onAddAnother={() => {
              resetDraft();
              setStep("type");
            }}
            onReturn={goClose}
          />
        </div>
      </div>
    </div>
  );
}

function StepBody({
  step,
  draft,
  patchDraft,
  detailsSubStep,
  setDetailsSubStep,
  onNextFromType,
  onNextFromDetails,
  onSubmit,
  submitting,
  isMobile,
  onAddAnother,
  onReturn,
}: {
  step: Step;
  draft: Draft;
  patchDraft: (patch: Partial<Draft>) => void;
  detailsSubStep: DetailsSubStep;
  setDetailsSubStep: (s: DetailsSubStep) => void;
  onNextFromType: () => void;
  onNextFromDetails: () => void;
  onSubmit: () => void;
  submitting: boolean;
  isMobile: boolean;
  onAddAnother: () => void;
  onReturn: () => void;
}) {
  if (step === "type") {
    return (
      <StepEventType
        value={draft.type}
        onChange={(v) => patchDraft({ type: v })}
        onNext={() => {
          setDetailsSubStep("titleCover");
          onNextFromType();
        }}
      />
    );
  }
  if (step === "details") {
    return (
      <div className="w-full">
        <StepDetails
          draft={draft}
          onChange={patchDraft}
          onNext={onNextFromDetails}
          subStep={detailsSubStep}
          onSubStepChange={setDetailsSubStep}
        />
      </div>
    );
  }
  if (step === "people") {
    return (
      <div className="w-full">
        <StepPeople
          draft={draft}
          onChange={patchDraft}
          onSubmit={onSubmit}
          submitting={submitting}
          primaryLabel={isMobile ? "Create Moment" : "Next"}
        />
      </div>
    );
  }
  // done
  return (
    <StepCelebration onAddAnother={onAddAnother} onReturn={onReturn} />
  );
}

function ProgressDots({ total, active }: { total: number; active: number }) {
  return (
    <div className="flex items-center gap-[6px]">
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i === active;
        return (
          <span
            key={i}
            className={`transition-all rounded-full ${
              isActive
                ? "w-[22px] h-[6px] bg-primary-orange"
                : "w-[6px] h-[6px] bg-primary-blue/25"
            }`}
          />
        );
      })}
    </div>
  );
}
