import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, CloudOff, X, XCircle } from 'lucide-react';

/** Visible long enough to read, without feeling sticky. */
const DISMISS_MS = 4500;
const EXIT_MS = 220;

/**
 * @typedef {'success' | 'danger' | 'warning' | 'offline'} FlashVariant
 * @typedef {{ title: string, subtitle?: string, variant?: FlashVariant }} FlashToast
 */

const VARIANTS = {
  success: {
    Icon: CheckCircle2,
    accent: 'bg-emerald-500',
    iconWrap: 'bg-emerald-500/12 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
    surface:
      'border-emerald-200/80 bg-emerald-50/95 dark:border-emerald-800/35 dark:bg-emerald-950/85',
    title: 'text-slate-900 dark:text-emerald-50',
    subtitle: 'text-slate-600 dark:text-emerald-100/75',
    progress: 'bg-emerald-500/70 dark:bg-emerald-400/80',
    close: 'text-emerald-700 hover:bg-emerald-100/80 dark:text-emerald-300 dark:hover:bg-emerald-900/50',
  },
  danger: {
    Icon: XCircle,
    accent: 'bg-rose-500',
    iconWrap: 'bg-rose-500/12 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400',
    surface: 'border-rose-200/80 bg-rose-50/95 dark:border-rose-800/35 dark:bg-rose-950/85',
    title: 'text-slate-900 dark:text-rose-50',
    subtitle: 'text-slate-600 dark:text-rose-100/75',
    progress: 'bg-rose-500/70 dark:bg-rose-400/80',
    close: 'text-rose-700 hover:bg-rose-100/80 dark:text-rose-300 dark:hover:bg-rose-900/50',
  },
  warning: {
    Icon: AlertTriangle,
    accent: 'bg-amber-500',
    iconWrap: 'bg-amber-500/12 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    surface: 'border-amber-200/80 bg-amber-50/95 dark:border-amber-800/35 dark:bg-amber-950/85',
    title: 'text-slate-900 dark:text-amber-50',
    subtitle: 'text-slate-600 dark:text-amber-100/75',
    progress: 'bg-amber-500/70 dark:bg-amber-400/80',
    close: 'text-amber-800 hover:bg-amber-100/80 dark:text-amber-300 dark:hover:bg-amber-900/50',
  },
  offline: {
    Icon: CloudOff,
    accent: 'bg-amber-500',
    iconWrap: 'bg-amber-500/12 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    surface: 'border-amber-200/80 bg-amber-50/95 dark:border-amber-800/35 dark:bg-amber-950/85',
    title: 'text-slate-900 dark:text-amber-50',
    subtitle: 'text-slate-600 dark:text-amber-100/75',
    progress: 'bg-amber-500/70 dark:bg-amber-400/80',
    close: 'text-amber-800 hover:bg-amber-100/80 dark:text-amber-300 dark:hover:bg-amber-900/50',
  },
};

/** @param {string | FlashToast | null | undefined} message */
function normalizeToast(message) {
  if (!message) return null;
  if (typeof message === 'string') {
    return { title: message, variant: 'success' };
  }
  return { variant: 'success', ...message };
}

export default function FlashBanner({ message, onDismiss }) {
  const { t } = useTranslation();
  const toast = normalizeToast(message);
  const [exiting, setExiting] = useState(false);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);
  const exitTimerRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    if (!toast || exiting) return;
    clearTimers();
    setExiting(true);
    exitTimerRef.current = setTimeout(() => {
      setExiting(false);
      onDismiss();
    }, EXIT_MS);
  }, [toast, exiting, clearTimers, onDismiss]);

  useEffect(() => {
    if (!toast) {
      setExiting(false);
      setPaused(false);
      clearTimers();
      return undefined;
    }

    setExiting(false);
    setPaused(false);
    clearTimers();
    timerRef.current = setTimeout(dismiss, DISMISS_MS);

    return clearTimers;
  }, [toast, dismiss, clearTimers]);

  if (!toast) return null;

  const variant = VARIANTS[toast.variant] ?? VARIANTS.success;
  const { Icon } = variant;
  const showSubtitle = Boolean(toast.subtitle);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center px-4 pb-4 safe-bottom sm:inset-x-auto sm:right-6 sm:bottom-6 sm:left-auto sm:justify-end sm:px-0 sm:pb-0"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        role="status"
        className={[
          'flash-toast pointer-events-auto relative flex w-full max-w-md items-start gap-3 overflow-hidden rounded-2xl border p-4 pr-3 shadow-xl shadow-slate-900/10 backdrop-blur-md dark:shadow-black/35',
          variant.surface,
          exiting ? 'flash-toast-out' : 'flash-toast-in',
        ].join(' ')}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <span className={`absolute inset-y-3 left-0 w-1 rounded-r-full ${variant.accent}`} aria-hidden />

        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${variant.iconWrap}`}>
          <Icon className="h-5 w-5" aria-hidden />
        </div>

        <div className="min-w-0 flex-1 pt-0.5 pr-1">
          <p className={`text-sm font-semibold leading-snug tracking-tight ${variant.title}`}>{toast.title}</p>
          {showSubtitle ? (
            <p className={`mt-1 text-sm leading-snug ${variant.subtitle}`}>{toast.subtitle}</p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={dismiss}
          className={`shrink-0 rounded-lg p-2 transition-colors ${variant.close}`}
          aria-label={t('aria.dismiss')}
        >
          <X className="h-4 w-4" />
        </button>

        <span
          className={`flash-toast-progress absolute inset-x-0 bottom-0 h-0.5 origin-left ${variant.progress}`}
          style={{
            animationDuration: `${DISMISS_MS}ms`,
            animationPlayState: paused ? 'paused' : 'running',
          }}
          aria-hidden
        />
      </div>
    </div>
  );
}

/** @param {string | FlashToast} input */
export function flashToast(input) {
  return normalizeToast(input);
}
