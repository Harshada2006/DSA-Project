import React from 'react';
import { Search, X } from 'lucide-react';

export const SearchInput = ({
  value,
  onChange,
  placeholder = 'Search...',
  onClear,
  className = '',
  id = 'search-input',
  ariaLabel = 'Search records',
}) => {
  return (
    <div className={`relative flex items-center w-full max-w-md ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
        <Search className="w-4 h-4" />
      </div>
      <input
        type="text"
        id={id}
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-9 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-xs"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            if (onClear) onClear();
            else onChange('');
          }}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
          aria-label="Clear search text"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
