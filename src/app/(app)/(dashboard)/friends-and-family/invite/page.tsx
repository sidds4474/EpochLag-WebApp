"use client";

import { useRouter } from "next/navigation";
import { ChevronLeftIcon } from "../../icons";

export default function InvitePage() {
  const router = useRouter();
  return (
    <div className="h-full flex flex-col min-h-0 overflow-y-auto bg-white">
      <div className="px-[16px] md:px-[24px] lg:px-[40px] pt-[16px] md:pt-[20px] max-w-[720px] mx-auto w-full">
        <div className="flex items-center gap-[12px]">
          <button
            type="button"
            onClick={() => router.push("/friends-and-family")}
            aria-label="Back"
            className="cursor-pointer w-[36px] h-[36px] rounded-full text-primary-blue flex items-center justify-center hover:bg-black/[0.06] transition"
          >
            <ChevronLeftIcon width={18} height={18} />
          </button>
          <h1 className="font-montserrat font-bold text-primary-blue text-[22px] md:text-[28px]">
            Invite friends
          </h1>
        </div>
        <p className="mt-[40px] text-center font-montserrat text-primary-blue/60 text-[15px]">
          Coming soon.
        </p>
      </div>
    </div>
  );
}
