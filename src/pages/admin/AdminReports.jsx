// src/pages/admin/AdminReports.jsx
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  DollarSign,
  Download,
  FileText,
  RefreshCw,
  Calendar,
  AlertCircle,
  Users,
  FileStack,
} from 'lucide-react';
import { parseApiResponse } from '../../utils/api';
import { getGymReport, getRevenueReport } from '../../services/reportService';
import { PERIOD_PRESETS } from '../../utils/saasPaymentReport';
import { useRevenuePeriodParams } from '../../hooks/useRevenuePeriodParams';
import { DateField } from '../../components/DateField';
import { boundsForCustomRangeFrom, boundsForCustomRangeTo } from '../../utils/datePickerBounds';
import { ChartPanelSkeleton } from '../../components/LoadingSkeletons';
import MetricCard, { MetricCardSkeleton } from '../../components/MetricCard';
import ChartCard from '../../components/reports/ChartCard';
import ReportDonut from '../../components/reports/ReportDonut';
import RevenueBarChart from '../../components/reports/RevenueBarChart';
import RevenueTrendChart from '../../components/reports/RevenueTrendChart';
import {
  downloadGymsCsv,
  downloadGymsPdf,
  downloadRevenueCsv,
  downloadRevenuePdf,
  downloadFullReportCsv,
  downloadFullReportPdf,
  formatMoney,
} from '../../utils/adminReportExport';
import {
  aggregateGymsByStatus,
  aggregateGymsByPlan,
  aggregateGymsPaymentStatus,
  aggregateRevenueByMethod,
  aggregateRevenueByGym,
  aggregateRevenueByDate,
  gymReportStats,
  PAYMENT_METHOD_COLORS,
  PAYMENT_STATUS_COLORS,
  planChartColors,
} from '../../utils/reportChartData';
import { useLatestRequestGuard } from '../../utils/requestGuard';
import { useTranslation } from 'react-i18next';

const GYM_STATUS_FILTERS = [
  { id: 'all', labelKey: 'filters.allGyms', query: {} },
  { id: 'active', labelKey: 'filters.activeOnly', query: { status: 'active' } },
  { id: 'due_soon', labelKey: 'filters.dueSoonOnly', query: { filter: 'due_soon' } },
  { id: 'expired', labelKey: 'filters.expiredSuspended', query: { filter: 'expired' } },
  { id: 'suspended', labelKey: 'status.suspended', query: { status: 'suspended' } },
  { id: 'unpaid', labelKey: 'filters.unpaidActive', query: { filter: 'unpaid' } },
];

const STATUS_COLORS = {
  Active: '#10b981',
  Suspended: '#f43f5e',
  Expired: '#f59e0b',
  Unknown: '#94a3b8',
};

export default function AdminReports({ onBootingChange }) {
  const { t } = useTranslation();
  const { apiFetch } = useAuth();
  const gymReportGuard = useLatestRequestGuard();

  const [gymFilter, setGymFilter] = useState('all');
  const [gyms, setGyms] = useState([]);
  const [gymLoading, setGymLoading] = useState(false);
  const [gymError, setGymError] = useState('');
  const [gymLoaded, setGymLoaded] = useState(false);

  const [periodPreset, setPeriodPreset] = useState('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [payments, setPayments] = useState([]);
  const [revenueSummary, setRevenueSummary] = useState(null);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [revenueError, setRevenueError] = useState('');
  const [revenueLoaded, setRevenueLoaded] = useState(false);

  const [exporting, setExporting] = useState(null);

  const gymFilterMeta = GYM_STATUS_FILTERS.find((f) => f.id === gymFilter) || GYM_STATUS_FILTERS[0];
  const periodPresetMeta = PERIOD_PRESETS.find((p) => p.id === periodPreset);
  const periodLabel = periodPresetMeta ? t(periodPresetMeta.labelKey) : t('period.thisMonth');
  const periodSlug = periodPreset;
  const loading = gymLoading || revenueLoading;
  const canExport = gymLoaded && revenueLoaded && (gyms.length > 0 || payments.length > 0);

  const buildRevenueParams = useRevenuePeriodParams(periodPreset, customStart, customEnd);

  const loadGymReport = useCallback(async () => {
    const requestId = gymReportGuard.start();
    setGymLoading(true);
    setGymError('');
    try {
      const res = await getGymReport(apiFetch, gymFilterMeta.query);
      const data = await parseApiResponse(res);
      if (!gymReportGuard.isLatest(requestId)) return;
      if (!res.ok) throw new Error(data.error || 'Failed to load gym report');
      setGyms(data.gyms || []);
      setGymLoaded(true);
    } catch (err) {
      if (!gymReportGuard.isLatest(requestId)) return;
      setGymError(err.message);
      setGyms([]);
    } finally {
      if (gymReportGuard.isLatest(requestId)) setGymLoading(false);
    }
  }, [apiFetch, gymFilterMeta, gymReportGuard]);

  const loadRevenueReport = useCallback(async () => {
    setRevenueLoading(true);
    setRevenueError('');
    try {
      const res = await getRevenueReport(apiFetch, buildRevenueParams());
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to load revenue report');
      setPayments(data.payments || []);
      setRevenueSummary(data.summary || null);
      setRevenueLoaded(true);
    } catch (err) {
      setRevenueError(err.message);
      setPayments([]);
      setRevenueSummary(null);
    } finally {
      setRevenueLoading(false);
    }
  }, [apiFetch, buildRevenueParams]);

  const refreshAll = useCallback(() => {
    loadGymReport();
    loadRevenueReport();
  }, [loadGymReport, loadRevenueReport]);

  useEffect(() => {
    loadGymReport();
  }, [loadGymReport]);

  useEffect(() => {
    loadRevenueReport();
  }, [loadRevenueReport]);

  const reportsBooting = !gymLoaded || !revenueLoaded;

  useEffect(() => {
    onBootingChange?.(reportsBooting);
  }, [reportsBooting, onBootingChange]);

  const gymStats = useMemo(() => gymReportStats(gyms), [gyms]);
  const statusChart = useMemo(() => aggregateGymsByStatus(gyms), [gyms]);
  const planChart = useMemo(() => aggregateGymsByPlan(gyms), [gyms]);
  const planColors = useMemo(() => planChartColors(planChart), [planChart]);
  const paymentStatusChart = useMemo(() => aggregateGymsPaymentStatus(gyms), [gyms]);
  const methodChart = useMemo(() => aggregateRevenueByMethod(revenueSummary), [revenueSummary]);
  const topGymsChart = useMemo(() => aggregateRevenueByGym(payments), [payments]);
  const trendChart = useMemo(() => aggregateRevenueByDate(payments), [payments]);

  const exportMeta = {
    gymFilterLabel: t(gymFilterMeta.labelKey),
    periodLabel,
    summary: revenueSummary,
  };

  const withExport = async (key, fn) => {
    setExporting(key);
    try {
      await fn();
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-app-text-strong">{t('admin.reportsTitle')}</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            {t('admin.reportsChartsSubtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={refreshAll}
            disabled={loading}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 dark:border-app-border-subtle bg-white  dark:bg-app-raised px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-app-text hover:bg-slate-50 dark:hover:bg-app-surface/60 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </button>
          <button
            type="button"
            disabled={!canExport || exporting === 'full-csv'}
            onClick={() => withExport('full-csv', () => downloadFullReportCsv(gyms, payments, exportMeta))}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 dark:border-app-border-subtle bg-white  dark:bg-app-raised px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-app-text hover:bg-slate-50 dark:hover:bg-app-surface/60 disabled:opacity-50"
          >
            <FileStack className="h-4 w-4" />
            {t('admin.fullReportCsv')}
          </button>
          <button
            type="button"
            disabled={!canExport || exporting === 'full-pdf'}
            onClick={() => withExport('full-pdf', () => downloadFullReportPdf(gyms, payments, exportMeta))}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <FileText className="h-4 w-4" />
            {t('admin.fullReportPdf')}
          </button>
        </div>
      </div>

      {(gymError || revenueError) && (
        <div className="flex flex-col gap-2">
          {gymError && (
            <div className="flex flex-col gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {gymError}
              </div>
              <button
                type="button"
                onClick={loadGymReport}
                className="shrink-0 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
              >
                {t('common.retry')}
              </button>
            </div>
          )}
          {revenueError && (
            <div className="flex flex-col gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {revenueError}
              </div>
              <button
                type="button"
                onClick={loadRevenueReport}
                className="shrink-0 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
              >
                {t('common.retry')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Gym analytics */}
      <section className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-app-text-strong">{t('admin.gymRegistryOverview')}</h2>
              <p className="text-xs text-slate-500">{t('admin.gymRegistrySubtitle')}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={gymFilter}
              onChange={(e) => setGymFilter(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-app-border-subtle bg-white  dark:bg-app-raised px-3 py-2 text-sm text-slate-700 dark:text-app-text focus:border-indigo-500 focus:outline-none"
            >
              {GYM_STATUS_FILTERS.map((f) => (
                <option key={f.id} value={f.id}>{t(f.labelKey)}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={!gymLoaded || gyms.length === 0 || exporting === 'gym-csv'}
              onClick={() => withExport('gym-csv', () => downloadGymsCsv(gyms))}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 dark:border-app-border-subtle bg-white  dark:bg-app-raised px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-app-text hover:bg-slate-50 dark:hover:bg-app-surface/60 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {t('admin.gymsCsv')}
            </button>
            <button
              type="button"
              disabled={!gymLoaded || gyms.length === 0 || exporting === 'gym-pdf'}
              onClick={() => withExport('gym-pdf', () => downloadGymsPdf(gyms, { filterLabel: t(gymFilterMeta.labelKey) }))}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              {t('admin.gymsPdf')}
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {!gymLoaded ? (
            Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
          ) : (
          <>
          <MetricCard label={t('admin.gymsInReport')} value={gymStats.total} icon={Building2} color="indigo" />
          <MetricCard label={t('admin.activeStatus')} value={gymStats.active} icon={Building2} color="emerald" />
          <MetricCard label={t('admin.unpaidLicenses')} value={gymStats.unpaid} icon={AlertCircle} color="amber" badge={gymStats.unpaid > 0 ? t('admin.actionBadge') : null} />
          <MetricCard label={t('admin.platformMembers')} value={gymStats.members} icon={Users} color="violet" hint={t('admin.platformMembersHint')} showHintBelow />
          </>
          )}
        </div>

        {!gymLoaded ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <ChartPanelSkeleton key={i} />
            ))}
          </div>
        ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard title={t('admin.bySubscriptionStatus')} subtitle={t('admin.subscriptionStatusSubtitle')} empty={statusChart.length === 0}>
            <ReportDonut data={statusChart} colors={STATUS_COLORS} showCounts />
          </ChartCard>
          <ChartCard title={t('admin.bySaasPlan')} subtitle={t('admin.planDistribution')} empty={planChart.length === 0}>
            <ReportDonut data={planChart} colors={planColors} showCounts />
          </ChartCard>
          <ChartCard title={t('admin.paymentStatusChart')} subtitle={t('admin.paidVsUnpaid')} empty={paymentStatusChart.length === 0}>
            <ReportDonut data={paymentStatusChart} colors={PAYMENT_STATUS_COLORS} showCounts />
          </ChartCard>
        </div>
        )}
      </section>

      {/* Revenue analytics */}
      <section className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-app-text-strong">{t('admin.revenueOverview')}</h2>
              <p className="text-xs text-slate-500">{t('admin.revenueChartsSubtitle')}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">{t('period.reportPeriod')}</label>
              <select
                value={periodPreset}
                onChange={(e) => setPeriodPreset(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-app-border-subtle bg-white  dark:bg-app-raised px-3 py-2 text-sm text-slate-700 dark:text-app-text focus:border-indigo-500 focus:outline-none"
              >
                {PERIOD_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>{t(p.labelKey)}</option>
                ))}
              </select>
            </div>
            {periodPreset === 'custom' && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">{t('common.from')}</label>
                  <DateField
                    value={customStart}
                    onChange={setCustomStart}
                    max={boundsForCustomRangeFrom(customEnd).max}
                    className="rounded-lg border border-slate-200 dark:border-app-border-subtle px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">{t('common.to')}</label>
                  <DateField
                    value={customEnd}
                    onChange={setCustomEnd}
                    min={boundsForCustomRangeTo(customStart).min}
                    max={boundsForCustomRangeTo(customStart).max}
                    className="rounded-lg border border-slate-200 dark:border-app-border-subtle px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </>
            )}
            <button
              type="button"
              disabled={!revenueLoaded || payments.length === 0 || exporting === 'rev-csv'}
              onClick={() => withExport('rev-csv', () => downloadRevenueCsv(payments, periodSlug, revenueSummary))}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 dark:border-app-border-subtle bg-white  dark:bg-app-raised px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-app-text hover:bg-slate-50 dark:hover:bg-app-surface/60 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {t('admin.revenueCsv')}
            </button>
            <button
              type="button"
              disabled={!revenueLoaded || payments.length === 0 || exporting === 'rev-pdf'}
              onClick={() => withExport('rev-pdf', () => downloadRevenuePdf(payments, { periodLabel, summary: revenueSummary }))}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              {t('admin.revenuePdf')}
            </button>
          </div>
        </div>

        {!revenueLoaded ? (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <MetricCardSkeleton key={i} />
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <ChartPanelSkeleton key={i} />
              ))}
            </div>
          </>
        ) : (
        <>
        {revenueSummary && (
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard
              label={t('metrics.totalRevenue')}
              value={formatMoney(revenueSummary.total)}
              hint={periodLabel}
              icon={DollarSign}
              color="emerald"
              showHintBelow
            />
            <MetricCard label={t('metrics.transactions')} value={revenueSummary.count} icon={Calendar} color="indigo" />
            <MetricCard label={t('metrics.averagePayment')} value={formatMoney(revenueSummary.average)} icon={DollarSign} color="violet" />
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard title={t('metrics.revenueByMethod')} subtitle={t('admin.revenueByMethodSubtitle')} empty={methodChart.length === 0}>
            <ReportDonut
              data={methodChart}
              colors={PAYMENT_METHOD_COLORS}
              showCounts
              formatValue={formatMoney}
            />
          </ChartCard>
          <ChartCard title={t('admin.topGymsByRevenue')} subtitle={t('admin.highestPayers')} empty={topGymsChart.length === 0}>
            <RevenueBarChart data={topGymsChart} formatMoney={formatMoney} />
          </ChartCard>
          <ChartCard title={t('admin.revenueTrend')} subtitle={t('admin.dailyTotals')} empty={trendChart.length === 0}>
            <RevenueTrendChart data={trendChart} gradientId="adminRevGrad" />
          </ChartCard>
        </div>
        </>
        )}
      </section>

      <p className="text-center text-xs text-slate-400 pb-2">
        <strong className="font-medium text-slate-500">PDF / CSV</strong> exports are landscape A–Z tables with revenue totals by method (Card, Bank Transfer, Cash).
        Live gym and payment lists use the same alphabetical order.
      </p>
    </div>
  );
}
