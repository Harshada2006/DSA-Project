import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Leaf,
  Shield,
  Briefcase,
  User,
  MapPin,
  ArrowRight,
  Truck,
  Building2,
  Trash2,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar.jsx';
import { LeafletMap } from '../components/map/LeafletMap.jsx';
import { api } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';

export const LandingPage = () => {
  const { t } = useLanguage();
  const [bins, setBins] = useState([]);
  const [wards, setWards] = useState([]);
  const [facilities, setFacilities] = useState([]);

  useEffect(() => {
    Promise.all([api.getBins(), api.getWards(), api.getFacilities()])
      .then(([binsRes, wardsRes, facsRes]) => {
        setBins(binsRes || []);
        setWards(wardsRes || []);
        setFacilities(facsRes || []);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-12 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-b from-emerald-50/60 via-white to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-xs sm:text-sm font-semibold text-emerald-900 dark:text-emerald-300 mb-5 shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
            {t('landing_badge', 'Nashik Municipal Corporation (NMC) Civic Technology')}
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight max-w-4xl mx-auto">
            {t('landing_title', 'Smart Waste Management for a Cleaner, Greener Nashik')}
          </h1>

          {/* Subtitle - Simple & Concise */}
          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {t('landing_subtitle', 'Empowering Nashik citizens, municipal field workers, and sanitation administrators with transparent waste tracking, e-waste recycling, and clean neighborhoods.')}
          </p>

          {/* Hero Visual Image: Authentic Ramkund Nashik Photo */}
          <div className="mt-8 relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 max-h-[420px]">
            <img
              src="/images/nashik_ramkund.jpg"
              alt="Historic Ramkund Ghat on Godavari River, Nashik"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex items-end p-6 sm:p-8">
              <div className="text-left text-white max-w-xl">
                <span className="bg-emerald-500 text-slate-950 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-1.5 shadow-xs">
                  {t('mission_badge', 'Swachh Nashik Mission')}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-md">
                  {t('ramkund_title', 'Historic Ramkund & Godavari Ghat, Panchavati')}
                </h2>
                <p className="text-xs sm:text-sm text-slate-200 mt-1">
                  {t('ramkund_desc', 'Active municipal sanitation across Panchavati, CIDCO, Satpur, Nashik Road, and Old Nashik.')}
                </p>
              </div>
            </div>
          </div>

          {/* 3 Dedicated Stakeholder Cards */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {/* 1. Citizen Portal Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg hover:border-emerald-500 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-4">
                  <User className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {t('portal_citizen_title', 'Citizen Portal')}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  {t('portal_citizen_desc', 'Report overflowing bins, request doorstep e-waste pickups, and track complaint resolutions in your ward.')}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Link
                  to="/citizen/login"
                  className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-xs transition-colors"
                >
                  <span>{t('portal_citizen_btn', 'Citizen Access')}</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* 2. Worker Portal Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg hover:border-amber-500 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 flex items-center justify-center mb-4">
                  <Truck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {t('portal_worker_title', 'Field Worker Portal')}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  {t('portal_worker_desc', 'View daily collection schedules, suggested optimized routes, scan bin assets, and report field issues.')}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Link
                  to="/worker/login"
                  className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold shadow-xs transition-colors"
                >
                  <span>{t('portal_worker_btn', 'Worker Sign In')}</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* 3. Organization Admin Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg hover:border-blue-500 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {t('portal_org_title', 'Municipal Administration')}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  {t('portal_org_desc', 'Audit bin fill levels, manage collection teams, process e-waste stewardship, and view citywide analytics.')}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Link
                  to="/organization/login"
                  className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-sm font-bold shadow-xs transition-colors"
                >
                  <span>{t('portal_org_btn', 'Admin Sign In')}</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Geospatial Map Section */}
      <section className="py-12 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                {t('landing_map_title', 'Nashik Waste Infrastructure Map')}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {t('landing_map_desc', 'Visualizing registered bins, NMC wards, and certified recycling facilities')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-3 py-1 rounded-full font-semibold border border-emerald-200 dark:border-emerald-700">
                {bins.length} {t('monitored_bins', 'Monitored Bins')}
              </span>
              <span className="text-xs bg-purple-50 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 px-3 py-1 rounded-full font-semibold border border-purple-200 dark:border-purple-700">
                {facilities.length} {t('verified_facilities', 'Verified Facilities')}
              </span>
            </div>
          </div>

          <div className="h-96 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
            <LeafletMap
              center={[19.9975, 73.7898]}
              zoom={13}
              bins={bins}
              wards={wards}
              facilities={facilities}
            />
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="py-8 bg-slate-900 text-slate-400 text-xs text-center border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Leaf className="w-4 h-4 text-emerald-400" />
            <span>EcoNexus Nashik</span>
          </div>
          <p className="text-slate-400">
            Nashik Municipal Corporation (NMC) • Solid Waste Management Cell • Maharashtra
          </p>
          <div className="flex items-center gap-4 text-slate-400 font-medium">
            <Link to="/citizen/login" className="hover:text-white transition-colors">{t('nav_citizen', 'Citizen')}</Link>
            <Link to="/worker/login" className="hover:text-white transition-colors">{t('nav_worker', 'Worker')}</Link>
            <Link to="/organization/login" className="hover:text-white transition-colors">{t('nav_admin', 'Admin')}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
