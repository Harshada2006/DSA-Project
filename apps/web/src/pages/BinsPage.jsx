import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Card } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { SearchInput } from '../components/common/SearchInput.jsx';
import {
  Plus,
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Sparkles,
  Info,
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
    notes: '',
  });

  // Selected bin detail modal
  const [detailBin, setDetailBin] = useState(null);

  const showToast = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [binsRes, wardsRes] = await Promise.all([
        api.getBins({
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
        notes: '',
      });
      loadData();
    } catch (err) {
      showToast('error', `Create failed: ${err.message}`);
    } finally {
      setAddLoading(false);
    }
  };

  const filteredBins = bins.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (b.code || '').toLowerCase().includes(q) ||
      (b.name || '').toLowerCase().includes(q) ||
      (b.ward?.name || '').toLowerCase().includes(q) ||
      (b.areaCategory || '').toLowerCase().includes(q)
    );
  });

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

      {/* Filters Bar with SearchInput */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[240px]">
            <SearchInput
              value={search}
              onChange={setSearch}
              onClear={() => setSearch('')}
              placeholder="Search by code, landmark, or name..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="px-3.5 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
              className="px-3.5 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">All Urgencies</option>
              <option value="critical">Critical Only</option>
              <option value="high">High Only</option>
              <option value="medium">Medium Only</option>
              <option value="low">Low Only</option>
            </select>

            <select
              value={selectedWasteType}
              onChange={(e) => setSelectedWasteType(e.target.value)}
              className="px-3.5 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">All Waste Streams</option>
              <option value="SOLID">Solid / Mixed</option>
              <option value="ORGANIC">Organic / Wet</option>
              <option value="RECYCLABLE">Recyclable / Dry</option>
              <option value="HAZARDOUS">Hazardous</option>
            </select>
          </div>
        </div>
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
                <th className="p-3.5">Predicted Fill Level (Est.)</th>
                <th className="p-3.5">Priority Score</th>
                <th className="p-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    Loading bins from database...
                  </td>
                </tr>
              ) : filteredBins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-slate-500">
                    No bins match your current filters.
                  </td>
                </tr>
              ) : (
                filteredBins.map((bin) => {
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
                        <div className="text-slate-800 font-semibold text-xs">{bin.ward?.name || 'Nashik Ward'}</div>
                        <div className="text-slate-500 text-[11px] uppercase">{bin.areaCategory}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="text-slate-800 capitalize font-medium text-xs">{bin.wasteType}</div>
                        <div className="text-slate-500 text-[11px]">{bin.capacityLiters} Liters</div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-200 h-2.5 rounded-full overflow-hidden">
                            <div className={`h-full ${fillBarColor}`} style={{ width: `${Math.min(100, fill)}%` }} />
                          </div>
                          <span className="font-mono font-bold text-slate-800 text-sm">{Math.round(fill)}%</span>
                          <span className="text-[10px] text-slate-400">est.</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs">
                          {Math.round(bin.priorityScore || 0)}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => setDetailBin(bin)}
                          icon={<Info className="w-3 h-3" />}
                        >
                          View Info
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

      {/* Asset Info Modal (Section 24: No raw coordinates in address text) */}
      {detailBin && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono font-bold text-amber-700 text-xs bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {detailBin.code}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{detailBin.name}</h3>
              </div>
              <button
                onClick={() => setDetailBin(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Administrative Ward:</span>
                <strong className="text-slate-900">{detailBin.ward?.name || 'Nashik'} ({detailBin.ward?.zone || 'Zone'})</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Area Category:</span>
                <strong className="text-slate-900 capitalize">{detailBin.areaCategory}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Container Capacity:</span>
                <strong className="text-slate-900">{detailBin.capacityLiters} Liters</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Waste Classification:</span>
                <strong className="text-slate-900 capitalize">{detailBin.wasteType}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Estimated Next-Day Fill:</span>
                <strong className="text-slate-900 font-mono text-sm">~{Math.round(detailBin.currentFillPercentage || 0)}%</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Collection Priority Score:</span>
                <strong className="text-emerald-700 font-mono text-sm">{Math.round(detailBin.priorityScore || 0)} / 100</strong>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
              <strong>Prediction Horizon:</strong> Expected fill level tomorrow (24h horizon). Fill level is statistical estimation, not a physical sensor measurement.
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="primary" size="sm" onClick={() => setDetailBin(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Asset Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Register Municipal Bin Asset</h3>
            <p className="text-xs text-slate-500 mb-5">
              Add a new waste receptacle mapped to Nashik administrative wards.
            </p>

            <form onSubmit={handleCreateBin} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Asset Code *</label>
                  <input
                    type="text"
                    required
                    value={addForm.code}
                    onChange={(e) => setAddForm({ ...addForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. BIN-NSK-PAN-015"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Asset Name *</label>
                  <input
                    type="text"
                    required
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    placeholder="e.g. Ramkund Main Steps Bin"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nashik Ward *</label>
                  <select
                    required
                    value={addForm.wardId}
                    onChange={(e) => setAddForm({ ...addForm, wardId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                  >
                    {wards.map((w) => (
                      <option key={w.id} value={w.id}>
                        Ward {w.number}: {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Area Category *</label>
                  <select
                    value={addForm.areaCategory}
                    onChange={(e) => setAddForm({ ...addForm, areaCategory: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                  >
                    <option value="commercial">Commercial Market</option>
                    <option value="residential">Residential Colony</option>
                    <option value="pilgrimage">Pilgrimage / River Ghat</option>
                    <option value="industrial">Industrial MIDC</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Capacity (Liters) *</label>
                  <input
                    type="number"
                    min="100"
                    required
                    value={addForm.capacityLiters}
                    onChange={(e) => setAddForm({ ...addForm, capacityLiters: parseInt(e.target.value, 10) || 1100 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Waste Stream *</label>
                  <select
                    value={addForm.wasteType}
                    onChange={(e) => setAddForm({ ...addForm, wasteType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                  >
                    <option value="SOLID">Solid / Mixed</option>
                    <option value="ORGANIC">Organic / Wet</option>
                    <option value="RECYCLABLE">Recyclable / Dry</option>
                    <option value="HAZARDOUS">Hazardous</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)} type="button">
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={addLoading}>
                  Create Asset
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
