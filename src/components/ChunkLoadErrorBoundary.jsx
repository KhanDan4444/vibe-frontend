import React from 'react';
import { forceClearCachesAndReload, isChunkLoadError, reloadOnceForStaleChunk } from '../utils/chunkLoadRecovery';

/**
 * Safety net for chunk-load failures that escape lazyWithRetry (e.g. nested imports).
 */
export class ChunkLoadErrorBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError(error) {
    if (isChunkLoadError(error)) {
      return { failed: true };
    }
    return null;
  }

  componentDidCatch(error) {
    if (isChunkLoadError(error)) {
      reloadOnceForStaleChunk();
    }
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center dark:bg-app-bg">
          <p className="text-sm text-slate-500 dark:text-app-muted">Updating…</p>
          <button
            type="button"
            onClick={() => forceClearCachesAndReload()}
            className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-600"
          >
            Reload app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
