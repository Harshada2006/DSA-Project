import React from 'react';
import { Link } from 'react-router-dom';
import { Leaf, User, Shield, Briefcase } from 'lucide-react';
import { LanguageSelector } from '../common/LanguageSelector.jsx';
import { ThemeToggle } from '../common/ThemeToggle.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';

export const Navbar = () => {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-md shadow-emerald-900/30 group-hover:bg-emerald-800 transition-colors">
            <Leaf className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <div className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              EcoNexus
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700">
                Nashik
              </span>
            </div>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
              {t('tagline', 'Smart Waste Management & Municipal Operations')}
            </p>
          </div>
        </Link>

        {/* Center / Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Multi-language Selector */}
          <LanguageSelector />

          {/* Light / Dark Mode Toggle */}
          <ThemeToggle />

          {/* Three Distinct Stakeholder Login Portals */}
          <div className="flex items-center gap-1.5 sm:gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
            <Link
              to="/citizen/login"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700"
            >
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <span>Citizen</span>
            </Link>

            <Link
              to="/worker/login"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700"
            >
              <Briefcase className="w-3.5 h-3.5 text-amber-600" />
              <span>Worker</span>
            </Link>

            <Link
              to="/organization/login"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-200" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};
