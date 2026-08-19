import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  RefreshCw,
  Wallet,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  groupNotifications,
  localizeNotification,
  notificationKind,
  stackNotificationGroups,
  stackPreview,
  stackTitle,
} from '../utils/notificationText';

function kindIcon(kind, type) {
  if (kind === 'unpaid') return Wallet;
  if (kind === 'due_soon') return Clock;
  if (kind === 'expired') return AlertCircle;
  if (kind === 'payment_recorded') return CheckCircle2;
  if (type === 'danger') return AlertCircle;
  if (type === 'warning') return Clock;
  return CheckCircle2;
}

function kindTone(kind, type) {
  if (kind === 'unpaid') {
    return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
  }
  if (kind === 'due_soon') {
    return 'bg-sky-500/10 text-sky-600 dark:text-sky-400';
  }
  if (kind === 'expired' || type === 'danger') {
    return 'bg-rose-500/10 text-rose-500 dark:text-rose-400';
  }
  if (type === 'warning') {
    return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
  }
  return 'bg-teal-600/10 text-teal-700 dark:text-teal-300';
}

function actionClass(action) {
  if (action === 'payment') {
    return 'text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300';
  }
  if (action === 'renew') {
    return 'text-teal-700 hover:text-teal-900 dark:text-teal-300 dark:hover:text-teal-200';
  }
  return 'text-teal-700 hover:text-teal-900 dark:text-teal-300 dark:hover:text-teal-200';
}

function NotificationRow({
  item,
  isRead,
  readOnly,
  showBranchBadge,
  nested,
  onOpen,
  onAction,
  onDismiss,
}) {
  const { t } = useTranslation();
  const localized = localizeNotification(item, t);
  const kind = notificationKind(item);
  const Icon = kindIcon(kind, item.type);
  const action =
    item.memberId && (item.suggestedAction === 'payment' || item.suggestedAction === 'renew') && !readOnly
      ? item.suggestedAction
      : null;
  const ActionIcon = action === 'payment' ? CreditCard : RefreshCw;

  return (
    <div
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          onDismiss(item.id);
        }
      }}
      className={`group relative flex gap-3 py-3.5 outline-none focus-visible:ring-1 focus-visible:ring-teal-500/40 ${nested ? 'px-4 pl-14 sm:px-6 sm:pl-16' : 'px-4 sm:px-6'} ${
        !isRead ? 'bg-teal-600/5' : ''
      }`}
    >
      {!isRead ? (
        <span className="absolute bottom-3.5 left-0 top-3.5 w-0.5 rounded-full bg-teal-600" aria-hidden />
      ) : null}

      {nested ? null : (
        <span
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${kindTone(kind, item.type)}`}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <button type="button" onClick={() => onOpen(item)} className="block w-full text-left">
          {nested || !localized.eyebrow ? null : (
            <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-app-muted">
              {localized.eyebrow}
            </p>
          )}
          <div className={`${nested || !localized.eyebrow ? '' : 'mt-0.5'} flex items-center gap-1.5`}>
            <span className={`truncate text-[15px] tracking-tight text-app-text-strong ${isRead ? 'font-semibold' : 'font-bold'}`}>
              {localized.title}
            </span>
          </div>
          {showBranchBadge && item.branchName ? (
            <span className="mt-1 inline-flex rounded-full border border-teal-600/20 bg-teal-600/10 px-2 py-0.5 text-[10px] font-semibold text-teal-800 dark:text-teal-300">
              {item.branchName}
            </span>
          ) : null}
          <p className="mt-0.5 text-[13px] leading-5 text-app-muted">{localized.message}</p>
        </button>
        {action ? (
          <button
            type="button"
            className={`mt-1.5 inline-flex min-h-9 items-center gap-1 text-[13px] font-semibold ${actionClass(action)}`}
            onClick={() => onAction(item, action)}
          >
            <ActionIcon className="h-3.5 w-3.5" />
            {action === 'payment' ? t('notifications.collectPayment') : t('notifications.renewNow')}
            <ChevronRight className="h-3.5 w-3.5 opacity-70" />
          </button>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2 pt-0.5">
        {localized.date ? (
          <span className="text-[11px] text-app-muted">{localized.date}</span>
        ) : null}
        <div className="flex items-center gap-0.5">
          {!action && item.memberId ? (
            <ChevronRight className="h-4 w-4 text-app-muted/50" aria-hidden />
          ) : null}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(item.id);
            }}
            className="rounded-md p-1 text-app-muted/35 opacity-100 transition-colors hover:bg-app-surface hover:text-app-text sm:opacity-0 sm:group-hover:opacity-100"
            aria-label={t('notifications.dismiss')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function KindStack({
  group,
  expanded,
  onToggle,
  isRead,
  readOnly,
  showBranchBadge,
  onOpen,
  onAction,
  onDismiss,
}) {
  const { t } = useTranslation();
  const stacked = group.items.length > 1;
  if (!stacked) {
    const item = group.items[0];
    return (
      <NotificationRow
        item={item}
        isRead={isRead(item.id)}
        readOnly={readOnly}
        showBranchBadge={showBranchBadge}
        onOpen={onOpen}
        onAction={onAction}
        onDismiss={onDismiss}
      />
    );
  }

  const Icon = kindIcon(group.kind, group.items[0].type);
  const anyUnread = group.items.some((item) => !isRead(item.id));

  return (
    <div>
      <div className={`group relative flex gap-3 px-4 py-3.5 sm:px-6 ${anyUnread ? 'bg-teal-600/5' : ''}`}>
        {anyUnread ? (
          <span className="absolute bottom-3.5 left-0 top-3.5 w-0.5 rounded-full bg-teal-600" aria-hidden />
        ) : null}
        <span
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${kindTone(group.kind, group.items[0].type)}`}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
          <p className={`truncate text-[15px] tracking-tight text-app-text-strong ${anyUnread ? 'font-bold' : 'font-semibold'}`}>
            {stackTitle(group.kind, group.items.length, t)}
          </p>
          <p className="mt-0.5 truncate text-[13px] text-app-muted">{stackPreview(group.items, t)}</p>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <ChevronDown
            className={`h-4 w-4 text-app-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
            aria-hidden
          />
          <button
            type="button"
            onClick={() => group.items.forEach((item) => onDismiss(item.id))}
            className="rounded-md p-1 text-app-muted/35 opacity-100 transition-colors hover:bg-app-surface hover:text-app-text sm:opacity-0 sm:group-hover:opacity-100"
            aria-label={t('notifications.dismiss')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {expanded
        ? group.items.map((item) => (
            <NotificationRow
              key={item.id}
              item={item}
              nested
              isRead={isRead(item.id)}
              readOnly={readOnly}
              showBranchBadge={showBranchBadge}
              onOpen={onOpen}
              onAction={onAction}
              onDismiss={onDismiss}
            />
          ))
        : null}
    </div>
  );
}

export default function NotificationInbox({
  notifications,
  isRead,
  readOnly,
  showBranchBadge,
  onOpen,
  onAction,
  onDismiss,
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(() => new Set());
  const { attention, activity } = groupNotifications(notifications);
  const sections = [
    { key: 'attention', label: t('notifications.section.attention'), items: attention },
    { key: 'activity', label: t('notifications.section.activity'), items: activity },
  ].filter((section) => section.items.length > 0);
  const showHeaders = sections.length > 1;
  const uniqueBranches = new Set(notifications.map((item) => item.branchName).filter(Boolean));
  const showBadges = showBranchBadge && uniqueBranches.size > 1;

  const toggle = (key) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="divide-y divide-app-border-subtle">
      {sections.map((section) => (
        <div key={section.key}>
          {showHeaders ? (
            <p className="px-4 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.06em] text-app-muted sm:px-6">
              {section.label}
            </p>
          ) : null}
          <div className="divide-y divide-app-border-subtle">
            {stackNotificationGroups(section.items).map((group) => (
              <KindStack
                key={group.key}
                group={group}
                expanded={expanded.has(group.key)}
                onToggle={() => toggle(group.key)}
                isRead={isRead}
                readOnly={readOnly}
                showBranchBadge={showBadges}
                onOpen={onOpen}
                onAction={onAction}
                onDismiss={onDismiss}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
