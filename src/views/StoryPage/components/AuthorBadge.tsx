import { fullName, getInitials } from "../../../lib/formatters";
import type { StoryAuthor } from "../../../types/story";

type AuthorBadgeProps = {
  author?: StoryAuthor & { profilePicture?: string | null };
  datePosted?: string;
  size?: "sm" | "md";
};

const AuthorBadge = ({ author, datePosted, size = "md" }: AuthorBadgeProps) => {
  if (!author) return null;

  const name = fullName(author.firstName, author.lastName) || "EpochLag user";
  const initials = getInitials(author.firstName, author.lastName);
  const dimensions =
    size === "sm" ? "w-[36px] h-[36px] text-[12px]" : "w-[44px] h-[44px] text-[14px]";

  const formattedDate = datePosted
    ? new Date(datePosted).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="flex items-center gap-[12px]">
      {author.profilePicture ? (
        <img
          src={author.profilePicture}
          alt={`${name}'s profile picture`}
          className={`${dimensions} rounded-full object-cover bg-primary-cream`}
          loading="lazy"
        />
      ) : (
        <div
          aria-hidden="true"
          className={`${dimensions} rounded-full bg-primary-orange text-primary-white font-montserrat font-semibold flex items-center justify-center`}
        >
          {initials}
        </div>
      )}
      <div className="leading-tight">
        <div className="font-montserrat font-semibold text-primary-blue text-[14px] md:text-[15px]">
          {name}
        </div>
        {formattedDate && (
          <div className="font-montserrat text-primary-blue text-[12px] md:text-[13px] opacity-70 mt-[2px]">
            {formattedDate}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthorBadge;
