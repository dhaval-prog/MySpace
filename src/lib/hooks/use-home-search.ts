"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { searchItems, type SearchResult } from "@/lib/actions/search";

const RECENT_KEY = "myspace.recent-searches";

function loadRecent(): string[] {
  try {
    const raw = sessionStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveRecent(query: string) {
  try {
    const existing = loadRecent().filter((q) => q.toLowerCase() !== query.toLowerCase());
    sessionStorage.setItem(RECENT_KEY, JSON.stringify([query, ...existing].slice(0, 5)));
  } catch {
    // sessionStorage unavailable — recent list just won't persist.
  }
}

/**
 * The debounced-search-against-a-home state machine — query, live results,
 * recent-searches, and voice input. Shared between the dedicated Search
 * page (SearchWorkspace) and the inline search panel embedded on My Home,
 * so the two never drift into two different search behaviors.
 */
export function useHomeSearch(homeId: string) {
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>(() => (typeof window === "undefined" ? [] : loadRecent()));
  const [results, setResults] = useState<SearchResult[]>([]);
  const [pending, startTransition] = useTransition();
  const debouncedQuery = useDebouncedValue(query, 250);
  const requestIdRef = useRef(0);
  const voice = useSpeechRecognition();

  const q = debouncedQuery.trim();

  useEffect(() => {
    if (!q) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }
    const requestId = ++requestIdRef.current;
    startTransition(async () => {
      const found = await searchItems(homeId, q);
      // Drop stale responses — a slower earlier request resolving after a
      // faster later one would otherwise flash outdated results back in.
      if (requestId === requestIdRef.current) setResults(found);
    });
  }, [q, homeId]);

  function commitSearch(value: string) {
    if (!value.trim()) return;
    saveRecent(value.trim());
    setRecent(loadRecent());
  }

  const canVoiceSearch = useMemo(() => voice.isSupported, [voice.isSupported]);

  return { query, setQuery, q, results, pending, recent, commitSearch, voice, canVoiceSearch };
}
