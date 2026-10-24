import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Card } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import {
  Building2,
  ShieldCheck,
  MapPin,
  RefreshCw,
  Plus,
  Layers,
  Scale,
} from 'lucide-react';

export const FacilitiesPage = () => {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    facilityType: 'TRANSFER_STATION',
    address: '',
    locationDescription: '',
    latitude: 19.99,
    longitude: 73.78,
    dailyCapacityTons: 150,
    licenseNumber: '',
    verificationStatus: 'verified',
    provenance: 'NMC_SWM_FACILITY_REGISTRY',
  });

  const loadFacilities = async () => {
    setLoading(true);
    try {
      const data = await api.getFacilities();
      setFacilities(data || []);
    } catch (err) {
      console.error('Failed to load facilities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFacilities();
  }, []);

  const handleCreateFacility = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createFacility(form);
      setIsAddOpen(false);
      setForm({
        name: '',
        facilityType: 'TRANSFER_STATION',
        address: '',
        locationDescription: '',
        latitude: 19.99,
        longitude: 73.78,
        dailyCapacityTons: 150,
        licenseNumber: '',
        verificationStatus: 'verified',
        provenance: 'NMC_SWM_FACILITY_REGISTRY',
      });
      loadFacilities();
    } catch (err) {
      alert(`Failed to add facility: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Waste Processing & Recycler Infrastructure</h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200">
              {facilities.length} Authorized Facilities
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            NMC Municipal solid waste plants, transfer stations, and MPCB authorized e-waste recycling processors
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadFacilities} icon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsAddOpen(true)} icon={<Plus className="w-3.5 h-3.5" />}>
            Register Facility
          </Button>
        </div>
      </div>

      {/* Grid of Facilities */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-2" />
            <p className="text-xs">Loading authorized infrastructure...</p>
          </div>
        ) : (
          facilities.map((fac) => (
            <Card key={fac.id} className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    fac.facilityType === 'RECYCLER' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                    fac.facilityType === 'PROCESSING_PLANT' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                    'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}>
                    {fac.facilityType.replace('_', ' ')}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-900">{fac.name}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {fac.locationDescription || fac.address || 'Nashik Municipal Area'}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Daily Capacity:</span>
                    <strong className="text-slate-900">{fac.dailyCapacityTons} Tons/day</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>License / Permit:</span>
                    <strong className="font-mono text-slate-800 text-[11px]">{fac.licenseNumber || 'NMC-SWM-AUTH'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Verification:</span>
                    <span className="font-semibold text-emerald-700 capitalize flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> {fac.verificationStatus}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
                Lat: {fac.latitude?.toFixed(4)}, Lng: {fac.longitude?.toFixed(4)}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add Facility Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Register Waste Processing Facility">
        <form onSubmit={handleCreateFacility} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Facility Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Panchavati Material Recovery Facility"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Facility Classification *</label>
              <select
                value={form.facilityType}
                onChange={(e) => setForm({ ...form, facilityType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="PROCESSING_PLANT">Solid Waste Processing Plant</option>
                <option value="TRANSFER_STATION">Waste Transfer Station</option>
                <option value="MRF">Material Recovery Facility (MRF)</option>
                <option value="RECYCLER">MPCB Authorized Recycler</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Daily Capacity (Tons)</label>
              <input
                type="number"
                value={form.dailyCapacityTons}
                onChange={(e) => setForm({ ...form, dailyCapacityTons: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Full Postal Address / Landmark</label>
            <input
              type="text"
              required
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Survey 42, Vilholi Shivar, Mumbai-Agra Highway, Nashik"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">License / MPCB Permit #</label>
              <input
                type="text"
                value={form.licenseNumber}
                onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                placeholder="MPCB/RO-NSK/SWM/2023-11"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Verification Status</label>
              <select
                value={form.verificationStatus}
                onChange={(e) => setForm({ ...form, verificationStatus: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="verified">Verified Official</option>
                <option value="pending">Pending Audit</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: parseFloat(e.target.value) || 19.99 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: parseFloat(e.target.value) || 73.78 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
              Register Infrastructure
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
