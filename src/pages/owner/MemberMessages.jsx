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
import { cardSurface, tableRowHover, selectSurface, headingText } from '../../utils/surfaceClasses';
import { AdminListSkeleton, AdminTableRowsSkeleton } from '../../components/LoadingSkeletons';

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

export default function MemberMessages() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { apiFetch, user } = useAuth();
  const { getBranchQueryParams, selectedBranchId } = useGym();
  const showBranchColumn = isGymOwner(user?.role) && selectedBranchId === 'all';
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getMemberSmsLog(apiFetch, {
        page,
        limit: PAGE_SIZE,
        type: typeFilter,
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
  }, [apiFetch, page, typeFilter, getBranchQueryParams, t]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, selectedBranchId]);

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
  const emptyTitle = typeFilter === 'all'
    ? t('pages.memberMessages.emptyTitle')
    : t('pages.memberMessages.emptyFilteredTitle');
  const emptyBody = typeFilter === 'all'
    ? t('pages.memberMessages.emptyBody')
    : t('pages.memberMessages.emptyFilteredBody');
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

      {error ? <ErrorRetryBanner message={error} onRetry={() => void loadMessages()} /> : null}

      <div className={`overflow-hidden ${cardSurface}`}>
        <div className="flex flex-col gap-3 border-b border-app-border-subtle p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="min-w-0">
            <h2 className={`text-sm font-semibold tracking-tight sm:text-base ${headingText}`}>
              {t('pages.memberMessages.messageHistory')}
            </h2>
            <p className="mt-0.5 text-xs text-app-muted">{t('pages.memberMessages.subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="sms-type-filter">
              {t('smsLog.filterLabel')}
            </label>
            <select
              id="sms-type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={`ui-select ${selectSurface} min-w-[11rem]`}
            >
              {SMS_TYPE_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="lg:hidden divide-y divide-app-border-subtle">
          {loading && items.length === 0 ? (
            <AdminListSkeleton rows={5} />
          ) : items.length > 0 ? (
            items.map((row) => {
              const preview = formatSmsMessagePreview(t, row.message_type);
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => openMember(row.member_id)}
                  className="flex w-full gap-3 p-4 text-left active:bg-app-surface/60"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-600/15 dark:text-teal-300">
                    <MessageSquare className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-app-text-strong">{row.member_name}</p>
                    <p className="mt-1">
                      <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 dark:bg-teal-600/15 dark:text-teal-300">
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
            <EmptyState icon={MessageSquare} compact title={emptyTitle} body={emptyBody} />
          )}
        </div>

        <div className="hidden overflow-x-auto lg:block">
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
                  const preview = formatSmsMessagePreview(t, row.message_type);
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
                          <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 dark:bg-teal-600/15 dark:text-teal-300">
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
