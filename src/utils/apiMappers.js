import { formatMemberStatusForDisplay } from './memberStatus';
import { toDateString } from './date';

/** Map a member row from the API into the frontend shape. */
export function mapMemberFromApi(m) {
  if (!m) return null;
  return {
    id: m.id,
    name: m.name,
    phone: m.phone,
    planId: m.plan_id,
    startDate: toDateString(m.start_date),
    endDate: toDateString(m.end_date),
    status: formatMemberStatusForDisplay(m.status),
    isUnpaid: Boolean(m.is_unpaid),
    planName: m.plan_name,
    branchId: m.branch_id,
    branchName: m.branch_name,
    photoUrl: m.photo_url || null,
    hasPhoto: Boolean(m.photo_url),
  };
}

export function mapPaymentFromApi(p) {
  if (!p) return null;
  return {
    id: p.id,
    memberId: p.member_id,
    memberName: p.member_name,
    amount: parseFloat(p.amount),
    date: toDateString(p.date),
    method: p.method,
    source: p.source || 'collect',
    branchName: p.branch_name,
  };
}

export function mapGymFromApi(g) {
  if (!g) return null;
  return {
    ...g,
    isUnpaid: Boolean(g.is_unpaid),
    saasStartDate: toDateString(g.saas_start_date),
    saasEndDate: toDateString(g.saas_end_date),
    activeMemberCount: g.active_member_count ?? g.activeMemberCount ?? 0,
  };
}

/**
 * Instant drawer seed from the gyms list row (full detail loads in the background).
 * Shape matches enough of getGymDetail for header / license / primary actions.
 */
export function gymDetailPreviewFromList(gym) {
  if (!gym) return null;
  const start = gym.saasStartDate || toDateString(gym.saas_start_date) || null;
  const end = gym.saasEndDate || toDateString(gym.saas_end_date) || null;
  return {
    id: gym.id,
    name: gym.name,
    owner_name: gym.owner_name,
    phone: gym.phone || gym.owner_phone || null,
    owner_email: gym.owner_email || gym.email || null,
    owner_username: gym.owner_username || null,
    owner_user_id: gym.owner_user_id || null,
    subscription_status: gym.subscription_status,
    is_unpaid: Boolean(gym.isUnpaid ?? gym.is_unpaid),
    created_at: gym.created_at || null,
    plan_count: gym.plan_count ?? null,
    branch_count: gym.branch_count ?? null,
    stats: {
      active_members: gym.activeMemberCount ?? gym.active_member_count ?? 0,
      total_members: gym.total_member_count ?? gym.total_members ?? null,
      due_soon_members: gym.due_soon_members ?? null,
      expired_members: gym.expired_members ?? null,
    },
    saas_subscription: {
      saas_plan_id: gym.saas_plan_id ?? null,
      saas_plan_catalog_name: gym.saas_plan_name || null,
      plan: gym.saas_plan_name || null,
      start_date: start,
      end_date: end,
    },
    saas_payments: Array.isArray(gym.saas_payments) ? gym.saas_payments : [],
    _preview: true,
  };
}

/** @param {Record<string, string|number|undefined|null>} params */
export function toQueryString(params) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      qs.set(key, String(value));
    }
  });
  const str = qs.toString();
  return str ? `?${str}` : '';
}
