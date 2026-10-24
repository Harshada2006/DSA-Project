import React, { useState } from 'react';
import { X, Trash2, Clock, MapPin, Sparkles, CheckCircle, Plus } from 'lucide-react';
import { ProvenanceBadge } from '../common/ProvenanceBadge.jsx';
import { Button } from '../common/Button.jsx';
import { api } from '../../api/client.js';

export const BinDrawer = ({ bin, onClose, onRefresh }) => {
  const [newFill, setNewFill] = useState(50);
  const [isRecording, setIsRecording] = useState(false);
  const [showObsModal, setShowObsModal] = useState(false);

  if (!bin) return null;

  const handleRecordObservation = async (e) => {
    e.preventDefault();
    setIsRecording(true);
    try {
      await api.recordObservation(bin.id, {
        fillPercentage: newFill,
        source: 'MANUAL_INSPECTION',
        provenance: 'VERIFIED_FIELD_OBSERVATION',
        notes: 'Recorded via live map inspector',
      });
      setShowObsModal(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsRecording(false);
    }
  };

  const fillPercent = bin.currentFillPercentage || 0;
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
            {bin.ward?.name || bin.wardName || 'Nashik Ward'} • {bin.latitude?.toFixed(4)}, {bin.longitude?.toFixed(4)}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Fill Gauge */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
            <span>Observed Fill Level</span>
            <span className="text-sm font-bold text-slate-900">{fillPercent}%</span>
          </div>
          <div className="w-full bg-slate-200 h-3.5 rounded-full overflow-hidden">
            <div
              className={`h-full ${fillBarColor} transition-all duration-500 rounded-full`}
              style={{ width: `${Math.min(100, Math.max(0, fillPercent))}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>Threshold: 80%</span>
            <span>
              {bin.lastObservedAt
                ? `Updated: ${new Date(bin.lastObservedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'No recent reading'}
            </span>
          </div>
        </div>

        {/* Prediction Stats */}
        <div className="space-y-2">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            AI Accumulation Prediction
          </h5>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-purple-50/60 p-3 rounded-lg border border-purple-100">
              <span className="text-slate-500 block">Est. In 24 Hours</span>
              <span className="text-sm font-bold text-purple-900">
                {bin.predictedFillPercentage ? `${bin.predictedFillPercentage}%` : `${Math.min(100, fillPercent + 18)}%`}
              </span>
            </div>
            <div className="bg-purple-50/60 p-3 rounded-lg border border-purple-100">
              <span className="text-slate-500 block">Time to Threshold</span>
              <span className="text-sm font-bold text-purple-900 flex items-center gap-1">
                <Clock className="w-3 h-3 text-purple-700" />
                {bin.timeToThresholdHours ? `${bin.timeToThresholdHours} hrs` : '~12.5 hrs'}
              </span>
            </div>
          </div>
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
              <span className="text-slate-500">Waste Classification</span>
              <span className="font-semibold text-slate-800 capitalize">{bin.wasteType}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Area Category</span>
              <span className="font-semibold text-slate-800 capitalize">{bin.areaCategory}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">C++ Priority Score</span>
              <span className="font-bold text-emerald-700">{bin.priorityScore || 0} / 100</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Urgency Level</span>
              <span className="font-semibold capitalize text-slate-800">{bin.urgency || 'NORMAL'}</span>
            </div>
          </div>
        </div>

        {/* Quick Observation Form */}
        {showObsModal ? (
          <form onSubmit={handleRecordObservation} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Record Field Observation</span>
              <button
                type="button"
                onClick={() => setShowObsModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                Cancel
              </button>
            </div>
            <div>
              <label className="text-xs text-slate-600 block mb-1">
                Observed Fullness Percentage: <span className="font-bold text-slate-900">{newFill}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={newFill}
                onChange={(e) => setNewFill(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-600"
              />
            </div>
            <Button type="submit" size="sm" variant="primary" isLoading={isRecording} className="w-full">
              Save Observation
            </Button>
          </form>
        ) : (
          <div className="space-y-2 pt-2">
            <Button
              onClick={() => setShowObsModal(true)}
              variant="outline"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              className="w-full justify-center"
            >
              Record New Fill Observation
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
