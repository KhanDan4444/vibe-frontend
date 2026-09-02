import React from 'react';
import { forceClearCachesAndReload, isChunkLoadError, reloadOnceForStaleChunk } from '../utils/chunkLoadRecovery';

/**
 * Safety net for chunk-load failures that escape lazyWithRetry (e.g. nested imports).
 * Shows after a deploy when the browser still holds a stale hashed chunk.
 */
export class ChunkLoadErrorBoundary extends React.Component {
  state = { failed: false, reloading: false };

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

  handleReload = () => {
    if (this.state.reloading) return;
    this.setState({ reloading: true });
    void forceClearCachesAndReload();
  };

  render() {
    if (this.state.failed) {
      const { reloading } = this.state;
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center dark:bg-app-bg">
          {reloading ? (
            <>
              <div
                className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600/30 border-t-teal-600 dark:border-teal-400/25 dark:border-t-teal-400"
                aria-hidden
              />
              <p className="text-sm text-app-muted">Reloading…</p>
            </>
          ) : (
            <>
              <p className="text-sm text-app-muted">Updating…</p>
              <button
                type="button"
                onClick={this.handleReload}
                className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
              >
                Reload app
              </button>
            </>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
