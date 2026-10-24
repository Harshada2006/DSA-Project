import React from 'react';
import { Link } from 'react-router-dom';
import { Leaf, User, Shield, Briefcase } from 'lucide-react';

export const Navbar = () => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-forest-700 flex items-center justify-center text-white shadow-md shadow-forest-900/30 group-hover:bg-forest-800 transition-colors">
            <Leaf className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <div className="font-extrabold text-xl tracking-tight text-slate-900 flex items-center gap-2">
              EcoNexus
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                Nashik
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
              Smart Waste Management & Civic Technology
            </p>
          </div>
        </Link>

        {/* Public Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <a href="#how-it-works" className="hover:text-forest-700 transition-colors">How It Works</a>
          <a href="#segregation" className="hover:text-forest-700 transition-colors">Waste Segregation</a>
          <a href="#map-preview" className="hover:text-forest-700 transition-colors">Nashik Map</a>
          <a href="#ewaste" className="hover:text-forest-700 transition-colors">E-Waste Recyclers</a>
        </nav>

        {/* Three Distinct Stakeholder Login Portals */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/citizen/login"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 transition-colors border border-slate-200/80"
          >
            <User className="w-3.5 h-3.5 text-emerald-600" />
            <span>Citizen</span>
          </Link>

          <Link
            to="/worker/login"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50 transition-colors border border-slate-200/80"
          >
            <Briefcase className="w-3.5 h-3.5 text-blue-600" />
            <span>Worker</span>
          </Link>

          <Link
            to="/organization/login"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-forest-700 hover:bg-forest-800 text-white shadow-xs transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-300" />
            <span>Organization</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
