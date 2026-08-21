import { headers } from "next/headers";
import { notFound } from "next/navigation";
import MomentPage from "../../../views/MomentPage/MomentPage";
import StoryError from "../../../views/StoryPage/StoryError";
import { fetchPublicMoment, MOMENT_FETCH_STATUS } from "../../../lib/momentApi";
import { toOgImage } from "../../../lib/cloudinary";
import { detectPlatform } from "../../../lib/platform";
import { excerpt } from "../../../lib/formatters";
import { formatCalendarDay } from "../../../lib/moments/date";

const SITE_URL = "https://www.epochlag.com";

type RouteParams = { params: Promise<{ publicCode: string }> };

export async function generateMetadata({ params }: RouteParams) {
  const { publicCode } = await params;
  const result = await fetchPublicMoment(publicCode);

  if (result.status !== MOMENT_FETCH_STATUS.OK) {
    return {
      title: "Moment not available",
      robots: { index: false, follow: false },
    };
  }

  const { title, type, date, nextOccurrence, isRecurring, note, coverImageUrl, author } =
    result.data;
  const authorFirstName = author?.firstName || "Someone";
  const displayDate = formatCalendarDay(
    isRecurring ? nextOccurrence || date : date,
    { year: "numeric", month: "long", day: "numeric" }
  );

  const headline = title || type || "A moment on Epoch Lag";
  const ogTitle = `${authorFirstName}'s ${type || "Moment"}${
    title ? ` — ${title}` : ""
  }`;
  const description = excerpt(
    note?.trim() ||
      (displayDate
        ? `${headline} · ${displayDate}`
        : `A moment shared by ${authorFirstName} on Epoch Lag.`),
    150
  );

  const url = `${SITE_URL}/moment/${publicCode}`;
  const ogImage = toOgImage(coverImageUrl);

  return {
    title: ogTitle,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: ogTitle,
      description,
      siteName: "Epoch Lag",
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function Page({ params }: RouteParams) {
  const { publicCode } = await params;
  const result = await fetchPublicMoment(publicCode);

  if (result.status === MOMENT_FETCH_STATUS.NOT_FOUND) {
    notFound();
  }
  if (result.status === MOMENT_FETCH_STATUS.ERROR) {
    return <StoryError />;
  }

  const headersList = await headers();
  const platform = detectPlatform(headersList.get("user-agent") || "");

  return (
    <MomentPage
      data={result.data}
      publicCode={publicCode}
      platform={platform}
    />
  );
}
