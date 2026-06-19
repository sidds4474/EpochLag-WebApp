import AuthorBadge from "./AuthorBadge";
import StoryMedia from "./StoryMedia";
import StoryMetadata from "./StoryMetadata";
import {
  parseContentToBlocks,
  hasInlineMediaBlocks,
} from "../../../lib/parseStoryContent";

const TextBlock = ({ text }) => (
  <p className="whitespace-pre-line">{text}</p>
);

const MediaBlock = ({ block, storyTitle }) => (
  <div className="mx-auto max-w-[300px] md:max-w-[420px]">
    <StoryMedia
      item={{ type: block.type, url: block.url }}
      storyTitle={storyTitle}
    />
  </div>
);

const renderTaggedBlocks = (blocks, storyTitle, keyPrefix) => {
  const nodes = [];
  let textBuffer = [];

  const flushText = () => {
    if (textBuffer.length === 0) return;
    const merged = textBuffer.join("\n");
    nodes.push(
      <div
        key={`${keyPrefix}-text-${nodes.length}`}
        className="font-montserrat text-primary-blue text-[16px] md:text-[18px] leading-[170%]"
      >
        <TextBlock text={merged} />
      </div>
    );
    textBuffer = [];
  };

  blocks.forEach((b, i) => {
    if (b.type === "text") {
      textBuffer.push(b.text);
      return;
    }
    flushText();
    nodes.push(
      <div
        key={`${keyPrefix}-${b.type}-${i}`}
        className="my-[24px] md:my-[28px]"
      >
        <MediaBlock block={b} storyTitle={storyTitle} />
      </div>
    );
  });

  flushText();
  return nodes;
};

const renderLegacyBody = (story, mediaItems, showTitle) => {
  const paragraphs = (story.content || "").split(/\n+/).filter(Boolean);
  const visualMedia = mediaItems.filter(
    (m) => m?.type === "image" || m?.type === "video"
  );
  const audioMedia = mediaItems.filter((m) => m?.type === "audio");
  const isSingleVisual = visualMedia.length === 1;
  const hasMultipleVisuals = visualMedia.length > 1;

  return (
    <>
      {paragraphs.length > 0 && (
        <div
          className={`${
            showTitle ? "mt-[16px]" : ""
          } font-montserrat text-primary-blue text-[16px] md:text-[18px] leading-[170%] space-y-[16px]`}
        >
          {paragraphs.map((p, i) => (
            <TextBlock key={i} text={p} />
          ))}
        </div>
      )}

      {isSingleVisual && (
        <div className="my-[24px] mx-auto max-w-[300px] md:max-w-[420px]">
          <StoryMedia item={visualMedia[0]} storyTitle={story.title} />
        </div>
      )}
      {hasMultipleVisuals && (
        <div className="my-[24px] grid grid-cols-2 gap-[10px] md:gap-[14px]">
          {visualMedia.map((item, i) => (
            <StoryMedia
              key={`legacy-vmedia-${i}`}
              item={item}
              storyTitle={story.title}
            />
          ))}
        </div>
      )}
      {audioMedia.map((item, i) => (
        <div key={`legacy-audio-${i}`} className="my-[24px]">
          <StoryMedia item={item} storyTitle={story.title} />
        </div>
      ))}
    </>
  );
};

const StoryBody = ({ stories, pageHeadline, showAuthorPerStory }) => {
  if (!stories?.length) return null;

  return (
    <div className="mt-[32px] md:mt-[40px]">
      {stories.map((story, index) => {
        const isFirst = index === 0;
        const showTitle = story.title && story.title !== pageHeadline;

        // Filter cover-marked images out of media[] so they never duplicate the
        // hero (legacy path only; tagged content doesn't include the cover).
        const mediaItems = (story.media || []).filter(
          (m) => !(m?.type === "image" && m?.url?.includes("_cover.jpg"))
        );

        const blocks = parseContentToBlocks(story.content || "");
        const useTagged = hasInlineMediaBlocks(blocks);

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

            {useTagged
              ? renderTaggedBlocks(
                  blocks,
                  story.title,
                  `${story._id || index}`
                )
              : renderLegacyBody(story, mediaItems, showTitle)}

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
