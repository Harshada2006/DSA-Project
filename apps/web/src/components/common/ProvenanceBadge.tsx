import React from 'react';
import { ProvenanceType } from '@eco-collect/shared';
import { CheckCircle2, Database, Sparkles, AlertTriangle, HelpCircle } from 'lucide-react';

interface ProvenanceBadgeProps {
  provenance?: ProvenanceType | string;
  showIcon?: boolean;
  className?: string;
}

export const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({
  provenance = 'observed',
  showIcon = true,
  className = '',
}) => {
  switch (provenance) {
    case 'observed':
      return (
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 ${className}`}
          title="Verified observation recorded in the field by municipal sensors or staff"
        >
          {showIcon && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
          VERIFIED RECORD
        </span>
      );

    case 'imported':
      return (
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-300 ${className}`}
          title="Imported from municipal CSV registry or government open data"
        >
          {showIcon && <Database className="w-3 h-3 text-sky-600" />}
          IMPORTED DATA
        </span>
      );

    case 'predicted':
      return (
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-300 ${className}`}
          title="Machine Learning regression or baseline statistical estimation"
        >
          {showIcon && <Sparkles className="w-3 h-3 text-purple-600" />}
          ML PREDICTION
        </span>
      );

    case 'inferred':
      return (
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 ${className}`}
          title="Inferred based on area historical accumulation rate"
        >
          {showIcon && <HelpCircle className="w-3 h-3 text-amber-600" />}
          INFERRED ESTIMATE
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
