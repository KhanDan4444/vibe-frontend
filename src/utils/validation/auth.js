import { ok, fail, firstFailure } from './result';
import { validatePasswordRequired } from './passwords';
import { isValidEthiopianPhone } from './phone';

export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 30;
const USERNAME_RE = /^[a-z0-9._]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** @param {string|null|undefined} value */
export function validateUsername(value) {
  const trimmed = String(value ?? '').trim().toLowerCase();
  if (!trimmed) return fail('validation.usernameRequired', 'username');
  if (trimmed.length < MIN_USERNAME_LENGTH) {
    return fail('validation.usernameTooShort', 'username');
  }
  if (trimmed.length > MAX_USERNAME_LENGTH) {
    return fail('validation.usernameTooLong', 'username');
  }
  if (!USERNAME_RE.test(trimmed)) {
    return fail('validation.usernameInvalid', 'username');
  }
  return ok();
}

/** @param {string|null|undefined} value */
export function validateOptionalEmail(value) {
  const trimmed = String(value ?? '').trim().toLowerCase();
  if (!trimmed) return ok();
  if (!EMAIL_RE.test(trimmed) || trimmed.length > 255) {
    return fail('validation.emailInvalid', 'email');
  }
  return ok();
}

/** Login: email or username (non-empty, max 255). */
/** @param {string|null|undefined} value */
export function validateLoginIdentifier(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return fail('validation.loginRequired', 'email');
  if (trimmed.length > 255) return fail('validation.loginTooLong', 'email');
  return ok();
}

/**
 * Gym-owner forgot-password identifier: username or Ethiopian mobile.
 * @param {string|null|undefined} value
 */
export function validateForgotIdentifier(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return fail('validation.forgotIdentifierRequired', 'email');
  if (isValidEthiopianPhone(trimmed)) return ok();
  return validateUsername(trimmed);
}

/** @param {string|null|undefined} value */
export function validateOtpCode(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return fail('validation.otpRequired', 'code');
  if (trimmed.length < 4 || trimmed.length > 8) return fail('validation.otpInvalid', 'code');
  return ok();
}

/**
 * @param {string|null|undefined} identifier
 * @param {string|null|undefined} password
 */
export function validateLogin(identifier, password) {
  return firstFailure(validateLoginIdentifier(identifier), validatePasswordRequired(password));
}
