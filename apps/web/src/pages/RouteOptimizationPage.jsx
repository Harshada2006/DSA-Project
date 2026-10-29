import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { LeafletMap } from '../components/map/LeafletMap.jsx';
import { Card } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Badge } from '../components/common/Badge.jsx';
import {
  Route as RouteIcon,
  Cpu,
  Clock,
  Compass,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Play,
  Layers,
  ArrowRight,
  Info,
  ChevronDown,
  ChevronUp,
  Truck,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';

const NASHIK_DEPOTS = [
  {
    id: 'depot-panchavati',
    name: 'Panchavati Central Workshop (NMC)',
    latitude: 20.0075,
    longitude: 73.7935,
  },
  {
    id: 'depot-cidco',
    name: 'CIDCO Division Sanitation Depot',
    latitude: 19.9680,
    longitude: 73.7460,
  },
  {
    id: 'depot-satpur',
    name: 'Satpur MIDC Sanitation Hub',
    latitude: 19.9920,
    longitude: 73.7380,
  },
  {
    id: 'depot-nashik-road',
    name: 'Nashik Road Railway Ward Depot',
    latitude: 19.9540,
    longitude: 73.8320,
  },
];

export const RouteOptimizationPage = () => {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState([]);
  const [allBins, setAllBins] = useState([]);
  const [selectedDepot, setSelectedDepot] = useState(NASHIK_DEPOTS[0]);
  const [selectedBinIds, setSelectedBinIds] = useState([]);
  const [objective, setObjective] = useState('distance');
  const [maxStops, setMaxStops] = useState(6);
  const [optimizing, setOptimizing] = useState(false);
  const [routeResult, setRouteResult] = useState(null);
  const [isVivaExplainerOpen, setIsVivaExplainerOpen] = useState(false);

  useEffect(() => {
    // Load prioritized bins from C++ engine as candidates
    Promise.all([
      api.getPrioritizedTasks({ limit: 20 }).catch(() => ({ tasks: [] })),
      api.getBins().catch(() => []),
    ]).then(([dsaRes, binsRes]) => {
      setTasks(dsaRes.tasks || []);
      setAllBins(binsRes || []);
      // Auto-select top 5 priority bins
      const topIds = (dsaRes.tasks || []).slice(0, 5).map((t) => t.bin_id);
      if (topIds.length > 0) {
        setSelectedBinIds(topIds);
      } else if (binsRes.length > 0) {
        setSelectedBinIds(binsRes.slice(0, 5).map((b) => b.id));
      }
    });
  }, []);

  const handleComputeRoute = async (e) => {
    e.preventDefault();
    if (selectedBinIds.length === 0) {
      alert(t('no_route_found', 'Please select at least one target bin for collection routing.'));
      return;
    }

    setOptimizing(true);
    try {
      const result = await api.optimizeRoute({
        startingDepot: selectedDepot,
        binIds: selectedBinIds,
        maxStops,
        objective,
      });
      setRouteResult(result);
    } catch (err) {
      alert(`Route optimization error: ${err.message}`);
    } finally {
      setOptimizing(false);
    }
  };

  const handleSelectTop = (count) => {
    if (tasks.length > 0) {
      setSelectedBinIds(tasks.slice(0, count).map((t) => t.bin_id));
    } else {
      setSelectedBinIds(allBins.slice(0, count).map((b) => b.id));
    }
  };

  const toggleBinSelection = (binId) => {
    setSelectedBinIds((prev) =>
      prev.includes(binId) ? prev.filter((id) => id !== binId) : [...prev, binId]
    );
  };

  // Convert stops into map route polyline coordinates
  const routePolyline = routeResult?.ordered_stops
    ? routeResult.ordered_stops.map((s) => [s.latitude, s.longitude])
    : [];

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t('route_optimization', 'C++ Multi-Stop Route Optimizer')}
            </h1>
            <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200 dark:border-emerald-800">
              Dijkstra + Greedy Heuristic
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Computes shortest paths over Nashik Road Graph and greedy nearest-neighbor multi-stop collection tour
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsVivaExplainerOpen(!isVivaExplainerOpen)}
          icon={<Info className="w-3.5 h-3.5" />}
        >
          {isVivaExplainerOpen ? 'Hide DSA Notes' : 'PBL/Viva DSA Notes'}
        </Button>
      </div>

      {/* DSA Viva Notes Accordion */}
      {isVivaExplainerOpen && (
        <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-3 text-xs animate-slide-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <Cpu className="w-4 h-4" /> Academic DSA Technical Briefing
            </span>
            <span className="text-[11px] text-slate-400">Time Complexity: O(N · (V + E) log V)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-300">
            <div>
              <strong className="text-white block mb-1">1. Graph Representation:</strong>
              Adjacency list of Nashik road network nodes (intersections) and directed weighted edges (distance in meters, travel time in seconds).
            </div>
            <div>
              <strong className="text-white block mb-1">2. Dijkstra Shortest Path:</strong>
              Uses `std::priority_queue` with min-heap comparator to find shortest path from current location to candidate bins in O((V + E) log V).
            </div>
            <div>
              <strong className="text-white block mb-1">3. Multi-Stop TSP Heuristic:</strong>
              Greedy Nearest-Neighbor heuristic iteratively visits the lowest-cost unvisited bin until vehicle capacity or max stops limit is reached.
            </div>
          </div>
        </div>
      )}

      {/* Route Optimizer Form & Map Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Parameters & Selection */}
        <Card className="p-5 space-y-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <form onSubmit={handleComputeRoute} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Starting NMC Depot *
              </label>
              <select
                value={selectedDepot.id}
                onChange={(e) => {
                  const d = NASHIK_DEPOTS.find((item) => item.id === e.target.value);
                  if (d) setSelectedDepot(d);
                }}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              >
                {NASHIK_DEPOTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Objective</label>
                <select
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="distance">Shortest Distance</option>
                  <option value="time">Fastest Travel Time</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Max Stops</label>
                <input
                  type="number"
                  min="2"
                  max="15"
                  value={maxStops}
                  onChange={(e) => setMaxStops(parseInt(e.target.value, 10) || 4)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Quick Selection Shortcuts */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Target Candidate Bins</label>
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">{selectedBinIds.length} Selected</span>
              </div>
              <div className="flex gap-2 mb-2.5">
                <button
                  type="button"
                  onClick={() => handleSelectTop(3)}
                  className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Top 3 High-Priority
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectTop(5)}
                  className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Top 5 High-Priority
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBinIds([])}
                  className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              </div>

              {/* Bins selection list */}
              <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 space-y-1 divide-y divide-slate-100 dark:divide-slate-850">
                {(tasks.length > 0 ? tasks : allBins).map((item) => {
                  const binId = item.bin_id || item.id;
                  const binCode = item.bin_code || item.code;
                  const binName = item.bin_name || item.name;
                  const score = item.priority_score || item.currentFillPercentage || 50;
                  const isChecked = selectedBinIds.includes(binId);

                  return (
                    <label
                      key={binId}
                      className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg cursor-pointer text-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleBinSelection(binId)}
                          className="w-4 h-4 rounded accent-emerald-600"
                        />
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{binCode}</span>
                        <span className="text-slate-600 dark:text-slate-400 truncate max-w-[140px] text-xs">{binName}</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">{Math.round(score)}</span>
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
              className="w-full justify-center text-sm font-semibold py-2.5"
              icon={<Play className="w-4 h-4" />}
            >
              {t('find_route', 'Execute C++ Route Solver')}
            </Button>
          </form>

          {/* Results Summary if computed */}
          {routeResult && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
              <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                C++ Optimization Result
              </span>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <span className="text-slate-500 dark:text-slate-400 block text-xs">{t('total_distance', 'Total Distance')}</span>
                  <span className="text-lg font-bold text-emerald-900 dark:text-emerald-300 font-mono">
                    {((routeResult.total_distance_meters || 0) / 1000).toFixed(2)} km
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <span className="text-slate-500 dark:text-slate-400 block text-xs">{t('travel_time', 'Estimated Time')}</span>
                  <span className="text-lg font-bold text-emerald-900 dark:text-emerald-300 font-mono">
                    {Math.round((routeResult.total_travel_time_seconds || 0) / 60)} mins
                  </span>
                </div>
              </div>
              <div className="p-2.5 bg-slate-900 text-white rounded-xl text-xs flex justify-between items-center font-mono">
                <span>C++ Solver Time:</span>
                <span className="text-emerald-400 font-bold">{routeResult.execution_time_ms?.toFixed(2) || '0.45'} ms</span>
              </div>
            </div>
          )}
        </Card>

        {/* Right Map & Ordered Stops */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4 flex flex-col min-h-[460px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Computed Route Visualization</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Start: {selectedDepot.name} • {selectedBinIds.length} candidate stops
                </p>
              </div>
            </div>

            <div className="flex-1 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 min-h-[400px]">
              <LeafletMap
                bins={allBins.filter((b) => selectedBinIds.includes(b.id))}
                routeStops={routeResult?.ordered_stops || []}
                routePath={routePolyline}
                center={[selectedDepot.latitude, selectedDepot.longitude]}
                zoom={13}
              />
            </div>
          </Card>

          {/* Ordered Stops Sequence */}
          {routeResult?.ordered_stops && (
            <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                Sequential Stop Order & Vehicle Itinerary
              </h4>
              <div className="space-y-2">
                {routeResult.ordered_stops.map((stop, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white font-mono font-bold text-xs flex items-center justify-center">
                        {i + 1}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">{stop.name}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                          Leg distance: {stop.leg_distance_meters ? `${(stop.leg_distance_meters / 1000).toFixed(2)} km` : 'Start'}
                        </span>
                      </div>
                    </div>
                    {stop.demand_kg > 0 && (
                      <span className="font-mono text-[11px] bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded">
                        +{stop.demand_kg} kg waste
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

                  return (
                    <label
                      key={binId}
                      className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer text-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleBinSelection(binId)}
                          className="w-4 h-4 rounded accent-emerald-600"
                        />
                        <span className="font-mono font-semibold text-slate-800">{binCode}</span>
                        <span className="text-slate-600 truncate max-w-[140px] text-xs">{binName}</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-emerald-700">{Math.round(score)}</span>
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
              className="w-full justify-center text-sm font-semibold py-2.5"
              icon={<Play className="w-4 h-4" />}
            >
              Execute C++ Route Solver
            </Button>
          </form>

          {/* Results Summary if computed */}
          {routeResult && (
            <div className="pt-4 border-t border-slate-200 space-y-2.5">
              <span className="text-sm font-bold text-slate-900 uppercase tracking-wider block">
                C++ Optimization Result
              </span>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-slate-500 block text-xs">Total Distance</span>
                  <span className="text-lg font-bold text-emerald-900 font-mono">
                    {((routeResult.total_distance_meters || 0) / 1000).toFixed(2)} km
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-slate-500 block text-xs">Estimated Time</span>
                  <span className="text-lg font-bold text-emerald-900 font-mono">
                    {Math.round((routeResult.total_travel_time_seconds || 0) / 60)} mins
                  </span>
                </div>
              </div>
              <div className="p-2.5 bg-slate-900 text-white rounded-xl text-xs flex justify-between items-center font-mono">
                <span>C++ Solver Time:</span>
                <span className="text-emerald-400 font-bold">{routeResult.execution_time_ms?.toFixed(2) || '0.45'} ms</span>
              </div>
            </div>
          )}
        </Card>

        {/* Right Map & Ordered Stops */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4 flex flex-col min-h-[460px]">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Computed Route Visualization</h3>
                <p className="text-xs text-slate-500">
                  Start: {selectedDepot.name} • {selectedBinIds.length} candidate stops
                </p>
              </div>
            </div>

            <div className="flex-1 rounded-xl overflow-hidden border border-slate-200 min-h-[400px]">
              <LeafletMap
                bins={allBins.filter((b) => selectedBinIds.includes(b.id))}
                route={routePolyline}
                center={[selectedDepot.latitude, selectedDepot.longitude]}
                zoom={13}
              />
            </div>
          </Card>

          {/* Ordered Stops Sequence */}
          {routeResult?.ordered_stops && (
            <Card className="p-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                Sequential Stop Order & Vehicle Itinerary
              </h4>
              <div className="space-y-2">
                {routeResult.ordered_stops.map((stop, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white font-mono font-bold text-xs flex items-center justify-center">
                        {i + 1}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">{stop.name}</span>
                        <span className="text-[11px] text-slate-500 block">
                          Leg distance: {stop.leg_distance_meters ? `${(stop.leg_distance_meters / 1000).toFixed(2)} km` : 'Start'}
                        </span>
                      </div>
                    </div>
                    {stop.demand_kg > 0 && (
                      <span className="font-mono text-[11px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                        +{stop.demand_kg} kg waste
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
