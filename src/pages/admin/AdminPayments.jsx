// src/pages/admin/AdminPayments.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  DollarSign,
  Search,
  ArrowUpRight,
  TrendingUp,
  Calendar,
  Building2,
  AlertCircle,
  RefreshCw,
  Trash2,
  Download,
  Edit,
  CircleDollarSign,
} from 'lucide-react';
import { parseApiResponse } from '../../utils/api';
import { formatMoney } from '../../utils/formatMoney';
import { runInBackground } from '../../utils/runInBackground';
import { toDateString, formatDisplayDate } from '../../utils/date';
import { DateField } from '../../components/DateField';
import { boundsForCustomRangeFrom, boundsForCustomRangeTo } from '../../utils/datePickerBounds';
import { paymentSourceLabel, paymentSourceStyle } from '../../utils/paymentSources';
import PaymentMethodBadge from '../../components/PaymentMethodBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import InitialsAvatar from '../../components/InitialsAvatar';
import AdminPaymentModal from '../../components/AdminPaymentModal';
import PaginationControls from '../../components/PaginationControls';
import { DEFAULT_PAGE_SIZE } from '../../utils/pagination';
import { PERIOD_PRESETS, saasPaymentsToCsv, downloadCsv } from '../../utils/saasPaymentReport';
import { DEFAULT_REVENUE_SORT, REVENUE_SORT_OPTIONS, sortAdminPaymentsList } from '../../utils/listSort';
import { getSaasPayments, updateSaasPayment, getGyms, collectGymPayment } from '../../services/gymAdminService';
import { getSaasPlans } from '../../services/saasPlanService';
import { mapGymFromApi } from '../../utils/apiMappers';
import { useTranslation } from 'react-i18next';
import { PAYMENT_METHOD_OPTIONS } from '../../i18n/helpers';
import { AdminTableRowsSkeleton, AdminListSkeleton, SummaryCardSkeleton } from '../../components/LoadingSkeletons';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { selectSurface } from '../../utils/surfaceClasses';

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

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

  const filteredPayments = sortedPayments.filter((p) => methodFilter === 'All' || p.method === methodFilter);

  const gymOptions = gyms.length > 0
    ? gyms.map((g) => [g.id, g.name])
    : [...new Map(payments.map((p) => [p.gymId, p.gymName])).entries()];

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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-app-text-strong">{t('admin.paymentsTitle')}</h1>
          <p className="text-sm text-app-muted">
            {t('admin.paymentsSubtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Button variant="secondary" onClick={fetchPayments}>
            <RefreshCw className="h-4 w-4 shrink-0" /> {t('common.refresh')}
          </Button>
          <Button variant="secondary" onClick={handleExportCsv} disabled={transactionCount === 0}>
            <Download className="h-4 w-4 shrink-0" /> {t('common.exportCsv')}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex flex-col gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300 sm:flex-row sm:items-center sm:justify-between">
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchPayments}
            className="shrink-0 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="text-sm font-medium text-app-text">{t('period.reportPeriod')}</label>
          <select
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
      </Card>

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

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        {initialLoading ? (
          Array.from({ length: 3 }).map((_, i) => <SummaryCardSkeleton key={i} />)
        ) : (
        <>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-app-muted">{t('metrics.periodRevenue', { period: periodLabel })}</span>
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-app-text-strong">
            {formatMoney(periodRevenue)}
          </p>
        </Card>
        <Card className="p-6">
          <span className="text-sm font-medium text-app-muted">{t('metrics.transactions')}</span>
          <p className="mt-2 text-3xl font-bold text-app-text-strong">{transactionCount}</p>
        </Card>
        <Card className="p-6">
          <span className="text-sm font-medium text-app-muted">{t('metrics.averagePayment')}</span>
          <p className="mt-2 text-3xl font-bold text-app-text-strong">
            {formatMoney(averagePayment)}
          </p>
        </Card>
        </>
        )}
      </div>

      {!initialLoading && Object.keys(byMethod).length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-app-text-strong">{t('metrics.revenueByMethod')}</h3>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            {Object.entries(byMethod)
              .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
              .map(([method, amount]) => (
              <div key={method} className="admin-method-chip">
                <PaymentMethodBadge method={method} />
                <p className="mt-2 text-lg font-bold text-app-text-strong">
                  {formatMoney(amount)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <p className="text-xs text-app-muted -mt-2">{t('admin.paymentsEditHint')}</p>

      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-app-muted" />
          <input
            type="text"
            className="admin-field block w-full pl-10 pr-4 placeholder:text-app-muted"
            placeholder={t('admin.searchByGym')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <select
          className={`ui-select ${selectSurface} min-w-[10rem] cursor-pointer`}
          value={gymSort}
          onChange={(e) => {
            setPage(1);
            setGymSort(e.target.value);
          }}
          aria-label={t('aria.sortByGymName')}
        >
          {REVENUE_SORT_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>{t(opt.labelKey)}</option>
          ))}
        </select>
        <select className={`ui-select ${selectSurface} min-w-[10rem] cursor-pointer`} value={gymFilter} onChange={(e) => setGymFilter(e.target.value)}>
          <option value="All">{t('filters.allGyms')}</option>
          {gymOptions.map(([id, name]) => (
            <option key={id} value={String(id)}>{name}</option>
          ))}
        </select>
        <select className={`ui-select ${selectSurface} min-w-[10rem] cursor-pointer`} value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
          <option value="All">{t('filters.allMethods')}</option>
          {PAYMENT_METHOD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
          ))}
        </select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="lg:hidden divide-y divide-app-border-subtle">
          {initialLoading ? (
            <AdminListSkeleton rows={6} />
          ) : filteredPayments.length > 0 ? (
            filteredPayments.map((payment) => (
              <div key={payment.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-app-text-strong">{payment.gymName}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-app-muted">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      {formatDate(payment.date)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold border ${paymentSourceStyle(payment.source)}`}
                      >
                        {paymentSourceLabel(payment.source)}
                      </span>
                      <PaymentMethodBadge method={payment.method} />
                    </div>
                    {payment.planName && (
                      <p className="mt-1 text-sm font-semibold text-teal-700">{payment.planName}</p>
                    )}
                    {payment.notes && <p className="mt-0.5 text-xs text-app-muted">{payment.notes}</p>}
                  </div>
                  <p className="shrink-0 text-lg font-bold text-app-text-strong">
                    {formatMoney(payment.amount)}
                  </p>
                </div>
                <div className="admin-row-actions mt-3">
                  <button
                    type="button"
                    onClick={() => setEditState({ isOpen: true, payment, error: '' })}
                    className="text-app-muted hover:bg-app-surface/80 hover:text-teal-700 cursor-pointer"
                    title={t('common.edit')}
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentToDelete(payment)}
                    className="text-app-muted hover:bg-app-surface/80 hover:text-rose-600 cursor-pointer"
                    title={t('common.delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-16 text-center text-app-muted">
              <AlertCircle className="mx-auto mb-2 h-8 w-8 text-app-muted/40" />
              <p className="text-sm font-medium">{t('admin.noTransactions')}</p>
            </div>
          )}
        </div>

        <div className="hidden lg:block overflow-x-auto">
          <table className="admin-data-table admin-payments-table min-w-[800px]">
            <thead>
              <tr>
                <th>{t('table.gym')}</th>
                <th>{t('table.date')}</th>
                <th>{t('table.source')}</th>
                <th>{t('table.method')}</th>
                <th>{t('admin.planNotes')}</th>
                <th>{t('table.amount')}</th>
                <th className="text-right">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {initialLoading ? (
                <AdminTableRowsSkeleton rows={8} cols={7} />
              ) : filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-app-surface/60">
                    <td className="font-semibold text-app-text-strong">
                      <span className="inline-flex items-center gap-1.5 min-w-0">
                        <Building2 className="h-4 w-4 shrink-0 text-app-muted" />
                        <span className="truncate">{payment.gymName}</span>
                      </span>
                    </td>
                    <td className="text-app-muted">
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                        <Calendar className="h-4 w-4 shrink-0 text-app-muted" />
                        {formatDate(payment.date)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold border ${paymentSourceStyle(payment.source)}`}
                      >
                        {paymentSourceLabel(payment.source)}
                      </span>
                    </td>
                    <td>
                      <PaymentMethodBadge method={payment.method} />
                    </td>
                    <td>
                      {payment.planName && <div className="truncate font-semibold text-teal-700">{payment.planName}</div>}
                      {payment.notes && <div className="truncate text-xs text-app-muted">{payment.notes}</div>}
                    </td>
                    <td className="font-bold whitespace-nowrap">{formatMoney(payment.amount)}</td>
                    <td>
                      <div className="admin-row-actions">
                      <button
                        type="button"
                        onClick={() => setEditState({ isOpen: true, payment, error: '' })}
                        className="text-app-muted hover:bg-app-surface hover:text-teal-700 cursor-pointer"
                        title={t('admin.editPaymentTitle')}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentToDelete(payment)}
                        className="text-app-muted hover:bg-app-surface hover:text-rose-600 cursor-pointer"
                        title={t('admin.deletePaymentCorrection')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-16 text-app-muted">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-app-muted/40" />
                    {t('admin.noTransactions')}
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
          disabled={loading}
        />
      </Card>

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
