import { headers } from "next/headers";
import { notFound } from "next/navigation";
import StoryPage from "../../../views/StoryPage/StoryPage";
import StoryError from "../../../views/StoryPage/StoryError";
import { fetchPublicStory, STORY_FETCH_STATUS } from "../../../lib/storyApi";
import { toOgImage } from "../../../lib/cloudinary";
import { detectPlatform } from "../../../lib/platform";
import { excerpt, fullName } from "../../../lib/formatters";

const SITE_URL = "https://www.epochlag.com";

export async function generateMetadata({ params }) {
  const { publicCode } = await params;
  const result = await fetchPublicStory(publicCode);

  if (result.status !== STORY_FETCH_STATUS.OK) {
    return {
      title: "Story not available",
      robots: { index: false, follow: false },
    };
  }

  const { prompt, stories } = result.data;
  const firstStory = stories?.[0];
  const headline = prompt?.isTitleAvailable
    ? firstStory?.title
    : prompt?.content;
  const storyTitle = firstStory?.title || headline || "A story on EpochLag";
  const authorFirstName = prompt?.author?.firstName || "Someone";
  const description = excerpt(firstStory?.content || "", 150);
  const url = `${SITE_URL}/story/${publicCode}`;
  const ogImage = toOgImage(prompt?.imageUrl);

  return {
    title: `${authorFirstName}'s Story — ${storyTitle}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: storyTitle,
      description,
      siteName: "Epoch Lag",
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: storyTitle,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function Page({ params }) {
  const { publicCode } = await params;
  const result = await fetchPublicStory(publicCode);

  if (result.status === STORY_FETCH_STATUS.NOT_FOUND) {
    notFound();
  }
  if (result.status === STORY_FETCH_STATUS.ERROR) {
    return <StoryError publicCode={publicCode} />;
  }

  const headersList = await headers();
  const platform = detectPlatform(headersList.get("user-agent") || "");

  return (
    <StoryPage
      data={result.data}
      publicCode={publicCode}
      platform={platform}
    />
  );
}
