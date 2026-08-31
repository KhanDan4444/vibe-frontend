// src/components/MemberDetailDrawer.jsx
import React, { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Pencil,
  Trash2,
  CircleDollarSign,
  RefreshCw,
  GitBranch,
  Layers,
  Undo2,
  QrCode,
  Clock3,
  ChevronDown,
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import { canRenewMember, canChangePlan } from '../utils/memberRenew';
import { parseApiResponse } from '../utils/api';
import { mapPaymentFromApi } from '../utils/apiMappers';
import { paymentSourceLabel } from '../utils/paymentSources';
import PaymentMethodBadge from './PaymentMethodBadge';
import { formatFriendlyDate, formatDisplayDate, attendanceDayRelative, formatAttendanceDayLabel, formatDisplayTime } from '../utils/date';
import { resolveMemberPlanLabel } from '../utils/formatPlanDisplayName';
import { effectiveVisitsLimit } from '../utils/attendanceCap';
import { getMemberPayments } from '../services/memberService';
import { getMemberVisitSummary, listCheckIns } from '../services/checkInService';
import VisitRing from './VisitRing';
import { MemberDrawerVisitCardSkeleton } from './LoadingSkeletons';
import ConfirmDialog from './ConfirmDialog';
import MemberPhoto from './MemberPhoto';
import MemberVisitHistoryModal from './MemberVisitHistoryModal';
import Button from './ui/Button';
import { formatMoney } from '../utils/formatMoney';
import { useAuth } from '../context/AuthContext';
import { useFlash } from '../context/FlashContext';
import { isGymOwner, isGymStaff } from '../utils/roles';
import {
  SlidePanel,
  SlidePanelProfileHeader,
  SlidePanelSection,
  SlidePanelCard,
  SlidePanelRow,
  SlidePanelEmpty,
  SlidePanelList,
  SlidePanelListItem,
  SlidePanelFooter,
  SlidePanelActionButton,
  SlidePanelActionGrid,
} from './SlidePanel';

const MemberPassModal = React.lazy(() => import('./MemberPassModal'));
const MemberModal = React.lazy(() => import('./MemberModal'));

const PAYMENTS_PREVIEW = 3;
const VISITS_PREVIEW = 3;

export default function MemberDetailDrawer({
  member,
  plans = [],
  apiFetch,
  branches = [],
  defaultBranchId,
  showBranchPicker = false,
  showPhotoUpload = false,
  paymentsRefreshKey = 0,
  onClose,
  onUpdate,
  onDelete,
  onRenew,
  onChangePlan,
  onRecordPayment,
  onTransfer,
  showTransfer = false,
  canDelete = false,
  canRestore = false,
  onRestore,
  readOnly = false,
  onMemberRefresh,
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showFlash } = useFlash();
  const friendlyDate = (value) => formatFriendlyDate(value, i18n.language);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPassOpen, setIsPassOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [memberPayments, setMemberPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState('');
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [visitSummary, setVisitSummary] = useState(null);
  const [visitSummaryLoading, setVisitSummaryLoading] = useState(true);
  const [recentVisits, setRecentVisits] = useState([]);
  const [visitHistoryOpen, setVisitHistoryOpen] = useState(false);
  const [recentVisitsOpen, setRecentVisitsOpen] = useState(false);

  const loadPayments = useCallback(async () => {
    if (!member?.id || !apiFetch) return;
    setPaymentsLoading(true);
    try {
      const res = await getMemberPayments(apiFetch, member.id);
      const data = await parseApiResponse(res);
      if (res.ok && Array.isArray(data)) {
        setMemberPayments(data.map(mapPaymentFromApi).filter(Boolean));
        setPaymentsError('');
      } else {
        setPaymentsError(data?.error || t('drawer.paymentsLoadError'));
        setMemberPayments([]);
      }
    } catch {
      setPaymentsError(t('drawer.paymentsLoadError'));
      setMemberPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  }, [member?.id, apiFetch, t]);

  useEffect(() => {
    if (!member?.id || !apiFetch) return undefined;
    let cancelled = false;
    let idleId = 0;
    const run = () => {
      if (cancelled) return;
      void loadPayments();
    };
    // Let the panel paint first — payments are below the fold.
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(run, { timeout: 600 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(idleId);
      };
    }
    const t = window.setTimeout(run, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [loadPayments, paymentsRefreshKey, member?.id]);

  useEffect(() => {
    setShowAllPayments(false);
    setVisitSummary(null);
    setVisitSummaryLoading(true);
    setRecentVisits([]);
    setVisitHistoryOpen(false);
    setRecentVisitsOpen(false);
    setMemberPayments([]);
    setPaymentsError('');
  }, [member?.id]);

  useEffect(() => {
    if (!member?.id || !apiFetch || member.deletedAt) {
      setVisitSummaryLoading(false);
      return undefined;
    }
    let cancelled = false;
    setVisitSummaryLoading(true);
    const run = async () => {
      try {
        const [sumRes, histRes] = await Promise.all([
          getMemberVisitSummary(apiFetch, member.id),
          listCheckIns(apiFetch, { member_id: member.id, limit: VISITS_PREVIEW + 1 }),
        ]);
        const sumData = await parseApiResponse(sumRes);
        const histData = await parseApiResponse(histRes);
        if (!cancelled && sumRes.ok) setVisitSummary(sumData);
        if (!cancelled && histRes.ok) setRecentVisits(histData.checkIns || []);
      } catch {
        if (!cancelled) {
          setVisitSummary(null);
          setRecentVisits([]);
        }
      } finally {
        if (!cancelled) setVisitSummaryLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [member?.id, member?.deletedAt, apiFetch]);

  const recentPreview = useMemo(
    () => recentVisits.slice(0, VISITS_PREVIEW),
    [recentVisits]
  );
  const recentHasMore = recentVisits.length > VISITS_PREVIEW;

  const planLabel = useMemo(
    () =>
      member
        ? resolveMemberPlanLabel(member, plans, t('pages.dashboard.customPlan'))
        : '',
    [member, plans, t],
  );
  const otherPlans = useMemo(
    () => (member ? plans.filter((p) => String(p.id) !== String(member.planId)) : []),
    [plans, member],
  );

  if (!member) return null;

  const termStart = member.startDate && member.startDate !== '—' ? member.startDate : null;
  const termPayments = termStart
    ? memberPayments.filter((p) => p.date && p.date >= termStart)
    : memberPayments;
  const termPaid = termPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPaid = memberPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const paidForCurrentTerm = !member.isUnpaid;
  const canCollectMissedPayment = member.isUnpaid;
  const termPaymentCount = termPayments.length;
  const visiblePayments = showAllPayments
    ? memberPayments
    : memberPayments.slice(0, PAYMENTS_PREVIEW);
  const hiddenPaymentCount = Math.max(memberPayments.length - PAYMENTS_PREVIEW, 0);
  const currency = (amount) => formatMoney(amount);

  const isFormer = Boolean(member.deletedAt);
  const canShowPass = !isFormer && (isGymOwner(user?.role) || isGymStaff(user?.role));
  const telegramLinked = Boolean(member.telegramChatId);
  const canShowChangePlan = !readOnly && !isFormer && canChangePlan(member) && onChangePlan && otherPlans.length > 0;
  const canShowTransfer = showTransfer && onTransfer && !isFormer;
  const hasPrimaryLifecycle =
    !readOnly &&
    !isFormer &&
    ((canCollectMissedPayment && onRecordPayment) || (canRenewMember(member) && onRenew));

  const utilityTiles = [];
  if (!readOnly && !isFormer) {
    if (canShowChangePlan) {
      utilityTiles.push({
        key: 'change-plan',
        label: t('actions.changePlan'),
        icon: Layers,
        onClick: () => onChangePlan(member),
      });
    }
    if (canShowTransfer) {
      utilityTiles.push({
        key: 'transfer',
        label: t('drawer.transferBranch'),
        icon: GitBranch,
        onClick: () => onTransfer(member),
      });
    }
    utilityTiles.push({
      key: 'edit',
      label: t('drawer.editContact'),
      icon: Pencil,
      onClick: () => {
        setError('');
        setIsEditOpen(true);
      },
    });
    if (canDelete) {
      utilityTiles.push({
        key: 'remove',
        label: t('drawer.deleteMember'),
        icon: Trash2,
        danger: true,
        onClick: () => setIsDeleteOpen(true),
      });
    }
  }

  /**
   * Premium footer rows under Renew/Collect:
   * - 1–3 tiles → one equal row
   * - 4 tiles (change + transfer + edit + remove) → 2+2
   */
  const utilityRows =
    utilityTiles.length <= 3
      ? [utilityTiles]
      : [utilityTiles.slice(0, 2), utilityTiles.slice(2)];

  const handleEditSubmit = async (data) => {
    setSaving(true);
    setError('');
    try {
      await onUpdate(member.id, data);
      setIsEditOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleteOpen(false);
    setError('');
    try {
      await onDelete(member.id);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  const footerAlerts = [];
  if (isFormer) {
    footerAlerts.push({
      key: 'former',
      variant: 'muted',
      text: t('drawer.formerHint'),
    });
  } else if (canCollectMissedPayment) {
    footerAlerts.push({
      key: 'unpaid',
      variant: 'warning',
      text:
        otherPlans.length > 0
          ? t('drawer.alertUnpaidChangeOrCollect')
          : t('drawer.alertUnpaidCollect'),
    });
  }

  return (
    <>
      <SlidePanel
        open
        onClose={onClose}
        title={isFormer ? t('drawer.formerTitle') : t('drawer.memberTitle')}
        footer={
          isFormer ? (
            canRestore && onRestore ? (
              <SlidePanelFooter alerts={footerAlerts}>
                <SlidePanelActionButton
                  variant="successHero"
                  icon={Undo2}
                  onClick={() => onRestore(member)}
                >
                  {t('drawer.restoreMember')}
                </SlidePanelActionButton>
              </SlidePanelFooter>
            ) : footerAlerts.length > 0 ? (
              <SlidePanelFooter alerts={footerAlerts} />
            ) : null
          ) : !readOnly || canShowTransfer ? (
          <SlidePanelFooter alerts={footerAlerts}>
            {!readOnly && (
              <div className="space-y-2.5">
                {canCollectMissedPayment && onRecordPayment ? (
                  <SlidePanelActionButton
                    variant="hero"
                    icon={CircleDollarSign}
                    onClick={() => onRecordPayment(member)}
                  >
                    {t('actions.collectPayment')}
                  </SlidePanelActionButton>
                ) : canRenewMember(member) && onRenew ? (
                  <SlidePanelActionButton
                    variant="successHero"
                    icon={RefreshCw}
                    onClick={() => onRenew(member)}
                  >
                    {t('actions.renew')}
                  </SlidePanelActionButton>
                ) : null}

                {utilityRows.map((row, rowIndex) =>
                  row.length > 0 ? (
                    <SlidePanelActionGrid
                      key={`utility-row-${rowIndex}`}
                      columns={row.length}
                      className={
                        hasPrimaryLifecycle && rowIndex === 0
                          ? 'border-t border-app-border-subtle pt-2.5'
                          : ''
                      }
                    >
                      {row.map((action) => (
                        <SlidePanelActionButton
                          key={action.key}
                          variant={action.danger ? 'tileDanger' : 'tile'}
                          icon={action.icon}
                          onClick={action.onClick}
                        >
                          {action.label}
                        </SlidePanelActionButton>
                      ))}
                    </SlidePanelActionGrid>
                  ) : null
                )}
              </div>
            )}
            {readOnly && canShowTransfer ? (
              <SlidePanelActionButton
                variant="tile"
                icon={GitBranch}
                className="w-full"
                onClick={() => onTransfer(member)}
              >
                {t('drawer.transferBranch')}
              </SlidePanelActionButton>
            ) : null}
          </SlidePanelFooter>
          ) : footerAlerts.length > 0 ? (
            <SlidePanelFooter alerts={footerAlerts} />
          ) : null
        }
      >
        {error && (
          <div className="ui-alert-rose mb-6">
            {error}
          </div>
        )}

        <div className="space-y-7">
          <SlidePanelProfileHeader
            name={member.name}
            avatar={
              <MemberPhoto
                memberId={member.id}
                apiFetch={apiFetch}
                name={member.name}
                hasPhoto={member.hasPhoto}
                className="h-16 w-16 rounded-2xl object-cover"
                fallbackClassName="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-app-border text-2xl font-bold text-app-text"
              />
            }
            lines={
              member.phone
                ? [{ text: member.phone, mono: true, key: 'phone' }]
                : []
            }
            badge={<StatusBadge status={isFormer ? 'Former' : member.status} />}
          />

          <SlidePanelSection title={t('drawer.subscription')}>
            {!isFormer && visitSummaryLoading ? (
              <MemberDrawerVisitCardSkeleton />
            ) : visitSummary ? (
              <div className="mb-3 flex items-center gap-3 rounded-xl border border-app-border-subtle bg-app-bg/60 px-4 py-3.5">
                <VisitRing
                  visits={visitSummary.visits_this_week ?? 0}
                  limit={effectiveVisitsLimit(visitSummary.visits_limit)}
                  size={72}
                  weekStartsOn={visitSummary.week_starts_on || 'monday'}
                  title={t('pages.checkIn.openCheckInFor', { name: member.name })}
                  onClick={() => {
                    onClose?.();
                    navigate('/dashboard/check-in', {
                      state: {
                        memberId: member.id,
                        q: member.phone || member.name || '',
                      },
                    });
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-semibold tracking-tight text-app-text-strong">
                    {t('pages.checkIn.ringLabel')}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-app-muted">
                    {t('pages.checkIn.ringProgress', {
                      count: visitSummary.visits_this_week,
                      limit: effectiveVisitsLimit(visitSummary.visits_limit),
                    })}
                  </p>
                  {telegramLinked ? (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-sky-600 dark:text-sky-300">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500 dark:bg-sky-400"
                        aria-hidden
                      />
                      {t('pages.checkIn.telegramLinked')}
                    </p>
                  ) : null}
                </div>
                {canShowPass ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setIsPassOpen(true)}
                  >
                    <QrCode className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {t('drawer.showPass')}
                  </Button>
                ) : null}
              </div>
            ) : canShowPass ? (
              <div className="mb-3 flex items-center gap-3 rounded-xl border border-app-border-subtle bg-app-bg/60 px-4 py-3.5">
                {telegramLinked ? (
                  <p className="flex min-w-0 flex-1 items-center gap-1.5 text-xs font-medium text-sky-600 dark:text-sky-300">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500 dark:bg-sky-400"
                      aria-hidden
                    />
                    {t('pages.checkIn.telegramLinked')}
                  </p>
                ) : (
                  <span className="min-w-0 flex-1" />
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setIsPassOpen(true)}
                >
                  <QrCode className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {t('drawer.showPass')}
                </Button>
              </div>
            ) : null}
            {!isFormer && recentPreview.length > 0 ? (
              <div className="mb-3">
                <button
                  type="button"
                  onClick={() => setRecentVisitsOpen((open) => !open)}
                  aria-expanded={recentVisitsOpen}
                  className="flex w-full items-center gap-2 rounded-xl border border-app-border-subtle bg-app-bg/40 px-3.5 py-2.5 text-left transition-colors hover:bg-app-bg/70"
                >
                  <Clock3 className="h-4 w-4 shrink-0 text-app-muted" aria-hidden />
                  <span className="min-w-0 flex-1 font-display text-sm font-semibold tracking-tight text-app-text-strong">
                    {t('pages.checkIn.recentVisits')}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-app-muted transition-transform duration-200 ${
                      recentVisitsOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden
                  />
                </button>
                {recentVisitsOpen ? (
                  <div className="mt-2 rounded-xl border border-app-border-subtle bg-app-bg/40 px-3.5 py-2.5 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150">
                    <ul className="space-y-0.5">
                      {recentPreview.map((row) => {
                        const rel = attendanceDayRelative(row.checked_in_at);
                        const day =
                          rel === 'today'
                            ? t('pages.checkIn.dayToday')
                            : rel === 'yesterday'
                              ? t('pages.checkIn.dayYesterday')
                              : formatAttendanceDayLabel(row.checked_in_at, i18n.language);
                        const time = formatDisplayTime(row.checked_in_at, i18n.language);
                        return (
                          <li
                            key={row.id}
                            className="py-1.5 font-display text-sm font-semibold tracking-tight text-app-text-strong"
                          >
                            {day} · {time}
                          </li>
                        );
                      })}
                    </ul>
                    {recentHasMore ? (
                      <button
                        type="button"
                        onClick={() => setVisitHistoryOpen(true)}
                        className="mt-1.5 w-full py-1.5 text-left text-sm font-semibold text-[color:var(--color-brand-text)] transition-opacity hover:opacity-80"
                      >
                        {t('pages.checkIn.recentVisitsSeeAll')}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : !isFormer && visitSummary ? (
              <p className="mb-3 text-xs text-app-muted">{t('pages.checkIn.recentVisitsEmpty')}</p>
            ) : null}
            <SlidePanelCard>
              {member.branchName && (branches.filter((b) => b.is_active !== false).length > 1) && (
                <SlidePanelRow
                  label={t('table.branch')}
                  value={member.branchName}
                  valueClassName="text-sm font-medium text-app-text-strong"
                />
              )}
              <SlidePanelRow
                label={t('table.plan')}
                value={planLabel}
                valueClassName="text-sm font-semibold text-app-text-strong"
              />
              {member.trainerName ? (
                <SlidePanelRow
                  label={t('table.trainer')}
                  value={member.trainerName}
                  valueClassName="text-sm font-medium text-app-text-strong"
                />
              ) : null}
              <SlidePanelRow
                label={t('drawer.term')}
                value={
                  <>
                    {friendlyDate(member.startDate)}
                    <span className="mx-1.5 text-app-muted">–</span>
                    {friendlyDate(member.endDate)}
                  </>
                }
                valueClassName="text-sm font-medium text-app-text-strong"
              />
              {isFormer && member.deletedAt ? (
                <SlidePanelRow
                  label={t('pages.members.removedOn')}
                  value={friendlyDate(member.deletedAt)}
                  valueClassName="text-sm font-medium text-app-text-strong"
                />
              ) : null}
            </SlidePanelCard>
          </SlidePanelSection>

          <SlidePanelSection title={t('drawer.payments')}>
            {paymentsError ? (
              <div className="py-6 text-center">
                <p className="mb-2 text-sm text-rose-600">{paymentsError}</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={paymentsLoading}
                  disabled={paymentsLoading}
                  onClick={() => void loadPayments()}
                >
                  {t('drawer.retry')}
                </Button>
              </div>
            ) : paymentsLoading ? (
              <p className="py-8 text-center text-sm text-app-muted">{t('drawer.loadingPayments')}</p>
            ) : memberPayments.length > 0 ? (
              <div className="space-y-4">
                <SlidePanelCard>
                  <SlidePanelRow
                    label={t('drawer.currentTerm')}
                    value={paidForCurrentTerm ? t('drawer.paid') : t('drawer.unpaid')}
                    valueClassName={
                      paidForCurrentTerm
                        ? 'text-sm font-semibold text-app-text-strong'
                        : 'text-sm font-semibold text-amber-700 dark:text-amber-300'
                    }
                  />
                  <SlidePanelRow
                    label={t('drawer.thisTermPaid')}
                    value={
                      <>
                        {currency(termPaid)}
                        {termPaymentCount > 1 && (
                          <span className="ml-1 text-xs font-normal text-app-muted">
                            {t('drawer.paymentCount', { count: termPaymentCount })}
                          </span>
                        )}
                      </>
                    }
                  />
                  <SlidePanelRow
                    label={t('drawer.paidThrough')}
                    value={friendlyDate(member.endDate)}
                  />
                </SlidePanelCard>

                <div>
                  <SlidePanelList>
                    {visiblePayments.map((p) => {
                      const sourceLabel = paymentSourceLabel(p.source);
                      return (
                        <SlidePanelListItem
                          key={p.id}
                          title={currency(p.amount)}
                          subtitle={
                            <>
                              {friendlyDate(p.date)}
                              <span className="mx-1.5 text-app-border">·</span>
                              {sourceLabel}
                            </>
                          }
                          trailing={<PaymentMethodBadge method={p.method} />}
                        />
                      );
                    })}
                  </SlidePanelList>
                  {hiddenPaymentCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => setShowAllPayments((open) => !open)}
                      className="mt-2 w-full text-center text-xs font-semibold text-app-muted hover:text-app-text-strong"
                    >
                      {showAllPayments
                        ? t('drawer.showLessPayments')
                        : t('drawer.showMorePayments', { count: hiddenPaymentCount })}
                      {!showAllPayments ? (
                        <span className="ml-1 font-normal text-app-muted">
                          · {currency(totalPaid)}
                        </span>
                      ) : null}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <SlidePanelEmpty>{t('drawer.noPayments')}</SlidePanelEmpty>
            )}
          </SlidePanelSection>
        </div>
      </SlidePanel>

      {isEditOpen ? (
        <Suspense fallback={null}>
          <MemberModal
            isOpen={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            onSubmit={handleEditSubmit}
            plans={plans}
            member={member}
            branches={branches}
            defaultBranchId={defaultBranchId}
            showBranchPicker={showBranchPicker}
            showPhotoUpload={showPhotoUpload}
            apiFetch={apiFetch}
            saving={saving}
            error={error}
          />
        </Suspense>
      ) : null}

      <ConfirmDialog
        isOpen={isDeleteOpen}
        title={t('drawer.deleteTitle')}
        message={t('drawer.deleteMessage', { name: member.name })}
        confirmText={t('drawer.deleteConfirm')}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteOpen(false)}
      />

      {isPassOpen ? (
        <Suspense fallback={null}>
          <MemberPassModal
            open={isPassOpen}
            member={member}
            onClose={() => setIsPassOpen(false)}
            onFlash={showFlash}
            onMemberUpdated={onMemberRefresh}
          />
        </Suspense>
      ) : null}

      <MemberVisitHistoryModal
        open={visitHistoryOpen}
        onClose={() => setVisitHistoryOpen(false)}
        memberId={member?.id}
        memberName={member?.name}
      />
    </>
  );
}
