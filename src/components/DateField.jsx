import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDisplayDate, formatLocalDate, parseLocalDate, todayString, clampIsoDate, isDateRangeValid } from '../utils/date';

const DEFAULT_CLASS =
  'block w-full rounded-lg border border-app-input-border bg-app-input px-3 py-2 text-sm text-app-text-strong placeholder:text-app-muted focus:outline-none focus:ring-0 focus:border-app-input-border';

const OPEN_CLASS = '!border-teal-600 ring-2 ring-teal-600/20';
const FOCUS_CLASS = 'focus-visible:!border-teal-600 focus-visible:ring-2 focus-visible:ring-teal-600/20';

const POPOVER_MIN_WIDTH = 288;
const POPOVER_EST_HEIGHT = 320;

function compareIso(a, b) {
  const da = parseLocalDate(a);
  const db = parseLocalDate(b);
  if (!da || !db) return 0;
  return da.getTime() - db.getTime();
}

function buildMonthGrid(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const leading = first.getDay();
  const cells = [];

  for (let i = 0; i < leading; i += 1) cells.push(null);
  for (let day = 1; day <= lastDay; day += 1) {
    cells.push(formatLocalDate(new Date(year, month, day)));
  }

  return cells;
}

function DatePickerPopover({
  open,
  anchorRef,
  onClose,
  value,
  min,
  max,
  onSelect,
  locale,
}) {
  const { t } = useTranslation();
  const [position, setPosition] = useState({ top: 0, left: 0, width: POPOVER_MIN_WIDTH });
  const [viewDate, setViewDate] = useState(() => parseLocalDate(value || todayString()) || new Date());

  useEffect(() => {
    if (!open) return;
    setViewDate(parseLocalDate(value || todayString()) || new Date());
  }, [open, value]);

  useEffect(() => {
    if (!open || !anchorRef.current) return undefined;

    const updatePosition = () => {
      const rect = anchorRef.current.getBoundingClientRect();
      const width = Math.max(rect.width, POPOVER_MIN_WIDTH);
      let left = rect.left;
      if (left + width > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - width - 8);
      }

      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < POPOVER_EST_HEIGHT && rect.top > POPOVER_EST_HEIGHT;
      const top = openUp ? rect.top - POPOVER_EST_HEIGHT - 6 : rect.bottom + 6;

      setPosition({ top, left, width });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, anchorRef]);

  const monthCells = useMemo(() => buildMonthGrid(viewDate), [viewDate]);

  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, i)));
  }, [locale]);

  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(viewDate);

  const isDisabled = (iso) => {
    if (min && compareIso(iso, min) < 0) return true;
    if (max && compareIso(iso, max) > 0) return true;
    return false;
  };

  const shiftMonth = (delta) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  if (!open) return null;

  return createPortal(
    <>
      <div className="date-picker-backdrop fixed inset-0 z-[200]" onMouseDown={onClose} aria-hidden />
      <div
        className="date-picker-popover fixed z-[201]"
        style={{ top: position.top, left: position.left, width: position.width }}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            className="date-picker-nav"
            onClick={() => shiftMonth(-1)}
            aria-label={t('aria.previousMonth')}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-sm font-semibold text-app-text-strong">{monthLabel}</p>
          <button
            type="button"
            className="date-picker-nav"
            onClick={() => shiftMonth(1)}
            aria-label={t('aria.nextMonth')}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1">
          {weekdayLabels.map((label) => (
            <div key={label} className="date-picker-weekday">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {monthCells.map((iso, index) => {
            if (!iso) {
              return <div key={`empty-${index}`} className="h-9" aria-hidden />;
            }

            const selected = iso === value;
            const today = iso === todayString();
            const disabled = isDisabled(iso);

            return (
              <button
                key={iso}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(iso)}
                className={`date-picker-day${selected ? 'date-picker-day--selected' : ''} ${
 today && !selected ? 'date-picker-day--today' : ''
 } ${disabled ? 'date-picker-day--disabled' : ''}`}
              >
                {parseLocalDate(iso)?.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    </>,
    document.body,
  );
}

/**
 * Date picker that displays dd-mm-yy (same as mobile) while storing YYYY-MM-DD.
 * Uses a custom calendar popover so it works in modals and Firefox on Linux.
 */
export function DateField({
  value = '',
  onChange,
  min,
  max,
  required = false,
  disabled = false,
  id,
  name,
  className = DEFAULT_CLASS,
  rangeInvalidMessage,
}) {
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const rangeValid = isDateRangeValid(min, max);
  const pickerDisabled = disabled || !rangeValid;
  const clampedValue = useMemo(() => {
    if (!value) return '';
    if (!rangeValid) return value;
    return clampIsoDate(value, min, max);
  }, [value, min, max, rangeValid]);
  const display = clampedValue ? formatDisplayDate(clampedValue) : t('common.pickDate');

  useEffect(() => {
    if (!value || !rangeValid || !onChange) return;
    const next = clampIsoDate(value, min, max);
    if (next !== value) onChange(next);
  }, [value, min, max, rangeValid, onChange]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const handleSelect = (iso) => {
    if (!rangeValid) return;
    onChange(clampIsoDate(iso, min, max));
    setOpen(false);
  };

  return (
    <div ref={anchorRef} className="date-field relative w-full">
      <button
        type="button"
        id={id}
        disabled={pickerDisabled}
        aria-required={required || undefined}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          if (!pickerDisabled) setOpen((current) => !current);
        }}
        className={[
          'flex w-full min-h-[42px] items-center justify-between gap-2 text-left',
          FOCUS_CLASS,
          pickerDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          className,
          // Open owns teal — suppress admin-field :focus flicker while the popover is up.
          'focus:!border-app-input-border focus:!ring-0',
          open && rangeValid ? OPEN_CLASS : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span className={!clampedValue ? 'text-app-muted' : ''}>{display}</span>
        <Calendar className="h-4 w-4 shrink-0 text-app-muted" aria-hidden />
      </button>

      {!rangeValid ? (
        <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-300">
          {rangeInvalidMessage || t('validation.dateRangeInvalid')}
        </p>
      ) : null}

      {name ? <input type="hidden" name={name} value={clampedValue} /> : null}

      <DatePickerPopover
        open={open && rangeValid}
        anchorRef={anchorRef}
        onClose={() => setOpen(false)}
        value={clampedValue}
        min={min}
        max={max}
        onSelect={handleSelect}
        locale={i18n.language}
      />
    </div>
  );
}
