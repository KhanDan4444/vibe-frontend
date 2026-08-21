import { formatMoney } from '../utils/formatMoney';
import { formatDisplayDate } from '../utils/date';
import { formatPlanDisplayName } from '../utils/formatPlanDisplayName';

/**
 * Scannable amount hint: bold suggested total + muted one-line explanation.
 * Works for member change-plan and admin SaaS change-plan.
 */
export default function ChangePlanAmountHint({
  upgradeHint,
  amountEdited,
  selectedPlan,
  currentPlan,
  endDate,
  member,
  t,
  onUseSuggested,
  license = false,
}) {
  const paidThrough = endDate ?? member?.endDate;

  if (!upgradeHint) {
    return (
      <p className="mt-1 text-xs text-app-muted">
        {t(license ? 'modals.changeSaasPlan.paymentCollectedHint' : 'modals.changePlan.amountCollectedHint')}
      </p>
    );
  }

  let detail = null;
  if (upgradeHint.freshTerm) {
    detail = t(
      license ? 'modals.changeSaasPlan.suggestedFreshTermDetail' : 'modals.changePlan.suggestedFreshTermDetail',
      {
        planName: formatPlanDisplayName(selectedPlan?.name) || t('modals.billing.newPlanFallback'),
        paidThrough: formatDisplayDate(paidThrough),
      }
    );
  } else if (upgradeHint.prePayment) {
    detail = t('modals.changePlan.suggestedPrePaymentDetail', {
      planName: formatPlanDisplayName(selectedPlan?.name) || t('modals.billing.newPlanFallback'),
    });
  } else if (upgradeHint.isDowngrade) {
    detail = t(
      license ? 'modals.changeSaasPlan.suggestedDowngradeDetail' : 'modals.changePlan.suggestedDowngradeDetail',
      {
        endDate: formatDisplayDate(paidThrough),
        planName: formatPlanDisplayName(currentPlan?.name) || '—',
      }
    );
  } else {
    detail = t('modals.changePlan.suggestedUpgradeDetail', {
      credit: formatMoney(upgradeHint.credit),
      days: upgradeHint.remainingDays,
      dayLabel: t(upgradeHint.remainingDays === 1 ? 'modals.billing.day' : 'modals.billing.days'),
      planName: formatPlanDisplayName(currentPlan?.name) || '—',
    });
  }

  return (
    <div className="mt-1.5 space-y-1">
      <p className="text-sm font-semibold text-app-text-strong">
        {t('modals.billing.suggestedAmountOnly', { amount: formatMoney(upgradeHint.suggestedAmount) })}
      </p>
      <p className="text-xs leading-relaxed text-app-muted">{detail}</p>
      {!amountEdited && !upgradeHint.isDowngrade ? (
        <p className="text-xs text-app-muted">{t('modals.billing.suggestedUpgradeAdjust')}</p>
      ) : null}
      {amountEdited ? (
        <button
          type="button"
          onClick={onUseSuggested}
          className="text-xs font-medium text-teal-800/80 hover:text-teal-700 dark:text-teal-500/80 dark:hover:text-teal-400"
        >
          {t('modals.billing.useSuggestedAmount', {
            amount: formatMoney(upgradeHint.suggestedAmount),
          })}
        </button>
      ) : null}
    </div>
  );
}
