import React, { useEffect, useState } from 'react';
import { vpnService } from '../../services/vpnService';
import {
  Timer,
  RefreshCw,
  PowerOff,
  User,
  Activity,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await vpnService.getSessions();
      setSessions(data.items || data || []);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleDisconnect = async (sessionId) => {
    if (!confirm('Force disconnect this VPN tunnel session?')) return;
    try {
      await vpnService.disconnectSession(sessionId);
      loadSessions();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to disconnect session');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Timer className="w-7 h-7 text-sky-400" />
            <span>VPN Tunnel Sessions</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Monitor real-time user connections, durations, and session terminations.
          </p>
        </div>

        <button
          onClick={loadSessions}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Sessions Table */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl overflow-hidden backdrop-blur shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
            <p className="text-xs">Loading sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-sm">No active or historical VPN sessions recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-700">
                <tr>
                  <th className="px-5 py-3.5">Session User</th>
                  <th className="px-5 py-3.5">Client Real IP</th>
                  <th className="px-5 py-3.5">Assigned VPN IP</th>
                  <th className="px-5 py-3.5">Start Time</th>
                  <th className="px-5 py-3.5">Status / Reason</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {sessions.map((sess) => (
                  <tr key={sess.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white text-sm">{sess.user?.username || 'Unknown'}</div>
                      <div className="text-slate-400 text-[11px]">{sess.user?.email}</div>
                    </td>

                    <td className="px-5 py-4 font-mono text-slate-300">
                      {sess.client_real_ip || '127.0.0.1'}
                    </td>

                    <td className="px-5 py-4">
                      <span className="font-mono text-emerald-400 px-2 py-1 rounded bg-slate-900 border border-slate-700">
                        {sess.assigned_vpn_ip || '10.10.0.x'}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-400">
                      {sess.session_start ? new Date(sess.session_start).toLocaleString() : 'N/A'}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                          sess.is_active
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                            : 'bg-slate-900 text-slate-400 border border-slate-800'
                        }`}
                      >
                        {sess.is_active ? 'Active' : `Ended (${sess.disconnect_reason || 'Normal'})`}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      {sess.is_active && (
                        <button
                          onClick={() => handleDisconnect(sess.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-[11px] font-semibold transition-colors"
                        >
                          Disconnect
                        </button>
                      )}
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
