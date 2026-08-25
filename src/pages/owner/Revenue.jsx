// src/pages/owner/Revenue.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useGym } from '../../context/GymContext';
import { isGymOwner } from '../../utils/roles';
import { CreditCard, Calendar, Trash2, Edit, Download, CircleDollarSign, UserX, X } from 'lucide-react';
import PaymentModal from '../../components/PaymentModal';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import MetricCard, { MetricCardSkeleton } from '../../components/MetricCard';
import { DEFAULT_PAGE_SIZE } from '../../utils/pagination';
import PaginationControls from '../../components/PaginationControls';
import { PERIOD_PRESETS, downloadCsv } from '../../utils/paymentReport';
import { PAYMENT_METHOD_COLORS } from '../../utils/reportChartData';
import { comparePaymentMethodOrder } from '../../i18n/helpers';
import { parseApiResponse } from '../../utils/api';
import { runInBackground } from '../../utils/runInBackground';
import { mapPaymentFromApi } from '../../utils/apiMappers';
import { paymentSourceLabel } from '../../utils/paymentSources';
import PaymentMethodBadge from '../../components/PaymentMethodBadge';
import { exportColumn, translatePaymentMethod } from '../../i18n/helpers';
import { getPayments } from '../../services/paymentService';
import { DEFAULT_REVENUE_SORT, REVENUE_SORT_OPTIONS, sortOwnerPaymentsList } from '../../utils/listSort';
import StatusBadge from '../../components/StatusBadge';
import { formatMemberStatusForDisplay } from '../../utils/memberStatus';
import { formatMoney, formatMoneyShort } from '../../utils/formatMoney';
import { formatTrendForDisplay, trendCaptionKeyForPreset, trendThinBaselineKeyForPreset } from '../../utils/trendDisplay';
import { toDateString, formatDisplayDate } from '../../utils/date';
import { boundsForCustomRangeFrom, boundsForCustomRangeTo } from '../../utils/datePickerBounds';
import { DateField } from '../../components/DateField';
import { useTranslation } from 'react-i18next';
import { flashFromKey } from '../../i18n/flashToast';
import { scheduleDeleteWithUndo } from '../../utils/scheduleWithUndo';
import { tableRowHover, headingText, cardSurface, sectionTitle } from '../../utils/surfaceClasses';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import RowMoreMenu from '../../components/RowMoreMenu';
import ToolbarPicker from '../../components/ToolbarPicker';
import SearchField from '../../components/SearchField';
import ErrorRetryBanner from '../../components/ErrorRetryBanner';
import { PaymentCardSkeleton, AdminTableRowsSkeleton } from '../../components/LoadingSkeletons';

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

function methodShareColor(method) {
  return PAYMENT_METHOD_COLORS[method] || PAYMENT_METHOD_COLORS.Other;
}

function RevenuePaymentActions({ payment, t, onEdit, onDelete }) {
  return (
    <div className="admin-row-actions">
      <RowMoreMenu
        items={[
          {
            key: 'edit',
            label: t('pages.revenue.editTransaction'),
            icon: <Edit className="h-4 w-4 shrink-0" />,
            onClick: () => onEdit(payment),
          },
          {
            key: 'delete',
            label: t('pages.revenue.deleteTransaction'),
            icon: <Trash2 className="h-4 w-4 shrink-0" />,
            danger: true,
            onClick: () => onDelete(payment),
          },
        ]}
      />
    </div>
  );
}

export default function Revenue() {
  const { t } = useTranslation();
  const { apiFetch, user } = useAuth();
  const { plans, updatePayment, deletePayment, showFlash, refreshSummary, readOnly, getBranchQueryParams, selectedBranchId, branches, error: gymError } = useGym();
  const activeBranchCount = branches.filter((b) => b.is_active !== false).length;
  const showBranchColumn = isGymOwner(user?.role) && selectedBranchId === 'all' && activeBranchCount > 1;
  const canManageRevenue = isGymOwner(user?.role) && !readOnly;
  const navigate = useNavigate();

  const [payments, setPayments] = useState([]);
  const [periodSummary, setPeriodSummary] = useState({ total: 0, count: 0, average: 0, byMethod: {} });
  const [methodBreakdown, setMethodBreakdown] = useState({});
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
  const methodFilterRef = useRef(null);
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
      search: overrides.search ?? debouncedSearch,
      method: overrides.method ?? methodFilter,
      sort: overrides.sort ?? listSort,
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
    setError('');
    try {
      const listRes = await getPayments(apiFetch, buildQueryParams());
      const listData = await parseApiResponse(listRes);
      if (!listRes.ok) throw new Error(listData.error || t('errors.loadPayments'));

      setPayments((listData.items || []).map(mapPaymentFromApi).filter(Boolean));
      setTotal(listData.total ?? 0);
      setTotalPages(listData.totalPages ?? 1);

      // Hero + method mix always reflect the full period (not the method filter).
      let overview = listData;
      if (methodFilter !== 'All') {
        const overviewRes = await getPayments(
          apiFetch,
          buildQueryParams({ method: 'All', page: 1, limit: 1 }),
        );
        const overviewData = await parseApiResponse(overviewRes);
        if (overviewRes.ok) overview = overviewData;
      }

      setPeriodSummary(overview.summary || { total: 0, count: 0, average: 0, byMethod: {} });
      setTrendStr(overview.trendPercent ?? null);
      setMethodBreakdown(overview.summary?.byMethod || {});
      setUnpaidMembers(
        (overview.unpaidMembers || []).map((m) => ({
          id: m.id,
          name: m.name,
          status: formatMemberStatusForDisplay(m.status),
          endDate: toDateString(m.end_date),
        })),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setListLoading(false);
    }
  }, [apiFetch, buildQueryParams, methodFilter, t]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const periodRevenue = periodSummary.total ?? 0;
  const transactionCount = periodSummary.count ?? 0;
  const averagePayment = periodSummary.average ?? 0;

  const methodRows = useMemo(() => {
    const source = Object.keys(methodBreakdown).length > 0 ? methodBreakdown : periodSummary.byMethod || {};
    const entries = Object.entries(source).map(([method, amount]) => ({
      method,
      amount: Number(amount) || 0,
    }));
    const methodTotal = entries.reduce((sum, row) => sum + row.amount, 0);
    const base = methodTotal > 0 ? methodTotal : periodRevenue;
    return entries
      .sort((a, b) => comparePaymentMethodOrder(a.method, b.method))
      .map((row) => ({
        ...row,
        percent: base > 0 ? Math.round((row.amount / base) * 100) : 0,
      }));
  }, [methodBreakdown, periodSummary.byMethod, periodRevenue]);

  const clearMethodFilter = useCallback(() => {
    setPage(1);
    setMethodFilter('All');
  }, []);

  const toggleMethodFilter = useCallback((method) => {
    setPage(1);
    setMethodFilter((current) => (current === method ? 'All' : method));
  }, []);

  useEffect(() => {
    if (methodFilter === 'All') return undefined;
    const onPointerDown = (event) => {
      if (methodFilterRef.current?.contains(event.target)) return;
      clearMethodFilter();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [methodFilter, clearMethodFilter]);

  const statusLine = t('pages.revenue.statusLineEmpty', {
    revenue: formatMoneyShort(periodRevenue),
    count: transactionCount,
  });
  const trendDisplay = formatTrendForDisplay(trendStr);
  const trendCaption = trendDisplay.extreme
    ? t(trendThinBaselineKeyForPreset(periodPreset))
    : trendDisplay.label
      ? t(trendCaptionKeyForPreset(periodPreset))
      : null;

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
          <div className="flex flex-wrap items-center gap-2">
            <ToolbarPicker
              value={periodPreset}
              onChange={setPeriodPreset}
              options={PERIOD_PRESETS}
              label={t('period.reportPeriod')}
            />
            <Button variant="secondary" onClick={handleExportCsv} disabled={transactionCount === 0}>
              <Download className="h-4 w-4" /> {t('common.exportCsv')}
            </Button>
          </div>
        }
      />

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

      {error && !gymError ? <ErrorRetryBanner message={error} onRetry={() => fetchPayments()} /> : null}

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
              trendCaption={trendDisplay.label ? trendCaption : null}
              hint={trendDisplay.extreme ? trendCaption : undefined}
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
        <div ref={methodFilterRef} className="max-w-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-app-muted">
              {t('metrics.revenueByMethod')}
            </h3>
            {methodFilter === 'All' ? (
              <p className="text-xs text-app-muted">{t('pages.revenue.methodFilterTip')}</p>
            ) : (
              <button
                type="button"
                onClick={clearMethodFilter}
                className="inline-flex items-center gap-1.5 rounded-full border border-teal-600/30 bg-teal-600/10 px-2.5 py-1 text-xs font-semibold text-teal-800 transition-colors hover:bg-teal-600/15 dark:border-teal-400/25 dark:bg-teal-400/10 dark:text-teal-200 dark:hover:bg-teal-400/15"
              >
                <span>{translatePaymentMethod(methodFilter)}</span>
                <span className="font-medium opacity-70">· {t('common.clear')}</span>
                <X className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
              </button>
            )}
          </div>

          <div className="flex h-5 w-full gap-0.5 overflow-hidden rounded-full bg-app-border-subtle sm:h-6">
            {methodRows.map((row) => {
              const selected = methodFilter === row.method;
              const color = methodShareColor(row.method);
              return (
                <button
                  key={`share-${row.method}`}
                  type="button"
                  title={`${translatePaymentMethod(row.method)} ${row.percent}%`}
                  aria-label={`${translatePaymentMethod(row.method)} ${row.percent}%`}
                  aria-pressed={selected}
                  onClick={() => toggleMethodFilter(row.method)}
                  className={`h-full min-w-0 transition-[filter,opacity,box-shadow] hover:brightness-110 ${
                    selected ? 'ring-2 ring-inset ring-white/35 dark:ring-white/25' : ''
                  } ${methodFilter !== 'All' && !selected ? 'opacity-55' : ''}`}
                  style={{
                    flexGrow: Math.max(row.percent, row.amount > 0 ? 1.5 : 0),
                    flexBasis: 0,
                    backgroundColor: color,
                  }}
                />
              );
            })}
          </div>

          <ul className="space-y-0.5">
            {methodRows.map((row) => {
              const selected = methodFilter === row.method;
              const color = methodShareColor(row.method);
              return (
                <li key={row.method}>
                  <button
                    type="button"
                    onClick={() => toggleMethodFilter(row.method)}
                    aria-pressed={selected}
                    className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors ${
                      selected
                        ? 'bg-teal-600/10 ring-1 ring-teal-600/25 dark:bg-teal-400/10 dark:ring-teal-400/20'
                        : 'hover:bg-app-surface'
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />
                    <PaymentMethodBadge
                      method={row.method}
                      quiet
                      className="min-w-0 flex-1"
                    />
                    <span className="shrink-0 text-xs tabular-nums text-app-muted">{row.percent}%</span>
                    <span className="w-[5.5rem] shrink-0 text-right text-sm font-semibold tabular-nums text-app-text sm:w-28">
                      {formatMoneyShort(row.amount)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 p-3 sm:px-4 sm:pt-4 sm:pb-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h3 className={sectionTitle}>
              {t('pages.revenue.paymentHistory')}
            </h3>
            {!listLoading && (
              <p className="text-xs text-app-muted">
                {t('pages.revenue.paymentHistoryCount', { count: total })}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t('pages.revenue.searchPlaceholder')}
            />
            <ToolbarPicker
              value={listSort}
              onChange={(id) => {
                setPage(1);
                setListSort(id);
              }}
              options={REVENUE_SORT_OPTIONS}
              label={t('pages.revenue.sortPayments')}
            />
          </div>
          {canManageRevenue && (
            <p className="text-xs text-app-muted">{t('pages.revenue.editDeleteHint')}</p>
          )}
        </div>
      </Card>

      <div className="lg:hidden space-y-3">
        {listLoading ? (
          <PaymentCardSkeleton rows={5} />
        ) : displayedPayments.length > 0 ? (
          displayedPayments.map((payment) => (
            <div key={payment.id} className={`${cardSurface} p-3.5`}>
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
                  <div className="mt-1.5 flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: methodShareColor(payment.method) }}
                      aria-hidden
                    />
                    <PaymentMethodBadge method={payment.method} quiet />
                  </div>
                </div>
                <p className={`shrink-0 font-display text-lg font-bold tracking-tight ${headingText}`}>
                  {formatMoney(payment.amount)}
                </p>
              </div>
              {canManageRevenue && (
                <div className="mt-2">
                  <RevenuePaymentActions
                    payment={payment}
                    t={t}
                    onEdit={(row) => {
                      setError('');
                      setModalState({ isOpen: true, payment: row });
                    }}
                    onDelete={setPaymentToDelete}
                  />
                </div>
              )}
            </div>
          ))
        ) : (
          <div className={cardSurface}>
            <EmptyState
              icon={CreditCard}
              compact
              title={t('pages.revenue.emptyTitle')}
              body={t('pages.revenue.emptyBody')}
            />
          </div>
        )}
      </div>

      <Card className="hidden overflow-hidden lg:block">
        <div className="overflow-x-auto">
          <table className="admin-data-table admin-payments-table min-w-[720px]">
            <thead>
              <tr>
                <th>{t('table.member')}</th>
                {showBranchColumn && <th>{t('table.branch')}</th>}
                <th>{t('pages.revenue.paymentDate')}</th>
                <th>{t('table.source')}</th>
                <th>{t('table.method')}</th>
                <th className="text-right">{t('pages.revenue.amountReceived')}</th>
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
                      <td className="truncate text-app-muted">{payment.branchName || '—'}</td>
                    )}
                    <td className="whitespace-nowrap text-app-muted">
                      {formatDisplayDate(payment.date)}
                    </td>
                    <td className="text-sm text-app-muted">
                      {paymentSourceLabel(payment.source)}
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: methodShareColor(payment.method) }}
                          aria-hidden
                        />
                        <PaymentMethodBadge method={payment.method} quiet />
                      </span>
                    </td>
                    <td className={`whitespace-nowrap text-right font-display text-base font-bold tabular-nums tracking-tight ${headingText}`}>
                      {formatMoney(payment.amount)}
                    </td>
                    {canManageRevenue && (
                    <td>
                      <RevenuePaymentActions
                        payment={payment}
                        t={t}
                        onEdit={(row) => {
                          setError('');
                          setModalState({ isOpen: true, payment: row });
                        }}
                        onDelete={setPaymentToDelete}
                      />
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
        confirmText={t('pages.revenue.deleteTransaction')}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPaymentToDelete(null)}
      />
    </div>
  );
}
