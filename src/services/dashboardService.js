// src/services/dashboardService.js
import { toQueryString } from '../utils/apiMappers';

/** Fetch gym owner dashboard metrics from the backend. */
export const getDashboardMetrics = (apiFetch, params = {}) =>
  apiFetch(`/dashboard${toQueryString(params)}`);

export const getBranchComparison = (apiFetch) => apiFetch('/dashboard/branch-comparison');
