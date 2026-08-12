// src/pages/admin/AdminPayments.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Calendar,
  Building2,
  AlertCircle,
  Trash2,
  Download,
  Edit,
  CircleDollarSign,
  CreditCard,
  X,
} from 'lucide-react';
import { parseApiResponse } from '../../utils/api';
import { formatMoney, formatMoneyShort } from '../../utils/formatMoney';
import { runInBackground } from '../../utils/runInBackground';
import { toDateString, formatDisplayDate } from '../../utils/date';
import { DateField } from '../../components/DateField';
import { boundsForCustomRangeFrom, boundsForCustomRangeTo } from '../../utils/datePickerBounds';
import { paymentSourceLabel, paymentSourceStyle } from '../../utils/paymentSources';
import PaymentMethodBadge from '../../components/PaymentMethodBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import InitialsAvatar from '../../components/InitialsAvatar';
import AdminPaymentModal from '../../components/AdminPaymentModal';
import PaginationControls from '../../components/PaginationControls';
import MetricCard, { MetricCardSkeleton } from '../../components/MetricCard';
import { DEFAULT_PAGE_SIZE } from '../../utils/pagination';
import { PERIOD_PRESETS, saasPaymentsToCsv, downloadCsv } from '../../utils/saasPaymentReport';
import { PAYMENT_METHOD_COLORS } from '../../utils/reportChartData';
import { DEFAULT_REVENUE_SORT, REVENUE_SORT_OPTIONS, sortAdminPaymentsList } from '../../utils/listSort';
import { getSaasPayments, updateSaasPayment, getGyms, collectGymPayment } from '../../services/gymAdminService';
import { getSaasPlans } from '../../services/saasPlanService';
import { mapGymFromApi } from '../../utils/apiMappers';
import { useTranslation } from 'react-i18next';
import { translatePaymentMethod } from '../../i18n/helpers';
import { AdminTableRowsSkeleton, AdminListSkeleton } from '../../components/LoadingSkeletons';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ErrorRetryBanner from '../../components/ErrorRetryBanner';
import { tableRowHover, headingText, cardSurface, sectionTitle } from '../../utils/surfaceClasses';
import RowMoreMenu from '../../components/RowMoreMenu';
import ToolbarPicker from '../../components/ToolbarPicker';
import SearchField from '../../components/SearchField';

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

function methodShareColor(method) {
  return PAYMENT_METHOD_COLORS[method] || PAYMENT_METHOD_COLORS.Other;
}

function AdminPaymentRowActions({ payment, t, onEdit, onDelete }) {
  return (
    <div className="admin-row-actions">
      <RowMoreMenu
        items={[
          {
            key: 'edit',
            label: t('common.edit'),
            icon: <Edit className="h-4 w-4 shrink-0" />,
            onClick: () => onEdit(payment),
          },
          {
            key: 'delete',
            label: t('common.delete'),
            icon: <Trash2 className="h-4 w-4 shrink-0" />,
            danger: true,
            onClick: () => onDelete(payment),
          },
        ]}
      />
    </div>
  );
}

function mapSaasPayment(p) {
  return {
    id: p.id,
    amount: Number(p.amount),
    date: toDateString(p.date),
    method: p.method,
    notes: p.notes,
    source: p.source || 'collect',
    gymId: p.gym_id,
    gymName: p.gym_name,
    planName: p.plan_name,
  };
}

function termStartForGym(gyms, gymId) {
  const gym = gyms.find((g) => g.id === gymId);
  if (!gym) return null;
  const raw = gym.saas_start_date || gym.saasStartDate;
  return raw ? String(raw).split('T')[0] : null;
}

export default function AdminPayments({ gyms: gymsProp, onCollectPayment, onBootingChange }) {
  const { t } = useTranslation();
  const { apiFetch } = useAuth();

  const [payments, setPayments] = useState([]);
  const [localGyms, setLocalGyms] = useState([]);
  const [saasPlans, setSaasPlans] = useState([]);
  const [summary, setSummary] = useState({ total: 0, count: 0, average: 0, byMethod: {} });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('All');
  const methodFilterRef = useRef(null);
  const [gymSort, setGymSort] = useState(DEFAULT_REVENUE_SORT);
  const [gymFilter, setGymFilter] = useState('All');
  const [periodPreset, setPeriodPreset] = useState('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [editState, setEditState] = useState({ isOpen: false, payment: null, error: '' });
  const [collectState, setCollectState] = useState({ isOpen: false, gym: null, error: '' });
  const [saving, setSaving] = useState(false);

  const gyms = gymsProp ?? localGyms;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (gymsProp) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const [gymsRes, plansRes] = await Promise.all([
          getGyms(apiFetch, { page: 1, limit: 500 }),
          getSaasPlans(apiFetch),
        ]);
        const gymsData = await parseApiResponse(gymsRes);
        const plansData = await parseApiResponse(plansRes);
        if (cancelled) return;
        if (gymsRes.ok) {
          const items = Array.isArray(gymsData) ? gymsData : gymsData.items || [];
          setLocalGyms(items.map(mapGymFromApi));
        }
        if (plansRes.ok && Array.isArray(plansData)) {
          setSaasPlans(plansData.filter((p) => p.is_active !== false));
        }
      } catch {
        /* optional for attention list / collect */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiFetch, gymsProp]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, methodFilter, gymFilter, periodPreset, customStart, customEnd]);

  const sortedPayments = useMemo(
    () => sortAdminPaymentsList(payments, gymSort),
    [payments, gymSort],
  );

  const buildQueryParams = useCallback((overrides = {}) => {
    const params = {
      page: overrides.page ?? page,
      limit: overrides.limit ?? PAGE_SIZE,
      search: debouncedSearch,
      sort: gymSort,
    };
    if (gymFilter !== 'All') params.gym_id = gymFilter;
    if (periodPreset === 'custom') {
      if (customStart) params.from = customStart;
      if (customEnd) params.to = customEnd;
    } else {
      params.preset = periodPreset;
    }
    return params;
  }, [page, debouncedSearch, gymFilter, gymSort, periodPreset, customStart, customEnd]);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getSaasPayments(apiFetch, buildQueryParams());
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to load payments');
      setPayments((data.items || []).map(mapSaasPayment));
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      setSummary(data.summary || { total: 0, count: 0, average: 0, byMethod: {} });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, buildQueryParams]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    onBootingChange?.(loading && payments.length === 0);
  }, [loading, payments.length, onBootingChange]);

  const initialLoading = loading && payments.length === 0;

  const handleConfirmDelete = async () => {
    if (!paymentToDelete) return;
    setError('');
    try {
      const res = await apiFetch(`/admin/payments/${paymentToDelete.id}`, { method: 'DELETE' });
      const resData = await parseApiResponse(res);
      if (!res.ok) throw new Error(resData.error || 'Failed to delete payment');
      runInBackground(fetchPayments());
    } catch (err) {
      setError(err.message);
    } finally {
      setPaymentToDelete(null);
    }
  };

  const handleUpdatePayment = async (formData) => {
    if (!editState.payment) return;
    setSaving(true);
    setEditState((s) => ({ ...s, error: '' }));
    try {
      const res = await updateSaasPayment(apiFetch, editState.payment.id, formData);
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to update payment');
      setEditState({ isOpen: false, payment: null, error: '' });
      runInBackground(fetchPayments());
    } catch (err) {
      setEditState((s) => ({ ...s, error: err.message }));
    } finally {
      setSaving(false);
    }
  };

  const handleCollectSubmit = async (formData) => {
    if (!collectState.gym) return;
    setSaving(true);
    setCollectState((s) => ({ ...s, error: '' }));
    try {
      const res = await collectGymPayment(apiFetch, formData);
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to collect payment');
      setCollectState({ isOpen: false, gym: null, error: '' });
      runInBackground(fetchPayments());
    } catch (err) {
      setCollectState((s) => ({ ...s, error: err.message }));
    } finally {
      setSaving(false);
    }
  };

  const editPaymentWithTerm = editState.payment
    ? {
        ...editState.payment,
        termStart: termStartForGym(gyms, editState.payment.gymId),
      }
    : null;

  const periodRevenue = summary.total ?? 0;
  const transactionCount = summary.count ?? 0;
  const averagePayment = summary.average ?? 0;
  const byMethod = summary.byMethod ?? {};
  const periodPresetMeta = PERIOD_PRESETS.find((p) => p.id === periodPreset);
  const periodLabel = periodPresetMeta ? t(periodPresetMeta.labelKey) : t('period.thisMonth');

  const attentionGyms = useMemo(
    () =>
      gyms
        .filter(
          (g) =>
            g.isUnpaid &&
            g.subscription_status?.toLowerCase() === 'active',
        )
        .slice(0, 8),
    [gyms],
  );

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

  const filteredPayments = sortedPayments.filter((p) => methodFilter === 'All' || p.method === methodFilter);

  const gymOptions = gyms.length > 0
    ? gyms.map((g) => [g.id, g.name])
    : [...new Map(payments.map((p) => [p.gymId, p.gymName])).entries()];

  const statusLine = t('admin.statusLineEmpty', {
    revenue: formatMoneyShort(periodRevenue),
    count: transactionCount,
  });

  const handleExportCsv = async () => {
    try {
      const res = await getSaasPayments(apiFetch, buildQueryParams({ page: 1, limit: 5000 }));
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Export failed');
      const rows = (data.items || []).map(mapSaasPayment);
      const csv = saasPaymentsToCsv(rows);
      const label = periodPreset;
      downloadCsv(`platform-revenue-${label}.csv`, csv);
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateStr) => formatDisplayDate(dateStr);

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={t('admin.paymentsTitle')}
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

      {error ? <ErrorRetryBanner message={error} onRetry={fetchPayments} /> : null}

      {attentionGyms.length > 0 && (
        <div className="admin-alert-amber">
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle className="admin-alert-amber-icon" />
            <h3 className="admin-alert-amber-title text-sm font-semibold">
              {t('admin.unpaidLicensesBanner')}
            </h3>
          </div>
          <p className="admin-alert-amber-body mb-3 text-xs">
            {t('admin.unpaidLicensesBody')}
          </p>
          <ul className="space-y-2">
            {attentionGyms.map((gym) => (
              <li key={gym.id} className="admin-alert-amber-item">
                <div className="flex min-w-0 items-center gap-2.5">
                  <InitialsAvatar name={gym.name} size="sm" />
                  <span className="min-w-0 truncate font-medium text-app-text-strong">{gym.name}</span>
                </div>
                <span className="text-xs leading-snug text-app-muted sm:text-right">
                  {gym.subscription_status}
                  {gym.saasEndDate ? t('admin.endsOn', { date: formatDisplayDate(gym.saasEndDate) }) : ''}
                </span>
                {(onCollectPayment || !gymsProp) && (
                  <button
                    type="button"
                    onClick={() =>
                      onCollectPayment
                        ? onCollectPayment(gym)
                        : setCollectState({ isOpen: true, gym, error: '' })
                    }
                    className="inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 cursor-pointer sm:justify-self-end"
                  >
                    <CircleDollarSign className="h-3.5 w-3.5 shrink-0" /> {t('actions.collectPayment')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="app-metric-grid grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {initialLoading ? (
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
              label={t('metrics.periodRevenue', { period: periodLabel })}
              value={formatMoneyShort(periodRevenue)}
              color="slate"
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
              <p className="text-xs text-app-muted">{t('admin.methodFilterTip')}</p>
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
              {t('admin.paymentHistory')}
            </h3>
            {!loading && (
              <p className="text-xs text-app-muted">
                {t('admin.paymentHistoryCount', { count: total })}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t('admin.searchByGym')}
            />
            <ToolbarPicker
              value={gymSort}
              onChange={(id) => {
                setPage(1);
                setGymSort(id);
              }}
              options={REVENUE_SORT_OPTIONS}
              label={t('aria.sortByGymName')}
            />
            <ToolbarPicker
              value={String(gymFilter)}
              onChange={setGymFilter}
              options={[
                { id: 'All', label: t('filters.allGyms') },
                ...gymOptions.map(([id, name]) => ({ id: String(id), label: name })),
              ]}
              label={t('filters.allGyms')}
            />
          </div>
          <p className="text-xs text-app-muted">{t('admin.paymentsEditHint')}</p>
        </div>
      </Card>

      <div className="lg:hidden space-y-3">
        {initialLoading ? (
          <Card className="overflow-hidden">
            <AdminListSkeleton rows={6} />
          </Card>
        ) : filteredPayments.length > 0 ? (
          filteredPayments.map((payment) => (
            <div key={payment.id} className={`${cardSurface} p-3.5`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-app-text-strong">{payment.gymName}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-app-muted">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    {formatDate(payment.date)}
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
                  {payment.planName && (
                    <p className="mt-1 text-sm font-semibold text-teal-700">{payment.planName}</p>
                  )}
                  {payment.notes && <p className="mt-0.5 text-xs text-app-muted">{payment.notes}</p>}
                </div>
                <p className={`shrink-0 font-display text-lg font-bold tracking-tight ${headingText}`}>
                  {formatMoney(payment.amount)}
                </p>
              </div>
              <div className="mt-2">
                <AdminPaymentRowActions
                  payment={payment}
                  t={t}
                  onEdit={(row) => setEditState({ isOpen: true, payment: row, error: '' })}
                  onDelete={setPaymentToDelete}
                />
              </div>
            </div>
          ))
        ) : (
          <div className={cardSurface}>
            <EmptyState
              icon={CreditCard}
              compact
              title={t('admin.emptyTitle')}
              body={t('admin.emptyBody')}
            />
          </div>
        )}
      </div>

      <Card className="hidden overflow-hidden lg:block">
        <div className="overflow-x-auto">
          <table className="admin-data-table admin-payments-table min-w-[800px]">
            <thead>
              <tr>
                <th>{t('table.gym')}</th>
                <th>{t('table.date')}</th>
                <th>{t('table.source')}</th>
                <th>{t('table.method')}</th>
                <th>{t('admin.planNotes')}</th>
                <th className="text-right">{t('table.amount')}</th>
                <th className="text-right">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {initialLoading ? (
                <AdminTableRowsSkeleton rows={8} cols={7} />
              ) : filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className={tableRowHover}>
                    <td className="font-semibold text-app-text-strong">
                      <span className="inline-flex items-center gap-1.5 min-w-0">
                        <Building2 className="h-4 w-4 shrink-0 text-app-muted" />
                        <span className="truncate">{payment.gymName}</span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-app-muted">
                      {formatDate(payment.date)}
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold border ${paymentSourceStyle(payment.source)}`}
                      >
                        {paymentSourceLabel(payment.source)}
                      </span>
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
                    <td>
                      {payment.planName && <div className="truncate font-semibold text-teal-700">{payment.planName}</div>}
                      {payment.notes && <div className="truncate text-xs text-app-muted">{payment.notes}</div>}
                    </td>
                    <td className={`whitespace-nowrap text-right font-display text-base font-bold tabular-nums tracking-tight ${headingText}`}>
                      {formatMoney(payment.amount)}
                    </td>
                    <td>
                      <AdminPaymentRowActions
                        payment={payment}
                        t={t}
                        onEdit={(row) => setEditState({ isOpen: true, payment: row, error: '' })}
                        onDelete={setPaymentToDelete}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-0">
                    <EmptyState
                      icon={CreditCard}
                      compact
                      title={t('admin.emptyTitle')}
                      body={t('admin.emptyBody')}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
      </Card>

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

      <AdminPaymentModal
        isOpen={editState.isOpen}
        onClose={() => setEditState({ isOpen: false, payment: null, error: '' })}
        onSubmit={handleUpdatePayment}
        payment={editPaymentWithTerm}
        saving={saving}
        error={editState.error}
      />

      <AdminPaymentModal
        isOpen={collectState.isOpen}
        onClose={() => setCollectState({ isOpen: false, gym: null, error: '' })}
        onSubmit={handleCollectSubmit}
        gym={collectState.gym}
        saasPlans={saasPlans}
        saving={saving}
        error={collectState.error}
      />

      <ConfirmDialog
        isOpen={!!paymentToDelete}
        title={t('admin.revokePaymentTitle')}
        message={t('admin.revokePaymentMessage', {
          amount: Number(paymentToDelete?.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          name: paymentToDelete?.gymName,
        })}
        confirmText={t('admin.revokePaymentConfirm')}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPaymentToDelete(null)}
      />
    </div>
  );
}
