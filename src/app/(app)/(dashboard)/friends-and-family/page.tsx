"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, PlusIcon, SearchIcon } from "../icons";
import ConnectionsTab from "./ConnectionsTab";
import RequestsTab from "./RequestsTab";
import PendingTab from "./PendingTab";
import CreateGroupDrawer from "./CreateGroupDrawer";
import type { GroupSummary } from "../../../../types/home";

type Tab = "connections" | "requests" | "pending";

export default function FriendsAndFamilyPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("connections");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<GroupSummary | null>(null);

  const tabs: { id: Tab; label: string }[] = [
    { id: "connections", label: "Connections" },
    { id: "requests", label: "Requests" },
    { id: "pending", label: "Pending" },
  ];

  return (
    <div className="h-full flex flex-col min-h-0 overflow-y-auto bg-white">
      <div className="px-[16px] md:px-[24px] lg:px-[40px] pt-[16px] md:pt-[20px] pb-[100px] md:pb-[40px] max-w-[1440px] mx-auto w-full">
        <div className="flex items-center justify-between gap-[12px]">
          <div className="flex items-center gap-[10px]">
            <button
              type="button"
              onClick={() => router.push("/studio")}
              aria-label="Back"
              className="cursor-pointer w-[36px] h-[36px] rounded-full bg-[#EDEDED] text-primary-blue flex items-center justify-center hover:brightness-95 transition"
            >
              <ChevronLeftIcon width={18} height={18} />
            </button>
            <h1 className="font-montserrat font-bold text-primary-blue text-[22px] md:text-[28px] leading-tight">
              Friends and family
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            aria-label="Create group"
            className="md:hidden cursor-pointer w-[36px] h-[36px] rounded-full text-primary-blue flex items-center justify-center hover:bg-black/[0.06] transition-colors"
          >
            <PlusIcon width={22} height={22} strokeWidth={2.2} />
          </button>
        </div>

        <div className="md:hidden mt-[16px] bg-[#EDEDED] rounded-full p-[4px] flex">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex-1 cursor-pointer rounded-full h-[36px] font-montserrat font-semibold text-[13px] transition ${
                  active
                    ? "bg-primary-orange text-white"
                    : "text-primary-blue"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="md:hidden mt-[12px] relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full bg-[#EDEDED] rounded-full h-[44px] pl-[16px] pr-[44px] font-montserrat text-[14px] text-primary-blue placeholder:text-primary-blue/50 outline-none"
          />
          <SearchIcon
            width={18}
            height={18}
            className="absolute right-[14px] top-1/2 -translate-y-1/2 text-primary-blue/50"
          />
        </div>

        <div className="hidden md:flex mt-[16px] items-center justify-between gap-[12px] flex-wrap">
          <div className="inline-flex items-center bg-[#EDEDED] rounded-full p-[4px]">
            {tabs.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`cursor-pointer rounded-full h-[36px] px-[20px] font-montserrat font-semibold text-[14px] transition ${
                    active
                      ? "bg-primary-blue text-white"
                      : "text-primary-blue"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          {tab !== "connections" && (
            <div className="flex items-center gap-[8px]">
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="cursor-pointer border border-primary-blue text-primary-blue rounded-full h-[36px] px-[16px] font-montserrat font-semibold text-[13px] hover:bg-black/[0.03] transition"
              >
                Create group
              </button>
              <button
                type="button"
                onClick={() => router.push("/friends-and-family/invite")}
                className="cursor-pointer bg-primary-orange text-white rounded-full h-[36px] pl-[10px] pr-[16px] font-montserrat font-semibold text-[13px] hover:opacity-90 transition inline-flex items-center gap-[6px]"
              >
                <InvitePlusIcon />
                Invite
              </button>
            </div>
          )}
        </div>

        <div className="mt-[16px]">
          {tab === "connections" && (
            <ConnectionsTab
              query={query}
              onOpenCreate={() => setCreateOpen(true)}
              createdGroup={createdGroup}
              onCreatedConsumed={() => setCreatedGroup(null)}
            />
          )}
          {tab === "requests" && <RequestsTab query={query} />}
          {tab === "pending" && <PendingTab query={query} />}
        </div>
      </div>

      <CreateGroupDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(g) => setCreatedGroup(g)}
      />
    </div>
  );
}

function InvitePlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9.81492 5.55469C8.26911 5.55469 7.01598 6.81047 7.01598 8.35957V9.82298C7.01598 11.3721 8.26911 12.6279 9.81492 12.6279C11.237 12.6279 12.4114 11.5651 12.5903 10.1888L10.3017 10.1888C10.1001 10.1888 9.93662 10.025 9.93662 9.82298C9.93662 9.62092 10.1001 9.45713 10.3017 9.45713L12.6139 9.45713V8.72542H10.3017C10.1001 8.72542 9.93662 8.56162 9.93662 8.35957C9.93662 8.15751 10.1001 7.99371 10.3017 7.99371H12.5903C12.4114 6.61748 11.237 5.55469 9.81492 5.55469Z" fill="#092E4A"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M5.92074 8.96932C6.12237 8.96932 6.28582 9.13312 6.28582 9.33518V9.82298C6.28582 11.7762 7.86586 13.3596 9.81492 13.3596C11.764 13.3596 13.344 11.7762 13.344 9.82298V9.33518C13.344 9.13312 13.5075 8.96932 13.7091 8.96932C13.9107 8.96932 14.0742 9.13312 14.0742 9.33518V9.82298C14.0742 12.0571 12.3614 13.8902 10.18 14.0758V15.1888C10.18 15.3909 10.0166 15.5547 9.81492 15.5547C9.6133 15.5547 9.44984 15.3909 9.44984 15.1888V14.0758C7.26842 13.8902 5.55566 12.0571 5.55566 9.82298V9.33518C5.55566 9.13312 5.71912 8.96932 5.92074 8.96932Z" fill="#092E4A"/>
      <path d="M9.81492 5.55469C8.26911 5.55469 7.01598 6.81047 7.01598 8.35957V9.82298C7.01598 11.3721 8.26911 12.6279 9.81492 12.6279C11.237 12.6279 12.4114 11.5651 12.5903 10.1888L10.3017 10.1888C10.1001 10.1888 9.93662 10.025 9.93662 9.82298C9.93662 9.62092 10.1001 9.45713 10.3017 9.45713L12.6139 9.45713V8.72542H10.3017C10.1001 8.72542 9.93662 8.56162 9.93662 8.35957C9.93662 8.15751 10.1001 7.99371 10.3017 7.99371H12.5903C12.4114 6.61748 11.237 5.55469 9.81492 5.55469Z" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M5.92074 8.96932C6.12237 8.96932 6.28582 9.13312 6.28582 9.33518V9.82298C6.28582 11.7762 7.86586 13.3596 9.81492 13.3596C11.764 13.3596 13.344 11.7762 13.344 9.82298V9.33518C13.344 9.13312 13.5075 8.96932 13.7091 8.96932C13.9107 8.96932 14.0742 9.13312 14.0742 9.33518V9.82298C14.0742 12.0571 12.3614 13.8902 10.18 14.0758V15.1888C10.18 15.3909 10.0166 15.5547 9.81492 15.5547C9.6133 15.5547 9.44984 15.3909 9.44984 15.1888V14.0758C7.26842 13.8902 5.55566 12.0571 5.55566 9.82298V9.33518C5.55566 9.13312 5.71912 8.96932 5.92074 8.96932Z" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M5.1853 10.6256V10.1163C5.1853 8.44214 5.1853 7.60505 5.63928 7.04163C5.72239 6.93849 5.81525 6.84391 5.91652 6.75926C6.46969 6.29688 7.29156 6.29688 8.9353 6.29688C10.579 6.29688 11.4009 6.29688 11.9541 6.75926C12.0554 6.84391 12.1482 6.93849 12.2313 7.04163C12.5821 7.47698 12.6618 8.07573 12.68 9.09781L13.0145 8.93016C13.9874 8.43468 14.4739 8.18694 14.8296 8.41085C15.1853 8.63476 15.1853 9.18872 15.1853 10.2966V10.4452C15.1853 11.5532 15.1853 12.1071 14.8296 12.3311C14.4739 12.555 13.9874 12.3072 13.0145 11.8117L12.68 11.6441C12.6618 12.6662 12.5821 13.2649 12.2313 13.7003C12.1482 13.8034 12.0554 13.898 11.9541 13.9826C11.4009 14.445 10.579 14.445 8.9353 14.445C7.29156 14.445 6.46969 14.445 5.91652 13.9826C5.81525 13.898 5.72239 13.8034 5.63928 13.7003C5.1853 13.1368 5.1853 12.2998 5.1853 10.6256ZM10.9656 9.12869C11.2585 8.83038 11.2585 8.34671 10.9656 8.04839C10.6727 7.75007 10.1979 7.75007 9.90497 8.04839C9.61208 8.34671 9.61208 8.83038 9.90497 9.12869C10.1979 9.42701 10.6727 9.42701 10.9656 9.12869Z" fill="#092E4A"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M8.18919 14.0725H10.3291C11.8318 14.0725 12.5832 14.0725 13.1229 13.7093C13.3566 13.5521 13.5572 13.3501 13.7133 13.1148C14.074 12.5713 14.074 11.8147 14.074 10.3014C14.074 8.78821 14.074 8.0316 13.7133 7.48809C13.5572 7.2528 13.3566 7.05078 13.1229 6.89356C12.7761 6.6602 12.3419 6.57679 11.6772 6.54698C11.3599 6.54698 11.0868 6.30492 11.0246 5.99167C10.9313 5.52181 10.5216 5.18359 10.0457 5.18359H8.47257C7.99673 5.18359 7.58704 5.52181 7.49372 5.99167C7.43151 6.30492 7.15838 6.54698 6.84115 6.54698C6.17639 6.57679 5.74219 6.6602 5.39538 6.89356C5.16172 7.05078 4.9611 7.2528 4.80498 7.48809C4.44434 8.0316 4.44434 8.78821 4.44434 10.3014C4.44434 11.8147 4.44434 12.5713 4.80498 13.1148C4.9611 13.3501 5.16172 13.5521 5.39538 13.7093C5.93512 14.0725 6.68648 14.0725 8.18919 14.0725ZM9.25915 8.28124C8.15117 8.28124 7.25298 9.18571 7.25298 10.3014C7.25298 11.4172 8.15117 12.3216 9.25915 12.3216C10.3671 12.3216 11.2653 11.4172 11.2653 10.3014C11.2653 9.18571 10.3671 8.28124 9.25915 8.28124ZM9.25915 9.08932C8.59436 9.08932 8.05545 9.632 8.05545 10.3014C8.05545 10.9709 8.59436 11.5136 9.25915 11.5136C9.92394 11.5136 10.4629 10.9709 10.4629 10.3014C10.4629 9.632 9.92394 9.08932 9.25915 9.08932ZM11.5328 8.68528C11.5328 8.46213 11.7125 8.28124 11.934 8.28124H12.469C12.6906 8.28124 12.8703 8.46213 12.8703 8.68528C12.8703 8.90842 12.6906 9.08932 12.469 9.08932H11.934C11.7125 9.08932 11.5328 8.90842 11.5328 8.68528Z" fill="#092E4A"/>
      <path d="M12.6282 12.4708L12.6282 12.4708L15.963 9.13592C15.5092 8.94702 14.9716 8.63672 14.4632 8.12831C13.9547 7.61983 13.6444 7.08217 13.4555 6.62825L10.1206 9.96314L10.1206 9.96315C9.86035 10.2234 9.73022 10.3535 9.61832 10.497C9.48631 10.6662 9.37313 10.8494 9.28079 11.0431C9.20251 11.2074 9.14432 11.382 9.02793 11.7311L8.4142 13.5723C8.35693 13.7441 8.40164 13.9336 8.52971 14.0616C8.65778 14.1897 8.84722 14.2344 9.01904 14.1771L10.8602 13.5634C11.2094 13.447 11.384 13.3888 11.5482 13.3106C11.742 13.2182 11.9251 13.105 12.0944 12.973C12.2378 12.8611 12.368 12.731 12.6282 12.4708Z" fill="#092E4A"/>
      <path d="M16.8884 8.21055C17.5809 7.51809 17.5809 6.39539 16.8884 5.70294C16.196 5.01048 15.0733 5.01048 14.3808 5.70294L13.9808 6.10291C13.9863 6.11945 13.992 6.13621 13.9979 6.1532C14.1445 6.57576 14.4211 7.1297 14.9414 7.65005C15.4618 8.17041 16.0157 8.44701 16.4383 8.59362C16.4552 8.59948 16.4719 8.60514 16.4884 8.61059L16.8884 8.21055Z" fill="#092E4A"/>
      <path d="M2.59253 14.2031L6.45743 14.2031" stroke="#092E4A" strokeWidth="1.73921" strokeLinecap="round"/>
      <circle cx="10" cy="10" r="9.25" fill="#EF9849" stroke="white" strokeWidth="1.5"/>
      <path d="M10 5.29297V15.293" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M14.7063 10.5859L5.29453 10.5859" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
