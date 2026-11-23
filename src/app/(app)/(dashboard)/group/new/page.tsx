"use client";

// Create Group — /group/new. Entry from the Your Circle Groups panel "+".
// Fields: group name + search + member grid + optional family-ghost row.
// Submits via the existing createGroup multipart helper. Ghosts tag along
// on the same payload for v1; if BE rejects them we can split into the
// addUsersToGroup follow-up call (mobile does both on a split path).

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Avatar from "../../../../../components/Avatar";
import { ChevronLeftIcon, CloseIcon } from "../../icons";
import { ApiError } from "../../../../../lib/api/client";
import { fetchFriends } from "../../../../../lib/home/api";
import { createGroup } from "../../../../../lib/connections/api";
import { compressImage } from "../../../../../lib/images";
import {
  fetchFamilyTree,
  type FamilyTreePerson,
} from "../../../../../lib/circle/api";
import type { PersonSummary } from "../../../../../types/home";

type SelectableMember = {
  id: string;
  firstName: string;
  lastName?: string;
  profilePicture?: string | null;
  kind: "friend" | "ghost";
};

export default function CreateGroupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [friends, setFriends] = useState<PersonSummary[]>([]);
  const [ghosts, setGhosts] = useState<FamilyTreePerson[]>([]);
  const [selected, setSelected] = useState<Map<string, SelectableMember>>(
    new Map(),
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchFriends().catch(() => []),
      fetchFamilyTree().catch(() => []),
    ])
      .then(([friendsList, treePeople]) => {
        if (cancelled) return;
        setFriends(friendsList as PersonSummary[]);
        // Ghosts = tree people that haven't linked an Epoch Lag account.
        setGhosts(treePeople.filter((p) => !p.isLinked && !p.isMe));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () => () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    },
    [photoPreview],
  );

  const filteredFriends = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((p) => {
      const full = [p.firstName, p.lastName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return full.includes(q);
    });
  }, [friends, query]);

  function toggle(member: SelectableMember) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(member.id)) next.delete(member.id);
      else next.set(member.id, member);
      return next;
    });
  }

  function handlePhotoPick(file: File | null | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    setPhotoFile(file);
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  const canSubmit = name.trim().length > 0 && selected.size > 0 && !busy;

  async function handleSubmit() {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const memberIds = Array.from(selected.values()).map((m) => m.id);
      // Compress the photo before upload — BE rejects large payloads with
      // 413. Mirrors the pattern used by the Studio cover picker.
      let uploadPhoto: File | null = null;
      if (photoFile) {
        const compressed = await compressImage(photoFile, {
          maxWidth: 1200,
          quality: 0.8,
        });
        uploadPhoto = new File(
          [compressed],
          photoFile.name || "group.jpg",
          { type: compressed.type || "image/jpeg" },
        );
      }
      await createGroup({
        name: name.trim(),
        memberIds,
        file: uploadPhoto,
      });
      toast.success("Group created!");
      router.push("/circle");
    } catch (err) {
      const message =
        err instanceof ApiError ? (err.message || "").toLowerCase() : "";
      if (
        message.includes("e11000") ||
        message.includes("duplicate")
      ) {
        toast.error(
          "A group with this name already exists. Pick another.",
        );
      } else if (err instanceof ApiError && err.message) {
        toast.error(err.message);
      } else {
        toast.error("Couldn't create group");
      }
      setBusy(false);
    }
  }

  const selectedSummary = Array.from(selected.values())
    .map((m) => m.firstName)
    .join(", ");

  return (
    <div className="min-h-full bg-[#F3F1EB]">
      <div className="mx-auto max-w-[1000px] px-[16px] sm:px-[24px] md:px-[40px] pt-[16px] md:pt-[24px] pb-[120px]">
        {/* Header */}
        <div className="flex items-center gap-[8px]">
          <Link
            href="/circle"
            aria-label="Back"
            className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-[#2C2C2C] hover:bg-black/[0.04] transition-colors"
          >
            <ChevronLeftIcon width={18} height={18} />
          </Link>
          <h1 className="font-ivy text-[#2C2C2C] text-[22px] md:text-[28px]">
            Create Group
          </h1>
        </div>

        {/* Group name + photo */}
        <section className="mt-[20px] md:mt-[28px]">
          <label className="block font-montserrat text-[#848484] text-[12px] uppercase tracking-[0.04em]">
            Group Name
          </label>
          <div className="mt-[8px] flex items-center gap-[12px]">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 60))}
              placeholder="Group Name"
              className="flex-1 min-w-0 bg-transparent border-b border-[#2C2C2C]/30 focus:outline-none focus:border-[#2C2C2C] font-ivy text-[#2C2C2C] text-[20px] md:text-[22px] py-[6px] placeholder:text-[#848484]"
              maxLength={60}
            />
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              aria-label="Add group photo"
              className="shrink-0 w-[44px] h-[44px] rounded-full bg-white border border-black/10 flex items-center justify-center text-[#2C2C2C] hover:bg-black/[0.03] transition-colors overflow-hidden"
            >
              {photoPreview ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={photoPreview}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <CameraGlyph />
              )}
            </button>
            {photoFile && (
              <button
                type="button"
                onClick={() => {
                  setPhotoFile(null);
                  if (photoPreview) URL.revokeObjectURL(photoPreview);
                  setPhotoPreview(null);
                }}
                aria-label="Remove photo"
                className="shrink-0 w-[28px] h-[28px] rounded-full bg-[#ededed] text-[#2C2C2C] flex items-center justify-center hover:bg-[#e3e3e3]"
              >
                <CloseIcon width={12} height={12} />
              </button>
            )}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handlePhotoPick(e.target.files?.[0])}
            />
          </div>
        </section>

        {/* Search */}
        <section className="mt-[24px]">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search People"
            className="w-full bg-white rounded-full px-[16px] py-[12px] font-montserrat text-[14px] text-[#2C2C2C] placeholder:text-[#848484] focus:outline-none focus:ring-2 focus:ring-primary-blue/30"
          />
        </section>

        {/* Family ghosts */}
        {ghosts.length > 0 && (
          <section className="mt-[24px]">
            <h2 className="font-montserrat font-semibold text-[#2C2C2C] text-[13px] uppercase tracking-[0.04em]">
              Family
            </h2>
            <div className="mt-[12px] flex gap-[12px] overflow-x-auto pb-[6px]">
              {ghosts.map((g) => {
                const member: SelectableMember = {
                  id: g._id,
                  firstName: g.name,
                  profilePicture: g.profilePicture ?? null,
                  kind: "ghost",
                };
                const isSel = selected.has(g._id);
                return (
                  <MemberTile
                    key={g._id}
                    member={member}
                    selected={isSel}
                    onToggle={() => toggle(member)}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* Select People grid */}
        <section className="mt-[28px]">
          <h2 className="font-montserrat font-semibold text-[#2C2C2C] text-[13px] uppercase tracking-[0.04em]">
            Select People
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-[48px]">
              <div className="w-[22px] h-[22px] border-[2.5px] border-primary-blue/20 border-t-primary-blue rounded-full animate-spin" />
            </div>
          ) : filteredFriends.length === 0 ? (
            <p className="mt-[16px] font-montserrat text-[#848484] text-[14px]">
              No matching people.
            </p>
          ) : (
            <div className="mt-[12px] grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-[12px]">
              {filteredFriends.map((p) => {
                const member: SelectableMember = {
                  id: p._id,
                  firstName: p.firstName,
                  lastName: p.lastName,
                  profilePicture: p.profilePicture ?? null,
                  kind: "friend",
                };
                return (
                  <MemberTile
                    key={p._id}
                    member={member}
                    selected={selected.has(p._id)}
                    onToggle={() => toggle(member)}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 bg-white border-t border-black/5 pb-[max(env(safe-area-inset-bottom),12px)] pt-[12px]">
        <div className="mx-auto max-w-[1000px] px-[16px] sm:px-[24px] md:px-[40px] flex items-center gap-[16px]">
          <p className="flex-1 min-w-0 font-montserrat text-[#2C2C2C] text-[13px] truncate">
            {selectedSummary || "Select at least one person"}
          </p>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="shrink-0 bg-primary-orange text-white rounded-full px-[22px] py-[12px] font-montserrat font-semibold text-[14px] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MemberTile({
  member,
  selected,
  onToggle,
}: {
  member: SelectableMember;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative flex flex-col items-center justify-center gap-[6px] p-[10px] rounded-[14px] bg-white transition-shadow ${
        selected
          ? "ring-2 ring-primary-orange"
          : "ring-1 ring-black/[0.04] hover:ring-black/[0.1]"
      }`}
    >
      <Avatar
        user={{
          firstName: member.firstName,
          profilePicture: member.profilePicture ?? null,
        }}
        size={60}
      />
      <span className="font-ivy text-[#2C2C2C] text-[13px] truncate max-w-[80px]">
        {member.firstName}
      </span>
      {selected && (
        <span className="absolute top-[6px] right-[6px] w-[20px] h-[20px] rounded-full bg-primary-orange text-white flex items-center justify-center">
          <svg width={10} height={10} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M5 12l5 5 9-11"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
    </button>
  );
}

function CameraGlyph() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 8h4l2-3h4l2 3h4a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={12} cy={13} r={3.5} stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}
