/**
 * @file phone.js
 * @description Ethiopian phone validation/normalization (mirrors backend utils/phone.js).
 */

import { ok, fail } from './result';

/** @param {string|null|undefined} input */
export function normalizeEthiopianPhone(input) {
  if (input == null || input === '') return null;

  let digits = String(input).replace(/\D/g, '');
  if (digits.startsWith('251')) {
    // already country code
  } else if (digits.startsWith('0')) {
    digits = `251${digits.slice(1)}`;
  } else if (digits.length === 9) {
    digits = `251${digits}`;
  } else {
    return null;
  }

  if (digits.length !== 12) return null;
  return `+${digits}`;
}

export function isValidEthiopianPhone(input) {
  return normalizeEthiopianPhone(input) != null;
}

/** Show stored E.164 as local 09… for form inputs. */
export function formatPhoneForInput(phone) {
  if (!phone) return '';
  const normalized = normalizeEthiopianPhone(phone);
  if (!normalized) return String(phone);
  return `0${normalized.slice(4)}`;
}

/** Mask local Ethiopian mobile for OTP confirmation copy — e.g. 0912 ••• 678 */
export function maskPhoneForDisplay(input) {
  const local = formatPhoneForInput(normalizeEthiopianPhone(input) || input);
  if (!local || local.length < 7) return local || '•••';
  if (local.length >= 10) return `${local.slice(0, 4)} ••• ${local.slice(-3)}`;
  return `${local.slice(0, 3)} ••• ${local.slice(-2)}`;
}

/** @param {string|null|undefined} input */
export function validateRequiredEthiopianPhone(input) {
  const trimmed = String(input ?? '').trim();
  if (!trimmed) return fail('validation.phoneRequired', 'phone');
  if (!isValidEthiopianPhone(trimmed)) return fail('validation.phoneInvalid', 'phone');
  return ok();
}

/** @param {string|null|undefined} input */
export function validateOptionalEthiopianPhone(input) {
  const trimmed = String(input ?? '').trim();
  if (!trimmed) return ok();
  if (!isValidEthiopianPhone(trimmed)) return fail('validation.phoneInvalid', 'phone');
  return ok();
}
