import React, { useState, useCallback, useEffect } from 'react';
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
import { formatSmsMessageType, SMS_TYPE_FILTER_OPTIONS } from '../../utils/smsLogLabels';
import { useTranslation } from 'react-i18next';
import { cardSurface, tableRowHover } from '../../utils/surfaceClasses';
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

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title={t('pages.memberMessages.title')}
        subtitle={t('pages.memberMessages.subtitle')}
        actions={
          <button
            type="button"
            onClick={loadMessages}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-app-border-subtle bg-white dark:bg-app-raised px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-app-text hover:bg-slate-50 dark:hover:bg-app-surface/60 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="sms-type-filter" className="text-sm font-medium text-slate-600 dark:text-app-text">
          {t('smsLog.filterLabel')}
        </label>
        <select
          id="sms-type-filter"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-app-border-subtle bg-white dark:bg-app-raised px-3 py-2 text-sm text-slate-700 dark:text-app-text focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
        >
          {SMS_TYPE_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(opt.labelKey)}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="ui-alert-rose">
          {error}
        </div>
      )}

      <div className={`overflow-hidden ${cardSurface}`}>
        <div className="md:hidden divide-y divide-slate-100 dark:divide-app-border-subtle">
          {loading && items.length === 0 ? (
            <AdminListSkeleton rows={5} />
          ) : items.length > 0 ? (
            items.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => openMember(row.member_id)}
                className="flex w-full gap-3 p-4 text-left active:bg-slate-50 dark:active:bg-app-surface/60"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-600/15 dark:text-teal-300">
                  <MessageSquare className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 dark:text-app-text-strong">{row.member_name}</p>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-app-text">
                    {formatSmsMessageType(t, row.message_type)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-app-muted">
                    {row.recipient_phone || row.member_phone || '—'} · {formatDisplayDateTime(row.sent_at)}
                  </p>
                  {showBranchColumn && row.branch_name && (
                    <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-app-surface dark:text-app-text">
                      {row.branch_name}
                    </span>
                  )}
                </div>
              </button>
            ))
          ) : (
            <EmptyState
              icon={MessageSquare}
              compact
              title={t('pages.memberMessages.emptyTitle')}
              body={t('pages.memberMessages.emptyBody')}
            />
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
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
                <AdminTableRowsSkeleton rows={5} cols={showBranchColumn ? 5 : 4} />
              ) : items.length > 0 ? (
                items.map((row) => (
                  <tr
                    key={row.id}
                    className={`cursor-pointer ${tableRowHover}`}
                    onClick={() => openMember(row.member_id)}
                  >
                    <td className="font-medium text-slate-900 dark:text-app-text-strong">{row.member_name}</td>
                    <td className="text-slate-600 dark:text-app-text">{row.recipient_phone || row.member_phone || '—'}</td>
                    <td>
                      <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 dark:bg-teal-600/15 dark:text-teal-300">
                        {formatSmsMessageType(t, row.message_type)}
                      </span>
                    </td>
                    {showBranchColumn && (
                      <td className="text-slate-600 dark:text-app-text">{row.branch_name || '—'}</td>
                    )}
                    <td className="whitespace-nowrap text-slate-600 dark:text-app-text">
                      {formatDisplayDateTime(row.sent_at)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={showBranchColumn ? 5 : 4} className="p-0">
                    <EmptyState
                      icon={MessageSquare}
                      compact
                      title={t('pages.memberMessages.emptyTitle')}
                      body={t('pages.memberMessages.emptyBody')}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} total={total} />
      )}
    </div>
  );
}
