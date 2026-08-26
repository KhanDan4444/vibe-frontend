import { ok, fail } from './result';
import { parseMoneyAmount } from './money';
import { isNotFutureDate, isOnOrAfterDate } from './dates';
import { todayString } from '../date';
import { validateRenewPaymentDate as validateRenewPaymentDateRules } from '../paymentDateRules';

/** @param {{ amount: string|number, paymentDate: string|null|undefined }} fields */
export function validateRequiredPayment({ amount, paymentDate }) {
  const parsed = parseMoneyAmount(amount);
  if (Number.isNaN(parsed) || parsed <= 0 || !paymentDate) {
    return fail('validation.validPaymentOrSkip', 'amount');
  }
  return ok();
}

/** @param {string} paymentDate @param {string} [today] @param {string} [field] */
export function validatePaymentDateNotFuture(paymentDate, today = todayString(), field = 'paymentDate') {
  if (!isNotFutureDate(paymentDate, today)) {
    return fail('validation.paymentDateNotFuture', field);
  }
  return ok();
}

/**
 * @param {{
 *   paymentDate: string,
 *   startDate: string|null|undefined,
 *   key?: string,
 *   field?: string,
 *   params?: Record<string, string>,
 * }} options
 */
export function validatePaymentDateOnOrAfterStart({
  paymentDate,
  startDate,
  key = 'validation.paymentDateAfterTermStart',
  field = 'paymentDate',
  params,
}) {
  if (!isOnOrAfterDate(paymentDate, startDate)) {
    return fail(key, field, params ?? (startDate ? { date: startDate } : undefined));
  }
  return ok();
}

/**
 * @param {{
 *   amount: string|number,
 *   paymentDate: string,
 *   startDate: string,
 *   skipPayment?: boolean,
 *   startDateDisplay?: string,
 * }} fields
 */
export function validateMemberEnrollPayment({
  amount,
  paymentDate,
  startDate,
  skipPayment,
  startDateDisplay,
}) {
  if (skipPayment) return ok();
  const required = validateRequiredPayment({ amount, paymentDate });
  if (!required.ok) return required;
  const afterStart = validatePaymentDateOnOrAfterStart({
    paymentDate,
    startDate,
    key: 'validation.paymentDateAfterStartOrUnpaid',
    params: { date: startDateDisplay ?? startDate },
  });
  if (!afterStart.ok) return afterStart;
  return validatePaymentDateNotFuture(paymentDate);
}

/**
 * @param {{
 *   planId: string|number|null|undefined,
 *   startDate: string|null|undefined,
 *   paymentDate: string|null|undefined,
 *   amount: string|number,
 *   requiredKey?: string,
 * }} fields
 */
export function validateRenewPayment({
  planId,
  startDate,
  paymentDate,
  amount,
  requiredKey = 'validation.selectPlanAndAmount',
}) {
  const parsed = parseMoneyAmount(amount);
  if (!planId || !startDate || !paymentDate || Number.isNaN(parsed) || parsed <= 0) {
    return fail(requiredKey, 'planId');
  }
  const dateCheck = validateRenewPaymentDateRules(paymentDate, startDate, todayString());
  if (!dateCheck.ok) {
    const prepaidBlocked =
      startDate &&
      paymentDate < startDate &&
      startDate <= todayString();
    return fail(
      prepaidBlocked ? 'validation.paymentDateAfterTermStart' : 'validation.paymentDateNotFuture',
      'paymentDate',
      prepaidBlocked && startDate ? { date: startDate } : undefined
    );
  }
  return ok();
}

/**
 * @param {{
 *   planId: string|number|null|undefined,
 *   startDate: string|null|undefined,
 *   paymentDate: string|null|undefined,
 *   amount: string|number,
 * }} fields
 */
export function validateGymRenewPayment({ planId, startDate, paymentDate, amount }) {
  const parsed = parseMoneyAmount(amount);
  if (!planId || !startDate || !paymentDate || Number.isNaN(parsed) || parsed <= 0) {
    return fail('modals.renewGym.validationRequired', 'planId');
  }
  if (!isNotFutureDate(paymentDate)) {
    return fail('modals.renewGym.paymentDateNotFuture', 'paymentDate');
  }
  return ok();
}

/**
 * @param {{
 *   planId: string|number|null|undefined,
 *   termStart: string|null|undefined,
 *   paymentDate: string|null|undefined,
 *   amount: string|number,
 *   isSameTerm: boolean,
 *   license?: boolean,
 * }} fields
 */
export function validateChangePlanPayment({
  planId,
  termStart,
  paymentDate,
  amount,
  isSameTerm,
  license = false,
}) {
  const parsed = parseMoneyAmount(amount);
  const paymentRequiredKey = license
    ? 'validation.paymentForLicenseStart'
    : 'validation.paymentForTermStart';
  const beforeStartKey = license
    ? 'validation.paymentDateBeforeLicenseStart'
    : 'validation.paymentDateBeforeTermStart';

  if (!planId || !termStart || !paymentDate || Number.isNaN(parsed) || parsed < 0) {
    return fail('validation.selectPlanAndDates', 'planId');
  }
  if (!isSameTerm && parsed <= 0) {
    return fail(paymentRequiredKey, 'amount');
  }
  if (!isOnOrAfterDate(paymentDate, termStart)) {
    return fail(beforeStartKey, 'paymentDate');
  }
  return validatePaymentDateNotFuture(paymentDate);
}

/**
 * @param {{
 *   amount: string|number,
 *   date: string|null|undefined,
 *   minStartDate?: string|null,
 *   memberId?: string|number|null,
 *   requiredKey?: string,
 *   afterStartKey?: string,
 * }} fields
 */
export function validateStandalonePayment({
  amount,
  date,
  minStartDate,
  memberId,
  requiredKey = 'validation.validAmountAndDate',
  afterStartKey = 'validation.paymentDateAfterTermStartOrInvalid',
}) {
  const parsed = parseMoneyAmount(amount);
  if (memberId !== undefined) {
    if (!memberId || Number.isNaN(parsed) || parsed <= 0 || !date) {
      return fail('validation.validMemberAmountDate', 'memberId');
    }
  } else if (Number.isNaN(parsed) || parsed <= 0 || !date) {
    return fail(requiredKey, 'amount');
  }
  if (minStartDate && !isOnOrAfterDate(date, minStartDate)) {
    return fail(afterStartKey, 'date', { date: minStartDate });
  }
  return validatePaymentDateNotFuture(date, todayString(), 'date');
}
