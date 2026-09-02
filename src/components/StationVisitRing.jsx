import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';

function startOfWeekLocal(date, weekStartsOn = 'monday') {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const startDow = weekStartsOn === 'sunday' ? 0 : 1;
  const diff = (day - startDow + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

function isLastWeekOfMonth(date = new Date(), weekStartsOn = 'monday') {
  const weekStart = startOfWeekLocal(date, weekStartsOn);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  lastDay.setHours(0, 0, 0, 0);
  return lastDay >= weekStart && lastDay < weekEnd;
}

/** Visit progress ring for the public station check-in kiosk (always dark). */
export default function StationVisitRing({
  visits = 0,
  limit = null,
  size = 96,
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
  const empty = safeVisits === 0;
  const lastWeekOfMonth = isLastWeekOfMonth(new Date(), weekStartsOn);
  const warnAmber = nearLimit || (atLimit && !lastWeekOfMonth);
  const warnRed = atLimit && lastWeekOfMonth;
  const drawStroke = empty ? Math.max(stroke + 1, 8) : stroke;
  const r = (size - drawStroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - progress);
  const discSize = Math.max(size - stroke * 2 - 10, size * 0.55);

  const track = empty ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.1)';
  const fill = warnRed ? '#f87171' : warnAmber ? '#fbbf24' : '#2dd4bf';
  const countClass = warnRed ? 'text-rose-300' : 'text-white';
  const emptyDash = `${Math.round(drawStroke * 1.2)} ${Math.round(drawStroke * 0.65)}`;

  const ariaLabel = capped
    ? t('publicStationCheckIn.visitsThisWeek', { count: safeVisits, limit })
    : t('pages.checkIn.ringUnlimited', { count: safeVisits });

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={ariaLabel}
    >
      <div
        className="pointer-events-none absolute rounded-full bg-white/[0.06]"
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
            className="transition-[stroke-dashoffset,stroke] duration-700 ease-out"
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
            <span className={`font-display text-2xl font-semibold tracking-tight tabular-nums ${countClass}`}>
              {safeVisits}
              <span className="text-[0.82em] font-medium text-white/45">/{limit}</span>
            </span>
            <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.1em] text-white/40">
              {t('pages.checkIn.ringUnit')}
            </span>
          </>
        ) : (
          <>
            <span className="font-display text-2xl font-semibold tracking-tight text-white tabular-nums">
              {safeVisits}
            </span>
            <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.1em] text-white/40">
              {t('pages.checkIn.ringUnit')}
            </span>
          </>
        )}
      </div>
      {celebrate ? (
        <div
          className={`visit-ring-tick pointer-events-none absolute inset-0 flex items-center justify-center ${
            warnAmber ? 'text-amber-300' : warnRed ? 'text-rose-300' : 'text-teal-300'
          }`}
          aria-hidden
        >
          <Check className="h-9 w-9" strokeWidth={2.5} />
        </div>
      ) : null}
    </div>
  );
}
