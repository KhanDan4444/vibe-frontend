import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import ResponsiveModal from './ResponsiveModal';
import EmptyState from './EmptyState';
import MemberPhoto from './MemberPhoto';
import { AttendanceDayListSkeleton, CheckInTodaySkeleton } from './LoadingSkeletons';
import { modalBody } from '../utils/modalLayout';
import { modalTitle, mutedText, placeholderDim } from '../utils/surfaceClasses';
import { listCheckIns } from '../services/checkInService';
import { parseApiResponse } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  attendanceDayRelative,
  ATTENDANCE_HISTORY_WEEK_COUNT,
  attendanceHistoryWeekLabel,
  attendanceWeekRangeByOffset,
  formatAttendanceDayLabel,
  formatAttendanceWeekRangeLabel,
  formatDisplayTime,
  groupCheckInsByDay,
} from '../utils/date';

function dayLabel(day, language, t) {
  const rel = attendanceDayRelative(day);
  if (rel === 'today') return t('pages.checkIn.dayToday');
  if (rel === 'yesterday') return t('pages.checkIn.dayYesterday');
  return formatAttendanceDayLabel(day, language);
}

function WeekScopeChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-8 shrink-0 items-center rounded-full border px-3 py-1 text-[13px] font-medium transition-colors ${
        active
          ? 'border-[color:var(--color-brand)] bg-[color:var(--color-brand-soft)] text-[color:var(--color-brand-text)]'
          : 'border-app-border-subtle bg-transparent text-app-muted hover:bg-app-surface hover:text-app-text'
      }`}
    >
      {label}
    </button>
  );
}

/**
 * History drill-down modal: week → days → members for that day.
 */
export default function AttendanceHistoryModal({
  open,
  onClose,
  weekStartsOn = 'monday',
  getBranchQueryParams,
  showBranch = false,
}) {
  const { t, i18n } = useTranslation();
  const { apiFetch } = useAuth();
  const [weeksBack, setWeeksBack] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayQuery, setDayQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkIns, setCheckIns] = useState([]);

  const weekRange = useMemo(
    () => attendanceWeekRangeByOffset(weeksBack, weekStartsOn),
    [weeksBack, weekStartsOn]
  );

  const weekOptions = useMemo(
    () =>
      Array.from({ length: ATTENDANCE_HISTORY_WEEK_COUNT }, (_, offset) => {
        const range = attendanceWeekRangeByOffset(offset, weekStartsOn);
        return {
          weeksBack: offset,
          range,
          label: attendanceHistoryWeekLabel(offset, weekStartsOn, i18n.language, {
            thisWeek: t('pages.checkIn.weekThis'),
            lastWeek: t('pages.checkIn.weekLast'),
          }),
        };
      }),
    [weekStartsOn, i18n.language, t]
  );

  const selectedWeekLabel = useMemo(
    () =>
      weekOptions.find((option) => option.weeksBack === weeksBack)?.label ??
      formatAttendanceWeekRangeLabel(weekRange.from, weekRange.to, i18n.language),
    [weekOptions, weeksBack, weekRange.from, weekRange.to, i18n.language]
  );

  useEffect(() => {
    if (!open) {
      setSelectedDay(null);
      setDayQuery('');
      setWeeksBack(0);
      setCheckIns([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = {
          from: weekRange.from,
          to: weekRange.to,
          limit: 200,
          ...(getBranchQueryParams?.() || {}),
        };
        const res = await listCheckIns(apiFetch, params);
        const data = await parseApiResponse(res);
        if (!cancelled && res.ok) {
          setCheckIns(data.checkIns || []);
        }
      } catch {
        if (!cancelled) setCheckIns([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, weekRange.from, weekRange.to, apiFetch, getBranchQueryParams, weeksBack]);

  const byDay = useMemo(() => groupCheckInsByDay(checkIns), [checkIns]);
  const selectedRows = useMemo(() => {
    if (!selectedDay) return [];
    return byDay.find(([d]) => d === selectedDay)?.[1] || [];
  }, [byDay, selectedDay]);

  const filteredRows = useMemo(() => {
    const q = dayQuery.trim().toLowerCase();
    if (!q) return selectedRows;
    return selectedRows.filter((row) => {
      const name = (row.member_name || '').toLowerCase();
      const phone = (row.member_phone || '').toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [selectedRows, dayQuery]);

  const title = selectedDay
    ? dayLabel(selectedDay, i18n.language, t)
    : t('pages.checkIn.historyTitle');

  const weekRangeLabel = formatAttendanceWeekRangeLabel(
    weekRange.from,
    weekRange.to,
    i18n.language
  );

  const backToDays = () => {
    setSelectedDay(null);
    setDayQuery('');
  };

  return (
    <ResponsiveModal
      open={open}
      onClose={() => {
        setSelectedDay(null);
        setDayQuery('');
        onClose?.();
      }}
      size="md"
      zIndexClass="z-[88]"
      labelledBy="attendance-history-title"
    >
      <div className={modalBody}>
        <div className="min-w-0">
          {selectedDay ? (
            <button
              type="button"
              onClick={backToDays}
              className="mb-2 inline-flex items-center gap-0.5 text-[13px] font-semibold text-[color:var(--color-brand-text)] transition-opacity hover:opacity-80"
            >
              <ChevronLeft className="h-4 w-4" />
              {t('pages.checkIn.historyTitle')}
            </button>
          ) : null}
          <h3
            key={selectedDay || 'history'}
            id="attendance-history-title"
            className={`${modalTitle} motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200`}
          >
            {title}
          </h3>
          {!selectedDay ? (
            <div className={`mt-1 space-y-0.5 text-sm ${mutedText}`}>
              <p>{t('pages.checkIn.historyBody')}</p>
              <p className="font-medium tabular-nums tracking-tight text-app-muted">
                {weekRangeLabel}
              </p>
            </div>
          ) : (
            <p className={`mt-1 text-sm ${mutedText}`}>
              {t('pages.checkIn.dayVisitCount', { count: selectedRows.length })}
              {' · '}
              {selectedWeekLabel}
            </p>
          )}
        </div>

        {!selectedDay ? (
          <div className="mt-3 -mx-1 overflow-x-auto px-1 pb-0.5">
            <div className="flex w-max min-w-full gap-2">
              {weekOptions.map((option) => (
                <WeekScopeChip
                  key={option.weeksBack}
                  label={option.label}
                  active={weeksBack === option.weeksBack}
                  onClick={() => setWeeksBack(option.weeksBack)}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-4">
          {loading ? (
            selectedDay ? (
              <CheckInTodaySkeleton rows={4} />
            ) : (
              <AttendanceDayListSkeleton rows={4} />
            )
          ) : selectedDay ? (
            <div
              key={`day-${selectedDay}`}
              className="space-y-2.5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-2 motion-safe:duration-200"
            >
              <label className="flex items-center gap-2 rounded-xl border border-app-border-subtle bg-app-bg/60 px-3 py-2 transition-colors focus-within:border-[color:var(--color-brand)]/35 focus-within:bg-app-bg">
                <Search className="h-4 w-4 shrink-0 text-app-muted" aria-hidden />
                <input
                  value={dayQuery}
                  onChange={(e) => setDayQuery(e.target.value)}
                  placeholder={t('pages.checkIn.historySearchDay')}
                  className={`min-w-0 flex-1 bg-transparent text-sm text-app-text-strong outline-none ${placeholderDim}`}
                />
              </label>
              {filteredRows.length === 0 ? (
                <EmptyState
                  compact
                  tone="muted"
                  title={t('pages.checkIn.historyDayEmptyTitle')}
                  body={
                    dayQuery.trim()
                      ? t('pages.checkIn.historyDayEmptySearch')
                      : t('pages.checkIn.historyDayEmpty')
                  }
                />
              ) : (
                <ul className="divide-y divide-app-border-subtle overflow-hidden rounded-2xl border border-app-border-subtle">
                  {filteredRows.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center gap-2.5 bg-app-card px-3 py-2 transition-colors hover:bg-app-bg/50"
                    >
                      <MemberPhoto
                        memberId={row.member_id}
                        apiFetch={apiFetch}
                        name={row.member_name || '?'}
                        hasPhoto={Boolean(row.member_photo_url)}
                        expandable={false}
                        className="h-8 w-8 rounded-full object-cover"
                        fallbackClassName="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-app-border text-[11px] font-bold text-app-text"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold tracking-tight text-app-text-strong">
                          {row.member_name || '—'}
                        </p>
                        {showBranch && row.branch_name ? (
                          <p className="truncate text-[11px] text-app-muted">{row.branch_name}</p>
                        ) : null}
                      </div>
                      <time className="shrink-0 text-[12px] font-medium tabular-nums text-app-muted">
                        {formatDisplayTime(row.checked_in_at, i18n.language)}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : byDay.length === 0 ? (
            <div
              key={`empty-${weeksBack}`}
              className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
            >
              <EmptyState
                compact
                tone="muted"
                title={
                  weeksBack === 0
                    ? t('pages.checkIn.historyEmptyTitle')
                    : weeksBack === 1
                      ? t('pages.checkIn.historyEmptyLastTitle')
                      : t('pages.checkIn.historyEmptyPastTitle')
                }
                body={
                  weeksBack === 0
                    ? t('pages.checkIn.historyEmpty')
                    : t('pages.checkIn.historyEmptyLast')
                }
              />
            </div>
          ) : (
            <ul
              key={`days-${weeksBack}`}
              className="space-y-1.5 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
            >
              {byDay.map(([day, rows]) => (
                <li key={day}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDay(day);
                      setDayQuery('');
                    }}
                    className="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border border-app-border-subtle bg-app-card px-3 py-2.5 text-left transition-all hover:border-[color:var(--color-brand)]/25 hover:bg-[color:var(--color-brand-soft)]/35"
                  >
                    <span
                      className="absolute bottom-2 left-0 top-2 w-0.5 rounded-full bg-[color:var(--color-brand)]/50 opacity-70 transition-opacity group-hover:opacity-100"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1 pl-1.5">
                      <p className="font-display text-[13px] font-semibold tracking-tight text-app-text-strong">
                        {dayLabel(day, i18n.language, t)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-app-muted">
                        {t('pages.checkIn.dayVisitCount', { count: rows.length })}
                      </p>
                    </div>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-app-muted transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </ResponsiveModal>
  );
}
