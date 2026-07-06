// src/services/memberService.js
import { toQueryString } from '../utils/apiMappers';

/**
 * Fetch paginated members for the authenticated gym.
 * @param {Record<string, string|number>} [params] page, limit, search, status, filter, sort
 */
export const getMembers = (apiFetch, params = {}) =>
  apiFetch(`/members${toQueryString(params)}`);

export const getMember = (apiFetch, id) => apiFetch(`/members/${id}`);

export const getMemberPayments = (apiFetch, id) => apiFetch(`/members/${id}/payments`);

export const enrollMember = (apiFetch, payload) =>
  apiFetch('/members/enroll', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const createMember = (apiFetch, payload) =>
  apiFetch('/members', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateMember = (apiFetch, id, payload) =>
  apiFetch(`/members/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const deleteMember = (apiFetch, id) =>
  apiFetch(`/members/${id}`, { method: 'DELETE' });

export const renewMember = (apiFetch, id, payload) =>
  apiFetch(`/members/${id}/renew`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const changeMemberPlan = (apiFetch, id, payload) =>
  apiFetch(`/members/${id}/change-plan`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const transferMember = (apiFetch, id, payload) =>
  apiFetch(`/members/${id}/transfer`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
