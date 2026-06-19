import AuthorBadge from "./AuthorBadge";
import StoryMedia from "./StoryMedia";
import StoryMetadata from "./StoryMetadata";

const StoryBody = ({ stories, pageHeadline, showAuthorPerStory }) => {
  if (!stories?.length) return null;

  return (
    <div className="mt-[32px] md:mt-[40px]">
      {stories.map((story, index) => {
        const isFirst = index === 0;
        const showTitle = story.title && story.title !== pageHeadline;
        const paragraphs = (story.content || "").split(/\n+/).filter(Boolean);

        return (
          <section
            key={story._id || index}
            className={`${
              !isFirst
                ? "mt-[40px] md:mt-[56px] pt-[40px] md:pt-[56px] border-t border-primary-blue/15"
                : ""
            }`}
          >
            {showAuthorPerStory && story.author && (
              <div className="mb-[16px]">
                <AuthorBadge author={story.author} size="sm" />
              </div>
            )}

            {showTitle && (
              <h2 className="font-ivy font-semibold text-primary-blue text-[24px] md:text-[28px] leading-[120%] break-words">
                {story.title}
              </h2>
            )}

            {paragraphs.length > 0 && (
              <div
                className={`${
                  showTitle ? "mt-[16px]" : ""
                } font-montserrat text-primary-blue text-[16px] md:text-[18px] leading-[170%] space-y-[16px]`}
              >
                {paragraphs.map((p, i) => (
                  <p key={i} className="whitespace-pre-line">
                    {p}
                  </p>
                ))}
              </div>
            )}

            {story.media?.map((item, i) => (
              <StoryMedia
                key={`${story._id || index}-media-${i}`}
                item={item}
                storyTitle={story.title}
              />
            ))}

            <StoryMetadata
              dateOfStory={story.dateOfStory}
              location={story.location}
              music={story.music}
            />
          </section>
        );
      })}
    </div>
  );
};

export default StoryBody;
