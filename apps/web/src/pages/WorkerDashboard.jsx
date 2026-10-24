import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
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
  FileCheck2,
  ShieldCheck,
  RefreshCw,
  Camera,
  Layers,
  ArrowRight
} from 'lucide-react';

export const WorkerDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'record' | 'missed' | 'scan' | 'ewaste'

  // Data state
  const [tasks, setTasks] = useState([]);
  const [ewasteRequests, setEWasteRequests] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  // Collection form state
  const [collectionForm, setCollectionForm] = useState({
    fillPercentage: 85,
    weightKg: 120,
    wasteType: 'SOLID',
    notes: 'Cleared full bin into compactor truck',
    photoUrl: '',
    gpsConsent: true,
  });

  // Missed form state
  const [missedForm, setMissedForm] = useState({
    reason: 'ROAD_BLOCKED',
    notes: 'Narrow lane blocked by construction material, truck unable to enter.',
  });

  // QR / Code simulator state
  const [scannedCode, setScannedCode] = useState('BIN-NSK-PAN-001');
  const [scannedBin, setScannedBin] = useState(null);

  // Recycler Handover state
  const [handoverForm, setHandoverForm] = useState({
    facilityId: '',
    wasteCategory: 'ELECTRONIC',
    weightKg: 45,
    itemCount: 8,
    manifestNumber: `MNF-NSK-${Date.now().toString().slice(-6)}`,
    certificateNumber: `CERT-MPCB-${Date.now().toString().slice(-6)}`,
    notes: 'Handover of weekly residential IT & home electronics',
  });

  useEffect(() => {
    loadWorkerData();
  }, []);

  const loadWorkerData = async () => {
    try {
      const [tasksData, ewasteData, facData] = await Promise.all([
        api.getTasks().catch(() => []),
        api.getEWasteRequests().catch(() => []),
        api.getFacilities({ facilityType: 'RECYCLER' }).catch(() => []),
      ]);
      setTasks(tasksData || []);
      setEWasteRequests(ewasteData || []);
      setFacilities(facData || []);
      if (facData && facData.length > 0) {
        setHandoverForm((prev) => ({ ...prev, facilityId: facData[0].id }));
      }
    } catch (err) {
      console.error('Failed to load worker data:', err);
    }
  };

  const handleStartTask = async (task) => {
    try {
      const updated = await api.startTask(task.id);
      setSelectedTask(updated);
      setCollectionForm((prev) => ({
        ...prev,
        fillPercentage: updated.bin?.currentFillPercentage || 75,
      }));
      setActiveTab('record');
      setNotice({ type: 'success', text: `Task #${task.id.slice(0, 8)} marked IN_PROGRESS.` });
      loadWorkerData();
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Failed to start task.' });
    }
  };

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

    setLoading(true);
    try {
      await api.recordCollection(selectedTask.id, {
        fillPercentage: collectionForm.fillPercentage,
        weightKg: collectionForm.weightKg,
        wasteType: collectionForm.wasteType,
        notes: collectionForm.notes,
        photoUrl: collectionForm.photoUrl,
        latitude: 19.9975,
        longitude: 73.7898,
        gpsConsent: true,
      });

      setNotice({
        type: 'success',
        text: `Collection recorded for ${selectedTask.bin?.code || 'Bin'}! Fill level reset to 0%.`,
      });
      setSelectedTask(null);
      setActiveTab('tasks');
      loadWorkerData();
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Failed to record collection.' });
    } finally {
      setLoading(false);
    }
  };

  const handleReportMissed = async (e) => {
    e.preventDefault();
    if (!selectedTask) {
      setNotice({ type: 'error', text: 'Please select a task to report.' });
      return;
    }

    setLoading(true);
    try {
      await api.reportMissedTask(selectedTask.id, missedForm);
      setNotice({
        type: 'success',
        text: `Missed status logged for task #${selectedTask.id.slice(0, 8)}. Control room notified.`,
      });
      setSelectedTask(null);
      setActiveTab('tasks');
      loadWorkerData();
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Failed to report missed task.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateScan = async (e) => {
    e.preventDefault();
    try {
      const foundBins = await api.getBins({ search: scannedCode.trim() });
      if (foundBins.length > 0) {
        setScannedBin(foundBins[0]);
        setNotice({ type: 'success', text: `Bin ${foundBins[0].code} identified!` });
      } else {
        setNotice({ type: 'error', text: `No bin found matching "${scannedCode}".` });
      }
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Scan lookup failed.' });
    }
  };

  const handleRecyclerHandover = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.recordEWasteHandover(handoverForm);
      setNotice({
        type: 'success',
        text: `Handover recorded! Manifest ${handoverForm.manifestNumber} archived with MPCB recycler.`,
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
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Failed to log recycler handover.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Mobile Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 flex items-center justify-center font-bold text-slate-950 text-xl shadow-lg shadow-amber-900/40">
              <Truck className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-white">{user?.name || 'Municipal Worker'}</span>
                <span className="bg-amber-500/20 text-amber-300 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border border-amber-500/30">
                  {user?.workerProfile?.workerId || 'WRK-NSK-101'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                NMC Solid Waste Div • Vehicle: {user?.workerProfile?.vehicleNumber || 'MH-15-EG-4401'}
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-colors flex items-center gap-1.5"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Visual Shift Banner with Compactor Truck Photo */}
      <div className="relative border-b border-slate-800 bg-gradient-to-r from-amber-950 via-slate-900 to-slate-950 overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-25 pointer-events-none">
          <img src="/assets/worker_truck.jpg" alt="Municipal Compactor" className="w-full h-full object-cover" />
        </div>
        <div className="max-w-4xl mx-auto p-4 sm:p-5 relative z-10 flex items-center justify-between">
          <div>
            <span className="bg-amber-500/20 text-amber-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-1 border border-amber-500/30">
              On-Shift Active
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-white">Daily Waste Collection Tour</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Nashik Municipal Corporation • Hydraulic Compactor Unit
            </p>
          </div>
          <button
            onClick={loadWorkerData}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Queue
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
          <button onClick={() => setNotice(null)} className="ml-3 underline text-white font-bold cursor-pointer text-xs">Dismiss</button>
        </div>
      )}

      {/* Bottom/Top Tab Navigation - Bigger & Touch-Friendly */}
      <div className="bg-slate-900/90 backdrop-blur border-b border-slate-800 p-2.5 sticky top-16 z-20">
        <div className="max-w-4xl mx-auto flex overflow-x-auto gap-2 no-scrollbar">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'tasks' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white bg-slate-800/50'
            }`}
          >
            <Clock className="w-4 h-4" />
            Assigned Queue ({tasks.length})
          </button>

          <button
            onClick={() => setActiveTab('record')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'record' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white bg-slate-800/50'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Record Collection
          </button>

          <button
            onClick={() => setActiveTab('missed')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'missed' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white bg-slate-800/50'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Report Issue
          </button>

          <button
            onClick={() => setActiveTab('scan')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'scan' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white bg-slate-800/50'
            }`}
          >
            <QrCode className="w-4 h-4" />
            Scan Asset
          </button>

          <button
            onClick={() => setActiveTab('ewaste')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'ewaste' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white bg-slate-800/50'
            }`}
          >
            <Tv className="w-4 h-4" />
            E-Waste Handover
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto p-4 sm:p-6 flex-1 w-full pb-20">
        {/* Tab 1: Assigned Tasks */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-slate-300">
                Today's Dispatch Queue
              </h2>
              <span className="text-xs text-amber-400 font-mono font-semibold">{tasks.length} Assigned Stops</span>
            </div>

            {tasks.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center text-slate-400">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <p className="font-bold text-base text-white">All collection tasks cleared!</p>
                <p className="text-sm text-slate-400 mt-1">Check back as our C++ heap generates new priority tasks.</p>
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
                          ? 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/50 shadow-xl'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-sm text-amber-400">
                              {bin?.code || 'BIN-UNKNOWN'}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase ${
                              t.priority === 'CRITICAL' ? 'bg-rose-900 text-rose-200 border border-rose-700' :
                              t.priority === 'HIGH' ? 'bg-amber-900 text-amber-200 border border-amber-700' : 'bg-slate-800 text-slate-300'
                            }`}>
                              {t.priority}
                            </span>
                            <span className="text-xs font-semibold text-slate-300 uppercase bg-slate-800 px-2 py-0.5 rounded">
                              {t.status}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-white mt-1.5">{bin?.name || 'Municipal Bin'}</h4>
                          <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-1.5 mt-1">
                            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                            {bin?.ward?.name || 'Nashik Ward'} • Area: <strong className="text-slate-300 capitalize">{bin?.areaCategory || 'URBAN'}</strong>
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-2xl font-bold font-mono text-amber-400">{fill}%</span>
                          <span className="block text-[11px] text-slate-400 uppercase">Fill Level</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3.5 border-t border-slate-800 flex items-center justify-between text-xs sm:text-sm text-slate-400">
                        <span>
                          Capacity: <strong className="text-white">{bin?.capacityLiters || 1100}L</strong> • Waste: <strong className="text-white capitalize">{bin?.wasteType || 'SOLID'}</strong>
                        </span>
                        <div className="flex gap-2">
                          {t.status === 'PENDING' ? (
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

        {/* Tab 2: Record Collection Form */}
        {activeTab === 'record' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-1">
              Field Collection Verification
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Record physical emptying of bin asset into compaction truck.
            </p>

            {selectedTask ? (
              <div className="mb-6 p-4 bg-slate-800/80 rounded-2xl border border-slate-700">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block mb-1">
                  Active Selected Asset
                </span>
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-mono font-bold text-base text-white">{selectedTask.bin?.code}</h4>
                    <p className="text-sm text-slate-300">{selectedTask.bin?.name}</p>
                  </div>
                  <span className="text-xs bg-slate-700 text-slate-200 px-3 py-1 rounded-lg font-mono">
                    Task #{selectedTask.id.slice(0, 8)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mb-6 p-4 bg-amber-950/30 border border-amber-500/40 rounded-2xl text-sm text-amber-300">
                Tip: Select a task from the "Assigned Queue" tab first to auto-link the bin code.
              </div>
            )}

            <form onSubmit={handleRecordCollection} className="space-y-5 text-sm">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                  Observed Fill Before Emptying: <strong className="text-amber-400 text-base">{collectionForm.fillPercentage}%</strong>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={collectionForm.fillPercentage}
                  onChange={(e) => setCollectionForm({ ...collectionForm, fillPercentage: parseInt(e.target.value, 10) })}
                  className="w-full accent-amber-500 h-2 bg-slate-800 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">Collected Net Weight (kg)</label>
                  <input
                    type="number"
                    min="1"
                    value={collectionForm.weightKg}
                    onChange={(e) => setCollectionForm({ ...collectionForm, weightKg: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">Waste Stream</label>
                  <select
                    value={collectionForm.wasteType}
                    onChange={(e) => setCollectionForm({ ...collectionForm, wasteType: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white"
                  >
                    <option value="SOLID">Solid / Mixed</option>
                    <option value="ORGANIC">Organic / Wet</option>
                    <option value="RECYCLABLE">Recyclable / Dry</option>
                    <option value="HAZARDOUS">Hazardous</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Field Inspection Notes</label>
                <input
                  type="text"
                  value={collectionForm.notes}
                  onChange={(e) => setCollectionForm({ ...collectionForm, notes: e.target.value })}
                  placeholder="e.g. Cleared fully, washed surroundings near market"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white"
                />
              </div>

              {/* Explicit GPS Consent Checkbox */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="gpsConsent"
                  checked={collectionForm.gpsConsent}
                  onChange={(e) => setCollectionForm({ ...collectionForm, gpsConsent: e.target.checked })}
                  className="mt-1 rounded accent-amber-500 h-5 w-5"
                />
                <label htmlFor="gpsConsent" className="text-sm text-slate-300 cursor-pointer">
                  <strong className="text-white block">GPS Verification Consent</strong>
                  I confirm that I am physically present at this Nashik bin coordinate and consent to attaching device verification telemetry to this municipal collection record.
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold text-base rounded-2xl shadow-lg transition-all cursor-pointer"
                >
                  {loading ? 'Submitting Verification...' : '✓ Complete Collection & Empty Bin'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: Report Missed or Blocked */}
        {activeTab === 'missed' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-1">Report Missed or Blocked Bin</h2>
            <p className="text-sm text-slate-400 mb-6">
              Log reasons why collection could not be completed so dispatchers can reroute or deploy auxiliary equipment.
            </p>

            <form onSubmit={handleReportMissed} className="space-y-4 text-sm">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Incident Reason *</label>
                <select
                  value={missedForm.reason}
                  onChange={(e) => setMissedForm({ ...missedForm, reason: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white"
                >
                  <option value="ROAD_BLOCKED">Narrow Lane / Road Blocked by Construction</option>
                  <option value="VEHICLE_BREAKDOWN">Vehicle Mechanical Failure / Flat Tire</option>
                  <option value="INACCESSIBLE_BIN">Bin Inaccessible (Locked gate or parked car)</option>
                  <option value="EXCESS_OVERFLOW">Overflow Exceeds Truck Capacity (Requires Loader)</option>
                  <option value="CIVIC_EVENT">Procession or Market Day Traffic Restriction</option>
                  <option value="OTHER">Other Operational Impairment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Explanation & Notes</label>
                <textarea
                  rows={3}
                  required
                  value={missedForm.notes}
                  onChange={(e) => setMissedForm({ ...missedForm, notes: e.target.value })}
                  placeholder="Provide details for the municipal control room..."
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-xl shadow transition-colors cursor-pointer"
                >
                  {loading ? 'Logging Issue...' : 'Submit Missed Collection Report'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 4: QR Scanner Simulator */}
        {activeTab === 'scan' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-1">QR Code & Bin ID Asset Lookup</h2>
            <p className="text-sm text-slate-400 mb-6">
              Simulate scanning barcode or RFID tags attached to Nashik municipal bins.
            </p>

            <form onSubmit={handleSimulateScan} className="flex gap-2 mb-6">
              <input
                type="text"
                value={scannedCode}
                onChange={(e) => setScannedCode(e.target.value)}
                placeholder="BIN-NSK-PAN-001"
                className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl transition-colors cursor-pointer"
              >
                Scan Asset
              </button>
            </form>

            {scannedBin && (
              <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-base font-bold text-amber-400">{scannedBin.code}</span>
                    <h4 className="text-base font-semibold text-white mt-0.5">{scannedBin.name}</h4>
                    <p className="text-xs text-slate-400">{scannedBin.ward?.name} • Area: {scannedBin.areaCategory}</p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-slate-800 text-slate-200 px-3 py-1 rounded-lg">
                    Score: {scannedBin.priorityScore || 0}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-800">
                  <div>Fill: <strong className="text-white text-sm">{scannedBin.currentFillPercentage}%</strong></div>
                  <div>Capacity: <strong className="text-white text-sm">{scannedBin.capacityLiters}L</strong></div>
                </div>

                <button
                  onClick={() => {
                    setSelectedTask({ bin: scannedBin, id: 'temp-adhoc-task' });
                    setActiveTab('record');
                  }}
                  className="w-full mt-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer"
                >
                  Log Collection for This Scanned Bin
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: E-Waste & Recycler Handover */}
        {activeTab === 'ewaste' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-1">
                Handover to Verified MPCB Recycler
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                Log delivery of residential e-waste from NMC vehicles to MPCB registered processors.
              </p>

              <form onSubmit={handleRecyclerHandover} className="space-y-4 text-sm">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                    Select Authorized Recycler Destination *
                  </label>
                  <select
                    required
                    value={handoverForm.facilityId}
                    onChange={(e) => setHandoverForm({ ...handoverForm, facilityId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white"
                  >
                    {facilities.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.licenseNumber || 'MPCB Authorized'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-1.5">Total Weight (kg)</label>
                    <input
                      type="number"
                      min="1"
                      value={handoverForm.weightKg}
                      onChange={(e) => setHandoverForm({ ...handoverForm, weightKg: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-1.5">Item Count</label>
                    <input
                      type="number"
                      min="1"
                      value={handoverForm.itemCount}
                      onChange={(e) => setHandoverForm({ ...handoverForm, itemCount: parseInt(e.target.value, 10) || 1 })}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-1.5">Manifest Document #</label>
                    <input
                      type="text"
                      required
                      value={handoverForm.manifestNumber}
                      onChange={(e) => setHandoverForm({ ...handoverForm, manifestNumber: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-1.5">MPCB Certificate #</label>
                    <input
                      type="text"
                      required
                      value={handoverForm.certificateNumber}
                      onChange={(e) => setHandoverForm({ ...handoverForm, certificateNumber: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold text-sm rounded-xl shadow transition-all cursor-pointer"
                  >
                    {loading ? 'Recording Handover...' : 'Archive Handover & Issue Manifest'}
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
