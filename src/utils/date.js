/**
 * Formats an ISO date string or Date object to a plain YYYY-MM-DD string.
 * Returns '—' for null/undefined values.
 * @param {string|Date|null|undefined} date
 * @returns {string}
 */
export function toDateString(date) {
  if (!date) return '—';
  return String(date).split('T')[0];
}

/**
 * User-facing date: dd-mm-yy (e.g. 04-07-26).
 * @param {string|Date|null|undefined} date
 * @returns {string}
 */
export function formatDisplayDate(date) {
  if (!date) return '—';
  const iso = toDateString(date);
  if (iso === '—') return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y.slice(-2)}`;
}

/**
 * User-facing date-time: dd-mm-yy HH:mm
 * @param {string|Date|null|undefined} value
 * @returns {string}
 */
export function formatDisplayDateTime(value) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return formatDisplayDate(value);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}`;
}

/** @param {Date} d */
export function formatLocalDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Parse YYYY-MM-DD as local midnight (avoids UTC shift from Date.parse).
 * @param {string | Date} dateStr
 * @returns {Date | null}
 */
export function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) {
    return new Date(dateStr.getFullYear(), dateStr.getMonth(), dateStr.getDate());
  }
  const s = String(dateStr).split('T')[0];
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) {
    const fallback = new Date(dateStr);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  return new Date(y, m - 1, d);
}

/**
 * Returns today's date as a YYYY-MM-DD string (local timezone).
 * @returns {string}
 */
export function todayString() {
  return formatLocalDate(new Date());
}
