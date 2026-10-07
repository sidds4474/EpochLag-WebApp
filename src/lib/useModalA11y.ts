"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
  "select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

// The most recent element focused *outside* any dialog. We can't simply read
// `document.activeElement` when a pop-up opens: panels with an `autoFocus`
// field have already moved focus inside themselves by the time our effect
// runs, so the "opener" would be the field about to unmount and focus would
// fall to <body> on close. A global focusin listener sidesteps that.
let lastFocusedOutside: HTMLElement | null = null;
let listening = false;
function ensureListener() {
  if (listening || typeof document === "undefined") return;
  listening = true;
  document.addEventListener(
    "focusin",
    (e) => {
      const t = e.target as HTMLElement | null;
      if (t && !t.closest('[role="dialog"], [aria-modal="true"]')) {
        lastFocusedOutside = t;
      }
    },
    true
  );
}
// Install at module load, not on first use — otherwise the click that opens
// the very first pop-up of a session happens before we're listening, and
// that pop-up has no opener to return focus to.
ensureListener();

/**
 * Baseline keyboard behaviour every modal / sheet in the app should share:
 *   - Escape closes it
 *   - Tab / Shift+Tab stay inside it (focus trap)
 *   - focus moves into it on open and returns to the opener on close
 *
 * Several pop-ups had none of this: Escape did nothing on the Date, Music
 * and Tag People pickers, and tabbing walked straight out of the Music, Tag
 * People and Cover pop-ups into the page behind. Attach the ref to the
 * pop-up's root element. The element is resolved lazily so panels that
 * mount a frame after `open` flips (e.g. ones that animate in) still work.
 */
export function useModalA11y(
  open: boolean,
  onClose: () => void,
  containerRef: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    if (!open) return;
    ensureListener();
    // Prefer the tracked outside element; fall back to whatever is focused
    // right now provided it isn't already inside the panel.
    const opener =
      lastFocusedOutside ??
      (() => {
        const a = document.activeElement as HTMLElement | null;
        const r = containerRef.current;
        return a && a !== document.body && !(r && r.contains(a)) ? a : null;
      })();

    const root = () => containerRef.current;
    const focusables = () => {
      const r = root();
      return r
        ? Array.from(r.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
            (el) => el.offsetParent !== null || el === document.activeElement
          )
        : [];
    };

    // Move focus inside on the next frame (late-mounting panels), unless
    // something inside already has it (an autoFocus'd search field).
    const raf = requestAnimationFrame(() => {
      const r = root();
      if (r && !r.contains(document.activeElement)) {
        (focusables()[0] ?? r).focus({ preventScroll: true });
      }
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const r = root();
      if (!r) return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        r.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const inside = !!active && r.contains(active);
      if (e.shiftKey && (active === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown);
      if (opener && opener.isConnected) {
        opener.focus({ preventScroll: true });
      }
    };
  }, [open, onClose, containerRef]);
}
