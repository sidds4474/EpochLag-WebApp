"use client";

import { useRouter } from "next/navigation";
import { ChevronLeftIcon } from "../icons";

// Friends & Family placeholder — connection list + pending friend
// requests screen ships in a follow-up.
export default function FriendsAndFamilyPage() {
  const router = useRouter();
  return (
    <div className="h-full flex flex-col min-h-0 overflow-y-auto bg-white">
      <div className="px-[16px] md:px-[24px] lg:px-[40px] pt-[16px] md:pt-[20px] flex items-center gap-[12px]">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="cursor-pointer w-[36px] h-[36px] rounded-full bg-[#ededed] text-primary-blue flex items-center justify-center hover:bg-[#e3e3e3] transition-colors"
        >
          <ChevronLeftIcon width={16} height={16} />
        </button>
        <h1 className="font-montserrat font-bold text-primary-blue text-[22px] md:text-[28px] leading-tight">
          Friends & Family
        </h1>
      </div>
      <div className="flex-1 flex items-center justify-center px-[24px]">
        <p className="font-montserrat text-primary-blue/60 text-[15px] text-center">
          Coming soon.
        </p>
      </div>
    </div>
  );
}
