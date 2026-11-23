"use client";

import { useRouter } from "next/navigation";
import { ChevronLeftIcon } from "../icons";

type Props = { title: string };

export default function PanelMobileHeader({ title }: Props) {
  const router = useRouter();
  return (
    <div className="md:hidden flex items-center gap-[12px] mb-[16px]">
      <button
        type="button"
        onClick={() => router.push("/settings")}
        aria-label="Back"
        className="cursor-pointer w-[36px] h-[36px] rounded-full bg-white hover:bg-white/90 shadow-[0_1px_3px_rgba(0,0,0,0.08)] text-[#232323] flex items-center justify-center transition-colors"
      >
        <ChevronLeftIcon width={16} height={16} />
      </button>
      <h1 className="font-ivy font-normal text-[#232323] text-[26px] leading-[1.15]">
        {title}
      </h1>
    </div>
  );
}
