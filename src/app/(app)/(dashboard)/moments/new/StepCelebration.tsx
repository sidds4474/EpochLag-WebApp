"use client";

import { useEffect, useRef, useState } from "react";

// Palette — rings match the concentric logo SVG.
const C_HALO = "#FCD6A5";
const C_MID = "#EF9849";
const C_INNER = "#D95F3B";
const DOT_COLORS = ["#E8973A", "#F0B060", "#C1553A", "#F5D4A0"];

// Confetti seed (deterministic)
const DOT_COUNT = 12;
const DOTS = Array.from({ length: DOT_COUNT }, (_, i) => ({
  angle: (i / DOT_COUNT) * Math.PI * 2 + ((i % 3) - 1) * 0.3,
  speed: 90 + ((i * 17) % 110),
  size: 6 + ((i * 7) % 14),
  color: DOT_COLORS[i % DOT_COLORS.length],
  delay: 0.08 + i * 0.01,
}));

// Timing (ms)
const DURATION_MS = 2800;
const RING_1_DELAY = 380;
const RING_2_DELAY = 470;
const RING_3_DELAY = 560;
const RING_DUR = 420;
const CHECK_DELAY = 700;
const CHECK_DUR = 500;
const TITLE_DELAY = 1000;
const TITLE_DUR = 520;
const BUTTONS_DELAY = 1200;
const BUTTONS_DUR = 520;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t: number, s = 1.7) =>
  1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function StepCelebration({
  onAddAnother,
  onReturn,
}: {
  onAddAnother: () => void;
  onReturn: () => void;
}) {
  const [tSec, setTSec] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setTSec(DURATION_MS / 1000);
      return;
    }
    let raf = 0;
    const tick = (now: number) => {
      if (startRef.current == null) startRef.current = now;
      const elapsed = now - startRef.current;
      const t = Math.min(elapsed, DURATION_MS) / 1000;
      setTSec(t);
      if (elapsed < DURATION_MS) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const tMs = tSec * 1000;

  const ringScale = (delayMs: number) => {
    const p = clamp01((tMs - delayMs) / RING_DUR);
    return p === 0 ? 0 : easeOutBack(p);
  };
  const ring1 = ringScale(RING_1_DELAY);
  const ring2 = ringScale(RING_2_DELAY);
  const ring3 = ringScale(RING_3_DELAY);

  const checkP = easeOutCubic(clamp01((tMs - CHECK_DELAY) / CHECK_DUR));
  const titleP = easeOutCubic(clamp01((tMs - TITLE_DELAY) / TITLE_DUR));
  const buttonsP = easeOutCubic(clamp01((tMs - BUTTONS_DELAY) / BUTTONS_DUR));

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[300px] h-[300px] flex items-center justify-center">
        {/* Shockwaves */}
        {[
          { delay: 0.0, baseR: 88, color: C_HALO },
          { delay: 0.09, baseR: 66, color: C_MID },
          { delay: 0.18, baseR: 44, color: C_INNER },
        ].map((wave, i) => (
          <Shockwave key={i} t={tSec} {...wave} />
        ))}

        {/* Confetti */}
        {DOTS.map((dot, i) => (
          <ConfettiDot key={i} t={tSec} dot={dot} />
        ))}

        {/* Concentric rings */}
        <div
          style={{
            width: 136,
            height: 136,
            borderRadius: "50%",
            backgroundColor: C_HALO,
            transform: `scale(${ring1})`,
            transformOrigin: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: ring1 > 0 ? 1 : 0,
          }}
        >
          <div
            style={{
              width: 104,
              height: 104,
              borderRadius: "50%",
              backgroundColor: C_MID,
              transform: `scale(${ring2})`,
              transformOrigin: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: ring2 > 0 ? 1 : 0,
            }}
          >
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: "50%",
                backgroundColor: C_INNER,
                transform: `scale(${ring3})`,
                transformOrigin: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: ring3 > 0 ? 1 : 0,
              }}
            >
              <AnimatedCheckmark size={36} progress={checkP} />
            </div>
          </div>
        </div>
      </div>

      <h1
        className="font-montserrat font-medium text-primary-blue text-[20px] lg:text-[18px] leading-[26px] text-center mt-[16px]"
        style={{
          opacity: titleP,
          transform: `translateY(${(1 - titleP) * 14}px)`,
        }}
      >
        Moment added to your calendar!
      </h1>
      <p
        className="font-montserrat text-primary-blue text-[14px] leading-[20px] text-center mt-[10px] max-w-[300px]"
        style={{
          opacity: titleP,
          transform: `translateY(${(1 - titleP) * 14}px)`,
        }}
      >
        We&apos;ll remind you when the moment arrives.
      </p>

      <div
        className="w-full max-w-[380px] flex flex-col gap-[12px] mt-[28px]"
        style={{
          opacity: buttonsP,
          transform: `translateY(${(1 - buttonsP) * 18}px)`,
        }}
      >
        <button
          type="button"
          onClick={onAddAnother}
          className="cursor-pointer w-full h-[46px] rounded-full bg-primary-orange text-white font-montserrat font-medium text-[16px] hover:brightness-[1.03]"
        >
          Add another Moment
        </button>
        <button
          type="button"
          onClick={onReturn}
          className="cursor-pointer w-full h-[46px] rounded-full border border-primary-blue text-primary-blue font-montserrat font-medium text-[16px] hover:bg-primary-blue/[0.03]"
        >
          Return to moments
        </button>
      </div>
    </div>
  );
}

function Shockwave({
  t,
  delay,
  baseR,
  color,
}: {
  t: number;
  delay: number;
  baseR: number;
  color: string;
}) {
  const size = baseR * 2;
  const rt = (t - delay) / 0.55;
  let opacity = 0;
  let scale = 0;
  if (rt > 0 && rt < 1) {
    const p = 1 - Math.pow(2, -10 * rt);
    scale = 1 + p * 1.6;
    const op = rt < 0.3 ? rt / 0.3 : 1 - (rt - 0.3) / 0.7;
    opacity = Math.max(0, op * 0.55);
  }
  return (
    <div
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: color,
        transform: `scale(${scale})`,
        opacity,
        pointerEvents: "none",
      }}
    />
  );
}

function ConfettiDot({
  t,
  dot,
}: {
  t: number;
  dot: (typeof DOTS)[number];
}) {
  const cosA = Math.cos(dot.angle);
  const sinA = Math.sin(dot.angle);
  const rimX = 60 * cosA;
  const rimY = 60 * sinA;

  const dt = t - 0.18 - dot.delay;
  let tx = rimX;
  let ty = rimY;
  let opacity = 0;
  if (dt > 0) {
    const dp = clamp01(dt / 1.0);
    const easeP = 1 - Math.pow(1 - dp, 3);
    const dist = dot.speed * easeP;
    const grav = 30 * dp * dp;
    tx = rimX + cosA * dist;
    ty = rimY + sinA * dist + grav;
    opacity = dp < 0.6 ? 1 : Math.max(0, 1 - (dp - 0.6) / 0.4);
  }

  return (
    <div
      style={{
        position: "absolute",
        width: dot.size,
        height: dot.size,
        borderRadius: "50%",
        backgroundColor: dot.color,
        transform: `translate(${tx}px, ${ty}px)`,
        opacity,
        pointerEvents: "none",
      }}
    />
  );
}

function AnimatedCheckmark({
  size,
  progress,
}: {
  size: number;
  progress: number;
}) {
  const PATH_LEN = 60;
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <path
        d="M14 30 L23 39 L44 17"
        stroke="#FFFFFF"
        strokeWidth={5.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={PATH_LEN}
        strokeDashoffset={PATH_LEN * (1 - progress)}
      />
    </svg>
  );
}
