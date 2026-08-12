import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import {
  formatAuditAction,
  formatAuditDetails,
  formatActorRole,
  ACTION_FILTER_OPTIONS,
  ACTION_FILTER_GROUPS,
} from '../../utils/activityLabels';
import { useTranslation } from 'react-i18next';
import { formatDisplayDateTime } from '../../utils/date';
import { cardSurface, tableRowHover, panelTitle } from '../../utils/surfaceClasses';
import Button from '../../components/ui/Button';
import ToolbarPicker from '../../components/ToolbarPicker';
import { ToolbarChip, ToolbarChipBar } from '../../components/ToolbarChip';
import SearchField from '../../components/SearchField';
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
  const { getBranchQueryParams, selectedBranchId, error: gymError } = useGym();
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

      {error && !gymError ? <ErrorRetryBanner message={error} onRetry={() => void loadActivity()} /> : null}

      <div className={`overflow-hidden ${cardSurface}`}>
        <div className="flex flex-col gap-3 p-3 sm:px-4">
          <div className="min-w-0">
            <h2 className={panelTitle}>
              {t('pages.activity.history')}
            </h2>
            <p className="mt-0.5 text-xs text-app-muted">{t('pages.activity.subtitle')}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t('pages.activity.searchPlaceholder')}
            />
            <ToolbarPicker
              value={actionFilter}
              onChange={setActionFilter}
              options={ACTION_FILTER_OPTIONS.map((opt) => ({
                id: opt.value,
                labelKey: opt.labelKey,
                group: opt.group,
              }))}
              groups={ACTION_FILTER_GROUPS}
              label={t('pages.activity.actionFilterLabel')}
            />
            <ToolbarChipBar className="mb-0">
              {ACTOR_FILTER_OPTIONS.map((opt) => (
                <ToolbarChip
                  key={opt.value}
                  label={t(opt.labelKey)}
                  active={actorFilter === opt.value}
                  onClick={() => setActorFilter(opt.value)}
                />
              ))}
            </ToolbarChipBar>
          </div>
        </div>
      </div>

      <div className="lg:hidden space-y-3">
        {loading && items.length === 0 ? (
          <div className={`overflow-hidden ${cardSurface}`}>
            <AdminListSkeleton rows={5} />
          </div>
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
                className={`${cardSurface} block w-full p-4 text-left active:bg-app-surface/60`}
              >
                {content}
              </button>
            ) : (
              <div key={entry.id} className={`${cardSurface} p-4`}>
                {content}
              </div>
            );
          })
        ) : (
          <div className={cardSurface}>
            <EmptyState icon={ScrollText} compact title={emptyTitle} body={emptyBody} />
          </div>
        )}
      </div>

      <div className={`hidden overflow-hidden lg:block ${cardSurface}`}>
        <div className="overflow-x-auto">
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
