// src/pages/owner/OwnerReports.jsx
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGym } from '../../context/GymContext';
import {
  Users,
  UserPlus,
  DollarSign,
  Download,
  FileText,
  RefreshCw,
  Calendar,
  AlertCircle,
  FileStack,
} from 'lucide-react';
import { parseApiResponse } from '../../utils/api';
import { getMemberReport, getOwnerRevenueReport } from '../../services/reportService';
import { PERIOD_PRESETS } from '../../utils/saasPaymentReport';
import { useRevenuePeriodParams } from '../../hooks/useRevenuePeriodParams';
import { DateField } from '../../components/DateField';
import { boundsForCustomRangeFrom, boundsForCustomRangeTo } from '../../utils/datePickerBounds';
import MetricCard from '../../components/MetricCard';
import ChartCard from '../../components/reports/ChartCard';
import ReportDonut from '../../components/reports/ReportDonut';
import RevenueBarChart from '../../components/reports/RevenueBarChart';
import RevenueTrendChart from '../../components/reports/RevenueTrendChart';
import {
  downloadMembersCsv,
  downloadMembersPdf,
  downloadOwnerRevenueCsv,
  downloadOwnerRevenuePdf,
  downloadFullOwnerReportCsv,
  downloadFullOwnerReportPdf,
  formatMoney,
} from '../../utils/ownerReportExport';
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

const MEMBER_STATUS_FILTERS = [
  { id: 'all', labelKey: 'filters.allMembers', query: {} },
  { id: 'active', labelKey: 'filters.activeOnly', query: { status: 'active' } },
  { id: 'unpaid', labelKey: 'filters.unpaid', query: { filter: 'unpaid' } },
  { id: 'due_soon', labelKey: 'filters.dueSoon', query: { filter: 'due_soon' } },
  { id: 'expired', labelKey: 'filters.expired', query: { filter: 'expired' } },
];

export default function OwnerReports() {
  const { t } = useTranslation();
  const { apiFetch } = useAuth();
  const { summary, getBranchQueryParams, selectedBranchId, branches } = useGym();
  const memberReportGuard = useLatestRequestGuard();

  const [memberFilter, setMemberFilter] = useState('all');
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

  const memberFilterMeta = MEMBER_STATUS_FILTERS.find((f) => f.id === memberFilter) || MEMBER_STATUS_FILTERS[0];
  const periodPresetMeta = PERIOD_PRESETS.find((p) => p.id === periodPreset) || PERIOD_PRESETS[0];
  const periodLabel = t(periodPresetMeta.labelKey);
  const periodSlug = periodLabel.toLowerCase().replace(/\s+/g, '-');
  const loading = memberLoading || revenueLoading;
  const canExport = memberLoaded && revenueLoaded && (members.length > 0 || payments.length > 0);

  const buildRevenueParams = useRevenuePeriodParams(periodPreset, customStart, customEnd);

  const loadMemberReport = useCallback(async () => {
    const requestId = memberReportGuard.start();
    setMemberLoading(true);
    setMemberError('');
    try {
      const res = await getMemberReport(apiFetch, { ...memberFilterMeta.query, ...getBranchQueryParams() });
      const data = await parseApiResponse(res);
      if (!memberReportGuard.isLatest(requestId)) return;
      if (!res.ok) throw new Error(data.error || 'Failed to load member report');
      setMembers(data.members || []);
      setMemberLoaded(true);
    } catch (err) {
      if (!memberReportGuard.isLatest(requestId)) return;
      setMemberError(err.message);
      setMembers([]);
    } finally {
      if (memberReportGuard.isLatest(requestId)) setMemberLoading(false);
    }
  }, [apiFetch, memberFilterMeta, memberReportGuard, getBranchQueryParams]);

  const loadRevenueReport = useCallback(async () => {
    setRevenueLoading(true);
    setRevenueError('');
    try {
      const res = await getOwnerRevenueReport(apiFetch, { ...buildRevenueParams(), ...getBranchQueryParams() });
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
  }, [apiFetch, buildRevenueParams, getBranchQueryParams]);

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
    memberFilterLabel: t(memberFilterMeta.labelKey),
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-app-text-strong sm:text-2xl">{t('pages.reports.title')}</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            {t('pages.reports.subtitle')}
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
            onClick={() => withExport('full-csv', () => downloadFullOwnerReportCsv(members, payments, exportMeta))}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 dark:border-app-border-subtle bg-white  dark:bg-app-raised px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-app-text hover:bg-slate-50 dark:hover:bg-app-surface/60 disabled:opacity-50"
          >
            <FileStack className="h-4 w-4" />
            {t('common.exportCsv')}
          </button>
          <button
            type="button"
            disabled={!canExport || exporting === 'full-pdf'}
            onClick={() => withExport('full-pdf', () => downloadFullOwnerReportPdf(members, payments, exportMeta))}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            <FileText className="h-4 w-4" />
            {t('common.exportPdf')}
          </button>
        </div>
      </div>

      {(memberError || revenueError) && (
        <div className="flex flex-col gap-2">
          {memberError && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {memberError}
            </div>
          )}
          {revenueError && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {revenueError}
            </div>
          )}
        </div>
      )}

      <section className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-teal-100 p-2 text-teal-700">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-app-text-strong">{t('nav.members')}</h2>
              <p className="text-xs text-slate-500">{t('pages.reports.exportNote')}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-app-border-subtle bg-white  dark:bg-app-raised px-3 py-2 text-sm text-slate-700 dark:text-app-text focus:border-teal-600 focus:outline-none"
            >
              {MEMBER_STATUS_FILTERS.map((f) => (
                <option key={f.id} value={f.id}>{t(f.labelKey)}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={!memberLoaded || members.length === 0 || exporting === 'member-csv'}
              onClick={() => withExport('member-csv', () => downloadMembersCsv(members, exportMeta))}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 dark:border-app-border-subtle bg-white  dark:bg-app-raised px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-app-text hover:bg-slate-50 dark:hover:bg-app-surface/60 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {t('common.exportCsv')}
            </button>
            <button
              type="button"
              disabled={!memberLoaded || members.length === 0 || exporting === 'member-pdf'}
              onClick={() => withExport('member-pdf', () => downloadMembersPdf(members, { filterLabel: t(memberFilterMeta.labelKey), ...exportMeta }))}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2.5 text-sm font-medium text-teal-700 hover:bg-teal-100 disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              {t('common.exportPdf')}
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            label={t('metrics.newMembers')}
            value={summary.newMembersThisMonth ?? 0}
            icon={UserPlus}
            color="violet"
            trend={summary.newMembersTrendPercent ?? null}
            trendCaption={summary.newMembersDeltaLabel || t('metrics.vsLastMonth')}
          />
          <MetricCard label={t('metrics.totalMembers')} value={memberStats.total} icon={Users} color="teal" />
          <MetricCard label={t('metrics.activeMembers')} value={memberStats.active} icon={Users} color="emerald" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard label={t('metrics.unpaid')} value={memberStats.unpaid} icon={AlertCircle} color="amber" badge={memberStats.unpaid > 0 ? t('metrics.actionRequired') : null} />
          <MetricCard label={t('metrics.dueSoon')} value={memberStats.dueSoon} icon={AlertCircle} color="amber" />
          <MetricCard label={t('metrics.expired')} value={memberStats.expired} icon={AlertCircle} color="rose" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title={t('table.status')} subtitle={t('pages.reports.memberOverviewSubtitle')} empty={overviewChart.length === 0}>
            <ReportDonut data={overviewChart} colors={MEMBER_FILTER_CHART_COLORS} showCounts />
          </ChartCard>
          <ChartCard title={t('table.plan')} subtitle={t('nav.plans')} empty={planChart.length === 0}>
            <ReportDonut data={planChart} colors={planColors} showCounts />
          </ChartCard>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-app-text-strong">{t('nav.revenue')}</h2>
              <p className="text-xs text-slate-500">{t('pages.reports.exportNote')}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">{t('period.reportPeriod')}</label>
              <select
                value={periodPreset}
                onChange={(e) => setPeriodPreset(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-app-border-subtle bg-white  dark:bg-app-raised px-3 py-2 text-sm text-slate-700 dark:text-app-text focus:border-teal-600 focus:outline-none"
              >
                {PERIOD_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>{t(p.labelKey)}</option>
                ))}
              </select>
            </div>
            {periodPreset === 'custom' && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">{t('table.startDate')}</label>
                  <DateField
                    value={customStart}
                    onChange={setCustomStart}
                    max={boundsForCustomRangeFrom(customEnd).max}
                    className="rounded-lg border border-slate-200 dark:border-app-border-subtle px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">{t('common.to')}</label>
                  <DateField
                    value={customEnd}
                    onChange={setCustomEnd}
                    min={boundsForCustomRangeTo(customStart).min}
                    max={boundsForCustomRangeTo(customStart).max}
                    className="rounded-lg border border-slate-200 dark:border-app-border-subtle px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </>
            )}
            <button
              type="button"
              disabled={!revenueLoaded || payments.length === 0 || exporting === 'rev-csv'}
              onClick={() => withExport('rev-csv', () => downloadOwnerRevenueCsv(payments, periodSlug, revenueSummary, exportMeta))}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 dark:border-app-border-subtle bg-white  dark:bg-app-raised px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-app-text hover:bg-slate-50 dark:hover:bg-app-surface/60 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {t('common.exportCsv')}
            </button>
            <button
              type="button"
              disabled={!revenueLoaded || payments.length === 0 || exporting === 'rev-pdf'}
              onClick={() => withExport('rev-pdf', () => downloadOwnerRevenuePdf(payments, { periodLabel, summary: revenueSummary, ...exportMeta }))}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              {t('common.exportPdf')}
            </button>
          </div>
        </div>

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
            <MetricCard label={t('metrics.transactions')} value={revenueSummary.count} icon={Calendar} color="teal" />
            <MetricCard label={t('metrics.averagePayment')} value={formatMoney(revenueSummary.average)} icon={DollarSign} color="violet" />
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard title={t('metrics.revenueByMethod')} subtitle={t('table.method')} empty={methodChart.length === 0}>
            <ReportDonut
              data={methodChart}
              colors={PAYMENT_METHOD_COLORS}
              showCounts
              formatValue={formatMoney}
            />
          </ChartCard>
          <ChartCard title={t('table.member')} subtitle={t('metrics.revenue')} empty={topMembersChart.length === 0}>
            <RevenueBarChart data={topMembersChart} formatMoney={formatMoney} />
          </ChartCard>
          <ChartCard title={t('metrics.revenue')} subtitle={t('period.reportPeriod')} empty={trendChart.length === 0}>
            <RevenueTrendChart data={trendChart} gradientId="ownerRevGrad" />
          </ChartCard>
        </div>
      </section>

      <p className="text-center text-xs text-slate-400 pb-2">
        {t('pages.reports.exportNote')}
      </p>
    </div>
  );
}
