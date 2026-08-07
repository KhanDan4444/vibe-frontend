// src/layouts/OwnerLayout.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  AlertTriangle,
  AlertCircle,
  Info,
  DollarSign,
  FileBarChart,
  ShieldAlert,
  UserCog,
  ScrollText,
  MapPin,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import OfflineStatusBar from '../components/OfflineStatusBar';
import UserProfileMenu from '../components/UserProfileMenu';
import LanguageSwitcher from '../components/LanguageSwitcher';
import BranchSwitcher from '../components/BranchSwitcher';
import BrandLogo from '../components/BrandLogo';
import ErrorRetryBanner from '../components/ErrorRetryBanner';
import { SlidePanel, SlidePanelEmpty } from '../components/SlidePanel';
import { localizeNotification } from '../utils/notificationText';
import SidebarBrandHeader from '../components/SidebarBrandHeader';
import SidebarTooltip from '../components/SidebarTooltip';
import {
  useSidebarCollapsed,
  SIDEBAR_LABEL_VISIBLE,
  SIDEBAR_LABEL_HIDDEN,
} from '../hooks/useSidebarCollapsed';

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

  const menuItems = useMemo(() => {
    const items = [
      { nameKey: 'nav.dashboard', path: '/dashboard', icon: LayoutDashboard },
      { nameKey: 'nav.members', path: '/dashboard/members', icon: Users },
      { nameKey: 'nav.plans', path: '/dashboard/plans', icon: Dumbbell },
      { nameKey: 'nav.revenue', path: '/dashboard/revenue', icon: DollarSign },
      { nameKey: 'nav.reports', path: '/dashboard/reports', icon: FileBarChart },
    ];
    if (showTeamNav) {
      items.push({ nameKey: 'nav.team', path: '/dashboard/team', icon: UserCog });
    }
    if (showManagementNav) {
      items.push({ nameKey: 'nav.branches', path: '/dashboard/branches', icon: MapPin });
    }
    if (showActivityNav) {
      items.push({ nameKey: 'nav.activity', path: '/dashboard/activity', icon: ScrollText });
    }
    if (showMessagesNav) {
      items.push({ nameKey: 'nav.messages', path: '/dashboard/messages', icon: MessageSquare });
    }
    return items;
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
    setDismissedIds([...dismissedIds, id]);
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
          railCompact ? 'justify-center gap-0 px-0 py-2.5' : 'gap-3 px-3 py-2.5'
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
            className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
              labelsVisible ? `ml-auto ${SIDEBAR_LABEL_VISIBLE}` : SIDEBAR_LABEL_HIDDEN
            } ${
              active
                ? 'bg-white/15 text-white'
                : 'bg-white/[0.08] text-slate-300 ring-1 ring-white/10'
            }`}
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
              {menuItems.map((item) => renderNavLink(item, () => setSidebarOpen(false)))}
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
        <nav className={`flex-1 space-y-1 ${showLabels ? '' : 'px-0.5'}`}>
          {menuItems.map((item) =>
            renderNavLink(item, undefined, { railCompact: compact, labelsVisible: showLabels })
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
            <ErrorRetryBanner
              message={displayError}
              onRetry={async () => {
                await handleRetryBoot();
              }}
            />
          ) : null}
          {readOnly && !branchReadOnly && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-semibold">{t('alerts.readOnlyTitle')}</p>
                <p className="mt-0.5 text-amber-800 dark:text-amber-200">{t('alerts.readOnlyBody')}</p>
              </div>
            </div>
          )}
          {branchReadOnly && selectedBranch && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm text-app-text border-app-border-subtle bg-app-surface/70">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-app-muted" />
              <div>
                <p className="font-semibold">{t('alerts.branchReadOnlyTitle')}</p>
                <p className="mt-0.5">{t('alerts.branchReadOnlyBody', { name: selectedBranch.name })}</p>
              </div>
            </div>
          )}
          <Outlet />
        </main>
      </div>

      <SlidePanel
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        title={t('notifications.title')}
        subtitle={t('notifications.unread', { count: unreadCount })}
        maxWidth="max-w-md"
        zIndexClass="z-50"
        headerAction={
          unreadCount > 0 ? (
            <button
              type="button"
              onClick={markAllAsRead}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800"
            >
              {t('notifications.markAllRead')}
            </button>
          ) : null
        }
      >
        {notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((n) => {
              const isRead = readIds.includes(n.id);
              const localized = localizeNotification(n, t);
              return (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`relative flex cursor-pointer gap-3 rounded-xl border p-4 transition-all ${
                    !isRead ? 'border-teal-100 bg-teal-50/30 dark:border-teal-900 dark:bg-teal-950/30' : 'border-app-border-subtle bg-app-raised'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-app-surface ${
                      n.type === 'warning'
                        ? 'border-amber-100 text-amber-500'
                        : n.type === 'danger'
                        ? 'border-rose-100 text-rose-500'
                        : 'border-teal-100 text-teal-600'
                    }`}
                  >
                    {n.type === 'warning' && <AlertTriangle className="h-4 w-4" />}
                    {n.type === 'danger' && <AlertCircle className="h-4 w-4" />}
                    {n.type === 'info' && <Info className="h-4 w-4" />}
                  </span>

                  <div className="min-w-0 flex-1 space-y-1 pr-6">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-app-text-strong">{localized.title}</span>
                      <span className="shrink-0 text-[10px] text-app-muted">{localized.date}</span>
                    </div>
                    {selectedBranchId === 'all' && n.branchName && (
                      <span className="inline-flex rounded-full border border-teal-600/25 bg-teal-600/10 px-2 py-0.5 text-[10px] font-semibold text-teal-800 dark:border-teal-600/30 dark:bg-teal-600/15 dark:text-teal-300">
                        {n.branchName}
                      </span>
                    )}
                    <p className="text-xs leading-relaxed text-app-text">{localized.message}</p>

                    {n.memberId && !readOnly && n.suggestedAction === 'payment' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openMemberFromNotification(n, 'payment');
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-bold text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                      >
                        <DollarSign className="h-3.5 w-3.5" /> {t('notifications.collectPayment')}
                      </button>
                    )}
                    {n.memberId && !readOnly && n.suggestedAction === 'renew' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openMemberFromNotification(n, 'renew');
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-bold text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> {t('notifications.renewNow')}
                      </button>
                    )}
                    {n.memberId && n.type === 'info' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openMemberFromNotification(n, 'view');
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-bold text-teal-700 hover:text-teal-800 dark:text-teal-300 dark:hover:text-teal-200"
                      >
                        {t('notifications.viewMember')}
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(n.id);
                    }}
                    className="absolute right-3 top-3 rounded-md p-1 text-app-muted/40 hover:bg-app-surface/80 hover:text-app-text"
                    aria-label={t('notifications.dismiss')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <SlidePanelEmpty>{t('notifications.empty')}</SlidePanelEmpty>
        )}
      </SlidePanel>

    </div>
  );
}
