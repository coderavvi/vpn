import React, { useEffect, useState } from 'react';
import { vpnService } from '../../services/vpnService';
import {
  Radio,
  RefreshCw,
  Server,
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,
  Trash2,
  CheckCircle,
  Clock,
  Loader2
} from 'lucide-react';

export default function WireGuardPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStatus = async () => {
    try {
      setRefreshing(true);
      const data = await vpnService.getWireGuardStatus();
      setStatus(data);
    } catch (err) {
      console.error('Failed to load WireGuard telemetry:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 15000); // 15s poll
    return () => clearInterval(interval);
  }, []);

  const handleRemovePeer = async (userId, username) => {
    if (!confirm(`Revoke WireGuard peer for user '${username}'?`)) return;
    try {
      await vpnService.removePeer(userId);
      loadStatus();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to remove peer');
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Radio className="w-7 h-7 text-sky-400" />
            <span>WireGuard VPN Gateway Telemetry</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time tunnel statistics, handshakes, and cryptographic peer monitoring.
          </p>
        </div>

        <button
          onClick={loadStatus}
          disabled={refreshing}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-sky-400' : ''}`} />
          <span>Refresh Live</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
          <p className="text-xs">Querying WireGuard kernel interface...</p>
        </div>
      ) : status ? (
        <>
          {/* Server Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80">
              <span className="text-xs text-slate-400 font-semibold uppercase">Interface</span>
              <div className="text-lg font-bold text-white font-mono mt-1">{status.interface}</div>
              <span className="text-[11px] text-emerald-400">Kernel Module Active</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80">
              <span className="text-xs text-slate-400 font-semibold uppercase">Gateway IP / Port</span>
              <div className="text-lg font-bold text-white font-mono mt-1">
                {status.server_ip} : {status.port}
              </div>
              <span className="text-[11px] text-slate-400">UDP Listening Socket</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80">
              <span className="text-xs text-slate-400 font-semibold uppercase">Active Handshakes</span>
              <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
                {status.active_peers_count} / {status.peers.length}
              </div>
              <span className="text-[11px] text-slate-400">Online peers</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80">
              <span className="text-xs text-slate-400 font-semibold uppercase">Server Public Key</span>
              <div className="text-xs font-bold text-sky-400 font-mono truncate mt-1" title={status.public_key}>
                {status.public_key}
              </div>
              <span className="text-[11px] text-slate-400">Curve25519</span>
            </div>
          </div>

          {/* Peers Table */}
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl overflow-hidden backdrop-blur shadow-xl">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Configured WireGuard Peers ({status.peers.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-700">
                  <tr>
                    <th className="px-5 py-3.5">User / Peer Identity</th>
                    <th className="px-5 py-3.5">Assigned VPN IP</th>
                    <th className="px-5 py-3.5">Tunnel Status</th>
                    <th className="px-5 py-3.5">Traffic (RX / TX)</th>
                    <th className="px-5 py-3.5">Latest Handshake</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {status.peers.map((peer) => (
                    <tr key={peer.public_key} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-white text-sm">{peer.username}</div>
                        <div className="text-slate-400 text-[11px] font-mono mt-0.5 truncate max-w-xs" title={peer.public_key}>
                          {peer.public_key}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-semibold text-emerald-400 px-2 py-1 rounded bg-slate-900 border border-slate-700">
                          {peer.assigned_ip}/32
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                            peer.is_connected
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                              : 'bg-slate-900 text-slate-400 border border-slate-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              peer.is_connected ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                            }`}
                          ></span>
                          <span>{peer.is_connected ? 'Connected' : 'Idle'}</span>
                        </span>
                        {peer.endpoint && (
                          <span className="block text-[10px] text-slate-400 font-mono mt-1">{peer.endpoint}</span>
                        )}
                      </td>

                      <td className="px-5 py-4 font-mono text-[11px] text-slate-300">
                        <div className="flex items-center space-x-1 text-emerald-400">
                          <ArrowDownCircle className="w-3.5 h-3.5" />
                          <span>{formatBytes(peer.transfer_rx)}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-sky-400 mt-0.5">
                          <ArrowUpCircle className="w-3.5 h-3.5" />
                          <span>{formatBytes(peer.transfer_tx)}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-400">
                        {peer.latest_handshake ? (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>{new Date(peer.latest_handshake).toLocaleTimeString()}</span>
                          </div>
                        ) : (
                          <span className="italic text-slate-500">None</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {peer.user_id && (
                          <button
                            onClick={() => handleRemovePeer(peer.user_id, peer.username)}
                            className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-rose-900/60 text-slate-300 hover:text-rose-300 transition-colors"
                            title="Disconnect & revoke peer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
