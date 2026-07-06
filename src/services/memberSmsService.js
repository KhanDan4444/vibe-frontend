/** Member SMS delivery log (gym owner). */

export function getMemberSmsLog(apiFetch, params = {}) {
  const search = new URLSearchParams();
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  if (params.type && params.type !== 'all') search.set('type', params.type);
  if (params.branch_id && params.branch_id !== 'all') {
    search.set('branch_id', String(params.branch_id));
  }
  const qs = search.toString();
  return apiFetch(`/gym/member-sms${qs ? `?${qs}` : ''}`);
}
