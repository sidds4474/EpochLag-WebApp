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

        // Filter out cover-marked images so they don't render inline as well.
        const mediaItems = (story.media || []).filter(
          (m) => !(m?.type === "image" && m?.url?.includes("_cover.jpg"))
        );

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

            {(() => {
              const visualMedia = mediaItems.filter(
                (m) => m?.type === "image" || m?.type === "video"
              );
              const audioMedia = mediaItems.filter((m) => m?.type === "audio");
              const isSingleVisual = visualMedia.length === 1;
              const hasMultipleVisuals = visualMedia.length > 1;

              return (
                <>
                  {isSingleVisual && (
                    <div className="my-[24px] mx-auto max-w-[300px] md:max-w-[420px]">
                      <StoryMedia
                        item={visualMedia[0]}
                        storyTitle={story.title}
                      />
                    </div>
                  )}
                  {hasMultipleVisuals && (
                    <div className="my-[24px] grid grid-cols-2 gap-[10px] md:gap-[14px]">
                      {visualMedia.map((item, i) => (
                        <StoryMedia
                          key={`${story._id || index}-vmedia-${i}`}
                          item={item}
                          storyTitle={story.title}
                        />
                      ))}
                    </div>
                  )}
                  {audioMedia.map((item, i) => (
                    <div
                      key={`${story._id || index}-audio-${i}`}
                      className="my-[24px]"
                    >
                      <StoryMedia item={item} storyTitle={story.title} />
                    </div>
                  ))}
                </>
              );
            })()}

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
