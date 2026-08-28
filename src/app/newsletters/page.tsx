import Link from "next/link";
import type { Metadata } from "next";
import NavBar from "../../views/HomePage/components/NavBar";
import { ARCHIVE } from "../../lib/newsletter/archive";
import ArchiveSubscribeCTA from "./ArchiveSubscribeCTA";
import NewsletterMailFooter from "./NewsletterMailFooter";

export const metadata: Metadata = {
  title: "Newsletter Archive — Epoch Lag",
  description:
    "Past issues of the Epoch Lag newsletter — prompts, stories, and updates worth revisiting.",
};

export default function NewsletterArchivePage() {
  return (
    <div className="w-full h-full bg-warm-cream min-h-screen">
      <NavBar />
      <main className="px-[16px] md:px-[24px] lg:px-[64px] 2xl:px-[95px] 6xl:px-[145px] pt-[24px] md:pt-[40px] pb-[64px] md:pb-[96px]">
        <header className="max-w-[880px] mx-auto text-center">
          <p className="font-montserrat uppercase tracking-[0.14em] text-primary-orange text-[12px] md:text-[13px]">
            The Newsletter
          </p>
          <h1 className="mt-[12px] font-ivy font-bold text-primary-blue text-[40px] md:text-[56px] lg:text-[64px] leading-[110%]">
            Past issues, worth revisiting
          </h1>
          <p className="mt-[16px] font-montserrat text-primary-blue/80 text-[15px] md:text-[16px] leading-[160%] max-w-[620px] mx-auto">
            Prompts, stories, and product updates from the Epoch Lag team.
            Sent now and then — never spam.
          </p>
        </header>

        <section className="mt-[48px] md:mt-[64px] max-w-[1120px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[20px] md:gap-[24px]">
          {ARCHIVE.map((issue) => (
            <Link
              key={issue.slug}
              href={`/newsletters/${issue.slug}`}
              className="group block bg-white rounded-[20px] overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.08)] transition-shadow"
            >
              <div className="relative aspect-[16/10] w-full bg-[#FDE6C9] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={issue.cover}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="p-[20px] md:p-[24px]">
                <div className="flex items-center gap-[10px] text-primary-blue/60 font-montserrat text-[12px]">
                  <span className="uppercase tracking-[0.12em]">
                    Issue {String(issue.number).padStart(2, "0")}
                  </span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={issue.dateISO}>{issue.date}</time>
                </div>
                <h2 className="mt-[10px] font-ivy font-bold text-primary-blue text-[22px] md:text-[24px] leading-[120%]">
                  {issue.title}
                </h2>
                <p className="mt-[10px] font-montserrat text-primary-blue/75 text-[14px] leading-[160%]">
                  {issue.teaser}
                </p>
                <span className="mt-[16px] inline-flex items-center gap-[6px] font-montserrat font-semibold text-primary-orange text-[14px] group-hover:gap-[10px] transition-all">
                  Read issue
                  <span aria-hidden="true">→</span>
                </span>
              </div>
            </Link>
          ))}
        </section>

        <div className="mt-[64px] md:mt-[96px]">
          <ArchiveSubscribeCTA />
        </div>
      </main>
      <NewsletterMailFooter />
    </div>
  );
}
