'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

// Module-level cache shared across all hook instances
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const clientCache = new Map<string, CacheEntry<any>>();

const DEFAULT_TTL = 30_000; // 30 seconds

export function useFetch<T>(
  url: string | null,
  options: {
    ttl?: number;
    deps?: unknown[];
    transform?: (raw: unknown) => T;
  } = {}
) {
  const { ttl = DEFAULT_TTL, transform } = options;

  const [data, setData] = useState<T | null>(() => {
    // Serve from cache immediately on first render (instant navigation)
    if (!url) return null;
    const cached = clientCache.get(url);
    if (cached && Date.now() - cached.fetchedAt < ttl) {
      return cached.data as T;
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(!data);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refetch = useCallback(
    async (forceRefresh = false) => {
      if (!url) return;

      // Check cache first
      if (!forceRefresh) {
        const cached = clientCache.get(url);
        if (cached && Date.now() - cached.fetchedAt < ttl) {
          setData(cached.data as T);
          setLoading(false);
          return;
        }
      }

      // Abort previous in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(url, {
          signal: abortRef.current.signal,
          // Leverage HTTP cache headers when available
          cache: 'default',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();
        const value = transform ? transform(raw) : (raw as T);

        clientCache.set(url, { data: value, fetchedAt: Date.now() });
        setData(value);
        setError(null);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [url, ttl, transform]
  );

  useEffect(() => {
    refetch();
    return () => {
      abortRef.current?.abort();
    };
  }, [refetch]);

  return { data, loading, error, refetch: () => refetch(true) };
}

/** Invalidate all cached entries whose key starts with the given prefix */
export function invalidateCache(prefix: string) {
  for (const key of clientCache.keys()) {
    if (key.startsWith(prefix)) clientCache.delete(key);
  }
}

/** Clear everything */
export function clearCache() {
  clientCache.clear();
}
