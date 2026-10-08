import { ok, fail, firstFailure } from './result';
import { validateRequiredName } from './names';
import { validateRequiredEthiopianPhone, validateOptionalEthiopianPhone } from './phone';
import { validateUsername, validateOptionalEmail, validateOtpCode } from './auth';
import { validatePassword, validatePasswordMatch } from './passwords';
import { validateRequiredPayment, validatePaymentDateNotFuture } from './payment';

export const MAX_GYM_CITY_LENGTH = 100;
export const MAX_GYM_ADDRESS_LENGTH = 500;

export function validateRequiredCity(city) {
  const trimmed = String(city ?? '').trim();
  if (!trimmed) return fail('validation.cityRequired', 'city');
  if (trimmed.length > MAX_GYM_CITY_LENGTH) return fail('validation.cityTooLong', 'city');
  return ok();
}

export function validateOptionalGymAddress(address) {
  if (address && address.trim().length > MAX_GYM_ADDRESS_LENGTH) {
    return fail('validation.addressTooLong', 'address');
  }
  return ok();
}

/**
 * @param {{
 *   gymName: string,
 *   ownerName: string,
 *   username: string,
 *   email?: string,
 *   password: string,
 *   confirm: string,
 *   saasPlanId?: string|number|null,
 * }} fields
 */
export function validateGymSignupDetails({
  gymName,
  ownerName,
  username,
  email,
  password,
  confirm,
  saasPlanId,
}) {
  return firstFailure(
    validateRequiredName(gymName, { field: 'gymName' }),
    validateRequiredName(ownerName, { field: 'ownerName' }),
    validateUsername(username),
    validateOptionalEmail(email),
    validatePassword(password),
    validatePasswordMatch(password, confirm),
    saasPlanId ? ok() : fail('validation.selectSaasPlan', 'saasPlanId')
  );
}

/**
 * Register step: OTP + gym name + location (before owner account fields).
 * @param {{ code: string, gymName: string, city: string, address?: string }} fields
 */
export function validateGymSignupGymStep({ code, gymName, city, address }) {
  return firstFailure(
    validateOtpCode(code),
    validateRequiredName(gymName, { field: 'gymName' }),
    validateRequiredCity(city),
    validateOptionalGymAddress(address)
  );
}

/**
 * Register step: owner account fields only.
 * @param {{ ownerName: string, username: string, email?: string, password: string, confirm: string }} fields
 */
export function validateGymSignupAccountStep({ ownerName, username, email, password, confirm }) {
  return firstFailure(
    validateRequiredName(ownerName, { field: 'ownerName' }),
    validateUsername(username),
    validateOptionalEmail(email),
    validatePassword(password),
    validatePasswordMatch(password, confirm)
  );
}

/**
 * @param {{
 *   gymName: string,
 *   city: string,
 *   address?: string,
 *   ownerName: string,
 *   username: string,
 *   email?: string,
 *   password: string,
 *   confirm: string,
 *   phone: string,
 *   saasPlanId?: string|number|null,
 *   skipPayment?: boolean,
 *   amount?: string|number,
 *   paymentDate?: string,
 * }} fields
 */
export function validateAdminGymRegister({
  gymName,
  city,
  address,
  ownerName,
  username,
  email,
  password,
  confirm,
  phone,
  saasPlanId,
  trialDays,
  skipPayment,
  amount,
  paymentDate,
}) {
  const trialNum = trialDays != null && trialDays !== '' ? Number(trialDays) : NaN;
  const isTrial = Number.isFinite(trialNum) && trialNum > 0;
  const wantsTrial = trialDays != null && trialDays !== '';
  const base = firstFailure(
    validateRequiredName(gymName, { field: 'gymName' }),
    validateRequiredCity(city),
    validateOptionalGymAddress(address),
    validateRequiredName(ownerName, { field: 'ownerName' }),
    validateUsername(username),
    validateOptionalEmail(email),
    validatePassword(password),
    validatePasswordMatch(password, confirm),
    validateRequiredEthiopianPhone(phone),
    wantsTrial && !isTrial
      ? fail('validation.trialDaysRequired', 'trialDays')
      : isTrial || saasPlanId
        ? ok()
        : fail('validation.selectSaasPlan', 'saasPlanId')
  );
  if (!base.ok || isTrial || skipPayment) return base;
  const payment = validateRequiredPayment({ amount, paymentDate });
  if (!payment.ok) return payment;
  return validatePaymentDateNotFuture(paymentDate);
}

/**
 * @param {{ gymName: string, ownerName: string, phone: string }} fields
 */
export function validateGymProfileEdit({ gymName, ownerName, phone }) {
  return firstFailure(
    validateRequiredName(gymName, { field: 'gymName' }),
    validateRequiredName(ownerName, { field: 'ownerName' }),
    validateRequiredEthiopianPhone(phone)
  );
}

/**
 * @param {{
 *   gymName: string,
 *   ownerName: string,
 *   username: string,
 *   email?: string,
 *   phone: string,
 * }} fields
 */
export function validateOwnerProfile({ gymName, ownerName, username, email, phone }) {
  return firstFailure(
    validateGymProfileEdit({ gymName, ownerName, phone }),
    validateUsername(username),
    validateOptionalEmail(email)
  );
}
