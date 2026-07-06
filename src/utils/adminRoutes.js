/**
 * @file adminRoutes.js
 * @description URL paths for platform admin sections (deep links).
 */

export const ADMIN_SECTION_PATH = {
  dashboard: '/admin/dashboard',
  gyms: '/admin/gyms',
  plans: '/admin/plans',
  payments: '/admin/revenue',
  reports: '/admin/reports',
  messages: '/admin/messages',
};

/** Map pathname to internal admin section id. */
export function adminPathToSection(pathname) {
  if (pathname === '/admin' || pathname === '/admin/') return 'dashboard';
  if (pathname.startsWith('/admin/gyms')) return 'gyms';
  if (pathname.startsWith('/admin/plans')) return 'plans';
  if (pathname.startsWith('/admin/revenue')) return 'payments';
  if (pathname.startsWith('/admin/reports')) return 'reports';
  if (pathname.startsWith('/admin/messages')) return 'messages';
  if (pathname.startsWith('/admin/settings')) return 'dashboard';
  if (pathname.startsWith('/admin/dashboard')) return 'dashboard';
  return 'dashboard';
}
