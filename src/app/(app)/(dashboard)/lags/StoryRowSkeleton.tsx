export default function StoryRowSkeleton() {
  return (
    <div className="flex items-start gap-[16px] md:gap-[22px] py-[14px] md:py-[18px] border-b border-black/10 animate-pulse">
      <div className="shrink-0 bg-white p-[7px] md:p-[10px] rounded-[2px] shadow-[0_3px_4px_rgba(0,0,0,0.15)]">
        <div className="w-[86px] h-[91px] md:w-[128px] md:h-[135px] bg-primary-blue/10" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-[8px] pt-[8px] md:pt-[14px]">
        <div className="h-[16px] w-[55%] bg-primary-blue/10 rounded-full" />
        <div className="h-[12px] w-[30%] bg-primary-blue/10 rounded-full" />
        <div className="h-[24px] w-[80px] bg-primary-blue/10 rounded-full mt-[6px]" />
      </div>
      <div className="shrink-0 flex items-center gap-[14px] pt-[20px]">
        <div className="h-[20px] w-[16px] bg-primary-blue/10 rounded" />
        <div className="h-[20px] w-[20px] bg-primary-blue/10 rounded" />
      </div>
    </div>
  );
}
