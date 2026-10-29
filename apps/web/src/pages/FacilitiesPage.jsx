import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Card } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { SearchInput } from '../components/common/SearchInput.jsx';
import {
  Building2,
  ShieldCheck,
  MapPin,
  RefreshCw,
  Plus,
  Scale,
  CheckCircle2,
  AlertCircle,
  Truck,
  PackageCheck,
} from 'lucide-react';

export const FacilitiesPage = () => {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const [form, setForm] = useState({
    name: '',
    facilityType: 'RECYCLER',
    wasteType: 'ELECTRONIC',
    businessAddress: '',
    facilityAddress: '',
    area: 'Ambad MIDC',
    dailyCapacityTons: 10,
    licenseNumber: '',
    verificationStatus: 'pending_confirmation',
    pickupAvailable: true,
    publicDropoffAvailable: true,
  });

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadFacilities = async () => {
    setLoading(true);
    try {
      const data = await api.getFacilities();
      setFacilities(data || []);
    } catch (err) {
      console.error('Failed to load facilities:', err);
      showToast('error', `Failed to load facilities: ${err.message}`);
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
      const address = form.facilityAddress || form.businessAddress || form.address || `${form.name}, Nashik`;
      await api.createFacility({
        ...form,
        address,
        latitude: 19.99,
        longitude: 73.78,
      });
      showToast('success', `Facility "${form.name}" registered successfully! Status set to pending confirmation.`);
      setIsAddOpen(false);
      setForm({
        name: '',
        facilityType: 'RECYCLER',
        wasteType: 'ELECTRONIC',
        businessAddress: '',
        facilityAddress: '',
        area: 'Ambad MIDC',
        dailyCapacityTons: 10,
        licenseNumber: '',
        verificationStatus: 'pending_confirmation',
        pickupAvailable: true,
        publicDropoffAvailable: true,
      });
      loadFacilities();
    } catch (err) {
      showToast('error', `Failed to add facility: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFacilities = facilities
    .filter((fac) => {
      if (selectedType && fac.facilityType !== selectedType) return false;
      if (selectedStatus && (fac.verificationStatus || '').toLowerCase() !== selectedStatus.toLowerCase()) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (fac.name || '').toLowerCase().includes(q) ||
        (fac.area || '').toLowerCase().includes(q) ||
        (fac.facilityAddress || fac.address || '').toLowerCase().includes(q) ||
        (fac.businessAddress || '').toLowerCase().includes(q)
      );
    })
    // If filtering for verified facilities specifically, display no more than six verified facilities
    .slice(0, selectedStatus === 'verified' ? 6 : 50);

  const getVerificationBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'verified') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> Verified
        </span>
      );
    }
    if (s === 'pending_confirmation') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
          Pending Confirmation
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
        Unverified / Reference Node
      </span>
    );
  };

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
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Waste Destinations & E-Waste Recyclers</h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200">
              {facilities.length} Documented Facilities
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Authoritative Nashik waste handling facilities, scrap collection centers, and MPCB e-waste recyclers
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

      {/* Filters with SearchInput */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[240px]">
            <SearchInput
              value={search}
              onChange={setSearch}
              onClear={() => setSearch('')}
              placeholder="Search by facility name, area, or address..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">All Facility Types</option>
              <option value="RECYCLER">E-Waste Recyclers / Dismantlers</option>
              <option value="PROCESSING_PLANT">Processing / Compost Plants</option>
              <option value="TRANSFER_STATION">Transfer Stations</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">All Verification Statuses</option>
              <option value="verified">Verified</option>
              <option value="pending_confirmation">Pending Confirmation</option>
              <option value="unverified">Unverified</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Grid of Facilities */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-2" />
            <p className="text-xs">Loading facility infrastructure...</p>
          </div>
        ) : filteredFacilities.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500">
            No facilities match your search criteria.
          </div>
        ) : (
          filteredFacilities.map((fac) => (
            <Card key={fac.id} className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>{getVerificationBadge(fac.verificationStatus)}</div>
                </div>

                <h3 className="font-bold text-base text-slate-900">{fac.name}</h3>
                <span className="text-xs font-semibold text-purple-700 block mt-0.5">
                  {fac.facilityType?.replace(/_/g, ' ')} • {fac.area || 'Nashik'}
                </span>

                {/* Section 18: Separated Contact/Business Address vs Facility Address */}
                <div className="mt-3.5 space-y-2 text-xs">
                  {fac.facilityAddress && (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <strong className="text-slate-800 block text-[11px] uppercase tracking-wider mb-0.5">
                        Facility Address:
                      </strong>
                      <p className="text-slate-600 leading-snug">{fac.facilityAddress}</p>
                    </div>
                  )}

                  {fac.businessAddress && (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <strong className="text-slate-800 block text-[11px] uppercase tracking-wider mb-0.5">
                        Contact / Office Address:
                      </strong>
                      <p className="text-slate-600 leading-snug">{fac.businessAddress}</p>
                    </div>
                  )}

                  {!fac.facilityAddress && !fac.businessAddress && fac.address && (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-slate-600 leading-snug">{fac.address}</p>
                    </div>
                  )}
                </div>

                {/* Badges for Public Dropoff & Doorstep Pickup Availability */}
                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  {fac.publicDropoffAvailable && (
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center gap-1">
                      <PackageCheck className="w-3 h-3" /> Public Drop-off
                    </span>
                  )}
                  {fac.pickupAvailable && (
                    <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 font-semibold flex items-center gap-1">
                      <Truck className="w-3 h-3" /> Pickup Available
                    </span>
                  )}
                </div>
              </div>

              {/* Footer info (Section 24: Human-readable location status instead of raw lat/lng strings) */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {fac.locationAccuracy || 'Nashik Area'}
                </span>
                {fac.lastVerifiedAt && (
                  <span className="text-[11px] text-slate-400">
                    Verified: {new Date(fac.lastVerifiedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add Facility Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Register Waste Facility</h3>
            <p className="text-xs text-slate-500 mb-5">
              Add an authorized e-waste destination, recycling processor, or municipal transfer station.
            </p>

            <form onSubmit={handleCreateFacility} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Facility Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Wonder Print Technologies"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Facility Category *</label>
                  <select
                    value={form.facilityType}
                    onChange={(e) => setForm({ ...form, facilityType: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                  >
                    <option value="RECYCLER">E-Waste Recycler / Refurbisher</option>
                    <option value="PROCESSING_PLANT">Processing / Compost Plant</option>
                    <option value="TRANSFER_STATION">Municipal Transfer Station</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Verification Status *</label>
                  <select
                    value={form.verificationStatus}
                    onChange={(e) => setForm({ ...form, verificationStatus: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                  >
                    <option value="verified">Verified</option>
                    <option value="pending_confirmation">Pending Confirmation</option>
                    <option value="unverified">Unverified / Reference Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Actual Facility / Plant Address</label>
                <textarea
                  rows={2}
                  value={form.facilityAddress}
                  onChange={(e) => setForm({ ...form, facilityAddress: e.target.value })}
                  placeholder="Physical site address (e.g. Plot No. H-3/16, MIDC Ambad, Nashik)"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact / Office Address</label>
                <textarea
                  rows={2}
                  value={form.businessAddress}
                  onChange={(e) => setForm({ ...form, businessAddress: e.target.value })}
                  placeholder="Registered commercial office address"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs resize-none"
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.publicDropoffAvailable}
                    onChange={(e) => setForm({ ...form, publicDropoffAvailable: e.target.checked })}
                    className="rounded accent-emerald-600"
                  />
                  Public Drop-off Accepted
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.pickupAvailable}
                    onChange={(e) => setForm({ ...form, pickupAvailable: e.target.checked })}
                    className="rounded accent-emerald-600"
                  />
                  Pickup Service Available
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)} type="button">
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={submitting}>
                  Register Facility
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
