"use client";

import { useState } from "react";

// Lightweight suggested-questions carousel for the friend profile.
// Questions are hardcoded for now; the component is shaped so a real
// prompt feed can be dropped in later without touching the layout.
const QUESTIONS = [
  "What's the craziest fight we ever had?",
  "What's one memory from our childhood you'll never forget?",
  "If you could redo one day with me, which one would it be?",
  "What's a question you've always wanted to ask me?",
  "What's the best gift I ever gave you?",
];

type Props = {
  firstName: string;
  onSend: (prompt: string) => void;
};

export default function SuggestedQuestionsCard({ firstName, onSend }: Props) {
  const [idx, setIdx] = useState(0);
  const total = QUESTIONS.length;
  const prompt = QUESTIONS[idx];

  return (
    <div className="flex flex-col gap-[12px] w-full">
      <h3 className="font-montserrat text-[#2c2c2c] text-[14px]">
        Suggested Questions
      </h3>

      <div className="bg-[#E8E6DF] rounded-[18px] px-[18px] py-[22px] flex flex-col gap-[20px]">
        {/* Prompt row — chevrons flank the question text */}
        <div className="flex items-center gap-[12px]">
          <CarouselButton
            dir="prev"
            onClick={() => setIdx((i) => (i - 1 + total) % total)}
          />
          <p className="flex-1 min-w-0 text-center font-ivy italic text-[#232323] text-[20px] md:text-[22px] leading-[1.3]">
            {prompt}
          </p>
          <CarouselButton
            dir="next"
            onClick={() => setIdx((i) => (i + 1) % total)}
          />
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => onSend(prompt)}
            className="inline-flex items-center gap-[8px] cursor-pointer bg-primary-orange text-white font-montserrat font-medium rounded-full px-[22px] py-[10px] text-[14px] hover:opacity-90 transition-opacity"
          >
            <SendIcon width={16} height={16} />
            Send to {firstName || "them"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CarouselButton({
  dir,
  onClick,
}: {
  dir: "prev" | "next";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === "prev" ? "Previous question" : "Next question"}
      className="shrink-0 cursor-pointer w-[28px] h-[28px] rounded-full bg-white/80 hover:bg-white text-[#2c2c2c] flex items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-colors"
    >
      <svg
        width={12}
        height={12}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <path
          d={dir === "prev" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function SendIcon({ width = 16, height = 16 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M22 2L11 13"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 2L15 22L11 13L2 9L22 2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
