import React, { useState, useEffect } from 'react';
import { Menu, Play, Pause, Activity, Cpu } from 'lucide-react';
import { api } from '../../api/client';
import { Badge } from '../common/Badge';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const [timeStr, setTimeStr] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [cppStatus, setCppStatus] = useState<'checking' | 'healthy' | 'error'>('checking');

  // Clock
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

  // Check C++ Engine Health and Simulation status on load
  useEffect(() => {
    api
      .getCppHealth()
      .then((res) => {
        if (res?.data?.status === 'healthy') setCppStatus('healthy');
        else setCppStatus('error');
      })
      .catch(() => setCppStatus('error'));

    api
      .getSimulationStatus()
      .then((res) => setIsSimulating(res?.isRunning || false))
      .catch(() => {});
  }, []);

  const handleToggleSimulation = async () => {
    setSimLoading(true);
    try {
      const res = await api.toggleSimulation(!isSimulating);
      setIsSimulating(res.isRunning);
    } catch (err: any) {
      alert(`Simulation error: ${err.message}`);
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200/90 h-16 px-4 lg:px-8 flex items-center justify-between">
      {/* Left: Mobile Toggle & Page Info */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
            Nashik Municipal Operations
            <span className="hidden sm:inline-block text-xs font-normal text-slate-500">
              | Nashik, Maharashtra
            </span>
          </h1>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Simulation Control Switch */}
        <div className="flex items-center gap-2 bg-slate-100/90 p-1 rounded-lg border border-slate-200/80">
          <div className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold">
            {isSimulating ? (
              <Badge variant="warning" size="sm" className="animate-pulse">
                SIMULATION ACTIVE
              </Badge>
            ) : (
              <Badge variant="default" size="sm">
                REAL GPS READY
              </Badge>
            )}
          </div>
          <button
            onClick={handleToggleSimulation}
            disabled={simLoading}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md transition-colors ${
              isSimulating
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-forest-700 hover:bg-forest-800 text-white'
            }`}
            title="Toggle simulated GPS vehicle movement"
          >
            {isSimulating ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Sim</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Start Sim</span>
              </>
            )}
          </button>
        </div>

        {/* C++ DSA Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
          <Cpu className="w-3.5 h-3.5 text-forest-600" />
          <span>C++ DSA:</span>
          {cppStatus === 'healthy' ? (
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Active
            </span>
          ) : (
            <span className="text-rose-600 font-semibold">Offline</span>
          )}
        </div>

        {/* Live IST Time */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs font-mono font-medium text-slate-600 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200">
          <Activity className="w-3.5 h-3.5 text-forest-600" />
          <span>IST: {timeStr}</span>
        </div>

        {/* User Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-forest-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            NMC
          </div>
          <div className="hidden xl:block text-left leading-tight">
            <div className="text-xs font-semibold text-slate-800">Administrator</div>
            <div className="text-[10px] text-slate-500">Solid Waste Dept</div>
          </div>
        </div>
      </div>
    </header>
  );
};
