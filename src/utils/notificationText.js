import { formatDate, formatMoney } from './reportExportCore';

function notificationKind(notification) {
  if (notification.kind) return notification.kind;
  const prefix = String(notification.id || '').split('-')[0];
  if (prefix === 'unpaid') return 'unpaid';
  if (prefix === 'due') return 'due_soon';
  if (prefix === 'exp') return 'expired';
  if (prefix === 'pay') return 'payment_recorded';
  return null;
}

function parseMemberName(notification, kind) {
  if (notification.memberName) return notification.memberName;
  const msg = notification.message || '';
  if (kind === 'payment_recorded') {
    const match = msg.match(/from (.+?)\.\s*$/);
    return match?.[1] || null;
  }
  const match = msg.match(/^(?:\[[^\]]+\]\s*)?(.+?)(?:'s| was)/);
  return match?.[1] || null;
}

function parsePlanName(notification) {
  if (notification.planName) return notification.planName;
  const msg = notification.message || '';
  const match = msg.match(/'s (.+?) (?:expires|expired)/);
  return match?.[1] || null;
}

function parseEndDate(notification) {
  if (notification.endDate) return notification.endDate;
  const msg = notification.message || '';
  const match = msg.match(/(?:on|expires in less than 3 days \(on )([^).]+)\)?/);
  return match?.[1]?.trim() || null;
}

function parseAmount(notification) {
  if (notification.amount != null && !Number.isNaN(Number(notification.amount))) {
    return Number(notification.amount);
  }
  const msg = notification.message || '';
  const match = msg.match(/\$([0-9]+(?:\.[0-9]{2})?)/) || msg.match(/([0-9]+(?:\.[0-9]{2})?)\s*ETB/i);
  return match ? Number(match[1]) : null;
}

function branchPrefix(t, branchName, showBranchLabel) {
  if (!showBranchLabel || !branchName) return '';
  return t('notifications.branchPrefix', { branch: branchName });
}

function localizedDate(t, notification) {
  const raw = notification.date;
  if (raw === 'Action needed') return t('notifications.dates.actionNeeded');
  if (raw === 'System Alert') return t('notifications.dates.systemAlert');
  return formatDate(raw);
}

/**
 * Localize dashboard notification title/message from structured API fields.
 * Falls back to raw title/message when kind is unknown.
 */
export function localizeNotification(notification, t, { showBranchLabel = false } = {}) {
  const kind = notificationKind(notification);
  const prefix = branchPrefix(t, notification.branchName, showBranchLabel);
  const memberName = parseMemberName(notification, kind);

  if (kind === 'unpaid' && memberName) {
    return {
      title: t('notifications.items.unpaid.title'),
      message: t('notifications.items.unpaid.message', {
        prefix,
        name: memberName,
      }),
      date: localizedDate(t, notification),
    };
  }

  if (kind === 'due_soon' && memberName) {
    const planName = parsePlanName(notification) || t('notifications.defaultPlan');
    const endDate = parseEndDate(notification);
    return {
      title: t('notifications.items.dueSoon.title'),
      message: t('notifications.items.dueSoon.message', {
        prefix,
        name: memberName,
        plan: planName,
        date: formatDate(endDate),
      }),
      date: localizedDate(t, notification),
    };
  }

  if (kind === 'expired' && memberName) {
    const planName = parsePlanName(notification) || t('notifications.defaultPlan');
    const endDate = parseEndDate(notification);
    return {
      title: t('notifications.items.expired.title'),
      message: t('notifications.items.expired.message', {
        prefix,
        name: memberName,
        plan: planName,
        date: formatDate(endDate),
      }),
      date: localizedDate(t, notification),
    };
  }

  if (kind === 'payment_recorded' && memberName) {
    const amount = parseAmount(notification);
    return {
      title: t('notifications.items.paymentRecorded.title'),
      message: t('notifications.items.paymentRecorded.message', {
        prefix,
        amount: formatMoney(amount),
        name: memberName,
      }),
      date: localizedDate(t, notification),
    };
  }

  return {
    title: notification.title,
    message: notification.message,
    date: localizedDate(t, notification),
  };
}
