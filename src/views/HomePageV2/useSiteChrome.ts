"use client";

import { useEffect, useLayoutEffect, type RefObject } from "react";

// Shared animation + chrome wiring for hp2 pages. Runs under a layout effect
// so DOM mutations (class toggles, split-word spans) land before paint,
// matching the inline <script> in the original HTML. Each page calls this
// with its root ref and can register extra page-specific scripts via the
// `extra` callback. The extra callback receives the resolved root element
// and a cleanup list it can push teardown functions onto.
//
// What's shared here: motion class, split-word heading reveal, grouped
// scroll-reveal, mobile menu drawer, smooth in-page anchor scroll.
// Page-specific scripts (hero video, parallax, form draw-lines, etc.)
// belong in the `extra` callback, not here.

type Extra = (root: HTMLElement, cleanups: Array<() => void>) => void;

type Options = {
  // Groups ported verbatim from the designer's HTML. Pages can pass their own
  // list; any element outside the root is ignored by the querySelectorAll.
  revealGroups?: Array<[selector: string, step?: number, base?: number]>;
  revealMarks?: Array<[selector: string, cls?: string, step?: number]>;
  // Per-element starting delays (matches ph/dc overrides in the HTML)
  revealOverrides?: Array<[selector: string, delay: string]>;
  // Page-specific effects to run after chrome setup
  extra?: Extra;
};

export function useSiteChrome<T extends HTMLElement = HTMLDivElement>(
  rootRef: RefObject<T | null>,
  options: Options = {},
) {
  const useIsoLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect;
  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // The .motion flag is set on <html> by the pre-paint script in app/layout.tsx
    // (mirrors the designer's HTML) so baseline-hidden styles apply before first
    // paint. We still need the reduceMotion check here to gate the JS-driven
    // setup (word split, IO wiring, mobile drawer word mask).
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const cleanups: Array<() => void> = [];

    // ---------- Word-split heading reveal + grouped scroll-reveal ----------
    if (!reduceMotion) {
      function split(el: HTMLElement) {
        const nodes = Array.from(el.childNodes);
        el.setAttribute(
          "aria-label",
          (el.textContent || "").replace(/\s+/g, " ").trim(),
        );
        let i = 0;
        nodes.forEach((n) => {
          if (n.nodeType !== 3) return;
          const frag = document.createDocumentFragment();
          (n.textContent || "").split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(" "));
              return;
            }
            const w = document.createElement("span");
            w.className = "w";
            w.setAttribute("aria-hidden", "true");
            const inner = document.createElement("span");
            inner.textContent = part;
            inner.style.setProperty("--i", String(i++));
            w.appendChild(inner);
            frag.appendChild(w);
          });
          el.replaceChild(frag, n);
        });
        el.classList.add("split");
      }
      root
        .querySelectorAll<HTMLElement>(
          "section h1, section h2, .statement p",
        )
        .forEach(split);

      const mark = (sel: string, cls = "reveal", step = 0) => {
        root.querySelectorAll<HTMLElement>(sel).forEach((el, idx) => {
          el.classList.add(cls);
          if (step) el.style.setProperty("--d", idx * step + "ms");
        });
      };
      const group = (
        parentSel: string,
        childSel: string,
        step: number,
        base = 0,
      ) => {
        root.querySelectorAll<HTMLElement>(parentSel).forEach((p) => {
          p.querySelectorAll<HTMLElement>(childSel).forEach((el, idx) => {
            el.classList.add("reveal");
            el.style.setProperty("--d", base + idx * step + "ms");
          });
        });
      };
      (options.revealGroups ?? []).forEach(([sel, step = 0, base = 0]) => {
        const parts = sel.split("|");
        if (parts.length === 2) group(parts[0], parts[1], step, base);
      });
      (options.revealMarks ?? []).forEach(([sel, cls = "reveal", step = 0]) => {
        mark(sel, cls, step);
      });
      (options.revealOverrides ?? []).forEach(([sel, d]) => {
        const el = root.querySelector<HTMLElement>(sel);
        if (el) el.style.setProperty("--d", d);
      });

      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("in");
              io.unobserve(e.target);
            }
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0 },
      );
      root
        .querySelectorAll<HTMLElement>(
          ".reveal, .reveal-fade, .reveal-soft, .split, .draw-lines",
        )
        .forEach((el) => {
          if (el.closest(".hero")) return;
          io.observe(el);
        });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          root
            .querySelectorAll<HTMLElement>(".hero .split, .hero .reveal")
            .forEach((el) => el.classList.add("in"));
        });
      });
      cleanups.push(() => io.disconnect());
    }

    // ---------- Mobile menu: slide-in drawer ----------
    (function mobileMenu() {
      const btn = root.querySelector<HTMLButtonElement>(".menu-toggle");
      const menu = root.querySelector<HTMLElement>("#mobile-menu");
      if (!btn || !menu) return;
      const panel = menu.querySelector<HTMLElement>(".mobile-menu-panel");
      const list = menu.querySelector<HTMLElement>("nav");
      if (!panel || !list) return;
      const animate = document.documentElement.classList.contains("motion");
      if (animate) {
        list.querySelectorAll<HTMLAnchorElement>("a").forEach((a, i) => {
          const label = (a.textContent || "").trim();
          a.setAttribute("aria-label", label);
          a.innerHTML = `<span class="w" aria-hidden="true"><span>${label}</span></span>`;
          a.style.setProperty("--d", 180 + i * 80 + "ms");
        });
      }
      let timer: ReturnType<typeof setTimeout> | null = null;
      let revealTimer: ReturnType<typeof setTimeout> | null = null;
      function focusables() {
        return Array.from(panel!.querySelectorAll<HTMLElement>("a,button"));
      }
      function open(e?: MouseEvent) {
        const byKeyboard = e?.detail === 0;
        if (timer) clearTimeout(timer);
        menu!.classList.remove("is-closing");
        menu!.hidden = false;
        root!.classList.add("menu-open");
        if (!reduceMotion) {
          menu!.classList.add("is-opening");
          requestAnimationFrame(() => {
            requestAnimationFrame(() => menu!.classList.remove("is-opening"));
          });
        }
        btn!.setAttribute("aria-expanded", "true");
        if (byKeyboard) {
          const first = panel!.querySelector<HTMLElement>("nav a");
          if (first) first.focus({ preventScroll: true });
        } else {
          panel!.focus({ preventScroll: true });
        }
        if (animate) {
          if (revealTimer) clearTimeout(revealTimer);
          list!.classList.remove("in");
          void list!.offsetWidth;
          revealTimer = setTimeout(() => list!.classList.add("in"), 20);
        }
      }
      function close(returnFocus: boolean) {
        if (menu!.hidden) return;
        btn!.setAttribute("aria-expanded", "false");
        root!.classList.remove("menu-open");
        if (reduceMotion) {
          menu!.hidden = true;
        } else {
          menu!.classList.add("is-closing");
          timer = setTimeout(() => {
            menu!.hidden = true;
            menu!.classList.remove("is-closing");
            if (animate) list!.classList.remove("in");
          }, 380);
        }
        if (returnFocus) btn!.focus({ preventScroll: true });
      }
      const onBtn = (e: MouseEvent) => open(e);
      btn.addEventListener("click", onBtn);
      const onMenuClick = (e: Event) => {
        const t = e.target as HTMLElement;
        if (t.closest("[data-close]")) close(true);
        else if (t.closest("nav a")) close(false);
      };
      menu.addEventListener("click", onMenuClick);
      const onKey = (e: KeyboardEvent) => {
        if (menu.hidden) return;
        if (e.key === "Escape") {
          close(true);
          return;
        }
        if (e.key === "Tab") {
          const f = focusables();
          const first = f[0];
          const last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };
      document.addEventListener("keydown", onKey);
      const mq = window.matchMedia("(min-width:769px)");
      const onMq = (m: MediaQueryListEvent) => {
        if (m.matches) close(false);
      };
      mq.addEventListener("change", onMq);
      cleanups.push(() => {
        btn.removeEventListener("click", onBtn);
        menu.removeEventListener("click", onMenuClick);
        document.removeEventListener("keydown", onKey);
        mq.removeEventListener("change", onMq);
        if (timer) clearTimeout(timer);
        if (revealTimer) clearTimeout(revealTimer);
      });
    })();

    // ---------- Smooth in-page anchor scroll ----------
    (function smoothScroll() {
      if (reduceMotion) return;
      const SCROLL = { base: 900, perPixel: 0.12, max: 1800 };
      function scrollTo(y: number) {
        const start = window.scrollY;
        const dist = y - start;
        if (Math.abs(dist) < 2) {
          window.scrollTo(0, y);
          return;
        }
        const dur = Math.min(
          SCROLL.max,
          SCROLL.base + Math.abs(dist) * SCROLL.perPixel,
        );
        let t0: number | null = null;
        let stop = false;
        const cancel = () => {
          stop = true;
        };
        (["wheel", "touchstart", "keydown"] as const).forEach((ev) =>
          window.addEventListener(ev, cancel, { once: true, passive: true }),
        );
        function ease(p: number) {
          return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        }
        function step(ts: number) {
          if (stop) return;
          if (t0 === null) t0 = ts;
          const p = Math.min(1, (ts - t0) / dur);
          window.scrollTo(0, start + dist * ease(p));
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      }
      const onClick = (e: MouseEvent) => {
        const a = (e.target as HTMLElement)?.closest?.(
          'a[href^="#"]',
        ) as HTMLAnchorElement | null;
        if (
          !a ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          a.getAttribute("href") === "#"
        )
          return;
        const href = a.getAttribute("href") || "";
        const id = href.slice(1);
        if (!id) return;
        const el = root.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
        if (!el) return;
        e.preventDefault();
        const y = Math.min(
          el.getBoundingClientRect().top + window.scrollY,
          document.documentElement.scrollHeight - window.innerHeight,
        );
        scrollTo(Math.max(0, y));
        try {
          history.pushState(null, "", "#" + id);
        } catch {
          // ignore
        }
      };
      root.addEventListener("click", onClick);
      cleanups.push(() => root.removeEventListener("click", onClick));
    })();

    // ---------- Page-specific scripts ----------
    try {
      options.extra?.(root, cleanups);
    } catch {
      // ignore
    }

    return () => {
      cleanups.forEach((f) => {
        try {
          f();
        } catch {
          // ignore
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
