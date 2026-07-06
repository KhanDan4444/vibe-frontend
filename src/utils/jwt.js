// src/utils/jwt.js
/**
 * Decodes a JWT payload for display and UX-only expiry checks.
 * Does NOT verify the signature — the backend validates every API request.
 *
 * @param {string} token - The raw JWT token string.
 * @returns {object|null} The parsed JSON payload, or null if invalid.
 */
export function decodeToken(token) {
  try {
    if (!token || typeof token !== 'string' || token.split('.').length !== 3) {
      return null;
    }

    const base64Url = token.split('.')[1];
    if (!base64Url) {
      return null;
    }

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('JWT parsing exception:', e);
    return null;
  }
}
