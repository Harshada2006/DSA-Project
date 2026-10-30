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
  Trash2,
  Recycle,
} from 'lucide-react';
import { LanguageSelector } from '../components/common/LanguageSelector.jsx';
import { ThemeToggle } from '../components/common/ThemeToggle.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

export const CitizenDashboard = () => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
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

  /* ============================================================
   * MODULE 4: E-Waste Doorstep Pickup Booking & Tracking
   * Allows Nashik citizens to schedule electronic waste pickups
   * ============================================================ */
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

      const trackingNumber = res?.ticketNo || res?.trackingNumber || `EW-2026-${Date.now().toString().slice(-4)}`;

      setNotice({
        type: 'success',
        text: `E-Waste pickup request #${trackingNumber} scheduled for ${res?.preferredDate || ewasteForm.preferredDate || 'tomorrow'}! Municipal collection crew will contact you.`,
      });

      // Construct immediate item for guaranteed instant visibility in list
      const newItem = {
        id: res?.id || `ew-${Date.now()}`,
        ticketNo: trackingNumber,
        trackingNumber: trackingNumber,
        category: ewasteForm.category,
        itemsDescription: ewasteForm.description || `${ewasteForm.category.replace(/_/g, ' ')} (${ewasteForm.itemCount} items)`,
        description: ewasteForm.description || `${ewasteForm.category.replace(/_/g, ' ')} (${ewasteForm.itemCount} items)`,
        pickupAddress: ewasteForm.address.trim(),
        address: ewasteForm.address.trim(),
        preferredPickupDate: ewasteForm.preferredDate,
        preferredDate: ewasteForm.preferredDate,
        preferredTimeSlot: ewasteForm.preferredTimeSlot || 'Morning',
        status: 'submitted',
        createdAt: new Date().toISOString(),
      };

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

      try {
        const updated = await api.getEWasteRequests();
        if (Array.isArray(updated) && updated.length > 0) {
          const exists = updated.some((r) => r.id === res?.id || r.ticketNo === trackingNumber);
          setMyEWasteRequests(exists ? updated : [newItem, ...updated]);
        } else {
          setMyEWasteRequests([newItem]);
        }
      } catch {
        setMyEWasteRequests((prev) => [newItem, ...prev]);
      }

      // Switch tab to show the scheduled requests immediately
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
      SUBMITTED: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
      UNDER_REVIEW: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
      ASSIGNED: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
      IN_PROGRESS: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800',
      COLLECTED: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800',
      DELIVERED_TO_RECYCLER: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
      RESOLVED: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
      REJECTED: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${map[s] || 'bg-slate-100 text-slate-700'}`}>
        {s.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Navigation */}
      <header className="bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white sticky top-0 z-30 shadow-xs backdrop-blur-md transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-bold text-white text-xl shadow-md">
              E
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">EcoNexus</h1>
                <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-300 dark:border-emerald-700">
                  {t('citizen_services', 'Citizen Services')}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('nmc_title', 'Nashik Municipal Corporation')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSelector />
            <ThemeToggle />
            <div className="hidden sm:block text-right">
              <span className="block text-sm font-bold text-slate-800 dark:text-white">{user?.name || t('nav_citizen', 'Citizen Resident')}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">{user?.email}</span>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('sign_out', 'Sign Out')}</span>
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
              <span>{t('swachh_nashik', 'Swachh Survekshan Nashik')}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">{t('welcome_citizen', 'Namaste')}, {user?.name || t('nav_citizen', 'Citizen')}!</h2>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              {t('citizen_banner_text', 'Report overflowing bins, request free doorstep e-waste collection, and help keep Nashik clean and green.')}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab('report')}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl shadow transition-all cursor-pointer flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              {t('report_issue_btn', 'Report Issue')}
            </button>
            <button
              onClick={() => setActiveTab('ewaste')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm rounded-xl border border-white/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <Tv className="w-4 h-4 text-emerald-300" />
              {t('book_ewaste_btn', 'Book E-Waste')}
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
          <button onClick={() => setNotice(null)} className="ml-3 font-bold underline cursor-pointer text-xs">{t('dismiss', 'Dismiss')}</button>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full flex flex-col">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'report'
                ? 'bg-emerald-700 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            {t('tab_report_waste', 'Report Issue')}
          </button>

          <button
            onClick={() => setActiveTab('my-complaints')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'my-complaints'
                ? 'bg-emerald-700 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            {t('tab_my_complaints', 'My Reports')} ({myComplaints.length})
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'map'
                ? 'bg-emerald-700 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700'
            }`}
          >
            <MapPin className="w-4 h-4" />
            {t('tab_bin_map', 'Public Bin & Facility Map')}
          </button>

          <button
            onClick={() => setActiveTab('ewaste')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'ewaste'
                ? 'bg-emerald-700 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700'
            }`}
          >
            <Tv className="w-4 h-4" />
            {t('tab_ewaste_pickup', 'Book E-Waste Pickup')}
          </button>

          <button
            onClick={() => setActiveTab('my-ewaste')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'my-ewaste'
                ? 'bg-emerald-700 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            {t('tab_my_ewaste', 'My E-Waste Requests')} ({myEWasteRequests.length})
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-emerald-700 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            {t('tab_segregation_guide', 'Waste Segregation Guide')}
          </button>
        </div>

        {/* ============================================================
         * MODULE 1: Citizen Waste & Overflow Grievance Lodging
         * Submits complaints to NMC Ward Sanitary Inspectors
         * ============================================================ */}
        {activeTab === 'report' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Report Waste or Overflow Grievance</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Directly alerts NMC Ward Sanitary Inspectors for rapid field inspection and resolution.
              </p>

              <form onSubmit={handleComplaintSubmit} className="space-y-4 text-sm">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Issue Summary *</label>
                  <input
                    type="text"
                    required
                    value={complaintForm.title}
                    onChange={(e) => setComplaintForm({ ...complaintForm, title: e.target.value })}
                    placeholder="e.g. Bin overflowing onto road near Godavari Ramkund Ghat"
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Category *</label>
                    <select
                      value={complaintForm.category}
                      onChange={(e) => setComplaintForm({ ...complaintForm, category: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
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
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nashik Ward / Area *</label>
                    <select
                      required
                      value={complaintForm.wardId}
                      onChange={(e) => setComplaintForm({ ...complaintForm, wardId: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
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
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Landmark / Location Details <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={complaintForm.landmark}
                    onChange={(e) => setComplaintForm({ ...complaintForm, landmark: e.target.value })}
                    placeholder="e.g. Opposite Ramkund main steps, near vegetable mandi"
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Description & Observations <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={complaintForm.description}
                    onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })}
                    placeholder="Provide additional details to help sanitary inspectors locate and clear the waste promptly..."
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white resize-none"
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
              <div className="bg-emerald-900/10 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-3xl p-6">
                <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300 font-bold text-sm uppercase tracking-wider mb-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  NMC Citizen Guarantee
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  Every grievance registered on EcoNexus automatically feeds into the NMC municipal priority collection schedule. 
                  High-priority overflows near schools, hospitals, and Godavari river banks trigger immediate priority handling.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Your Recent Reports</h4>
                {myComplaints.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic">You have no active complaints registered.</p>
                ) : (
                  <div className="space-y-2">
                    {myComplaints.slice(0, 3).map((c) => (
                      <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700 text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{c.ticketNumber || c.id.slice(0, 8)}</span>
                          {getStatusBadge(c.status)}
                        </div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate text-sm">{c.title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
         * MODULE 2: Citizen Grievance Tracking & Resolution Status
         * Displays citizen's submitted reports with live municipal progress
         * ============================================================ */}
        {activeTab === 'my-complaints' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">My Registered Grievances & Status</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
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
              <div className="text-center py-16 text-slate-500 dark:text-slate-400">
                <FileText className="w-14 h-14 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-base font-semibold text-slate-700 dark:text-slate-200">No complaints registered yet</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Submit a report to track its progress here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myComplaints.map((c) => (
                  <div key={c.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-2.5 py-1 rounded-lg">
                          {c.ticketNumber || `CMP-${c.id.slice(0, 8)}`}
                        </span>
                        <span className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">{c.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(c.status)}
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{c.description || 'No additional details provided.'}</p>

                    <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-3">
                      <span><strong>Ward:</strong> {c.ward?.name || 'Nashik Municipal Ward'}</span>
                      <span><strong>Category:</strong> {c.category}</span>
                      {c.landmark && <span><strong>Landmark:</strong> {c.landmark}</span>}
                      {c.resolutionNotes && (
                        <div className="w-full mt-2 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-900 dark:text-emerald-200 text-sm">
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

        {/* ============================================================
         * MODULE 3: Nashik Geospatial Live Map & Facilities
         * Visualizes public bins and authorized collection centers
         * ============================================================ */}
        {activeTab === 'map' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col flex-1 min-h-[580px]">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Nashik Civic Cleanliness & Bin Map</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Inspect public bins, waste transfer stations, and e-waste collection points across Nashik.
              </p>
            </div>
            <div className="flex-1 rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 min-h-[500px]">
              <LeafletMap
                bins={bins}
                facilities={facilities}
                center={[19.9975, 73.7898]}
                zoom={13}
              />
            </div>
          </div>
        )}

        {/* ============================================================
         * MODULE 4: Book Free Doorstep E-Waste Collection
         * Routes citizen electronics to authorized MPCB recyclers
         * ============================================================ */}
        {activeTab === 'ewaste' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Book Free Doorstep E-Waste Collection</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Prevent toxic heavy metals from contaminating the Godavari riverbed. 
                Our municipal crew routes collected electronics to verified downstream recycling destinations.
              </p>

              <form onSubmit={handleEWasteSubmit} className="space-y-4 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Appliance Category *</label>
                    <select
                      value={ewasteForm.category}
                      onChange={(e) => setEWasteForm({ ...ewasteForm, category: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    >
                      <option value="CONSUMER_ELECTRONICS">Consumer Electronics (TVs, Audio, Home Devices)</option>
                      <option value="COMPUTERS_IT">Computers, Laptops & IT Hardware</option>
                      <option value="HOME_APPLIANCES">Home Appliances (Refrigerators, Microwaves, ACs)</option>
                      <option value="BATTERIES_CABLES">Batteries, Chargers, Power Banks & Cables</option>
                      <option value="OTHER">Other Electrical Equipment</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Approximate Item Count <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={ewasteForm.itemCount}
                      onChange={(e) => setEWasteForm({ ...ewasteForm, itemCount: parseInt(e.target.value, 10) || 1 })}
                      className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Device Description <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={ewasteForm.description}
                    onChange={(e) => setEWasteForm({ ...ewasteForm, description: e.target.value })}
                    placeholder="e.g. 2 CRT monitors, 1 desktop tower, assorted adapter cords"
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Preferred Pickup Date <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="date"
                      value={ewasteForm.preferredDate}
                      onChange={(e) => setEWasteForm({ ...ewasteForm, preferredDate: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Preferred Time Slot <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <select
                      value={ewasteForm.preferredTimeSlot}
                      onChange={(e) => setEWasteForm({ ...ewasteForm, preferredTimeSlot: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    >
                      <option value="MORNING">Morning (9:00 AM – 1:00 PM)</option>
                      <option value="AFTERNOON">Afternoon (2:00 PM – 6:00 PM)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Contact Phone <span className="text-slate-400 font-normal">(For pickup coordination)</span>
                    </label>
                    <input
                      type="tel"
                      value={ewasteForm.contactPhone}
                      onChange={(e) => setEWasteForm({ ...ewasteForm, contactPhone: e.target.value })}
                      placeholder="+91 98XXX XXXXX"
                      className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Landmark <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={ewasteForm.landmark}
                      onChange={(e) => setEWasteForm({ ...ewasteForm, landmark: e.target.value })}
                      placeholder="e.g. Near KTHM College arch"
                      className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Doorstep Address in Nashik *</label>
                  <textarea
                    rows={2}
                    required
                    value={ewasteForm.address}
                    onChange={(e) => setEWasteForm({ ...ewasteForm, address: e.target.value })}
                    placeholder="Enter building name, flat number, street/colony in Nashik"
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white resize-none"
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

            {/* Side Card: Verified Nashik E-Waste Facilities */}
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-purple-600" />
                  Nashik E-Waste Collection Bins & Recyclers
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Authorized MPCB e-waste recyclers and designated drop-off receptacles in Nashik.
                </p>
                <div className="space-y-2.5 pt-2">
                  {facilities
                    .filter((f) => f.facilityType === 'RECYCLER' || f.facilityType === 'verified_ewaste_recycler' || f.wasteType === 'ELECTRONIC' || f.wasteType === 'electronic')
                    .slice(0, 4)
                    .map((fac) => (
                      <div key={fac.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                              <Trash2 className="w-3.5 h-3.5" />
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white text-xs">{fac.name}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center gap-1 shrink-0">
                            <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            VERIFIED
                          </span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 pl-9">{fac.facilityAddress || fac.address}</p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
         * MODULE 5: My E-Waste Requests History & Live Tracking
         * Displays citizen's scheduled electronic waste collections
         * ============================================================ */}
        {activeTab === 'my-ewaste' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">My E-Waste Collection Requests</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
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
              <div className="text-center py-16 text-slate-500 dark:text-slate-400">
                <Tv className="w-14 h-14 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-base font-semibold text-slate-700 dark:text-slate-200">No e-waste pickup requests registered yet</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Book a free doorstep pickup to dispose of electronics responsibly.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myEWasteRequests.map((r) => {
                  const categoryName = (r.category || r.itemsDescription || 'Electronic Waste').replace(/_/g, ' ');
                  const tracking = r.ticketNo || r.trackingNumber || `EW-${r.id?.slice(0, 8)}`;
                  const address = r.pickupAddress || r.address || 'Doorstep pickup in Nashik';
                  const dateStr = r.preferredPickupDate || r.preferredDate;
                  const desc = r.itemsDescription || r.description || 'Household electronics collection';
                  return (
                    <div key={r.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-bold text-purple-800 bg-purple-100 dark:bg-purple-950 dark:text-purple-300 px-2.5 py-1 rounded-lg">
                            {tracking}
                          </span>
                          <span className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 capitalize">
                            {categoryName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(r.status)}
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(r.createdAt || Date.now()).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{desc}</p>

                      <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-3">
                        <span><strong>Address:</strong> {address}</span>
                        {dateStr && <span><strong>Scheduled:</strong> {new Date(dateStr).toLocaleDateString()} ({r.preferredTimeSlot || 'Morning'})</span>}
                        {r.assignedWorker && <span><strong>Assigned Driver:</strong> {r.assignedWorker.name}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================
         * MODULE 6: Nashik Municipal Waste Segregation Guide
         * Guidelines compliant with Solid Waste Management Rules 2016
         * ============================================================ */}
        {activeTab === 'guide' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Nashik Municipal Waste Segregation Guide</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
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
