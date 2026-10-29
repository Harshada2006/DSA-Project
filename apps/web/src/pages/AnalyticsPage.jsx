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
  Building2,
  Filter,
  Calendar,
  Info,
  CheckCircle2,
  BarChart2,
} from 'lucide-react';

export const AnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Area-Wise History Filter States
  const [wards, setWards] = useState([]);
  const [allBins, setAllBins] = useState([]);
  const [selectedWardId, setSelectedWardId] = useState('');
  const [selectedBinId, setSelectedBinId] = useState('');
  const [limitDays, setLimitDays] = useState(30);
  const [areaHistory, setAreaHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Load General Dashboard Summary and Wards / Bins
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [summaryRes, wardsRes, binsRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getWards().catch(() => []),
        api.getBins().catch(() => []),
      ]);
      setData(summaryRes);
      setWards(wardsRes);
      setAllBins(binsRes);
    } catch (err) {
      console.error('Failed to load initial analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Area-Wise History based on selected Ward / Bin / LimitDays
  const loadAreaHistory = async () => {
    setHistoryLoading(true);
    try {
      const params = { limitDays };
      if (selectedWardId) params.wardId = selectedWardId;
      if (selectedBinId) params.binId = selectedBinId;

      const historyRes = await api.getAreaWiseHistory(params);
      setAreaHistory(historyRes);
    } catch (err) {
      console.error('Failed to load area-wise history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadAreaHistory();
  }, [selectedWardId, selectedBinId, limitDays]);

  // Handle Ward selection change: reset bin filter
  const handleWardChange = (e) => {
    setSelectedWardId(e.target.value);
    setSelectedBinId('');
  };

  // Filter available bins for the selected ward
  const availableBins = selectedWardId
    ? allBins.filter((b) => b.wardId === selectedWardId)
    : allBins;

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
            Audited solid waste metrics, area-wise fill trajectories, and municipal operational metrics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('bins')}
            icon={<FileSpreadsheet className="w-3.5 h-3.5" />}
          >
            Export Bins CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('complaints')}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export Complaints CSV
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
          icon={<Building2 className="w-5 h-5 text-purple-600" />}
        />
      </div>

      {/* ============================================================ */}
      {/* AREA-WISE HISTORICAL TIMESERIES & PROVENANCE MODULE          */}
      {/* ============================================================ */}
      <Card className="p-5 border-emerald-100 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-base text-slate-900">Area-Wise Historical Fill & Prediction Trajectory</h2>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                Audited Timeseries
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Select specific administrative wards or individual receptacles to view distinct physical observations vs. projected fill trends.
            </p>
          </div>

          {/* Scope Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Ward Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <select
                aria-label="Filter by Ward"
                value={selectedWardId}
                onChange={handleWardChange}
                className="bg-transparent text-xs text-slate-800 font-medium focus:outline-none cursor-pointer"
              >
                <option value="">All Nashik Wards (City-Wide)</option>
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.zone})
                  </option>
                ))}
              </select>
            </div>

            {/* Bin Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                aria-label="Filter by Bin"
                value={selectedBinId}
                onChange={(e) => setSelectedBinId(e.target.value)}
                className="bg-transparent text-xs text-slate-800 font-medium focus:outline-none cursor-pointer max-w-[160px] truncate"
              >
                <option value="">All Receptacles in Scope</option>
                {availableBins.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} — {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Horizon Buttons */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
              {[7, 30, 90, 180].map((days) => (
                <button
                  key={days}
                  onClick={() => setLimitDays(days)}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    limitDays === days
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {days}D
                </button>
              ))}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={loadAreaHistory}
              loading={historyLoading}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />}
            />
          </div>
        </div>

        {/* Selected Scope Banner & Area KPIs */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
          <div>
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Scope Target</span>
            <span className="text-xs font-bold text-slate-800 truncate block mt-0.5" title={areaHistory?.scopeName}>
              {areaHistory?.scopeName || 'Loading scope...'}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Contributing Bins</span>
            <span className="text-xs font-bold text-slate-800 font-mono block mt-0.5">
              {areaHistory?.totalContributingBins || 0} receptacles
            </span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Avg Current Fullness</span>
            <span className="text-xs font-bold text-emerald-700 font-mono block mt-0.5">
              {areaHistory?.averageCurrentFill || 0}%
            </span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Observations Logged</span>
            <span className="text-xs font-bold text-slate-800 font-mono block mt-0.5">
              {areaHistory?.totalObservations || 0} readings
            </span>
          </div>
        </div>

        {/* Area History Chart */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-800">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                Observed Physical Fill %
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-sky-700">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 border border-sky-600 border-dashed inline-block" />
                Econometric Forecast %
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Horizon: Last {limitDays} Days
            </span>
          </div>

          <div className="h-72 w-full">
            {areaHistory?.timeline?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaHistory.timeline}>
                  <defs>
                    <linearGradient id="obsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#64748B" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#64748B" unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      color: '#F8FAFC',
                      borderRadius: '8px',
                      fontSize: '12px',
                      border: '1px solid #334155',
                    }}
                    formatter={(value, name) => [`${value}%`, name]}
                  />
                  <Area
                    type="monotone"
                    dataKey="observedFill"
                    stroke="#059669"
                    strokeWidth={2.5}
                    fill="url(#obsGrad)"
                    name="Observed Fill %"
                  />
                  <Area
                    type="monotone"
                    dataKey="predictedFill"
                    stroke="#0284c7"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fill="url(#predGrad)"
                    name="Econometric Forecast %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <Info className="w-8 h-8 text-slate-400 mb-2" />
                <p className="text-xs font-semibold text-slate-600">No Historical Observations Recorded</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  No readings were registered for this scope in the selected {limitDays}-day window.
                </p>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-2">
            <span>
              Provenance: <strong>Logged Sensor & Inspection Readings</strong> (zero synthetic modulo formulas).
            </span>
            <span>
              Collections logged in scope: <strong>{areaHistory?.totalCollectionsLogged || 0}</strong>
            </span>
          </div>
        </div>

        {/* Contributing Bins in Area */}
        {areaHistory?.contributingBins?.length > 0 && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              Contributing Receptacles in Scope ({areaHistory.contributingBins.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto pr-1">
              {areaHistory.contributingBins.map((bin) => (
                <div
                  key={bin.id}
                  onClick={() => setSelectedBinId(bin.id)}
                  className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    selectedBinId === bin.id
                      ? 'border-emerald-600 bg-emerald-50/80 shadow-xs ring-1 ring-emerald-500'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{bin.code}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                        bin.currentFillPercentage >= 80
                          ? 'bg-rose-100 text-rose-800'
                          : bin.currentFillPercentage >= 60
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {bin.currentFillPercentage}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 truncate mt-1">{bin.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

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
