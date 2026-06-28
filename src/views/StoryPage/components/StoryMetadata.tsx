import { formatLongDate } from "../../../lib/formatters";

type StoryMetadataProps = {
  dateOfStory?: string;
  location?: { formattedAddress?: string } | string;
  music?: { trackName?: string; artistName?: string } | string;
};

const StoryMetadata = ({ dateOfStory, location, music }: StoryMetadataProps) => {
  const dateLabel = formatLongDate(dateOfStory);
  const locationLabel =
    typeof location === "object" ? location?.formattedAddress : location;
  const musicLabel =
    typeof music === "object" && music?.trackName && music?.artistName
      ? `${music.trackName} — ${music.artistName}`
      : typeof music === "object"
        ? music?.trackName || null
        : music || null;

  if (!dateLabel && !locationLabel && !musicLabel) return null;

  return (
    <div className="mt-[20px] flex flex-wrap gap-x-[16px] gap-y-[8px] font-montserrat text-primary-blue text-[13px] md:text-[14px] opacity-80">
      {dateLabel && <span>{dateLabel}</span>}
      {locationLabel && <span>· {locationLabel}</span>}
      {musicLabel && <span>· ♫ {musicLabel}</span>}
    </div>
  );
};

export default StoryMetadata;
