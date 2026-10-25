import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Leaf,
  Shield,
  Briefcase,
  User,
  MapPin,
  Route,
  Recycle,
  CheckCircle2,
  ArrowRight,
  Layers,
  Building2,
  Truck,
  Sparkles,
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar.jsx';
import { LeafletMap } from '../components/map/LeafletMap.jsx';
import { api } from '../api/client.js';

export const LandingPage = () => {
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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50 via-white to-slate-50 pt-10 pb-16 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 border border-emerald-300 text-xs sm:text-sm font-semibold text-emerald-900 mb-6 shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
              Civic Technology Platform for Nashik Municipal Corporation (NMC)
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Smart Waste Management & Collection Logistics for{' '}
              <span className="text-emerald-700 underline decoration-emerald-400 decoration-wavy decoration-2">
                Nashik City
              </span>
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-3xl mx-auto">
              EcoNexus connects <strong>Nashik citizens</strong>, <strong>municipal collection crews</strong>, and <strong>civic administrators</strong> on a unified civic platform. Facilitating transparent grievance resolution, dynamic collection planning, and regulated e-waste stewardship.
            </p>

            {/* Hero Visual Image Banner */}
            <div className="mt-8 relative rounded-3xl overflow-hidden shadow-xl border-4 border-white max-h-[360px]">
              <img
                src="/assets/nashik_hero.jpg"
                alt="Scenic Godavari Riverfront Nashik"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-6 sm:p-8">
                <div className="text-left text-white max-w-xl">
                  <span className="bg-emerald-500 text-slate-950 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-2">
                    Clean Nashik Mission
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold">Preserving Godavari Riverfront & Pilgrimage Corridors</h2>
                  <p className="text-xs sm:text-sm text-slate-200 mt-1">
                    Coordinated waste management across Panchavati, CIDCO, Satpur, Nashik Road, and Nashik West.
                  </p>
                </div>
              </div>
            </div>

            {/* 3 Dedicated Stakeholder Entry Portals */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              {/* Citizen Card */}
              <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-md hover:shadow-xl hover:border-emerald-500 transition-all group flex flex-col justify-between">
                <div className="h-44 w-full overflow-hidden relative">
                  <img
                    src="/assets/nashik_hero.jpg"
                    alt="Citizen Ward Reporting"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-xs">
                    Citizen Services
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      Citizen Civic Portal
                    </h3>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                      Report waste grievances, book doorstep e-waste pickups, track ticket progress in real-time, and locate public drop-off centers.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-700">Password Login & Signup</span>
                    <Link
                      to="/citizen/login"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition-colors shadow-xs"
                    >
                      Enter Portal <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Worker Card */}
              <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-md hover:shadow-xl hover:border-amber-500 transition-all group flex flex-col justify-between">
                <div className="h-44 w-full overflow-hidden relative">
                  <img
                    src="/assets/worker_truck.jpg"
                    alt="Municipal Field Operations"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 bg-amber-500 text-slate-950 text-xs font-bold px-3 py-1 rounded-full shadow-xs">
                    Field Crew
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                      Worker Sign In
                    </h3>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                      Mobile-first field console. Review assigned tasks, follow suggested collection routes, scan assets, and log recycler handovers.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-700">Worker ID & Password</span>
                    <Link
                      to="/worker/login"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold transition-colors shadow-xs"
                    >
                      Worker Login <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Organization Admin Card */}
              <div className="bg-white rounded-3xl overflow-hidden border border-slate-800 shadow-md hover:shadow-xl transition-all group flex flex-col justify-between bg-gradient-to-b from-slate-900 to-slate-950 text-white">
                <div className="h-44 w-full overflow-hidden relative">
                  <img
                    src="/assets/command_center.jpg"
                    alt="Municipal Command Center"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
                  />
                  <div className="absolute top-3 left-3 bg-emerald-500 text-slate-950 text-xs font-bold px-3 py-1 rounded-full shadow-xs">
                    NMC Officers
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                      Organization Admin
                    </h3>
                    <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                      Operations command portal. Review citizen complaints, assign collection tasks, manage authorized workers, and monitor operational analytics.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Admin Credentials</span>
                    <Link
                      to="/organization/login"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold transition-colors shadow-xs"
                    >
                      Admin Sign In <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Operational Metrics */}
            <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="text-3xl font-extrabold text-slate-900">6 Wards</div>
                <div className="text-xs sm:text-sm text-slate-500 font-medium mt-1">Municipal Administrative Divisions</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="text-3xl font-extrabold text-emerald-700">Priority Ranked</div>
                <div className="text-xs sm:text-sm text-slate-500 font-medium mt-1">Automated Collection Scheduling</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="text-3xl font-extrabold text-slate-900">Predictive</div>
                <div className="text-xs sm:text-sm text-slate-500 font-medium mt-1">Expected Fill & Overflow Estimates</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="text-3xl font-extrabold text-emerald-800">Regulated</div>
                <div className="text-xs sm:text-sm text-slate-500 font-medium mt-1">Authorized E-Waste Channels</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Geospatial Map Section */}
      <section id="map" className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
              Nashik Cartography
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
              Interactive Geospatial Asset Map
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Explore municipal collection points, transfer stations, and authorized e-waste destination facilities across Nashik.
            </p>
          </div>

          <div className="rounded-3xl overflow-hidden border border-slate-300 shadow-lg h-[500px]">
            <LeafletMap
              bins={bins}
              facilities={facilities}
              center={[19.9975, 73.7898]}
              zoom={13}
            />
          </div>
        </div>
      </section>

      {/* Public Footer */}
      <footer className="bg-slate-950 text-white py-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
              E
            </div>
            <span className="text-white font-bold">EcoNexus Nashik</span>
            <span>• Municipal Civic Waste Management Platform</span>
          </div>
          <div>
            Solid Waste Management Department • Nashik Municipal Corporation
          </div>
        </div>
      </footer>
    </div>
  );
};
