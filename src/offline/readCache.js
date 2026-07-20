// src/offline/readCache.js
// Cache of successful JSON GET responses so the gym portal can render while offline.
// Keys are scoped per user so accounts on a shared browser never see each other's data.

import { READS_STORE, idbGet, idbSet, idbGetAllKeys, idbDelete } from './db';

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // match mobile: 7 days

const cacheKey = (userId, endpoint) => `u${userId}:${endpoint}`;

export async function cacheRead(userId, endpoint, body) {
  if (!userId) return;
  try {
    await idbSet(READS_STORE, cacheKey(userId, endpoint), {
      body,
      cachedAt: Date.now(),
    });
  } catch {
    // Cache writes are best-effort; never break the live request.
  }
}

export async function getCachedRead(userId, endpoint) {
  if (!userId) return null;
  try {
    const entry = await idbGet(READS_STORE, cacheKey(userId, endpoint));
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > MAX_AGE_MS) return null;
    return entry;
  } catch {
    return null;
  }
}

export async function clearReadCacheForUser(userId) {
  if (!userId) return;
  try {
    const keys = await idbGetAllKeys(READS_STORE);
    const prefix = `u${userId}:`;
    await Promise.all(
      keys.filter((k) => typeof k === 'string' && k.startsWith(prefix)).map((k) => idbDelete(READS_STORE, k))
    );
  } catch {
    // best-effort
  }
}
