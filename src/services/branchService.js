// src/services/branchService.js
export const listBranches = (apiFetch) => apiFetch('/gym/branches');

export const createBranch = (apiFetch, payload) =>
  apiFetch('/gym/branches', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateBranch = (apiFetch, branchId, payload) =>
  apiFetch(`/gym/branches/${branchId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const reassignBranchStaff = (apiFetch, branchId, targetBranchId) =>
  apiFetch(`/gym/branches/${branchId}/reassign-staff`, {
    method: 'POST',
    body: JSON.stringify({ target_branch_id: targetBranchId }),
  });
