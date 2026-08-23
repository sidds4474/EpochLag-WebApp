// Placeholder card matching StoryCard's outer shape (padding, cover
// aspect, title area) so grid rows don't jump when real data lands.
export default function StoryCardSkeleton() {
  return (
    <div className="flex flex-col bg-white rounded-[22px] shadow-[0_0_18px_rgba(0,0,0,0.12)] pt-[8px] px-[8px] pb-[16px] gap-[7px] animate-pulse">
      <div className="aspect-[5/4] bg-primary-blue/8 rounded-[15px]" />
      <div className="min-h-[36px] flex items-center justify-center px-[4px]">
        <div className="h-[10px] w-3/4 bg-primary-blue/10 rounded-full" />
      </div>
    </div>
  );
}
