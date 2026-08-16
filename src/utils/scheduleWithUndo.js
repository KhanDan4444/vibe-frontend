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
