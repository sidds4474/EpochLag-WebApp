import Link from "next/link";

const StoryError = () => {
  return (
    <main className="min-h-screen bg-warm-cream flex items-center justify-center px-6">
      <div className="max-w-[480px] text-center">
        <h1 className="font-ivy text-primary-blue text-[36px] md:text-[44px] leading-[110%] font-bold">
          We couldn&apos;t load this story
        </h1>
        <p className="mt-[20px] font-montserrat text-primary-blue text-[16px] leading-[160%] opacity-80">
          Something went wrong on our side. Try refreshing in a moment.
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
};

export default StoryError;
