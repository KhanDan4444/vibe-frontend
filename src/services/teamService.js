/** Gym team (staff) accounts — owner-managed logins. */

export function listTeam(apiFetch) {
  return apiFetch('/gym/team');
}

export function createStaff(apiFetch, payload) {
  return apiFetch('/gym/team', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateStaff(apiFetch, staffId, payload) {
  return apiFetch(`/gym/team/${staffId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function resetStaffPassword(apiFetch, staffId, payload) {
  return apiFetch(`/gym/team/${staffId}/reset-password`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
