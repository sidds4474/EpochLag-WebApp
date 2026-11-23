"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../../../../lib/auth/AuthProvider";
import {
  fetchCirclePerson,
  fetchCirclePersonLags,
  type CirclePersonDetail,
  type CirclePersonLag,
} from "../../../../../../lib/circle/api";
import RelationshipView from "./RelationshipView";

export default function CirclePersonPage() {
  const router = useRouter();
  const params = useParams<{ userId: string }>();
  const userId = params?.userId ?? "";
  const { user } = useAuth();

  const [person, setPerson] = useState<CirclePersonDetail | null>(null);
  const [lags, setLags] = useState<CirclePersonLag[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guard against concurrent loadMore calls from the IntersectionObserver.
  const inFlight = useRef(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPage(1);
    setLags([]);
    Promise.all([
      fetchCirclePerson(userId),
      fetchCirclePersonLags(userId, 1).catch(() => ({
        cards: [] as CirclePersonLag[],
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
      })),
    ])
      .then(([detail, lagsPage]) => {
        if (cancelled) return;
        setPerson(detail);
        setLags(lagsPage.cards);
        setTotalPages(lagsPage.totalPages);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(
          e instanceof Error ? e.message : "This person isn't available.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const loadMore = useCallback(async () => {
    if (inFlight.current) return;
    if (page >= totalPages) return;
    inFlight.current = true;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const res = await fetchCirclePersonLags(userId, next);
      setLags((prev) => [...prev, ...res.cards]);
      setPage(res.currentPage || next);
      setTotalPages(res.totalPages);
    } catch {
      /* swallow — user can retry by scrolling further */
    } finally {
      inFlight.current = false;
      setLoadingMore(false);
    }
  }, [page, totalPages, userId]);

  const hasMore = page < totalPages;

  return (
    <div className="min-h-full bg-[#F3F1EB]">
      <div className="mx-auto max-w-[1100px] px-0 sm:px-[24px] md:px-[40px] pt-0 md:pt-[20px] pb-[48px] md:pb-[64px]">
        {loading && !person ? (
          <div className="flex items-center justify-center py-[64px]">
            <div className="w-[28px] h-[28px] border-[3px] border-primary-blue/20 border-t-primary-blue rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-[64px] text-center">
            <p className="font-montserrat text-[#848484] text-[14px] max-w-[360px]">
              {error}
            </p>
            <button
              type="button"
              onClick={() => router.back()}
              className="mt-[16px] font-montserrat text-primary-orange text-[14px]"
            >
              Go back
            </button>
          </div>
        ) : person ? (
          <RelationshipView
            person={person}
            lags={lags}
            currentUserFirstName={user?.firstName ?? ""}
            onBack={() => router.back()}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={loadMore}
          />
        ) : null}
      </div>
    </div>
  );
}
