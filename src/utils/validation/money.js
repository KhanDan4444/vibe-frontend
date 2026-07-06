export const MAX_MONEY_AMOUNT = 9_999_999;

/** @param {string|number|null|undefined} value */
export function parseMoneyAmount(value) {
  if (value === '' || value == null) return NaN;
  const n = parseFloat(String(value));
  return Number.isFinite(n) ? n : NaN;
}

/** @param {string|number|null|undefined} value */
export function isPositiveMoneyAmount(value) {
  const n = typeof value === 'number' ? value : parseMoneyAmount(value);
  return !Number.isNaN(n) && n > 0 && n <= MAX_MONEY_AMOUNT;
}

/** @param {string|number|null|undefined} value */
export function isNonNegativeMoneyAmount(value) {
  const n = typeof value === 'number' ? value : parseMoneyAmount(value);
  return !Number.isNaN(n) && n >= 0 && n <= MAX_MONEY_AMOUNT;
}
