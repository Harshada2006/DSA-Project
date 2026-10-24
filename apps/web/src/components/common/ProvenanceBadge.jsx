import React from 'react';
import { CheckCircle2, Database, Sparkles, AlertTriangle, HelpCircle } from 'lucide-react';

export const ProvenanceBadge = ({
  provenance = 'observed',
  showIcon = true,
  className = '',
}) => {
  switch (provenance) {
    case 'observed':
      return (
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 ${className}`}
          title="Verified observation recorded in the field by municipal staff"
        >
          {showIcon && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
          VERIFIED RECORD
        </span>
      );

    case 'imported':
      return (
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-300 ${className}`}
          title="Imported from official municipal registry or government open data"
        >
          {showIcon && <Database className="w-3 h-3 text-sky-600" />}
          GOVT / MPCB DATA
        </span>
      );

    case 'predicted':
      return (
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-300 ${className}`}
          title="Sensor-free heuristic rate estimation with decay"
        >
          {showIcon && <Sparkles className="w-3 h-3 text-purple-600" />}
          ESTIMATE
        </span>
      );

    case 'inferred':
      return (
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 ${className}`}
          title="Inferred based on area historical accumulation rate"
        >
          {showIcon && <HelpCircle className="w-3 h-3 text-amber-600" />}
          INFERRED
        </span>
      );

    case 'synthetic':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-400 ${className}`}
          title="Synthetic sample data generated for demonstration purposes"
        >
          {showIcon && <AlertTriangle className="w-3 h-3 text-amber-700" />}
          DEMO SYNTHETIC
        </span>
      );
  }
};
