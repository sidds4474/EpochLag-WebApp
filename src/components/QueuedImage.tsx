"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  acquireImageSlot,
  cancelImageSlot,
  releaseImageSlot,
} from "../lib/imageQueue";
import { retryImageOnError } from "../lib/images";

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
  /** Retry the same URL on error (429 recovery). Default true. */
  retryOnError?: boolean;
};

// Concurrency-limited <img> (QA #59). Instead of requesting its cover the moment
// it mounts, it waits until it's near the viewport, then takes a slot from the
// shared image queue so only a handful of covers load at once — avoiding the
// burst that makes the media host 429. The slot is released on load, error, or
// unmount so the queue never stalls.
//
// Viewport gating replaces native loading="lazy" here: setting src on a lazy
// off-screen <img> would hold a queue slot the browser never actually fetches.
export default function QueuedImage({
  src,
  retryOnError = true,
  onLoad,
  onError,
  ...rest
}: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [assignedSrc, setAssignedSrc] = useState<string | null>(null);
  const stateRef = useRef<"idle" | "queued" | "granted" | "done">("idle");

  const release = useCallback(() => {
    if (stateRef.current === "granted") {
      stateRef.current = "done";
      releaseImageSlot();
    }
  }, []);

  useEffect(() => {
    const el = imgRef.current;
    stateRef.current = "idle";
    setAssignedSrc(null);
    if (!el || !src) return;

    const grant = () => {
      // Guard the race where the component unmounted / src changed between
      // being granted and this running: hand the slot straight back.
      if (stateRef.current !== "queued") {
        releaseImageSlot();
        return;
      }
      stateRef.current = "granted";
      setAssignedSrc(src);
    };

    const enqueue = () => {
      if (stateRef.current !== "idle") return;
      stateRef.current = "queued";
      acquireImageSlot(grant);
    };

    // No IntersectionObserver (old browsers / SSR edge): just enqueue now.
    if (typeof IntersectionObserver === "undefined") {
      enqueue();
      return () => {
        if (stateRef.current === "queued") cancelImageSlot(grant);
        else if (stateRef.current === "granted") releaseImageSlot();
        stateRef.current = "done";
      };
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          enqueue();
        }
      },
      // Preload a little before it scrolls into view.
      { rootMargin: "300px" }
    );
    io.observe(el);

    return () => {
      io.disconnect();
      if (stateRef.current === "queued") cancelImageSlot(grant);
      else if (stateRef.current === "granted") releaseImageSlot();
      stateRef.current = "done";
    };
  }, [src]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      {...rest}
      src={assignedSrc ?? undefined}
      onLoad={(e) => {
        release();
        onLoad?.(e);
      }}
      onError={(e) => {
        release();
        if (retryOnError) retryImageOnError(e.currentTarget);
        onError?.(e);
      }}
    />
  );
}
