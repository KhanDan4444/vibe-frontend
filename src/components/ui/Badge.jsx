import React from 'react';

export const BADGE_VARIANTS = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  suspended: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
  expired: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
  danger: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
  trialing: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  warning: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  'due soon': 'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/20',
  info: 'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/20',
  neutral: 'bg-slate-50 text-slate-700 border-slate-100 dark:bg-app-surface dark:text-app-text dark:border-app-border-subtle',
};

export const BADGE_DOT_VARIANTS = {
  active: 'bg-emerald-400',
  success: 'bg-emerald-400',
  suspended: 'bg-rose-400',
  expired: 'bg-rose-400',
  danger: 'bg-rose-400',
  trialing: 'bg-amber-400',
  warning: 'bg-amber-400',
  'due soon': 'bg-sky-500',
  info: 'bg-sky-500',
  neutral: 'bg-slate-400',
};

/**
 * @param {object} props
 * @param {string} props.children
 * @param {keyof typeof BADGE_VARIANTS | string} [props.variant]
 * @param {boolean} [props.showDot]
 */
export default function Badge({ children, variant = 'neutral', showDot = false, className = '' }) {
  const key = String(variant || 'neutral').toLowerCase();
  const badgeClass = BADGE_VARIANTS[key] || BADGE_VARIANTS.neutral;
  const dotClass = BADGE_DOT_VARIANTS[key] || BADGE_DOT_VARIANTS.neutral;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeClass} ${className}`}
    >
      {showDot ? <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${dotClass}`} aria-hidden /> : null}
      {children}
    </span>
  );
}
