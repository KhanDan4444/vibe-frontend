/**
 * In-memory cache for authenticated member photo blob URLs.
 * Dedupes concurrent fetches and keeps object URLs alive across list re-renders.
 */

const cache = new Map(); // key -> { url, promise, refs, failed }

function cacheKey(memberId, bust = 0) {
  return `${memberId}:${bust || 0}`;
}

export function invalidateMemberPhotoCache(memberId) {
  for (const [key, entry] of cache.entries()) {
    if (key.startsWith(`${memberId}:`)) {
      if (entry.url) URL.revokeObjectURL(entry.url);
      cache.delete(key);
    }
  }
}

export function clearMemberPhotoCache() {
  for (const entry of cache.values()) {
    if (entry.url) URL.revokeObjectURL(entry.url);
  }
  cache.clear();
}

/**
 * @param {number|string} memberId
 * @param {(path: string) => Promise<Response>} apiFetch
 * @param {{ bust?: number }} [opts]
 * @returns {Promise<string|null>} object URL or null if missing/failed
 */
export async function getMemberPhotoUrl(memberId, apiFetch, opts = {}) {
  if (!memberId || !apiFetch) return null;
  const key = cacheKey(memberId, opts.bust);
  const existing = cache.get(key);
  if (existing?.url) {
    existing.refs += 1;
    return existing.url;
  }
  if (existing?.failed) return null;
  if (existing?.promise) {
    const url = await existing.promise;
    if (url) {
      const entry = cache.get(key);
      if (entry) entry.refs += 1;
    }
    return url;
  }

  const entry = { url: null, promise: null, refs: 0, failed: false };
  entry.promise = (async () => {
    try {
      const res = await apiFetch(`/members/${memberId}/photo`);
      if (!res.ok) {
        entry.failed = true;
        return null;
      }
      const blob = await res.blob();
      if (!blob.size) {
        entry.failed = true;
        return null;
      }
      entry.url = URL.createObjectURL(blob);
      return entry.url;
    } catch {
      entry.failed = true;
      return null;
    } finally {
      entry.promise = null;
    }
  })();

  cache.set(key, entry);
  const url = await entry.promise;
  if (url) entry.refs += 1;
  return url;
}

/** Release a retained photo URL. Does not revoke while other mounts still hold it. */
export function releaseMemberPhotoUrl(memberId, bust = 0) {
  const key = cacheKey(memberId, bust);
  const entry = cache.get(key);
  if (!entry) return;
  entry.refs = Math.max(0, entry.refs - 1);
}
