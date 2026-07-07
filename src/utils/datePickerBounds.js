import { clampIsoDate, normalizeCalendarIso, todayString } from './date';
import { defaultRenewStartDate } from './memberRenew';

/**
 * @typedef {{ min?: string, max?: string }} IsoDateBounds
 */

/** Payment collected on/after term start, never in the future. */
export function boundsForPaymentOnTerm(termStartIso) {
  const term = normalizeCalendarIso(termStartIso);
  return {
    min: term,
    max: todayString(),
  };
}

/** New term / membership start when payment is recorded in the same flow (today or earlier). */
export function boundsForTermStartWithPayment() {
  return { max: todayString() };
}

/** Enroll membership start — future allowed only when skipping payment. */
export function boundsForEnrollStart(skipPayment) {
  return skipPayment ? {} : { max: todayString() };
}

/** Renewal term start — earliest allowed date; may be in the future. */
export function boundsForRenewStart(member) {
  return { min: defaultRenewStartDate(member) };
}

/** SaaS / gym license renewal start. */
export function boundsForLicenseRenewStart(minStartDate) {
  return { min: minStartDate };
}

/** Revenue / report custom range pickers. */
export function boundsForCustomRangeFrom(toIso) {
  const to = normalizeCalendarIso(toIso);
  return { max: to || todayString() };
}

export function boundsForCustomRangeTo(fromIso) {
  const from = normalizeCalendarIso(fromIso);
  return {
    min: from,
    max: todayString(),
  };
}

/** Gym registration — license starts on payment date (today or earlier). */
export function boundsForLicensePayment() {
  return { max: todayString() };
}

/** After term start changes, keep payment inside [term start, today]. */
export function clampPaymentToTerm(termStartIso, paymentIso) {
  const term = normalizeCalendarIso(termStartIso);
  if (!term) return clampIsoDate(paymentIso, undefined, todayString());
  return clampIsoDate(paymentIso, term, todayString());
}

/** Payment follows term start (change plan / fresh term), capped at today. */
export function paymentDateForTermStart(termStartIso) {
  return clampPaymentToTerm(termStartIso, termStartIso);
}
