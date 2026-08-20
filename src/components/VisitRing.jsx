import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Weekly visit progress ring — e.g. 2/5 when gym allows 5 days/week.
 * Unlimited: shows count with open ring (no cap).
 */
export default function VisitRing({
  visits = 0,
  limit = null,
  size = 88,
  stroke = 7,
  className = '',
}) {
  const { t } = useTranslation();
  const capped = limit != null && limit > 0;
  const safeVisits = Math.max(0, Number(visits) || 0);
  const progress = capped
    ? Math.min(1, safeVisits / limit)
    : Math.min(1, safeVisits > 0 ? 0.12 + Math.min(safeVisits, 7) * 0.08 : 0);
  const atLimit = capped && safeVisits >= limit;
  const nearLimit = capped && !atLimit && safeVisits === limit - 1 && limit > 1;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - progress);

  const track = 'var(--color-app-border-subtle)';
  const fill = atLimit
    ? 'var(--color-status-expired)'
    : nearLimit
      ? 'var(--color-status-due-soon)'
      : 'var(--color-brand)';
  const countClass = atLimit
    ? 'text-[color:var(--color-status-expired)]'
    : nearLimit
      ? 'text-[color:var(--color-status-due-soon)]'
      : 'text-app-text-strong';

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={
        capped
          ? t('pages.checkIn.ringProgress', { count: safeVisits, limit })
          : t('pages.checkIn.ringUnlimited', { count: safeVisits })
      }
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={track}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={fill}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset,stroke] duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
        {capped ? (
          <>
            <span className={`text-lg font-semibold tracking-tight tabular-nums ${countClass}`}>
              {safeVisits}
              <span className="font-medium text-app-muted">/{limit}</span>
            </span>
            <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-app-muted">
              {t('pages.checkIn.ringUnit')}
            </span>
          </>
        ) : (
          <>
            <span className="text-lg font-semibold tracking-tight text-app-text-strong tabular-nums">
              {safeVisits}
            </span>
            <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-app-muted">
              {t('pages.checkIn.ringUnit')}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
