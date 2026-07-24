// src/layouts/OwnerLayout.jsx
import React, { useState, useMemo } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useGym } from '../context/GymContext';
import { isGymOwner, isGymStaff } from '../utils/roles';
import { shellHeader, shellPage, sidebarSurface, sidebarNavIdle, sidebarNavActive, overlayBackdrop } from '../utils/surfaceClasses';
import { LayoutDashboard, Users, Dumbbell, Menu, X, Bell, AlertTriangle, AlertCircle, Info, RefreshCw, DollarSign, FileBarChart, ShieldAlert, UserCog, ScrollText, MapPin, MessageSquare } from 'lucide-react';
import FlashBanner from '../components/FlashBanner';
import OfflineStatusBar from '../components/OfflineStatusBar';
import UserProfileMenu from '../components/UserProfileMenu';
import LanguageSwitcher from '../components/LanguageSwitcher';
import BranchSwitcher from '../components/BranchSwitcher';
import BrandLogo from '../components/BrandLogo';
import { SlidePanel, SlidePanelEmpty } from '../components/SlidePanel';
import { localizeNotification } from '../utils/notificationText';

export default function OwnerLayout() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { summary, flash, clearFlash, readOnly, branches, selectedBranchId, setSelectedBranchId, branchReadOnly, selectedBranch, gymBooting, error, fetchCoreData, loadSubscription } = useGym();
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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState([]);
  const [readIds, setReadIds] = useState([]);

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

  const renderNavLink = (item, onNavigate) => {
    const Icon = item.icon;
    const active = location.pathname === item.path;
    const showDueSoonBadge = item.nameKey === 'nav.members' && dueSoonCount > 0;
    const showExpiredBadge = item.nameKey === 'nav.members' && expiredCount > 0;
    const showUnpaidBadge = item.nameKey === 'nav.members' && unpaidCount > 0;
    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={onNavigate}
        className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors sm:py-2.5 ${
          active ? sidebarNavActive : sidebarNavIdle
        }`}
      >
        <Icon className="h-5 w-5" />
        {t(item.nameKey)}
        <span className="ml-auto flex items-center gap-1">
          {showDueSoonBadge && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              active ? 'bg-white/20 text-white' : 'bg-amber-500 text-white'
            }`}>
              {dueSoonCount}
            </span>
          )}
          {showExpiredBadge && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              active ? 'bg-white/20 text-white' : 'bg-rose-500 text-white'
            }`}>
              {expiredCount}
            </span>
          )}
          {showUnpaidBadge && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              active ? 'bg-white/20 text-white' : 'bg-amber-500 text-white'
            }`}>
              {unpaidCount}
            </span>
          )}
        </span>
      </Link>
    );
  };

  return (
    <div className={shellPage}>
      <header className={`safe-top sticky top-0 z-40 flex h-14 min-h-[3.5rem] items-center justify-between px-4 lg:hidden ${shellHeader}`}>
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="-ml-1 rounded-lg p-2.5 text-slate-600 focus:outline-none active:bg-slate-100 dark:text-app-text dark:active:bg-app-raised"
          aria-label={t('common.openMenu')}
        >
          <Menu className="h-6 w-6" />
        </button>
        <BrandLogo className="justify-self-center" />
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setNotificationsOpen(true)}
            className="relative rounded-lg p-2.5 text-slate-400 active:bg-slate-100 active:text-slate-600 dark:active:bg-app-raised"
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

      {ownerAccount && branches.length > 0 && (
        <div className={`border-b px-4 py-2.5 lg:hidden ${shellHeader}`}>
          <BranchSwitcher
            branches={branches}
            selectedBranchId={selectedBranchId}
            onChange={setSelectedBranchId}
            className="w-full"
          />
        </div>
      )}

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className={`fixed inset-0 ${overlayBackdrop}`} onClick={() => setSidebarOpen(false)} />
          <div className={`relative flex w-full max-w-xs flex-col p-6 animate-in slide-in-from-left duration-200 ${sidebarSurface}`}>
            <button onClick={() => setSidebarOpen(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-200 dark:text-app-muted dark:hover:text-app-text-strong">
              <X className="h-6 w-6" />
            </button>
            <div className="mb-7 mt-1">
              <BrandLogo />
            </div>
            <nav className="flex-1 space-y-1">
              {menuItems.map((item) => renderNavLink(item, () => setSidebarOpen(false)))}
            </nav>
          </div>
        </div>
      )}

      <aside className={`fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 p-6 lg:flex ${sidebarSurface}`}>
        <div className="mb-7">
          <BrandLogo />
        </div>
        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => renderNavLink(item, undefined))}
        </nav>
      </aside>

      <div className="lg:pl-64">
        {gymBooting && (
          <div className="sticky top-0 z-20 h-0.5 overflow-hidden bg-slate-200 dark:bg-app-border-subtle">
            <div className="app-boot-bar h-full w-1/3 bg-teal-600" />
          </div>
        )}
        <div className={`sticky top-0 z-10 hidden h-16 items-center justify-between px-8 lg:flex ${shellHeader}`}>
          <div className="flex items-center gap-3">
            {staffBranchLabel && !ownerAccount && (
              <span className="hidden text-sm font-medium text-slate-600 dark:text-app-text sm:inline">
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
              className="relative rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-app-raised dark:hover:text-app-text"
              aria-label={t('common.notifications')}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 border-white bg-rose-500 text-[10px] font-bold text-white dark:border-slate-900">
                  {unreadCount}
                </span>
              )}
            </button>
            <LanguageSwitcher />
            <div className="h-8 w-px bg-slate-200 dark:bg-app-border-subtle" />
            <UserProfileMenu />
          </div>
        </div>

        <main className="safe-bottom app-page p-4 sm:p-6 lg:p-8">
          <OfflineStatusBar />
          {error && (
            <div className="mb-6 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300 sm:flex-row sm:items-center sm:justify-between">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => {
                  loadSubscription().then((sub) => {
                    if (!sub?.accessDenied) fetchCoreData();
                  });
                }}
                className="shrink-0 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
              >
                {t('common.retry')}
              </button>
            </div>
          )}
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
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-app-border-subtle dark:bg-app-surface/70 dark:text-app-text">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 dark:text-app-muted" />
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
              const localized = localizeNotification(n, t, {
                showBranchLabel: selectedBranchId === 'all',
              });
              return (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`relative flex cursor-pointer gap-3 rounded-xl border p-4 transition-all ${
                    !isRead ? 'border-teal-100 bg-teal-50/30 dark:border-teal-900 dark:bg-teal-950/30' : 'border-slate-100 bg-white dark:border-app-border-subtle dark:bg-app-raised'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-white dark:bg-app-surface ${
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
                      <span className="text-sm font-bold text-slate-900 dark:text-app-text-strong">{localized.title}</span>
                      <span className="shrink-0 text-[10px] text-slate-400 dark:text-app-muted">{localized.date}</span>
                    </div>
                    {selectedBranchId === 'all' && n.branchName && (
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        {n.branchName}
                      </span>
                    )}
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-app-text">{localized.message}</p>

                    {n.memberId && !readOnly && n.suggestedAction === 'payment' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openMemberFromNotification(n, 'payment');
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-600 hover:text-amber-800"
                      >
                        <DollarSign className="h-3 w-3" /> {t('notifications.collectPayment')}
                      </button>
                    )}
                    {n.memberId && !readOnly && n.suggestedAction === 'renew' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openMemberFromNotification(n, 'renew');
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 hover:text-emerald-800"
                      >
                        <RefreshCw className="h-3 w-3" /> {t('notifications.renewNow')}
                      </button>
                    )}
                    {n.memberId && n.type === 'info' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openMemberFromNotification(n, 'view');
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-teal-700 hover:text-teal-800"
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
                    className="absolute right-3 top-3 rounded-md p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-app-surface/80 dark:hover:text-slate-200"
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

      <FlashBanner message={flash} onDismiss={clearFlash} />
    </div>
  );
}
