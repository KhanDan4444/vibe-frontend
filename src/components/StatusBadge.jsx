// src/components/StatusBadge.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Unified status badge used for both member statuses (Active, Expired, Due Soon)
 * and gym subscription statuses (active, suspended, expired, trialing).
 *
 * @param {object} props
 * @param {string} props.status - Raw status string (any casing).
 * @param {boolean} [props.showDot=true] - Whether to show the colored dot indicator.
 */

const STATUS_STYLES = {
  active:    { badge: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20', dot: 'bg-emerald-400' },
  suspended: { badge: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20', dot: 'bg-rose-400' },
  expired:   { badge: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20', dot: 'bg-rose-400' },
  trialing:  { badge: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20', dot: 'bg-amber-400' },
  'due soon':{ badge: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20', dot: 'bg-amber-400' },
};

const LABEL_KEYS = {
  active:    'status.active',
  suspended: 'status.suspended',
  expired:   'status.expired',
  trialing:  'status.trialing',
  'due soon':'status.dueSoon',
};

const DEFAULT_STYLE = { badge: 'bg-slate-50 text-slate-700 border-slate-100 dark:bg-app-surface dark:text-app-text dark:border-app-border-subtle', dot: 'bg-slate-400' };

export default function StatusBadge({ status, showDot = true }) {
  const { t } = useTranslation();
  const key = (status || '').toLowerCase();
  const style = STATUS_STYLES[key] || DEFAULT_STYLE;
  const labelKey = LABEL_KEYS[key];
  const label = labelKey
    ? t(labelKey)
    : (status ? status.charAt(0).toUpperCase() + status.slice(1) : t('status.unknown'));

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style.badge}`}>
      {showDot && <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${style.dot}`} />}
      {label}
    </span>
  );
}
