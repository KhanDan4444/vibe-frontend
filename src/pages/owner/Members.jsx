// src/pages/owner/Members.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useGym } from '../../context/GymContext';
import { isGymOwner } from '../../utils/roles';
import { Search, UserPlus, Trash2, Edit, AlertCircle, RefreshCw, DollarSign, ArrowLeftRight } from 'lucide-react';
import UnpaidBadge from '../../components/UnpaidBadge';
import MemberPhoto from '../../components/MemberPhoto';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import MemberModal from '../../components/MemberModal';
import MemberDetailDrawer from '../../components/MemberDetailDrawer';
import RenewModal from '../../components/RenewModal';
import ChangePlanModal from '../../components/ChangePlanModal';
import PaymentModal from '../../components/PaymentModal';
import StatusBadge from '../../components/StatusBadge';
import { FilterChip, FilterChipBar } from '../../components/FilterChip';
import ConfirmDialog from '../../components/ConfirmDialog';
import TransferMemberModal from '../../components/TransferMemberModal';
import { DEFAULT_PAGE_SIZE } from '../../utils/pagination';
import PaginationControls from '../../components/PaginationControls';
import { DISPLAY_STATUS } from '../../utils/memberStatus';
import { canRenewMember, canChangePlan } from '../../utils/memberRenew';
import { parseApiResponse, formatApiError } from '../../utils/api';
import { mutationErrorState } from '../../utils/validation';
import { mapMemberFromApi } from '../../utils/apiMappers';
import { getMembers, getMember } from '../../services/memberService';
import { DEFAULT_MEMBER_SORT, MEMBER_SORT_OPTIONS, sortMembersList } from '../../utils/listSort';
import { useLatestRequestGuard } from '../../utils/requestGuard';
import { useTranslation } from 'react-i18next';
import { formatDisplayDate } from '../../utils/date';
import { tableRowHover } from '../../utils/surfaceClasses';
import { AdminListSkeleton, AdminTableRowsSkeleton } from '../../components/LoadingSkeletons';

const UNPAID = 'Unpaid';
const PAGE_SIZE = DEFAULT_PAGE_SIZE;
const LIST_AVATAR_CLASS = 'h-10 w-10 rounded-full object-cover';
const LIST_AVATAR_FALLBACK_CLASS =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white dark:bg-teal-600 dark:text-white';

function statusFilterToQuery(statusFilter) {
  if (statusFilter === UNPAID) return { filter: 'unpaid' };
  if (statusFilter === DISPLAY_STATUS.DUE_SOON) return { filter: 'due_soon' };
  if (statusFilter === DISPLAY_STATUS.EXPIRED) return { filter: 'expired' };
  if (statusFilter === 'All') return {};
  return { status: statusFilter };
}

export default function Members() {
  const { t } = useTranslation();
  const { apiFetch, user } = useAuth();
  const {
    plans, summary, refreshSummary, enrollMember, updateMember, deleteMember, renewMember, changeMemberPlan, addPayment, transferMember, showFlash,
    readOnly, branchReadOnly, getBranchQueryParams, branches, selectedBranchId, loading: gymLoading,
  } = useGym();
  const location = useLocation();
  const membersRequestGuard = useLatestRequestGuard();

  const [members, setMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [listLoading, setListLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [listSort, setListSort] = useState(DEFAULT_MEMBER_SORT);
  const [modalState, setModalState] = useState({ isOpen: false, member: null, error: '', fieldErrors: {} });
  const [renewState, setRenewState] = useState({ isOpen: false, member: null, error: '', fieldErrors: {} });
  const [changePlanState, setChangePlanState] = useState({ isOpen: false, member: null, error: '', fieldErrors: {} });
  const [paymentState, setPaymentState] = useState({ isOpen: false, member: null, error: '', fieldErrors: {} });
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [transferState, setTransferState] = useState({ isOpen: false, member: null });
  const [selectedMember, setSelectedMember] = useState(null);
  const [paymentsRefreshKey, setPaymentsRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const dueSoonCount = summary.dueSoonMembers ?? 0;
  const expiredCount = summary.expiredMembers ?? 0;
  const unpaidCount = summary.unpaidCount ?? 0;
  const activeMembersCount = summary.activeMembers ?? 0;
  const totalMembers = summary.totalMembers ?? total;
  const showBranchColumn = isGymOwner(user?.role) && selectedBranchId === 'all';
  const showTransfer = isGymOwner(user?.role) && (!readOnly || branchReadOnly);
  const canDeleteMembers = isGymOwner(user?.role);
  const showBranchPicker = isGymOwner(user?.role) && branches.filter((b) => b.is_active !== false).length > 0;
  const enrollDefaultBranchId =
    selectedBranchId !== 'all'
      ? selectedBranchId
      : branches.find((b) => b.is_default)?.id || branches[0]?.id;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const displayedMembers = useMemo(
    () => sortMembersList(members, listSort),
    [members, listSort],
  );

  const fetchMembers = useCallback(async () => {
    const requestId = membersRequestGuard.start();
    setListLoading(true);
    try {
      const res = await getMembers(apiFetch, {
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch,
        sort: listSort,
        ...statusFilterToQuery(statusFilter),
        ...getBranchQueryParams(),
      });
      const data = await parseApiResponse(res);
      if (!membersRequestGuard.isLatest(requestId)) return;
      if (!res.ok) throw new Error(data.error || 'Failed to load members');
      setMembers((data.items || []).map(mapMemberFromApi).filter(Boolean));
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (err) {
      if (!membersRequestGuard.isLatest(requestId)) return;
      setError(err.message);
    } finally {
      if (membersRequestGuard.isLatest(requestId)) setListLoading(false);
    }
  }, [apiFetch, page, debouncedSearch, statusFilter, listSort, membersRequestGuard, getBranchQueryParams]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const loadMemberById = useCallback(async (memberId) => {
    try {
      const res = await getMember(apiFetch, memberId);
      const data = await parseApiResponse(res);
      if (res.ok) {
        setSelectedMember(mapMemberFromApi(data));
        setPaymentsRefreshKey((k) => k + 1);
      }
    } catch {
      /* ignore */
    }
  }, [apiFetch]);

  const openChangePlanModal = useCallback(async (member) => {
    setError('');
    try {
      const res = await getMember(apiFetch, member.id);
      const data = await parseApiResponse(res);
      if (res.ok) {
        setChangePlanState({ isOpen: true, member: mapMemberFromApi(data), error: '' });
        return;
      }
    } catch {
      /* fall back to list row */
    }
    setChangePlanState({ isOpen: true, member, error: '' });
  }, [apiFetch]);

  const openRenewModal = useCallback(async (member) => {
    setError('');
    try {
      const res = await getMember(apiFetch, member.id);
      const data = await parseApiResponse(res);
      if (res.ok) {
        setRenewState({ isOpen: true, member: mapMemberFromApi(data), error: '' });
        return;
      }
    } catch {
      /* fall back to list row */
    }
    setRenewState({ isOpen: true, member, error: '' });
  }, [apiFetch]);

  const openMemberRow = useCallback(async (member) => {
    try {
      const res = await getMember(apiFetch, member.id);
      const data = await parseApiResponse(res);
      if (res.ok) {
        setSelectedMember(mapMemberFromApi(data));
        return;
      }
    } catch {
      /* fall back to list row */
    }
    setSelectedMember(member);
  }, [apiFetch]);

  useEffect(() => {
    const { memberId, action, filter } = location.state || {};
    if (filter === DISPLAY_STATUS.DUE_SOON) setStatusFilter(DISPLAY_STATUS.DUE_SOON);
    if (filter === DISPLAY_STATUS.EXPIRED) setStatusFilter(DISPLAY_STATUS.EXPIRED);
    if (filter === UNPAID) setStatusFilter(UNPAID);
    if (!memberId) return;

    (async () => {
      const res = await getMember(apiFetch, memberId);
      const data = await parseApiResponse(res);
      if (!res.ok) return;
      const member = mapMemberFromApi(data);
      setSelectedMember(member);
      if (action === 'renew' && member && canRenewMember(member)) {
        setRenewState({ isOpen: true, member, error: '' });
      } else if (action === 'payment' && member?.isUnpaid) {
        setPaymentState({ isOpen: true, member, error: '' });
      }
    })();

    window.history.replaceState({}, document.title);
  }, [location.state, apiFetch]);

  const afterMutation = async () => {
    await Promise.all([fetchMembers(), refreshSummary()]);
  };

  const handleEnrollSubmit = async (data) => {
    setSaving(true);
    setModalState((s) => ({ ...s, error: '', fieldErrors: {} }));
    try {
      await enrollMember(data);
      setModalState({ isOpen: false, member: null, error: '', fieldErrors: {} });
      await afterMutation();
      showFlash(
        data.skipPayment
          ? t('pages.members.enrolledSkip', { name: data.name })
          : t('pages.members.enrolledPaid', { name: data.name })
      );
    } catch (err) {
      setModalState((s) => ({ ...s, ...mutationErrorState(err, { date: 'paymentDate' }) }));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMemberSubmit = async (data) => {
    if (!modalState.member) return;
    setSaving(true);
    setModalState((s) => ({ ...s, error: '', fieldErrors: {} }));
    try {
      await updateMember(modalState.member.id, data);
      const memberId = modalState.member.id;
      setModalState({ isOpen: false, member: null, error: '', fieldErrors: {} });
      await afterMutation();
      if (selectedMember?.id === memberId) {
        await loadMemberById(memberId);
      }
      showFlash(t('pages.members.updated'));
    } catch (err) {
      setModalState((s) => ({ ...s, ...mutationErrorState(err, { date: 'paymentDate' }) }));
    } finally {
      setSaving(false);
    }
  };

  const handleRenewSubmit = async (data) => {
    if (!renewState.member) return;
    setSaving(true);
    setRenewState((s) => ({ ...s, error: '', fieldErrors: {} }));
    try {
      await renewMember(renewState.member.id, data);
      const memberId = renewState.member.id;
      const name = renewState.member.name;
      setRenewState({ isOpen: false, member: null, error: '', fieldErrors: {} });
      await afterMutation();
      if (selectedMember?.id === memberId) {
        await loadMemberById(memberId);
      }
      showFlash(t('pages.members.renewed', { name }));
    } catch (err) {
      setRenewState((s) => ({ ...s, ...mutationErrorState(err, { date: 'paymentDate' }) }));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateFromDrawer = async (id, data) => {
    setSaving(true);
    setError('');
    try {
      await updateMember(id, data);
      await afterMutation();
      if (selectedMember?.id === id) {
        await loadMemberById(id);
      }
      showFlash(t('pages.members.contactUpdated'));
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleChangePlanSubmit = async (data) => {
    if (!changePlanState.member) return;
    setSaving(true);
    setChangePlanState((s) => ({ ...s, error: '', fieldErrors: {} }));
    try {
      await changeMemberPlan(changePlanState.member.id, data);
      const memberId = changePlanState.member.id;
      const name = changePlanState.member.name;
      setChangePlanState({ isOpen: false, member: null, error: '', fieldErrors: {} });
      await afterMutation();
      if (selectedMember?.id === memberId) {
        await loadMemberById(memberId);
      }
      showFlash(
        data.amount > 0
          ? t('pages.members.planChangedPaid', { name })
          : t('pages.members.planChanged', { name })
      );
    } catch (err) {
      setChangePlanState((s) => ({ ...s, ...mutationErrorState(err, { date: 'paymentDate' }) }));
    } finally {
      setSaving(false);
    }
  };

  const handlePaymentSubmit = async (data) => {
    const member = paymentState.member;
    if (member && !member.isUnpaid) {
      setPaymentState((s) => ({
        ...s,
        error: t('pages.members.alreadyPaid'),
      }));
      return;
    }
    setSaving(true);
    setPaymentState((s) => ({ ...s, error: '', fieldErrors: {} }));
    try {
      await addPayment(data);
      const name = member?.name || 'member';
      const memberId = member?.id;
      setPaymentState({ isOpen: false, member: null, error: '', fieldErrors: {} });
      await afterMutation();
      if (selectedMember?.id === memberId) {
        await loadMemberById(memberId);
      }
      showFlash(t('pages.members.paymentRecorded', { name }));
    } catch (err) {
      setPaymentState((s) => ({ ...s, ...mutationErrorState(err) }));
    } finally {
      setSaving(false);
    }
  };

  const handleDrawerDelete = async (id) => {
    const name = selectedMember?.name || 'Member';
    await deleteMember(id);
    setSelectedMember(null);
    await afterMutation();
    showFlash(t('pages.members.removed', { name }));
  };

  const handleTransferSubmit = async (targetBranchId) => {
    if (!transferState.member) return;
    setSaving(true);
    setError('');
    try {
      const data = await transferMember(transferState.member.id, targetBranchId);
      const name = transferState.member.name;
      const updated = mapMemberFromApi(data);
      setTransferState({ isOpen: false, member: null });
      await afterMutation();
      if (selectedMember?.id === transferState.member.id && updated) {
        setSelectedMember(updated);
      }
      showFlash(t('pages.members.transferred', { name, branch: updated?.branchName || t('branch.label') }));
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;
    const id = memberToDelete.id;
    const name = memberToDelete.name;
    setMemberToDelete(null);
    setError('');
    try {
      await deleteMember(id);
      if (selectedMember?.id === id) setSelectedMember(null);
      await afterMutation();
      showFlash(t('pages.members.removed', { name }));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title={t('pages.members.title')}
        subtitle={t('pages.members.subtitle')}
        actions={
          !readOnly ? (
            <button
              onClick={() => {
                setError('');
                setModalState({ isOpen: true, member: null, error: '' });
              }}
              disabled={gymLoading || plans.length === 0}
              title={!gymLoading && plans.length === 0 ? t('pages.members.createPlanFirst') : undefined}
              className="flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus className="h-4 w-4" /> {t('actions.enroll')}
            </button>
          ) : null
        }
      />

      {error && (
        <div className="flex flex-col gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300 sm:flex-row sm:items-center sm:justify-between">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => fetchMembers()}
            className="shrink-0 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {!readOnly && !gymLoading && plans.length === 0 && (
        <div className="admin-alert-amber flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <AlertCircle className="admin-alert-amber-icon mt-0.5 h-5 w-5 shrink-0" />
            <p className="admin-alert-amber-title text-sm">
              {t('pages.members.noPlansWarning')}
            </p>
          </div>
          <Link
            to="/dashboard/plans"
            className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors text-center"
          >
            {t('actions.goToPlans')}
          </Link>
        </div>
      )}

      <FilterChipBar>
        <FilterChip
          variant="all"
          label={t('filters.all')}
          count={totalMembers}
          active={statusFilter === 'All'}
          onClick={() => {
            setPage(1);
            setStatusFilter('All');
          }}
        />
        <FilterChip
          variant="active"
          label={t('filters.active')}
          count={activeMembersCount}
          active={statusFilter === DISPLAY_STATUS.ACTIVE}
          onClick={() => {
            setPage(1);
            setStatusFilter(DISPLAY_STATUS.ACTIVE);
          }}
        />
        <FilterChip
          variant="unpaid"
          label={t('filters.unpaid')}
          count={unpaidCount}
          active={statusFilter === UNPAID}
          onClick={() => {
            setPage(1);
            setStatusFilter(UNPAID);
          }}
        />
        <FilterChip
          variant="due_soon"
          label={t('filters.dueSoon')}
          count={dueSoonCount}
          active={statusFilter === DISPLAY_STATUS.DUE_SOON}
          onClick={() => {
            setPage(1);
            setStatusFilter(DISPLAY_STATUS.DUE_SOON);
          }}
        />
        <FilterChip
          variant="expired"
          label={t('filters.expired')}
          count={expiredCount}
          active={statusFilter === DISPLAY_STATUS.EXPIRED}
          onClick={() => {
            setPage(1);
            setStatusFilter(DISPLAY_STATUS.EXPIRED);
          }}
        />
      </FilterChipBar>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-app-border-subtle pb-4">
        <div className="relative w-full sm:max-w-md">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="h-5 w-5" />
          </span>
          <input
            type="text"
            className="admin-field block w-full pl-10 pr-4 placeholder-slate-400"
            placeholder={t('pages.members.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <select
          className="admin-field min-w-[10rem] cursor-pointer"
          value={listSort}
          onChange={(e) => {
            setPage(1);
            setListSort(e.target.value);
          }}
          aria-label={t('pages.members.sortMembers')}
        >
          {MEMBER_SORT_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>{t(opt.labelKey)}</option>
          ))}
        </select>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-app-border-subtle bg-white  dark:bg-app-raised shadow-sm overflow-hidden">
        {/* Phone card list */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-app-border-subtle">
          {listLoading ? (
            <AdminListSkeleton rows={6} />
          ) : displayedMembers.length > 0 ? (
            displayedMembers.map((member) => {
              const matchingPlan = plans.find((p) => p.id === member.planId);
              return (
                <div
                  key={member.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openMemberRow(member)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openMemberRow(member);
                    }
                  }}
                  className={`p-4 active:bg-slate-50 dark:active:bg-app-surface/60 ${
                    member.isUnpaid ? 'admin-row-unpaid' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <MemberPhoto
                      memberId={member.id}
                      apiFetch={apiFetch}
                      name={member.name}
                      hasPhoto={member.hasPhoto}
                      expandable={false}
                      className={LIST_AVATAR_CLASS}
                      fallbackClassName={LIST_AVATAR_FALLBACK_CLASS}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-app-text-strong">{member.name}</span>
                        {member.isUnpaid && <UnpaidBadge compact />}
                        <StatusBadge status={member.status} />
                      </div>
                      <p className="mt-1 font-mono text-sm text-slate-500">{member.phone}</p>
                      <p className="mt-1 text-sm font-medium text-teal-700">
                        {matchingPlan ? matchingPlan.name : member.planName || t('pages.dashboard.customPlan')}
                      </p>
                      {showBranchColumn && member.branchName && (
                        <p className="mt-0.5 text-xs text-slate-400">{member.branchName}</p>
                      )}
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDisplayDate(member.startDate)} → <span className="font-semibold text-slate-700 dark:text-app-text">{formatDisplayDate(member.endDate)}</span>
                      </p>
                    </div>
                  </div>
                  {!readOnly && (
                    <div className="admin-row-actions mt-3" onClick={(e) => e.stopPropagation()}>
                      {member.isUnpaid && (
                        <button
                          type="button"
                          onClick={() => {
                            setError('');
                            setPaymentState({ isOpen: true, member, error: '' });
                          }}
                          className="text-amber-600 hover:bg-amber-100 hover:text-amber-800 dark:hover:bg-amber-950/40 cursor-pointer"
                          title={t('actions.collectPayment')}
                        >
                          <DollarSign className="h-4 w-4" />
                        </button>
                      )}
                      {canChangePlan(member) && plans.filter((p) => p.id !== member.planId).length > 0 && (
                        <button
                          type="button"
                          onClick={() => openChangePlanModal(member)}
                          className="text-slate-400 hover:bg-slate-100 hover:text-teal-700 dark:hover:bg-app-surface/80 cursor-pointer"
                          title={t('actions.changePlan')}
                        >
                          <ArrowLeftRight className="h-4 w-4" />
                        </button>
                      )}
                      {canRenewMember(member) && (
                        <button
                          type="button"
                          onClick={() => {
                            setError('');
                            openRenewModal(member);
                          }}
                          className="text-slate-400 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-app-surface/80 cursor-pointer"
                          title={t('actions.renew')}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setError('');
                          setModalState({ isOpen: true, member, error: '' });
                        }}
                        className="text-slate-400 hover:bg-slate-100 hover:text-teal-700 dark:hover:bg-app-surface/80 cursor-pointer"
                        title={t('common.edit')}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {canDeleteMembers && (
                        <button
                          type="button"
                          onClick={() => setMemberToDelete(member)}
                          className="text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-app-surface/80 cursor-pointer"
                          title={t('common.delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <EmptyState
              icon={AlertCircle}
              compact
              title={
                statusFilter !== 'All' || debouncedSearch
                  ? t('pages.members.emptyFiltered')
                  : t('pages.members.emptyTitle')
              }
              body={
                statusFilter !== 'All' || debouncedSearch
                  ? t('pages.members.emptyFilteredBody')
                  : t('pages.members.emptyBody')
              }
            />
          )}
        </div>

        {/* Tablet+ desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="admin-data-table min-w-[800px]">
            <thead>
              <tr>
                <th>{t('table.name')}</th>
                {showBranchColumn && <th>{t('table.branch')}</th>}
                <th>{t('pages.members.contactInfo')}</th>
                <th>{t('table.plan')}</th>
                <th>{t('pages.members.durationRange')}</th>
                <th>{t('table.status')}</th>
                <th className="text-right">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {listLoading ? (
                <AdminTableRowsSkeleton rows={6} cols={showBranchColumn ? 7 : 6} />
              ) : displayedMembers.length > 0 ? (
                displayedMembers.map((member) => {
                  const matchingPlan = plans.find((p) => p.id === member.planId);
                  return (
                    <tr
                      key={member.id}
                      onClick={() => openMemberRow(member)}
                      className={`cursor-pointer transition-colors ${
                        member.isUnpaid ? 'admin-row-unpaid' : tableRowHover
                      }`}
                    >
                      <td>
                        <div className="flex items-center gap-3 min-w-0">
                          <MemberPhoto
                            memberId={member.id}
                            apiFetch={apiFetch}
                            name={member.name}
                            hasPhoto={member.hasPhoto}
                            expandable={false}
                            className={LIST_AVATAR_CLASS}
                            fallbackClassName={LIST_AVATAR_FALLBACK_CLASS}
                          />
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="truncate font-semibold text-slate-900 dark:text-app-text-strong">{member.name}</span>
                            {member.isUnpaid && <UnpaidBadge compact />}
                          </div>
                        </div>
                      </td>
                      {showBranchColumn && (
                        <td className="truncate text-slate-600 dark:text-app-text">{member.branchName || '—'}</td>
                      )}
                      <td className="truncate font-mono text-sm text-slate-500 dark:text-app-muted">{member.phone}</td>
                      <td className="truncate font-semibold text-teal-700">
                        {matchingPlan ? matchingPlan.name : member.planName || t('pages.dashboard.customPlan')}
                      </td>
                      <td className="text-slate-500">
                        <span className="whitespace-nowrap">{formatDisplayDate(member.startDate)}</span>
                        <span className="mx-1 text-xs text-slate-400">{t('common.to')}</span>
                        <span className="whitespace-nowrap font-semibold text-slate-800 dark:text-app-text">{formatDisplayDate(member.endDate)}</span>
                      </td>
                      <td>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={member.status} />
                          {member.isUnpaid && <UnpaidBadge />}
                        </div>
                      </td>
                      <td>
                        <div className="admin-row-actions">
                        {!readOnly && member.isUnpaid && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setError('');
                              setPaymentState({ isOpen: true, member, error: '' });
                            }}
                            className="text-amber-600 hover:bg-amber-100 hover:text-amber-800 dark:hover:bg-amber-950/40 cursor-pointer"
                            title={t('actions.collectPayment')}
                          >
                            <DollarSign className="h-4 w-4" />
                          </button>
                        )}
                        {!readOnly && canChangePlan(member) && plans.filter((p) => p.id !== member.planId).length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openChangePlanModal(member);
                            }}
                            className="text-slate-400 hover:bg-slate-100 hover:text-teal-700 dark:hover:bg-app-surface/80 cursor-pointer"
                            title={t('actions.changePlan')}
                          >
                            <ArrowLeftRight className="h-4 w-4" />
                          </button>
                        )}
                        {!readOnly && canRenewMember(member) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setError('');
                              openRenewModal(member);
                            }}
                            className="text-slate-400 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-app-surface/80 cursor-pointer"
                            title={t('actions.renew')}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        )}
                        {!readOnly && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setError('');
                                setModalState({ isOpen: true, member, error: '' });
                              }}
                              className="text-slate-400 hover:bg-slate-100 hover:text-teal-700 dark:hover:bg-app-surface/80 cursor-pointer"
                              title={t('common.edit')}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            {canDeleteMembers && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMemberToDelete(member);
                              }}
                              className="text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-app-surface/80 cursor-pointer"
                              title={t('common.delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            )}
                          </>
                        )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={showBranchColumn ? 7 : 6} className="p-0">
                    <EmptyState
                      icon={AlertCircle}
                      compact
                      title={
                        statusFilter !== 'All' || debouncedSearch
                          ? t('pages.members.emptyFiltered')
                          : t('pages.members.emptyTitle')
                      }
                      body={
                        statusFilter !== 'All' || debouncedSearch
                          ? t('pages.members.emptyFilteredBody')
                          : t('pages.members.emptyBody')
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls
          page={page}
          totalPages={totalPages}
          total={total}
          limit={PAGE_SIZE}
          onPageChange={setPage}
          disabled={listLoading}
        />
      </div>

      <MemberModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState((s) => ({ ...s, isOpen: false, error: '', fieldErrors: {} }))}
        onSubmit={modalState.member ? handleUpdateMemberSubmit : handleEnrollSubmit}
        plans={plans}
        member={modalState.member}
        branches={branches}
        defaultBranchId={enrollDefaultBranchId}
        showBranchPicker={showBranchPicker}
        showPhotoUpload
        apiFetch={apiFetch}
        saving={saving}
        error={modalState.error}
        fieldErrors={modalState.fieldErrors}
      />

      <ChangePlanModal
        isOpen={changePlanState.isOpen}
        onClose={() => setChangePlanState({ isOpen: false, member: null, error: '', fieldErrors: {} })}
        onSubmit={handleChangePlanSubmit}
        member={changePlanState.member}
        plans={plans}
        saving={saving}
        error={changePlanState.error}
        fieldErrors={changePlanState.fieldErrors}
      />

      <RenewModal
        isOpen={renewState.isOpen}
        onClose={() => setRenewState({ isOpen: false, member: null, error: '', fieldErrors: {} })}
        onSubmit={handleRenewSubmit}
        member={renewState.member}
        plans={plans}
        saving={saving}
        error={renewState.error}
        fieldErrors={renewState.fieldErrors}
      />

      <ConfirmDialog
        isOpen={!!memberToDelete}
        title={t('pages.members.deleteTitle')}
        message={t('pages.members.deleteMessage', { name: memberToDelete?.name })}
        confirmText={t('common.delete')}
        onConfirm={handleConfirmDelete}
        onCancel={() => setMemberToDelete(null)}
      />

      {selectedMember && (
      <MemberDetailDrawer
        member={selectedMember}
        plans={plans}
        apiFetch={apiFetch}
        branches={branches}
        defaultBranchId={enrollDefaultBranchId}
        showBranchPicker={showBranchPicker}
        showPhotoUpload
        paymentsRefreshKey={paymentsRefreshKey}
        onClose={() => setSelectedMember(null)}
        onUpdate={handleUpdateFromDrawer}
        onDelete={handleDrawerDelete}
        onRenew={openRenewModal}
        onChangePlan={openChangePlanModal}
        onRecordPayment={
          selectedMember.isUnpaid
            ? (member) => setPaymentState({ isOpen: true, member, error: '' })
            : undefined
        }
        onTransfer={(member) => {
          setError('');
          setTransferState({ isOpen: true, member });
        }}
        showTransfer={showTransfer}
        canDelete={canDeleteMembers}
        readOnly={readOnly}
      />
      )}

      <TransferMemberModal
        isOpen={transferState.isOpen}
        onClose={() => setTransferState({ isOpen: false, member: null })}
        member={transferState.member}
        branches={branches}
        onSubmit={handleTransferSubmit}
        saving={saving}
        error={error}
      />

      <PaymentModal
        isOpen={paymentState.isOpen}
        onClose={() => setPaymentState({ isOpen: false, member: null, error: '', fieldErrors: {} })}
        onSubmit={handlePaymentSubmit}
        members={paymentState.member ? [paymentState.member] : []}
        plans={plans}
        defaultMemberId={paymentState.member?.id}
        saving={saving}
        error={paymentState.error}
        fieldErrors={paymentState.fieldErrors}
      />
    </div>
  );
}
