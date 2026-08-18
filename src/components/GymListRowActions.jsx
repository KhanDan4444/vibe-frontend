import { ArrowLeftRight, Edit, Trash2, RefreshCw, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { canRenewGym, canChangeSaasPlan } from '../utils/saasRenew';
import { renewActionBtn, collectActionBtn } from '../utils/surfaceClasses';
import RowMoreMenu from './RowMoreMenu';

/** Primary renew/collect stay visible; edit / change-plan / delete go in ⋯. */
export default function GymListRowActions({
  gym,
  saasPlans = [],
  onCollect,
  onChangePlan,
  onRenew,
  onEdit,
  onDelete,
  onRestore,
}) {
  const { t } = useTranslation();
  const isFormer = Boolean(gym.deletedAt || gym.deleted_at);

  if (isFormer) {
    if (!onRestore) return null;
    return (
      <div className="admin-row-actions" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onRestore(gym)}
          className={renewActionBtn}
          title={t('admin.restoreGym')}
        >
          <RefreshCw className="h-3.5 w-3.5" /> {t('admin.restoreGym')}
        </button>
      </div>
    );
  }

  const showCollect =
    Boolean(gym.isUnpaid) &&
    gym.subscription_status?.toLowerCase() === 'active' &&
    !canRenewGym(gym);
  const showRenew = canRenewGym(gym);
  const canSwitch =
    canChangeSaasPlan(gym) && saasPlans.some((p) => p.id !== gym.saas_plan_id);

  const secondaryItems = [];
  if (canSwitch) {
    secondaryItems.push({
      key: 'change-plan',
      label: t('admin.changeSaasPlanTitle'),
      icon: <ArrowLeftRight className="h-4 w-4 shrink-0" />,
      onClick: () => onChangePlan(gym),
    });
  }
  secondaryItems.push({
    key: 'edit',
    label: t('common.edit'),
    icon: <Edit className="h-4 w-4 shrink-0" />,
    onClick: () => onEdit(gym),
  });
  secondaryItems.push({
    key: 'delete',
    label: t('admin.deleteGymConfirm'),
    icon: <Trash2 className="h-4 w-4 shrink-0" />,
    danger: true,
    onClick: () => onDelete(gym),
  });

  return (
    <div className="admin-row-actions" onClick={(e) => e.stopPropagation()}>
      {showRenew ? (
        <button
          type="button"
          onClick={() => onRenew(gym)}
          className={renewActionBtn}
          title={t('admin.renewLicenseTitle')}
        >
          <RefreshCw className="h-3.5 w-3.5" /> {t('actions.renew')}
        </button>
      ) : null}
      {showCollect ? (
        <button
          type="button"
          onClick={() => onCollect(gym)}
          className={collectActionBtn}
          title={t('actions.collectPayment')}
        >
          <DollarSign className="h-3 w-3" /> {t('actions.collect')}
        </button>
      ) : null}
      <RowMoreMenu items={secondaryItems} />
    </div>
  );
}
