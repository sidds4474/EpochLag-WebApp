import type { ReactNode } from "react";

// `passThrough` makes the wrapper transparent to pointer events on routes
// like /lags/places where the content area sits over a full-bleed map —
// the wrapper no longer eats drag/zoom. Children that need to be
// interactive (map, floating panel) set `pointer-events-auto` locally.
export default function LibraryContent({
  children,
  passThrough = false,
}: {
  children: ReactNode;
  passThrough?: boolean;
}) {
  return (
    <div
      className={`flex-1 min-h-0 mt-[16px] relative ${
        passThrough ? "pointer-events-none" : ""
      }`}
    >
      <div className="h-full min-h-0">{children}</div>
    </div>
  );
}
