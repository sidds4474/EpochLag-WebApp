"use client";

import { Children, useRef } from "react";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import { useSiteChrome } from "./useSiteChrome";
import "./HomePage.css";

// Account Deletion uses a different layout from the other legal pages:
// a sand panel with heading/answer rows instead of a sticky TOC + body.
// Each row's children stagger in at 120n ms when the panel scrolls into
// view, matching the designer's HTML.

type Row = { title: string; body: React.ReactNode };
type Props = {
  title: string;
  lastUpdated: string;
  rows: Row[];
  note: React.ReactNode;
};

export default function DeletionLayout({
  title,
  lastUpdated,
  rows,
  note,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useSiteChrome(rootRef, {
    extra: (root, cleanups) => {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reduceMotion) return;

      root.querySelectorAll<HTMLElement>(".deletion-row").forEach((r) => {
        Array.from(r.children).forEach((c, i) => {
          (c as HTMLElement).classList.add("reveal-soft");
          (c as HTMLElement).style.setProperty("--d", i * 120 + "ms");
        });
      });
      const note = root.querySelector<HTMLElement>(".deletion-note");
      if (note) note.classList.add("reveal-soft");

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
    },
  });

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

        <section className="legal-page legal-page--deletion">
          <div className="container">
            <div className="deletion-panel">
              {rows.map((r) => (
                <div className="deletion-row" key={r.title}>
                  <h2>{r.title}</h2>
                  <div>{Children.toArray(r.body)}</div>
                </div>
              ))}
            </div>
            <p className="deletion-note">{note}</p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
