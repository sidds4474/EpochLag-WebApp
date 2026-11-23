"use client";

import PolaroidImg1 from "../../assets/images/newimgs/polaroidImg1.jpg";
import PolaroidImg2 from "../../assets/images/newimgs/polaroidImg2.jpg";
import PolaroidImg3 from "../../assets/images/newimgs/polaroidImg3.png";
import PolaroidImg4 from "../../assets/images/newimgs/polaroidImg4.png";

// Scattered polaroid photos pinned to the desktop corners. Two tuck into the
// top-left corner, two mirror them into the bottom-right so the composition
// reads as a diagonal memory wall across the frame. Hidden on mobile.
export default function DecorativePolaroids() {
  const photos: Array<{
    src: string;
    position: string;
    rotate: string;
    size: string;
  }> = [
    {
      src: PolaroidImg1.src,
      position: "top-[80px] left-[-80px]",
      rotate: "-rotate-[14deg]",
      size: "w-[200px] h-[200px]",
    },
    {
      src: PolaroidImg2.src,
      position: "top-[-40px] left-[120px]",
      rotate: "rotate-[6deg]",
      size: "w-[200px] h-[240px]",
    },
    {
      src: PolaroidImg3.src,
      position: "bottom-[-40px] right-[120px]",
      rotate: "-rotate-[5deg]",
      size: "w-[200px] h-[240px]",
    },
    {
      src: PolaroidImg4.src,
      position: "bottom-[80px] right-[-80px]",
      rotate: "rotate-[14deg]",
      size: "w-[200px] h-[200px]",
    },
  ];

  return (
    <div
      className="hidden lg:block absolute inset-0 pointer-events-none"
      aria-hidden
    >
      {photos.map((p, i) => (
        <div
          key={i}
          className={`absolute ${p.position} ${p.rotate} ${p.size}`}
        >
          <div className="w-full h-full bg-white p-[10px] shadow-[0_6px_18px_rgba(0,0,0,0.18)]">
            <div className="w-full h-full overflow-hidden bg-[#D9D9D9]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.src}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
