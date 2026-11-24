"use client";

import PolaroidImg1 from "../../assets/images/newimgs/polaroidImg1.jpg";
import PolaroidImg2 from "../../assets/images/newimgs/polaroidImg2.jpg";
import PolaroidImg3 from "../../assets/images/newimgs/polaroidImg3.png";
import PolaroidImg4 from "../../assets/images/newimgs/polaroidImg4.png";

// Scattered polaroid photos. By default they're hidden below `lg` so the
// auth forms get the full viewport on mobile/tablet. Set `showOnMobile` to
// true for screens (e.g. onboarding/complete) where the Figma keeps a pair
// visible on small screens too.
export default function DecorativePolaroids({
  showOnMobile = false,
}: {
  showOnMobile?: boolean;
}) {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      {/* Top-left — primary mobile polaroid */}
      {showOnMobile ? (
        <PolaroidFrame
          src={PolaroidImg1.src}
          className="absolute top-[48px] left-[-50px] -rotate-[14deg] w-[140px] h-[140px] lg:top-[80px] lg:left-[-80px] lg:w-[200px] lg:h-[200px]"
        />
      ) : (
        <PolaroidFrame
          src={PolaroidImg1.src}
          className="hidden lg:block absolute top-[80px] left-[-80px] -rotate-[14deg] w-[200px] h-[200px]"
        />
      )}

      {/* Top-left companion — desktop only */}
      <PolaroidFrame
        src={PolaroidImg2.src}
        className="hidden lg:block absolute top-[-40px] left-[120px] rotate-[6deg] w-[200px] h-[240px]"
      />

      {/* Bottom-right companion — desktop only */}
      <PolaroidFrame
        src={PolaroidImg3.src}
        className="hidden lg:block absolute bottom-[-40px] right-[120px] -rotate-[5deg] w-[200px] h-[240px]"
      />

      {/* Bottom-right — primary mobile polaroid */}
      {showOnMobile ? (
        <PolaroidFrame
          src={PolaroidImg4.src}
          className="absolute bottom-[120px] right-[-50px] rotate-[14deg] w-[140px] h-[140px] lg:bottom-[80px] lg:right-[-80px] lg:w-[200px] lg:h-[200px]"
        />
      ) : (
        <PolaroidFrame
          src={PolaroidImg4.src}
          className="hidden lg:block absolute bottom-[80px] right-[-80px] rotate-[14deg] w-[200px] h-[200px]"
        />
      )}
    </div>
  );
}

function PolaroidFrame({ src, className }: { src: string; className: string }) {
  return (
    <div className={className}>
      <div className="w-full h-full bg-white p-[8px] lg:p-[10px] shadow-[0_6px_18px_rgba(0,0,0,0.18)]">
        <div className="w-full h-full overflow-hidden bg-[#D9D9D9]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="w-full h-full object-cover" />
        </div>
      </div>
    </div>
  );
}
