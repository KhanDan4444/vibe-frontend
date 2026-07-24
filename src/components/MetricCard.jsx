// src/components/MetricCard.jsx
import React from 'react';
import { panelQuiet } from '../utils/surfaceClasses';

/**
 * Shared metric card for dashboards (AdminDashboard + OwnerDashboard).
 * Quiet chrome + monochrome icon (de-AI).
 */

const PROGRESS_COLOR = {
  emerald: 'bg-emerald-500',
  teal: 'bg-teal-600',
  brand: 'bg-teal-600',
  indigo: 'bg-teal-600',
  rose: 'bg-rose-500',
  violet: 'bg-orange-500',
  amber: 'bg-amber-500',
  slate: 'bg-slate-500',
};

const BADGE_COLOR = {
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  teal: 'bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/20',
  brand: 'bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/20',
  indigo: 'bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/20',
  rose: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
  violet: 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/20',
  amber: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  slate: 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-app-surface dark:text-app-muted dark:border-app-border-subtle',
};

export default function MetricCard({
  label,
  value,
  subValue,
  hint,
  icon: Icon,
  color = 'teal',
  hintColor,
  showProgressBar,
  progress = 0,
  badge,
  showHintBelow,
  trend,
  trendCaption = 'vs last month',
}) {
  const progressBarColor = PROGRESS_COLOR[color] || PROGRESS_COLOR.teal;
  const badgeClass = BADGE_COLOR[color] || BADGE_COLOR.teal;
  const trendPositive = trend ? !String(trend).startsWith('-') : true;

  return (
    <div className={`relative p-4 sm:p-5 ${panelQuiet}`}>
      {badge && (
        <span className={`absolute top-3 right-3 sm:top-4 sm:right-4 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${badgeClass}`}>
          {badge}
        </span>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold leading-snug text-slate-500 dark:text-app-muted">{label}</span>
        {Icon && (
          <Icon className="h-4 w-4 shrink-0 text-slate-400 dark:text-app-muted" aria-hidden />
        )}
      </div>

      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 sm:mt-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-app-text-strong sm:text-3xl">{value}</span>
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

      {!badge && !showProgressBar && !showHintBelow && hint && (
        <p className={`mt-1.5 text-xs ${hintColor || 'text-slate-400'}`}>{hint}</p>
      )}

      {showProgressBar && (
        <div className="mt-3 h-1 w-full rounded-full bg-slate-100 dark:bg-app-border-subtle">
          <div
            className={`h-1 rounded-full ${progressBarColor} transition-all duration-500`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}

      {badge && hint && (
        <p className={`mt-2 text-xs ${hintColor || 'text-slate-400'}`}>{hint}</p>
      )}

      {!badge && showProgressBar && hint && (
        <p className={`mt-2 text-xs ${hintColor || 'text-slate-400'}`}>{hint}</p>
      )}

      {!badge && !showProgressBar && showHintBelow && hint && (
        <p className={`mt-2 text-xs ${hintColor || 'text-slate-400'}`}>{hint}</p>
      )}
    </div>
  );
}

export function MetricCardSkeleton() {
  return (
    <div className={`relative p-5 ${panelQuiet}`}>
      <div className="app-skeleton h-3 w-24" />
      <div className="app-skeleton mt-3 h-8 w-20" />
      <div className="app-skeleton mt-2 h-3 w-32" />
    </div>
  );
}
