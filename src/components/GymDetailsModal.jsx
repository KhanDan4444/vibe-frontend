// src/components/GymDetailsModal.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pencil,
  Trash2,
  Phone,
  Mail,
  User,
  Building2,
  AtSign,
  CreditCard,
  Calendar,
  CalendarRange,
  Receipt,
  RefreshCw,
  CircleDollarSign,
  ArrowLeftRight,
  KeyRound,
  Undo2,
} from 'lucide-react';
import { paymentSourceLabel } from '../utils/paymentSources';
import PaymentMethodBadge from './PaymentMethodBadge';
import { toDateString, formatDisplayDate } from '../utils/date';
import { formatMoney } from '../utils/formatMoney';
import StatusBadge from './StatusBadge';
import InitialsAvatar from './InitialsAvatar';
import { canRenewGym, canChangeSaasPlan } from '../utils/saasRenew';
import ConfirmDialog from './ConfirmDialog';
import GymEditModal from './GymEditModal';
import ResetPasswordModal from './ResetPasswordModal';
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

const PAYMENTS_PREVIEW = 3;

/**
 * Side drawer for gym tenant details (admin). Edit opens GymEditModal — same pattern as MemberDetailDrawer.
 */
export default function GymDetailsModal({
  selectedGymId,
  onClose,
  gymDetail,
  saasPlans = [],
  detailLoading,
  detailError,
  onUpdate,
  onDelete,
  onRenew,
  onChangePlan,
  onCollectPayment,
  onResetOwnerPassword,
  onRestore,
  onRetryDetail,
}) {
  const { t } = useTranslation();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetSaving, setResetSaving] = useState(false);
  const [mutationError, setMutationError] = useState('');
  const [resetError, setResetError] = useState('');
  const [showAllPayments, setShowAllPayments] = useState(false);

  useEffect(() => {
    setShowAllPayments(false);
  }, [selectedGymId]);

  if (!selectedGymId) return null;

  const saasPayments = gymDetail?.saas_payments || [];
  const termStart = gymDetail?.saas_subscription?.start_date
    ? toDateString(gymDetail.saas_subscription.start_date)
    : null;
  const termPayments = termStart
    ? saasPayments.filter((p) => {
        const coverageStart = p.coverage_start_date ? toDateString(p.coverage_start_date) : null;
        if (coverageStart) return coverageStart === termStart;
        return p.date && toDateString(p.date) >= termStart;
      })
    : saasPayments;
  const paidForCurrentTerm = termStart
    ? termPayments.length > 0
    : false;
  const isUnpaid = gymDetail?.is_unpaid ?? (termStart ? !paidForCurrentTerm : false);
  const isFormer = Boolean(gymDetail?.deleted_at);
  const canCollect = !isFormer && isUnpaid && gymDetail?.subscription_status?.toLowerCase() === 'active';
  const endDate = gymDetail?.saas_subscription?.end_date;
  const endDisplay = toDateString(endDate);
  const licenseStart = gymDetail?.saas_subscription?.start_date
    ? toDateString(gymDetail.saas_subscription.start_date)
    : null;
  const isFutureLicense = licenseStart && licenseStart > toDateString(new Date());
  const otherPlans = saasPlans.filter(
    (p) => p.id !== gymDetail?.saas_subscription?.saas_plan_id
  );
  const gymForActions = gymDetail
    ? {
        ...gymDetail,
        isUnpaid,
        saasStartDate: termStart,
        saasEndDate: endDisplay,
        saas_plan_id: gymDetail.saas_subscription?.saas_plan_id,
      }
    : null;
  const termPaid = termPayments.reduce((s, p) => s + Number(p.amount), 0);
  const termPaymentCount = termPayments.length;
  const totalPaid = saasPayments.reduce((s, p) => s + Number(p.amount), 0);
  const visiblePayments = showAllPayments
    ? saasPayments
    : saasPayments.slice(0, PAYMENTS_PREVIEW);
  const hiddenPaymentCount = Math.max(saasPayments.length - PAYMENTS_PREVIEW, 0);
  const canShowChangePlan =
    !isFormer && Boolean(gymForActions && canChangeSaasPlan(gymForActions) && onChangePlan && otherPlans.length > 0);
  const canShowResetPassword = !isFormer && Boolean(onResetOwnerPassword && gymDetail?.owner_user_id);
  const hasPrimaryLifecycle =
    !isFormer &&
    ((canCollect && onCollectPayment) ||
      Boolean(gymForActions && canRenewGym(gymForActions) && onRenew));

  const utilityTiles = [];
  if (!isFormer && gymDetail) {
    if (canShowChangePlan) {
      utilityTiles.push({
        key: 'change-plan',
        label: t('modals.gymDetails.changePlan'),
        icon: ArrowLeftRight,
        onClick: () => onChangePlan(gymForActions),
      });
    }
    if (canShowResetPassword) {
      utilityTiles.push({
        key: 'reset-password',
        label: t('modals.gymDetails.resetOwnerPassword'),
        icon: KeyRound,
        onClick: () => {
          setResetError('');
          setIsResetOpen(true);
        },
      });
    }
    utilityTiles.push({
      key: 'edit',
      label: t('modals.gymDetails.editGym'),
      icon: Pencil,
      onClick: () => {
        setMutationError('');
        setIsEditOpen(true);
      },
    });
    utilityTiles.push({
      key: 'delete',
      label: t('modals.gymDetails.deleteGym'),
      icon: Trash2,
      danger: true,
      onClick: () => setIsDeleteOpen(true),
    });
  }

  /** Match member drawer: 1–3 tiles → one row; 4 → 2+2. */
  const utilityRows =
    utilityTiles.length <= 3
      ? [utilityTiles]
      : [utilityTiles.slice(0, 2), utilityTiles.slice(2)];

  const displayError = mutationError || (gymDetail ? detailError : '');
  const currency = (amount) => formatMoney(amount);

  const handleEditSubmit = async (formData) => {
    setSaving(true);
    setMutationError('');
    try {
      await onUpdate(selectedGymId, formData);
      setIsEditOpen(false);
    } catch (err) {
      setMutationError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleteOpen(false);
    setMutationError('');
    try {
      await onDelete(selectedGymId);
      onClose();
    } catch (err) {
      setMutationError(err.message);
    }
  };

  const handleResetPassword = async (password) => {
    if (!onResetOwnerPassword) return;
    setResetSaving(true);
    setResetError('');
    try {
      await onResetOwnerPassword(selectedGymId, password);
      setIsResetOpen(false);
    } catch (err) {
      setResetError(err.message);
    } finally {
      setResetSaving(false);
    }
  };

  const footerAlerts = [];
  if (isFormer) {
    footerAlerts.push({
      key: 'former',
      variant: 'muted',
      text: t('modals.gymDetails.formerHint'),
    });
  } else if (canCollect) {
    footerAlerts.push({
      key: 'unpaid',
      variant: 'warning',
      text:
        otherPlans.length > 0
          ? t('modals.gymDetails.alertUnpaidChangeOrCollect')
          : t('modals.gymDetails.alertUnpaidCollect'),
    });
  }

  return (
    <>
      <SlidePanel
        open
        onClose={onClose}
        title={isFormer ? t('modals.gymDetails.formerTitle') : t('modals.gymDetails.title')}
        footer={
          !gymDetail ? null : (
            <SlidePanelFooter alerts={footerAlerts}>
              {isFormer ? (
                onRestore ? (
                  <SlidePanelActionButton
                    variant="successHero"
                    icon={Undo2}
                    onClick={() => onRestore(gymDetail)}
                  >
                    {t('modals.gymDetails.restoreGym')}
                  </SlidePanelActionButton>
                ) : null
              ) : (
              <div className="space-y-2.5">
                {canCollect && onCollectPayment ? (
                  <SlidePanelActionButton
                    variant="hero"
                    icon={CircleDollarSign}
                    onClick={() => onCollectPayment(gymForActions || gymDetail)}
                  >
                    {t('modals.gymDetails.collectPayment')}
                  </SlidePanelActionButton>
                ) : gymForActions && canRenewGym(gymForActions) && onRenew ? (
                  <SlidePanelActionButton
                    variant="successHero"
                    icon={RefreshCw}
                    onClick={() => onRenew(gymForActions)}
                  >
                    {t('modals.gymDetails.renewLicense')}
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
            </SlidePanelFooter>
          )
        }
      >
        {displayError && (
          <div className="ui-alert-rose mb-6">
            {displayError}
          </div>
        )}

        {detailLoading && !gymDetail ? (
          <p className="py-12 text-center text-sm text-app-muted">{t('common.loading')}</p>
        ) : !gymDetail && detailError ? (
          <div className="space-y-4 py-8 text-center">
            <p className="text-sm text-rose-600 dark:text-rose-400">{detailError}</p>
            {onRetryDetail ? (
              <SlidePanelActionButton variant="secondary" onClick={onRetryDetail}>
                {t('common.retry')}
              </SlidePanelActionButton>
            ) : null}
          </div>
        ) : gymDetail ? (
          <div className="space-y-6">
            <SlidePanelProfileHeader
              name={gymDetail.name}
              avatar={<InitialsAvatar name={gymDetail.name} size="lg" />}
              lines={[
                { icon: User, text: gymDetail.owner_name, key: 'owner' },
                ...(gymDetail.phone
                  ? [{ icon: Phone, text: gymDetail.phone, mono: true, key: 'phone' }]
                  : []),
                ...(gymDetail.owner_username
                  ? [{ icon: AtSign, text: gymDetail.owner_username, key: 'username' }]
                  : []),
                ...(gymDetail.owner_email
                  ? [{ icon: Mail, text: gymDetail.owner_email, key: 'email' }]
                  : []),
              ]}
              badge={<StatusBadge status={isFormer ? 'Former' : gymDetail.subscription_status} />}
            />

            <SlidePanelSection title={t('modals.gymDetails.saasLicense')}>
              <SlidePanelCard>
                <SlidePanelRow
                  icon={CreditCard}
                  label={t('table.plan')}
                  value={
                    gymDetail.saas_subscription
                      ? gymDetail.saas_subscription.saas_plan_catalog_name ||
                        gymDetail.saas_subscription.plan
                      : '—'
                  }
                  valueClassName="text-sm font-bold text-app-text-strong"
                />
                <SlidePanelRow
                  icon={Calendar}
                  label={isFutureLicense ? t('modals.gymDetails.nextLicenseStarts') : t('modals.gymDetails.licenseStarts')}
                  value={formatDisplayDate(licenseStart)}
                  valueClassName="text-sm font-medium text-app-text"
                />
                <SlidePanelRow
                  icon={CalendarRange}
                  label={t('modals.gymDetails.licenseEnds')}
                  value={formatDisplayDate(gymDetail.saas_subscription?.end_date)}
                  valueClassName="text-sm font-semibold text-app-text-strong"
                />
                {isFormer && gymDetail.deleted_at ? (
                  <SlidePanelRow
                    icon={Calendar}
                    label={t('modals.gymDetails.removedOn')}
                    value={formatDisplayDate(gymDetail.deleted_at)}
                    valueClassName="text-sm font-medium text-app-text"
                  />
                ) : null}
                <SlidePanelRow
                  icon={Building2}
                  label={t('modals.gymDetails.gymRegistered')}
                  value={formatDisplayDate(gymDetail.created_at)}
                  valueClassName="text-sm font-medium text-app-text"
                />
              </SlidePanelCard>
            </SlidePanelSection>

            <SlidePanelSection title={t('modals.gymDetails.stats')}>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: t('modals.gymDetails.statActiveMembers'), value: gymDetail.stats?.active_members ?? 0, highlight: true },
                  { label: t('modals.gymDetails.statTotalMembers'), value: gymDetail.stats?.total_members ?? 0 },
                  { label: t('modals.gymDetails.statDueSoon'), value: gymDetail.stats?.due_soon_members ?? 0 },
                  { label: t('modals.gymDetails.statExpired'), value: gymDetail.stats?.expired_members ?? 0 },
                  { label: t('modals.gymDetails.statPlans'), value: gymDetail.plan_count ?? 0 },
                  { label: t('modals.gymDetails.statBranches'), value: gymDetail.branch_count ?? 0 },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className={stat.highlight ? 'ui-stat-card-highlight' : 'ui-stat-card'}
                  >
                    <p className="text-xs text-app-muted">{stat.label}</p>
                    <p
                      className={`text-xl font-bold ${
                        stat.highlight ? 'text-orange-700 dark:text-orange-300' : 'text-app-text-strong'
                      }`}
                    >
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            </SlidePanelSection>

            <SlidePanelSection title={t('modals.gymDetails.paymentHistory')}>
              {saasPayments.length > 0 ? (
                <div className="space-y-4">
                  <SlidePanelCard>
                    <SlidePanelRow
                      icon={CircleDollarSign}
                      label={t('modals.gymDetails.currentLicense')}
                      value={paidForCurrentTerm ? t('drawer.paid') : t('drawer.unpaid')}
                      valueClassName={
                        paidForCurrentTerm
                          ? 'text-sm font-bold text-app-text-strong'
                          : 'text-sm font-bold text-amber-700 dark:text-amber-300'
                      }
                    />
                    <SlidePanelRow
                      icon={Receipt}
                      label={t('modals.gymDetails.thisLicensePaid')}
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
                      icon={CalendarRange}
                      label={t('modals.gymDetails.paidThrough')}
                      value={formatDisplayDate(gymDetail.saas_subscription?.end_date)}
                    />
                  </SlidePanelCard>

                  <div>
                    <SlidePanelList>
                      {visiblePayments.map((p) => {
                        const sourceLabel = paymentSourceLabel(p.source);
                        return (
                          <SlidePanelListItem
                            key={p.id}
                            icon={Receipt}
                            title={currency(Number(p.amount))}
                            subtitle={
                              <>
                                {formatDisplayDate(p.date)}
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
                <SlidePanelEmpty>{t('modals.gymDetails.noPayments')}</SlidePanelEmpty>
              )}
            </SlidePanelSection>
          </div>
        ) : null}
      </SlidePanel>

      <GymEditModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleEditSubmit}
        gym={gymDetail}
        saasPlans={saasPlans}
        saving={saving}
        error={mutationError}
      />

      <ConfirmDialog
        isOpen={isDeleteOpen}
        title={t('modals.gymDetails.deleteTitle')}
        message={t('modals.gymDetails.deleteMessage', { name: gymDetail?.name })}
        confirmText={t('modals.gymDetails.deleteConfirm')}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteOpen(false)}
      />

      <ResetPasswordModal
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        onSubmit={handleResetPassword}
        accountName={gymDetail?.owner_name}
        title={t('modals.resetPassword.ownerTitle')}
        subtitle={t('modals.resetPassword.ownerSubtitle', { name: gymDetail?.owner_name })}
        saving={resetSaving}
        error={resetError}
      />
    </>
  );
}
