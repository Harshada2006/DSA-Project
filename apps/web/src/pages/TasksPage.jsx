import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Card } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { SearchInput } from '../components/common/SearchInput.jsx';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Send,
  UserCheck,
  MapPin,
  Calendar,
} from 'lucide-react';

export const TasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch] = useState('');

  // Create Task Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    binId: '',
    workerId: '',
    priority: 'HIGH',
    notes: 'Dispatched for morning round',
  });
  const [submitting, setSubmitting] = useState(false);

  // Assign / Reassign Task Modal state
  const [assigningTask, setAssigningTask] = useState(null);
  const [selectedWorkerForAssign, setSelectedWorkerForAssign] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksRes, workersRes, binsRes] = await Promise.all([
        api.getTasks({
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
        }),
        api.getWorkers().catch(() => []),
        api.getBins().catch(() => []),
      ]);
      setTasks(tasksRes || []);
      setWorkers(workersRes || []);
      setBins(binsRes || []);
      if (binsRes.length > 0 && !createForm.binId) {
        setCreateForm((prev) => ({ ...prev, binId: binsRes[0].id }));
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, priorityFilter]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createTask({
        binId: createForm.binId,
        assignedWorkerId: createForm.workerId || undefined,
        taskPriority: createForm.priority,
        notes: createForm.notes,
      });
      setIsCreateOpen(false);
      loadData();
    } catch (err) {
      alert(`Create task error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignTask = async (e) => {
    e.preventDefault();
    if (!assigningTask || !selectedWorkerForAssign) return;
    setAssignSubmitting(true);
    try {
      await api.assignTask(assigningTask.id, {
        assignedWorkerId: selectedWorkerForAssign,
      });
      setAssigningTask(null);
      setSelectedWorkerForAssign('');
      loadData();
    } catch (err) {
      alert(`Failed to assign worker: ${err.message}`);
    } finally {
      setAssignSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'COLLECTED' || s === 'COMPLETED') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
          Collected
        </span>
      );
    }
    if (s === 'IN_PROGRESS' || s === 'STARTED') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-indigo-100 text-indigo-800 border border-indigo-300">
          In Progress
        </span>
      );
    }
    if (s === 'ASSIGNED') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-purple-100 text-purple-800 border border-purple-300">
          Assigned
        </span>
      );
    }
    if (s === 'MISSED' || s === 'BLOCKED') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300">
          {s}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
        Pending
      </span>
    );
  };

  const filteredTasks = tasks.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const workerName = t.assignedWorker?.name || t.worker?.user?.name || '';
    const workerEmail = t.assignedWorker?.email || '';
    return (
      (t.id || '').toLowerCase().includes(q) ||
      (t.bin?.code || '').toLowerCase().includes(q) ||
      (t.bin?.name || '').toLowerCase().includes(q) ||
      workerName.toLowerCase().includes(q) ||
      workerEmail.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dispatch & Collection Tasks</h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200">
              {tasks.length} Total
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time assignment and execution log for Nashik Municipal Corporation field drivers
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsCreateOpen(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          Create Dispatch Task
        </Button>
      </div>

      {/* Filters with SearchInput */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[240px]">
            <SearchInput
              value={search}
              onChange={setSearch}
              onClear={() => setSearch('')}
              placeholder="Search by Task ID, bin code, name, or assigned worker..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending (Unassigned)</option>
              <option value="assigned">Assigned</option>
              <option value="started">Started / In Progress</option>
              <option value="collected">Collected</option>
              <option value="missed">Missed / Blocked</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3.5 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <Button variant="outline" size="sm" onClick={loadData} icon={<RefreshCw className="w-3.5 h-3.5" />}>
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* Tasks Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Task ID</th>
                <th className="p-3.5">Target Bin Asset</th>
                <th className="p-3.5">Assigned Worker</th>
                <th className="p-3.5">Priority</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Scheduled</th>
                <th className="p-3.5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    Loading collection tasks...
                  </td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-slate-500">
                    No collection tasks found. Dispatch one above or from the Collection Priority view!
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-slate-900 text-xs">
                      #{task.id.slice(0, 8)}
                    </td>
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-slate-800">{task.bin?.code || 'Bin'}</div>
                      <div className="text-slate-500 text-[11px]">
                        {task.bin?.name} ({task.bin?.ward?.name})
                      </div>
                    </td>
                    <td className="p-3.5">
                      {task.assignedWorker ? (
                        <div>
                          <div className="font-semibold text-slate-800">{task.assignedWorker.name}</div>
                          <div className="text-slate-500 font-mono text-[10px]">{task.assignedWorker.email}</div>
                        </div>
                      ) : task.worker?.user ? (
                        <div>
                          <div className="font-semibold text-slate-800">{task.worker.user.name}</div>
                          <div className="text-slate-500 font-mono text-[10px]">{task.worker.workerId}</div>
                        </div>
                      ) : (
                        <span className="text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded text-[10px] border border-amber-200">
                          Pending Worker Assignment
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 font-bold">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono ${
                          task.taskPriority === 'critical' || task.priority === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800'
                            : task.taskPriority === 'high' || task.priority === 'HIGH'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {task.taskPriority || task.priority || 'Normal'}
                      </span>
                    </td>
                    <td className="p-3.5">{getStatusBadge(task.status)}</td>
                    <td className="p-3.5 text-slate-500 font-mono whitespace-nowrap">
                      {new Date(task.scheduledDate || task.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      {task.status !== 'collected' && task.status !== 'completed' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs py-1 px-2.5 font-semibold text-emerald-800 border-emerald-300 hover:bg-emerald-50"
                          onClick={() => {
                            setAssigningTask(task);
                            setSelectedWorkerForAssign(task.assignedWorkerId || '');
                          }}
                          icon={<UserCheck className="w-3.5 h-3.5 text-emerald-600" />}
                        >
                          {task.assignedWorkerId ? 'Reassign' : 'Assign Driver'}
                        </Button>
                      ) : (
                        <span className="text-emerald-700 text-[11px] font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Collected
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Task Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Dispatch New Municipal Collection Task"
      >
        <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Target Bin Asset *</label>
            <select
              required
              value={createForm.binId}
              onChange={(e) => setCreateForm({ ...createForm, binId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
            >
              {bins.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} - {b.name} ({b.ward?.name}) • Fill: {b.currentFillPercentage}%
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Assign Worker</label>
              <select
                value={createForm.workerId}
                onChange={(e) => setCreateForm({ ...createForm, workerId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
              >
                <option value="">Unassigned (Open Dispatch)</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.userId || w.id}>
                    {w.user?.name || w.workerId} ({w.workerId})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Priority Tier</label>
              <select
                value={createForm.priority}
                onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
              >
                <option value="CRITICAL">Critical (Score 80+)</option>
                <option value="HIGH">High (Score 60+)</option>
                <option value="MEDIUM">Medium (Score 40+)</option>
                <option value="LOW">Low (Score 0-39)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Dispatcher Operational Notes</label>
            <textarea
              rows={2}
              value={createForm.notes}
              onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              placeholder="e.g. Cleared for market day preparation"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)} type="button">
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={submitting}>
              Dispatch Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign / Reassign Worker Modal */}
      <Modal
        isOpen={!!assigningTask}
        onClose={() => setAssigningTask(null)}
        title={`Assign Driver to Task #${assigningTask?.id?.slice(0, 8)}`}
      >
        <form onSubmit={handleAssignTask} className="space-y-4 text-xs">
          <div>
            <span className="text-slate-500 block mb-1 font-semibold">Target Receptacle:</span>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-800">{assigningTask?.bin?.code}</span> — {assigningTask?.bin?.name} ({assigningTask?.bin?.ward?.name})
            </div>
          </div>
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Select Field Worker / Driver *</label>
            <select
              required
              value={selectedWorkerForAssign}
              onChange={(e) => setSelectedWorkerForAssign(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
            >
              <option value="">-- Choose an active field worker --</option>
              {workers.map((w) => (
                <option key={w.id} value={w.userId || w.id}>
                  {w.user?.name || w.workerId} ({w.workerId}) — {w.vehicleType || 'compactor'}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setAssigningTask(null)} type="button">
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={assignSubmitting}>
              Confirm Assignment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
