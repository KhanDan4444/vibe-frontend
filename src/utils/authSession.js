import { ROLES } from './roles';
import { decodeToken } from './jwt';
import { getStoredToken } from './authStorage';

/** Restore the user from a stored JWT (sync, UX-only — API re-validates every request). */
export function resolveUserFromToken(token) {
  if (!token) return null;

  if (import.meta.env.DEV && token === 'mock-owner-token') {
    return { role: ROLES.GYM_OWNER, email: 'owner@gym.com', name: 'Iron Grip Gym' };
  }
  if (import.meta.env.DEV && token === 'mock-admin-token') {
    return { role: ROLES.PLATFORM_ADMIN, email: 'admin@saas.com', name: 'Platform Admin' };
  }

  const decoded = decodeToken(token);
  if (decoded && decoded.exp * 1000 > Date.now()) return decoded;
  return null;
}

export function userFromStoredToken() {
  const token = getStoredToken();
  if (!token) return null;
  return resolveUserFromToken(token);
}
