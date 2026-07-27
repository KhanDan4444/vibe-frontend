const CHUNK_RELOAD_KEY = 'vibe:chunk-reload-at';
const RELOAD_COOLDOWN_MS = 15_000;

/** True for Vite/Firefox/Chrome failures when a hashed chunk is gone after deploy. */
export function isChunkLoadError(error) {
  const msg = String(error?.message ?? error ?? '');
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /Loading chunk [\d]+ failed/i.test(msg) ||
    error?.name === 'ChunkLoadError'
  );
}

/**
 * Reload once after a stale-chunk miss so the browser picks up the new index.html.
 * Cooldown prevents an infinite reload loop if the chunk is truly missing.
 */
export function reloadOnceForStaleChunk() {
  if (typeof window === 'undefined') return false;
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
    if (last && Date.now() - last < RELOAD_COOLDOWN_MS) {
      return false;
    }
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
    window.location.reload();
    return true;
  } catch {
    window.location.reload();
    return true;
  }
}
