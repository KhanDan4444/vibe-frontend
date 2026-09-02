// src/components/MetricCard.jsx
import React from 'react';
import Card from './ui/Card';
import { mutedText, headingText, dimText } from '../utils/surfaceClasses';

/**
 * Shared metric card for dashboards (AdminDashboard + OwnerDashboard).
 * variant: default | emphasis (hero) | dense (quiet rail)
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
  cream: 'bg-[color:var(--color-status-new)]',
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
  cream:
    'bg-[color:var(--color-status-new)]/15 text-[color:var(--color-status-new)] border-[color:var(--color-status-new)]/25',
  slate: 'bg-app-surface text-app-muted border-app-border-subtle',
};

/** Icon tint matches metric semantics (same tokens as member filter chips). */
const ICON_COLOR = {
  emerald: 'text-[color:var(--color-status-active)]',
  sky: 'text-[color:var(--color-status-due-soon)]',
  rose: 'text-[color:var(--color-status-expired)]',
  teal: 'text-brand',
  brand: 'text-brand',
  indigo: 'text-brand',
  violet: 'text-[color:var(--color-status-unpaid)]',
  amber: 'text-[color:var(--color-status-trialing)]',
  cream: 'text-[color:var(--color-status-new)]',
  slate: 'text-app-muted',
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
  trendBelowValue = false,
  variant = 'default',
  valueSize = 'default',
  className = '',
  onClick,
}) {
  const progressBarColor = PROGRESS_COLOR[color] || PROGRESS_COLOR.teal;
  const badgeClass = BADGE_COLOR[color] || BADGE_COLOR.teal;
  const iconClass = ICON_COLOR[color] || ICON_COLOR.slate;
  const trendPositive = trend ? !String(trend).startsWith('-') : true;
  const isHero = variant === 'emphasis';
  const isDense = variant === 'dense';
  const valueSizeClass =
    isHero
      ? 'text-4xl sm:text-5xl'
      : isDense && valueSize === 'lg'
        ? 'text-2xl sm:text-3xl'
        : isDense
          ? 'text-xl sm:text-2xl'
          : 'text-2xl sm:text-3xl';
  const showIcon = Boolean(Icon) && !badge;

  return (
    <Card
      quiet={!isHero}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      className={[
        isHero ? 'app-metric-hero p-5 sm:p-6' : isDense ? 'app-metric-dense p-3.5 sm:p-4' : 'app-card-lift p-4 sm:p-5',
        onClick ? 'cursor-pointer' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <span
          className={[
            'min-w-0 flex-1 font-medium leading-snug break-words text-app-text',
            isHero ? 'text-sm' : 'text-xs',
          ].join(' ')}
        >
          {label}
        </span>
        {(badge || showIcon) && (
          <div className="flex shrink-0 flex-col items-end gap-1">
            {badge ? (
              <span
                className={`inline-flex max-w-[9rem] items-center justify-end rounded-full border px-2 py-0.5 text-center text-[10px] font-semibold leading-tight ${badgeClass}`}
              >
                {badge}
              </span>
            ) : null}
            {showIcon ? (
              <Icon
                className={`shrink-0 ${isDense ? 'h-3.5 w-3.5' : 'h-4 w-4'} ${iconClass}`}
                aria-hidden
              />
            ) : null}
          </div>
        )}
      </div>

      <div className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 ${isHero ? 'mt-3' : 'mt-1.5 sm:mt-2'}`}>
        <span
          className={[
            'font-display font-bold tracking-tight',
            headingText,
            valueSizeClass,
            trendBelowValue ? 'w-full' : '',
          ].join(' ')}
        >
          {value}
        </span>
        {subValue && (
          <span
            className={[
              'font-display font-medium tracking-tight',
              dimText,
              isHero ? 'text-xl sm:text-2xl' : isDense ? 'text-base' : 'text-lg',
            ].join(' ')}
          >
            {subValue}
          </span>
        )}
        {trend && !trendBelowValue && (
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

      {trend && trendBelowValue && trendCaption && (
        <p className={`mt-1 text-xs ${dimText}`}>
          <span
            className={`font-semibold ${
              trendPositive
                ? 'text-[color:var(--color-status-active)]'
                : 'text-[color:var(--color-status-expired)]'
            }`}
          >
            {trend}
          </span>
          <span> {trendCaption}</span>
        </p>
      )}

      {trend && !trendBelowValue && trendCaption && (
        <p className={`mt-1 text-xs ${dimText}`}>{trendCaption}</p>
      )}

      {!badge && !showProgressBar && !showHintBelow && hint && (
        <p className={`mt-1 ${hintColor || `text-xs ${dimText}`}`}>{hint}</p>
      )}

      {showProgressBar && (
        <div className={`w-full rounded-full bg-app-border-subtle ${isHero ? 'mt-4 h-1.5' : 'mt-3 h-1'}`}>
          <div
            className={`${isHero ? 'h-1.5' : 'h-1'} rounded-full ${progressBarColor} transition-all duration-500`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}

      {badge && hint && (
        <p className={`mt-2 text-xs ${hintColor || dimText}`}>{hint}</p>
      )}

      {!badge && showProgressBar && hint && (
        <p className={`mt-2 text-xs ${hintColor || dimText}`}>{hint}</p>
      )}

      {!badge && !showProgressBar && showHintBelow && hint && (
        <p className={`mt-2 text-xs ${hintColor || dimText}`}>{hint}</p>
      )}
    </Card>
  );
}

export function MetricCardSkeleton({ variant = 'default', valueSize = 'default', className = '' }) {
  const isHero = variant === 'emphasis';
  const isDense = variant === 'dense';
  const valueSkeletonClass =
    isHero
      ? 'h-10 w-14 sm:h-12 sm:w-16'
      : isDense && valueSize === 'lg'
        ? 'h-8 w-11 sm:h-9 sm:w-12'
        : 'h-7 w-10 sm:h-8';
  const cardClass = isHero
    ? 'app-metric-hero p-5 sm:p-6'
    : isDense
      ? 'app-metric-dense p-3.5 sm:p-4'
      : 'app-card-lift p-4 sm:p-5';

  return (
    <Card quiet={!isHero} className={`relative ${cardClass} ${className}`}>
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className={`app-skeleton ${isHero ? 'h-3.5 w-28' : 'h-3 w-[4.5rem]'}`} />
        <div className={`app-skeleton shrink-0 rounded-sm ${isDense ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
      </div>
      <div className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 ${isHero ? 'mt-3' : 'mt-1.5 sm:mt-2'}`}>
        <div className={`app-skeleton ${valueSkeletonClass}`} />
        {isHero ? <div className="app-skeleton h-6 w-10 sm:h-7 sm:w-12" /> : null}
      </div>
      {isHero ? (
        <div className="app-skeleton mt-4 h-1.5 w-full rounded-full" />
      ) : null}
    </Card>
  );
}
