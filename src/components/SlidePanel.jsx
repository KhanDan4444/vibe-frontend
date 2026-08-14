import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { overlayBackdrop, modalTitle } from '../utils/surfaceClasses';
import Button from './ui/Button';

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
        className={`relative flex h-full w-full ${panelWidth} flex-col border-l border-app-border-subtle bg-app-raised shadow-[0_12px_40px_rgb(28_25_23/0.12)] animate-in slide-in-from-right duration-200 dark:shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b px-4 py-4 border-app-border-subtle sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 id="slide-panel-title" className={modalTitle}>
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-xs text-app-muted">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerAction}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-app-muted hover:bg-app-surface hover:text-app-text-strong"
              aria-label={t('aria.closePanel')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="safe-bottom flex-1 overflow-y-auto px-4 pt-5 [--safe-bottom-base:1.25rem] sm:px-6 sm:pt-6 sm:[--safe-bottom-base:1.5rem]">{children}</div>

        {footer && (
          <div className="safe-bottom max-h-[min(50vh,28rem)] shrink-0 overflow-y-auto border-t border-app-border-subtle bg-app-raised px-4 pt-4 [--safe-bottom-base:1.25rem] sm:px-6 sm:pt-4">
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
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-teal-700 text-2xl font-bold text-white dark:bg-teal-600">
          {initial}
        </div>
      )}
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <h3 className="font-display text-2xl font-semibold tracking-tight text-app-text-strong sm:text-[1.65rem]">
            {name}
          </h3>
          {badge}
        </div>
        {lines.length > 0 ? (
          <div className="mt-2 space-y-0.5">
            {lines.map((line) => (
              <p
                key={line.key || line.text}
                className={`flex items-center gap-1.5 text-sm leading-snug text-app-muted ${line.mono ? 'font-mono tracking-tight' : ''}`}
              >
                {line.icon ? <line.icon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden /> : null}
                <span className="min-w-0 truncate">{line.text}</span>
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SlidePanelSection({ title, action, children, className = '' }) {
  return (
    <section className={className}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-app-muted">{title}</h4>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SlidePanelCard({ children }) {
  return (
    <div className="space-y-0.5 border-t pt-1 border-app-border-subtle">
      {children}
    </div>
  );
}

/** Label / value row — icon optional (omit for quieter profile sheets). */
export function SlidePanelRow({
  icon: Icon,
  label,
  value,
  valueClassName = 'text-sm font-medium text-app-text-strong',
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-0 py-2">
      <div className="flex min-w-0 items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 shrink-0 text-app-muted" aria-hidden /> : null}
        <span className="text-sm text-app-muted">{label}</span>
      </div>
      <span className={`shrink-0 text-right ${valueClassName}`}>{value}</span>
    </div>
  );
}

export function SlidePanelEmpty({ children }) {
  return (
    <p className="rounded-xl border border-dashed py-8 text-center text-sm border-app-border-subtle text-app-muted">
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
    <ul className="divide-y divide-app-border-subtle">
      {children}
    </ul>
  );
}

export function SlidePanelListItem({ icon: Icon, title, subtitle, trailing }) {
  return (
    <li className="flex items-center justify-between gap-3 px-0 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-app-muted" aria-hidden />}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-app-text-strong">{title}</p>
          {subtitle && <p className="text-xs text-app-muted">{subtitle}</p>}
        </div>
      </div>
      {trailing}
    </li>
  );
}

export function SlidePanelFooterAlert({ variant = 'info', children }) {
  const styles = {
    muted: 'border-app-border-subtle bg-app-raised text-app-muted dark:border-app-border dark:bg-app-surface/40 dark:text-app-muted',
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
    <div className="space-y-2.5">
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
  const cols = columns === 1 ? 'grid-cols-1' : columns === 3 ? 'grid-cols-3' : 'grid-cols-2';
  return <div className={`grid ${cols} gap-2.5`}>{children}</div>;
}

/**
 * Panel action control.
 * - hero: full-width primary money/lifecycle CTA
 * - tile: quiet outline for secondary workflows
 * - primary / secondary / success / danger: row buttons
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
      <Button onClick={onClick} className={`w-full min-h-11 rounded-xl text-[15px] font-semibold ${className}`} {...props}>
        {Icon && <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />}
        <span>{children}</span>
      </Button>
    );
  }

  if (variant === 'tile') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-app-border-subtle bg-transparent px-3 py-2.5 text-sm font-semibold text-app-text-strong transition-colors hover:border-teal-600/35 hover:bg-teal-600/[0.04] hover:text-teal-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30 dark:hover:border-teal-400/35 dark:hover:bg-teal-400/[0.06] dark:hover:text-teal-100 disabled:opacity-50 ${className}`}
        {...props}
      >
        {Icon && <Icon className="h-4 w-4 shrink-0 text-app-muted" aria-hidden />}
        <span className="leading-tight">{children}</span>
      </button>
    );
  }

  if (variant === 'successHero') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-[15px] font-semibold text-white transition hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-app-surface disabled:opacity-50 ${className}`}
        {...props}
      >
        {Icon && <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />}
        <span>{children}</span>
      </button>
    );
  }

  if (variant === 'dangerIcon') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-rose-200/90 bg-app-raised text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10 disabled:opacity-50 ${className}`}
        {...props}
      >
        {Icon && <Icon className="h-4 w-4" aria-hidden />}
        {children}
      </button>
    );
  }

  if (variant === 'secondary') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-app-muted transition-colors hover:bg-app-surface hover:text-app-text-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-app-border/40 disabled:opacity-50 ${className}`}
        {...props}
      >
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
        {children}
      </button>
    );
  }

  if (variant === 'danger') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-[color:var(--color-status-expired)] transition-colors hover:bg-[color:var(--color-status-expired)]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30 disabled:opacity-50 ${className}`}
        {...props}
      >
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
        {children}
      </button>
    );
  }

  if (variant === 'success') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-50 ${className}`}
        {...props}
      >
        {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden />}
        {children}
      </button>
    );
  }

  return (
    <Button onClick={onClick} className={className} {...props}>
      {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden />}
      {children}
    </Button>
  );
}
