import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import { LeafletMap } from '../components/map/LeafletMap.jsx';
import {
  Truck,
  CheckCircle2,
  AlertTriangle,
  Tv,
  LogOut,
  MapPin,
  Clock,
  Navigation,
  RefreshCw,
  Layers,
  ArrowRight,
  ShieldAlert,
  Check,
  Building2,
  FileCheck2,
  AlertCircle,
  Compass,
  Route,
  ChevronRight,
  CheckCircle,
  Scale,
  ShieldCheck,
  MapPinned,
  Info,
  X,
  Calendar,
  Sparkles,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  QrCode,
  Camera,
} from 'lucide-react';
import { LanguageSelector } from '../components/common/LanguageSelector.jsx';
import { ThemeToggle } from '../components/common/ThemeToggle.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

export const WorkerDashboard = () => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  // Navigation tabs: 'overview' | 'tasks' | 'record' | 'route' | 'ewaste'
  const [activeTab, setActiveTab] = useState('overview');

  // Core Data State
  const [tasks, setTasks] = useState([]);
  const [ewasteRequests, setEWasteRequests] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [roadblocks, setRoadblocks] = useState([]);
  const [roadNodes, setRoadNodes] = useState([]);
  const [vehicleStatus, setVehicleStatus] = useState(null);

  // Loading & Global Notice State
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [unloadLoading, setUnloadLoading] = useState(false);

  // Task Filter in 'tasks' tab: 'all' | 'pending' | 'collected'
  const [taskFilter, setTaskFilter] = useState('all');

  // Record Collection State
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [collectionForm, setCollectionForm] = useState({
    confirmed: true,
    weightKg: 120,
    wasteType: 'SOLID',
    notes: 'Cleared receptacle into compaction unit',
    gpsConsent: true,
  });
  const [collectionSubmitting, setCollectionSubmitting] = useState(false);
  const [gpsTelemetry, setGpsTelemetry] = useState({
    state: 'idle', // 'idle' | 'locating' | 'acquired' | 'failed'
    lat: null,
    lng: null,
    accuracy: null,
    distanceMeters: null,
    message: '',
  });

  // Bin Asset QR / Barcode Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerSupported, setScannerSupported] = useState(true);
  const [scannerStatus, setScannerStatus] = useState('idle');
  const [scannerMessage, setScannerMessage] = useState('');
  const [manualAssetCode, setManualAssetCode] = useState('');
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const scanIntervalRef = React.useRef(null);

  // Suggested Route (DSA Shortest Path) State
  const [sourceId, setSourceId] = useState('N-CBS');
  const [targetId, setTargetId] = useState('N-CAN');
  const [intermediateStops, setIntermediateStops] = useState([]); // [{ id, key }]
  const [avoidBlocked, setAvoidBlocked] = useState(true);
  const [shortestPathResult, setShortestPathResult] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(null);
  const routeRequestIdRef = useRef(0);

  // E-Waste Handover Form State
  const [handoverForm, setHandoverForm] = useState({
    facilityId: '',
    wasteCategory: 'ELECTRONIC',
    weightKg: 45,
    itemCount: 8,
    manifestNumber: `MNF-NSK-${Date.now().toString().slice(-6)}`,
    certificateNumber: `CERT-MPCB-${Date.now().toString().slice(-6)}`,
    notes: 'Handover of weekly residential IT & electronics',
  });
  const [handoverSubmitting, setHandoverSubmitting] = useState(false);

  // Separate Field Issue / Hazard Reporting Modal State
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({
    issueType: 'blocked_road',
    taskId: '',
    binId: '',
    description: '',
    location: 'Nashik Municipal Area',
    roadName: '',
  });
  const [issueSubmitting, setIssueSubmitting] = useState(false);

  // Load all worker portal data on mount
  useEffect(() => {
    loadWorkerData();
    return () => {
      stopCamera();
    };
  }, []);

  const loadWorkerData = async () => {
    setLoading(true);
    try {
      const [tasksData, ewasteData, facData, roadblocksData, vehData, nodesData] = await Promise.all([
        api.getTasks().catch(() => []),
        api.getEWasteRequests().catch(() => []),
        api.getFacilities().catch(() => []),
        api.getActiveRoadblocks().catch(() => []),
        api.getVehicleStatus().catch(() => null),
        api.getRoadNodes().catch(() => []),
      ]);

      const loadedTasks = tasksData || [];
      setTasks(loadedTasks);
      setEWasteRequests(ewasteData || []);
      setFacilities(facData || []);
      setRoadblocks(roadblocksData || []);
      if (vehData) setVehicleStatus(vehData);
      setRoadNodes(nodesData || []);

      // Set default facility for ewaste handover
      const recyclers = (facData || []).filter(
        (f) => f.facilityType === 'verified_ewaste_recycler' || f.facilityType === 'RECYCLER'
      );
      if (recyclers.length > 0 && !handoverForm.facilityId) {
        setHandoverForm((prev) => ({ ...prev, facilityId: recyclers[0].id }));
      } else if (facData && facData.length > 0 && !handoverForm.facilityId) {
        setHandoverForm((prev) => ({ ...prev, facilityId: facData[0].id }));
      }

      // Default source to Panchavati or CBS if available in nodes
      if (nodesData && nodesData.length > 0) {
        const cbsNode = nodesData.find((n) => n.id === 'N-CBS');
        if (cbsNode) setSourceId('N-CBS');
        else setSourceId(nodesData[0].id);

        const targetNode = nodesData.find((n) => n.id === 'N-CAN') || nodesData[1] || nodesData[0];
        if (targetNode) setTargetId(targetNode.id);
      }
    } catch (err) {
      console.error('Failed to load worker data:', err);
      setNotice({ type: 'error', text: 'Failed to load initial data. Please refresh the page.' });
    } finally {
      setLoading(false);
    }
  };

  // The active task selected in the Record Collection module
  const selectedTask = useMemo(() => {
    return tasks.find((t) => t.id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  // Filtered tasks for the Assigned Tasks tab
  const filteredTasks = useMemo(() => {
    if (taskFilter === 'pending') {
      return tasks.filter((t) => t.status !== 'collected');
    }
    if (taskFilter === 'collected') {
      return tasks.filter((t) => t.status === 'collected');
    }
    return tasks;
  }, [tasks, taskFilter]);

  // Statistics for Overview
  const stats = useMemo(() => {
    const total = tasks.length;
    const collected = tasks.filter((t) => t.status === 'collected').length;
    const pending = total - collected;
    const critical = tasks.filter((t) => (t.taskPriority || t.priority) === 'critical').length;
    return { total, collected, pending, critical };
  }, [tasks]);

  /* ========================================================================== */
  /* MODULE: Bin Asset QR & Barcode Camera Scanner (with Manual Fallback)      */
  /* ========================================================================== */
  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScannerStatus('idle');
  };

  const startCamera = async () => {
    setScannerStatus('scanning');
    setScannerMessage('Contacting device camera...');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setScannerSupported(false);
        setScannerStatus('error');
        setScannerMessage('Camera access not supported by your browser. Please use manual code lookup.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setScannerMessage('Aim camera at receptacle QR or barcode tag...');

      // Real video frame decoding via BarcodeDetector API when supported
      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({
          formats: ['qr_code', 'code_128', 'code_39', 'ean_13'],
        });

        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const detectedCode = barcodes[0].rawValue.trim();
              handleAssetCodeFound(detectedCode);
            }
          } catch (_e) {
            // Frame decode error - continue scanning loop
          }
        }, 500);
      } else {
        setScannerMessage('BarcodeDetector API unavailable in this browser. Camera active; enter code below if not decoded.');
      }
    } catch (err) {
      setScannerStatus('error');
      setScannerMessage(`Camera access denied or unavailable (${err.message}). Safe manual asset lookup enabled.`);
    }
  };

  const handleAssetCodeFound = (code) => {
    const clean = code.trim().toUpperCase();
    const matchedTask = tasks.find(
      (t) =>
        (t.bin?.code || '').toUpperCase() === clean ||
        t.binId === clean ||
        (t.bin?.name || '').toUpperCase().includes(clean)
    );

    if (matchedTask) {
      setSelectedTaskId(matchedTask.id);
      stopCamera();
      setIsScannerOpen(false);
      setNotice({
        type: 'success',
        text: `✓ Scanned asset ${matchedTask.bin?.code} recognized! Collection task selected.`,
      });
    } else {
      setScannerStatus('error');
      setScannerMessage(`Asset code "${clean}" detected, but no matching assigned task found in your queue.`);
    }
  };

  const handleManualAssetLookup = (e) => {
    e.preventDefault();
    if (!manualAssetCode.trim()) return;
    handleAssetCodeFound(manualAssetCode);
  };

  /* ========================================================================== */
  /* MODULE 1: Record Collection Handler & Device GPS Verification              */
  /* ========================================================================== */
  const acquireDevicePosition = () => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        reject(new Error('Device does not support HTML5 Geolocation API.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
      );
    });
  };

  const handleAcquireGps = async () => {
    setGpsTelemetry((prev) => ({
      ...prev,
      state: 'locating',
      message: 'Contacting device GPS receiver...',
    }));

    try {
      const pos = await acquireDevicePosition();
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = Math.round(pos.coords.accuracy);

      let distanceMeters = null;
      if (selectedTask?.bin?.latitude && selectedTask?.bin?.longitude) {
        const R = 6371e3;
        const phi1 = (lat * Math.PI) / 180;
        const phi2 = (selectedTask.bin.latitude * Math.PI) / 180;
        const deltaPhi = ((selectedTask.bin.latitude - lat) * Math.PI) / 180;
        const deltaLambda = ((selectedTask.bin.longitude - lng) * Math.PI) / 180;
        const a =
          Math.sin(deltaPhi / 2) ** 2 +
          Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
        distanceMeters = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
      }

      setGpsTelemetry({
        state: 'acquired',
        lat,
        lng,
        accuracy,
        distanceMeters,
        message:
          distanceMeters !== null
            ? `Verified GPS fix: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E (±${accuracy}m accuracy, ${distanceMeters}m from target)`
            : `Verified GPS fix: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E (±${accuracy}m accuracy)`,
      });
    } catch (err) {
      setGpsTelemetry({
        state: 'failed',
        lat: null,
        lng: null,
        accuracy: null,
        distanceMeters: null,
        message: `GPS telemetry unavailable (${err.message}). Safe audit fallback enabled.`,
      });
    }
  };

  const handleRecordCollection = async (e) => {
    e.preventDefault();

    if (!selectedTask) {
      setNotice({ type: 'error', text: 'Please select an assigned collection task from the list.' });
      return;
    }

    if (selectedTask.status === 'collected') {
      setNotice({ type: 'error', text: 'This task has already been completed and collected. Duplicate submission is disabled.' });
      return;
    }

    if (!collectionForm.gpsConsent) {
      setNotice({ type: 'error', text: 'Physical presence GPS consent is required to verify collection.' });
      return;
    }

    const weight = parseFloat(collectionForm.weightKg);
    if (isNaN(weight) || weight <= 0) {
      setNotice({ type: 'error', text: 'Please enter a valid net collected waste weight greater than 0 kg.' });
      return;
    }

    setCollectionSubmitting(true);
    try {
      let finalLat = gpsTelemetry.lat;
      let finalLng = gpsTelemetry.lng;
      let accuracyMeters = gpsTelemetry.accuracy;

      if (!finalLat && collectionForm.gpsConsent && navigator.geolocation) {
        try {
          const pos = await acquireDevicePosition();
          finalLat = pos.coords.latitude;
          finalLng = pos.coords.longitude;
          accuracyMeters = Math.round(pos.coords.accuracy);
        } catch (_geoErr) {
          // Do NOT fabricate coordinates - send undefined so backend records without spoofing
        }
      }

      const updatedTask = await api.recordCollection(selectedTask.id, {
        weightKg: weight,
        wasteType: collectionForm.wasteType,
        notes: collectionForm.notes || undefined,
        gpsLat: finalLat || undefined,
        gpsLng: finalLng || undefined,
        accuracyMeters: accuracyMeters || undefined,
        gpsConsent: true,
        observedFillAfter: 0.0,
      });

      // Update tasks list state immediately without page reload
      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === selectedTask.id
            ? {
                ...t,
                status: 'collected',
                observedFill: 0.0,
                bin: t.bin
                  ? {
                      ...t.bin,
                      currentFillPercentage: 0.0,
                      urgency: 'normal',
                      status: 'active',
                    }
                  : t.bin,
              }
            : t
        )
      );

      setSelectedTask((prev) =>
        prev && prev.id === selectedTask.id
          ? {
              ...prev,
              status: 'collected',
              observedFill: 0.0,
              bin: prev.bin
                ? {
                    ...prev.bin,
                    currentFillPercentage: 0.0,
                    urgency: 'normal',
                    status: 'active',
                  }
                : prev.bin,
            }
          : prev
      );

      const gpsNote = updatedTask?.gpsVerified
        ? ` (GPS verified within ${updatedTask.distanceToBinMeters}m of receptacle)`
        : updatedTask?.distanceToBinMeters !== null && updatedTask?.distanceToBinMeters !== undefined
        ? ` (GPS recorded: ${updatedTask.distanceToBinMeters}m from receptacle)`
        : '';

      setNotice({
        type: 'success',
        text: `✓ Collection successfully recorded for ${selectedTask.bin?.code || 'Bin'} (${selectedTask.bin?.name || 'Receptacle'})! Status updated to Collected${gpsNote}.`,
      });

      // Reset form
      setCollectionForm((prev) => ({
        ...prev,
        notes: 'Cleared receptacle into compaction unit',
      }));

      // Refresh data in background
      api.getVehicleStatus().then((veh) => veh && setVehicleStatus(veh)).catch(() => {});
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Failed to record collection. Please try again.' });
    } finally {
      setCollectionSubmitting(false);
    }
  };

  /* ========================================================================== */
  /* MODULE 2: Suggested Route — C++17 Dijkstra Shortest Path Handler           */
  /* ========================================================================== */
  const handleSourceChange = (newSrc) => {
    setSourceId(newSrc);
    routeRequestIdRef.current++;
    setShortestPathResult(null); // Clear stale route
    setRouteError(null);
  };

  const handleTargetChange = (newTgt) => {
    setTargetId(newTgt);
    routeRequestIdRef.current++;
    setShortestPathResult(null); // Clear stale route
    setRouteError(null);
  };

  const handleAddIntermediateStop = () => {
    const defaultNodeId = roadNodes[intermediateStops.length + 2]?.id || roadNodes[0]?.id || 'N-COL';
    routeRequestIdRef.current++;
    setShortestPathResult(null); // Clear stale result when inputs change
    setRouteError(null);
    setIntermediateStops((prev) => [
      ...prev,
      {
        id: defaultNodeId,
        key: `stop-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      },
    ]);
  };

  const handleRemoveIntermediateStop = (index) => {
    routeRequestIdRef.current++;
    setShortestPathResult(null); // Clear stale route
    setRouteError(null);
    setIntermediateStops((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleMoveStopUp = (index) => {
    if (index === 0) return;
    routeRequestIdRef.current++;
    setShortestPathResult(null);
    setRouteError(null);
    setIntermediateStops((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleMoveStopDown = (index) => {
    if (index >= intermediateStops.length - 1) return;
    routeRequestIdRef.current++;
    setShortestPathResult(null);
    setRouteError(null);
    setIntermediateStops((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleUpdateStopId = (index, newId) => {
    routeRequestIdRef.current++;
    setShortestPathResult(null); // Clear stale route
    setRouteError(null);
    setIntermediateStops((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], id: newId };
      return copy;
    });
  };

  const handleClearRoute = () => {
    routeRequestIdRef.current++;
    setShortestPathResult(null);
    setRouteError(null);
    setIntermediateStops([]);
    setRouteLoading(false);
  };

  const handleFindShortestPath = async (customSource, customTarget, customStops) => {
    const src = customSource || sourceId;
    const tgt = customTarget || targetId;
    const waypoints = customStops !== undefined ? customStops : intermediateStops.map((s) => s.id).filter(Boolean);

    if (!src || !tgt) {
      setRouteError(t('no_route_found', 'Please select both a source location and a destination location.'));
      return;
    }

    // Validation: Reject duplicate intermediate stops
    const seen = new Set();
    for (const wp of waypoints) {
      const k = String(wp).trim().toLowerCase();
      if (seen.has(k)) {
        setRouteError('Duplicate intermediate stops detected. Please select distinct waypoints.');
        return;
      }
      seen.add(k);
    }

    // Validation: Reject intermediate stop equal to source or destination
    const srcK = String(src).trim().toLowerCase();
    const tgtK = String(tgt).trim().toLowerCase();
    if (waypoints.some((w) => String(w).trim().toLowerCase() === srcK)) {
      setRouteError('An intermediate stop cannot be identical to the source location.');
      return;
    }
    if (waypoints.some((w) => String(w).trim().toLowerCase() === tgtK)) {
      setRouteError('An intermediate stop cannot be identical to the destination location.');
      return;
    }

    const currentReqId = ++routeRequestIdRef.current;
    setRouteLoading(true);
    setRouteError(null);
    setShortestPathResult(null);

    try {
      const result = await api.getShortestPath(src, tgt, false, avoidBlocked, waypoints);

      // Prevent stale async response from overwriting newer request or cleared state
      if (currentReqId !== routeRequestIdRef.current) {
        return;
      }

      if (!result || result.reachable === false) {
        setRouteError(
          result?.error ||
            t('no_route_found', 'No route found between the selected locations. Please select another destination or check road network connectivity.')
        );
        return;
      }

      setShortestPathResult(result);
      setNotice({
        type: 'success',
        text: `Optimal road route calculated: ${result.total_distance_km} km (${result.distance_meters?.toLocaleString()} m), ~${result.total_duration_minutes || 1} min.`,
      });
    } catch (err) {
      if (currentReqId !== routeRequestIdRef.current) {
        return;
      }
      console.error('Route calculation failure:', err);
      setRouteError(
        err.message ||
          t('no_route_found', 'Failed to compute shortest path. Please check road network graph connectivity and retry.')
      );
    } finally {
      if (currentReqId === routeRequestIdRef.current) {
        setRouteLoading(false);
      }
    }
  };

  /* Helper to route directly to an assigned bin */
  const handleRouteToBin = (bin) => {
    if (!bin) return;
    const targetVal = bin.code || bin.id;
    setTargetId(targetVal);
    setIntermediateStops([]);
    setActiveTab('route');
    handleFindShortestPath(sourceId, targetVal, []);
  };

  /* Helper to start task */
  const handleStartTask = async (task) => {
    try {
      const updated = await api.startTask(task.id);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: 'started' } : t)));
      setSelectedTaskId(task.id);
      setActiveTab('record');
      setNotice({ type: 'success', text: `Task for ${task.bin?.code || 'Bin'} marked IN PROGRESS.` });
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Failed to start task.' });
    }
  };

  /* ========================================================================== */
  /* MODULE 3: E-Waste Handover Handler (Simplified, No Issue/Scan)             */
  /* ========================================================================== */
  const handleMarkEWasteCollected = async (requestId) => {
    try {
      await api.recordEWasteCollection(requestId, {
        measuredWeightKg: 15,
        actualWeightKg: 15,
        weightKg: 15,
        notes: 'Collected from doorstep in compactor utility vehicle',
      });
      setEWasteRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: 'collected' } : r))
      );
      setNotice({ type: 'success', text: 'E-Waste pickup marked COLLECTED! Ready for downstream facility transfer.' });
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Failed to update pickup status.' });
    }
  };

  const handleRecyclerHandover = async (e) => {
    e.preventDefault();
    if (!handoverForm.facilityId) {
      setNotice({ type: 'error', text: 'Please select a destination recycling facility.' });
      return;
    }

    setHandoverSubmitting(true);
    try {
      await api.recordEWasteHandover({
        ...handoverForm,
        measuredWeightKg: handoverForm.weightKg,
        weightKg: handoverForm.weightKg,
        receiptNumber: handoverForm.manifestNumber,
        manifestNumber: handoverForm.manifestNumber,
        ewasteRequestId: handoverForm.ewasteRequestId || undefined,
      });
      setNotice({
        type: 'success',
        text: `✓ Handover successfully archived! Transfer manifest #${handoverForm.manifestNumber} issued to verified recycler.`,
      });
      // Generate new manifest for next handover
      setHandoverForm((prev) => ({
        ...prev,
        ewasteRequestId: '',
        manifestNumber: `MNF-NSK-${Date.now().toString().slice(-6)}`,
        certificateNumber: `CERT-MPCB-${Date.now().toString().slice(-6)}`,
      }));
      loadWorkerData();
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Failed to archive e-waste handover.' });
    } finally {
      setHandoverSubmitting(false);
    }
  };

  /* ========================================================================== */
  /* MODULE 4: Vehicle Unload Handler                                           */
  /* ========================================================================== */
  const handleUnloadVehicle = async () => {
    if (!vehicleStatus?.vehicle?.id) return;
    setUnloadLoading(true);
    try {
      const res = await api.unloadVehicle(vehicleStatus.vehicle.id);
      setNotice({
        type: 'success',
        text: res.message || 'Vehicle payload unloaded at Pathardi Shivar facility. Payload reset to 0 kg!',
      });
      loadWorkerData();
    } catch (err) {
      setNotice({ type: 'error', text: `Unload failed: ${err.message}` });
    } finally {
      setUnloadLoading(false);
    }
  };

  /* ========================================================================== */
  /* MODULE 5: Field Issue / Hazard Reporting Handler (Separate Modal)          */
  /* ========================================================================== */
  const handleReportIssue = async (e) => {
    e.preventDefault();
    setIssueSubmitting(true);
    try {
      const res = await api.reportIssue({
        issueType: issueForm.issueType,
        taskId: issueForm.taskId || undefined,
        binId: issueForm.binId || undefined,
        description: issueForm.description.trim() || undefined,
        location: issueForm.location.trim() || undefined,
        roadName: issueForm.roadName.trim() || undefined,
        latitude: 19.9975,
        longitude: 73.7898,
      });

      setNotice({
        type: 'success',
        text: `Field report #${res.id?.slice(0, 8) || 'REF'} submitted! Road restrictions updated in routing network.`,
      });

      setShowIssueModal(false);
      setIssueForm({
        issueType: 'blocked_road',
        taskId: '',
        binId: '',
        description: '',
        location: 'Nashik Municipal Area',
        roadName: '',
      });

      // Reload roadblocks
      api.getActiveRoadblocks().then((rb) => setRoadblocks(rb || [])).catch(() => {});
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Failed to submit issue report.' });
    } finally {
      setIssueSubmitting(false);
    }
  };

  // Visual helper for priority styling
  const getPriorityBadge = (p) => {
    const priority = (p || 'normal').toLowerCase();
    if (priority === 'critical') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
          CRITICAL
        </span>
      );
    }
    if (priority === 'high') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          HIGH
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
        NORMAL
      </span>
    );
  };

  // Visual helper for status styling
  const getStatusBadge = (status) => {
    const st = (status || 'pending').toLowerCase();
    if (st === 'collected') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
          <Check className="w-3 h-3 text-emerald-600" />
          COLLECTED
        </span>
      );
    }
    if (st === 'started') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
          IN PROGRESS
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
        PENDING
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* ====================================================================== */}
      {/* TOP HEADER: Worker Identity & Organization Info                         */}
      {/* ====================================================================== */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          {/* Worker identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center font-bold text-slate-950 shadow-md">
              <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  {user?.name || 'Sunil Jadhav'}
                </span>
                <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[11px] px-2 py-0.5 rounded-md font-mono font-bold border border-amber-300 dark:border-amber-700">
                  {user?.workerId || user?.workerProfile?.workerId || 'WRK-NSK-101'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {user?.organizationName || 'Nashik Municipal Corporation'} • Ward:{' '}
                <strong className="text-slate-700 dark:text-slate-300">
                  {user?.assignedWard || user?.workerProfile?.assignedWard || 'Panchavati'}
                </strong>{' '}
                • Unit: {user?.vehicleType || user?.workerProfile?.vehicleType || 'Compactor Truck'}
              </p>
            </div>
          </div>

          {/* Controls: Language, Theme, Report Hazard, Logout */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              onClick={() => setShowIssueModal(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold transition-colors cursor-pointer"
              title="Report road block, hazard, or field issue"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Report Hazard</span>
            </button>

            <LanguageSelector />
            <ThemeToggle />

            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('sign_out', 'Sign Out')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Global Notification Banner */}
      {notice && (
        <div
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 ${
            notice.type === 'success'
              ? 'bg-emerald-600 text-white'
              : notice.type === 'warning'
              ? 'bg-amber-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          <div className="max-w-6xl mx-auto flex items-center gap-2 w-full">
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span className="flex-1">{notice.text}</span>
            <button
              onClick={() => setNotice(null)}
              className="text-xs uppercase font-bold tracking-wider underline hover:opacity-80 cursor-pointer ml-3 shrink-0"
            >
              {t('dismiss', 'Dismiss')}
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* NAVIGATION TABS: Clean, Clear, 5 Primary Modules                        */}
      {/* ====================================================================== */}
      <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-[69px] z-20 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex overflow-x-auto gap-1 sm:gap-2 py-2 no-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            Dashboard Overview
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'tasks'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            Assigned Tasks
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'tasks' ? 'bg-slate-950 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
              }`}
            >
              {tasks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('record')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'record'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Record Collection
          </button>

          <button
            onClick={() => setActiveTab('route')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'route'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Navigation className="w-4 h-4" />
            Suggested Route (DSA)
          </button>

          <button
            onClick={() => setActiveTab('ewaste')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'ewaste'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Tv className="w-4 h-4" />
            E-Waste Handover
          </button>
        </div>
      </nav>

      {/* ====================================================================== */}
      {/* MAIN CONTENT AREA                                                      */}
      {/* ====================================================================== */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-6">
        {/* Loading Spinner */}
        {loading && (
          <div className="flex items-center justify-center py-16 gap-3 text-sm text-slate-500">
            <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
            <span>Loading worker dispatch queue & road network...</span>
          </div>
        )}

        {!loading && (
          <>
            {/* ================================================================ */}
            {/* 1. MODULE: DASHBOARD OVERVIEW                                    */}
            {/* ================================================================ */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* 4 Summary Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Assigned Stops</span>
                      <Clock className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-2">
                      {stats.total}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Today's collection targets</p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Completed</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-2">
                      {stats.collected}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Verified empties recorded</p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pending</span>
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-2">
                      {stats.pending}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Awaiting field servicing</p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Vehicle Load</span>
                      <Scale className="w-4 h-4 text-sky-500" />
                    </div>
                    <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-2">
                      {vehicleStatus?.vehicle?.loadPercentage || 0}%
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {vehicleStatus?.vehicle?.currentLoadKg || 0} kg / {vehicleStatus?.vehicle?.capacityKg || 3500} kg
                    </p>
                  </div>
                </div>

                {/* Truck Payload & Dumping Facility Card */}
                {vehicleStatus && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            Compactor Truck Unit: {vehicleStatus.vehicle.registrationNo}
                          </span>
                          {vehicleStatus.vehicle.isFull ? (
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-500 text-white animate-pulse">
                              TRUCK FULL (90%+ CAPACITY)
                            </span>
                          ) : (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              OPERATIONAL
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Disposal Destination: <strong>{vehicleStatus.dumpingFacility?.name}</strong> (
                          {vehicleStatus.dumpingFacility?.address || 'Pathardi Shivar'})
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSourceId('N-CBS');
                            setTargetId('N-PAT');
                            setActiveTab('route');
                            handleFindShortestPath('N-CBS', 'N-PAT');
                          }}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          Route to Dumping Plant
                        </button>

                        {vehicleStatus.vehicle.currentLoadKg > 0 && (
                          <button
                            type="button"
                            onClick={handleUnloadVehicle}
                            disabled={unloadLoading}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {unloadLoading ? 'Unloading...' : 'Confirm Unload'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          vehicleStatus.vehicle.loadPercentage >= 90
                            ? 'bg-rose-500'
                            : vehicleStatus.vehicle.loadPercentage >= 70
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, vehicleStatus.vehicle.loadPercentage)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Roadblocks Warning Banner if any active */}
                {roadblocks.length > 0 && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-2xl flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-sm font-bold text-rose-900 dark:text-rose-200">
                        {roadblocks.length} Active Road Closure(s) in Nashik Road Network
                      </strong>
                      <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                        The routing system automatically recalculates optimal paths around closed segments to ensure uninterrupted waste transport.
                      </p>
                    </div>
                  </div>
                )}

                {/* Quick Action Shortcuts */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                    Quick Operational Actions
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <button
                      onClick={() => setActiveTab('tasks')}
                      className="p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl text-left transition-all cursor-pointer shadow-xs group"
                    >
                      <Clock className="w-5 h-5 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
                      <div className="font-bold text-sm text-slate-900 dark:text-white">View Tasks Queue</div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {stats.pending} pending collection stops
                      </p>
                    </button>

                    <button
                      onClick={() => setActiveTab('route')}
                      className="p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl text-left transition-all cursor-pointer shadow-xs group"
                    >
                      <Navigation className="w-5 h-5 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
                      <div className="font-bold text-sm text-slate-900 dark:text-white">Find Shortest Path</div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Drivable road network planner
                      </p>
                    </button>

                    <button
                      onClick={() => setActiveTab('record')}
                      className="p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl text-left transition-all cursor-pointer shadow-xs group"
                    >
                      <CheckCircle2 className="w-5 h-5 text-sky-500 mb-2 group-hover:scale-110 transition-transform" />
                      <div className="font-bold text-sm text-slate-900 dark:text-white">Record Collection</div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Log weight and reset bin level
                      </p>
                    </button>

                    <button
                      onClick={() => setActiveTab('ewaste')}
                      className="p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl text-left transition-all cursor-pointer shadow-xs group"
                    >
                      <Tv className="w-5 h-5 text-purple-500 mb-2 group-hover:scale-110 transition-transform" />
                      <div className="font-bold text-sm text-slate-900 dark:text-white">E-Waste Handover</div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Transfer to verified recyclers
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ================================================================ */}
            {/* 2. MODULE: ASSIGNED COLLECTION TASKS                             */}
            {/* ================================================================ */}
            {activeTab === 'tasks' && (
              <div className="space-y-4">
                {/* Header & Filter Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Today's Assigned Collection Tasks
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Bins and waste receptacles scheduled for collection in your sector.
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl">
                    <button
                      onClick={() => setTaskFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        taskFilter === 'all'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      All ({tasks.length})
                    </button>
                    <button
                      onClick={() => setTaskFilter('pending')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        taskFilter === 'pending'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Pending ({stats.pending})
                    </button>
                    <button
                      onClick={() => setTaskFilter('collected')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        taskFilter === 'collected'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Collected ({stats.collected})
                    </button>
                  </div>
                </div>

                {/* Empty State */}
                {filteredTasks.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center text-slate-500 shadow-xs space-y-2">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                    <p className="font-bold text-base text-slate-900 dark:text-white">
                      No tasks found for filter "{taskFilter}"
                    </p>
                    <p className="text-xs text-slate-400">
                      All collections in this view are completed or no tasks have been dispatched.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTasks.map((t) => {
                      const isSelected = selectedTaskId === t.id;
                      const bin = t.bin;
                      const isCollected = t.status === 'collected';
                      const fill = bin?.currentFillPercentage ?? 75;

                      return (
                        <div
                          key={t.id}
                          className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                            isSelected
                              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-500 ring-2 ring-amber-500/30 shadow-sm'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400">
                                  {bin?.code || 'BIN-UNKNOWN'}
                                </span>
                                {getPriorityBadge(t.taskPriority || t.priority)}
                                {getStatusBadge(t.status)}
                              </div>

                              <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                                {bin?.name || 'Municipal Receptacle'}
                              </h4>

                              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                {bin?.ward?.name || 'Nashik Ward'} • Category:{' '}
                                <strong className="text-slate-700 dark:text-slate-300 capitalize">
                                  {bin?.areaCategory || 'Urban Residential'}
                                </strong>
                              </p>
                            </div>

                            {/* Fill percentage badge */}
                            <div className="text-left sm:text-right shrink-0">
                              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                                Current Fill
                              </span>
                              <span
                                className={`text-lg font-black font-mono ${
                                  isCollected
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : fill >= 85
                                    ? 'text-rose-600'
                                    : fill >= 70
                                    ? 'text-amber-600'
                                    : 'text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {isCollected ? '0% (Cleared)' : `~${fill}%`}
                              </span>
                            </div>
                          </div>

                          {/* Footer row with details & actions */}
                          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-500">
                            <div>
                              Stream: <strong className="text-slate-800 dark:text-white capitalize">{bin?.wasteType || 'SOLID'}</strong> • Capacity: <strong className="text-slate-800 dark:text-white">{bin?.capacityLiters || 1100} L</strong>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Shortest path to this bin button */}
                              <button
                                type="button"
                                onClick={() => handleRouteToBin(bin)}
                                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                                title="Compute shortest path from depot to this bin"
                              >
                                <Navigation className="w-3.5 h-3.5 text-amber-500" />
                                Route to Bin
                              </button>

                              {/* Task status actions */}
                              {isCollected ? (
                                <span className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                  Collected
                                </span>
                              ) : t.status === 'started' ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTaskId(t.id);
                                    setActiveTab('record');
                                  }}
                                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                                >
                                  Record Collection
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleStartTask(t)}
                                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                                >
                                  Start Task
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ================================================================ */}
            {/* 3. MODULE: RECORD COLLECTION (End-to-End Workflow)               */}
            {/* ================================================================ */}
            {activeTab === 'record' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    Record Collection Event
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Select an assigned collection task, enter verified waste weight, confirm physical presence via GPS consent, and update receptacle status.
                  </p>
                </div>

                {/* Step 1: Task Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Step 1: Select Collection Task *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const nextState = !isScannerOpen;
                        setIsScannerOpen(nextState);
                        if (nextState) {
                          startCamera();
                        } else {
                          stopCamera();
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300/40 dark:border-amber-700/50 transition-colors"
                    >
                      <QrCode className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      {isScannerOpen ? 'Close Asset Scanner' : 'Scan Asset QR / Barcode'}
                    </button>
                  </div>

                  {/* Camera Video Scanner Modal / Inline Box */}
                  {isScannerOpen && (
                    <div className="p-4 sm:p-5 bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Camera className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                            Receptacle Tag Scanner (QR & Barcode)
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            stopCamera();
                            setIsScannerOpen(false);
                          }}
                          className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
                          title="Close Scanner"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="relative aspect-video max-h-56 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-700">
                        <video
                          ref={videoRef}
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-amber-400/50 m-6 rounded-lg flex items-center justify-center">
                          <div className="w-full h-0.5 bg-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse" />
                        </div>
                        {scannerMessage && (
                          <div className="absolute bottom-2 left-2 right-2 px-2.5 py-1 bg-black/75 backdrop-blur-xs text-[11px] text-amber-300 rounded font-mono text-center">
                            {scannerMessage}
                          </div>
                        )}
                      </div>

                      {/* Manual Fallback Input Form */}
                      <form onSubmit={handleManualAssetLookup} className="flex gap-2">
                        <input
                          type="text"
                          value={manualAssetCode}
                          onChange={(e) => setManualAssetCode(e.target.value)}
                          placeholder="Manual code lookup (e.g. BIN-NSK-001)..."
                          className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                        >
                          Match Tag
                        </button>
                      </form>
                    </div>
                  )}

                  <select
                    value={selectedTaskId}
                    onChange={(e) => setSelectedTaskId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">-- Choose Assigned Collection Task --</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.bin?.code || 'BIN'} — {t.bin?.name || 'Receptacle'} ({t.status.toUpperCase()}) [Priority: {t.taskPriority || t.priority || 'Normal'}]
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Task Details Card */}
                {selectedTask ? (
                  <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                            {selectedTask.bin?.code}
                          </span>
                          {getPriorityBadge(selectedTask.taskPriority || selectedTask.priority)}
                          {getStatusBadge(selectedTask.status)}
                        </div>
                        <h4 className="font-bold text-base text-slate-900 dark:text-white mt-1">
                          {selectedTask.bin?.name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {selectedTask.bin?.ward?.name} • Area: {selectedTask.bin?.areaCategory}
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                          Current Fill Level
                        </span>
                        <span className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">
                          {selectedTask.status === 'collected' ? '0% (Cleared)' : `~${selectedTask.bin?.currentFillPercentage ?? 75}%`}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600 dark:text-slate-400 pt-1">
                      <div>
                        Capacity: <strong className="text-slate-900 dark:text-white">{selectedTask.bin?.capacityLiters || 1100} L</strong>
                      </div>
                      <div>
                        Waste: <strong className="text-slate-900 dark:text-white capitalize">{selectedTask.bin?.wasteType || 'SOLID'}</strong>
                      </div>
                      <div>
                        Lat: <strong className="text-slate-900 dark:text-white font-mono">{selectedTask.bin?.latitude?.toFixed(4)}</strong>
                      </div>
                      <div>
                        Lng: <strong className="text-slate-900 dark:text-white font-mono">{selectedTask.bin?.longitude?.toFixed(4)}</strong>
                      </div>
                    </div>

                    {selectedTask.status === 'collected' && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>This bin collection is already recorded and completed. Duplicate submission is prevented.</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-2xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Please select an assigned task above or click "Record Collection" from the Assigned Tasks queue.</span>
                  </div>
                )}

                {/* Step 2: Collection Record Form */}
                <form onSubmit={handleRecordCollection} className="space-y-4">
                  {/* Empty Confirmation Checkbox */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="confirmEmpty"
                      required
                      checked={collectionForm.confirmed}
                      onChange={(e) => setCollectionForm({ ...collectionForm, confirmed: e.target.checked })}
                      className="mt-1 rounded accent-amber-500 h-4 w-4 cursor-pointer"
                    />
                    <label htmlFor="confirmEmpty" className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                      <strong className="text-slate-900 dark:text-white block">Receptacle Emptying Confirmation *</strong>
                      I confirm the physical waste bin has been fully emptied into the hydraulic compactor truck.
                    </label>
                  </div>

                  {/* Weight and Waste Stream Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Measured Net Weight (kg) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="2000"
                        step="1"
                        required
                        value={collectionForm.weightKg}
                        onChange={(e) =>
                          setCollectionForm({ ...collectionForm, weightKg: parseFloat(e.target.value) || 0 })
                        }
                        placeholder="e.g. 120"
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Waste Stream Category *
                      </label>
                      <select
                        value={collectionForm.wasteType}
                        onChange={(e) => setCollectionForm({ ...collectionForm, wasteType: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="SOLID">Solid / Mixed Waste</option>
                        <option value="ORGANIC">Organic / Wet Waste</option>
                        <option value="RECYCLABLE">Dry Recyclable Waste</option>
                        <option value="HAZARDOUS">Hazardous / Sanitary</option>
                      </select>
                    </div>
                  </div>

                  {/* Field Inspection Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Field Notes <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={collectionForm.notes}
                      onChange={(e) => setCollectionForm({ ...collectionForm, notes: e.target.value })}
                      placeholder="e.g. Bin cleared completely; washed surroundings near curb"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* GPS Verification Consent & Device Telemetry */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="gpsConsent"
                        required
                        checked={collectionForm.gpsConsent}
                        onChange={(e) => setCollectionForm({ ...collectionForm, gpsConsent: e.target.checked })}
                        className="mt-1 rounded accent-amber-500 h-4 w-4 cursor-pointer"
                      />
                      <label htmlFor="gpsConsent" className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                        <strong className="text-slate-900 dark:text-white block">GPS Verification Consent *</strong>
                        I confirm physical presence at this collection point in Nashik and authorize recording verified location telemetry with this municipal audit record.
                      </label>
                    </div>

                    {/* Live GPS Telemetry Status */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs">
                        <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                        {gpsTelemetry.state === 'acquired' ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                            {gpsTelemetry.message}
                          </span>
                        ) : gpsTelemetry.state === 'failed' ? (
                          <span className="text-amber-700 dark:text-amber-400">
                            {gpsTelemetry.message}
                          </span>
                        ) : gpsTelemetry.state === 'locating' ? (
                          <span className="text-slate-500 animate-pulse">
                            {gpsTelemetry.message}
                          </span>
                        ) : (
                          <span className="text-slate-500">
                            Device GPS ready to capture upon submission.
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleAcquireGps}
                        disabled={gpsTelemetry.state === 'locating'}
                        className="px-3 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
                      >
                        {gpsTelemetry.state === 'locating' ? 'Locating...' : 'Acquire GPS Fix'}
                      </button>
                    </div>
                  </div>

                  {/* Submit Action Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={collectionSubmitting || !selectedTask || selectedTask.status === 'collected'}
                      className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm sm:text-base rounded-2xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                    >
                      {collectionSubmitting ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>Saving Collection Record & Updating Status...</span>
                        </>
                      ) : selectedTask?.status === 'collected' ? (
                        <>
                          <Check className="w-5 h-5" />
                          <span>Task Already Collected (Completed)</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          <span>Submit Verified Collection Record</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ================================================================ */}
            {/* 4. MODULE: SUGGESTED ROUTE (DSA Shortest Path Visualization)     */}
            {/* ================================================================ */}
            {activeTab === 'route' && (
              <div className="space-y-5">
                {/* Routing Form Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Route className="w-5 h-5 text-amber-500" />
                      {t('suggested_route', 'Suggested Shortest Road Route')}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Computes the optimal drivable road path between departure and destination across Nashik's road network, automatically detouring around active roadblocks.
                    </p>
                  </div>

                  {/* Source, Waypoints & Destination Selection Form */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Source Selection */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                          {t('source_location', 'Source Location (Start Point A) *')}
                        </label>
                        <select
                          value={sourceId}
                          onChange={(e) => setSourceId(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <optgroup label="Road Network Nodes">
                            {roadNodes.map((n) => (
                              <option key={`src-node-${n.id}`} value={n.id}>
                                {n.id} — {n.name}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Municipal Depots">
                            <option value="depot-panchavati">depot-panchavati (Panchavati Solid Waste Sub-Depot)</option>
                            <option value="N-PAT">N-PAT (NWMPL Pathardi Shivar Facility)</option>
                          </optgroup>
                        </select>
                      </div>

                      {/* Destination Selection */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                          {t('destination_location', 'Destination Location (Target Point B) *')}
                        </label>
                        <select
                          value={targetId}
                          onChange={(e) => setTargetId(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <optgroup label="Assigned Collection Bins">
                            {tasks.map((t) => (
                              <option key={`dest-bin-${t.bin?.code || t.id}`} value={t.bin?.code || t.binId}>
                                {t.bin?.code} — {t.bin?.name || 'Assigned Bin'}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Road Network Nodes">
                            {roadNodes.map((n) => (
                              <option key={`dest-node-${n.id}`} value={n.id}>
                                {n.id} — {n.name}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Municipal Disposal & Processing Facilities">
                            <option value="N-PAT">N-PAT (NWMPL Pathardi Shivar Processing Plant)</option>
                            {facilities.map((f) => (
                              <option key={`dest-fac-${f.id}`} value={f.id}>
                                {f.name} ({f.facilityType})
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    </div>

                    {/* Intermediate Stops / Waypoints List */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block"></span>
                          {t('intermediate_stops', 'Intermediate Stops / Waypoints')}
                          <span className="text-[11px] font-mono text-slate-500">
                            ({intermediateStops.length})
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={handleAddIntermediateStop}
                          className="px-3 py-1.5 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{t('add_stop', 'Add Stop')}</span>
                        </button>
                      </div>

                      {intermediateStops.length === 0 ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                          {t('no_intermediate_stops', 'No intermediate stops added. Route will go directly from Source to Destination.')}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {intermediateStops.map((stop, idx) => (
                            <div
                              key={stop.key || idx}
                              className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-800"
                            >
                              <span className="w-6 h-6 rounded-full bg-sky-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>

                              <select
                                value={stop.id}
                                onChange={(e) => handleUpdateStopId(idx, e.target.value)}
                                className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                              >
                                <optgroup label="Road Network Nodes">
                                  {roadNodes.map((n) => (
                                    <option key={`stop-node-${idx}-${n.id}`} value={n.id}>
                                      {n.id} — {n.name}
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="Collection Bins">
                                  {tasks.map((t) => (
                                    <option key={`stop-bin-${idx}-${t.bin?.code || t.id}`} value={t.bin?.code || t.binId}>
                                      {t.bin?.code} — {t.bin?.name || 'Bin'}
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="Municipal Disposal & Recycling Facilities">
                                  {facilities.map((f) => (
                                    <option key={`stop-fac-${idx}-${f.id}`} value={f.id}>
                                      {f.name} ({f.facilityType === 'general_waste_facility' ? 'MSW Plant' : 'E-Waste Recycler'})
                                    </option>
                                  ))}
                                </optgroup>
                              </select>

                              {/* Reorder / Remove Controls */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleMoveStopUp(idx)}
                                  disabled={idx === 0}
                                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                  title={t('move_up', 'Move Up')}
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveStopDown(idx)}
                                  disabled={idx === intermediateStops.length - 1}
                                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                  title={t('move_down', 'Move Down')}
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveIntermediateStop(idx)}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg"
                                  title={t('remove_stop', 'Remove Stop')}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Options & Action Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={avoidBlocked}
                        onChange={(e) => setAvoidBlocked(e.target.checked)}
                        className="rounded accent-amber-500 h-4 w-4 cursor-pointer"
                      />
                      <span>Avoid Reported Road Closures & Restrictions</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleClearRoute}
                        className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{t('clear_route', 'Clear Route')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleFindShortestPath()}
                        disabled={routeLoading}
                        className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                      >
                        {routeLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Calculating optimal route...</span>
                          </>
                        ) : (
                          <>
                            <Navigation className="w-4 h-4" />
                            <span>{t('find_route', 'Find Route')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Error / Unreachable Alert */}
                {routeError && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-2xl flex items-start gap-3 text-xs sm:text-sm text-rose-800 dark:text-rose-200">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <strong className="block font-bold">Route Calculation Notice:</strong>
                      <span>{routeError}</span>
                    </div>
                    <button
                      onClick={() => handleFindShortestPath()}
                      className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold text-xs hover:bg-rose-500 transition-colors cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* Shortest Path Result Metrics Banner */}
                {shortestPathResult && shortestPathResult.reachable && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                    {/* Road Route Verification Status Banner */}
                    <div className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs ${
                      shortestPathResult.is_approximate
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${shortestPathResult.is_approximate ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
                        <span className="font-bold">
                          {shortestPathResult.is_approximate
                            ? 'Approximate Graph-Node Path (Fallback Active)'
                            : 'Verified Turn-by-Turn Road Route (OpenStreetMap / OSRM)'}
                        </span>
                      </div>
                      <span className="text-[11px] opacity-80">
                        Routing: Road Network | Geometry: {shortestPathResult.geometry_source === 'osrm' ? 'Turn-by-turn road polyline' : 'Direct node polyline'}
                      </span>
                    </div>

                    {shortestPathResult.routing_message && (
                      <div className="p-2.5 rounded-xl bg-amber-100/60 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-300 text-[11px] leading-relaxed">
                        {shortestPathResult.routing_message}
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 uppercase font-semibold block text-[10px]">{t('total_distance', 'Total Distance')}</span>
                        <span className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                          {shortestPathResult.total_distance_km} km
                        </span>
                        <span className="text-slate-400 text-[11px] block">
                          ({shortestPathResult.distance_meters?.toLocaleString()} meters)
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 uppercase font-semibold block text-[10px]">{t('travel_time', 'Travel Time')}</span>
                        <span className="text-base sm:text-lg font-black font-mono text-amber-600 dark:text-amber-400">
                          ~{shortestPathResult.total_duration_minutes || 1} min
                        </span>
                        <span className="text-slate-400 text-[11px] block">
                          Based on road speed limits
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 uppercase font-semibold block text-[10px]">Stops & Waypoints</span>
                        <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                          {shortestPathResult.stops?.length || 2} Points
                        </span>
                        <span className="text-slate-400 text-[11px] block">
                          {(shortestPathResult.stops?.filter((s) => s.type === 'waypoint') || []).length} intermediate stops
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 uppercase font-semibold block text-[10px]">Routing Mode</span>
                        <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                          Shortest Path Engine
                        </span>
                        <span className={`text-[11px] block font-semibold ${shortestPathResult.is_approximate ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {shortestPathResult.is_approximate ? 'Graph-Node Fallback' : 'OSRM Road Follower'}
                        </span>
                      </div>
                    </div>

                    {/* Legs breakdown if intermediate stops exist */}
                    {shortestPathResult.legs && shortestPathResult.legs.length > 1 && (
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                          Leg-by-Leg Route Breakdown
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {shortestPathResult.legs.map((leg, legIdx) => (
                            <div
                              key={legIdx}
                              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                            >
                              <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                                <span>Leg {legIdx + 1}</span>
                                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                                  {leg.distance_km} km
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {leg.from} → {leg.to} (~{leg.duration_minutes} min)
                              </p>
                              {leg.summary && (
                                <p className="text-[10px] text-slate-400 truncate mt-0.5 italic">
                                  Via: {leg.summary}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Map Display Card */}
                <div className="h-[440px] sm:h-[480px] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md relative bg-slate-100 dark:bg-slate-900">
                  <LeafletMap
                    routePath={shortestPathResult?.coordinate_path || []}
                    isApproximate={shortestPathResult?.is_approximate || false}
                    routingProvider={shortestPathResult?.is_approximate ? 'Graph Nodes Fallback' : 'OSRM'}
                    routeLineColor={shortestPathResult?.is_approximate ? '#d97706' : '#059669'}
                    sourceLocation={
                      shortestPathResult?.sourceLocation
                        ? {
                            id: shortestPathResult.sourceLocation.id,
                            lat: shortestPathResult.sourceLocation.latitude,
                            lng: shortestPathResult.sourceLocation.longitude,
                            name: shortestPathResult.sourceLocation.name,
                            label: 'A',
                            details: `Start: ${shortestPathResult.sourceLocation.name}`,
                          }
                        : shortestPathResult?.stops && shortestPathResult.stops.length > 0
                        ? {
                            id: shortestPathResult.stops[0].id,
                            lat: shortestPathResult.stops[0].latitude,
                            lng: shortestPathResult.stops[0].longitude,
                            name: shortestPathResult.stops[0].name,
                            label: 'A',
                            details: `Start: ${shortestPathResult.stops[0].name}`,
                          }
                        : shortestPathResult?.sourceNode
                        ? {
                            id: shortestPathResult.sourceNode.id,
                            lat: shortestPathResult.sourceNode.latitude,
                            lng: shortestPathResult.sourceNode.longitude,
                            name: shortestPathResult.sourceNode.name,
                            label: 'A',
                            details: `Start: ${shortestPathResult.sourceNode.id}`,
                          }
                        : null
                    }
                    targetLocation={
                      shortestPathResult?.targetLocation
                        ? {
                            id: shortestPathResult.targetLocation.id,
                            lat: shortestPathResult.targetLocation.latitude,
                            lng: shortestPathResult.targetLocation.longitude,
                            name: shortestPathResult.targetLocation.name,
                            label: 'B',
                            details: `Destination: ${shortestPathResult.targetLocation.name}`,
                          }
                        : shortestPathResult?.stops && shortestPathResult.stops.length > 1
                        ? {
                            id: shortestPathResult.stops[shortestPathResult.stops.length - 1].id,
                            lat: shortestPathResult.stops[shortestPathResult.stops.length - 1].latitude,
                            lng: shortestPathResult.stops[shortestPathResult.stops.length - 1].longitude,
                            name: shortestPathResult.stops[shortestPathResult.stops.length - 1].name,
                            label: 'B',
                            details: `Destination: ${shortestPathResult.stops[shortestPathResult.stops.length - 1].name}`,
                          }
                        : shortestPathResult?.targetNode
                        ? {
                            id: shortestPathResult.targetNode.id,
                            lat: shortestPathResult.targetNode.latitude,
                            lng: shortestPathResult.targetNode.longitude,
                            name: shortestPathResult.targetNode.name,
                            label: 'B',
                            details: `Target: ${shortestPathResult.targetNode.id}`,
                          }
                        : null
                    }
                    waypointLocations={
                      shortestPathResult?.stops
                        ? shortestPathResult.stops
                            .filter((s) => s.type === 'waypoint')
                            .map((s, wIdx) => ({
                              order: wIdx + 1,
                              lat: s.latitude,
                              lng: s.longitude,
                              name: s.name,
                              id: s.id,
                              details: `Stop #${wIdx + 1}: ${s.name}`,
                            }))
                        : []
                    }
                    intermediateNodes={[]}
                    showTraversedNodes={false}
                    facilities={facilities}
                    showFacilities={true}
                    onSelectSource={(item) => {
                      handleSourceChange(item.id);
                      setNotice({ type: 'success', text: `Selected "${item.name}" as Route Source (A).` });
                    }}
                    onSelectTarget={(item) => {
                      handleTargetChange(item.id);
                      setNotice({ type: 'success', text: `Selected "${item.name}" as Route Destination (B).` });
                    }}
                    center={[19.9975, 73.7898]}
                    zoom={13}
                    bins={tasks.map((t) => t.bin).filter(Boolean)}
                    showBins={true}
                    className="h-full w-full"
                  />
                </div>

                {/* Empty State Banner (Shown when no route is calculated yet) */}
                {!shortestPathResult && !routeLoading && !routeError && (
                  <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-2 shadow-xs">
                    <Compass className="w-10 h-10 text-amber-500 mx-auto" />
                    <h4 className="font-bold text-base text-slate-900 dark:text-white">
                      Select Source & Destination to Compute Route
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Choose any starting point (depot or road node), optional intermediate stops, and destination, then click <strong>"{t('find_route', 'Find Route')}"</strong> to calculate and visualize the minimum-distance path.
                    </p>
                  </div>
                )}

                {/* Turn-by-Turn Ordered Steps List */}
                {shortestPathResult && shortestPathResult.node_path && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Ordered Node Sequence ({shortestPathResult.node_path.length} Nodes)
                    </h4>
                    <div className="space-y-1.5">
                      {shortestPathResult.node_path.map((nodeId, idx) => {
                        const isStart = idx === 0;
                        const isEnd = idx === shortestPathResult.node_path.length - 1;
                        const nodeInfo = (shortestPathResult.intermediateNodes || []).find((n) => n.id === nodeId);
                        const isWaypoint = shortestPathResult.stops?.some((s) => s.type === 'waypoint' && s.id === nodeId);

                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                              isStart
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                                : isEnd
                                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                                : isWaypoint
                                ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800'
                                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-6 h-6 rounded-full font-bold flex items-center justify-center text-[10px] ${
                                  isStart
                                    ? 'bg-emerald-600 text-white'
                                    : isEnd
                                    ? 'bg-amber-500 text-slate-950'
                                    : isWaypoint
                                    ? 'bg-sky-600 text-white'
                                    : 'bg-slate-800 text-sky-400 border border-sky-400'
                                }`}
                              >
                                {isStart ? 'A' : isEnd ? 'B' : idx}
                              </span>
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white block">
                                  {nodeInfo?.name || nodeId}
                                </span>
                                <span className="font-mono text-[11px] text-slate-500">{nodeId}</span>
                              </div>
                            </div>

                            <span className="font-semibold text-[11px] text-slate-500">
                              {isStart
                                ? 'Starting Point'
                                : isEnd
                                ? '🏁 Final Destination'
                                : isWaypoint
                                ? '📍 Intermediate Stop'
                                : 'Proceed via segment'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ================================================================ */}
            {/* 5. MODULE: E-WASTE HANDOVER (Clean, Simplified, No Issue/Scan)   */}
            {/* ================================================================ */}
            {activeTab === 'ewaste' && (
              <div className="space-y-6">
                {/* Assigned Pickups Section */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Assigned Residential E-Waste Pickups
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Doorstep electronic waste requests assigned to your service sector for safe transport.
                  </p>

                  {ewasteRequests.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-4">No e-waste collection requests currently pending.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {ewasteRequests.map((req) => (
                        <div
                          key={req.id}
                          className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">
                                {req.trackingNumber || `EW-${req.id.slice(0, 8)}`}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 uppercase font-semibold">
                                {req.status}
                              </span>
                            </div>
                            <h5 className="font-bold text-sm text-slate-900 dark:text-white mt-1 capitalize">
                              {req.category?.replace(/_/g, ' ') || 'Consumer Electronics'}
                            </h5>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{req.address}</p>
                          </div>

                          {(req.status || '').toLowerCase() === 'assigned' || (req.status || '').toLowerCase() === 'submitted' ? (
                            <button
                              onClick={() => handleMarkEWasteCollected(req.id)}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer whitespace-nowrap"
                            >
                              Mark Collected
                            </button>
                          ) : (
                            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1">
                              <Check className="w-4 h-4" /> Ready for Recycler Transfer
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Handover to Verified Recycler Form */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1">
                      Handover to Verified Downstream Facility
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                      Record batch transfer of collected electronic items to verified recyclers or dismantlers in Nashik.
                    </p>
                  </div>

                  <form onSubmit={handleRecyclerHandover} className="space-y-4 text-xs sm:text-sm">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Link Collected Request (Optional)
                      </label>
                      <select
                        value={handoverForm.ewasteRequestId || ''}
                        onChange={(e) => setHandoverForm({ ...handoverForm, ewasteRequestId: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">General Batch / All Collected Pickups</option>
                        {ewasteRequests.map((req) => (
                          <option key={req.id} value={req.id}>
                            {req.trackingNumber || req.id} - {req.category?.replace(/_/g, ' ') || 'E-Waste'} ({req.address})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Select Destination Facility *
                      </label>
                      <select
                        required
                        value={handoverForm.facilityId}
                        onChange={(e) => setHandoverForm({ ...handoverForm, facilityId: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        {facilities
                          .filter((f) => f.facilityType !== 'scrap_dealer' && f.facilityType !== 'general_waste_facility')
                          .map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name} ({f.verificationStatus ? f.verificationStatus.toUpperCase() : 'VERIFIED'} • {f.facilityType?.replace(/_/g, ' ')})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Total Batch Weight (kg) *
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={handoverForm.weightKg}
                          onChange={(e) =>
                            setHandoverForm({ ...handoverForm, weightKg: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Item Count *
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={handoverForm.itemCount}
                          onChange={(e) =>
                            setHandoverForm({ ...handoverForm, itemCount: parseInt(e.target.value, 10) || 1 })
                          }
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Manifest Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={handoverForm.manifestNumber}
                          onChange={(e) => setHandoverForm({ ...handoverForm, manifestNumber: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Transfer Certificate # *
                        </label>
                        <input
                          type="text"
                          required
                          value={handoverForm.certificateNumber}
                          onChange={(e) => setHandoverForm({ ...handoverForm, certificateNumber: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={handoverSubmitting}
                        className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer"
                      >
                        {handoverSubmitting ? 'Archiving Handover...' : 'Archive Handover & Issue Manifest'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ====================================================================== */}
      {/* SEPARATE MODAL: FIELD HAZARD / ROADBLOCK REPORTING                     */}
      {/* ====================================================================== */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Report Field Hazard or Roadblock
                </h3>
              </div>
              <button
                onClick={() => setShowIssueModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReportIssue} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Issue Type *
                </label>
                <select
                  value={issueForm.issueType}
                  onChange={(e) => setIssueForm({ ...issueForm, issueType: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="blocked_road">Blocked Road / Road Construction Closure</option>
                  <option value="damaged_bin">Damaged or Broken Bin Receptacle</option>
                  <option value="inaccessible_point">Inaccessible Collection Point</option>
                  <option value="unsafe_location">Unsafe Hazard near Collection Point</option>
                  <option value="other">Other Operational Obstacle</option>
                </select>
              </div>

              {issueForm.issueType === 'blocked_road' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Street / Road Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={issueForm.roadName}
                    onChange={(e) => setIssueForm({ ...issueForm, roadName: e.target.value })}
                    placeholder="e.g. Gangapur Road near Canada Corner"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Location / Landmark
                </label>
                <input
                  type="text"
                  value={issueForm.location}
                  onChange={(e) => setIssueForm({ ...issueForm, location: e.target.value })}
                  placeholder="e.g. Panchavati Market Circle"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={issueForm.description}
                  onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                  placeholder="Describe details of obstacle so routing engine can reroute trucks..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={issueSubmitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {issueSubmitting ? 'Submitting...' : 'Submit Hazard Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
