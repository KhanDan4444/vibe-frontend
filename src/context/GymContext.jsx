// src/context/GymContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { parseApiResponse, apiErrorFromResponse } from '../utils/api';
import { getPlans, createPlan, updatePlan as updatePlanReq, deletePlan as deletePlanReq } from '../services/planService';
import { enrollMember as enrollMemberReq, updateMember as updateMemberReq, deleteMember as deleteMemberReq, renewMember as renewMemberReq, changeMemberPlan as changeMemberPlanReq, transferMember as transferMemberReq } from '../services/memberService';
import { createPayment, updatePayment as updatePaymentReq, deletePayment as deletePaymentReq } from '../services/paymentService';
import { getDashboardMetrics } from '../services/dashboardService';
import { getGymSubscription } from '../services/gymSubscriptionService';
import { listBranches } from '../services/branchService';
import { branchQueryParams, branchStorageKey } from '../utils/branchQuery';
import { isGymOwner } from '../utils/roles';
import SubscriptionLockout from '../components/SubscriptionLockout';

const EMPTY_SUMMARY = {
  totalMembers: 0,
  activeMembers: 0,
  expiredMembers: 0,
  dueSoonMembers: 0,
  unpaidCount: 0,
  monthlyIncome: 0,
  previousMonthIncome: 0,
  revenueTrendPercent: null,
  newMembersThisMonth: 0,
  newMembersLastMonth: 0,
  newMembersTrendPercent: null,
  newMembersDeltaLabel: null,
  alertMembers: [],
  revenueChart: [],
  notifications: [],
};

const SUBSCRIPTION_READ_ONLY_MESSAGE =
  'Your gym is in read-only mode while suspended. Contact platform admin to restore full access.';

const BRANCH_READ_ONLY_MESSAGE =
  'This branch is inactive. Reactivate it under Branches, or transfer members to an active location.';

const GymContext = createContext(null);

export const GymProvider = ({ children }) => {
  const { apiFetch, token, gymSubscription: loginSubscription, user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [flash, setFlash] = useState(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchIdState] = useState('all');
  const readOnlyRef = useRef(false);
  const subscriptionReadOnlyRef = useRef(false);
  const branchReadOnlyRef = useRef(false);

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

  const showFlash = useCallback((message) => {
    setFlash(message);
  }, []);

  const clearFlash = useCallback(() => setFlash(null), []);

  const getBranchQueryParams = useCallback(
    () => (isGymOwner(user?.role) ? branchQueryParams(selectedBranchId) : {}),
    [user?.role, selectedBranchId]
  );

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
    try {
      const res = await listBranches(apiFetch);
      const data = await parseApiResponse(res);
      if (res.ok) {
        setBranches(data.branches || []);
      }
    } catch {
      /* non-blocking */
    }
  }, [apiFetch]);

  useEffect(() => {
    if (!user?.gym_id) return;
    const saved = localStorage.getItem(branchStorageKey(user.gym_id));
    if (saved) {
      setSelectedBranchIdState(saved === 'all' ? 'all' : parseInt(saved, 10) || 'all');
    }
  }, [user?.gym_id]);

  useEffect(() => {
    if (token) reloadBranches();
  }, [token, reloadBranches]);

  // Drop stale branch selection (e.g. after DB reset or branch deleted).
  useEffect(() => {
    if (!user?.gym_id || branches.length === 0) return;
    if (selectedBranchId === 'all') return;
    const exists = branches.some((b) => b.id === selectedBranchId);
    if (!exists) {
      setSelectedBranchId('all');
    }
  }, [branches, selectedBranchId, user?.gym_id, setSelectedBranchId]);

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
      if (res.status === 404 && loginSubscription) {
        setSubscription(loginSubscription);
        return loginSubscription;
      }
      if (res.status === 404) {
        return null;
      }
      throw new Error(data.error || 'Failed to load subscription status.');
    } finally {
      setSubscriptionLoading(false);
    }
  }, [apiFetch, loginSubscription]);

  const fetchCoreData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [plansRes, dashboardRes] = await Promise.all([
        getPlans(apiFetch),
        getDashboardMetrics(apiFetch, getBranchQueryParams()),
      ]);

      const plansData = await parseApiResponse(plansRes);
      const dashboardData = await parseApiResponse(dashboardRes);

      if (!plansRes.ok) {
        throw new Error(plansData.error || 'Failed to load plans.');
      }
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
          selectedBranchId !== 'all'
        ) {
          setSelectedBranchId('all');
          setLoading(false);
          return;
        }
        throw new Error(dashboardData.error || 'Failed to load dashboard summary.');
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
      setSummary({ ...EMPTY_SUMMARY, ...dashboardData });

      if (dashboardData.subscriptionStatus || dashboardData.readOnly !== undefined) {
        setSubscription((prev) => ({
          ...(prev || {}),
          gymName: prev?.gymName,
          status: dashboardData.subscriptionStatus ?? prev?.status ?? 'active',
          readOnly: dashboardData.readOnly ?? prev?.readOnly ?? false,
          accessDenied: false,
        }));
      }
    } catch (err) {
      console.error('Error synchronizing database:', err);
      setError(err.message || 'Failed to load gym data.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, getBranchQueryParams, user?.role, selectedBranchId, setSelectedBranchId]);

  useEffect(() => {
    if (!token) {
      setSubscriptionLoading(false);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const sub = await loadSubscription();
        if (sub?.accessDenied) {
          setLoading(false);
          return;
        }
        await fetchCoreData();
      } catch (err) {
        setError(err.message || 'Failed to load gym subscription.');
        setLoading(false);
      }
    })();
  }, [token, loadSubscription, fetchCoreData, selectedBranchId]);

  const refreshSummary = useCallback(async () => {
    try {
      const res = await getDashboardMetrics(apiFetch, getBranchQueryParams());
      const data = await parseApiResponse(res);
      if (res.ok) {
        setSummary({ ...EMPTY_SUMMARY, ...data });
      }
    } catch {
      /* non-blocking */
    }
  }, [apiFetch, getBranchQueryParams]);

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
    await fetchCoreData();
    return data;
  };

  const addPlan = async (newPlan) =>
    runMutation(() =>
      createPlan(apiFetch, {
        name: newPlan.name,
        duration: newPlan.duration,
        price: newPlan.price,
      })
    );

  const updatePlan = async (id, updatedFields) =>
    runMutation(() =>
      updatePlanReq(apiFetch, id, {
        name: updatedFields.name,
        duration: updatedFields.duration,
        price: updatedFields.price,
      })
    );

  const deletePlan = async (id) => runMutation(() => deletePlanReq(apiFetch, id));

  const enrollMember = async (memberData) => {
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

    return runMutation(() => enrollMemberReq(apiFetch, payload));
  };

  const updateMember = async (id, memberData) => {
    const payload = {
      name: memberData.name,
      phone: memberData.phone,
    };

    return runMutation(() => updateMemberReq(apiFetch, id, payload));
  };

  const deleteMember = async (id) => runMutation(() => deleteMemberReq(apiFetch, id));

  const transferMember = async (id, branchId) =>
    runMutation(() => transferMemberReq(apiFetch, id, { branch_id: branchId }), {
      allowOnInactiveBranch: true,
    });

  const renewMember = async (id, renewalData) =>
    runMutation(() => renewMemberReq(apiFetch, id, renewalData));

  const changeMemberPlan = async (id, payload) =>
    runMutation(() => changeMemberPlanReq(apiFetch, id, payload));

  const addPayment = async (paymentData) => {
    const payload = {
      member_id: paymentData.memberId,
      amount: paymentData.amount,
      date: paymentData.date,
      method: paymentData.method,
    };

    return runMutation(() => createPayment(apiFetch, payload));
  };

  const updatePayment = async (id, paymentData) => {
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
    await refreshSummary();
    return data;
  };

  const deletePayment = async (id) => {
    assertWritable();
    const res = await deletePaymentReq(apiFetch, id);
    const data = await parseApiResponse(res);
    if (!res.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    await refreshSummary();
    return data;
  };

  if (subscription?.accessDenied) {
    return <SubscriptionLockout gymName={subscription.gymName} />;
  }

  const gymBooting = subscriptionLoading || loading;

  return (
    <GymContext.Provider
      value={{
        plans,
        addPlan,
        deletePlan,
        updatePlan,
        summary,
        refreshSummary,
        enrollMember,
        updateMember,
        deleteMember,
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
        flash,
        showFlash,
        clearFlash,
        readOnly,
        subscriptionStatus: subscription?.status ?? 'active',
        gymName: subscription?.gymName,
        branches,
        selectedBranchId,
        setSelectedBranchId,
        getBranchQueryParams,
        reloadBranches,
        selectedBranch,
        branchReadOnly,
      }}
    >
      {children}
    </GymContext.Provider>
  );
};

export const useGym = () => useContext(GymContext);
