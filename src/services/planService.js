// src/services/planService.js
// Gym Owner — Membership Plan CRUD network calls.
// All functions accept `apiFetch` (from AuthContext) as the first argument
// so they stay decoupled from the React context tree (Option A pattern).

/**
 * Fetch all membership plans for the authenticated gym.
 * @param {Function} apiFetch - Authenticated fetch helper from AuthContext
 * @returns {Promise<Response>}
 */
export const getPlans = (apiFetch) => apiFetch('/plans');

/**
 * Create a new membership plan.
 * @param {Function} apiFetch
 * @param {{ name: string, duration: number, price: number }} payload
 * @returns {Promise<Response>}
 */
export const createPlan = (apiFetch, payload) =>
  apiFetch('/plans', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

/**
 * Update an existing membership plan by ID.
 * @param {Function} apiFetch
 * @param {number} id
 * @param {{ name: string, duration: number, price: number }} payload
 * @returns {Promise<Response>}
 */
export const updatePlan = (apiFetch, id, payload) =>
  apiFetch(`/plans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

/**
 * Delete a membership plan by ID.
 * @param {Function} apiFetch
 * @param {number} id
 * @returns {Promise<Response>}
 */
export const deletePlan = (apiFetch, id) =>
  apiFetch(`/plans/${id}`, { method: 'DELETE' });
