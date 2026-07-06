import { toDateString } from './date';

/** Payments on or after the member's current term start (matches backend term logic). */
export function paymentsForCurrentTerm(payments, termStart) {
  const start = toDateString(termStart);
  if (!start || !payments?.length) return [];
  return payments
    .filter((p) => {
      const d = toDateString(p.date);
      return d && d >= start;
    })
    .sort((a, b) => toDateString(a.date).localeCompare(toDateString(b.date)));
}

export function sumPaymentAmounts(payments) {
  return payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
}
