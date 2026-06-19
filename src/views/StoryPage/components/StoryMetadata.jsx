import { formatLongDate } from "../../../lib/formatters";

const StoryMetadata = ({ dateOfStory, location, music }) => {
  const dateLabel = formatLongDate(dateOfStory);
  const locationLabel = location?.formattedAddress;
  const musicLabel =
    music?.trackName && music?.artistName
      ? `${music.trackName} — ${music.artistName}`
      : music?.trackName || null;

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
