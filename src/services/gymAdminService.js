// src/services/gymAdminService.js
// Platform Admin — Gym management network calls.
// All functions accept `apiFetch` (from AuthContext) as the first argument
// so they stay decoupled from the React context tree (Option A pattern).

// src/services/gymAdminService.js
import { toQueryString } from '../utils/apiMappers';

/** @param {Record<string, string|number>} [params] page, limit, search, status, filter, sort */
export const getGyms = (apiFetch, params = {}) =>
  apiFetch(`/admin/gyms${toQueryString(params)}`);

/**
 * Fetch full details for a single gym (members, plans, payments counts).
 * @param {Function} apiFetch
 * @param {number} gymId
 * @returns {Promise<Response>}
 */
export const getGymDetail = (apiFetch, gymId) =>
  apiFetch(`/admin/gyms/${gymId}`);

/**
 * Update a gym's metadata (name, owner, SaaS plan, subscription status, etc.).
 * @param {Function} apiFetch
 * @param {number} gymId
 * @param {object} payload
 * @returns {Promise<Response>}
 */
export const updateGym = (apiFetch, gymId, payload) =>
  apiFetch(`/admin/gyms/${gymId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

/**
 * Delete a gym and all its associated data (members, plans, payments).
 * @param {Function} apiFetch
 * @param {number} gymId
 * @returns {Promise<Response>}
 */
export const deleteGym = (apiFetch, gymId) =>
  apiFetch(`/admin/gyms/${gymId}`, { method: 'DELETE' });

/**
 * Register a new gym tenant on the platform (legacy — prefer enrollGym).
 */
export const registerGym = (apiFetch, payload) =>
  apiFetch('/auth/register-gym', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

/**
 * Register gym + owner + subscription + optional payment (atomic).
 */
export const enrollGym = (apiFetch, payload) =>
  apiFetch('/admin/gyms/enroll', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

/**
 * Renew gym SaaS license and record payment (atomic).
 */
export const renewGym = (apiFetch, gymId, payload) =>
  apiFetch(`/admin/gyms/${gymId}/renew`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const changeGymPlan = (apiFetch, gymId, payload) =>
  apiFetch(`/admin/gyms/${gymId}/change-plan`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

/**
 * Catch-up SaaS payment for a gym that registered without paying.
 */
export const collectGymPayment = (apiFetch, payload) =>
  apiFetch('/admin/payments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

/** @param {Record<string, string|number>} [params] page, limit, search, preset, from, to, gym_id, sort */
export const getSaasPayments = (apiFetch, params = {}) =>
  apiFetch(`/admin/payments${toQueryString(params)}`);

export const updateSaasPayment = (apiFetch, id, payload) =>
  apiFetch(`/admin/payments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const getAdminDashboard = (apiFetch) => apiFetch('/admin/dashboard');

/**
 * Platform admin sets a new password for the gym owner account.
 */
export const resetOwnerPassword = (apiFetch, gymId, payload) =>
  apiFetch(`/admin/gyms/${gymId}/reset-owner-password`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export { getGymReport, getRevenueReport } from './reportService';
