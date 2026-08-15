"use client";

import Link from "next/link";
import { CircleArrowButton, SectionHeader } from "../../../../components/ui";

type Resource = {
  href: string;
  kicker: string;
  title: string;
  cover: string;
};

// Served from /public so Turbopack's static import graph doesn't need to
// track them — avoids HMR breakage when either file is added or replaced.
const RESOURCES: Resource[] = [
  {
    href: "/why-epoch-lag",
    kicker: "START HERE",
    title: "Why Epoch Lag?",
    cover: "/gradients/9.jpg",
  },
  {
    href: "/how-to-use",
    kicker: "START HERE",
    title: "How to use Epoch Lag",
    cover: "/gradients/8.jpg",
  },
];

export default function ResourcesRow() {
  return (
    <section className="mt-[24px] md:mt-[32px]">
      <SectionHeader title="Resources" />
      {/* Mobile: horizontal scrollable rail (matches Reminders + Recent
          Stories). Desktop: 2-column grid capped at 840px. */}
      <div className="flex gap-[16px] overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-[12px] px-[12px] md:mx-0 md:px-0 md:grid md:grid-cols-2 md:max-w-[854px] md:overflow-visible md:pl-[14px]">
        {RESOURCES.map((r) => (
          <ResourceTile key={r.href} resource={r} />
        ))}
      </div>
    </section>
  );
}

function ResourceTile({ resource }: { resource: Resource }) {
  return (
    <Link
      href={resource.href}
      className="snap-start shrink-0 w-[85%] md:w-auto relative bg-[color:var(--color-tertiary-cream)] rounded-[20px] p-[8px] flex items-stretch gap-[14px] hover:shadow-[0_2px_20px_rgba(0,0,0,0.10)] transition-shadow overflow-hidden"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resource.cover}
        alt=""
        className="w-[104px] h-[112px] shrink-0 rounded-l-[14px] object-cover"
        aria-hidden
      />
      <div className="flex-1 min-w-0 flex flex-col justify-center py-[4px] pr-[40px]">
        <p className="font-montserrat font-semibold uppercase text-primary-orange text-[10px] tracking-[0.08em]">
          {resource.kicker}
        </p>
        <h3 className="mt-[4px] font-montserrat font-medium text-primary-blue text-[15px] leading-[20px]">
          {resource.title}
        </h3>
      </div>
      <div className="absolute bottom-[10px] right-[10px]">
        <CircleArrowButton
          as="span"
          ariaLabel={resource.title}
          size={30}
          variant="cream"
        />
      </div>
    </Link>
  );
}
