import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, RefreshCw } from 'lucide-react';
import { parseApiResponse } from '../../utils/api';
import { getAdminGymSmsLog } from '../../services/adminGymSmsService';
import { DEFAULT_PAGE_SIZE } from '../../utils/pagination';
import PaginationControls from '../../components/PaginationControls';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import { formatDisplayDateTime } from '../../utils/date';
import { formatAdminSmsMessageType, ADMIN_SMS_TYPE_FILTER_OPTIONS } from '../../utils/smsLogLabels';
import { useTranslation } from 'react-i18next';
import { cardSurface, tableRowHover, selectSurface, headingText } from '../../utils/surfaceClasses';
import Button from '../../components/ui/Button';
import ErrorRetryBanner from '../../components/ErrorRetryBanner';
import { AdminListSkeleton, AdminTableRowsSkeleton } from '../../components/LoadingSkeletons';

const PAGE_SIZE = DEFAULT_PAGE_SIZE;
const COL_COUNT = 6;

const CHIP_ACTIVE =
  'inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 dark:bg-teal-600/15 dark:text-teal-300';
const CHIP_MUTED =
  'inline-flex rounded-full bg-app-surface px-2.5 py-1 text-xs font-medium text-app-muted';

export default function AdminGymMessages({ gyms = [], onGymClick, onBootingChange }) {
  const { t } = useTranslation();
  const { apiFetch } = useAuth();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');
  const [gymFilter, setGymFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const typeFiltered = typeFilter !== 'all';
  const gymFiltered = gymFilter !== 'all';
  const hasActiveFilter = typeFiltered || gymFiltered;
  const chipClass = typeFiltered ? CHIP_MUTED : CHIP_ACTIVE;

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAdminGymSmsLog(apiFetch, {
        page,
        limit: PAGE_SIZE,
        type: typeFilter,
        gym_id: gymFilter,
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || t('pages.adminGymMessages.loadError'));
      setItems(data.items || []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (err) {
      setError(err.message);
      setItems([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, page, typeFilter, gymFilter, t]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, gymFilter]);

  useEffect(() => {
    onBootingChange?.(loading && items.length === 0);
  }, [loading, items.length, onBootingChange]);

  const handleGymClick = (e, gymId) => {
    e.stopPropagation();
    if (gymId && onGymClick) onGymClick(gymId);
  };

  const renderGymCell = (row) => {
    if (!row.gym_name) {
      return <span className="text-app-muted">—</span>;
    }
    if (!row.gym_id) {
      return <span className="font-medium text-app-text-strong">{row.gym_name}</span>;
    }
    return (
      <button
        type="button"
        onClick={(e) => handleGymClick(e, row.gym_id)}
        className="font-medium text-teal-700 hover:underline dark:text-teal-300"
      >
        {row.gym_name}
      </button>
    );
  };

  const typeFilterMeta = useMemo(
    () => ADMIN_SMS_TYPE_FILTER_OPTIONS.find((opt) => opt.value === typeFilter) || ADMIN_SMS_TYPE_FILTER_OPTIONS[0],
    [typeFilter],
  );
  const typeFilterLabel = t(typeFilterMeta.labelKey);
  const gymFilterLabel = useMemo(() => {
    if (!gymFiltered) return null;
    const gym = gyms.find((g) => String(g.id) === String(gymFilter));
    return gym?.name || t('table.gym');
  }, [gymFiltered, gymFilter, gyms, t]);
  const filterLabel = [gymFilterLabel, typeFilterLabel].filter(Boolean).join(' · ');
  const statusLine = total > 0
    ? t('pages.adminGymMessages.statusLine', { count: total, filter: filterLabel })
    : t('pages.adminGymMessages.statusLineEmpty');

  const emptyTitle = hasActiveFilter
    ? t('pages.adminGymMessages.emptyFilteredTitle')
    : t('pages.adminGymMessages.emptyTitle');
  const emptyBody = hasActiveFilter
    ? t('pages.adminGymMessages.emptyFilteredBody')
    : t('pages.adminGymMessages.emptyBody');

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={t('pages.adminGymMessages.title')}
        subtitle={statusLine}
        actions={
          <Button variant="secondary" onClick={() => void loadMessages()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
        }
      />

      {error ? <ErrorRetryBanner message={error} onRetry={() => void loadMessages()} /> : null}

      <div className={`overflow-hidden ${cardSurface}`}>
        <div className="flex flex-col gap-3 border-b border-app-border-subtle p-3 sm:px-4">
          <div className="min-w-0">
            <h2 className={`text-sm font-semibold tracking-tight sm:text-base ${headingText}`}>
              {t('pages.adminGymMessages.messageHistory')}
            </h2>
            <p className="mt-0.5 text-xs text-app-muted">{t('pages.adminGymMessages.subtitle')}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
            <label className="sr-only" htmlFor="admin-sms-gym-filter">
              {t('table.gym')}
            </label>
            <select
              id="admin-sms-gym-filter"
              value={gymFilter}
              onChange={(e) => setGymFilter(e.target.value)}
              className={`ui-select ${selectSurface} min-w-[11rem]`}
            >
              <option value="all">{t('filters.allGyms')}</option>
              {gyms.map((gym) => (
                <option key={gym.id} value={String(gym.id)}>
                  {gym.name}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="admin-sms-type-filter">
              {t('smsLog.filterLabel')}
            </label>
            <select
              id="admin-sms-type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={`ui-select ${selectSurface} min-w-[11rem]`}
            >
              {ADMIN_SMS_TYPE_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="lg:hidden space-y-3 p-3">
          {loading && items.length === 0 ? (
            <AdminListSkeleton rows={5} />
          ) : items.length > 0 ? (
            items.map((row) => (
              <div key={row.id} className={`flex gap-3 p-4 ${cardSurface}`}>
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-600/15 dark:text-teal-300">
                  <MessageSquare className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-app-text-strong">
                    {renderGymCell(row)}
                  </div>
                  <p className="mt-0.5 text-sm text-app-text">
                    {row.owner_name || '—'}
                  </p>
                  <p className="mt-1">
                    <span className={chipClass}>
                      {formatAdminSmsMessageType(t, row.message_type)}
                    </span>
                  </p>
                  {row.otp_code && (
                    <p className="mt-1 font-mono text-sm font-semibold text-teal-700 dark:text-teal-300">
                      {t('smsLog.code')}: {row.otp_code}
                    </p>
                  )}
                  <p className="mt-1.5 text-xs text-app-muted">
                    {row.recipient_phone || row.gym_phone || '—'} · {formatDisplayDateTime(row.sent_at)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <EmptyState icon={MessageSquare} compact title={emptyTitle} body={emptyBody} />
          )}
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="admin-data-table min-w-[720px]">
            <thead>
              <tr>
                <th>{t('table.gym')}</th>
                <th>{t('table.owner')}</th>
                <th>{t('table.phone')}</th>
                <th>{t('smsLog.messageType')}</th>
                <th>{t('smsLog.code')}</th>
                <th>{t('smsLog.sentAt')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <AdminTableRowsSkeleton rows={5} cols={COL_COUNT} />
              ) : items.length > 0 ? (
                items.map((row) => (
                  <tr key={row.id} className={tableRowHover}>
                    <td>{renderGymCell(row)}</td>
                    <td className="text-app-text">{row.owner_name || '—'}</td>
                    <td className="text-app-muted">{row.recipient_phone || row.gym_phone || '—'}</td>
                    <td>
                      <span className={chipClass}>
                        {formatAdminSmsMessageType(t, row.message_type)}
                      </span>
                    </td>
                    <td className="font-mono text-sm font-semibold text-teal-700 dark:text-teal-300">
                      {row.otp_code || '—'}
                    </td>
                    <td className="whitespace-nowrap text-app-muted">
                      {formatDisplayDateTime(row.sent_at)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={COL_COUNT} className="p-0">
                    <EmptyState icon={MessageSquare} compact title={emptyTitle} body={emptyBody} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 ? (
          <div className="border-t border-app-border-subtle px-4 py-3">
            <PaginationControls
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              total={total}
              limit={PAGE_SIZE}
              disabled={loading}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
