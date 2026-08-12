import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useGym } from '../../context/GymContext';
import { isGymOwner } from '../../utils/roles';
import { MessageSquare, RefreshCw } from 'lucide-react';
import { parseApiResponse } from '../../utils/api';
import { getMemberSmsLog } from '../../services/memberSmsService';
import { DEFAULT_PAGE_SIZE } from '../../utils/pagination';
import PaginationControls from '../../components/PaginationControls';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import { formatDisplayDateTime } from '../../utils/date';
import {
  formatSmsMessageType,
  formatSmsMessagePreview,
  SMS_TYPE_FILTER_OPTIONS,
} from '../../utils/smsLogLabels';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui/Button';
import ErrorRetryBanner from '../../components/ErrorRetryBanner';
import { cardSurface, tableRowHover, panelTitle } from '../../utils/surfaceClasses';
import ToolbarPicker from '../../components/ToolbarPicker';
import SearchField from '../../components/SearchField';
import { AdminListSkeleton, AdminTableRowsSkeleton } from '../../components/LoadingSkeletons';

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

const CHIP_ACTIVE =
  'inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 dark:bg-teal-600/15 dark:text-teal-300';
const CHIP_MUTED =
  'inline-flex rounded-full bg-app-surface px-2.5 py-1 text-xs font-medium text-app-muted';

export default function MemberMessages() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { apiFetch, user } = useAuth();
  const { getBranchQueryParams, selectedBranchId, error: gymError } = useGym();
  const showBranchColumn = isGymOwner(user?.role) && selectedBranchId === 'all';
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const typeFiltered = typeFilter !== 'all';
  const chipClass = typeFiltered ? CHIP_MUTED : CHIP_ACTIVE;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getMemberSmsLog(apiFetch, {
        page,
        limit: PAGE_SIZE,
        type: typeFilter,
        search: debouncedSearch,
        ...getBranchQueryParams(),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || t('pages.memberMessages.loadError'));
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
  }, [apiFetch, page, typeFilter, debouncedSearch, getBranchQueryParams, t]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, selectedBranchId, debouncedSearch]);

  const openMember = (memberId) => {
    if (!memberId) return;
    navigate('/dashboard/members', { state: { memberId } });
  };

  const filterMeta = useMemo(
    () => SMS_TYPE_FILTER_OPTIONS.find((opt) => opt.value === typeFilter) || SMS_TYPE_FILTER_OPTIONS[0],
    [typeFilter],
  );
  const filterLabel = t(filterMeta.labelKey);
  const statusLine = total > 0
    ? t('pages.memberMessages.statusLine', { count: total, filter: filterLabel })
    : t('pages.memberMessages.statusLineEmpty');

  const emptyTitle = debouncedSearch
    ? t('pages.memberMessages.emptySearchTitle')
    : typeFiltered
      ? t('pages.memberMessages.emptyFilteredTitle')
      : t('pages.memberMessages.emptyTitle');
  const emptyBody = debouncedSearch
    ? t('pages.memberMessages.emptySearchBody')
    : typeFiltered
      ? t('pages.memberMessages.emptyFilteredBody')
      : t('pages.memberMessages.emptyBody');
  const colCount = showBranchColumn ? 5 : 4;

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={t('pages.memberMessages.title')}
        subtitle={statusLine}
        actions={
          <Button variant="secondary" onClick={() => void loadMessages()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
        }
      />

      {error && !gymError ? <ErrorRetryBanner message={error} onRetry={() => void loadMessages()} /> : null}

      <div className={`overflow-hidden ${cardSurface}`}>
        <div className="flex flex-col gap-3 p-3 sm:px-4">
          <div className="min-w-0">
            <h2 className={panelTitle}>
              {t('pages.memberMessages.messageHistory')}
            </h2>
            <p className="mt-0.5 text-xs text-app-muted">{t('pages.memberMessages.subtitle')}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t('pages.memberMessages.searchPlaceholder')}
            />
            <ToolbarPicker
              value={typeFilter}
              onChange={setTypeFilter}
              options={SMS_TYPE_FILTER_OPTIONS.map((opt) => ({
                id: opt.value,
                labelKey: opt.labelKey,
              }))}
              label={t('smsLog.filterLabel')}
            />
          </div>
        </div>
      </div>

      <div className="lg:hidden space-y-3">
        {loading && items.length === 0 ? (
          <div className={`overflow-hidden ${cardSurface}`}>
            <AdminListSkeleton rows={5} />
          </div>
        ) : items.length > 0 ? (
          items.map((row) => {
            const preview = typeFiltered ? null : formatSmsMessagePreview(t, row.message_type);
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => openMember(row.member_id)}
                className={`${cardSurface} flex w-full gap-3 p-4 text-left active:bg-app-surface/60`}
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-600/15 dark:text-teal-300">
                  <MessageSquare className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-app-text-strong">{row.member_name}</p>
                  <p className="mt-1">
                    <span className={chipClass}>
                      {formatSmsMessageType(t, row.message_type)}
                    </span>
                  </p>
                  {preview ? (
                    <p className="mt-1.5 text-xs leading-snug text-app-muted">{preview}</p>
                  ) : null}
                  <p className="mt-1.5 text-xs text-app-muted">
                    {row.recipient_phone || row.member_phone || '—'} · {formatDisplayDateTime(row.sent_at)}
                  </p>
                  {showBranchColumn && row.branch_name && (
                    <span className="mt-2 inline-flex rounded-full bg-app-surface px-2 py-0.5 text-[10px] font-semibold text-app-text">
                      {row.branch_name}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        ) : (
          <div className={cardSurface}>
            <EmptyState icon={MessageSquare} compact title={emptyTitle} body={emptyBody} />
          </div>
        )}
      </div>

      <div className={`hidden overflow-hidden lg:block ${cardSurface}`}>
        <div className="overflow-x-auto">
          <table className="admin-data-table min-w-[720px]">
            <thead>
              <tr>
                <th>{t('table.member')}</th>
                <th>{t('table.phone')}</th>
                <th>{t('smsLog.messageType')}</th>
                {showBranchColumn && <th>{t('table.branch')}</th>}
                <th>{t('smsLog.sentAt')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <AdminTableRowsSkeleton rows={5} cols={colCount} />
              ) : items.length > 0 ? (
                items.map((row) => {
                  const preview = typeFiltered ? null : formatSmsMessagePreview(t, row.message_type);
                  return (
                    <tr
                      key={row.id}
                      className={`cursor-pointer ${tableRowHover}`}
                      onClick={() => openMember(row.member_id)}
                    >
                      <td className="font-semibold text-app-text-strong">{row.member_name}</td>
                      <td className="text-app-muted">{row.recipient_phone || row.member_phone || '—'}</td>
                      <td>
                        <div className="min-w-0 max-w-xs">
                          <span className={chipClass}>
                            {formatSmsMessageType(t, row.message_type)}
                          </span>
                          {preview ? (
                            <p className="mt-1 text-xs leading-snug text-app-muted">{preview}</p>
                          ) : null}
                        </div>
                      </td>
                      {showBranchColumn && (
                        <td className="text-app-muted">{row.branch_name || '—'}</td>
                      )}
                      <td className="whitespace-nowrap text-app-muted">
                        {formatDisplayDateTime(row.sent_at)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={colCount} className="p-0">
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
