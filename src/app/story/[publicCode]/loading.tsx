export default function StoryLoading() {
  return (
    <main className="min-h-screen bg-warm-cream">
      <div className="max-w-[860px] mx-auto px-[16px] md:px-[24px] pt-[24px] pb-[60px]">
        <div className="w-full aspect-[4/5] md:aspect-[16/9] bg-primary-cream rounded-[16px] md:rounded-[24px] animate-pulse" />
        <div className="mt-[28px] flex items-center gap-[12px]">
          <div className="w-[44px] h-[44px] rounded-full bg-primary-cream animate-pulse" />
          <div className="flex-1">
            <div className="h-[14px] w-[160px] bg-primary-cream rounded animate-pulse" />
            <div className="mt-[8px] h-[12px] w-[100px] bg-primary-cream rounded animate-pulse" />
          </div>
        </div>
        <div className="mt-[32px] h-[48px] w-3/4 bg-primary-cream rounded animate-pulse" />
        <div className="mt-[20px] space-y-[12px]">
          <div className="h-[14px] w-full bg-primary-cream rounded animate-pulse" />
          <div className="h-[14px] w-11/12 bg-primary-cream rounded animate-pulse" />
          <div className="h-[14px] w-10/12 bg-primary-cream rounded animate-pulse" />
        </div>
      </div>
    </main>
  );
}
