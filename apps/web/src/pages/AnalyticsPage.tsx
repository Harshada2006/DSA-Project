import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { DashboardSummary, Ward, MLModelMetadata } from '@eco-collect/shared';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Download,
  RefreshCw,
  PieChart as PieIcon,
  Sparkles,
  Layers,
  AlertTriangle,
} from 'lucide-react';

const COLORS = ['#10b981', '#0284c7', '#f59e0b', '#8b5cf6', '#ec4899'];

export const AnalyticsPage: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [wards, setWards] = useState<Ward[]>([]);
  const [models, setModels] = useState<MLModelMetadata[]>([]);
  const [selectedWard, setSelectedWard] = useState('');
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [sumRes, wardsRes, modelsRes] = await Promise.all([
        api.getSummary(selectedWard),
        api.getWards(),
        api.getModels(),
      ]);
      setSummary(sumRes);
      setWards(wardsRes);
      setModels(modelsRes);
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [selectedWard]);

  const activeModel = models.find((m) => m.isActive) || models[0];

  // Prepare Ward Comparison Data
  const wardChartData = summary?.wardSummaries.map((w) => ({
    name: w.wardName,
    bins: w.binCount,
    avgFill: w.averageFillPercentage,
    critical: w.criticalBinsCount,
    complaints: w.openComplaintsCount,
  })) || [];

  // Data Source Provenance Pie Data
  const provenanceData = summary?.dataSourceDistribution
    ? Object.entries(summary.dataSourceDistribution).map(([name, value]) => ({
        name: name.toUpperCase(),
        value,
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Municipal Analytics & Reports
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Operational KPIs, predictive evaluation accuracy, and ward-by-ward waste distributions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
            className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 font-medium"
          >
            <option value="">All Nashik Wards</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <Button
            onClick={loadAnalytics}
            variant="outline"
            size="sm"
            isLoading={loading}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Accuracy & Evaluation Benchmark Callout */}
      {activeModel && (
        <Card
          title="Predictive Model Accuracy vs Baseline Heuristic"
          subtitle="MAE and RMSE calculated strictly on chronological holdout test set"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200">
              <span className="text-slate-500 block">TensorFlow.js Model MAE</span>
              <span className="text-2xl font-black text-purple-900 mt-1 block">
                {activeModel.testMae}%
              </span>
              <span className="text-[11px] text-purple-700 mt-0.5 block">Mean Absolute Error</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block">Baseline Linear Predictor MAE</span>
              <span className="text-2xl font-black text-slate-700 mt-1 block">
                {activeModel.baselineMae}%
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Category Prior Rate</span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-slate-500 block">Error Reduction</span>
              <span className="text-2xl font-black text-emerald-800 mt-1 block">
                +{activeModel.improvementPercentage}%
              </span>
              <span className="text-[11px] text-emerald-700 mt-0.5 block">ML Outperformance</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block">Root Mean Squared Error (RMSE)</span>
              <span className="text-2xl font-black text-slate-800 mt-1 block">
                {activeModel.testRmse}%
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Penalizes large errors</span>
            </div>
          </div>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ward-Level Comparative Fullness */}
        <Card
          title="Average Container Fullness by Ward"
          subtitle="Percentage fullness comparison across administrative divisions"
        >
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wardChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="avgFill" name="Avg Fill Level (%)" fill="#268754" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Predicted vs Observed Scatter Comparison */}
        <Card
          title="Predicted vs Observed Fill Correlation"
          subtitle="Visual inspection of model accuracy across monitored bins"
        >
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summary?.predictedVsObservedFullness || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="binCode" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line type="monotone" dataKey="observed" name="Observed Field Fill" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="predicted" name="AI Model Prediction" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Bottom Grid: Data Source Distribution & Collection Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Data Provenance Distribution */}
        <Card
          title="Data Provenance Distribution"
          subtitle="Honest accounting of verified, imported, and synthetic records"
          className="lg:col-span-1"
        >
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={provenanceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {provenanceData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Summary Table */}
        <Card
          title="Comparative Ward Performance Summary"
          subtitle="Consolidated metrics for municipal reports"
          className="lg:col-span-2"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Ward Division</th>
                  <th className="py-2.5 px-3">Total Bins</th>
                  <th className="py-2.5 px-3">Avg Fullness</th>
                  <th className="py-2.5 px-3">Critical Bins</th>
                  <th className="py-2.5 px-3 text-right">Grievance Backlog</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary?.wardSummaries.map((w) => (
                  <tr key={w.wardId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-800">{w.wardName}</td>
                    <td className="py-3 px-3 text-slate-600">{w.binCount}</td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{w.averageFillPercentage}%</td>
                    <td className="py-3 px-3">
                      {w.criticalBinsCount > 0 ? (
                        <span className="font-bold text-rose-600">{w.criticalBinsCount}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {w.openComplaintsCount > 0 ? (
                        <span className="font-semibold text-amber-700">{w.openComplaintsCount} tickets</span>
                      ) : (
                        <span className="text-emerald-700 font-semibold">Cleared</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};
