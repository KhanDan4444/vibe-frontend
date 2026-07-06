// src/services/paymentService.js
import { toQueryString } from '../utils/apiMappers';

/**
 * Fetch paginated payments for the authenticated gym.
 * @param {Record<string, string|number>} [params] page, limit, search, method, preset, from, to, sort
 */
export const getPayments = (apiFetch, params = {}) =>
  apiFetch(`/payments${toQueryString(params)}`);

export const createPayment = (apiFetch, payload) =>
  apiFetch('/payments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updatePayment = (apiFetch, id, payload) =>
  apiFetch(`/payments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const deletePayment = (apiFetch, id) =>
  apiFetch(`/payments/${id}`, { method: 'DELETE' });
