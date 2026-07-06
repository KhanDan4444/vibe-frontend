/** Human-readable labels for audit log actions. */
import i18n from '../i18n/index.js';
import { translatePaymentMethod } from '../i18n/helpers.js';

const ACTION_KEYS = {
  'member.created': 'activity.actions.member.created',
  'member.enrolled': 'activity.actions.member.enrolled',
  'member.renewed': 'activity.actions.member.renewed',
  'member.plan_changed': 'activity.actions.member.plan_changed',
  'member.updated': 'activity.actions.member.updated',
  'member.transferred': 'activity.actions.member.transferred',
  'member.deleted': 'activity.actions.member.deleted',
  'payment.recorded': 'activity.actions.payment.recorded',
  'payment.updated': 'activity.actions.payment.updated',
  'payment.deleted': 'activity.actions.payment.deleted',
  'plan.created': 'activity.actions.plan.created',
  'plan.updated': 'activity.actions.plan.updated',
  'plan.deleted': 'activity.actions.plan.deleted',
  'staff.created': 'activity.actions.staff.created',
  'staff.updated': 'activity.actions.staff.updated',
};

export function formatAuditAction(action) {
  const key = ACTION_KEYS[action];
  return key ? i18n.t(key) : action;
}

export function formatAuditDetails(entry) {
  const d = entry.details || {};
  const parts = [];

  if (d.payment_amount != null) {
    parts.push(`$${Number(d.payment_amount).toFixed(2)}${d.payment_method ? ` · ${translatePaymentMethod(d.payment_method)}` : ''}`);
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
    parts.push(`${d.previous_plan_name} → ${d.plan_name}`);
  }
  if (d.duration != null && d.price != null) {
    parts.push(`${d.duration} mo · $${Number(d.price).toFixed(2)}`);
  }

  return parts.join(' · ') || null;
}

export function formatActorRole(role) {
  if (role === 'Gym Owner') return i18n.t('activity.role.owner');
  if (role === 'Gym Staff') return i18n.t('activity.role.staff');
  return role || i18n.t('activity.role.user');
}
