import { ok, fail } from './result';

export const MAX_NAME_LENGTH = 200;

/** @param {string|null|undefined} value */
export function validateRequiredName(value, { field = 'name' } = {}) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return fail('validation.nameRequired', field);
  if (trimmed.length > MAX_NAME_LENGTH) return fail('validation.nameTooLong', field);
  return ok();
}
