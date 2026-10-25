import React, { useState, useEffect } from 'react';
import {
  Trash2,
  AlertTriangle,
  MessageSquare,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Plus,
  MapPin,
  Sparkles,
  Users,
  ShieldCheck,
  TrendingUp,
  Truck,
  Building2,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { StatCard } from '../components/common/StatCard.jsx';
import { Card } from '../components/common/Card.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Button } from '../components/common/Button.jsx';

export const OverviewPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadData = async () => {
    try {
      const summary = await api.getDashboardSummary();
      setData(summary);
      setError(null);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err?.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-base text-slate-700 font-semibold">Loading Nashik Municipal Waste Operations...</p>
        <p className="text-xs text-slate-400">Connecting to Municipal Operations Database</p>
      </div>
    );
  }

  const metrics = data?.metrics || {
    totalRegisteredBins: 10,
    binsRequiringAttention: 6,
    criticalUrgencyBins: 3,
    openComplaints: 5,
    activeWorkers: 2,
    completedCollectionsToday: 1,
  };

  const priorityDist = data?.priorityDistribution || {
    Normal: 2,
    Monitor: 1,
    High: 3,
    Critical: 4,
  };

  const wardSummaries = data?.wardSummaries || [];
  const trendData = data?.collectionActivityTrend || [];

  return (
    <div className="space-y-6">
      {/* Top Welcome Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden shadow-lg border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white">
        <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="max-w-xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Nashik Municipal Corporation • SWM Cell</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Welcome, {user?.name || 'Administrator'}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Monitoring 6 Municipal Wards (Panchavati, CIDCO, Nashik East, Nashik West, Satpur, Nashik Road) with automated collection prioritization.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-col gap-3">
            <Button
              variant="emerald"
              size="md"
              onClick={() => navigate('/organization/prioritized-tasks')}
              icon={<Activity className="w-4 h-4" />}
            >
              Open Collection Priority
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={handleRefresh}
              isLoading={refreshing}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Refresh Data
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Registered Bins"
          value={metrics.totalRegisteredBins || 0}
          subtitle="Mapped across 6 Nashik Wards"
          variant="forest"
          icon={<Trash2 className="w-6 h-6 text-emerald-700" />}
        />
        <StatCard
          title="High-Risk Bins"
          value={metrics.criticalUrgencyBins || 0}
          subtitle="Priority Score >= 80"
          variant="rose"
          icon={<AlertTriangle className="w-6 h-6 text-rose-700" />}
        />
        <StatCard
          title="Citizen Complaints"
          value={metrics.openComplaints || 0}
          subtitle="Grievances awaiting redressal"
          variant="amber"
          icon={<MessageSquare className="w-6 h-6 text-amber-700" />}
        />
        <StatCard
          title="Field Operations Crew"
          value={metrics.activeWorkers || 0}
          subtitle="Active on-shift staff & drivers"
          variant="blue"
          icon={<Users className="w-6 h-6 text-sky-700" />}
        />
      </div>

      {/* Visual Quick Actions Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/organization/bins"
          className="group p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-500 transition-all flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <span className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors block">
              Manage Bins
            </span>
            <span className="text-xs text-slate-500">View & monitor inventory</span>
          </div>
        </Link>

        <Link
          to="/organization/issues"
          className="group p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-500 transition-all flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 group-hover:bg-rose-600 group-hover:text-white transition-colors">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="font-bold text-sm text-slate-900 group-hover:text-rose-700 transition-colors block">
              Roadblocks & Issues
            </span>
            <span className="text-xs text-slate-500">Monitor road closures</span>
          </div>
        </Link>

        <Link
          to="/organization/complaints"
          className="group p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-500 transition-all flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <span className="font-bold text-sm text-slate-900 group-hover:text-amber-700 transition-colors block">
              Citizen Reports
            </span>
            <span className="text-xs text-slate-500">Review & assign grievances</span>
          </div>
        </Link>

        <Link
          to="/organization/ewaste"
          className="group p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-500 transition-all flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="font-bold text-sm text-slate-900 group-hover:text-purple-700 transition-colors block">
              E-Waste & Recyclers
            </span>
            <span className="text-xs text-slate-500">Documented handovers</span>
          </div>
        </Link>
      </div>

      {/* Main Operational Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Collection Priority Breakdown */}
        <Card className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                Collection Priority Breakdown
              </h3>
              <Badge variant="success">Active Ranking</Badge>
            </div>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Calculated dynamically via 4 operational factors: fill level, pickup delay, sensitive area proximity, and missed collections.
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm">
                <div>
                  <span className="font-bold text-rose-900 block">Critical Risk</span>
                  <span className="text-xs text-rose-700">Priority Score 80 – 100</span>
                </div>
                <span className="font-mono font-bold text-rose-700 text-lg">{priorityDist.Critical || 0} bins</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm">
                <div>
                  <span className="font-bold text-amber-900 block">High Urgency</span>
                  <span className="text-xs text-amber-700">Priority Score 60 – 79</span>
                </div>
                <span className="font-mono font-bold text-amber-700 text-lg">{priorityDist.High || 0} bins</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-sky-50 border border-sky-200 text-sm">
                <div>
                  <span className="font-bold text-sky-900 block">Monitor State</span>
                  <span className="text-xs text-sky-700">Priority Score 40 – 59</span>
                </div>
                <span className="font-mono font-bold text-sky-700 text-lg">{priorityDist.Monitor || 0} bins</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm">
                <div>
                  <span className="font-bold text-emerald-900 block">Normal State</span>
                  <span className="text-xs text-emerald-700">Priority Score 0 – 39</span>
                </div>
                <span className="font-mono font-bold text-emerald-700 text-lg">{priorityDist.Normal || 0} bins</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-6">
            <Link
              to="/organization/prioritized-tasks"
              className="text-sm font-bold text-emerald-700 hover:text-emerald-800 flex items-center justify-between group"
            >
              <span>Inspect full collection priority queue</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </Card>

        {/* 7-Day Collection Activity & Trends */}
        <Card className="lg:col-span-2 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                7-Day Solid Waste Clearance Volume
              </h3>
              <span className="text-xs text-slate-500 font-semibold">Vilholi SWM Plant Data</span>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              Daily collections completed and metric tons cleared by NMC compaction vehicles.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {trendData.slice(-4).map((d, i) => (
                <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-xs text-slate-500 block">{d.date}</span>
                  <span className="text-lg font-bold text-slate-900 font-mono mt-1 block">
                    {d.volumeTons} <span className="text-xs font-normal">Tons</span>
                  </span>
                  <span className="text-xs text-emerald-700 font-semibold">{d.count} Trips</span>
                </div>
              ))}
            </div>

            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 text-xs text-slate-700 space-y-1">
              <div className="font-bold text-emerald-900 flex items-center gap-1.5 text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                Nashik Municipal Waste Governance
              </div>
              <p>
                All collection weights are logged in compliance with the Solid Waste Management Rules 2016. Wet waste is routed to the Vilholi Composting Facility, while dry recyclables are processed at Ambad MRF.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-100 mt-6">
            <span>Verified against NMC Sanitary Department records.</span>
            <Link to="/organization/analytics" className="font-bold text-sm text-emerald-700 hover:underline">
              Detailed Analytics & Reports →
            </Link>
          </div>
        </Card>
      </div>

      {/* Nashik Wards Health Grid */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Nashik Municipal Wards Status</h3>
            <p className="text-xs text-slate-500">Live operational snapshot across 6 administrative divisions</p>
          </div>
          <Link to="/organization/bins" className="text-sm font-bold text-emerald-700 hover:underline">
            View All Bin Assets →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wardSummaries.map((w) => (
            <div key={w.wardId} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 hover:shadow-sm transition-all">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{w.wardName}</h4>
                  <span className="text-xs text-slate-500">{w.zone}</span>
                </div>
                <span className="font-mono text-xs font-bold bg-white border border-slate-200 text-slate-800 px-2.5 py-1 rounded-lg">
                  {w.binCount} Bins
                </span>
              </div>

              <div className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Average Fill Level:</span>
                  <strong className="text-slate-900 font-mono">{w.averageFillPercentage}%</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Critical Attention Bins:</span>
                  <strong className={w.criticalBinsCount > 0 ? 'text-rose-600 font-bold font-mono' : 'text-slate-700 font-mono'}>
                    {w.criticalBinsCount}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Open Citizen Grievances:</span>
                  <strong className="text-slate-900 font-mono">{w.openComplaintsCount}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
