import { Suspense } from "react";
import type { Metadata } from "next";
import FamilyInviteClient from "./FamilyInviteClient";

// Static OG tags — deliberately do NOT include the invite token.
// WhatsApp / iMessage scrape this URL to build a preview card, and any
// token that reaches metadata would end up cached in third-party systems.
export const metadata: Metadata = {
  title: "You've been invited to a family on EpochLag",
  description:
    "Sign up to see the stories your family has shared with you on EpochLag.",
  openGraph: {
    title: "You've been invited to a family on EpochLag",
    description:
      "Sign up to see the stories your family has shared with you on EpochLag.",
    url: "https://epochlag.com/family-invite",
    siteName: "EpochLag",
    images: [{ url: "/logo.svg" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "You've been invited to a family on EpochLag",
    description:
      "Sign up to see the stories your family has shared with you on EpochLag.",
  },
  robots: { index: false, follow: false },
};

export default function FamilyInvitePage() {
  return (
    <Suspense fallback={null}>
      <FamilyInviteClient />
    </Suspense>
  );
}
