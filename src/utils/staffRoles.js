/** Staff job roles — must match backend utils/roles.js STAFF_ROLES. */
export const STAFF_ROLES = Object.freeze(['Help Desk']);

export const DEFAULT_STAFF_ROLE = 'Help Desk';

export const STAFF_ROLE_OPTIONS = [
  {
    id: 'Help Desk',
    label: 'Help Desk',
    description: 'Handle members, renewals, and payments at the front desk.',
  },
];

/** @param {string | undefined} role */
export function isStaffRole(role) {
  return STAFF_ROLES.includes(role) || role === 'Gym Staff';
}
