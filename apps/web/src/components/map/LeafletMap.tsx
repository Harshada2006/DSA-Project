import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Bin, Vehicle, Complaint, Ward } from '@eco-collect/shared';
import { ProvenanceBadge } from '../common/ProvenanceBadge';

// Helper component to pan/zoom smoothly
function MapViewUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// Custom Leaflet DivIcons to avoid image asset loading issues
function createBinIcon(fill: number, isSelected: boolean) {
  let color = '#10b981'; // Green
  if (fill >= 80) color = '#ef4444'; // Red
  else if (fill >= 60) color = '#f59e0b'; // Amber

  const size = isSelected ? 34 : 28;
  const border = isSelected ? 'border-3 border-indigo-600 ring-2 ring-indigo-300' : 'border-2 border-white';

  return L.divIcon({
    className: 'custom-bin-icon',
    html: `
      <div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);" class="${border}">
        ${Math.round(fill)}%
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function createVehicleIcon(trackingMode: string) {
  const isSim = trackingMode === 'simulated';
  const color = isSim ? '#d97706' : '#2563eb'; // Amber for simulated, Blue for real GPS

  return L.divIcon({
    className: 'custom-vehicle-icon',
    html: `
      <div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; border: 2px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.35);">
        🚚
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function createComplaintIcon(severity: string) {
  const color = severity === 'critical' ? '#dc2626' : '#f97316';
  return L.divIcon({
    className: 'custom-complaint-icon',
    html: `
      <div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
        !
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function createStopIcon(order: number, isDepot: boolean) {
  const bg = isDepot ? '#0f172a' : '#1e6b44';
  return L.divIcon({
    className: 'custom-stop-icon',
    html: `
      <div style="background-color: ${bg}; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4);">
        ${isDepot ? 'D' : order}
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

interface LeafletMapProps {
  center?: [number, number];
  zoom?: number;
  bins?: Bin[];
  vehicles?: Vehicle[];
  complaints?: Complaint[];
  wards?: Ward[];
  routePath?: [number, number][];
  routeStops?: any[];
  selectedBinId?: string | null;
  onSelectBin?: (bin: Bin) => void;
  showBins?: boolean;
  showVehicles?: boolean;
  showComplaints?: boolean;
  showWards?: boolean;
  showRoutes?: boolean;
  className?: string;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  center = [19.9975, 73.7898], // Center on Nashik
  zoom = 13,
  bins = [],
  vehicles = [],
  complaints = [],
  wards = [],
  routePath = [],
  routeStops = [],
  selectedBinId,
  onSelectBin,
  showBins = true,
  showVehicles = true,
  showComplaints = true,
  showWards = true,
  showRoutes = true,
  className = 'h-[600px]',
}) => {
  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-xs ${className}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <MapViewUpdater center={center} zoom={zoom} />

        {/* OpenStreetMap Tile Layer with Attribution */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Wards GeoJSON Boundaries */}
        {showWards &&
          wards.map((ward) => {
            if (!ward.boundaryGeoJson) return null;
            return (
              <GeoJSON
                key={ward.id}
                data={ward.boundaryGeoJson}
                style={{
                  color: '#268754',
                  weight: 1.5,
                  opacity: 0.7,
                  fillColor: '#97dcb2',
                  fillOpacity: 0.08,
                }}
              >
                <Tooltip sticky>
                  <div className="font-sans text-xs">
                    <span className="font-bold">{ward.name}</span> ({ward.zone})
                    <br />
                    Population: {ward.populationEstimated.toLocaleString()}
                  </div>
                </Tooltip>
              </GeoJSON>
            );
          })}

        {/* Planned Route Polyline */}
        {showRoutes && routePath.length > 1 && (
          <Polyline
            positions={routePath}
            pathOptions={{
              color: '#15803d',
              weight: 4,
              opacity: 0.85,
              dashArray: '8, 8',
            }}
          />
        )}

        {/* Route Stops Markers */}
        {showRoutes &&
          routeStops.map((stop, index) => (
            <Marker
              key={`stop-${index}`}
              position={[stop.latitude, stop.longitude]}
              icon={createStopIcon(stop.stopOrder, stop.type === 'depot')}
            >
              <Popup>
                <div className="text-xs p-1">
                  <div className="font-bold text-slate-900">
                    Stop #{stop.stopOrder}: {stop.name}
                  </div>
                  <div className="text-slate-600 mt-0.5">
                    Cumulative Dist: {(stop.cumulativeDistanceMeters / 1000).toFixed(2)} km
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Smart Bins Markers */}
        {showBins &&
          bins.map((bin) => (
            <Marker
              key={bin.id}
              position={[bin.latitude, bin.longitude]}
              icon={createBinIcon(bin.currentFillPercentage, bin.id === selectedBinId)}
              eventHandlers={{
                click: () => onSelectBin && onSelectBin(bin),
              }}
            >
              <Popup>
                <div className="p-1 min-w-[180px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 text-xs">{bin.code}</span>
                    <ProvenanceBadge provenance={bin.provenance} showIcon={false} />
                  </div>
                  <div className="text-xs font-medium text-slate-700 mt-1">{bin.name}</div>
                  <div className="mt-2 text-xs text-slate-600 space-y-0.5">
                    <div>Fill: <span className="font-bold text-slate-800">{bin.currentFillPercentage}%</span></div>
                    <div>Capacity: {bin.capacityLiters} L ({bin.wasteType})</div>
                    <div>Priority: <span className="font-semibold text-emerald-700">{bin.priorityScore}</span></div>
                  </div>
                  {onSelectBin && (
                    <button
                      onClick={() => onSelectBin(bin)}
                      className="mt-2 w-full text-center text-[11px] font-semibold text-forest-700 hover:text-forest-900 bg-forest-50 py-1 rounded-sm border border-forest-200"
                    >
                      View Details & Actions
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Vehicles Markers */}
        {showVehicles &&
          vehicles.map((v) => (
            <Marker
              key={v.id}
              position={[v.currentLatitude, v.currentLongitude]}
              icon={createVehicleIcon(v.trackingMode)}
            >
              <Popup>
                <div className="p-1 text-xs">
                  <div className="font-bold text-slate-900">{v.registrationNo}</div>
                  <div className="text-slate-600">{v.vehicleType} • {v.driverName}</div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${
                        v.trackingMode === 'simulated'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-blue-100 text-blue-900'
                      }`}
                    >
                      {v.trackingMode === 'simulated' ? 'SIMULATED GPS' : 'REAL GPS'}
                    </span>
                    <span className="text-[10px] text-slate-500 capitalize">{v.status}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Complaints Markers */}
        {showComplaints &&
          complaints.map((c) => (
            <Marker
              key={c.id}
              position={[c.latitude, c.longitude]}
              icon={createComplaintIcon(c.severity)}
            >
              <Popup>
                <div className="p-1 text-xs max-w-xs">
                  <div className="font-bold text-rose-700">{c.ticketNo} ({c.severity})</div>
                  <div className="text-slate-800 font-medium capitalize mt-0.5">{c.category.replace('_', ' ')}</div>
                  <p className="text-slate-600 text-[11px] mt-1">{c.description}</p>
                  <div className="text-[10px] text-slate-400 mt-1">Status: {c.status}</div>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
};
