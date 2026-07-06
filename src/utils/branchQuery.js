// src/utils/branchQuery.js
/** @param {'all'|number|null|undefined} branchId */
export function branchQueryParams(branchId) {
  if (branchId != null && branchId !== 'all') {
    return { branch_id: branchId };
  }
  return {};
}

export function branchStorageKey(gymId) {
  return `gym-${gymId}-branch`;
}
