/**
 * @file reportChartData.js
 * @description Aggregates report API rows into chart-ready series (admin + owner).
 */

import { formatDisplayDate } from './date';

/** Distinct slice colors for payment method donut charts. */
export const PAYMENT_METHOD_COLORS = {
  Card: '#4f46e5',
  'Bank Transfer': '#0891b2',
  Cash: '#059669',
  Other: '#d97706',
};

/** Paid vs unpaid slice colors (member / gym payment status donuts). */
export const PAYMENT_STATUS_COLORS = {
  Paid: '#0d9488',
  Unpaid: '#e11d48',
};

/** Distinct slice colors for membership / SaaS plan donuts (applied by slice order). */
export const MEMBERSHIP_PLAN_PALETTE = [
  '#2563eb', // blue
  '#f97316', // orange
  '#8b5cf6', // violet
  '#059669', // emerald
  '#db2777', // rose
  '#ca8a04', // amber
  '#64748b', // slate
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
    active: members.filter((m) => (m.status || '').toLowerCase() === 'active').length,
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
