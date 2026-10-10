/**
 * @file supportService.js
 * @description Public platform support contact for gym owners.
 */

import { API_BASE_URL, API_FETCH_CREDENTIALS } from '../config/api';
import { parseApiResponse } from '../utils/api';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

/** @typedef {{ phone: string|null, phone_display: string|null, telegram: string|null, telegram_url: string|null, configured: boolean }} SupportContact */

/** @type {Promise<SupportContact>|null} */
let cached = null;

/** @returns {Promise<SupportContact>} */
export function fetchSupportContact() {
  if (!cached) {
    cached = (async () => {
      try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/api/public/support`, {
          credentials: API_FETCH_CREDENTIALS,
        });
        const data = await parseApiResponse(res);
        if (!res.ok) {
          return { phone: null, phone_display: null, telegram: null, telegram_url: null, configured: false };
        }
        return {
          phone: data.phone || null,
          phone_display: data.phone_display || data.phone || null,
          telegram: data.telegram || null,
          telegram_url: data.telegram_url || null,
          configured: Boolean(data.configured),
        };
      } catch {
        return { phone: null, phone_display: null, telegram: null, telegram_url: null, configured: false };
      }
    })();
  }
  return cached;
}
