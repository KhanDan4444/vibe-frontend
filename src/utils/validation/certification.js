import { ok, fail } from './result';

export const MAX_TRAINER_CERT_BYTES = 2 * 1024 * 1024;
export const ACCEPTED_TRAINER_CERT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

/** @param {File|null|undefined} file */
export function validateTrainerCertificationFile(file) {
  if (!file) return ok();
  if (!ACCEPTED_TRAINER_CERT_TYPES.includes(file.type)) {
    return fail('modals.trainer.certTypeError', 'certification');
  }
  if (file.size > MAX_TRAINER_CERT_BYTES) {
    return fail('modals.trainer.certSizeError', 'certification');
  }
  return ok();
}

/** @param {File} file @returns {Promise<string>} */
export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}
