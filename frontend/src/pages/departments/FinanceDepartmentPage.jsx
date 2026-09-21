import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { vpnService } from '../../services/vpnService';
import AccessDeniedCard from '../../components/AccessDeniedCard';
import {
  Landmark,
  TrendingUp,
  DollarSign,
  FileText,
  PieChart,
  ShieldCheck,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  CreditCard
} from 'lucide-react';

export default function FinanceDepartmentPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('ledger');
  const [loading, setLoading] = useState(true);
  const [portalData, setPortalData] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [deniedError, setDeniedError] = useState('');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  // Ledger Transactions State
  const [transactions, setTransactions] = useState([
    { id: 'GL-90412', date: '2026-09-14', category: 'Enterprise Client Retainer', entity: 'Apex Global Logistics', type: 'Credit', amount: 145000, status: 'Reconciled' },
    { id: 'GL-90411', date: '2026-09-13', category: 'Cloud Infrastructure', entity: 'Amazon Web Services', type: 'Debit', amount: 28450, status: 'Reconciled' },
    { id: 'GL-90410', date: '2026-09-12', category: 'Software Subscriptions', entity: 'Salesforce Enterprise', type: 'Debit', amount: 14200, status: 'Reconciled' },
    { id: 'GL-90409', date: '2026-09-10', category: 'Consulting Revenue', entity: 'Beacon Health Systems', type: 'Credit', amount: 89000, status: 'Reconciled' },
    { id: 'GL-90408', date: '2026-09-08', category: 'Office Lease & Facilities', entity: 'Metropolitan Real Estate', type: 'Debit', amount: 35000, status: 'Pending Audit' },
    { id: 'GL-90407', date: '2026-09-05', category: 'Security Hardware Appliances', entity: 'Cisco Systems', type: 'Debit', amount: 48900, status: 'Reconciled' },
    { id: 'GL-90406', date: '2026-09-01', category: 'Payroll ACH Disbursement', entity: 'Corporate Payroll Acct', type: 'Debit', amount: 897700, status: 'Reconciled' },
    { id: 'GL-90405', date: '2026-08-30', category: 'Annual Software Licensing', entity: 'Vanguard Cybersecurity', type: 'Credit', amount: 220000, status: 'Reconciled' },
  ]);

  // Accounts Payable / Invoices State
  const [invoices, setInvoices] = useState([
    { id: 'INV-2026-081', vendor: 'Amazon Web Services', po: 'PO-8821', dueDate: '2026-09-25', amount: 28450.00, dept: 'IT Operations', status: 'Pending Approval' },
    { id: 'INV-2026-082', vendor: 'Cisco Systems Hardware', po: 'PO-8824', dueDate: '2026-09-28', amount: 48900.00, dept: 'IT Operations', status: 'Pending Approval' },
    { id: 'INV-2026-083', vendor: 'Slack Technologies', po: 'PO-8819', dueDate: '2026-10-05', amount: 9200.00, dept: 'HR & People Ops', status: 'Approved' },
    { id: 'INV-2026-084', vendor: 'Google Cloud Platform', po: 'PO-8830', dueDate: '2026-10-01', amount: 16500.00, dept: 'Engineering', status: 'Pending Approval' },
    { id: 'INV-2026-085', vendor: 'Baker & Hostetler Legal', po: 'PO-8799', dueDate: '2026-09-22', amount: 32000.00, dept: 'Finance & Legal', status: 'Flagged for Review' },
  ]);

  // Modals
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [newTx, setNewTx] = useState({ category: '', entity: '', type: 'Debit', amount: '' });

  // Fetch backend data
  useEffect(() => {
    async function fetchPortal() {
      try {
        setLoading(true);
        const data = await vpnService.getPortal('finance');
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

  const handleApproveInvoice = (id) => {
    setInvoices(prev =>
      prev.map(inv => inv.id === id ? { ...inv, status: 'Approved' } : inv)
    );
  };

  const handleFlagInvoice = (id) => {
    setInvoices(prev =>
      prev.map(inv => inv.id === id ? { ...inv, status: 'Flagged for Review' } : inv)
    );
  };

  const handleCreateTx = (e) => {
    e.preventDefault();
    if (!newTx.category || !newTx.entity || !newTx.amount) return;

    const tx = {
      id: `GL-${Math.floor(10000 + Math.random() * 90000)}`,
      date: new Date().toISOString().split('T')[0],
      category: newTx.category,
      entity: newTx.entity,
      type: newTx.type,
      amount: parseFloat(newTx.amount),
      status: 'Pending Audit',
    };

    setTransactions(prev => [tx, ...prev]);
    setIsAddTxOpen(false);
    setNewTx({ category: '', entity: '', type: 'Debit', amount: '' });
  };

  if (accessDenied) {
    return (
      <AccessDeniedCard
        targetDepartment="Finance & Accounts"
        targetSegment="finance-ns (10.20.20.0/24)"
        targetIp="10.20.20.2:9002"
        errorMessage={deniedError}
        deptKey="finance"
      />
    );
  }

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch =
      t.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'All' || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const pendingInvoicesCount = invoices.filter(i => i.status === 'Pending Approval').length;

  return (
    <div className="space-y-6">
      {/* Top Header & Micro-Segment Verified Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/30 backdrop-blur shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2.5 mb-1.5">
              <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/40">
                <Landmark className="w-5 h-5" />
              </span>
              <span className="font-mono text-xs uppercase tracking-widest text-emerald-400 font-semibold">
                Finance Micro-Segment • Subnet 10.20.20.0/24
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                Zero-Trust Verified
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Finance & Treasury Portal
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              General ledger accounting, accounts payable, departmental budget governance, and audit trails.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-700/80 text-right font-mono text-xs">
              <span className="text-slate-400 block text-[10px] uppercase">Service Endpoint</span>
              <span className="text-emerald-300 font-semibold">10.20.20.2:9002</span>
            </div>
            <button
              onClick={() => setIsAddTxOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-emerald-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Record Journal Entry</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-slate-800/60 border border-slate-700/80 rounded-2xl backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Q3 Gross Revenue
            </span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {portalData?.data?.q3_revenue || '$4,250,000'}
          </p>
          <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+14.2% YoY growth</span>
          </p>
        </div>

        <div className="p-5 bg-slate-800/60 border border-slate-700/80 rounded-2xl backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Cash Reserves
            </span>
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
              <Landmark className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {portalData?.data?.ledger_summary?.cash_reserve || '$3,100,000'}
          </p>
          <p className="text-xs text-slate-400 mt-1">Tier-1 commercial vault</p>
        </div>

        <div className="p-5 bg-slate-800/60 border border-slate-700/80 rounded-2xl backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Accounts Receivable
            </span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {portalData?.data?.ledger_summary?.accounts_receivable || '$540,200'}
          </p>
          <p className="text-xs text-slate-400 mt-1">Average collection: 28 days</p>
        </div>

        <div className="p-5 bg-slate-800/60 border border-slate-700/80 rounded-2xl backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Pending Invoices
            </span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {portalData?.data?.invoices_pending_approval || pendingInvoicesCount}
          </p>
          <p className="text-xs text-amber-300 mt-1">Awaiting AP sign-off</p>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="border-b border-slate-700/80 flex space-x-2">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'ledger'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>General Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'invoices'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Accounts Payable (AP)</span>
          {pendingInvoicesCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold">
              {pendingInvoicesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('budgets')}
          className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'budgets'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Department Budgets</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'reports'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>Statements & Reports</span>
        </button>
      </div>

      {/* Tab 1: General Ledger */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions, entities, GL codes..."
                className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="All">All Transactions</option>
                <option value="Credit">Credits (Income)</option>
                <option value="Debit">Debits (Expenses)</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl overflow-hidden backdrop-blur">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 text-xs font-semibold uppercase text-slate-400 tracking-wider border-b border-slate-700/70">
                  <tr>
                    <th className="px-6 py-3.5">Ref ID</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Account / Category</th>
                    <th className="px-6 py-3.5">Entity / Counterparty</th>
                    <th className="px-6 py-3.5">Type</th>
                    <th className="px-6 py-3.5 text-right">Amount (USD)</th>
                    <th className="px-6 py-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-emerald-400">
                        {tx.id}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-400">{tx.date}</td>
                      <td className="px-6 py-4 font-medium text-slate-200">{tx.category}</td>
                      <td className="px-6 py-4 text-xs text-slate-300">{tx.entity}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold ${
                            tx.type === 'Credit'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {tx.type === 'Credit' ? '+ CREDIT' : '- DEBIT'}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right font-mono font-semibold ${
                        tx.type === 'Credit' ? 'text-emerald-400' : 'text-slate-200'
                      }`}>
                        ${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            tx.status === 'Reconciled'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Accounts Payable */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl overflow-hidden backdrop-blur">
            <div className="p-4 bg-slate-900/80 border-b border-slate-700/70 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-white text-sm">Vendor Invoices Awaiting Disbursement</h4>
                <p className="text-xs text-slate-400">Micro-segment authorization required to execute wire transfers</p>
              </div>
              <button
                onClick={() => alert('Download Accounts Payable Aging Schedule...')}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-700/60 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg border border-slate-600/60 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>AP Aging Report</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/60 text-xs font-semibold uppercase text-slate-400 tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Invoice #</th>
                    <th className="px-6 py-3.5">Vendor</th>
                    <th className="px-6 py-3.5">Cost Center</th>
                    <th className="px-6 py-3.5">Due Date</th>
                    <th className="px-6 py-3.5">Amount</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Approval Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-sky-400">
                        {inv.id}
                      </td>
                      <td className="px-6 py-4 font-semibold text-white">{inv.vendor}</td>
                      <td className="px-6 py-4 text-xs text-slate-400">{inv.dept}</td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-300">{inv.dueDate}</td>
                      <td className="px-6 py-4 font-mono font-bold text-white">
                        ${inv.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            inv.status === 'Approved'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : inv.status === 'Flagged for Review'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {inv.status === 'Pending Approval' && (
                          <>
                            <button
                              onClick={() => handleApproveInvoice(inv.id)}
                              className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-lg text-xs font-semibold border border-emerald-500/40 transition-colors inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Authorize</span>
                            </button>
                            <button
                              onClick={() => handleFlagInvoice(inv.id)}
                              className="px-3 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 rounded-lg text-xs font-semibold border border-rose-500/40 transition-colors inline-flex items-center gap-1"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Flag</span>
                            </button>
                          </>
                        )}
                        {inv.status === 'Approved' && (
                          <span className="text-xs text-emerald-400 font-mono">Queued for ACH</span>
                        )}
                        {inv.status === 'Flagged for Review' && (
                          <span className="text-xs text-rose-400 font-mono">Audit Hold</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Departmental Budgets */}
      {activeTab === 'budgets' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { dept: 'Engineering & R&D', allocated: 1800000, spent: 1340000, color: 'emerald' },
              { dept: 'Sales & Marketing', allocated: 1200000, spent: 910000, color: 'sky' },
              { dept: 'IT Operations & Cloud', allocated: 850000, spent: 720000, color: 'amber' },
              { dept: 'Human Resources & Talent', allocated: 450000, spent: 310000, color: 'indigo' },
              { dept: 'Operations & Facilities', allocated: 600000, spent: 380000, color: 'teal' },
              { dept: 'Finance & Legal Advisory', allocated: 350000, spent: 210000, color: 'emerald' },
            ].map((b) => {
              const pct = Math.round((b.spent / b.allocated) * 100);
              const remaining = b.allocated - b.spent;

              return (
                <div key={b.dept} className="p-5 bg-slate-800/60 border border-slate-700/80 rounded-2xl backdrop-blur space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-white text-base">{b.dept}</h4>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                      pct > 80 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {pct}% Utilized
                    </span>
                  </div>

                  <div className="w-full bg-slate-700/80 h-3 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between text-xs font-mono text-slate-400 pt-1">
                    <span>Spent: <strong className="text-white">${b.spent.toLocaleString()}</strong></span>
                    <span>Remaining: <strong className="text-emerald-400">${remaining.toLocaleString()}</strong></span>
                    <span>Cap: ${b.allocated.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 4: Statements & Reports */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="p-6 bg-slate-800/50 border border-slate-700/80 rounded-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              <span>Certified Financial Statements & Tax Packages</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700/70 flex justify-between items-center">
                <div>
                  <h5 className="font-semibold text-white text-sm">Q3 2026 Profit & Loss Statement (P&L)</h5>
                  <p className="text-xs text-slate-400 mt-0.5">Audited by KPMG • PDF Format</p>
                </div>
                <button
                  onClick={() => alert('Downloading Q3 2026 Profit & Loss Statement PDF...')}
                  className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-lg text-xs font-semibold border border-emerald-500/40 inline-flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>

              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700/70 flex justify-between items-center">
                <div>
                  <h5 className="font-semibold text-white text-sm">FY2026 General Ledger Audit Trail</h5>
                  <p className="text-xs text-slate-400 mt-0.5">Cryptographic Timestamped Archive</p>
                </div>
                <button
                  onClick={() => alert('Downloading GL Audit Trail Archive...')}
                  className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-lg text-xs font-semibold border border-emerald-500/40 inline-flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>

              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700/70 flex justify-between items-center">
                <div>
                  <h5 className="font-semibold text-white text-sm">Corporate Balance Sheet (as of 2026-09-15)</h5>
                  <p className="text-xs text-slate-400 mt-0.5">Assets: $18.4M | Liabilities: $4.2M</p>
                </div>
                <button
                  onClick={() => alert('Downloading Balance Sheet...')}
                  className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-lg text-xs font-semibold border border-emerald-500/40 inline-flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>

              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700/70 flex justify-between items-center">
                <div>
                  <h5 className="font-semibold text-white text-sm">IRS Form 941 & Quarterly Payroll Tax</h5>
                  <p className="text-xs text-slate-400 mt-0.5">Electronic Filing Receipt Available</p>
                </div>
                <button
                  onClick={() => alert('Downloading Tax Filing Receipt...')}
                  className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-lg text-xs font-semibold border border-emerald-500/40 inline-flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Journal Entry Modal */}
      {isAddTxOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Record General Ledger Entry</h3>
            <form onSubmit={handleCreateTx} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Account / Category</label>
                <input
                  type="text"
                  required
                  value={newTx.category}
                  onChange={(e) => setNewTx({ ...newTx, category: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm"
                  placeholder="e.g. Server Hosting Costs"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Entity / Vendor</label>
                <input
                  type="text"
                  required
                  value={newTx.entity}
                  onChange={(e) => setNewTx({ ...newTx, entity: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm"
                  placeholder="e.g. DigitalOcean Inc"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Type</label>
                  <select
                    value={newTx.type}
                    onChange={(e) => setNewTx({ ...newTx, type: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm"
                  >
                    <option value="Debit">Debit (- Expense)</option>
                    <option value="Credit">Credit (+ Revenue)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Amount ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newTx.amount}
                    onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm"
                    placeholder="12500.00"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsAddTxOpen(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-semibold text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-semibold text-white"
                >
                  Post Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
