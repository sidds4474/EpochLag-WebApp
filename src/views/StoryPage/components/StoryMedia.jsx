import { toResponsiveImage } from "../../../lib/cloudinary";

const StoryMedia = ({ item, storyTitle }) => {
  if (!item || !item.url) return null;

  const altText = storyTitle || "Story media";

  if (item.type === "image") {
    return (
      <figure className="my-[24px] overflow-hidden rounded-[12px] md:rounded-[16px] bg-primary-cream">
        <img
          src={toResponsiveImage(item.url, 1200)}
          alt={altText}
          loading="lazy"
          decoding="async"
          className="w-full h-auto object-cover"
        />
      </figure>
    );
  }

  if (item.type === "video") {
    return (
      <figure className="my-[24px] overflow-hidden rounded-[12px] md:rounded-[16px] bg-primary-blue">
        <video
          src={item.url}
          poster={item.thumbnailUrl || undefined}
          controls
          preload="metadata"
          playsInline
          className="w-full h-auto"
        >
          <track kind="captions" />
        </video>
      </figure>
    );
  }

  if (item.type === "audio") {
    return (
      <figure className="my-[24px] p-[16px] md:p-[20px] rounded-[12px] md:rounded-[16px] bg-primary-cream">
        <audio src={item.url} controls preload="metadata" className="w-full">
          <track kind="captions" />
        </audio>
      </figure>
    );
  }

  return null;
};

export default StoryMedia;
