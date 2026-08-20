import { toQueryString } from '../utils/apiMappers';

export function searchCheckInMembers(apiFetch, params = {}) {
  return apiFetch(`/check-ins/search${toQueryString(params)}`);
}

export function listCheckIns(apiFetch, params = {}) {
  return apiFetch(`/check-ins${toQueryString(params)}`);
}

export function createCheckIn(apiFetch, payload) {
  return apiFetch('/check-ins', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getMemberVisitSummary(apiFetch, memberId) {
  return apiFetch(`/check-ins/members/${memberId}/summary`);
}

export function getAttendanceSettings(apiFetch) {
  return apiFetch('/check-ins/settings');
}

export function updateAttendanceSettings(apiFetch, payload) {
  return apiFetch('/check-ins/settings', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
