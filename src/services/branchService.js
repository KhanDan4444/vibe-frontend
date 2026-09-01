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

export const getBranchStationPass = (apiFetch, branchId) =>
  apiFetch(`/gym/branches/${branchId}/station-pass`);

export const regenerateBranchStationPass = (apiFetch, branchId) =>
  apiFetch(`/gym/branches/${branchId}/station-pass/regenerate`, {
    method: 'POST',
  });
