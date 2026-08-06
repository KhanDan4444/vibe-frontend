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
  ShieldCheck,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import UserProfileMenu from '../components/UserProfileMenu';
import BrandLogo from '../components/BrandLogo';
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

function SidebarLink({ active, to, onClick, icon: Icon, label, badge }) {
  const className = `flex w-full min-h-[44px] items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
    active ? sidebarNavActive : sidebarNavIdle
  }`;
  const inner = (
    <>
      <Icon className="h-5 w-5" /> {label}
      {badge && (
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${
            active
              ? 'bg-white/20 text-white'
              : badge.tone === 'amber'
                ? 'bg-amber-500 text-white'
                : 'bg-rose-500 text-white'
          }`}
        >
          {badge.count}
        </span>
      )}
    </>
  );
  if (to) {
    return (
      <Link to={to} onClick={onClick} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
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

      <aside className={`fixed inset-y-0 left-0 z-30 hidden w-64 flex-col p-6 lg:flex ${sidebarSurface}`}>
        <div className="mb-7">
          <BrandLogo to="/admin/dashboard" />
        </div>
        <nav className="space-y-1">
          {adminNavItems.map((item) => (
            <SidebarLink
              key={item.section}
              active={adminSection === item.section}
              to={item.to}
              icon={item.icon}
              label={t(item.labelKey)}
              badge={item.badge}
            />
          ))}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <div className={`sticky top-0 z-10 hidden h-16 items-center justify-between px-8 lg:flex ${shellHeader}`}>
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-600/20 bg-teal-600/10 px-3 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300">
            <ShieldCheck className="h-3.5 w-3.5" /> {t('admin.platformAdmin')}
          </div>
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
