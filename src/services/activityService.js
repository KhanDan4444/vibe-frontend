/** Gym activity audit log (owner-only). */

export function getActivityLogs(apiFetch, params = {}) {
  const search = new URLSearchParams();
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  if (params.actor && params.actor !== 'all') search.set('actor', params.actor);
  const qs = search.toString();
  return apiFetch(`/gym/activity${qs ? `?${qs}` : ''}`);
}
