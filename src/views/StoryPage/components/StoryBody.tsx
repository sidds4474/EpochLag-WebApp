import type { ReactNode } from "react";
import AuthorBadge from "./AuthorBadge";
import StoryMedia from "./StoryMedia";
import StoryMetadata from "./StoryMetadata";
import {
  parseContentToBlocks,
  hasInlineMediaBlocks,
} from "../../../lib/parseStoryContent";
import type {
  ContentBlock,
  Story,
  StoryMedia as StoryMediaType,
} from "../../../types/story";

const renderBlocks = (
  blocks: ContentBlock[],
  storyTitle: string | undefined,
  keyPrefix: string
): ReactNode[] => {
  // Group consecutive text blocks into a single paragraph stack so the
  // typography rhythm matches the article layout.
  const nodes: ReactNode[] = [];
  let textBuffer: string[] = [];

  const flushText = () => {
    if (textBuffer.length === 0) return;
    nodes.push(
      <div
        key={`${keyPrefix}-text-${nodes.length}`}
        className="font-montserrat text-primary-blue text-[16px] md:text-[18px] leading-[170%] space-y-[16px]"
      >
        {textBuffer.map((t, i) => (
          <p key={i} className="whitespace-pre-line">
            {t}
          </p>
        ))}
      </div>
    );
    textBuffer = [];
  };

  blocks.forEach((b, i) => {
    if (b.type === "text") {
      if (b.text && b.text.trim()) textBuffer.push(b.text);
      return;
    }
    flushText();
    nodes.push(
      <div
        key={`${keyPrefix}-${b.type}-${i}`}
        className="my-[24px] md:my-[28px] mx-auto max-w-[300px] md:max-w-[420px]"
      >
        <StoryMedia
          item={{ type: b.type, url: b.url }}
          storyTitle={storyTitle}
        />
      </div>
    );
  });

  flushText();
  return nodes;
};

const renderLegacyMediaGrid = (
  mediaItems: StoryMediaType[],
  storyTitle: string | undefined,
  keyPrefix: string
) => {
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
          <StoryMedia item={visualMedia[0]} storyTitle={storyTitle} />
        </div>
      )}
      {hasMultipleVisuals && (
        <div className="my-[24px] grid grid-cols-2 gap-[10px] md:gap-[14px]">
          {visualMedia.map((item, i) => (
            <StoryMedia
              key={`${keyPrefix}-vmedia-${i}`}
              item={item}
              storyTitle={storyTitle}
            />
          ))}
        </div>
      )}
      {audioMedia.map((item, i) => (
        <div key={`${keyPrefix}-audio-${i}`} className="my-[24px]">
          <StoryMedia item={item} storyTitle={storyTitle} />
        </div>
      ))}
    </>
  );
};

type StoryBodyProps = {
  stories: Story[];
  pageHeadline?: string;
  showAuthorPerStory: boolean;
};

const StoryBody = ({
  stories,
  pageHeadline,
  showAuthorPerStory,
}: StoryBodyProps) => {
  if (!stories?.length) return null;

  return (
    <div className="mt-[32px] md:mt-[40px]">
      {stories.map((story, index) => {
        const isFirst = index === 0;
        const showTitle = story.title && story.title !== pageHeadline;
        const keyPrefix = `${story._id || index}`;

        // Always parse content. The parser is the only thing that touches the
        // raw content string, so tags (<text>, <image>, etc.) never leak into
        // the rendered output.
        const blocks = parseContentToBlocks(story.content || "");
        const contentHasInlineMedia = hasInlineMediaBlocks(blocks);

        // Legacy stories may store inline media in story.media[] without
        // referencing it in content. Render those as a grid only when the
        // content didn't already include inline media tags (otherwise we'd
        // duplicate the media). Also skip cover-marked images.
        const legacyMediaItems = !contentHasInlineMedia
          ? (story.media || []).filter(
              (m) => !(m?.type === "image" && m?.url?.includes("_cover.jpg"))
            )
          : [];

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
              <h2 className="font-ivy font-semibold text-primary-blue text-[24px] md:text-[28px] leading-[120%] break-words mb-[16px]">
                {story.title}
              </h2>
            )}

            {renderBlocks(blocks, story.title, keyPrefix)}

            {legacyMediaItems.length > 0 &&
              renderLegacyMediaGrid(legacyMediaItems, story.title, keyPrefix)}

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
