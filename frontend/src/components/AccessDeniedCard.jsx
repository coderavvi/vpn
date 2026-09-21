import React, { useEffect } from 'react';
import { ShieldAlert, ArrowLeft, Lock, KeyRound, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getDepartmentRoute, getDepartmentName } from '../utils/navigation';
import { vpnService } from '../services/vpnService';

export default function AccessDeniedCard({
  targetDepartment = 'Department Resource',
  targetSegment = 'unknown-ns',
  targetIp = '10.20.0.0',
  errorMessage = '',
  deptKey = null,
}) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const myDeptRoute = getDepartmentRoute(user);
  const myDeptName = getDepartmentName(user);
  const isAdmin = user?.is_admin || user?.role?.name?.toLowerCase() === 'admin';

  // Automatically trigger portal query if deptKey is supplied so backend logs violation
  useEffect(() => {
    if (deptKey && !isAdmin) {
      vpnService.getPortal(deptKey).catch(() => {
        // Expected 403 error which logs AccessViolation in PostgreSQL
      });
    }
  }, [deptKey, isAdmin]);

  return (
    <div className="max-w-3xl mx-auto my-8 p-8 bg-slate-800/90 border border-rose-500/40 rounded-2xl shadow-2xl backdrop-blur">
      <div className="flex items-start space-x-5">
        <div className="p-4 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/30 flex-shrink-0">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2 text-rose-400 font-mono text-xs uppercase tracking-wider mb-1">
            <Lock className="w-3.5 h-3.5" />
            <span>HTTP 403 Forbidden • nftables drop</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Micro-Segmentation Access Denied
          </h2>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Your authenticated role (<span className="text-sky-400 font-semibold">{user?.role?.name || 'User'}</span> in{' '}
            <span className="text-emerald-400 font-semibold">{user?.department || 'Department'}</span>) does not possess cryptographic authorization to access the{' '}
            <span className="text-white font-semibold">{targetDepartment}</span> micro-segment.
          </p>

          <div className="mt-5 p-4 bg-slate-900/90 rounded-xl border border-slate-700/80 font-mono text-xs space-y-2 text-slate-400">
            <div className="flex justify-between">
              <span>Target Micro-Segment:</span>
              <span className="text-rose-300 font-semibold">{targetSegment}</span>
            </div>
            <div className="flex justify-between">
              <span>Target Resource Address:</span>
              <span className="text-rose-300 font-semibold">{targetIp}</span>
            </div>
            <div className="flex justify-between">
              <span>Enforcement Layer:</span>
              <span className="text-amber-300">Linux nftables + FastAPI RBAC</span>
            </div>
            <div className="flex justify-between">
              <span>Security Telemetry:</span>
              <span className="text-rose-400">ACCESS_VIOLATION event logged to audit database</span>
            </div>
          </div>

          {errorMessage && (
            <p className="mt-3 text-xs text-rose-400/90 italic bg-rose-950/40 p-2.5 rounded-lg border border-rose-900/50">
              {errorMessage}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate(myDeptRoute)}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-sky-500/20"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go to My Department ({myDeptName})</span>
            </button>

            <button
              onClick={() => navigate('/vpn-config')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-slate-700/60 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-colors border border-slate-600/60"
            >
              <KeyRound className="w-4 h-4 text-sky-400" />
              <span>My VPN Config</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => navigate('/portals')}
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-slate-700/60 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-colors border border-slate-600/60"
              >
                <Layers className="w-4 h-4 text-slate-400" />
                <span>View All Department Portals</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
