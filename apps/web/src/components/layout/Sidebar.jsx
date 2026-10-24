import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Trash2,
  MapPin,
  ListOrdered,
  Route,
  Users,
  CheckSquare,
  AlertCircle,
  BatteryCharging,
  Building2,
  CalendarDays,
  BarChart3,
  Database,
  Leaf,
  Cpu,
} from 'lucide-react';

export const Sidebar = ({ isOpen, onClose }) => {
  const navItems = [
    { label: 'Overview', to: '/organization/overview', icon: LayoutDashboard },
    { label: 'Bin Management', to: '/organization/bins', icon: Trash2 },
    { label: 'Geospatial Live Map', to: '/organization/map', icon: MapPin },
    { label: 'Route Planning', to: '/organization/route-optimization', icon: Route, badge: 'Dijkstra' },
    { label: 'Priority Queue', to: '/organization/prioritized-tasks', icon: ListOrdered, badge: 'C++ Heap' },
    { label: 'Collection Tasks', to: '/organization/tasks', icon: CheckSquare },
    { label: 'Worker Team', to: '/organization/workers', icon: Users },
    { label: 'Citizen Complaints', to: '/organization/complaints', icon: AlertCircle },
    { label: 'E-Waste Stewardship', to: '/organization/ewaste', icon: BatteryCharging },
    { label: 'Verified Facilities', to: '/organization/facilities', icon: Building2 },
    { label: 'Schedules & Festivals', to: '/organization/schedules', icon: CalendarDays },
    { label: 'Analytics & Reports', to: '/organization/analytics', icon: BarChart3 },
    { label: 'Data Provenance', to: '/organization/data-sources', icon: Database },
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
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-200 ease-in-out border-r border-slate-800 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand */}
        <div className="px-6 py-5 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md shadow-emerald-900/40">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              EcoNexus
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Nashik
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Municipal Admin Portal</p>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
          <div className="px-3 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            Operations & Planning
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-white" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-sm bg-slate-800 text-emerald-300 border border-slate-700">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 text-xs text-slate-400">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-200">C++ DSA Engine Online</span>
          </div>
          <p className="text-xs text-slate-400">Nashik Municipal SWM • v2.1</p>
        </div>
      </aside>
    </>
  );
};
