import React from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { Languages } from 'lucide-react';

export const LanguageSelector = ({ variant = 'default' }) => {
  const { lang, changeLanguage } = useLanguage();

  const options = [
    { code: 'en', label: 'English', native: 'English', short: 'EN' },
    { code: 'mr', label: 'मराठी', native: 'मराठी', short: 'मरा' },
    { code: 'hi', label: 'हिंदी', native: 'हिंदी', short: 'हिं' },
  ];

  if (variant === 'compact') {
    return (
      <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 text-xs font-semibold shadow-xs">
        {options.map((opt) => (
          <button
            key={opt.code}
            type="button"
            onClick={() => changeLanguage(opt.code)}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              lang === opt.code
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
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
    <div className="relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-xs hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors">
      <Languages className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
      <select
        value={lang}
        onChange={(e) => changeLanguage(e.target.value)}
        className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none cursor-pointer pr-1 focus:ring-0"
        aria-label="Select Language / भाषा निवडा / भाषा चुनें"
      >
        <option value="en" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
          English (EN)
        </option>
        <option value="mr" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
          मराठी (Marathi)
        </option>
        <option value="hi" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
          हिंदी (Hindi)
        </option>
      </select>
    </div>
  );
};
