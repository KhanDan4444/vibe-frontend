// src/config/api.js
/**
 * The base URL of the backend Express API server.
 * Can be overridden by configuring VITE_API_URL in a .env environment file.
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '' : 'http://localhost:5000');

/** Include session cookie on cross-origin API calls (web auth). */
export const API_FETCH_CREDENTIALS = 'include';
