import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { overlayBackdrop } from '../utils/surfaceClasses';
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
        className={`relative flex h-full w-full ${panelWidth} flex-col border-l border-app-border-subtle bg-app-surface shadow-2xl animate-in slide-in-from-right duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b px-4 py-4 border-app-border-subtle sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 id="slide-panel-title" className="text-lg font-bold text-app-text-strong">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-xs text-app-muted">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerAction}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-app-muted hover:bg-app-raised hover:text-app-text-strong"
              aria-label={t('aria.closePanel')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="safe-bottom flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">{children}</div>

        {footer && (
          <div className="safe-bottom max-h-[min(50vh,28rem)] shrink-0 overflow-y-auto border-t border-app-border-subtle bg-app-surface px-4 py-3 sm:px-6 sm:py-3.5">
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
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-700 text-xl font-bold text-white dark:bg-teal-600">
          {initial}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-xl font-bold text-app-text-strong">{name}</h3>
        {lines.map((line) => (
          <div key={line.key || line.text} className="mt-1 flex items-center gap-2 text-sm text-app-muted">
            {line.icon && <line.icon className="h-3.5 w-3.5 shrink-0 text-app-muted" aria-hidden />}
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

/** Label / value row — bare icon, no pastel tile. */
export function SlidePanelRow({ icon: Icon, label, value, valueClassName = 'text-sm font-medium text-app-text-strong' }) {
  return (
    <div className="flex items-center justify-between gap-4 px-0 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-app-muted" aria-hidden />
        <span className="text-sm font-medium text-app-text">{label}</span>
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
    <div className="space-y-2">
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
  return <div className={`grid ${cols} gap-2`}>{children}</div>;
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
      <Button onClick={onClick} className={`w-full ${className}`} {...props}>
        {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden />}
        <span>{children}</span>
      </Button>
    );
  }

  if (variant === 'tile') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`app-field flex min-h-[40px] cursor-pointer items-center gap-2 text-left transition hover:border-teal-600/40 hover:bg-app-surface focus-visible:!border-teal-600 dark:hover:border-teal-500/40 disabled:opacity-50 ${className}`}
        {...props}
      >
        {Icon && <Icon className="h-4 w-4 shrink-0 text-app-muted" aria-hidden />}
        <span className="text-sm font-semibold leading-tight text-app-text-strong">
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
        className={`flex w-full min-h-[40px] cursor-pointer items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-app-surface disabled:opacity-50 ${className}`}
        {...props}
      >
        {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden />}
        <span>{children}</span>
      </button>
    );
  }

  if (variant === 'dangerIcon') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-rose-200/90 bg-app-raised text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10 disabled:opacity-50 ${className}`}
        {...props}
      >
        {Icon && <Icon className="h-4 w-4" aria-hidden />}
        {children}
      </button>
    );
  }

  if (variant === 'secondary') {
    return (
      <Button variant="secondary" onClick={onClick} className={className} {...props}>
        {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden />}
        {children}
      </Button>
    );
  }

  if (variant === 'danger') {
    return (
      <Button variant="danger" onClick={onClick} className={className} {...props}>
        {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden />}
        {children}
      </Button>
    );
  }

  if (variant === 'success') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-50 ${className}`}
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
