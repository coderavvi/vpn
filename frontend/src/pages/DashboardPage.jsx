import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { vpnService } from '../services/vpnService';
import StatCard from '../components/StatCard';
import {
  Shield,
  Radio,
  Layers,
  AlertTriangle,
  Download,
  KeyRound,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activePeers: 0,
    totalUsers: 0,
    allowedSegments: 0,
    violationsCount: 0,
  });
  const [userConfig, setUserConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        if (user?.id) {
          try {
            const conf = await vpnService.getUserConfig(user.id);
            setUserConfig(conf);
          } catch (e) {
            // User might not have config yet
          }
        }

        const isAdmin = user?.is_admin || user?.role?.name?.toLowerCase() === 'admin';
        if (isAdmin) {
          const [wgStatus, usersData, violationsData] = await Promise.all([
            vpnService.getWireGuardStatus().catch(() => ({ peers: [] })),
            vpnService.getUsers({ limit: 1 }).catch(() => ({ total: 0 })),
            vpnService.getViolations({ limit: 1 }).catch(() => ({ total: 0 })),
          ]);

          setStats({
            activePeers: wgStatus.peers?.filter((p) => p.is_connected)?.length || 0,
            totalUsers: usersData.total || 0,
            allowedSegments: 3,
            violationsCount: violationsData.total || 0,
          });
        } else {
          setStats({
            activePeers: 1,
            totalUsers: 1,
            allowedSegments: user?.role?.allowed_segments?.length || 1,
            violationsCount: 0,
          });
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [user]);

  const handleDownloadConfig = async () => {
    if (!user?.id) return;
    try {
      setDownloading(true);
      const blob = await vpnService.getUserConfig(user.id, true);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', userConfig?.filename || `wg0-${user.username}.conf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download WireGuard configuration.');
    } finally {
      setDownloading(false);
    }
  };

  const allowedSegments = user?.role?.allowed_segments || [];
  const isAdmin = user?.is_admin || user?.role?.name?.toLowerCase() === 'admin';

  const portals = [
    {
      id: 'hr',
      name: 'Human Resources Portal',
      segment: 'hr-ns',
      subnet: '10.20.10.0/24',
      port: 9001,
      color: 'sky',
      allowed: isAdmin || allowedSegments.includes('hr-ns'),
    },
    {
      id: 'finance',
      name: 'Finance & Accounts Portal',
      segment: 'finance-ns',
      subnet: '10.20.20.0/24',
      port: 9002,
      color: 'emerald',
      allowed: isAdmin || allowedSegments.includes('finance-ns'),
    },
    {
      id: 'it',
      name: 'IT Operations Portal',
      segment: 'it-ns',
      subnet: '10.20.30.0/24',
      port: 9003,
      color: 'indigo',
      allowed: isAdmin || allowedSegments.includes('it-ns'),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-800/80 via-slate-800/50 to-slate-900/80 border border-slate-700/80 backdrop-blur shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Welcome back, {user?.full_name}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Logged in as <strong className="text-sky-400">{user?.role?.name || 'User'}</strong> in{' '}
              <strong className="text-slate-300">{user?.department}</strong> department.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/vpn-config')}
              className="flex items-center space-x-2 px-4 py-2.5 bg-slate-700/60 hover:bg-slate-700 border border-slate-600 rounded-xl text-sm font-medium text-slate-200 transition-colors"
            >
              <KeyRound className="w-4 h-4 text-sky-400" />
              <span>VPN Config</span>
            </button>
            <button
              onClick={handleDownloadConfig}
              disabled={downloading}
              className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-sky-500/20 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'Downloading...' : 'Download .conf'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Active VPN Tunnels"
          value={stats.activePeers}
          subtitle="WireGuard wg0 peers connected"
          icon={Radio}
          color="emerald"
        />
        <StatCard
          title="Accessible Segments"
          value={stats.allowedSegments}
          subtitle="Micro-segments authorized"
          icon={Layers}
          color="sky"
        />
        <StatCard
          title="Total Directory Users"
          value={stats.totalUsers}
          subtitle="Provisioned VPN accounts"
          icon={Users}
          color="indigo"
        />
        <StatCard
          title="Security Violations"
          value={stats.violationsCount}
          subtitle="Blocked by nftables firewall"
          icon={AlertTriangle}
          color="rose"
        />
      </div>

      {/* Role-Based Micro-Segmentation Portal Access Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">Role-Based Department Portals</h3>
            <p className="text-xs text-slate-400">
              Only networks authorized by your assigned role are accessible through the VPN tunnel.
            </p>
          </div>
          <button
            onClick={() => navigate('/portals')}
            className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
          >
            <span>View All Portals</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {portals.map((p) => (
            <div
              key={p.id}
              className={`p-5 rounded-2xl border backdrop-blur transition-all ${
                p.allowed
                  ? 'bg-slate-800/60 border-slate-700/80 hover:border-sky-500/50 hover:shadow-lg hover:shadow-sky-500/5'
                  : 'bg-slate-900/40 border-slate-800/80 opacity-75'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700/80 text-slate-300">
                  {p.segment}
                </span>
                {p.allowed ? (
                  <span className="flex items-center space-x-1 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Permitted</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 text-xs font-semibold text-rose-400">
                    <XCircle className="w-4 h-4" />
                    <span>Blocked</span>
                  </span>
                )}
              </div>

              <h4 className="font-semibold text-base text-white">{p.name}</h4>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Subnet: {p.subnet} | Port: {p.port}
              </p>

              <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  {p.allowed ? 'Full Access Granted' : 'Restricted by RBAC'}
                </span>
                <button
                  onClick={() => navigate(p.allowed ? `/departments/${p.id}` : '/portals')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    p.allowed
                      ? 'bg-sky-600/20 text-sky-400 hover:bg-sky-600/30 border border-sky-500/30'
                      : 'bg-rose-950/40 text-rose-400 hover:bg-rose-900/40 border border-rose-800/40'
                  }`}
                >
                  {p.allowed ? 'Open Portal' : 'Test Block'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
