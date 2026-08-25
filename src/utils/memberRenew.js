import { DISPLAY_STATUS } from './memberStatus';
import { parseLocalDate, formatLocalDate, todayString } from './date';
import { calculateEndDate } from './memberDates';

/** @param {string} dateStr @param {number} days */
export function addDays(dateStr, days) {
  const d = parseLocalDate(dateStr);
  if (!d) return todayString();
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}

/**
 * Default start date for a renewal.
 * Paid members start the day after end_date; lapsed terms may start today.
 */
export function defaultRenewStartDate(member) {
  const today = todayString();
  if (!member || member.isUnpaid) return today;
  if (!member.endDate || member.endDate === '—') return today;
  const afterEnd = addDays(member.endDate, 1);
  return afterEnd > today ? afterEnd : today;
}

/** Renew on the end date or after expiry (not earlier in the due-soon window). */
export function canRenewMember(member) {
  if (!member || member.isUnpaid || member.is_unpaid) return false;
  const raw = member.endDate ?? member.end_date;
  if (!raw || raw === '—') return false;
  const endDay = String(raw).split('T')[0];
  return endDay <= todayString();
}

/** Active members — switch plan mid-term (paid) or before first payment (unpaid). */
export function canChangePlan(member) {
  if (!member) return false;
  return member.status === DISPLAY_STATUS.ACTIVE;
}

function daysBetween(from, to) {
  const a = parseLocalDate(from);
  const b = parseLocalDate(to);
  if (!a || !b) return 0;
  return Math.max(0, Math.round((b - a) / 86400000));
}

/**
 * Suggested upgrade payment: new plan price minus pro-rated credit for unused current term.
 * Display-only — staff confirm the amount before saving.
 * @param {{ customTermStart?: boolean, startDate?: string }} [options]
 */
export function suggestChangePlanAmount(member, currentPlan, newPlan, options = {}) {
  if (!member || !currentPlan || !newPlan) return null;

  const newPrice = Number(newPlan.price);
  if (!Number.isFinite(newPrice)) return null;

  const { customTermStart = false, startDate } = options;
  const termStart = member.startDate;

  // No payment yet — suggest full new plan price (no credit from unpaid plan).
  if (member.isUnpaid) {
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

  if (customTermStart && termStart && termStart !== '—' && startDate && startDate !== termStart) {
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

  const termEnd = member.endDate;
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
      keepTermEnd: true,
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

export function isMemberPlanDowngrade(currentPlan, newPlan) {
  if (!currentPlan || !newPlan) return false;
  return Number(newPlan.price) <= Number(currentPlan.price);
}

/** Preview term end when switching plans (keeps paid-through on mid-term downgrades). */
export function previewMemberTermEnd({ member, currentPlan, selectedPlan, customTermStart, startDate }) {
  const termStart = member?.startDate;
  const termEnd = member?.endDate;
  const effectiveStart = customTermStart ? startDate : termStart;
  if (!selectedPlan || !effectiveStart) return null;

  const sameTerm = !customTermStart && effectiveStart === termStart;
  if (
    sameTerm &&
    !member?.isUnpaid &&
    isMemberPlanDowngrade(currentPlan, selectedPlan) &&
    termEnd &&
    termEnd !== '—'
  ) {
    return String(termEnd).split('T')[0];
  }

  return calculateEndDate(effectiveStart, selectedPlan.duration);
}
