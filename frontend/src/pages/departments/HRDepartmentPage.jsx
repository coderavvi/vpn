import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { vpnService } from '../../services/vpnService';
import AccessDeniedCard from '../../components/AccessDeniedCard';
import {
  Users,
  Building2,
  CalendarCheck,
  DollarSign,
  Briefcase,
  Bell,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  FileText,
  ShieldCheck,
  Filter,
  UserCheck,
  Sparkles,
  AlertCircle
} from 'lucide-react';

export default function HRDepartmentPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('directory');
  const [loading, setLoading] = useState(true);
  const [portalData, setPortalData] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [deniedError, setDeniedError] = useState('');

  // Search & Filters for Directory
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');

  // Employee Directory state
  const [employees, setEmployees] = useState([
    { id: 1, name: 'Alice Chen', role: 'Staff Software Engineer', department: 'Engineering', location: 'San Francisco, CA', email: 'alice.c@corp.local', status: 'Active', joinDate: '2022-03-15' },
    { id: 2, name: 'Marcus Vance', role: 'HR Operations Lead', department: 'Human Resources', location: 'New York, NY', email: 'marcus.v@corp.local', status: 'Active', joinDate: '2021-08-01' },
    { id: 3, name: 'Sophia Rodriguez', role: 'Senior Financial Analyst', department: 'Finance', location: 'Chicago, IL', email: 'sophia.r@corp.local', status: 'Active', joinDate: '2023-01-10' },
    { id: 4, name: 'David Kim', role: 'DevOps & Cloud Architect', department: 'IT Operations', location: 'Austin, TX', email: 'david.k@corp.local', status: 'Active', joinDate: '2022-11-20' },
    { id: 5, name: 'Elena Rostova', role: 'Product Design Manager', department: 'Product', location: 'San Francisco, CA', email: 'elena.r@corp.local', status: 'On Leave', joinDate: '2020-05-18' },
    { id: 6, name: 'James Wilson', role: 'Talent Acquisition Partner', department: 'Human Resources', location: 'Remote', email: 'james.w@corp.local', status: 'Active', joinDate: '2024-02-01' },
    { id: 7, name: 'Priya Sharma', role: 'Security Compliance Lead', department: 'IT Operations', location: 'New York, NY', email: 'priya.s@corp.local', status: 'Active', joinDate: '2023-07-14' },
    { id: 8, name: 'Liam O\'Connor', role: 'Payroll Specialist', department: 'Human Resources', location: 'Chicago, IL', email: 'liam.o@corp.local', status: 'Active', joinDate: '2022-09-05' },
  ]);

  // Leave Requests state
  const [leaveRequests, setLeaveRequests] = useState([
    { id: 101, employee: 'Elena Rostova', department: 'Product', type: 'Parental Leave', dates: '2026-09-01 to 2026-11-30', days: 60, reason: 'Maternity leave bonding time', status: 'Approved' },
    { id: 102, employee: 'Alice Chen', department: 'Engineering', type: 'Annual Vacation', dates: '2026-09-20 to 2026-09-27', days: 5, reason: 'Family trip', status: 'Pending' },
    { id: 103, employee: 'David Kim', department: 'IT Operations', type: 'Medical / Sick', dates: '2026-09-16 to 2026-09-18', days: 2, reason: 'Dental procedure recovery', status: 'Pending' },
    { id: 104, employee: 'James Wilson', department: 'Human Resources', type: 'Personal Leave', dates: '2026-10-02 to 2026-10-05', days: 3, reason: 'Relocation assistance', status: 'Pending' },
    { id: 105, employee: 'Marcus Vance', department: 'Human Resources', type: 'Annual Vacation', dates: '2026-08-10 to 2026-08-15', days: 5, reason: 'Summer holiday', status: 'Approved' },
  ]);

  // Open Requisitions
  const [requisitions, setRequisitions] = useState([
    { id: 'REQ-401', title: 'Senior Site Reliability Engineer', dept: 'IT Operations', applicants: 18, hiringManager: 'David Kim', stage: 'Interviewing', status: 'Active' },
    { id: 'REQ-402', title: 'Lead Compensation Analyst', dept: 'Finance', applicants: 9, hiringManager: 'Sophia Rodriguez', stage: 'Offer Stage', status: 'Active' },
    { id: 'REQ-403', title: 'HR Business Partner', dept: 'Human Resources', applicants: 24, hiringManager: 'Marcus Vance', stage: 'Screening', status: 'Active' },
    { id: 'REQ-404', title: 'Backend Software Engineer (Go/Python)', dept: 'Engineering', applicants: 32, hiringManager: 'Alice Chen', stage: 'Technical Assessment', status: 'Active' },
  ]);

  // UI Modals
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ name: '', role: '', department: 'Engineering', email: '', location: 'San Francisco, CA' });
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Fetch backend portal data
  useEffect(() => {
    async function fetchPortal() {
      try {
        setLoading(true);
        const data = await vpnService.getPortal('hr');
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

  const handleApproveLeave = (id) => {
    setLeaveRequests(prev =>
      prev.map(item => item.id === id ? { ...item, status: 'Approved' } : item)
    );
  };

  const handleRejectLeave = (id) => {
    setLeaveRequests(prev =>
      prev.map(item => item.id === id ? { ...item, status: 'Rejected' } : item)
    );
  };

  const handleCreateEmployee = (e) => {
    e.preventDefault();
    if (!newEmployee.name || !newEmployee.email) return;

    const emp = {
      id: Date.now(),
      name: newEmployee.name,
      role: newEmployee.role || 'Associate',
      department: newEmployee.department,
      location: newEmployee.location,
      email: newEmployee.email,
      status: 'Active',
      joinDate: new Date().toISOString().split('T')[0],
    };

    setEmployees(prev => [emp, ...prev]);
    setIsAddEmployeeOpen(false);
    setNewEmployee({ name: '', role: '', department: 'Engineering', email: '', location: 'San Francisco, CA' });
  };

  if (accessDenied) {
    return (
      <AccessDeniedCard
        targetDepartment="Human Resources"
        targetSegment="hr-ns (10.20.10.0/24)"
        targetIp="10.20.10.2:9001"
        errorMessage={deniedError}
        deptKey="hr"
      />
    );
  }

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = deptFilter === 'All' || emp.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  const pendingLeaveCount = leaveRequests.filter(r => r.status === 'Pending').length;

  return (
    <div className="space-y-6">
      {/* Top Header & Micro-Segment Verified Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 border border-sky-500/30 backdrop-blur shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2.5 mb-1.5">
              <span className="p-1.5 bg-sky-500/20 text-sky-400 rounded-lg border border-sky-500/40">
                <Building2 className="w-5 h-5" />
              </span>
              <span className="font-mono text-xs uppercase tracking-widest text-sky-400 font-semibold">
                HR Micro-Segment • Subnet 10.20.10.0/24
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                Zero-Trust Verified
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Human Resources Portal
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Internal workforce management, leave requests, employee directory, and payroll systems.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-700/80 text-right font-mono text-xs">
              <span className="text-slate-400 block text-[10px] uppercase">Service Endpoint</span>
              <span className="text-sky-300 font-semibold">10.20.10.2:9001</span>
            </div>
            <button
              onClick={() => setIsAddEmployeeOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-sky-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-slate-800/60 border border-slate-700/80 rounded-2xl backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Workforce
            </span>
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {portalData?.data?.total_employees || employees.length + 134}
          </p>
          <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
            <span>+4 new hires this month</span>
          </p>
        </div>

        <div className="p-5 bg-slate-800/60 border border-slate-700/80 rounded-2xl backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Pending Leave
            </span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{pendingLeaveCount}</p>
          <p className="text-xs text-amber-300 mt-1">Requires manager review</p>
        </div>

        <div className="p-5 bg-slate-800/60 border border-slate-700/80 rounded-2xl backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Open Requisitions
            </span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{requisitions.length}</p>
          <p className="text-xs text-slate-400 mt-1">Across 4 departments</p>
        </div>

        <div className="p-5 bg-slate-800/60 border border-slate-700/80 rounded-2xl backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Payroll Cycle
            </span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {portalData?.data?.payroll_period || '2026-09'}
          </p>
          <p className="text-xs text-emerald-400 mt-1">Disbursement: Sept 30, 2026</p>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="border-b border-slate-700/80 flex space-x-2">
        <button
          onClick={() => setActiveTab('directory')}
          className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'directory'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Employee Directory</span>
        </button>

        <button
          onClick={() => setActiveTab('leave')}
          className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'leave'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Leave Management</span>
          {pendingLeaveCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold">
              {pendingLeaveCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('payroll')}
          className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'payroll'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Payroll & Compensation</span>
        </button>

        <button
          onClick={() => setActiveTab('recruitment')}
          className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'recruitment'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Hiring & Jobs</span>
        </button>

        <button
          onClick={() => setActiveTab('policies')}
          className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'policies'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Announcements & Policies</span>
        </button>
      </div>

      {/* Tab 1: Employee Directory */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff by name, title, or email..."
                className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="All">All Departments</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Engineering">Engineering</option>
                <option value="Finance">Finance</option>
                <option value="IT Operations">IT Operations</option>
                <option value="Product">Product</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl overflow-hidden backdrop-blur">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 text-xs font-semibold uppercase text-slate-400 tracking-wider border-b border-slate-700/70">
                  <tr>
                    <th className="px-6 py-3.5">Employee</th>
                    <th className="px-6 py-3.5">Role & Department</th>
                    <th className="px-6 py-3.5">Work Location</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Join Date</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4 flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs flex-shrink-0">
                          {emp.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{emp.name}</p>
                          <p className="text-xs text-slate-400">{emp.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-200">{emp.role}</p>
                        <p className="text-xs text-slate-400">{emp.department}</p>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-300">{emp.location}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            emp.status === 'Active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {emp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-400">{emp.joinDate}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedEmployee(emp)}
                          className="px-3 py-1 bg-slate-700/50 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg transition-colors border border-slate-600/50"
                        >
                          View File
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

      {/* Tab 2: Leave & Absence Management */}
      {activeTab === 'leave' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/70">
              <span className="text-xs font-semibold text-slate-400 uppercase">Annual Leave Usage</span>
              <p className="text-xl font-bold text-white mt-1">64.2%</p>
              <div className="w-full bg-slate-700 h-2 rounded-full mt-2 overflow-hidden">
                <div className="bg-sky-500 h-full rounded-full w-[64%]"></div>
              </div>
            </div>
            <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/70">
              <span className="text-xs font-semibold text-slate-400 uppercase">Approved Requests</span>
              <p className="text-xl font-bold text-emerald-400 mt-1">28 this quarter</p>
              <p className="text-xs text-slate-400 mt-1">Average notice: 14 days</p>
            </div>
            <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/70">
              <span className="text-xs font-semibold text-slate-400 uppercase">Awaiting Adjudication</span>
              <p className="text-xl font-bold text-amber-400 mt-1">{pendingLeaveCount} requests</p>
              <p className="text-xs text-slate-400 mt-1">Requires HR signature</p>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl overflow-hidden backdrop-blur">
            <div className="p-4 border-b border-slate-700/70 bg-slate-900/60 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Employee Time Off & Absence Requests</h3>
              <span className="text-xs text-slate-400">Zero-Trust Audit Logged</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 text-xs font-semibold uppercase text-slate-400 tracking-wider border-b border-slate-700/70">
                  <tr>
                    <th className="px-6 py-3.5">Employee</th>
                    <th className="px-6 py-3.5">Leave Type</th>
                    <th className="px-6 py-3.5">Dates & Duration</th>
                    <th className="px-6 py-3.5">Reason / Notes</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Approval Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {leaveRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-white">{req.employee}</p>
                        <p className="text-xs text-slate-400">{req.department}</p>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-200">{req.type}</td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-300">
                        {req.dates} ({req.days} days)
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400 italic">"{req.reason}"</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            req.status === 'Approved'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : req.status === 'Rejected'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {req.status === 'Pending' ? (
                          <>
                            <button
                              onClick={() => handleApproveLeave(req.id)}
                              className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-lg text-xs font-semibold border border-emerald-500/40 transition-colors inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleRejectLeave(req.id)}
                              className="px-3 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 rounded-lg text-xs font-semibold border border-rose-500/40 transition-colors inline-flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-500 font-mono">Resolved</span>
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

      {/* Tab 3: Payroll & Compensation */}
      {activeTab === 'payroll' && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-800/60 border border-slate-700/80 rounded-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-700/70">
              <div>
                <h3 className="font-bold text-lg text-white">September 2026 Payroll Execution</h3>
                <p className="text-xs text-slate-400">Direct deposit cycle authorized via secure VPN micro-segment</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-semibold border border-emerald-500/30">
                  ACH Settlement Scheduled: 2026-09-30
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-5">
              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700/70">
                <span className="text-xs text-slate-400 uppercase">Gross Salaries</span>
                <p className="text-xl font-bold text-white mt-1">$680,000.00</p>
              </div>
              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700/70">
                <span className="text-xs text-slate-400 uppercase">Healthcare & Benefits</span>
                <p className="text-xl font-bold text-sky-400 mt-1">$72,500.00</p>
              </div>
              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700/70">
                <span className="text-xs text-slate-400 uppercase">Tax Withholding</span>
                <p className="text-xl font-bold text-amber-400 mt-1">$145,200.00</p>
              </div>
              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700/70">
                <span className="text-xs text-slate-400 uppercase">Total Disbursement</span>
                <p className="text-xl font-bold text-emerald-400 mt-1">$897,700.00</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl overflow-hidden backdrop-blur">
            <div className="p-4 bg-slate-900/80 border-b border-slate-700/70 flex justify-between items-center">
              <h4 className="font-bold text-white text-sm">Disbursement Register Sample</h4>
              <button
                onClick={() => alert('Downloaded September 2026 Payroll Summary CSV.')}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-700/60 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg border border-slate-600/60 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Register</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/60 text-xs font-semibold uppercase text-slate-400 tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Employee</th>
                    <th className="px-6 py-3">Department</th>
                    <th className="px-6 py-3">Base Pay</th>
                    <th className="px-6 py-3">Deductions</th>
                    <th className="px-6 py-3">Net Payment</th>
                    <th className="px-6 py-3 text-right">Paystub</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-xs">
                  {employees.slice(0, 5).map((emp, i) => (
                    <tr key={emp.id} className="hover:bg-slate-700/20">
                      <td className="px-6 py-3 font-semibold text-white">{emp.name}</td>
                      <td className="px-6 py-3 text-slate-400">{emp.department}</td>
                      <td className="px-6 py-3 font-mono text-slate-300">$10,416.66</td>
                      <td className="px-6 py-3 font-mono text-rose-300">-$2,812.45</td>
                      <td className="px-6 py-3 font-mono font-bold text-emerald-400">$7,604.21</td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => alert(`Generated Paystub PDF for ${emp.name}`)}
                          className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 font-medium"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>PDF</span>
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

      {/* Tab 4: Hiring & Requisitions */}
      {activeTab === 'recruitment' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requisitions.map((req) => (
              <div key={req.id} className="p-5 bg-slate-800/60 border border-slate-700/80 rounded-2xl backdrop-blur space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-sky-400">
                      {req.id}
                    </span>
                    <h4 className="font-bold text-white text-base mt-2">{req.title}</h4>
                    <p className="text-xs text-slate-400">{req.dept} • Hiring Manager: {req.hiringManager}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">
                    {req.stage}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-700/60 text-xs text-slate-300">
                  <span>Applicants in Pipeline: <strong className="text-white">{req.applicants} candidates</strong></span>
                  <button
                    onClick={() => alert(`Reviewing candidate pool for ${req.id}`)}
                    className="px-3 py-1 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 rounded-lg font-medium border border-sky-500/40 transition-colors"
                  >
                    View Pipeline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Announcements & Policies */}
      {activeTab === 'policies' && (
        <div className="space-y-4">
          <div className="p-6 bg-slate-800/50 border border-slate-700/80 rounded-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-sky-400" />
              <span>Corporate HR Announcements</span>
            </h3>

            <div className="space-y-3">
              {(portalData?.data?.announcements || [
                { id: 1, title: 'Annual Open Benefits Enrollment Period Begins October 1', date: '2026-10-01' },
                { id: 2, title: 'Q3 Mid-Year Performance Reviews Due to HR Operations', date: '2026-09-30' },
              ]).map((item) => (
                <div key={item.id} className="p-4 bg-slate-900/60 rounded-xl border border-slate-700/60 flex items-start justify-between">
                  <div>
                    <h5 className="font-semibold text-white text-sm">{item.title}</h5>
                    <p className="text-xs text-slate-400 mt-0.5">Effective Date: {item.date}</p>
                  </div>
                  <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-slate-800 text-slate-300 border border-slate-700">
                    Active Notice
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-700/60">
              <h4 className="text-sm font-semibold text-white mb-2">Corporate Handbooks & Guidelines</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-medium">Employee Handbook 2026.pdf</span>
                  <button onClick={() => alert('Downloading handbook...')} className="text-sky-400 hover:underline">Download</button>
                </div>
                <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-medium">Remote Work & Security Guidelines.pdf</span>
                  <button onClick={() => alert('Downloading policy...')} className="text-sky-400 hover:underline">Download</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {isAddEmployeeOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Add New Employee Record</h3>
            <form onSubmit={handleCreateEmployee} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm"
                  placeholder="e.g. Rachel Miller"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Corporate Email</label>
                <input
                  type="email"
                  required
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm"
                  placeholder="rachel.m@corp.local"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Job Title</label>
                <input
                  type="text"
                  required
                  value={newEmployee.role}
                  onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm"
                  placeholder="e.g. Compensation Analyst"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Department</label>
                <select
                  value={newEmployee.department}
                  onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm"
                >
                  <option value="Human Resources">Human Resources</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Finance">Finance</option>
                  <option value="IT Operations">IT Operations</option>
                  <option value="Product">Product</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsAddEmployeeOpen(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-semibold text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 rounded-xl text-xs font-semibold text-white"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Employee File Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedEmployee.name}</h3>
                <p className="text-xs text-slate-400">{selectedEmployee.role} • {selectedEmployee.department}</p>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-700/60 font-mono text-xs space-y-2 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Corporate Email:</span>
                <span>{selectedEmployee.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Location:</span>
                <span>{selectedEmployee.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Start Date:</span>
                <span>{selectedEmployee.joinDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Security Clearance:</span>
                <span className="text-emerald-400">Micro-Segment Authorized (hr-ns)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Compensation Band:</span>
                <span>L5 Senior Staff</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-semibold text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
