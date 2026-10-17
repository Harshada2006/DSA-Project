import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Bin, Vehicle, Complaint, Ward } from '@eco-collect/shared';
import { LeafletMap } from '../components/map/LeafletMap';
import { BinDrawer } from '../components/map/BinDrawer';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { RefreshCw, Layers, Eye, Filter, Sparkles, AlertTriangle } from 'lucide-react';

export const LiveMapPage: React.FC = () => {
  const [bins, setBins] = useState<Bin[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWard, setSelectedWard] = useState<string>('');
  const [selectedBin, setSelectedBin] = useState<Bin | null>(null);

  // Layer Toggles
  const [showBins, setShowBins] = useState(true);
  const [showVehicles, setShowVehicles] = useState(true);
  const [showComplaints, setShowComplaints] = useState(true);
  const [showWards, setShowWards] = useState(true);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMapData = async (wardId?: string) => {
    try {
      const [binsRes, vehData, compData, wardsData] = await Promise.all([
        api.getBins({ wardId, limit: 100 }),
        api.getVehicles(),
        api.getComplaints({ wardId }),
        api.getWards(),
      ]);
      setBins(binsRes.bins);
      setVehicles(vehData);
      setComplaints(compData);
      setWards(wardsData);
    } catch (err: any) {
      console.error('Failed to load map data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMapData(selectedWard);
  }, [selectedWard]);

  // Periodic polling for vehicle movement updates (every 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      api.getVehicles().then(setVehicles).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadMapData(selectedWard);
  };

  const criticalBinsCount = bins.filter((b) => b.currentFillPercentage >= 80).length;

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Nashik Geospatial Command Map
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time asset telemetry, GIS ward boundaries, and live collection logistics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Ward Filter */}
          <select
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
          >
            <option value="">All Nashik Wards</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>

          {/* Layer toggles button group */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setShowBins(!showBins)}
              className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${
                showBins ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Bins ({bins.length})
            </button>
            <button
              onClick={() => setShowVehicles(!showVehicles)}
              className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${
                showVehicles ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Fleet ({vehicles.length})
            </button>
            <button
              onClick={() => setShowComplaints(!showComplaints)}
              className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${
                showComplaints ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Complaints ({complaints.length})
            </button>
            <button
              onClick={() => setShowWards(!showWards)}
              className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${
                showWards ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Wards
            </button>
          </div>

          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            isLoading={refreshing}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Sync
          </Button>
        </div>
      </div>

      {/* Main Map Canvas */}
      <div className="relative">
        <LeafletMap
          bins={bins}
          vehicles={vehicles}
          complaints={complaints}
          wards={wards}
          showBins={showBins}
          showVehicles={showVehicles}
          showComplaints={showComplaints}
          showWards={showWards}
          selectedBinId={selectedBin?.id}
          onSelectBin={(b) => setSelectedBin(b)}
          className="h-[680px]"
        />

        {/* Floating Quick Stats Overlay */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
          <div className="bg-white/95 backdrop-blur-xs px-3.5 py-2.5 rounded-xl border border-slate-200/90 shadow-md text-xs space-y-1.5 pointer-events-auto">
            <div className="font-bold text-slate-800 flex items-center justify-between gap-4">
              <span>Map Legend & Status</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-600">
              <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0"></span>
              <span>≥80% Fill (Critical - {criticalBinsCount} bins)</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-600">
              <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0"></span>
              <span>60-79% Fill (Approaching)</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-600">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></span>
              <span>&lt;60% Normal Capacity</span>
            </div>
            <div className="pt-1.5 border-t border-slate-100 flex items-center gap-3 text-[10px] text-slate-500">
              <span>🚚 Fleet: {vehicles.length} Units</span>
              <span>⚠️ Complaints: {complaints.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-over details drawer */}
      <BinDrawer
        bin={selectedBin}
        onClose={() => setSelectedBin(null)}
        onRefresh={() => loadMapData(selectedWard)}
      />
    </div>
  );
};
