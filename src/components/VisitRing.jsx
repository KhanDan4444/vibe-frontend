import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';

function startOfWeekLocal(date, weekStartsOn = 'monday') {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 Sun … 6 Sat
  const startDow = weekStartsOn === 'sunday' ? 0 : 1;
  const diff = (day - startDow + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

/** True when this gym week contains the last calendar day of the month. */
function isLastWeekOfMonth(date = new Date(), weekStartsOn = 'monday') {
  const weekStart = startOfWeekLocal(date, weekStartsOn);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  lastDay.setHours(0, 0, 0, 0);
  return lastDay >= weekStart && lastDay < weekEnd;
}

/**
 * Weekly visit progress ring — e.g. 2/5 when gym allows 5 days/week.
 * Amber = last visit left (normal weeks).
 * Red = at/over weekly limit only in the last week of the month.
 */
export default function VisitRing({
  visits = 0,
  limit = null,
  size = 88,
  stroke = 7,
  weekStartsOn = 'monday',
  celebrate = false,
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
  const empty = capped && safeVisits === 0;
  const lastWeekOfMonth = isLastWeekOfMonth(new Date(), weekStartsOn);
  const warnAmber = nearLimit || (atLimit && !lastWeekOfMonth);
  const warnRed = atLimit && lastWeekOfMonth;
  const emptyStroke = Math.max(stroke + 1, 8);
  const drawStroke = empty ? emptyStroke : stroke;
  const r = (size - drawStroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - progress);
  const discSize = Math.max(size - stroke * 2 - 10, size * 0.55);

  const track = empty
    ? 'color-mix(in srgb, var(--color-app-text) 32%, var(--color-app-border))'
    : 'color-mix(in srgb, var(--color-app-text) 8%, var(--color-app-border-subtle))';
  const fill = warnRed
    ? 'var(--color-status-expired)'
    : warnAmber
      ? 'var(--color-status-due-soon)'
      : 'var(--color-brand)';
  const countClass = warnRed
    ? 'text-[color:var(--color-status-expired)]'
    : warnAmber
      ? 'text-[color:var(--color-status-due-soon)]'
      : empty
        ? 'text-app-text'
        : 'text-app-text-strong';
  const discClass = warnRed
    ? 'bg-[color:var(--color-status-expired)]/10'
    : warnAmber
      ? 'bg-[color:var(--color-status-due-soon)]/10'
      : empty
        ? 'bg-app-bg'
        : 'bg-app-bg dark:bg-[color:var(--color-brand-soft)]';
  const emptyDash = `${Math.round(emptyStroke * 1.2)} ${Math.round(emptyStroke * 0.65)}`;

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
      <div
        className={`pointer-events-none absolute rounded-full ${discClass}`}
        style={{ width: discSize, height: discSize }}
        aria-hidden
      />
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={track}
          strokeWidth={drawStroke}
          strokeDasharray={empty ? emptyDash : undefined}
          strokeLinecap={empty ? 'butt' : 'round'}
        />
        {!empty ? (
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
        ) : null}
      </svg>
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center text-center leading-none transition-opacity duration-200 ${
          celebrate ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {capped ? (
          <>
            <span
              className={`font-display text-lg font-semibold tracking-tight tabular-nums ${countClass}`}
            >
              {safeVisits}
              <span className="text-[0.9em] font-medium text-app-muted">/{limit}</span>
            </span>
            <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em] text-app-muted">
              {t('pages.checkIn.ringUnit')}
            </span>
          </>
        ) : (
          <>
            <span className="font-display text-lg font-semibold tracking-tight text-app-text-strong tabular-nums">
              {safeVisits}
            </span>
            <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em] text-app-muted">
              {t('pages.checkIn.ringUnit')}
            </span>
          </>
        )}
      </div>
      {celebrate ? (
        <div
          className="visit-ring-tick pointer-events-none absolute inset-0 flex items-center justify-center text-[color:var(--color-brand)]"
          aria-hidden
        >
          <Check className="h-7 w-7" strokeWidth={2.75} />
        </div>
      ) : null}
    </div>
  );
}
