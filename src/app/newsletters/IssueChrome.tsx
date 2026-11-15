"use client";

import { useRef, type ReactNode } from "react";
import SiteHeader from "../../views/HomePageV2/SiteHeader";
import SiteFooter from "../../views/HomePageV2/SiteFooter";
import { useSiteChrome } from "../../views/HomePageV2/useSiteChrome";
import "../../views/HomePageV2/HomePage.css";

// Thin client wrapper that puts the hp2 chrome around the server-rendered
// issue markup. The issue content stays Tailwind-styled — HomePage.css has
// an `.issue-content` reset that prevents hp2's base typography from
// clobbering the Tailwind h1/h2/h3/p rules.

export default function IssueChrome({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useSiteChrome(rootRef);
  return (
    <div ref={rootRef} className="hp2" id="top">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
