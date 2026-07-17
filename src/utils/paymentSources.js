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

export function paymentSourceStyle(source) {
  switch (source) {
    case 'enroll':
      return 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-500/12 dark:text-orange-300 dark:border-orange-500/25';
    case 'renew':
      return 'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-500/12 dark:text-sky-300 dark:border-sky-500/25';
    case 'change_plan':
      return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/12 dark:text-amber-300 dark:border-amber-500/25';
    case 'collect':
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-app-surface dark:text-app-text dark:border-app-border-subtle';
  }
}

export function paymentMethodStyle(method) {
  if (method === 'Card') {
    return 'bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-600/12 dark:text-teal-300 dark:border-teal-600/25';
  }
  if (method === 'Bank Transfer') {
    return 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/12 dark:text-blue-300 dark:border-blue-500/25';
  }
  return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-app-surface dark:text-app-text dark:border-app-border-subtle';
}