import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Card } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge.jsx';
import {
  Plus,
  Search,
  RefreshCw,
  Eye,
  Trash2,
  Edit2,
  Clock,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Sparkles,
} from 'lucide-react';

export const BinsPage = () => {
  const [bins, setBins] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState('');
  const [selectedWasteType, setSelectedWasteType] = useState('');

  // Status feedback toast
  const [feedback, setFeedback] = useState(null);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addForm, setAddForm] = useState({
    code: '',
    name: '',
    wardId: '',
    wasteType: 'SOLID',
    areaCategory: 'commercial',
    capacityLiters: 1100,
    latitude: 20.005,
    longitude: 73.785,
    provenance: 'NMC_FIELD_INSPECTION',
    notes: '',
  });

  const [observationBin, setObservationBin] = useState(null);
  const [obsFill, setObsFill] = useState(75);
  const [obsNotes, setObsNotes] = useState('');
  const [obsLoading, setObsLoading] = useState(false);

  const showToast = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [binsRes, wardsRes] = await Promise.all([
        api.getBins({
          search: search || undefined,
          wardId: selectedWard || undefined,
          urgency: selectedUrgency || undefined,
          wasteType: selectedWasteType || undefined,
        }),
        api.getWards(),
      ]);
      setBins(binsRes || []);
      setWards(wardsRes || []);
      if (wardsRes.length > 0 && !addForm.wardId) {
        setAddForm((prev) => ({ ...prev, wardId: wardsRes[0].id }));
      }
    } catch (err) {
      showToast('error', `Failed to load bins: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedWard, selectedUrgency, selectedWasteType]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleCreateBin = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      await api.createBin(addForm);
      showToast('success', `Bin ${addForm.code} added to Nashik inventory!`);
      setIsAddOpen(false);
      setAddForm({
        code: '',
        name: '',
        wardId: wards[0]?.id || '',
        wasteType: 'SOLID',
        areaCategory: 'commercial',
        capacityLiters: 1100,
        latitude: 20.005,
        longitude: 73.785,
        provenance: 'NMC_FIELD_INSPECTION',
        notes: '',
      });
      loadData();
    } catch (err) {
      showToast('error', `Create failed: ${err.message}`);
    } finally {
      setAddLoading(false);
    }
  };

  const handleRecordObservation = async (e) => {
    e.preventDefault();
    if (!observationBin) return;

    setObsLoading(true);
    try {
      await api.recordObservation(observationBin.id, {
        fillPercentage: obsFill,
        source: 'MANUAL_INSPECTION',
        provenance: 'VERIFIED_FIELD_OBSERVATION',
        notes: obsNotes || 'Manual inspection logged via admin panel',
      });
      showToast('success', `Observation for ${observationBin.code} logged! C++ priority recalibrated.`);
      setObservationBin(null);
      loadData();
    } catch (err) {
      showToast('error', `Failed to log observation: ${err.message}`);
    } finally {
      setObsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-slate-900 text-emerald-400 border-emerald-500/50'
              : 'bg-rose-900 text-white border-rose-500'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Municipal Bin Assets</h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200">
              {bins.length} Registered
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Standardized waste bins inventory mapped to Nashik Municipal Corporation administrative wards
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsAddOpen(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          Add New Asset
        </Button>
      </div>

      {/* Filters Bar */}
      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative min-w-[220px] flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by code, landmark, or name..."
                className="w-full pl-10 pr-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="px-3.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Wards</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>
                  Ward {w.number}: {w.name}
                </option>
              ))}
            </select>

            <select
              value={selectedUrgency}
              onChange={(e) => setSelectedUrgency(e.target.value)}
              className="px-3.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Urgencies</option>
              <option value="critical">Critical Only</option>
              <option value="high">High Only</option>
              <option value="medium">Medium Only</option>
              <option value="low">Low Only</option>
            </select>
          </div>

          <Button type="submit" variant="outline" size="md" icon={<RefreshCw className="w-4 h-4" />}>
            Filter
          </Button>
        </form>
      </Card>

      {/* Bins Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-xs">
              <tr>
                <th className="p-3.5">Asset Code & Name</th>
                <th className="p-3.5">Nashik Ward</th>
                <th className="p-3.5">Type & Capacity</th>
                <th className="p-3.5">Fill Level</th>
                <th className="p-3.5">C++ Score</th>
                <th className="p-3.5">Data Provenance</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    Loading bins from SQLite database...
                  </td>
                </tr>
              ) : bins.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-slate-500">
                    No bins match your current filters.
                  </td>
                </tr>
              ) : (
                bins.map((bin) => {
                  const fill = bin.currentFillPercentage || 0;
                  let fillBarColor = 'bg-emerald-500';
                  if (fill >= 80) fillBarColor = 'bg-rose-500';
                  else if (fill >= 60) fillBarColor = 'bg-amber-500';

                  return (
                    <tr key={bin.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-slate-900 text-sm">{bin.code}</div>
                        <div className="text-slate-600 text-xs font-medium">{bin.name}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="text-slate-800 font-semibold">{bin.ward?.name || 'Nashik Ward'}</div>
                        <div className="text-slate-500 text-xs uppercase">{bin.areaCategory}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="text-slate-800 capitalize font-medium">{bin.wasteType}</div>
                        <div className="text-slate-500 text-xs">{bin.capacityLiters} Liters</div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-200 h-2.5 rounded-full overflow-hidden">
                            <div className={`h-full ${fillBarColor}`} style={{ width: `${Math.min(100, fill)}%` }} />
                          </div>
                          <span className="font-mono font-bold text-slate-800 text-sm">{fill}%</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs">
                          {Math.round(bin.priorityScore || 0)}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <ProvenanceBadge provenance={bin.provenance} />
                      </td>
                      <td className="p-3.5 text-right">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => {
                            setObservationBin(bin);
                            setObsFill(bin.currentFillPercentage || 50);
                          }}
                        >
                          Record Fill
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Bin Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Register Municipal Waste Bin Asset">
        <form onSubmit={handleCreateBin} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Asset Code *</label>
              <input
                type="text"
                required
                value={addForm.code}
                onChange={(e) => setAddForm({ ...addForm, code: e.target.value })}
                placeholder="BIN-NSK-PAN-010"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Asset Name *</label>
              <input
                type="text"
                required
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="Ramkund North Ghat Bin"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Ward *</label>
              <select
                required
                value={addForm.wardId}
                onChange={(e) => setAddForm({ ...addForm, wardId: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
              >
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>
                    Ward {w.number}: {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Area Category</label>
              <select
                value={addForm.areaCategory}
                onChange={(e) => setAddForm({ ...addForm, areaCategory: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="pilgrimage">Pilgrimage / Religious Site</option>
                <option value="market">Market / Vegetable Mandi</option>
                <option value="commercial">Commercial / High Footfall</option>
                <option value="residential">Residential Colony</option>
                <option value="industrial">Industrial / MIDC</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Waste Type</label>
              <select
                value={addForm.wasteType}
                onChange={(e) => setAddForm({ ...addForm, wasteType: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="SOLID">Solid / Mixed</option>
                <option value="ORGANIC">Organic / Wet</option>
                <option value="RECYCLABLE">Recyclable / Dry</option>
                <option value="HAZARDOUS">Hazardous</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Capacity (Liters)</label>
              <input
                type="number"
                value={addForm.capacityLiters}
                onChange={(e) => setAddForm({ ...addForm, capacityLiters: parseInt(e.target.value, 10) || 1100 })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={addForm.latitude}
                onChange={(e) => setAddForm({ ...addForm, latitude: parseFloat(e.target.value) || 20.0 })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={addForm.longitude}
                onChange={(e) => setAddForm({ ...addForm, longitude: parseFloat(e.target.value) || 73.78 })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Data Provenance Attribution *</label>
            <select
              value={addForm.provenance}
              onChange={(e) => setAddForm({ ...addForm, provenance: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="NMC_FIELD_INSPECTION">NMC Verified Field Survey</option>
              <option value="SYNTHETIC_DEMO">Synthetic Demo Record</option>
            </select>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={addLoading}>
              Save Asset
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record Observation Modal */}
      <Modal
        isOpen={!!observationBin}
        onClose={() => setObservationBin(null)}
        title={`Record Fill Level: ${observationBin?.code || ''}`}
      >
        <form onSubmit={handleRecordObservation} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Observed Fullness Percentage: <strong className="text-emerald-700 text-sm">{obsFill}%</strong>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={obsFill}
              onChange={(e) => setObsFill(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-600"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Sanitary Inspector Notes</label>
            <input
              type="text"
              value={obsNotes}
              onChange={(e) => setObsNotes(e.target.value)}
              placeholder="e.g. Visual verification by Ward Sanitary Sub-Inspector"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setObservationBin(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={obsLoading}>
              Update & Recalibrate Heap
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
