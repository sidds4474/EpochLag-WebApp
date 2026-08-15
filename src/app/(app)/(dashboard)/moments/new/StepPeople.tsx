"use client";

import { useEffect, useRef, useState } from "react";
import { fetchHomePeople } from "../../../../../lib/home/api";
import { bustUrl } from "../../../../../lib/images";
import type { FriendSearchResult } from "../../../../../types/moment";
import type { Draft } from "./wizardTypes";

function Avatar({ user, size = 34 }: { user: FriendSearchResult; size?: number }) {
  return (
    <span
      className="rounded-full overflow-hidden bg-primary-blue/15 text-primary-blue flex items-center justify-center shrink-0"
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
            : "bg-white border-primary-blue/40"
        }`}
      >
        {checked && (
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <span className="font-montserrat font-medium text-primary-blue text-[15px]">
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

  // Fetch home people (friends list) once, then filter client-side by name.
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
  const open = hasQuery;

  const results = hasQuery
    ? friends.filter((f) => {
        const name = `${f.firstName ?? ""} ${f.lastName ?? ""}`.toLowerCase();
        return name.includes(normalizedQuery);
      })
    : [];

  const addUser = (u: FriendSearchResult) => {
    if (selected.some((s) => s._id === u._id)) return;
    const nextSel = [...selected, u];
    setSelected(nextSel);
    onChange({ taggedUserIds: nextSel.map((s) => s._id) });
    setQuery("");
  };

  const removeUser = (id: string) => {
    const nextSel = selected.filter((s) => s._id !== id);
    setSelected(nextSel);
    onChange({ taggedUserIds: nextSel.map((s) => s._id) });
  };

  return (
    <div className="flex flex-col items-center">
      <h1 className="font-montserrat font-medium text-primary-blue text-[20px] lg:text-[18px] leading-[26px] text-center mb-[28px] lg:mb-[32px]">
        Add people to this moment
      </h1>

      <div className="w-full max-w-[420px] lg:max-w-[520px] flex flex-col gap-[16px]">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="@ Search"
            className="w-full h-[46px] rounded-full bg-[color:var(--color-surface-muted)] px-[20px] font-montserrat text-[14px] text-primary-blue placeholder:text-primary-blue/40 focus:outline-none"
          />
          {open && (
            <div className="absolute left-0 right-0 top-[54px] bg-white rounded-[16px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] py-[8px] z-10 max-h-[240px] overflow-y-auto">
              {loading && results.length === 0 && (
                <div className="px-[16px] py-[10px] font-montserrat text-primary-blue/50 text-[13px]">
                  Searching…
                </div>
              )}
              {!loading && results.length === 0 && (
                <div className="px-[16px] py-[10px] font-montserrat text-primary-blue/50 text-[13px]">
                  No matches
                </div>
              )}
              {results.map((u) => (
                <button
                  key={u._id}
                  type="button"
                  onClick={() => addUser(u)}
                  className="cursor-pointer w-full flex items-center gap-[12px] px-[16px] py-[8px] hover:bg-black/[0.03]"
                >
                  <Avatar user={u} />
                  <span className="flex-1 flex flex-col items-start min-w-0">
                    <span className="font-montserrat text-primary-blue text-[14px] truncate max-w-full">
                      {[u.firstName, u.lastName].filter(Boolean).join(" ")}
                    </span>
                    {u.epochlagID && (
                      <span className="font-montserrat text-primary-blue/50 text-[12px] truncate max-w-full">
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
          <div className="flex flex-wrap gap-[10px]">
            {selected.map((u) => (
              <span
                key={u._id}
                className="inline-flex items-center gap-[10px] bg-[color:var(--color-surface-muted)] rounded-full pl-[6px] pr-[14px] py-[6px]"
              >
                <Avatar user={u} size={28} />
                <span className="font-montserrat text-primary-blue text-[13px]">
                  {[u.firstName, u.lastName].filter(Boolean).join(" ")}
                </span>
                <button
                  type="button"
                  onClick={() => removeUser(u._id)}
                  aria-label={`Remove ${u.firstName}`}
                  className="cursor-pointer text-primary-blue/60 hover:text-primary-blue"
                >
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Desktop: inline footer */}
        <div className="hidden lg:flex flex-col gap-[12px] mt-[8px]">
          <CheckboxRow
            checked={draft.sendInvites}
            onChange={(next) => onChange({ sendInvites: next })}
            label="Send a Moment invite to tagged people"
          />
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className={`w-full h-[46px] rounded-full font-montserrat font-medium text-white text-[16px] ${
              submitting
                ? "bg-primary-orange/60 cursor-not-allowed"
                : "bg-primary-orange cursor-pointer hover:brightness-[1.03]"
            }`}
          >
            {submitting ? "Creating…" : primaryLabel}
          </button>
        </div>
      </div>

      {/* Mobile: sticky footer pinned to viewport bottom */}
      <div className="lg:hidden fixed left-0 right-0 bottom-0 z-30 bg-white px-[24px] pt-[16px] pb-[max(env(safe-area-inset-bottom),20px)] flex flex-col gap-[14px]">
        <CheckboxRow
          checked={draft.sendInvites}
          onChange={(next) => onChange({ sendInvites: next })}
          label="Send a Moment invite to tagged people"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className={`w-full h-[46px] rounded-full font-montserrat font-medium text-white text-[16px] ${
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
