import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NavBar from "../../../views/HomePage/components/NavBar";
import { ARCHIVE, getIssueBySlug, type Section } from "../../../lib/newsletter/archive";
import ArchiveSubscribeCTA from "../ArchiveSubscribeCTA";
import NewsletterMailFooter from "../NewsletterMailFooter";
import { APP_STORE_URL, PLAY_STORE_URL } from "../../../utils/storeLinks";
import InstagramIcon from "../../../assets/svg/instagram-icon";
import FacebookIcon from "../../../assets/svg/facebook-icon";

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2M8.339 18.338H5.667v-8.59h2.672zM7.004 8.574a1.548 1.548 0 1 1 0-3.096 1.548 1.548 0 0 1 0 3.096m11.335 9.764H15.67v-4.177c0-.996-.017-2.278-1.387-2.278-1.389 0-1.601 1.086-1.601 2.207v4.248h-2.667v-8.59h2.56v1.174h.037c.355-.675 1.227-1.387 2.524-1.387 2.704 0 3.203 1.778 3.203 4.092z" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="1.5" y="1.5" width="21" height="21" rx="4" stroke="currentColor" strokeWidth="2" />
    <path d="M6.5 12.5L10.5 16.5L17.5 8.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AppStoreBadge = () => (
  <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-[8px] bg-black text-white rounded-[8px] px-[14px] py-[8px] hover:opacity-90 transition-opacity">
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
    <div className="flex flex-col leading-tight">
      <span className="text-[8px] font-montserrat">Download on the</span>
      <span className="text-[14px] font-montserrat font-semibold">App Store</span>
    </div>
  </a>
);

const PlayStoreBadge = () => (
  <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-[8px] bg-black text-white rounded-[8px] px-[14px] py-[8px] hover:opacity-90 transition-opacity">
    <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" aria-hidden="true">
      <path d="M3.6 2.1c-.36.31-.6.79-.6 1.4v17c0 .61.24 1.09.6 1.4l11.13-9.9L3.6 2.1z" fill="#34a853" />
      <path d="M17.32 8.87 14.73 12l2.59 3.13 3.68-2.09c1.11-.63 1.11-2.25 0-2.88l-3.68-2.29z" fill="#fbbc04" />
      <path d="M3.6 2.1 14.73 12 3.6 21.9c.28.24.64.35 1 .27L18.4 15.13 14.73 12l3.67-3.13L4.6 1.83c-.36-.08-.72.03-1 .27z" fill="#ea4335" />
      <path d="M3.6 2.1c-.36.31-.6.79-.6 1.4v17c0 .3.06.56.18.79L14.73 12 3.6 2.1z" fill="#4285f4" />
    </svg>
    <div className="flex flex-col leading-tight">
      <span className="text-[8px] font-montserrat">GET IT ON</span>
      <span className="text-[14px] font-montserrat font-semibold">Google Play</span>
    </div>
  </a>
);

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
          <h2 className="font-ivy font-bold text-primary-blue text-[26px] sm:text-[28px] md:text-[32px] leading-[110%]">
            Epoch Lag
          </h2>
          <p className="mt-[6px] font-montserrat italic text-primary-blue/70 text-[13px] md:text-[15px]">
            [Pronounced: {section.pronunciation}]
          </p>
          {section.body.map((p, i) => (
            <p
              key={i}
              className="mt-[14px] md:mt-[16px] font-montserrat text-primary-blue text-[14px] md:text-[16px] leading-[170%]"
            >
              {p}
            </p>
          ))}
        </div>
      );
    case "heading":
      return (
        <div key={index} className="mt-[32px] md:mt-[48px] py-[20px] md:py-[28px] border-y border-primary-blue/40">
          <h2 className="font-ivy font-bold text-primary-blue text-[24px] sm:text-[30px] md:text-[36px] leading-[115%] text-center">
            {section.text}
          </h2>
        </div>
      );
    case "paragraph":
      return (
        <p
          key={index}
          className={`mt-[14px] md:mt-[16px] font-montserrat text-primary-blue text-[14px] md:text-[16px] leading-[170%] ${section.align === "center" ? "text-center" : ""}`}
        >
          {section.text}
        </p>
      );
    case "linkParagraph":
      return (
        <p
          key={index}
          className="mt-[14px] md:mt-[16px] font-montserrat text-primary-blue text-[14px] md:text-[16px] leading-[170%]"
        >
          {section.prefix}
          <a
            href={section.linkHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-orange underline hover:opacity-80 transition-opacity"
          >
            {section.linkText}
          </a>
          {section.suffix}
        </p>
      );
    case "divider":
      return (
        <hr
          key={index}
          className="mt-[24px] md:mt-[32px] border-0 border-t border-primary-blue/40"
        />
      );
    case "socials":
      return (
        <div
          key={index}
          className="mt-[24px] md:mt-[32px] py-[16px] md:py-[20px] border-y border-primary-blue/40 flex items-center justify-between gap-[16px]"
        >
          <p className="font-ivy font-bold text-primary-orange text-[18px] sm:text-[22px] md:text-[24px] leading-[115%]">
            Follow us on socials
          </p>
          <div className="flex items-center gap-[14px] md:gap-[18px] text-primary-orange">
            <a href="https://www.instagram.com/epoch_lag" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:opacity-80 transition-opacity">
              <InstagramIcon className="w-[24px] h-[24px] md:w-[26px] md:h-[26px]" />
            </a>
            <a href="https://www.facebook.com/profile.php?id=61580265058728" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:opacity-80 transition-opacity">
              <FacebookIcon className="w-[24px] h-[24px] md:w-[26px] md:h-[26px]" />
            </a>
            <a href="https://www.linkedin.com/company/epoch-lag/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="hover:opacity-80 transition-opacity">
              <LinkedInIcon className="w-[24px] h-[24px] md:w-[26px] md:h-[26px]" />
            </a>
          </div>
        </div>
      );
    case "hero":
      return (
        <div
          key={index}
          className="mt-[8px] grid grid-cols-1 md:grid-cols-[minmax(0,240px)_1fr] gap-[24px] md:gap-[40px] items-center"
        >
          <div className="w-full max-w-[220px] md:max-w-none mx-auto md:mx-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={section.image.src}
              alt={section.image.alt}
              className="w-full h-auto object-contain"
              loading="lazy"
            />
          </div>
          <div>
            <h2 className="font-ivy font-bold text-primary-blue text-[26px] sm:text-[32px] md:text-[38px] leading-[115%]">
              {section.headline}
            </h2>
            <ul className="mt-[18px] md:mt-[22px] space-y-[10px] md:space-y-[12px]">
              {section.checklist.map((item, i) => (
                <li key={i} className="flex items-start gap-[10px] md:gap-[12px]">
                  <CheckIcon className="w-[18px] h-[18px] md:w-[20px] md:h-[20px] shrink-0 mt-[2px] text-primary-orange" />
                  <span className="font-montserrat text-primary-blue text-[14px] md:text-[16px] leading-[150%]">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
            {section.showAppBadges && (
              <div className="mt-[20px] md:mt-[24px] flex flex-wrap items-center gap-[10px] md:gap-[12px]">
                <AppStoreBadge />
                <PlayStoreBadge />
              </div>
            )}
          </div>
        </div>
      );
    case "duo":
      return (
        <div
          key={index}
          className="mt-[24px] md:mt-[32px] grid grid-cols-1 md:grid-cols-2 gap-[24px] md:gap-[40px]"
        >
          {[section.left, section.right].map((col, i) => (
            <div key={i}>
              <h3 className="font-ivy font-bold text-primary-blue text-[18px] sm:text-[20px] md:text-[22px] leading-[125%]">
                {col.title}
              </h3>
              {col.body.map((p, j) => (
                <p
                  key={j}
                  className="mt-[12px] md:mt-[14px] font-montserrat text-primary-blue text-[14px] md:text-[16px] leading-[170%]"
                >
                  {p}
                </p>
              ))}
            </div>
          ))}
        </div>
      );
    case "opportunitiesHero":
      return (
        <div
          key={index}
          className="mt-[24px] md:mt-[32px] grid grid-cols-1 md:grid-cols-[minmax(0,280px)_1fr] gap-[24px] md:gap-[40px] items-start"
        >
          <div className="w-full max-w-[280px] mx-auto md:mx-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={section.image.src}
              alt={section.image.alt}
              className="w-full h-auto object-cover rounded-[8px]"
              loading="lazy"
            />
          </div>
          <div className="text-center">
            <h2 className="font-ivy font-bold text-primary-blue text-[24px] sm:text-[28px] md:text-[32px] leading-[115%]">
              {section.title}
            </h2>
            <div className="mt-[16px] md:mt-[20px] space-y-[18px] md:space-y-[22px]">
              {section.items.map((item) => (
                <div key={item.href}>
                  <p className="font-montserrat text-primary-blue text-[14px] md:text-[16px] leading-[160%]">
                    {item.blurb}
                  </p>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-[12px] inline-block bg-primary-orange text-white rounded-full px-[28px] md:px-[36px] py-[10px] md:py-[12px] font-montserrat font-semibold text-[14px] md:text-[16px] hover:opacity-90 transition-opacity"
                  >
                    {item.label}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    case "prompt": {
      if (!section.image) {
        return (
          <div key={index} className="mt-[24px] md:mt-[28px]">
            <p className="font-montserrat font-bold text-primary-blue text-[16px] md:text-[18px] leading-[140%]">
              {section.question}
            </p>
            {section.followup && (
              <p className="mt-[14px] md:mt-[16px] font-montserrat text-primary-blue text-[14px] md:text-[16px] leading-[170%]">
                {section.followup}
              </p>
            )}
          </div>
        );
      }
      const text = (
        <div>
          <p className="font-montserrat text-primary-blue text-[14px] md:text-[16px] leading-[170%]">
            {section.question}
          </p>
          {section.followup && (
            <p className="mt-[14px] md:mt-[16px] font-montserrat text-primary-blue text-[14px] md:text-[16px] leading-[170%]">
              {section.followup}
            </p>
          )}
        </div>
      );
      return (
        <div
          key={index}
          className="mt-[20px] md:mt-[24px] grid grid-cols-1 md:grid-cols-[minmax(0,240px)_1fr] gap-[20px] md:gap-[40px] items-center"
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
      const widthCap =
        section.imageWidth === "sm"
          ? "sm:max-w-[190px] md:max-w-[210px]"
          : "sm:max-w-[280px]";
      const align = section.imageSide === "left" ? "md:mr-auto" : "md:ml-auto";
      const imageEl = (
        <div className={`w-full ${widthCap} mx-auto md:mx-0 ${align}`}>
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
              className="mt-[14px] md:mt-[16px] first:mt-0 font-montserrat text-primary-blue text-[14px] md:text-[16px] leading-[170%]"
            >
              {p}
            </p>
          ))}
        </div>
      );
      return (
        <div
          key={index}
          className="mt-[20px] md:mt-[24px] grid grid-cols-1 md:grid-cols-2 gap-[20px] md:gap-[40px] items-center"
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
              className="mt-[14px] md:mt-[16px] first:mt-0 font-montserrat italic text-primary-blue text-[14px] md:text-[16px] leading-[170%]"
            >
              {p}
            </p>
          ))}
          <p className="mt-[16px] md:mt-[20px] font-montserrat italic text-primary-blue text-[13px] md:text-[14px]">
            {section.attribution}
          </p>
        </div>
      );
      if (!section.image) {
        return (
          <div key={index} className="mt-[20px] md:mt-[24px]">
            {storyText}
          </div>
        );
      }
      return (
        <div
          key={index}
          className="mt-[20px] md:mt-[24px] grid grid-cols-1 md:grid-cols-2 gap-[20px] md:gap-[40px] items-center"
        >
          <div className="w-full sm:max-w-[360px] mx-auto md:mx-0">
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
          className="mt-[20px] md:mt-[24px] mx-auto sm:max-w-[440px] rounded-[16px] overflow-hidden bg-white"
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
    case "gallery":
      return (
        <div
          key={index}
          className="mt-[20px] md:mt-[24px] grid grid-cols-1 sm:grid-cols-3 gap-[12px] sm:gap-[16px] md:gap-[20px]"
        >
          {section.images.map((img, i) => (
            <div key={i} className="w-full max-w-[280px] sm:max-w-none mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt={img.alt}
                className="w-full h-auto object-contain rounded-[12px]"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      );
    case "steps":
      return (
        <ul
          key={index}
          className="mt-[16px] md:mt-[20px] pl-[20px] md:pl-[24px] list-disc marker:text-primary-orange space-y-[10px] md:space-y-[12px]"
        >
          {section.items.map((item, i) => (
            <li
              key={i}
              className="font-montserrat text-primary-blue text-[14px] md:text-[16px] leading-[170%]"
            >
              {item}
            </li>
          ))}
        </ul>
      );
    case "opportunities":
      return (
        <div key={index} className="mt-[24px] md:mt-[32px] grid grid-cols-1 md:grid-cols-3 gap-[16px] md:gap-[24px]">
          {section.items.map((item) => (
            <div key={item.href} className="flex flex-col">
              <p className="font-montserrat text-primary-blue text-[14px] md:text-[16px] leading-[170%] md:min-h-[72px]">
                {item.blurb}
              </p>
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-[12px] md:mt-[16px] cursor-pointer bg-primary-orange text-white rounded-[8px] py-[14px] md:py-[16px] font-montserrat font-semibold text-[15px] md:text-[16px] text-center hover:opacity-90 transition-opacity"
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
      <main className="px-[16px] md:px-[24px] lg:px-[64px] 2xl:px-[95px] 6xl:px-[145px] pt-[16px] md:pt-[24px] pb-[48px] md:pb-[96px]">
        <div className="max-w-[720px] mx-auto">
          <Link
            href="/newsletters"
            className="inline-flex items-center gap-[6px] font-montserrat text-primary-blue/70 text-[13px] py-[4px] hover:text-primary-blue transition-colors"
          >
            <span aria-hidden="true">←</span>
            All issues
          </Link>

          <header className="mt-[20px] md:mt-[32px] text-center">
            <p className="font-montserrat uppercase tracking-[0.14em] text-primary-orange text-[11px] md:text-[12px]">
              Issue {String(issue.number).padStart(2, "0")} ·{" "}
              <time dateTime={issue.dateISO}>{issue.date}</time>
            </p>
            <h1 className="mt-[10px] md:mt-[12px] font-ivy font-bold text-primary-blue text-[28px] sm:text-[36px] md:text-[48px] lg:text-[56px] leading-[110%]">
              {issue.title}
            </h1>
          </header>

          <article className="mt-[32px] md:mt-[56px]">
            {issue.sections.map(renderSection)}
          </article>

          <nav
            aria-label="More issues"
            className="mt-[48px] md:mt-[80px] pt-[24px] md:pt-[32px] border-t border-primary-blue/10 flex flex-col md:flex-row gap-[12px] md:gap-[16px] justify-between"
          >
            {newer ? (
              <Link
                href={`/newsletters/${newer.slug}`}
                className="group flex-1 block bg-white rounded-[14px] md:rounded-[16px] p-[16px] md:p-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] transition-shadow"
              >
                <p className="font-montserrat uppercase tracking-[0.12em] text-primary-blue/50 text-[10px] md:text-[11px]">
                  Newer
                </p>
                <p className="mt-[4px] md:mt-[6px] font-ivy font-bold text-primary-blue text-[16px] md:text-[18px] leading-[125%]">
                  {newer.title}
                </p>
              </Link>
            ) : (
              <span className="hidden md:block flex-1" />
            )}
            {older ? (
              <Link
                href={`/newsletters/${older.slug}`}
                className="group flex-1 block bg-white rounded-[14px] md:rounded-[16px] p-[16px] md:p-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] transition-shadow md:text-right"
              >
                <p className="font-montserrat uppercase tracking-[0.12em] text-primary-blue/50 text-[10px] md:text-[11px]">
                  Older
                </p>
                <p className="mt-[4px] md:mt-[6px] font-ivy font-bold text-primary-blue text-[16px] md:text-[18px] leading-[125%]">
                  {older.title}
                </p>
              </Link>
            ) : (
              <span className="hidden md:block flex-1" />
            )}
          </nav>
        </div>

        <div className="mt-[48px] md:mt-[80px]">
          <ArchiveSubscribeCTA source={`archive_issue_${issue.slug}`} />
        </div>
      </main>
      <NewsletterMailFooter />
    </div>
  );
}
