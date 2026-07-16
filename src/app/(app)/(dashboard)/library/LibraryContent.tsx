"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

// Fades the sub-route body when switching Stories / Timeline / Albums,
// mirroring the tab-switch feel in the Interactions page. Keyed on
// pathname so each nested route triggers the enter/exit pair.
export default function LibraryContent({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  return (
    <div className="flex-1 min-h-0 mt-[16px] relative">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.08, ease: "easeOut" }}
          className="h-full min-h-0"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
