import Link from "next/link";
import { notFound } from "next/navigation";
import {
  EMPTY_STATE_CARDS,
  findEmptyStateCard,
  type BodyBlock,
} from "../../../../../data/emptyStateCards";
import {
  ChevronLeftIcon,
  HomeIcon,
  InteractionsIcon,
  LibraryIcon,
  PlusIcon,
} from "../../icons";
import FeatureProfileAvatar from "./FeatureProfileAvatar";

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
    <div className="h-full flex flex-col">
      <div className="px-[40px] pt-[16px] pb-[8px] shrink-0">
        <Link
          href="/home"
          className="cursor-pointer inline-flex items-center gap-[8px] text-primary-blue hover:opacity-80 transition-opacity"
        >
          <span className="w-[32px] h-[32px] rounded-full bg-[#ededed] flex items-center justify-center">
            <ChevronLeftIcon width={18} height={18} />
          </span>
          <span className="font-montserrat font-semibold text-[20px] md:text-[24px] leading-tight">
            Story
          </span>
        </Link>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        <div className="px-[40px] pt-[16px] pb-[40px]">
          <div className="relative rounded-[24px] overflow-hidden bg-primary-blue/10 h-[260px] mb-[20px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.coverImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>

          <div className="flex items-center justify-between gap-[16px]">
            <h1 className="font-montserrat font-semibold text-primary-blue text-[22px] md:text-[26px] leading-[30px] flex-1 min-w-0">
              {card.title}
            </h1>
            {card.location && (
              <span className="font-montserrat text-primary-blue/50 text-[13px] shrink-0">
                {card.location}
              </span>
            )}
          </div>

          <article className="mt-[20px] flex flex-col gap-[16px]">
            {card.body.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </article>
        </div>
      </div>
    </div>
  );
}

function Block({ block }: { block: BodyBlock }) {
  switch (block.type) {
    case "heading":
      return (
        <h2 className="font-montserrat font-bold text-primary-blue text-[20px] md:text-[22px] mt-[12px]">
          {block.text}
        </h2>
      );
    case "paragraph":
      return (
        <p className="font-montserrat text-primary-blue text-[15px] leading-[22px] whitespace-pre-line">
          {block.text}
        </p>
      );
    case "image":
      return (
        <div className="mx-auto max-w-[300px] md:max-w-[420px] w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={block.src}
            alt=""
            className="w-full aspect-square object-cover rounded-[16px] bg-primary-blue/5"
          />
        </div>
      );
    case "imageRow":
      return (
        <div className="mx-auto max-w-[300px] md:max-w-[420px] w-full grid grid-cols-2 gap-[10px] md:gap-[14px]">
          {block.srcs.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt=""
              className="w-full aspect-square object-cover rounded-[12px] bg-primary-blue/5"
            />
          ))}
        </div>
      );
    case "video":
      return (
        <div className="mx-auto max-w-[600px] w-full">
          <video
            src={block.src}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-auto rounded-[16px] bg-black"
          />
        </div>
      );
    case "feature":
      return (
        <div className="flex gap-[14px] items-start">
          <FeatureIconContainer name={block.icon} />
          <div className="flex-1 flex flex-col gap-[4px]">
            <p className="font-montserrat text-primary-blue text-[15px] leading-[22px]">
              <span className="font-bold">{block.label}</span>{" "}
              <span className="text-primary-blue/85">{block.text}</span>
            </p>
            {block.bullets && block.bullets.length > 0 && (
              <ul className="mt-[6px] flex flex-col gap-[6px] pl-[18px] list-disc marker:text-primary-blue/50">
                {block.bullets.map((b, i) => (
                  <li
                    key={i}
                    className="font-montserrat text-primary-blue/85 text-[14px] leading-[22px]"
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

function FeatureIconContainer({ name }: { name: string }) {
  if (name === "circles") {
    return (
      <div className="relative shrink-0 w-[36px] h-[36px] flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="" className="absolute inset-0 w-full h-full" />
        <PlusIcon
          width={16}
          height={16}
          strokeWidth={2}
          className="relative text-white"
        />
      </div>
    );
  }
  if (name === "profile") {
    return <FeatureProfileAvatar />;
  }
  return (
    <div className="shrink-0 w-[36px] h-[36px] rounded-full bg-primary-blue/10 text-primary-blue flex items-center justify-center">
      <FeatureIcon name={name} />
    </div>
  );
}

function FeatureIcon({ name }: { name: string }) {
  const size = 18;
  switch (name) {
    case "home":
      return <HomeIcon width={size} height={size} />;
    case "interactions":
      return <InteractionsIcon width={size} height={size} />;
    case "stories":
      return <LibraryIcon width={size} height={size} />;
    default:
      return null;
  }
}
