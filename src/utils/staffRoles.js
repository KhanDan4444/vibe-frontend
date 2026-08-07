/** Staff job roles — must match backend utils/roles.js STAFF_ROLES. */
export const STAFF_ROLES = Object.freeze(['Front Desk']);

export const DEFAULT_STAFF_ROLE = 'Front Desk';

/** Legacy role strings still treated as gym staff. */
export const LEGACY_STAFF_ROLES = Object.freeze(['Help Desk', 'Gym Staff']);

export const STAFF_ROLE_OPTIONS = [
  {
    id: 'Front Desk',
    labelKey: 'roles.frontDesk',
    descriptionKey: 'modals.staff.roleFrontDeskHint',
  },
];

/** @param {string | undefined} role */
export function isStaffRole(role) {
  return STAFF_ROLES.includes(role) || LEGACY_STAFF_ROLES.includes(role);
}

/** Map legacy staff roles to the current canonical name. */
export function normalizeStaffRole(role) {
  if (!role || LEGACY_STAFF_ROLES.includes(role)) return DEFAULT_STAFF_ROLE;
  if (STAFF_ROLES.includes(role)) return role;
  return DEFAULT_STAFF_ROLE;
}
