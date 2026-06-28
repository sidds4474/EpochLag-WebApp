import AuthorBadge from "./AuthorBadge";
import { toResponsiveImage } from "../../../lib/cloudinary";
import type { StoryAuthor } from "../../../types/story";

type StoryHeroProps = {
  coverUrl?: string | null;
  headline?: string;
  author?: StoryAuthor;
  datePosted?: string;
};

const StoryHero = ({
  coverUrl,
  headline,
  author,
  datePosted,
}: StoryHeroProps) => {
  return (
    <header>
      {coverUrl ? (
        <div className="relative w-full h-[320px] md:h-[460px] overflow-hidden rounded-[16px] md:rounded-[24px] bg-primary-cream">
          <div
            aria-hidden="true"
            className="absolute inset-0 scale-110"
            style={{
              backgroundImage: `url(${toResponsiveImage(coverUrl, 600)})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(28px)",
            }}
          />
          <div aria-hidden="true" className="absolute inset-0 bg-black/10" />
          <img
            src={toResponsiveImage(coverUrl, 1200) ?? undefined}
            alt={headline || "Story cover image"}
            className="relative w-full h-full object-contain"
            fetchPriority="high"
            decoding="async"
          />
        </div>
      ) : null}

      <div className={`${coverUrl ? "mt-[24px] md:mt-[32px]" : ""}`}>
        <AuthorBadge author={author} datePosted={datePosted} />
        {headline && (
          <h1 className="mt-[20px] md:mt-[24px] font-ivy font-bold text-primary-blue text-[32px] md:text-[44px] lg:text-[52px] leading-[110%] break-words">
            {headline}
          </h1>
        )}
      </div>
    </header>
  );
};

export default StoryHero;
