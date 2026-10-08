import { toDateString } from './date';

const MS_DAY = 86400000;
/** Show urgent “n days left” styling at or under this threshold. */
export const TRIAL_DAYS_LEFT_URGENCY = 7;

function parseLocalDay(date) {
  const iso = toDateString(date);
  if (!iso || iso === '—') return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** @param {{ saas_plan_id?: number|null, saas_plan_name?: string|null, saas_subscription?: object, isTrial?: boolean }} gym */
export function isGymOnTrial(gym) {
  if (!gym) return false;
  if (gym.isTrial) return true;
  const planId = gym.saas_plan_id ?? gym.saas_subscription?.saas_plan_id;
  if (planId != null) return false;
  const name =
    gym.saas_plan_name ||
    gym.saas_subscription?.saas_plan_catalog_name ||
    gym.saas_subscription?.plan ||
    '';
  return String(name).trim() === 'Free Trial';
}

/**
 * @param {{ startDate?: string|Date|null, endDate?: string|Date|null, today?: Date }} args
 * @returns {{ totalDays: number, daysUsed: number, daysLeft: number, startDate: string, endDate: string }|null}
 */
export function getTrialProgress({ startDate, endDate, today = new Date() } = {}) {
  const start = parseLocalDay(startDate);
  const end = parseLocalDay(endDate);
  const todayDay = parseLocalDay(toDateString(today));
  if (!start || !end || !todayDay) return null;

  const totalDays = Math.round((end.getTime() - start.getTime()) / MS_DAY) + 1;
  if (totalDays < 1) return null;

  const rawUsed = Math.round((todayDay.getTime() - start.getTime()) / MS_DAY) + 1;
  const daysUsed = Math.min(totalDays, Math.max(0, rawUsed));
  const daysLeft = Math.round((end.getTime() - todayDay.getTime()) / MS_DAY);

  return {
    totalDays,
    daysUsed,
    daysLeft,
    startDate: toDateString(startDate),
    endDate: toDateString(endDate),
  };
}

/** @param {object} gym admin list/detail gym row */
export function getGymTrialProgress(gym) {
  if (!isGymOnTrial(gym)) return null;
  const start =
    gym.saas_start_date ||
    gym.saasStartDate ||
    gym.saas_subscription?.start_date ||
    null;
  const end =
    gym.saas_end_date || gym.saasEndDate || gym.saas_subscription?.end_date || null;
  return getTrialProgress({ startDate: start, endDate: end });
}
