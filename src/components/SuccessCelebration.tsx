"use client";

import { useEffect, useRef } from "react";

// Celebration animation used by the story/prompt/moment created screens.
// Based on the "Quiet develop" (4c) motion spec from the Figma animations
// deck: the horizontal rule draws from the left, the Lora title rises from
// behind it, a simple circle-badge fades/scales in and the check traces
// inside it. Two printed photos slide in from opposite corners and settle
// with a very slow drift. Respects prefers-reduced-motion by skipping all
// per-element animations and showing the final frame.

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const SPRING =
  "linear(0, 0.157 4.6%, 0.52 11%, 0.85 17.4%, 1.075 24%, 1.19 30.4%, 1.21 34.6%, 1.17 40.6%, 1.04 52%, 0.98 61%, 0.97 67%, 1.005 82%, 1)";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type Props = {
  /** Big centered headline, e.g. "Story Created!" / "Moment Added!". */
  title: string;
  /** Override the default title classes (font, weight, size). */
  titleClassName?: string;
  /** Override the children wrapper classes (margin / layout). */
  childrenClassName?: string;
  /** Rendered inside the fade-up footer row. Callers pass their own Done /
   *  Send so this component stays presentation-only. */
  children?: React.ReactNode;
  /** Deprecated — kept for existing callers (invite/onboarding) that pass a
   *  margin tweak for the old rings illustration. Ignored by the new layout. */
  titleMarginTop?: number;
  /** Deprecated — see titleMarginTop. */
  illustrationHeight?: number;
};

export default function SuccessCelebration({
  title,
  titleClassName,
  childrenClassName,
  children,
}: Props) {
  const p1 = useRef<HTMLDivElement | null>(null);
  const p2 = useRef<HTMLDivElement | null>(null);
  const ruleRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);
  const badge = useRef<SVGSVGElement | null>(null);
  const ring = useRef<SVGCircleElement | null>(null);
  const check = useRef<SVGPathElement | null>(null);
  const footer = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const animations: Animation[] = [];
    const animate = (
      el: Element,
      keyframes: Keyframe[],
      duration: number,
      delay = 0,
      opts: KeyframeAnimationOptions = {},
    ) => {
      const anim = el.animate(keyframes, {
        duration,
        delay,
        easing: EASE,
        fill: "both",
        ...opts,
      });
      animations.push(anim);
      return anim;
    };

    if (ruleRef.current) {
      ruleRef.current.style.transformOrigin = "left";
      animate(
        ruleRef.current,
        [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
        700,
        100,
        { easing: "cubic-bezier(0.65,0,0.35,1)" },
      );
    }

    if (titleRef.current) {
      animate(
        titleRef.current,
        [{ transform: "translateY(110%)" }, { transform: "translateY(0)" }],
        700,
        450,
      );
    }

    const traceStart = 600;
    if (badge.current) {
      animate(
        badge.current,
        [
          { transform: "scale(0.6)", opacity: 0 },
          { opacity: 1, offset: 0.3 },
          { transform: "scale(1)", opacity: 1 },
        ],
        720,
        traceStart,
        { easing: SPRING },
      );
    }
    if (ring.current) {
      animate(
        ring.current,
        [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
        520,
        traceStart + 120,
        { easing: "cubic-bezier(0.65,0,0.35,1)" },
      );
    }
    if (check.current) {
      animate(
        check.current,
        [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
        380,
        traceStart + 500,
        { easing: "cubic-bezier(0.65,0,0.35,1)" },
      );
    }

    const slideIn = (
      el: Element | null,
      x: number,
      y: number,
      rot: number,
      delay: number,
    ) => {
      if (!el) return;
      animate(
        el,
        [
          {
            transform: `translate(${x}px, ${y}px) rotate(${rot}deg)`,
            opacity: 0,
          },
          { opacity: 1, offset: 0.25 },
          { transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
        ],
        1000,
        delay,
        { easing: "cubic-bezier(0.22,1,0.36,1)" },
      );
    };
    slideIn(p1.current, -170, -40, -18, 1000);
    slideIn(p2.current, 170, 40, 18, 1150);

    if (footer.current) {
      animate(
        footer.current,
        [
          { opacity: 0, transform: "translateY(10px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        500,
        1100,
      );
    }

    const drift = (
      el: Element | null,
      base: number,
      dy: number,
      dr: number,
      duration: number,
      delay: number,
    ) => {
      if (!el) return;
      const anim = el.animate(
        [
          { transform: `rotate(${base}deg)` },
          { transform: `translateY(${dy}px) rotate(${base + dr}deg)` },
        ],
        {
          duration,
          delay,
          iterations: Infinity,
          direction: "alternate",
          easing: "ease-in-out",
        },
      );
      animations.push(anim);
    };
    drift(p1.current, -4, 6, 1.2, 3200, 2200);
    drift(p2.current, 4, -5, -1, 3600, 2400);

    return () => {
      animations.forEach((a) => a.cancel());
    };
  }, []);

  return (
    <div className="relative w-full min-h-[480px] md:min-h-[520px] flex flex-col items-center justify-center overflow-hidden">
      {/* Print 1 — upper-left */}
      <div
        ref={p1}
        className="pointer-events-none absolute"
        style={{
          left: "4%",
          top: "6%",
          width: "180px",
          transform: "rotate(-4deg)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/moments/print-valley.png"
          alt=""
          className="block w-full h-auto"
        />
      </div>

      {/* Print 2 — lower-right */}
      <div
        ref={p2}
        className="pointer-events-none absolute"
        style={{
          right: "4%",
          bottom: "8%",
          width: "180px",
          transform: "rotate(4deg)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/moments/print-boat.png"
          alt=""
          className="block w-full h-auto"
        />
      </div>

      <div className="relative z-10 flex flex-col items-center px-[24px] w-full">
        <svg
          ref={badge}
          width={48}
          height={48}
          viewBox="0 0 48 48"
          fill="none"
          style={{
            transformBox: "fill-box",
            transformOrigin: "center",
            overflow: "visible",
          }}
          aria-hidden
        >
          <circle
            ref={ring}
            cx={24}
            cy={24}
            r={23.1818}
            stroke="#000000"
            strokeWidth={1.63636}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1}
          />
          <path
            ref={check}
            d="M16 24.5 L21.5 30 L32 19.5"
            stroke="#000000"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1}
          />
        </svg>

        <div
          className="overflow-hidden px-[4px] pb-[6px]"
          style={{ marginTop: 22 }}
        >
          <h2
            ref={titleRef}
            className={
              titleClassName ??
              "font-ivy font-normal text-[#323232] text-[28px] md:text-[33px] leading-[1.15] text-center whitespace-nowrap"
            }
          >
            {title}
          </h2>
        </div>

        <div
          ref={ruleRef}
          className="mt-[12px] w-[280px] md:w-[320px] bg-[#C8C8C8]"
          style={{ height: "1.5px" }}
        />

        {children && (
          <div
            ref={footer}
            className={childrenClassName ?? "w-full max-w-[380px] mt-[28px]"}
            style={{ opacity: 0 }}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
