/** Platform currency — Ethiopian Birr everywhere (web + exports). */
export const CURRENCY_CODE = 'ETB';

/**
 * Format an amount for display / exports.
 * @param {number|string} amount
 * @param {{ minimumFractionDigits?: number, maximumFractionDigits?: number }} [options]
 */
export function formatMoney(amount, options = {}) {
  const { minimumFractionDigits = 2, maximumFractionDigits = 2 } = options;
  const n = Number(amount);
  if (Number.isNaN(n)) return '—';
  return `${n.toLocaleString(undefined, { minimumFractionDigits, maximumFractionDigits })} ETB`;
}

/** Shorter amounts for KPI cards / chart axes (no forced decimals). */
export function formatMoneyShort(amount) {
  const n = Number(amount);
  if (Number.isNaN(n)) return '—';
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 0 })} ETB`;
}

/** Chart tick — number only to save space; tooltips use formatMoney. */
export function formatMoneyTick(amount) {
  const n = Number(amount);
  if (Number.isNaN(n)) return '';
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}
