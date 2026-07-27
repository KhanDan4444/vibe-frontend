import React from 'react';
import { isChunkLoadError, reloadOnceForStaleChunk } from '../utils/chunkLoadRecovery';

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
        <div className="flex min-h-[50vh] items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-app-bg dark:text-app-muted">
          Updating…
        </div>
      );
    }
    return this.props.children;
  }
}
