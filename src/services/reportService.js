/**
 * @file reportService.js
 * @description Report API calls for admin and gym-owner exports (no pagination).
 */

import { toQueryString } from '../utils/apiMappers';

/** Full gym list for platform admin reports. */
export const getGymReport = (apiFetch, params = {}) =>
  apiFetch(`/admin/reports/gyms${toQueryString(params)}`);

/** SaaS payment lines + summary for platform admin reports. */
export const getRevenueReport = (apiFetch, params = {}) =>
  apiFetch(`/admin/reports/revenue${toQueryString(params)}`);

/** Full member list for gym owner reports. */
export const getMemberReport = (apiFetch, params = {}) =>
  apiFetch(`/reports/members${toQueryString(params)}`);

/** Payment lines + summary for gym owner reports. */
export const getOwnerRevenueReport = (apiFetch, params = {}) =>
  apiFetch(`/reports/revenue${toQueryString(params)}`);
