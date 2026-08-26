import {
  boundsForCustomRangeFrom as coreFrom,
  boundsForCustomRangeTo as coreTo,
  boundsForEnrollStart as coreEnroll,
  boundsForLicensePayment as coreLicensePayment,
  boundsForLicenseRenewStart as coreLicenseRenew,
  boundsForPaymentOnTerm as corePayment,
  boundsForRenewPaymentOnTerm as coreRenewPayment,
  boundsForTermStartWithPayment as coreTermStart,
  clampPaymentToTerm as coreClamp,
  clampRenewPaymentToTerm as coreRenewClamp,
  paymentDateForTermStart as corePaymentForTerm,
  paymentDateForRenewTermStart as coreRenewPaymentForTerm,
  normalizeIso,
} from './paymentDateRules';
import { defaultRenewStartDate } from './memberRenew';

/**
 * @typedef {{ min?: string, max?: string }} IsoDateBounds
 */

/** Payment collected on/after term start, never in the future. */
export function boundsForPaymentOnTerm(termStartIso) {
  return corePayment(termStartIso);
}

/** Renew: allow prepaid payment when start is still in the future. */
export function boundsForRenewPaymentOnTerm(termStartIso) {
  return coreRenewPayment(termStartIso);
}

export function boundsForTermStartWithPayment() {
  return coreTermStart();
}

export function boundsForEnrollStart(skipPayment) {
  return coreEnroll(skipPayment);
}

export function boundsForRenewStart(member) {
  return { min: defaultRenewStartDate(member) };
}

export function boundsForLicenseRenewStart(minStartDate) {
  return coreLicenseRenew(minStartDate);
}

export function boundsForCustomRangeFrom(toIso) {
  return coreFrom(toIso);
}

export function boundsForCustomRangeTo(fromIso) {
  return coreTo(fromIso);
}

export function boundsForLicensePayment() {
  return coreLicensePayment();
}

export function clampPaymentToTerm(termStartIso, paymentIso) {
  return coreClamp(termStartIso, paymentIso);
}

export function clampRenewPaymentToTerm(termStartIso, paymentIso) {
  return coreRenewClamp(termStartIso, paymentIso);
}

export function paymentDateForTermStart(termStartIso) {
  return corePaymentForTerm(termStartIso);
}

export function paymentDateForRenewTermStart(termStartIso) {
  return coreRenewPaymentForTerm(termStartIso);
}

export { normalizeIso };
