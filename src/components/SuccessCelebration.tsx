"use client";

import { useEffect, useRef, useState } from "react";

// Single-clock celebration animation used by the story/prompt/moment created
// screens. One requestAnimationFrame loop drives everything (rings scale in,
// checkmark strokes, shockwaves ripple, 12 confetti dots ballistic-arc out,
// title + button row fade up). Formulas compute per-frame state off a shared
// `tSec` clock — no per-element rAF loops.

const C_HALO = "#F5D4A0";
const C_MID = "#D97B3A";
const C_INNER = "#C1553A";
const DOT_COLORS = ["#E8973A", "#F0B060", "#C1553A", "#F5D4A0"];

// 12 deterministic confetti dots. Angle, speed, size, delay, color are
// seeded from the index so the animation is identical on every mount.
const DOT_COUNT = 12;
const DOTS = Array.from({ length: DOT_COUNT }, (_, i) => ({
  angle: (i / DOT_COUNT) * Math.PI * 2 + ((i % 3) - 1) * 0.3,
  speed: 90 + ((i * 17) % 110),
  size: 6 + ((i * 7) % 14),
  color: DOT_COLORS[i % DOT_COLORS.length],
  delay: 0.08 + i * 0.01,
}));

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

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
// easeOutBack — slight overshoot past 1 so rings pop instead of settling flat.
const easeOutBack = (t: number, s = 1.7) =>
  1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);

type Props = {
  /** Big centered headline, e.g. "Story Created!" / "Prompt Created!". */
  title: string;
  /** Override the default title classes (font weight, size, etc.). */
  titleClassName?: string;
  /** Override the default top margin (px) between illustration and title. */
  titleMarginTop?: number;
  /** Override the default children wrapper classes (spacing above, etc.). */
  childrenClassName?: string;
  /** Scale the illustration to this height (px). Defaults to 315 (native). */
  illustrationHeight?: number;
  /** Rendered inside the fade-up button row. Callers pass their own
   *  Done / Send / etc. so this component stays presentation-only. */
  children?: React.ReactNode;
};

export default function SuccessCelebration({ title, titleClassName, titleMarginTop, childrenClassName, illustrationHeight, children }: Props) {
  const [tSec, setTSec] = useState(0);
  const [mounted, setMounted] = useState(false);
  const startRef = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    // Reduced-motion: skip straight to final frame. No confetti / shockwaves.
    if (typeof window !== "undefined") {
      reducedMotionRef.current = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
    }
    if (reducedMotionRef.current) {
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

  if (!mounted) return null;

  const tMs = tSec * 1000;

  const ringScale = (delayMs: number) => {
    const p = clamp01((tMs - delayMs) / RING_DUR);
    return easeOutBack(p);
  };
  const ring1 = ringScale(RING_1_DELAY);
  const ring2 = ringScale(RING_2_DELAY);
  const ring3 = ringScale(RING_3_DELAY);
  const checkP = easeOutCubic(clamp01((tMs - CHECK_DELAY) / CHECK_DUR));
  const titleP = easeOutCubic(clamp01((tMs - TITLE_DELAY) / TITLE_DUR));
  const buttonsP = easeOutCubic(clamp01((tMs - BUTTONS_DELAY) / BUTTONS_DUR));

  const scale = illustrationHeight ? illustrationHeight / 315 : 1;

  return (
    <div className="w-full flex flex-col items-center">
      {/* Outer box is the *scaled* layout size so surrounding elements sit at
          the right offset. Inner box stays at native 325×315 so the animation
          math (baseR, dot positions, check size) all keep working; we scale
          it once via CSS transform. `will-change` promotes the scaled inner
          into its own compositor layer so per-frame child paints don't churn
          the parent flow. */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: 325 * scale,
          height: 315 * scale,
          marginBottom: -40 * scale,
        }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            width: 325,
            height: 315,
            left: "50%",
            top: "50%",
            transform: `translate(-50%, -50%) scale(${scale})`,
            transformOrigin: "center",
            willChange: scale === 1 ? undefined : "transform",
          }}
        >
        {/* Shockwaves — three rings pulse outward, formulas read t directly */}
        {[
          { delay: 0.0, baseR: 88, color: C_HALO },
          { delay: 0.09, baseR: 66, color: C_MID },
          { delay: 0.18, baseR: 44, color: C_INNER },
        ].map((w, i) => (
          <Shockwave key={i} t={tSec} delay={w.delay} baseR={w.baseR} color={w.color} />
        ))}

        {/* Confetti — 12 dots, each computes its own position off t */}
        {DOTS.map((dot, i) => (
          <ConfettiDot key={i} t={tSec} dot={dot} />
        ))}

        {/* Concentric rings — nested so parent scale hides children until it grows */}
        <div
          style={{
            width: 116,
            height: 116,
            borderRadius: "50%",
            backgroundColor: C_HALO,
            transformOrigin: "center",
            transform: `scale(${ring1})`,
            opacity: ring1 > 0 ? 1 : 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              backgroundColor: C_MID,
              transformOrigin: "center",
              transform: `scale(${ring2})`,
              opacity: ring2 > 0 ? 1 : 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                backgroundColor: C_INNER,
                transformOrigin: "center",
                transform: `scale(${ring3})`,
                opacity: ring3 > 0 ? 1 : 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AnimatedCheckmark size={34} progress={checkP} />
            </div>
          </div>
        </div>
        </div>
      </div>

      <h2
        className={titleClassName ?? "font-montserrat font-bold text-primary-blue text-[28px] leading-tight text-center"}
        style={{
          marginTop: titleMarginTop ?? 40,
          opacity: titleP,
          transform: `translateY(${(1 - titleP) * 14}px)`,
        }}
      >
        {title}
      </h2>

      {children && (
        <div
          className={childrenClassName ?? "w-full mt-[36px]"}
          style={{
            opacity: buttonsP,
            transform: `translateY(${(1 - buttonsP) * 18}px)`,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// Shockwave ring — 550ms lifetime, expands to 2.6x, opacity ramps up in the
// first 30% then fades out over the remaining 70%. Runs three times with
// different delays + colors for a layered pulse.
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
      aria-hidden
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

// One confetti dot — starts on a 60px rim, flies outward with ease-out cubic,
// gains fake gravity (quadratic in dp), holds full opacity for 60% of life
// then fades out over the last 40%.
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
      aria-hidden
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

// Draws the checkmark stroke left-to-right using SVG stroke-dash. PATH_LEN
// is a hand-tuned overshoot of the actual path length so the endpoint fully
// completes at progress=1 even after easing.
function AnimatedCheckmark({ size, progress }: { size: number; progress: number }) {
  const PATH_LEN = 60;
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden>
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
