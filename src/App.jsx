import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ChunkLoadErrorBoundary } from './components/ChunkLoadErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PreferencesProvider } from './context/PreferencesContext';
import { FlashProvider } from './context/FlashContext';
import { GymProvider } from './context/GymContext';
import { OfflineProvider } from './offline/OfflineContext';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { isPlatformAdmin, isGymOwner, hasGymPortalAccess } from './utils/roles';

const Login = lazyWithRetry(() => import('./pages/auth/Login'));
const ForgotPassword = lazyWithRetry(() => import('./pages/auth/ForgotPassword'));
const RegisterGym = lazyWithRetry(() => import('./pages/auth/RegisterGym'));
const ResetPassword = lazyWithRetry(() => import('./pages/auth/ResetPassword'));
const MemberPassPage = lazyWithRetry(() => import('./pages/public/MemberPassPage'));
const StationCheckInPage = lazyWithRetry(() => import('./pages/public/StationCheckInPage'));
const OwnerLayout = lazyWithRetry(() => import('./layouts/OwnerLayout'));
const OwnerDashboard = lazyWithRetry(() => import('./pages/owner/OwnerDashboard'));
const Members = lazyWithRetry(() => import('./pages/owner/Members'));
const CheckIn = lazyWithRetry(() => import('./pages/owner/CheckIn'));
const EnrollMember = lazyWithRetry(() => import('./pages/owner/EnrollMember'));
const Plans = lazyWithRetry(() => import('./pages/owner/Plans'));
const Revenue = lazyWithRetry(() => import('./pages/owner/Revenue'));
const OwnerReports = lazyWithRetry(() => import('./pages/owner/OwnerReports'));
const Team = lazyWithRetry(() => import('./pages/owner/Team'));
const Activity = lazyWithRetry(() => import('./pages/owner/Activity'));
const MemberMessages = lazyWithRetry(() => import('./pages/owner/MemberMessages'));
const Branches = lazyWithRetry(() => import('./pages/owner/Branches'));
const AdminLayout = lazyWithRetry(() => import('./layouts/AdminLayout'));
const AdminDashboard = lazyWithRetry(() => import('./pages/admin/AdminDashboard'));
const AdminRegisterGym = lazyWithRetry(() => import('./pages/admin/RegisterGym'));
const AdminSaasPlans = lazyWithRetry(() => import('./pages/admin/AdminSaasPlans'));
const AdminPayments = lazyWithRetry(() => import('./pages/admin/AdminPayments'));
const AdminReports = lazyWithRetry(() => import('./pages/admin/AdminReports'));
const AdminGymMessages = lazyWithRetry(() => import('./pages/admin/AdminGymMessages'));

function RouteFallback() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-app-bg text-sm text-app-muted">
      Loading…
    </div>
  );
}

function ProtectedRoute({ children, requirePlatformAdmin, requireGymPortal, requireGymOwner }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <RouteFallback />;
  }

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
  const { user, loading } = useAuth();

  if (loading) {
    return <RouteFallback />;
  }

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
      <OfflineProvider>
        <BrowserRouter>
          <PreferencesProvider>
            <FlashProvider>
            <ChunkLoadErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/register-gym" element={<RegisterGym />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/pass" element={<MemberPassPage />} />
              <Route path="/p/:code" element={<MemberPassPage />} />
              <Route path="/check-in" element={<StationCheckInPage />} />

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
                <Route path="check-in" element={<CheckIn />} />
                <Route path="members/enroll" element={<EnrollMember />} />
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
                <Route path="gyms/register" element={<AdminRegisterGym />} />
                <Route path="plans" element={<AdminSaasPlans />} />
                <Route path="revenue" element={<AdminPayments />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="messages" element={<AdminGymMessages />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense>
            </ChunkLoadErrorBoundary>
            </FlashProvider>
          </PreferencesProvider>
        </BrowserRouter>
      </OfflineProvider>
    </AuthProvider>
  );
}
