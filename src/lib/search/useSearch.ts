"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchGroups, type GroupDetail } from "../connections/api";
import {
  filterGroupsByQuery,
  normalizeQuery,
  searchStories,
  searchUsers,
  type PersonSearchResult,
  type PromptSearchResult,
} from "./api";

export type SearchState = {
  query: string;
  loading: boolean;
  hasSearched: boolean;
  prompts: PromptSearchResult[];
  people: PersonSearchResult[];
  groups: GroupDetail[];
};

const DEBOUNCE_MS = 400;

let groupsCache: GroupDetail[] | null = null;

export function useSearch(options: { includePeopleAndGroups?: boolean } = {}) {
  const includePG = options.includePeopleAndGroups ?? true;

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [prompts, setPrompts] = useState<PromptSearchResult[]>([]);
  const [people, setPeople] = useState<PersonSearchResult[]>([]);
  const [groups, setGroups] = useState<GroupDetail[]>([]);
  const allGroupsRef = useRef<GroupDetail[]>(groupsCache ?? []);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRunRef = useRef(0);

  useEffect(() => {
    if (!includePG) return;
    if (groupsCache) {
      allGroupsRef.current = groupsCache;
      return;
    }
    let cancelled = false;
    fetchGroups()
      .then((list) => {
        if (cancelled) return;
        groupsCache = list;
        allGroupsRef.current = list;
      })
      .catch(() => {
        // Silent — matches mobile parity for search errors.
      });
    return () => {
      cancelled = true;
    };
  }, [includePG]);

  const runSearch = useCallback(
    async (raw: string) => {
      const q = normalizeQuery(raw);
      if (!q) {
        setPrompts([]);
        setPeople([]);
        setGroups([]);
        setHasSearched(false);
        setLoading(false);
        return;
      }
      const runId = ++activeRunRef.current;
      setLoading(true);
      try {
        const [promptsRes, peopleRes] = await Promise.all([
          searchStories(q),
          includePG ? searchUsers(q) : Promise.resolve<PersonSearchResult[]>([]),
        ]);
        if (activeRunRef.current !== runId) return;
        setPrompts(promptsRes);
        setPeople(peopleRes);
        setGroups(
          includePG ? filterGroupsByQuery(allGroupsRef.current, q) : []
        );
      } catch {
        if (activeRunRef.current !== runId) return;
        setPrompts([]);
        setPeople([]);
        setGroups([]);
      } finally {
        if (activeRunRef.current === runId) {
          setLoading(false);
          setHasSearched(true);
        }
      }
    },
    [includePG]
  );

  const onQueryChange = useCallback(
    (next: string) => {
      setQuery(next);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const trimmed = next.trim();
      if (!trimmed) {
        setPrompts([]);
        setPeople([]);
        setGroups([]);
        setHasSearched(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      setHasSearched(false);
      debounceRef.current = setTimeout(() => runSearch(next), DEBOUNCE_MS);
    },
    [runSearch]
  );

  const clear = useCallback(() => onQueryChange(""), [onQueryChange]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const hasResults =
    prompts.length > 0 || people.length > 0 || groups.length > 0;

  return {
    query,
    loading,
    hasSearched,
    hasResults,
    prompts,
    people,
    groups,
    onQueryChange,
    clear,
  } as const;
}
