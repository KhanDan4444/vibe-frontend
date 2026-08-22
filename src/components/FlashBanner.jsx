import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, CloudOff, X, XCircle } from 'lucide-react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

/** Visible long enough to read, without feeling sticky. */
export const FLASH_DISMISS_MS = 4500;
/** Brief confirmation after a destructive action has already committed. */
export const FLASH_COMMITTED_MS = 1000;
/** Plan delete confirmation — long enough to read the subtitle. */
export const FLASH_PLAN_DELETED_MS = 4000;
const EXIT_MS = 200;

/**
 * @typedef {'success' | 'danger' | 'warning' | 'offline'} FlashVariant
 * @typedef {{
 *   id: string,
 *   title: string,
 *   subtitle?: string,
 *   variant?: FlashVariant,
 *   durationMs?: number,
 *   urgent?: boolean,
 *   actionHint?: string,
 *   action?: { label: string, onClick: () => void },
 * }} FlashToastRecord
 */

const VARIANTS = {
  success: {
    Icon: CheckCircle2,
    accent: 'bg-[color:var(--color-status-active)]',
    iconWrap:
      'bg-[color:var(--color-status-active)]/12 text-[color:var(--color-status-active)]',
    surface:
      'border-[color:var(--color-status-active)]/20 bg-app-raised/95',
    title: 'text-app-text-strong',
    subtitle: 'text-app-text',
    hint: 'text-app-muted',
    progress: 'bg-[color:var(--color-status-active)]/80',
    close: 'text-app-muted hover:bg-app-surface',
    actionBtn:
      'border-[color:var(--color-status-active)]/35 bg-[color:var(--color-status-active)]/8 text-[color:var(--color-status-active)] hover:bg-[color:var(--color-status-active)]/15',
  },
  danger: {
    Icon: XCircle,
    accent: 'bg-[color:var(--color-status-expired)]',
    iconWrap:
      'bg-[color:var(--color-status-expired)]/12 text-[color:var(--color-status-expired)]',
    surface:
      'border-[color:var(--color-status-expired)]/20 bg-app-raised/95',
    title: 'text-app-text-strong',
    subtitle: 'text-app-text',
    hint: 'text-app-muted',
    progress: 'bg-[color:var(--color-status-expired)]/80',
    close: 'text-app-muted hover:bg-app-surface',
    actionBtn:
      'border-[color:var(--color-status-expired)]/35 bg-[color:var(--color-status-expired)]/8 text-[color:var(--color-status-expired)] hover:bg-[color:var(--color-status-expired)]/15',
  },
  warning: {
    Icon: AlertTriangle,
    accent: 'bg-[color:var(--color-status-trialing)]',
    iconWrap:
      'bg-[color:var(--color-status-trialing)]/12 text-[color:var(--color-status-trialing)]',
    surface:
      'border-[color:var(--color-status-trialing)]/25 bg-app-raised/95',
    title: 'text-app-text-strong',
    subtitle: 'text-app-text',
    hint: 'text-app-muted',
    progress: 'bg-[color:var(--color-status-trialing)]/80',
    close: 'text-app-muted hover:bg-app-surface',
    actionBtn:
      'border-[color:var(--color-status-trialing)]/35 bg-[color:var(--color-status-trialing)]/8 text-[color:var(--color-status-trialing)] hover:bg-[color:var(--color-status-trialing)]/15',
  },
  offline: {
    Icon: CloudOff,
    accent: 'bg-[color:var(--color-status-trialing)]',
    iconWrap:
      'bg-[color:var(--color-status-trialing)]/12 text-[color:var(--color-status-trialing)]',
    surface:
      'border-[color:var(--color-status-trialing)]/25 bg-app-raised/95',
    title: 'text-app-text-strong',
    subtitle: 'text-app-text',
    hint: 'text-app-muted',
    progress: 'bg-[color:var(--color-status-trialing)]/80',
    close: 'text-app-muted hover:bg-app-surface',
    actionBtn:
      'border-[color:var(--color-status-trialing)]/35 bg-[color:var(--color-status-trialing)]/8 text-[color:var(--color-status-trialing)] hover:bg-[color:var(--color-status-trialing)]/15',
  },
};

function FlashToastItem({ toast, onDismiss }) {
  const { t } = useTranslation();
  const reducedMotion = usePrefersReducedMotion();
  const [exiting, setExiting] = useState(false);
  const [paused, setPaused] = useState(false);
  const dismissTimerRef = useRef(null);
  const exitTimerRef = useRef(null);
  const dismissingRef = useRef(false);
  const onDismissRef = useRef(onDismiss);
  const bodyId = `flash-body-${toast.id}`;
  const hintId = `flash-hint-${toast.id}`;

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  const clearTimers = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, []);

  const finishDismiss = useCallback(() => {
    dismissingRef.current = false;
    setExiting(false);
    onDismissRef.current(toast.id);
  }, [toast.id]);

  const dismiss = useCallback(
    (immediate = false) => {
      if (dismissingRef.current) return;
      dismissingRef.current = true;
      clearTimers();
      if (immediate || reducedMotion) {
        finishDismiss();
        return;
      }
      setExiting(true);
      exitTimerRef.current = setTimeout(finishDismiss, EXIT_MS);
    },
    [clearTimers, finishDismiss, reducedMotion]
  );

  const durationMs =
    toast.durationMs ??
    (toast.variant === 'danger' && !toast.action ? FLASH_COMMITTED_MS : FLASH_DISMISS_MS);

  useEffect(() => {
    dismissingRef.current = false;
    setExiting(false);
    setPaused(false);
    clearTimers();
    dismissTimerRef.current = setTimeout(() => dismiss(false), durationMs);
    return clearTimers;
  }, [toast.id, dismiss, clearTimers, durationMs]);

  const variant = VARIANTS[toast.variant] ?? VARIANTS.success;
  const { Icon } = variant;
  const showSubtitle = Boolean(toast.subtitle);
  const showAction = Boolean(toast.action?.label);
  const showHint = Boolean(toast.actionHint);
  const isUrgent = Boolean(toast.urgent);
  const describedBy = [showSubtitle ? bodyId : null, showHint ? hintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div
      role={isUrgent ? 'alert' : 'status'}
      aria-live={isUrgent ? 'assertive' : 'polite'}
      aria-atomic="true"
      aria-describedby={describedBy}
      className={[
        'flash-toast pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border p-3.5 pr-3 shadow-lg shadow-black/[0.08] ring-1 ring-black/5 backdrop-blur-md dark:shadow-black/40 dark:ring-white/5',
        variant.surface,
        reducedMotion ? '' : exiting ? 'flash-toast-out' : 'flash-toast-in',
      ].join(' ')}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <span className={`absolute inset-y-2.5 left-0 w-1 rounded-r-full ${variant.accent}`} aria-hidden />

      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${variant.iconWrap}`}>
        <Icon className="h-4 w-4" aria-hidden />
      </div>

      <div id={bodyId} className="min-w-0 flex-1 pt-0.5 pr-1">
        <p className={`text-sm font-semibold leading-snug tracking-tight ${variant.title}`}>{toast.title}</p>
        {showSubtitle ? (
          <p className={`mt-0.5 text-[13px] leading-snug ${variant.subtitle}`}>{toast.subtitle}</p>
        ) : null}
        {showAction ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toast.action.onClick();
              dismiss(true);
            }}
            className={`mt-2.5 inline-flex items-center rounded-lg border px-2.5 py-1 text-[13px] font-semibold transition-colors ${variant.actionBtn}`}
            aria-label={t('flash.undoActionLabel', { action: toast.action.label })}
          >
            {toast.action.label}
          </button>
        ) : null}
        {showHint ? (
          <p id={hintId} className={`mt-1.5 text-[11px] leading-snug ${variant.hint}`}>
            {toast.actionHint}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          dismiss(true);
        }}
        className={`relative z-10 shrink-0 cursor-pointer rounded-md p-1.5 transition-colors ${variant.close}`}
        aria-label={showAction ? t('flash.dismissPending') : t('aria.dismiss')}
      >
        <X className="h-4 w-4 pointer-events-none" />
      </button>

      {!reducedMotion ? (
        <span
          className={`flash-toast-progress pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left ${variant.progress}`}
          style={{
            animationDuration: `${durationMs}ms`,
            animationPlayState: paused ? 'paused' : 'running',
          }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}

/** Top-right toast stack (Sonner-style). Above modals so success is readable. */
export default function FlashToaster({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed top-4 right-4 z-[120] flex w-[min(100vw-2rem,380px)] flex-col gap-2 safe-top"
      aria-relevant="additions"
    >
      {toasts.map((toast) => (
        <FlashToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  );
}

/** @param {string | { title: string, subtitle?: string, variant?: string }} input */
export function flashToast(input) {
  if (!input) return null;
  if (typeof input === 'string') {
    return { title: input, variant: 'success' };
  }
  return { variant: 'success', ...input };
}
