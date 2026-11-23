"use client";

// Connections — split pane on desktop (list + detail), single column on
// mobile (tap routes to /circle/person/:id). Three tabs: All / Invites /
// Pending.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, PersonIcon, SearchIcon } from "../icons";
import ConnectionsTab from "./ConnectionsTab";
import RequestsTab, { type RequestsApi } from "./RequestsTab";
import PendingTab from "./PendingTab";
import ConnectionDetail, { type DetailMode } from "./ConnectionDetail";
import AddConnectionSheet from "../circle/AddConnectionSheet";

type Tab = "all" | "invites" | "pending";

export default function ConnectionsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  // Selected user per tab — isolated so moving between tabs doesn't collapse
  // the detail on tabs that don't have that user.
  const [selectedAll, setSelectedAll] = useState<string | null>(null);
  const [selectedInvite, setSelectedInvite] = useState<{
    userId: string;
    requestId: string;
  } | null>(null);
  const [selectedPending, setSelectedPending] = useState<{
    userId: string;
    requestId: string;
  } | null>(null);
  const [invitesCount, setInvitesCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const requestsApi = useRef<RequestsApi | null>(null);
  // Force-remount when we need to refetch after a mutation (block/remove).
  const [allKey, setAllKey] = useState(0);
  const [invitesKey, setInvitesKey] = useState(0);
  const [pendingKey, setPendingKey] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const current: { mode: DetailMode; userId: string | null; requestId: string | null } =
    tab === "all"
      ? { mode: "all", userId: selectedAll, requestId: null }
      : tab === "invites"
        ? {
            mode: "invites",
            userId: selectedInvite?.userId ?? null,
            requestId: selectedInvite?.requestId ?? null,
          }
        : {
            mode: "pending",
            userId: selectedPending?.userId ?? null,
            requestId: selectedPending?.requestId ?? null,
          };

  const handleAcceptFromDetail = useCallback(
    async (userId: string) => {
      await requestsApi.current?.accept(userId);
      setSelectedInvite(null);
    },
    [],
  );
  const handleDeclineFromDetail = useCallback(
    async (userId: string) => {
      await requestsApi.current?.decline(userId);
      setSelectedInvite(null);
    },
    [],
  );

  function handleAfterRemove() {
    if (tab === "all") {
      setSelectedAll(null);
      setAllKey((k) => k + 1);
    } else if (tab === "invites") {
      setSelectedInvite(null);
      setInvitesKey((k) => k + 1);
    } else {
      setSelectedPending(null);
      setPendingKey((k) => k + 1);
    }
  }

  function handleAfterBlock() {
    // Block removes the user from every list.
    setSelectedAll(null);
    setSelectedInvite(null);
    setSelectedPending(null);
    setAllKey((k) => k + 1);
    setInvitesKey((k) => k + 1);
    setPendingKey((k) => k + 1);
  }

  return (
    <div className="min-h-full bg-[#F3F1EB]">
      <div className="mx-auto max-w-[1400px] px-[16px] sm:px-[24px] md:px-[40px] pt-[16px] md:pt-[20px] pb-[48px] md:pb-[64px]">
        {/* Header */}
        <div className="flex items-start justify-between gap-[16px]">
          <div className="flex items-center gap-[8px]">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Back"
              className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-[#2C2C2C] hover:bg-black/[0.04] transition-colors"
            >
              <ChevronLeftIcon width={18} height={18} />
            </button>
            <h1 className="font-ivy text-[#2C2C2C] text-[28px] sm:text-[32px] md:text-[36px] leading-[1.1]">
              Connections
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="shrink-0 inline-flex items-center gap-[8px] rounded-full border border-[#092E4A]/25 text-[#2C2C2C] px-[14px] py-[8px] font-montserrat text-[12px] md:text-[13px] hover:bg-black/[0.03] transition-colors"
          >
            <PersonIcon width={16} height={16} />
            Manage Connections
          </button>
        </div>

        {/* Mobile search */}
        {isMobile && (
          <div className="mt-[16px] relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Epoch Lag"
              className="w-full bg-white rounded-full h-[44px] pl-[16px] pr-[44px] font-montserrat text-[14px] text-[#2C2C2C] placeholder:text-[#848484] outline-none border border-black/5"
            />
            <SearchIcon
              width={18}
              height={18}
              className="absolute right-[14px] top-1/2 -translate-y-1/2 text-[#848484]"
            />
          </div>
        )}

        {/* Tabs */}
        <div className="mt-[20px] md:mt-[24px] flex items-center gap-[8px]">
          <TabButton
            label="All"
            active={tab === "all"}
            onClick={() => setTab("all")}
          />
          <TabButton
            label="Invites"
            active={tab === "invites"}
            onClick={() => setTab("invites")}
            badge={invitesCount}
          />
          <TabButton
            label="Pending"
            active={tab === "pending"}
            onClick={() => setTab("pending")}
            badge={pendingCount}
          />
        </div>

        {/* Body */}
        <div
          className={`mt-[20px] md:mt-[24px] grid gap-[24px] items-start ${
            isMobile
              ? "grid-cols-1"
              : "grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-[32px]"
          }`}
        >
          <div className="min-w-0">
            {tab === "all" && (
              <ConnectionsTab
                key={allKey}
                query={query}
                selectedUserId={selectedAll}
                onSelect={(id) => setSelectedAll(id)}
                mobile={isMobile}
              />
            )}
            {tab === "invites" && (
              <RequestsTab
                key={invitesKey}
                query={query}
                selectedUserId={selectedInvite?.userId ?? null}
                onSelect={(userId, requestId) =>
                  setSelectedInvite({ userId, requestId })
                }
                mobile={isMobile}
                onCountChange={setInvitesCount}
                onReady={(api) => {
                  requestsApi.current = api;
                }}
              />
            )}
            {tab === "pending" && (
              <PendingTab
                key={pendingKey}
                query={query}
                selectedUserId={selectedPending?.userId ?? null}
                onSelect={(userId, requestId) =>
                  setSelectedPending({ userId, requestId })
                }
                mobile={isMobile}
                onCountChange={setPendingCount}
              />
            )}
          </div>

          {!isMobile && current.userId && (
            <div className="min-w-0">
              <ConnectionDetail
                userId={current.userId}
                requestId={current.requestId}
                mode={current.mode}
                onAfterRemove={handleAfterRemove}
                onAfterBlock={handleAfterBlock}
                onAcceptInvite={handleAcceptFromDetail}
                onDeclineInvite={handleDeclineFromDetail}
              />
            </div>
          )}
        </div>
      </div>

      <AddConnectionSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
  badge,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-[6px] px-[16px] py-[8px] rounded-full font-montserrat text-[13px] md:text-[14px] transition-colors ${
        active
          ? "bg-[#2C2C2C] text-white"
          : "bg-white/70 text-[#2C2C2C] hover:bg-white"
      }`}
    >
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-[6px] rounded-full bg-primary-orange text-white font-montserrat font-semibold text-[11px]">
          {badge}
        </span>
      )}
    </button>
  );
}
