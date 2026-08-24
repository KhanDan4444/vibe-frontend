// src/pages/owner/OwnerDashboard.jsx
import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGym } from '../../context/GymContext';
import { isGymOwner } from '../../utils/roles';
import { Users, AlertTriangle, XCircle, TrendingUp, RefreshCw, ClipboardCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MetricCard, { MetricCardSkeleton } from '../../components/MetricCard';
import StatusBadge from '../../components/StatusBadge';
import RenewModal from '../../components/RenewModal';
import MemberPhoto from '../../components/MemberPhoto';
import BranchComparisonTable from '../../components/BranchComparisonTable';
import { canRenewMember } from '../../utils/memberRenew';
import { mapMemberFromApi } from '../../utils/apiMappers';
import { formatDisplayDate } from '../../utils/date';
import { resolveMemberPlanLabel } from '../../utils/formatPlanDisplayName';
import { parseApiResponse } from '../../utils/api';
import { getBranchComparison } from '../../services/dashboardService';
import { useTranslation } from 'react-i18next';
import { flashFromKey } from '../../i18n/flashToast';
import { formatMoney } from '../../utils/formatMoney';
import { headingText, mutedText, panelQuiet, tableRowHover, renewActionBtn, sectionTitle } from '../../utils/surfaceClasses';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/PageHeader';
import { lazyWithRetry } from '../../utils/lazyWithRetry';

const OwnerRevenueChart = lazyWithRetry(() => import('../../components/OwnerRevenueChart'));

const ATTENTION_PREVIEW = 5;

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
  const checkedInToday = summary.checkedInToday ?? 0;
  const revenueTrend = summary.revenueTrendPercent ?? null;

  const alertMembers = (summary.alertMembers || [])
    .map((m) => mapMemberFromApi(m))
    .filter(Boolean)
    .slice(0, ATTENTION_PREVIEW);

  const chartData = (summary.revenueChart || []).map((r) => ({
    date: formatDisplayDate(r.date),
    amount: Number(r.amount),
  }));

  const handleRenewSubmit = async (data) => {
    if (!renewState.member) return;
    setRenewSaving(true);
    setRenewError('');
    try {
      const result = await renewMember(renewState.member.id, data);
      const name = renewState.member.name;
      const phone = renewState.member.phone;
      setRenewState({ isOpen: false, member: null });
      if (phone && result && result.sms_sent === false) {
        showFlash(flashFromKey(t, 'renewedSmsFailed', { variant: 'warning' }));
      } else {
        showFlash(flashFromKey(t, 'renewed', { subtitleParams: { name } }));
      }
    } catch (err) {
      setRenewError(err.message);
    } finally {
      setRenewSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {gymName ? (
        <PageHeader title={gymName} subtitle={t('pages.dashboard.subtitle')} />
      ) : (
        <div className="mb-5 sm:mb-6">
          <div
            className="app-skeleton h-10 w-52 max-w-[70%] rounded-lg sm:h-11 sm:w-72"
            aria-hidden
          />
          <p className={`mt-1.5 max-w-2xl text-sm leading-relaxed ${mutedText}`}>
            {t('pages.dashboard.subtitle')}
          </p>
        </div>
      )}

      <div className="app-metric-grid grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
        {gymBooting ? (
          <>
            <MetricCardSkeleton variant="emphasis" className="col-span-2 lg:col-span-2" />
            {Array.from({ length: 4 }).map((_, i) => (
              <MetricCardSkeleton key={i} variant="dense" className="lg:col-span-1" />
            ))}
          </>
        ) : (
          <>
            <MetricCard
              className="col-span-2 lg:col-span-2"
              variant="emphasis"
              label={t('metrics.activeMembers')}
              value={`${activeMembersCount}`}
              subValue={`/${totalMembersCount}`}
              icon={Users}
              color="emerald"
              showProgressBar
              progress={totalMembersCount > 0 ? (activeMembersCount / totalMembersCount) * 100 : 0}
            />
            <MetricCard
              className="lg:col-span-1"
              variant="dense"
              label={t('metrics.dueSoon')}
              value={dueSoonMembersCount}
              icon={AlertTriangle}
              color="sky"
            />
            <MetricCard
              className="lg:col-span-1"
              variant="dense"
              label={t('metrics.expired')}
              value={expiredMembersCount}
              icon={XCircle}
              color="rose"
            />
            <MetricCard
              className="lg:col-span-1 cursor-pointer"
              variant="dense"
              label={t('metrics.checkedInToday')}
              value={checkedInToday}
              icon={ClipboardCheck}
              color="amber"
              onClick={() => navigate('/dashboard/check-in')}
            />
            <MetricCard
              className="lg:col-span-1"
              variant="dense"
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
            <Card className="app-attention-panel md:col-span-3 overflow-hidden">
              <div className="admin-panel-header">
                <div className="min-w-0">
                  <h2 className={sectionTitle}>
                    {t('pages.dashboard.expiringSection')}
                  </h2>
                  <p className={`mt-0.5 text-xs sm:text-sm ${mutedText}`}>{t('pages.dashboard.expiringSectionHint')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/members', { state: { filter: 'Expired' } })}
                  className="min-h-9 shrink-0 rounded-md px-3 py-1.5 text-sm font-semibold text-teal-800 transition-colors hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30 dark:text-teal-300 dark:hover:bg-teal-600/15"
                >
                  {t('common.viewAll')}
                </button>
              </div>

              <div className="lg:hidden divide-y divide-app-border-subtle">
                {alertMembers.length > 0 ? (
                  alertMembers.map((member) => {
                    const planLabel = resolveMemberPlanLabel(
                      member,
                      plans,
                      t('pages.dashboard.customPlan'),
                    );
                    return (
                      <div key={member.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2.5">
                            <MemberPhoto
                              memberId={member.id}
                              apiFetch={apiFetch}
                              name={member.name}
                              hasPhoto={member.hasPhoto}
                              expandable={false}
                              className="h-9 w-9 rounded-full object-cover"
                              fallbackClassName="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-border text-xs font-bold text-app-text"
                            />
                            <div className="min-w-0">
                              <span className="block truncate font-semibold text-app-text-strong">{member.name}</span>
                              <p className="truncate text-xs text-app-muted">
                                {planLabel}
                                {' · '}
                                {formatDisplayDate(member.endDate)}
                              </p>
                            </div>
                          </div>
                          <div className="mt-1.5 pl-11">
                            <StatusBadge status={member.status} />
                          </div>
                        </div>
                        {!readOnly && canRenewMember(member) && (
                          <div className="admin-row-actions shrink-0">
                            <button
                              type="button"
                              onClick={() => setRenewState({ isOpen: true, member })}
                              className={renewActionBtn}
                              title={t('actions.renew')}
                            >
                              <RefreshCw className="h-3.5 w-3.5" /> {t('actions.renew')}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="admin-panel-empty px-4">{t('pages.dashboard.noExpiring')}</p>
                )}
              </div>

              <div className="hidden overflow-x-auto lg:block">
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
                        const planLabel = resolveMemberPlanLabel(
                          member,
                          plans,
                          t('pages.dashboard.customPlan'),
                        );
                        return (
                          <tr key={member.id} className={tableRowHover}>
                            <td>
                              <div className="flex min-w-0 items-center gap-3">
                                <MemberPhoto
                                  memberId={member.id}
                                  apiFetch={apiFetch}
                                  name={member.name}
                                  hasPhoto={member.hasPhoto}
                                  expandable={false}
                                  className="h-8 w-8 rounded-full object-cover"
                                  fallbackClassName="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-app-border text-xs font-bold text-app-text"
                                />
                                <span className="truncate font-semibold text-app-text-strong">{member.name}</span>
                              </div>
                            </td>
                            <td className="truncate font-medium text-app-text">
                              {planLabel}
                            </td>
                            <td className="whitespace-nowrap text-app-text">{formatDisplayDate(member.endDate)}</td>
                            <td>
                              <StatusBadge status={member.status} />
                            </td>
                            <td>
                              <div className="admin-row-actions">
                                {!readOnly && canRenewMember(member) && (
                                  <button
                                    type="button"
                                    onClick={() => setRenewState({ isOpen: true, member })}
                                    className={renewActionBtn}
                                  >
                                    <RefreshCw className="h-3.5 w-3.5" /> {t('actions.renew')}
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

            <Card quiet className="app-chart-panel flex flex-col p-4 sm:p-5 md:col-span-2">
              <h2 className={`mb-3 sm:mb-4 ${sectionTitle}`}>
                {t('pages.dashboard.revenueThisMonth')}
              </h2>
              <div className="min-h-[200px] flex-1 sm:min-h-[240px]">
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
