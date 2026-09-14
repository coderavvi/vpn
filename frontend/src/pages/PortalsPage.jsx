import React, { useState } from 'react';
import { vpnService } from '../services/vpnService';
import { useAuthStore } from '../store/authStore';
import {
  Layers,
  CheckCircle2,
  AlertOctagon,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ExternalLink,
  Lock,
  ArrowRight
} from 'lucide-react';

export default function PortalsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('hr');
  const [portalData, setPortalData] = useState(null);
  const [errorData, setErrorData] = useState(null);
  const [loading, setLoading] = useState(false);

  const portals = [
    {
      id: 'hr',
      title: 'Human Resources Portal',
      segment: 'hr-ns',
      subnet: '10.20.10.0/24',
      ip: '10.20.10.2',
      port: 9001,
      description: 'Employee Directory, Payroll Overview, and Benefits Administration',
    },
    {
      id: 'finance',
      title: 'Finance & Accounts Portal',
      segment: 'finance-ns',
      subnet: '10.20.20.0/24',
      ip: '10.20.20.2',
      port: 9002,
      description: 'Accounts Payable, General Ledger, and Executive Financial Reports',
    },
    {
      id: 'it',
      title: 'IT Operations Portal',
      segment: 'it-ns',
      subnet: '10.20.30.0/24',
      ip: '10.20.30.2',
      port: 9003,
      description: 'Infrastructure Topology, DNS Servers, and Network Firewall Diagnostics',
    },
  ];

  const handleTestAccess = async (dept) => {
    setActiveTab(dept);
    setLoading(true);
    setPortalData(null);
    setErrorData(null);

    try {
      const data = await vpnService.getPortal(dept);
      setPortalData(data);
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Access blocked.';
      setErrorData({
        status: err.response?.status || 403,
        detail,
        dept,
      });
    } finally {
      setLoading(false);
    }
  };

  const currentPortal = portals.find((p) => p.id === activeTab);
  const allowedSegments = user?.role?.allowed_segments || [];
  const isAdmin = user?.is_admin || user?.role?.name?.toLowerCase() === 'admin';
  const isAllowed = isAdmin || allowedSegments.includes(currentPortal?.segment);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Layers className="w-7 h-7 text-sky-400" />
          <span>Departmental Micro-Segment Portals</span>
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Zero-Trust network architecture enforces packet filtering at the nftables kernel firewall.
          Only users whose cryptographic role permits access can query each micro-segment.
        </p>
      </div>

      {/* Portal Selection Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {portals.map((p) => {
          const tabAllowed = isAdmin || allowedSegments.includes(p.segment);
          const isSelected = activeTab === p.id;

          return (
            <button
              key={p.id}
              onClick={() => handleTestAccess(p.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-slate-800 border-sky-500/80 shadow-lg shadow-sky-500/10'
                  : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                  {p.segment}
                </span>
                {tabAllowed ? (
                  <span className="flex items-center space-x-1 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Permitted</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 text-xs font-semibold text-rose-400">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Restricted</span>
                  </span>
                )}
              </div>
              <h4 className="font-semibold text-white text-sm">{p.title}</h4>
              <p className="text-xs text-slate-400 mt-1 font-mono">{p.ip}:{p.port}</p>
            </button>
          );
        })}
      </div>

      {/* Live Portal View / Security Demonstration Box */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 backdrop-blur">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-700/80 gap-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>{currentPortal?.title}</span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                {currentPortal?.ip}:{currentPortal?.port}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{currentPortal?.description}</p>
          </div>

          <button
            onClick={() => handleTestAccess(activeTab)}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Querying Segment...</span>
              </>
            ) : (
              <>
                <span>Send Packet / Test Access</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Results Window */}
        <div className="mt-6">
          {loading && (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
              <p className="text-sm">Traversing WireGuard tunnel to {currentPortal?.ip}...</p>
            </div>
          )}

          {!loading && portalData && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-start space-x-3 text-emerald-300">
                <ShieldCheck className="w-6 h-6 flex-shrink-0 text-emerald-400 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-emerald-200">
                    Access Authorized & Granted
                  </h4>
                  <p className="text-xs text-emerald-300/80 mt-1">
                    Your role (<strong className="text-white">{portalData.role}</strong>) matches the allowed
                    micro-segment policy for <code className="font-mono text-emerald-200">{portalData.segment}</code>.
                    Packet forwarded successfully.
                  </p>
                </div>
              </div>

              {/* Department Data Render */}
              <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Live Portal Payload ({portalData.department})
                  </h5>
                  <span className="text-xs font-mono text-emerald-400">HTTP 200 OK</span>
                </div>
                <pre className="text-xs font-mono text-slate-200 bg-slate-950 p-4 rounded-lg overflow-x-auto border border-slate-800">
                  {JSON.stringify(portalData.data, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {!loading && errorData && (
            <div className="space-y-6">
              <div className="p-5 rounded-xl bg-rose-950/50 border border-rose-800/80 flex items-start space-x-4 text-rose-300 shadow-xl shadow-rose-950/20">
                <ShieldAlert className="w-7 h-7 flex-shrink-0 text-rose-400 mt-0.5" />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-base text-rose-200">
                      Zero-Trust Micro-Segmentation Violation!
                    </h4>
                    <span className="px-2 py-0.5 rounded bg-rose-900 text-rose-200 font-mono text-xs">
                      HTTP 403 Forbidden
                    </span>
                  </div>
                  <p className="text-sm text-rose-300/90 leading-relaxed">
                    {errorData.detail}
                  </p>
                  <div className="p-3 bg-rose-950/80 rounded-lg border border-rose-900 text-xs font-mono text-rose-200">
                    <p className="font-bold text-rose-100 mb-1">Defense-in-Depth Enforcement Action:</p>
                    <p>1. Forwarding dropped by nftables policy: <span className="text-amber-300">ip saddr != @{errorData.dept}_users drop</span></p>
                    <p>2. Security incident logged to <span className="text-amber-300">access_violations</span> database table</p>
                    <p>3. Telemetry available in Admin Security Logs view</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && !portalData && !errorData && (
            <div className="p-12 text-center text-slate-400">
              <p className="text-sm">Click "Send Packet / Test Access" to query this department micro-segment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
