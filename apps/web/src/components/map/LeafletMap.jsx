import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ProvenanceBadge } from '../common/ProvenanceBadge.jsx';

// Helper component to pan/zoom smoothly
function MapViewUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// Custom Leaflet DivIcons
function createBinIcon(fill, isSelected, isStale = false, priorityCategory = 'Normal') {
  let color = '#10b981'; // Green: Normal
  if (isStale) color = '#94a3b8'; // Stale observation
  else if (priorityCategory === 'Critical' || fill >= 85) color = '#ef4444'; // Red: Critical
  else if (priorityCategory === 'High' || fill >= 70) color = '#f97316'; // Orange: High
  else if (priorityCategory === 'Monitor' || fill >= 50) color = '#f59e0b'; // Amber: Monitor

  const size = isSelected ? 34 : 28;
  const border = isSelected ? 'border: 3px solid #064e3b; box-shadow: 0 0 0 3px #6ee7b7;' : 'border: 2px solid white;';

  return L.divIcon({
    className: 'custom-bin-icon',
    html: `
      <div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); ${border}">
        ${isStale ? '?' : `${Math.round(fill)}%`}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function createFacilityIcon(type = 'general_waste_facility') {
  const color = type === 'verified_ewaste_recycler' ? '#8b5cf6' : '#059669';
  const label = type === 'verified_ewaste_recycler' ? 'EW' : 'FAC';
  return L.divIcon({
    className: 'custom-facility-icon',
    html: `
      <div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35);">
        ${label}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function createComplaintIcon(severity) {
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

function createStopIcon(order, isDepot) {
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

export const LeafletMap = ({
  center = [19.9975, 73.7898], // Center on Nashik
  zoom = 13,
  bins = [],
  facilities = [],
  complaints = [],
  wards = [],
  routePath = [],
  routeStops = [],
  selectedBinId,
  onSelectBin,
  showBins = true,
  showFacilities = true,
  showComplaints = true,
  showWards = true,
  showRoutes = true,
  className = 'h-96 w-full rounded-xl',
}) => {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        className="h-full w-full z-0"
      >
        <MapViewUpdater center={center} zoom={zoom} />

        {/* OpenStreetMap Tiles with Attribution */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors | Nashik Municipal PBL'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Wards Boundary Layers */}
        {showWards &&
          wards.map((ward) => {
            if (!ward.boundaryGeoJson) return null;
            try {
              const geometry = JSON.parse(ward.boundaryGeoJson);
              return (
                <GeoJSON
                  key={ward.id}
                  data={geometry}
                  style={{
                    color: '#268754',
                    weight: 1.5,
                    opacity: 0.7,
                    fillColor: '#97dcb2',
                    fillOpacity: 0.08,
                  }}
                >
                  <Tooltip sticky>
                    <div className="font-semibold text-xs text-slate-800">{ward.name} Ward</div>
                    <div className="text-[10px] text-slate-500">{ward.zone}</div>
                  </Tooltip>
                </GeoJSON>
              );
            } catch {
              return null;
            }
          })}

        {/* Smart Waste Bins */}
        {showBins &&
          bins.map((bin) => {
            const isSelected = selectedBinId === bin.id;
            const hoursSinceObs = bin.lastObservedAt
              ? (Date.now() - new Date(bin.lastObservedAt).getTime()) / (1000 * 3600)
              : 999;
            const isStale = hoursSinceObs > 48;

            return (
              <Marker
                key={bin.id}
                position={[bin.latitude, bin.longitude]}
                icon={createBinIcon(bin.currentFillPercentage, isSelected, isStale, bin.urgency)}
                eventHandlers={{
                  click: () => onSelectBin && onSelectBin(bin),
                }}
              >
                <Popup className="custom-popup">
                  <div className="p-1 min-w-[210px] text-xs">
                    <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-slate-100">
                      <span className="font-bold text-slate-800 text-sm">{bin.name}</span>
                      <span className="font-mono text-[10px] text-slate-500">{bin.code}</span>
                    </div>

                    <div className="space-y-1 text-slate-600 mb-2">
                      <div className="flex justify-between">
                        <span>Ward:</span>
                        <span className="font-medium text-slate-800">{bin.ward?.name || 'Nashik'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Type:</span>
                        <span className="font-medium capitalize text-slate-800">{bin.wasteType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Area Category:</span>
                        <span className="font-medium capitalize text-slate-800">{bin.areaCategory}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Current Fullness:</span>
                        <span className="font-bold text-slate-900">{Math.round(bin.currentFillPercentage)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Urgency Level:</span>
                        <span className="font-bold uppercase text-slate-900">{bin.urgency}</span>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                      <ProvenanceBadge provenance={bin.provenance} showIcon={false} />
                      {onSelectBin && (
                        <button
                          onClick={() => onSelectBin(bin)}
                          className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900"
                        >
                          View Details &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* Verified Facilities (MPCB Recyclers & General Waste) */}
        {showFacilities &&
          facilities.map((fac) => (
            <Marker
              key={fac.id}
              position={[fac.latitude, fac.longitude]}
              icon={createFacilityIcon(fac.facilityType)}
            >
              <Popup>
                <div className="p-1 min-w-[220px] text-xs">
                  <div className="font-bold text-sm text-slate-900 mb-1">{fac.name}</div>
                  <div className="text-[11px] text-slate-600 mb-1">{fac.address}</div>
                  <div className="text-[10px] font-mono text-purple-700 mb-1">
                    {fac.authorizationNumber || 'MPCB Regulated'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Source: {fac.sourceOrganization}
                  </div>
                  <div className="mt-1">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-800">
                      {fac.verificationStatus.toUpperCase()}
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Complaints */}
        {showComplaints &&
          complaints.map((c) => (
            <Marker
              key={c.id}
              position={[c.latitude, c.longitude]}
              icon={createComplaintIcon(c.severity)}
            >
              <Popup>
                <div className="p-1 min-w-[190px] text-xs">
                  <div className="font-bold text-slate-800 text-xs mb-1">Complaint: {c.ticketNo}</div>
                  <div className="text-slate-600 mb-1">{c.description}</div>
                  <div className="text-[10px] font-semibold text-orange-600 capitalize">
                    Status: {c.status}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Route Stops */}
        {showRoutes &&
          routeStops.map((stop) => (
            <Marker
              key={`stop-${stop.stop_order || stop.id}`}
              position={[stop.latitude, stop.longitude]}
              icon={createStopIcon(stop.stop_order, stop.type === 'depot')}
            >
              <Popup>
                <div className="text-xs p-1">
                  <div className="font-bold">{stop.type === 'depot' ? 'Depot' : `Stop #${stop.stop_order}`}</div>
                  <div>{stop.name}</div>
                  {stop.demand_kg > 0 && <div className="text-slate-500">{stop.demand_kg} kg waste</div>}
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Route Polyline (Dijkstra Path) */}
        {showRoutes && routePath.length > 1 && (
          <Polyline
            positions={routePath}
            pathOptions={{
              color: '#059669',
              weight: 4,
              opacity: 0.85,
              dashArray: '8, 6',
            }}
          />
        )}
      </MapContainer>
    </div>
  );
};
