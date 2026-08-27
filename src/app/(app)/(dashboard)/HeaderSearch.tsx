"use client";

import { useEffect, useRef, useState } from "react";
import { useSearch } from "../../../lib/search/useSearch";
import SearchResults from "./search/SearchResults";
import { SearchIcon } from "./icons";

export default function HeaderSearch() {
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
  } = useSearch();

  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const handleNavigate = () => {
    setOpen(false);
    clear();
  };

  const showDropdown = open && query.trim().length > 0;

  return (
    <div ref={wrapperRef} className="relative flex-1 max-w-[631px]">
      <label className="relative block">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setOpen(true);
          }}
          placeholder="Search"
          className="w-full bg-[color:var(--color-surface-muted)] rounded-full pl-[16px] pr-[44px] py-[12px] font-montserrat font-medium text-primary-blue text-[16px] leading-[20px] placeholder:text-[#a5a5a5] focus:outline-none focus:ring-2 focus:ring-primary-blue/15"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              clear();
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="cursor-pointer absolute right-[16px] top-1/2 -translate-y-1/2 text-primary-blue/60 hover:text-primary-blue"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 4L12 12M12 4L4 12"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : (
          <span className="pointer-events-none absolute right-[16px] top-1/2 -translate-y-1/2 text-primary-blue/70">
            <SearchIcon width={20} height={20} />
          </span>
        )}
      </label>

      {showDropdown && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+8px)] bg-white rounded-[16px] shadow-[0_12px_40px_rgba(0,0,0,0.14)] border border-black/5 z-50 max-h-[70vh] overflow-y-auto py-[8px]"
        >
          <SearchResults
            query={query}
            loading={loading}
            hasSearched={hasSearched}
            hasResults={hasResults}
            prompts={prompts}
            people={people}
            groups={groups}
            onNavigate={handleNavigate}
            variant="dropdown"
          />
        </div>
      )}
    </div>
  );
}
