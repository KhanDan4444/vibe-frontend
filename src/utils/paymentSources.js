/** Labels and styles for Payments.source / SaaSPayments.source. */
import i18n from '../i18n/index.js';

const SOURCE_KEYS = {
  enroll: 'paymentSource.enroll',
  collect: 'paymentSource.collect',
  renew: 'paymentSource.renew',
  change_plan: 'paymentSource.change_plan',
};

export function paymentSourceLabel(source) {
  if (!source) return i18n.t('paymentSource.recorded');
  const key = SOURCE_KEYS[source];
  return key ? i18n.t(key) : i18n.t('paymentSource.recorded');
}

/** Quiet outline for all sources — text carries meaning, not color. */
export function paymentSourceStyle(_source) {
  return 'bg-app-surface text-app-muted border-app-border-subtle';
}

/**
 * Same quiet chip for every method — identity comes from the icon + label,
 * not competing color codes.
 */
export function paymentMethodStyle(_method) {
  return 'bg-app-surface text-app-text border-app-border-subtle';
}
