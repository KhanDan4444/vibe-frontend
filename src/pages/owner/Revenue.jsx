// src/pages/owner/Revenue.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useGym } from '../../context/GymContext';
import { isGymOwner } from '../../utils/roles';
import { Search, CreditCard, Calendar, Trash2, Edit, Download, CircleDollarSign, UserX } from 'lucide-react';
import PaymentModal from '../../components/PaymentModal';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import MetricCard, { MetricCardSkeleton } from '../../components/MetricCard';
import { DEFAULT_PAGE_SIZE } from '../../utils/pagination';
import PaginationControls from '../../components/PaginationControls';
import { PERIOD_PRESETS, downloadCsv } from '../../utils/paymentReport';
import { parseApiResponse } from '../../utils/api';
import { runInBackground } from '../../utils/runInBackground';
import { mapPaymentFromApi } from '../../utils/apiMappers';
import { paymentSourceLabel, paymentSourceStyle } from '../../utils/paymentSources';
import PaymentMethodBadge from '../../components/PaymentMethodBadge';
import { exportColumn, translatePaymentMethod } from '../../i18n/helpers';
import { getPayments } from '../../services/paymentService';
import { DEFAULT_REVENUE_SORT, REVENUE_SORT_OPTIONS, sortOwnerPaymentsList } from '../../utils/listSort';
import StatusBadge from '../../components/StatusBadge';
import { formatMemberStatusForDisplay } from '../../utils/memberStatus';
import { formatMoney, formatMoneyShort } from '../../utils/formatMoney';
import { formatTrendForDisplay } from '../../utils/trendDisplay';
import { toDateString, formatDisplayDate } from '../../utils/date';
import { boundsForCustomRangeFrom, boundsForCustomRangeTo } from '../../utils/datePickerBounds';
import { DateField } from '../../components/DateField';
import { useTranslation } from 'react-i18next';
import { flashFromKey } from '../../i18n/flashToast';
import { scheduleDeleteWithUndo } from '../../utils/scheduleWithUndo';
import { tableRowHover, selectSurface, iconActionIdle, iconActionDanger, headingText } from '../../utils/surfaceClasses';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ErrorRetryBanner from '../../components/ErrorRetryBanner';
import { AdminListSkeleton, AdminTableRowsSkeleton } from '../../components/LoadingSkeletons';

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

export default function Revenue() {
  const { t } = useTranslation();
  const { apiFetch, user } = useAuth();
  const { plans, updatePayment, deletePayment, showFlash, refreshSummary, readOnly, getBranchQueryParams, selectedBranchId, branches } = useGym();
  const activeBranchCount = branches.filter((b) => b.is_active !== false).length;
  const showBranchColumn = isGymOwner(user?.role) && selectedBranchId === 'all' && activeBranchCount > 1;
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
  const [pendingDeleteIds, setPendingDeleteIds] = useState(() => new Set());
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
    () => sortOwnerPaymentsList(payments.filter((p) => !pendingDeleteIds.has(p.id)), listSort),
    [payments, listSort, pendingDeleteIds],
  );

  const hidePaymentPending = useCallback((id) => {
    setPendingDeleteIds((prev) => new Set(prev).add(id));
  }, []);

  const restorePaymentPending = useCallback((id) => {
    setPendingDeleteIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

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
      if (!res.ok) throw new Error(data.error || t('errors.loadPayments'));
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

  const methodRows = useMemo(() => {
    const entries = Object.entries(byMethod).map(([method, amount]) => ({
      method,
      amount: Number(amount) || 0,
    }));
    const methodTotal = entries.reduce((sum, row) => sum + row.amount, 0);
    const base = methodTotal > 0 ? methodTotal : periodRevenue;
    return entries
      .sort((a, b) => b.amount - a.amount)
      .map((row) => ({
        ...row,
        percent: base > 0 ? Math.round((row.amount / base) * 100) : 0,
      }));
  }, [byMethod, periodRevenue]);

  const statusLine = t('pages.revenue.statusLineEmpty', {
    revenue: formatMoneyShort(periodRevenue),
    count: transactionCount,
  });
  const trendDisplay = formatTrendForDisplay(trendStr);

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
      showFlash(flashFromKey(t, 'paymentUpdated'));
      runInBackground(Promise.all([fetchPayments(), refreshSummary()]));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!paymentToDelete) return;
    const id = paymentToDelete.id;
    setPaymentToDelete(null);
    setError('');
    hidePaymentPending(id);
    scheduleDeleteWithUndo({
      showFlash,
      t,
      pendingKey: 'paymentDeletePending',
      cancelledKey: 'paymentDeleteCancelled',
      committedKey: 'paymentDeleted',
      onUndo: () => restorePaymentPending(id),
      onCommit: async () => {
        await deletePayment(id);
        restorePaymentPending(id);
        runInBackground(Promise.all([fetchPayments(), refreshSummary()]));
      },
    });
  };

  const handleExportCsv = async () => {
    try {
      const res = await getPayments(apiFetch, buildQueryParams({ page: 1, limit: 5000 }));
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || t('errors.exportFailed'));
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
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={t('pages.revenue.title')}
        subtitle={statusLine}
        actions={
          <Button variant="secondary" onClick={handleExportCsv} disabled={transactionCount === 0}>
            <Download className="h-4 w-4" /> {t('common.exportCsv')}
          </Button>
        }
      />

      {error ? <ErrorRetryBanner message={error} onRetry={() => fetchPayments()} /> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-app-muted" htmlFor="revenue-period">
            {t('period.reportPeriod')}
          </label>
          <select
            id="revenue-period"
            className={`ui-select ${selectSurface}`}
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
              className="rounded-lg border border-app-border-subtle px-3 py-2 text-sm"
              value={customStart}
              onChange={setCustomStart}
              max={boundsForCustomRangeFrom(customEnd).max}
            />
            <span className="text-app-muted">{t('common.to')}</span>
            <DateField
              className="rounded-lg border border-app-border-subtle px-3 py-2 text-sm"
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
                <span className="min-w-0 truncate font-medium text-app-text-strong">{member.name}</span>
                <StatusBadge status={member.status} />
                <span className="text-xs text-app-muted">{t('pages.revenue.endsOn', { date: formatDisplayDate(member.endDate) })}</span>
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

      <div className="app-metric-grid grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {listLoading && payments.length === 0 ? (
          <>
            <MetricCardSkeleton variant="emphasis" className="col-span-2" />
            <MetricCardSkeleton variant="dense" />
            <MetricCardSkeleton variant="dense" />
          </>
        ) : (
          <>
            <MetricCard
              className="col-span-2"
              variant="emphasis"
              label={t('pages.revenue.periodRevenue', { period: periodLabel })}
              value={formatMoneyShort(periodRevenue)}
              color="slate"
              trend={trendDisplay.label}
              trendCaption={
                trendDisplay.extreme
                  ? t('pages.revenue.trendThinBaseline')
                  : trendDisplay.label
                    ? t('metrics.vsLastMonth')
                    : null
              }
            />
            <MetricCard
              variant="dense"
              label={t('metrics.transactions')}
              value={transactionCount}
              color="slate"
            />
            <MetricCard
              variant="dense"
              label={t('metrics.averagePayment')}
              value={formatMoneyShort(averagePayment)}
              color="slate"
            />
          </>
        )}
      </div>

      {methodRows.length > 0 && (
        <div className="max-w-xl space-y-2.5 px-0.5">
          <h3 className="text-xs font-medium uppercase tracking-wide text-app-muted">
            {t('metrics.revenueByMethod')}
          </h3>
          <div className="space-y-2">
            {methodRows.map((row, index) => (
              <div key={row.method} className="flex items-center gap-3">
                <PaymentMethodBadge method={row.method} className="w-[9.25rem] shrink-0 justify-start" />
                <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-app-border-subtle">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      index === 0
                        ? 'bg-teal-700/70 dark:bg-teal-400/55'
                        : 'bg-teal-700/28 dark:bg-teal-400/22'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(row.percent, row.amount > 0 ? 2 : 0))}%` }}
                  />
                </div>
                <div className="flex w-[6.5rem] shrink-0 flex-col items-end leading-tight sm:w-28 sm:flex-row sm:items-baseline sm:justify-end sm:gap-1.5">
                  <span className="text-xs text-app-muted">{row.percent}%</span>
                  <span className="text-sm font-semibold text-app-text">
                    {formatMoneyShort(row.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-app-muted">
            <Search className="h-5 w-5" />
          </span>
          <input
            type="text"
            className="admin-field block w-full pl-10 pr-4 placeholder:text-app-muted"
            placeholder={t('pages.revenue.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <select
          className={`ui-select ${selectSurface} min-w-[10rem]`}
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
          className={`ui-select ${selectSurface} min-w-[10rem]`}
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
        >
          <option value="All">{t('filters.allMethods')}</option>
          <option value="Cash">{t('paymentMethod.cash')}</option>
          <option value="Card">{t('paymentMethod.card')}</option>
          <option value="Bank Transfer">{t('paymentMethod.bankTransfer')}</option>
        </select>
        </div>
      </Card>

      {canManageRevenue && (
        <p className="text-xs text-app-muted -mt-2">
          {t('pages.revenue.editDeleteHint')}
        </p>
      )}
      <Card className="overflow-hidden">
        <div className="lg:hidden divide-y divide-app-border-subtle">
          {listLoading ? (
            <AdminListSkeleton rows={5} />
          ) : displayedPayments.length > 0 ? (
            displayedPayments.map((payment) => (
              <div key={payment.id} className="p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-app-text-strong">{payment.memberName || t('pages.revenue.unknownMember')}</p>
                    {showBranchColumn && payment.branchName && (
                      <p className="text-xs text-app-muted">{payment.branchName}</p>
                    )}
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-app-muted">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        {formatDisplayDate(payment.date)}
                      </span>
                      <span aria-hidden>·</span>
                      <span>{paymentSourceLabel(payment.source)}</span>
                    </p>
                    <div className="mt-1.5">
                      <PaymentMethodBadge method={payment.method} />
                    </div>
                  </div>
                  <p className={`shrink-0 font-display text-base font-bold tracking-tight ${headingText}`}>
                    {formatMoney(payment.amount)}
                  </p>
                </div>
                {canManageRevenue && (
                  <div className="admin-row-actions mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setModalState({ isOpen: true, payment });
                      }}
                      className={iconActionIdle}
                      title={t('pages.revenue.editTransaction')}
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentToDelete(payment)}
                      className={iconActionDanger}
                      title={t('pages.revenue.deleteTransaction')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <EmptyState
              icon={CreditCard}
              compact
              title={t('pages.revenue.emptyTitle')}
              body={t('pages.revenue.emptyBody')}
            />
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
                    <td className="truncate font-semibold text-app-text-strong">{payment.memberName || t('pages.revenue.unknownMember')}</td>
                    {showBranchColumn && (
                      <td className="truncate text-app-text">{payment.branchName || '—'}</td>
                    )}
                    <td className="whitespace-nowrap text-app-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 shrink-0 text-app-muted" />
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
                      <PaymentMethodBadge method={payment.method} />
                    </td>
                    <td className={`whitespace-nowrap font-display text-base font-bold tracking-tight ${headingText}`}>
                      {formatMoney(payment.amount)}
                    </td>
                    {canManageRevenue && (
                    <td>
                      <div className="admin-row-actions">
                          <button
                            onClick={() => {
                              setError('');
                              setModalState({ isOpen: true, payment });
                            }}
                            className={iconActionIdle}
                            title={t('pages.revenue.editTransaction')}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setPaymentToDelete(payment)}
                            className={iconActionDanger}
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
                  <td colSpan={showBranchColumn ? (canManageRevenue ? 7 : 6) : (canManageRevenue ? 6 : 5)} className="p-0">
                    <EmptyState
                      icon={CreditCard}
                      compact
                      title={t('pages.revenue.emptyTitle')}
                      body={t('pages.revenue.emptyBody')}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t px-4 py-3 border-app-border-subtle">
        <PaginationControls
          page={page}
          totalPages={totalPages}
          total={total}
          limit={PAGE_SIZE}
          onPageChange={setPage}
          disabled={listLoading}
        />
        </div>
      </Card>

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
