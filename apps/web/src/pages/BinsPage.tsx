import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Bin, Ward } from '@eco-collect/shared';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';
import { BinDrawer } from '../components/map/BinDrawer';
import {
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Eye,
  Trash2,
  Clock,
  Sparkles,
  Edit2,
  Archive,
} from 'lucide-react';

export const BinsPage: React.FC = () => {
  const [bins, setBins] = useState<Bin[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState('');
  const [selectedWasteType, setSelectedWasteType] = useState('');
  const [selectedProvenance, setSelectedProvenance] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected bin for drawer
  const [inspectedBin, setInspectedBin] = useState<Bin | null>(null);

  // Create Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newBin, setNewBin] = useState({
    code: '',
    name: '',
    wardId: '',
    latitude: 20.005,
    longitude: 73.785,
    capacityLiters: 1200,
    wasteType: 'general',
    areaCategory: 'residential',
    notes: '',
  });

  // Import Modal state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);

  const fetchBins = async () => {
    setLoading(true);
    try {
      const [binsRes, wardsRes] = await Promise.all([
        api.getBins({
          search,
          wardId: selectedWard,
          urgency: selectedUrgency,
          wasteType: selectedWasteType,
          provenance: selectedProvenance,
          page,
          limit: 15,
        }),
        api.getWards(),
      ]);
      setBins(binsRes.bins);
      setTotalPages(binsRes.pagination.totalPages);
      setTotalCount(binsRes.pagination.total);
      setWards(wardsRes);
      if (wardsRes.length > 0 && !newBin.wardId) {
        setNewBin((prev) => ({ ...prev, wardId: wardsRes[0].id }));
      }
    } catch (err: any) {
      console.error('Failed to fetch bins:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBins();
  }, [search, selectedWard, selectedUrgency, selectedWasteType, selectedProvenance, page]);

  const handleCreateBin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      await api.createBin(newBin);
      setIsCreateOpen(false);
      setNewBin({
        code: '',
        name: '',
        wardId: wards[0]?.id || '',
        latitude: 20.005,
        longitude: 73.785,
        capacityLiters: 1200,
        wasteType: 'general',
        areaCategory: 'residential',
        notes: '',
      });
      fetchBins();
    } catch (err: any) {
      alert(`Creation error: ${err.message}`);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importCsvText.trim()) return;
    setImportLoading(true);
    try {
      const formData = new FormData();
      formData.append('type', 'bins');
      formData.append('csv', importCsvText);
      formData.append('sourceName', 'Manual Bins Web Ingestion');

      const res = await api.importCsv(formData);
      setImportResult(res);
      fetchBins();
    } catch (err: any) {
      alert(`Import error: ${err.message}`);
    } finally {
      setImportLoading(false);
    }
  };

  const exportCsv = () => {
    if (bins.length === 0) return;
    const headers = ['code', 'name', 'ward', 'latitude', 'longitude', 'capacity_liters', 'fill_percentage', 'urgency', 'priority_score', 'provenance'];
    const rows = bins.map((b) => [
      b.code,
      `"${b.name.replace(/"/g, '""')}"`,
      `"${(b.wardName || '').replace(/"/g, '""')}"`,
      b.latitude,
      b.longitude,
      b.capacityLiters,
      b.currentFillPercentage,
      b.urgency,
      b.priorityScore,
      b.provenance,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nashik_bins_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Bin Registry & Management
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Registered smart waste containers across all 6 administrative zones of Nashik.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsImportOpen(true)}
            variant="outline"
            size="sm"
            icon={<Upload className="w-3.5 h-3.5" />}
          >
            Import CSV
          </Button>
          <Button
            onClick={exportCsv}
            variant="outline"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>
          <Button
            onClick={() => setIsCreateOpen(true)}
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Add New Bin
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search code or location..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-forest-500"
            />
          </div>

          {/* Ward Filter */}
          <select
            value={selectedWard}
            onChange={(e) => {
              setSelectedWard(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-700 font-medium"
          >
            <option value="">All Wards</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          {/* Urgency Filter */}
          <select
            value={selectedUrgency}
            onChange={(e) => {
              setSelectedUrgency(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-700 font-medium"
          >
            <option value="">All Urgency Levels</option>
            <option value="critical">Critical (&gt;80%)</option>
            <option value="high">High (60-80%)</option>
            <option value="medium">Medium (40-60%)</option>
            <option value="low">Low (&lt;40%)</option>
          </select>

          {/* Waste Type */}
          <select
            value={selectedWasteType}
            onChange={(e) => {
              setSelectedWasteType(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-700 font-medium"
          >
            <option value="">All Waste Types</option>
            <option value="organic">Organic</option>
            <option value="recyclable">Recyclable</option>
            <option value="hazardous">Hazardous</option>
            <option value="general">General</option>
          </select>

          {/* Provenance */}
          <select
            value={selectedProvenance}
            onChange={(e) => {
              setSelectedProvenance(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-700 font-medium"
          >
            <option value="">All Data Sources</option>
            <option value="observed">Verified Observations</option>
            <option value="imported">Imported Dataset</option>
            <option value="synthetic">Synthetic Demonstration</option>
          </select>
        </div>
      </Card>

      {/* Bins Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3">Asset Code</th>
                <th className="py-3 px-3">Location & Ward</th>
                <th className="py-3 px-3">Fill Level</th>
                <th className="py-3 px-3">Capacity & Type</th>
                <th className="py-3 px-3">C++ Priority</th>
                <th className="py-3 px-3">Provenance</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bins.length > 0 ? (
                bins.map((bin) => {
                  const fill = bin.currentFillPercentage || 0;
                  return (
                    <tr key={bin.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3">
                        <span className="font-bold text-slate-900 block">{bin.code}</span>
                        <span className="text-[10px] text-slate-400 capitalize">{bin.areaCategory}</span>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-800">{bin.name}</div>
                        <div className="text-[11px] text-slate-500">{bin.wardName || 'Nashik'}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                fill >= 80 ? 'bg-rose-500' : fill >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${fill}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-800">{fill}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="text-slate-700 font-medium">{bin.capacityLiters} L</span>
                        <span className="block text-[10px] capitalize text-slate-400">{bin.wasteType}</span>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-emerald-700">{bin.priorityScore}</span>
                          <Badge
                            variant={bin.urgency === 'critical' ? 'danger' : bin.urgency === 'high' ? 'warning' : 'default'}
                            size="sm"
                          >
                            {bin.urgency}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <ProvenanceBadge provenance={bin.provenance} showIcon={false} />
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <Button
                          onClick={() => setInspectedBin(bin)}
                          variant="outline"
                          size="sm"
                          icon={<Eye className="w-3.5 h-3.5" />}
                        >
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No bins found matching the specified filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-700">{bins.length}</span> of{' '}
            <span className="font-semibold text-slate-700">{totalCount}</span> registered containers
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              variant="outline"
              size="sm"
            >
              Previous
            </Button>
            <span className="font-semibold text-slate-700">
              Page {page} of {totalPages || 1}
            </span>
            <Button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              variant="outline"
              size="sm"
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Drawer */}
      <BinDrawer
        bin={inspectedBin}
        onClose={() => setInspectedBin(null)}
        onRefresh={fetchBins}
      />

      {/* Add New Bin Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Register New Waste Container"
        subtitle="Validate coordinates within Nashik geographic boundaries"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateBin} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Asset Code *</label>
              <input
                type="text"
                required
                placeholder="BIN-NSK-022"
                value={newBin.code}
                onChange={(e) => setNewBin({ ...newBin, code: e.target.value.toUpperCase() })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-forest-500"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Ward *</label>
              <select
                value={newBin.wardId}
                onChange={(e) => setNewBin({ ...newBin, wardId: e.target.value })}
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
            <label className="font-semibold text-slate-700 block mb-1">Location Name / Address *</label>
            <input
              type="text"
              required
              placeholder="e.g. Canada Corner Near City Centre Mall"
              value={newBin.name}
              onChange={(e) => setNewBin({ ...newBin, name: e.target.value })}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-forest-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Latitude (19.8 to 20.2) *</label>
              <input
                type="number"
                step="0.0001"
                required
                value={newBin.latitude}
                onChange={(e) => setNewBin({ ...newBin, latitude: parseFloat(e.target.value) })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Longitude (73.6 to 74.0) *</label>
              <input
                type="number"
                step="0.0001"
                required
                value={newBin.longitude}
                onChange={(e) => setNewBin({ ...newBin, longitude: parseFloat(e.target.value) })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Capacity (Liters)</label>
              <input
                type="number"
                value={newBin.capacityLiters}
                onChange={(e) => setNewBin({ ...newBin, capacityLiters: parseFloat(e.target.value) })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Waste Type</label>
              <select
                value={newBin.wasteType}
                onChange={(e) => setNewBin({ ...newBin, wasteType: e.target.value as any })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
              >
                <option value="general">General</option>
                <option value="organic">Organic</option>
                <option value="recyclable">Recyclable</option>
                <option value="hazardous">Hazardous</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Area Category</label>
              <select
                value={newBin.areaCategory}
                onChange={(e) => setNewBin({ ...newBin, areaCategory: e.target.value as any })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="market">Market</option>
                <option value="pilgrimage">Pilgrimage</option>
                <option value="industrial">Industrial</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button type="button" onClick={() => setIsCreateOpen(false)} variant="outline" size="sm">
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={createLoading}>
              Save Container
            </Button>
          </div>
        </form>
      </Modal>

      {/* Import CSV Modal */}
      <Modal
        isOpen={isImportOpen}
        onClose={() => {
          setIsImportOpen(false);
          setImportResult(null);
        }}
        title="Import Bins via CSV"
        subtitle="Validate and import municipal asset batches"
        maxWidth="lg"
      >
        <form onSubmit={handleImportCsv} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Paste CSV Content (or paste from template)
            </label>
            <textarea
              rows={8}
              value={importCsvText}
              onChange={(e) => setImportCsvText(e.target.value)}
              placeholder="code,name,ward_code,latitude,longitude,capacity_liters,waste_type,area_category&#10;BIN-NSK-101,College Road West,WARD-02,20.0041,73.7651,1200,recyclable,commercial"
              className="w-full p-3 font-mono text-[11px] bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-forest-500"
            />
          </div>

          {importResult && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-slate-800">Import Summary:</div>
              <div className="text-emerald-700 font-semibold">Accepted: {importResult.acceptedRows} rows</div>
              {importResult.rejectedRows > 0 && (
                <div className="text-rose-600 font-semibold">Rejected: {importResult.rejectedRows} rows</div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              onClick={() => {
                setIsImportOpen(false);
                setImportResult(null);
              }}
              variant="outline"
              size="sm"
            >
              Close
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={importLoading}>
              Validate & Import
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
