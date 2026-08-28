import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  TrendingUp,
  AlertTriangle,
  X,
  Users,
  AlertCircle,
  DollarSign,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { parseApiResponse } from '../../utils/api';
import { formatMoneyShort } from '../../utils/formatMoney';
import InitialsAvatar from '../../components/InitialsAvatar';
import GymDetailsModal from '../../components/GymDetailsModal';
import GymEditModal from '../../components/GymEditModal';
import { lazyWithRetry } from '../../utils/lazyWithRetry';

const AdminMembersChart = lazyWithRetry(() => import('../../components/AdminMembersChart'));
import RenewGymModal from '../../components/RenewGymModal';
import ChangeSaasPlanModal from '../../components/ChangeSaasPlanModal';
import AdminPaymentModal from '../../components/AdminPaymentModal';
import UnpaidBadge from '../../components/UnpaidBadge';
import GymListRowActions from '../../components/GymListRowActions';
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
import { getGyms, getArchivedGyms, getGymDetail, updateGym, deleteGym, restoreGym, renewGym, changeGymPlan, collectGymPayment, getSaasPayments, getAdminDashboard, resetOwnerPassword } from '../../services/gymAdminService';
import { getSaasPlans } from '../../services/saasPlanService';
import { gymNeedsCatchUpPayment } from '../../utils/saasPaymentReport';
import { canRenewGym, canChangeSaasPlan, mapGymDetailForBilling } from '../../utils/saasRenew';
import { mapGymFromApi, gymDetailPreviewFromList } from '../../utils/apiMappers';
import { DEFAULT_GYM_SORT, ADMIN_GYM_SORT_OPTIONS, sortGymsList } from '../../utils/listSort';
import { ADMIN_SECTION_PATH, adminPathToSection } from '../../utils/adminRoutes';
import { useLatestRequestGuard } from '../../utils/requestGuard';
import { useTranslation } from 'react-i18next';
import { FLASH_COMMITTED_MS } from '../../components/FlashBanner';
import { flashFromKey } from '../../i18n/flashToast';
import { scheduleDeleteWithUndo, UNDO_DELAY_MS } from '../../utils/scheduleWithUndo';
import { tableRowHover,
  pageTitle,
  mutedText,
  cardSurface, sectionTitle, panelTitle } from '../../utils/surfaceClasses';
import Button from '../../components/ui/Button';
import ToolbarPicker from '../../components/ToolbarPicker';
import SearchField from '../../components/SearchField';
import Card from '../../components/ui/Card';
import ErrorRetryBanner from '../../components/ErrorRetryBanner';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';

const UNPAID = 'Unpaid';
const DUE_SOON = 'Due Soon';
const TRIAL_ENDING = 'Trial ending';
const EXPIRED = 'Expired';
const FORMER = 'Former';
const GYM_FILTER_STORAGE_KEY = 'vibe.admin.gyms.statusFilter';
const GYM_PAGE_SIZE = DEFAULT_PAGE_SIZE;

function gymFilterToQuery(statusFilter) {
  if (statusFilter === UNPAID) return { filter: 'unpaid' };
  if (statusFilter === DUE_SOON) return { filter: 'due_soon' };
  if (statusFilter === TRIAL_ENDING) return { filter: 'trial_ending' };
  if (statusFilter === EXPIRED) return { filter: 'expired' };
  if (statusFilter === 'All' || statusFilter === FORMER) return {};
  return { status: statusFilter };
}

function readSavedGymFilter() {
  try {
    const saved = sessionStorage.getItem(GYM_FILTER_STORAGE_KEY);
    const allowed = new Set(['All', FORMER, UNPAID, 'active', DUE_SOON, TRIAL_ENDING, EXPIRED]);
    if (allowed.has(saved)) return saved;
  } catch {
    /* ignore */
  }
  return 'All';
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
  const [statusFilter, setStatusFilter] = useState(readSavedGymFilter);
  const [gymSort, setGymSort] = useState(DEFAULT_GYM_SORT);
  const [gymPage, setGymPage] = useState(1);
  const [gymTotal, setGymTotal] = useState(0);
  const [gymTotalPages, setGymTotalPages] = useState(1);
  const [gymCounts, setGymCounts] = useState({
    all: 0, unpaid: 0, active: 0, suspended: 0, expired: 0, dueSoon: 0, trialEnding: 0,
  });

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
  const [archivedTotal, setArchivedTotal] = useState(0);
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

  useEffect(() => {
    try {
      sessionStorage.setItem(GYM_FILTER_STORAGE_KEY, statusFilter);
    } catch {
      /* ignore */
    }
  }, [statusFilter]);

  useEffect(() => {
    const filter = location.state?.filter;
    if (!filter) return;
    const allowed = new Set(['All', FORMER, UNPAID, 'active', DUE_SOON, TRIAL_ENDING, EXPIRED]);
    if (!allowed.has(filter)) return;
    setGymPage(1);
    setStatusFilter(filter);
    window.history.replaceState({}, document.title);
  }, [location.state]);

  const showingFormer = adminSection === 'gyms' && statusFilter === FORMER;
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
      const res = showingFormer
        ? await getArchivedGyms(apiFetch, params)
        : await getGyms(apiFetch, params);
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
      if (!showingFormer) {
        if (data.archivedTotal != null) {
          setArchivedTotal(data.archivedTotal);
        } else {
          try {
            const archivedRes = await getArchivedGyms(apiFetch, { page: 1, limit: 1 });
            const archivedData = await parseApiResponse(archivedRes);
            if (!gymsRequestGuard.isLatest(requestId)) return;
            if (archivedRes.ok) setArchivedTotal(archivedData.total ?? 0);
          } catch {
            /* live list still usable */
          }
        }
      } else if (!debouncedSearch) {
        setArchivedTotal(data.total ?? 0);
      }
    } catch (err) {
      if (!gymsRequestGuard.isLatest(requestId)) return;
      setError(err.message);
    } finally {
      if (gymsRequestGuard.isLatest(requestId)) setLoading(false);
    }
  }, [apiFetch, gymPage, debouncedSearch, statusFilter, gymSort, gymsRequestGuard, showingFormer]);

  const fetchGymDetail = useCallback(
    async (gymId) => {
      try {
        setDetailLoading(true);
        setDetailError('');
        const res = await getGymDetail(apiFetch, gymId);
        const data = await parseApiResponse(res);
        if (!res.ok) throw new Error(data.error || 'Failed to load gym details');
        setGymDetail((current) => {
          // Ignore stale responses if the user already opened another gym.
          if (current && current.id != null && Number(current.id) !== Number(gymId)) return current;
          return data;
        });
      } catch (err) {
        setDetailError(err.message);
        setGymDetail((current) => {
          // Keep list-row preview if the background refresh failed.
          if (current && Number(current.id) === Number(gymId)) return current;
          return null;
        });
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

  const openGymDetail = (gym) => {
    // Open immediately with list-row data so the drawer feels instant (same as owner members).
    const openedId = gym.id;
    setSelectedGymId(openedId);
    setGymDetail(gymDetailPreviewFromList(gym));
    setDetailError('');
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
    const deletedGym = gyms.find((g) => g.id === gymId) || gymDetail;
    const name = deletedGym?.name || 'Gym';
    closeGymDetail();
    setGyms((prev) => prev.filter((g) => g.id !== gymId));
    scheduleDeleteWithUndo({
      showFlash,
      t,
      pendingKey: 'gymDeletePending',
      cancelledKey: 'gymDeleteCancelled',
      committedKey: 'gymRemoved',
      subtitleParams: { name },
      onUndo: () => {
        runInBackground(fetchGyms());
      },
      onCommit: async () => {
        const res = await deleteGym(apiFetch, gymId);
        if (!res.ok) {
          const data = await parseApiResponse(res);
          throw new Error(data.error || 'Failed to remove gym');
        }
        runInBackground(Promise.all([fetchGyms(), fetchPlatformMetrics()]));
      },
    });
  };

  const handleRestoreGym = async (gym) => {
    const id = gym.id;
    const name = gym.name || 'Gym';
    closeGymDetail();
    setSaving(true);
    try {
      const res = await restoreGym(apiFetch, id);
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to restore gym');
      setStatusFilter('All');
      await Promise.all([fetchGyms(), fetchPlatformMetrics()]);
      showFlash({
        ...flashFromKey(t, 'gymRestored', { subtitleParams: { name } }),
        durationMs: UNDO_DELAY_MS,
        urgent: true,
        actionHint: t('flash.undoHint'),
        action: {
          label: t('common.undo'),
          onClick: () => {
            runInBackground((async () => {
              try {
                const undoRes = await deleteGym(apiFetch, id);
                if (!undoRes.ok) {
                  const undoData = await parseApiResponse(undoRes);
                  throw new Error(undoData.error || 'Failed to undo restore');
                }
                setStatusFilter(FORMER);
                await Promise.all([fetchGyms(), fetchPlatformMetrics()]);
                showFlash({
                  ...flashFromKey(t, 'gymRestoreUndone', { subtitleParams: { name } }),
                  durationMs: FLASH_COMMITTED_MS,
                });
              } catch (err) {
                setError(err.message);
              }
            })());
          },
        },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
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
  const trialEndingFilterCount = gymCounts.trialEnding ?? platformMetrics?.trialEndingGyms ?? 0;
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

  const gymsFiltered = statusFilter !== 'All' || Boolean(debouncedSearch);
  const noGymsYet = !loading && !gymsFiltered && gyms.length === 0 && archivedTotal === 0;
  const canRegisterGym = !(saasPlansLoaded && saasPlans.length === 0);
  const openRegisterGym = () => navigate(`${ADMIN_SECTION_PATH.gyms}/register`);

  return (
    <>
      <div className={adminSection === 'dashboard' ? 'space-y-8' : 'space-y-4 sm:space-y-5'}>
          {adminSection === 'dashboard' ? (

            <>
              <div>
                <h1 className={pageTitle}>{t('nav.dashboard')}</h1>
                <p className={`mt-2 max-w-xl text-sm leading-relaxed ${mutedText}`}>{t('admin.dashboardSubtitle')}</p>
              </div>

              {saasPlansLoaded && saasPlans.length === 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-500/10 dark:text-amber-200">
                  {t('admin.noSaasPlansWarning')}{' '}
                  <button type="button" className="font-semibold underline" onClick={() => navigate(ADMIN_SECTION_PATH.plans)}>
                    {t('admin.goToSaasPlans')}
                  </button>
                </div>
              )}

              {error ? (
                <ErrorRetryBanner message={error} onRetry={retryAdminLoad} />
              ) : null}

              <div className="app-metric-grid grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
                {adminBooting ? (
                  <>
                    <MetricCardSkeleton variant="emphasis" className="col-span-2" />
                    {Array.from({ length: 4 }).map((_, i) => (
                      <MetricCardSkeleton key={i} variant="dense" />
                    ))}
                  </>
                ) : (
                <>
                <MetricCard
                  className="col-span-2 cursor-pointer"
                  variant="emphasis"
                  label={t('admin.activeGyms')}
                  value={activeGyms}
                  subValue={`/${totalGyms}`}
                  hint={`${totalGyms > 0 ? ((activeGyms / totalGyms) * 100).toFixed(0) : 0}%`}
                  icon={Building2}
                  color="emerald"
                  showProgressBar
                  progress={totalGyms > 0 ? (activeGyms / totalGyms) * 100 : 0}
                  onClick={() => {
                    setGymPage(1);
                    setStatusFilter('active');
                    navigate(ADMIN_SECTION_PATH.gyms, { state: { filter: 'active' } });
                  }}
                />
                <MetricCard
                  className="cursor-pointer"
                  variant="dense"
                  label={t('admin.trialEndingGyms')}
                  value={platformMetrics?.trialEndingGyms ?? trialEndingFilterCount}
                  hint={trialEndingFilterCount > 0 ? t('admin.trialEndingHint') : null}
                  icon={Sparkles}
                  color="amber"
                  badge={trialEndingFilterCount > 0 ? t('metrics.critical') : null}
                  onClick={() => {
                    setGymPage(1);
                    setStatusFilter(TRIAL_ENDING);
                    navigate(ADMIN_SECTION_PATH.gyms, { state: { filter: TRIAL_ENDING } });
                  }}
                />
                <MetricCard
                  className="cursor-pointer"
                  variant="dense"
                  label={t('metrics.dueSoon')}
                  value={dueSoonGyms}
                  hint={dueSoonGyms > 0 ? null : t('admin.noImmediateRenewals')}
                  icon={AlertTriangle}
                  color="sky"
                  badge={dueSoonGyms > 0 ? t('metrics.critical') : null}
                  onClick={() => {
                    setGymPage(1);
                    setStatusFilter(DUE_SOON);
                    navigate(ADMIN_SECTION_PATH.gyms, { state: { filter: DUE_SOON } });
                  }}
                />
                <MetricCard
                  className="cursor-pointer"
                  variant="dense"
                  label={t('admin.suspendedExpired')}
                  value={suspendedGyms}
                  hint={suspendedGyms > 0 ? null : t('admin.healthy')}
                  icon={X}
                  color="rose"
                  badge={suspendedGyms > 0 ? t('metrics.actionRequired') : null}
                  onClick={() => {
                    setGymPage(1);
                    setStatusFilter(EXPIRED);
                    navigate(ADMIN_SECTION_PATH.gyms, { state: { filter: EXPIRED } });
                  }}
                />
                <MetricCard
                  className="cursor-pointer"
                  variant="dense"
                  label={t('admin.newGyms')}
                  value={platformMetrics?.newGymsThisMonth ?? 0}
                  icon={Building2}
                  color="violet"
                  trend={platformMetrics?.newGymsTrendPercent ?? null}
                  trendCaption={platformMetrics?.newGymsDeltaLabel || t('metrics.vsLastMonth')}
                  onClick={() => {
                    setGymPage(1);
                    setStatusFilter('All');
                    navigate(ADMIN_SECTION_PATH.gyms, { state: { filter: 'All' } });
                  }}
                />
                <MetricCard
                  className="cursor-pointer"
                  variant="dense"
                  label={t('admin.saasRevenue')}
                  value={formatMoneyShort(platformMetrics?.saasIncomeThisMonth ?? 0)}
                  icon={DollarSign}
                  color="teal"
                  trend={platformMetrics?.saasRevenueTrendPercent ?? null}
                  trendCaption={t('metrics.vsLastMonth')}
                  onClick={() => navigate(ADMIN_SECTION_PATH.payments)}
                />
                <MetricCard
                  className="cursor-pointer"
                  variant="dense"
                  label={t('admin.estMrr')}
                  value={formatMoneyShort(estimatedMrc)}
                  hint={t('admin.fromActivePlans')}
                  icon={TrendingUp}
                  color="teal"
                  showHintBelow
                  onClick={() => navigate(ADMIN_SECTION_PATH.plans)}
                />
                </>
                )}
              </div>

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
                <Card className="app-attention-panel md:col-span-3 overflow-hidden">
                  <div className="admin-panel-header">
                    <div className="min-w-0">
                      <h2 className={sectionTitle}>
                        {t('admin.recentExpiringGyms')}
                      </h2>
                      <p className={`mt-0.5 text-xs sm:text-sm ${mutedText}`}>{t('admin.expiringSectionHint')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setGymPage(1);
                        setStatusFilter(DUE_SOON);
                        navigate(ADMIN_SECTION_PATH.gyms);
                      }}
                      className="min-h-9 shrink-0 rounded-md px-3 py-1.5 text-sm font-semibold text-teal-800 transition-colors hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30 dark:text-teal-300 dark:hover:bg-teal-600/15"
                    >
                      {t('admin.viewAll')}
                    </button>
                  </div>

                  <div className="lg:hidden space-y-3 p-3">
                    {alertGyms.length > 0 ? (
                      alertGyms.map((gym) => (
                        <button
                          key={gym.id}
                          type="button"
                          onClick={() => openGymDetail(gym)}
                          className={`${cardSurface} flex w-full items-start justify-between gap-3 p-4 text-left active:bg-app-surface/60`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-3">
                              <InitialsAvatar name={gym.name} size="sm" />
                              <span className="font-semibold text-app-text-strong truncate">{gym.name}</span>
                            </div>
                            <p className="mt-1 text-sm text-app-muted">{gym.saas_plan_name || '—'}</p>
                            <p className="mt-0.5 text-xs text-app-muted">
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
                              onClick={() => openGymDetail(gym)}
                            >
                              <td>
                                <div className="flex items-center gap-3 min-w-0">
                                  <InitialsAvatar name={gym.name} size="sm" />
                                  <span className="truncate font-semibold text-app-text-strong">{gym.name}</span>
                                </div>
                              </td>
                              <td className="truncate text-app-muted">
                                {gym.saas_plan_name || '—'}
                              </td>
                              <td className="whitespace-nowrap text-app-text">
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
                </Card>

                <Card quiet className="app-chart-panel flex flex-col p-4 sm:p-5 md:col-span-2">
                  <h2 className={`mb-3 sm:mb-4 ${sectionTitle}`}>
                    {t('admin.topGymsByMembers')}
                  </h2>
                  <div className="min-h-[200px] flex-1 sm:min-h-[250px]">
                    <Suspense
                      fallback={
                        <p className="flex h-full items-center justify-center text-sm text-app-muted">
                          {t('common.loading')}
                        </p>
                      }
                    >
                      <AdminMembersChart chartData={chartData} />
                    </Suspense>
                  </div>
                </Card>
              </div>
              )}

            </>
          
          ) : (

            <>
              <PageHeader
                title={showingFormer ? t('admin.formerGymsTitle') : t('admin.gymsTitle')}
                subtitle={showingFormer ? t('admin.formerGymsSubtitle') : t('admin.gymsSubtitle')}
                actions={
                  !noGymsYet && !showingFormer ? (
                    <Button onClick={openRegisterGym} disabled={!canRegisterGym}>
                      {t('admin.registerGym')}
                    </Button>
                  ) : null
                }
              />

              {error ? (
                <ErrorRetryBanner message={error} onRetry={retryAdminLoad} />
              ) : null}

              {noGymsYet ? (
                <div className={cardSurface}>
                  <EmptyState
                    icon={AlertCircle}
                    title={t('admin.noGymsEmptyTitle')}
                    body={t('admin.noGymsEmptyBody')}
                    action={
                      <Button onClick={openRegisterGym} disabled={!canRegisterGym}>
                        {t('admin.registerGym')}
                      </Button>
                    }
                  />
                </div>
              ) : (
                <>
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
                    variant="trial_ending"
                    label={t('filters.trialEnding')}
                    count={trialEndingFilterCount}
                    active={statusFilter === TRIAL_ENDING}
                    onClick={() => {
                      setGymPage(1);
                      setStatusFilter(TRIAL_ENDING);
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
                  <span className="filter-chip-archive-rule" aria-hidden />
                  <FilterChip
                    variant="former"
                    label={t('admin.former')}
                    count={archivedTotal}
                    active={statusFilter === FORMER}
                    onClick={() => {
                      setGymPage(1);
                      setStatusFilter(FORMER);
                    }}
                  />
                </FilterChipBar>

                <div className="flex flex-col gap-3 border-b border-app-border-subtle pb-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                  <SearchField
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder={showingFormer ? t('admin.searchFormerGymsPlaceholder') : t('admin.searchGymsPlaceholder')}
                  />
                  {!showingFormer ? (
                  <ToolbarPicker
                    value={gymSort}
                    onChange={(id) => {
                      setGymPage(1);
                      setGymSort(id);
                    }}
                    options={ADMIN_GYM_SORT_OPTIONS}
                    label={t('admin.sortGymsAria')}
                  />
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <h2 className={panelTitle}>
                    {t('admin.gymsSection')}
                  </h2>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={fetchGyms}
                    aria-label={t('common.refresh')}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>

                <div className="lg:hidden space-y-3">
                    {loading && gyms.length === 0 ? (
                      <Card className="overflow-hidden">
                        <AdminListSkeleton rows={5} />
                      </Card>
                    ) : displayedGyms.length > 0 ? (
                      displayedGyms.map((gym) => {
                        const isUnpaid = gym.isUnpaid;
                        return (
                          <div
                            key={gym.id}
                            className={`${cardSurface} p-4 active:bg-app-surface/60 ${selectedGymId === gym.id ? 'ring-1 ring-inset ring-teal-200 dark:ring-teal-600/30' : ''}`}
                          >
                            <button
                              type="button"
                              onClick={() => openGymDetail(gym)}
                              className="w-full text-left"
                            >
                              <div className="flex items-start gap-3">
                                <InitialsAvatar name={gym.name} size="md" />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-bold text-app-text-strong">{gym.name}</span>
                                    <StatusBadge status={showingFormer ? 'Former' : gym.subscription_status} />
                                  </div>
                                  <p className="mt-1 text-sm text-app-text">{gym.owner_name}</p>
                                  <p className="mt-0.5 text-sm text-teal-700">{gym.saas_plan_name || '—'}</p>
                                  <p className="mt-1 text-xs text-app-muted">
                                    {t('admin.activeMembersCount', { count: Number(gym.active_member_count ?? 0) })}
                                  </p>
                                </div>
                              </div>
                            </button>
                            <div className="mt-3">
                              <GymListRowActions
                                gym={gym}
                                saasPlans={saasPlans}
                                onView={openGymDetail}
                                onCollect={(g) => setCollectState({ isOpen: true, gym: g, error: '' })}
                                onChangePlan={openChangePlanModal}
                                onRenew={openRenewGymModal}
                                onEdit={(g) => setGymEditState({ isOpen: true, gym: g, error: '' })}
                                onDelete={setGymToDelete}
                                onRestore={handleRestoreGym}
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className={cardSurface}>
                        <EmptyState
                          icon={AlertCircle}
                          compact
                          title={
                            showingFormer
                              ? t('admin.emptyFormer')
                              : gymsFiltered
                                ? t('admin.noGymsMatch')
                                : t('admin.noGymsEmptyTitle')
                          }
                          body={
                            showingFormer
                              ? t('admin.emptyFormerBody')
                              : gymsFiltered
                                ? t('admin.noGymsMatchBody')
                                : t('admin.noGymsEmptyBody')
                          }
                          action={
                            noGymsYet ? (
                              <Button onClick={openRegisterGym} disabled={!canRegisterGym}>
                                {t('admin.registerGym')}
                              </Button>
                            ) : null
                          }
                        />
                      </div>
                    )}
                </div>

                <Card className="hidden overflow-hidden lg:block">
                  <div className="overflow-x-auto">
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
                              onClick={() => openGymDetail(gym)}
                              className={`cursor-pointer transition-colors ${
                                selectedGymId === gym.id ? 'bg-teal-50 dark:bg-teal-600/10' : ''
                              } hover:bg-teal-50/60 dark:hover:bg-teal-600/10`}
                            >
                              <td>
                                <div className="flex items-center gap-3 min-w-0">
                                  <InitialsAvatar name={gym.name} size="md" />
                                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <span className="truncate font-bold text-app-text-strong">{gym.name}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="truncate text-app-text">{gym.owner_name}</td>
                              <td className="truncate text-app-text">
                                {gym.saas_plan_name || '—'}
                              </td>
                              <td>
                                <span className="inline-flex items-center gap-1.5 text-sm text-app-text">
                                  <Users className="h-3.5 w-3.5 shrink-0 text-app-muted" />
                                  {Number(gym.active_member_count ?? 0)}
                                </span>
                              </td>
                              <td>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <StatusBadge status={showingFormer ? 'Former' : gym.subscription_status} />
                                  {isUnpaid && !showingFormer && <UnpaidBadge />}
                                </div>
                              </td>
                              <td>
                                <GymListRowActions
                                  gym={gym}
                                  saasPlans={saasPlans}
                                  onView={openGymDetail}
                                  onCollect={(g) => setCollectState({ isOpen: true, gym: g, error: '' })}
                                  onChangePlan={openChangePlanModal}
                                  onRenew={openRenewGymModal}
                                  onEdit={(g) => setGymEditState({ isOpen: true, gym: g, error: '' })}
                                  onDelete={setGymToDelete}
                                  onRestore={handleRestoreGym}
                                />
                              </td>
                            </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} className="p-0">
                              <EmptyState
                                icon={AlertCircle}
                                compact
                                title={
                                  showingFormer
                                    ? t('admin.emptyFormer')
                                    : gymsFiltered
                                      ? t('admin.noGymsMatch')
                                      : t('admin.noGymsEmptyTitle')
                                }
                                body={
                                  showingFormer
                                    ? t('admin.emptyFormerBody')
                                    : gymsFiltered
                                      ? t('admin.noGymsMatchBody')
                                      : t('admin.noGymsEmptyBody')
                                }
                                action={
                                  noGymsYet ? (
                                    <Button onClick={openRegisterGym} disabled={!canRegisterGym}>
                                      {t('admin.registerGym')}
                                    </Button>
                                  ) : null
                                }
                              />
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="border-t border-app-border-subtle px-4 py-3">
                    <PaginationControls
                      page={gymPage}
                      totalPages={gymTotalPages}
                      total={gymTotal}
                      limit={GYM_PAGE_SIZE}
                      onPageChange={setGymPage}
                      disabled={loading}
                    />
                    <p className="mt-2 text-xs text-app-muted">
                      {t('admin.rowActionsHint')}
                    </p>
                  </div>
                </Card>

                <div className={`lg:hidden ${cardSurface}`}>
                  <div className="px-4 py-3">
                    <PaginationControls
                      page={gymPage}
                      totalPages={gymTotalPages}
                      total={gymTotal}
                      limit={GYM_PAGE_SIZE}
                      onPageChange={setGymPage}
                      disabled={loading}
                    />
                  </div>
                </div>

                </>
              )}
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
        onRestore={handleRestoreGym}
        onRenew={openRenewGymModal}
        onChangePlan={openChangePlanModal}
        onCollectPayment={(gym) => setCollectState({ isOpen: true, gym, error: '' })}
        onResetOwnerPassword={handleResetOwnerPassword}
        onRetryDetail={selectedGymId ? () => fetchGymDetail(selectedGymId) : undefined}
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
