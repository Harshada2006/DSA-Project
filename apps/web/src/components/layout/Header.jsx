import React, { useState, useEffect } from 'react';
import { Menu, Cpu, Activity, LogOut, ShieldCheck } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

export const Header = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const [timeStr, setTimeStr] = useState('');
  const [cppStatus, setCppStatus] = useState('checking');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    api
      .getCppHealth()
      .then((res) => {
        if (res?.data?.status === 'healthy' || res?.status === 'healthy') setCppStatus('healthy');
        else setCppStatus('error');
      })
      .catch(() => setCppStatus('error'));
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200 h-16 px-4 lg:px-8 flex items-center justify-between">
      {/* Mobile Toggle & Portal Info */}
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
            Nashik Municipal Operations
            <span className="hidden sm:inline-block text-xs font-normal text-slate-500">
              | EcoNexus Civic Portal
            </span>
          </h1>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Civic PBL Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Swachh Nashik</span>
        </div>

        {/* C++ DSA Status Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
          <Cpu className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden sm:inline">C++17 Engine:</span>
          {cppStatus === 'healthy' ? (
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Connected
            </span>
          ) : cppStatus === 'checking' ? (
            <span className="text-amber-600 font-semibold">Checking...</span>
          ) : (
            <span className="text-rose-600 font-semibold">Offline</span>
          )}
        </div>

        {/* Live IST Time */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs font-mono font-medium text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
          <Activity className="w-3.5 h-3.5 text-emerald-600" />
          <span>IST: {timeStr}</span>
        </div>

        {/* Authenticated User Pill & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-forest-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'NMC'}
          </div>
          <div className="hidden xl:block text-left leading-tight">
            <div className="text-sm font-semibold text-slate-800">{user?.name || 'Administrator'}</div>
            <div className="text-xs text-slate-500">{user?.role?.replace('_', ' ') || 'Staff'}</div>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-1"
            title="Sign out of EcoNexus"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
