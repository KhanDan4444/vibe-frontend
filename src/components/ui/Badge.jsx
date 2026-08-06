import React from 'react';

export const BADGE_VARIANTS = {
  active:
    'bg-[color:var(--color-status-active)]/10 text-[color:var(--color-status-active)] border-[color:var(--color-status-active)]/20',
  success:
    'bg-[color:var(--color-status-active)]/10 text-[color:var(--color-status-active)] border-[color:var(--color-status-active)]/20',
  suspended:
    'bg-[color:var(--color-status-expired)]/10 text-[color:var(--color-status-expired)] border-[color:var(--color-status-expired)]/20',
  expired:
    'bg-[color:var(--color-status-expired)]/10 text-[color:var(--color-status-expired)] border-[color:var(--color-status-expired)]/20',
  danger:
    'bg-[color:var(--color-status-expired)]/10 text-[color:var(--color-status-expired)] border-[color:var(--color-status-expired)]/20',
  trialing:
    'bg-[color:var(--color-status-trialing)]/10 text-[color:var(--color-status-trialing)] border-[color:var(--color-status-trialing)]/20',
  warning:
    'bg-[color:var(--color-status-trialing)]/10 text-[color:var(--color-status-trialing)] border-[color:var(--color-status-trialing)]/20',
  'due soon':
    'bg-[color:var(--color-status-due-soon)]/10 text-[color:var(--color-status-due-soon)] border-[color:var(--color-status-due-soon)]/20',
  info:
    'bg-[color:var(--color-status-due-soon)]/10 text-[color:var(--color-status-due-soon)] border-[color:var(--color-status-due-soon)]/20',
  unpaid:
    'bg-[color:var(--color-status-unpaid)]/10 text-[color:var(--color-status-unpaid)] border-[color:var(--color-status-unpaid)]/20',
  neutral: 'bg-app-surface text-app-text border-app-border-subtle',
};

export const BADGE_DOT_VARIANTS = {
  active: 'bg-[color:var(--color-status-active)]',
  success: 'bg-[color:var(--color-status-active)]',
  suspended: 'bg-[color:var(--color-status-expired)]',
  expired: 'bg-[color:var(--color-status-expired)]',
  danger: 'bg-[color:var(--color-status-expired)]',
  trialing: 'bg-[color:var(--color-status-trialing)]',
  warning: 'bg-[color:var(--color-status-trialing)]',
  'due soon': 'bg-[color:var(--color-status-due-soon)]',
  info: 'bg-[color:var(--color-status-due-soon)]',
  unpaid: 'bg-[color:var(--color-status-unpaid)]',
  neutral: 'bg-app-muted',
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
