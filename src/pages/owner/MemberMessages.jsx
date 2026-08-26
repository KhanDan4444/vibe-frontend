import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useGym } from '../../context/GymContext';
import { isGymOwner } from '../../utils/roles';
import { MessageSquare, RefreshCw, UserPlus, Clock, Calendar, AlertCircle, QrCode, CheckCircle2 } from 'lucide-react';
import { parseApiResponse } from '../../utils/api';
import { getMemberSmsLog } from '../../services/memberSmsService';
import { DEFAULT_PAGE_SIZE } from '../../utils/pagination';
import PaginationControls from '../../components/PaginationControls';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import MemberPhoto from '../../components/MemberPhoto';
import { formatLogTimestamp } from '../../utils/date';
import {
  formatSmsMessageType,
  formatSmsMessagePreview,
  SMS_TYPE_FILTER_OPTIONS,
  smsMessageTypeIcon,
} from '../../utils/smsLogLabels';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui/Button';
import ErrorRetryBanner from '../../components/ErrorRetryBanner';
import { cardSurface, tableRowHover, panelTitle } from '../../utils/surfaceClasses';
import ToolbarPicker from '../../components/ToolbarPicker';
import SearchField from '../../components/SearchField';
import { MessageListSkeleton, AdminTableRowsSkeleton } from '../../components/LoadingSkeletons';

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

const CHIP_ACTIVE =
  'inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 dark:bg-teal-600/15 dark:text-teal-300';
const CHIP_MUTED =
  'inline-flex rounded-full bg-app-surface px-2.5 py-1 text-xs font-medium text-app-muted';

const SMS_AVATAR =
  'h-9 w-9 rounded-full object-cover';
const SMS_AVATAR_FALLBACK =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-border text-xs font-bold text-app-text';

const SMS_TYPE_ICON = {
  UserPlus,
  Clock,
  Calendar,
  AlertCircle,
  RefreshCw,
  QrCode,
  MessageSquare,
};

export default function MemberMessages() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { apiFetch, user } = useAuth();
  const { getBranchQueryParams, selectedBranchId, error: gymError, branches } = useGym();
  const activeBranchCount = branches.filter((b) => b.is_active !== false).length;
  const showBranchColumn =
    isGymOwner(user?.role) && selectedBranchId === 'all' && activeBranchCount > 1;
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

      <div className="lg:hidden">
        {loading && items.length === 0 ? (
          <div className={`overflow-hidden ${cardSurface}`}>
            <MessageListSkeleton rows={5} />
          </div>
        ) : items.length > 0 ? (
          <div className={`overflow-hidden ${cardSurface}`}>
            {items.map((row, index) => {
              const preview = typeFiltered ? null : formatSmsMessagePreview(t, row.message_type);
              const iconKey = smsMessageTypeIcon(row.message_type);
              const TypeIcon = SMS_TYPE_ICON[iconKey] || MessageSquare;
              return (
                <div key={row.id}>
                  {index > 0 ? <div className="mx-3.5 border-t border-app-border-subtle sm:mx-4" /> : null}
                  <button
                    type="button"
                    onClick={() => openMember(row.member_id)}
                    className="block w-full px-3.5 py-2.5 text-left transition-colors active:bg-app-surface/60 sm:px-4"
                  >
                    <div className="flex gap-3">
                      <div className="mt-0.5 flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-teal-500/10 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300">
                        <TypeIcon className="h-[17px] w-[17px]" strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-app-text-strong">{row.member_name}</p>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <span className="text-xs font-medium tabular-nums text-app-muted">
                              {formatLogTimestamp(row.sent_at, t, i18n.language)}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold lowercase text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-[15px] w-[15px]" strokeWidth={2.5} aria-hidden />
                              {t('pages.memberMessages.sentBadge')}
                            </span>
                          </div>
                        </div>
                        <p className="mt-1.5">
                          <span className={chipClass}>
                            {formatSmsMessageType(t, row.message_type)}
                          </span>
                        </p>
                        {preview ? (
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-app-muted">{preview}</p>
                        ) : null}
                        <p className="mt-1.5 text-xs text-app-muted">
                          {row.recipient_phone || row.member_phone || '—'}
                          {showBranchColumn && row.branch_name ? ` · ${row.branch_name}` : ''}
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={cardSurface}>
            <EmptyState icon={MessageSquare} compact title={emptyTitle} body={emptyBody} />
          </div>
        )}
      </div>

      <div className={`hidden overflow-hidden lg:block ${cardSurface}`}>
        <div className="overflow-x-auto">
          <table className="admin-data-table owner-sms-table min-w-[720px]">
            <thead>
              <tr>
                <th className="owner-sms-col-member">{t('table.member')}</th>
                <th className="owner-sms-col-phone">{t('table.phone')}</th>
                <th className="owner-sms-col-message">{t('smsLog.messageType')}</th>
                {showBranchColumn && <th className="owner-sms-col-branch">{t('table.branch')}</th>}
                <th className="owner-sms-col-sent">{t('smsLog.sentAt')}</th>
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
                      <td className="owner-sms-col-member">
                        <div className="flex min-w-0 items-center gap-3">
                          <MemberPhoto
                            memberId={row.member_id}
                            apiFetch={apiFetch}
                            name={row.member_name}
                            hasPhoto={Boolean(row.member_photo_url)}
                            expandable={false}
                            className={SMS_AVATAR}
                            fallbackClassName={SMS_AVATAR_FALLBACK}
                          />
                          <span className="truncate font-semibold text-app-text-strong">
                            {row.member_name}
                          </span>
                        </div>
                      </td>
                      <td className="owner-sms-col-phone text-app-muted">{row.recipient_phone || row.member_phone || '—'}</td>
                      <td className="owner-sms-col-message">
                        <div className="min-w-0 space-y-1">
                          <span className={chipClass}>
                            {formatSmsMessageType(t, row.message_type)}
                          </span>
                          {preview ? (
                            <p className="mt-1 text-xs leading-snug text-app-muted">{preview}</p>
                          ) : null}
                        </div>
                      </td>
                      {showBranchColumn && (
                        <td className="owner-sms-col-branch text-app-muted">{row.branch_name || '—'}</td>
                      )}
                      <td className="owner-sms-col-sent">
                        <div className="text-app-muted">
                          {formatLogTimestamp(row.sent_at, t, i18n.language)}
                        </div>
                        <div className="mt-1 inline-flex items-center justify-end gap-1 text-[11px] font-bold lowercase text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-[15px] w-[15px]" strokeWidth={2.5} aria-hidden />
                          {t('pages.memberMessages.sentBadge')}
                        </div>
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

      {totalPages > 1 ? (
        <div className={`lg:hidden ${cardSurface}`}>
          <div className="px-4 py-3">
            <PaginationControls
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              total={total}
              limit={PAGE_SIZE}
              disabled={loading}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
