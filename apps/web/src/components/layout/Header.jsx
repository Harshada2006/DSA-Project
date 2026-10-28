import React, { useState, useEffect } from 'react';
import { Menu, Activity, LogOut, ShieldCheck } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { LanguageSelector } from '../common/LanguageSelector.jsx';
import { ThemeToggle } from '../common/ThemeToggle.jsx';

export const Header = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
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
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 h-16 px-4 lg:px-8 flex items-center justify-between transition-colors">
      {/* Mobile Toggle & Portal Info */}
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            {t('admin_portal_name', 'Nashik Municipal Operations')}
            <span className="hidden sm:inline-block text-xs font-normal text-slate-500 dark:text-slate-400">
              | {t('civic_portal', 'Civic Waste Portal')}
            </span>
          </h1>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Civic Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-800 dark:text-emerald-300">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{t('swachh_nashik', 'Swachh Nashik')}</span>
        </div>

        {/* Multi-language Selector */}
        <LanguageSelector />

        {/* Light / Dark Mode Toggle */}
        <ThemeToggle />

        {/* Live IST Time */}
        <div className="hidden xl:flex items-center gap-1.5 text-xs font-mono font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <Activity className="w-3.5 h-3.5 text-emerald-600" />
          <span>IST: {timeStr}</span>
        </div>

        {/* Authenticated User Pill & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
          <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'NMC'}
          </div>
          <div className="hidden lg:block text-left leading-tight">
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user?.name || t('role_admin', 'Administrator')}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{user?.role?.replace('_', ' ') || 'Staff'}</div>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors ml-1 cursor-pointer"
            title={t('sign_out', 'Sign Out')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
