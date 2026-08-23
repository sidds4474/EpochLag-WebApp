"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSelectMode } from "./selectMode";

// On album detail (/library/albums/[id]), swap "Library" for a back-button
// "Album" heading so the album reads as its own context, matching mobile.
// This surface also hosts the shared headerRight slot (Select + ⋯ menu)
// since the tabs row is hidden on the detail route.
export default function LibraryHeading() {
  const pathname = usePathname() ?? "";
  const { headerRight } = useSelectMode();
  const isAlbumDetail = /^\/library\/albums\/[^/]+/.test(pathname);

  if (isAlbumDetail) {
    return (
      <div className="flex items-center justify-between gap-[16px] mb-[16px]">
        <div className="flex items-center gap-[10px]">
          <Link
            href="/library/albums"
            aria-label="Back to albums"
            className="cursor-pointer w-[34px] h-[34px] rounded-full bg-[#ededed] flex items-center justify-center text-primary-blue hover:bg-black/[0.08] transition-colors shrink-0"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <h1 className="font-montserrat font-bold text-primary-blue text-[24px] md:text-[28px] leading-tight">
            Album
          </h1>
        </div>
        {headerRight}
      </div>
    );
  }

  return (
    <h1 className="font-montserrat font-bold text-primary-blue text-[24px] md:text-[28px] leading-tight mb-[16px]">
      Library
    </h1>
  );
}
