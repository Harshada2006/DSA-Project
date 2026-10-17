import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Vehicle } from '@eco-collect/shared';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';
import {
  Truck,
  Play,
  Pause,
  Radio,
  Clock,
  MapPin,
  RefreshCw,
  Code2,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';

export const VehiclesPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'fleet' | 'gps_adapter'>('fleet');

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const [vehData, simStatus] = await Promise.all([
        api.getVehicles(),
        api.getSimulationStatus(),
      ]);
      setVehicles(vehData);
      setIsSimulating(simStatus.isRunning);
    } catch (err: any) {
      console.error('Failed to load vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  // Poll for location updates
  useEffect(() => {
    const interval = setInterval(() => {
      api.getVehicles().then(setVehicles).catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleSimulation = async () => {
    setSimLoading(true);
    try {
      const res = await api.toggleSimulation(!isSimulating);
      setIsSimulating(res.isRunning);
      loadVehicles();
    } catch (err: any) {
      alert(`Simulation error: ${err.message}`);
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Collection Fleet & Telemetry
            {isSimulating ? (
              <Badge variant="warning" className="animate-pulse">
                SIMULATION MODE ACTIVE
              </Badge>
            ) : (
              <Badge variant="info">STANDBY MODE</Badge>
            )}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Municipal waste vehicle monitoring distinguishing real hardware GPS and simulated movement.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleToggleSimulation}
            variant={isSimulating ? 'danger' : 'primary'}
            size="sm"
            isLoading={simLoading}
            icon={isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          >
            {isSimulating ? 'Stop Demonstration Simulation' : 'Start Demonstration Simulation'}
          </Button>
          <Button
            onClick={loadVehicles}
            variant="outline"
            size="sm"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('fleet')}
          className={`pb-2.5 px-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'fleet'
              ? 'border-forest-600 text-forest-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Vehicle Fleet ({vehicles.length})
        </button>
        <button
          onClick={() => setActiveTab('gps_adapter')}
          className={`pb-2.5 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'gps_adapter'
              ? 'border-forest-600 text-forest-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          Real GPS Telemetry Adapter Specification
        </button>
      </div>

      {activeTab === 'fleet' ? (
        <div className="space-y-6">
          {/* Important Mode Disclaimer Card */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Honest Telemetry Transparency Policy</span>
              <p className="text-amber-800 leading-relaxed text-[11px]">
                In accordance with academic and municipal data integrity guidelines, vehicles labelled with{' '}
                <strong className="underline">SIMULATED</strong> represent programmed demonstration paths traversing Nashik road segments.
                They are never claimed to represent live physical GPS satellites unless connected via the authenticated Real GPS Telemetry Adapter.
              </p>
            </div>
          </div>

          {/* Fleet Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Vehicle Reg</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Driver & Contact</th>
                    <th className="py-2.5 px-3">Current Load / Capacity</th>
                    <th className="py-2.5 px-3">GPS Mode</th>
                    <th className="py-2.5 px-3">Coordinates</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Last Update</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vehicles.map((v) => {
                    const isSim = v.trackingMode === 'simulated';
                    const loadPercent = Math.round((v.currentLoadKg / v.capacityKg) * 100);
                    return (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-3 font-mono font-bold text-slate-900">
                          {v.registrationNo}
                        </td>
                        <td className="py-3.5 px-3 text-slate-700 capitalize">
                          {v.vehicleType.replace('_', ' ')}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="font-semibold text-slate-800">{v.driverName}</div>
                          <div className="text-[10px] text-slate-400">{v.driverPhone || '—'}</div>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-forest-600 rounded-full"
                                style={{ width: `${Math.min(100, loadPercent)}%` }}
                              />
                            </div>
                            <span className="font-semibold text-slate-700">
                              {v.currentLoadKg} / {v.capacityKg} kg
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isSim
                                ? 'bg-amber-50 text-amber-900 border-amber-300'
                                : 'bg-blue-50 text-blue-900 border-blue-300'
                            }`}
                          >
                            {isSim ? 'SIMULATED' : 'REAL GPS'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-slate-600">
                          {v.currentLatitude.toFixed(4)}, {v.currentLongitude.toFixed(4)}
                        </td>
                        <td className="py-3.5 px-3">
                          <Badge
                            variant={v.status === 'collecting' ? 'success' : v.status === 'en_route' ? 'info' : 'default'}
                            size="sm"
                            className="capitalize"
                          >
                            {v.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-3 text-right text-slate-500 font-mono text-[11px]">
                          {new Date(v.lastGpsUpdate).toLocaleTimeString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        /* Real GPS Adapter Documentation Tab */
        <Card
          title="Hardware Telemetry Adapter Interface"
          subtitle="Documented webhook specification for real onboard GPS transponders"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 leading-relaxed">
              Municipal garbage trucks equipped with OBD-II GPS transponders or AIS-140 compliant telematics devices can stream live telemetry into Eco Collect via HTTP POST.
            </p>

            <div className="space-y-2">
              <div className="font-bold text-slate-800">Endpoint:</div>
              <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg">
                POST /api/v1/vehicles/:vehicleId/location
              </pre>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-slate-800">Request Headers:</div>
              <pre className="p-3 bg-slate-900 text-slate-200 font-mono text-xs rounded-lg">
                Authorization: Bearer &lt;MUNICIPAL_TELEMATICS_API_KEY&gt;{'\n'}
                Content-Type: application/json
              </pre>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-slate-800">Sample Payload Schema (Validated with Zod):</div>
              <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg overflow-x-auto">
{`{
  "latitude": 20.0082,
  "longitude": 73.7945,
  "speedKmph": 34.2,
  "timestamp": "2026-10-17T14:20:00.000Z",
  "mode": "real_gps"
}`}
              </pre>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <div className="font-semibold text-slate-800">Validation & Stale Telemetry Protection:</div>
              <p className="text-slate-600 text-[11px]">
                Coordinates must fall within Nashik bounds (19.8-20.2° N, 73.6-74.0° E). Timestamps older than 15 minutes trigger stale signal warnings.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
