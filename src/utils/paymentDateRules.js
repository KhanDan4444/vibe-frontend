/**
 * Mirror of vibe/shared/paymentDateRules.js — keep in sync (see that file's PAYMENT_DATE_RULES.md).
 * ISO YYYY-MM-DD string helpers for pickers and client validation.
 */

export function normalizeIso(date) {
  if (!date || date === '—') return '';
  const iso = String(date).split('T')[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : '';
}

export function todayIso(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function validatePaymentDate(paymentDateStr, termStartDateStr, today = todayIso()) {
  const paymentDate = normalizeIso(paymentDateStr);
  const termStart = normalizeIso(termStartDateStr);
  const todayNorm = normalizeIso(today) || todayIso();
  if (!paymentDate) {
    return { ok: false, error: 'Invalid payment date.' };
  }
  if (paymentDate > todayNorm) {
    return { ok: false, error: 'Payment date cannot be in the future.' };
  }
  if (termStart && paymentDate < termStart) {
    return {
      ok: false,
      error: `Payment date must be on or after the term start (${termStart}) or it will not count toward this term.`,
    };
  }
  return { ok: true };
}

export function boundsForPaymentOnTerm(termStartIso, today = todayIso()) {
  const term = normalizeIso(termStartIso);
  return {
    ...(term ? { min: term } : {}),
    max: normalizeIso(today) || todayIso(),
  };
}

export function boundsForTermStartWithPayment(today = todayIso()) {
  return { max: normalizeIso(today) || todayIso() };
}

export function boundsForEnrollStart(skipPayment, today = todayIso()) {
  return skipPayment ? {} : { max: normalizeIso(today) || todayIso() };
}

export function boundsForLicenseRenewStart(minStartDate) {
  const min = normalizeIso(minStartDate);
  return min ? { min } : {};
}

export function boundsForLicensePayment(today = todayIso()) {
  return { max: normalizeIso(today) || todayIso() };
}

export function boundsForCustomRangeFrom(toIso, today = todayIso()) {
  const to = normalizeIso(toIso);
  return { max: to || normalizeIso(today) || todayIso() };
}

export function boundsForCustomRangeTo(fromIso, today = todayIso()) {
  const from = normalizeIso(fromIso);
  return {
    ...(from ? { min: from } : {}),
    max: normalizeIso(today) || todayIso(),
  };
}

export function clampIsoDate(iso, min, max) {
  let result = normalizeIso(iso);
  if (!result) result = todayIso();
  const minN = normalizeIso(min);
  const maxN = normalizeIso(max);
  if (minN && maxN && minN > maxN) {
    return maxN || minN || result;
  }
  if (minN && result < minN) result = minN;
  if (maxN && result > maxN) result = maxN;
  return result;
}

export function clampPaymentToTerm(termStartIso, paymentIso, today = todayIso()) {
  const bounds = boundsForPaymentOnTerm(termStartIso, today);
  return clampIsoDate(paymentIso, bounds.min, bounds.max);
}

export function paymentDateForTermStart(termStartIso, today = todayIso()) {
  return clampPaymentToTerm(termStartIso, termStartIso, today);
}
