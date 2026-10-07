/**
 * Lightweight in-memory TTL cache for Next.js API routes.
 * Avoids recomputing expensive SQLite aggregations on every request.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const store = new Map<string, CacheEntry<any>>();

export const cache = {
  get<T>(key: string): T | null {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return null;
    }
    return entry.value as T;
  },

  set<T>(key: string, value: T, ttlMs = 30_000): void {
    store.set(key, { value, expiresAt: Date.now() + ttlMs });
  },

  invalidate(prefix: string): void {
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) store.delete(key);
    }
  },

  invalidateAll(): void {
    store.clear();
  },
};
