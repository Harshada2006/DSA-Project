import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Card } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge.jsx';
import {
  ListOrdered,
  Cpu,
  Clock,
  RefreshCw,
  Code2,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  MapPin,
  Send,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PrioritizedTasksPage = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedWard, setSelectedWard] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState('');
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [executionTimeMs, setExecutionTimeMs] = useState(0);
  const [algorithm, setAlgorithm] = useState('');
  const [timeComplexity, setTimeComplexity] = useState('');
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const loadPrioritizedTasks = async (isManualRecalc = false) => {
    if (isManualRecalc) setRecalculating(true);
    else setLoading(true);

    try {
      const [res, wardsRes] = await Promise.all([
        api.getPrioritizedTasks({
          wardId: selectedWard || undefined,
          urgency: selectedUrgency || undefined,
        }),
        api.getWards(),
      ]);
      setTasks(res.tasks || []);
      setExecutionTimeMs(res.executionTimeMs || 0);
      setAlgorithm(res.algorithm || 'Max-Heap Priority Queue (C++17)');
      setTimeComplexity(res.timeComplexity || 'O(N log N)');
      setWards(wardsRes || []);

      if (isManualRecalc) {
        setToast(`C++ Max-Heap recalculated ${res.tasks.length} tasks in ${res.executionTimeMs.toFixed(2)} ms!`);
        setTimeout(() => setToast(null), 4000);
      }
    } catch (err) {
      console.error('Failed to load prioritized tasks:', err);
      alert(`Error running C++ engine: ${err.message}`);
    } finally {
      setLoading(false);
      setRecalculating(false);
    }
  };

  useEffect(() => {
    loadPrioritizedTasks();
  }, [selectedWard, selectedUrgency]);

  const handleDispatchTask = async (task) => {
    try {
      await api.createTask({
        binId: task.bin_id,
        priority: task.priority_category ? task.priority_category.toUpperCase() : 'HIGH',
        notes: `Auto-dispatched from C++ Heap rank #${task.rank || 1} (Score: ${task.priority_score})`,
      });
      setToast(`Task created for ${task.bin_code}! Assigned to field collection queue.`);
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      alert(`Failed to dispatch task: ${err.message}`);
    }
  };

  const getCategoryBadge = (category) => {
    const cat = (category || '').toLowerCase();
    if (cat === 'critical') return <span className="px-2.5 py-1 rounded text-xs font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300">Critical</span>;
    if (cat === 'high') return <span className="px-2.5 py-1 rounded text-xs font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">High</span>;
    if (cat === 'monitor') return <span className="px-2.5 py-1 rounded text-xs font-bold uppercase bg-blue-100 text-blue-800 border border-blue-300">Monitor</span>;
    return <span className="px-2.5 py-1 rounded text-xs font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">Normal</span>;
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-slide-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">C++ DSA Priority Queue</h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-semibold border border-emerald-200">
              C++17 Engine
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Deterministic 4-Factor Max-Heap prioritization compiled native binary connected via Node.js stdio IPC
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={() => setIsHowItWorksOpen(true)}
            icon={<Info className="w-4 h-4" />}
          >
            Algorithm Explanation
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => loadPrioritizedTasks(true)}
            isLoading={recalculating}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Re-run C++ Max-Heap
          </Button>
        </div>
      </div>

      {/* Engine Status Banner */}
      <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl shadow-lg border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Cpu className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-bold text-emerald-400">C++ ENGINE ACTIVE</span>
              <span className="text-xs text-slate-400">• MinGW GCC C++17</span>
            </div>
            <p className="text-sm text-slate-300 mt-0.5">
              Algorithm: <strong className="text-white font-mono">{algorithm}</strong> • Complexity: <strong className="text-emerald-300 font-mono">{timeComplexity}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8 text-sm">
          <div>
            <span className="text-slate-400 block text-xs uppercase font-mono">Ranked Tasks</span>
            <span className="text-xl font-bold font-mono text-white">{tasks.length}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-xs uppercase font-mono">C++ Execution Time</span>
            <span className="text-xl font-bold font-mono text-emerald-400">{executionTimeMs.toFixed(2)} ms</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Filter Nashik Ward</label>
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="px-3.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Wards</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>
                  Ward {w.number}: {w.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Urgency Tier</label>
            <select
              value={selectedUrgency}
              onChange={(e) => setSelectedUrgency(e.target.value)}
              className="px-3.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Tiers</option>
              <option value="critical">Critical Only</option>
              <option value="high">High Only</option>
              <option value="medium">Medium Only</option>
              <option value="low">Low Only</option>
            </select>
          </div>
        </div>

        <Button
          variant="outline"
          size="md"
          onClick={() => navigate('/organization/route-optimization')}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          Send to Route Optimizer
        </Button>
      </Card>

      {/* Ranked Tasks List */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            Ranked Prioritization Queue
          </span>
          <span className="text-xs text-slate-500">Sorted by C++ priority_score descending</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-2" />
            <p className="text-sm">Invoking C++ Heap Binary via stdio...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-base font-semibold">No bins require immediate collection</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tasks.map((task, idx) => (
              <div key={task.bin_id || idx} className="p-4 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-slate-900 text-amber-400 font-mono font-bold text-base flex items-center justify-center shrink-0 shadow">
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-base text-slate-900">{task.bin_code}</span>
                      {getCategoryBadge(task.priority_category)}
                      <ProvenanceBadge provenance={task.provenance} showIcon={false} />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-800 mt-0.5">{task.bin_name}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {task.ward_name} • Area: {task.area_category}
                    </p>
                    <p className="text-xs text-slate-600 italic mt-1 bg-slate-100/80 px-3 py-1.5 rounded-md">
                      {task.explanation || '4-factor score calculated'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Factor Breakdown */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-600">
                    <div>Overflow: <strong className="text-slate-800">{task.current_fill}%</strong></div>
                    <div>Delay: <strong className="text-slate-800">{task.hours_since_last_collection || 0}h</strong></div>
                    <div>Location Factor: <strong className="text-slate-800">{task.sensitive_location_factor || 0}</strong></div>
                    <div>Missed: <strong className="text-slate-800">{task.missed_pickups_count || 0}</strong></div>
                  </div>

                  <div className="text-right min-w-[70px]">
                    <span className="text-2xl font-bold font-mono text-emerald-700">{Math.round(task.priority_score)}</span>
                    <span className="block text-xs text-slate-400 uppercase font-mono">Score / 100</span>
                  </div>

                  <Button
                    variant="emerald"
                    size="md"
                    onClick={() => handleDispatchTask(task)}
                    icon={<Send className="w-4 h-4" />}
                  >
                    Dispatch
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Algorithm Modal */}
      <Modal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
        title="C++ Max-Heap 4-Factor Formula"
      >
        <div className="space-y-4 text-xs text-slate-700">
          <p>
            The EcoNexus C++ engine ranks waste collection tasks using an STL Max-Heap (`std::priority_queue`) with a strictly normalized 4-factor scoring model:
          </p>
          <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto">
            priorityScore = 0.40 * overflowRisk + 0.25 * pickupDelay + 0.20 * sensitiveLocationRisk + 0.15 * missedPickupRisk
          </div>
          <div className="space-y-2">
            <div><strong>1. Overflow Risk (40%):</strong> Current fill % scaled with linear accumulation prediction.</div>
            <div><strong>2. Pickup Delay (25%):</strong> Hours elapsed since last collection normalized up to 72 hours.</div>
            <div><strong>3. Sensitive Location (20%):</strong> Pilgrimage sites (e.g. Ramkund, Panchavati Ghats), schools, hospitals.</div>
            <div><strong>4. Missed Pickup (15%):</strong> Compounding penalty for previously unserviced or blocked bins.</div>
          </div>
          <div className="p-2.5 bg-slate-100 rounded-lg text-slate-600">
            <strong>Tie-Breaking:</strong> In case of identical priority scores, tie-breaking is strictly deterministic by bin code ascending, ensuring reproducibility.
          </div>
        </div>
      </Modal>
    </div>
  );
};
