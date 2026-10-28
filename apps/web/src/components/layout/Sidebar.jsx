import React from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext.jsx';
import {
  LayoutDashboard,
  Trash2,
  MapPin,
  ListOrdered,
  Users,
  CheckSquare,
  AlertCircle,
  BatteryCharging,
  Building2,
  BarChart3,
  Leaf,
} from 'lucide-react';

export const Sidebar = ({ isOpen, onClose }) => {
  const { t } = useLanguage();

  const navItems = [
    { labelKey: 'nav_overview', fallback: 'Overview', to: '/organization/overview', icon: LayoutDashboard },
    { labelKey: 'nav_bins', fallback: 'Bin Management', to: '/organization/bins', icon: Trash2 },
    { labelKey: 'nav_map', fallback: 'Geospatial Live Map', to: '/organization/map', icon: MapPin },
    { labelKey: 'nav_priority', fallback: 'Collection Priority', to: '/organization/prioritized-tasks', icon: ListOrdered },
    { labelKey: 'nav_tasks', fallback: 'Collection Tasks', to: '/organization/tasks', icon: CheckSquare },
    { labelKey: 'nav_workers', fallback: 'Worker Team', to: '/organization/workers', icon: Users },
    { labelKey: 'nav_complaints', fallback: 'Citizen Complaints', to: '/organization/complaints', icon: AlertCircle },
    { labelKey: 'nav_ewaste', fallback: 'E-Waste Stewardship', to: '/organization/ewaste', icon: BatteryCharging },
    { labelKey: 'nav_facilities', fallback: 'Verified Facilities', to: '/organization/facilities', icon: Building2 },
    { labelKey: 'nav_analytics', fallback: 'Analytics & Reports', to: '/organization/analytics', icon: BarChart3 },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden backdrop-blur-xs"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-200 ease-in-out border-r border-slate-800 shadow-xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand */}
        <div className="px-6 py-5 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md shadow-emerald-900/40">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              EcoNexus
              <span className="text-[11px] uppercase font-bold px-1.5 py-0.5 rounded-sm bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Nashik
              </span>
            </div>
            <p className="text-xs text-slate-400">{t('admin_portal_subtitle', 'Municipal Admin Portal')}</p>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
          <div className="px-3 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            {t('operations_planning', 'Operations & Planning')}
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const label = t(item.labelKey, item.fallback);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-white" />
                  <span>{label}</span>
                </div>
              </NavLink>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 text-xs text-slate-400">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-200">{t('system_status', 'System Status: Operational')}</span>
          </div>
          <p className="text-[11px] text-slate-500">Nashik Municipal Solid Waste Division</p>
        </div>
      </aside>
    </>
  );
};
