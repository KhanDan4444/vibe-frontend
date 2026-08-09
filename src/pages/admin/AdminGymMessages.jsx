import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, RefreshCw } from 'lucide-react';
import { parseApiResponse } from '../../utils/api';
import { getAdminGymSmsLog } from '../../services/adminGymSmsService';
import { DEFAULT_PAGE_SIZE } from '../../utils/pagination';
import PaginationControls from '../../components/PaginationControls';
import { formatDisplayDateTime } from '../../utils/date';
import { formatAdminSmsMessageType, ADMIN_SMS_TYPE_FILTER_OPTIONS } from '../../utils/smsLogLabels';
import { useTranslation } from 'react-i18next';
import { cardSurface, tableRowHover, pageTitle, mutedText } from '../../utils/surfaceClasses';
import Button from '../../components/ui/Button';

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={pageTitle}>
            {t('pages.adminGymMessages.title')}
          </h1>
          <p className={`mt-2 max-w-xl text-sm leading-relaxed ${mutedText}`}>
            {t('pages.adminGymMessages.subtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={loadMessages}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-app-border-subtle bg-app-raised px-4 py-2.5 text-sm font-semibold text-app-text hover:bg-app-surface/60 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="admin-sms-gym-filter" className="text-sm font-medium text-app-text">
            {t('table.gym')}
          </label>
          <select
            id="admin-sms-gym-filter"
            value={gymFilter}
            onChange={(e) => setGymFilter(e.target.value)}
            className="rounded-lg border border-app-input-border bg-app-input px-3 py-2 text-sm text-app-text focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
          >
            <option value="all">{t('filters.allGyms')}</option>
            {gyms.map((gym) => (
              <option key={gym.id} value={String(gym.id)}>
                {gym.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="admin-sms-type-filter" className="text-sm font-medium text-app-text">
            {t('smsLog.filterLabel')}
          </label>
          <select
            id="admin-sms-type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-app-input-border bg-app-input px-3 py-2 text-sm text-app-text focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
          >
            {ADMIN_SMS_TYPE_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="ui-alert-rose flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>{error}</p>
          <Button variant="danger" size="sm" onClick={() => void loadMessages()}>
            {t('common.retry')}
          </Button>
        </div>
      )}

      <div className={`overflow-hidden ${cardSurface}`}>
        <div className="lg:hidden divide-y divide-app-border-subtle">
          {loading && items.length === 0 ? (
            <p className="admin-panel-empty">{t('common.loading')}</p>
          ) : items.length > 0 ? (
            items.map((row) => (
              <div key={row.id} className="flex gap-3 p-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-600/15 dark:text-teal-300">
                  <MessageSquare className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-app-text-strong">
                    {row.gym_name || '—'}
                  </div>
                  <p className="mt-0.5 text-sm text-app-text">
                    {row.owner_name || '—'}
                  </p>
                  <p className="mt-0.5 text-sm text-app-text">
                    {formatAdminSmsMessageType(t, row.message_type)}
                  </p>
                  {row.otp_code && (
                    <p className="mt-1 font-mono text-sm font-semibold text-teal-700 dark:text-teal-300">
                      {t('smsLog.code')}: {row.otp_code}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-app-muted">
                    {row.recipient_phone || row.gym_phone || '—'} · {formatDisplayDateTime(row.sent_at)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="admin-panel-empty">{t('pages.adminGymMessages.empty')}</p>
          )}
        </div>

        <div className="hidden lg:block overflow-x-auto">
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
                <tr>
                  <td colSpan={6} className="admin-panel-empty">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : items.length > 0 ? (
                items.map((row) => (
                  <tr key={row.id} className={tableRowHover}>
                    <td>{renderGymCell(row)}</td>
                    <td className="text-app-text">{row.owner_name || '—'}</td>
                    <td className="text-app-text">{row.recipient_phone || row.gym_phone || '—'}</td>
                    <td>
                      <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 dark:bg-teal-600/15 dark:text-teal-300">
                        {formatAdminSmsMessageType(t, row.message_type)}
                      </span>
                    </td>
                    <td className="font-mono text-sm font-semibold text-teal-700 dark:text-teal-300">
                      {row.otp_code || '—'}
                    </td>
                    <td className="whitespace-nowrap text-app-text">
                      {formatDisplayDateTime(row.sent_at)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="admin-panel-empty">
                    {t('pages.adminGymMessages.empty')}
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
