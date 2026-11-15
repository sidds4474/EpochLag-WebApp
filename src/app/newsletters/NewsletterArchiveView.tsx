"use client";

import { useRef } from "react";
import SiteHeader from "../../views/HomePageV2/SiteHeader";
import SiteFooter from "../../views/HomePageV2/SiteFooter";
import StayInTheLoop from "../../views/HomePageV2/StayInTheLoop";
import { useSiteChrome } from "../../views/HomePageV2/useSiteChrome";
import "../../views/HomePageV2/HomePage.css";

// Newsletter archive page — hp2 chrome + 3-col card grid (2 cols at tablet,
// 1 col at mobile). Cards rise in row by row: 0 / 110 / 220 ms per column
// position. Each card's whole surface opens the issue via the ::after overlay
// on .nl-link. The signup band at the bottom uses the .loop--archive variant
// which drops the "View our Newsletter" link (we're already here).

type ArchiveIssue = {
  slug: string;
  dateLabel: string;
  dateISO: string;
  title: string;
  cover: string;
};

type Props = {
  issues: ArchiveIssue[];
};

export default function NewsletterArchiveView({ issues }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useSiteChrome(rootRef, {
    revealGroups: [
      [".nl-hero|p", 0, 250],
      [".loop|p, .arrow-link, .signup", 90, 200],
    ],
    extra: (root, cleanups) => {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reduceMotion) return;
      // Cards rise in row by row: each card's delay is set by its column (i%3).
      root.querySelectorAll<HTMLElement>(".nl-card").forEach((c, i) => {
        c.classList.add("reveal");
        c.style.setProperty("--d", (i % 3) * 110 + "ms");
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
        .querySelectorAll<HTMLElement>(".nl-card")
        .forEach((el) => io.observe(el));
      cleanups.push(() => io.disconnect());
    },
  });

  return (
    <div ref={rootRef} className="hp2" id="top">
      <SiteHeader />

      <main>
        <section className="nl-hero">
          <div className="container">
            <h1>The Epoch Lag Archive</h1>
            <p>
              A collection of thoughtful prompts, stories, inspiration, and
              updates from the Epoch Lag team. All in one place, ready to
              explore.
            </p>
          </div>
        </section>

        <section className="nl-archive" aria-label="Newsletter archive">
          <div className="container">
            <div className="nl-grid">
              {issues.map((issue) => (
                <article className="nl-card" key={issue.slug}>
                  <div className="nl-frame">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={issue.cover} alt="" loading="lazy" />
                  </div>
                  <p className="nl-date">
                    <time dateTime={issue.dateISO}>{issue.dateLabel}</time>
                  </p>
                  <h2 className="nl-title">{issue.title}</h2>
                  <a
                    className="arrow-link nl-link"
                    href={`/newsletters/${issue.slug}`}
                    aria-label={`Read newsletter: ${issue.title}`}
                  >
                    <span>Read Newsletter</span>
                    <svg
                      viewBox="0 0 16 12"
                      fill="none"
                      stroke="#232323"
                      strokeWidth={1.4}
                    >
                      <path d="M0 6h14.5M10 1.5L14.5 6 10 10.5" />
                    </svg>
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <StayInTheLoop source="newsletter-archive" />
      </main>

      <SiteFooter />
    </div>
  );
}
