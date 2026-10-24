import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Card } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import {
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw,
  Search,
  Eye,
  UserCheck,
} from 'lucide-react';

export const ComplaintsPage = () => {
  const [complaints, setComplaints] = useState([]);
  const [wards, setWards] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [wardFilter, setWardFilter] = useState('');
  const [search, setSearch] = useState('');

  // Resolution modal state
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [statusForm, setStatusForm] = useState({
    status: 'IN_PROGRESS',
    assignedWorkerId: '',
    resolutionNotes: '',
    internalNotes: '',
  });
  const [updating, setUpdating] = useState(false);

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const [compRes, wardsRes, workersRes] = await Promise.all([
        api.getComplaints({
          status: statusFilter || undefined,
          wardId: wardFilter || undefined,
          search: search || undefined,
        }),
        api.getWards(),
        api.getWorkers().catch(() => []),
      ]);
      setComplaints(compRes || []);
      setWards(wardsRes || []);
      setWorkers(workersRes || []);
    } catch (err) {
      console.error('Failed to load complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, [statusFilter, wardFilter]);

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    setUpdating(true);
    try {
      await api.updateComplaintStatus(selectedComplaint.id, statusForm);
      setSelectedComplaint(null);
      loadComplaints();
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'RESOLVED') return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">Resolved</span>;
    if (s === 'IN_PROGRESS' || s === 'ASSIGNED') return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-300">{s}</span>;
    if (s === 'REJECTED') return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300">Rejected</span>;
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">{s}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Citizen Grievances & Grievance Redressal</h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200">
              {complaints.length} Filed
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track, assign, and resolve municipal sanitation complaints reported by Nashik residents
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={loadComplaints} icon={<RefreshCw className="w-3.5 h-3.5" />}>
          Refresh Queue
        </Button>
      </div>

      {/* Filters Bar */}
      <Card className="p-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ticket # or summary..."
            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value="">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div>
          <select
            value={wardFilter}
            onChange={(e) => setWardFilter(e.target.value)}
            className="px-3.5 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value="">All Wards</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>
                Ward {w.number}: {w.name}
              </option>
            ))}
          </select>
        </div>

        <Button variant="primary" size="md" onClick={loadComplaints}>
          Apply
        </Button>
      </Card>

      {/* Complaints Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-xs">
              <tr>
                <th className="p-3.5">Ticket #</th>
                <th className="p-3.5">Summary</th>
                <th className="p-3.5">Ward & Location</th>
                <th className="p-3.5">Category & Severity</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Filed On</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    Loading citizen grievances...
                  </td>
                </tr>
              ) : complaints.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-slate-500">
                    No complaints matching current filters.
                  </td>
                </tr>
              ) : (
                complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-slate-900 text-sm">
                      {c.ticketNumber || `CMP-${c.id.slice(0, 8)}`}
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900 text-sm">{c.title}</div>
                      <div className="text-slate-500 text-xs truncate max-w-xs">{c.description}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-slate-800 text-sm">{c.ward?.name || 'Nashik Ward'}</div>
                      <div className="text-slate-500 text-xs">{c.landmark || '—'}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-slate-800 text-sm">{c.category}</div>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        c.severity === 'CRITICAL' ? 'text-rose-700 bg-rose-50' :
                        c.severity === 'HIGH' ? 'text-amber-700 bg-amber-50' : 'text-slate-600'
                      }`}>
                        {c.severity}
                      </span>
                    </td>
                    <td className="p-3.5">{getStatusBadge(c.status)}</td>
                    <td className="p-3.5 text-slate-500 text-xs">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 text-right">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          setSelectedComplaint(c);
                          setStatusForm({
                            status: c.status || 'IN_PROGRESS',
                            assignedWorkerId: c.assignedWorkerId || '',
                            resolutionNotes: c.resolutionNotes || '',
                            internalNotes: c.internalNotes || '',
                          });
                        }}
                      >
                        Review & Update
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Review Modal */}
      <Modal
        isOpen={!!selectedComplaint}
        onClose={() => setSelectedComplaint(null)}
        title={`Review Grievance #${selectedComplaint?.ticketNumber || ''}`}
      >
        <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-900 mb-1">{selectedComplaint?.title}</h4>
            <p className="text-slate-600">{selectedComplaint?.description}</p>
            <div className="mt-2 text-[11px] text-slate-500 flex gap-4">
              <span><strong>Ward:</strong> {selectedComplaint?.ward?.name}</span>
              <span><strong>Landmark:</strong> {selectedComplaint?.landmark || 'None'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Update Status *</label>
              <select
                required
                value={statusForm.status}
                onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="SUBMITTED">Submitted</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Assign Field Worker</label>
              <select
                value={statusForm.assignedWorkerId}
                onChange={(e) => setStatusForm({ ...statusForm, assignedWorkerId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Leave Unassigned</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.user?.name} ({w.workerId})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Public Resolution Note (Visible to Citizen)</label>
            <textarea
              rows={2}
              value={statusForm.resolutionNotes}
              onChange={(e) => setStatusForm({ ...statusForm, resolutionNotes: e.target.value })}
              placeholder="e.g. Sanitary inspector dispatched compactor truck MH-15-EG-4401 and cleared the overflow at 11:30 AM."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg resize-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Internal Staff Note (Confidential)</label>
            <input
              type="text"
              value={statusForm.internalNotes}
              onChange={(e) => setStatusForm({ ...statusForm, internalNotes: e.target.value })}
              placeholder="e.g. Regular recurrence spot near fruit vendor stands; flagged for additional bin placement."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setSelectedComplaint(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={updating}>
              Save Redressal Update
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
