import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Complaint, Ward, Vehicle } from '@eco-collect/shared';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';
import {
  AlertCircle,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  MapPin,
  RefreshCw,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';

export const ComplaintsPage: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [wardFilter, setWardFilter] = useState('');
  const [search, setSearch] = useState('');

  // Create Complaint Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newComplaint, setNewComplaint] = useState({
    category: 'overflow',
    description: '',
    wardId: '',
    latitude: 20.008,
    longitude: 73.794,
    severity: 'medium',
    reportedBy: '',
  });

  // Selected complaint for status update
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);
  const [updateStatus, setUpdateStatus] = useState<string>('assigned');
  const [assignVehId, setAssignVehId] = useState<string>('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const [compRes, wardsRes, vehRes] = await Promise.all([
        api.getComplaints({
          status: statusFilter,
          wardId: wardFilter,
          search,
        }),
        api.getWards(),
        api.getVehicles(),
      ]);
      setComplaints(compRes);
      setWards(wardsRes);
      setVehicles(vehRes);
      if (wardsRes.length > 0 && !newComplaint.wardId) {
        setNewComplaint((prev) => ({ ...prev, wardId: wardsRes[0].id }));
      }
    } catch (err: any) {
      console.error('Failed to load complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, [statusFilter, wardFilter, search]);

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      await api.createComplaint(newComplaint);
      setIsCreateOpen(false);
      setNewComplaint({
        category: 'overflow',
        description: '',
        wardId: wards[0]?.id || '',
        latitude: 20.008,
        longitude: 73.794,
        severity: 'medium',
        reportedBy: '',
      });
      loadComplaints();
    } catch (err: any) {
      alert(`Error submitting complaint: ${err.message}`);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeComplaint) return;
    setUpdateLoading(true);
    try {
      await api.updateComplaint(activeComplaint.id, {
        status: updateStatus as any,
        assignedVehicleId: assignVehId || null,
        resolutionNotes,
      });
      setActiveComplaint(null);
      loadComplaints();
    } catch (err: any) {
      alert(`Update error: ${err.message}`);
    } finally {
      setUpdateLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Citizen Grievance & Complaints
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Log and resolve municipal waste issues; citizen reports directly elevate container priority scores.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          variant="primary"
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
        >
          File Citizen Complaint
        </Button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1">
          {['', 'open', 'assigned', 'in_progress', 'resolved'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-forest-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === '' ? 'All Statuses' : st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={wardFilter}
            onChange={(e) => setWardFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
          >
            <option value="">All Wards</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search ticket..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg w-40 focus:w-56 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Complaints Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {complaints.length > 0 ? (
          complaints.map((c) => (
            <Card key={c.id} className="flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-rose-700">{c.ticketNo}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant={c.severity === 'critical' ? 'danger' : c.severity === 'high' ? 'warning' : 'default'}
                      size="sm"
                    >
                      {c.severity}
                    </Badge>
                    <Badge
                      variant={c.status === 'resolved' ? 'success' : c.status === 'in_progress' ? 'info' : 'default'}
                      size="sm"
                      className="capitalize"
                    >
                      {c.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-slate-900 capitalize">
                    {c.category.replace('_', ' ')}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-3 leading-relaxed">
                    {c.description}
                  </p>
                </div>

                <div className="text-[11px] text-slate-500 space-y-1 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-forest-600 shrink-0" />
                    <span>{c.wardName || 'Nashik'} ({c.latitude.toFixed(4)}, {c.longitude.toFixed(4)})</span>
                  </div>
                  <div>Reported by: <span className="font-semibold text-slate-700">{c.reportedBy}</span></div>
                  <div>Date: {new Date(c.reportedAt).toLocaleString()}</div>
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between">
                <ProvenanceBadge provenance={c.provenance} showIcon={false} />
                <Button
                  onClick={() => {
                    setActiveComplaint(c);
                    setUpdateStatus(c.status);
                    setAssignVehId(c.assignedVehicleId || '');
                    setResolutionNotes(c.resolutionNotes || '');
                  }}
                  variant="outline"
                  size="sm"
                >
                  Manage Status
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-3 py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
            No complaints found matching the selected filters.
          </div>
        )}
      </div>

      {/* File Complaint Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="File Citizen Grievance"
        subtitle="Submit a waste-management service request in Nashik"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateComplaint} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Issue Category *</label>
              <select
                value={newComplaint.category}
                onChange={(e) => setNewComplaint({ ...newComplaint, category: e.target.value as any })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
              >
                <option value="overflow">Bin Overflow</option>
                <option value="odor">Foul Odor / Stench</option>
                <option value="damaged_bin">Damaged Container</option>
                <option value="illegal_dumping">Illegal Dumping</option>
                <option value="missed_collection">Missed Collection</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Ward *</label>
              <select
                value={newComplaint.wardId}
                onChange={(e) => setNewComplaint({ ...newComplaint, wardId: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
              >
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Description *</label>
            <textarea
              required
              rows={3}
              placeholder="Describe the condition, exact landmark, and intensity..."
              value={newComplaint.description}
              onChange={(e) => setNewComplaint({ ...newComplaint, description: e.target.value })}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Latitude (Nashik: ~20.00)</label>
              <input
                type="number"
                step="0.0001"
                required
                value={newComplaint.latitude}
                onChange={(e) => setNewComplaint({ ...newComplaint, latitude: parseFloat(e.target.value) })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Longitude (Nashik: ~73.78)</label>
              <input
                type="number"
                step="0.0001"
                required
                value={newComplaint.longitude}
                onChange={(e) => setNewComplaint({ ...newComplaint, longitude: parseFloat(e.target.value) })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Severity *</label>
              <select
                value={newComplaint.severity}
                onChange={(e) => setNewComplaint({ ...newComplaint, severity: e.target.value as any })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
              >
                <option value="critical">Critical (Immediate Hazard)</option>
                <option value="high">High (Heavy Accumulation)</option>
                <option value="medium">Medium (Standard)</option>
                <option value="low">Low (Minor)</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Citizen Name *</label>
              <input
                type="text"
                required
                placeholder="Full name of reporter"
                value={newComplaint.reportedBy}
                onChange={(e) => setNewComplaint({ ...newComplaint, reportedBy: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" onClick={() => setIsCreateOpen(false)} variant="outline" size="sm">
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={createLoading}>
              Submit Complaint
            </Button>
          </div>
        </form>
      </Modal>

      {/* Update Status Modal */}
      <Modal
        isOpen={!!activeComplaint}
        onClose={() => setActiveComplaint(null)}
        title={`Update Grievance: ${activeComplaint?.ticketNo}`}
        subtitle="Manage municipal workflow status and dispatch assignment"
        maxWidth="md"
      >
        <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Status Workflow *</label>
            <select
              value={updateStatus}
              onChange={(e) => setUpdateStatus(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg capitalize"
            >
              <option value="open">Open</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Assign Collection Truck</label>
            <select
              value={assignVehId}
              onChange={(e) => setAssignVehId(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
            >
              <option value="">Unassigned</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNo} — {v.driverName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Resolution Notes</label>
            <textarea
              rows={3}
              placeholder="Resolution details or operational action taken..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" onClick={() => setActiveComplaint(null)} variant="outline" size="sm">
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={updateLoading}>
              Save Updates
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
