import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

/**
 * One-time coach mark teaching ⌘/Ctrl+B after the first collapse.
 */
export default function SidebarShortcutCoach({
  open,
  onDismiss,
  shortcutHint,
  anchorRef,
  layoutKey,
}) {
  const { t } = useTranslation();
  const [coords, setCoords] = useState(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  const updatePosition = useCallback(() => {
    const el = anchorRef?.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({
      top: rect.top + rect.height / 2,
      left: rect.right + 12,
    });
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return undefined;
    }
    updatePosition();
    // Wait one frame so collapse width transition can settle.
    const raf = window.requestAnimationFrame(updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, layoutKey, updatePosition]);

  useEffect(() => {
    if (!open) return undefined;
    const ms = reducedMotion ? 5000 : 7000;
    const id = window.setTimeout(onDismiss, ms);
    return () => window.clearTimeout(id);
  }, [open, onDismiss, reducedMotion]);

  if (!open || !coords || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="status"
      className={`fixed z-[301] w-[min(16.5rem,calc(100vw-5rem))] -translate-y-1/2 ${
        reducedMotion ? '' : 'animate-in fade-in slide-in-from-left-2 duration-200'
      }`}
      style={{ top: coords.top, left: coords.left }}
    >
      <div className="relative rounded-xl border border-teal-500/25 bg-slate-900 px-3.5 py-3 text-left shadow-xl ring-1 ring-white/10 dark:bg-zinc-900">
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-2 top-2 rounded-md p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          aria-label={t('common.close')}
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <p className="pr-6 text-sm font-medium leading-snug text-white">
          {t('common.sidebarShortcutTip', { shortcut: shortcutHint })}
        </p>
        <p className="mt-1.5 text-[11px] leading-snug text-slate-400">
          {t('common.sidebarShortcutTipHint')}
        </p>
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-l border-teal-500/25 bg-slate-900 dark:bg-zinc-900"
        />
      </div>
    </div>,
    document.body
  );
}
