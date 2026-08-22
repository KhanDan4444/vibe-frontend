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
  Card: 'paymentMethod.card',
  'Bank Transfer': 'paymentMethod.bankTransfer',
  'Tele Birr': 'paymentMethod.teleBirr',
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

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'Cash', labelKey: 'paymentMethod.cash' },
  { value: 'Card', labelKey: 'paymentMethod.card' },
  { value: 'Bank Transfer', labelKey: 'paymentMethod.bankTransfer' },
  { value: 'Tele Birr', labelKey: 'paymentMethod.teleBirr' },
];

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
