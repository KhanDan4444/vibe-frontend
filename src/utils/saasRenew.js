import { parseLocalDate, formatLocalDate, todayString } from './date';
import { calculateEndDate } from './memberDates';

/** @param {string} dateStr @param {number} days */
export function addDays(dateStr, days) {
  const d = parseLocalDate(dateStr);
  if (!d) return todayString();
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}

function daysBetween(from, to) {
  const a = parseLocalDate(from);
  const b = parseLocalDate(to);
  if (!a || !b) return 0;
  return Math.max(0, Math.round((b - a) / 86400000));
}

function isDueSoonEndDate(endDate) {
  if (!endDate || endDate === '—') return false;
  const today = todayString();
  const remaining = daysBetween(today, endDate);
  return remaining >= 0 && remaining <= 7;
}

/** Default license start for renewal — day after current end when paid through. */
export function defaultGymRenewStartDate(gym) {
  const today = todayString();
  if (!gym || gym.isUnpaid) return today;
  const end = gym.saasEndDate || gym.saas_end_date;
  if (!end || end === '—') return today;
  const endStr = String(end).split('T')[0];
  const afterEnd = addDays(endStr, 1);
  return afterEnd > today ? afterEnd : today;
}

/** Due soon / expired / suspended gyms renew in one payment-included flow. */
export function canRenewGym(gym) {
  if (!gym) return false;
  const status = gym.subscription_status?.toLowerCase();
  if (status === 'expired' || status === 'suspended') return true;
  if (status === 'active') {
    const end = gym.saasEndDate || (gym.saas_end_date ? String(gym.saas_end_date).split('T')[0] : null);
    return isDueSoonEndDate(end);
  }
  return false;
}

/** Active gyms — switch SaaS plan mid-term (paid) or before first payment (unpaid). */
export function canChangeSaasPlan(gym) {
  if (!gym) return false;
  return gym.subscription_status?.toLowerCase() === 'active';
}

/**
 * Suggested upgrade payment for SaaS plan change (display-only).
 * @param {{ customTermStart?: boolean, startDate?: string }} [options]
 */
export function suggestChangeSaasPlanAmount(gym, currentPlan, newPlan, options = {}) {
  if (!gym || !currentPlan || !newPlan) return null;

  const newPrice = Number(newPlan.price);
  if (!Number.isFinite(newPrice)) return null;

  const { customTermStart = false, startDate } = options;
  const licenseStart =
    gym.saasStartDate || (gym.saas_start_date ? String(gym.saas_start_date).split('T')[0] : null);

  if (gym.isUnpaid) {
    return {
      suggestedAmount: Math.round(newPrice * 100) / 100,
      credit: 0,
      remainingDays: 0,
      totalDays: 0,
      newPlanPrice: newPrice,
      isDowngrade: false,
      prePayment: true,
    };
  }

  if (customTermStart && licenseStart && startDate && startDate !== licenseStart) {
    return {
      suggestedAmount: Math.round(newPrice * 100) / 100,
      credit: 0,
      remainingDays: 0,
      totalDays: 0,
      newPlanPrice: newPrice,
      isDowngrade: Number(newPlan.price) <= Number(currentPlan.price),
      freshTerm: true,
    };
  }

  const currentPrice = Number(currentPlan.price);
  if (!Number.isFinite(currentPrice)) return null;

  const termStart = gym.saasStartDate || (gym.saas_start_date ? String(gym.saas_start_date).split('T')[0] : null);
  const termEnd = gym.saasEndDate || (gym.saas_end_date ? String(gym.saas_end_date).split('T')[0] : null);
  const today = todayString();
  if (!termStart || !termEnd || termEnd === '—') return null;

  const totalDays = daysBetween(termStart, termEnd);
  if (totalDays <= 0) return null;

  const remainingDays = Math.min(daysBetween(today, termEnd), totalDays);
  const isDowngrade = newPrice <= currentPrice;

  if (isDowngrade) {
    return {
      suggestedAmount: 0,
      credit: 0,
      remainingDays,
      totalDays,
      newPlanPrice: newPrice,
      isDowngrade: true,
      keepLicenseEnd: true,
    };
  }

  const rawCredit = currentPrice * (remainingDays / totalDays);
  const credit = Math.min(rawCredit, Math.max(0, newPrice - 0.01));
  const suggestedAmount = Math.max(0.01, Math.round((newPrice - credit) * 100) / 100);

  return {
    suggestedAmount,
    credit: Math.round(credit * 100) / 100,
    remainingDays,
    totalDays,
    newPlanPrice: newPrice,
    isDowngrade: false,
  };
}

export function isSaasPlanDowngrade(currentPlan, newPlan) {
  if (!currentPlan || !newPlan) return false;
  return Number(newPlan.price) <= Number(currentPlan.price);
}

/** Preview license end when switching plans (keeps paid-through on mid-term downgrades). */
export function previewSaasLicenseEnd({ gym, currentPlan, selectedPlan, customTermStart, startDate }) {
  const licenseStart = gym?.saasStartDate;
  const licenseEnd = gym?.saasEndDate;
  const effectiveStart = customTermStart ? startDate : licenseStart;
  if (!selectedPlan || !effectiveStart) return null;

  const sameTerm = !customTermStart && effectiveStart === licenseStart;
  if (
    sameTerm &&
    !gym?.isUnpaid &&
    isSaasPlanDowngrade(currentPlan, selectedPlan) &&
    licenseEnd &&
    licenseEnd !== '—'
  ) {
    return String(licenseEnd).split('T')[0];
  }

  return calculateEndDate(effectiveStart, selectedPlan.duration);
}

/** Map gym detail API payload for billing modals. */
export function mapGymDetailForBilling(gymDetail) {
  if (!gymDetail) return null;
  const sub = gymDetail.saas_subscription || {};
  const termStart = sub.start_date ? String(sub.start_date).split('T')[0] : null;
  const payments = gymDetail.saas_payments || [];
  const paidForTerm = termStart
    ? payments.some((p) => {
        const coverageStart = p.coverage_start_date ? String(p.coverage_start_date).split('T')[0] : null;
        if (coverageStart) return coverageStart === termStart;
        return p.date && String(p.date).split('T')[0] >= termStart;
      })
    : false;

  return {
    id: gymDetail.id,
    name: gymDetail.name,
    owner_name: gymDetail.owner_name,
    subscription_status: gymDetail.subscription_status,
    isUnpaid: gymDetail.is_unpaid ?? (sub.start_date ? !paidForTerm : false),
    saas_plan_id: sub.saas_plan_id,
    saas_plan_name: sub.saas_plan_catalog_name || sub.plan,
    saas_start_date: sub.start_date,
    saas_end_date: sub.end_date,
    saasStartDate: termStart,
    saasEndDate: sub.end_date ? String(sub.end_date).split('T')[0] : null,
  };
}
