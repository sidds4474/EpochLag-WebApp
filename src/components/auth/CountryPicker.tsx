"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js";

type Country = { iso: CountryCode; name: string; dialCode: string; flag: string };

function isoToFlagEmoji(iso: string): string {
  return iso
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join("");
}

let cachedCountries: Country[] | null = null;
function buildCountries(): Country[] {
  if (cachedCountries) return cachedCountries;
  const display =
    typeof Intl !== "undefined" && "DisplayNames" in Intl
      ? new Intl.DisplayNames(["en"], { type: "region" })
      : null;
  const list: Country[] = getCountries().map((iso) => ({
    iso,
    name: display?.of(iso) || iso,
    dialCode: `+${getCountryCallingCode(iso)}`,
    flag: isoToFlagEmoji(iso),
  }));
  list.sort((a, b) => a.name.localeCompare(b.name));
  cachedCountries = list;
  return list;
}

export type CountryPickerProps = {
  value: string;
  onChange: (dialCode: string) => void;
  showChevron?: boolean;
  className?: string;
};

export function CountryPicker({
  value,
  onChange,
  showChevron = true,
  className = "",
}: CountryPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const all = buildCountries();
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.iso.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`bg-primary-white rounded-full h-[48px] px-[16px] inline-flex items-center gap-[6px] font-montserrat text-[15px] text-primary-blue shadow-[0_4px_14px_rgba(9,46,74,0.05)] cursor-pointer ${className}`}
      >
        <span>{value}</span>
        {showChevron && (
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
            <path
              d="M1 1L5 5L9 1"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full md:w-[420px] max-h-[80vh] bg-warm-cream rounded-t-[24px] md:rounded-[24px] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-[20px] pt-[20px] pb-[12px] flex items-center gap-[12px]">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search country or code"
                className="flex-1 bg-primary-white rounded-full h-[44px] px-[16px] font-montserrat text-[14px] text-primary-blue placeholder:text-primary-blue/40 outline-none shadow-[0_2px_8px_rgba(9,46,74,0.05)]"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="font-montserrat text-[14px] text-primary-blue/70 cursor-pointer"
              >
                Cancel
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-[8px] pb-[16px]">
              {filtered.map((c) => (
                <button
                  key={c.iso}
                  type="button"
                  onClick={() => {
                    onChange(c.dialCode);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-[12px] px-[12px] py-[12px] rounded-[12px] hover:bg-primary-white cursor-pointer text-left"
                >
                  <span className="text-[20px] leading-none">{c.flag}</span>
                  <span className="flex-1 font-montserrat text-[14px] text-primary-blue truncate">
                    {c.name}
                  </span>
                  <span className="font-montserrat text-[14px] text-primary-blue/60">
                    {c.dialCode}
                  </span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-center py-[24px] font-montserrat text-[14px] text-primary-blue/60">
                  No matches
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
