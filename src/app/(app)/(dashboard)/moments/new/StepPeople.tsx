"use client";

import { useEffect, useState } from "react";
import { fetchHomePeople } from "../../../../../lib/home/api";
import { bustUrl } from "../../../../../lib/images";
import type { FriendSearchResult } from "../../../../../types/moment";
import type { Draft } from "./wizardTypes";

function Avatar({ user, size = 40 }: { user: FriendSearchResult; size?: number }) {
  return (
    <span
      className="rounded-full overflow-hidden bg-[#C8D1DA] text-white flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      {user.profilePicture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bustUrl(user.profilePicture, undefined)}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="font-montserrat font-semibold text-[13px]">
          {(user.firstName || "?").charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}

function CheckboxRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="cursor-pointer flex items-center gap-[12px]"
    >
      <span
        className={`w-[20px] h-[20px] rounded-[4px] border flex items-center justify-center transition-colors ${
          checked
            ? "bg-primary-orange border-primary-orange"
            : "bg-white border-[#2c2c2c]/40"
        }`}
      >
        {checked && (
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <span className="font-montserrat text-[#232323] text-[14px]">
        {label}
      </span>
    </button>
  );
}

export default function StepPeople({
  draft,
  onChange,
  onSubmit,
  submitting,
  primaryLabel,
}: {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
  onSubmit: () => void;
  submitting: boolean;
  primaryLabel: string;
}) {
  const [query, setQuery] = useState("");
  const [friends, setFriends] = useState<FriendSearchResult[]>([]);
  const [selected, setSelected] = useState<FriendSearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const people = await fetchHomePeople();
        if (cancelled) return;
        const mapped: FriendSearchResult[] = (people.users ?? []).map((u) => ({
          _id: u._id,
          firstName: u.firstName ?? "",
          lastName: u.lastName ?? "",
          epochlagID: u.epochlagID,
          profilePicture: u.profilePicture ?? null,
        }));
        setFriends(mapped);
      } catch {
        if (!cancelled) setFriends([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedQuery = query.trim().replace(/^@/, "").toLowerCase();
  const hasQuery = normalizedQuery.length > 0;
  const selectedIds = new Set(selected.map((s) => s._id));

  const results = hasQuery
    ? friends.filter((f) => {
        if (selectedIds.has(f._id)) return false;
        const name = `${f.firstName ?? ""} ${f.lastName ?? ""}`.toLowerCase();
        return name.includes(normalizedQuery);
      })
    : [];

  const toggleUser = (u: FriendSearchResult) => {
    const exists = selected.some((s) => s._id === u._id);
    const nextSel = exists
      ? selected.filter((s) => s._id !== u._id)
      : [...selected, u];
    setSelected(nextSel);
    onChange({ taggedUserIds: nextSel.map((s) => s._id) });
    if (!exists) setQuery("");
  };

  return (
    <div className="flex flex-col items-center w-full">
      <h1 className="font-ivy font-normal text-[#232323] text-[20px] lg:text-[22px] leading-[1.3] text-center mb-[8px]">
        Add people to this Moment
      </h1>
      <p className="font-montserrat text-[#2c2c2c]/60 text-[13px] text-center mb-[28px] max-w-[320px]">
        Tag the people this Moment is about or shared with.
      </p>

      <div className="w-full max-w-[520px] flex flex-col gap-[20px]">
        <div className="relative">
          <span className="pointer-events-none absolute left-[18px] top-1/2 -translate-y-1/2 text-[#2c2c2c]/50">
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx={11} cy={11} r={8} />
              <line x1={21} y1={21} x2={16.65} y2={16.65} />
            </svg>
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your circle"
            className="w-full h-[46px] rounded-full bg-white pl-[44px] pr-[20px] font-montserrat text-[14px] text-[#232323] placeholder:text-[#2c2c2c]/40 shadow-[0_1px_3px_rgba(0,0,0,0.06)] focus:outline-none"
          />
          {hasQuery && (
            <div className="absolute left-0 right-0 top-[54px] bg-white rounded-[16px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] py-[8px] z-10 max-h-[260px] overflow-y-auto">
              {loading && results.length === 0 && (
                <div className="px-[16px] py-[10px] font-montserrat text-[#2c2c2c]/50 text-[13px]">
                  Searching…
                </div>
              )}
              {!loading && results.length === 0 && (
                <div className="px-[16px] py-[10px] font-montserrat text-[#2c2c2c]/50 text-[13px]">
                  No matches
                </div>
              )}
              {results.map((u) => (
                <button
                  key={u._id}
                  type="button"
                  onClick={() => toggleUser(u)}
                  className="cursor-pointer w-full flex items-center gap-[12px] px-[16px] py-[8px] hover:bg-black/[0.03]"
                >
                  <Avatar user={u} size={34} />
                  <span className="flex-1 flex flex-col items-start min-w-0">
                    <span className="font-montserrat text-[#232323] text-[14px] truncate max-w-full">
                      {[u.firstName, u.lastName].filter(Boolean).join(" ")}
                    </span>
                    {u.epochlagID && (
                      <span className="font-montserrat text-[#2c2c2c]/50 text-[12px] truncate max-w-full">
                        @{u.epochlagID}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selected.length > 0 && (
          <div className="flex flex-col">
            <p className="font-montserrat text-[#2c2c2c]/60 text-[12px] uppercase tracking-[0.08em] mb-[8px]">
              Tagged
            </p>
            {selected.map((u) => {
              const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || "User";
              return (
                <div
                  key={u._id}
                  className="flex items-center justify-between gap-[10px] py-[10px] border-b border-black/10 last:border-b-0"
                >
                  <div className="flex items-center gap-[12px] min-w-0">
                    <Avatar user={u} size={36} />
                    <span className="font-montserrat text-[#232323] text-[14px] truncate">
                      {name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleUser(u)}
                    aria-label={`Remove ${name}`}
                    className="cursor-pointer w-[28px] h-[28px] rounded-full text-[#2c2c2c]/60 hover:bg-black/[0.05] flex items-center justify-center transition-colors"
                  >
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                      <line x1={18} y1={6} x2={6} y2={18} />
                      <line x1={6} y1={6} x2={18} y2={18} />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Desktop footer */}
        <div className="hidden lg:flex flex-col gap-[20px] mt-[12px]">
          <CheckboxRow
            checked={draft.sendInvites}
            onChange={(next) => onChange({ sendInvites: next })}
            label="Send a Moment invite to tagged people"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              className={`h-[42px] px-[28px] rounded-full font-montserrat font-semibold text-white text-[14px] ${
                submitting
                  ? "bg-primary-orange/60 cursor-not-allowed"
                  : "bg-primary-orange cursor-pointer hover:opacity-90"
              }`}
            >
              {submitting ? "Creating…" : primaryLabel}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sticky footer */}
      <div className="lg:hidden fixed left-0 right-0 bottom-0 z-30 bg-[#F3F1EB] px-[24px] pt-[16px] pb-[max(env(safe-area-inset-bottom),20px)] flex flex-col gap-[14px]">
        <CheckboxRow
          checked={draft.sendInvites}
          onChange={(next) => onChange({ sendInvites: next })}
          label="Send a Moment invite to tagged people"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className={`w-full h-[46px] rounded-full font-montserrat font-semibold text-white text-[15px] ${
            submitting
              ? "bg-primary-orange/60 cursor-not-allowed"
              : "bg-primary-orange cursor-pointer"
          }`}
        >
          {submitting ? "Creating…" : primaryLabel}
        </button>
      </div>
    </div>
  );
}
