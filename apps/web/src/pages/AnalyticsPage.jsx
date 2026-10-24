import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Card } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { StatCard } from '../components/common/StatCard.jsx';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Download,
  RefreshCw,
  Trash2,
  Cpu,
  Layers,
  MapPin,
  FileSpreadsheet,
} from 'lucide-react';

export const AnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getDashboardSummary();
      setData(res);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const metrics = data?.metrics || {};
  const trend = data?.collectionActivityTrend || [];
  const wardSummaries = data?.wardSummaries || [];

  const handleExport = (type) => {
    window.open(api.getExportUrl(type), '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics & Operational Metrics</h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200">
              Nashik Performance
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Audited solid waste metrics, collection efficiency, and algorithm benchmark metrics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
            icon={<FileSpreadsheet className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('json')}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export JSON
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monitored Bins"
          value={metrics.totalRegisteredBins || 0}
          subtitle="Registered in Nashik"
          icon={<Trash2 className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          title="Collections Completed"
          value={metrics.completedCollectionsToday || 0}
          subtitle="Recorded today"
          icon={<TrendingUp className="w-5 h-5 text-teal-600" />}
        />
        <StatCard
          title="Attention Queue"
          value={metrics.binsRequiringAttention || 0}
          subtitle="Critical or High Urgency"
          icon={<Layers className="w-5 h-5 text-amber-600" />}
        />
        <StatCard
          title="Verified Facilities"
          value={metrics.verifiedFacilitiesCount || 0}
          subtitle="Weighbridges & Recyclers"
          icon={<Cpu className="w-5 h-5 text-purple-600" />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Area Chart */}
        <Card className="p-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">7-Day Waste Clearance Volume</h3>
              <p className="text-xs text-slate-500">Tons of solid waste cleared by NMC compaction trucks</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#64748B" />
                <YAxis tick={{ fontSize: 11 }} stroke="#64748B" unit=" T" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="volumeTons" stroke="#059669" strokeWidth={2} fill="url(#volGrad)" name="Tons Cleared" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Ward Comparison Bar Chart */}
        <Card className="p-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Ward-Wise Bin Count & Average Fullness</h3>
              <p className="text-xs text-slate-500">Comparative density across Nashik municipal divisions</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wardSummaries}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="wardName" tick={{ fontSize: 10 }} stroke="#64748B" />
                <YAxis tick={{ fontSize: 11 }} stroke="#64748B" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="binCount" fill="#0D9488" name="Total Bins" radius={[4, 4, 0, 0]} />
                <Bar dataKey="averageFillPercentage" fill="#F59E0B" name="Avg Fill %" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Ward Summaries Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Ward Performance Breakdown
          </span>
          <span className="text-xs text-slate-500">6 Administrative Divisions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Ward Name</th>
                <th className="p-3.5">Zone</th>
                <th className="p-3.5">Registered Bins</th>
                <th className="p-3.5">Avg Fill Level</th>
                <th className="p-3.5">Critical Risk Bins</th>
                <th className="p-3.5">Open Complaints</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {wardSummaries.map((w) => (
                <tr key={w.wardId} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3.5 font-bold text-slate-900">{w.wardName}</td>
                  <td className="p-3.5 text-slate-600 font-medium">{w.zone}</td>
                  <td className="p-3.5 font-mono text-slate-800 font-bold">{w.binCount}</td>
                  <td className="p-3.5 font-mono text-slate-800">{w.averageFillPercentage}%</td>
                  <td className="p-3.5">
                    <span className={`font-mono font-bold ${w.criticalBinsCount > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                      {w.criticalBinsCount}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-slate-700">{w.openComplaintsCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
