import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Shield, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('admin@vpn.local');
  const [password, setPassword] = useState('Admin@123!');
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    const res = await login(username, password);
    if (res.success) {
      navigate(from, { replace: true });
    }
  };

  const handleQuickLogin = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-2xl shadow-xl shadow-sky-500/20 text-white mb-4">
            <Shield className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Secure Enterprise VPN</h1>
          <p className="text-sm text-slate-400 mt-1">Role-Based Micro-Segmentation Gateway</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-8 backdrop-blur shadow-2xl">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-3 text-sm text-rose-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Authentication Failed</p>
                <p className="text-xs text-rose-300/90 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
                  placeholder="admin@vpn.local"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-sky-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <span>{isLoading ? 'Verifying Credentials...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="mt-8 pt-6 border-t border-slate-700/60">
            <p className="text-xs text-slate-400 text-center mb-3">Quick Demo Credentials:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@vpn.local', 'Admin@123!')}
                className="p-2 bg-slate-900/60 hover:bg-slate-700/60 border border-slate-700 rounded-lg text-slate-300 text-left transition-colors"
              >
                <span className="font-semibold text-sky-400 block">Admin User</span>
                <span className="text-slate-500 text-[10px]">admin@vpn.local</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('portal_hr_user', 'Password123!')}
                className="p-2 bg-slate-900/60 hover:bg-slate-700/60 border border-slate-700 rounded-lg text-slate-300 text-left transition-colors"
              >
                <span className="font-semibold text-emerald-400 block">HR User</span>
                <span className="text-slate-500 text-[10px]">portal_hr_user</span>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Account lockout enforced after 5 consecutive failed attempts.
        </p>
      </div>
    </div>
  );
}
