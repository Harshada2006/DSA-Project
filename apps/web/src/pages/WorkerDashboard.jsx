import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import { LeafletMap } from '../components/map/LeafletMap.jsx';
import {
  Truck,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Tv,
  LogOut,
  MapPin,
  Clock,
  Navigation,
  RefreshCw,
  Camera,
  Layers,
  ArrowRight,
  ShieldAlert,
  Search,
  Check,
  Building2,
  FileCheck2,
} from 'lucide-react';
import { LanguageSelector } from '../components/common/LanguageSelector.jsx';
import { ThemeToggle } from '../components/common/ThemeToggle.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

export const WorkerDashboard = () => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'route' | 'record' | 'issue' | 'scan' | 'ewaste'

  // Data state
  const [tasks, setTasks] = useState([]);
  const [ewasteRequests, setEWasteRequests] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [roadblocks, setRoadblocks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  // Vehicle Load & Dumping Facility state
  const [vehicleStatus, setVehicleStatus] = useState(null);
  const [unloadLoading, setUnloadLoading] = useState(false);

  // Route state
  const [routeResult, setRouteResult] = useState(null);
  const [directRoute, setDirectRoute] = useState(null);
  const [activeRouteType, setActiveRouteType] = useState('tour'); // 'tour' | 'bin' | 'dumping'
  const [routeLoading, setRouteLoading] = useState(false);

  // Derived polyline for LeafletMap
  const routePolyline =
    directRoute?.coordinate_path ||
    routeResult?.path_coordinates ||
    (routeResult?.ordered_stops ? routeResult.ordered_stops.map((s) => [s.latitude, s.longitude]) : []);

  // Collection form state (NO manual fillPercentage entry - Section 16)
  const [collectionForm, setCollectionForm] = useState({
    weightKg: 120,
    wasteType: 'SOLID',
    notes: 'Cleared full bin into compactor truck',
    gpsConsent: true,
  });
  const [collectionSubmitting, setCollectionSubmitting] = useState(false);

  // Issue reporting form state (Section 12)
  const [issueForm, setIssueForm] = useState({
    issueType: 'blocked_road',
    taskId: '',
    binId: '',
    description: '',
    location: 'Nashik Municipal Area',
    roadName: '',
  });
  const [issueSubmitting, setIssueSubmitting] = useState(false);

  // QR / Barcode Asset Scanner state (Section 13)
  const [scanQuery, setScanQuery] = useState('');
  const [scannedBin, setScannedBin] = useState(null);
  const [scanSearching, setScanSearching] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const scanIntervalRef = useRef(null);

  // E-waste Handover state (Section 14)
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

  useEffect(() => {
    loadWorkerData();
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, []);

  const loadWorkerData = async () => {
    try {
      const [tasksData, ewasteData, facData, roadblocksData, vehData] = await Promise.all([
        api.getTasks().catch(() => []),
        api.getEWasteRequests().catch(() => []),
        api.getFacilities({ facilityType: 'RECYCLER' }).catch(() => []),
        api.getActiveRoadblocks().catch(() => []),
        api.getVehicleStatus().catch(() => null),
      ]);
      setTasks(tasksData || []);
      setEWasteRequests(ewasteData || []);
      setFacilities(facData || []);
      setRoadblocks(roadblocksData || []);
      if (vehData) setVehicleStatus(vehData);
      if (facData && facData.length > 0 && !handoverForm.facilityId) {
        setHandoverForm((prev) => ({ ...prev, facilityId: facData[0].id }));
      }
    } catch (err) {
      console.error('Failed to load worker data:', err);
    }
  };

  /* ========================================================================== */
  /* HANDLER 1: Compute or Recalculate Route with dynamic roadblock avoidance   */
  /* ========================================================================== */
  const computeWorkerRoute = async (avoidBlocked = true) => {
    const assignedBinIds = tasks
      .filter((t) => t.status === 'PENDING' || t.status === 'STARTED' || t.status === 'IN_PROGRESS' || t.status === 'assigned' || t.status === 'started')
      .map((t) => t.binId)
      .filter(Boolean);

    if (assignedBinIds.length === 0) {
      setNotice({ type: 'error', text: 'No active assigned collection tasks found to route.' });
      return;
    }

    setRouteLoading(true);
    setDirectRoute(null);
    setActiveRouteType('tour');
    try {
      const result = await api.optimizeRoute({
        binIds: assignedBinIds,
        avoidRoadblocks: avoidBlocked,
        objective: 'distance',
      });
      setRouteResult(result);
      if (result.isRerouted) {
        setNotice({
          type: 'success',
          text: result.routingMessage || 'Alternative route calculated avoiding reported road closure(s).',
        });
      }
    } catch (err) {
      setNotice({ type: 'error', text: `Route calculation: ${err.message}` });
    } finally {
      setRouteLoading(false);
    }
  };

  /* Direct Shortest-Path Route to a Selected Bin */
  const handleRouteToBin = async (binId, avoidBlocked = true) => {
    if (!binId) return;
    setRouteLoading(true);
    setActiveTab('route');
    setActiveRouteType('bin');
    setRouteResult(null);
    try {
      const res = await api.getRouteToBin(binId, { avoidBlocked });
      setDirectRoute(res.data);
      setNotice({
        type: 'success',
        text: `Shortest road route calculated to ${res.data.bin?.code || 'Bin'} (${(res.data.distance_meters / 1000).toFixed(1)} km, ~${Math.round(res.data.travel_time_seconds / 60)} mins).`,
      });
    } catch (err) {
      setNotice({ type: 'error', text: `Route to bin failed: ${err.message}` });
    } finally {
      setRouteLoading(false);
    }
  };

  /* Direct Shortest-Path Route to Municipal Dumping Facility (Pathardi Shivar) */
  const handleRouteToDumpingFacility = async (avoidBlocked = true) => {
    setRouteLoading(true);
    setActiveTab('route');
    setActiveRouteType('dumping');
    setRouteResult(null);
    try {
      const res = await api.getRouteToDumping({ avoidBlocked });
      setDirectRoute(res.data);
      setNotice({
        type: 'success',
        text: `Direct route to NWMPL Dumping Facility calculated (${(res.data.distance_meters / 1000).toFixed(1)} km, ~${Math.round(res.data.travel_time_seconds / 60)} mins). Roadblocks avoided.`,
      });
    } catch (err) {
      setNotice({ type: 'error', text: `Dumping route failed: ${err.message}` });
    } finally {
      setRouteLoading(false);
    }
  };

  /* Confirm Unloading at Facility & Reset Capacity */
  const handleUnloadVehicle = async () => {
    setUnloadLoading(true);
    try {
      const res = await api.unloadVehicle(vehicleStatus?.vehicle?.id);
      setNotice({
        type: 'success',
        text: res.message || 'Compactor truck successfully unloaded at Pathardi Shivar facility. Payload reset to 0 kg!',
      });
      setDirectRoute(null);
      loadWorkerData();
    } catch (err) {
      setNotice({ type: 'error', text: `Unload failed: ${err.message}` });
    } finally {
      setUnloadLoading(false);
    }
  };

  /* Demonstration Helper: Simulate Truck Reaching Max Capacity */
  const handleSimulateTruckFull = () => {
    if (!vehicleStatus) return;
    setVehicleStatus({
      ...vehicleStatus,
      vehicle: {
        ...vehicleStatus.vehicle,
        currentLoadKg: 3200,
        loadPercentage: 91,
        isFull: true,
        status: 'full',
      },
    });
    setNotice({
      type: 'error',
      text: '⚠️ Compactor Truck at 91% capacity (3,200 / 3,500 kg). Must proceed to NWMPL Integrated Solid Waste Processing Facility for unloading.',
    });
    handleRouteToDumpingFacility(true);
  };

  /* ========================================================================== */
  /* HANDLER 2: Start Collection Task & Set In-Progress                         */
  /* ========================================================================== */
  const handleStartTask = async (task) => {
    try {
      const updated = await api.startTask(task.id);
      setSelectedTask(updated);
      setActiveTab('record');
      setNotice({ type: 'success', text: `Task #${task.id.slice(0, 8)} marked IN_PROGRESS.` });
      loadWorkerData();
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Failed to start task.' });
    }
  };

  /* ========================================================================== */
  /* HANDLER 3: Record Bin Collection & Waste Weight into Truck                 */
  /* ========================================================================== */
  const handleRecordCollection = async (e) => {
    e.preventDefault();
    if (!selectedTask) {
      setNotice({ type: 'error', text: 'Please select an assigned task to record collection.' });
      return;
    }
    if (!collectionForm.gpsConsent) {
      setNotice({ type: 'error', text: 'GPS consent is required for verified collection logging.' });
      return;
    }

    setCollectionSubmitting(true);
    try {
      await api.recordCollection(selectedTask.id, {
        weightKg: parseFloat(collectionForm.weightKg) || 50,
        wasteType: collectionForm.wasteType,
        notes: collectionForm.notes,
        latitude: selectedTask.bin?.latitude || 19.9975,
        longitude: selectedTask.bin?.longitude || 73.7898,
        gpsConsent: true,
      });

      setNotice({
        type: 'success',
        text: `Collection successfully recorded for ${selectedTask.bin?.code || 'Bin'}! Task completed.`,
      });
      setSelectedTask(null);
      setActiveTab('tasks');
      loadWorkerData();
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Failed to record collection.' });
    } finally {
      setCollectionSubmitting(false);
    }
  };

  /* ========================================================================== */
  /* HANDLER 4: Field Incident & Road Obstacle Reporting                         */
  /* ========================================================================== */
  const handleReportIssue = async (e) => {
    e.preventDefault();
    setIssueSubmitting(true);
    try {
      const res = await api.reportIssue({
        issueType: issueForm.issueType,
        taskId: issueForm.taskId || (selectedTask ? selectedTask.id : undefined),
        binId: issueForm.binId || (selectedTask?.bin ? selectedTask.bin.id : undefined),
        description: issueForm.description.trim() || undefined,
        location: issueForm.location.trim() || undefined,
        roadName: issueForm.roadName.trim() || undefined,
        latitude: 19.9975,
        longitude: 73.7898,
      });

      setNotice({
        type: 'success',
        text: `Issue #${res.id?.slice(0, 8) || 'REF'} reported successfully! NMC dispatchers notified.`,
      });

      setIssueForm({
        issueType: 'blocked_road',
        taskId: '',
        binId: '',
        description: '',
        location: 'Nashik Municipal Area',
        roadName: '',
      });

      setActiveTab('tasks');
      loadWorkerData();
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Failed to report issue.' });
    } finally {
      setIssueSubmitting(false);
    }
  };

  /* ========================================================================== */
  /* HANDLER 5: Physical QR / Barcode Asset Identification                       */
  /* ========================================================================== */
  const startCameraScanner = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access API is not supported by your browser. Please use manual code search.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);

      // Automated frame decoding if BarcodeDetector is available
      if ('BarcodeDetector' in window) {
        try {
          const detector = new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'ean_13'] });
          scanIntervalRef.current = setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  const detectedCode = barcodes[0].rawValue;
                  stopCameraScanner();
                  setScanQuery(detectedCode);
                  handleManualScanLookup(null, detectedCode);
                }
              } catch {
                // Ignore transient frame decode failure
              }
            }
          }, 400);
        } catch {
          // Fallback to manual entry if detector initialization fails
        }
      }
    } catch (err) {
      console.warn('Camera access unavailable:', err);
      setCameraError(err.message || 'Camera permission denied or camera device unavailable. Please use the manual identifier fallback below.');
      setCameraActive(false);
    }
  };

  const stopCameraScanner = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const handleManualScanLookup = async (e, directCode) => {
    if (e) e.preventDefault();
    const query = directCode || scanQuery;
    if (!query || !query.trim()) return;

    setScanSearching(true);
    setScannedBin(null);
    try {
      const foundBins = await api.getBins({ search: query.trim() });
      if (foundBins && foundBins.length > 0) {
        setScannedBin(foundBins[0]);
        setNotice({ type: 'success', text: `Asset ${foundBins[0].code} identified in Nashik database!` });
      } else {
        setNotice({ type: 'error', text: `No registered asset found matching identifier "${query}".` });
      }
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Asset lookup failed.' });
    } finally {
      setScanSearching(false);
    }
  };

  /* ========================================================================== */
  /* HANDLER 6: Residential E-Waste Pickup & Recycler Facility Handover          */
  /* ========================================================================== */
  const handleMarkEWasteCollected = async (requestId) => {
    try {
      await api.recordEWasteCollection(requestId, {
        actualWeightKg: 15,
        notes: 'Collected from doorstep in compactor utility van',
      });
      setNotice({ type: 'success', text: 'E-Waste pickup marked COLLECTED! Ready for facility handover.' });
      loadWorkerData();
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Failed to update pickup status.' });
    }
  };

  const handleRecyclerHandover = async (e) => {
    e.preventDefault();
    if (!handoverForm.facilityId) {
      setNotice({ type: 'error', text: 'Please select a destination facility.' });
      return;
    }

    setHandoverSubmitting(true);
    try {
      await api.recordEWasteHandover(handoverForm);
      setNotice({
        type: 'success',
        text: `Handover recorded! Manifest #${handoverForm.manifestNumber} archived with verified facility.`,
      });
      setHandoverForm({
        facilityId: facilities[0]?.id || '',
        wasteCategory: 'ELECTRONIC',
        weightKg: 50,
        itemCount: 10,
        manifestNumber: `MNF-NSK-${Date.now().toString().slice(-6)}`,
        certificateNumber: `CERT-MPCB-${Date.now().toString().slice(-6)}`,
        notes: 'Handover completed',
      });
      loadWorkerData();
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Failed to log recycler handover.' });
    } finally {
      setHandoverSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 flex items-center justify-center font-bold text-slate-950 text-xl shadow-lg shadow-amber-900/30">
              <Truck className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-slate-900 dark:text-white">{user?.name || 'Municipal Worker'}</span>
                <span className="bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border border-amber-500/30">
                  {user?.workerProfile?.workerId || 'WRK-NSK-101'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                NMC Solid Waste Div • Vehicle: {user?.workerProfile?.vehicleNumber || 'MH-15-EG-4401'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSelector />
            <ThemeToggle />
            <button
              onClick={logout}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('sign_out', 'Sign Out')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Visual Shift Banner */}
      <div className="relative border-b border-amber-800/30 dark:border-slate-800 bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 dark:from-amber-950 dark:via-slate-900 dark:to-slate-950 text-white overflow-hidden">
        <div className="max-w-4xl mx-auto p-4 sm:p-5 relative z-10 flex items-center justify-between">
          <div>
            <span className="bg-amber-400/30 text-amber-100 dark:text-amber-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-1 border border-amber-300/30">
              {t('worker_shift', 'Active Shift')}
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-white">{t('worker_tour', 'Daily Waste Collection Tour')}</h2>
            <p className="text-xs sm:text-sm text-amber-100/80 dark:text-slate-400 mt-0.5">
              Nashik Municipal Corporation • Hydraulic Compactor Unit
            </p>
          </div>
          <button
            onClick={loadWorkerData}
            className="px-3 py-1.5 bg-black/20 hover:bg-black/30 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-200 dark:text-amber-400 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-amber-400/30 dark:border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t('refresh_queue', 'Refresh Queue')}
          </button>
        </div>
      </div>

      {/* Notice Alert */}
      {notice && (
        <div className={`p-3.5 text-sm font-semibold text-center flex items-center justify-center gap-2 ${
          notice.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        }`}>
          {notice.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="ml-3 underline text-white font-bold cursor-pointer text-xs">{t('dismiss', 'Dismiss')}</button>
        </div>
      )}

      {/* Touch-Friendly Tab Navigation */}
      <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 p-2.5 sticky top-16 z-20 transition-colors">
        <div className="max-w-4xl mx-auto flex overflow-x-auto gap-2 no-scrollbar">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'tasks' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/50'
            }`}
          >
            <Clock className="w-4 h-4" />
            {t('tab_assigned_tasks', 'Assigned Queue')} ({tasks.length})
          </button>

          <button
            onClick={() => {
              setActiveTab('route');
              if (!routeResult) computeWorkerRoute(true);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'route' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/50'
            }`}
          >
            <Navigation className="w-4 h-4" />
            {t('tab_suggested_route', 'Suggested Route')}
          </button>

          <button
            onClick={() => setActiveTab('record')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'record' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/50'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {t('tab_record_collection', 'Record Collection')}
          </button>

          <button
            onClick={() => setActiveTab('issue')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'issue' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/50'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            {t('tab_report_issue', 'Report Issue')}
          </button>

          <button
            onClick={() => setActiveTab('scan')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'scan' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/50'
            }`}
          >
            <QrCode className="w-4 h-4" />
            {t('tab_scan_asset', 'Scan Asset')}
          </button>

          <button
            onClick={() => setActiveTab('ewaste')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'ewaste' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/50'
            }`}
          >
            <Tv className="w-4 h-4" />
            {t('tab_ewaste_handover', 'E-Waste Handover')}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto p-4 sm:p-6 flex-1 w-full pb-20 space-y-6">
        {/* ========================================================================== */}
        {/* COMPACTOR TRUCK CAPACITY & DUMPING DESTINATION WORKFLOW                   */}
        {/* ========================================================================== */}
        {vehicleStatus && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl ${
                  vehicleStatus.vehicle.isFull
                    ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                    : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                }`}>
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {vehicleStatus.vehicle.registrationNo}
                    </span>
                    <span className="text-xs uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                      Compactor Truck
                    </span>
                    {vehicleStatus.vehicle.isFull ? (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-500 text-white animate-pulse">
                        TRUCK FULL (90%+ CAPACITY)
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                        COLLECTION ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Municipal Disposal Hub: <strong>{vehicleStatus.dumpingFacility.name}</strong> ({vehicleStatus.dumpingFacility.address})
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleRouteToDumpingFacility(true)}
                  disabled={routeLoading}
                  className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Route to Dumping Facility
                </button>

                {vehicleStatus.vehicle.currentLoadKg > 0 && (
                  <button
                    type="button"
                    onClick={handleUnloadVehicle}
                    disabled={unloadLoading}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {unloadLoading ? 'Unloading...' : 'Confirm Facility Unloading'}
                  </button>
                )}

                {!vehicleStatus.vehicle.isFull && (
                  <button
                    type="button"
                    onClick={handleSimulateTruckFull}
                    className="px-2.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 transition-all cursor-pointer"
                    title="Simulate truck reaching max capacity to test dumping facility routing"
                  >
                    ⚡ Simulate Full Load
                  </button>
                )}
              </div>
            </div>

            {/* Load Progress Bar */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  Current Cumulative Payload: <strong className="text-slate-900 dark:text-white font-mono">{vehicleStatus.vehicle.currentLoadKg} kg</strong> / {vehicleStatus.vehicle.capacityKg} kg
                </span>
                <span className={`font-mono font-bold text-xs ${
                  vehicleStatus.vehicle.loadPercentage >= 90 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'
                }`}>
                  {vehicleStatus.vehicle.loadPercentage}% Loaded
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
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
          </div>
        )}

        {/* ========================================================================== */}
        {/* MODULE 1: Worker Dispatch Queue & Task Assignment                          */}
        {/* ========================================================================== */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Today's Dispatch Queue
              </h2>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-mono font-semibold">{tasks.length} Assigned Stops</span>
            </div>

            {tasks.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center text-slate-500 dark:text-slate-400 shadow-sm">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <p className="font-bold text-base text-slate-900 dark:text-white">All collection tasks cleared!</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Check back as new priority collection tasks are dispatched.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map((t) => {
                  const isSelected = selectedTask?.id === t.id;
                  const bin = t.bin;
                  const fill = bin?.currentFillPercentage || 70;

                  return (
                    <div
                      key={t.id}
                      className={`p-5 rounded-3xl border transition-all ${
                        isSelected
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/50 shadow-xl'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400">
                              {bin?.code || 'BIN-UNKNOWN'}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase ${
                              t.priority === 'CRITICAL' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-200 border border-rose-300 dark:border-rose-700' :
                              t.priority === 'HIGH' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}>
                              {t.priority}
                            </span>
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              {t.status}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">{bin?.name || 'Municipal Bin'}</h4>
                          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
                            <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                            {bin?.ward?.name || 'Nashik Ward'} • Area: <strong className="text-slate-700 dark:text-slate-300 capitalize">{bin?.areaCategory || 'URBAN'}</strong>
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs text-slate-400 block uppercase">Est. Fill</span>
                          <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">~{fill}%</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        <span>
                          Capacity: <strong className="text-slate-800 dark:text-white">{bin?.capacityLiters || 1100}L</strong> • Waste: <strong className="text-slate-800 dark:text-white capitalize">{bin?.wasteType || 'SOLID'}</strong>
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleRouteToBin(bin?.id)}
                            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1 cursor-pointer"
                            title="Calculate road shortest path to this collection bin"
                          >
                            <Navigation className="w-3.5 h-3.5 text-amber-500" />
                            Route to Bin
                          </button>
                          {t.status === 'PENDING' || t.status === 'assigned' ? (
                            <button
                              onClick={() => handleStartTask(t)}
                              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow"
                            >
                              Start Task
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedTask(t);
                                setActiveTab('record');
                              }}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow"
                            >
                              Log Collection
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

        {/* ========================================================================== */}
        {/* MODULE 2: Dijkstra / Road Network Shortest-Path & Roadblock Avoidance       */}
        {/* ========================================================================== */}
        {activeTab === 'route' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-amber-500" />
                  {activeRouteType === 'dumping' ? (
                    'Route to NWMPL Dumping Facility (Pathardi Shivar)'
                  ) : activeRouteType === 'bin' ? (
                    `Direct Route to Receptacle: ${directRoute?.bin?.code || 'Bin'}`
                  ) : (
                    'Multi-Stop Priority Collection Tour'
                  )}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Road-network Dijkstra algorithm with dynamic closure avoidance across Nashik City.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => computeWorkerRoute(true)}
                  disabled={routeLoading}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    activeRouteType === 'tour'
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  Full Tour
                </button>
                <button
                  type="button"
                  onClick={() => handleRouteToDumpingFacility(true)}
                  disabled={routeLoading}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    activeRouteType === 'dumping'
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  Dumping Facility
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activeRouteType === 'dumping') handleRouteToDumpingFacility(true);
                    else if (activeRouteType === 'bin' && directRoute?.bin?.id) handleRouteToBin(directRoute.bin.id, true);
                    else computeWorkerRoute(true);
                  }}
                  disabled={routeLoading}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${routeLoading ? 'animate-spin' : ''}`} />
                  Recalculate
                </button>
              </div>
            </div>

            {/* Roadblock Warning Banner if Active Road Closures */}
            {roadblocks.length > 0 && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-500/50 rounded-2xl flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-700 dark:text-rose-200">
                  <strong className="block text-sm font-bold text-rose-800 dark:text-rose-300">
                    Active Road Restrictions Detected ({roadblocks.length})
                  </strong>
                  The routing engine automatically excludes reported closures and directs compactor trucks via safe alternative road segments.
                </div>
              </div>
            )}

            {/* Map Display */}
            <div className="h-96 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl relative">
              <LeafletMap
                bins={tasks.map((t) => t.bin).filter(Boolean)}
                routePath={routePolyline}
                routeStops={routeResult?.ordered_stops || []}
                center={[19.9975, 73.7898]}
                zoom={13}
                className="h-full w-full"
              />
            </div>

            {/* Direct Destination Route Summary */}
            {directRoute && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <span className="text-xs text-slate-400 block uppercase">
                      {activeRouteType === 'dumping' ? 'Dumping Facility Destination' : 'Bin Destination Route'}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white text-base">
                      {(directRoute.distance_meters / 1000).toFixed(1)} km • ~{Math.round(directRoute.travel_time_seconds / 60)} mins
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                      {directRoute.sourceNode?.name || directRoute.source_id} ➔ {directRoute.targetNode?.name || directRoute.destinationFacility?.name || directRoute.target_id}
                    </span>
                  </div>

                  {activeRouteType === 'dumping' && (
                    <button
                      type="button"
                      onClick={handleUnloadVehicle}
                      disabled={unloadLoading}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {unloadLoading ? 'Confirming...' : 'Confirm Facility Unloading'}
                    </button>
                  )}
                </div>

                {/* Turn-by-turn road steps */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Turn-By-Turn Road Segments ({directRoute.node_path?.length || 0} Nodes)
                  </h4>
                  <div className="space-y-1.5 font-mono text-xs">
                    {(directRoute.node_path || []).map((nodeId, idx) => (
                      <div key={idx} className="p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="text-slate-800 dark:text-slate-200">
                          {nodeId} {idx === (directRoute.node_path.length - 1) ? '🏁 [Arrival Destination]' : '➔ Proceed'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs text-slate-500 dark:text-slate-400">
                  <strong>Algorithm Note:</strong> {directRoute.algorithm || 'Dijkstra Shortest Path'}. Dynamic road closure avoidance active.
                </div>
              </div>
            )}

            {/* Tour Route Summary & Stops */}
            {routeResult && !directRoute && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <span className="text-xs text-slate-400 block uppercase">Tour Metric</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {routeResult.total_distance_km ? `${routeResult.total_distance_km.toFixed(1)} km` : 'Multi-Stop Tour'} • 
                      ~{Math.round(routeResult.total_time_minutes || 25)} mins
                    </span>
                  </div>
                  {routeResult.isRerouted && (
                    <span className="px-3 py-1 bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold rounded-full">
                      Alternative Route Active
                    </span>
                  )}
                </div>

                {/* Ordered Stops List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Sequential Collection Stops
                  </h4>
                  <div className="space-y-2">
                    {(routeResult.ordered_stops || []).map((stop, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xs">
                            {stop.type === 'depot' ? 'D' : idx}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">{stop.name}</span>
                            <span className="text-slate-500">{stop.type === 'depot' ? 'Starting Municipal Depot' : 'Collection Target'}</span>
                          </div>
                        </div>
                        {idx === 1 && (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold rounded text-[10px] border border-emerald-500/30">
                            NEXT STOP
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================== */}
        {/* MODULE 3: Record Verified Bin Emptying & Net Waste Weight                  */}
        {/* ========================================================================== */}
        {activeTab === 'record' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Field Collection Verification
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Record physical emptying of bin asset into compaction truck. Fill level is reset to 0% upon verified collection.
            </p>

            {selectedTask ? (
              <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1">
                  Active Selected Asset
                </span>
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-mono font-bold text-base text-slate-900 dark:text-white">{selectedTask.bin?.code}</h4>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{selectedTask.bin?.name}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                      Expected fill tomorrow (24h horizon): ~{selectedTask.bin?.currentFillPercentage || 70}%
                    </p>
                  </div>
                  <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-1 rounded-lg font-mono">
                    Task #{selectedTask.id.slice(0, 8)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-500/40 rounded-2xl text-sm text-amber-800 dark:text-amber-300">
                Tip: Select a task from the "Assigned Queue" tab to record verified collection.
              </div>
            )}

            <form onSubmit={handleRecordCollection} className="space-y-5 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Collected Net Weight (kg) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={collectionForm.weightKg}
                    onChange={(e) => setCollectionForm({ ...collectionForm, weightKg: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Waste Stream *</label>
                  <select
                    value={collectionForm.wasteType}
                    onChange={(e) => setCollectionForm({ ...collectionForm, wasteType: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="SOLID">Solid / Mixed</option>
                    <option value="ORGANIC">Organic / Wet</option>
                    <option value="RECYCLABLE">Recyclable / Dry</option>
                    <option value="HAZARDOUS">Hazardous</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Field Inspection Notes <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={collectionForm.notes}
                  onChange={(e) => setCollectionForm({ ...collectionForm, notes: e.target.value })}
                  placeholder="e.g. Cleared fully, washed surroundings near market"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Explicit GPS Consent Checkbox */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="gpsConsent"
                  checked={collectionForm.gpsConsent}
                  onChange={(e) => setCollectionForm({ ...collectionForm, gpsConsent: e.target.checked })}
                  className="mt-1 rounded accent-amber-500 h-5 w-5 cursor-pointer"
                />
                <label htmlFor="gpsConsent" className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                  <strong className="text-slate-900 dark:text-white block">GPS Verification Consent</strong>
                  I confirm physical presence at this collection point in Nashik and authorize attaching location telemetry to this municipal collection record.
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={collectionSubmitting || !selectedTask}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold text-base rounded-2xl shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                >
                  {collectionSubmitting ? 'Recording Verification...' : '✓ Complete Collection & Empty Bin'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================== */}
        {/* MODULE 4: Field Incident & Road Obstacle Reporting                         */}
        {/* ========================================================================== */}
        {activeTab === 'issue' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Report Operational Issue or Roadblock</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Report blocked roads, damaged bins, or vehicle issues so control room dispatchers can reroute vehicles or deploy maintenance.
            </p>

            <form onSubmit={handleReportIssue} className="space-y-4 text-sm">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Issue Type *</label>
                <select
                  value={issueForm.issueType}
                  onChange={(e) => setIssueForm({ ...issueForm, issueType: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="blocked_road">Blocked Road / Construction Closure</option>
                  <option value="damaged_bin">Damaged or Broken Bin Asset</option>
                  <option value="inaccessible_point">Inaccessible Collection Point</option>
                  <option value="unsafe_location">Unsafe Location / Hazard</option>
                  <option value="incorrect_map">Incorrect Map Location</option>
                  <option value="vehicle_problem">Vehicle Mechanical Issue</option>
                  <option value="other">Other Operational Issue</option>
                </select>
              </div>

              {issueForm.issueType === 'blocked_road' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Road / Street Name Affected
                  </label>
                  <input
                    type="text"
                    value={issueForm.roadName}
                    onChange={(e) => setIssueForm({ ...issueForm, roadName: e.target.value })}
                    placeholder="e.g. Gangapur Road near Jehan Circle"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Location / Landmark
                </label>
                <input
                  type="text"
                  value={issueForm.location}
                  onChange={(e) => setIssueForm({ ...issueForm, location: e.target.value })}
                  placeholder="e.g. Near Panchavati Karanja Market"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Description & Details <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={issueForm.description}
                  onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                  placeholder="Explain the obstacle or condition to help reroute and resolve..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={issueSubmitting}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-xl shadow transition-colors cursor-pointer"
                >
                  {issueSubmitting ? 'Submitting Report...' : 'Submit Operational Issue'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================== */}
        {/* MODULE 5: Physical QR / Barcode Asset Identification                       */}
        {/* ========================================================================== */}
        {activeTab === 'scan' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Asset Scanner & Bin Identifier</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Scan barcode/QR code tags or enter asset codes manually to view bin details and verify collection.
            </p>

            {/* Camera Scanner Section */}
            <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-amber-500" />
                  <span className="font-bold text-sm text-slate-900 dark:text-white">Camera QR Scanner</span>
                </div>
                {cameraActive ? (
                  <button
                    onClick={stopCameraScanner}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Stop Camera
                  </button>
                ) : (
                  <button
                    onClick={startCameraScanner}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Start Camera
                  </button>
                )}
              </div>

              {cameraActive && (
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-w-sm mx-auto mb-3">
                  <video ref={videoRef} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border-2 border-amber-400/60 rounded-xl pointer-events-none flex items-center justify-center">
                    <span className="text-xs bg-slate-900/80 px-2 py-1 rounded text-amber-300">
                      Align QR or barcode within frame
                    </span>
                  </div>
                </div>
              )}

              {cameraError && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/40 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                  {cameraError}
                </div>
              )}
            </div>

            {/* Manual Identifier Fallback */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Manual Identifier Fallback
              </label>
              <form onSubmit={handleManualScanLookup} className="flex gap-2 mb-6">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={scanQuery}
                    onChange={(e) => setScanQuery(e.target.value)}
                    placeholder="Enter bin code (e.g. BIN-NSK-PAN-001)"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={scanSearching}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl transition-colors cursor-pointer"
                >
                  {scanSearching ? 'Looking up...' : 'Lookup'}
                </button>
              </form>
            </div>

            {/* Scanned Bin Details Card */}
            {scannedBin && (
              <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-base font-bold text-amber-600 dark:text-amber-400">{scannedBin.code}</span>
                    <h4 className="text-base font-semibold text-slate-900 dark:text-white mt-0.5">{scannedBin.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{scannedBin.ward?.name} • Area: {scannedBin.areaCategory}</p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-1 rounded-lg">
                    Priority: {Math.round(scannedBin.priorityScore || 0)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  <div>Expected Fill: <strong className="text-slate-900 dark:text-white text-sm">{scannedBin.currentFillPercentage}%</strong></div>
                  <div>Capacity: <strong className="text-slate-900 dark:text-white text-sm">{scannedBin.capacityLiters}L</strong></div>
                </div>

                <button
                  onClick={() => {
                    setSelectedTask({ bin: scannedBin, id: 'adhoc-scanned-task' });
                    setActiveTab('record');
                  }}
                  className="w-full mt-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer"
                >
                  Proceed to Record Collection for This Bin
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================== */}
        {/* MODULE 6: Residential E-Waste Pickup & Recycler Facility Handover          */}
        {/* ========================================================================== */}
        {activeTab === 'ewaste' && (
          <div className="space-y-6">
            {/* Assigned E-Waste Pickups */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Assigned Residential E-Waste Pickups</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Doorstep pickup tasks assigned to your collection route.
              </p>

              {ewasteRequests.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4">No e-waste collection requests currently pending.</p>
              ) : (
                <div className="space-y-3">
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
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 uppercase font-semibold">
                            {req.status}
                          </span>
                        </div>
                        <h5 className="font-bold text-sm text-slate-900 dark:text-white mt-1 capitalize">{req.category.replace(/_/g, ' ')}</h5>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{req.address}</p>
                      </div>

                      {req.status === 'ASSIGNED' || req.status === 'SUBMITTED' ? (
                        <button
                          onClick={() => handleMarkEWasteCollected(req.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer whitespace-nowrap"
                        >
                          Mark Collected
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1">
                          <Check className="w-4 h-4" /> Ready for Handover
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Handover Form */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                Handover to Verified Facility
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Log transfer of collected electronics to verified downstream recyclers or dismantlers in Nashik.
              </p>

              <form onSubmit={handleRecyclerHandover} className="space-y-4 text-sm">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Select Destination Facility *
                  </label>
                  <select
                    required
                    value={handoverForm.facilityId}
                    onChange={(e) => setHandoverForm({ ...handoverForm, facilityId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {facilities.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.verificationStatus ? f.verificationStatus.toUpperCase() : 'PENDING'} • {f.area || 'Nashik'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Total Weight (kg) *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={handoverForm.weightKg}
                      onChange={(e) => setHandoverForm({ ...handoverForm, weightKg: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Item Count *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={handoverForm.itemCount}
                      onChange={(e) => setHandoverForm({ ...handoverForm, itemCount: parseInt(e.target.value, 10) || 1 })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Manifest Number *</label>
                    <input
                      type="text"
                      required
                      value={handoverForm.manifestNumber}
                      onChange={(e) => setHandoverForm({ ...handoverForm, manifestNumber: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Transfer Certificate # *</label>
                    <input
                      type="text"
                      required
                      value={handoverForm.certificateNumber}
                      onChange={(e) => setHandoverForm({ ...handoverForm, certificateNumber: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={handoverSubmitting}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold text-sm rounded-xl shadow transition-all cursor-pointer"
                  >
                    {handoverSubmitting ? 'Recording Handover...' : 'Archive Handover & Issue Manifest'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
