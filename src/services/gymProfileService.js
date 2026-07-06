/**
 * @file gymProfileService.js
 * @description Gym owner profile API (gym name, phone, owner name).
 */

export const getGymProfile = (apiFetch) => apiFetch('/gym/profile');

export const updateGymProfile = (apiFetch, payload) =>
  apiFetch('/gym/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
