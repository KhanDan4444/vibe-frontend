import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGym } from '../../context/GymContext';
import { isGymOwner } from '../../utils/roles';
import { ScrollText, RefreshCw } from 'lucide-react';
import { parseApiResponse } from '../../utils/api';
import { getActivityLogs } from '../../services/activityService';
import { DEFAULT_PAGE_SIZE } from '../../utils/pagination';
import PaginationControls from '../../components/PaginationControls';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import { formatAuditAction, formatAuditDetails, formatActorRole } from '../../utils/activityLabels';
import { useTranslation } from 'react-i18next';
import { formatDisplayDate, formatDisplayDateTime } from '../../utils/date';
import { tableRowHover, selectSurface } from '../../utils/surfaceClasses';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ErrorRetryBanner from '../../components/ErrorRetryBanner';
import { AdminListSkeleton, AdminTableRowsSkeleton } from '../../components/LoadingSkeletons';

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

const ACTOR_FILTER_OPTIONS = [
  { value: 'all', labelKey: 'filters.everyone' },
  { value: 'staff', labelKey: 'filters.staffOnly' },
  { value: 'owner', labelKey: 'filters.ownerOnly' },
];

function formatTimestamp(value) {
  return formatDisplayDateTime(value);
}

export default function Activity() {
  const { t } = useTranslation();
  const { apiFetch, user } = useAuth();
  const { getBranchQueryParams, selectedBranchId } = useGym();
  const showBranchColumn = isGymOwner(user?.role) && selectedBranchId === 'all';
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [actorFilter, setActorFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadActivity = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getActivityLogs(apiFetch, {
        page,
        limit: PAGE_SIZE,
        actor: actorFilter,
        ...getBranchQueryParams(),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to load activity');
      setItems(data.items || []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (err) {
      setError(err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, page, actorFilter, getBranchQueryParams]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  useEffect(() => {
    setPage(1);
  }, [actorFilter]);

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title={t('pages.activity.title')}
        subtitle={t('pages.activity.subtitle')}
        actions={
          <Button variant="secondary" onClick={loadActivity} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="actor-filter" className="text-sm font-medium text-slate-600 dark:text-app-text">
          {t('table.who')}
        </label>
        <select
          id="actor-filter"
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
          className={`ui-select ${selectSurface} min-w-[10rem]`}
        >
          {ACTOR_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
          ))}
        </select>
      </div>

      {error ? <ErrorRetryBanner message={error} onRetry={() => void loadActivity()} /> : null}

      <Card className="overflow-hidden">
        {loading && items.length === 0 ? (
          <>
            <div className="lg:hidden">
              <AdminListSkeleton rows={5} />
            </div>
            <div className="hidden lg:block overflow-x-auto">
              <table className="admin-data-table">
                <tbody>
                  <AdminTableRowsSkeleton rows={5} cols={4} />
                </tbody>
              </table>
            </div>
          </>
        ) : items.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title={t('pages.activity.emptyTitle')}
            body={t('pages.activity.emptyBody')}
          />
        ) : (
          <>
            <div className="lg:hidden divide-y divide-slate-100 dark:divide-app-border-subtle">
              {items.map((entry) => {
                const detailText = formatAuditDetails(entry);
                const isStaff = entry.actor_role !== 'Gym Owner';
                return (
                  <div key={entry.id} className="p-4">
                    <p className="text-xs text-slate-400">{formatTimestamp(entry.created_at)}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-app-text-strong">{entry.actor_name}</span>
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                          isStaff ? 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20' : 'bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-600/10 dark:text-teal-400 dark:border-teal-600/20'
                        }`}
                      >
                        {formatActorRole(entry.actor_role)}
                      </span>
                    </div>
                    {showBranchColumn && entry.branch_name && (
                      <p className="mt-1 text-xs text-slate-400">{entry.branch_name}</p>
                    )}
                    <p className="mt-2 text-sm font-medium text-slate-800">
                      {formatAuditAction(entry.action)}
                    </p>
                    {entry.entity_label && (
                      <p className="mt-0.5 text-sm text-slate-600 dark:text-app-text">{entry.entity_label}</p>
                    )}
                    {detailText && (
                      <p className="mt-1 text-xs text-slate-500">{detailText}</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="hidden lg:block overflow-x-auto">
              <table className="admin-data-table min-w-[720px]">
                <thead>
                  <tr>
                    <th>{t('table.when')}</th>
                    <th>{t('table.who')}</th>
                    {showBranchColumn && <th>{t('table.branch')}</th>}
                    <th>{t('table.action')}</th>
                    <th>{t('table.target')}</th>
                    <th>{t('table.details')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((entry) => {
                    const detailText = formatAuditDetails(entry);
                    const isStaff = entry.actor_role !== 'Gym Owner';
                    return (
                      <tr key={entry.id} className={tableRowHover}>
                        <td className="whitespace-nowrap text-slate-500 dark:text-app-muted">
                          {formatTimestamp(entry.created_at)}
                        </td>
                        <td>
                          <div className="font-medium text-slate-900 dark:text-app-text-strong">{entry.actor_name}</div>
                          <span
                            className={`mt-0.5 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                              isStaff
                                ? 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20'
                                : 'bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-600/10 dark:text-teal-400 dark:border-teal-600/20'
                            }`}
                          >
                            {formatActorRole(entry.actor_role)}
                          </span>
                        </td>
                        {showBranchColumn && (
                          <td className="truncate text-slate-600 dark:text-app-text">{entry.branch_name || '—'}</td>
                        )}
                        <td className="font-medium text-slate-800 dark:text-app-text">
                          {formatAuditAction(entry.action)}
                        </td>
                        <td className="truncate text-slate-700 dark:text-app-text">
                          {entry.entity_label || '—'}
                        </td>
                        <td className="truncate text-slate-500 dark:text-app-muted">
                          {detailText || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationControls
              page={page}
              totalPages={totalPages}
              total={total}
              limit={PAGE_SIZE}
              onPageChange={setPage}
              disabled={loading}
            />
          </>
        )}
      </Card>
    </div>
  );
}
