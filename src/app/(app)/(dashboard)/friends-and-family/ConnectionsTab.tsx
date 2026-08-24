"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { fetchHomePeople } from "../../../../lib/home/api";
import type { GroupSummary, PersonSummary } from "../../../../types/home";
import GroupTile from "./GroupTile";
import GroupDrawer from "./GroupDrawer";
import ConnectionRow from "./ConnectionRow";

function SkeletonRow() {
  return (
    <div className="bg-[#f3f3f3] animate-pulse rounded-[16px] h-[72px]" />
  );
}

export default function ConnectionsTab({
  query,
  onOpenCreate,
  createdGroup,
  onCreatedConsumed,
}: {
  query: string;
  onOpenCreate: () => void;
  createdGroup: GroupSummary | null;
  onCreatedConsumed: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<PersonSummary[]>([]);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [drawerGroup, setDrawerGroup] = useState<GroupSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchHomePeople();
        if (cancelled) return;
        setUsers(data?.users ?? []);
        setGroups(data?.groups ?? []);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Failed to load";
        toast.error(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!createdGroup) return;
    setGroups((prev) =>
      prev.some((g) => g._id === createdGroup._id) ? prev : [createdGroup, ...prev]
    );
    onCreatedConsumed();
  }, [createdGroup, onCreatedConsumed]);

  const q = query.trim().toLowerCase();
  const filteredUsers = useMemo(() => {
    const sorted = [...users].sort((a, b) =>
      (a.firstName ?? "").localeCompare(b.firstName ?? "")
    );
    if (!q) return sorted;
    return sorted.filter((u) => {
      const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase();
      const tag = (u.epochlagID ?? "").toLowerCase();
      return name.includes(q) || tag.includes(q);
    });
  }, [users, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, PersonSummary[]>();
    for (const u of filteredUsers) {
      const letter = (u.firstName?.[0] ?? "#").toUpperCase();
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(u);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredUsers]);

  if (loading) {
    return (
      <div className="flex flex-col gap-[16px] mt-[8px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </div>
    );
  }

  const noContent = users.length === 0 && groups.length === 0;
  if (noContent) {
    return (
      <div className="mt-[24px] bg-[#F3EFE9] rounded-[16px] py-[40px] px-[24px] flex flex-col items-center gap-[12px]">
        <p className="font-montserrat text-primary-blue text-[15px] text-center max-w-[360px]">
          Sync contacts or invite your friends to join Epoch Lag
        </p>
        <button
          type="button"
          onClick={() => router.push("/friends-and-family/invite")}
          className="cursor-pointer bg-primary-orange text-white rounded-full h-[40px] px-[20px] font-montserrat font-semibold text-[14px] hover:opacity-90 transition"
        >
          Invite friends
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[24px] mt-[8px]">
      <section className="hidden md:block">
        <h2 className="font-montserrat font-bold text-primary-blue text-[18px] mb-[12px]">
          Groups
        </h2>
        <div className="flex gap-[12px] overflow-x-auto pb-[8px]">
          <button
            type="button"
            onClick={onOpenCreate}
            className="cursor-pointer w-[180px] shrink-0 rounded-[16px] bg-[#EDEDED] flex flex-col items-center justify-center py-[24px] gap-[8px] hover:brightness-95 transition"
          >
            <svg width="46" height="46" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="23" cy="23" r="22" stroke="#092E4A" strokeWidth="2" />
              <path d="M22.745 13V32.5" stroke="#092E4A" strokeWidth="2" />
              <path d="M32.5 22.7461L13 22.7461" stroke="#092E4A" strokeWidth="2" />
            </svg>
            <span className="font-montserrat font-semibold text-primary-blue text-[13px]">
              Create Group
            </span>
          </button>
          {groups.map((g) => (
            <GroupTile key={g._id} group={g} onClick={setDrawerGroup} />
          ))}
        </div>
      </section>

      <section className="hidden md:block">
        <h2 className="font-montserrat font-bold text-primary-blue text-[18px] mb-[12px]">
          All connections
        </h2>
        {filteredUsers.length === 0 ? (
          <p className="font-montserrat text-primary-blue/50 text-[14px]">
            {q ? "No matches" : "No connections yet"}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px] md:gap-[16px]">
            {filteredUsers.map((u) => (
              <ConnectionRow
                key={u._id}
                id={u._id}
                firstName={u.firstName}
                lastName={u.lastName}
                profilePicture={u.profilePicture}
              />
            ))}
          </div>
        )}
      </section>

      <section className="md:hidden">
        {filteredUsers.length === 0 ? (
          <p className="font-montserrat text-primary-blue/50 text-[14px]">
            {q ? "No matches" : "No connections yet"}
          </p>
        ) : (
          <div className="flex flex-col gap-[8px]">
            {grouped.map(([letter, list]) => (
              <div key={letter}>
                <div className="font-montserrat font-semibold text-primary-blue/60 text-[13px] px-[4px] py-[6px]">
                  {letter}
                </div>
                <div className="flex flex-col">
                  {list.map((u) => (
                    <button
                      key={u._id}
                      type="button"
                      onClick={() => router.push(`/profile/${u._id}`)}
                      className="cursor-pointer flex items-center gap-[12px] py-[8px] px-[4px] hover:bg-black/[0.03] rounded-[10px] transition text-left"
                    >
                      <MobileAvatar user={u} />
                      <span className="font-montserrat font-semibold text-primary-blue text-[15px]">
                        {`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <GroupDrawer
        open={!!drawerGroup}
        group={drawerGroup}
        suggested={users}
        onClose={() => setDrawerGroup(null)}
        onLeft={(gid) => {
          setGroups((prev) => prev.filter((g) => g._id !== gid));
          setDrawerGroup(null);
        }}
        onMembersAdded={(gid, added) => {
          setGroups((prev) =>
            prev.map((g) =>
              g._id === gid
                ? {
                    ...g,
                    members: [...(g.members ?? []), ...added],
                    memberCount: (g.memberCount ?? g.members?.length ?? 0) + added.length,
                  }
                : g
            )
          );
          setDrawerGroup((cur) =>
            cur && cur._id === gid
              ? {
                  ...cur,
                  members: [...(cur.members ?? []), ...added],
                  memberCount: (cur.memberCount ?? cur.members?.length ?? 0) + added.length,
                }
              : cur
          );
        }}
      />
    </div>
  );
}

function MobileAvatar({ user }: { user: PersonSummary }) {
  const initial = (user.firstName?.[0] ?? "?").toUpperCase();
  return (
    <div className="w-[44px] h-[44px] rounded-full overflow-hidden bg-primary-blue/15 text-primary-blue flex items-center justify-center font-montserrat font-semibold text-[15px] shrink-0">
      {user.profilePicture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.profilePicture} alt="" className="w-full h-full object-cover" />
      ) : (
        initial
      )}
    </div>
  );
}
