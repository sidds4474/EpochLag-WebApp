import StoryNavBar from "../StoryPage/components/StoryNavBar";
import AppDownloadCTA from "../StoryPage/components/AppDownloadCTA";
import MomentViewAnalytics from "./MomentViewAnalytics";
import { toResponsiveImage } from "../../lib/cloudinary";
import { formatCalendarDay, parseCalendarDay, ordinalSuffix } from "../../lib/moments/date";
import type { Platform } from "../../types/story";
import type { PublicMomentData } from "../../types/moment";

type Props = {
  data: PublicMomentData;
  publicCode: string;
  platform: Platform;
};

function formatOrdinalDate(iso: string | null | undefined) {
  const parts = parseCalendarDay(iso);
  if (!parts) return "";
  const monthYear = formatCalendarDay(iso, { year: "numeric", month: "long" });
  const [month, year] = monthYear.split(" ");
  return `${month} ${parts.d}${ordinalSuffix(parts.d)}, ${year}`;
}

function countdownLabel(daysUntil: number | undefined | null) {
  if (daysUntil === undefined || daysUntil === null) return null;
  if (daysUntil === 0) return "Today";
  if (daysUntil === 1) return "Tomorrow";
  if (daysUntil > 1) return `in ${daysUntil} days`;
  if (daysUntil === -1) return "Yesterday";
  return `${Math.abs(daysUntil)} days ago`;
}

function capitalize(s: string | null | undefined) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const CalendarGlyph = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="w-[22px] h-[22px]"
  >
    <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
    <path d="M3 9.5h18" />
    <path d="M8 3v3M16 3v3" />
  </svg>
);

const PersonGlyph = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="w-[14px] h-[14px]"
  >
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4.5 20c1.2-3.8 4-5.5 7.5-5.5s6.3 1.7 7.5 5.5" />
  </svg>
);

const RepeatGlyph = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="w-[12px] h-[12px]"
  >
    <path d="M4 11V9a3 3 0 0 1 3-3h11" />
    <path d="M16 3l3 3-3 3" />
    <path d="M20 13v2a3 3 0 0 1-3 3H6" />
    <path d="M8 21l-3-3 3-3" />
  </svg>
);

const MomentPage = ({ data, publicCode, platform }: Props) => {
  const {
    title,
    type,
    date,
    note,
    coverImageUrl,
    isRecurring,
    frequency,
    nextOccurrence,
    daysUntil,
    participantCount,
    author,
  } = data;

  const displayDateIso = isRecurring ? nextOccurrence || date : date;
  const formattedDate = formatOrdinalDate(displayDateIso);
  const countdown = countdownLabel(daysUntil);

  return (
    <main className="bg-warm-cream min-h-screen">
      <MomentViewAnalytics publicCode={publicCode} momentType={type} />
      <StoryNavBar
        publicCode={publicCode}
        platform={platform}
        eventName="public_moment_app_cta_clicked"
      />

      <section className="px-[16px] md:px-[24px] pt-[16px] md:pt-[32px] pb-[24px] md:pb-[40px]">
        <div className="mx-auto w-full max-w-[460px]">
          {/* Poster card */}
          <div className="rounded-[24px] overflow-hidden bg-primary-white shadow-[0_8px_32px_rgba(30,50,80,0.10)]">
            {/* Cover */}
            {coverImageUrl ? (
              <div className="relative w-full aspect-[1/1] overflow-hidden bg-primary-cream">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 scale-110"
                  style={{
                    backgroundImage: `url(${toResponsiveImage(coverImageUrl, 600)})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: "blur(28px)",
                  }}
                />
                <div aria-hidden="true" className="absolute inset-0 bg-black/10" />
                <img
                  src={toResponsiveImage(coverImageUrl, 900) ?? undefined}
                  alt={title || "Moment cover image"}
                  className="relative w-full h-full object-cover"
                  fetchPriority="high"
                  decoding="async"
                />
              </div>
            ) : (
              <div className="w-full aspect-[1/1] bg-primary-cream flex items-center justify-center">
                <div className="text-primary-blue opacity-30">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="w-[80px] h-[80px]"
                  >
                    <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
                    <path d="M3 9.5h18" />
                    <path d="M8 3v3M16 3v3" />
                  </svg>
                </div>
              </div>
            )}

            {/* White panel */}
            <div className="relative -mt-[24px] rounded-t-[24px] bg-primary-white px-[24px] pt-[56px] pb-[28px] text-center">
              {/* Author line, floats top-left */}
              {author?.firstName && (
                <div className="absolute top-[18px] left-[18px] max-w-[calc(100%-90px)]">
                  <span className="font-montserrat text-primary-blue text-[12px] md:text-[13px] leading-none truncate opacity-70">
                    <span className="font-semibold opacity-100">{author.firstName}</span> shared a moment
                  </span>
                </div>
              )}

              {/* Participant chip, floats top-right */}
              {typeof participantCount === "number" && participantCount > 0 && (
                <div className="absolute top-[16px] right-[16px] inline-flex items-center gap-[6px] bg-primary-cream text-primary-blue rounded-full px-[10px] py-[5px]">
                  <PersonGlyph />
                  <span className="font-montserrat font-semibold text-[12px] leading-none">
                    {participantCount}
                  </span>
                </div>
              )}

              {/* Type icon */}
              <div className="mx-auto w-[44px] h-[44px] rounded-full bg-primary-cream text-primary-blue flex items-center justify-center">
                <CalendarGlyph />
              </div>

              {/* Type label */}
              {type && (
                <div className="mt-[12px] font-montserrat font-semibold uppercase tracking-[0.14em] text-[11px] text-primary-blue opacity-60">
                  {type}
                </div>
              )}

              {/* Title */}
              {title && (
                <h1 className="mt-[6px] font-ivy font-bold text-primary-blue text-[24px] md:text-[26px] leading-[120%] break-words">
                  {title}
                </h1>
              )}

              {/* Date + countdown */}
              {formattedDate && (
                <div className="mt-[10px] font-montserrat text-primary-blue text-[15px] leading-[150%]">
                  <div>{formattedDate}</div>
                  {countdown && (
                    <div className="mt-[2px] text-[13px] opacity-60">
                      {countdown}
                    </div>
                  )}
                </div>
              )}

              {/* Recurring indicator */}
              {isRecurring && frequency && (
                <div className="mt-[14px] inline-flex items-center gap-[6px] text-primary-blue opacity-70 font-montserrat text-[12px]">
                  <RepeatGlyph />
                  <span>Repeats {capitalize(frequency)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Note, below the card */}
          {note && note.trim() ? (
            <section className="mt-[28px] md:mt-[32px] font-montserrat text-primary-blue text-[16px] md:text-[17px] leading-[170%] whitespace-pre-wrap">
              {note}
            </section>
          ) : null}

        </div>
      </section>

      <AppDownloadCTA
        platform={platform}
        publicCode={publicCode}
        title="Never miss the moments that matter"
        subcopy="Track birthdays, anniversaries, and everything in between — with the people you love."
        eventName="public_moment_app_cta_clicked"
      />
    </main>
  );
};

export default MomentPage;
