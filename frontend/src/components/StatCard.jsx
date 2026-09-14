import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'sky' }) {
  const colorMap = {
    sky: 'from-sky-500/10 to-sky-600/5 border-sky-500/20 text-sky-400',
    emerald: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-400',
    amber: 'from-amber-500/10 to-amber-600/5 border-amber-500/20 text-amber-400',
    rose: 'from-rose-500/10 to-rose-600/5 border-rose-500/20 text-rose-400',
    indigo: 'from-indigo-500/10 to-indigo-600/5 border-indigo-500/20 text-indigo-400',
  };

  const badgeColor = {
    sky: 'bg-sky-500/20 text-sky-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/20 text-amber-400',
    rose: 'bg-rose-500/20 text-rose-400',
    indigo: 'bg-indigo-500/20 text-indigo-400',
  };

  return (
    <div className={`p-5 rounded-2xl bg-gradient-to-br ${colorMap[color] || colorMap.sky} border bg-slate-800/40 backdrop-blur`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className={`p-2 rounded-xl ${badgeColor[color] || badgeColor.sky}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="mt-3">
        <span className="text-3xl font-bold text-white tracking-tight">{value}</span>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
