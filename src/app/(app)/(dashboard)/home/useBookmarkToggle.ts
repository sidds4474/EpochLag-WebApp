"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { toggleCardBookmark } from "../../../../lib/home/api";

// Same bookmark wiring the original For You cards used: optimistic flip,
// single-flight guard, rollback + toast on failure. Kept in its own file so
// every tile type (For You, Recent Stories, Inspiration) shares one path.
export function useBookmarkToggle(cardId: string, initial: boolean) {
  const [bookmarked, setBookmarked] = useState(initial);
  const pendingRef = useRef(false);

  const toggle = useCallback(async () => {
    if (!cardId || pendingRef.current) return;
    pendingRef.current = true;
    const previous = bookmarked;
    setBookmarked(!previous);
    try {
      await toggleCardBookmark(cardId);
    } catch {
      setBookmarked(previous);
      toast.error("Couldn't update bookmark");
    } finally {
      pendingRef.current = false;
    }
  }, [cardId, bookmarked]);

  return { bookmarked, toggle };
}
