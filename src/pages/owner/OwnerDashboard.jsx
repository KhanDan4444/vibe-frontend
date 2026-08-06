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
import MemberPhoto from '../../components/MemberPhoto';
import BranchComparisonTable from '../../components/BranchComparisonTable';
import { canRenewMember } from '../../utils/memberRenew';
import { mapMemberFromApi } from '../../utils/apiMappers';
import { formatDisplayDate } from '../../utils/date';
import { parseApiResponse } from '../../utils/api';
import { getBranchComparison } from '../../services/dashboardService';
import { useTranslation } from 'react-i18next';
import { flashFromKey } from '../../i18n/flashToast';
import { formatMoney } from '../../utils/formatMoney';
import { pageTitle, headingText, mutedText, panelQuiet, tableRowHover, iconActionSuccess } from '../../utils/surfaceClasses';
import Card from '../../components/ui/Card';
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
    <div className="space-y-6">
      <div>
        <h1 className={pageTitle}>{gymName || t('pages.dashboard.title')}</h1>
        <p className={`mt-1.5 text-sm ${mutedText}`}>{t('pages.dashboard.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 app-metric-grid">
        {gymBooting ? (
          Array.from({ length: 5 }).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
        <>
        <MetricCard
          label={t('metrics.activeMembers')}
          value={`${activeMembersCount}`}
          subValue={`/${totalMembersCount}`}
          icon={Users}
          color="emerald"
          showProgressBar
          progress={totalMembersCount > 0 ? (activeMembersCount / totalMembersCount) * 100 : 0}
        />
        <MetricCard
          label={t('metrics.dueSoon')}
          value={dueSoonMembersCount}
          icon={AlertTriangle}
          color="sky"
        />
        <MetricCard
          label={t('metrics.expired')}
          value={expiredMembersCount}
          icon={XCircle}
          color="rose"
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
        <Card quiet className="md:col-span-3 overflow-hidden">
          <div className="admin-panel-header">
            <h2 className="text-base font-semibold text-app-text-strong sm:text-lg">{t('pages.dashboard.expiringSection')}</h2>
            <button
              type="button"
              onClick={() => navigate('/dashboard/members', { state: { filter: 'Due Soon' } })}
              className="min-h-9 rounded-md px-3 py-1.5 text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30 dark:text-teal-300 dark:hover:bg-teal-600/15 dark:hover:text-teal-200"
            >
              {t('common.viewAll')}
            </button>
          </div>

          <div className="lg:hidden divide-y divide-app-border-subtle">
            {alertMembers.length > 0 ? (
              alertMembers.map((member) => {
                const matchingPlan = plans.find((p) => p.id === member.planId);
                return (
                  <div key={member.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <MemberPhoto
                          memberId={member.id}
                          apiFetch={apiFetch}
                          name={member.name}
                          hasPhoto={member.hasPhoto}
                          expandable={false}
                          className="h-8 w-8 rounded-full object-cover"
                          fallbackClassName="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white dark:bg-teal-600"
                        />
                        <div className="min-w-0">
                          <span className="block font-semibold text-app-text-strong truncate">{member.name}</span>
                          <p className="text-xs text-app-muted truncate">
                            {matchingPlan ? matchingPlan.name : member.planName || t('pages.dashboard.customPlan')}
                            {' · '}
                            {formatDisplayDate(member.endDate)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-1.5 pl-10">
                        <StatusBadge status={member.status} />
                      </div>
                    </div>
                    {!readOnly && canRenewMember(member) && (
                      <div className="admin-row-actions shrink-0">
                        <button
                          type="button"
                          onClick={() => setRenewState({ isOpen: true, member })}
                          className={iconActionSuccess}
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
                            <MemberPhoto
                              memberId={member.id}
                              apiFetch={apiFetch}
                              name={member.name}
                              hasPhoto={member.hasPhoto}
                              expandable={false}
                              className="h-8 w-8 rounded-full object-cover"
                              fallbackClassName="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white dark:bg-teal-600"
                            />
                            <span className="truncate font-semibold text-app-text-strong">{member.name}</span>
                          </div>
                        </td>
                        <td className="truncate font-medium text-teal-700">
                          {matchingPlan ? matchingPlan.name : member.planName || t('pages.dashboard.customPlan')}
                        </td>
                        <td className="whitespace-nowrap text-app-text">{formatDisplayDate(member.endDate)}</td>
                        <td>
                          <StatusBadge status={member.status} />
                        </td>
                        <td>
                          <div className="flex justify-end">
                          {!readOnly && canRenewMember(member) && (
                            <button
                              onClick={() => setRenewState({ isOpen: true, member })}
                              className="inline-flex items-center gap-1 rounded-lg bg-[color:var(--color-status-active)]/10 px-2.5 py-1 text-xs font-semibold text-[color:var(--color-status-active)] hover:bg-[color:var(--color-status-active)]/20 cursor-pointer"
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
        </Card>

        <Card quiet className="md:col-span-2 flex flex-col p-4 sm:p-6">
          <h2 className={`mb-4 text-base font-semibold ${headingText} sm:mb-5 sm:text-lg`}>{t('pages.dashboard.revenueThisMonth')}</h2>
          <div className="flex-1 min-h-[220px] sm:min-h-[260px]">
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center text-sm text-app-muted">
                  {t('common.loading')}
                </div>
              }
            >
              <OwnerRevenueChart chartData={chartData} />
            </Suspense>
          </div>
        </Card>
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
