/** Gym activity audit log (owner-only). */

export function getActivityLogs(apiFetch, params = {}) {
  const search = new URLSearchParams();
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  if (params.actor && params.actor !== 'all') search.set('actor', params.actor);
  if (params.action && params.action !== 'all') search.set('action', params.action);
  if (params.search && String(params.search).trim()) {
    search.set('search', String(params.search).trim());
  }
  if (params.branch_id && params.branch_id !== 'all') {
    search.set('branch_id', String(params.branch_id));
  }
  const qs = search.toString();
  return apiFetch(`/gym/activity${qs ? `?${qs}` : ''}`);
}
