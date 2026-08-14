import { DISPLAY_STATUS } from './memberStatus';
import { parseLocalDate, formatDisplayDate } from './date';
import i18n from '../i18n/index.js';
import { exportColumn, translatePaymentMethod } from '../i18n/helpers';

/** @typedef {'today' | 'this_week' | 'this_month' | 'last_month' | 'last_30_days' | 'this_year' | 'custom'} PeriodPreset */

export const PERIOD_PRESETS = [
  { id: 'today', labelKey: 'period.today' },
  { id: 'this_week', labelKey: 'period.thisWeek' },
  { id: 'this_month', labelKey: 'period.thisMonth' },
  { id: 'last_month', labelKey: 'period.lastMonth' },
  { id: 'last_30_days', labelKey: 'period.last30Days' },
  { id: 'this_year', labelKey: 'period.thisYear' },
  { id: 'custom', labelKey: 'period.customRange' },
];

function startOfDay(d) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Monday-start week containing `day` (local). */
function startOfWeekMonday(day) {
  const start = new Date(day);
  const weekday = start.getDay(); // 0 Sun … 6 Sat
  const offset = weekday === 0 ? -6 : 1 - weekday;
  start.setDate(start.getDate() + offset);
  return startOfDay(start);
}

function parsePaymentDate(dateStr) {
  return parseLocalDate(dateStr);
}

/**
 * Resolve preset or custom range to inclusive [start, end] dates.
 * @returns {{ start: Date | null, end: Date | null }}
 */
export function resolvePeriodRange(preset, customStart, customEnd) {
  const now = new Date();
  const today = startOfDay(now);

  if (preset === 'custom') {
    const start = customStart ? parseLocalDate(customStart) : null;
    const end = customEnd ? parseLocalDate(customEnd) : null;
    return { start, end };
  }

  if (preset === 'today') {
    return { start: today, end: today };
  }

  if (preset === 'this_week') {
    return { start: startOfWeekMonday(today), end: today };
  }

  if (preset === 'this_month') {
    return {
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end: today,
    };
  }

  if (preset === 'last_month') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { start, end };
  }

  if (preset === 'last_30_days') {
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    return { start, end: today };
  }

  if (preset === 'this_year') {
    return {
      start: new Date(today.getFullYear(), 0, 1),
      end: today,
    };
  }

  return { start: null, end: null };
}

/** @param {Array<{ date: string, amount: number }>} payments */
export function filterPaymentsByPeriod(payments, preset, customStart, customEnd) {
  const { start, end } = resolvePeriodRange(preset, customStart, customEnd);
  if (!start && !end) return payments;

  return payments.filter((p) => {
    const d = parsePaymentDate(p.date);
    if (!d) return false;
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });
}

/** @param {Array<{ amount: number, method: string }>} payments */
export function summarizePayments(payments) {
  const total = payments.reduce((sum, p) => sum + p.amount, 0);
  const count = payments.length;
  const average = count > 0 ? total / count : 0;

  const byMethod = payments.reduce((acc, p) => {
    const key = p.method || 'Unknown';
    acc[key] = (acc[key] || 0) + p.amount;
    return acc;
  }, {});

  return { total, count, average, byMethod };
}

/**
 * Compare current period total to the immediately preceding period of equal length.
 * @param {Array<{ date: string, amount: number }>} allPayments
 */
export function periodTrendPercent(allPayments, preset, customStart, customEnd) {
  const current = filterPaymentsByPeriod(allPayments, preset, customStart, customEnd);
  const currentTotal = current.reduce((s, p) => s + p.amount, 0);

  let previousTotal = 0;
  const now = new Date();
  const today = startOfDay(now);

  if (preset === 'this_month') {
    const lastStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    previousTotal = allPayments.reduce((s, p) => {
      const d = parsePaymentDate(p.date);
      if (!d || d < lastStart || d > lastEnd) return s;
      return s + p.amount;
    }, 0);
  } else if (preset === 'today') {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    previousTotal = allPayments.reduce((s, p) => {
      const d = parsePaymentDate(p.date);
      if (!d || d < yesterday || d > yesterday) return s;
      return s + p.amount;
    }, 0);
  } else if (preset === 'this_week') {
    const weekStart = startOfWeekMonday(today);
    const prevEnd = new Date(weekStart);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = startOfWeekMonday(prevEnd);
    previousTotal = allPayments.reduce((s, p) => {
      const d = parsePaymentDate(p.date);
      if (!d || d < prevStart || d > prevEnd) return s;
      return s + p.amount;
    }, 0);
  } else if (preset === 'last_month') {
    const prevStart = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    const prevEnd = new Date(today.getFullYear(), today.getMonth() - 1, 0);
    previousTotal = allPayments.reduce((s, p) => {
      const d = parsePaymentDate(p.date);
      if (!d || d < prevStart || d > prevEnd) return s;
      return s + p.amount;
    }, 0);
  } else if (preset === 'last_30_days') {
    const prevEnd = new Date(today);
    prevEnd.setDate(prevEnd.getDate() - 30);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - 29);
    previousTotal = allPayments.reduce((s, p) => {
      const d = parsePaymentDate(p.date);
      if (!d || d < prevStart || d > prevEnd) return s;
      return s + p.amount;
    }, 0);
  } else if (preset === 'this_year') {
    const prevStart = new Date(today.getFullYear() - 1, 0, 1);
    const prevEnd = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    previousTotal = allPayments.reduce((s, p) => {
      const d = parsePaymentDate(p.date);
      if (!d || d < prevStart || d > prevEnd) return s;
      return s + p.amount;
    }, 0);
  } else {
    return null;
  }

  if (previousTotal === 0) {
    return currentTotal > 0 ? '+100%' : '0%';
  }
  const change = ((currentTotal - previousTotal) / previousTotal) * 100;
  return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
}

/** Group payment amounts by date for charts (YYYY-MM-DD → total). */
export function revenueByDate(payments) {
  return payments.reduce((acc, p) => {
    const date = p.date || '';
    if (!date) return acc;
    acc[date] = (acc[date] || 0) + p.amount;
    return acc;
  }, {});
}

/** @param {Array<{ date: string, amount: number, method: string, memberId: number }>} payments */
export function paymentsToCsv(payments, members) {
  const header = ['member', 'paymentReceivedDate', 'amount', 'method'].map(exportColumn).join(',');
  const rows = payments.map((p) => {
    const member = members.find((m) => m.id === p.memberId);
    const name = member ? `"${member.name.replace(/"/g, '""')}"` : i18n.t('common.unknown');
    const method = translatePaymentMethod(p.method) || p.method || '';
    return `${name},${formatDisplayDate(p.date)},${p.amount.toFixed(2)},${method}`;
  });
  return [header, ...rows].join('\n');
}

/** Members with no payment recorded in the selected period. */
export function membersWithoutPaymentInPeriod(members, payments, preset, customStart, customEnd) {
  const periodPayments = filterPaymentsByPeriod(payments, preset, customStart, customEnd);
  const paidIds = new Set(periodPayments.map((p) => p.memberId));
  return members.filter((m) => !paidIds.has(m.id));
}

/**
 * True when the member already has a payment on or after their current term start.
 * Enroll/renew update start_date, so this prevents double-counting revenue for one term.
 */
export function memberHasPaymentForCurrentTerm(member, payments) {
  if (!member?.startDate) return false;
  const termStart = member.startDate;
  return payments.some((p) => p.memberId === member.id && p.date && p.date >= termStart);
}

/** Member enrolled without paying yet — current term, no payment recorded. */
export function memberNeedsCatchUpPayment(member, payments) {
  return member?.isUnpaid === true || (
    member?.startDate &&
    !memberHasPaymentForCurrentTerm(member, payments)
  );
}

export function countMembersNeedingCatchUpPayment(members, payments) {
  return members.filter((m) => memberNeedsCatchUpPayment(m, payments)).length;
}

/** Active, due soon, and expired counts for nav badges. */
export function countMembersNeedingRenewal(members) {
  return members.filter(
    (m) => m.status === 'Due Soon' || m.status === 'Expired'
  ).length;
}

export function downloadCsv(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
