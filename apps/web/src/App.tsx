import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { OverviewPage } from './pages/OverviewPage';
import { LiveMapPage } from './pages/LiveMapPage';
import { BinsPage } from './pages/BinsPage';
import { PredictionsPage } from './pages/PredictionsPage';
import { PrioritizedTasksPage } from './pages/PrioritizedTasksPage';
import { RouteOptimizationPage } from './pages/RouteOptimizationPage';
import { ComplaintsPage } from './pages/ComplaintsPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { CollectionHistoryPage } from './pages/CollectionHistoryPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { DataSourcesPage } from './pages/DataSourcesPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<OverviewPage />} />
          <Route path="map" element={<LiveMapPage />} />
          <Route path="bins" element={<BinsPage />} />
          <Route path="predictions" element={<PredictionsPage />} />
          <Route path="priority-tasks" element={<PrioritizedTasksPage />} />
          <Route path="routes" element={<RouteOptimizationPage />} />
          <Route path="complaints" element={<ComplaintsPage />} />
          <Route path="vehicles" element={<VehiclesPage />} />
          <Route path="collections" element={<CollectionHistoryPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="data-sources" element={<DataSourcesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
