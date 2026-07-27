import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  TrendingUp,
  AlertTriangle,
  Plus,
  X,
  Users,
  Search,
  AlertCircle,
  DollarSign,
  RefreshCw,
  Edit,
  Trash2,
  ArrowLeftRight,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { parseApiResponse } from '../../utils/api';
import { formatMoneyShort } from '../../utils/formatMoney';
import InitialsAvatar from '../../components/InitialsAvatar';
import RegisterGymModal from '../../components/RegisterGymModal';
import GymDetailsModal from '../../components/GymDetailsModal';
import GymEditModal from '../../components/GymEditModal';
import { lazyWithRetry } from '../../utils/lazyWithRetry';

const AdminMembersChart = lazyWithRetry(() => import('../../components/AdminMembersChart'));
import RenewGymModal from '../../components/RenewGymModal';
import ChangeSaasPlanModal from '../../components/ChangeSaasPlanModal';
import AdminPaymentModal from '../../components/AdminPaymentModal';
import UnpaidBadge from '../../components/UnpaidBadge';
import StatusBadge from '../../components/StatusBadge';
import { FilterChip, FilterChipBar } from '../../components/FilterChip';
import MetricCard, { MetricCardSkeleton } from '../../components/MetricCard';
import { AdminTableRowsSkeleton, AdminListSkeleton, ChartPanelSkeleton } from '../../components/LoadingSkeletons';
import { runInBackground } from '../../utils/runInBackground';
import { useFlash } from '../../context/FlashContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import PaginationControls from '../../components/PaginationControls';
import { DEFAULT_PAGE_SIZE } from '../../utils/pagination';
import { formatDisplayDate } from '../../utils/date';
import { getGyms, getGymDetail, updateGym, deleteGym, enrollGym, renewGym, changeGymPlan, collectGymPayment, getSaasPayments, getAdminDashboard, resetOwnerPassword } from '../../services/gymAdminService';
import { getSaasPlans } from '../../services/saasPlanService';
import { gymNeedsCatchUpPayment } from '../../utils/saasPaymentReport';
import { canRenewGym, canChangeSaasPlan, mapGymDetailForBilling } from '../../utils/saasRenew';
import { mapGymFromApi } from '../../utils/apiMappers';
import { DEFAULT_GYM_SORT, ADMIN_GYM_SORT_OPTIONS, sortGymsList } from '../../utils/listSort';
import { ADMIN_SECTION_PATH, adminPathToSection } from '../../utils/adminRoutes';
import { useLatestRequestGuard } from '../../utils/requestGuard';
import { useTranslation } from 'react-i18next';
import { flashFromKey } from '../../i18n/flashToast';
import { cardSurface, tableRowHover, selectSurface } from '../../utils/surfaceClasses';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

const UNPAID = 'Unpaid';
const DUE_SOON = 'Due Soon';
const EXPIRED = 'Expired';
const GYM_PAGE_SIZE = DEFAULT_PAGE_SIZE;

function gymFilterToQuery(statusFilter) {
  if (statusFilter === UNPAID) return { filter: 'unpaid' };
  if (statusFilter === DUE_SOON) return { filter: 'due_soon' };
  if (statusFilter === EXPIRED) return { filter: 'expired' };
  if (statusFilter === 'All') return {};
  return { status: statusFilter };
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { apiFetch } = useAuth();
  const gymsRequestGuard = useLatestRequestGuard();
  const navigate = useNavigate();
  const location = useLocation();
  const adminSection = useMemo(() => adminPathToSection(location.pathname), [location.pathname]);

  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saasPlans, setSaasPlans] = useState([]);
  const [saasPlansLoaded, setSaasPlansLoaded] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [gymSort, setGymSort] = useState(DEFAULT_GYM_SORT);
  const [gymPage, setGymPage] = useState(1);
  const [gymTotal, setGymTotal] = useState(0);
  const [gymTotalPages, setGymTotalPages] = useState(1);
  const [gymCounts, setGymCounts] = useState({
    all: 0, unpaid: 0, active: 0, suspended: 0, expired: 0, dueSoon: 0,
  });

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [saasPayments, setSaasPayments] = useState([]);
  const [renewState, setRenewState] = useState({ isOpen: false, gym: null, error: '' });
  const [changePlanState, setChangePlanState] = useState({ isOpen: false, gym: null, error: '' });
  const [collectState, setCollectState] = useState({ isOpen: false, gym: null, error: '' });
  const [saving, setSaving] = useState(false);
  const [platformMetrics, setPlatformMetrics] = useState(null);
  const { showFlash } = useFlash();

  const [selectedGymId, setSelectedGymId] = useState(null);
  const [gymEditState, setGymEditState] = useState({ isOpen: false, gym: null, error: '' });
  const [gymToDelete, setGymToDelete] = useState(null);
  const [gymDetail, setGymDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);

  const loadSaasPlansForForms = useCallback(async () => {
    try {
      const res = await getSaasPlans(apiFetch);
      const data = await parseApiResponse(res);
      if (res.ok && Array.isArray(data)) {
        setSaasPlans(data.filter((p) => p.is_active !== false));
      }
    } catch {
      /* optional for forms */
    } finally {
      setSaasPlansLoaded(true);
    }
  }, [apiFetch]);

  const fetchSaasPayments = useCallback(async () => {
    try {
      const res = await getSaasPayments(apiFetch);
      const data = await parseApiResponse(res);
      if (res.ok && Array.isArray(data)) setSaasPayments(data);
    } catch {
      /* optional */
    }
  }, [apiFetch]);

  const fetchPlatformMetrics = useCallback(async () => {
    try {
      const res = await getAdminDashboard(apiFetch);
      const data = await parseApiResponse(res);
      if (res.ok) setPlatformMetrics(data);
    } catch {
      /* optional */
    }
  }, [apiFetch]);

  useEffect(() => {
    loadSaasPlansForForms();
    fetchSaasPayments();
    fetchPlatformMetrics();
  }, [loadSaasPlansForForms, fetchSaasPayments, fetchPlatformMetrics]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setGymPage(1);
  }, [debouncedSearch, statusFilter]);

  const displayedGyms = useMemo(() => sortGymsList(gyms, gymSort), [gyms, gymSort]);

  const fetchGyms = useCallback(async () => {
    const requestId = gymsRequestGuard.start();
    try {
      setLoading(true);
      setError('');
      const params = {
        page: gymPage,
        limit: GYM_PAGE_SIZE,
        search: debouncedSearch,
        sort: gymSort,
        ...gymFilterToQuery(statusFilter),
      };
      const res = await getGyms(apiFetch, params);
      const data = await parseApiResponse(res);
      if (!gymsRequestGuard.isLatest(requestId)) return;
      if (!res.ok) {
        throw new Error(
          data.error ||
          (res.status === 403
            ? 'Access denied. Log in as admin@saas.com and restart the backend (npm start).'
            : 'Failed to load gyms')
        );
      }
      setGyms((data.items || []).map(mapGymFromApi).filter(Boolean));
      setGymTotal(data.total ?? 0);
      setGymTotalPages(data.totalPages ?? 1);
      if (data.counts) setGymCounts(data.counts);
    } catch (err) {
      if (!gymsRequestGuard.isLatest(requestId)) return;
      setError(err.message);
    } finally {
      if (gymsRequestGuard.isLatest(requestId)) setLoading(false);
    }
  }, [apiFetch, gymPage, debouncedSearch, statusFilter, gymSort, gymsRequestGuard]);

  const fetchGymDetail = useCallback(
    async (gymId) => {
      try {
        setDetailLoading(true);
        setDetailError('');
        const res = await getGymDetail(apiFetch, gymId);
        const data = await parseApiResponse(res);
        if (!res.ok) throw new Error(data.error || 'Failed to load gym details');
        setGymDetail(data);
      } catch (err) {
        setDetailError(err.message);
        setGymDetail(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [apiFetch]
  );

  useEffect(() => {
    fetchGyms();
  }, [fetchGyms]);

  useEffect(() => {
    if (selectedGymId) {
      fetchGymDetail(selectedGymId);
    } else {
      setGymDetail(null);
    }
  }, [selectedGymId, fetchGymDetail, detailRefreshKey]);

  const fetchGymForBilling = useCallback(
    async (gymId) => {
      const res = await getGymDetail(apiFetch, gymId);
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to load gym');
      return mapGymDetailForBilling(data);
    },
    [apiFetch]
  );

  const openRenewGymModal = useCallback(
    async (gym) => {
      try {
        const fresh = await fetchGymForBilling(gym.id);
        setRenewState({ isOpen: true, gym: fresh, error: '' });
      } catch {
        setRenewState({ isOpen: true, gym, error: '' });
      }
    },
    [fetchGymForBilling]
  );

  const openChangePlanModal = useCallback(
    async (gym) => {
      try {
        const fresh = await fetchGymForBilling(gym.id);
        setChangePlanState({ isOpen: true, gym: fresh, error: '' });
      } catch {
        setChangePlanState({ isOpen: true, gym, error: '' });
      }
    },
    [fetchGymForBilling]
  );

  const openGymDetail = (gymId) => {
    setSelectedGymId(gymId);
  };

  const closeGymDetail = () => {
    setSelectedGymId(null);
    setGymDetail(null);
    setDetailError('');
  };

  const refreshAfterChange = async (gymId) => {
    await Promise.all([fetchGyms(), fetchSaasPayments(), fetchPlatformMetrics()]);
    if (gymId) {
      setDetailRefreshKey((k) => k + 1);
    }
  };

  const flashThenRefresh = (message, gymId) => {
    showFlash(message);
    runInBackground(refreshAfterChange(gymId));
  };

  const handleUpdateGym = async (gymId, formData) => {
    const payload = { ...formData };
    delete payload.saas_plan_id;
    const res = await updateGym(apiFetch, gymId, payload);
    const data = await parseApiResponse(res);
    if (!res.ok) throw new Error(data.error || 'Failed to update gym');
    flashThenRefresh(flashFromKey(t, 'gymUpdated'), gymId);
  };

  const handleResetOwnerPassword = async (gymId, password) => {
    const res = await resetOwnerPassword(apiFetch, gymId, { password });
    const data = await parseApiResponse(res);
    if (!res.ok) throw new Error(data.error || 'Failed to reset owner password');
    const ownerName = data.owner?.name || gymDetail?.owner_name || t('account.role.owner');
    flashThenRefresh(
      flashFromKey(t, 'ownerPasswordReset', { subtitleParams: { name: ownerName } }),
      gymId
    );
  };

  const handleGymEditSubmit = async (formData) => {
    if (!gymEditState.gym) return;
    setGymEditState((s) => ({ ...s, error: '' }));
    setSaving(true);
    try {
      await handleUpdateGym(gymEditState.gym.id, formData);
      setGymEditState({ isOpen: false, gym: null, error: '' });
    } catch (err) {
      setGymEditState((s) => ({ ...s, error: err.message }));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGym = async (gymId) => {
    const deletedGym = gyms.find((g) => g.id === gymId);
    const res = await deleteGym(apiFetch, gymId);
    if (!res.ok) {
      const data = await parseApiResponse(res);
      throw new Error(data.error || 'Failed to delete gym');
    }
    closeGymDetail();
    showFlash(
      flashFromKey(t, 'gymRemoved', {
        subtitleParams: { name: deletedGym?.name || 'Gym' },
        variant: 'danger',
      })
    );
    runInBackground(Promise.all([fetchGyms(), fetchPlatformMetrics()]));
  };

  const handleConfirmDeleteGym = async () => {
    if (!gymToDelete) return;
    const gym = gymToDelete;
    setGymToDelete(null);
    try {
      await handleDeleteGym(gym.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateGymSubmit = async (data) => {
    setRegisterError('');
    setSaving(true);
    try {
      const payload = {
        gym_name: data.gymName,
        owner_name: data.ownerName,
        username: data.username,
        password: data.password,
        phone: data.phone,
        saas_plan_id: data.saasPlanId,
        skip_payment: data.skipPayment,
      };
      if (data.email) payload.email = data.email;
      if (!data.skipPayment) {
        payload.amount = data.amount;
        payload.date = data.date;
        payload.method = data.method;
        payload.start_date = data.start_date || data.date;
      } else {
        payload.start_date = data.start_date;
      }
      const res = await enrollGym(apiFetch, payload);
      const resData = await parseApiResponse(res);
      if (!res.ok) throw new Error(resData.error || 'Failed to register gym');

      setIsRegisterOpen(false);
      flashThenRefresh(
        flashFromKey(t, data.skipPayment ? 'gymRegistered' : 'gymRegisteredWithPayment', {
          subtitleParams: { name: data.gymName },
        }),
        null
      );
    } catch (err) {
      setRegisterError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRenewSubmit = async (formData) => {
    if (!renewState.gym) return;
    setSaving(true);
    setRenewState((s) => ({ ...s, error: '' }));
    try {
      const res = await renewGym(apiFetch, renewState.gym.id, formData);
      const resData = await parseApiResponse(res);
      if (!res.ok) throw new Error(resData.error || 'Failed to renew gym');
      const gymId = renewState.gym.id;
      const name = renewState.gym.name;
      setRenewState({ isOpen: false, gym: null, error: '' });
      flashThenRefresh(flashFromKey(t, 'gymRenewed', { subtitleParams: { name } }), gymId);
    } catch (err) {
      setRenewState((s) => ({ ...s, error: err.message }));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePlanSubmit = async (formData) => {
    if (!changePlanState.gym) return;
    setSaving(true);
    setChangePlanState((s) => ({ ...s, error: '' }));
    try {
      const res = await changeGymPlan(apiFetch, changePlanState.gym.id, formData);
      const resData = await parseApiResponse(res);
      if (!res.ok) throw new Error(resData.error || 'Failed to change plan');
      const gymId = changePlanState.gym.id;
      const name = changePlanState.gym.name;
      setChangePlanState({ isOpen: false, gym: null, error: '' });
      flashThenRefresh(
        flashFromKey(t, formData.amount > 0 ? 'gymPlanChangedWithPayment' : 'gymPlanChanged', {
          subtitleParams: { name },
        }),
        gymId
      );
    } catch (err) {
      setChangePlanState((s) => ({ ...s, error: err.message }));
    } finally {
      setSaving(false);
    }
  };

  const handleCollectSubmit = async (formData) => {
    const gym = collectState.gym || gyms.find((g) => g.id === formData.gym_id);
    if (gym && canRenewGym(gym)) {
      setCollectState((s) => ({
        ...s,
        error: t('admin.useRenewForLicense'),
      }));
      return;
    }
    if (gym && !gym.isUnpaid && !gymNeedsCatchUpPayment(gym, saasPayments)) {
      setCollectState((s) => ({
        ...s,
        error: t('admin.collectPaymentActiveOnly'),
      }));
      return;
    }
    setSaving(true);
    setCollectState((s) => ({ ...s, error: '' }));
    try {
      const res = await collectGymPayment(apiFetch, formData);
      const resData = await parseApiResponse(res);
      if (!res.ok) throw new Error(resData.error || 'Failed to collect payment');
      const gymId = collectState.gym?.id;
      const name = collectState.gym?.name || 'Gym';
      setCollectState({ isOpen: false, gym: null, error: '' });
      flashThenRefresh(flashFromKey(t, 'adminPaymentRecorded', { subtitleParams: { name } }), gymId);
    } catch (err) {
      setCollectState((s) => ({ ...s, error: err.message }));
    } finally {
      setSaving(false);
    }
  };

  const totalGyms = platformMetrics?.totalGyms ?? gyms.length;
  const activeGyms = platformMetrics?.activeGyms ?? gyms.filter((g) => g.subscription_status?.toLowerCase() === 'active').length;
  const suspendedGyms = platformMetrics?.unpaidExpiredGyms ?? gyms.filter(
    (g) =>
      g.subscription_status?.toLowerCase() === 'suspended' ||
      g.subscription_status?.toLowerCase() === 'expired'
  ).length;

  const dueSoonGymsList = gyms.filter((g) => {
    if (g.subscription_status?.toLowerCase() !== 'active') return false;
    if (!g.saas_end_date) return false;
    const endDate = new Date(g.saas_end_date);
    const today = new Date();
    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  });

  const dueSoonGyms = platformMetrics?.dueSoonGyms ?? dueSoonGymsList.length;

  const alertGyms = gyms.filter((g) => {
    const isSuspendedOrExpired = g.subscription_status?.toLowerCase() === 'suspended' || g.subscription_status?.toLowerCase() === 'expired';
    return isSuspendedOrExpired || dueSoonGymsList.includes(g);
  }).slice(0, 5);

  const estimatedMrc = platformMetrics?.estimatedMonthlyRevenue ?? gyms.reduce((sum, g) => {
    if (g.subscription_status?.toLowerCase() !== 'active' || !g.saas_plan_price) return sum;
    const dur = Number(g.saas_plan_duration) || 1;
    return sum + Number(g.saas_plan_price) / dur;
  }, 0);

  const unpaidCount = gymCounts.unpaid ?? platformMetrics?.unpaidCatchUpGyms ?? 0;
  const totalGymsCount = gymCounts.all ?? platformMetrics?.totalGyms ?? gymTotal;
  const dueSoonFilterCount = gymCounts.dueSoon ?? platformMetrics?.dueSoonGyms ?? 0;
  const expiredLicenseCount = (gymCounts.expired ?? 0) + (gymCounts.suspended ?? 0);
  const dashboardBooting = platformMetrics === null;
  const gymsBooting = loading && gyms.length === 0;
  const adminBooting =
    (adminSection === 'dashboard' && dashboardBooting) ||
    (adminSection === 'gyms' && gymsBooting);

  const retryAdminLoad = useCallback(() => {
    fetchPlatformMetrics();
    if (adminSection === 'gyms' || adminSection === 'dashboard') {
      fetchGyms();
    }
  }, [fetchPlatformMetrics, fetchGyms, adminSection]);

  const chartData = platformMetrics?.topGymsByMembers?.length
    ? platformMetrics.topGymsByMembers
    : gyms
        .map((g) => ({ name: g.name, members: Number(g.active_member_count || 0) }))
        .sort((a, b) => b.members - a.members)
        .slice(0, 5);

  return (
    <>
      <div className="space-y-8">
          {adminSection === 'dashboard' ? (

            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-app-text-strong">{t('nav.dashboard')}</h1>
                <p className="text-sm text-slate-500">{t('admin.dashboardSubtitle')}</p>
              </div>

              {saasPlansLoaded && saasPlans.length === 0 && (
                <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-500/10 dark:text-amber-200">
                  {t('admin.noSaasPlansWarning')}{' '}
                  <button type="button" className="font-semibold underline" onClick={() => navigate(ADMIN_SECTION_PATH.plans)}>
                    {t('admin.goToSaasPlans')}
                  </button>
                </div>
              )}

              {error && (
                <div className="mb-6 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300 sm:flex-row sm:items-center sm:justify-between">
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={retryAdminLoad}
                    className="shrink-0 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                  >
                    {t('common.retry')}
                  </button>
                </div>
              )}

              <section className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 mb-8">
                {adminBooting ? (
                  Array.from({ length: 6 }).map((_, i) => <MetricCardSkeleton key={i} />)
                ) : (
                <>
                <MetricCard 
                  label={t('admin.activeGyms')} 
                  value={activeGyms} 
                  subValue={`/${totalGyms}`}
                  hint={`${totalGyms > 0 ? ((activeGyms / totalGyms) * 100).toFixed(0) : 0}%`}
                  icon={Building2} 
                  color="emerald" 
                  showProgressBar
                  progress={totalGyms > 0 ? (activeGyms / totalGyms) * 100 : 0}
                />
                <MetricCard 
                  label={t('metrics.dueSoon')} 
                  value={dueSoonGyms} 
                  hint={dueSoonGyms > 0 ? t('metrics.critical') : t('admin.noImmediateRenewals')} 
                  hintColor={dueSoonGyms > 0 ? 'text-rose-500' : undefined}
                  icon={AlertTriangle} 
                  color="rose" 
                  badge={dueSoonGyms > 0 ? t('metrics.critical') : null}
                />
                <MetricCard 
                  label={t('admin.suspendedExpired')} 
                  value={suspendedGyms} 
                  hint={suspendedGyms > 0 ? t('admin.requiresAttention') : t('admin.healthy')} 
                  icon={X} 
                  color="rose" 
                  badge={suspendedGyms > 0 ? t('metrics.actionRequired') : null}
                />
                <MetricCard 
                  label={t('admin.newGyms')} 
                  value={platformMetrics?.newGymsThisMonth ?? 0}
                  icon={Building2}
                  color="violet"
                  trend={platformMetrics?.newGymsTrendPercent ?? null}
                  trendCaption={platformMetrics?.newGymsDeltaLabel || t('metrics.vsLastMonth')}
                />
                <MetricCard 
                  label={t('admin.saasRevenue')} 
                  value={formatMoneyShort(platformMetrics?.saasIncomeThisMonth ?? 0)}
                  icon={DollarSign}
                  color="teal"
                  trend={platformMetrics?.saasRevenueTrendPercent ?? null}
                  trendCaption={t('metrics.vsLastMonth')}
                />
                <MetricCard 
                  label={t('admin.estMrr')} 
                  value={formatMoneyShort(estimatedMrc)} 
                  hint={t('admin.fromActivePlans')} 
                  icon={TrendingUp} 
                  color="teal" 
                  showHintBelow
                />
                </>
                )}
              </section>

              {adminBooting ? (
              <div className="grid gap-6 md:grid-cols-5">
                <div className="md:col-span-3">
                  <ChartPanelSkeleton tall />
                </div>
                <div className="md:col-span-2">
                  <ChartPanelSkeleton tall />
                </div>
              </div>
              ) : (
              <div className="grid gap-6 md:grid-cols-5">
                <div className={`md:col-span-3 overflow-hidden ${cardSurface}`}>
                  <div className="admin-panel-header">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-app-text-strong sm:text-lg">{t('admin.recentExpiringGyms')}</h2>
                    <button
                      onClick={() => {
                        setGymPage(1);
                        setStatusFilter(DUE_SOON);
                        navigate(ADMIN_SECTION_PATH.gyms);
                      }}
                      className="shrink-0 text-sm font-medium text-slate-500 transition-colors hover:text-teal-700 dark:text-app-muted dark:hover:text-teal-400 cursor-pointer"
                    >
                      {t('admin.viewAll')}
                    </button>
                  </div>

                  <div className="lg:hidden divide-y divide-slate-100 dark:divide-app-border-subtle">
                    {alertGyms.length > 0 ? (
                      alertGyms.map((gym) => (
                        <button
                          key={gym.id}
                          type="button"
                          onClick={() => openGymDetail(gym.id)}
                          className="flex w-full items-start justify-between gap-3 p-4 text-left active:bg-slate-50 dark:active:bg-app-surface/60"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-3">
                              <InitialsAvatar name={gym.name} size="sm" />
                              <span className="font-semibold text-slate-900 dark:text-app-text-strong truncate">{gym.name}</span>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">{gym.saas_plan_name || '—'}</p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {t('admin.expiresOn', { date: formatDisplayDate(gym.saas_end_date) })}
                            </p>
                            <div className="mt-2">
                              <StatusBadge status={gym.subscription_status} />
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="admin-panel-empty px-4">
                        {t('admin.noGymsExpiring')}
                      </p>
                    )}
                  </div>

                  <div className="hidden lg:block overflow-x-auto">
                    <table className="admin-data-table admin-dashboard-alert-table">
                      <thead>
                        <tr>
                          <th>{t('admin.gymNameCol')}</th>
                          <th>{t('table.plan')}</th>
                          <th>{t('admin.expiryDateCol')}</th>
                          <th className="text-right">{t('table.status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alertGyms.length > 0 ? (
                          alertGyms.map((gym) => (
                            <tr
                              key={gym.id}
                              className={`cursor-pointer transition-colors ${tableRowHover}`}
                              onClick={() => openGymDetail(gym.id)}
                            >
                              <td>
                                <div className="flex items-center gap-3 min-w-0">
                                  <InitialsAvatar name={gym.name} size="sm" />
                                  <span className="truncate font-semibold text-slate-900 dark:text-app-text-strong">{gym.name}</span>
                                </div>
                              </td>
                              <td className="truncate text-slate-500 dark:text-app-muted">
                                {gym.saas_plan_name || '—'}
                              </td>
                              <td className="whitespace-nowrap text-slate-600 dark:text-app-text">
                                {formatDisplayDate(gym.saas_end_date)}
                              </td>
                              <td>
                                <div className="flex justify-end">
                                  <StatusBadge status={gym.subscription_status} />
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className="admin-panel-empty">
                              {t('admin.noGymsExpiring')}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className={`md:col-span-2 flex flex-col p-6 ${cardSurface}`}>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-app-text-strong mb-5">{t('admin.topGymsByMembers')}</h2>
                  <div className="flex-1 min-h-[250px]">
                    <Suspense
                      fallback={
                        <p className="flex h-full items-center justify-center text-sm text-slate-400">
                          {t('common.loading')}
                        </p>
                      }
                    >
                      <AdminMembersChart chartData={chartData} />
                    </Suspense>
                  </div>
                </div>
              </div>
              )}

            </>
          
          ) : (

            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-app-text-strong">{t('admin.gymsTitle')}</h1>
                  <p className="text-sm text-slate-500">{t('admin.gymsSubtitle')}</p>
                </div>
                <Button
                  onClick={() => {
                    loadSaasPlansForForms();
                    setIsRegisterOpen(true);
                  }}
                  disabled={saasPlans.length === 0}
                >
                  <Plus className="h-4 w-4" /> {t('admin.registerGym')}
                </Button>
              </div>

              {error && (
                <div className="mb-6 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300 sm:flex-row sm:items-center sm:justify-between">
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={retryAdminLoad}
                    className="shrink-0 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                  >
                    {t('common.retry')}
                  </button>
                </div>
              )}

              <FilterChipBar>
                <FilterChip
                  variant="all"
                  label={t('filters.all')}
                  count={totalGymsCount}
                  active={statusFilter === 'All'}
                  onClick={() => {
                    setGymPage(1);
                    setStatusFilter('All');
                  }}
                />
                <FilterChip
                  variant="active"
                  label={t('filters.active')}
                  count={gymCounts.active ?? 0}
                  active={statusFilter === 'active'}
                  onClick={() => {
                    setGymPage(1);
                    setStatusFilter('active');
                  }}
                />
                <FilterChip
                  variant="unpaid"
                  label={t('filters.unpaid')}
                  count={unpaidCount}
                  active={statusFilter === UNPAID}
                  onClick={() => {
                    setGymPage(1);
                    setStatusFilter(UNPAID);
                  }}
                />
                <FilterChip
                  variant="due_soon"
                  label={t('filters.dueSoon')}
                  count={dueSoonFilterCount}
                  active={statusFilter === DUE_SOON}
                  onClick={() => {
                    setGymPage(1);
                    setStatusFilter(DUE_SOON);
                  }}
                />
                <FilterChip
                  variant="expired"
                  label={t('filters.expired')}
                  count={expiredLicenseCount}
                  active={statusFilter === EXPIRED}
                  onClick={() => {
                    setGymPage(1);
                    setStatusFilter(EXPIRED);
                  }}
                />
              </FilterChipBar>

              <Card className="mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-md">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Search className="h-5 w-5" />
                  </span>
                  <input
                    type="text"
                    className="admin-field block w-full pl-10 pr-4 placeholder-slate-400"
                    placeholder={t('admin.searchGymsPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <select
                    className={`ui-select ${selectSurface} min-w-[10rem] cursor-pointer`}
                    value={gymSort}
                    onChange={(e) => {
                      setGymPage(1);
                      setGymSort(e.target.value);
                    }}
                    aria-label={t('admin.sortGymsAria')}
                  >
                    {ADMIN_GYM_SORT_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>{t(opt.labelKey)}</option>
                    ))}
                  </select>
                </div>
              </Card>

              <Card className="overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50/50 dark:border-app-border-subtle dark:bg-app-surface/80 px-4 py-4 flex items-center justify-between sm:px-6">
                  <h2 className="text-base font-bold text-slate-900 dark:text-app-text-strong sm:text-lg">{t('admin.gymsSection')}</h2>
                  <button onClick={fetchGyms} className="rounded-lg p-2.5 text-slate-400 active:bg-slate-100 active:text-slate-600 dark:text-app-text sm:hover:bg-slate-100 sm:hover:text-slate-600 dark:text-app-text">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>

                <div className="lg:hidden divide-y divide-slate-100 dark:divide-app-border-subtle">
                  {loading && gyms.length === 0 ? (
                    <AdminListSkeleton rows={5} />
                  ) : displayedGyms.length > 0 ? (
                    displayedGyms.map((gym) => {
                      const isUnpaid = gym.isUnpaid;
                      return (
                        <div
                          key={gym.id}
                          className={`p-4 ${isUnpaid ? 'admin-row-unpaid' : ''} ${selectedGymId === gym.id ? 'ring-1 ring-inset ring-teal-200 dark:ring-teal-600/30' : ''}`}
                        >
                          <button
                            type="button"
                            onClick={() => openGymDetail(gym.id)}
                            className="w-full text-left"
                          >
                            <div className="flex items-start gap-3">
                              <InitialsAvatar name={gym.name} size="md" />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-slate-900 dark:text-app-text-strong">{gym.name}</span>
                                  {isUnpaid && <UnpaidBadge compact />}
                                  <StatusBadge status={gym.subscription_status} />
                                </div>
                                <p className="mt-1 text-sm text-slate-600 dark:text-app-text">{gym.owner_name}</p>
                                <p className="mt-0.5 text-sm text-teal-700">{gym.saas_plan_name || '—'}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {t('admin.activeMembersCount', { count: Number(gym.active_member_count ?? 0) })}
                                </p>
                              </div>
                            </div>
                          </button>
                          <div className="admin-row-actions mt-3" onClick={(e) => e.stopPropagation()}>
                            {isUnpaid && gym.subscription_status?.toLowerCase() === 'active' && !canRenewGym(gym) && (
                              <button
                                type="button"
                                onClick={() => setCollectState({ isOpen: true, gym, error: '' })}
                                className="text-amber-600 hover:bg-amber-100 hover:text-amber-800 dark:hover:bg-amber-950/40 cursor-pointer"
                                title={t('actions.collectPayment')}
                              >
                                <DollarSign className="h-4 w-4" />
                              </button>
                            )}
                            {canChangeSaasPlan(gym) &&
                              saasPlans.filter((p) => p.id !== gym.saas_plan_id).length > 0 && (
                              <button
                                type="button"
                                onClick={() => openChangePlanModal(gym)}
                                className="text-slate-400 hover:bg-slate-100 hover:text-teal-700 dark:hover:bg-app-surface cursor-pointer"
                                title={t('admin.changeSaasPlanTitle')}
                              >
                                <ArrowLeftRight className="h-4 w-4" />
                              </button>
                            )}
                            {canRenewGym(gym) && (
                              <button
                                type="button"
                                onClick={() => openRenewGymModal(gym)}
                                className="text-slate-400 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-app-surface cursor-pointer"
                                title={t('admin.renewLicenseTitle')}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setGymEditState({ isOpen: true, gym, error: '' })}
                              className="text-slate-400 hover:bg-slate-100 hover:text-teal-700 dark:hover:bg-app-surface cursor-pointer"
                              title={t('common.edit')}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setGymToDelete(gym)}
                              className="text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-app-surface cursor-pointer"
                              title={t('common.delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-16 text-center text-slate-400">
                      <AlertCircle className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                      <p className="text-sm font-medium">{t('admin.noGymsMatch')}</p>
                    </div>
                  )}
                </div>

                <div className="hidden lg:block overflow-x-auto">
                  <table className="admin-data-table admin-gyms-table min-w-[800px]">
                    <thead>
                      <tr>
                        <th>{t('table.gym')}</th>
                        <th>{t('table.owner')}</th>
                        <th>{t('table.saasPlan')}</th>
                        <th>{t('table.members')}</th>
                        <th>{t('table.status')}</th>
                        <th className="text-right">{t('table.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && gyms.length === 0 ? (
                        <AdminTableRowsSkeleton rows={8} cols={6} />
                      ) : displayedGyms.length > 0 ? (
                        displayedGyms.map((gym) => {
                          const isUnpaid = gym.isUnpaid;
                          return (
                          <tr
                            key={gym.id}
                            onClick={() => openGymDetail(gym.id)}
                            className={`cursor-pointer transition-colors ${
                              selectedGymId === gym.id ? 'bg-teal-50 dark:bg-teal-600/10' : ''
                            } ${isUnpaid ? 'admin-row-unpaid' : 'hover:bg-teal-50/60 dark:hover:bg-teal-600/10'}`}
                          >
                            <td>
                              <div className="flex items-center gap-3 min-w-0">
                                <InitialsAvatar name={gym.name} size="md" />
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                  <span className="truncate font-bold text-slate-900 dark:text-app-text-strong">{gym.name}</span>
                                  {isUnpaid && <UnpaidBadge compact />}
                                </div>
                              </div>
                            </td>
                            <td className="truncate text-slate-700 dark:text-app-text">{gym.owner_name}</td>
                            <td className="truncate text-slate-600 dark:text-app-text">
                              {gym.saas_plan_name || '—'}
                            </td>
                            <td>
                              <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-app-text">
                                <Users className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-app-muted" />
                                {Number(gym.active_member_count ?? 0)}
                              </span>
                            </td>
                            <td>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <StatusBadge status={gym.subscription_status} />
                                {isUnpaid && <UnpaidBadge />}
                              </div>
                            </td>
                            <td>
                              <div className="admin-row-actions">
                              {isUnpaid && gym.subscription_status?.toLowerCase() === 'active' && !canRenewGym(gym) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCollectState({ isOpen: true, gym, error: '' });
                                  }}
                                  className="text-amber-600 hover:bg-amber-100 hover:text-amber-800 dark:hover:bg-amber-950/40 cursor-pointer"
                                  title={t('actions.collectPayment')}
                                >
                                  <DollarSign className="h-4 w-4" />
                                </button>
                              )}
                              {canChangeSaasPlan(gym) &&
                                saasPlans.filter((p) => p.id !== gym.saas_plan_id).length > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openChangePlanModal(gym);
                                  }}
                                  className="text-slate-400 hover:bg-slate-100 hover:text-teal-700 dark:hover:bg-app-surface cursor-pointer"
                                  title={t('admin.changeSaasPlanTitle')}
                                >
                                  <ArrowLeftRight className="h-4 w-4" />
                                </button>
                              )}
                              {canRenewGym(gym) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openRenewGymModal(gym);
                                  }}
                                  className="text-slate-400 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-app-surface cursor-pointer"
                                  title={t('admin.renewLicenseTitle')}
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setGymEditState({ isOpen: true, gym, error: '' });
                                }}
                                className="text-slate-400 hover:bg-slate-100 hover:text-teal-700 dark:hover:bg-app-surface cursor-pointer"
                                title={t('admin.editGymDetailsTitle')}
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setGymToDelete(gym);
                                }}
                                className="text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-app-surface cursor-pointer"
                                title={t('admin.deleteGymActionTitle')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              </div>
                            </td>
                          </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center py-16 text-slate-400 font-medium">
                            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                            {t('admin.noGymsMatch')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <PaginationControls
                  page={gymPage}
                  totalPages={gymTotalPages}
                  total={gymTotal}
                  limit={GYM_PAGE_SIZE}
                  onPageChange={setGymPage}
                  disabled={loading}
                />
                <p className="px-6 py-3 text-xs text-slate-400 border-t border-slate-100 dark:border-app-border-subtle">
                  {t('admin.rowActionsHint')}
                </p>
              </Card>
            </>
          
          )}
      </div>

      <GymDetailsModal
        selectedGymId={selectedGymId}
        onClose={closeGymDetail}
        gymDetail={gymDetail}
        saasPlans={saasPlans}
        detailLoading={detailLoading}
        detailError={detailError}
        onUpdate={handleUpdateGym}
        onDelete={handleDeleteGym}
        onRenew={openRenewGymModal}
        onChangePlan={openChangePlanModal}
        onCollectPayment={(gym) => setCollectState({ isOpen: true, gym, error: '' })}
        onResetOwnerPassword={handleResetOwnerPassword}
      />

      <RenewGymModal
        isOpen={renewState.isOpen}
        onClose={() => setRenewState({ isOpen: false, gym: null, error: '' })}
        onSubmit={handleRenewSubmit}
        gym={renewState.gym}
        saasPlans={saasPlans}
        saving={saving}
        error={renewState.error}
      />

      <ChangeSaasPlanModal
        isOpen={changePlanState.isOpen}
        onClose={() => setChangePlanState({ isOpen: false, gym: null, error: '' })}
        onSubmit={handleChangePlanSubmit}
        gym={changePlanState.gym}
        saasPlans={saasPlans}
        saving={saving}
        error={changePlanState.error}
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

      <RegisterGymModal
        isOpen={isRegisterOpen}
        onClose={() => {
          setIsRegisterOpen(false);
          setRegisterError('');
        }}
        onSubmit={handleCreateGymSubmit}
        saasPlans={saasPlans}
        saving={saving}
        error={registerError}
      />

      <GymEditModal
        isOpen={gymEditState.isOpen}
        onClose={() => setGymEditState({ isOpen: false, gym: null, error: '' })}
        onSubmit={handleGymEditSubmit}
        gym={gymEditState.gym || gymDetail}
        saasPlans={saasPlans}
        saving={saving}
        error={gymEditState.error}
      />

      <ConfirmDialog
        isOpen={!!gymToDelete}
        title={t('admin.deleteGymTitle')}
        message={t('admin.deleteGymMessage', { name: gymToDelete?.name })}
        confirmText={t('admin.deleteGymConfirm')}
        onConfirm={handleConfirmDeleteGym}
        onCancel={() => setGymToDelete(null)}
      />

    </>
  );
}
