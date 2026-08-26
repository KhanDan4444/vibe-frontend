import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useGym } from '../../context/GymContext';
import { isGymOwner } from '../../utils/roles';
import { ScrollText, RefreshCw, UserRound, Banknote, FileText, Users, PersonStanding, Circle } from 'lucide-react';
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
import { formatLogTimestamp } from '../../utils/date';
import { cardSurface, tableRowHover, panelTitle } from '../../utils/surfaceClasses';
import Button from '../../components/ui/Button';
import ToolbarPicker from '../../components/ToolbarPicker';
import { ToolbarChip, ToolbarChipBar } from '../../components/ToolbarChip';
import SearchField from '../../components/SearchField';
import ErrorRetryBanner from '../../components/ErrorRetryBanner';
import { ActivityCardSkeleton, AdminTableRowsSkeleton } from '../../components/LoadingSkeletons';

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

function activityActionIcon(action) {
  const prefix = String(action || '').split('.')[0];
  switch (prefix) {
    case 'member':
      return UserRound;
    case 'payment':
      return Banknote;
    case 'plan':
      return FileText;
    case 'staff':
      return Users;
    case 'trainer':
      return PersonStanding;
    default:
      return Circle;
  }
}

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
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { apiFetch, user } = useAuth();
  const { getBranchQueryParams, selectedBranchId, error: gymError, branches } = useGym();
  const activeBranchCount = branches.filter((b) => b.is_active !== false).length;
  const showBranchColumnPref =
    isGymOwner(user?.role) && selectedBranchId === 'all' && activeBranchCount > 1;
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

      <div className="lg:hidden">
        {loading && items.length === 0 ? (
          <div className={`overflow-hidden ${cardSurface}`}>
            <ActivityCardSkeleton rows={5} />
          </div>
        ) : items.length > 0 ? (
          <div className={`overflow-hidden ${cardSurface}`}>
            {items.map((entry, index) => {
              const detailText = formatAuditDetails(entry);
              const isStaff = entry.actor_role !== 'Gym Owner';
              const clickable = isRowClickable(entry);
              const ActionIcon = activityActionIcon(entry.action);
              const row = (
                <>
                  <div className="flex gap-3 px-3.5 py-2.5 sm:px-4">
                    <div className="mt-0.5 flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-teal-500/10 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300">
                      <ActionIcon className="h-[17px] w-[17px]" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-semibold leading-snug ${actionFiltered ? 'text-app-muted' : 'text-app-text-strong'}`}>
                          {formatAuditAction(entry.action)}
                        </p>
                        <span className="shrink-0 text-xs font-medium tabular-nums text-app-muted">
                          {formatLogTimestamp(entry.created_at, t, i18n.language)}
                        </span>
                      </div>
                      {entry.entity_label ? (
                        <p className="mt-1 truncate text-sm text-app-text">{entry.entity_label}</p>
                      ) : null}
                      {detailText ? (
                        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-app-muted">{detailText}</p>
                      ) : null}
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-app-muted">{entry.actor_name}</span>
                        <span className={roleChipClass(isStaff)}>
                          {formatActorRole(entry.actor_role)}
                        </span>
                        {showBranchColumn && entry.branch_name ? (
                          <span className="text-xs text-app-muted">· {entry.branch_name}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </>
              );
              return (
                <div key={entry.id}>
                  {index > 0 ? <div className="mx-3.5 border-t border-app-border-subtle sm:mx-4" /> : null}
                  {clickable ? (
                    <button
                      type="button"
                      onClick={() => openActivityTarget(entry, navigate)}
                      className="block w-full text-left transition-colors active:bg-app-surface/60"
                    >
                      {row}
                    </button>
                  ) : (
                    row
                  )}
                </div>
              );
            })}
          </div>
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
                        {formatLogTimestamp(entry.created_at, t, i18n.language)}
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

      {totalPages > 1 ? (
        <div className={`lg:hidden ${cardSurface}`}>
          <div className="px-4 py-3">
            <PaginationControls
              page={page}
              totalPages={totalPages}
              total={total}
              limit={PAGE_SIZE}
              onPageChange={setPage}
              disabled={loading}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
