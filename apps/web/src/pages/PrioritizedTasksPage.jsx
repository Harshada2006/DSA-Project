import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Card } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { SearchInput } from '../components/common/SearchInput.jsx';
import {
  ListOrdered,
  Clock,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Send,
  Activity,
  UserCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PrioritizedTasksPage = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [wards, setWards] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [selectedWard, setSelectedWard] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [toast, setToast] = useState(null);

  // Dispatch Modal state
  const [dispatchTaskModal, setDispatchTaskModal] = useState(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [dispatchSubmitting, setDispatchSubmitting] = useState(false);

  const loadPrioritizedTasks = async (isManualRecalc = false) => {
    if (isManualRecalc) setRecalculating(true);
    else setLoading(true);

    try {
      const [res, wardsRes, workersRes] = await Promise.all([
        api.getPrioritizedTasks({
          wardId: selectedWard || undefined,
          urgency: selectedUrgency || undefined,
        }),
        api.getWards().catch(() => []),
        api.getWorkers().catch(() => []),
      ]);
      setTasks(res.tasks || []);
      setWards(wardsRes || []);
      setWorkers(workersRes || []);

      if (isManualRecalc) {
        setToast(`Collection priorities updated for ${res.tasks.length} bins!`);
        setTimeout(() => setToast(null), 4000);
      }
    } catch (err) {
      console.error('Failed to load prioritized tasks:', err);
      alert(`Error updating collection priority: ${err.message}`);
    } finally {
      setLoading(false);
      setRecalculating(false);
    }
  };

  useEffect(() => {
    loadPrioritizedTasks();
  }, [selectedWard, selectedUrgency]);

  const handleOpenDispatch = (task) => {
    setDispatchTaskModal(task);
    setSelectedWorkerId('');
  };

  const handleConfirmDispatch = async (e) => {
    e.preventDefault();
    if (!dispatchTaskModal) return;
    setDispatchSubmitting(true);
    try {
      await api.createTask({
        binId: dispatchTaskModal.bin_id,
        assignedWorkerId: selectedWorkerId || undefined,
        taskPriority: dispatchTaskModal.priority_category ? dispatchTaskModal.priority_category.toLowerCase() : 'high',
        notes: `Dispatched from Priority Rank #${dispatchTaskModal.rank || 1} (Score: ${Math.round(dispatchTaskModal.priority_score || 0)})`,
      });
      setToast(`Task created for ${dispatchTaskModal.bin_code}! Assigned to field queue.`);
      setDispatchTaskModal(null);
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      alert(`Failed to dispatch task: ${err.message}`);
    } finally {
      setDispatchSubmitting(false);
    }
  };

  const getCategoryBadge = (category) => {
    const cat = (category || '').toLowerCase();
    if (cat === 'critical') return <span className="px-2.5 py-1 rounded text-xs font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300">Critical</span>;
    if (cat === 'high') return <span className="px-2.5 py-1 rounded text-xs font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">High</span>;
    if (cat === 'monitor') return <span className="px-2.5 py-1 rounded text-xs font-bold uppercase bg-blue-100 text-blue-800 border border-blue-300">Monitor</span>;
    return <span className="px-2.5 py-1 rounded text-xs font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">Normal</span>;
  };

  const filteredTasks = tasks.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (t.bin_code || '').toLowerCase().includes(q) ||
      (t.bin_name || '').toLowerCase().includes(q) ||
      (t.ward_name || '').toLowerCase().includes(q) ||
      (t.area_category || '').toLowerCase().includes(q)
    );
  });

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
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Collection Priority Management</h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-semibold border border-emerald-200">
              Automated Priority Ranking
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Dynamic prioritization based on fill levels, overflow risk, collection intervals, and sensitive area proximity
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => loadPrioritizedTasks(true)}
            isLoading={recalculating}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Recalculate Priorities
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[240px]">
            <SearchInput
              value={search}
              onChange={setSearch}
              onClear={() => setSearch('')}
              placeholder="Search by bin code, name, or ward..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="px-3.5 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">All Wards in Nashik</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.zone})
                </option>
              ))}
            </select>

            <select
              value={selectedUrgency}
              onChange={(e) => setSelectedUrgency(e.target.value)}
              className="px-3.5 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">All Urgency Levels</option>
              <option value="critical">Critical (Score 80–100)</option>
              <option value="high">High (Score 60–79)</option>
              <option value="monitor">Monitor (Score 40–59)</option>
              <option value="normal">Normal (Score 0–39)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Prioritized Tasks Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-xs">
              <tr>
                <th className="p-3.5">Rank</th>
                <th className="p-3.5">Asset Code & Name</th>
                <th className="p-3.5">Nashik Ward / Area</th>
                <th className="p-3.5">Predicted Fill</th>
                <th className="p-3.5">Priority Score</th>
                <th className="p-3.5">Urgency Status</th>
                <th className="p-3.5 text-right">Dispatch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    Calculating priority order...
                  </td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-slate-500">
                    No priority bins found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr key={task.bin_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5">
                      <span className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold font-mono text-xs flex items-center justify-center">
                        {task.rank}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-slate-900 text-sm">{task.bin_code}</div>
                      <div className="text-xs text-slate-500 font-medium">{task.bin_name}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-800 text-xs">{task.ward_name}</div>
                      <span className="text-[11px] text-slate-500 uppercase">{task.area_category}</span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-800 text-sm">
                          ~{Math.round(task.predicted_fill || task.current_fill || 50)}%
                        </span>
                        <span className="text-[10px] text-slate-400">est.</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono font-bold text-sm text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {Math.round(task.priority_score || 0)}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {getCategoryBadge(task.priority_category)}
                    </td>
                    <td className="p-3.5 text-right">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => handleOpenDispatch(task)}
                        icon={<Send className="w-3.5 h-3.5" />}
                      >
                        Dispatch Task
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Dispatch Modal with Worker Assignment */}
      <Modal
        isOpen={!!dispatchTaskModal}
        onClose={() => setDispatchTaskModal(null)}
        title={`Dispatch Priority Task #${dispatchTaskModal?.rank}: ${dispatchTaskModal?.bin_code}`}
      >
        <form onSubmit={handleConfirmDispatch} className="space-y-4 text-xs">
          <div>
            <span className="text-slate-500 block mb-1 font-semibold">Target Bin Receptacle:</span>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="font-bold text-slate-900 text-sm">{dispatchTaskModal?.bin_code} — {dispatchTaskModal?.bin_name}</div>
              <div className="text-slate-600 mt-1">
                Ward: {dispatchTaskModal?.ward_name} • Priority Score: {Math.round(dispatchTaskModal?.priority_score || 0)} ({dispatchTaskModal?.priority_category})
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Assign Field Driver (Optional)
            </label>
            <select
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
            >
              <option value="">Unassigned (Open Dispatch Pool)</option>
              {workers.map((w) => (
                <option key={w.id} value={w.userId || w.id}>
                  {w.user?.name || w.workerId} ({w.workerId}) — {w.vehicleType || 'compactor'}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              If left unassigned, any authorized municipal driver can accept the task from their queue.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setDispatchTaskModal(null)} type="button">
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={dispatchSubmitting}>
              Confirm Dispatch
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
