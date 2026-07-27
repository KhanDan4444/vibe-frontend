import { lazy } from 'react';
import { isChunkLoadError, reloadOnceForStaleChunk } from './chunkLoadRecovery';

/**
 * Like React.lazy, but auto-reloads once when a hashed chunk 404s after a deploy.
 */
export function lazyWithRetry(factory) {
  return lazy(() =>
    factory().catch((error) => {
      if (isChunkLoadError(error) && reloadOnceForStaleChunk()) {
        // Hang the promise until the page reloads.
        return new Promise(() => {});
      }
      throw error;
    }),
  );
}
