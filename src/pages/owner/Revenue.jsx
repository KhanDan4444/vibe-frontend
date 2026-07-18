// src/pages/owner/Revenue.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useGym } from '../../context/GymContext';
import { isGymOwner } from '../../utils/roles';
import { DollarSign, Search, CreditCard, ArrowUpRight, TrendingUp, Calendar, Trash2, Edit, Download, CircleDollarSign, UserX } from 'lucide-react';
import PaymentModal from '../../components/PaymentModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { DEFAULT_PAGE_SIZE } from '../../utils/pagination';
import PaginationControls from '../../components/PaginationControls';
import { PERIOD_PRESETS, downloadCsv } from '../../utils/paymentReport';
import { parseApiResponse } from '../../utils/api';
import { mapPaymentFromApi } from '../../utils/apiMappers';
import { paymentMethodStyle, paymentSourceLabel, paymentSourceStyle } from '../../utils/paymentSources';
import { exportColumn, translatePaymentMethod } from '../../i18n/helpers';
import { getPayments } from '../../services/paymentService';
import { DEFAULT_REVENUE_SORT, REVENUE_SORT_OPTIONS, sortOwnerPaymentsList } from '../../utils/listSort';
import StatusBadge from '../../components/StatusBadge';
import { formatMemberStatusForDisplay } from '../../utils/memberStatus';
import { toDateString, formatDisplayDate } from '../../utils/date';
import { boundsForCustomRangeFrom, boundsForCustomRangeTo } from '../../utils/datePickerBounds';
import { DateField } from '../../components/DateField';
import { useTranslation } from 'react-i18next';
import { tableRowHover } from '../../utils/surfaceClasses';
import { AdminListSkeleton, AdminTableRowsSkeleton, SummaryCardSkeleton } from '../../components/LoadingSkeletons';

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

const PAYMENT_METHOD_LABEL_KEYS = {
  Cash: 'paymentMethod.cash',
  Card: 'paymentMethod.card',
  'Bank Transfer': 'paymentMethod.bankTransfer',
};

function paymentMethodLabel(method, t) {
  return PAYMENT_METHOD_LABEL_KEYS[method] ? t(PAYMENT_METHOD_LABEL_KEYS[method]) : method;
}

export default function Revenue() {
  const { t } = useTranslation();
  const { apiFetch, user } = useAuth();
  const { plans, updatePayment, deletePayment, showFlash, refreshSummary, readOnly, getBranchQueryParams, selectedBranchId } = useGym();
  const showBranchColumn = isGymOwner(user?.role) && selectedBranchId === 'all';
  const canManageRevenue = isGymOwner(user?.role) && !readOnly;
  const navigate = useNavigate();

  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({ total: 0, count: 0, average: 0, byMethod: {} });
  const [trendStr, setTrendStr] = useState(null);
  const [unpaidMembers, setUnpaidMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [listLoading, setListLoading] = useState(true);

  const [modalState, setModalState] = useState({ isOpen: false, payment: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('All');
  const [listSort, setListSort] = useState(DEFAULT_REVENUE_SORT);
  const [periodPreset, setPeriodPreset] = useState('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, methodFilter, periodPreset, customStart, customEnd]);

  const displayedPayments = useMemo(
    () => sortOwnerPaymentsList(payments, listSort),
    [payments, listSort],
  );

  const buildQueryParams = useCallback((overrides = {}) => {
    const params = {
      page: overrides.page ?? page,
      limit: overrides.limit ?? PAGE_SIZE,
      search: debouncedSearch,
      method: methodFilter,
      sort: listSort,
    };
    if (periodPreset === 'custom') {
      if (customStart) params.from = customStart;
      if (customEnd) params.to = customEnd;
    } else {
      params.preset = periodPreset;
    }
    return { ...params, ...getBranchQueryParams() };
  }, [page, debouncedSearch, methodFilter, listSort, periodPreset, customStart, customEnd, getBranchQueryParams]);

  const fetchPayments = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await getPayments(apiFetch, buildQueryParams());
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to load payments');
      setPayments((data.items || []).map(mapPaymentFromApi).filter(Boolean));
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      setSummary(data.summary || { total: 0, count: 0, average: 0, byMethod: {} });
      setTrendStr(data.trendPercent ?? null);
      setUnpaidMembers(
        (data.unpaidMembers || []).map((m) => ({
          id: m.id,
          name: m.name,
          status: formatMemberStatusForDisplay(m.status),
          endDate: toDateString(m.end_date),
        }))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setListLoading(false);
    }
  }, [apiFetch, buildQueryParams]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const periodRevenue = summary.total ?? 0;
  const transactionCount = summary.count ?? 0;
  const averagePayment = summary.average ?? 0;
  const byMethod = summary.byMethod ?? {};
  const isTrendPositive = trendStr ? !trendStr.startsWith('-') : true;

  const attentionMembers = unpaidMembers.filter(
    (m) => m.status === 'Expired' || m.status === 'Due Soon'
  ).slice(0, 8);

  const periodPresetConfig = PERIOD_PRESETS.find((p) => p.id === periodPreset);
  const periodLabel = t(periodPresetConfig?.labelKey || 'period.thisMonth');

  const handleUpdatePayment = async (data) => {
    if (!modalState.payment) return;
    setSaving(true);
    setError('');
    try {
      await updatePayment(modalState.payment.id, data);
      setModalState({ isOpen: false, payment: null });
      await Promise.all([fetchPayments(), refreshSummary()]);
      showFlash(t('pages.revenue.paymentUpdated'));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!paymentToDelete) return;
    const id = paymentToDelete.id;
    setPaymentToDelete(null);
    setError('');
    try {
      await deletePayment(id);
      await Promise.all([fetchPayments(), refreshSummary()]);
      showFlash(t('pages.revenue.paymentRemoved'));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleExportCsv = async () => {
    try {
      const res = await getPayments(apiFetch, buildQueryParams({ page: 1, limit: 5000 }));
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Export failed');
      const rows = (data.items || []).map(mapPaymentFromApi).filter(Boolean);
      const header = [exportColumn('date'), exportColumn('member'), exportColumn('amount'), exportColumn('source'), exportColumn('method')].join(',');
      const csvRows = rows.map((p) =>
        `${formatDisplayDate(p.date)},"${(p.memberName || '').replace(/"/g, '""')}",${p.amount.toFixed(2)},${paymentSourceLabel(p.source)},${translatePaymentMethod(p.method)}`
      );
      const label = periodPresetConfig?.id || 'report';
      downloadCsv(`payments-${label.toLowerCase().replace(/\s+/g, '-')}.csv`, [header, ...csvRows].join('\n'));
    } catch (err) {
      setError(err.message);
    }
  };

  const editMemberStub = modalState.payment
    ? [{ id: modalState.payment.memberId, name: modalState.payment.memberName || t('table.member') }]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-app-text-strong sm:text-2xl">{t('pages.revenue.title')}</h1>
          <p className="text-sm text-slate-500">
            {t('pages.revenue.subtitle')}{' '}
            <button
              type="button"
              onClick={() => navigate('/dashboard/members')}
              className="font-medium text-teal-700 hover:text-teal-800 cursor-pointer"
            >
              {t('pages.revenue.enrollLink')}
            </button>
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={transactionCount === 0}
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-app-border-subtle bg-white  dark:bg-app-raised px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-app-text hover:bg-slate-50 dark:hover:bg-app-surface/60 disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          <Download className="h-4 w-4" /> {t('common.exportCsv')}
        </button>
      </div>

      {error && (
        <div className="flex flex-col gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300 sm:flex-row sm:items-center sm:justify-between">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => fetchPayments()}
            className="shrink-0 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-app-border-subtle bg-white  dark:bg-app-raised p-4 shadow-sm flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="text-sm font-medium text-slate-700 dark:text-app-text">{t('period.reportPeriod')}</label>
          <select
            className="rounded-lg border border-slate-200 dark:border-app-border-subtle bg-white  dark:bg-app-raised px-3 py-2 text-sm text-slate-700 dark:text-app-text focus:border-teal-600 focus:outline-none cursor-pointer"
            value={periodPreset}
            onChange={(e) => setPeriodPreset(e.target.value)}
          >
            {PERIOD_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{t(p.labelKey)}</option>
            ))}
          </select>
        </div>
        {periodPreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-2">
            <DateField
              className="rounded-lg border border-slate-200 dark:border-app-border-subtle px-3 py-2 text-sm"
              value={customStart}
              onChange={setCustomStart}
              max={boundsForCustomRangeFrom(customEnd).max}
            />
            <span className="text-slate-400">{t('common.to')}</span>
            <DateField
              className="rounded-lg border border-slate-200 dark:border-app-border-subtle px-3 py-2 text-sm"
              value={customEnd}
              onChange={setCustomEnd}
              min={boundsForCustomRangeTo(customStart).min}
              max={boundsForCustomRangeTo(customStart).max}
            />
          </div>
        )}
      </div>

      {attentionMembers.length > 0 && (
        <div className="admin-alert-amber">
          <div className="mb-3 flex items-center gap-2">
            <UserX className="admin-alert-amber-icon" />
            <h3 className="admin-alert-amber-title text-sm font-semibold">
              {t('pages.revenue.attentionTitle', { period: periodLabel })}
            </h3>
          </div>
          <p className="admin-alert-amber-body mb-3 text-xs">
            {t('pages.revenue.attentionBody')}
          </p>
          <ul className="space-y-2">
            {attentionMembers.map((member) => (
              <li key={member.id} className="admin-alert-amber-item sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
                <span className="min-w-0 truncate font-medium text-slate-900 dark:text-app-text-strong">{member.name}</span>
                <StatusBadge status={member.status} />
                <span className="text-xs text-slate-500 dark:text-app-muted">{t('pages.revenue.endsOn', { date: formatDisplayDate(member.endDate) })}</span>
                <button
                  type="button"
                  onClick={() =>
                    navigate('/dashboard/members', {
                      state: { memberId: member.id, action: 'payment' },
                    })
                  }
                  className="inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 cursor-pointer sm:justify-self-end"
                >
                  <CircleDollarSign className="h-3.5 w-3.5 shrink-0" /> {t('actions.collectPayment')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {listLoading && payments.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => <SummaryCardSkeleton key={i} />)
        ) : (
          <>
        <div className="rounded-xl border border-slate-200 dark:border-app-border-subtle bg-white  dark:bg-app-raised p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">{t('pages.revenue.periodRevenue', { period: periodLabel })}</span>
            <span className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-500/12 dark:text-emerald-400">
              <TrendingUp className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline">
            <span className="text-3xl font-bold text-slate-900 dark:text-app-text-strong">
              ${periodRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {trendStr && (
              <span className={`ml-2 text-xs font-semibold flex items-center ${isTrendPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                <ArrowUpRight className="h-3 w-3 mr-0.5" /> {trendStr}
              </span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-app-border-subtle bg-white  dark:bg-app-raised p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">{t('metrics.transactions')}</span>
            <span className="rounded-lg bg-teal-50 p-2 text-teal-700 dark:bg-teal-600/12 dark:text-teal-400">
              <CreditCard className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-app-text-strong">{transactionCount}</span>
            <span className="ml-2 text-xs text-slate-400 font-medium">{t('pages.revenue.inSelectedPeriod')}</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-app-border-subtle bg-white  dark:bg-app-raised p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">{t('metrics.averagePayment')}</span>
            <span className="rounded-lg bg-slate-50 p-2 text-slate-600 dark:bg-app-surface dark:text-app-muted">
              <DollarSign className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-app-text-strong">
              ${averagePayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
          </>
        )}
      </div>

      {Object.keys(byMethod).length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-app-border-subtle bg-white dark:bg-app-raised p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-app-text-strong">{t('metrics.revenueByMethod')}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(byMethod).map(([method, amount]) => (
              <div key={method} className="admin-method-chip">
                <p className="text-xs font-medium text-slate-500 dark:text-app-muted">{paymentMethodLabel(method, t)}</p>
                <p className="mt-1 text-lg font-bold text-slate-900 dark:text-app-text-strong">
                  ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 dark:border-app-border-subtle bg-white dark:bg-app-raised p-4 shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="h-5 w-5" />
          </span>
          <input
            type="text"
            className="admin-field block w-full pl-10 pr-4 placeholder-slate-400"
            placeholder={t('pages.revenue.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <select
          className="admin-field min-w-[10rem] cursor-pointer"
          value={listSort}
          onChange={(e) => {
            setPage(1);
            setListSort(e.target.value);
          }}
          aria-label={t('pages.revenue.sortPayments')}
        >
          {REVENUE_SORT_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>{t(opt.labelKey)}</option>
          ))}
        </select>

        <select
          className="admin-field min-w-[10rem] cursor-pointer"
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
        >
          <option value="All">{t('filters.allMethods')}</option>
          <option value="Cash">{t('paymentMethod.cash')}</option>
          <option value="Card">{t('paymentMethod.card')}</option>
          <option value="Bank Transfer">{t('paymentMethod.bankTransfer')}</option>
        </select>
        </div>
      </div>

      {canManageRevenue && (
        <p className="text-xs text-slate-400 -mt-2">
          {t('pages.revenue.editDeleteHint')}
        </p>
      )}
      <div className="rounded-xl border border-slate-200 dark:border-app-border-subtle bg-white  dark:bg-app-raised shadow-sm overflow-hidden">
        <div className="lg:hidden divide-y divide-slate-100 dark:divide-app-border-subtle">
          {listLoading ? (
            <AdminListSkeleton rows={5} />
          ) : displayedPayments.length > 0 ? (
            displayedPayments.map((payment) => (
              <div key={payment.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-app-text-strong">{payment.memberName || t('pages.revenue.unknownMember')}</p>
                    {showBranchColumn && payment.branchName && (
                      <p className="text-xs text-slate-400">{payment.branchName}</p>
                    )}
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      {formatDisplayDate(payment.date)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold border ${paymentSourceStyle(payment.source)}`}
                      >
                        {paymentSourceLabel(payment.source)}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold border ${paymentMethodStyle(payment.method)}`}
                      >
                        {paymentMethodLabel(payment.method, t)}
                      </span>
                    </div>
                  </div>
                  <p className="shrink-0 text-lg font-bold text-slate-900 dark:text-app-text-strong">
                    ${payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                {canManageRevenue && (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setModalState({ isOpen: true, payment });
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-app-border-subtle px-3 py-2 text-xs font-medium text-slate-700 dark:text-app-text active:bg-slate-50 dark:active:bg-app-surface/60"
                    >
                      <Edit className="h-3.5 w-3.5" /> {t('common.edit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentToDelete(payment)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-medium text-rose-600 active:bg-rose-50 dark:active:bg-rose-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> {t('common.delete')}
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="py-16 text-center text-sm font-medium text-slate-400">
              {t('pages.revenue.empty')}
            </p>
          )}
        </div>

        <div className="hidden lg:block overflow-x-auto">
          <table className="admin-data-table admin-payments-table min-w-[720px]">
            <thead>
              <tr>
                <th>{t('table.member')}</th>
                {showBranchColumn && <th>{t('table.branch')}</th>}
                <th>{t('pages.revenue.paymentDate')}</th>
                <th>{t('table.source')}</th>
                <th>{t('table.method')}</th>
                <th>{t('pages.revenue.amountReceived')}</th>
                {canManageRevenue && <th className="text-right">{t('table.actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {listLoading ? (
                <AdminTableRowsSkeleton
                  rows={5}
                  cols={showBranchColumn ? (canManageRevenue ? 7 : 6) : (canManageRevenue ? 6 : 5)}
                />
              ) : displayedPayments.length > 0 ? (
                displayedPayments.map((payment) => (
                  <tr key={payment.id} className={tableRowHover}>
                    <td className="truncate font-semibold text-slate-900 dark:text-app-text-strong">{payment.memberName || t('pages.revenue.unknownMember')}</td>
                    {showBranchColumn && (
                      <td className="truncate text-slate-600 dark:text-app-text">{payment.branchName || '—'}</td>
                    )}
                    <td className="whitespace-nowrap text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                        {formatDisplayDate(payment.date)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold border ${paymentSourceStyle(payment.source)}`}
                      >
                        {paymentSourceLabel(payment.source)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold border ${paymentMethodStyle(payment.method)}`}
                      >
                        {paymentMethodLabel(payment.method, t)}
                      </span>
                    </td>
                    <td className="font-bold whitespace-nowrap text-slate-900 dark:text-app-text-strong">
                      ${payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    {canManageRevenue && (
                    <td>
                      <div className="admin-row-actions">
                          <button
                            onClick={() => {
                              setError('');
                              setModalState({ isOpen: true, payment });
                            }}
                            className="text-slate-400 hover:bg-slate-100 hover:text-teal-700 dark:hover:bg-app-surface/80 cursor-pointer"
                            title={t('pages.revenue.editTransaction')}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setPaymentToDelete(payment)}
                            className="text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-app-surface/80 cursor-pointer"
                            title={t('pages.revenue.deleteTransaction')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                      </div>
                    </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={showBranchColumn ? (canManageRevenue ? 7 : 6) : (canManageRevenue ? 6 : 5)} className="admin-panel-empty">
                    {t('pages.revenue.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls
          page={page}
          totalPages={totalPages}
          total={total}
          limit={PAGE_SIZE}
          onPageChange={setPage}
          disabled={listLoading}
        />
      </div>

      {canManageRevenue && modalState.payment && (
        <PaymentModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState({ isOpen: false, payment: null })}
          onSubmit={handleUpdatePayment}
          members={editMemberStub}
          plans={plans}
          payment={modalState.payment}
          saving={saving}
          error={error}
        />
      )}

      <ConfirmDialog
        isOpen={!!paymentToDelete}
        title={t('pages.revenue.deleteTitle')}
        message={t('pages.revenue.deleteMessage')}
        confirmText={t('common.delete')}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPaymentToDelete(null)}
      />
    </div>
  );
}
