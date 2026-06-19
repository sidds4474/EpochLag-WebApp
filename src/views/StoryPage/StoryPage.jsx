import StoryHero from "./components/StoryHero";
import StoryBody from "./components/StoryBody";
import AppDownloadCTA from "./components/AppDownloadCTA";
import StoryViewAnalytics from "./StoryViewAnalytics";

const StoryPage = ({ data, publicCode, platform }) => {
  const { prompt, stories, threadId } = data;
  const firstStory = stories?.[0];
  const headline = prompt?.isTitleAvailable
    ? firstStory?.title
    : prompt?.content;
  const headerAuthor = prompt?.author || firstStory?.author;
  const datePosted = firstStory?.createdAt;

  // Backend marks cover-cropped images with "_cover.jpg" in the URL and inline
  // images with "_img...jpg". When prompt.imageUrl is missing, lift the first
  // cover-marked image up to the hero. The body always filters out cover-marked
  // images so they never render inline.
  const firstCoverMedia = firstStory?.media?.find(
    (m) => m?.type === "image" && m?.url?.includes("_cover.jpg")
  );
  const coverUrl = prompt?.imageUrl || firstCoverMedia?.url || null;

  return (
    <main className="bg-warm-cream min-h-screen">
      <StoryViewAnalytics
        publicCode={publicCode}
        threadId={threadId}
        authorId={headerAuthor?._id}
      />
      <article className="max-w-[860px] mx-auto px-[16px] md:px-[24px] pt-[24px] pb-[40px] md:pb-[60px]">
        <StoryHero
          coverUrl={coverUrl}
          headline={headline}
          author={headerAuthor}
          datePosted={datePosted}
        />
        <StoryBody
          stories={stories || []}
          pageHeadline={headline}
          showAuthorPerStory={Boolean(
            prompt?.author &&
              stories?.some((s) => s.author?._id !== prompt.author._id)
          )}
        />
      </article>
      <AppDownloadCTA platform={platform} publicCode={publicCode} />
    </main>
  );
};

export default StoryPage;
