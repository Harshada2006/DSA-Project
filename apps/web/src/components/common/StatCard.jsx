import React from 'react';

export const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'forest',
  trend,
}) => {
  const iconBgMap = {
    forest: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300',
    emerald: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300',
    amber: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300',
    rose: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300',
    blue: 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300',
    purple: 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300',
  };

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === 'function') {
      const IconComponent = icon;
      return <IconComponent className="w-5 h-5" />;
    }
    return icon;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {value}
          </div>
        </div>
        <div className={`p-2.5 rounded-xl ${iconBgMap[variant] || iconBgMap.forest}`}>
          {renderIcon()}
        </div>
      </div>
      {(subtitle || trend) && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span>{subtitle}</span>
          {trend && (
            <span
              className={`font-semibold flex items-center ${
                trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {trend.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
