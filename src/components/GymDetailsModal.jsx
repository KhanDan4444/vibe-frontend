// src/components/GymDetailsModal.jsx
import React, { useState } from 'react';
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
} from 'lucide-react';
import { paymentSourceLabel } from '../utils/paymentSources';
import { translatePaymentMethod } from '../i18n/helpers.js';
import { toDateString, formatDisplayDate } from '../utils/date';
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
}) {
  const { t } = useTranslation();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetSaving, setResetSaving] = useState(false);
  const [mutationError, setMutationError] = useState('');
  const [resetError, setResetError] = useState('');

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
  const canCollect = isUnpaid && gymDetail?.subscription_status?.toLowerCase() === 'active';
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
  const recentPayments = saasPayments.slice(0, 3);
  const olderPaymentCount = Math.max(saasPayments.length - recentPayments.length, 0);
  const displayError = mutationError || detailError;
  const currency = (amount) =>
    amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

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
  if (canCollect) {
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
        title={t('modals.gymDetails.title')}
        footer={
          !detailLoading && gymDetail ? (
            <SlidePanelFooter alerts={footerAlerts}>
              <div className="space-y-2">
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

                {((gymForActions && canChangeSaasPlan(gymForActions) && onChangePlan && otherPlans.length > 0) ||
                  (onResetOwnerPassword && gymDetail?.owner_user_id)) && (
                  <SlidePanelActionGrid>
                    {gymForActions && canChangeSaasPlan(gymForActions) && onChangePlan && otherPlans.length > 0 && (
                      <SlidePanelActionButton
                        variant="tile"
                        icon={ArrowLeftRight}
                        className={!(onResetOwnerPassword && gymDetail?.owner_user_id) ? 'col-span-2' : ''}
                        onClick={() => onChangePlan(gymForActions)}
                      >
                        {t('modals.gymDetails.changePlan')}
                      </SlidePanelActionButton>
                    )}
                    {onResetOwnerPassword && gymDetail?.owner_user_id && (
                      <SlidePanelActionButton
                        variant="tile"
                        icon={KeyRound}
                        className={
                          !(gymForActions && canChangeSaasPlan(gymForActions) && onChangePlan && otherPlans.length > 0)
                            ? 'col-span-2'
                            : ''
                        }
                        onClick={() => {
                          setResetError('');
                          setIsResetOpen(true);
                        }}
                      >
                        {t('modals.gymDetails.resetOwnerPassword')}
                      </SlidePanelActionButton>
                    )}
                  </SlidePanelActionGrid>
                )}

                <div className="flex items-stretch gap-2">
                  <SlidePanelActionButton
                    variant="secondary"
                    icon={Pencil}
                    className="flex-1"
                    onClick={() => {
                      setMutationError('');
                      setIsEditOpen(true);
                    }}
                  >
                    {t('modals.gymDetails.editGym')}
                  </SlidePanelActionButton>
                  <SlidePanelActionButton
                    variant="dangerIcon"
                    icon={Trash2}
                    onClick={() => setIsDeleteOpen(true)}
                    title={t('modals.gymDetails.deleteGym')}
                    aria-label={t('modals.gymDetails.deleteGym')}
                  />
                </div>
              </div>
            </SlidePanelFooter>
          ) : null
        }
      >
        {displayError && (
          <div className="ui-alert-rose mb-6">
            {displayError}
          </div>
        )}

        {detailLoading ? (
          <p className="py-12 text-center text-sm text-slate-400 dark:text-app-muted">{t('common.loading')}</p>
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
              badge={<StatusBadge status={gymDetail.subscription_status} />}
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
                  valueClassName="text-sm font-bold text-indigo-600"
                />
                <SlidePanelRow
                  icon={Calendar}
                  label={isFutureLicense ? t('modals.gymDetails.nextLicenseStarts') : t('modals.gymDetails.licenseStarts')}
                  value={formatDisplayDate(licenseStart)}
                  valueClassName="text-sm font-medium text-slate-700 dark:text-app-text-strong"
                />
                <SlidePanelRow
                  icon={CalendarRange}
                  label={t('modals.gymDetails.licenseEnds')}
                  value={formatDisplayDate(gymDetail.saas_subscription?.end_date)}
                  valueClassName="text-sm font-semibold text-slate-900 dark:text-app-text-strong"
                />
                <SlidePanelRow
                  icon={Building2}
                  label={t('modals.gymDetails.gymRegistered')}
                  value={formatDisplayDate(gymDetail.created_at)}
                  valueClassName="text-sm font-medium text-slate-700 dark:text-app-text-strong"
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
                    <p className="text-xs text-slate-500 dark:text-app-muted">{stat.label}</p>
                    <p
                      className={`text-xl font-bold ${
                        stat.highlight ? 'text-violet-700 dark:text-violet-300' : 'text-slate-900 dark:text-app-text-strong'
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
                <div className="space-y-3">
                  <SlidePanelCard>
                    <SlidePanelRow
                      icon={CircleDollarSign}
                      label={t('modals.gymDetails.currentLicense')}
                      value={paidForCurrentTerm ? t('drawer.paid') : t('drawer.unpaid')}
                      valueClassName={
                        paidForCurrentTerm
                          ? 'text-sm font-bold text-emerald-700 dark:text-emerald-300'
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
                            <span className="ml-1 text-xs font-normal text-slate-400">
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
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-app-muted">
                      {t('drawer.recentPayments')}
                    </p>
                    <SlidePanelList>
                      {recentPayments.map((p) => {
                        const sourceLabel = paymentSourceLabel(p.source);
                        return (
                          <SlidePanelListItem
                            key={p.id}
                            icon={Receipt}
                            title={currency(Number(p.amount))}
                            subtitle={
                              <>
                                {formatDisplayDate(p.date)}
                                <span className="mx-1.5 text-slate-300 dark:text-app-border">·</span>
                                {sourceLabel}
                              </>
                            }
                            trailing={
                              <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-app-muted">
                                {translatePaymentMethod(p.method)}
                              </span>
                            }
                          />
                        );
                      })}
                    </SlidePanelList>
                    {olderPaymentCount > 0 && (
                      <p className="mt-2 text-right text-xs text-slate-400 dark:text-app-muted">
                        {t('drawer.olderPayments', { count: olderPaymentCount, amount: currency(totalPaid) })}
                      </p>
                    )}
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
        confirmText={t('common.delete')}
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
