import AuthorBadge from "./AuthorBadge";
import { toResponsiveImage } from "../../../lib/cloudinary";

const StoryHero = ({ coverUrl, headline, author, datePosted }) => {
  return (
    <header>
      {coverUrl ? (
        <div className="w-full overflow-hidden rounded-[16px] md:rounded-[24px] bg-primary-cream">
          <img
            src={toResponsiveImage(coverUrl, 1200)}
            alt={headline || "Story cover image"}
            className="w-full h-[320px] md:h-[460px] object-contain"
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
