import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Card } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { SearchInput } from '../components/common/SearchInput.jsx';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Clock,
  RefreshCw,
  Plus,
  MapPin,
  Truck,
  Trash2,
  Filter,
} from 'lucide-react';

export const IssuesPage = () => {
  const [issues, setIssues] = useState([]);
  const [roadblocks, setRoadblocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [toast, setToast] = useState(null);

  // New Issue Modal
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    issueType: 'blocked_road',
    roadName: '',
    location: '',
    description: '',
  });

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [issuesRes, roadblocksRes] = await Promise.all([
        api.getIssues({
          status: statusFilter || undefined,
          issueType: typeFilter || undefined,
        }),
        api.getActiveRoadblocks().catch(() => []),
      ]);
      setIssues(issuesRes || []);
      setRoadblocks(roadblocksRes || []);
    } catch (err) {
      console.error('Failed to load operational issues:', err);
      showToast('error', `Failed to load issues: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, typeFilter]);

  const handleCreateIssue = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.reportIssue({
        issueType: form.issueType,
        roadName: form.roadName.trim() || undefined,
        location: form.location.trim() || undefined,
        description: form.description.trim() || undefined,
        latitude: 19.9975,
        longitude: 73.7898,
      });

      showToast('success', 'Operational issue / roadblock registered successfully!');
      setIsNewOpen(false);
      setForm({
        issueType: 'blocked_road',
        roadName: '',
        location: '',
        description: '',
      });
      loadData();
    } catch (err) {
      showToast('error', `Failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveIssue = async (issueId) => {
    try {
      await api.updateIssueStatus(issueId, { status: 'resolved' });
      showToast('success', 'Issue marked as resolved!');
      loadData();
    } catch (err) {
      showToast('error', `Update failed: ${err.message}`);
    }
  };

  const handleToggleRoadEdge = async (roadEdgeId, currentBlocked) => {
    try {
      await api.toggleRoadblock({
        roadEdgeId,
        isBlocked: !currentBlocked,
        blockedReason: currentBlocked ? null : 'Reported municipal road closure',
      });
      showToast('success', `Road segment ${currentBlocked ? 'unblocked' : 'marked blocked'} for routing!`);
      loadData();
    } catch (err) {
      showToast('error', `Toggle failed: ${err.message}`);
    }
  };

  const filteredIssues = issues.filter((iss) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (iss.issueType || '').toLowerCase().includes(q) ||
      (iss.description || '').toLowerCase().includes(q) ||
      (iss.location || '').toLowerCase().includes(q) ||
      (iss.reporter?.name || '').toLowerCase().includes(q)
    );
  });

  const getIssueTypeBadge = (type) => {
    const map = {
      blocked_road: { label: 'Road Blocked', bg: 'bg-rose-100 text-rose-800 border-rose-300' },
      damaged_bin: { label: 'Damaged Bin', bg: 'bg-amber-100 text-amber-800 border-amber-300' },
      inaccessible_point: { label: 'Inaccessible Point', bg: 'bg-purple-100 text-purple-800 border-purple-300' },
      vehicle_problem: { label: 'Vehicle Issue', bg: 'bg-blue-100 text-blue-800 border-blue-300' },
      unsafe_location: { label: 'Unsafe Location', bg: 'bg-orange-100 text-orange-800 border-orange-300' },
    };
    const item = map[type] || { label: type?.replace(/_/g, ' ') || 'Issue', bg: 'bg-slate-100 text-slate-800 border-slate-300' };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${item.bg}`}>
        {item.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border text-xs font-semibold ${
          toast.type === 'success' ? 'bg-slate-900 text-emerald-400 border-emerald-500/50' : 'bg-rose-900 text-white border-rose-500'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Roadblocks & Operational Issues</h1>
            <span className="bg-rose-100 text-rose-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-rose-200">
              {roadblocks.length} Active Roadblocks
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time field incident management, street construction closures, and dynamic detour coordination
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" onClick={loadData} icon={<RefreshCw className="w-4 h-4" />}>
            Refresh
          </Button>
          <Button variant="primary" size="md" onClick={() => setIsNewOpen(true)} icon={<Plus className="w-4 h-4" />}>
            Report Incident
          </Button>
        </div>
      </div>

      {/* Active Roadblocks Alert Card */}
      {roadblocks.length > 0 && (
        <Card className="p-5 border-rose-200 bg-rose-50/50">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-sm text-rose-900">
                Active Road Closures Impacting Compactor Routing ({roadblocks.length})
              </h3>
              <p className="text-xs text-rose-700 mt-1">
                The routing engine automatically routes worker vehicles around these street segments:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {roadblocks.map((rb) => (
                  <div
                    key={rb.id}
                    className="p-2.5 bg-white rounded-xl border border-rose-200 text-xs flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800 block">{rb.roadName || 'Municipal Street'}</span>
                      <span className="text-[11px] text-slate-500">{rb.blockedReason || 'Closure'}</span>
                    </div>
                    <button
                      onClick={() => handleToggleRoadEdge(rb.id, true)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                    >
                      Clear / Unblock
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Filters & Search */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[240px]">
            <SearchInput
              value={search}
              onChange={setSearch}
              onClear={() => setSearch('')}
              placeholder="Search by issue type, road name, location, or reporter..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">All Issue Types</option>
              <option value="blocked_road">Blocked Roads</option>
              <option value="damaged_bin">Damaged Bins</option>
              <option value="inaccessible_point">Inaccessible Points</option>
              <option value="vehicle_problem">Vehicle Problems</option>
              <option value="other">Other</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="reported">Reported / Active</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Issues Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-xs">
              <tr>
                <th className="p-3.5">Type & Reference</th>
                <th className="p-3.5">Location / Road</th>
                <th className="p-3.5">Description</th>
                <th className="p-3.5">Reported By</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    Loading issues and road conditions...
                  </td>
                </tr>
              ) : filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-slate-500">
                    No operational issues or roadblocks match your criteria.
                  </td>
                </tr>
              ) : (
                filteredIssues.map((iss) => (
                  <tr key={iss.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5">
                      {getIssueTypeBadge(iss.issueType)}
                      <span className="block font-mono text-[11px] text-slate-400 mt-1">
                        #{iss.id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900 text-xs">
                        {iss.roadName || iss.location || 'Nashik Municipal Area'}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {new Date(iss.createdAt).toLocaleString()}
                      </span>
                    </td>
                    <td className="p-3.5 max-w-xs">
                      <p className="text-xs text-slate-600 truncate" title={iss.description}>
                        {iss.description || 'No additional details.'}
                      </p>
                    </td>
                    <td className="p-3.5">
                      <span className="text-xs font-medium text-slate-800">
                        {iss.reporter?.name || 'Field Driver'}
                      </span>
                      <span className="block text-[11px] text-slate-400">{iss.reporter?.role || 'Staff'}</span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        iss.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' :
                        iss.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {iss.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {iss.status !== 'resolved' ? (
                        <button
                          onClick={() => handleResolveIssue(iss.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
                        >
                          Mark Resolved
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-700 font-bold flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
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

      {/* New Incident Modal */}
      {isNewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Log Operational Incident / Roadblock</h3>
            <p className="text-xs text-slate-500 mb-5">
              Add a road closure or asset defect to update routing models and notify dispatchers.
            </p>

            <form onSubmit={handleCreateIssue} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Incident Type *</label>
                <select
                  value={form.issueType}
                  onChange={(e) => setForm({ ...form, issueType: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm bg-white"
                >
                  <option value="blocked_road">Blocked Road / Closure</option>
                  <option value="damaged_bin">Damaged Bin Asset</option>
                  <option value="inaccessible_point">Inaccessible Collection Point</option>
                  <option value="vehicle_problem">Vehicle Breakdown</option>
                  <option value="other">Other Operational Issue</option>
                </select>
              </div>

              {form.issueType === 'blocked_road' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Road / Street Name *</label>
                  <input
                    type="text"
                    required
                    value={form.roadName}
                    onChange={(e) => setForm({ ...form, roadName: e.target.value })}
                    placeholder="e.g. Gangapur Road near Jehan Circle"
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Location Details / Ward</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Near Panchavati Karanja Market"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description & Notes</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Explain the road closure reason, duration, or asset issue..."
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setIsNewOpen(false)} type="button">
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={submitting}>
                  Register Incident
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
