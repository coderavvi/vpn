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
  FolderLock,
  Landmark,
  Server,
  Building2,
  Shield
} from 'lucide-react';

export default function Sidebar() {
  const { user } = useAuthStore();
  const isAdmin = user?.is_admin || user?.role?.name?.toLowerCase() === 'admin';
  const roleName = (user?.role?.name || '').toLowerCase();
  const allowedSegments = user?.role?.allowed_segments || [];

  const isHR = allowedSegments.includes('hr-ns') || roleName === 'hr' || (user?.department || '').toLowerCase().includes('hr');
  const isFinance = allowedSegments.includes('finance-ns') || roleName === 'finance' || (user?.department || '').toLowerCase().includes('fin');
  const isIT = allowedSegments.includes('it-ns') || roleName === 'it' || (user?.department || '').toLowerCase().includes('it');

  // Admin Links
  const adminBaseLinks = [
    { to: '/', label: 'Overview Dashboard', icon: LayoutDashboard },
    { to: '/portals', label: 'Department Portals', icon: Layers },
    { to: '/departments/hr', label: 'HR Portal (10.20.10.2)', icon: Users },
    { to: '/departments/finance', label: 'Finance Portal (10.20.20.2)', icon: Landmark },
    { to: '/departments/it', label: 'IT Ops Portal (10.20.30.2)', icon: Server },
    { to: '/vpn-config', label: 'My VPN Config', icon: KeyRound },
  ];

  const adminManagementLinks = [
    { to: '/admin/users', label: 'User Directory', icon: Users },
    { to: '/admin/roles', label: 'Roles & Micro-Segments', icon: ShieldCheck },
    { to: '/admin/wireguard', label: 'WireGuard Telemetry', icon: Radio },
    { to: '/admin/sessions', label: 'Active VPN Sessions', icon: Timer },
    { to: '/admin/logs', label: 'Audit & Violations', icon: AlertTriangle },
  ];

  // Role-Specific Navigation Links (Completely Isolated)
  let userWorkspaceTitle = 'My Workspace';
  let userWorkspaceLinks = [];
  let userSegmentLabel = '10.10.0.0/24';
  let userNamespace = 'wg0-client';

  if (!isAdmin) {
    if (isHR) {
      userWorkspaceTitle = 'Human Resources Portal';
      userSegmentLabel = '10.20.10.0/24 (Port 9001)';
      userNamespace = 'hr-ns';
      userWorkspaceLinks = [
        { to: '/departments/hr', label: 'HR Portal', icon: Building2 },
        { to: '/vpn-config', label: 'My VPN Config', icon: KeyRound },
      ];
    } else if (isFinance) {
      userWorkspaceTitle = 'Finance & Accounting';
      userSegmentLabel = '10.20.20.0/24 (Port 9002)';
      userNamespace = 'finance-ns';
      userWorkspaceLinks = [
        { to: '/departments/finance', label: 'Finance Portal', icon: Landmark },
        { to: '/vpn-config', label: 'My VPN Config', icon: KeyRound },
      ];
    } else if (isIT) {
      userWorkspaceTitle = 'IT Operations Center';
      userSegmentLabel = '10.20.30.0/24 (Port 9003)';
      userNamespace = 'it-ns';
      userWorkspaceLinks = [
        { to: '/departments/it', label: 'IT Operations Portal', icon: Server },
        { to: '/vpn-config', label: 'My VPN Config', icon: KeyRound },
      ];
    } else {
      userWorkspaceTitle = 'Enterprise Portal';
      userWorkspaceLinks = [
        { to: '/vpn-config', label: 'My VPN Config', icon: KeyRound },
      ];
    }
  }

  return (
    <aside className="w-64 bg-slate-800/40 border-r border-slate-700/60 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between">
      <div className="space-y-6">
        {/* Admin Navigation View */}
        {isAdmin && (
          <>
            <div>
              <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Enterprise Portals
              </p>
              <nav className="space-y-1">
                {adminBaseLinks.map((item) => {
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

            <div>
              <div className="flex items-center px-3 mb-2 space-x-1.5 text-xs font-semibold text-amber-400/90 uppercase tracking-wider">
                <FolderLock className="w-3.5 h-3.5" />
                <span>Admin Management</span>
              </div>
              <nav className="space-y-1">
                {adminManagementLinks.map((item) => {
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
          </>
        )}

        {/* Non-Admin Role-Specific View (No other department views revealed) */}
        {!isAdmin && (
          <div>
            <div className="flex items-center px-3 mb-2 space-x-1.5 text-xs font-semibold text-sky-400 uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5" />
              <span>{userWorkspaceTitle}</span>
            </div>
            <nav className="space-y-1">
              {userWorkspaceLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
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
        )}
      </div>

      {/* Bottom Gateway & Micro-Segment Indicator */}
      <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700/70 text-xs text-slate-400 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-300">Gateway:</span>
          <span className="font-mono text-emerald-400">10.10.0.1</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-300">Interface:</span>
          <span className="font-mono text-sky-400">wg0 (UDP 51820)</span>
        </div>
        {!isAdmin && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-800">
            <span className="font-semibold text-slate-300">Segment:</span>
            <span className="font-mono text-amber-300">{userNamespace}</span>
          </div>
        )}
      </div>
    </aside>
  );
}
