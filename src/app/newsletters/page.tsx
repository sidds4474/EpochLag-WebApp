import type { Metadata } from "next";
import { ARCHIVE } from "../../lib/newsletter/archive";
import NewsletterArchiveView from "./NewsletterArchiveView";

export const metadata: Metadata = {
  title: "Newsletter Archive — Epoch Lag",
  description:
    "Past issues of the Epoch Lag newsletter — prompts, stories, and updates worth revisiting.",
};

export default function NewsletterArchivePage() {
  const issues = ARCHIVE.map((i) => ({
    slug: i.slug,
    dateLabel: i.date,
    dateISO: i.dateISO,
    title: i.title,
    cover: i.cover,
  }));
  return <NewsletterArchiveView issues={issues} />;
}
