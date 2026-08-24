/**
 * Formats an ISO date string or Date object to a plain YYYY-MM-DD string.
 * Returns '—' for null/undefined values.
 * @param {string|Date|null|undefined} date
 * @returns {string}
 */
export function toDateString(date) {
  if (!date) return '—';
  if (date instanceof Date) {
    if (Number.isNaN(date.getTime())) return '—';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
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
 * Friendlier profile/detail date: "7 Aug 2026" (locale-aware).
 * @param {string|Date|null|undefined} date
 * @param {string} [language='en'] i18n language code
 * @returns {string}
 */
export function formatFriendlyDate(date, language = 'en') {
  if (!date || date === '—') return '—';
  const parsed = parseLocalDate(date);
  if (!parsed) return formatDisplayDate(date);
  const locale = language === 'am' ? 'am-ET' : language === 'om' ? 'om-ET' : 'en-GB';
  try {
    return parsed.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return formatDisplayDate(date);
  }
}

/**
 * Inbox timestamps: "in 2 days", "yesterday", else a friendly date.
 * @param {string|Date|null|undefined} date
 * @param {function} [t] i18n t
 * @param {string} [language='en']
 */
export function formatRelativeDay(date, t, language = 'en') {
  if (!date || date === '—' || date === 'Action needed' || date === 'System Alert') return '';
  const parsed = parseLocalDate(date);
  if (!parsed) return formatFriendlyDate(date, language);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const diff = Math.round((target - start) / 86400000);
  if (typeof t !== 'function') return formatFriendlyDate(date, language);
  if (diff === 0) return t('notifications.relative.today');
  if (diff === 1) return t('notifications.relative.tomorrow');
  if (diff === -1) return t('notifications.relative.yesterday');
  if (diff > 1 && diff < 14) return t('notifications.relative.inDays', { count: diff });
  if (diff < -1 && diff > -14) return t('notifications.relative.daysAgo', { count: Math.abs(diff) });
  return formatFriendlyDate(date, language);
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

/**
 * Local start of attendance week (matches API week_starts_on).
 * @param {Date} [date]
 * @param {'monday'|'sunday'} [weekStartsOn='monday']
 */
export function startOfAttendanceWeek(date = new Date(), weekStartsOn = 'monday') {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const startDow = weekStartsOn === 'sunday' ? 0 : 1;
  const diff = (day - startDow + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

/**
 * Inclusive from/to ISO dates for this or last attendance week.
 * @param {'this'|'last'} which
 * @param {'monday'|'sunday'} [weekStartsOn='monday']
 */
export function attendanceWeekRange(which, weekStartsOn = 'monday') {
  let start = startOfAttendanceWeek(new Date(), weekStartsOn);
  if (which === 'last') {
    start = new Date(start);
    start.setDate(start.getDate() - 7);
  }
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { from: formatLocalDate(start), to: formatLocalDate(end) };
}

/**
 * Day header for attendance history: "Mon 18 Aug"
 * @param {string|Date|null|undefined} date
 * @param {string} [language='en']
 */
export function formatAttendanceDayLabel(date, language = 'en') {
  if (!date || date === '—') return '—';
  const parsed = parseLocalDate(date);
  if (!parsed) return formatDisplayDate(date);
  const locale = language === 'am' ? 'am-ET' : language === 'om' ? 'om-ET' : 'en-GB';
  try {
    return parsed.toLocaleDateString(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return formatDisplayDate(date);
  }
}

/**
 * Group check-in rows by local calendar day (newest days first).
 * @param {Array<{ checked_in_at?: string }>} checkIns
 */
export function groupCheckInsByDay(checkIns) {
  const map = new Map();
  for (const row of checkIns || []) {
    const day = toDateString(row.checked_in_at);
    if (!day || day === '—') continue;
    if (!map.has(day)) map.set(day, []);
    map.get(day).push(row);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

/** Normalize to YYYY-MM-DD for bounds; returns undefined for empty or display placeholder. */
export function normalizeCalendarIso(date) {
  if (!date || date === '—') return undefined;
  const iso = String(date).split('T')[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : undefined;
}

/** @param {string|undefined} min @param {string|undefined} max */
export function isDateRangeValid(min, max) {
  const a = normalizeCalendarIso(min);
  const b = normalizeCalendarIso(max);
  if (!a || !b) return true;
  const da = parseLocalDate(a);
  const db = parseLocalDate(b);
  if (!da || !db) return true;
  return da.getTime() <= db.getTime();
}

/**
 * Keep an ISO date inside optional min/max (local calendar days).
 * @param {string} iso
 * @param {string|undefined} min
 * @param {string|undefined} max
 */
export function clampIsoDate(iso, min, max) {
  const normalized = normalizeCalendarIso(iso);
  if (!normalized) return todayString();
  if (!isDateRangeValid(min, max)) {
    return normalizeCalendarIso(max) || normalizeCalendarIso(min) || normalized;
  }
  let result = normalized;
  const d = parseLocalDate(result);
  const dMin = min ? parseLocalDate(min) : null;
  const dMax = max ? parseLocalDate(max) : null;
  if (dMin && d && d < dMin) result = min;
  if (dMax && d && parseLocalDate(result) > dMax) result = max;
  return result;
}
