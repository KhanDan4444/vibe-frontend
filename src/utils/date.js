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
 * User-facing time: "11:34 am" (12-hour, lowercase meridiem).
 * @param {string|Date|null|undefined} value
 * @param {string} [language='en']
 * @returns {string}
 */
export function formatDisplayTime(value, language = 'en') {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const locale = language === 'am' ? 'am-ET' : language === 'om' ? 'om-ET' : 'en-US';
  try {
    const raw = date.toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return raw.replace(/\s?(AM|PM)\s*$/i, (_, meridiem) => ` ${meridiem.toLowerCase()}`);
  } catch {
    const h = date.getHours();
    const m = String(date.getMinutes()).padStart(2, '0');
    const ap = h >= 12 ? 'pm' : 'am';
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${ap}`;
  }
}

/**
 * User-facing date-time: dd-mm-yy 11:34 am
 * @param {string|Date|null|undefined} value
 * @param {string} [language='en']
 * @returns {string}
 */
export function formatDisplayDateTime(value, language = 'en') {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return formatDisplayDate(value);
  return `${formatDisplayDate(date)} ${formatDisplayTime(date, language)}`;
}

/**
 * Activity/log timestamps: "Today · 11:34 am" or "04-07-26 · 11:34 am".
 * @param {string|Date|null|undefined} value
 * @param {function} [t] i18n t
 * @param {string} [language='en']
 */
export function formatLogTimestamp(value, t, language = 'en') {
  if (!value) return '—';
  const time = formatDisplayTime(value, language);
  if (typeof t === 'function') {
    const rel = formatRelativeDay(value, t, language);
    if (rel) return `${rel} · ${time}`;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return formatDisplayDate(value);
  return `${formatDisplayDate(date)} · ${time}`;
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
 * Whole calendar days from today to a date (local). Positive = future, 0 = today, negative = past.
 * @param {string|Date|null|undefined} date
 * @returns {number|null}
 */
export function daysUntilDate(date) {
  const target = parseLocalDate(date);
  if (!target) return null;
  const today = parseLocalDate(todayString());
  if (!today) return null;
  return Math.round((target.getTime() - today.getTime()) / 86400000);
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
 * Inclusive from/to ISO dates for an attendance week N weeks before the current week.
 * @param {number} weeksBack
 * @param {'monday'|'sunday'} [weekStartsOn='monday']
 */
export function attendanceWeekRangeByOffset(weeksBack, weekStartsOn = 'monday') {
  const start = startOfAttendanceWeek(new Date(), weekStartsOn);
  if (weeksBack > 0) {
    start.setDate(start.getDate() - weeksBack * 7);
  }
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { from: formatLocalDate(start), to: formatLocalDate(end) };
}

/** Number of rolling attendance weeks shown in check-in History. */
export const ATTENDANCE_HISTORY_WEEK_COUNT = 4;

/**
 * Inclusive from/to ISO dates for this or last attendance week.
 * @param {'this'|'last'} which
 * @param {'monday'|'sunday'} [weekStartsOn='monday']
 */
export function attendanceWeekRange(which, weekStartsOn = 'monday') {
  return attendanceWeekRangeByOffset(which === 'last' ? 1 : 0, weekStartsOn);
}

/**
 * Pill label for History week picker: words for recent weeks, date range for older ones.
 * @param {number} weeksBack
 * @param {'monday'|'sunday'} weekStartsOn
 * @param {string} language
 * @param {{ thisWeek: string, lastWeek: string }} labels
 */
export function attendanceHistoryWeekLabel(weeksBack, weekStartsOn, language, labels) {
  if (weeksBack === 0) return labels.thisWeek;
  if (weeksBack === 1) return labels.lastWeek;
  const range = attendanceWeekRangeByOffset(weeksBack, weekStartsOn);
  return formatAttendanceWeekRangeLabel(range.from, range.to, language);
}

/**
 * Local calendar day relative to today.
 * @param {string|Date|null|undefined} date
 * @returns {'today'|'yesterday'|null}
 */
export function attendanceDayRelative(date) {
  const iso = toDateString(date);
  if (!iso || iso === '—') return null;
  const today = todayString();
  if (iso === today) return 'today';
  const y = new Date();
  y.setHours(0, 0, 0, 0);
  y.setDate(y.getDate() - 1);
  if (iso === formatLocalDate(y)) return 'yesterday';
  return null;
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
 * Week range for History: "17–23 Aug" (same month) or "28 Jul – 3 Aug".
 * Avoids dd-mm-yy digit soup that can look broken in the modal.
 * @param {string|Date|null|undefined} from
 * @param {string|Date|null|undefined} to
 * @param {string} [language='en']
 */
export function formatAttendanceWeekRangeLabel(from, to, language = 'en') {
  const a = parseLocalDate(from);
  const b = parseLocalDate(to);
  if (!a || !b) {
    const left = formatDisplayDate(from);
    const right = formatDisplayDate(to);
    if (left === '—' && right === '—') return '—';
    return `${left} – ${right}`;
  }
  const locale = language === 'am' ? 'am-ET' : language === 'om' ? 'om-ET' : 'en-GB';
  try {
    const sameMonth =
      a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
    if (sameMonth) {
      const end = b.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
      return `${a.getDate()}–${end}`;
    }
    const left = a.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    const right = b.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    return `${left} – ${right}`;
  } catch {
    return `${formatDisplayDate(from)} – ${formatDisplayDate(to)}`;
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
