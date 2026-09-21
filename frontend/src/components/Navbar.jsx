import React from 'react';
import { useAuthStore } from '../store/authStore';
import { Shield, LogOut, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getDepartmentRoute, getDepartmentName } from '../utils/navigation';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleLogoClick = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate(getDepartmentRoute(user));
  };

  return (
    <header className="bg-slate-800/80 backdrop-blur border-b border-slate-700/80 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div
            className="flex items-center space-x-3 cursor-pointer select-none"
            onClick={handleLogoClick}
          >
            <div className="p-2 bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-lg shadow-md shadow-sky-500/20 text-white">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white tracking-tight flex items-center gap-2">
                Enterprise VPN
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-950 text-sky-400 border border-sky-800">
                  Micro-Segmented
                </span>
              </h1>
              <p className="text-xs text-slate-400">Zero-Trust Role-Based Gateway</p>
            </div>
          </div>

          {user && (
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-sm bg-slate-900/60 px-3 py-1.5 rounded-full border border-slate-700">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-slate-300 font-medium">{user.full_name}</span>
                <span className="text-slate-500">|</span>
                <span className="text-xs font-semibold text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800/50">
                  {user.role?.name || (user.is_admin ? 'Admin' : 'User')}
                </span>
                <span className="text-xs text-slate-400">({getDepartmentName(user)})</span>
              </div>

              <button
                onClick={() => navigate('/vpn-config')}
                className="hidden md:flex items-center space-x-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-700/60 hover:bg-slate-700 px-3 py-2 rounded-lg border border-slate-600/50 transition-colors"
                title="VPN Configuration & Tunnel Profile"
              >
                <KeyRound className="w-3.5 h-3.5 text-sky-400" />
                <span>VPN Config</span>
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center space-x-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-700/60 hover:bg-rose-900/40 hover:border-rose-700/60 px-3 py-2 rounded-lg border border-slate-600/50 transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4 text-slate-400 hover:text-rose-400" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
