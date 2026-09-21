import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { vpnService } from '../services/vpnService';
import {
  KeyRound,
  Download,
  Copy,
  Check,
  Radio,
  Terminal,
  Shield,
  Loader2,
  RefreshCw
} from 'lucide-react';

export default function VPNConfigPage() {
  const { user } = useAuthStore();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedPubKey, setCopiedPubKey] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const handleCopyPubKey = () => {
    if (!config?.public_key) return;
    navigator.clipboard.writeText(config.public_key);
    setCopiedPubKey(true);
    setTimeout(() => setCopiedPubKey(false), 2000);
  };

  const fetchConfig = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const data = await vpnService.getUserConfig(user.id);
      setConfig(data);
    } catch (err) {
      console.error('Failed to fetch config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [user]);

  const handleCopy = () => {
    if (!config?.content) return;
    navigator.clipboard.writeText(config.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    if (!user?.id) return;
    try {
      const blob = await vpnService.getUserConfig(user.id, true);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', config?.filename || `wg0-${user.username}.conf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download configuration.');
    }
  };

  const handleRegenerateKeys = async () => {
    if (!confirm('Regenerating keys will disconnect any active VPN tunnel for this account. Continue?')) {
      return;
    }
    try {
      setRegenerating(true);
      const data = await vpnService.generateKeys(user.id);
      setConfig(data);
    } catch (err) {
      alert('Failed to regenerate WireGuard keypair.');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <KeyRound className="w-7 h-7 text-sky-400" />
            <span>WireGuard VPN Configuration</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Personal cryptographic tunnel credentials tailored for user <strong className="text-slate-200">{user?.username}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRegenerateKeys}
            disabled={regenerating}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin text-sky-400' : ''}`} />
            <span>Regenerate Keys</span>
          </button>
          <button
            onClick={handleDownload}
            disabled={!config}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-sky-500/20 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Download .conf File</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
          <p className="text-sm">Synthesizing WireGuard configuration...</p>
        </div>
      ) : config ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Config Preview Box */}
          <div className="lg:col-span-2 bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 backdrop-blur space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Terminal className="w-5 h-5 text-sky-400" />
                <span className="font-mono text-xs font-bold text-slate-300">{config.filename}</span>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Config</span>
                  </>
                )}
              </button>
            </div>

            {/* Mandatory Peer Public Key Display */}
            {config?.public_key && (
              <div className="p-4 rounded-xl bg-slate-900/90 border border-sky-500/40 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-sky-400" />
                      <span>Your Client Public Key (Mandatory for Server Handshake)</span>
                    </span>
                    <div className="font-mono text-xs text-white font-bold break-all mt-1 select-all bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
                      {config.public_key}
                    </div>
                  </div>
                  <button
                    onClick={handleCopyPubKey}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-600/30 hover:bg-sky-600/50 border border-sky-500/40 text-xs font-semibold text-sky-200 transition-colors self-start sm:self-center shrink-0"
                  >
                    {copiedPubKey ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-sky-400" />
                        <span>Copy Public Key</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="text-[11px] text-slate-400 pt-1.5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <span>Assigned VPN Tunnel IP: <strong className="text-emerald-400 font-mono">{config.assigned_ip || '10.10.0.X'}/32</strong></span>
                  <span className="text-amber-300 font-mono text-[10px]">
                    Server command: <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-200">sudo wg set wg0 peer {config.public_key} allowed-ips {config.assigned_ip || '10.10.0.X'}/32 &amp;&amp; sudo wg-quick save wg0</code>
                  </span>
                </div>
              </div>
            )}

            <div className="relative">
              <pre className="p-5 bg-slate-950 rounded-xl font-mono text-xs text-sky-300 overflow-x-auto border border-slate-800 leading-relaxed">
                {config.content}
              </pre>
            </div>
          </div>

          {/* Connection Guide Card */}
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 backdrop-blur space-y-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-emerald-400" />
              <span>How to Connect</span>
            </h3>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
                <span className="font-semibold text-white block">Step 1: Download App</span>
                <p className="text-slate-400">
                  Install official WireGuard client for Windows, macOS, Ubuntu, or Android/iOS.
                </p>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
                <span className="font-semibold text-white block">Step 2: Import Profile</span>
                <p className="text-slate-400">
                  Click "Download .conf File" above and import it via WireGuard: <em>Add Tunnel &gt; Import from File</em>.
                </p>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
                <span className="font-semibold text-white block">Step 3: Activate Tunnel</span>
                <p className="text-slate-400">
                  Click <em>Activate</em>. Your traffic to permitted department subnets is now secured.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-sky-950/40 border border-sky-800/50 text-[11px] text-sky-300 space-y-1">
              <span className="font-semibold text-sky-200 block">Layer 1 Micro-Segmentation:</span>
              <p>
                Notice your <code className="text-amber-300">AllowedIPs</code> setting strictly routes only your permitted department subnets into the tunnel.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-slate-400">
          <p>No configuration found for this account.</p>
        </div>
      )}
    </div>
  );
}
