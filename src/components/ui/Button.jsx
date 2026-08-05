import React from 'react';
import { RefreshCw } from 'lucide-react';

const VARIANTS = {
  primary:
    'bg-teal-700 text-white hover:bg-teal-800 focus-visible:ring-teal-600/30 dark:bg-teal-600 dark:hover:bg-teal-500',
  secondary:
    'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-300/40 dark:border-app-border-subtle dark:bg-app-raised dark:text-app-text dark:hover:bg-app-surface',
  ghost:
    'text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-300/40 dark:text-app-muted dark:hover:bg-app-raised',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500/30',
};

const SIZES = {
  sm: 'min-h-9 px-3 py-1.5 text-sm',
  md: 'min-h-10 px-4 py-2 text-sm',
};

/**
 * @param {object} props
 * @param {'primary'|'secondary'|'ghost'|'danger'} [props.variant]
 * @param {'sm'|'md'} [props.size]
 * @param {boolean} [props.loading]
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  disabled,
  loading = false,
  children,
  ...rest
}) {
  const busy = Boolean(loading);
  return (
    <button
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={[
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-app-bg',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant] ?? VARIANTS.primary,
        SIZES[size] ?? SIZES.md,
        className,
      ].join(' ')}
      {...rest}
    >
      {busy ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden /> : children}
    </button>
  );
}
