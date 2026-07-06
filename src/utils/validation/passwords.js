import { ok, fail } from './result';

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

/** @param {string|null|undefined} value */
export function validatePasswordRequired(value) {
  if (!value) return fail('validation.passwordRequired', 'password');
  if (value.length > MAX_PASSWORD_LENGTH) return fail('validation.passwordTooLong', 'password');
  return ok();
}

/** @param {string|null|undefined} value */
export function validatePassword(value) {
  if (!value) return fail('validation.passwordRequired', 'password');
  if (value.length < MIN_PASSWORD_LENGTH) return fail('auth.passwordMinLength', 'password');
  if (value.length > MAX_PASSWORD_LENGTH) return fail('validation.passwordTooLong', 'password');
  return ok();
}

/**
 * @param {string} password
 * @param {string} confirm
 * @param {{ mismatchKey?: string }} [options]
 */
export function validatePasswordMatch(password, confirm, { mismatchKey = 'auth.passwordsNoMatch' } = {}) {
  if (password !== confirm) return fail(mismatchKey, 'confirmPassword');
  return ok();
}

/**
 * @param {string} currentPassword
 * @param {string} newPassword
 * @param {string} confirmPassword
 */
export function validatePasswordChange(currentPassword, newPassword, confirmPassword) {
  if (!currentPassword) return fail('validation.passwordRequired', 'currentPassword');
  const next = validatePassword(newPassword);
  if (!next.ok) return next;
  const match = validatePasswordMatch(newPassword, confirmPassword, {
    mismatchKey: 'account.passwordMismatch',
  });
  if (!match.ok) return match;
  if (currentPassword === newPassword) {
    return fail('account.passwordDifferent', 'newPassword');
  }
  return ok();
}
