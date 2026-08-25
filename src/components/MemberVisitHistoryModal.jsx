import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ResponsiveModal from './ResponsiveModal';
import EmptyState from './EmptyState';
import { modalBody } from '../utils/modalLayout';
import { modalTitle, mutedText } from '../utils/surfaceClasses';
import { listCheckIns } from '../services/checkInService';
import { parseApiResponse } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { attendanceDayRelative, formatAttendanceDayLabel } from '../utils/date';

const HISTORY_LIMIT = 50;

function formatVisitLine(checkedInAt, language, t) {
  const rel = attendanceDayRelative(checkedInAt);
  const day =
    rel === 'today'
      ? t('pages.checkIn.dayToday')
      : rel === 'yesterday'
        ? t('pages.checkIn.dayYesterday')
        : formatAttendanceDayLabel(checkedInAt, language);
  const time = new Date(checkedInAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${day} · ${time}`;
}

/**
 * Full visit history for one member — flat one-line rows.
 */
export default function MemberVisitHistoryModal({
  open,
  onClose,
  memberId,
  memberName,
}) {
  const { t, i18n } = useTranslation();
  const { apiFetch } = useAuth();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!open || !memberId) {
      setRows([]);
      setTotal(0);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await listCheckIns(apiFetch, {
          member_id: memberId,
          limit: HISTORY_LIMIT,
        });
        const data = await parseApiResponse(res);
        if (!cancelled && res.ok) {
          setRows(data.checkIns || []);
          setTotal(data.total ?? (data.checkIns || []).length);
        }
      } catch {
        if (!cancelled) {
          setRows([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, memberId, apiFetch]);

  return (
    <ResponsiveModal
      open={open}
      onClose={onClose}
      size="md"
      zIndexClass="z-[90]"
      labelledBy="member-visit-history-title"
    >
      <div className={modalBody}>
        <div className="min-w-0">
          <h3 id="member-visit-history-title" className={modalTitle}>
            {t('pages.checkIn.memberVisitHistoryTitle')}
          </h3>
          {memberName ? (
            <p className={`mt-1 truncate text-sm ${mutedText}`}>{memberName}</p>
          ) : null}
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="space-y-2 py-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="app-skeleton h-11 rounded-xl" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              compact
              tone="muted"
              title={t('pages.checkIn.recentVisitsEmpty')}
            />
          ) : (
            <ul className="divide-y divide-app-border-subtle overflow-hidden rounded-2xl border border-app-border-subtle">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="bg-app-card px-3.5 py-3 font-display text-sm font-semibold tracking-tight text-app-text-strong"
                >
                  {formatVisitLine(row.checked_in_at, i18n.language, t)}
                </li>
              ))}
            </ul>
          )}
          {!loading && total > rows.length ? (
            <p className={`mt-3 text-center text-xs ${mutedText}`}>
              {t('pages.checkIn.showingOf', { shown: rows.length, total })}
            </p>
          ) : null}
        </div>
      </div>
    </ResponsiveModal>
  );
}
