import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import { LeafletMap } from '../components/map/LeafletMap.jsx';
import { 
  FileText, 
  MapPin, 
  Tv, 
  BookOpen, 
  AlertCircle, 
  PlusCircle, 
  Clock, 
  CheckCircle2, 
  LogOut, 
  ShieldCheck, 
  Layers,
  Phone,
  Calendar,
  Building2,
  ExternalLink,
} from 'lucide-react';

export const CitizenDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('report'); // 'report' | 'my-complaints' | 'map' | 'ewaste' | 'my-ewaste' | 'guide'

  // Data state
  const [wards, setWards] = useState([]);
  const [bins, setBins] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [myComplaints, setMyComplaints] = useState([]);
  const [myEWasteRequests, setMyEWasteRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  // Form states
  const [complaintForm, setComplaintForm] = useState({
    title: '',
    description: '',
    category: 'OVERFLOW',
    wardId: '',
    landmark: '',
    photoUrl: '',
  });

  const [ewasteForm, setEWasteForm] = useState({
    category: 'CONSUMER_ELECTRONICS',
    itemCount: 1,
    weightKg: '',
    description: '',
    address: '',
    landmark: '',
    contactPhone: '',
    preferredDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    preferredTimeSlot: 'MORNING',
  });

  // Initial load
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [wardsData, binsData, facData, myComplaintsData, ewasteData] = await Promise.all([
        api.getWards().catch(() => []),
        api.getBins().catch(() => []),
        api.getFacilities().catch(() => []),
        api.getComplaints().catch(() => []),
        api.getEWasteRequests().catch(() => []),
      ]);
      setWards(wardsData || []);
      setBins(binsData || []);
      setFacilities(facData || []);
      setMyComplaints(myComplaintsData || []);
      setMyEWasteRequests(ewasteData || []);
      if (wardsData && wardsData.length > 0 && !complaintForm.wardId) {
        setComplaintForm((prev) => ({ ...prev, wardId: wardsData[0].id }));
      }
    } catch (err) {
      console.error('Failed to load citizen data:', err);
    }
  };

  const handleComplaintSubmit = async (e) => {
    e.preventDefault();
    if (!complaintForm.title.trim()) {
      setNotice({ type: 'error', text: 'Please provide a short summary of the issue.' });
      return;
    }
    if (!complaintForm.wardId) {
      setNotice({ type: 'error', text: 'Please select an administrative ward in Nashik.' });
      return;
    }

    setLoading(true);
    try {
      const res = await api.submitComplaint({
        title: complaintForm.title.trim(),
        description: complaintForm.description.trim() || undefined,
        category: complaintForm.category,
        wardId: complaintForm.wardId,
        landmark: complaintForm.landmark.trim() || undefined,
        photoUrl: complaintForm.photoUrl.trim() || undefined,
      });

      setNotice({
        type: 'success',
        text: `Complaint ticket #${res.ticketNumber || res.id} registered! NMC Waste Control Room will inspect within 24 hours.`,
      });

      setComplaintForm({
        title: '',
        description: '',
        category: 'OVERFLOW',
        wardId: wards[0]?.id || '',
        landmark: '',
        photoUrl: '',
      });

      const updated = await api.getComplaints();
      setMyComplaints(updated || []);
      setActiveTab('my-complaints');
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Failed to submit complaint.' });
    } finally {
      setLoading(false);
    }
  };

  const handleEWasteSubmit = async (e) => {
    e.preventDefault();
    if (!ewasteForm.address.trim()) {
      setNotice({ type: 'error', text: 'Please provide a doorstep pickup address.' });
      return;
    }

    setLoading(true);
    try {
      const res = await api.submitEWasteRequest({
        category: ewasteForm.category,
        itemCount: parseInt(ewasteForm.itemCount, 10) || 1,
        weightKg: ewasteForm.weightKg ? parseFloat(ewasteForm.weightKg) : undefined,
        description: ewasteForm.description.trim() || undefined,
        address: ewasteForm.address.trim(),
        landmark: ewasteForm.landmark.trim() || undefined,
        contactPhone: ewasteForm.contactPhone.trim() || undefined,
        preferredDate: ewasteForm.preferredDate || undefined,
        preferredTimeSlot: ewasteForm.preferredTimeSlot || undefined,
      });

      setNotice({
        type: 'success',
        text: `E-Waste pickup request #${res.trackingNumber || res.id} scheduled for ${res.preferredDate || 'tomorrow'}! Municipal collection crew will contact you.`,
      });

      setEWasteForm({
        category: 'CONSUMER_ELECTRONICS',
        itemCount: 1,
        weightKg: '',
        description: '',
        address: '',
        landmark: '',
        contactPhone: '',
        preferredDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        preferredTimeSlot: 'MORNING',
      });

      const updated = await api.getEWasteRequests();
      setMyEWasteRequests(updated || []);
      setActiveTab('my-ewaste');
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Failed to submit e-waste request.' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    const map = {
      SUBMITTED: 'bg-blue-50 text-blue-800 border-blue-200',
      UNDER_REVIEW: 'bg-amber-50 text-amber-800 border-amber-200',
      ASSIGNED: 'bg-purple-50 text-purple-800 border-purple-200',
      IN_PROGRESS: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      COLLECTED: 'bg-teal-50 text-teal-800 border-teal-200',
      DELIVERED_TO_RECYCLER: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      RESOLVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      REJECTED: 'bg-rose-50 text-rose-800 border-rose-200',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${map[s] || 'bg-slate-100 text-slate-700'}`}>
        {s.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-slate-950 text-xl shadow-md">
              E
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg tracking-tight">EcoNexus</h1>
                <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-500/30">
                  Citizen Services
                </span>
              </div>
              <p className="text-xs text-slate-400">Nashik Municipal Corporation</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <span className="block text-sm font-bold text-white">{user?.name || 'Citizen Resident'}</span>
              <span className="block text-xs text-slate-400">{user?.email}</span>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Visual Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white relative overflow-hidden border-b border-emerald-800/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Swachh Survekshan Nashik</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">Namaste, {user?.name || 'Citizen'}!</h2>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Report overflowing bins, request free doorstep e-waste collection, and help keep Nashik clean and green.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab('report')}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl shadow transition-all cursor-pointer flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Report Issue
            </button>
            <button
              onClick={() => setActiveTab('ewaste')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm rounded-xl border border-white/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <Tv className="w-4 h-4 text-emerald-300" />
              Book E-Waste
            </button>
          </div>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div className={`px-4 py-3 text-sm font-medium text-center border-b flex items-center justify-center gap-2 shadow-sm ${
          notice.type === 'success'
            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
            : 'bg-rose-100 text-rose-900 border-rose-300'
        }`}>
          {notice.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-700 shrink-0" />}
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="ml-3 font-bold underline cursor-pointer text-xs">Dismiss</button>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full flex flex-col">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2.5 border-b border-slate-200 pb-4 mb-6">
          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'report'
                ? 'bg-emerald-700 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Report Issue
          </button>

          <button
            onClick={() => setActiveTab('my-complaints')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'my-complaints'
                ? 'bg-emerald-700 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            My Reports ({myComplaints.length})
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'map'
                ? 'bg-emerald-700 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Public Bin & Facility Map
          </button>

          <button
            onClick={() => setActiveTab('ewaste')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'ewaste'
                ? 'bg-emerald-700 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
            }`}
          >
            <Tv className="w-4 h-4" />
            Book E-Waste Pickup
          </button>

          <button
            onClick={() => setActiveTab('my-ewaste')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'my-ewaste'
                ? 'bg-emerald-700 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            My E-Waste Requests ({myEWasteRequests.length})
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-emerald-700 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Waste Segregation Guide
          </button>
        </div>

        {/* Tab 1: Report Grievance */}
        {activeTab === 'report' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Report Waste or Overflow Grievance</h2>
              <p className="text-sm text-slate-500 mb-6">
                Directly alerts NMC Ward Sanitary Inspectors for rapid field inspection and resolution.
              </p>

              <form onSubmit={handleComplaintSubmit} className="space-y-4 text-sm">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Issue Summary *</label>
                  <input
                    type="text"
                    required
                    value={complaintForm.title}
                    onChange={(e) => setComplaintForm({ ...complaintForm, title: e.target.value })}
                    placeholder="e.g. Bin overflowing onto road near Godavari Ramkund Ghat"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category *</label>
                    <select
                      value={complaintForm.category}
                      onChange={(e) => setComplaintForm({ ...complaintForm, category: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                    >
                      <option value="OVERFLOW">Bin Overflow</option>
                      <option value="MISSED_PICKUP">Missed Door-to-Door Pickup</option>
                      <option value="ILLEGAL_DUMPING">Illegal Open Dumping</option>
                      <option value="DAMAGED_BIN">Broken or Damaged Bin Asset</option>
                      <option value="EWASTE_DISPOSAL">Improper E-Waste Dumping</option>
                      <option value="OTHER">Other Sanitation Issue</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nashik Ward / Area *</label>
                    <select
                      required
                      value={complaintForm.wardId}
                      onChange={(e) => setComplaintForm({ ...complaintForm, wardId: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                    >
                      {wards.map((w) => (
                        <option key={w.id} value={w.id}>
                          Ward {w.number}: {w.name} ({w.zone})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Landmark / Location Details <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={complaintForm.landmark}
                    onChange={(e) => setComplaintForm({ ...complaintForm, landmark: e.target.value })}
                    placeholder="e.g. Opposite Ramkund main steps, near vegetable mandi"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Description & Observations <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={complaintForm.description}
                    onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })}
                    placeholder="Provide additional details to help sanitary inspectors locate and clear the waste promptly..."
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Submitting...' : 'Register Grievance with NMC'}
                  </button>
                </div>
              </form>
            </div>

            {/* Side Card */}
            <div className="space-y-4">
              <div className="bg-emerald-900/10 border border-emerald-200 rounded-3xl p-6">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm uppercase tracking-wider mb-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  NMC Citizen Guarantee
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Every grievance registered on EcoNexus automatically feeds into the NMC municipal priority collection schedule. 
                  High-priority overflows near schools, hospitals, and Godavari river banks trigger immediate priority handling.
                </p>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Your Recent Reports</h4>
                {myComplaints.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">You have no active complaints registered.</p>
                ) : (
                  <div className="space-y-2">
                    {myComplaints.slice(0, 3).map((c) => (
                      <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-mono font-bold text-slate-700">{c.ticketNumber || c.id.slice(0, 8)}</span>
                          {getStatusBadge(c.status)}
                        </div>
                        <p className="font-semibold text-slate-800 truncate text-sm">{c.title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: My Complaints Timeline */}
        {activeTab === 'my-complaints' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">My Registered Grievances & Status</h2>
                <p className="text-sm text-slate-500">
                  Track the resolution timeline of your reports handled by Nashik Municipal Corporation.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('report')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                + New Report
              </button>
            </div>

            {myComplaints.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <FileText className="w-14 h-14 text-slate-300 mx-auto mb-3" />
                <p className="text-base font-semibold">No complaints registered yet</p>
                <p className="text-sm text-slate-400 mt-1">Submit a report to track its progress here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myComplaints.map((c) => (
                  <div key={c.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                          {c.ticketNumber || `CMP-${c.id.slice(0, 8)}`}
                        </span>
                        <span className="text-sm sm:text-base font-bold text-slate-800">{c.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(c.status)}
                        <span className="text-xs text-slate-500">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-slate-600 mb-3">{c.description || 'No additional details provided.'}</p>

                    <div className="flex flex-wrap gap-4 text-xs text-slate-500 border-t border-slate-200 pt-3">
                      <span><strong>Ward:</strong> {c.ward?.name || 'Nashik Municipal Ward'}</span>
                      <span><strong>Category:</strong> {c.category}</span>
                      {c.landmark && <span><strong>Landmark:</strong> {c.landmark}</span>}
                      {c.resolutionNotes && (
                        <div className="w-full mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-sm">
                          <strong>NMC Resolution Note:</strong> {c.resolutionNotes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Public Map */}
        {activeTab === 'map' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col flex-1 min-h-[580px]">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900">Nashik Civic Cleanliness & Bin Map</h2>
              <p className="text-sm text-slate-500">
                Inspect public bins, waste transfer stations, and e-waste collection points across Nashik.
              </p>
            </div>
            <div className="flex-1 rounded-2xl overflow-hidden border border-slate-300 min-h-[500px]">
              <LeafletMap
                bins={bins}
                facilities={facilities}
                center={[19.9975, 73.7898]}
                zoom={13}
              />
            </div>
          </div>
        )}

        {/* Tab 4: Book E-Waste Pickup */}
        {activeTab === 'ewaste' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Book Free Doorstep E-Waste Collection</h2>
              <p className="text-sm text-slate-500 mb-6">
                Prevent toxic heavy metals from contaminating the Godavari riverbed. 
                Our municipal crew routes collected electronics to verified downstream recycling destinations.
              </p>

              <form onSubmit={handleEWasteSubmit} className="space-y-4 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Appliance Category *</label>
                    <select
                      value={ewasteForm.category}
                      onChange={(e) => setEWasteForm({ ...ewasteForm, category: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                    >
                      <option value="CONSUMER_ELECTRONICS">Consumer Electronics (TVs, Audio, Home Devices)</option>
                      <option value="COMPUTERS_IT">Computers, Laptops & IT Hardware</option>
                      <option value="HOME_APPLIANCES">Home Appliances (Refrigerators, Microwaves, ACs)</option>
                      <option value="BATTERIES_CABLES">Batteries, Chargers, Power Banks & Cables</option>
                      <option value="OTHER">Other Electrical Equipment</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Approximate Item Count <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={ewasteForm.itemCount}
                      onChange={(e) => setEWasteForm({ ...ewasteForm, itemCount: parseInt(e.target.value, 10) || 1 })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Device Description <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={ewasteForm.description}
                    onChange={(e) => setEWasteForm({ ...ewasteForm, description: e.target.value })}
                    placeholder="e.g. 2 CRT monitors, 1 desktop tower, assorted adapter cords"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Preferred Pickup Date <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="date"
                      value={ewasteForm.preferredDate}
                      onChange={(e) => setEWasteForm({ ...ewasteForm, preferredDate: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Preferred Time Slot <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <select
                      value={ewasteForm.preferredTimeSlot}
                      onChange={(e) => setEWasteForm({ ...ewasteForm, preferredTimeSlot: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                    >
                      <option value="MORNING">Morning (9:00 AM – 1:00 PM)</option>
                      <option value="AFTERNOON">Afternoon (2:00 PM – 6:00 PM)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Contact Phone <span className="text-slate-400 font-normal">(For pickup coordination)</span>
                    </label>
                    <input
                      type="tel"
                      value={ewasteForm.contactPhone}
                      onChange={(e) => setEWasteForm({ ...ewasteForm, contactPhone: e.target.value })}
                      placeholder="+91 98XXX XXXXX"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Landmark <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={ewasteForm.landmark}
                      onChange={(e) => setEWasteForm({ ...ewasteForm, landmark: e.target.value })}
                      placeholder="e.g. Near KTHM College arch"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Doorstep Address in Nashik *</label>
                  <textarea
                    rows={2}
                    required
                    value={ewasteForm.address}
                    onChange={(e) => setEWasteForm({ ...ewasteForm, address: e.target.value })}
                    placeholder="Enter building name, flat number, street/colony in Nashik"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Booking Pickup...' : 'Book Free Municipal E-Waste Pickup'}
                  </button>
                </div>
              </form>
            </div>

            {/* Side Card: Section 18 Nashik E-Waste Facilities */}
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  Nashik E-Waste Reference Facilities
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Collected electronics are routed to documented facilities in Nashik (Satpur & Ambad MIDC).
                </p>
                <div className="space-y-2.5 pt-2">
                  {facilities
                    .filter((f) => f.facilityType === 'RECYCLER' || f.wasteType === 'ELECTRONIC')
                    .slice(0, 4)
                    .map((fac) => (
                      <div key={fac.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <div className="flex justify-between items-start gap-1">
                          <span className="font-bold text-slate-900 text-xs">{fac.name}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            fac.verificationStatus === 'verified' ? 'bg-emerald-100 text-emerald-800' :
                            fac.verificationStatus === 'pending_confirmation' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-200 text-slate-700'
                          }`}>
                            {fac.verificationStatus.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-slate-500 mt-1">{fac.facilityAddress || fac.address}</p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: My E-Waste Requests History */}
        {activeTab === 'my-ewaste' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">My E-Waste Collection Requests</h2>
                <p className="text-sm text-slate-500">
                  Track pickup assignment, collection status, and facility handover progress.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('ewaste')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                + New Pickup Request
              </button>
            </div>

            {myEWasteRequests.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <Tv className="w-14 h-14 text-slate-300 mx-auto mb-3" />
                <p className="text-base font-semibold">No e-waste pickup requests registered yet</p>
                <p className="text-sm text-slate-400 mt-1">Book a free doorstep pickup to dispose of electronics responsibly.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myEWasteRequests.map((r) => (
                  <div key={r.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-purple-800 bg-purple-100 px-2.5 py-1 rounded-lg">
                          {r.trackingNumber || `EW-${r.id.slice(0, 8)}`}
                        </span>
                        <span className="text-sm sm:text-base font-bold text-slate-800 capitalize">
                          {r.category.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(r.status)}
                        <span className="text-xs text-slate-500">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-slate-600 mb-2">{r.description || 'Appliance collection request'}</p>

                    <div className="flex flex-wrap gap-4 text-xs text-slate-500 border-t border-slate-200 pt-3">
                      <span><strong>Address:</strong> {r.address}</span>
                      {r.preferredDate && <span><strong>Scheduled:</strong> {new Date(r.preferredDate).toLocaleDateString()} ({r.preferredTimeSlot})</span>}
                      {r.assignedWorker && <span><strong>Assigned Driver:</strong> {r.assignedWorker.name}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 6: Waste Segregation Guide */}
        {activeTab === 'guide' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Nashik Municipal Waste Segregation Guide</h2>
            <p className="text-sm text-slate-500 mb-6">
              Compliant with Solid Waste Management Rules (SWM 2016) and Nashik Municipal Corporation directives.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="p-5 rounded-2xl border-2 border-emerald-300 bg-emerald-50">
                <span className="w-4 h-4 rounded-full bg-emerald-600 inline-block mr-2" />
                <span className="font-bold text-sm text-emerald-900 uppercase">Wet Waste (Green)</span>
                <ul className="mt-4 text-sm text-slate-700 space-y-2 list-disc list-inside">
                  <li>Vegetable & fruit peels</li>
                  <li>Leftover cooked food & tea bags</li>
                  <li>Garden waste & leaves</li>
                  <li>Egg shells & food scraps</li>
                </ul>
                <p className="text-xs text-emerald-800 font-semibold mt-4">Composted at Vilholi Solid Waste Plant.</p>
              </div>

              <div className="p-5 rounded-2xl border-2 border-blue-300 bg-blue-50">
                <span className="w-4 h-4 rounded-full bg-blue-600 inline-block mr-2" />
                <span className="font-bold text-sm text-blue-900 uppercase">Dry Waste (Blue)</span>
                <ul className="mt-4 text-sm text-slate-700 space-y-2 list-disc list-inside">
                  <li>Paper & cardboard boxes</li>
                  <li>Plastic bottles & covers</li>
                  <li>Glass bottles & jars</li>
                  <li>Metal cans & tin foils</li>
                </ul>
                <p className="text-xs text-blue-800 font-semibold mt-4">Processed at Ambad MRF Facility.</p>
              </div>

              <div className="p-5 rounded-2xl border-2 border-rose-300 bg-rose-50">
                <span className="w-4 h-4 rounded-full bg-rose-600 inline-block mr-2" />
                <span className="font-bold text-sm text-rose-900 uppercase">Domestic Hazardous (Red)</span>
                <ul className="mt-4 text-sm text-slate-700 space-y-2 list-disc list-inside">
                  <li>Sanitary napkins & diapers</li>
                  <li>Expired medicines</li>
                  <li>Syringes & bandages</li>
                  <li>Pesticide containers</li>
                </ul>
                <p className="text-xs text-rose-800 font-semibold mt-4">Incinerated under biomedical protocols.</p>
              </div>

              <div className="p-5 rounded-2xl border-2 border-purple-300 bg-purple-50">
                <span className="w-4 h-4 rounded-full bg-purple-600 inline-block mr-2" />
                <span className="font-bold text-sm text-purple-900 uppercase">E-Waste (Designated)</span>
                <ul className="mt-4 text-sm text-slate-700 space-y-2 list-disc list-inside">
                  <li>Mobile phones & chargers</li>
                  <li>Laptops, mice & cables</li>
                  <li>Tube lights & CFL bulbs</li>
                  <li>Batteries & power banks</li>
                </ul>
                <p className="text-xs text-purple-800 font-semibold mt-4">Handed to MPCB licensed recyclers.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
