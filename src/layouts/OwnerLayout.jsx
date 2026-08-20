// src/layouts/OwnerLayout.jsx
import React, { Suspense, useState, useMemo, useRef, useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useGym } from '../context/GymContext';
import { isGymOwner, isGymStaff } from '../utils/roles';
import { shellHeader, shellPage, sidebarSurface, sidebarNavIdle, sidebarNavActive, overlayBackdrop } from '../utils/surfaceClasses';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Menu,
  X,
  Bell,
  DollarSign,
  FileBarChart,
  ShieldAlert,
  UserCog,
  ScrollText,
  MapPin,
  MessageSquare,
  CheckCircle2,
  ClipboardCheck,
} from 'lucide-react';
import OfflineStatusBar from '../components/OfflineStatusBar';
import UserProfileMenu from '../components/UserProfileMenu';
import LanguageSwitcher from '../components/LanguageSwitcher';
import BranchSwitcher from '../components/BranchSwitcher';
import BrandLogo from '../components/BrandLogo';
import ErrorRetryBanner from '../components/ErrorRetryBanner';
import { SlidePanel } from '../components/SlidePanel';
import NotificationInbox from '../components/NotificationInbox';
import SidebarBrandHeader from '../components/SidebarBrandHeader';
import SidebarTooltip from '../components/SidebarTooltip';
import {
  useSidebarCollapsed,
  SIDEBAR_LABEL_VISIBLE,
  SIDEBAR_LABEL_HIDDEN,
} from '../hooks/useSidebarCollapsed';

function OwnerRouteFallback() {
  return (
    <div className="flex items-center justify-center py-10 text-sm text-app-muted" aria-busy="true">
      Loading…
    </div>
  );
}

export default function OwnerLayout() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { summary, readOnly, branches, selectedBranchId, setSelectedBranchId, branchReadOnly, selectedBranch, gymBooting, error, fetchCoreData, loadSubscription } = useGym();
  const navigate = useNavigate();
  const location = useLocation();
  const ownerAccount = isGymOwner(user?.role);
  const showManagementNav = ownerAccount;
  const showTeamNav = ownerAccount;
  const showActivityNav = ownerAccount;
  const showMessagesNav = ownerAccount;
  const staffBranchLabel = useMemo(() => {
    if (!isGymStaff(user?.role) || !user?.branch_id) return null;
    return branches.find((b) => b.id === user.branch_id)?.name || user?.branch_name || null;
  }, [user, branches]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    collapsed,
    toggleCollapsed,
    showLabels,
    compact,
    asideClassName,
    contentPadClass,
    shortcutHint,
    shortcutCoachOpen,
    dismissShortcutCoach,
    collapseToggleRef,
  } = useSidebarCollapsed();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState([]);
  const [readIds, setReadIds] = useState([]);
  const [retrying, setRetrying] = useState(false);
  const lastErrorRef = useRef(error);

  useEffect(() => {
    if (error) lastErrorRef.current = error;
  }, [error]);

  const displayError = error || (retrying ? lastErrorRef.current : null);

  const handleRetryBoot = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      const sub = await loadSubscription();
      if (!sub?.accessDenied) await fetchCoreData();
    } catch (err) {
      if (!err?.message) return;
      lastErrorRef.current = err.message;
    } finally {
      setRetrying(false);
    }
  };

  const dueSoonCount = summary.dueSoonMembers ?? 0;
  const expiredCount = summary.expiredMembers ?? 0;
  const unpaidCount = summary.unpaidCount ?? 0;

  const notifications = useMemo(
    () => (summary.notifications || []).filter((n) => !dismissedIds.includes(n.id)),
    [summary.notifications, dismissedIds]
  );

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  const menuSections = useMemo(() => {
    const primary = [
      { nameKey: 'nav.dashboard', path: '/dashboard', icon: LayoutDashboard },
      { nameKey: 'nav.members', path: '/dashboard/members', icon: Users },
      { nameKey: 'nav.checkIn', path: '/dashboard/check-in', icon: ClipboardCheck },
      { nameKey: 'nav.revenue', path: '/dashboard/revenue', icon: DollarSign },
    ];

    const manage = [{ nameKey: 'nav.plans', path: '/dashboard/plans', icon: Dumbbell }];
    if (showTeamNav) {
      manage.push({ nameKey: 'nav.team', path: '/dashboard/team', icon: UserCog });
    }
    if (showManagementNav) {
      manage.push({ nameKey: 'nav.branches', path: '/dashboard/branches', icon: MapPin });
    }

    const insights = [{ nameKey: 'nav.reports', path: '/dashboard/reports', icon: FileBarChart }];
    if (showActivityNav) {
      insights.push({ nameKey: 'nav.activity', path: '/dashboard/activity', icon: ScrollText });
    }
    if (showMessagesNav) {
      insights.push({ nameKey: 'nav.messages', path: '/dashboard/messages', icon: MessageSquare });
    }

    return [
      { id: 'primary', labelKey: null, items: primary },
      { id: 'manage', labelKey: 'nav.sectionManage', items: manage },
      { id: 'insights', labelKey: 'nav.sectionInsights', items: insights },
    ].filter((section) => section.items.length > 0);
  }, [showManagementNav, showTeamNav, showActivityNav, showMessagesNav]);

  const markAllAsRead = () => {
    setReadIds([...new Set([...readIds, ...notifications.map((n) => n.id)])]);
  };

  const markAsRead = (id) => {
    if (!readIds.includes(id)) {
      setReadIds([...readIds, id]);
    }
  };

  const deleteNotification = (id) => {
    setDismissedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const openMemberFromNotification = (notification, action) => {
    markAsRead(notification.id);
    setNotificationsOpen(false);
    if (notification.memberId) {
      navigate('/dashboard/members', { state: { memberId: notification.memberId, action } });
    }
  };

  const renderNavLink = (item, onNavigate, { railCompact = false, labelsVisible = true } = {}) => {
    const Icon = item.icon;
    const active = location.pathname === item.path;
    const label = t(item.nameKey);
    const showAttentionBadge = item.nameKey === 'nav.members' && (dueSoonCount + expiredCount + unpaidCount) > 0;
    const attentionTotal = dueSoonCount + expiredCount + unpaidCount;
    const link = (
      <Link
        to={item.path}
        onClick={onNavigate}
        aria-label={railCompact ? label : undefined}
        className={`relative flex items-center rounded-lg text-sm font-medium transition-[background-color,color,padding,gap] duration-[180ms] motion-reduce:transition-none ${
          railCompact ? 'h-11 w-full justify-center gap-0 px-0' : 'gap-3 px-3 py-2.5'
        } ${active ? sidebarNavActive : sidebarNavIdle}`}
      >
        <span className="relative shrink-0">
          <Icon className="h-5 w-5 opacity-90" />
          {railCompact && showAttentionBadge ? (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-[color:var(--color-app-sidebar)]">
              {attentionTotal > 9 ? '9+' : attentionTotal}
            </span>
          ) : null}
        </span>
        <span className={`truncate ${labelsVisible ? SIDEBAR_LABEL_VISIBLE : SIDEBAR_LABEL_HIDDEN}`}>
          {label}
        </span>
        {showAttentionBadge ? (
          <span
            className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white ${
              labelsVisible ? `ml-auto ${SIDEBAR_LABEL_VISIBLE}` : SIDEBAR_LABEL_HIDDEN
            } bg-rose-500`}
          >
            {attentionTotal}
          </span>
        ) : null}
      </Link>
    );
    return (
      <SidebarTooltip key={item.path} label={label} enabled={railCompact}>
        {link}
      </SidebarTooltip>
    );
  };

  const renderNavSection = (section, onNavigate, { railCompact = false, labelsVisible = true } = {}) => {
    const showHeading = Boolean(section.labelKey) && section.items.length >= 2;
    return (
      <div key={section.id} className={showHeading || section.labelKey ? 'pt-3 first:pt-0' : undefined}>
        {showHeading && labelsVisible ? (
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-app-muted/80">
            {t(section.labelKey)}
          </p>
        ) : null}
        {section.labelKey && railCompact && !labelsVisible ? (
          <div
            className="mx-auto mb-1.5 mt-1 h-px w-6 bg-app-border-subtle opacity-70"
            aria-hidden
          />
        ) : null}
        <div className={labelsVisible ? 'space-y-1' : 'space-y-0.5'}>
          {section.items.map((item) => renderNavLink(item, onNavigate, { railCompact, labelsVisible }))}
        </div>
      </div>
    );
  };

  return (
    <div className={shellPage}>
      <header className={`safe-top sticky top-0 z-40 flex h-14 min-h-[3.5rem] items-center gap-2 px-4 lg:hidden ${shellHeader}`}>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="-ml-1 shrink-0 rounded-lg p-2.5 focus:outline-none active:bg-app-raised text-app-text"
            aria-label={t('common.openMenu')}
          >
            <Menu className="h-6 w-6" />
          </button>
          {ownerAccount && branches.length > 0 && (
            <BranchSwitcher
              branches={branches}
              selectedBranchId={selectedBranchId}
              onChange={setSelectedBranchId}
              className="min-w-0 flex-1"
            />
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => setNotificationsOpen(true)}
            className="relative rounded-lg p-2.5 text-app-muted active:bg-app-raised active:text-app-text"
            aria-label={t('common.notifications')}
          >
            <Bell className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
          <LanguageSwitcher compact />
          <UserProfileMenu compact />
        </div>
      </header>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className={`fixed inset-0 ${overlayBackdrop}`} onClick={() => setSidebarOpen(false)} />
          <div className={`relative flex w-full max-w-xs flex-col p-6 animate-in slide-in-from-left duration-200 ${sidebarSurface}`}>
            <button onClick={() => setSidebarOpen(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-200 dark:text-app-muted dark:hover:text-app-text-strong">
              <X className="h-6 w-6" />
            </button>
            <div className="mb-7 mt-1">
              <BrandLogo to="/dashboard" onClick={() => setSidebarOpen(false)} />
            </div>
            <nav className="flex-1 space-y-1">
              {menuSections.map((section) => renderNavSection(section, () => setSidebarOpen(false)))}
            </nav>
          </div>
        </div>
      )}

      <aside
        className={`${asideClassName} ${sidebarSurface}`}
        aria-expanded={!collapsed}
      >
        <SidebarBrandHeader
          logoTo="/dashboard"
          showLabels={showLabels}
          compact={compact}
          collapsed={collapsed}
          toggleCollapsed={toggleCollapsed}
          shortcutHint={shortcutHint}
          shortcutCoachOpen={shortcutCoachOpen}
          dismissShortcutCoach={dismissShortcutCoach}
          collapseToggleRef={collapseToggleRef}
        />
        <nav className={`flex-1 ${showLabels ? 'space-y-0' : 'space-y-0 px-0.5'}`}>
          {menuSections.map((section) =>
            renderNavSection(section, undefined, { railCompact: compact, labelsVisible: showLabels })
          )}
        </nav>
      </aside>

      <div className={`transition-[padding] duration-[180ms] ease-out motion-reduce:transition-none ${contentPadClass}`}>
        {gymBooting && (
          <div className="sticky top-0 z-20 h-0.5 overflow-hidden bg-app-border-subtle">
            <div className="app-boot-bar h-full w-1/3 bg-teal-600" />
          </div>
        )}
        <div className={`sticky top-0 z-10 hidden h-16 items-center justify-between px-8 lg:flex ${shellHeader}`}>
          <div className="flex items-center gap-3">
            {staffBranchLabel && !ownerAccount && (
              <span className="hidden text-sm font-medium text-app-text sm:inline">
                {staffBranchLabel}
              </span>
            )}
            {ownerAccount && branches.length > 0 && (
              <BranchSwitcher
                branches={branches}
                selectedBranchId={selectedBranchId}
                onChange={setSelectedBranchId}
              />
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setNotificationsOpen(true)}
              className="relative rounded-full p-2 text-app-muted transition-colors hover:bg-app-raised hover:text-app-text"
              aria-label={t('common.notifications')}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 border-app-raised bg-rose-500 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
            <LanguageSwitcher />
            <div className="h-8 w-px bg-app-border-subtle" />
            <UserProfileMenu />
          </div>
        </div>

        <main className="safe-bottom app-page p-4 sm:p-6 lg:p-8">
          <OfflineStatusBar />
          {displayError ? (
            <div className="mb-6">
              <ErrorRetryBanner
                message={displayError}
                onRetry={async () => {
                  await handleRetryBoot();
                }}
              />
            </div>
          ) : null}
          {readOnly && !branchReadOnly && (
            <div className="sticky top-0 z-20 mb-6 overflow-hidden rounded-2xl border border-amber-300/70 bg-gradient-to-br from-amber-50 via-amber-50/80 to-orange-50/40 px-4 py-3.5 shadow-sm backdrop-blur-sm dark:border-amber-700/50 dark:from-amber-950/80 dark:via-amber-950/70 dark:to-orange-950/50 dark:shadow-none">
              <div className="absolute bottom-2.5 left-0 top-2.5 w-1 rounded-full bg-amber-500 dark:bg-amber-400" aria-hidden />
              <div className="flex items-start gap-3 pl-2">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-300/80 bg-amber-100/80 dark:border-amber-700/60 dark:bg-amber-900/50">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-200/70 dark:bg-amber-800/60">
                    <ShieldAlert className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                  </div>
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-amber-700 dark:text-amber-400">
                    {t('alerts.readOnlyEyebrow')}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold tracking-tight text-amber-950 dark:text-amber-50">
                    {t('alerts.readOnlyTitle')}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-amber-900/80 dark:text-amber-100/80">
                    {t('alerts.readOnlyBody')}
                  </p>
                </div>
              </div>
            </div>
          )}
          {branchReadOnly && selectedBranch && (
            <div className="relative mb-6 overflow-hidden rounded-2xl border border-app-border-subtle bg-app-surface/80 px-4 py-3.5">
              <div className="absolute bottom-2.5 left-0 top-2.5 w-1 rounded-full bg-app-muted/50" aria-hidden />
              <div className="flex items-start gap-3 pl-2">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-app-border-subtle bg-app-bg">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-app-surface">
                    <MapPin className="h-4 w-4 text-app-muted" />
                  </div>
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm font-semibold tracking-tight text-app-text">{t('alerts.branchReadOnlyTitle')}</p>
                  <p className="mt-1 text-sm leading-relaxed text-app-muted">
                    {t('alerts.branchReadOnlyBody', { name: selectedBranch.name })}
                  </p>
                </div>
              </div>
            </div>
          )}
          <Suspense fallback={<OwnerRouteFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <SlidePanel
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        title={t('notifications.title')}
        subtitle={
          unreadCount > 0
            ? t('notifications.unread', { count: unreadCount })
            : t('notifications.caughtUp')
        }
        maxWidth="max-w-md"
        zIndexClass="z-50"
        bodyClassName={notifications.length > 0 ? '!px-0 !pt-2' : undefined}
        headerAction={
          unreadCount > 0 ? (
            <button
              type="button"
              onClick={markAllAsRead}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 dark:text-teal-300"
            >
              {t('notifications.markAllRead')}
            </button>
          ) : null
        }
      >
        {notifications.length > 0 ? (
          <NotificationInbox
            notifications={notifications}
            isRead={(id) => readIds.includes(id)}
            readOnly={readOnly}
            showBranchBadge={selectedBranchId === 'all'}
            onOpen={(n) => openMemberFromNotification(n, 'view')}
            onAction={(n, action) => openMemberFromNotification(n, action)}
            onDismiss={deleteNotification}
          />
        ) : (
          <div className="flex flex-col items-center gap-3 py-12 text-app-muted">
            <CheckCircle2 className="h-10 w-10 text-teal-500/40" strokeWidth={1.5} />
            <p className="text-sm font-medium">{t('notifications.caughtUp')}</p>
            <p className="text-xs">{t('notifications.empty')}</p>
          </div>
        )}
      </SlidePanel>

    </div>
  );
}
