// src/pages/owner/Members.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef, startTransition } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { runInBackground } from '../../utils/runInBackground';
import { useAuth } from '../../context/AuthContext';
import { useGym } from '../../context/GymContext';
import { isGymOwner } from '../../utils/roles';
import { AlertCircle, HelpCircle } from 'lucide-react';
import UnpaidBadge from '../../components/UnpaidBadge';
import MemberPhoto from '../../components/MemberPhoto';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ErrorRetryBanner from '../../components/ErrorRetryBanner';
import { cardSurface, tableRowHover } from '../../utils/surfaceClasses';
import MemberModal from '../../components/MemberModal';
import MemberDetailDrawer from '../../components/MemberDetailDrawer';
import RenewModal from '../../components/RenewModal';
import ChangePlanModal from '../../components/ChangePlanModal';
import PaymentModal from '../../components/PaymentModal';
import StatusBadge from '../../components/StatusBadge';
import MemberListRowActions, { memberAttentionRowClass } from '../../components/MemberListRowActions';
import { FilterChip, FilterChipBar } from '../../components/FilterChip';
import ToolbarPicker from '../../components/ToolbarPicker';
import SearchField from '../../components/SearchField';
import ConfirmDialog from '../../components/ConfirmDialog';
import TransferMemberModal from '../../components/TransferMemberModal';
import { DEFAULT_PAGE_SIZE } from '../../utils/pagination';
import PaginationControls from '../../components/PaginationControls';
import { DISPLAY_STATUS } from '../../utils/memberStatus';
import { canRenewMember } from '../../utils/memberRenew';
import { parseApiResponse, formatApiError } from '../../utils/api';
import { mutationErrorState } from '../../utils/validation';
import { mapMemberFromApi } from '../../utils/apiMappers';
import { getMembers, getArchivedMembers, getMember } from '../../services/memberService';
import { DEFAULT_MEMBER_SORT, MEMBER_SORT_OPTIONS, sortMembersList } from '../../utils/listSort';
import { useLatestRequestGuard } from '../../utils/requestGuard';
import { useTranslation } from 'react-i18next';
import { flashFromKey } from '../../i18n/flashToast';
import { scheduleDeleteWithUndo, restoreWithUndoFlash } from '../../utils/scheduleWithUndo';
import { formatDisplayDate, daysUntilDate } from '../../utils/date';
import { resolveMemberPlanLabel } from '../../utils/formatPlanDisplayName';
import { MemberCardSkeleton, AdminTableRowsSkeleton } from '../../components/LoadingSkeletons';
import { adjustMemberFilterCounts } from '../../utils/memberFilterCounts';

const UNPAID = 'Unpaid';
const NEW = 'New';
const NO_VISIT = 'No visit';
const FORMER = 'Former';
const MEMBER_FILTER_STORAGE_KEY = 'vibe.members.statusFilter';
const PAGE_SIZE = DEFAULT_PAGE_SIZE;
const LIST_AVATAR_CLASS = 'h-10 w-10 rounded-full object-cover';
const LIST_AVATAR_FALLBACK_CLASS =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-app-border text-sm font-bold text-app-text';

function statusFilterToQuery(statusFilter) {
  if (statusFilter === UNPAID) return { filter: 'unpaid' };
  if (statusFilter === DISPLAY_STATUS.DUE_SOON) return { filter: 'due_soon' };
  if (statusFilter === DISPLAY_STATUS.EXPIRED) return { filter: 'expired' };
  if (statusFilter === NEW) return { filter: 'new' };
  if (statusFilter === NO_VISIT) return { filter: 'inactive_week' };
  if (statusFilter === 'All' || statusFilter === FORMER) return {};
  return { status: statusFilter };
}

function readSavedMemberFilter() {
  try {
    const saved = sessionStorage.getItem(MEMBER_FILTER_STORAGE_KEY);
    // Migrate older chip labels used as storage ids.
    if (saved === 'Quiet' || saved === 'At risk') return NO_VISIT;
    const allowed = new Set([
      'All',
      FORMER,
      UNPAID,
      NEW,
      NO_VISIT,
      DISPLAY_STATUS.ACTIVE,
      DISPLAY_STATUS.DUE_SOON,
      DISPLAY_STATUS.EXPIRED,
    ]);
    if (allowed.has(saved)) return saved;
  } catch {
    /* ignore */
  }
  return 'All';
}

export default function Members() {
  const { t } = useTranslation();
  const { apiFetch, user } = useAuth();
  const {
    plans, summary, refreshSummary, updateMember, deleteMember, restoreMember, renewMember, changeMemberPlan, addPayment, transferMember, showFlash,
    readOnly, branchReadOnly, getBranchQueryParams, branches, selectedBranchId, loading: gymLoading, error: gymError,
  } = useGym();
  const location = useLocation();
  const navigate = useNavigate();
  const membersRequestGuard = useLatestRequestGuard();

  const [members, setMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [archivedTotal, setArchivedTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(readSavedMemberFilter);
  const [listSort, setListSort] = useState(DEFAULT_MEMBER_SORT);
  const [modalState, setModalState] = useState({ isOpen: false, member: null, error: '', fieldErrors: {} });
  const [renewState, setRenewState] = useState({ isOpen: false, member: null, error: '', fieldErrors: {} });
  const [changePlanState, setChangePlanState] = useState({ isOpen: false, member: null, error: '', fieldErrors: {} });
  const [paymentState, setPaymentState] = useState({ isOpen: false, member: null, error: '', fieldErrors: {} });
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [pendingDeleteIds, setPendingDeleteIds] = useState(() => new Set());
  const [pendingRestoreIds, setPendingRestoreIds] = useState(() => new Set());
  const silentListRefreshRef = useRef(false);
  const [transferState, setTransferState] = useState({ isOpen: false, member: null });
  const [selectedMember, setSelectedMember] = useState(null);
  const [paymentsRefreshKey, setPaymentsRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const showingFormer = statusFilter === FORMER;
  const showingDueSoon = statusFilter === DISPLAY_STATUS.DUE_SOON;
  const showingNoVisit = statusFilter === NO_VISIT;

  const formatMembershipDuration = (member) => {
    if (showingDueSoon) {
      const days = daysUntilDate(member.endDate);
      if (days == null) return '—';
      if (days <= 0) return t('pages.members.expiresToday');
      return t('pages.members.daysLeft', { count: days });
    }
    return null;
  };

  const formatDidntCome = (member) => {
    const days = member.daysWithoutVisit;
    if (days == null || Number.isNaN(days)) return '—';
    return t('pages.members.didntCome', { count: Math.max(0, days) });
  };

  const tableColCount = (showBranchColumn ? 8 : 7) + (showingNoVisit ? 1 : 0);
  const chipCounts = useMemo(
    () =>
      adjustMemberFilterCounts(
        {
          all: summary.totalMembers ?? total,
          active: summary.activeMembers ?? 0,
          unpaid: summary.unpaidCount ?? 0,
          dueSoon: summary.dueSoonMembers ?? 0,
          expired: summary.expiredMembers ?? 0,
          new: summary.newMembersThisMonth ?? 0,
          inactiveWeek: summary.inactiveMembersThisWeek ?? 0,
          former: archivedTotal,
        },
        {
          pendingDeletes: showingFormer ? [] : members.filter((m) => pendingDeleteIds.has(m.id)),
          pendingRestores: showingFormer ? members.filter((m) => pendingRestoreIds.has(m.id)) : [],
        },
      ),
    [
      summary.totalMembers,
      summary.activeMembers,
      summary.unpaidCount,
      summary.dueSoonMembers,
      summary.expiredMembers,
      summary.newMembersThisMonth,
      summary.inactiveMembersThisWeek,
      total,
      archivedTotal,
      members,
      pendingDeleteIds,
      pendingRestoreIds,
      showingFormer,
    ],
  );
  const dueSoonCount = chipCounts.dueSoon;
  const expiredCount = chipCounts.expired;
  const unpaidCount = chipCounts.unpaid;
  const newMembersCount = chipCounts.new ?? summary.newMembersThisMonth ?? 0;
  const noVisitCount = chipCounts.inactiveWeek ?? summary.inactiveMembersThisWeek ?? 0;
  const activeMembersCount = chipCounts.active;
  const totalMembers = chipCounts.all;
  const formerCount = chipCounts.former;
  const activeBranchCount = branches.filter((b) => b.is_active !== false).length;
  const showBranchColumn =
    isGymOwner(user?.role) && selectedBranchId === 'all' && activeBranchCount > 1;
  const showTransfer =
    isGymOwner(user?.role) && activeBranchCount > 1 && (!readOnly || branchReadOnly);
  const canDeleteMembers = isGymOwner(user?.role);
  const canRestoreMembers = canDeleteMembers && !readOnly;
  const showBranchPicker = isGymOwner(user?.role) && activeBranchCount > 1;
  const needsAttention = expiredCount > 0 || dueSoonCount > 0 || unpaidCount > 0;
  const statusLine = needsAttention
    ? t('pages.members.statusLineAttention', {
        expired: expiredCount,
        dueSoon: dueSoonCount,
        unpaid: unpaidCount,
      })
    : t('pages.members.statusLineClear', {
        active: activeMembersCount,
        total: totalMembers,
      });
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
  }, [debouncedSearch, statusFilter, selectedBranchId]);

  useEffect(() => {
    try {
      sessionStorage.setItem(MEMBER_FILTER_STORAGE_KEY, statusFilter);
    } catch {
      /* ignore */
    }
  }, [statusFilter]);

  const displayedMembers = useMemo(
    () =>
      sortMembersList(
        members.filter((m) => {
          if (pendingDeleteIds.has(m.id)) return false;
          if (showingFormer && pendingRestoreIds.has(m.id)) return false;
          return true;
        }),
        listSort,
      ),
    [members, listSort, pendingDeleteIds, pendingRestoreIds, showingFormer],
  );

  const hideMemberPending = useCallback((id) => {
    setPendingDeleteIds((prev) => new Set(prev).add(id));
  }, []);

  const restoreMemberPending = useCallback((id) => {
    setPendingDeleteIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const fetchMembers = useCallback(async () => {
    const requestId = membersRequestGuard.start();
    const silent = silentListRefreshRef.current;
    silentListRefreshRef.current = false;
    if (!silent) setListLoading(true);
    try {
      const res = showingFormer
        ? await getArchivedMembers(apiFetch, {
            page,
            limit: PAGE_SIZE,
            search: debouncedSearch,
            ...getBranchQueryParams(),
          })
        : await getMembers(apiFetch, {
            page,
            limit: PAGE_SIZE,
            search: debouncedSearch,
            sort: listSort,
            ...statusFilterToQuery(statusFilter),
            ...getBranchQueryParams(),
          });
      const data = await parseApiResponse(res);
      if (!membersRequestGuard.isLatest(requestId)) return;
      if (!res.ok) throw new Error(data.error || t('errors.loadMembers'));
      setMembers((data.items || []).map(mapMemberFromApi).filter(Boolean));
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      if (!showingFormer) {
        if (data.archivedTotal != null) {
          setArchivedTotal(data.archivedTotal);
        } else {
          try {
            const archivedRes = await getArchivedMembers(apiFetch, {
              page: 1,
              limit: 1,
              ...getBranchQueryParams(),
            });
            const archivedData = await parseApiResponse(archivedRes);
            if (!membersRequestGuard.isLatest(requestId)) return;
            if (archivedRes.ok) setArchivedTotal(archivedData.total ?? 0);
          } catch {
            /* live list still usable if archived count is unavailable */
          }
        }
      } else if (!debouncedSearch) {
        setArchivedTotal(data.total ?? 0);
      }
    } catch (err) {
      if (!membersRequestGuard.isLatest(requestId)) return;
      setError(err.message);
    } finally {
      if (membersRequestGuard.isLatest(requestId) && !silent) setListLoading(false);
    }
  }, [apiFetch, page, debouncedSearch, statusFilter, listSort, membersRequestGuard, getBranchQueryParams, t]);

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

  const openMemberRow = useCallback((member) => {
    // Sync open — do not await network before painting the drawer.
    const openedId = member.id;
    setSelectedMember(member);
    void (async () => {
      try {
        const res = await getMember(apiFetch, openedId);
        const data = await parseApiResponse(res);
        if (!res.ok) return;
        startTransition(() => {
          setSelectedMember((current) =>
            current?.id === openedId ? mapMemberFromApi(data) : current
          );
        });
      } catch {
        /* keep list row data */
      }
    })();
  }, [apiFetch]);

  useEffect(() => {
    const { memberId, action, filter } = location.state || {};
    if (filter === DISPLAY_STATUS.ACTIVE) setStatusFilter(DISPLAY_STATUS.ACTIVE);
    if (filter === DISPLAY_STATUS.DUE_SOON) setStatusFilter(DISPLAY_STATUS.DUE_SOON);
    if (filter === DISPLAY_STATUS.EXPIRED) setStatusFilter(DISPLAY_STATUS.EXPIRED);
    if (filter === UNPAID) setStatusFilter(UNPAID);
    if (filter === NEW) setStatusFilter(NEW);
    if (filter === NO_VISIT || filter === 'Quiet' || filter === 'At risk') setStatusFilter(NO_VISIT);
    if (filter) setPage(1);
    if (!memberId) {
      if (filter) window.history.replaceState({}, document.title);
      return;
    }

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

  const refreshAfterMemberChange = (memberId) => {
    const tasks = [afterMutation()];
    if (memberId && selectedMember?.id === memberId) {
      tasks.push(loadMemberById(memberId));
    }
    runInBackground(Promise.all(tasks));
  };

  const handleUpdateMemberSubmit = async (data) => {
    if (!modalState.member) return;
    setSaving(true);
    setModalState((s) => ({ ...s, error: '', fieldErrors: {} }));
    try {
      await updateMember(modalState.member.id, data);
      const memberId = modalState.member.id;
      setModalState({ isOpen: false, member: null, error: '', fieldErrors: {} });
      showFlash(flashFromKey(t, 'memberUpdated'));
      refreshAfterMemberChange(memberId);
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
      const result = await renewMember(renewState.member.id, data);
      const memberId = renewState.member.id;
      const name = renewState.member.name;
      const phone = renewState.member.phone;
      setRenewState({ isOpen: false, member: null, error: '', fieldErrors: {} });
      if (phone && result && result.sms_sent === false) {
        showFlash(flashFromKey(t, 'renewedSmsFailed', { variant: 'warning' }));
      } else {
        showFlash(flashFromKey(t, 'renewed', { subtitleParams: { name } }));
      }
      refreshAfterMemberChange(memberId);
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
      showFlash(flashFromKey(t, 'contactUpdated'));
      refreshAfterMemberChange(id);
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
      showFlash(
        flashFromKey(t, data.amount > 0 ? 'planChangedPaid' : 'planChanged', {
          subtitleParams: { name },
        })
      );
      refreshAfterMemberChange(memberId);
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
      showFlash(flashFromKey(t, 'paymentRecorded', { subtitleParams: { name } }));
      refreshAfterMemberChange(memberId);
    } catch (err) {
      setPaymentState((s) => ({ ...s, ...mutationErrorState(err) }));
    } finally {
      setSaving(false);
    }
  };

  const handleDrawerDelete = (id) => {
    const name = selectedMember?.name || 'Member';
    setSelectedMember(null);
    hideMemberPending(id);
    scheduleDeleteWithUndo({
      showFlash,
      t,
      pendingKey: 'memberDeletePending',
      cancelledKey: 'memberDeleteCancelled',
      committedKey: 'memberDeleted',
      subtitleParams: { name },
      onUndo: () => restoreMemberPending(id),
      onCommit: async () => {
        await deleteMember(id);
        restoreMemberPending(id);
        runInBackground(afterMutation());
      },
    });
  };

  const handleRestore = (id) => {
    const member = members.find((m) => m.id === id) || selectedMember;
    const name = member?.name || 'member';
    if (selectedMember?.id === id) setSelectedMember(null);
    setPendingRestoreIds((prev) => new Set(prev).add(id));

    restoreWithUndoFlash({
      showFlash,
      t,
      name,
      restore: () => restoreMember(id),
      rearchive: () => deleteMember(id),
      onRestored: () => {
        silentListRefreshRef.current = true;
        runInBackground(afterMutation());
      },
      onRearchived: () => {
        silentListRefreshRef.current = true;
        setPendingRestoreIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setStatusFilter(FORMER);
        runInBackground(afterMutation());
      },
      onFailed: (err) => {
        setPendingRestoreIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setStatusFilter(FORMER);
        setError(formatApiError(err));
      },
    });
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
      if (selectedMember?.id === transferState.member.id && updated) {
        setSelectedMember(updated);
      }
      showFlash(
        flashFromKey(t, 'transferred', {
          subtitleParams: { name, branch: updated?.branchName || t('branch.label') },
        })
      );
      runInBackground(afterMutation());
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!memberToDelete) return;
    const id = memberToDelete.id;
    const name = memberToDelete.name;
    setMemberToDelete(null);
    setError('');
    if (selectedMember?.id === id) setSelectedMember(null);
    hideMemberPending(id);
    scheduleDeleteWithUndo({
      showFlash,
      t,
      pendingKey: 'memberDeletePending',
      cancelledKey: 'memberDeleteCancelled',
      committedKey: 'memberDeleted',
      subtitleParams: { name },
      onUndo: () => restoreMemberPending(id),
      onCommit: async () => {
        await deleteMember(id);
        restoreMemberPending(id);
        runInBackground(afterMutation());
      },
    });
  };

  const needsPlanSetup = !readOnly && !gymLoading && plans.length === 0;
  const isFilteredEmpty = statusFilter !== 'All' || Boolean(debouncedSearch);
  const noMembersYet = !needsPlanSetup && !listLoading && !isFilteredEmpty && total === 0 && archivedTotal === 0;
  const focusEmpty = needsPlanSetup || noMembersYet;
  const emptyIcon = AlertCircle;
  const emptyTitle = showingFormer
    ? t('pages.members.emptyFormer')
    : isFilteredEmpty
      ? t('pages.members.emptyFiltered')
      : t('pages.members.emptyTitle');
  const emptyBody = showingFormer
    ? t('pages.members.emptyFormerBody')
    : isFilteredEmpty
      ? t('pages.members.emptyFilteredBody')
      : t('pages.members.emptyBody');

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={showingFormer ? t('pages.members.formerTitle') : t('pages.members.title')}
        subtitle={
          needsPlanSetup
            ? t('pages.members.noPlansSetupSubtitle')
            : showingFormer
              ? t('pages.members.statusLineFormer', { count: formerCount })
              : statusLine
        }
        actions={
          !readOnly && !focusEmpty && !showingFormer ? (
            <Button onClick={() => navigate('/dashboard/members/enroll')} disabled={gymLoading}>
              {t('actions.enroll')}
            </Button>
          ) : null
        }
      />

      {error && !gymError ? <ErrorRetryBanner message={error} onRetry={() => fetchMembers()} /> : null}

      {needsPlanSetup ? (
        <div className={cardSurface}>
          <EmptyState
            icon={HelpCircle}
            title={t('pages.members.noPlansEmptyTitle')}
            body={t('pages.members.noPlansEmptyBody')}
            action={
              !readOnly ? (
                <Button onClick={() => navigate('/dashboard/plans')}>{t('actions.goToPlans')}</Button>
              ) : null
            }
          />
        </div>
      ) : noMembersYet ? (
        <div className={cardSurface}>
          <EmptyState
            icon={AlertCircle}
            title={t('pages.members.emptyTitle')}
            body={t('pages.members.emptyBody')}
            action={
              !readOnly ? (
                <Button onClick={() => navigate('/dashboard/members/enroll')} disabled={gymLoading}>
                  {t('actions.enroll')}
                </Button>
              ) : null
            }
          />
        </div>
      ) : (
        <>
      <div className={`app-toolbar-in overflow-hidden ${cardSurface}`}>
        <div className="flex flex-col gap-2.5 p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={
                showingFormer
                  ? t('pages.members.searchFormerPlaceholder')
                  : t('pages.members.searchPlaceholder')
              }
              className="sm:max-w-xs"
            />
            {!showingFormer ? (
            <ToolbarPicker
              value={listSort}
              onChange={(id) => {
                setPage(1);
                setListSort(id);
              }}
              options={MEMBER_SORT_OPTIONS}
              label={t('pages.members.sortMembers')}
            />
            ) : null}
          </div>
          {/* All → Active, then attention filters. */}
          <FilterChipBar className="!mb-0">
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
            <FilterChip
              variant="new"
              label={t('filters.newMember', { count: newMembersCount })}
              count={newMembersCount}
              active={statusFilter === NEW}
              onClick={() => {
                setPage(1);
                setStatusFilter(NEW);
              }}
            />
            <FilterChip
              variant="inactive_week"
              label={t('filters.noVisit')}
              count={noVisitCount}
              active={statusFilter === NO_VISIT}
              onClick={() => {
                setPage(1);
                setStatusFilter(NO_VISIT);
              }}
            />
            <>
                <span className="filter-chip-archive-rule" aria-hidden />
                <FilterChip
                  variant="former"
                  label={t('pages.members.former')}
                  count={formerCount}
                  active={statusFilter === FORMER}
                  onClick={() => {
                    setPage(1);
                    setStatusFilter(FORMER);
                  }}
                />
              </>
          </FilterChipBar>
        </div>
      </div>

      <div className="lg:hidden space-y-3">
        {listLoading ? (
          <MemberCardSkeleton rows={6} />
        ) : displayedMembers.length > 0 ? (
          displayedMembers.map((member) => {
            const planLabel = resolveMemberPlanLabel(
              member,
              plans,
              t('pages.dashboard.customPlan'),
            );
            return (
              <div
                key={member.id}
                className={`${cardSurface} p-4 ${memberAttentionRowClass(member)}`}
              >
                <button
                  type="button"
                  onClick={() => openMemberRow(member)}
                  className="flex w-full items-center gap-3 text-left active:bg-app-surface/60"
                >
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
                      <span className="list-row-copy font-semibold text-app-text-strong">{member.name}</span>
                      <StatusBadge status={showingFormer ? 'Former' : member.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-app-muted truncate">
                      {member.phone || '—'}
                      {' · '}
                      {planLabel}
                      {member.trainerName ? ` · ${member.trainerName}` : ''}
                      {showBranchColumn && member.branchName ? ` · ${member.branchName}` : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-app-muted">
                      {showingFormer
                        ? t('pages.members.removedOnDate', {
                            date: formatDisplayDate(member.deletedAt),
                          })
                        : showingDueSoon
                          ? (
                            <span className="font-semibold text-app-text">
                              {formatMembershipDuration(member)}
                            </span>
                          )
                          : (
                          <>
                            {formatDisplayDate(member.startDate)} →{' '}
                            <span className="font-semibold text-app-text">{formatDisplayDate(member.endDate)}</span>
                            {showingNoVisit ? (
                              <>
                                {' · '}
                                <span className="font-semibold text-app-text">
                                  {formatDidntCome(member)}
                                </span>
                              </>
                            ) : null}
                          </>
                        )}
                    </p>
                  </div>
                </button>
                <div className="mt-2">
                  <MemberListRowActions
                    member={member}
                    plans={plans}
                    readOnly={readOnly}
                    canDeleteMembers={canDeleteMembers && !showingFormer}
                    onView={openMemberRow}
                    onRestore={canRestoreMembers && showingFormer ? (m) => handleRestore(m.id) : undefined}
                    onRenew={(m) => {
                      setError('');
                      openRenewModal(m);
                    }}
                    onCollect={(m) => {
                      setError('');
                      setPaymentState({ isOpen: true, member: m, error: '' });
                    }}
                    onChangePlan={openChangePlanModal}
                    onEdit={(m) => {
                      setError('');
                      setModalState({ isOpen: true, member: m, error: '' });
                    }}
                    onDelete={setMemberToDelete}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <Card className="overflow-hidden">
            <EmptyState
              icon={emptyIcon}
              compact
              title={emptyTitle}
              body={emptyBody}
            />
          </Card>
        )}
      </div>

      <Card className="hidden overflow-hidden lg:block">
        <div className="overflow-x-auto">
          <table className={`admin-data-table owner-members-table ${showBranchColumn ? 'owner-members-table--branches' : ''}`}>
            <thead>
              <tr>
                <th>{t('table.name')}</th>
                {showBranchColumn && <th>{t('table.branch')}</th>}
                <th>{t('pages.members.contactInfo')}</th>
                <th>{t('table.plan')}</th>
                <th className="owner-members-col-trainer">{t('table.trainer')}</th>
                <th className="owner-members-col-duration">
                  {showingFormer
                    ? t('pages.members.removedOn')
                    : showingDueSoon
                      ? t('pages.members.daysLeftHeader')
                      : t('pages.members.durationRange')}
                </th>
                {showingNoVisit && (
                  <th className="owner-members-col-didnt-come">{t('pages.members.didntComeHeader')}</th>
                )}
                <th className="owner-members-col-status">{t('table.status')}</th>
                <th className="owner-members-col-actions text-right">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {listLoading ? (
                <AdminTableRowsSkeleton rows={6} cols={tableColCount} />
              ) : displayedMembers.length > 0 ? (
                displayedMembers.map((member) => {
                  const planLabel = resolveMemberPlanLabel(
                    member,
                    plans,
                    t('pages.dashboard.customPlan'),
                  );
                  return (
                    <tr
                      key={member.id}
                      onClick={() => openMemberRow(member)}
                      className={`cursor-pointer transition-colors ${memberAttentionRowClass(member, tableRowHover)}`}
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
                            <span className="list-row-copy truncate font-semibold text-app-text-strong">{member.name}</span>
                          </div>
                        </div>
                      </td>
                      {showBranchColumn && (
                        <td className="truncate text-app-text">{member.branchName || '—'}</td>
                      )}
                      <td className="truncate font-mono text-sm text-app-muted">{member.phone}</td>
                      <td className="truncate font-medium text-app-text-strong">
                        {planLabel}
                      </td>
                      <td className="owner-members-col-trainer truncate text-app-muted">
                        {member.trainerName || '—'}
                      </td>
                      <td className="owner-members-col-duration text-app-muted">
                        {showingFormer ? (
                          <span className="whitespace-nowrap font-semibold text-app-text">
                            {formatDisplayDate(member.deletedAt)}
                          </span>
                        ) : showingDueSoon ? (
                          <span className="whitespace-nowrap font-semibold text-app-text">
                            {formatMembershipDuration(member)}
                          </span>
                        ) : (
                          <>
                            <span className="whitespace-nowrap">{formatDisplayDate(member.startDate)}</span>
                            <span className="mx-1 text-xs text-app-muted">{t('common.to')}</span>
                            <span className="whitespace-nowrap font-semibold text-app-text">{formatDisplayDate(member.endDate)}</span>
                          </>
                        )}
                      </td>
                      {showingNoVisit && (
                        <td className="owner-members-col-didnt-come">
                          <span className="whitespace-nowrap font-semibold text-app-text">
                            {formatDidntCome(member)}
                          </span>
                        </td>
                      )}
                      <td className="owner-members-col-status">
                        <div>
                          <StatusBadge status={showingFormer ? 'Former' : member.status} />
                          {!showingFormer && member.isUnpaid && <UnpaidBadge />}
                        </div>
                      </td>
                      <td className="owner-members-col-actions">
                        <MemberListRowActions
                          member={member}
                          plans={plans}
                          readOnly={readOnly}
                          canDeleteMembers={canDeleteMembers && !showingFormer}
                          onView={openMemberRow}
                          onRestore={canRestoreMembers && showingFormer ? (m) => handleRestore(m.id) : undefined}
                          onRenew={(m) => {
                            setError('');
                            openRenewModal(m);
                          }}
                          onCollect={(m) => {
                            setError('');
                            setPaymentState({ isOpen: true, member: m, error: '' });
                          }}
                          onChangePlan={openChangePlanModal}
                          onEdit={(m) => {
                            setError('');
                            setModalState({ isOpen: true, member: m, error: '' });
                          }}
                          onDelete={setMemberToDelete}
                        />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={tableColCount} className="p-0">
                    <EmptyState
                      icon={emptyIcon}
                      compact
                      title={emptyTitle}
                      body={emptyBody}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t px-4 py-3 border-app-border-subtle">
          <PaginationControls
            page={page}
            totalPages={totalPages}
            total={total}
            limit={PAGE_SIZE}
            onPageChange={setPage}
            disabled={listLoading}
          />
        </div>
      </Card>
        </>
      )}

      <MemberModal
        isOpen={modalState.isOpen && !!modalState.member}
        onClose={() => setModalState((s) => ({ ...s, isOpen: false, error: '', fieldErrors: {} }))}
        onSubmit={handleUpdateMemberSubmit}
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
        confirmText={t('pages.members.deleteConfirm')}
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
        canDelete={canDeleteMembers && !selectedMember?.deletedAt}
        canRestore={canRestoreMembers && Boolean(selectedMember?.deletedAt)}
        onRestore={() => handleRestore(selectedMember.id)}
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
