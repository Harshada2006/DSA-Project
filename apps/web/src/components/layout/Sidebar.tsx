import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  Trash2,
  Sparkles,
  ListOrdered,
  Route,
  AlertCircle,
  Truck,
  History,
  BarChart3,
  Database,
  Leaf,
  Cpu,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navItems = [
    { label: 'Overview', to: '/', icon: LayoutDashboard },
    { label: 'Live Map', to: '/map', icon: MapPin },
    { label: 'Bin Management', to: '/bins', icon: Trash2 },
    { label: 'Prediction Centre', to: '/predictions', icon: Sparkles },
    { label: 'Priority Queue (C++)', to: '/priority-tasks', icon: ListOrdered, badge: 'C++' },
    { label: 'Route Planner (C++)', to: '/routes', icon: Route, badge: 'DSA' },
    { label: 'Complaints', to: '/complaints', icon: AlertCircle },
    { label: 'Fleet & GPS', to: '/vehicles', icon: Truck },
    { label: 'Collection History', to: '/collections', icon: History },
    { label: 'Analytics & Reports', to: '/analytics', icon: BarChart3 },
    { label: 'Data Sources & Import', to: '/data-sources', icon: Database },
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
          <div className="w-9 h-9 rounded-xl bg-forest-600 flex items-center justify-center shadow-md shadow-forest-900/40">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              Eco Collect
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm bg-forest-500/20 text-forest-300 border border-forest-500/30">
                Nashik
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Smart Waste & Route Optimization</p>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Municipal Operations
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
                      ? 'bg-forest-600 text-white shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-white" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-sm bg-slate-800 text-forest-300 border border-slate-700">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Engine status footer */}
        <div className="p-3.5 mx-3 mb-4 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs">
          <div className="flex items-center justify-between font-semibold text-slate-200 mb-1">
            <span className="flex items-center gap-1.5 text-forest-400">
              <Cpu className="w-3.5 h-3.5" />
              C++ DSA Engine
            </span>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            Subprocess IPC active. Dijkstra & Priority Queue ready.
          </p>
        </div>
      </aside>
    </>
  );
};
