import React, { useEffect, useState } from 'react';
import { vpnService } from '../../services/vpnService';
import {
  AlertTriangle,
  FileText,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  Loader2
} from 'lucide-react';

export default function LogsPage() {
  const [activeTab, setActiveTab] = useState('violations');
  const [violations, setViolations] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadLogs = async () => {
    try {
      setLoading(true);
      if (activeTab === 'violations') {
        const data = await vpnService.getViolations({ search: search || undefined });
        setViolations(data.items || data || []);
      } else {
        const data = await vpnService.getAuditLogs({ search: search || undefined });
        setAuditLogs(data.items || data || []);
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [activeTab, search]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-7 h-7 text-amber-400" />
            <span>Security Auditing & Violation Logs</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time packet inspection records, authentication audit trails, and zero-trust firewall blocks.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-700 pb-3">
        <button
          onClick={() => setActiveTab('violations')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'violations'
              ? 'bg-rose-950/60 text-rose-300 border border-rose-800 shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>Access Violations (nftables)</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'audit'
              ? 'bg-sky-950/60 text-sky-300 border border-sky-800 shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <FileText className="w-4 h-4 text-sky-400" />
          <span>System Audit Trail</span>
        </button>
      </div>

      {/* Content Table */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl overflow-hidden backdrop-blur shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
            <p className="text-xs">Fetching log records from database...</p>
          </div>
        ) : activeTab === 'violations' ? (
          violations.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p className="text-sm">No access violations recorded. Clean network segment enforcement.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-700">
                  <tr>
                    <th className="px-5 py-3.5">Timestamp</th>
                    <th className="px-5 py-3.5">User / VPN IP</th>
                    <th className="px-5 py-3.5">Blocked Target</th>
                    <th className="px-5 py-3.5">Violation Type</th>
                    <th className="px-5 py-3.5">nftables Enforcement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {violations.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-4 text-slate-400 font-mono text-[11px]">
                        {new Date(v.created_at).toLocaleString()}
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-semibold text-white text-sm">
                          {v.user?.username || 'Unknown'}
                        </div>
                        <span className="font-mono text-xs text-sky-400">
                          {v.vpn_client_ip || '10.10.0.x'}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-mono text-rose-300">
                        {v.destination_ip}:{v.destination_port} ({v.protocol})
                      </td>

                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-800 text-rose-300 font-mono text-[11px]">
                          {v.violation_type}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-semibold text-rose-400 block text-xs">
                          {v.action_taken || 'DROP'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono block mt-0.5 truncate max-w-xs" title={v.nftables_rule_matched}>
                          {v.nftables_rule_matched || 'forward chain policy drop'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : auditLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-sm">No audit logs found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-700">
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5">Event Type</th>
                  <th className="px-5 py-3.5">Severity</th>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-5 py-3.5">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-5 py-4 text-slate-400 font-mono text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>

                    <td className="px-5 py-4 font-mono font-semibold text-white">
                      {log.event_type}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.severity === 'CRITICAL' || log.severity === 'HIGH'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : log.severity === 'WARNING'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : 'bg-sky-950 text-sky-400 border border-sky-800'
                        }`}
                      >
                        {log.severity}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      {log.user?.username || 'System'}
                    </td>

                    <td className="px-5 py-4 text-slate-300 max-w-md">
                      {log.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
