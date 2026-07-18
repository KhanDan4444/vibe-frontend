/**
 * @file reportChartData.js
 * @description Aggregates report API rows into chart-ready series (admin + owner).
 */

import { formatDisplayDate } from './date';

/** Distinct slice colors for payment method donut charts. */
export const PAYMENT_METHOD_COLORS = {
  Card: '#0284c7', // blue
  'Bank Transfer': '#f59e0b', // amber
  Cash: '#0d9488', // teal
  Other: '#94a3b8', // slate
};

/** Paid vs unpaid slice colors (member / gym payment status donuts). */
export const PAYMENT_STATUS_COLORS = {
  Paid: '#0d9488',
  Unpaid: '#ea580c',
};

/** Distinct slice colors for membership / SaaS plan donuts (applied by slice order). */
export const MEMBERSHIP_PLAN_PALETTE = [
  '#0d9488', // teal
  '#f59e0b', // amber
  '#0284c7', // blue
  '#94a3b8', // slate
  '#e11d48', // rose
  '#65a30d', // lime
  '#7c3aed', // violet (last resort for 7+ plans)
];

/** Build a name → color map for plan donut charts. */
export function planChartColors(planData) {
  const colors = {};
  planData.forEach((entry, i) => {
    colors[entry.name] = MEMBERSHIP_PLAN_PALETTE[i % MEMBERSHIP_PLAN_PALETTE.length];
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
  return {
    total: members.length,
    // Active = valid term and paid (unpaid members are reported separately).
    active: members.filter((m) => (m.status || '').toLowerCase() === 'active' && !m.is_unpaid).length,
    unpaid: members.filter((m) => m.is_unpaid).length,
    dueSoon: members.filter((m) => (m.status || '').toLowerCase() === 'due soon').length,
    expired: members.filter((m) => (m.status || '').toLowerCase() === 'expired').length,
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
  };

  members.forEach((m) => {
    const status = (m.status || '').toLowerCase();
    if (status === 'expired') counts.Expired += 1;
    else if (status === 'due soon') counts['Due Soon'] += 1;
    else if (m.is_unpaid) counts.Unpaid += 1;
    else counts.Active += 1;
  });

  return ['Active', 'Unpaid', 'Due Soon', 'Expired']
    .map((name) => ({ name, value: counts[name] }))
    .filter((d) => d.value > 0);
}

export function aggregateMembersByPlan(members) {
  const counts = {};
  members.forEach((m) => {
    const name = m.plan_name || 'No plan';
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
    .sort((a, b) => b.value - a.value);
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
