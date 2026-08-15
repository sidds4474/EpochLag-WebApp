"use client";

import { bustUrl } from "../../../../lib/images";

export function CheckboxRow({
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

export function PersonAvatar({
  firstName,
  profilePicture,
  size = 34,
}: {
  firstName: string;
  profilePicture: string | null | undefined;
  size?: number;
}) {
  return (
    <span
      className="rounded-full overflow-hidden bg-primary-blue/15 text-primary-blue flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      {profilePicture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bustUrl(profilePicture, undefined)}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="font-montserrat font-semibold text-[13px]">
          {(firstName || "?").charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}
