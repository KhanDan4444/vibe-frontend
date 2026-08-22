import i18n from './index';

/** Translate a list of `{ id, labelKey }` options for selects. */
export function translateOptions(options) {
  return options.map((opt) => ({
    ...opt,
    label: i18n.t(opt.labelKey),
  }));
}

const PAYMENT_METHOD_KEYS = {
  Cash: 'paymentMethod.cash',
  'Bank Transfer': 'paymentMethod.bankTransfer',
  'Tele Birr': 'paymentMethod.teleBirr',
  Card: 'paymentMethod.card',
};

/** Display label for a stored payment method value (API values stay English). */
export function translatePaymentMethod(method) {
  if (!method) return i18n.t('status.unknown');
  const key = PAYMENT_METHOD_KEYS[method];
  return key ? i18n.t(key) : method;
}

/** Payment method label for CSV/PDF exports (always English). */
export function exportPaymentMethod(method) {
  if (!method) return exportT()('status.unknown');
  const key = PAYMENT_METHOD_KEYS[method];
  return key ? exportT()(key) : method;
}

/** Canonical order for selects, revenue bar, and legends (Tele Birr before Card). */
export const PAYMENT_METHOD_ORDER = [
  'Cash',
  'Bank Transfer',
  'Tele Birr',
  'Card',
];

export const PAYMENT_METHOD_OPTIONS = PAYMENT_METHOD_ORDER.map((value) => ({
  value,
  labelKey: PAYMENT_METHOD_KEYS[value],
}));

/** Sort payment-method rows for charts / legends. */
export function comparePaymentMethodOrder(a, b) {
  const ai = PAYMENT_METHOD_ORDER.indexOf(a);
  const bi = PAYMENT_METHOD_ORDER.indexOf(b);
  const aRank = ai === -1 ? PAYMENT_METHOD_ORDER.length : ai;
  const bRank = bi === -1 ? PAYMENT_METHOD_ORDER.length : bi;
  if (aRank !== bRank) return aRank - bRank;
  return String(a).localeCompare(String(b));
}

/** Fixed English translator for CSV/PDF exports (jsPDF cannot render Ethiopic script). */
function exportT() {
  return i18n.getFixedT('en');
}

/** CSV/PDF column header from export.columns.* (always English). */
export function exportColumn(key) {
  return exportT()(`export.columns.${key}`);
}

/** CSV/PDF label from any i18n key (always English). */
export function exportText(key, params) {
  return exportT()(key, params);
}
