import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatDisplayDate } from '../utils/date';
import { paymentSourceLabel } from '../utils/paymentSources';
import { paymentsForCurrentTerm, sumPaymentAmounts } from '../utils/termPayments';

function formatMoney(n) {
  const value = Number(n);
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

export default function ChangePlanPaymentSummary({ payments, termStart, pendingAmount }) {
  const { t } = useTranslation();
  const termPayments = paymentsForCurrentTerm(payments, termStart);
  const alreadyCollected = sumPaymentAmounts(termPayments);
  const pending = Number.isFinite(Number(pendingAmount)) && Number(pendingAmount) > 0 ? Number(pendingAmount) : 0;
  const totalAfter = alreadyCollected + pending;

  if (!termStart) return null;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-app-border-subtle bg-slate-50/80 dark:bg-app-surface/40 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-app-muted mb-3">
        {t('modals.changePlan.termPaymentSummaryTitle')}
      </p>

      {termPayments.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-app-muted mb-3">
          {t('modals.changePlan.termPaymentSummaryEmpty')}
        </p>
      ) : (
        <ul className="space-y-2 mb-3">
          {termPayments.map((p) => (
            <li key={p.id} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-slate-800 dark:text-app-text">{paymentSourceLabel(p.source)}</p>
                <p className="text-xs text-slate-500 dark:text-app-muted">{formatDisplayDate(p.date)}</p>
              </div>
              <span className="font-semibold text-slate-800 dark:text-app-text shrink-0">
                {formatMoney(p.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-slate-200 dark:border-app-border-subtle pt-3 text-sm">
        <span className="font-medium text-slate-700 dark:text-app-text">
          {t('modals.changePlan.termPaymentAlreadyCollected')}
        </span>
        <span className="font-semibold text-slate-800 dark:text-app-text">{formatMoney(alreadyCollected)}</span>
      </div>

      {pending > 0 ? (
        <div className="flex items-center justify-between gap-3 pt-2 text-sm">
          <span className="font-medium text-slate-700 dark:text-app-text">
            {t('modals.changePlan.termPaymentThisChange')}
          </span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">+{formatMoney(pending)}</span>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t border-slate-200 dark:border-app-border-subtle mt-3 pt-3">
        <span className="text-sm font-bold text-slate-800 dark:text-app-text">
          {t('modals.changePlan.termPaymentTotalAfter')}
        </span>
        <span className="text-base font-bold text-teal-700 dark:text-teal-400">{formatMoney(totalAfter)}</span>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-app-muted">
        {t('modals.changePlan.termPaymentRevenueNote')}
      </p>
    </div>
  );
}
