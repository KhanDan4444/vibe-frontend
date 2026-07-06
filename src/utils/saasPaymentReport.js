import {
  PERIOD_PRESETS,
  filterPaymentsByPeriod,
  summarizePayments,
  periodTrendPercent,
  downloadCsv,
} from './paymentReport';
import { formatDisplayDate } from './date';
import { paymentSourceLabel } from './paymentSources';
import { exportColumn, translatePaymentMethod } from '../i18n/helpers';

export { PERIOD_PRESETS, downloadCsv };

export function gymHasPaymentForCurrentTerm(gym, payments) {
  const termStart = gym.saas_start_date || gym.saasStartDate;
  if (!termStart) return false;
  const start = String(termStart).split('T')[0];
  const gymId = gym.id;
  return payments.some((p) => {
    const pid = p.gym_id ?? p.gymId;
    const coverageStart = p.coverage_start_date ?? p.coverageStartDate;
    if (pid === gymId && coverageStart) {
      return String(coverageStart).split('T')[0] === start;
    }
    const payDate = p.date ? String(p.date).split('T')[0] : '';
    return pid === gymId && payDate && payDate >= start;
  });
}

export function gymNeedsCatchUpPayment(gym, payments) {
  return (
    gym.subscription_status?.toLowerCase() === 'active' &&
    !gymHasPaymentForCurrentTerm(gym, payments)
  );
}

export function countGymsNeedingCatchUpPayment(gyms, payments) {
  return gyms.filter((g) => gymNeedsCatchUpPayment(g, payments)).length;
}

export function filterSaasPaymentsByPeriod(payments, preset, customStart, customEnd) {
  const normalized = payments.map((p) => ({
    id: p.id,
    date: p.date ? String(p.date).split('T')[0] : '',
    amount: Number(p.amount),
    method: p.method,
    gymId: p.gym_id ?? p.gymId,
    gymName: p.gym_name ?? p.gymName,
    planName: p.plan_name ?? p.planName,
    coverageStartDate: p.coverage_start_date ?? p.coverageStartDate,
    notes: p.notes,
    source: p.source || 'collect',
  }));
  return filterPaymentsByPeriod(normalized, preset, customStart, customEnd);
}

export function summarizeSaasPayments(payments) {
  return summarizePayments(payments);
}

export function saasPeriodTrendPercent(payments, preset, customStart, customEnd) {
  const normalized = payments.map((p) => ({
    date: p.date ? String(p.date).split('T')[0] : '',
    amount: Number(p.amount),
  }));
  return periodTrendPercent(normalized, preset, customStart, customEnd);
}

export function saasPaymentsToCsv(payments) {
  const cols = ['date', 'gym', 'amount', 'source', 'method', 'plan', 'notes'];
  const header = cols.map(exportColumn).join(',');
  const rows = payments.map((p) => {
    const gym = `"${(p.gymName || p.gym_name || '').replace(/"/g, '""')}"`;
    const plan = p.planName || p.plan_name || '';
    const notes = (p.notes || '').replace(/"/g, '""');
    const source = paymentSourceLabel(p.source);
    const method = translatePaymentMethod(p.method) || p.method || '';
    return `${formatDisplayDate(p.date)},${gym},${Number(p.amount).toFixed(2)},${source},${method},${plan},"${notes}"`;
  });
  return [header, ...rows].join('\n');
}
