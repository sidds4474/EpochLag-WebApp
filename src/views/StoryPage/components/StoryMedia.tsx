import { toResponsiveImage } from "../../../lib/cloudinary";

type StoryMediaItem = {
  type: "image" | "video" | "audio";
  url: string;
  thumbnailUrl?: string | null;
};

type StoryMediaProps = {
  item: StoryMediaItem | null | undefined;
  storyTitle?: string;
};

const StoryMedia = ({ item, storyTitle }: StoryMediaProps) => {
  if (!item || !item.url) return null;

  const altText = storyTitle || "Story media";

  if (item.type === "image") {
    return (
      <figure className="overflow-hidden rounded-[12px] md:rounded-[16px] bg-primary-cream">
        <img
          src={toResponsiveImage(item.url, 800) ?? undefined}
          alt={altText}
          loading="lazy"
          decoding="async"
          className="w-full aspect-square object-cover"
        />
      </figure>
    );
  }

  if (item.type === "video") {
    return (
      <figure className="overflow-hidden rounded-[12px] md:rounded-[16px] bg-primary-blue">
        <video
          src={item.url}
          poster={item.thumbnailUrl || undefined}
          controls
          preload="metadata"
          playsInline
          className="w-full aspect-square object-cover"
        >
          <track kind="captions" />
        </video>
      </figure>
    );
  }

  if (item.type === "audio") {
    return (
      <figure className="p-[16px] md:p-[20px] rounded-[12px] md:rounded-[16px] bg-primary-cream">
        <audio src={item.url} controls preload="metadata" className="w-full">
          <track kind="captions" />
        </audio>
      </figure>
    );
  }

  return null;
};

export default StoryMedia;
