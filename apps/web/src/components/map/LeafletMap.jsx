import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ProvenanceBadge } from '../common/ProvenanceBadge.jsx';

// Helper component to pan/zoom smoothly and auto-fit route bounds
function MapViewUpdater({ center, zoom, routePath, waypointLocations, sourceLocation, targetLocation }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const allCoords = [];
    if (routePath && Array.isArray(routePath)) {
      routePath.forEach((p) => {
        if (Array.isArray(p) && p.length >= 2 && !isNaN(p[0]) && !isNaN(p[1])) {
          allCoords.push([p[0], p[1]]);
        }
      });
    }
    if (sourceLocation && !isNaN(sourceLocation.lat ?? sourceLocation.latitude)) {
      allCoords.push([sourceLocation.lat ?? sourceLocation.latitude, sourceLocation.lng ?? sourceLocation.longitude]);
    }
    if (targetLocation && !isNaN(targetLocation.lat ?? targetLocation.latitude)) {
      allCoords.push([targetLocation.lat ?? targetLocation.latitude, targetLocation.lng ?? targetLocation.longitude]);
    }
    if (Array.isArray(waypointLocations)) {
      waypointLocations.forEach((wp) => {
        if (!isNaN(wp.lat ?? wp.latitude)) {
          allCoords.push([wp.lat ?? wp.latitude, wp.lng ?? wp.longitude]);
        }
      });
    }
    if (allCoords.length > 1) {
      try {
        const bounds = L.latLngBounds(allCoords);
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
          return;
        }
      } catch {
        // Fallback
      }
    }
    map.setView(center, zoom);
  }, [center, zoom, routePath, waypointLocations, sourceLocation, targetLocation, map]);
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
  const isEWaste = type === 'verified_ewaste_recycler' || type === 'RECYCLER' || type === 'ewaste_refurbisher';
  const color = isEWaste ? '#7c3aed' : '#047857'; // Purple for e-waste recycler, Deep Emerald for municipal MSW plant
  const label = isEWaste ? 'E-BIN' : 'MSW';
  
  const iconSvg = isEWaste
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 6h18"/>
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        <line x1="10" y1="11" x2="10" y2="17"/>
        <line x1="14" y1="11" x2="14" y2="17"/>
      </svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 20h20"/>
        <path d="M5 20V8l5 4V8l5 4V4h4v16"/>
        <circle cx="16" cy="8" r="1.5" fill="currentColor"/>
      </svg>`;

  return L.divIcon({
    className: 'custom-facility-icon',
    html: `
      <div style="background-color: ${color}; width: 34px; height: 34px; border-radius: 9px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; border: 2.5px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.35); position: relative; cursor: pointer;" title="${isEWaste ? 'Authorized MPCB E-Waste Recycler Bin' : 'NWMPL Municipal Solid Waste Processing Plant'}">
        ${iconSvg}
        <span style="font-size: 7px; font-weight: 800; line-height: 1; letter-spacing: -0.2px; text-transform: uppercase; margin-top: 1px;">${label}</span>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -16],
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

function createSourceIcon(label = 'A') {
  return L.divIcon({
    className: 'custom-source-pin',
    html: `
      <div style="background: linear-gradient(135deg, #10b981, #047857); color: white; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 2.5px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.4);">
        <span style="transform: rotate(45deg); font-weight: 800; font-size: 11px;">${label}</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -28],
  });
}

function createDestinationIcon(label = 'B') {
  return L.divIcon({
    className: 'custom-dest-pin',
    html: `
      <div style="background: linear-gradient(135deg, #f59e0b, #dc2626); color: white; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 2.5px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.4);">
        <span style="transform: rotate(45deg); font-weight: 800; font-size: 11px;">${label}</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -28],
  });
}

function createIntermediateNodeIcon(idx) {
  return L.divIcon({
    className: 'custom-node-dot',
    html: `
      <div style="background-color: #0f172a; color: #38bdf8; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; border: 2px solid #38bdf8; box-shadow: 0 2px 4px rgba(0,0,0,0.35);">
        ${idx}
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -10],
  });
}

function createWaypointPinIcon(order) {
  return L.divIcon({
    className: 'custom-waypoint-pin',
    html: `
      <div style="background: linear-gradient(135deg, #0284c7, #0369a1); color: white; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 2.5px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.4);">
        <span style="transform: rotate(45deg); font-weight: 800; font-size: 11px;">${order}</span>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -26],
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
  sourceLocation = null,
  targetLocation = null,
  waypointLocations = [],
  intermediateNodes = [],
  routeLineColor = '#059669',
  isApproximate = false,
  routingProvider = null,
  selectedBinId,
  onSelectBin,
  onSelectSource,
  onSelectTarget,
  showBins = true,
  showFacilities = true,
  showComplaints = true,
  showWards = true,
  showRoutes = true,
  showTraversedNodes = false,
  showLegend = true,
  className = 'h-96 w-full rounded-xl',
}) => {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Route mode badge overlay */}
      {showRoutes && routePath && routePath.length > 1 && (
        <div className="absolute top-3 right-3 z-[1000] pointer-events-none">
          {isApproximate ? (
            <div className="bg-amber-600/95 text-white backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg border border-amber-700/40 flex items-center gap-2 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-200 animate-ping" />
              <span>⚠ Approximate Path (Straight-Line Fallback)</span>
            </div>
          ) : (
            <div className="bg-emerald-700/95 text-white backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg border border-emerald-800/40 flex items-center gap-2 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              <span>✓ Drivable Road Route {routingProvider ? `(${routingProvider})` : '(OSRM)'}</span>
            </div>
          )}
        </div>
      )}
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        className="h-full w-full z-0"
      >
        <MapViewUpdater
          center={center}
          zoom={zoom}
          routePath={routePath}
          waypointLocations={waypointLocations}
          sourceLocation={sourceLocation}
          targetLocation={targetLocation}
        />

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

        {/* Verified Facilities (MPCB Recyclers & Municipal MSW Plant) */}
        {showFacilities &&
          facilities
            .filter((fac) => {
              // Deduplicate if facility is already the selected Source (A) or Destination (B)
              if (sourceLocation && (sourceLocation.id === fac.id || (Math.hypot((sourceLocation.lat ?? sourceLocation.latitude) - fac.latitude, (sourceLocation.lng ?? sourceLocation.longitude) - fac.longitude) < 0.0002))) {
                return false;
              }
              if (targetLocation && (targetLocation.id === fac.id || (Math.hypot((targetLocation.lat ?? targetLocation.latitude) - fac.latitude, (targetLocation.lng ?? targetLocation.longitude) - fac.longitude) < 0.0002))) {
                return false;
              }
              return true;
            })
            .map((fac) => {
              const isEWaste = fac.facilityType === 'verified_ewaste_recycler' || fac.facilityType === 'RECYCLER' || fac.wasteType === 'electronic';
              return (
                <Marker
                  key={fac.id}
                  position={[fac.latitude, fac.longitude]}
                  icon={createFacilityIcon(fac.facilityType)}
                >
                  <Popup>
                    <div className="p-1 min-w-[230px] text-xs">
                      <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-slate-100">
                        <span className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                          isEWaste ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isEWaste ? '♻️' : '🏭'}
                        </span>
                        <div>
                          <div className="font-bold text-sm text-slate-900">{fac.name}</div>
                          <span className={`text-[10px] font-semibold uppercase ${isEWaste ? 'text-purple-700' : 'text-emerald-800'}`}>
                            {isEWaste ? 'MPCB Authorized E-Waste Recycler' : 'Municipal Solid Waste Processing Plant'}
                          </span>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-600 mb-1">{fac.facilityAddress || fac.address}</div>
                      <div className="text-[10px] font-mono text-slate-700 mb-1">
                        {fac.authorizationNumber || (isEWaste ? 'MPCB Regulated' : 'NMC Authorized')}
                      </div>
                      <div className="text-[10px] text-slate-500 mb-1">
                        Source: {fac.sourceOrganization}
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          ✓ {fac.verificationStatus ? fac.verificationStatus.toUpperCase() : 'VERIFIED'}
                        </span>
                      </div>
                      {/* Action buttons to set as route source or destination */}
                      {(onSelectSource || onSelectTarget) && (
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5">
                          {onSelectSource && (
                            <button
                              type="button"
                              onClick={() => onSelectSource(fac)}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-bold border border-emerald-200 transition-colors cursor-pointer"
                            >
                              Set as Source (A)
                            </button>
                          )}
                          {onSelectTarget && (
                            <button
                              type="button"
                              onClick={() => onSelectTarget(fac)}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-[10px] font-bold border border-amber-200 transition-colors cursor-pointer"
                            >
                              Set as Dest (B)
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

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

        {/* Automatically Traversed Road Network Intersections (Only rendered if showTraversedNodes is explicitly enabled; NEVER as numbered user stop pins) */}
        {showRoutes &&
          showTraversedNodes &&
          intermediateNodes &&
          intermediateNodes.map((node, idx) => (
            <Marker
              key={`inter-${node.id || idx}`}
              position={[node.lat ?? node.latitude, node.lng ?? node.longitude]}
              icon={createIntermediateNodeIcon(idx + 1)}
            >
              <Popup>
                <div className="text-xs p-1">
                  <div className="font-bold text-slate-800">Traversed Road Intersection</div>
                  <div className="font-mono text-sky-700 text-[11px]">{node.id} — {node.name}</div>
                  <div className="text-slate-500 text-[10px]">Automatically traversed graph node (Not a user stop)</div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Source Location Marker */}
        {showRoutes && sourceLocation && (
          <Marker
            position={[sourceLocation.lat ?? sourceLocation.latitude, sourceLocation.lng ?? sourceLocation.longitude]}
            icon={createSourceIcon(sourceLocation.label || 'A')}
          >
            <Popup>
              <div className="text-xs p-1">
                <div className="font-bold text-emerald-800 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                  Start / Source (A)
                </div>
                <div className="text-slate-800 font-semibold">{sourceLocation.name || sourceLocation.id}</div>
                {sourceLocation.details && <div className="text-slate-500 text-[10px] mt-0.5">{sourceLocation.details}</div>}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Intermediate Waypoint Markers */}
        {showRoutes &&
          waypointLocations &&
          waypointLocations.map((wp, idx) => (
            <Marker
              key={`wp-${wp.id || idx}`}
              position={[wp.lat ?? wp.latitude, wp.lng ?? wp.longitude]}
              icon={createWaypointPinIcon(wp.order || idx + 1)}
            >
              <Popup>
                <div className="text-xs p-1">
                  <div className="font-bold text-sky-800 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-sky-500 inline-block"></span>
                    Intermediate Stop #{wp.order || idx + 1}
                  </div>
                  <div className="text-slate-800 font-semibold">{wp.name || wp.id}</div>
                  {wp.details && <div className="text-slate-500 text-[10px] mt-0.5">{wp.details}</div>}
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Target / Destination Marker */}
        {showRoutes && targetLocation && (
          <Marker
            position={[targetLocation.lat ?? targetLocation.latitude, targetLocation.lng ?? targetLocation.longitude]}
            icon={createDestinationIcon(targetLocation.label || 'B')}
          >
            <Popup>
              <div className="text-xs p-1">
                <div className="font-bold text-amber-800 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                  Destination / Target (B)
                </div>
                <div className="text-slate-800 font-semibold">{targetLocation.name || targetLocation.id}</div>
                {targetLocation.details && <div className="text-slate-500 text-[10px] mt-0.5">{targetLocation.details}</div>}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route Polyline (Dijkstra Path) */}
        {showRoutes && routePath.length > 1 && (
          <Polyline
            positions={routePath}
            pathOptions={{
              color: isApproximate ? '#d97706' : (routeLineColor || '#059669'),
              weight: isApproximate ? 4 : 5,
              opacity: 0.9,
              dashArray: isApproximate ? '8, 8' : undefined,
            }}
          />
        )}
      </MapContainer>

      {/* Map Legend Overlay */}
      {showLegend && (
        <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md text-[10px] space-y-1 max-w-[200px] pointer-events-auto">
          <div className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[9px] mb-1">
            Map Legend
          </div>
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[8px] shrink-0">A</span>
            <span>Start / Source (A)</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className="w-3.5 h-3.5 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center text-[8px] shrink-0">1</span>
            <span>Selected Stop (1, 2)</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className="w-3.5 h-3.5 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center text-[8px] shrink-0">B</span>
            <span>Destination (B)</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className="w-3.5 h-3.5 rounded bg-emerald-800 text-white font-bold flex items-center justify-center text-[7px] shrink-0">MSW</span>
            <span>MSW Disposal Plant</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className="w-3.5 h-3.5 rounded bg-purple-600 text-white font-bold flex items-center justify-center text-[7px] shrink-0">E-BIN</span>
            <span>E-Waste Recycler Bin</span>
          </div>
          {showBins && (
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block border border-white shrink-0"></span>
              <span>Waste Bins (Fill %)</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
