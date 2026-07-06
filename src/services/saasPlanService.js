// src/services/saasPlanService.js
// Platform Admin — SaaS plan (license tier) CRUD network calls.
// All functions accept `apiFetch` (from AuthContext) as the first argument
// so they stay decoupled from the React context tree (Option A pattern).

/**
 * Fetch all SaaS plans available on the platform.
 * @param {Function} apiFetch - Authenticated fetch helper from AuthContext
 * @returns {Promise<Response>}
 */
export const getSaasPlans = (apiFetch) => apiFetch('/admin/saas-plans');

/**
 * Create a new SaaS plan (license tier).
 * @param {Function} apiFetch
 * @param {{ name: string, description?: string, duration: number, price: number }} payload
 * @returns {Promise<Response>}
 */
export const createSaasPlan = (apiFetch, payload) =>
  apiFetch('/admin/saas-plans', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

/**
 * Update an existing SaaS plan by ID.
 * @param {Function} apiFetch
 * @param {number} id
 * @param {{ name?: string, description?: string, duration?: number, price?: number }} payload
 * @returns {Promise<Response>}
 */
export const updateSaasPlan = (apiFetch, id, payload) =>
  apiFetch(`/admin/saas-plans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

/**
 * Delete a SaaS plan by ID. Fails if gyms are subscribed to it.
 * @param {Function} apiFetch
 * @param {number} id
 * @returns {Promise<Response>}
 */
export const deleteSaasPlan = (apiFetch, id) =>
  apiFetch(`/admin/saas-plans/${id}`, { method: 'DELETE' });
