"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { bustUrl } from "../../lib/images";
import type { PersonSummary } from "../../types/home";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PersonIcon,
} from "../../app/(app)/(dashboard)/icons";

export function SectionHeader({
  title,
  viewAllHref,
  className = "",
  onScrollLeft,
  onScrollRight,
  canScrollLeft,
  canScrollRight,
}: {
  title: string;
  viewAllHref?: string;
  className?: string;
  /** Wire these when the section renders a horizontal rail that should be
   *  advanced via chevron buttons on md+. Left blank → no arrows render. */
  onScrollLeft?: () => void;
  onScrollRight?: () => void;
  canScrollLeft?: boolean;
  canScrollRight?: boolean;
}) {
  const showArrows =
    !!onScrollLeft && !!onScrollRight && (canScrollLeft || canScrollRight);
  return (
    <div
      className={`flex items-end justify-between mb-[12px] md:mb-[14px] md:px-[14px] ${className}`}
    >
      <h2 className="font-montserrat font-medium text-primary-blue text-[17px] md:text-[19px] leading-[1.2]">
        {title}
      </h2>
      <div className="flex items-center gap-[10px]">
        {showArrows && (
          <div className="hidden md:flex items-center gap-[8px]">
            <RailArrowButton
              direction="left"
              disabled={!canScrollLeft}
              onClick={onScrollLeft}
            />
            <RailArrowButton
              direction="right"
              disabled={!canScrollRight}
              onClick={onScrollRight}
            />
          </div>
        )}
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="font-montserrat font-medium text-primary-blue/60 text-[12px] md:text-[13px] hover:text-primary-blue transition-colors"
          >
            View All
          </Link>
        )}
      </div>
    </div>
  );
}

function RailArrowButton({
  direction,
  disabled,
  onClick,
}: {
  direction: "left" | "right";
  disabled: boolean;
  onClick?: () => void;
}) {
  const Icon = direction === "left" ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <button
      type="button"
      aria-label={direction === "left" ? "Scroll left" : "Scroll right"}
      onClick={onClick}
      disabled={disabled}
      className={`w-[32px] h-[32px] rounded-full flex items-center justify-center transition-colors ${
        disabled
          ? "bg-[#F5F5F5] text-primary-blue/25 cursor-default opacity-60"
          : "bg-[#EDEDED] text-primary-blue hover:bg-[#E0E0E0] cursor-pointer"
      }`}
    >
      <Icon width={14} height={14} />
    </button>
  );
}

export function CircleArrowButton({
  size = 40,
  onClick,
  ariaLabel,
  href,
  as = "button",
  variant = "cream",
}: {
  size?: number;
  onClick?: (e: React.MouseEvent) => void;
  ariaLabel: string;
  href?: string;
  as?: "button" | "link" | "span";
  variant?: "cream" | "white";
}) {
  const bg =
    variant === "cream"
      ? "bg-[#FFD9AA] text-primary-blue"
      : "bg-white text-primary-blue";
  const cls = `shrink-0 rounded-full ${bg} shadow-[0_1px_3px_rgba(0,0,0,0.10)] flex items-center justify-center hover:scale-[1.03] transition-transform`;
  const style = { width: size, height: size };
  const icon = (
    <svg
      width={size * 0.65}
      height={size * 0.65}
      viewBox="0 0 33 33"
      fill="none"
      stroke="#ffffff"
      strokeWidth={3.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5.4278 16.2833H27.1389M18.9972 24.4249L27.1389 16.2833L18.9972 8.1416" />
    </svg>
  );
  if (as === "link" && href) {
    return (
      <Link
        href={href}
        aria-label={ariaLabel}
        className={cls}
        style={style}
        onClick={onClick}
      >
        {icon}
      </Link>
    );
  }
  if (as === "span") {
    return (
      <span aria-label={ariaLabel} className={cls} style={style}>
        {icon}
      </span>
    );
  }
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={`cursor-pointer ${cls}`}
      style={style}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}

export function AvatarWithBadge({
  src,
  fallbackChar,
  size = 96,
  badge,
  ring = "ring-white",
}: {
  src?: string | null;
  fallbackChar?: string;
  size?: number;
  badge?: ReactNode;
  ring?: string;
}) {
  const badgeSize = Math.round(size * 0.42);
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <div
        className={`w-full h-full rounded-full overflow-hidden bg-primary-blue/15 ring-2 ${ring}`}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bustUrl(src, undefined)}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-montserrat font-semibold text-primary-blue text-[24px]">
            {fallbackChar ?? "?"}
          </div>
        )}
      </div>
      {badge && (
        <div
          className="absolute bottom-0 right-0 rounded-full bg-white ring-2 ring-white flex items-center justify-center text-primary-blue"
          style={{ width: badgeSize, height: badgeSize }}
        >
          {badge}
        </div>
      )}
    </div>
  );
}

export function Pill({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-[4px] bg-white/95 border border-white rounded-full px-[10px] py-[4px] font-montserrat font-medium text-primary-blue text-[12px] leading-[16px] shadow-[0_1px_2px_rgba(0,0,0,0.08)] ${className}`}
    >
      {children}
    </span>
  );
}

export function ParticipantBadge({ count }: { count: number }) {
  return (
    <Pill>
      <PersonIcon width={12} height={12} />
      {count}
    </Pill>
  );
}

export function PersonRow({
  person,
  href,
  compact = false,
}: {
  person: PersonSummary;
  href?: string;
  compact?: boolean;
}) {
  const initial = (person.firstName || "?").charAt(0).toUpperCase();
  const inner = (
    <>
      <div className="relative w-[36px] h-[36px] shrink-0">
        {person.profilePicture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bustUrl(person.profilePicture, undefined)}
            alt=""
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <div className="w-full h-full rounded-full bg-primary-blue/15 text-primary-blue flex items-center justify-center font-montserrat font-semibold text-[14px]">
            {initial}
          </div>
        )}
        {person.newStory && (
          <span className="absolute -top-[1px] -right-[1px] w-[10px] h-[10px] rounded-full bg-primary-orange ring-2 ring-white" />
        )}
      </div>
      {!compact && (
        <>
          <span className="flex-1 font-montserrat font-medium text-primary-blue text-[14px] truncate">
            {person.firstName}
          </span>
          <ChevronRightIcon
            width={14}
            height={14}
            className="text-primary-blue/40"
          />
        </>
      )}
    </>
  );
  const cls = compact
    ? "flex items-center justify-center p-[4px] rounded-full hover:bg-black/[0.04] transition-colors"
    : "flex items-center gap-[10px] px-[6px] py-[6px] rounded-[12px] hover:bg-black/[0.04] transition-colors";
  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return <div className={cls}>{inner}</div>;
}
