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
  return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-app-surface dark:text-app-muted dark:border-app-border-subtle';
}

/**
 * Distinct tinted chip per payment method so Cash / Card / Bank stand out
 * as labels (not muted random text).
 */
export function paymentMethodStyle(method) {
  const key = String(method || '').trim();
  if (key === 'Cash') {
    return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30';
  }
  if (key === 'Card') {
    return 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30';
  }
  if (key === 'Bank Transfer') {
    return 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30';
  }
  return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-app-surface dark:text-app-text dark:border-app-border-subtle';
}