/**
 * @file listSort.js
 * @description Sort options and client-side sort helpers for admin and owner list tables.
 */

/** Sort options for admin gym directory. */
export const ADMIN_GYM_SORT_OPTIONS = [
  { id: 'name_asc', labelKey: 'sort.nameAsc' },
  { id: 'name_desc', labelKey: 'sort.nameDesc' },
  { id: 'license_asc', labelKey: 'sort.licenseAsc' },
  { id: 'license_desc', labelKey: 'sort.licenseDesc' },
];

/** Sort options for gym owner member directory. */
export const MEMBER_SORT_OPTIONS = [
  { id: 'name_asc', labelKey: 'sort.nameAsc' },
  { id: 'name_desc', labelKey: 'sort.nameDesc' },
  { id: 'expiry_asc', labelKey: 'sort.expiryAsc' },
  { id: 'expiry_desc', labelKey: 'sort.expiryDesc' },
];

/** Sort options for revenue / payment tables (admin + owner). */
export const REVENUE_SORT_OPTIONS = [
  { id: 'date_desc', labelKey: 'sort.dateDesc' },
  { id: 'date_asc', labelKey: 'sort.dateAsc' },
  { id: 'name_asc', labelKey: 'sort.nameAsc' },
  { id: 'name_desc', labelKey: 'sort.nameDesc' },
];

export const DEFAULT_GYM_SORT = 'name_asc';
export const DEFAULT_MEMBER_SORT = 'name_asc';
export const DEFAULT_REVENUE_SORT = 'date_desc';

/** Default A–Z sort for report exports. */
export const DEFAULT_EXPORT_SORT = 'name_asc';

function compareLocale(a, b) {
  return String(a || '').localeCompare(String(b || ''), undefined, { sensitivity: 'base' });
}

function compareDate(a, b) {
  const da = new Date(a || 0).getTime();
  const db = new Date(b || 0).getTime();
  if (Number.isNaN(da) && Number.isNaN(db)) return 0;
  if (Number.isNaN(da)) return 1;
  if (Number.isNaN(db)) return -1;
  return da - db;
}

function tieBreakById(a, b) {
  return (b.id || 0) - (a.id || 0);
}

function memberExpiry(m) {
  return m.endDate ?? m.end_date;
}

/** @param {Array<object>} gyms */
export function sortGymsList(gyms, sortId = DEFAULT_GYM_SORT) {
  const items = [...gyms];
  switch (sortId) {
    case 'license_asc':
      return items.sort((a, b) => {
        const byDate = compareDate(a.saas_end_date, b.saas_end_date);
        return byDate !== 0 ? byDate : compareLocale(a.name, b.name);
      });
    case 'license_desc':
      return items.sort((a, b) => {
        const byDate = compareDate(b.saas_end_date, a.saas_end_date);
        return byDate !== 0 ? byDate : compareLocale(a.name, b.name);
      });
    case 'name_desc':
      return items.sort((a, b) => compareLocale(b.name, a.name));
    case 'name_asc':
    default:
      return items.sort((a, b) => compareLocale(a.name, b.name));
  }
}

/** @param {Array<object>} members */
export function sortMembersList(members, sortId = DEFAULT_MEMBER_SORT) {
  const items = [...members];
  switch (sortId) {
    case 'expiry_asc':
      return items.sort((a, b) => {
        const byDate = compareDate(memberExpiry(a), memberExpiry(b));
        return byDate !== 0 ? byDate : compareLocale(a.name, b.name);
      });
    case 'expiry_desc':
      return items.sort((a, b) => {
        const byDate = compareDate(memberExpiry(b), memberExpiry(a));
        return byDate !== 0 ? byDate : compareLocale(a.name, b.name);
      });
    case 'name_desc':
      return items.sort((a, b) => compareLocale(b.name, a.name));
    case 'name_asc':
    default:
      return items.sort((a, b) => compareLocale(a.name, b.name));
  }
}

function sortPaymentsList(payments, sortId, getName) {
  const items = [...payments];
  switch (sortId) {
    case 'date_asc':
      return items.sort((a, b) => {
        const byDate = compareDate(a.date, b.date);
        return byDate !== 0 ? byDate : tieBreakById(a, b);
      });
    case 'name_asc':
      return items.sort((a, b) => {
        const byName = compareLocale(getName(a), getName(b));
        if (byName !== 0) return byName;
        const byDate = compareDate(b.date, a.date);
        return byDate !== 0 ? byDate : tieBreakById(a, b);
      });
    case 'name_desc':
      return items.sort((a, b) => {
        const byName = compareLocale(getName(b), getName(a));
        if (byName !== 0) return byName;
        const byDate = compareDate(b.date, a.date);
        return byDate !== 0 ? byDate : tieBreakById(a, b);
      });
    case 'date_desc':
    default:
      return items.sort((a, b) => {
        const byDate = compareDate(b.date, a.date);
        return byDate !== 0 ? byDate : tieBreakById(a, b);
      });
  }
}

/** @param {Array<object>} payments */
export function sortAdminPaymentsList(payments, sortId = DEFAULT_EXPORT_SORT) {
  return sortPaymentsList(payments, sortId, (p) => p.gym_name ?? p.gymName);
}

/** @param {Array<object>} payments */
export function sortOwnerPaymentsList(payments, sortId = DEFAULT_EXPORT_SORT) {
  return sortPaymentsList(payments, sortId, (p) => p.member_name ?? p.memberName);
}
