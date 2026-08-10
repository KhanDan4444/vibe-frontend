import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  Building2,
  CreditCard,
  DollarSign,
  FileBarChart,
  LayoutDashboard,
  Menu,
  MessageSquare,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import UserProfileMenu from '../components/UserProfileMenu';
import BrandLogo from '../components/BrandLogo';
import SidebarBrandHeader from '../components/SidebarBrandHeader';
import SidebarTooltip from '../components/SidebarTooltip';
import { parseApiResponse } from '../utils/api';
import { getAdminDashboard } from '../services/gymAdminService';
import { ADMIN_SECTION_PATH, adminPathToSection } from '../utils/adminRoutes';
import {
  overlayBackdrop,
  shellHeader,
  shellPage,
  sidebarNavActive,
  sidebarNavIdle,
  sidebarSurface,
} from '../utils/surfaceClasses';
import {
  useSidebarCollapsed,
  SIDEBAR_LABEL_VISIBLE,
  SIDEBAR_LABEL_HIDDEN,
} from '../hooks/useSidebarCollapsed';

function SidebarLink({
  active,
  to,
  onClick,
  icon: Icon,
  label,
  badge,
  railCompact = false,
  labelsVisible = true,
}) {
  const className = `relative flex w-full items-center rounded-lg text-sm font-medium transition-[background-color,color,padding,gap] duration-[180ms] motion-reduce:transition-none ${
    railCompact ? 'h-11 justify-center gap-0 px-0' : 'min-h-[44px] gap-3 px-3 py-3'
  } ${active ? sidebarNavActive : sidebarNavIdle}`;

  const cornerBadge =
    badge && railCompact ? (
      <span
        className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none text-white ring-2 ring-[color:var(--color-app-sidebar)] ${
          badge.tone === 'amber' ? 'bg-amber-500' : 'bg-rose-500'
        }`}
      >
        {badge.count > 9 ? '9+' : badge.count}
      </span>
    ) : null;

  const rowBadge = badge ? (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
        labelsVisible ? `ml-auto ${SIDEBAR_LABEL_VISIBLE}` : SIDEBAR_LABEL_HIDDEN
      } ${
        active
          ? 'bg-white/20 text-white'
          : badge.tone === 'amber'
            ? 'bg-amber-500 text-white'
            : 'bg-rose-500 text-white'
      }`}
    >
      {badge.count}
    </span>
  ) : null;

  const inner = (
    <>
      <span className="relative shrink-0">
        <Icon className="h-5 w-5" />
        {cornerBadge}
      </span>
      <span className={`truncate ${labelsVisible ? SIDEBAR_LABEL_VISIBLE : SIDEBAR_LABEL_HIDDEN}`}>
        {label}
      </span>
      {rowBadge}
    </>
  );

  const control = to ? (
    <Link to={to} onClick={onClick} className={className} aria-label={railCompact ? label : undefined}>
      {inner}
    </Link>
  ) : (
    <button
      type="button"
      onClick={onClick}
      className={className}
      aria-label={railCompact ? label : undefined}
    >
      {inner}
    </button>
  );

  return (
    <SidebarTooltip label={label} enabled={railCompact}>
      {control}
    </SidebarTooltip>
  );
}

function AdminRouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-app-muted">
      Loading…
    </div>
  );
}

export default function AdminLayout() {
  const { t } = useTranslation();
  const { apiFetch } = useAuth();
  const location = useLocation();
  const adminSection = useMemo(() => adminPathToSection(location.pathname), [location.pathname]);
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
  const [unpaidCount, setUnpaidCount] = useState(0);

  const loadBadge = useCallback(async () => {
    try {
      const res = await getAdminDashboard(apiFetch);
      const data = await parseApiResponse(res);
      if (res.ok) {
        setUnpaidCount(Number(data?.unpaidCatchUpGyms ?? data?.gymCounts?.unpaid ?? 0));
      }
    } catch {
      /* badge is non-critical */
    }
  }, [apiFetch]);

  useEffect(() => {
    void loadBadge();
  }, [loadBadge, location.pathname]);

  const adminNavItems = useMemo(
    () => [
      { section: 'dashboard', to: ADMIN_SECTION_PATH.dashboard, icon: LayoutDashboard, labelKey: 'nav.dashboard' },
      { section: 'gyms', to: ADMIN_SECTION_PATH.gyms, icon: Building2, labelKey: 'nav.gyms' },
      { section: 'plans', to: ADMIN_SECTION_PATH.plans, icon: CreditCard, labelKey: 'nav.saasPlans' },
      {
        section: 'payments',
        to: ADMIN_SECTION_PATH.payments,
        icon: DollarSign,
        labelKey: 'nav.payments',
        badge: unpaidCount > 0 ? { count: unpaidCount, tone: 'amber' } : null,
      },
      { section: 'messages', to: ADMIN_SECTION_PATH.messages, icon: MessageSquare, labelKey: 'nav.smsLog' },
      { section: 'reports', to: ADMIN_SECTION_PATH.reports, icon: FileBarChart, labelKey: 'nav.reports' },
    ],
    [unpaidCount]
  );

  return (
    <div className={shellPage}>
      <header
        className={`safe-top sticky top-0 z-40 flex h-14 min-h-[3.5rem] items-center justify-between px-4 lg:hidden ${shellHeader}`}
      >
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="-ml-1 rounded-lg p-2.5 text-app-text active:bg-app-raised"
          aria-label={t('common.openMenu')}
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-0.5">
          <LanguageSwitcher compact />
          <UserProfileMenu compact />
        </div>
      </header>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className={`fixed inset-0 ${overlayBackdrop}`} onClick={() => setSidebarOpen(false)} />
          <div className={`relative flex w-full max-w-xs flex-col p-6 ${sidebarSurface}`}>
            <button type="button" onClick={() => setSidebarOpen(false)} className="absolute right-4 top-4 text-slate-400">
              <X className="h-6 w-6" />
            </button>
            <div className="mb-7 mt-1">
              <BrandLogo to="/admin/dashboard" onClick={() => setSidebarOpen(false)} />
            </div>
            <nav className="mb-auto space-y-1">
              {adminNavItems.map((item) => (
                <SidebarLink
                  key={item.section}
                  active={adminSection === item.section}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  icon={item.icon}
                  label={t(item.labelKey)}
                  badge={item.badge}
                />
              ))}
            </nav>
          </div>
        </div>
      )}

      <aside
        className={`${asideClassName} ${sidebarSurface}`}
        aria-expanded={!collapsed}
      >
        <SidebarBrandHeader
          logoTo="/admin/dashboard"
          showLabels={showLabels}
          compact={compact}
          collapsed={collapsed}
          toggleCollapsed={toggleCollapsed}
          shortcutHint={shortcutHint}
          shortcutCoachOpen={shortcutCoachOpen}
          dismissShortcutCoach={dismissShortcutCoach}
          collapseToggleRef={collapseToggleRef}
        />
        <nav className={`flex-1 ${showLabels ? 'space-y-1' : 'space-y-0.5 px-0.5'}`}>
          {adminNavItems.map((item) => (
            <SidebarLink
              key={item.section}
              active={adminSection === item.section}
              to={item.to}
              icon={item.icon}
              label={t(item.labelKey)}
              badge={item.badge}
              railCompact={compact}
              labelsVisible={showLabels}
            />
          ))}
        </nav>
      </aside>

      <div className={`transition-[padding] duration-[180ms] ease-out motion-reduce:transition-none ${contentPadClass}`}>
        <div className={`sticky top-0 z-10 hidden h-16 items-center justify-end px-8 lg:flex ${shellHeader}`}>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <UserProfileMenu />
          </div>
        </div>

        <main className="safe-bottom app-page space-y-8 p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<AdminRouteFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
