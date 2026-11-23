"use client";

// Your Circle — hub page. Two tabs: Relationship (ring layout + groups side
// panel) and Family Tree (follow-up). Fetches /api/circles once per session
// and reuses the cached payload on tab switches via the module-level cache
// in lib/circle/api.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  fetchCircles,
  fetchFamilyTree,
  getCachedCircles,
  setCachedCircles,
  type CirclesFeed,
  type FamilyTreePerson,
} from "../../../../lib/circle/api";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import { PersonIcon } from "../icons";
import AddConnectionSheet from "./AddConnectionSheet";
import FamilyTreeView from "./FamilyTreeView";
import GroupsPanel from "./GroupsPanel";
import RingView from "./RingView";

type Tab = "relationship" | "family-tree";

export default function CirclePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("relationship");
  const initial = getCachedCircles();
  const [feed, setFeed] = useState<CirclesFeed | null>(initial.data);
  const [loading, setLoading] = useState(!initial.isFresh);
  const [tree, setTree] = useState<FamilyTreePerson[] | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [addConnectionOpen, setAddConnectionOpen] = useState(false);
  // Separate ref guard so StrictMode's double-invoke doesn't start two
  // fetches whose cleanups then race each other and cancel both.
  const treeFetchStarted = useRef(false);

  useEffect(() => {
    if (initial.isFresh) return;
    let cancelled = false;
    setLoading(true);
    fetchCircles()
      .then((data) => {
        if (cancelled) return;
        setCachedCircles(data);
        setFeed(data);
      })
      .catch(() => {
        if (cancelled) return;
        setFeed({ people: [], groups: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lazy-load the Family Tree only when the user opens that tab, since it's a
  // separate BE surface. Cache for the session. StrictMode-safe: the ref
  // guard prevents double-fetch, and no cleanup races the setState calls.
  useEffect(() => {
    if (tab !== "family-tree") return;
    if (treeFetchStarted.current) return;
    treeFetchStarted.current = true;
    setTreeLoading(true);
    fetchFamilyTree()
      .then((list) => setTree(list))
      .catch(() => setTree([]))
      .finally(() => setTreeLoading(false));
  }, [tab]);

  return (
    <div className="min-h-full bg-[#F3F1EB]">
      <div className="mx-auto max-w-[1400px] px-[16px] sm:px-[24px] md:px-[40px] lg:px-[56px] pt-[16px] md:pt-[20px] pb-[48px] md:pb-[64px]">
        {/* Header */}
        <div className="flex items-start justify-between gap-[16px]">
          <h1 className="font-ivy text-[#2C2C2C] text-[28px] sm:text-[32px] md:text-[36px] leading-[1.1]">
            Your Circle
          </h1>
          <Link
            href="/connections"
            className="shrink-0 inline-flex items-center gap-[8px] rounded-full border border-[#092E4A]/25 text-[#2C2C2C] px-[14px] py-[8px] font-montserrat text-[12px] md:text-[13px] hover:bg-black/[0.03] transition-colors"
          >
            <PersonIcon width={16} height={16} />
            Manage Connections
          </Link>
        </div>

        {/* Tabs */}
        <div className="mt-[20px] md:mt-[24px] flex items-center gap-[8px]">
          <TabButton
            label="Relationship"
            active={tab === "relationship"}
            onClick={() => setTab("relationship")}
          />
          <TabButton
            label="Family Tree"
            active={tab === "family-tree"}
            onClick={() => setTab("family-tree")}
          />
        </div>

        {/* Body — two-col grid only on the Relationship tab (Groups panel
            lives in the right column). Family Tree gets the full width so
            the tree can center itself. */}
        <div
          className={`mt-[24px] md:mt-[32px] grid grid-cols-1 gap-[32px] items-start ${
            tab === "relationship"
              ? "xl:grid-cols-[minmax(0,1fr)_minmax(0,380px)] xl:gap-[48px]"
              : ""
          }`}
        >
          <div className="min-w-0">
            {tab === "relationship" ? (
              <RelationshipBody
                feed={feed}
                loading={loading}
                onAddConnection={() => setAddConnectionOpen(true)}
              />
            ) : (
              <FamilyTreeBody
                people={tree}
                loading={treeLoading}
                currentUser={user}
              />
            )}
          </div>

          {tab === "relationship" && (
            <GroupsPanel groups={feed?.groups ?? []} />
          )}
        </div>
      </div>

      <AddConnectionSheet
        open={addConnectionOpen}
        onClose={() => setAddConnectionOpen(false)}
      />
    </div>
  );
}

function RelationshipBody({
  feed,
  loading,
  onAddConnection,
}: {
  feed: CirclesFeed | null;
  loading: boolean;
  onAddConnection: () => void;
}) {
  if (loading && !feed) {
    return (
      <div className="flex items-center justify-center py-[48px]">
        <div className="w-[28px] h-[28px] border-[3px] border-primary-blue/20 border-t-primary-blue rounded-full animate-spin" />
      </div>
    );
  }
  const people = feed?.people ?? [];
  if (people.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-[48px] px-[24px]">
        <h2 className="font-ivy text-[#2C2C2C] text-[22px] md:text-[24px]">
          Build your circle
        </h2>
        <p className="mt-[8px] font-montserrat text-[#848484] text-[14px] max-w-[360px]">
          Add the people closest to you — family, friends, chosen family. They
          become the heart of every Lag you share.
        </p>
      </div>
    );
  }
  return <RingView people={people} onAddConnection={onAddConnection} />;
}

function FamilyTreeBody({
  people,
  loading,
  currentUser,
}: {
  people: FamilyTreePerson[] | null;
  loading: boolean;
  currentUser: ReturnType<typeof useAuth>["user"];
}) {
  if (people === null && loading) {
    return (
      <div className="flex items-center justify-center py-[48px]">
        <div className="w-[28px] h-[28px] border-[3px] border-primary-blue/20 border-t-primary-blue rounded-full animate-spin" />
      </div>
    );
  }
  return <FamilyTreeView people={people ?? []} currentUser={currentUser} />;
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-[18px] py-[8px] rounded-full font-montserrat text-[13px] md:text-[14px] transition-colors ${
        active
          ? "bg-primary-orange text-white"
          : "bg-white/70 text-[#2C2C2C] hover:bg-white"
      }`}
    >
      {label}
    </button>
  );
}
