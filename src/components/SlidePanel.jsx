import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { overlayBackdrop } from '../utils/surfaceClasses';

/**
 * Right-side slide-over shell used across the gym owner platform.
 */
export function SlidePanel({
  open,
  onClose,
  title,
  subtitle,
  headerAction,
  children,
  footer,
  maxWidth = 'max-w-lg',
  zIndexClass = 'z-[65]',
}) {
  const { t } = useTranslation();
  if (!open) return null;

  const panelWidth = {
    'max-w-md': 'max-w-full sm:max-w-md',
    'max-w-lg': 'max-w-full sm:max-w-lg',
    'max-w-xl': 'max-w-full sm:max-w-xl',
  }[maxWidth] || 'max-w-full sm:max-w-lg';

  return createPortal(
    <div className={`fixed inset-0 ${zIndexClass} flex justify-end`}>
      <button
        type="button"
        className={`absolute inset-0 ${overlayBackdrop}`}
        aria-label={t('aria.closePanel')}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="slide-panel-title"
        className={`relative flex h-full w-full ${panelWidth} flex-col border-l border-slate-200 dark:border-app-border-subtle bg-white shadow-2xl animate-in slide-in-from-right duration-200  dark:bg-app-surface`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 dark:border-app-border-subtle sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 id="slide-panel-title" className="text-lg font-bold text-slate-900 dark:text-app-text-strong">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-app-muted">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerAction}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-app-raised dark:hover:text-app-text-strong"
              aria-label={t('aria.closePanel')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="safe-bottom flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">{children}</div>

        {footer && (
          <div className="safe-bottom shrink-0 border-t border-slate-200/80 bg-gradient-to-t from-slate-50 to-white px-4 py-4 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.12)] dark:border-app-border-subtle dark:from-app-raised dark:to-app-surface dark:shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.45)] sm:px-6 sm:py-5">
            {footer}
          </div>
        )}
      </aside>
    </div>,
    document.body
  );
}

export function SlidePanelProfileHeader({ name, lines = [], badge, avatar }) {
  const initial = (name || '?').charAt(0).toUpperCase();

  return (
    <div className="flex items-start gap-4">
      {avatar || (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-xl font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
          {initial}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-xl font-bold text-slate-900 dark:text-app-text-strong">{name}</h3>
        {lines.map((line) => (
          <div key={line.key || line.text} className="mt-1 flex items-center gap-2 text-sm text-slate-500 dark:text-app-muted">
            {line.icon && (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400 dark:bg-app-raised dark:text-app-muted">
                <line.icon className="h-3.5 w-3.5" aria-hidden />
              </span>
            )}
            <span className={line.mono ? 'font-mono' : ''}>{line.text}</span>
          </div>
        ))}
        {badge && <div className="mt-2">{badge}</div>}
      </div>
    </div>
  );
}

export function SlidePanelSection({ title, action, children, className = '' }) {
  return (
    <section className={className}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-app-muted">{title}</h4>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SlidePanelCard({ children }) {
  return (
    <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-app-border-subtle dark:bg-app-raised/80">
      {children}
    </div>
  );
}

/** Label / value row with a consistent icon tile on the left. */
export function SlidePanelRow({ icon: Icon, label, value, valueClassName = 'text-sm font-medium text-slate-900 dark:text-app-text-strong' }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg px-1 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 dark:border-app-border-subtle dark:bg-app-surface dark:text-app-muted">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="text-sm font-medium text-slate-600 dark:text-app-text">{label}</span>
      </div>
      <span className={`shrink-0 text-right ${valueClassName}`}>{value}</span>
    </div>
  );
}

export function SlidePanelEmpty({ children }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400 dark:border-app-border-subtle dark:text-app-muted">
      {children}
    </p>
  );
}

export function SlidePanelTotalBadge({ children }) {
  return (
    <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300">
      {children}
    </span>
  );
}

export function SlidePanelList({ children }) {
  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:divide-app-border-subtle dark:border-app-border-subtle dark:bg-app-raised/80">
      {children}
    </ul>
  );
}

export function SlidePanelListItem({ icon: Icon, title, subtitle, trailing }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3 dark:bg-app-surface/40">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 dark:border-app-border-subtle dark:bg-app-raised dark:text-app-muted">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-app-text-strong">{title}</p>
          {subtitle && <p className="text-xs text-slate-500 dark:text-app-muted">{subtitle}</p>}
        </div>
      </div>
      {trailing}
    </li>
  );
}

export function SlidePanelFooterAlert({ variant = 'info', children }) {
  const styles = {
    info: 'border-emerald-200/80 bg-emerald-50 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300',
    warning: 'border-amber-200/80 bg-amber-50 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200',
  };
  return (
    <p className={`rounded-xl border px-3.5 py-2.5 text-center text-xs font-medium leading-relaxed ${styles[variant] || styles.info}`}>
      {children}
    </p>
  );
}

export function SlidePanelFooter({ alerts = [], children }) {
  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <SlidePanelFooterAlert key={alert.key || alert.text} variant={alert.variant}>
          {alert.text}
        </SlidePanelFooterAlert>
      ))}
      {children}
    </div>
  );
}

/** Horizontal wrap / grid for secondary panel actions. */
export function SlidePanelActionGrid({ children, columns = 2 }) {
  const cols = columns === 3 ? 'grid-cols-3' : 'grid-cols-2';
  return <div className={`grid ${cols} gap-2.5`}>{children}</div>;
}

/**
 * Panel action control.
 * - hero: full-width primary money/lifecycle CTA
 * - tile: icon chip + label (secondary workflow)
 * - primary / secondary / success / danger: legacy row buttons (still supported)
 * - dangerIcon: compact destructive control
 */
export function SlidePanelActionButton({
  children,
  onClick,
  variant = 'primary',
  className = '',
  icon: Icon,
  ...props
}) {
  if (variant === 'hero') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`group relative flex w-full min-h-[48px] cursor-pointer items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 dark:bg-indigo-500 dark:shadow-indigo-900/40 dark:hover:bg-indigo-400 dark:focus-visible:ring-offset-app-surface disabled:opacity-50 ${className}`}
        {...props}
      >
        <span
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 transition group-hover:opacity-100"
          aria-hidden
        />
        {Icon && (
          <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        )}
        <span className="relative">{children}</span>
      </button>
    );
  }

  if (variant === 'tile') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`group flex min-h-[56px] cursor-pointer flex-col items-start justify-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50/70 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:border-app-border-subtle dark:bg-app-raised dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10 disabled:opacity-50 ${className}`}
        {...props}
      >
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-indigo-100 group-hover:text-indigo-700 dark:bg-app-surface dark:text-app-muted dark:group-hover:bg-indigo-500/20 dark:group-hover:text-indigo-300">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        )}
        <span className="text-xs font-semibold leading-tight text-slate-800 dark:text-app-text-strong sm:text-sm">
          {children}
        </span>
      </button>
    );
  }

  if (variant === 'successHero') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`group relative flex w-full min-h-[48px] cursor-pointer items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/25 transition hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 dark:shadow-emerald-900/40 dark:focus-visible:ring-offset-app-surface disabled:opacity-50 ${className}`}
        {...props}
      >
        {Icon && (
          <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        )}
        <span className="relative">{children}</span>
      </button>
    );
  }

  if (variant === 'dangerIcon') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-rose-200/90 bg-white text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-500/30 dark:bg-app-raised dark:text-rose-400 dark:hover:bg-rose-500/10 disabled:opacity-50 ${className}`}
        {...props}
      >
        {Icon && <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" aria-hidden />}
        {children}
      </button>
    );
  }

  const variants = {
    primary:
      'min-h-[44px] bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400',
    secondary:
      'min-h-[44px] border border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800 dark:border-app-border-subtle dark:bg-app-raised dark:text-app-text dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200',
    success:
      'min-h-[44px] bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-500',
    danger:
      'min-h-[44px] border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:bg-app-raised dark:text-rose-400 dark:hover:bg-rose-500/10',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 cursor-pointer disabled:opacity-50 ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden />}
      {children}
    </button>
  );
}
