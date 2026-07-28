import { ROLES } from './roles';
import { decodeToken } from './jwt';

/** Decode a JWT for UX-only checks — API re-validates every request. */
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
