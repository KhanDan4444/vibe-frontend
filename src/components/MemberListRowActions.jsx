import React, { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, ArrowLeftRight, Edit, Trash2, RefreshCw, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DISPLAY_STATUS } from '../utils/memberStatus';
import { canRenewMember, canChangePlan } from '../utils/memberRenew';
import { iconActionIdle, iconActionDanger, renewActionBtn, collectActionBtn } from '../utils/surfaceClasses';

function MoreMenu({ items }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuWidth = 168;
      const left = Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8);
      const openUp = rect.bottom + 160 > window.innerHeight;
      setMenuPos({
        top: openUp ? undefined : rect.bottom + 4,
        bottom: openUp ? window.innerHeight - rect.top + 4 : undefined,
        left: Math.max(8, left),
      });
    };
    place();
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open]);

  if (!items.length) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        className={iconActionIdle}
        aria-label={t('common.moreActions')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && menuPos ? (
        <div
          role="menu"
          style={{
            position: 'fixed',
            top: menuPos.top,
            bottom: menuPos.bottom,
            left: menuPos.left,
            width: 168,
          }}
          className="z-50 overflow-hidden rounded-lg border border-app-border bg-app-raised py-1 shadow-lg shadow-black/25"
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-app-surface ${
                item.danger ? 'text-[color:var(--color-status-expired)]' : 'text-app-text'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                item.onClick();
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Primary CTAs stay visible on at-risk rows; edit / change-plan / delete tuck into ⋯.
 * Active rows keep quiet icon actions.
 */
export default function MemberListRowActions({
  member,
  plans,
  readOnly,
  canDeleteMembers,
  onRenew,
  onCollect,
  onChangePlan,
  onEdit,
  onDelete,
}) {
  const { t } = useTranslation();
  if (readOnly) return null;

  const showRenew = canRenewMember(member);
  const showCollect = Boolean(member.isUnpaid);
  const atRisk = showRenew || showCollect;
  const canSwitchPlan = canChangePlan(member) && plans.some((p) => p.id !== member.planId);

  const secondaryItems = [];
  if (canSwitchPlan) {
    secondaryItems.push({
      key: 'change-plan',
      label: t('actions.changePlan'),
      icon: <ArrowLeftRight className="h-4 w-4 shrink-0" />,
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
      label: t('common.delete'),
      icon: <Trash2 className="h-4 w-4 shrink-0" />,
      danger: true,
      onClick: () => onDelete(member),
    });
  }

  return (
    <div className="admin-row-actions" onClick={(e) => e.stopPropagation()}>
      {showRenew ? (
        <button
          type="button"
          onClick={() => onRenew(member)}
          className={renewActionBtn}
          title={t('actions.renew')}
        >
          <RefreshCw className="h-3 w-3" /> {t('actions.renew')}
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
      {atRisk ? (
        <MoreMenu items={secondaryItems} />
      ) : (
        <>
          {canSwitchPlan ? (
            <button
              type="button"
              onClick={() => onChangePlan(member)}
              className={iconActionIdle}
              title={t('actions.changePlan')}
            >
              <ArrowLeftRight className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onEdit(member)}
            className={iconActionIdle}
            title={t('common.edit')}
          >
            <Edit className="h-4 w-4" />
          </button>
          {canDeleteMembers ? (
            <button
              type="button"
              onClick={() => onDelete(member)}
              className={iconActionDanger}
              title={t('common.delete')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

/** Row tint + left edge for unpaid / expired / due soon. */
export function memberAttentionRowClass(member, idleHoverClass = '') {
  if (member.isUnpaid) return 'admin-row-unpaid';
  if (member.status === DISPLAY_STATUS.EXPIRED) return 'admin-row-expired';
  if (member.status === DISPLAY_STATUS.DUE_SOON) return 'admin-row-due-soon';
  return idleHoverClass;
}
