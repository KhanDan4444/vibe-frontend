import { toQueryString } from '../utils/apiMappers';

export function listTrainers(apiFetch, params = {}) {
  return apiFetch(`/gym/trainers${toQueryString(params)}`);
}

export function createTrainer(apiFetch, payload) {
  return apiFetch('/gym/trainers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateTrainer(apiFetch, trainerId, payload) {
  return apiFetch(`/gym/trainers/${trainerId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function archiveTrainer(apiFetch, trainerId) {
  return apiFetch(`/gym/trainers/${trainerId}`, { method: 'DELETE' });
}

export function restoreTrainer(apiFetch, trainerId) {
  return apiFetch(`/gym/trainers/${trainerId}/restore`, { method: 'POST' });
}
