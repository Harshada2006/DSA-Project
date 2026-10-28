import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { Modal } from '../common/Modal.jsx';
import { Badge } from '../common/Badge.jsx';
import {
  Calendar,
  Clock,
  TrendingUp,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Database,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

export const BinHistoryModal = ({ isOpen, onClose, bin, allBins = [] }) => {
  const [selectedBinId, setSelectedBinId] = useState(bin?.id || '');
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState('30'); // '7' | '30' | '90' | '180'
  const [error, setError] = useState('');

  useEffect(() => {
    if (bin?.id) {
      setSelectedBinId(bin.id);
    }
  }, [bin]);

  const fetchHistory = async (binId, date) => {
    if (!binId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.getBinHistory(binId, { date });
      setHistoryData(res);
      if (res.selectedObservation && !date) {
        setSelectedDate(res.selectedObservation.date);
      }
    } catch (err) {
      setError(err.message || 'Failed to load bin historical observations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && selectedBinId) {
      fetchHistory(selectedBinId, selectedDate);
    }
  }, [isOpen, selectedBinId]);

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    fetchHistory(selectedBinId, newDate);
  };

  if (!isOpen) return null;

  // Filter timeline based on dateRangeFilter
  const allTimeline = historyData?.timeline || [];
  const daysLimit = parseInt(dateRangeFilter, 10) || 30;
  const filteredTimeline = allTimeline.slice(-daysLimit);

  const selectedObs = historyData?.selectedObservation || allTimeline[allTimeline.length - 1];
  const prediction = historyData?.prediction;

  const getRiskBadge = (risk) => {
    switch (risk?.toLowerCase()) {
      case 'critical':
        return <Badge variant="critical">CRITICAL OVERFLOW RISK (&gt;85%)</Badge>;
      case 'high':
        return <Badge variant="high">HIGH RISK (70-84%)</Badge>;
      case 'monitor':
        return <Badge variant="medium">MONITOR (50-69%)</Badge>;
      default:
        return <Badge variant="low">NORMAL (&lt;50%)</Badge>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Historical Fill-Level & Predictive Overflow Analysis"
      subtitle={`Asset: ${historyData?.bin?.code || bin?.code || 'Bin'} — ${historyData?.bin?.name || bin?.name || 'Receptacle'}`}
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Top Controls: Bin Selector & Date Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Bin Receptacle
            </label>
            <select
              value={selectedBinId}
              onChange={(e) => {
                setSelectedBinId(e.target.value);
                setSelectedDate('');
              }}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            >
              {allBins.length > 0 ? (
                allBins.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} — {b.name} ({b.ward?.name || 'Ward'})
                  </option>
                ))
              ) : (
                <option value={bin?.id}>{bin?.code} — {bin?.name}</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Inspection Date Picker
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Timeline Zoom Range
            </label>
            <div className="flex gap-1.5">
              {['7', '30', '90', '180'].map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setDateRangeFilter(range)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    dateRangeFilter === range
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {range}D
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm animate-pulse">
            Retrieving 180-day time-series observations from database...
          </div>
        ) : (
          <>
            {/* Observation Card for Selected Date */}
            {selectedObs && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/80">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Inspection Date
                  </span>
                  <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    {selectedObs.date}
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    Day-end observation
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/80">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Fill Percentage
                  </span>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 font-mono">
                    {Math.round(selectedObs.fillPercentage)}%
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    ~{selectedObs.estimatedVolumeLitres} Liters accumulated
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/80">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Overflow Risk Category
                  </span>
                  <div className="mt-1">
                    {getRiskBadge(selectedObs.overflowRisk)}
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1">
                    Deterministic 4-level rubric
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/80">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Collection Activity
                  </span>
                  <div className="mt-1">
                    {selectedObs.collectionPerformed ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-800">
                        <Truck className="w-3.5 h-3.5" />
                        Collected ({selectedObs.collectionQuantityLitres}L)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        No collection on date
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1">
                    Operational log event
                  </span>
                </div>
              </div>
            )}

            {/* Recharts Area Chart showing 180-Day / Filtered Timeseries */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Fill-Level Trajectory & Compactor Collection Events
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Showing daily historical observations over the past {daysLimit} days
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                    Fill Level %
                  </span>
                  <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                    <span className="w-3 h-0.5 bg-rose-500 inline-block" />
                    Overflow Threshold (85%)
                  </span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={filteredTimeline}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.3} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickFormatter={(val) => val.slice(5)} // MM-DD
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickFormatter={(val) => `${val}%`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl text-xs space-y-1">
                              <p className="font-bold text-slate-900 dark:text-white">{data.date}</p>
                              <p className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                                Fill Level: {data.fillPercentage}% ({data.estimatedVolumeLitres}L)
                              </p>
                              <p className="text-slate-500 capitalize">Risk: {data.overflowRisk}</p>
                              {data.collectionPerformed ? (
                                <p className="text-blue-600 dark:text-blue-400 font-semibold">
                                  🚚 Collected: {data.collectionQuantityLitres}L
                                </p>
                              ) : null}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine y={85} stroke="#e11d48" strokeDasharray="4 4" />
                    <Area
                      type="monotone"
                      dataKey="fillPercentage"
                      stroke="#059669"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#fillGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Predictive Overflow Risk Estimation (Separated from Historical) */}
            {prediction && (
              <div className="p-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 rounded-2xl border border-teal-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    Statistical 24-Hour Horizon Predictive Estimation (Tomorrow)
                  </h4>
                  <span className="text-[10px] font-mono bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 px-2 py-0.5 rounded border border-teal-300 dark:border-teal-800">
                    Model: {prediction.method}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="flex items-center justify-between bg-white dark:bg-slate-900/80 p-2.5 rounded-xl border border-teal-200 dark:border-teal-900">
                    <span className="text-slate-600 dark:text-slate-400">Predicted Next-Day Fill Level:</span>
                    <strong className="text-slate-900 dark:text-white font-mono text-sm">
                      ~{prediction.predictedFillTomorrow}%
                    </strong>
                  </div>

                  <div className="flex items-center justify-between bg-white dark:bg-slate-900/80 p-2.5 rounded-xl border border-teal-200 dark:border-teal-900">
                    <span className="text-slate-600 dark:text-slate-400">Predicted Overflow Risk Category:</span>
                    <strong className={`font-mono text-xs ${prediction.riskCategory === 'HIGH' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {prediction.riskCategory}
                    </strong>
                  </div>
                </div>

                {/* Explicit Disclaimer as required by Phase 4 */}
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5 pt-1">
                  <Info className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Disclaimer:</strong> {prediction.disclaimer}
                  </span>
                </div>
              </div>
            )}

            {/* Provenance Badge and Data Source Note */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <Database className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <strong>Data Source Provenance:</strong>{' '}
                <span className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded font-bold">
                  SYNTHETIC_SIMULATION
                </span>{' '}
                — Generated reproducible 180-day baseline for Nashik Municipal Corporation demonstration. No physical IoT fill sensors are required or claimed.
              </div>
            </div>
          </>
        )}

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Close Analysis
          </button>
        </div>
      </div>
    </Modal>
  );
};
