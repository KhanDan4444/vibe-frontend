/** Human-readable labels for audit log actions. */
import i18n from '../i18n/index.js';
import { translatePaymentMethod } from '../i18n/helpers.js';
import { formatMoney } from './formatMoney.js';
import { formatPlanDisplayName } from './formatPlanDisplayName.js';

const ACTION_KEYS = {
  'member.created': 'activity.actions.member.created',
  'member.enrolled': 'activity.actions.member.enrolled',
  'member.renewed': 'activity.actions.member.renewed',
  'member.plan_changed': 'activity.actions.member.plan_changed',
  'member.updated': 'activity.actions.member.updated',
  'member.transferred': 'activity.actions.member.transferred',
  'member.deleted': 'activity.actions.member.deleted',
  'member.restored': 'activity.actions.member.restored',
  'payment.recorded': 'activity.actions.payment.recorded',
  'payment.updated': 'activity.actions.payment.updated',
  'payment.deleted': 'activity.actions.payment.deleted',
  'plan.created': 'activity.actions.plan.created',
  'plan.updated': 'activity.actions.plan.updated',
  'plan.deleted': 'activity.actions.plan.deleted',
  'staff.created': 'activity.actions.staff.created',
  'staff.updated': 'activity.actions.staff.updated',
  'trainer.created': 'activity.actions.trainer.created',
  'trainer.updated': 'activity.actions.trainer.updated',
  'trainer.deleted': 'activity.actions.trainer.deleted',
  'trainer.restored': 'activity.actions.trainer.restored',
  'check_in.recorded': 'activity.actions.check_in.recorded',
  'attendance.settings_updated': 'activity.actions.attendance.settings_updated',
  'member.pass_regenerated': 'activity.actions.member.pass_regenerated',
  'member.pass_sms_sent': 'activity.actions.member.pass_sms_sent',
};

/** Filter dropdown: categories + specific actions (optgroups in UI). */
export const ACTION_FILTER_OPTIONS = [
  { value: 'all', labelKey: 'pages.activity.filters.allEvents', group: null },
  { value: 'member', labelKey: 'pages.activity.filters.allMemberEvents', group: 'member' },
  { value: 'member.enrolled', labelKey: 'activity.actions.member.enrolled', group: 'member' },
  { value: 'member.renewed', labelKey: 'activity.actions.member.renewed', group: 'member' },
  { value: 'member.created', labelKey: 'activity.actions.member.created', group: 'member' },
  { value: 'member.updated', labelKey: 'activity.actions.member.updated', group: 'member' },
  { value: 'member.plan_changed', labelKey: 'activity.actions.member.plan_changed', group: 'member' },
  { value: 'member.transferred', labelKey: 'activity.actions.member.transferred', group: 'member' },
  { value: 'member.deleted', labelKey: 'activity.actions.member.deleted', group: 'member' },
  { value: 'member.restored', labelKey: 'activity.actions.member.restored', group: 'member' },
  { value: 'payment', labelKey: 'pages.activity.filters.allPaymentEvents', group: 'payment' },
  { value: 'payment.recorded', labelKey: 'activity.actions.payment.recorded', group: 'payment' },
  { value: 'payment.updated', labelKey: 'activity.actions.payment.updated', group: 'payment' },
  { value: 'payment.deleted', labelKey: 'activity.actions.payment.deleted', group: 'payment' },
  { value: 'plan', labelKey: 'pages.activity.filters.allPlanEvents', group: 'plan' },
  { value: 'plan.created', labelKey: 'activity.actions.plan.created', group: 'plan' },
  { value: 'plan.updated', labelKey: 'activity.actions.plan.updated', group: 'plan' },
  { value: 'plan.deleted', labelKey: 'activity.actions.plan.deleted', group: 'plan' },
  { value: 'staff', labelKey: 'pages.activity.filters.allStaffEvents', group: 'staff' },
  { value: 'staff.created', labelKey: 'activity.actions.staff.created', group: 'staff' },
  { value: 'staff.updated', labelKey: 'activity.actions.staff.updated', group: 'staff' },
  { value: 'trainer', labelKey: 'pages.activity.filters.allTrainerEvents', group: 'trainer' },
  { value: 'trainer.created', labelKey: 'activity.actions.trainer.created', group: 'trainer' },
  { value: 'trainer.updated', labelKey: 'activity.actions.trainer.updated', group: 'trainer' },
  { value: 'trainer.deleted', labelKey: 'activity.actions.trainer.deleted', group: 'trainer' },
  { value: 'trainer.restored', labelKey: 'activity.actions.trainer.restored', group: 'trainer' },
];

export const ACTION_FILTER_GROUPS = [
  { id: 'member', labelKey: 'pages.activity.filters.groupMembers' },
  { id: 'payment', labelKey: 'pages.activity.filters.groupPayments' },
  { id: 'plan', labelKey: 'pages.activity.filters.groupPlans' },
  { id: 'staff', labelKey: 'pages.activity.filters.groupStaff' },
  { id: 'trainer', labelKey: 'pages.activity.filters.groupTrainers' },
];

export function formatAuditAction(action) {
  const key = ACTION_KEYS[action];
  return key ? i18n.t(key) : action;
}

export function formatAuditDetails(entry) {
  const d = entry.details || {};
  const parts = [];

  const paymentAmount = d.payment_amount ?? d.amount;
  const paymentMethod = d.payment_method ?? d.method;
  if (paymentAmount != null) {
    parts.push(`${formatMoney(paymentAmount)}${paymentMethod ? ` · ${translatePaymentMethod(paymentMethod)}` : ''}`);
  }
  if (d.skip_payment) parts.push(i18n.t('activity.details.noPaymentRecorded'));
  if (d.staff_role) parts.push(`${i18n.t('activity.details.role')} ${d.staff_role}`);
  if (d.is_active === false) parts.push(i18n.t('activity.details.accountDisabled'));
  if (d.is_active === true && entry.action === 'staff.updated') parts.push(i18n.t('activity.details.accountEnabled'));
  if (d.email && entry.entity_type === 'staff') parts.push(d.email);
  if (d.from_branch_name && d.to_branch_name) {
    parts.push(`${d.from_branch_name} → ${d.to_branch_name}`);
  }
  if (d.previous_plan_name && d.plan_name) {
    parts.push(
      `${formatPlanDisplayName(d.previous_plan_name)} → ${formatPlanDisplayName(d.plan_name)}`
    );
  }
  if (d.duration != null && d.price != null) {
    parts.push(`${d.duration} mo · ${formatMoney(d.price)}`);
  }

  return parts.join(' · ') || null;
}

export function formatActorRole(role) {
  if (role === 'Gym Owner') return i18n.t('activity.role.owner');
  if (role === 'Gym Staff') return i18n.t('activity.role.staff');
  return role || i18n.t('activity.role.user');
}
