"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSearch } from "../../../../lib/search/useSearch";
import { SearchIcon } from "../icons";
import SearchResults from "./SearchResults";

export default function SearchPage() {
  const router = useRouter();
  const params = useSearchParams();
  const type = params.get("type");
  const hint = params.get("hint") ?? "Search for prompts and people";
  const placeholder =
    params.get("placeholder") ?? "Search prompts and people...";
  const initialQ = params.get("q") ?? "";

  const storiesOnly = type === "stories";
  const {
    query,
    loading,
    hasSearched,
    hasResults,
    prompts,
    people,
    groups,
    onQueryChange,
    clear,
  } = useSearch({ includePeopleAndGroups: !storiesOnly });

  const inputRef = useRef<HTMLInputElement | null>(null);
  const seededRef = useRef(false);

  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    if (initialQ) onQueryChange(initialQ);
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-[12px] px-[16px] md:px-[24px] py-[12px] border-b border-black/5">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="cursor-pointer p-[6px] -ml-[6px] rounded-full text-primary-blue hover:bg-black/[0.04] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 6L9 12L15 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <label className="relative flex-1 block">
          <span className="pointer-events-none absolute left-[16px] top-1/2 -translate-y-1/2 text-primary-blue/70">
            <SearchIcon width={16} height={16} />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={placeholder}
            autoCapitalize="none"
            autoCorrect="off"
            className="w-full bg-[color:var(--color-surface-muted)] rounded-full pl-[40px] pr-[40px] py-[10px] font-montserrat text-primary-blue text-[15px] leading-[20px] placeholder:text-[#a5a5a5] focus:outline-none focus:ring-2 focus:ring-primary-blue/15"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                clear();
                inputRef.current?.focus();
              }}
              aria-label="Clear"
              className="cursor-pointer absolute right-[12px] top-1/2 -translate-y-1/2 text-primary-blue/60 hover:text-primary-blue p-[4px]"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path
                  d="M4 4L12 12M12 4L4 12"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </label>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <SearchResults
          query={query}
          loading={loading}
          hasSearched={hasSearched}
          hasResults={hasResults}
          prompts={prompts}
          people={people}
          groups={groups}
          emptyHint={hint}
          showPeopleAndGroups={!storiesOnly}
          variant="page"
        />
      </div>
    </div>
  );
}
