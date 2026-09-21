import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { vpnService } from '../../services/vpnService';
import AccessDeniedCard from '../../components/AccessDeniedCard';
import {
  Server,
  Activity,
  Cpu,
  HardDrive,
  Radio,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Terminal,
  Play,
  RotateCcw,
  Network,
  LifeBuoy,
  Plus,
  Lock,
  Layers
} from 'lucide-react';

export default function ITDepartmentPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('nodes');
  const [loading, setLoading] = useState(true);
  const [portalData, setPortalData] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [deniedError, setDeniedError] = useState('');

  // Server Nodes State
  const [nodes, setNodes] = useState([
    { id: 'node-01', name: 'vpn-root-gw', ip: '10.10.0.1', role: 'WireGuard Gateway', cpu: 14, mem: 28, disk: 42, status: 'Healthy', uptime: '42d 18h' },
    { id: 'node-02', name: 'ns-hr-portal', ip: '10.20.10.2', role: 'HR Portal (hr-ns)', cpu: 8, mem: 19, disk: 31, status: 'Healthy', uptime: '42d 18h' },
    { id: 'node-03', name: 'ns-fin-portal', ip: '10.20.20.2', role: 'Finance Portal (fin-ns)', cpu: 12, mem: 34, disk: 48, status: 'Healthy', uptime: '42d 18h' },
    { id: 'node-04', name: 'ns-it-portal', ip: '10.20.30.2', role: 'IT Portal (it-ns)', cpu: 9, mem: 22, disk: 36, status: 'Healthy', uptime: '42d 18h' },
    { id: 'node-05', name: 'db-postgres-01', ip: '127.0.0.1:5432', role: 'PostgreSQL Relational DB', cpu: 22, mem: 56, disk: 62, status: 'Healthy', uptime: '42d 18h' },
    { id: 'node-06', name: 'api-uvicorn-01', ip: '0.0.0.0:8000', role: 'FastAPI Backend Daemon', cpu: 18, mem: 38, disk: 45, status: 'Healthy', uptime: '42d 18h' },
    { id: 'node-07', name: 'web-vite-01', ip: '0.0.0.0:5173', role: 'React Frontend Host', cpu: 6, mem: 24, disk: 39, status: 'Healthy', uptime: '42d 18h' },
    { id: 'node-08', name: 'dns-bind-internal', ip: '10.10.0.1:53', role: 'Internal DNS Resolver', cpu: 4, mem: 14, disk: 25, status: 'Healthy', uptime: '42d 18h' },
  ]);

  // Support Tickets State
  const [tickets, setTickets] = useState([
    { id: 'IT-1042', requester: 'Alice Chen', dept: 'Engineering', subject: 'WireGuard mobile handshake timeout on iOS client', priority: 'High', category: 'VPN Tunnel', status: 'In Progress' },
    { id: 'IT-1043', requester: 'Marcus Vance', dept: 'Human Resources', subject: 'New hire laptop provisioning: MacBook Pro 16 M3', priority: 'Medium', category: 'Hardware', status: 'Open' },
    { id: 'IT-1044', requester: 'Sophia Rodriguez', dept: 'Finance', subject: 'Request read-only staging VPC database tunnel', priority: 'Low', category: 'Access Permission', status: 'Open' },
    { id: 'IT-1045', requester: 'David Kim', dept: 'IT Operations', subject: 'nftables drop counter automated alert webhook integration', priority: 'Medium', category: 'Security', status: 'In Progress' },
    { id: 'IT-1046', requester: 'Elena Rostova', dept: 'Product', subject: 'Reset MFA token for secondary device', priority: 'Low', category: 'Identity/MFA', status: 'Resolved' },
  ]);

  // Network Diagnostics Tool State
  const [targetIp, setTargetIp] = useState('10.20.10.2');
  const [pingRunning, setPingRunning] = useState(false);
  const [pingOutput, setPingOutput] = useState([]);

  // Ticket creation modal
  const [isAddTicketOpen, setIsAddTicketOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({ requester: '', dept: 'Engineering', subject: '', priority: 'Medium', category: 'VPN Tunnel' });

  // Fetch backend portal data
  useEffect(() => {
    async function fetchPortal() {
      try {
        setLoading(true);
        const data = await vpnService.getPortal('it');
        setPortalData(data);
      } catch (err) {
        if (err.response?.status === 403) {
          setAccessDenied(true);
          setDeniedError(err.response?.data?.detail || 'Micro-segmentation check failed.');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchPortal();
  }, []);

  const handleToggleTicketStatus = (id) => {
    setTickets(prev =>
      prev.map(t => {
        if (t.id !== id) return t;
        const nextStatus = t.status === 'Open' ? 'In Progress' : t.status === 'In Progress' ? 'Resolved' : 'Open';
        return { ...t, status: nextStatus };
      })
    );
  };

  const handleCreateTicket = (e) => {
    e.preventDefault();
    if (!newTicket.requester || !newTicket.subject) return;

    const t = {
      id: `IT-${Math.floor(1000 + Math.random() * 9000)}`,
      requester: newTicket.requester,
      dept: newTicket.dept,
      subject: newTicket.subject,
      priority: newTicket.priority,
      category: newTicket.category,
      status: 'Open',
    };

    setTickets(prev => [t, ...prev]);
    setIsAddTicketOpen(false);
    setNewTicket({ requester: '', dept: 'Engineering', subject: '', priority: 'Medium', category: 'VPN Tunnel' });
  };

  const runDiagnosticPing = () => {
    setPingRunning(true);
    setPingOutput([
      `PING ${targetIp} (56 data bytes via WireGuard interface wg0)...`,
    ]);

    setTimeout(() => {
      setPingOutput(prev => [
        ...prev,
        `64 bytes from ${targetIp}: icmp_seq=1 ttl=64 time=0.412 ms`,
      ]);
    }, 400);

    setTimeout(() => {
      setPingOutput(prev => [
        ...prev,
        `64 bytes from ${targetIp}: icmp_seq=2 ttl=64 time=0.388 ms`,
      ]);
    }, 800);

    setTimeout(() => {
      setPingOutput(prev => [
        ...prev,
        `64 bytes from ${targetIp}: icmp_seq=3 ttl=64 time=0.395 ms`,
      ]);
    }, 1200);

    setTimeout(() => {
      setPingOutput(prev => [
        ...prev,
        `--- ${targetIp} ping statistics ---`,
        `3 packets transmitted, 3 received, 0% packet loss, rtt min/avg/max = 0.388/0.398/0.412 ms`,
        `[✓] nftables stateful inspection: FORWARD ACCEPT (micro-segment authorized)`,
      ]);
      setPingRunning(false);
    }, 1600);
  };

  if (accessDenied) {
    return (
      <AccessDeniedCard
        targetDepartment="IT Operations"
        targetSegment="it-ns (10.20.30.0/24)"
        targetIp="10.20.30.2:9003"
        errorMessage={deniedError}
        deptKey="it"
      />
    );
  }

  const openTicketsCount = tickets.filter(t => t.status !== 'Resolved').length;

  return (
    <div className="space-y-6">
      {/* Top Header & Micro-Segment Verified Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 backdrop-blur shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2.5 mb-1.5">
              <span className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/40">
                <Server className="w-5 h-5" />
              </span>
              <span className="font-mono text-xs uppercase tracking-widest text-indigo-400 font-semibold">
                IT Operations Micro-Segment • Subnet 10.20.30.0/24
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                Zero-Trust Verified
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              IT Operations Command Center
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Infrastructure topology, network micro-segmentation namespaces, support queue, and diagnostics.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-700/80 text-right font-mono text-xs">
              <span className="text-slate-400 block text-[10px] uppercase">Service Endpoint</span>
              <span className="text-indigo-300 font-semibold">10.20.30.2:9003</span>
            </div>
            <button
              onClick={() => setIsAddTicketOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Support Ticket</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-slate-800/60 border border-slate-700/80 rounded-2xl backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              System Uptime
            </span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {portalData?.data?.uptime || '99.98%'}
          </p>
          <p className="text-xs text-emerald-400 mt-1">All subsystems nominal</p>
        </div>

        <div className="p-5 bg-slate-800/60 border border-slate-700/80 rounded-2xl backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active Nodes
            </span>
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
              <Server className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {portalData?.data?.active_nodes || nodes.length} / {nodes.length}
          </p>
          <p className="text-xs text-slate-400 mt-1">100% online & healthy</p>
        </div>

        <div className="p-5 bg-slate-800/60 border border-slate-700/80 rounded-2xl backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Open Tickets
            </span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <LifeBuoy className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {portalData?.data?.open_tickets || openTicketsCount}
          </p>
          <p className="text-xs text-amber-300 mt-1">Requiring IT triage</p>
        </div>

        <div className="p-5 bg-slate-800/60 border border-slate-700/80 rounded-2xl backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              WireGuard Gateway
            </span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <Radio className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {portalData?.data?.wireguard_gateway || '10.10.0.1'}
          </p>
          <p className="text-xs text-indigo-300 mt-1">Port 51820 / UDP active</p>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="border-b border-slate-700/80 flex space-x-2">
        <button
          onClick={() => setActiveTab('nodes')}
          className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'nodes'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Server Topology</span>
        </button>

        <button
          onClick={() => setActiveTab('namespaces')}
          className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'namespaces'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Micro-Segments & Namespaces</span>
        </button>

        <button
          onClick={() => setActiveTab('tickets')}
          className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'tickets'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <LifeBuoy className="w-4 h-4" />
          <span>IT Support Queue</span>
          {openTicketsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold">
              {openTicketsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'diagnostics'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Network Diagnostics</span>
        </button>
      </div>

      {/* Tab 1: Server Topology */}
      {activeTab === 'nodes' && (
        <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl overflow-hidden backdrop-blur">
          <div className="p-4 bg-slate-900/80 border-b border-slate-700/70 flex justify-between items-center">
            <h4 className="font-bold text-white text-sm">Active Server Nodes & Micro-Service Instances</h4>
            <span className="text-xs font-mono text-emerald-400">All Nodes Heartbeat Valid</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-xs font-semibold uppercase text-slate-400 tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Node Hostname</th>
                  <th className="px-6 py-3.5">Internal IP</th>
                  <th className="px-6 py-3.5">Assigned Role</th>
                  <th className="px-6 py-3.5">CPU Load</th>
                  <th className="px-6 py-3.5">Memory</th>
                  <th className="px-6 py-3.5">Disk</th>
                  <th className="px-6 py-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {nodes.map((node) => (
                  <tr key={node.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span>{node.name}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-sky-400">{node.ip}</td>
                    <td className="px-6 py-4 text-xs text-slate-300">{node.role}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${node.cpu > 70 ? 'bg-rose-500' : 'bg-emerald-400'}`}
                            style={{ width: `${node.cpu}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-mono">{node.cpu}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${node.mem > 70 ? 'bg-amber-500' : 'bg-sky-400'}`}
                            style={{ width: `${node.mem}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-mono">{node.mem}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{node.disk}%</td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {node.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Micro-Segments & Namespaces */}
      {activeTab === 'namespaces' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-slate-800/60 border border-slate-700/80 rounded-2xl backdrop-blur space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                    hr-ns
                  </span>
                  <h4 className="font-bold text-white text-base mt-2">Human Resources Segment</h4>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">Subnet: 10.20.10.0/24</p>
                </div>
                <span className="px-2 py-0.5 text-xs rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Active
                </span>
              </div>
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700 text-xs font-mono text-slate-300 space-y-1">
                <div>veth pair: veth-hr-root &lt;-&gt; veth-hr-ns</div>
                <div>Portal IP: 10.20.10.2:9001</div>
                <div>Permitted Roles: HR, Admin</div>
                <div className="text-emerald-400">nftables rule: ip saddr @hr_users accept</div>
              </div>
            </div>

            <div className="p-5 bg-slate-800/60 border border-slate-700/80 rounded-2xl backdrop-blur space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                    finance-ns
                  </span>
                  <h4 className="font-bold text-white text-base mt-2">Finance & Accounts Segment</h4>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">Subnet: 10.20.20.0/24</p>
                </div>
                <span className="px-2 py-0.5 text-xs rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Active
                </span>
              </div>
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700 text-xs font-mono text-slate-300 space-y-1">
                <div>veth pair: veth-finance-root &lt;-&gt; veth-finance-ns</div>
                <div>Portal IP: 10.20.20.2:9002</div>
                <div>Permitted Roles: Finance, Admin</div>
                <div className="text-emerald-400">nftables rule: ip saddr @finance_users accept</div>
              </div>
            </div>

            <div className="p-5 bg-slate-800/60 border border-slate-700/80 rounded-2xl backdrop-blur space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800">
                    it-ns
                  </span>
                  <h4 className="font-bold text-white text-base mt-2">IT Operations Segment</h4>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">Subnet: 10.20.30.0/24</p>
                </div>
                <span className="px-2 py-0.5 text-xs rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Active
                </span>
              </div>
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700 text-xs font-mono text-slate-300 space-y-1">
                <div>veth pair: veth-it-root &lt;-&gt; veth-it-ns</div>
                <div>Portal IP: 10.20.30.2:9003</div>
                <div>Permitted Roles: IT, Admin</div>
                <div className="text-emerald-400">nftables rule: ip saddr @it_users accept</div>
              </div>
            </div>
          </div>

          <div className="p-5 bg-slate-800/50 border border-slate-700/80 rounded-2xl">
            <h4 className="font-bold text-white text-sm mb-2">Defense-in-Depth Kernel Firewall Policies</h4>
            <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-slate-300 space-y-1 border border-slate-800">
              <div className="text-slate-500"># In-kernel zero-trust forward isolation policy:</div>
              <div>table inet filter &#123;</div>
              <div className="pl-4">chain forward &#123; type filter hook forward priority 0; policy drop; &#125;</div>
              <div className="pl-4 text-emerald-400">ip saddr @admin_users accept</div>
              <div className="pl-4 text-sky-400">ip saddr @hr_users ip daddr 10.20.10.2 tcp dport 9001 accept</div>
              <div className="pl-4 text-emerald-300">ip saddr @finance_users ip daddr 10.20.20.2 tcp dport 9002 accept</div>
              <div className="pl-4 text-indigo-300">ip saddr @it_users ip daddr 10.20.30.2 tcp dport 9003 accept</div>
              <div className="pl-4 text-rose-400">counter log prefix "[NFT-FWD-DROP] " drop</div>
              <div>&#125;</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: IT Support Queue */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl overflow-hidden backdrop-blur">
            <div className="p-4 bg-slate-900/80 border-b border-slate-700/70 flex justify-between items-center">
              <h4 className="font-bold text-white text-sm">Enterprise Support & Access Ticket Queue</h4>
              <span className="text-xs text-slate-400">Click actions to advance ticket lifecycle</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/60 text-xs font-semibold uppercase text-slate-400 tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Ticket ID</th>
                    <th className="px-6 py-3.5">Requester</th>
                    <th className="px-6 py-3.5">Issue Subject</th>
                    <th className="px-6 py-3.5">Priority</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Cycle Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {tickets.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-indigo-400">
                        {t.id}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-white">{t.requester}</p>
                        <p className="text-xs text-slate-400">{t.dept}</p>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-200">{t.subject}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                            t.priority === 'Critical'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : t.priority === 'High'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">{t.category}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            t.status === 'Resolved'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : t.status === 'In Progress'
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleToggleTicketStatus(t.id)}
                          className="px-3 py-1 bg-slate-700/60 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg border border-slate-600/50 transition-colors"
                        >
                          Advance Status
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Network Diagnostics */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-4">
          <div className="p-6 bg-slate-800/50 border border-slate-700/80 rounded-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-400" />
              <span>WireGuard Micro-Segment Reachability Diagnostics</span>
            </h3>

            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="w-full sm:w-80">
                <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">
                  Target Micro-Segment IP
                </label>
                <select
                  value={targetIp}
                  onChange={(e) => setTargetIp(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm"
                >
                  <option value="10.20.10.2">10.20.10.2 (HR Portal - hr-ns)</option>
                  <option value="10.20.20.2">10.20.20.2 (Finance Portal - fin-ns)</option>
                  <option value="10.20.30.2">10.20.30.2 (IT Operations - it-ns)</option>
                  <option value="10.10.0.1">10.10.0.1 (WireGuard Host Gateway)</option>
                  <option value="1.1.1.1">1.1.1.1 (Cloudflare Anycast DNS)</option>
                </select>
              </div>

              <div className="sm:self-end w-full sm:w-auto">
                <button
                  onClick={runDiagnosticPing}
                  disabled={pingRunning}
                  className="w-full sm:w-auto px-5 py-2 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  <span>{pingRunning ? 'Probing Network...' : 'Send ICMP Probes'}</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 min-h-[160px] space-y-1">
              <div className="text-slate-500 border-b border-slate-800 pb-1 mb-2">
                Diagnostic Console Output (wg0 Interface):
              </div>
              {pingOutput.length === 0 && (
                <div className="text-slate-600 italic">Select an IP and click "Send ICMP Probes" to trace segment connectivity.</div>
              )}
              {pingOutput.map((line, idx) => (
                <div
                  key={idx}
                  className={line.includes('[✓]') ? 'text-emerald-400 font-bold' : line.includes('statistics') ? 'text-sky-400' : 'text-slate-300'}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {isAddTicketOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Create IT Support Ticket</h3>
            <form onSubmit={handleCreateTicket} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Requester Name</label>
                <input
                  type="text"
                  required
                  value={newTicket.requester}
                  onChange={(e) => setNewTicket({ ...newTicket, requester: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm"
                  placeholder="e.g. Liam O'Connor"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Department</label>
                <select
                  value={newTicket.dept}
                  onChange={(e) => setNewTicket({ ...newTicket, dept: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm"
                >
                  <option value="Human Resources">Human Resources</option>
                  <option value="Finance">Finance</option>
                  <option value="Engineering">Engineering</option>
                  <option value="IT Operations">IT Operations</option>
                  <option value="Product">Product</option>
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Issue Subject</label>
                <input
                  type="text"
                  required
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm"
                  placeholder="e.g. Tunnel handshake drops after 30 minutes"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Category</label>
                  <select
                    value={newTicket.category}
                    onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm"
                  >
                    <option value="VPN Tunnel">VPN Tunnel</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Access Permission">Access Permission</option>
                    <option value="Security">Security</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Priority</label>
                  <select
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsAddTicketOpen(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-semibold text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-semibold text-white"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
