/** Canonical user roles (must match backend schema seed values). */
export const ROLES = {
  PLATFORM_ADMIN: 'Platform Admin',
  GYM_OWNER: 'Gym Owner',
};

export { STAFF_ROLES, DEFAULT_STAFF_ROLE, isStaffRole } from './staffRoles';

import { isStaffRole } from './staffRoles';

/** @param {string | undefined} role */
export function isPlatformAdmin(role) {
  return role === ROLES.PLATFORM_ADMIN || role === 'Admin';
}

/** @param {string | undefined} role */
export function isGymOwner(role) {
  return role === ROLES.GYM_OWNER || role === 'owner';
}

/** @param {string | undefined} role */
export function isGymStaff(role) {
  return isStaffRole(role);
}

/** Gym owner or staff — can use the gym portal. */
export function hasGymPortalAccess(role) {
  return isGymOwner(role) || isGymStaff(role);
}
