type CacheEntry = {
  expiresAt: number;
  value: Promise<unknown>;
};

const CACHE_TTL_MS = 15_000;
const MAX_CACHE_ENTRIES = 128;
const entries = new Map<string, CacheEntry>();

/** Short per-process cache for public browse results; concurrent misses share one Neon query. */
export function cachePublicExplore<T>(key: string, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const cached = entries.get(key);

  if (cached && (cached.expiresAt === 0 || cached.expiresAt > now)) {
    entries.delete(key);
    entries.set(key, cached);
    return cached.value as Promise<T>;
  }

  if (cached) entries.delete(key);

  for (const [entryKey, entry] of entries) {
    if (entry.expiresAt > 0 && entry.expiresAt <= now) entries.delete(entryKey);
  }

  while (entries.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = entries.keys().next().value;
    if (!oldestKey) break;
    entries.delete(oldestKey);
  }

  const entry: CacheEntry = {
    expiresAt: 0,
    value: Promise.resolve().then(load),
  };
  entries.set(key, entry);

  void entry.value.then(
    () => {
      if (entries.get(key) === entry) entry.expiresAt = Date.now() + CACHE_TTL_MS;
    },
    () => {
      if (entries.get(key) === entry) entries.delete(key);
    },
  );

  return entry.value as Promise<T>;
}
