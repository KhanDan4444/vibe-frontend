import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PreferencesProvider } from './context/PreferencesContext';
import { GymProvider } from './context/GymContext';
import { isPlatformAdmin, isGymOwner, hasGymPortalAccess } from './utils/roles';

const Login = lazy(() => import('./pages/auth/Login'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const RegisterGym = lazy(() => import('./pages/auth/RegisterGym'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const OwnerLayout = lazy(() => import('./layouts/OwnerLayout'));
const OwnerDashboard = lazy(() => import('./pages/owner/OwnerDashboard'));
const Members = lazy(() => import('./pages/owner/Members'));
const Plans = lazy(() => import('./pages/owner/Plans'));
const Revenue = lazy(() => import('./pages/owner/Revenue'));
const OwnerReports = lazy(() => import('./pages/owner/OwnerReports'));
const Team = lazy(() => import('./pages/owner/Team'));
const Activity = lazy(() => import('./pages/owner/Activity'));
const MemberMessages = lazy(() => import('./pages/owner/MemberMessages'));
const Branches = lazy(() => import('./pages/owner/Branches'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminSaasPlans = lazy(() => import('./pages/admin/AdminSaasPlans'));
const AdminPayments = lazy(() => import('./pages/admin/AdminPayments'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const AdminGymMessages = lazy(() => import('./pages/admin/AdminGymMessages'));

function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-app-bg dark:text-app-muted">
      Loading…
    </div>
  );
}

function ProtectedRoute({ children, requirePlatformAdmin, requireGymPortal, requireGymOwner }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requirePlatformAdmin && !isPlatformAdmin(user.role)) {
    return <Navigate to="/login" replace />;
  }

  if (requireGymPortal && !hasGymPortalAccess(user.role)) {
    return <Navigate to="/login" replace />;
  }

  if (requireGymOwner && !isGymOwner(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function RootRedirect() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (isPlatformAdmin(user.role)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (hasGymPortalAccess(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <PreferencesProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/register-gym" element={<RegisterGym />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <RootRedirect />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute requireGymPortal>
                    <GymProvider>
                      <OwnerLayout />
                    </GymProvider>
                  </ProtectedRoute>
                }
              >
                <Route index element={<OwnerDashboard />} />
                <Route path="members" element={<Members />} />
                <Route path="plans" element={<Plans />} />
                <Route path="revenue" element={<Revenue />} />
                <Route path="reports" element={<OwnerReports />} />
                <Route
                  path="team"
                  element={
                    <ProtectedRoute requireGymOwner>
                      <Team />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="branches"
                  element={
                    <ProtectedRoute requireGymOwner>
                      <Branches />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="activity"
                  element={
                    <ProtectedRoute requireGymOwner>
                      <Activity />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="messages"
                  element={
                    <ProtectedRoute requireGymOwner>
                      <MemberMessages />
                    </ProtectedRoute>
                  }
                />
                <Route path="settings" element={<Navigate to="/dashboard" replace />} />
                <Route path="payments" element={<Navigate to="/dashboard/revenue" replace />} />
              </Route>

              <Route
                path="/admin"
                element={
                  <ProtectedRoute requirePlatformAdmin>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="gyms" element={<AdminDashboard />} />
                <Route path="plans" element={<AdminSaasPlans />} />
                <Route path="revenue" element={<AdminPayments />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="messages" element={<AdminGymMessages />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </PreferencesProvider>
    </AuthProvider>
  );
}
