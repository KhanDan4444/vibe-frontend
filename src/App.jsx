import React from 'react';
import AdminDashboard from './pages/admin/AdminDashboard';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PreferencesProvider } from './context/PreferencesContext';
import { GymProvider } from './context/GymContext';
import { isPlatformAdmin, isGymOwner, hasGymPortalAccess } from './utils/roles';
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import RegisterGym from './pages/auth/RegisterGym';
import ResetPassword from './pages/auth/ResetPassword';
import OwnerLayout from './layouts/OwnerLayout';
import OwnerDashboard from './pages/owner/OwnerDashboard';
import Members from './pages/owner/Members';
import Plans from './pages/owner/Plans';
import Revenue from './pages/owner/Revenue';
import OwnerReports from './pages/owner/OwnerReports';
import Team from './pages/owner/Team';
import Activity from './pages/owner/Activity';
import MemberMessages from './pages/owner/MemberMessages';
import Branches from './pages/owner/Branches';

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

          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute requirePlatformAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </BrowserRouter>
      </PreferencesProvider>
    </AuthProvider>
  );
}
