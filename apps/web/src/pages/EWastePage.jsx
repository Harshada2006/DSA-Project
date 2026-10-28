import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Card } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { SearchInput } from '../components/common/SearchInput.jsx';
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
  Truck,
  AlertCircle,
} from 'lucide-react';

export const EWastePage = () => {
  const [requests, setRequests] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);

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

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

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
      showToast('error', `Failed to load e-waste data: ${err.message}`);
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
      showToast('success', 'Handover record and facility manifest successfully logged!');
      setIsHandoverOpen(false);
      loadData();
    } catch (err) {
      showToast('error', `Handover record failed: ${err.message}`);
    } finally {
      setHandoverSubmitting(false);
    }
  };

  const handleAssignWorker = async (requestId, workerId) => {
    try {
      await api.assignEWasteWorker(requestId, workerId);
      showToast('success', 'Worker assigned for doorstep pickup!');
      loadData();
    } catch (err) {
      showToast('error', `Assignment failed: ${err.message}`);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.trackingNumber || '').toLowerCase().includes(q) ||
      (r.category || '').toLowerCase().includes(q) ||
      (r.description || '').toLowerCase().includes(q) ||
      (r.address || '').toLowerCase().includes(q) ||
      (r.assignedWorker?.name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toast && (
        <div className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border text-xs font-semibold ${
          toast.type === 'success' ? 'bg-slate-900 text-emerald-400 border-emerald-500/50' : 'bg-rose-900 text-white border-rose-500'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">E-Waste & Recycler Operations</h1>
            <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-purple-200">
              E-Waste Stream
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Doorstep residential electronic collections routed directly to verified recycling and refurbishment facilities
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
            Log Facility Handover
          </Button>
        </div>
      </div>

      {/* Recyclers Info Banner (Section 18 Nashik facilities) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {facilities.slice(0, 3).map((f) => (
          <div key={f.id} className="p-4 rounded-2xl border border-purple-200 bg-purple-50/50 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900">{f.name}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                  f.verificationStatus === 'verified' ? 'bg-emerald-100 text-emerald-800' :
                  f.verificationStatus === 'pending_confirmation' ? 'bg-amber-100 text-amber-800' :
                  'bg-slate-200 text-slate-700'
                }`}>
                  {f.verificationStatus?.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">{f.facilityAddress || f.address}</p>
              <div className="mt-2 text-xs text-slate-500 font-mono">
                {f.area || 'Nashik'} • {f.pickupAvailable ? 'Pickup Available' : 'Drop-off'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search Input Bar */}
      <Card className="p-4">
        <div className="max-w-md">
          <SearchInput
            value={search}
            onChange={setSearch}
            onClear={() => setSearch('')}
            placeholder="Search bookings by tracking #, category, address, or driver..."
          />
        </div>
      </Card>

      {/* Requests Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Citizen Residential E-Waste Bookings
          </span>
          <span className="text-xs text-slate-500">{filteredRequests.length} Requests</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-xs">
              <tr>
                <th className="p-3.5">Tracking #</th>
                <th className="p-3.5">Category & Description</th>
                <th className="p-3.5">Items</th>
                <th className="p-3.5">Pickup Address</th>
                <th className="p-3.5">Scheduled Date</th>
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
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-slate-500">
                    No residential e-waste pickup requests match your search.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-purple-900 text-sm">
                      {r.trackingNumber || `EW-${r.id.slice(0, 8)}`}
                    </td>
                    <td className="p-3.5 max-w-xs">
                      <div className="font-semibold text-slate-900 text-xs capitalize">{r.category?.toLowerCase().replace(/_/g, ' ')}</div>
                      <div className="text-slate-500 text-[11px] truncate">{r.description || 'Appliance collection'}</div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-800 font-bold text-xs">
                      {r.itemCount || 1} units
                    </td>
                    <td className="p-3.5 text-slate-700 max-w-xs truncate text-xs" title={r.address}>
                      {r.address}
                    </td>
                    <td className="p-3.5 text-slate-600 text-xs whitespace-nowrap">
                      {r.preferredDate ? new Date(r.preferredDate).toLocaleDateString() : 'Scheduled'}
                      <div className="text-slate-400 font-mono text-[10px]">{r.preferredTimeSlot}</div>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                        r.status === 'DELIVERED_TO_RECYCLER' || r.status === 'COLLECTED' ? 'bg-emerald-100 text-emerald-800' :
                        r.status === 'ASSIGNED' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {r.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {r.assignedWorker ? (
                        <span className="text-slate-700 text-xs font-medium">
                          {r.assignedWorker.name}
                        </span>
                      ) : (
                        <select
                          onChange={(e) => {
                            if (e.target.value) handleAssignWorker(r.id, e.target.value);
                          }}
                          className="px-2 py-1 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
                          defaultValue=""
                        >
                          <option value="" disabled>Assign Driver</option>
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
        title="Log Handover to Verified Facility"
      >
        <form onSubmit={handleRecordHandover} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Destination Facility *</label>
            <select
              required
              value={handoverForm.facilityId}
              onChange={(e) => setHandoverForm({ ...handoverForm, facilityId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.area || 'Nashik'} • {f.verificationStatus?.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Total Weight (kg) *</label>
              <input
                type="number"
                min="1"
                required
                value={handoverForm.weightKg}
                onChange={(e) => setHandoverForm({ ...handoverForm, weightKg: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Total Unit Count *</label>
              <input
                type="number"
                min="1"
                required
                value={handoverForm.itemCount}
                onChange={(e) => setHandoverForm({ ...handoverForm, itemCount: parseInt(e.target.value, 10) || 1 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Manifest Document # *</label>
              <input
                type="text"
                required
                value={handoverForm.manifestNumber}
                onChange={(e) => setHandoverForm({ ...handoverForm, manifestNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Certificate # *</label>
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
            <label className="font-semibold text-slate-700 block mb-1">Handover Notes</label>
            <textarea
              rows={2}
              value={handoverForm.notes}
              onChange={(e) => setHandoverForm({ ...handoverForm, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsHandoverOpen(false)} type="button">
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={handoverSubmitting}>
              Archive Handover
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
