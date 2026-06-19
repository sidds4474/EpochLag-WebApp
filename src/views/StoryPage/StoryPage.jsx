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

  return (
    <main className="bg-warm-cream min-h-screen">
      <StoryViewAnalytics
        publicCode={publicCode}
        threadId={threadId}
        authorId={headerAuthor?._id}
      />
      <article className="max-w-[860px] mx-auto px-[16px] md:px-[24px] pt-[24px] pb-[40px] md:pb-[60px]">
        <StoryHero
          coverUrl={prompt?.imageUrl}
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
