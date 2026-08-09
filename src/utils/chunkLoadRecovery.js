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
    /ServiceWorker intercepted the request/i.test(msg) ||
    error?.name === 'ChunkLoadError'
  );
}

async function clearServiceWorkerAndCaches() {
  if (typeof window === 'undefined') return;
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
    }
  } catch {
    /* ignore */
  }
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    /* ignore */
  }
}

/** Don’t hang forever if SW unregister stalls. */
function clearWithTimeout(ms = 4_000) {
  return Promise.race([
    clearServiceWorkerAndCaches(),
    new Promise((resolve) => setTimeout(resolve, ms)),
  ]);
}

function bustAndReplace() {
  const url = new URL(window.location.href);
  url.searchParams.set('_swbust', String(Date.now()));
  window.location.replace(url.toString());
}

/**
 * Clear PWA caches + unregister SW, then reload once so the browser picks up new assets.
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
  } catch {
    /* private mode — still attempt recovery */
  }

  void clearWithTimeout().finally(() => {
    bustAndReplace();
  });
  return true;
}

/** Manual escape hatch when auto-reload already tried. Keeps spinner visible briefly. */
export async function forceClearCachesAndReload() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  } catch {
    /* ignore */
  }
  const started = Date.now();
  await clearWithTimeout();
  const elapsed = Date.now() - started;
  const minVisibleMs = 5_000;
  if (elapsed < minVisibleMs) {
    await new Promise((resolve) => setTimeout(resolve, minVisibleMs - elapsed));
  }
  bustAndReplace();
}
