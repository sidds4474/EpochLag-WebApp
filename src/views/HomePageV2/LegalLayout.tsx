"use client";

import { Children, useRef } from "react";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import { useSiteChrome } from "./useSiteChrome";
import "./HomePage.css";

// Shared layout for Privacy Policy, Terms of Service, and Child Safety Policy.
// Dark hero band + sticky TOC + body sections, matching the designer's HTML.
// Legal pages share animations: intro and TOC fade-soft in, each body section's
// children stagger in at 120 + 60n ms, and the TOC tracks the current section
// via IntersectionObserver with -20% / -70% rootMargin.

export type LegalTocItem = { id: string; label: string };
export type LegalSection = { id: string; title: string; body: React.ReactNode };

// Dedicated component so each section's body (often a Fragment with several
// children) is rendered through React.Children.toArray, which auto-assigns
// keys to the flattened children and silences React's dev-mode key validator.
function LegalSectionBlock({ section }: { section: LegalSection }) {
  return (
    <section id={section.id}>
      <h2>{section.title}</h2>
      {Children.toArray(section.body)}
    </section>
  );
}

type Props = {
  title: string;
  lastUpdated: string;
  intro: React.ReactNode;
  toc: LegalTocItem[];
  sections: LegalSection[];
  // "default" | "short" (Child Safety) | "compact" (Terms)
  variant?: "default" | "short" | "compact";
  // Rows for the tablet TOC grid (needs to match item count / 2 columns)
  tocRows?: 2 | 5 | 10;
  // "wide" intro paragraph (used by Terms)
  wideIntro?: boolean;
};

export default function LegalLayout({
  title,
  lastUpdated,
  intro,
  toc,
  sections,
  variant = "default",
  tocRows,
  wideIntro = false,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useSiteChrome(rootRef, {
    extra: (root, cleanups) => {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      // ---------- Soft reveals for intro / TOC / body ----------
      if (!reduceMotion) {
        root
          .querySelectorAll<HTMLElement>(".legal-intro > *")
          .forEach((el) => el.classList.add("reveal-soft"));
        const toc = root.querySelector<HTMLElement>(".legal-toc");
        if (toc) toc.classList.add("reveal-soft");
        root.querySelectorAll<HTMLElement>(".legal-body section").forEach((s) => {
          Array.from(s.children)
            .filter((c) => c.tagName !== "H2")
            .forEach((c, i) => {
              (c as HTMLElement).classList.add("reveal-soft");
              (c as HTMLElement).style.setProperty("--d", 120 + i * 60 + "ms");
            });
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
          .querySelectorAll<HTMLElement>(".reveal-soft")
          .forEach((el) => io.observe(el));
        cleanups.push(() => io.disconnect());
      }

      // ---------- TOC active section tracking ----------
      (function toc() {
        const links = Array.from(
          root.querySelectorAll<HTMLAnchorElement>(".legal-toc a"),
        );
        if (!links.length) return;
        const map = new Map<string, HTMLAnchorElement>();
        links.forEach((a) => {
          const id = a.getAttribute("href")?.slice(1);
          if (id) map.set(id, a);
        });
        let lockUntil = 0;
        const io = new IntersectionObserver(
          (entries) => {
            if (Date.now() < lockUntil) return;
            entries.forEach((e) => {
              if (e.isIntersecting) {
                links.forEach((a) => a.removeAttribute("aria-current"));
                const a = map.get(e.target.id);
                if (a) a.setAttribute("aria-current", "true");
              }
            });
          },
          { rootMargin: "-20% 0px -70% 0px" },
        );
        map.forEach((_a, id) => {
          const s = root.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
          if (s) io.observe(s);
        });
        const onClick: Array<[HTMLAnchorElement, () => void]> = [];
        links.forEach((a) => {
          const h = () => {
            const list = a.closest("ol");
            list
              ?.querySelectorAll<HTMLAnchorElement>("a")
              .forEach((x) => x.removeAttribute("aria-current"));
            a.setAttribute("aria-current", "true");
            lockUntil = Date.now() + 2200;
          };
          a.addEventListener("click", h);
          onClick.push([a, h]);
        });
        cleanups.push(() => {
          io.disconnect();
          onClick.forEach(([a, h]) => a.removeEventListener("click", h));
        });
      })();
    },
  });

  const layoutClass =
    "legal-layout" +
    (variant === "short" ? " legal-layout--short" : "") +
    (variant === "compact" ? " legal-layout--compact" : "");

  return (
    <div ref={rootRef} className="hp2 header-dark" id="top">
      <SiteHeader />

      <main>
        <section className="legal-hero">
          <div className="container">
            <h1>{title}</h1>
            <p className="legal-updated">Last Updated: {lastUpdated}</p>
          </div>
        </section>

        <section className="legal-page">
          <div className="container">
            <div className={`legal-intro${wideIntro ? " legal-intro--wide" : ""}`}>
              {intro}
            </div>

            <div className={layoutClass}>
              <nav
                className="legal-toc"
                aria-label="On this page"
                style={
                  tocRows ? ({ "--rows": tocRows } as React.CSSProperties) : undefined
                }
              >
                <ol>
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a href={`#${item.id}`}>{item.label}</a>
                    </li>
                  ))}
                </ol>
              </nav>

              <div className="legal-body">
                {sections.map((s) => (
                  <LegalSectionBlock key={s.id} section={s} />
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
