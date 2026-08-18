import { formatFriendlyDate, formatRelativeDay } from './date';
import { formatMoney } from './formatMoney';
import { formatPlanDisplayName } from './formatPlanDisplayName';

export function notificationKind(notification) {
  if (notification.kind) return notification.kind;
  const prefix = String(notification.id || '').split('-')[0];
  if (prefix === 'unpaid') return 'unpaid';
  if (prefix === 'due') return 'due_soon';
  if (prefix === 'exp') return 'expired';
  if (prefix === 'pay') return 'payment_recorded';
  return null;
}

export function notificationSection(notification) {
  const kind = notificationKind(notification);
  if (kind === 'payment_recorded' || notification.type === 'info') return 'activity';
  if (kind === 'unpaid' || kind === 'due_soon' || kind === 'expired') return 'attention';
  if (notification.type === 'warning' || notification.type === 'danger') return 'attention';
  return 'activity';
}

export function groupNotifications(notifications) {
  const attention = [];
  const activity = [];
  for (const item of notifications) {
    if (notificationSection(item) === 'attention') attention.push(item);
    else activity.push(item);
  }
  return { attention, activity };
}

/** Collapse unpaid / due soon / expired into expandable stacks when 2+. */
export function stackNotificationGroups(items) {
  const order = [];
  const buckets = new Map();
  for (const item of items) {
    const kind = notificationKind(item);
    const stackable = kind === 'unpaid' || kind === 'due_soon' || kind === 'expired';
    const key = stackable ? kind : `one:${item.id}`;
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key).push(item);
  }
  return order.map((key) => {
    const groupItems = buckets.get(key);
    return { key, kind: notificationKind(groupItems[0]), items: groupItems };
  });
}

export function stackTitle(kind, count, t) {
  if (kind === 'unpaid') return t('notifications.stack.unpaid', { count });
  if (kind === 'due_soon') return t('notifications.stack.dueSoon', { count });
  if (kind === 'expired') return t('notifications.stack.expired', { count });
  return '';
}

export function stackPreview(items, t) {
  const names = items
    .map((item) => parseMemberName(item, notificationKind(item)))
    .filter(Boolean);
  if (names.length <= 2) return names.join(', ');
  return t('notifications.stack.namesMore', {
    names: names.slice(0, 2).join(', '),
    count: names.length - 2,
  });
}

function parseMemberName(notification, kind) {
  if (notification.memberName) return notification.memberName;
  const msg = notification.message || '';
  if (kind === 'payment_recorded') {
    const match = msg.match(/from (.+?)\.\s*$/) || msg.match(/for (.+?)\.\s*$/);
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

/** Drop leading `[Branch] ` from API/raw messages (legacy). */
export function stripBranchBracketPrefix(message) {
  return String(message || '').replace(/^\[[^\]]+\]\s*/, '');
}

function langFromT(t) {
  return t?.i18n?.language || 'en';
}

function inboxDate(t, raw) {
  if (!raw || raw === 'Action needed' || raw === 'System Alert') return '';
  return formatRelativeDay(raw, t, langFromT(t)) || formatFriendlyDate(raw, langFromT(t));
}

function planLabel(t, notification) {
  return formatPlanDisplayName(parsePlanName(notification)) || t('notifications.defaultPlan');
}

/**
 * Localize dashboard notification copy.
 * Title leads with the member; kind is an eyebrow; message does not repeat the name.
 */
export function localizeNotification(notification, t) {
  const kind = notificationKind(notification);
  const memberName = parseMemberName(notification, kind);
  const section = notificationSection(notification);
  const date = inboxDate(t, notification.date);

  if (kind === 'unpaid' && memberName) {
    return {
      kind,
      section,
      memberName,
      eyebrow: t('notifications.kind.unpaid'),
      title: memberName,
      message: t('notifications.items.unpaid.message'),
      date,
    };
  }

  if (kind === 'due_soon' && memberName) {
    const endDate = inboxDate(t, parseEndDate(notification));
    return {
      kind,
      section,
      memberName,
      eyebrow: t('notifications.kind.dueSoon'),
      title: memberName,
      message: t('notifications.items.dueSoon.message', {
        plan: planLabel(t, notification),
      }),
      date: endDate,
    };
  }

  if (kind === 'expired' && memberName) {
    const endDate = inboxDate(t, parseEndDate(notification));
    return {
      kind,
      section,
      memberName,
      eyebrow: t('notifications.kind.expired'),
      title: memberName,
      message: t('notifications.items.expired.message', {
        plan: planLabel(t, notification),
      }),
      date: endDate,
    };
  }

  if (kind === 'payment_recorded' && memberName) {
    const amount = parseAmount(notification);
    return {
      kind,
      section,
      memberName,
      eyebrow: t('notifications.kind.paymentRecorded'),
      title: memberName,
      message: t('notifications.items.paymentRecorded.message', {
        amount: formatMoney(amount, { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
      }),
      date,
    };
  }

  return {
    kind,
    section,
    memberName,
    eyebrow: '',
    title: notification.title,
    message: stripBranchBracketPrefix(notification.message),
    date,
  };
}
