import type { ReactNode } from "react";

export default function LibraryContent({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 min-h-0 mt-[16px] relative">
      <div className="h-full min-h-0">{children}</div>
    </div>
  );
}
