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
import PageHeader from '../../components/PageHeader';
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
  aggregateGymsOverview,
  aggregateGymsByPlan,
  aggregateRevenueByMethod,
  aggregateRevenueByGym,
  aggregateRevenueByDate,
  gymReportStats,
  PAYMENT_METHOD_COLORS,
  SAAS_PLAN_PALETTE,
  planChartColors,
} from '../../utils/reportChartData';
import { useLatestRequestGuard } from '../../utils/requestGuard';
import { useTranslation } from 'react-i18next';
import { MEMBER_FILTER_CHART_COLORS } from '../../utils/filterChipThemes';
import Button from '../../components/ui/Button';
import ErrorRetryBanner from '../../components/ErrorRetryBanner';
import { selectSurface, headingText } from '../../utils/surfaceClasses';

const GYM_STATUS_FILTERS = [
  { id: 'all', labelKey: 'filters.allGyms', query: {} },
  { id: 'active', labelKey: 'filters.activeOnly', query: { status: 'active' } },
  { id: 'due_soon', labelKey: 'filters.dueSoonOnly', query: { filter: 'due_soon' } },
  { id: 'expired', labelKey: 'filters.expiredSuspended', query: { filter: 'expired' } },
  { id: 'suspended', labelKey: 'status.suspended', query: { status: 'suspended' } },
  { id: 'unpaid', labelKey: 'filters.unpaidActive', query: { filter: 'unpaid' } },
];

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
  const overviewChart = useMemo(() => aggregateGymsOverview(gyms), [gyms]);
  const planChart = useMemo(() => aggregateGymsByPlan(gyms), [gyms]);
  const planColors = useMemo(
    () => planChartColors(planChart, SAAS_PLAN_PALETTE),
    [planChart],
  );
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
    <div className="space-y-6 sm:space-y-7">
      <PageHeader
        title={t('admin.reportsTitle')}
        subtitle={t('admin.reportsChartsSubtitle')}
        actions={
          <>
            <Button variant="secondary" onClick={refreshAll} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
            <Button
              variant="secondary"
              disabled={!canExport || exporting === 'full-csv'}
              onClick={() => withExport('full-csv', () => downloadFullReportCsv(gyms, payments, exportMeta))}
            >
              <FileStack className="h-4 w-4" />
              {t('admin.fullReportCsv')}
            </Button>
            <Button
              disabled={!canExport || exporting === 'full-pdf'}
              onClick={() => withExport('full-pdf', () => downloadFullReportPdf(gyms, payments, exportMeta))}
            >
              <FileText className="h-4 w-4" />
              {t('admin.fullReportPdf')}
            </Button>
          </>
        }
      />

      {(gymError || revenueError) && (
        <div className="flex flex-col gap-2">
          {gymError ? <ErrorRetryBanner message={gymError} onRetry={loadGymReport} /> : null}
          {revenueError ? <ErrorRetryBanner message={revenueError} onRetry={loadRevenueReport} /> : null}
        </div>
      )}

      {/* Gym analytics */}
      <section className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <div>
            <h2 className={`text-base font-semibold tracking-tight sm:text-lg ${headingText}`}>
              {t('admin.gymRegistryOverview')}
            </h2>
            <p className="mt-0.5 text-xs text-app-muted">{t('admin.gymRegistrySubtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={gymFilter}
              onChange={(e) => setGymFilter(e.target.value)}
              className={`ui-select ${selectSurface} min-w-[10rem]`}
            >
              {GYM_STATUS_FILTERS.map((f) => (
                <option key={f.id} value={f.id}>{t(f.labelKey)}</option>
              ))}
            </select>
            <Button
              variant="secondary"
              disabled={!gymLoaded || gyms.length === 0 || exporting === 'gym-csv'}
              onClick={() => withExport('gym-csv', () => downloadGymsCsv(gyms))}
            >
              <Download className="h-4 w-4" />
              {t('admin.gymsCsv')}
            </Button>
            <Button
              variant="secondary"
              disabled={!gymLoaded || gyms.length === 0 || exporting === 'gym-pdf'}
              onClick={() => withExport('gym-pdf', () => downloadGymsPdf(gyms, { filterLabel: t(gymFilterMeta.labelKey) }))}
            >
              <FileText className="h-4 w-4" />
              {t('admin.gymsPdf')}
            </Button>
          </div>
        </div>

        <div className="app-metric-grid grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-4">
          {!gymLoaded ? (
            Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} variant="dense" />)
          ) : (
          <>
          <MetricCard variant="dense" label={t('admin.gymsInReport')} value={gymStats.total} icon={Building2} color="teal" />
          <MetricCard variant="dense" label={t('admin.activeStatus')} value={gymStats.active} icon={Building2} color="emerald" />
          <MetricCard variant="dense" label={t('admin.unpaidLicenses')} value={gymStats.unpaid} icon={AlertCircle} color="violet" badge={gymStats.unpaid > 0 ? t('admin.actionBadge') : null} />
          <MetricCard variant="dense" label={t('admin.platformMembers')} value={gymStats.members} icon={Users} color="teal" hint={t('admin.platformMembersHint')} showHintBelow />
          </>
          )}
        </div>

        {!gymLoaded ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <ChartPanelSkeleton key={i} />
            ))}
          </div>
        ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <ChartCard compact title={t('admin.bySubscriptionStatus')} subtitle={t('admin.gymOverviewSubtitle')} empty={overviewChart.length === 0}>
            <ReportDonut data={overviewChart} colors={MEMBER_FILTER_CHART_COLORS} showCounts />
          </ChartCard>
          <ChartCard compact title={t('admin.bySaasPlan')} subtitle={t('admin.planDistribution')} empty={planChart.length === 0}>
            <ReportDonut data={planChart} colors={planColors} showCounts />
          </ChartCard>
        </div>
        )}
      </section>

      {/* Revenue analytics */}
      <section className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end md:gap-3">
          <div className="min-w-0">
            <h2 className={`text-base font-semibold tracking-tight sm:text-lg ${headingText}`}>
              {t('admin.revenueOverview')}
            </h2>
            <p className="mt-0.5 text-xs text-app-muted">{t('admin.revenueChartsSubtitle')}</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-app-muted">{t('period.reportPeriod')}</label>
              <select
                value={periodPreset}
                onChange={(e) => setPeriodPreset(e.target.value)}
                className={`ui-select ${selectSurface} min-w-[10rem]`}
              >
                {PERIOD_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>{t(p.labelKey)}</option>
                ))}
              </select>
            </div>
            {periodPreset === 'custom' && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-app-muted">{t('common.from')}</label>
                  <DateField
                    value={customStart}
                    onChange={setCustomStart}
                    max={boundsForCustomRangeFrom(customEnd).max}
                    className="w-full app-field"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-app-muted">{t('common.to')}</label>
                  <DateField
                    value={customEnd}
                    onChange={setCustomEnd}
                    min={boundsForCustomRangeTo(customStart).min}
                    max={boundsForCustomRangeTo(customStart).max}
                    className="w-full app-field"
                  />
                </div>
              </>
            )}
            <Button
              variant="secondary"
              disabled={!revenueLoaded || payments.length === 0 || exporting === 'rev-csv'}
              onClick={() => withExport('rev-csv', () => downloadRevenueCsv(payments, periodSlug, revenueSummary))}
            >
              <Download className="h-4 w-4" />
              {t('admin.revenueCsv')}
            </Button>
            <Button
              variant="secondary"
              disabled={!revenueLoaded || payments.length === 0 || exporting === 'rev-pdf'}
              onClick={() => withExport('rev-pdf', () => downloadRevenuePdf(payments, { periodLabel, summary: revenueSummary }))}
            >
              <FileText className="h-4 w-4" />
              {t('admin.revenuePdf')}
            </Button>
          </div>
        </div>

        {!revenueLoaded ? (
          <>
            <div className="app-metric-grid grid gap-2.5 sm:grid-cols-3 sm:gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <MetricCardSkeleton key={i} variant="dense" />
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <ChartPanelSkeleton key={i} />
              ))}
            </div>
          </>
        ) : (
        <>
        {revenueSummary && (
          <div className="app-metric-grid grid gap-2.5 sm:grid-cols-3 sm:gap-3">
            <MetricCard
              variant="dense"
              label={t('metrics.totalRevenue')}
              value={formatMoney(revenueSummary.total)}
              hint={periodLabel}
              icon={DollarSign}
              color="emerald"
              showHintBelow
            />
            <MetricCard variant="dense" label={t('metrics.transactions')} value={revenueSummary.count} icon={Calendar} color="teal" />
            <MetricCard variant="dense" label={t('metrics.averagePayment')} value={formatMoney(revenueSummary.average)} icon={DollarSign} color="violet" />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      <p className="text-center text-xs text-app-muted pb-2">
        <strong className="font-medium text-app-muted">PDF / CSV</strong> exports are landscape A–Z tables with revenue totals by method (Card, Bank Transfer, Cash).
        Live gym and payment lists use the same alphabetical order.
      </p>
    </div>
  );
}
