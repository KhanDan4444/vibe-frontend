/**
 * @file reportChartData.js
 * @description Aggregates report API rows into chart-ready series (admin + owner).
 */

import { formatDisplayDate } from './date';
import { formatPlanDisplayName } from './formatPlanDisplayName';
import { comparePaymentMethodOrder } from '../i18n/helpers';

/** Distinct slice colors for payment method donut charts. */
export const PAYMENT_METHOD_COLORS = {
  Cash: '#14b8a6', // teal
  'Bank Transfer': '#f59e0b', // amber
  'Tele Birr': '#38bdf8', // sky
  Card: '#8b5cf6', // violet
  Other: '#94a3b8', // slate
};

/** Paid vs unpaid slice colors (member / gym payment status donuts). */
export const PAYMENT_STATUS_COLORS = {
  Paid: '#0d9488',
  Unpaid: '#ea580c',
};

/** Distinct slice colors for membership / SaaS plan donuts (applied by slice order). */
export const MEMBERSHIP_PLAN_PALETTE = [
  '#14b8a6', // teal
  '#f59e0b', // amber
  '#38bdf8', // sky
  '#94a3b8', // slate
  '#fb7185', // rose
  '#84cc16', // lime
  '#a78bfa', // violet (last resort for 7+ plans)
];

/** SaaS-plan palette kept visually distinct from semantic status colors. */
export const SAAS_PLAN_PALETTE = [
  '#2563eb', // blue-600
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#d946ef', // fuchsia-500
  '#64748b', // slate-500
  '#4f46e5', // indigo-600
  '#0891b2', // cyan-600
];

/** Build a name → color map for plan donut charts. */
export function planChartColors(planData, palette = MEMBERSHIP_PLAN_PALETTE) {
  const colors = {};
  planData.forEach((entry, i) => {
    colors[entry.name] = palette[i % palette.length];
  });
  return colors;
}

/** Aggregate gym rows by subscription status. */
export function aggregateGymsByStatus(gyms) {
  const counts = {};
  gyms.forEach((g) => {
    const key = (g.subscription_status || 'unknown').toString().toLowerCase();
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    counts[label] = (counts[label] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

function isGymDueSoon(gym) {
  if ((gym.subscription_status || '').toLowerCase() !== 'active') return false;
  if (!gym.saas_end_date) return false;
  const endDate = new Date(gym.saas_end_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 7;
}

/**
 * Exclusive gym buckets for a single overview donut.
 * Priority: Expired → Suspended → Due Soon → Unpaid → Active.
 */
export function aggregateGymsOverview(gyms) {
  const counts = {
    Active: 0,
    Unpaid: 0,
    'Due Soon': 0,
    Expired: 0,
    Suspended: 0,
  };

  gyms.forEach((g) => {
    const status = (g.subscription_status || '').toLowerCase();
    if (status === 'expired') counts.Expired += 1;
    else if (status === 'suspended') counts.Suspended += 1;
    else if (isGymDueSoon(g)) counts['Due Soon'] += 1;
    else if (g.is_unpaid) counts.Unpaid += 1;
    else counts.Active += 1;
  });

  return ['Active', 'Unpaid', 'Due Soon', 'Expired', 'Suspended']
    .map((name) => ({ name, value: counts[name] }))
    .filter((d) => d.value > 0);
}

export function aggregateGymsByPlan(gyms) {
  const counts = {};
  gyms.forEach((g) => {
    const name = g.saas_plan_name || 'No plan';
    counts[name] = (counts[name] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function aggregateGymsPaymentStatus(gyms) {
  let paid = 0;
  let unpaid = 0;
  gyms.forEach((g) => {
    if (g.is_unpaid) unpaid += 1;
    else paid += 1;
  });
  return [
    { name: 'Paid', value: paid },
    { name: 'Unpaid', value: unpaid },
  ].filter((d) => d.value > 0);
}

const MEMBER_STATUS_LABELS = {
  active: 'Active',
  expired: 'Expired',
  'due soon': 'Due Soon',
};

function memberStatusLabel(status) {
  const key = (status || '').toString().toLowerCase();
  return MEMBER_STATUS_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1) || 'Unknown';
}

export function memberReportStats(members) {
  const live = members.filter((m) => !m.deleted_at);
  return {
    total: members.length,
    active: live.filter((m) => (m.status || '').toLowerCase() === 'active' && !m.is_unpaid).length,
    unpaid: live.filter((m) => m.is_unpaid).length,
    dueSoon: live.filter((m) => (m.status || '').toLowerCase() === 'due soon').length,
    expired: live.filter((m) => (m.status || '').toLowerCase() === 'expired').length,
    former: members.filter((m) => m.deleted_at).length,
  };
}

export function aggregateMembersByStatus(members) {
  const counts = {};
  members.forEach((m) => {
    const label = memberStatusLabel(m.status);
    counts[label] = (counts[label] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

/**
 * Exclusive member buckets for a single overview donut.
 * Priority: Expired → Due Soon → Unpaid → Active (each member counted once).
 */
export function aggregateMembersOverview(members) {
  const counts = {
    Active: 0,
    Unpaid: 0,
    'Due Soon': 0,
    Expired: 0,
    Former: 0,
  };

  members.forEach((m) => {
    if (m.deleted_at) {
      counts.Former += 1;
      return;
    }
    const status = (m.status || '').toLowerCase();
    if (status === 'expired') counts.Expired += 1;
    else if (status === 'due soon') counts['Due Soon'] += 1;
    else if (m.is_unpaid) counts.Unpaid += 1;
    else counts.Active += 1;
  });

  return ['Active', 'Unpaid', 'Due Soon', 'Expired', 'Former']
    .map((name) => ({ name, value: counts[name] }))
    .filter((d) => d.value > 0);
}

export function aggregateMembersByPlan(members) {
  const counts = {};
  members.forEach((m) => {
    const name = formatPlanDisplayName(m.plan_name) || 'No plan';
    counts[name] = (counts[name] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function aggregateMembersPaymentStatus(members) {
  let paid = 0;
  let unpaid = 0;
  members.forEach((m) => {
    if (m.is_unpaid) unpaid += 1;
    else paid += 1;
  });
  return [
    { name: 'Paid', value: paid },
    { name: 'Unpaid', value: unpaid },
  ].filter((d) => d.value > 0);
}

export function aggregateRevenueByMethod(summary) {
  const byMethod = summary?.byMethod || {};
  return Object.entries(byMethod)
    .map(([name, value]) => ({ name, value: Number(value) }))
    .filter((d) => d.value > 0)
    .sort((a, b) => comparePaymentMethodOrder(a.name, b.name));
}

export function aggregateRevenueByGym(payments, limit = 6) {
  const totals = {};
  payments.forEach((p) => {
    const name = p.gym_name || 'Unknown';
    totals[name] = (totals[name] || 0) + Number(p.amount);
  });
  return Object.entries(totals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function aggregateRevenueByMember(payments, limit = 6) {
  const totals = {};
  payments.forEach((p) => {
    const name = p.member_name || 'Unknown';
    totals[name] = (totals[name] || 0) + Number(p.amount);
  });
  return Object.entries(totals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function aggregateRevenueByDate(payments) {
  const totals = {};
  payments.forEach((p) => {
    const date = p.date ? String(p.date).split('T')[0] : '';
    if (!date) return;
    totals[date] = (totals[date] || 0) + Number(p.amount);
  });
  return Object.entries(totals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({
      date: formatDisplayDate(date),
      amount,
    }));
}

export function gymReportStats(gyms) {
  return {
    total: gyms.length,
    active: gyms.filter((g) => g.subscription_status?.toLowerCase() === 'active').length,
    unpaid: gyms.filter((g) => g.is_unpaid).length,
    members: gyms.reduce((s, g) => s + (g.active_member_count ?? 0), 0),
  };
}
