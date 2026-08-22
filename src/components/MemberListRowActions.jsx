import { Layers, Edit, Trash2, RefreshCw, Undo2, DollarSign, PanelRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DISPLAY_STATUS } from '../utils/memberStatus';
import { canRenewMember, canChangePlan } from '../utils/memberRenew';
import { renewActionBtn, collectActionBtn, iconActionIdle } from '../utils/surfaceClasses';
import RowMoreMenu from './RowMoreMenu';

/**
 * Primary CTAs stay visible; edit / change-plan / delete tuck into ⋯.
 * Details is always shown so opening the profile is discoverable (row click remains a shortcut).
 */
export default function MemberListRowActions({
  member,
  plans,
  readOnly,
  canDeleteMembers,
  onView,
  onRenew,
  onCollect,
  onChangePlan,
  onEdit,
  onDelete,
  onRestore,
}) {
  const { t } = useTranslation();

  const detailsBtn = onView ? (
    <button
      type="button"
      onClick={() => onView(member)}
      className={`${iconActionIdle} row-icon-action`}
      title={t('table.details')}
      aria-label={t('table.details')}
    >
      <PanelRight className="h-4 w-4" />
    </button>
  ) : null;

  if (member.deletedAt) {
    return (
      <div className="admin-row-actions" onClick={(e) => e.stopPropagation()}>
        {detailsBtn}
        {onRestore ? (
          <button
            type="button"
            onClick={() => onRestore(member)}
            className={renewActionBtn}
            title={t('pages.members.restore')}
          >
            <Undo2 className="h-3.5 w-3.5" /> {t('pages.members.restore')}
          </button>
        ) : null}
      </div>
    );
  }

  if (readOnly) {
    if (!detailsBtn) return null;
    return (
      <div className="admin-row-actions" onClick={(e) => e.stopPropagation()}>
        {detailsBtn}
      </div>
    );
  }

  const showRenew = canRenewMember(member);
  const showCollect = Boolean(member.isUnpaid);
  const canSwitchPlan = canChangePlan(member) && plans.some((p) => p.id !== member.planId);

  const secondaryItems = [];
  if (canSwitchPlan) {
    secondaryItems.push({
      key: 'change-plan',
      label: t('actions.changePlan'),
      icon: <Layers className="h-4 w-4 shrink-0" />,
      onClick: () => onChangePlan(member),
    });
  }
  secondaryItems.push({
    key: 'edit',
    label: t('common.edit'),
    icon: <Edit className="h-4 w-4 shrink-0" />,
    onClick: () => onEdit(member),
  });
  if (canDeleteMembers) {
    secondaryItems.push({
      key: 'delete',
      label: t('pages.members.deleteConfirm'),
      icon: <Trash2 className="h-4 w-4 shrink-0" />,
      danger: true,
      onClick: () => onDelete(member),
    });
  }

  return (
    <div className="admin-row-actions" onClick={(e) => e.stopPropagation()}>
      {detailsBtn}
      {showRenew ? (
        <button
          type="button"
          onClick={() => onRenew(member)}
          className={renewActionBtn}
          title={t('actions.renew')}
        >
          <RefreshCw className="h-3.5 w-3.5" /> {t('actions.renew')}
        </button>
      ) : null}
      {showCollect ? (
        <button
          type="button"
          onClick={() => onCollect(member)}
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

/** Row tint + left edge for expired / due soon. */
export function memberAttentionRowClass(member, idleHoverClass = '') {
  if (member.deletedAt) return idleHoverClass;
  if (member.status === DISPLAY_STATUS.EXPIRED) return 'admin-row-expired';
  if (member.status === DISPLAY_STATUS.DUE_SOON) return 'admin-row-due-soon';
  return idleHoverClass;
}
