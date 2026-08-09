// src/components/MemberDetailDrawer.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  Pencil,
  Trash2,
  Phone,
  Calendar,
  CalendarRange,
  CircleDollarSign,
  Dumbbell,
  Receipt,
  RefreshCw,
  MapPin,
  ArrowRightLeft,
  ArrowLeftRight,
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import { canRenewMember, canChangePlan } from '../utils/memberRenew';
import { parseApiResponse } from '../utils/api';
import { mapPaymentFromApi } from '../utils/apiMappers';
import { paymentSourceLabel } from '../utils/paymentSources';
import PaymentMethodBadge from './PaymentMethodBadge';
import { formatDisplayDate } from '../utils/date';
import { getMemberPayments } from '../services/memberService';
import ConfirmDialog from './ConfirmDialog';
import MemberModal from './MemberModal';
import MemberPhoto from './MemberPhoto';
import Button from './ui/Button';
import { formatMoney } from '../utils/formatMoney';
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
  readOnly = false,
}) {
  const { t } = useTranslation();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [memberPayments, setMemberPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState('');
  const [showAllPayments, setShowAllPayments] = useState(false);

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
    loadPayments();
  }, [loadPayments, paymentsRefreshKey, member?.startDate, member?.isUnpaid]);

  useEffect(() => {
    setShowAllPayments(false);
  }, [member?.id]);

  const matchingPlan = useMemo(
    () => (member ? plans.find((p) => p.id === member.planId) : null),
    [plans, member],
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

  const canShowChangePlan = !readOnly && canChangePlan(member) && onChangePlan && otherPlans.length > 0;
  const canShowTransfer = showTransfer && onTransfer;
  const hasSecondaryActions = canShowChangePlan || (!readOnly && canShowTransfer);
  const hasPrimaryLifecycle =
    !readOnly &&
    ((canCollectMissedPayment && onRecordPayment) || (canRenewMember(member) && onRenew));

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
  if (canCollectMissedPayment) {
    footerAlerts.push({
      key: 'unpaid',
      variant: 'warning',
      text:
        otherPlans.length > 0
          ? t('drawer.alertUnpaidChangeOrCollect')
          : t('drawer.alertUnpaidCollect'),
    });
  }

  return createPortal(
    <>
      <SlidePanel
        open
        onClose={onClose}
        title={t('drawer.memberTitle')}
        footer={
          !readOnly || showTransfer ? (
          <SlidePanelFooter alerts={footerAlerts}>
            {!readOnly && (
              <div className="space-y-2">
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

                {hasSecondaryActions && (
                  <SlidePanelActionGrid columns={2}>
                    {canShowChangePlan && (
                      <SlidePanelActionButton
                        variant="tile"
                        icon={ArrowLeftRight}
                        className={!canShowTransfer ? 'col-span-2' : ''}
                        onClick={() => onChangePlan(member)}
                      >
                        {t('actions.changePlan')}
                      </SlidePanelActionButton>
                    )}
                    {canShowTransfer && (
                      <SlidePanelActionButton
                        variant="tile"
                        icon={ArrowRightLeft}
                        className={!canShowChangePlan ? 'col-span-2' : ''}
                        onClick={() => onTransfer(member)}
                      >
                        {t('drawer.transferBranch')}
                      </SlidePanelActionButton>
                    )}
                  </SlidePanelActionGrid>
                )}
              </div>
            )}
            {readOnly && canShowTransfer && (
              <SlidePanelActionButton
                variant="tile"
                icon={ArrowRightLeft}
                className="w-full"
                onClick={() => onTransfer(member)}
              >
                {t('drawer.transferBranch')}
              </SlidePanelActionButton>
            )}
            {!readOnly && (
              <div className={`flex items-stretch gap-2 ${hasPrimaryLifecycle || hasSecondaryActions ? 'pt-0.5' : ''}`}>
                <SlidePanelActionButton
                  variant="secondary"
                  icon={Pencil}
                  className="flex-1"
                  onClick={() => {
                    setError('');
                    setIsEditOpen(true);
                  }}
                >
                  {t('drawer.editContact')}
                </SlidePanelActionButton>
                {canDelete && (
                  <SlidePanelActionButton
                    variant="danger"
                    icon={Trash2}
                    className="shrink-0"
                    onClick={() => setIsDeleteOpen(true)}
                  >
                    {t('drawer.deleteMember')}
                  </SlidePanelActionButton>
                )}
              </div>
            )}
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

        <div className="space-y-6">
          <SlidePanelProfileHeader
            name={member.name}
            avatar={
              <MemberPhoto
                memberId={member.id}
                apiFetch={apiFetch}
                name={member.name}
                hasPhoto={member.hasPhoto}
              />
            }
            lines={[{ icon: Phone, text: member.phone, mono: true, key: 'phone' }]}
            badge={<StatusBadge status={member.status} />}
          />

          <SlidePanelSection title={t('drawer.subscription')}>
            <SlidePanelCard>
              {member.branchName && (
                <SlidePanelRow
                  icon={MapPin}
                  label={t('table.branch')}
                  value={member.branchName}
                  valueClassName="text-sm font-medium text-app-text-strong"
                />
              )}
              <SlidePanelRow
                icon={Dumbbell}
                label={t('table.plan')}
                value={matchingPlan ? matchingPlan.name : member.planName || t('pages.dashboard.customPlan')}
                valueClassName="text-sm font-bold text-teal-700 dark:text-teal-300"
              />
              <SlidePanelRow
                icon={Calendar}
                label={t('table.startDate')}
                value={formatDisplayDate(member.startDate)}
                valueClassName="text-sm font-medium text-app-text"
              />
              <SlidePanelRow
                icon={CalendarRange}
                label={t('table.endDate')}
                value={formatDisplayDate(member.endDate)}
                valueClassName="text-sm font-semibold text-app-text-strong"
              />
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
                    icon={CircleDollarSign}
                    label={t('drawer.currentTerm')}
                    value={paidForCurrentTerm ? t('drawer.paid') : t('drawer.unpaid')}
                    valueClassName={
                      paidForCurrentTerm
                        ? 'text-sm font-bold text-emerald-700 dark:text-emerald-300'
                        : 'text-sm font-bold text-amber-700 dark:text-amber-300'
                    }
                  />
                  <SlidePanelRow
                    icon={Receipt}
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
                    icon={CalendarRange}
                    label={t('drawer.paidThrough')}
                    value={formatDisplayDate(member.endDate)}
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
                          title={currency(p.amount)}
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
                      className="mt-2 w-full text-center text-xs font-semibold text-teal-700 hover:text-teal-800 dark:text-teal-300 dark:hover:text-teal-200"
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

      <MemberModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleEditSubmit}
        plans={plans}
        member={isEditOpen ? member : null}
        branches={branches}
        defaultBranchId={defaultBranchId}
        showBranchPicker={showBranchPicker}
        showPhotoUpload={showPhotoUpload}
        apiFetch={apiFetch}
        saving={saving}
        error={error}
      />

      <ConfirmDialog
        isOpen={isDeleteOpen}
        title={t('drawer.deleteTitle')}
        message={t('drawer.deleteMessage', { name: member.name })}
        confirmText={t('drawer.deleteConfirm')}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteOpen(false)}
      />
    </>,
    document.body
  );
}
