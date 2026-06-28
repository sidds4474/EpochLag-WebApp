import Link from "next/link";
import { notFound } from "next/navigation";
import {
  EMPTY_STATE_CARDS,
  findEmptyStateCard,
  type BodyBlock,
} from "../../../../data/emptyStateCards";
import {
  CirclesIcon,
  HomeIcon,
  InteractionsIcon,
  LibraryIcon,
  PersonIcon,
} from "../../(dashboard)/icons";

export function generateStaticParams() {
  return EMPTY_STATE_CARDS.map((c) => ({ id: c.id }));
}

export default async function WelcomeCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const card = findEmptyStateCard(id);
  if (!card) notFound();

  return (
    <main className="min-h-screen w-full bg-warm-cream">
      <div className="max-w-[760px] mx-auto px-[24px] md:px-[40px] py-[28px] md:py-[40px]">
        <Link
          href="/home"
          className="inline-flex items-center gap-[6px] font-montserrat font-medium text-primary-blue/70 text-[14px] hover:text-primary-blue mb-[20px]"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back
        </Link>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.coverImage}
          alt=""
          className="w-full aspect-[16/9] object-cover rounded-[18px] mb-[24px] bg-primary-blue/5"
        />

        <h1 className="font-montserrat font-bold text-primary-blue text-[28px] md:text-[36px] leading-tight">
          {card.title}
        </h1>
        <p className="mt-[6px] font-montserrat text-primary-blue/55 text-[13px]">
          {card.location}
        </p>

        <article className="mt-[24px] flex flex-col gap-[18px]">
          {card.body.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </article>
      </div>
    </main>
  );
}

function Block({ block }: { block: BodyBlock }) {
  switch (block.type) {
    case "heading":
      return (
        <h2 className="font-montserrat font-bold text-primary-blue text-[22px] md:text-[24px] mt-[12px]">
          {block.text}
        </h2>
      );
    case "paragraph":
      return (
        <p className="font-montserrat text-primary-blue/85 text-[15px] md:text-[16px] leading-[1.7]">
          {block.text}
        </p>
      );
    case "image":
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={block.src}
          alt=""
          className="w-full rounded-[16px] object-cover bg-primary-blue/5"
        />
      );
    case "imageRow":
      return (
        <div className="grid grid-cols-2 gap-[12px]">
          {block.srcs.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt=""
              className="w-full aspect-square object-cover rounded-[16px] bg-primary-blue/5"
            />
          ))}
        </div>
      );
    case "video":
      return (
        <video
          src={block.src}
          autoPlay
          loop
          muted
          playsInline
          className="w-full rounded-[16px] bg-black"
        />
      );
    case "feature":
      return (
        <div className="flex gap-[14px] items-start">
          <div className="shrink-0 w-[36px] h-[36px] rounded-full bg-primary-blue/10 text-primary-blue flex items-center justify-center">
            <FeatureIcon name={block.icon} />
          </div>
          <div className="flex-1 flex flex-col gap-[4px]">
            <p className="font-montserrat text-primary-blue text-[15px] md:text-[16px] leading-[1.6]">
              <span className="font-bold">{block.label}</span>{" "}
              <span className="text-primary-blue/85">{block.text}</span>
            </p>
            {block.bullets && block.bullets.length > 0 && (
              <ul className="mt-[6px] flex flex-col gap-[6px] pl-[18px] list-disc marker:text-primary-blue/50">
                {block.bullets.map((b, i) => (
                  <li
                    key={i}
                    className="font-montserrat text-primary-blue/85 text-[14px] md:text-[15px] leading-[1.6]"
                  >
                    {b}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      );
    case "actionButtons":
      return (
        <div className="mt-[12px] flex flex-wrap gap-[12px]">
          {block.buttons.map((btn, i) => (
            <Link
              key={i}
              href={btn.route}
              className={
                btn.variant === "primary"
                  ? "cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[15px] rounded-full px-[24px] py-[12px] hover:opacity-90 transition-opacity"
                  : "cursor-pointer bg-transparent border border-primary-blue/30 text-primary-blue font-montserrat font-semibold text-[15px] rounded-full px-[24px] py-[12px] hover:bg-primary-blue/5 transition-colors"
              }
            >
              {btn.label}
            </Link>
          ))}
        </div>
      );
  }
}

function FeatureIcon({ name }: { name: string }) {
  const size = 18;
  switch (name) {
    case "home":
      return <HomeIcon width={size} height={size} />;
    case "interactions":
      return <InteractionsIcon width={size} height={size} />;
    case "circles":
      return <CirclesIcon width={size} height={size} />;
    case "stories":
      return <LibraryIcon width={size} height={size} />;
    case "profile":
      return <PersonIcon width={size} height={size} />;
    default:
      return null;
  }
}
