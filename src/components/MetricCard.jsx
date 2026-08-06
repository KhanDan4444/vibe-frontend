// src/components/MetricCard.jsx
import React from 'react';
import Card from './ui/Card';
import { mutedText, headingText } from '../utils/surfaceClasses';

/**
 * Shared metric card for dashboards (AdminDashboard + OwnerDashboard).
 */

const PROGRESS_COLOR = {
  emerald: 'bg-[color:var(--color-status-active)]',
  teal: 'bg-brand',
  brand: 'bg-brand',
  indigo: 'bg-brand',
  rose: 'bg-[color:var(--color-status-expired)]',
  sky: 'bg-[color:var(--color-status-due-soon)]',
  violet: 'bg-[color:var(--color-status-unpaid)]',
  amber: 'bg-[color:var(--color-status-trialing)]',
  slate: 'bg-app-muted',
};

const BADGE_COLOR = {
  emerald:
    'bg-[color:var(--color-status-active)]/10 text-[color:var(--color-status-active)] border-[color:var(--color-status-active)]/20',
  teal: 'bg-brand/10 text-brand-text border-brand/20',
  brand: 'bg-brand/10 text-brand-text border-brand/20',
  indigo: 'bg-brand/10 text-brand-text border-brand/20',
  rose:
    'bg-[color:var(--color-status-expired)]/10 text-[color:var(--color-status-expired)] border-[color:var(--color-status-expired)]/20',
  sky:
    'bg-[color:var(--color-status-due-soon)]/10 text-[color:var(--color-status-due-soon)] border-[color:var(--color-status-due-soon)]/20',
  violet:
    'bg-[color:var(--color-status-unpaid)]/10 text-[color:var(--color-status-unpaid)] border-[color:var(--color-status-unpaid)]/20',
  amber:
    'bg-[color:var(--color-status-trialing)]/10 text-[color:var(--color-status-trialing)] border-[color:var(--color-status-trialing)]/20',
  slate: 'bg-app-surface text-app-muted border-app-border-subtle',
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
    <Card quiet className="app-card-lift relative p-4 sm:p-5">
      {badge && (
        <span className={`absolute top-3 right-3 sm:top-4 sm:right-4 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}>
          {badge}
        </span>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-medium leading-snug ${mutedText}`}>{label}</span>
        {Icon && !badge && (
          <Icon className={`h-4 w-4 shrink-0 ${mutedText}`} aria-hidden />
        )}
      </div>

      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 sm:mt-2">
        <span className={`text-2xl font-semibold tracking-tight ${headingText} sm:text-3xl`}>{value}</span>
        {subValue && (
          <span className={`text-lg font-medium ${mutedText}`}>{subValue}</span>
        )}
        {trend && (
          <span
            className={`text-xs font-semibold ${
              trendPositive
                ? 'text-[color:var(--color-status-active)]'
                : 'text-[color:var(--color-status-expired)]'
            }`}
          >
            {trend}
          </span>
        )}
      </div>

      {trend && trendCaption && (
        <p className={`mt-1 text-xs ${mutedText}`}>{trendCaption}</p>
      )}

      {!badge && !showProgressBar && !showHintBelow && hint && (
        <p className={`mt-1.5 text-xs ${hintColor || mutedText}`}>{hint}</p>
      )}

      {showProgressBar && (
        <div className="mt-3 h-1 w-full rounded-full bg-app-border-subtle">
          <div
            className={`h-1 rounded-full ${progressBarColor} transition-all duration-500`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}

      {badge && hint && (
        <p className={`mt-2 text-xs ${hintColor || mutedText}`}>{hint}</p>
      )}

      {!badge && showProgressBar && hint && (
        <p className={`mt-2 text-xs ${hintColor || mutedText}`}>{hint}</p>
      )}

      {!badge && !showProgressBar && showHintBelow && hint && (
        <p className={`mt-2 text-xs ${hintColor || mutedText}`}>{hint}</p>
      )}
    </Card>
  );
}

export function MetricCardSkeleton() {
  return (
    <Card quiet className="relative p-5">
      <div className="app-skeleton h-3 w-24" />
      <div className="app-skeleton mt-3 h-8 w-20" />
      <div className="app-skeleton mt-2 h-3 w-32" />
    </Card>
  );
}
