import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Card } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import {
  Tv,
  ShieldCheck,
  CheckCircle2,
  Clock,
  RefreshCw,
  Plus,
  Send,
  FileText,
  Building2,
  Calendar,
} from 'lucide-react';

export const EWastePage = () => {
  const [requests, setRequests] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Handover modal state
  const [isHandoverOpen, setIsHandoverOpen] = useState(false);
  const [handoverSubmitting, setHandoverSubmitting] = useState(false);
  const [handoverForm, setHandoverForm] = useState({
    facilityId: '',
    wasteCategory: 'ELECTRONIC',
    weightKg: 65,
    itemCount: 12,
    manifestNumber: `MNF-NSK-${Date.now().toString().slice(-6)}`,
    certificateNumber: `CERT-MPCB-${Date.now().toString().slice(-6)}`,
    notes: 'Bulk transfer from NMC Ambad Ward collection drives',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqData, facData, workersData] = await Promise.all([
        api.getEWasteRequests(),
        api.getFacilities({ facilityType: 'RECYCLER' }),
        api.getWorkers().catch(() => []),
      ]);
      setRequests(reqData || []);
      setFacilities(facData || []);
      setWorkers(workersData || []);
      if (facData.length > 0 && !handoverForm.facilityId) {
        setHandoverForm((prev) => ({ ...prev, facilityId: facData[0].id }));
      }
    } catch (err) {
      console.error('Failed to load e-waste data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRecordHandover = async (e) => {
    e.preventDefault();
    setHandoverSubmitting(true);
    try {
      await api.recordEWasteHandover(handoverForm);
      alert('Handover record and MPCB manifest successfully logged!');
      setIsHandoverOpen(false);
      loadData();
    } catch (err) {
      alert(`Handover record failed: ${err.message}`);
    } finally {
      setHandoverSubmitting(false);
    }
  };

  const handleAssignWorker = async (requestId, workerId) => {
    try {
      await api.assignEWasteWorker(requestId, workerId);
      alert('Worker assigned for doorstep pickup!');
      loadData();
    } catch (err) {
      alert(`Assignment failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">E-Waste & MPCB Recycler Operations</h1>
            <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-purple-200">
              E-Waste Stream
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Doorstep residential electronic collections routed directly to verified MPCB authorized recycling processors
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsHandoverOpen(true)}
            icon={<FileText className="w-3.5 h-3.5" />}
          >
            Log Recycler Handover
          </Button>
        </div>
      </div>

      {/* Recyclers Info Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {facilities.map((f) => (
          <div key={f.id} className="p-4 rounded-2xl border border-purple-200 bg-purple-50/50 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900">{f.name}</span>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded uppercase">
                  MPCB Verified
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">{f.locationDescription || f.address}</p>
              <div className="mt-2 text-xs text-slate-500 font-mono">
                License: {f.licenseNumber || 'MPCB Authorized Recycler'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Requests Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Citizen Residential E-Waste Bookings
          </span>
          <span className="text-xs text-slate-500">{requests.length} Requests</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-xs">
              <tr>
                <th className="p-3.5">Tracking #</th>
                <th className="p-3.5">Category & Description</th>
                <th className="p-3.5">Weight (Est.)</th>
                <th className="p-3.5">Pickup Address</th>
                <th className="p-3.5">Preferred Slot</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Assign Driver</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-600 mb-2" />
                    Loading e-waste bookings...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-slate-500">
                    No active residential e-waste pickup requests.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-purple-900 text-sm">
                      {r.trackingNumber || `EW-${r.id.slice(0, 8)}`}
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900 text-sm">{r.category}</div>
                      <div className="text-slate-500 text-xs truncate max-w-xs">{r.description}</div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-800 font-bold text-sm">
                      {r.weightKg ? `${r.weightKg} kg` : '~2 kg'}
                    </td>
                    <td className="p-3.5 text-slate-700 max-w-xs truncate text-sm">
                      {r.address}
                    </td>
                    <td className="p-3.5 text-slate-600 text-xs">
                      <div>{new Date(r.preferredDate).toLocaleDateString()}</div>
                      <div className="text-slate-400 font-mono text-xs">{r.preferredTimeSlot}</div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-1 rounded text-xs font-bold uppercase bg-purple-100 text-purple-800">
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {r.assignedWorkerId ? (
                        <span className="text-slate-500 text-[11px] font-mono">Assigned</span>
                      ) : (
                        <select
                          onChange={(e) => {
                            if (e.target.value) handleAssignWorker(r.id, e.target.value);
                          }}
                          className="px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                          defaultValue=""
                        >
                          <option value="" disabled>Assign Worker</option>
                          {workers.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.user?.name} ({w.workerId})
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recycler Handover Modal */}
      <Modal
        isOpen={isHandoverOpen}
        onClose={() => setIsHandoverOpen(false)}
        title="Log Handover to MPCB Authorized Recycler"
      >
        <form onSubmit={handleRecordHandover} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Authorized Recycler Destination *</label>
            <select
              required
              value={handoverForm.facilityId}
              onChange={(e) => setHandoverForm({ ...handoverForm, facilityId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} (License: {f.licenseNumber || 'MPCB Verified'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Total Weight Handed Over (kg)</label>
              <input
                type="number"
                min="1"
                value={handoverForm.weightKg}
                onChange={(e) => setHandoverForm({ ...handoverForm, weightKg: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Appliance / Item Count</label>
              <input
                type="number"
                min="1"
                value={handoverForm.itemCount}
                onChange={(e) => setHandoverForm({ ...handoverForm, itemCount: parseInt(e.target.value, 10) || 1 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Manifest Document #</label>
              <input
                type="text"
                required
                value={handoverForm.manifestNumber}
                onChange={(e) => setHandoverForm({ ...handoverForm, manifestNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">MPCB Certificate #</label>
              <input
                type="text"
                required
                value={handoverForm.certificateNumber}
                onChange={(e) => setHandoverForm({ ...handoverForm, certificateNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Chain of Custody Notes</label>
            <input
              type="text"
              value={handoverForm.notes}
              onChange={(e) => setHandoverForm({ ...handoverForm, notes: e.target.value })}
              placeholder="e.g. Delivered by truck MH-15-EG-4401 to Trimbak MIDC facility gate"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsHandoverOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={handoverSubmitting}>
              Archive Handover & Manifest
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
