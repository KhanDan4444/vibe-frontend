// src/context/GymContext.jsx
import React, { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { parseApiResponse, apiErrorFromResponse } from '../utils/api';
import { getPlans, createPlan, updatePlan as updatePlanReq, deletePlan as deletePlanReq } from '../services/planService';
import { enrollMember as enrollMemberReq, updateMember as updateMemberReq, deleteMember as deleteMemberReq, restoreMember as restoreMemberReq, renewMember as renewMemberReq, changeMemberPlan as changeMemberPlanReq, transferMember as transferMemberReq } from '../services/memberService';
import { createPayment, updatePayment as updatePaymentReq, deletePayment as deletePaymentReq } from '../services/paymentService';
import { getDashboardMetrics } from '../services/dashboardService';
import { getGymSubscription } from '../services/gymSubscriptionService';
import { listBranches } from '../services/branchService';
import { branchQueryParams, branchStorageKey } from '../utils/branchQuery';
import { isGymOwner } from '../utils/roles';
import SubscriptionLockout from '../components/SubscriptionLockout';
import { SYNCED_EVENT } from '../offline/events';
import { runInBackground } from '../utils/runInBackground';
import { useFlash } from './FlashContext';

const EMPTY_SUMMARY = {
  totalMembers: 0,
  activeMembers: 0,
  expiredMembers: 0,
  dueSoonMembers: 0,
  unpaidCount: 0,
  checkedInToday: 0,
  monthlyIncome: 0,
  previousMonthIncome: 0,
  revenueTrendPercent: null,
  newMembersThisMonth: 0,
  newMembersLastMonth: 0,
  newMembersTrendPercent: null,
  newMembersDeltaLabel: null,
  inactiveMembersThisWeek: 0,
  alertMembers: [],
  revenueChart: [],
  notifications: [],
};

const SUBSCRIPTION_READ_ONLY_MESSAGE =
  'Your gym is in read-only mode while suspended. Contact platform admin to restore full access.';

const BRANCH_READ_ONLY_MESSAGE =
  'This branch is inactive. Reactivate it under Branches, or transfer members to an active location.';

function readStoredBranchId(gymId) {
  if (!gymId || typeof window === 'undefined') return 'all';
  try {
    const saved = localStorage.getItem(branchStorageKey(gymId));
    if (!saved) return 'all';
    if (saved === 'all') return 'all';
    const parsed = parseInt(saved, 10);
    return Number.isFinite(parsed) ? parsed : 'all';
  } catch {
    return 'all';
  }
}

const GymContext = createContext(null);

export const GymProvider = ({ children }) => {
  const { apiFetch, gymSubscription: loginSubscription, user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { showFlash, clearFlash } = useFlash();
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchIdState] = useState('all');
  const readOnlyRef = useRef(false);
  const subscriptionReadOnlyRef = useRef(false);
  const branchReadOnlyRef = useRef(false);
  const bootDoneRef = useRef(false);
  const getBranchQueryParamsRef = useRef(() => ({}));

  const selectedBranch = useMemo(() => {
    if (selectedBranchId === 'all') return null;
    return branches.find((b) => b.id === selectedBranchId) || null;
  }, [branches, selectedBranchId]);

  const branchReadOnly =
    isGymOwner(user?.role) && selectedBranch != null && selectedBranch.is_active === false;

  const subscriptionReadOnly = subscription?.readOnly ?? false;
  const readOnly = subscriptionReadOnly || branchReadOnly;
  readOnlyRef.current = readOnly;
  subscriptionReadOnlyRef.current = subscriptionReadOnly;
  branchReadOnlyRef.current = branchReadOnly;


  const getBranchQueryParams = useCallback(
    () => (isGymOwner(user?.role) ? branchQueryParams(selectedBranchId) : {}),
    [user?.role, selectedBranchId]
  );
  getBranchQueryParamsRef.current = getBranchQueryParams;

  const setSelectedBranchId = useCallback(
    (branchId) => {
      setSelectedBranchIdState(branchId);
      if (user?.gym_id) {
        localStorage.setItem(branchStorageKey(user.gym_id), String(branchId));
      }
    },
    [user?.gym_id]
  );

  const reloadBranches = useCallback(async () => {
    if (!isGymOwner(user?.role)) {
      setBranches([]);
      return;
    }
    try {
      const res = await listBranches(apiFetch);
      const data = await parseApiResponse(res);
      if (res.ok) {
        setBranches(data.branches || []);
      }
    } catch {
      /* non-blocking */
    }
  }, [apiFetch, user?.role]);

  // Restore before passive boot effects so dashboard metrics use the saved branch.
  useLayoutEffect(() => {
    if (!user?.gym_id) return;
    const stored = readStoredBranchId(user.gym_id);
    setSelectedBranchIdState((prev) => (prev === stored ? prev : stored));
  }, [user?.gym_id]);

  useEffect(() => {
    if (!user || !isGymOwner(user?.role)) return;
    reloadBranches();
  }, [user, reloadBranches]);

  // Drop stale branch selection (e.g. after DB reset or branch deleted).
  useEffect(() => {
    if (!user?.gym_id || branches.length === 0) return;
    if (selectedBranchId === 'all') return;
    const exists = branches.some((b) => b.id === selectedBranchId);
    if (!exists) {
      setSelectedBranchId('all');
    }
  }, [branches, selectedBranchId, user?.gym_id, setSelectedBranchId]);

  const loginSubscriptionRef = useRef(loginSubscription);
  loginSubscriptionRef.current = loginSubscription;
  const bootGenRef = useRef(0);

  const loadSubscription = useCallback(async () => {
    setSubscriptionLoading(true);
    try {
      const res = await getGymSubscription(apiFetch);
      const data = await parseApiResponse(res);
      if (res.ok) {
        setSubscription(data);
        return data;
      }
      // Older backend without GET /gym/subscription — infer from dashboard instead.
      if (res.status === 404 && loginSubscriptionRef.current) {
        setSubscription(loginSubscriptionRef.current);
        return loginSubscriptionRef.current;
      }
      if (res.status === 404) {
        return null;
      }
      throw new Error(data.error || 'Failed to load subscription status.');
    } finally {
      setSubscriptionLoading(false);
    }
  }, [apiFetch]);

  const fetchPlans = useCallback(async () => {
    const plansRes = await getPlans(apiFetch);
    const plansData = await parseApiResponse(plansRes);
    if (!plansRes.ok) {
      throw new Error(plansData.error || 'Failed to load plans.');
    }
    const safePlans = Array.isArray(plansData)
      ? plansData.map((p) => ({
          ...p,
          price: parseFloat(p.price),
          duration: parseInt(p.duration, 10),
          activeMemberCount: parseInt(p.active_member_count ?? 0, 10),
        }))
      : [];
    setPlans(safePlans);
    return safePlans;
  }, [apiFetch]);

  const fetchCoreData = useCallback(async ({ includePlans = true } = {}) => {
    try {
      setLoading(true);
      setError(null);
      const branchParams = getBranchQueryParamsRef.current();
      const jobs = [
        includePlans ? fetchPlans() : Promise.resolve(null),
        getDashboardMetrics(apiFetch, branchParams).then(async (dashboardRes) => {
          const dashboardData = await parseApiResponse(dashboardRes);
          return { dashboardRes, dashboardData };
        }),
      ];

      const [, dash] = await Promise.all(jobs);
      const { dashboardRes, dashboardData } = dash;

      if (!dashboardRes.ok) {
        if (dashboardRes.status === 403 && dashboardData.code === 'SUBSCRIPTION_EXPIRED') {
          setSubscription((prev) => ({
            ...(prev || {}),
            accessDenied: true,
            status: 'expired',
            readOnly: false,
          }));
          setLoading(false);
          return;
        }
        if (
          dashboardData.error === 'Branch not found.' &&
          isGymOwner(user?.role) &&
          Object.keys(branchParams).length > 0
        ) {
          setSelectedBranchId('all');
          setLoading(false);
          return;
        }
        throw new Error(dashboardData.error || 'Failed to load dashboard summary.');
      }

      setSummary({ ...EMPTY_SUMMARY, ...dashboardData });

      if (
        dashboardData.subscriptionStatus ||
        dashboardData.readOnly !== undefined ||
        dashboardData.isTrial !== undefined
      ) {
        setSubscription((prev) => ({
          ...(prev || {}),
          gymName: prev?.gymName,
          status: dashboardData.subscriptionStatus ?? prev?.status ?? 'active',
          readOnly: dashboardData.readOnly ?? prev?.readOnly ?? false,
          accessDenied: false,
          isTrial: dashboardData.isTrial ?? prev?.isTrial ?? false,
          trialEndDate: dashboardData.trialEndDate ?? prev?.trialEndDate,
          trialDaysLeft:
            dashboardData.trialDaysLeft ?? prev?.trialDaysLeft,
        }));
      }
    } catch (err) {
      console.error('Error synchronizing database:', err);
      setError(err.message || 'Failed to load gym data.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, fetchPlans, user?.role, setSelectedBranchId]);

  // Initial boot + subscription — plans + summary.
  useEffect(() => {
    if (!user) {
      setSubscriptionLoading(false);
      setLoading(false);
      bootDoneRef.current = false;
      return;
    }

    const bootGen = ++bootGenRef.current;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const sub = await loadSubscription();
        if (cancelled || bootGenRef.current !== bootGen) return;
        if (sub?.accessDenied) {
          bootDoneRef.current = true;
          return;
        }
        await fetchCoreData({ includePlans: true });
        if (!cancelled && bootGenRef.current === bootGen) {
          bootDoneRef.current = true;
        }
      } catch (err) {
        if (!cancelled && bootGenRef.current === bootGen) {
          setError(err.message || 'Failed to load gym subscription.');
          bootDoneRef.current = true;
        }
      } finally {
        // Always clear boot loading for this generation (including cancel-after-subscription
        // races that previously left skeletons stuck on iOS Safari).
        if (!cancelled && bootGenRef.current === bootGen) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally omit fetchCoreData — branch changes handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, loadSubscription]);

  // Branch switch only needs dashboard metrics (plans are gym-wide).
  useEffect(() => {
    if (!user || !bootDoneRef.current) return;
    fetchCoreData({ includePlans: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId]);

  // Re-fetch fresh data after queued offline writes finish syncing.
  useEffect(() => {
    const onSynced = () => {
      fetchCoreData({ includePlans: true });
      reloadBranches();
    };
    window.addEventListener(SYNCED_EVENT, onSynced);
    return () => window.removeEventListener(SYNCED_EVENT, onSynced);
  }, [fetchCoreData, reloadBranches]);

  const refreshSummary = useCallback(async () => {
    try {
      const res = await getDashboardMetrics(apiFetch, getBranchQueryParamsRef.current());
      const data = await parseApiResponse(res);
      if (res.ok) {
        setSummary({ ...EMPTY_SUMMARY, ...data });
      }
    } catch {
      /* non-blocking */
    }
  }, [apiFetch]);

  const assertWritable = ({ allowOnInactiveBranch = false } = {}) => {
    if (subscriptionReadOnlyRef.current) {
      throw apiErrorFromResponse({ error: SUBSCRIPTION_READ_ONLY_MESSAGE, code: 'SUBSCRIPTION_READ_ONLY' }, 403);
    }
    if (branchReadOnlyRef.current && !allowOnInactiveBranch) {
      throw apiErrorFromResponse({ error: BRANCH_READ_ONLY_MESSAGE, code: 'BRANCH_INACTIVE' }, 403);
    }
  };

  const runMutation = async (request, options = {}) => {
    assertWritable(options);
    const res = await request();
    const data = await parseApiResponse(res);
    if (!res.ok) {
      throw apiErrorFromResponse(data, res.status);
    }
    const refreshPlans = options.refreshPlans === true;
    if (refreshPlans) {
      runInBackground(fetchCoreData({ includePlans: true }));
    } else {
      runInBackground(refreshSummary());
    }
    return data;
  };

  const addPlan = useCallback(
    async (newPlan) =>
      runMutation(
        () =>
          createPlan(apiFetch, {
            name: newPlan.name,
            duration: newPlan.duration,
            price: newPlan.price,
          }),
        { refreshPlans: true }
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiFetch]
  );

  const updatePlan = useCallback(
    async (id, updatedFields) =>
      runMutation(
        () =>
          updatePlanReq(apiFetch, id, {
            name: updatedFields.name,
            duration: updatedFields.duration,
            price: updatedFields.price,
          }),
        { refreshPlans: true }
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiFetch]
  );

  const deletePlan = useCallback(
    async (id) => runMutation(() => deletePlanReq(apiFetch, id), { refreshPlans: true }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiFetch]
  );

  const enrollMember = useCallback(
    async (memberData) => {
      const payload = {
        name: memberData.name,
        phone: memberData.phone,
        plan_id: memberData.planId,
        start_date: memberData.startDate,
      };

      if (memberData.skipPayment) {
        payload.skip_payment = true;
      } else {
        payload.amount = memberData.amount;
        payload.date = memberData.paymentDate;
        payload.method = memberData.method;
      }

      if (memberData.branchId) {
        payload.branch_id = memberData.branchId;
      } else if (isGymOwner(user?.role) && selectedBranchId !== 'all') {
        payload.branch_id = selectedBranchId;
      }

      if (memberData.photo) {
        payload.photo = memberData.photo;
      }

      if (memberData.trainerId) {
        payload.trainer_id = memberData.trainerId;
        if (memberData.trainerFee > 0) {
          payload.trainer_fee = memberData.trainerFee;
          payload.trainer_fee_date = memberData.trainerFeeDate;
          payload.trainer_fee_method = memberData.trainerFeeMethod;
        }
      }

      return runMutation(() => enrollMemberReq(apiFetch, payload), { refreshPlans: true });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiFetch, user?.role, selectedBranchId]
  );

  const updateMember = useCallback(
    async (id, memberData) => {
      const payload = {
        name: memberData.name,
        phone: memberData.phone,
      };
      if (memberData.branchId !== undefined) {
        payload.branch_id = memberData.branchId;
      }
      if (memberData.photo !== undefined) {
        payload.photo = memberData.photo;
      }
      if (memberData.trainerId !== undefined) {
        payload.trainer_id = memberData.trainerId || null;
      }
      if (memberData.trainerFee > 0) {
        payload.trainer_fee = memberData.trainerFee;
        payload.trainer_fee_date = memberData.trainerFeeDate;
        payload.trainer_fee_method = memberData.trainerFeeMethod;
      }

      return runMutation(() => updateMemberReq(apiFetch, id, payload));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiFetch]
  );

  const deleteMember = useCallback(
    async (id) => runMutation(() => deleteMemberReq(apiFetch, id), { refreshPlans: true }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiFetch]
  );

  const restoreMember = useCallback(
    async (id) => runMutation(() => restoreMemberReq(apiFetch, id), { refreshPlans: true }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiFetch]
  );

  const transferMember = useCallback(
    async (id, branchId) =>
      runMutation(() => transferMemberReq(apiFetch, id, { branch_id: branchId }), {
        allowOnInactiveBranch: true,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiFetch]
  );

  const renewMember = useCallback(
    async (id, renewalData) => runMutation(() => renewMemberReq(apiFetch, id, renewalData)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiFetch]
  );

  const changeMemberPlan = useCallback(
    async (id, payload) =>
      runMutation(() => changeMemberPlanReq(apiFetch, id, payload), { refreshPlans: true }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiFetch]
  );

  const addPayment = useCallback(
    async (paymentData) => {
      const payload = {
        member_id: paymentData.memberId,
        amount: paymentData.amount,
        date: paymentData.date,
        method: paymentData.method,
      };

      return runMutation(() => createPayment(apiFetch, payload));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiFetch]
  );

  const updatePayment = useCallback(
    async (id, paymentData) => {
      assertWritable();
      const payload = {
        amount: paymentData.amount,
        date: paymentData.date,
        method: paymentData.method,
      };

      const res = await updatePaymentReq(apiFetch, id, payload);
      const data = await parseApiResponse(res);
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      runInBackground(refreshSummary());
      return data;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiFetch, refreshSummary]
  );

  const deletePayment = useCallback(
    async (id) => {
      assertWritable();
      const res = await deletePaymentReq(apiFetch, id);
      const data = await parseApiResponse(res);
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      runInBackground(refreshSummary());
      return data;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiFetch, refreshSummary]
  );

  const gymBooting = subscriptionLoading || loading;

  const value = useMemo(
    () => ({
      plans,
      addPlan,
      deletePlan,
      updatePlan,
      summary,
      refreshSummary,
      enrollMember,
      updateMember,
      deleteMember,
      restoreMember,
      transferMember,
      renewMember,
      changeMemberPlan,
      addPayment,
      updatePayment,
      deletePayment,
      loading,
      gymBooting,
      error,
      fetchCoreData,
      loadSubscription,
      showFlash,
      clearFlash,
      readOnly,
      subscriptionStatus: subscription?.status ?? 'active',
      gymName: subscription?.gymName,
      isTrial: subscription?.isTrial ?? false,
      trialDaysLeft: subscription?.trialDaysLeft,
      trialEndDate: subscription?.trialEndDate,
      branches,
      selectedBranchId,
      setSelectedBranchId,
      getBranchQueryParams,
      reloadBranches,
      selectedBranch,
      branchReadOnly,
    }),
    [
      plans,
      addPlan,
      deletePlan,
      updatePlan,
      summary,
      refreshSummary,
      enrollMember,
      updateMember,
      deleteMember,
      restoreMember,
      transferMember,
      renewMember,
      changeMemberPlan,
      addPayment,
      updatePayment,
      deletePayment,
      loading,
      gymBooting,
      error,
      fetchCoreData,
      loadSubscription,
      showFlash,
      clearFlash,
      readOnly,
      subscription?.status,
      subscription?.gymName,
      subscription?.isTrial,
      subscription?.trialDaysLeft,
      subscription?.trialEndDate,
      branches,
      selectedBranchId,
      setSelectedBranchId,
      getBranchQueryParams,
      reloadBranches,
      selectedBranch,
      branchReadOnly,
    ]
  );

  if (subscription?.accessDenied) {
    return <SubscriptionLockout gymName={subscription.gymName} />;
  }

  return <GymContext.Provider value={value}>{children}</GymContext.Provider>;
};

export const useGym = () => useContext(GymContext);
