"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import type { Moment } from "../../../../../types/moment";
import ShareMomentSheet from "../ShareMomentSheet";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const SPRING =
  "linear(0, 0.157 4.6%, 0.52 11%, 0.85 17.4%, 1.075 24%, 1.19 30.4%, 1.21 34.6%, 1.17 40.6%, 1.04 52%, 0.98 61%, 0.97 67%, 1.005 82%, 1)";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function StepCelebration({
  onAddAnother,
  moment,
}: {
  onAddAnother: () => void;
  moment: Moment | null;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const p1 = useRef<HTMLDivElement | null>(null);
  const p2 = useRef<HTMLDivElement | null>(null);
  const rule = useRef<HTMLDivElement | null>(null);
  const title = useRef<HTMLDivElement | null>(null);
  const badge = useRef<SVGSVGElement | null>(null);
  const ring = useRef<SVGCircleElement | null>(null);
  const check = useRef<SVGPathElement | null>(null);
  const buttons = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const nodes = [
      p1.current, p2.current, rule.current, title.current,
      badge.current, ring.current, check.current, buttons.current,
    ].filter(Boolean) as Array<HTMLElement | SVGElement>;

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

    // Rule — scaleX from left (100ms, 700ms)
    if (rule.current) {
      rule.current.style.transformOrigin = "left";
      animate(
        rule.current,
        [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
        700,
        100,
        { easing: "cubic-bezier(0.65,0,0.35,1)" },
      );
    }

    // Title — slide up from behind the rule (450ms, 700ms)
    if (title.current) {
      animate(
        title.current,
        [{ transform: "translateY(110%)" }, { transform: "translateY(0)" }],
        700,
        450,
      );
    }

    // Badge: fade/scale the circle in, then trace the ring outline, then draw the check
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

    // Prints slide in — p1 from upper-left, p2 from lower-right (1000/1150ms)
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
          { transform: "translate(0, 0) rotate(var(--rot, 0deg))", opacity: 1 },
        ],
        1000,
        delay,
        { easing: "cubic-bezier(0.22,1,0.36,1)" },
      );
    };
    slideIn(p1.current, -170, -40, -18, 1000);
    slideIn(p2.current, 170, 40, 18, 1150);

    // Buttons fade up (1100ms)
    if (buttons.current) {
      animate(
        buttons.current,
        [
          { opacity: 0, transform: "translateY(10px)" },
          { opacity: 1, transform: "none" },
        ],
        500,
        1100,
      );
    }

    // Gentle drift on prints after settle (looped)
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
      void nodes;
    };
  }, []);

  return (
    <div className="relative w-full min-h-[560px] md:min-h-[600px] flex flex-col items-center justify-center overflow-hidden">
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

      {/* Center stack */}
      <div className="relative z-10 flex flex-col items-center px-[24px]">
        <svg
          ref={badge}
          width={48}
          height={48}
          viewBox="0 0 48 48"
          fill="none"
          style={{ transformBox: "fill-box", transformOrigin: "center", overflow: "visible" }}
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
          <div
            ref={title}
            className="font-ivy font-normal text-[#323232] text-[28px] md:text-[33px] leading-[1.15] text-center whitespace-nowrap"
          >
            Moment Added!
          </div>
        </div>

        <div
          ref={rule}
          className="mt-[12px] w-[280px] md:w-[320px] bg-[#C8C8C8]"
          style={{ height: "1.5px" }}
        />

        <div
          ref={buttons}
          className="mt-[28px] flex flex-col gap-[10px] w-full max-w-[280px]"
          style={{ opacity: 0 }}
        >
          <button
            type="button"
            onClick={onAddAnother}
            className="cursor-pointer w-full h-[44px] rounded-full bg-primary-orange text-white font-montserrat font-medium text-[15px] hover:opacity-90 transition-opacity"
          >
            Add another moment
          </button>
          <button
            type="button"
            onClick={() => {
              if (!moment) {
                toast("Moment not ready yet");
                return;
              }
              setShareOpen(true);
            }}
            className="cursor-pointer w-full h-[44px] rounded-full border-[1.5px] border-[#2c2c2c] text-[#323232] font-montserrat font-medium text-[15px] hover:bg-black/[0.03] transition-colors"
          >
            Share moment
          </button>
        </div>
      </div>

      <ShareMomentSheet
        open={shareOpen}
        moment={moment}
        onClose={() => setShareOpen(false)}
      />
    </div>
  );
}
