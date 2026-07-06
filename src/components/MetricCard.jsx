// src/components/MetricCard.jsx
import React from 'react';

/**
 * Shared metric card for dashboards (AdminDashboard + OwnerDashboard).
 *
 * @param {object} props
 * @param {string} props.label - Card title.
 * @param {string|number} props.value - Primary large value.
 * @param {string} [props.subValue] - Smaller text displayed right after value (e.g. "/7").
 * @param {string} [props.hint] - Secondary small text below value.
 * @param {React.ComponentType} props.icon - Lucide icon component.
 * @param {'emerald'|'indigo'|'rose'|'violet'|'amber'|'slate'} [props.color='indigo'] - Color theme.
 * @param {string} [props.hintColor] - Optional tailwind text class for the hint (e.g. 'text-amber-600').
 * @param {boolean} [props.showProgressBar] - Whether to show a progress bar.
 * @param {number} [props.progress] - Progress percentage (0-100).
 * @param {string} [props.badge] - Optional badge text shown top-right (e.g. 'Critical').
 * @param {string} [props.trend] - Optional comparison label (e.g. '+12.5%' vs last month).
 * @param {string} [props.trendCaption] - Small text under trend (e.g. 'vs last month').
 */

import { cardSurface } from '../utils/surfaceClasses';

const COLOR_MAP = {
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/12 dark:text-emerald-400',
  indigo:  'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/12 dark:text-indigo-400',
  rose:    'bg-rose-50 text-rose-600 dark:bg-rose-500/12 dark:text-rose-400',
  violet:  'bg-violet-50 text-violet-600 dark:bg-violet-500/12 dark:text-violet-400',
  amber:   'bg-amber-50 text-amber-600 dark:bg-amber-500/12 dark:text-amber-400',
  slate:   'bg-slate-50 text-slate-600 dark:bg-app-surface dark:text-app-muted',
};

const PROGRESS_COLOR = {
  emerald: 'bg-emerald-500',
  indigo:  'bg-indigo-500',
  rose:    'bg-rose-500',
  violet:  'bg-violet-500',
  amber:   'bg-amber-500',
  slate:   'bg-slate-500',
};

const BADGE_COLOR = {
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  indigo:  'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
  rose:    'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
  violet:  'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20',
  amber:   'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  slate:   'bg-slate-50 text-slate-600 border-slate-100 dark:bg-app-surface dark:text-app-muted dark:border-app-border-subtle',
};

export default function MetricCard({
  label,
  value,
  subValue,
  hint,
  icon: Icon,
  color = 'indigo',
  hintColor,
  showProgressBar,
  progress = 0,
  badge,
  showHintBelow,
  trend,
  trendCaption = 'vs last month',
}) {
  const iconClass = COLOR_MAP[color] || COLOR_MAP.indigo;
  const progressBarColor = PROGRESS_COLOR[color] || PROGRESS_COLOR.indigo;
  const badgeClass = BADGE_COLOR[color] || BADGE_COLOR.indigo;
  const trendPositive = trend ? !String(trend).startsWith('-') : true;

  return (
    <div className={`relative p-6 ${cardSurface}`}>
      {/* Badge */}
      {badge && (
        <span className={`absolute top-4 right-4 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${badgeClass}`}>
          {badge}
        </span>
      )}

      {/* Icon + hint row */}
      <div className="flex items-center justify-between">
        <span className={`rounded-lg p-2.5 ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </span>
        {!badge && !showProgressBar && !showHintBelow && hint && (
          <span className={`text-xs font-medium ${hintColor || 'text-slate-400'}`}>{hint}</span>
        )}
      </div>

      {/* Label */}
      <div className="mt-3">
        <span className="text-xs font-semibold leading-snug text-slate-400 dark:text-app-muted">{label}</span>
      </div>

      {/* Value */}
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-3xl font-bold text-slate-900 dark:text-app-text-strong">{value}</span>
        {subValue && (
          <span className="text-lg font-medium text-slate-400">{subValue}</span>
        )}
        {trend && (
          <span
            className={`text-xs font-semibold ${
              trendPositive ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {trend}
          </span>
        )}
      </div>

      {trend && trendCaption && (
        <p className="mt-1 text-xs text-slate-400 dark:text-app-muted">{trendCaption}</p>
      )}

      {/* Progress Bar */}
      {showProgressBar && (
        <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100 dark:bg-app-border-subtle">
          <div
            className={`h-1.5 rounded-full ${progressBarColor} transition-all duration-500`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          ></div>
        </div>
      )}

      {/* Hint text below (for cards with badges) */}
      {badge && hint && (
        <p className={`mt-2 text-xs ${hintColor || 'text-slate-400'}`}>{hint}</p>
      )}

      {/* Hint text for cards with progress but no badge */}
      {!badge && showProgressBar && hint && (
        <p className={`mt-2 text-xs flex items-center gap-1 ${hintColor || 'text-slate-400'}`}>
          <TrendingUpIcon className="h-3 w-3" /> {hint}
        </p>
      )}

      {/* Hint text shown below value (e.g. Revenue card) */}
      {!badge && !showProgressBar && showHintBelow && hint && (
        <p className={`mt-2 text-xs flex items-center gap-1 ${hintColor || 'text-slate-400'}`}>
          <TrendingUpIcon className="h-3 w-3" /> {hint}
        </p>
      )}
    </div>
  );
}

export function MetricCardSkeleton() {
  return (
    <div className={`relative p-6 ${cardSurface}`}>
      <div className="app-skeleton h-10 w-10 rounded-lg" />
      <div className="app-skeleton mt-3 h-3 w-24" />
      <div className="app-skeleton mt-3 h-8 w-20" />
      <div className="app-skeleton mt-3 h-3 w-32" />
    </div>
  );
}

// Small inline trending icon for hints with progress
function TrendingUpIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
      <polyline points="17 6 23 6 23 12"></polyline>
    </svg>
  );
}
