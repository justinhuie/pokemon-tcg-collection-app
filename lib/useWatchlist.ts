"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "watchlist";

function readWatchlist(): string[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<string[]>(() => readWatchlist());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
    } catch {}
  }, [watchlist]);

  const isTracked = useCallback(
    (id: string) => watchlist.includes(id),
    [watchlist]
  );

  const track = useCallback((id: string) => {
    const clean = id.trim();
    if (!clean) return;
    setWatchlist((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
  }, []);

  const untrack = useCallback((id: string) => {
    setWatchlist((prev) => prev.filter((c) => c !== id));
  }, []);

  const replaceAll = useCallback((ids: string[]) => {
    const cleaned = ids.map((s) => s.trim()).filter(Boolean);
    setWatchlist(Array.from(new Set(cleaned)));
  }, []);

  return { watchlist, isTracked, track, untrack, replaceAll };
}
