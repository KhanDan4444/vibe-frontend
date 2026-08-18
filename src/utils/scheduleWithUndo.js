import { FLASH_COMMITTED_MS } from '../components/FlashBanner';
import { flashFromKey } from '../i18n/flashToast';

/** Window to undo a destructive action before it commits. */
export const UNDO_DELAY_MS = 5500;

/**
 * @param {object} opts
 * @param {(msg: object) => void} opts.showFlash
 * @param {import('i18next').TFunction} opts.t
 * @param {string} opts.pendingKey - flash.* key while waiting
 * @param {string} opts.cancelledKey - flash.* key when undone
 * @param {string} opts.committedKey - flash.* key after delete succeeds
 * @param {object} [opts.subtitleParams]
 * @param {() => void} opts.onUndo - restore optimistic UI
 * @param {() => void | Promise<void>} opts.onCommit - run delete API
 */
export function scheduleDeleteWithUndo({
  showFlash,
  t,
  pendingKey,
  cancelledKey,
  committedKey,
  subtitleParams,
  onUndo,
  onCommit,
}) {
  let settled = false;
  const timer = setTimeout(async () => {
    if (settled) return;
    settled = true;
    try {
      await onCommit();
      showFlash({
        ...flashFromKey(t, committedKey, { subtitleParams, variant: 'danger' }),
        durationMs: FLASH_COMMITTED_MS,
      });
    } catch (err) {
      onUndo();
      showFlash({
        title: err instanceof Error ? err.message : t('common.error'),
        variant: 'danger',
      });
    }
  }, UNDO_DELAY_MS);

  showFlash({
    ...flashFromKey(t, pendingKey, { subtitleParams, variant: 'danger' }),
    durationMs: UNDO_DELAY_MS,
    urgent: true,
    actionHint: t('flash.undoHint'),
    action: {
      label: t('common.undo'),
      onClick: () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        onUndo();
        showFlash(flashFromKey(t, cancelledKey, { subtitleParams, variant: 'success' }));
      },
    },
  });

  return () => {
    settled = true;
    clearTimeout(timer);
  };
}

/**
 * Show the restored toast immediately; run the API in the background.
 * Undo re-archives after restore has finished (or queues re-archive if still in flight).
 */
export function restoreWithUndoFlash({
  showFlash,
  t,
  name,
  restore,
  rearchive,
  onRestored,
  onRearchived,
  onFailed,
}) {
  let cancelled = false;
  let restoreFinished = false;
  let restoreFailed = false;
  const subtitleParams = { name };

  const confirmTimer = setTimeout(() => {
    if (cancelled || restoreFailed) return;
    showFlash({
      ...flashFromKey(t, 'memberRestored', { subtitleParams }),
      durationMs: FLASH_COMMITTED_MS,
    });
  }, UNDO_DELAY_MS);

  showFlash({
    ...flashFromKey(t, 'memberRestorePending', { subtitleParams }),
    durationMs: UNDO_DELAY_MS,
    urgent: true,
    actionHint: t('flash.undoHint'),
    action: {
      label: t('common.undo'),
      onClick: () => {
        cancelled = true;
        clearTimeout(confirmTimer);
        void (async () => {
          try {
            if (restoreFinished) await rearchive();
            onRearchived?.();
            showFlash({
              ...flashFromKey(t, 'memberRestoreUndone', { subtitleParams }),
              durationMs: FLASH_COMMITTED_MS,
            });
          } catch (err) {
            showFlash({
              title: err instanceof Error ? err.message : t('common.error'),
              variant: 'danger',
            });
          }
        })();
      },
    },
  });

  requestAnimationFrame(() => {
    onRestored?.();
  });

  void (async () => {
    try {
      await restore();
      restoreFinished = true;
      if (cancelled) await rearchive();
    } catch (err) {
      if (cancelled) return;
      restoreFailed = true;
      clearTimeout(confirmTimer);
      onFailed?.(err);
    }
  })();

  return () => {
    cancelled = true;
    clearTimeout(confirmTimer);
  };
}
