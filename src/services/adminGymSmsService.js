/** Gym owner SMS delivery log (platform admin — SaaS license reminders). */

export function getAdminGymSmsLog(apiFetch, params = {}) {
  const search = new URLSearchParams();
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  if (params.type && params.type !== 'all') search.set('type', params.type);
  if (params.gym_id && params.gym_id !== 'all') {
    search.set('gym_id', String(params.gym_id));
  }
  const qs = search.toString();
  return apiFetch(`/admin/gym-sms${qs ? `?${qs}` : ''}`);
}
