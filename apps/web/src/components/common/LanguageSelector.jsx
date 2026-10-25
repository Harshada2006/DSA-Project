import React from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { Languages } from 'lucide-react';

export const LanguageSelector = ({ variant = 'default' }) => {
  const { lang, changeLanguage } = useLanguage();

  const options = [
    { code: 'en', label: 'English', short: 'EN' },
    { code: 'mr', label: 'मराठी', short: 'मरा' },
    { code: 'hi', label: 'हिंदी', short: 'हिं' },
  ];

  if (variant === 'compact') {
    return (
      <div className="flex items-center rounded-lg border border-slate-200 bg-white/80 p-0.5 text-xs font-semibold shadow-xs">
        {options.map((opt) => (
          <button
            key={opt.code}
            onClick={() => changeLanguage(opt.code)}
            className={`px-2 py-1 rounded-md transition-all ${
              lang === opt.code
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title={opt.label}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 shadow-xs">
      <Languages className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
      <select
        value={lang}
        onChange={(e) => changeLanguage(e.target.value)}
        className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer pr-1"
        aria-label="Select Language"
      >
        <option value="en">English (EN)</option>
        <option value="mr">मराठी (Marathi)</option>
        <option value="hi">हिंदी (Hindi)</option>
      </select>
    </div>
  );
};
