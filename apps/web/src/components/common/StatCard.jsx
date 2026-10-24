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
    forest: 'bg-emerald-100 text-emerald-800',
    emerald: 'bg-emerald-100 text-emerald-800',
    amber: 'bg-amber-100 text-amber-800',
    rose: 'bg-rose-100 text-rose-800',
    blue: 'bg-sky-100 text-sky-800',
    purple: 'bg-purple-100 text-purple-800',
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
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {value}
          </div>
        </div>
        <div className={`p-2.5 rounded-xl ${iconBgMap[variant] || iconBgMap.forest}`}>
          {renderIcon()}
        </div>
      </div>
      {(subtitle || trend) && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>{subtitle}</span>
          {trend && (
            <span
              className={`font-semibold flex items-center ${
                trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
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
