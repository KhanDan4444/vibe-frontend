// src/pages/owner/OwnerDashboard.jsx
import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGym } from '../../context/GymContext';
import { isGymOwner } from '../../utils/roles';
import { Users, AlertTriangle, XCircle, TrendingUp, RefreshCw, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MetricCard, { MetricCardSkeleton } from '../../components/MetricCard';
import StatusBadge from '../../components/StatusBadge';
import RenewModal from '../../components/RenewModal';
import BranchComparisonTable from '../../components/BranchComparisonTable';
import { canRenewMember } from '../../utils/memberRenew';
import { mapMemberFromApi } from '../../utils/apiMappers';
import { formatDisplayDate } from '../../utils/date';
import { parseApiResponse } from '../../utils/api';
import { getBranchComparison } from '../../services/dashboardService';
import { useTranslation } from 'react-i18next';
import { flashFromKey } from '../../i18n/flashToast';
import { formatMoney } from '../../utils/formatMoney';
import { panelQuiet, tableRowHover } from '../../utils/surfaceClasses';
import { lazyWithRetry } from '../../utils/lazyWithRetry';

const OwnerRevenueChart = lazyWithRetry(() => import('../../components/OwnerRevenueChart'));

export default function OwnerDashboard() {
  const { t } = useTranslation();
  const { apiFetch, user } = useAuth();
  const { summary, plans, renewMember, showFlash, readOnly, selectedBranchId, branches, gymBooting, gymName } = useGym();
  const navigate = useNavigate();

  const [renewState, setRenewState] = useState({ isOpen: false, member: null });
  const [renewSaving, setRenewSaving] = useState(false);
  const [renewError, setRenewError] = useState('');
  const [branchComparison, setBranchComparison] = useState([]);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  const showComparison =
    isGymOwner(user?.role) && selectedBranchId === 'all' && branches.filter((b) => b.is_active !== false).length > 1;

  useEffect(() => {
    if (!showComparison) {
      setBranchComparison([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setComparisonLoading(true);
      try {
        const res = await getBranchComparison(apiFetch);
        const data = await parseApiResponse(res);
        if (!cancelled && res.ok) {
          setBranchComparison(data.branches || []);
        }
      } catch {
        if (!cancelled) setBranchComparison([]);
      } finally {
        if (!cancelled) setComparisonLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiFetch, showComparison, summary.totalMembers]);

  const activeMembersCount = summary.activeMembers ?? 0;
  const dueSoonMembersCount = summary.dueSoonMembers ?? 0;
  const expiredMembersCount = summary.expiredMembers ?? 0;
  const totalMembersCount = summary.totalMembers ?? 0;
  const monthlyIncome = summary.monthlyIncome ?? 0;
  const newMembersThisMonth = summary.newMembersThisMonth ?? 0;
  const revenueTrend = summary.revenueTrendPercent ?? null;
  const newMembersTrend = summary.newMembersTrendPercent ?? null;

  const alertMembers = (summary.alertMembers || []).map((m) => mapMemberFromApi(m)).filter(Boolean);

  const chartData = (summary.revenueChart || []).map((r) => ({
    date: formatDisplayDate(r.date),
    amount: Number(r.amount),
  }));

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0].substring(0, 2).toUpperCase();
  };

  const handleRenewSubmit = async (data) => {
    if (!renewState.member) return;
    setRenewSaving(true);
    setRenewError('');
    try {
      await renewMember(renewState.member.id, data);
      const name = renewState.member.name;
      setRenewState({ isOpen: false, member: null });
      showFlash(flashFromKey(t, 'renewed', { subtitleParams: { name } }));
    } catch (err) {
      setRenewError(err.message);
    } finally {
      setRenewSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-app-text-strong sm:text-2xl">{gymName || t('pages.dashboard.title')}</h1>
        <p className="text-sm text-slate-500">{t('pages.dashboard.subtitle')}</p>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {gymBooting ? (
          Array.from({ length: 5 }).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
        <>
        <MetricCard
          label={t('metrics.activeMembers')}
          value={`${activeMembersCount}`}
          subValue={`/${totalMembersCount}`}
          hint={t('pages.dashboard.activePercent', {
            percent: totalMembersCount > 0 ? ((activeMembersCount / totalMembersCount) * 100).toFixed(0) : 0,
          })}
          icon={Users}
          color="emerald"
          showProgressBar
          progress={totalMembersCount > 0 ? (activeMembersCount / totalMembersCount) * 100 : 0}
        />
        <MetricCard
          label={t('metrics.dueSoon')}
          value={dueSoonMembersCount}
          hint={dueSoonMembersCount > 0 ? t('pages.dashboard.dueSoonHintCritical') : t('pages.dashboard.dueSoonHintOk')}
          hintColor={dueSoonMembersCount > 0 ? 'text-rose-500' : undefined}
          icon={AlertTriangle}
          color="rose"
          badge={dueSoonMembersCount > 0 ? t('metrics.critical') : null}
        />
        <MetricCard
          label={t('metrics.expired')}
          value={expiredMembersCount}
          hint={expiredMembersCount > 0 ? t('pages.dashboard.expiredHintAction') : t('pages.dashboard.expiredHintOk')}
          icon={XCircle}
          color="rose"
          badge={expiredMembersCount > 0 ? t('metrics.actionRequired') : null}
        />
        <MetricCard
          label={t('pages.dashboard.newMembersThisMonth')}
          value={newMembersThisMonth}
          icon={UserPlus}
          color="amber"
          trend={newMembersTrend}
          trendCaption={t('pages.dashboard.lastMonthCount', { count: summary.newMembersLastMonth ?? 0 })}
        />
        <MetricCard
          label={t('pages.dashboard.thisMonthRevenue')}
          value={formatMoney(monthlyIncome)}
          icon={TrendingUp}
          color="teal"
          trend={revenueTrend}
          trendCaption={t('metrics.vsLastMonth')}
        />
        </>
        )}
      </div>

      {showComparison && !gymBooting && (
        <BranchComparisonTable branches={branchComparison} loading={comparisonLoading} />
      )}

      <div className="grid gap-6 md:grid-cols-5">
        {gymBooting ? (
          <>
            <div className={`md:col-span-3 overflow-hidden p-6 ${panelQuiet}`}>
              <div className="app-skeleton mb-6 h-5 w-48" />
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="app-skeleton h-8 w-8 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="app-skeleton h-4 w-32" />
                      <div className="app-skeleton h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className={`md:col-span-2 p-4 sm:p-6 ${panelQuiet}`}>
              <div className="app-skeleton mb-4 h-5 w-40" />
              <div className="app-skeleton min-h-[200px] w-full sm:min-h-[250px]" />
            </div>
          </>
        ) : (
        <>
        <div className={`md:col-span-3 overflow-hidden ${panelQuiet}`}>
          <div className="admin-panel-header">
            <h2 className="text-base font-semibold text-slate-900 dark:text-app-text-strong sm:text-lg">{t('pages.dashboard.expiringSection')}</h2>
            <button
              onClick={() => navigate('/dashboard/members', { state: { filter: 'Due Soon' } })}
              className="shrink-0 text-sm font-medium text-slate-500 transition-colors hover:text-teal-700 dark:text-app-muted dark:hover:text-teal-400 cursor-pointer"
            >
              {t('common.viewAll')}
            </button>
          </div>

          <div className="lg:hidden divide-y divide-slate-100 dark:divide-app-border-subtle">
            {alertMembers.length > 0 ? (
              alertMembers.map((member) => {
                const matchingPlan = plans.find((p) => p.id === member.planId);
                return (
                  <div key={member.id} className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white dark:bg-teal-600">
                          {getInitials(member.name)}
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-app-text-strong truncate">{member.name}</span>
                      </div>
                      <p className="mt-1 text-sm text-teal-700">
                        {matchingPlan ? matchingPlan.name : member.planName || t('pages.dashboard.customPlan')}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{t('pages.dashboard.expires', { date: formatDisplayDate(member.endDate) })}</p>
                      <div className="mt-2">
                        <StatusBadge status={member.status} />
                      </div>
                    </div>
                    {!readOnly && canRenewMember(member) && (
                      <div className="admin-row-actions shrink-0">
                        <button
                          type="button"
                          onClick={() => setRenewState({ isOpen: true, member })}
                          className="text-slate-400 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-app-surface/80 cursor-pointer"
                          title={t('actions.renew')}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="admin-panel-empty px-4">
                {t('pages.dashboard.noExpiring')}
              </p>
            )}
          </div>

          <div className="hidden lg:block overflow-x-auto">
            <table className="admin-data-table owner-dashboard-alert-table min-w-[720px]">
              <thead>
                <tr>
                  <th>{t('table.member')}</th>
                  <th>{t('table.plan')}</th>
                  <th>{t('table.expiry')}</th>
                  <th>{t('table.status')}</th>
                  <th className="text-right">{t('table.action')}</th>
                </tr>
              </thead>
              <tbody>
                {alertMembers.length > 0 ? (
                  alertMembers.map((member) => {
                    const matchingPlan = plans.find((p) => p.id === member.planId);
                    return (
                      <tr key={member.id} className={tableRowHover}>
                        <td>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white dark:bg-teal-600">
                              {getInitials(member.name)}
                            </div>
                            <span className="truncate font-semibold text-slate-900 dark:text-app-text-strong">{member.name}</span>
                          </div>
                        </td>
                        <td className="truncate font-medium text-teal-700">
                          {matchingPlan ? matchingPlan.name : member.planName || t('pages.dashboard.customPlan')}
                        </td>
                        <td className="whitespace-nowrap text-slate-600 dark:text-app-text">{formatDisplayDate(member.endDate)}</td>
                        <td>
                          <StatusBadge status={member.status} />
                        </td>
                        <td>
                          <div className="flex justify-end">
                          {!readOnly && canRenewMember(member) && (
                            <button
                              onClick={() => setRenewState({ isOpen: true, member })}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400 cursor-pointer"
                            >
                              <RefreshCw className="h-3 w-3" /> {t('actions.renew')}
                            </button>
                          )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="admin-panel-empty">
                      {t('pages.dashboard.noExpiring')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={`md:col-span-2 flex flex-col p-4 sm:p-6 ${panelQuiet}`}>
          <h2 className="text-base font-semibold text-slate-900 dark:text-app-text-strong mb-4 sm:text-lg sm:mb-5">{t('pages.dashboard.revenueThisMonth')}</h2>
          <div className="flex-1 min-h-[220px] sm:min-h-[260px]">
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  {t('common.loading')}
                </div>
              }
            >
              <OwnerRevenueChart chartData={chartData} />
            </Suspense>
          </div>
        </div>
        </>
        )}
      </div>

      <RenewModal
        isOpen={renewState.isOpen}
        onClose={() => setRenewState({ isOpen: false, member: null })}
        onSubmit={handleRenewSubmit}
        member={renewState.member}
        plans={plans}
        saving={renewSaving}
        error={renewError}
      />
    </div>
  );
}
