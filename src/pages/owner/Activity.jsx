import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useGym } from '../../context/GymContext';
import { isGymOwner } from '../../utils/roles';
import { ScrollText, RefreshCw, Search } from 'lucide-react';
import { parseApiResponse } from '../../utils/api';
import { getActivityLogs } from '../../services/activityService';
import { DEFAULT_PAGE_SIZE } from '../../utils/pagination';
import PaginationControls from '../../components/PaginationControls';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import {
  formatAuditAction,
  formatAuditDetails,
  formatActorRole,
  ACTION_FILTER_OPTIONS,
  ACTION_FILTER_GROUPS,
} from '../../utils/activityLabels';
import { useTranslation } from 'react-i18next';
import { formatDisplayDateTime } from '../../utils/date';
import { cardSurface, tableRowHover, selectSurface, headingText } from '../../utils/surfaceClasses';
import Button from '../../components/ui/Button';
import ErrorRetryBanner from '../../components/ErrorRetryBanner';
import { AdminListSkeleton, AdminTableRowsSkeleton } from '../../components/LoadingSkeletons';

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

const ACTOR_FILTER_OPTIONS = [
  { value: 'all', labelKey: 'filters.everyone' },
  { value: 'staff', labelKey: 'filters.staffOnly' },
  { value: 'owner', labelKey: 'filters.ownerOnly' },
];

const ROLE_CHIP_OWNER =
  'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-600/10 dark:text-teal-400 dark:border-teal-600/20';
const ROLE_CHIP_STAFF =
  'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20';
const ROLE_CHIP_MUTED =
  'inline-flex rounded-full border border-app-border-subtle bg-app-surface px-2 py-0.5 text-[10px] font-medium text-app-muted';

function openActivityTarget(entry, navigate) {
  const type = entry.entity_type;
  if (type === 'member' && entry.entity_id) {
    navigate('/dashboard/members', { state: { memberId: entry.entity_id } });
    return;
  }
  if (type === 'payment') {
    const memberId = entry.details?.member_id;
    if (memberId) {
      navigate('/dashboard/members', { state: { memberId, action: 'payment' } });
      return;
    }
    navigate('/dashboard/revenue');
    return;
  }
  if (type === 'plan') {
    navigate('/dashboard/plans');
    return;
  }
  if (type === 'staff') {
    navigate('/dashboard/team');
  }
}

function isRowClickable(entry) {
  if (entry.entity_type === 'member' && entry.entity_id) return true;
  if (entry.entity_type === 'payment') return true;
  if (entry.entity_type === 'plan') return true;
  if (entry.entity_type === 'staff') return true;
  return false;
}

export default function Activity() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { apiFetch, user } = useAuth();
  const { getBranchQueryParams, selectedBranchId } = useGym();
  const showBranchColumnPref = isGymOwner(user?.role) && selectedBranchId === 'all';
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [actorFilter, setActorFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const actorFiltered = actorFilter !== 'all';
  const actionFiltered = actionFilter !== 'all';

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadActivity = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getActivityLogs(apiFetch, {
        page,
        limit: PAGE_SIZE,
        actor: actorFilter,
        action: actionFilter,
        search: debouncedSearch,
        ...getBranchQueryParams(),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || t('errors.loadActivity'));
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
  }, [apiFetch, page, actorFilter, actionFilter, debouncedSearch, getBranchQueryParams, t]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  useEffect(() => {
    setPage(1);
  }, [actorFilter, actionFilter, selectedBranchId, debouncedSearch]);

  const actionMeta = useMemo(
    () => ACTION_FILTER_OPTIONS.find((opt) => opt.value === actionFilter) || ACTION_FILTER_OPTIONS[0],
    [actionFilter],
  );
  const actorMeta = useMemo(
    () => ACTOR_FILTER_OPTIONS.find((opt) => opt.value === actorFilter) || ACTOR_FILTER_OPTIONS[0],
    [actorFilter],
  );

  const statusFilterLabel = useMemo(() => {
    const parts = [];
    if (actionFiltered) parts.push(t(actionMeta.labelKey));
    if (actorFiltered) parts.push(t(actorMeta.labelKey));
    return parts.length > 0 ? parts.join(' · ') : t('pages.activity.filters.allEvents');
  }, [actionFiltered, actorFiltered, actionMeta, actorMeta, t]);

  const statusLine = total > 0
    ? t('pages.activity.statusLine', { count: total, filter: statusFilterLabel })
    : t('pages.activity.statusLineEmpty');

  const emptyTitle = debouncedSearch
    ? t('pages.activity.emptySearchTitle')
    : actionFiltered || actorFiltered
      ? t('pages.activity.emptyFilteredTitle')
      : t('pages.activity.emptyTitle');
  const emptyBody = debouncedSearch
    ? t('pages.activity.emptySearchBody')
    : actionFiltered || actorFiltered
      ? t('pages.activity.emptyFilteredBody')
      : t('pages.activity.emptyBody');

  const showBranchColumn = showBranchColumnPref && items.some((entry) => entry.branch_name);
  const colCount = showBranchColumn ? 6 : 5;

  const roleChipClass = (isStaff) => {
    if (actorFiltered) return ROLE_CHIP_MUTED;
    return isStaff ? ROLE_CHIP_STAFF : ROLE_CHIP_OWNER;
  };

  const actionOptionsByGroup = useMemo(() => {
    const ungrouped = ACTION_FILTER_OPTIONS.filter((opt) => !opt.group);
    const groups = ACTION_FILTER_GROUPS.map((group) => ({
      ...group,
      options: ACTION_FILTER_OPTIONS.filter((opt) => opt.group === group.id),
    }));
    return { ungrouped, groups };
  }, []);

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={t('pages.activity.title')}
        subtitle={statusLine}
        actions={
          <Button variant="secondary" onClick={() => void loadActivity()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
        }
      />

      {error ? <ErrorRetryBanner message={error} onRetry={() => void loadActivity()} /> : null}

      <div className={`overflow-hidden ${cardSurface}`}>
        <div className="flex flex-col gap-3 border-b border-app-border-subtle p-3 sm:px-4">
          <div className="min-w-0">
            <h2 className={`text-sm font-semibold tracking-tight sm:text-base ${headingText}`}>
              {t('pages.activity.history')}
            </h2>
            <p className="mt-0.5 text-xs text-app-muted">{t('pages.activity.subtitle')}</p>
          </div>
          <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
            <div className="relative w-full sm:max-w-md">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-app-muted">
                <Search className="h-5 w-5" />
              </span>
              <input
                type="search"
                className="admin-field block w-full pl-10 pr-4 placeholder:text-app-muted"
                placeholder={t('pages.activity.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label={t('pages.activity.searchPlaceholder')}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="activity-action-filter">
                {t('pages.activity.actionFilterLabel')}
              </label>
              <select
                id="activity-action-filter"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className={`ui-select ${selectSurface} min-w-[11rem]`}
              >
                {actionOptionsByGroup.ungrouped.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </option>
                ))}
                {actionOptionsByGroup.groups.map((group) => (
                  <optgroup key={group.id} label={t(group.labelKey)}>
                    {group.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {t(opt.labelKey)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <label className="sr-only" htmlFor="activity-actor-filter">
                {t('table.who')}
              </label>
              <select
                id="activity-actor-filter"
                value={actorFilter}
                onChange={(e) => setActorFilter(e.target.value)}
                className={`ui-select ${selectSurface} min-w-[9rem]`}
              >
                {ACTOR_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="lg:hidden divide-y divide-app-border-subtle">
          {loading && items.length === 0 ? (
            <AdminListSkeleton rows={5} />
          ) : items.length > 0 ? (
            items.map((entry) => {
              const detailText = formatAuditDetails(entry);
              const isStaff = entry.actor_role !== 'Gym Owner';
              const clickable = isRowClickable(entry);
              const content = (
                <>
                  <p className="text-xs text-app-muted">{formatDisplayDateTime(entry.created_at)}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="font-medium text-app-text-strong">{entry.actor_name}</span>
                    <span className={roleChipClass(isStaff)}>
                      {formatActorRole(entry.actor_role)}
                    </span>
                  </div>
                  {showBranchColumn && entry.branch_name ? (
                    <p className="mt-1 text-xs text-app-muted">{entry.branch_name}</p>
                  ) : null}
                  <p className={`mt-2 text-sm font-medium ${actionFiltered ? 'text-app-muted' : 'text-app-text-strong'}`}>
                    {formatAuditAction(entry.action)}
                  </p>
                  {entry.entity_label ? (
                    <p className="mt-0.5 text-sm text-app-text">{entry.entity_label}</p>
                  ) : null}
                  {detailText ? (
                    <p className="mt-1 text-xs text-app-muted">{detailText}</p>
                  ) : null}
                </>
              );
              return clickable ? (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => openActivityTarget(entry, navigate)}
                  className="block w-full p-4 text-left active:bg-app-surface/60"
                >
                  {content}
                </button>
              ) : (
                <div key={entry.id} className="p-4">
                  {content}
                </div>
              );
            })
          ) : (
            <EmptyState icon={ScrollText} compact title={emptyTitle} body={emptyBody} />
          )}
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="admin-data-table min-w-[720px]">
            <thead>
              <tr>
                <th>{t('table.when')}</th>
                <th>{t('table.who')}</th>
                {showBranchColumn ? <th>{t('table.branch')}</th> : null}
                <th>{t('table.action')}</th>
                <th>{t('table.target')}</th>
                <th>{t('table.details')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <AdminTableRowsSkeleton rows={5} cols={colCount} />
              ) : items.length > 0 ? (
                items.map((entry) => {
                  const detailText = formatAuditDetails(entry);
                  const isStaff = entry.actor_role !== 'Gym Owner';
                  const clickable = isRowClickable(entry);
                  return (
                    <tr
                      key={entry.id}
                      className={clickable ? `cursor-pointer ${tableRowHover}` : tableRowHover}
                      onClick={clickable ? () => openActivityTarget(entry, navigate) : undefined}
                    >
                      <td className="whitespace-nowrap text-app-muted">
                        {formatDisplayDateTime(entry.created_at)}
                      </td>
                      <td>
                        <div className="font-medium text-app-text-strong">{entry.actor_name}</div>
                        <span className={`mt-0.5 ${roleChipClass(isStaff)}`}>
                          {formatActorRole(entry.actor_role)}
                        </span>
                      </td>
                      {showBranchColumn ? (
                        <td className="truncate text-app-text">{entry.branch_name || '—'}</td>
                      ) : null}
                      <td className={`font-medium ${actionFiltered ? 'text-app-muted' : 'text-app-text'}`}>
                        {formatAuditAction(entry.action)}
                      </td>
                      <td className="truncate text-app-text">
                        {entry.entity_label || '—'}
                      </td>
                      <td className="truncate text-app-muted">
                        {detailText || '—'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={colCount} className="p-0">
                    <EmptyState icon={ScrollText} compact title={emptyTitle} body={emptyBody} />
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
              total={total}
              limit={PAGE_SIZE}
              onPageChange={setPage}
              disabled={loading}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
