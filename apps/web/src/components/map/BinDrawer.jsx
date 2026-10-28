import React from 'react';
import { X, Trash2, Clock, MapPin, Sparkles, CheckCircle, Info } from 'lucide-react';
import { ProvenanceBadge } from '../common/ProvenanceBadge.jsx';
import { Button } from '../common/Button.jsx';

export const BinDrawer = ({ bin, onClose }) => {
  if (!bin) return null;

  const fillPercent = Math.round(bin.currentFillPercentage || 0);
  let fillBarColor = 'bg-emerald-500';
  if (fillPercent >= 80) fillBarColor = 'bg-rose-500';
  else if (fillPercent >= 60) fillBarColor = 'bg-amber-500';

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white shadow-2xl border-l border-slate-200 flex flex-col transform transition-transform duration-300">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-slate-900">{bin.code}</span>
            <ProvenanceBadge provenance={bin.provenance} showIcon={false} />
          </div>
          <h4 className="text-sm font-semibold text-slate-700 mt-0.5">{bin.name}</h4>
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            {bin.ward?.name || bin.wardName || 'Nashik Ward'} • <span className="capitalize">{bin.areaCategory || 'Urban'}</span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Estimated Fill Gauge */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
            <span>Estimated Fill Level</span>
            <span className="text-sm font-bold text-slate-900">{fillPercent}%</span>
          </div>
          <div className="w-full bg-slate-200 h-3.5 rounded-full overflow-hidden">
            <div
              className={`h-full ${fillBarColor} transition-all duration-500 rounded-full`}
              style={{ width: `${Math.min(100, Math.max(0, fillPercent))}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>Overflow Threshold: 80%</span>
            <span>Horizon: 24h</span>
          </div>
        </div>

        {/* Prediction Stats Card */}
        <div className="space-y-2">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            Statistical Accumulation Prediction
          </h5>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-purple-50/60 p-3 rounded-lg border border-purple-100">
              <span className="text-slate-500 block">Expected Tomorrow</span>
              <span className="text-sm font-bold text-purple-900">
                ~{bin.predictedFillPercentage ? `${Math.round(bin.predictedFillPercentage)}%` : `${Math.min(100, fillPercent + 15)}%`}
              </span>
            </div>
            <div className="bg-purple-50/60 p-3 rounded-lg border border-purple-100">
              <span className="text-slate-500 block">Risk Status</span>
              <span className="text-sm font-bold text-purple-900 flex items-center gap-1">
                <Clock className="w-3 h-3 text-purple-700" />
                {fillPercent >= 80 ? 'High Risk' : fillPercent >= 60 ? 'Moderate' : 'Normal'}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 italic pt-1">
            Statistical prediction based on historical accumulation patterns. Not a physical sensor measurement.
          </p>
        </div>

        {/* Specifications */}
        <div className="space-y-2">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Asset Specifications
          </h5>
          <div className="space-y-2 text-xs bg-white rounded-xl border border-slate-100 p-3 divide-y divide-slate-100">
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Capacity</span>
              <span className="font-semibold text-slate-800">{bin.capacityLiters} Liters</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Waste Stream</span>
              <span className="font-semibold text-slate-800 capitalize">{bin.wasteType}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Area Category</span>
              <span className="font-semibold text-slate-800 capitalize">{bin.areaCategory}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Priority Score</span>
              <span className="font-bold text-emerald-700">{Math.round(bin.priorityScore || 0)} / 100</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Urgency Level</span>
              <span className="font-semibold uppercase text-slate-800">{bin.urgency || 'NORMAL'}</span>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="w-full justify-center">
            Close Inspector
          </Button>
        </div>
      </div>
    </div>
  );
};
