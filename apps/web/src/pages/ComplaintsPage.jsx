import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Card } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { SearchInput } from '../components/common/SearchInput.jsx';
import {
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw,
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
    if (s === 'RESOLVED') return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">Resolved</span>;
    if (s === 'IN_PROGRESS' || s === 'ASSIGNED') return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-blue-100 text-blue-800 border border-blue-300">{s}</span>;
    if (s === 'REJECTED') return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300">Rejected</span>;
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">{s}</span>;
  };

  const filteredComplaints = complaints.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.ticketNumber || '').toLowerCase().includes(q) ||
      (c.title || '').toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q) ||
      (c.ward?.name || '').toLowerCase().includes(q) ||
      (c.landmark || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Citizen Grievances & Redressal</h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200">
              {complaints.length} Filed
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Track, assign, and resolve municipal sanitation complaints reported by Nashik residents
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={loadComplaints} icon={<RefreshCw className="w-3.5 h-3.5" />}>
          Refresh Queue
        </Button>
      </div>

      {/* Filters Bar with SearchInput */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[240px]">
            <SearchInput
              value={search}
              onChange={setSearch}
              onClear={() => setSearch('')}
              placeholder="Search by ticket #, summary, or landmark..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={wardFilter}
              onChange={(e) => setWardFilter(e.target.value)}
              className="px-3.5 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">All Wards</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>
                  Ward {w.number}: {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Complaints Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-xs">
              <tr>
                <th className="p-3.5">Ticket #</th>
                <th className="p-3.5">Summary</th>
                <th className="p-3.5">Ward & Landmark</th>
                <th className="p-3.5">Category</th>
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
              ) : filteredComplaints.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-slate-500">
                    No complaints matching current filters.
                  </td>
                </tr>
              ) : (
                filteredComplaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-slate-900 text-xs">
                      {c.ticketNumber || `CMP-${c.id.slice(0, 8)}`}
                    </td>
                    <td className="p-3.5 max-w-xs">
                      <div className="font-semibold text-slate-900 text-xs truncate" title={c.title}>{c.title}</div>
                      <div className="text-slate-500 text-[11px] truncate max-w-xs">{c.description || 'No additional notes'}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-slate-800 text-xs">{c.ward?.name || 'Nashik Ward'}</div>
                      <div className="text-slate-500 text-[11px] truncate max-w-xs">{c.landmark || '—'}</div>
                    </td>
                    <td className="p-3.5">
                      <span className="text-xs font-medium text-slate-700 capitalize">
                        {c.category?.toLowerCase().replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {getStatusBadge(c.status)}
                    </td>
                    <td className="p-3.5 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 text-right">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          setSelectedComplaint(c);
                          setStatusForm({
                            status: c.status === 'submitted' ? 'IN_PROGRESS' : c.status,
                            assignedWorkerId: c.assignedWorkerId || '',
                            resolutionNotes: c.resolutionNotes || '',
                            internalNotes: c.internalNotes || '',
                          });
                        }}
                        icon={<Eye className="w-3.5 h-3.5" />}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Complaint Review Modal */}
      {selectedComplaint && (
        <Modal
          isOpen={!!selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
          title={`Grievance Review: #${selectedComplaint.ticketNumber || selectedComplaint.id.slice(0, 8)}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-600">Issue:</span>
                <strong className="text-slate-900">{selectedComplaint.title}</strong>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-600">Ward:</span>
                <span className="text-slate-800">{selectedComplaint.ward?.name || 'Nashik'}</span>
              </div>
              {selectedComplaint.landmark && (
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-600">Landmark:</span>
                  <span className="text-slate-800">{selectedComplaint.landmark}</span>
                </div>
              )}
              {selectedComplaint.description && (
                <div className="pt-1 border-t border-slate-200">
                  <span className="font-semibold text-slate-600 block mb-0.5">Details:</span>
                  <p className="text-slate-700">{selectedComplaint.description}</p>
                </div>
              )}
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Status Transition</label>
                <select
                  value={statusForm.status}
                  onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="SUBMITTED">Submitted (Pending Review)</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="ASSIGNED">Assigned to Field Crew</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved / Cleared</option>
                  <option value="REJECTED">Rejected / Invalid</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Assign Sanitary Driver / Worker</label>
                <select
                  value={statusForm.assignedWorkerId}
                  onChange={(e) => setStatusForm({ ...statusForm, assignedWorkerId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="">Select Field Staff (Optional)</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.user?.name || w.workerId} ({w.workerId} • {w.vehicleNumber || 'Van'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Citizen Resolution Feedback Note</label>
                <textarea
                  rows={2}
                  value={statusForm.resolutionNotes}
                  onChange={(e) => setStatusForm({ ...statusForm, resolutionNotes: e.target.value })}
                  placeholder="Note visible to the citizen upon resolution..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setSelectedComplaint(null)} type="button">
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={updating}>
                  Save Resolution
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};
