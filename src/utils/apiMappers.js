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
