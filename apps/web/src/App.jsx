import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ProtectedRoute } from './components/common/ProtectedRoute.jsx';
import { AdminLayout } from './components/layout/AdminLayout.jsx';

// Public & Landing
import { LandingPage } from './pages/LandingPage.jsx';

// Dedicated Stakeholder Auth Pages
import { CitizenAuthPage } from './pages/CitizenAuthPage.jsx';
import { WorkerAuthPage } from './pages/WorkerAuthPage.jsx';
import { OrganizationAuthPage } from './pages/OrganizationAuthPage.jsx';

// Role Dashboards
import { CitizenDashboard } from './pages/CitizenDashboard.jsx';
import { WorkerDashboard } from './pages/WorkerDashboard.jsx';

// Organization Admin Pages
import { OverviewPage } from './pages/OverviewPage.jsx';
import { BinsPage } from './pages/BinsPage.jsx';
import { LiveMapPage } from './pages/LiveMapPage.jsx';
import { PrioritizedTasksPage } from './pages/PrioritizedTasksPage.jsx';
import { TasksPage } from './pages/TasksPage.jsx';
import { WorkersPage } from './pages/WorkersPage.jsx';
import { ComplaintsPage } from './pages/ComplaintsPage.jsx';
import { EWastePage } from './pages/EWastePage.jsx';
import { FacilitiesPage } from './pages/FacilitiesPage.jsx';
import { IssuesPage } from './pages/IssuesPage.jsx';
import { AnalyticsPage } from './pages/AnalyticsPage.jsx';

export const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Landing & Portals */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/citizen/login" element={<CitizenAuthPage />} />
          <Route path="/worker/login" element={<WorkerAuthPage />} />
          <Route path="/organization/login" element={<OrganizationAuthPage />} />

          {/* Citizen Dedicated Protected Portal */}
          <Route
            path="/citizen/dashboard"
            element={
              <ProtectedRoute allowedRoles={['CITIZEN']}>
                <CitizenDashboard />
              </ProtectedRoute>
            }
          />

          {/* Worker Dedicated Protected Field Portal */}
          <Route
            path="/worker/dashboard"
            element={
              <ProtectedRoute allowedRoles={['WORKER']}>
                <WorkerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Organization Admin Protected Portal */}
          <Route
            path="/organization"
            element={
              <ProtectedRoute allowedRoles={['ORGANIZATION_ADMIN']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/organization/overview" replace />} />
            <Route path="overview" element={<OverviewPage />} />
            <Route path="dashboard" element={<Navigate to="/organization/overview" replace />} />
            <Route path="bins" element={<BinsPage />} />
            <Route path="map" element={<LiveMapPage />} />
            <Route path="live-map" element={<Navigate to="/organization/map" replace />} />
            <Route path="prioritized-tasks" element={<PrioritizedTasksPage />} />
            <Route path="tasks-priority" element={<Navigate to="/organization/prioritized-tasks" replace />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="workers" element={<WorkersPage />} />
            <Route path="complaints" element={<ComplaintsPage />} />
            <Route path="ewaste" element={<EWastePage />} />
            <Route path="facilities" element={<FacilitiesPage />} />
            <Route path="issues" element={<IssuesPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            {/* Redirects for removed modules */}
            <Route path="route-optimization" element={<Navigate to="/organization/tasks" replace />} />
            <Route path="routes" element={<Navigate to="/organization/tasks" replace />} />
            <Route path="schedules" element={<Navigate to="/organization/overview" replace />} />
            <Route path="data-sources" element={<Navigate to="/organization/overview" replace />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
