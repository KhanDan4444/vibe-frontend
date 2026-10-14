// src/services/dashboardService.js
import { toQueryString } from '../utils/apiMappers';

/** Fetch gym owner dashboard metrics from the backend. */
export const getDashboardMetrics = (apiFetch, params = {}) =>
  apiFetch(`/dashboard${toQueryString(params)}`);

export const getBranchComparison = (apiFetch) => apiFetch('/dashboard/branch-comparison');

export const getNotificationInbox = (apiFetch) => apiFetch('/dashboard/notifications/inbox');

export const markNotificationsRead = (apiFetch, ids) =>
  apiFetch('/dashboard/notifications/read', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });

export const dismissNotifications = (apiFetch, ids) =>
  apiFetch('/dashboard/notifications/dismiss', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
