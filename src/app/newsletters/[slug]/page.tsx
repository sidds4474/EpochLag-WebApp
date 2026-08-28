import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NavBar from "../../../views/HomePage/components/NavBar";
import { ARCHIVE, getIssueBySlug, type Section } from "../../../lib/newsletter/archive";
import ArchiveSubscribeCTA from "../ArchiveSubscribeCTA";
import NewsletterMailFooter from "../NewsletterMailFooter";

type RouteParams = { slug: string };

export function generateStaticParams(): RouteParams[] {
  return ARCHIVE.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const issue = getIssueBySlug(slug);
  if (!issue) return { title: "Newsletter — Epoch Lag" };
  return {
    title: `${issue.title} — Epoch Lag Newsletter #${String(issue.number).padStart(2, "0")}`,
    description: issue.teaser,
    openGraph: {
      title: issue.title,
      description: issue.teaser,
      images: [issue.cover],
      type: "article",
      publishedTime: issue.dateISO,
    },
  };
}

function renderSection(section: Section, index: number) {
  switch (section.kind) {
    case "definition":
      return (
        <div key={index} className="mt-[8px]">
          <h2 className="font-ivy font-bold text-primary-blue text-[28px] md:text-[32px] leading-[110%]">
            Epoch Lag
          </h2>
          <p className="mt-[6px] font-montserrat italic text-primary-blue/70 text-[14px] md:text-[15px]">
            [Pronounced: {section.pronunciation}]
          </p>
          {section.body.map((p, i) => (
            <p
              key={i}
              className="mt-[16px] font-montserrat text-primary-blue text-[15px] md:text-[16px] leading-[170%]"
            >
              {p}
            </p>
          ))}
        </div>
      );
    case "heading":
      return (
        <div key={index} className="mt-[40px] md:mt-[48px] pt-[40px] md:pt-[48px] border-t border-primary-blue/15">
          <h2 className="font-ivy font-normal text-primary-blue text-[26px] md:text-[32px] leading-[115%] text-center">
            {section.text}
          </h2>
        </div>
      );
    case "paragraph":
      return (
        <p
          key={index}
          className="mt-[16px] font-montserrat text-primary-blue text-[15px] md:text-[16px] leading-[170%]"
        >
          {section.text}
        </p>
      );
    case "prompt": {
      const text = (
        <div>
          <p className="font-montserrat text-primary-blue text-[15px] md:text-[16px] leading-[170%]">
            {section.question}
          </p>
          {section.followup && (
            <p className="mt-[16px] font-montserrat text-primary-blue text-[15px] md:text-[16px] leading-[170%]">
              {section.followup}
            </p>
          )}
        </div>
      );
      if (!section.image) {
        return (
          <blockquote
            key={index}
            className="mt-[20px] bg-[#FDE6C9] rounded-[20px] px-[24px] md:px-[32px] py-[24px] md:py-[28px]"
          >
            {text}
          </blockquote>
        );
      }
      return (
        <div
          key={index}
          className="mt-[24px] grid grid-cols-1 md:grid-cols-[minmax(0,240px)_1fr] gap-[24px] md:gap-[40px] items-center"
        >
          <div className="mx-auto md:mx-0 w-full max-w-[240px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={section.image.src}
              alt={section.image.alt}
              className="w-full h-auto object-contain"
              loading="lazy"
            />
          </div>
          {text}
        </div>
      );
    }
    case "split": {
      const imageEl = (
        <div className="w-full max-w-[280px] mx-auto md:mx-0 md:ml-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={section.image.src}
            alt={section.image.alt}
            className="w-full h-auto object-contain rounded-[12px]"
            loading="lazy"
          />
        </div>
      );
      const textEl = (
        <div>
          {section.body.map((p, i) => (
            <p
              key={i}
              className="mt-[16px] first:mt-0 font-montserrat text-primary-blue text-[15px] md:text-[16px] leading-[170%]"
            >
              {p}
            </p>
          ))}
        </div>
      );
      return (
        <div
          key={index}
          className="mt-[24px] grid grid-cols-1 md:grid-cols-2 gap-[24px] md:gap-[40px] items-center"
        >
          {section.imageSide === "left" ? (
            <>
              {imageEl}
              {textEl}
            </>
          ) : (
            <>
              {textEl}
              {imageEl}
            </>
          )}
        </div>
      );
    }
    case "story": {
      const storyText = (
        <div>
          {section.body.map((p, i) => (
            <p
              key={i}
              className="mt-[16px] first:mt-0 font-montserrat italic text-primary-blue text-[15px] md:text-[16px] leading-[170%]"
            >
              {p}
            </p>
          ))}
          <p className="mt-[20px] font-montserrat italic text-primary-blue text-[14px]">
            {section.attribution}
          </p>
        </div>
      );
      if (!section.image) {
        return (
          <div key={index} className="mt-[24px]">
            {storyText}
          </div>
        );
      }
      return (
        <div
          key={index}
          className="mt-[24px] grid grid-cols-1 md:grid-cols-2 gap-[24px] md:gap-[40px] items-center"
        >
          <div className="w-full max-w-[360px] mx-auto md:mx-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={section.image.src}
              alt={section.image.alt}
              className="w-full h-auto object-contain rounded-[12px]"
              loading="lazy"
            />
          </div>
          {storyText}
        </div>
      );
    }
    case "image":
      return (
        <div
          key={index}
          className="mt-[24px] mx-auto max-w-[440px] rounded-[16px] overflow-hidden bg-white"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={section.src}
            alt={section.alt}
            className="w-full h-auto object-contain"
            loading="lazy"
          />
        </div>
      );
    case "opportunities":
      return (
        <div key={index} className="mt-[32px] grid grid-cols-1 md:grid-cols-3 gap-[20px] md:gap-[24px]">
          {section.items.map((item) => (
            <div key={item.href} className="flex flex-col">
              <p className="font-montserrat text-primary-blue text-[15px] md:text-[16px] leading-[170%] min-h-[72px]">
                {item.blurb}
              </p>
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-[16px] cursor-pointer bg-primary-orange text-white rounded-[8px] py-[16px] font-montserrat font-semibold text-[16px] text-center hover:opacity-90 transition-opacity"
              >
                {item.label}
              </a>
            </div>
          ))}
        </div>
      );
  }
}

export default async function NewsletterIssuePage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;
  const issue = getIssueBySlug(slug);
  if (!issue) notFound();

  const currentIndex = ARCHIVE.findIndex((i) => i.slug === issue.slug);
  const newer = currentIndex > 0 ? ARCHIVE[currentIndex - 1] : null;
  const older =
    currentIndex < ARCHIVE.length - 1 ? ARCHIVE[currentIndex + 1] : null;

  return (
    <div className="w-full h-full bg-warm-cream min-h-screen">
      <NavBar />
      <main className="px-[16px] md:px-[24px] lg:px-[64px] 2xl:px-[95px] 6xl:px-[145px] pt-[16px] md:pt-[24px] pb-[64px] md:pb-[96px]">
        <div className="max-w-[720px] mx-auto">
          <Link
            href="/newsletters"
            className="inline-flex items-center gap-[6px] font-montserrat text-primary-blue/70 text-[13px] hover:text-primary-blue transition-colors"
          >
            <span aria-hidden="true">←</span>
            All issues
          </Link>

          <header className="mt-[24px] md:mt-[32px] text-center">
            <p className="font-montserrat uppercase tracking-[0.14em] text-primary-orange text-[12px]">
              Issue {String(issue.number).padStart(2, "0")} ·{" "}
              <time dateTime={issue.dateISO}>{issue.date}</time>
            </p>
            <h1 className="mt-[12px] font-ivy font-bold text-primary-blue text-[36px] md:text-[48px] lg:text-[56px] leading-[110%]">
              {issue.title}
            </h1>
          </header>

          <article className="mt-[40px] md:mt-[56px]">
            {issue.sections.map(renderSection)}
          </article>

          <nav
            aria-label="More issues"
            className="mt-[64px] md:mt-[80px] pt-[32px] border-t border-primary-blue/10 flex flex-col sm:flex-row gap-[16px] justify-between"
          >
            {newer ? (
              <Link
                href={`/newsletters/${newer.slug}`}
                className="group flex-1 block bg-white rounded-[16px] p-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] transition-shadow"
              >
                <p className="font-montserrat uppercase tracking-[0.12em] text-primary-blue/50 text-[11px]">
                  Newer
                </p>
                <p className="mt-[6px] font-ivy font-bold text-primary-blue text-[18px] leading-[125%]">
                  {newer.title}
                </p>
              </Link>
            ) : (
              <span className="flex-1" />
            )}
            {older ? (
              <Link
                href={`/newsletters/${older.slug}`}
                className="group flex-1 block bg-white rounded-[16px] p-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] transition-shadow sm:text-right"
              >
                <p className="font-montserrat uppercase tracking-[0.12em] text-primary-blue/50 text-[11px]">
                  Older
                </p>
                <p className="mt-[6px] font-ivy font-bold text-primary-blue text-[18px] leading-[125%]">
                  {older.title}
                </p>
              </Link>
            ) : (
              <span className="flex-1" />
            )}
          </nav>
        </div>

        <div className="mt-[64px] md:mt-[80px]">
          <ArchiveSubscribeCTA source={`archive_issue_${issue.slug}`} />
        </div>
      </main>
      <NewsletterMailFooter />
    </div>
  );
}
