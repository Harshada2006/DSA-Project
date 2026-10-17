import React, { useState, useEffect } from 'react';
import {
  Trash2,
  AlertTriangle,
  Flame,
  MessageSquare,
  Truck,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  Cpu,
} from 'lucide-react';
import { Link } from 'react-router-dom';
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
import { api } from '../api/client';
import { DashboardSummary, Ward } from '@eco-collect/shared';
import { StatCard } from '../components/common/StatCard';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';

export const OverviewPage: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWard, setSelectedWard] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (wardId?: string) => {
    try {
      const [sumData, wardsData] = await Promise.all([
        api.getSummary(wardId),
        api.getWards(),
      ]);
      setSummary(sumData);
      setWards(wardsData);
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(selectedWard);
  }, [selectedWard]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(selectedWard);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-forest-600 animate-spin mx-auto" />
          <p className="text-sm text-slate-500 font-medium">Loading Nashik municipal waste metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Operations Overview
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time monitoring, C++ collection scheduling, and waste accumulation intelligence.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
            className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 font-medium shadow-2xs focus:ring-2 focus:ring-forest-500 focus:outline-hidden"
          >
            <option value="">All Nashik Wards (Entire City)</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            isLoading={refreshing}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Registered Bins"
          value={summary?.totalRegisteredBins || 0}
          subtitle="Monitored in Nashik"
          icon={Trash2}
          variant="forest"
        />
        <StatCard
          title="Near Threshold"
          value={summary?.binsNearThreshold || 0}
          subtitle="≥ 75% capacity"
          icon={AlertTriangle}
          variant="amber"
          trend={{ value: 'Action required', isPositive: false }}
        />
        <StatCard
          title="High Priority"
          value={summary?.highPriorityBins || 0}
          subtitle="Ranked by C++ Heap"
          icon={Flame}
          variant="rose"
        />
        <StatCard
          title="Open Complaints"
          value={summary?.openComplaints || 0}
          subtitle="Citizen reports"
          icon={MessageSquare}
          variant="amber"
        />
        <StatCard
          title="Fleet Active"
          value={summary?.activeVehiclesCount.total || 0}
          subtitle={`${summary?.activeVehiclesCount.simulated || 0} Sim • ${summary?.activeVehiclesCount.realGps || 0} GPS`}
          icon={Truck}
          variant="blue"
        />
        <StatCard
          title="Collections Today"
          value={summary?.completedCollectionsToday || 0}
          subtitle="Completed shifts"
          icon={CheckCircle2}
          variant="emerald"
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Collection Activity Trend Chart */}
        <Card
          title="Municipal Collection Activity"
          subtitle="Daily collection events & estimated tonnage volume"
          className="lg:col-span-2"
        >
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary?.collectionActivityTrend || []}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Collections Count"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorCount)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Waste Accumulation by Category */}
        <Card
          title="Waste Generation Breakdown"
          subtitle="Estimated metric tons by waste category"
        >
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.wasteAccumulationTrend || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="organic" name="Organic" fill="#10b981" radius={[3, 3, 0, 0]} stackId="a" />
                <Bar dataKey="recyclable" name="Recyclable" fill="#0284c7" radius={[0, 0, 0, 0]} stackId="a" />
                <Bar dataKey="general" name="General" fill="#64748b" radius={[3, 3, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Ward Operations Summary Table */}
      <Card
        title="Ward-Level Operational Breakdown"
        subtitle="Distribution of waste assets and service urgency across administrative zones"
        action={
          <Link to="/map">
            <Button variant="outline" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
              Open in Live Map
            </Button>
          </Link>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3">Ward</th>
                <th className="py-2.5 px-3">Registered Bins</th>
                <th className="py-2.5 px-3">Average Fullness</th>
                <th className="py-2.5 px-3">Critical Bins</th>
                <th className="py-2.5 px-3">Open Complaints</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary?.wardSummaries.map((w) => {
                const isCritical = w.criticalBinsCount > 0;
                return (
                  <tr key={w.wardId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-800">{w.wardName}</td>
                    <td className="py-3 px-3 text-slate-600">{w.binCount} assets</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              w.averageFillPercentage >= 75
                                ? 'bg-rose-500'
                                : w.averageFillPercentage >= 50
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${w.averageFillPercentage}%` }}
                          />
                        </div>
                        <span className="font-semibold text-slate-700">{w.averageFillPercentage}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      {w.criticalBinsCount > 0 ? (
                        <span className="font-bold text-rose-600">{w.criticalBinsCount} bins</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {w.openComplaintsCount > 0 ? (
                        <span className="font-semibold text-amber-700">{w.openComplaintsCount} tickets</span>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {isCritical ? (
                        <Badge variant="danger">Dispatch Urgently</Badge>
                      ) : (
                        <Badge variant="success">Normal</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Upcoming Priority Tasks & Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Tasks - Powered by C++ Engine */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <span>Recommended Priority Tasks</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-forest-100 text-forest-800 border border-forest-300 flex items-center gap-1">
                <Cpu className="w-3 h-3 text-forest-700" />
                C++ Max-Heap
              </span>
            </div>
          }
          subtitle="Real-time multi-factor ranking from compiled C++ STL priority queue"
          action={
            <Link to="/priority-tasks">
              <Button variant="ghost" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                View All Tasks
              </Button>
            </Link>
          }
        >
          <div className="space-y-3">
            {summary?.upcomingTasks && summary.upcomingTasks.length > 0 ? (
              summary.upcomingTasks.slice(0, 4).map((task, idx) => (
                <div
                  key={task.binId}
                  className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between hover:bg-white hover:shadow-xs transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{task.binCode}</span>
                        <Badge
                          variant={task.urgency === 'critical' ? 'danger' : 'warning'}
                          size="sm"
                        >
                          {task.urgency.toUpperCase()}
                        </Badge>
                        <ProvenanceBadge provenance={task.provenance} showIcon={false} />
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">{task.binName}</div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Fill: <span className="font-semibold text-slate-800">{task.currentFill}%</span> • Complaints: {task.complaintCount} • Est. to Threshold: {task.timeToThresholdHours}h
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-extrabold text-emerald-700">
                      {task.priorityScore}
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Priority</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">No immediate priority tasks queued.</p>
            )}
          </div>
        </Card>

        {/* Recent Complaints Stream */}
        <Card
          title="Recent Citizen Complaints"
          subtitle="Geo-tagged citizen reports affecting priority scores"
          action={
            <Link to="/complaints">
              <Button variant="ghost" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                All Complaints
              </Button>
            </Link>
          }
        >
          <div className="space-y-3">
            {summary?.recentComplaints && summary.recentComplaints.length > 0 ? (
              summary.recentComplaints.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-xl border border-slate-100 bg-white flex items-start justify-between hover:border-slate-300 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-rose-700">{c.ticketNo}</span>
                      <Badge
                        variant={c.severity === 'critical' ? 'danger' : 'warning'}
                        size="sm"
                      >
                        {c.severity}
                      </Badge>
                      <span className="text-[11px] font-semibold text-slate-500 capitalize">
                        {c.category.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mt-1 line-clamp-1">{c.description}</p>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {c.wardName} • Reported by {c.reportedBy}
                    </div>
                  </div>
                  <Badge variant="outline" size="sm" className="capitalize">
                    {c.status}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">No open complaints reported.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
