import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';
import { GuestRoute, ProtectedRoute } from './RouteGuards.jsx';
import { AuthLayout } from '../layouts/AuthLayout.jsx';
import { AppLayout } from '../layouts/AppLayout.jsx';
import { RouteErrorElement } from '../components/RouteErrorElement.jsx';
import { SessionExpiryBoundary } from './SessionExpiryBoundary.jsx';

const lazyNamed = (loader, name) =>
  lazy(() => loader().then((module) => ({ default: module[name] })));
const LoginPage = lazyNamed(() => import('../pages/auth/LoginPage.jsx'), 'LoginPage');
const ForgotPasswordPage = lazyNamed(
  () => import('../pages/auth/ForgotPasswordPage.jsx'),
  'ForgotPasswordPage',
);
const ResetPasswordPage = lazyNamed(
  () => import('../pages/auth/ResetPasswordPage.jsx'),
  'ResetPasswordPage',
);
const DashboardPage = lazyNamed(() => import('../pages/admin/DashboardPage.jsx'), 'DashboardPage');
const AnalyticsPage = lazyNamed(() => import('../pages/admin/AnalyticsPage.jsx'), 'AnalyticsPage');
const WorkspaceDashboardPage = lazyNamed(() => import('../pages/admin/DashboardPage.jsx'), 'WorkspaceDashboardPage');
const StudentsPage = lazyNamed(() => import('../pages/admin/StudentsPage.jsx'), 'StudentsPage');
const ReportsPage = lazyNamed(() => import('../pages/admin/ReportsPage.jsx'), 'ReportsPage');
const TechnologiesPage = lazyNamed(
  () => import('../pages/admin/TechnologiesPage.jsx'),
  'TechnologiesPage',
);
const UsersPage = lazyNamed(() => import('../pages/admin/UsersPage.jsx'), 'UsersPage');
const BDRecoveryPage = lazyNamed(() => import('../pages/admin/BDRecoveryPage.jsx'), 'BDRecoveryPage');
const BDRecoveryDashboard = lazyNamed(() => import('../pages/admin/BDRecoveryDashboard.jsx'), 'BDRecoveryDashboard');
const HistoryPage = lazyNamed(() => import('../pages/HistoryPage.jsx'), 'HistoryPage');
const SettingsPage = lazyNamed(() => import('../pages/SettingsPage.jsx'), 'SettingsPage');
const MyProfilePage = lazyNamed(
  () => import('../pages/student/MyProfilePage.jsx'),
  'MyProfilePage',
);

export const router = createBrowserRouter([
  {
    element: <SessionExpiryBoundary />,
    errorElement: <RouteErrorElement />,
    children: [
      {
        element: <GuestRoute />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              { path: '/login', element: <LoginPage /> },
              { path: '/forgot-password', element: <ForgotPasswordPage /> },
              { path: '/reset-password', element: <ResetPasswordPage /> },
            ],
          },
        ],
      },
      {
        element: <ProtectedRoute roles={['admin', 'staff', 'student', 'bd_recovery']} />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: '/', element: <Navigate to="/dashboard" replace /> },
              { path: '/dashboard', element: <DashboardPage /> },
              { path: '/history', element: <HistoryPage /> },
              { path: '/settings', element: <SettingsPage /> },
            ],
          },
        ],
      },
      {
        element: <ProtectedRoute roles={['admin', 'staff']} />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: '/analytics', element: <AnalyticsPage /> },
              { path: '/workspace', element: <WorkspaceDashboardPage /> },
              { path: '/students', element: <StudentsPage /> },
              { path: '/reports', element: <ReportsPage /> },
              { path: '/technologies', element: <TechnologiesPage /> },
              { path: '/users', element: <UsersPage /> },

            ],
          },
        ],
      },
      {
        element: <ProtectedRoute roles={['admin']} />,
        children: [
          { element: <AppLayout />, children: [
            { path: '/assign-candidates', element: <StudentsPage /> },
            { path: '/placed-students', element: <StudentsPage /> },
          ] },
        ],
      },
      {
        element: <ProtectedRoute roles={['admin', 'bd_recovery']} />,
        children: [
          { element: <AppLayout />, children: [{ path: '/bd-dashboard', element: <BDRecoveryDashboard /> }, { path: '/bd-recovery', element: <BDRecoveryPage /> }] },
        ],
      },
      {
        element: <ProtectedRoute roles={['student']} />,
        children: [
          {
            element: <AppLayout />,
            children: [{ path: '/my-profile', element: <MyProfilePage /> }],
          },
        ],
      },
      { path: '/404', element: <NotFoundPage /> },
      { path: '*', element: <Navigate to="/404" replace /> },
    ],
  },
]);
