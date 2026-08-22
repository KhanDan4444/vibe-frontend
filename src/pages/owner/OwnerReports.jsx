// src/pages/owner/OwnerReports.jsx
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGym } from '../../context/GymContext';
import {
  Users,
  UserPlus,
  UserMinus,
  FileText,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  XCircle,
  FileStack,
} from 'lucide-react';
import { parseApiResponse } from '../../utils/api';
import { getMemberReport, getOwnerRevenueReport } from '../../services/reportService';
import { PERIOD_PRESETS } from '../../utils/saasPaymentReport';
import { useRevenuePeriodParams } from '../../hooks/useRevenuePeriodParams';
import { DateField } from '../../components/DateField';
import { boundsForCustomRangeFrom, boundsForCustomRangeTo } from '../../utils/datePickerBounds';
import MetricCard from '../../components/MetricCard';
import PageHeader from '../../components/PageHeader';
import ChartCard from '../../components/reports/ChartCard';
import ReportDonut from '../../components/reports/ReportDonut';
import RevenueBarChart from '../../components/reports/RevenueBarChart';
import RevenueTrendChart from '../../components/reports/RevenueTrendChart';
import {
  downloadFullOwnerReportCsv,
  downloadFullOwnerReportPdf,
  formatMoney,
} from '../../utils/ownerReportExport';
import { formatMoneyShort } from '../../utils/formatMoney';
import {
  aggregateMembersOverview,
  aggregateMembersByPlan,
  aggregateRevenueByMethod,
  aggregateRevenueByMember,
  aggregateRevenueByDate,
  memberReportStats,
  PAYMENT_METHOD_COLORS,
  planChartColors,
} from '../../utils/reportChartData';
import { useLatestRequestGuard } from '../../utils/requestGuard';
import { useTranslation } from 'react-i18next';
import { MEMBER_FILTER_CHART_COLORS } from '../../utils/filterChipThemes';
import Button from '../../components/ui/Button';
import { sectionTitle } from '../../utils/surfaceClasses';
import ToolbarPicker from '../../components/ToolbarPicker';

export default function OwnerReports() {
  const { t } = useTranslation();
  const { apiFetch } = useAuth();
  const { summary, getBranchQueryParams, selectedBranchId, branches, gymName } = useGym();
  const memberReportGuard = useLatestRequestGuard();

  const [members, setMembers] = useState([]);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState('');
  const [memberLoaded, setMemberLoaded] = useState(false);

  const [periodPreset, setPeriodPreset] = useState('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [payments, setPayments] = useState([]);
  const [revenueSummary, setRevenueSummary] = useState(null);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [revenueError, setRevenueError] = useState('');
  const [revenueLoaded, setRevenueLoaded] = useState(false);

  const [exporting, setExporting] = useState(null);

  const periodPresetMeta = PERIOD_PRESETS.find((p) => p.id === periodPreset) || PERIOD_PRESETS[0];
  const periodLabel = t(periodPresetMeta.labelKey);
  const loading = memberLoading || revenueLoading;
  const canExport = memberLoaded && revenueLoaded && (members.length > 0 || payments.length > 0);

  const buildRevenueParams = useRevenuePeriodParams(periodPreset, customStart, customEnd);

  const loadMemberReport = useCallback(async () => {
    const requestId = memberReportGuard.start();
    setMemberLoading(true);
    setMemberError('');
    try {
      const res = await getMemberReport(apiFetch, { ...buildRevenueParams(), ...getBranchQueryParams() });
      const data = await parseApiResponse(res);
      if (!memberReportGuard.isLatest(requestId)) return;
      if (!res.ok) throw new Error(data.error || t('errors.loadMemberReport'));
      setMembers(data.members || []);
      setMemberLoaded(true);
    } catch (err) {
      if (!memberReportGuard.isLatest(requestId)) return;
      setMemberError(err.message);
      setMembers([]);
    } finally {
      if (memberReportGuard.isLatest(requestId)) setMemberLoading(false);
    }
  }, [apiFetch, memberReportGuard, getBranchQueryParams, t, buildRevenueParams]);

  const loadRevenueReport = useCallback(async () => {
    setRevenueLoading(true);
    setRevenueError('');
    try {
      const res = await getOwnerRevenueReport(apiFetch, { ...buildRevenueParams(), ...getBranchQueryParams() });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || t('errors.loadRevenueReport'));
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
  }, [apiFetch, buildRevenueParams, getBranchQueryParams, t]);

  const refreshAll = useCallback(() => {
    loadMemberReport();
    loadRevenueReport();
  }, [loadMemberReport, loadRevenueReport]);

  useEffect(() => {
    loadMemberReport();
  }, [loadMemberReport]);

  useEffect(() => {
    loadRevenueReport();
  }, [loadRevenueReport]);

  const memberStats = useMemo(() => memberReportStats(members), [members]);
  const overviewChart = useMemo(() => aggregateMembersOverview(members), [members]);
  const planChart = useMemo(() => aggregateMembersByPlan(members), [members]);
  const planColors = useMemo(() => planChartColors(planChart), [planChart]);
  const methodChart = useMemo(() => aggregateRevenueByMethod(revenueSummary), [revenueSummary]);
  const topMembersChart = useMemo(() => aggregateRevenueByMember(payments), [payments]);
  const trendChart = useMemo(() => aggregateRevenueByDate(payments), [payments]);

  const branchLabel = useMemo(() => {
    if (selectedBranchId === 'all') return t('branch.allBranches');
    const match = branches.find((b) => b.id === selectedBranchId);
    return match?.name || t('branch.allBranches');
  }, [selectedBranchId, branches, t]);

  const exportMeta = {
    gymName,
    memberFilterLabel: t('filters.allMembers'),
    periodLabel,
    summary: revenueSummary,
    branchLabel,
    showBranchColumn: selectedBranchId === 'all',
  };

  const withExport = async (key, fn) => {
    setExporting(key);
    try {
      await fn();
    } finally {
      setExporting(null);
    }
  };

  const revenueStatusLine = revenueSummary
    ? t('pages.reports.revenueStatusLine', {
        revenue: formatMoneyShort(revenueSummary.total),
        count: revenueSummary.count,
        average: formatMoneyShort(revenueSummary.average),
        period: periodLabel,
      })
    : null;

  return (
    <div className="space-y-6 sm:space-y-7">
      <PageHeader
        title={t('pages.reports.title')}
        subtitle={t('pages.reports.subtitle')}
        actions={
          <>
            <Button variant="secondary" onClick={refreshAll} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
            <Button
              variant="secondary"
              disabled={!canExport || exporting === 'full-csv'}
              onClick={() => withExport('full-csv', () => downloadFullOwnerReportCsv(members, payments, exportMeta))}
            >
              <FileStack className="h-4 w-4" />
              {t('common.exportCsv')}
            </Button>
            <Button
              disabled={!canExport || exporting === 'full-pdf'}
              onClick={() => withExport('full-pdf', () => downloadFullOwnerReportPdf(members, payments, exportMeta))}
            >
              <FileText className="h-4 w-4" />
              {t('common.exportPdf')}
            </Button>
          </>
        }
      />

      {(memberError || revenueError) && (
        <div className="flex flex-col gap-2">
          {memberError && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {memberError}
            </div>
          )}
          {revenueError && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {revenueError}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-app-muted">
            {t('period.reportPeriod')}
          </label>
          <ToolbarPicker
            value={periodPreset}
            onChange={setPeriodPreset}
            options={PERIOD_PRESETS}
            label={t('period.reportPeriod')}
          />
        </div>
        {periodPreset === 'custom' && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-app-muted">{t('table.startDate')}</label>
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
      </div>

      <section className="space-y-4">
        <div>
            <h2 className={sectionTitle}>
              {t('nav.members')}
            </h2>
            <p className="mt-0.5 text-xs text-app-muted">{t('pages.reports.memberOverviewSubtitle')}</p>
          </div>

        <div className="app-metric-grid grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 xl:grid-cols-7">
          <MetricCard
            variant="dense"
            label={t('metrics.newMembers')}
            value={summary.newMembersThisMonth ?? 0}
            icon={UserPlus}
            color="amber"
            trend={summary.newMembersTrendPercent ?? null}
            trendCaption={summary.newMembersDeltaLabel || t('metrics.vsLastMonth')}
          />
          <MetricCard variant="dense" label={t('metrics.totalMembers')} value={memberStats.total} icon={Users} color="teal" />
          <MetricCard variant="dense" label={t('metrics.activeMembers')} value={memberStats.active} icon={Users} color="emerald" />
          <MetricCard
            variant="dense"
            label={t('metrics.unpaid')}
            value={memberStats.unpaid}
            icon={AlertCircle}
            color="violet"
            badge={memberStats.unpaid > 0 ? t('metrics.actionRequired') : null}
          />
          <MetricCard variant="dense" label={t('metrics.dueSoon')} value={memberStats.dueSoon} icon={AlertTriangle} color="sky" />
          <MetricCard variant="dense" label={t('metrics.expired')} value={memberStats.expired} icon={XCircle} color="rose" />
          <MetricCard variant="dense" label={t('status.former')} value={memberStats.former} icon={UserMinus} color="slate" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          <ChartCard compact title={t('table.status')} empty={overviewChart.length === 0}>
            <ReportDonut data={overviewChart} colors={MEMBER_FILTER_CHART_COLORS} showCounts />
          </ChartCard>
          <ChartCard compact title={t('table.plan')} empty={planChart.length === 0}>
            <ReportDonut data={planChart} colors={planColors} showCounts />
          </ChartCard>
        </div>
      </section>

      <section className="space-y-4">
        <div className="min-w-0">
          <h2 className={sectionTitle}>
            {t('nav.revenue')}
          </h2>
          {revenueStatusLine ? (
            <p className="mt-1 text-sm text-app-muted">{revenueStatusLine}</p>
          ) : (
            <p className="mt-1 text-xs text-app-muted">{t('pages.reports.revenueChartsNote')}</p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
          <ChartCard title={t('metrics.revenueByMethod')} empty={methodChart.length === 0}>
            <ReportDonut
              data={methodChart}
              colors={PAYMENT_METHOD_COLORS}
              showCounts
              formatValue={formatMoney}
            />
          </ChartCard>
          <ChartCard title={t('pages.reports.topMembers')} empty={topMembersChart.length === 0}>
            <RevenueBarChart data={topMembersChart} formatMoney={formatMoney} />
          </ChartCard>
          <ChartCard title={t('pages.reports.revenueTrend')} empty={trendChart.length === 0}>
            <RevenueTrendChart data={trendChart} gradientId="ownerRevGrad" />
          </ChartCard>
        </div>
      </section>
    </div>
  );
}
