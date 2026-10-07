// Placeholder card matching AlbumCard's shape: title/meta row on top,
// mosaic block below. Reserves the same footprint so the list doesn't
// reflow when real albums arrive.
export default function AlbumCardSkeleton() {
  return (
    <div className="flex flex-col bg-white rounded-[22px] shadow-[0_0_18px_rgba(0,0,0,0.12)] p-[16px] gap-[10px] animate-pulse">
      <div className="flex items-start justify-between gap-[12px]">
        <div className="flex-1 min-w-0 flex flex-col gap-[6px]">
          <div className="h-[12px] w-1/2 bg-primary-blue/12 rounded-full" />
          <div className="h-[9px] w-2/3 bg-primary-blue/8 rounded-full" />
        </div>
        <div className="shrink-0 h-[24px] w-[42px] bg-primary-blue/8 rounded-full" />
      </div>
      <div className="grid grid-cols-2 grid-rows-2 gap-[6px] h-[180px]">
        <div className="row-span-2 rounded-[8px] bg-primary-blue/8" />
        <div className="rounded-[8px] bg-primary-blue/8" />
        <div className="rounded-[8px] bg-primary-blue/8" />
      </div>
    </div>
  );
}
