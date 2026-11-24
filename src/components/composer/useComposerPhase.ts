"use client";

import { useCallback, useMemo, useState } from "react";

// Phase state machine for the single-screen composer. Mirrors the mobile
// prototype's 5-phase flow — one screen, each element animates between
// phases based on shared values (ring Y / scale, pill Y / X, layer
// opacities, cascade delays). This hook owns the phase; the component
// renders the right chrome based on `derived`.
//
// Transitions (user actions):
//   idle          → recording   (tap mic)
//   idle          → compose     (tap text — skip recording)
//   recording     → paused      (tap pause)
//   paused        → recording   (tap resume)
//   recording     → compose     (tap continue — stops and keeps audio)
//   paused        → compose     (tap continue)
//   recording     → idle        (tap trash — discards audio)
//   paused        → idle        (tap trash)
//   compose       → recording   (tap mic again — append more audio)
//   compose       → preview     (tap preview)
//   preview       → compose     (tap back)

export type ComposerPhase =
  | "idle"
  | "recording"
  | "paused"
  | "compose"
  | "preview";

// Geometry + timing constants ported from the mobile prototype
// (see `Recording flow prototype (1)/Recording Flow v3.dc.html`).
//
// These describe a 390×844 reference canvas. Components scale them to
// their actual viewport when they pin elements with `top` / `left` CSS.
export const COMPOSER_GEOMETRY = {
  RING_Y_IDLE: 400,
  RING_Y_ACTIVE: 740,
  RING_Y_COMPOSE: 692,
  RING_SCALE_IDLE: 0.8,
  RING_SCALE_ACTIVE: 0.46,
  /** Pills stay at y=740 during idle AND active — only the ring descends
   *  to meet them. On compose both ring and pills move up 48px together. */
  PILLS_Y_IDLE: 740,
  PILLS_Y_ACTIVE: 740,
  PILLS_Y_COMPOSE: 692,
  /** Horizontal pill positions (centers), 4 pills.
   *  Clustered around the ring at idle, spread wide while recording. */
  PILL_XS_IDLE: [62, 146, 244, 328] as const,
  PILL_XS_ACTIVE: [40, 104, 286, 350] as const,
  /** Morph durations. Container scale + Y moves share the long easing;
   *  layer opacity fades are a touch quicker. */
  MORPH_MS: 640,
  LAYER_FADE_MS: 320,
  /** Cascade delays for the recording-state body elements (status row with
   *  the timer + trash + continue arrow). The mobile spec delays these on
   *  enter so they appear after the ring has started its morph. */
  STATUS_ENTER_DELAY_MS: 380,
  STATUS_FADE_MS: 520,
  /** Compose-phase cascade delays. Tightened from the original 520ms to
   *  180-280ms because the modal-close → compose transition felt sluggish
   *  on mobile. Audio pill appears first, transcript, then text block. */
  COMPOSE_AUDIO_DELAY_MS: 180,
  COMPOSE_TRANSCRIPT_DELAY_MS: 280,
  COMPOSE_TEXT_DELAY_MS: 200,
  COMPOSE_PREVIEW_BTN_DELAY_MS: 360,
  /** Preview layer slides in 48px from the right over 520ms. */
  PREVIEW_SLIDE_MS: 520,
  PREVIEW_OPACITY_DELAY_MS: 120,
  EASING: "cubic-bezier(0.22, 1, 0.36, 1)",
} as const;

export type ComposerDerived = {
  /** Convenience booleans — cheaper to read in JSX than string equality. */
  isIdle: boolean;
  isActive: boolean; // recording OR paused
  isRecording: boolean;
  isPaused: boolean;
  isCompose: boolean;
  isPreview: boolean;
  /** The Y position (in reference canvas pixels) where the ring center
   *  should sit for this phase. */
  ringY: number;
  /** The scale the ring container should render at for this phase. */
  ringScale: number;
  /** The Y position for the pill row. */
  pillsY: number;
  /** The X positions (in reference canvas pixels) for the four pills. */
  pillXs: readonly [number, number, number, number];
  /** Opacity / pointer-events values for each stacked layer. Consumers
   *  wire these to their own motion.div styles. */
  idleLayerOpacity: 0 | 1;
  recordLayerOpacity: 0 | 1;
  composeLayerOpacity: 0 | 1;
  previewLayerOpacity: 0 | 1;
};

export type ComposerPhaseController = {
  phase: ComposerPhase;
  /** Previous phase, useful for cascade delay logic. */
  previousPhase: ComposerPhase | null;
  derived: ComposerDerived;
  /** User actions. These all no-op when the transition isn't valid for the
   *  current phase (e.g. pause when idle) so callers don't need to guard. */
  startRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  /** Stop recording OR exit a paused state — audio is kept, we move to the
   *  compose layer. Also used from compose when the user wants to review
   *  what they captured. */
  stopRecording: () => void;
  /** Tap the text pill — skip recording entirely and open compose with an
   *  empty text block. */
  skipToCompose: () => void;
  /** Trash the current audio (if any) and return to idle. */
  reset: () => void;
  goToPreview: () => void;
  backToCompose: () => void;
};

const toDerived = (phase: ComposerPhase): ComposerDerived => {
  const isIdle = phase === "idle";
  const isRecording = phase === "recording";
  const isPaused = phase === "paused";
  const isActive = isRecording || isPaused;
  const isCompose = phase === "compose";
  const isPreview = phase === "preview";

  const G = COMPOSER_GEOMETRY;
  const ringY = isIdle
    ? G.RING_Y_IDLE
    : isCompose || isPreview
      ? G.RING_Y_COMPOSE
      : G.RING_Y_ACTIVE;
  const ringScale = isIdle ? G.RING_SCALE_IDLE : G.RING_SCALE_ACTIVE;
  const pillsY = isCompose || isPreview ? G.PILLS_Y_COMPOSE : G.PILLS_Y_IDLE;
  const pillXs = isIdle ? G.PILL_XS_IDLE : G.PILL_XS_ACTIVE;

  return {
    isIdle,
    isActive,
    isRecording,
    isPaused,
    isCompose,
    isPreview,
    ringY,
    ringScale,
    pillsY,
    pillXs,
    idleLayerOpacity: isIdle ? 1 : 0,
    recordLayerOpacity: isActive ? 1 : 0,
    composeLayerOpacity: isCompose ? 1 : 0,
    previewLayerOpacity: isPreview ? 1 : 0,
  };
};

export function useComposerPhase(
  initial: ComposerPhase = "idle",
): ComposerPhaseController {
  const [phase, setPhase] = useState<ComposerPhase>(initial);
  const [previousPhase, setPreviousPhase] = useState<ComposerPhase | null>(null);

  const transition = useCallback(
    (next: ComposerPhase) => {
      setPhase((cur) => {
        if (cur === next) return cur;
        setPreviousPhase(cur);
        return next;
      });
    },
    [],
  );

  const startRecording = useCallback(() => {
    setPhase((cur) => {
      if (cur === "recording") return cur;
      setPreviousPhase(cur);
      return "recording";
    });
  }, []);

  const pauseRecording = useCallback(() => {
    setPhase((cur) => {
      if (cur !== "recording") return cur;
      setPreviousPhase(cur);
      return "paused";
    });
  }, []);

  const resumeRecording = useCallback(() => {
    setPhase((cur) => {
      if (cur !== "paused") return cur;
      setPreviousPhase(cur);
      return "recording";
    });
  }, []);

  const stopRecording = useCallback(() => transition("compose"), [transition]);
  const skipToCompose = useCallback(() => transition("compose"), [transition]);
  const reset = useCallback(() => transition("idle"), [transition]);
  const goToPreview = useCallback(() => transition("preview"), [transition]);
  const backToCompose = useCallback(() => transition("compose"), [transition]);

  const derived = useMemo(() => toDerived(phase), [phase]);

  return {
    phase,
    previousPhase,
    derived,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    skipToCompose,
    reset,
    goToPreview,
    backToCompose,
  };
}
