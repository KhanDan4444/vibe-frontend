import { lazy } from 'react';
import { isChunkLoadError, reloadOnceForStaleChunk } from './chunkLoadRecovery';

/** If auto-reload stalls (SW unregister, blocked navigation), stop hanging Suspense. */
const RELOAD_ESCAPE_MS = 8_000;

/**
 * Like React.lazy, but auto-reloads once when a hashed chunk 404s after a deploy.
 */
export function lazyWithRetry(factory) {
  return lazy(() =>
    factory().catch((error) => {
      if (isChunkLoadError(error) && reloadOnceForStaleChunk()) {
        // Keep Suspense up briefly while reload runs — but never forever.
        return new Promise((resolve, reject) => {
          window.setTimeout(() => reject(error), RELOAD_ESCAPE_MS);
        });
      }
      throw error;
    }),
  );
}
