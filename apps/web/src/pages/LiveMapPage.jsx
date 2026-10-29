import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { LeafletMap } from '../components/map/LeafletMap.jsx';
import { BinDrawer } from '../components/map/BinDrawer.jsx';
import { Card } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { RefreshCw, Filter, Layers, Info, MapPin, Calendar } from 'lucide-react';

export const LiveMapPage = () => {
  const { t } = useLanguage();
  const [bins, setBins] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedWard, setSelectedWard] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState('');
  const [geoRadius, setGeoRadius] = useState(''); // '' | '2' | '5' | '10'
  const [selectedBin, setSelectedBin] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMapData = async () => {
    try {
      const params = {
        wardId: selectedWard || undefined,
        zone: selectedZone || undefined,
      };

      if (geoRadius) {
        // Center around central Nashik municipal coordinates
        params.latitude = 19.9975;
        params.longitude = 73.7898;
        params.radiusKm = parseFloat(geoRadius);
      }

      const [binsRes, facRes, wardsData] = await Promise.all([
        api.getBins(params),
        api.getFacilities(),
        api.getWards(),
      ]);
      setBins(binsRes || []);
      setFacilities(facRes || []);
      setWards(wardsData || []);
    } catch (err) {
      console.error('Failed to load map data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMapData();
  }, [selectedWard, selectedZone, geoRadius]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadMapData();
  };

  const filteredBins = bins.filter((b) => {
    if (selectedUrgency && (b.urgency || '').toLowerCase() !== selectedUrgency.toLowerCase()) return false;
    return true;
  });

  const criticalCount = filteredBins.filter((b) => (b.currentFillPercentage || 0) >= 80).length;

  return (
    <div className="space-y-4">
      {/* Top Header & Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              {t('nav_map', 'Nashik Geospatial GIS Live Map')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Interactive Leaflet GIS map with color-coded bin markers, NMC transfer stations, and MPCB recyclers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              isLoading={refreshing}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh Pins
            </Button>
          </div>
        </div>

        {/* Geographic Filter Controls (Date filter removed from geographic search interface) */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
              <Filter className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Ward:</span>
              <select
                value={selectedWard}
                onChange={(e) => setSelectedWard(e.target.value)}
                className="px-2.5 py-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="">All 6 Wards</option>
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>
                    Ward {w.number}: {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
              <span>Zone:</span>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="px-2.5 py-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="">All Zones</option>
                <option value="North Zone">North Zone (Panchavati)</option>
                <option value="West Zone">West Zone (Nashik West)</option>
                <option value="Central Zone">Central Zone (Nashik East)</option>
                <option value="South-West Zone">South-West Zone (CIDCO)</option>
                <option value="Industrial Zone">Industrial Zone (Satpur)</option>
                <option value="South-East Zone">South-East Zone (Nashik Road)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
              <span>Geo Radius:</span>
              <select
                value={geoRadius}
                onChange={(e) => setGeoRadius(e.target.value)}
                className="px-2.5 py-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="">Full Municipal Scope</option>
                <option value="2">Within 2 km Radius</option>
                <option value="5">Within 5 km Radius</option>
                <option value="10">Within 10 km Radius</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
              <span>Urgency:</span>
              <select
                value={selectedUrgency}
                onChange={(e) => setSelectedUrgency(e.target.value)}
                className="px-2.5 py-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="">All Tiers</option>
                <option value="critical">Critical (&ge; 80%)</option>
                <option value="high">High (60-79%)</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-800 dark:bg-slate-200" />
              Total Pinned: <strong>{filteredBins.length}</strong>
            </span>
            <span className="flex items-center gap-1.5 text-rose-600">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              Critical: <strong>{criticalCount}</strong>
            </span>
            <span className="flex items-center gap-1.5 text-purple-700">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
              MPCB Recyclers: <strong>{facilities.filter((f) => f.facilityType === 'RECYCLER').length}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm h-[680px]">
        <LeafletMap
          bins={filteredBins}
          facilities={facilities}
          onSelectBin={(bin) => setSelectedBin(bin)}
          center={[19.9975, 73.7898]}
          zoom={13}
        />

        {/* Side Inspector Drawer */}
        <BinDrawer
          bin={selectedBin}
          onClose={() => setSelectedBin(null)}
          onRefresh={loadMapData}
        />
      </div>
    </div>
  );
};
