/**
 * @file gymProfileService.js
 * @description Gym owner profile API (gym name, phone, owner name, Telegram).
 */

export const getGymProfile = (apiFetch) => apiFetch('/gym/profile');

export const updateGymProfile = (apiFetch, payload) =>
  apiFetch('/gym/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const createGymTelegramLink = (apiFetch) =>
  apiFetch('/gym/profile/telegram/link-token', { method: 'POST' });

export const unlinkGymTelegram = (apiFetch) =>
  apiFetch('/gym/profile/telegram', { method: 'DELETE' });
