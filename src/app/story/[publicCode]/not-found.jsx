import Link from "next/link";
import StoryNotFoundAnalytics from "../../../views/StoryPage/StoryNotFoundAnalytics";

export default function StoryNotFound() {
  return (
    <main className="min-h-screen bg-warm-cream flex items-center justify-center px-6">
      <StoryNotFoundAnalytics />
      <div className="max-w-[480px] text-center">
        <h1 className="font-ivy text-primary-blue text-[36px] md:text-[44px] leading-[110%] font-bold">
          This story isn&apos;t available anymore
        </h1>
        <p className="mt-[20px] font-montserrat text-primary-blue text-[16px] leading-[160%] opacity-80">
          The person who shared it may have made it private, or the link has
          expired. Ask them for a fresh link.
        </p>
        <Link
          href="/"
          className="inline-block mt-[28px] bg-primary-orange text-primary-white font-montserrat font-semibold text-[14px] px-[28px] py-[12px] rounded-full hover:opacity-90 transition-opacity"
        >
          Go to EpochLag
        </Link>
      </div>
    </main>
  );
}
