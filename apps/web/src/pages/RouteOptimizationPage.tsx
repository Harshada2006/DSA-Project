import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Bin, Vehicle, RouteOptimizationResponse, RouteStop } from '@eco-collect/shared';
import { LeafletMap } from '../components/map/LeafletMap';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import {
  Route as RouteIcon,
  Cpu,
  Clock,
  Compass,
  CheckCircle2,
  AlertCircle,
  Truck,
  MapPin,
  Play,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';

const NASHIK_DEPOTS = [
  {
    id: 'depot-panchavati',
    name: 'Central Municipal Solid Waste Depot (Panchavati)',
    latitude: 20.0210,
    longitude: 73.8015,
  },
  {
    id: 'depot-satpur',
    name: 'Satpur MIDC Workshop & Sub-Depot',
    latitude: 19.9823,
    longitude: 73.7289,
  },
  {
    id: 'depot-cidco',
    name: 'CIDCO Waste Transfer Station (Pathardi)',
    latitude: 19.9482,
    longitude: 73.7712,
  },
];

export const RouteOptimizationPage: React.FC = () => {
  const [bins, setBins] = useState<Bin[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedDepot, setSelectedDepot] = useState(NASHIK_DEPOTS[0]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedBinIds, setSelectedBinIds] = useState<string[]>([]);
  const [objective, setObjective] = useState<'distance' | 'time'>('distance');
  const [maxStops, setMaxStops] = useState<number>(6);
  const [optimizing, setOptimizing] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteOptimizationResponse | null>(null);

  useEffect(() => {
    Promise.all([
      api.getBins({ limit: 50, urgency: 'critical' }),
      api.getVehicles(),
    ]).then(([binsRes, vehData]) => {
      setBins(binsRes.bins);
      // Auto-select critical bins
      const topIds = binsRes.bins.slice(0, 5).map((b) => b.id);
      setSelectedBinIds(topIds);
      setVehicles(vehData);
      if (vehData.length > 0) {
        setSelectedVehicleId(vehData[0].id);
      }
    });
  }, []);

  const handleComputeRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId) {
      alert('Please select a collection vehicle.');
      return;
    }
    if (selectedBinIds.length === 0) {
      alert('Please select at least one candidate bin.');
      return;
    }

    setOptimizing(true);
    try {
      const result = await api.optimizeRoute({
        startingDepot: selectedDepot,
        vehicleId: selectedVehicleId,
        binIds: selectedBinIds,
        maxStops,
        objective,
      });
      setRouteResult(result);
    } catch (err: any) {
      alert(`Route optimization error: ${err.message}`);
    } finally {
      setOptimizing(false);
    }
  };

  const handleSelectAllCritical = () => {
    const criticals = bins.filter((b) => b.currentFillPercentage >= 75).map((b) => b.id);
    setSelectedBinIds(criticals);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Route Optimization Engine
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-forest-100 text-forest-800 border border-forest-300 flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-forest-700" />
              C++ Dijkstra & Greedy TSP
            </span>
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Multi-stop collection routing computed over the verified Nashik road network graph.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Planner Controls Form */}
        <Card
          title="Route Planning Parameters"
          subtitle="Configure depot, vehicle, and collection candidate stops"
          className="lg:col-span-1"
        >
          <form onSubmit={handleComputeRoute} className="space-y-4 text-xs">
            {/* Starting Depot */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Starting Municipal Depot *</label>
              <select
                value={selectedDepot.id}
                onChange={(e) => {
                  const d = NASHIK_DEPOTS.find((item) => item.id === e.target.value);
                  if (d) setSelectedDepot(d);
                }}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
              >
                {NASHIK_DEPOTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Vehicle Selection */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Collection Vehicle & Driver *</label>
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNo} — {v.driverName} ({v.vehicleType}, {v.capacityKg} kg)
                  </option>
                ))}
              </select>
            </div>

            {/* Optimization Objective */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Optimization Objective</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setObjective('distance')}
                  className={`p-2 rounded-lg border font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    objective === 'distance'
                      ? 'bg-forest-50 border-forest-400 text-forest-800'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  Min. Distance
                </button>
                <button
                  type="button"
                  onClick={() => setObjective('time')}
                  className={`p-2 rounded-lg border font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    objective === 'time'
                      ? 'bg-forest-50 border-forest-400 text-forest-800'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Min. Time
                </button>
              </div>
            </div>

            {/* Max Stops */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Max Stops Allowed: <span className="font-bold text-forest-700">{maxStops}</span>
              </label>
              <input
                type="range"
                min="2"
                max="12"
                value={maxStops}
                onChange={(e) => setMaxStops(parseInt(e.target.value, 10))}
                className="w-full accent-forest-600"
              />
            </div>

            {/* Candidate Bins List */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-slate-700">
                  Candidate Bins ({selectedBinIds.length} selected)
                </label>
                <button
                  type="button"
                  onClick={handleSelectAllCritical}
                  className="text-forest-700 hover:underline text-[11px] font-semibold"
                >
                  Select Critical
                </button>
              </div>
              <div className="max-h-44 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200">
                {bins.map((bin) => {
                  const isChecked = selectedBinIds.includes(bin.id);
                  return (
                    <label
                      key={bin.id}
                      className="flex items-center gap-2 text-[11px] text-slate-700 p-1.5 rounded-sm hover:bg-white cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedBinIds([...selectedBinIds, bin.id]);
                          else setSelectedBinIds(selectedBinIds.filter((id) => id !== bin.id));
                        }}
                        className="accent-forest-600 shrink-0"
                      />
                      <span className="font-mono font-bold text-slate-800 shrink-0">{bin.code}</span>
                      <span className="truncate">{bin.name}</span>
                      <span className="ml-auto font-bold text-rose-600 shrink-0">
                        {bin.currentFillPercentage}%
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={optimizing}
              icon={<Play className="w-4 h-4" />}
              className="w-full justify-center"
            >
              Compute Optimal Route in C++
            </Button>
          </form>
        </Card>

        {/* Route Map & Visualizer */}
        <div className="lg:col-span-2 space-y-4">
          <Card
            title={
              <div className="flex items-center justify-between">
                <span>Computed Route Visualization</span>
                {routeResult && (
                  <Badge variant="success">
                    {routeResult.totalDistanceKm} km • {routeResult.totalDurationMinutes} mins
                  </Badge>
                )}
              </div>
            }
            subtitle="Numbered stops and road segment polylines from Dijkstra path reconstruction"
          >
            <LeafletMap
              center={[selectedDepot.latitude, selectedDepot.longitude]}
              zoom={13}
              routePath={routeResult?.pathCoordinates || []}
              routeStops={routeResult?.orderedStops || []}
              showBins={false}
              showVehicles={false}
              showComplaints={false}
              showRoutes={true}
              className="h-[420px]"
            />
          </Card>
        </div>
      </div>

      {/* Stop by Stop Itinerary */}
      {routeResult && (
        <Card
          title={`Optimized Route Itinerary (${routeResult.orderedStops.length} Waypoints)`}
          subtitle={`Vehicle: ${routeResult.vehicleReg} • Total Distance: ${routeResult.totalDistanceKm} km • Est. Duration: ${routeResult.totalDurationMinutes} minutes`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Order</th>
                  <th className="py-2.5 px-3">Waypoint / Stop Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Coordinates</th>
                  <th className="py-2.5 px-3">Est. Waste Demand</th>
                  <th className="py-2.5 px-3">Cumulative Distance</th>
                  <th className="py-2.5 px-3 text-right">Cumulative Travel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {routeResult.orderedStops.map((stop) => (
                  <tr key={stop.stopOrder} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <span className="w-6 h-6 rounded-full bg-forest-700 text-white font-bold flex items-center justify-center text-xs">
                        {stop.type === 'depot' ? 'D' : `#${stop.stopOrder}`}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{stop.name}</td>
                    <td className="py-3 px-3">
                      <Badge variant={stop.type === 'depot' ? 'default' : 'success'} size="sm">
                        {stop.type.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500">
                      {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700">
                      {(stop.demandKg ?? 0) > 0 ? `${(stop.demandKg ?? 0).toFixed(1)} kg` : '—'}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {(stop.cumulativeDistanceMeters / 1000).toFixed(2)} km
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-forest-700">
                      {stop.cumulativeTimeMinutes} mins
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* DSA Methodology & Limitations Alert */}
      <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 flex items-start gap-3">
        <Info className="w-5 h-5 text-forest-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-bold text-white flex items-center gap-2">
            DSA Engine Transparency & Theoretical Bound
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400">
              O(K · (V + E) log V)
            </span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Dijkstra's algorithm guarantees the exact shortest network path between any pair of graph vertices on non-negative weighted graphs.
            However, multi-stop vehicle routing with capacity constraints is NP-hard. Eco Collect employs a greedy nearest-next-stop heuristic with return to depot.
            We transparently document that this provides a polynomial approximation and does not claim global TSP optimality.
          </p>
        </div>
      </div>
    </div>
  );
};
