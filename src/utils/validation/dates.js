import { todayString } from '../date';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** @param {string|null|undefined} value */
export function isIsoDateString(value) {
  return typeof value === 'string' && ISO_DATE_RE.test(value.trim());
}

/** @param {string} dateStr @param {string} [today] */
export function isNotFutureDate(dateStr, today = todayString()) {
  return isIsoDateString(dateStr) && dateStr <= today;
}

/** @param {string} dateStr @param {string|null|undefined} minDateStr */
export function isOnOrAfterDate(dateStr, minDateStr) {
  if (!isIsoDateString(dateStr)) return false;
  if (!minDateStr || !isIsoDateString(minDateStr)) return true;
  return dateStr >= minDateStr;
}
