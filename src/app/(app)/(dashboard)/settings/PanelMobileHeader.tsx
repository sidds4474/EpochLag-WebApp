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
        className="cursor-pointer w-[36px] h-[36px] rounded-full bg-[#EDEDED] text-primary-blue flex items-center justify-center"
      >
        <ChevronLeftIcon width={16} height={16} />
      </button>
      <h1 className="font-montserrat font-bold text-primary-blue text-[24px] leading-tight">
        {title}
      </h1>
    </div>
  );
}
