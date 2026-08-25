import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import ResponsiveModal from './ResponsiveModal';
import { ToolbarChip, ToolbarChipBar } from './ToolbarChip';
import EmptyState from './EmptyState';
import MemberPhoto from './MemberPhoto';
import { AttendanceDayListSkeleton, CheckInTodaySkeleton } from './LoadingSkeletons';
import { modalBody } from '../utils/modalLayout';
import { modalTitle, mutedText } from '../utils/surfaceClasses';
import { listCheckIns } from '../services/checkInService';
import { parseApiResponse } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  attendanceDayRelative,
  attendanceWeekRange,
  formatAttendanceDayLabel,
  formatDisplayDate,
  groupCheckInsByDay,
} from '../utils/date';

function formatTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function dayLabel(day, language, t) {
  const rel = attendanceDayRelative(day);
  if (rel === 'today') return t('pages.checkIn.dayToday');
  if (rel === 'yesterday') return t('pages.checkIn.dayYesterday');
  return formatAttendanceDayLabel(day, language);
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
  const [weekScope, setWeekScope] = useState('this');
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayQuery, setDayQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkIns, setCheckIns] = useState([]);

  const weekRange = useMemo(
    () => attendanceWeekRange(weekScope, weekStartsOn),
    [weekScope, weekStartsOn]
  );

  useEffect(() => {
    if (!open) {
      setSelectedDay(null);
      setDayQuery('');
      setWeekScope('this');
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
  }, [open, weekRange.from, weekRange.to, apiFetch, getBranchQueryParams, weekScope]);

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

  const weekSubtitle = t('pages.checkIn.weekRangeSubtitle', {
    from: formatDisplayDate(weekRange.from),
    to: formatDisplayDate(weekRange.to),
  });

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
      size="lg"
      zIndexClass="z-[88]"
      labelledBy="attendance-history-title"
    >
      <div className={modalBody}>
        <div className="min-w-0">
          <h3
            key={selectedDay || 'history'}
            id="attendance-history-title"
            className={`${modalTitle} motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200`}
          >
            {title}
          </h3>
          {!selectedDay ? (
            <p className={`mt-1 text-sm ${mutedText}`}>{t('pages.checkIn.historyBody')}</p>
          ) : (
            <p className={`mt-1 text-sm ${mutedText}`}>
              {t('pages.checkIn.dayVisitCount', { count: selectedRows.length })}
              {' · '}
              {weekScope === 'this'
                ? t('pages.checkIn.weekThis')
                : t('pages.checkIn.weekLast')}
            </p>
          )}
        </div>

        {selectedDay ? (
          <button
            type="button"
            onClick={backToDays}
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--color-brand-text)] transition-opacity hover:opacity-80"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('pages.checkIn.historyTitle')}
          </button>
        ) : (
          <div className="mt-4 space-y-2.5">
            <p className="text-xs font-medium text-app-muted">{weekSubtitle}</p>
            <ToolbarChipBar className="mb-0">
              <ToolbarChip
                label={t('pages.checkIn.weekThis')}
                active={weekScope === 'this'}
                onClick={() => setWeekScope('this')}
              />
              <ToolbarChip
                label={t('pages.checkIn.weekLast')}
                active={weekScope === 'last'}
                onClick={() => setWeekScope('last')}
              />
            </ToolbarChipBar>
          </div>
        )}

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
              className="space-y-3 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-2 motion-safe:duration-200"
            >
              <label className="flex items-center gap-2 rounded-xl border border-app-border-subtle bg-app-bg/60 px-3 py-2.5 transition-colors focus-within:border-[color:var(--color-brand)]/35 focus-within:bg-app-bg">
                <Search className="h-4 w-4 shrink-0 text-app-muted" aria-hidden />
                <input
                  value={dayQuery}
                  onChange={(e) => setDayQuery(e.target.value)}
                  placeholder={t('pages.checkIn.historySearchDay')}
                  className="min-w-0 flex-1 bg-transparent text-sm text-app-text-strong outline-none placeholder:text-app-muted"
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
                      className="flex items-center gap-3 bg-app-card px-3.5 py-2.5 transition-colors hover:bg-app-bg/50"
                    >
                      <MemberPhoto
                        memberId={row.member_id}
                        apiFetch={apiFetch}
                        name={row.member_name || '?'}
                        hasPhoto={Boolean(row.member_photo_url)}
                        expandable={false}
                        className="h-9 w-9 rounded-full object-cover"
                        fallbackClassName="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-border text-xs font-bold text-app-text"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold tracking-tight text-app-text-strong">
                          {row.member_name || '—'}
                        </p>
                        {showBranch && row.branch_name ? (
                          <p className="truncate text-[11px] text-app-muted">{row.branch_name}</p>
                        ) : null}
                      </div>
                      <time className="font-display text-sm font-bold tabular-nums tracking-tight text-app-text-strong">
                        {formatTime(row.checked_in_at)}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : byDay.length === 0 ? (
            <div
              key={`empty-${weekScope}`}
              className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
            >
              <EmptyState
                compact
                tone="muted"
                title={
                  weekScope === 'last'
                    ? t('pages.checkIn.historyEmptyLastTitle')
                    : t('pages.checkIn.historyEmptyTitle')
                }
                body={
                  weekScope === 'last'
                    ? t('pages.checkIn.historyEmptyLast')
                    : t('pages.checkIn.historyEmpty')
                }
              />
            </div>
          ) : (
            <ul
              key={`days-${weekScope}`}
              className="space-y-2 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
            >
              {byDay.map(([day, rows]) => (
                <li key={day}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDay(day);
                      setDayQuery('');
                    }}
                    className="group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-app-border-subtle bg-app-card px-3.5 py-3.5 text-left transition-all hover:border-[color:var(--color-brand)]/25 hover:bg-[color:var(--color-brand-soft)]/35"
                  >
                    <span
                      className="absolute bottom-2.5 left-0 top-2.5 w-[3px] rounded-full bg-[color:var(--color-brand)]/55 opacity-70 transition-opacity group-hover:opacity-100"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1 pl-1.5">
                      <p className="font-display text-sm font-semibold tracking-tight text-app-text-strong">
                        {dayLabel(day, i18n.language, t)}
                      </p>
                      <p className="mt-0.5 text-xs text-app-muted">
                        {t('pages.checkIn.dayVisitCount', { count: rows.length })}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-app-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
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
