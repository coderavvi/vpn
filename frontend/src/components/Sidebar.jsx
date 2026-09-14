import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  LayoutDashboard,
  Layers,
  KeyRound,
  Users,
  ShieldCheck,
  Radio,
  Timer,
  AlertTriangle,
  FolderLock
} from 'lucide-react';

export default function Sidebar() {
  const { user } = useAuthStore();
  const isAdmin = user?.is_admin || user?.role?.name?.toLowerCase() === 'admin';

  const baseLinks = [
    { to: '/', label: 'Overview Dashboard', icon: LayoutDashboard },
    { to: '/portals', label: 'Department Portals', icon: Layers },
    { to: '/vpn-config', label: 'My VPN Config', icon: KeyRound },
  ];

  const adminLinks = [
    { to: '/admin/users', label: 'User Directory', icon: Users },
    { to: '/admin/roles', label: 'Roles & Micro-Segments', icon: ShieldCheck },
    { to: '/admin/wireguard', label: 'WireGuard Telemetry', icon: Radio },
    { to: '/admin/sessions', label: 'Active VPN Sessions', icon: Timer },
    { to: '/admin/logs', label: 'Audit & Violations', icon: AlertTriangle },
  ];

  return (
    <aside className="w-64 bg-slate-800/40 border-r border-slate-700/60 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between">
      <div className="space-y-6">
        <div>
          <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Main Portal
          </p>
          <nav className="space-y-1">
            {baseLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-sky-600/20 text-sky-400 border border-sky-500/40 font-semibold'
                        : 'text-slate-300 hover:bg-slate-700/40 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {isAdmin && (
          <div>
            <div className="flex items-center px-3 mb-2 space-x-1.5 text-xs font-semibold text-amber-400/90 uppercase tracking-wider">
              <FolderLock className="w-3.5 h-3.5" />
              <span>Admin Management</span>
            </div>
            <nav className="space-y-1">
              {adminLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                          : 'text-slate-300 hover:bg-slate-700/40 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700/70 text-xs text-slate-400">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-slate-300">Gateway:</span>
          <span className="font-mono text-emerald-400">10.10.0.1</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-300">Interface:</span>
          <span className="font-mono text-sky-400">wg0 (UDP 51820)</span>
        </div>
      </div>
    </aside>
  );
}
