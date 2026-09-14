import React, { useEffect, useState } from 'react';
import { vpnService } from '../../services/vpnService';
import Modal from '../../components/Modal';
import {
  Users,
  UserPlus,
  Search,
  Download,
  KeyRound,
  Trash2,
  CheckCircle,
  XCircle,
  Edit2,
  Loader2,
  ShieldAlert
} from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    department: 'HR',
    role_id: '',
    is_admin: false,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, rolesData] = await Promise.all([
        vpnService.getUsers({ search: search || undefined, role_id: selectedRole || undefined }),
        vpnService.getRoles(),
      ]);
      setUsers(usersData.items || []);
      setRoles(rolesData || []);
      if (rolesData.length > 0 && !formData.role_id) {
        setFormData((prev) => ({ ...prev, role_id: rolesData[0].id }));
      }
    } catch (err) {
      console.error('Failed to load user directory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedRole]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await vpnService.createUser(formData);
      setIsCreateOpen(false);
      setFormData({
        username: '',
        email: '',
        full_name: '',
        password: '',
        department: 'HR',
        role_id: roles[0]?.id || '',
        is_admin: false,
      });
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      await vpnService.updateUser(currentUser.id, {
        department: currentUser.department,
        role_id: currentUser.role_id,
        is_admin: currentUser.is_admin,
      });
      setIsEditOpen(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update user');
    }
  };

  const handleDelete = async (id, username) => {
    if (!confirm(`Are you sure you want to permanently delete user '${username}'?`)) return;
    try {
      await vpnService.deleteUser(id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handleToggleActive = async (user) => {
    try {
      if (user.is_active) {
        await vpnService.deactivateUser(user.id);
      } else {
        await vpnService.activateUser(user.id);
      }
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update user status');
    }
  };

  const handleDownloadConfig = async (user) => {
    try {
      const blob = await vpnService.getUserConfig(user.id, true);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `wg0-${user.username}.conf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download user configuration');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title and Add User Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-sky-400" />
            <span>User Directory & VPN Keys</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage enterprise identities, roles, and automated WireGuard keypair provisioning.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-sky-500/20 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision New User</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-800/40 border border-slate-700/60 rounded-2xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by username, email, name..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All Roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl overflow-hidden backdrop-blur shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
            <p className="text-xs">Loading directory...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-sm">No users found matching query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-700">
                <tr>
                  <th className="px-5 py-3.5">User Identity</th>
                  <th className="px-5 py-3.5">Role / Department</th>
                  <th className="px-5 py-3.5">Assigned VPN IP</th>
                  <th className="px-5 py-3.5">Account Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white text-sm">{u.full_name}</div>
                      <div className="text-slate-400 text-[11px] font-mono mt-0.5">
                        @{u.username} • {u.email}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-semibold text-sky-400 px-2 py-0.5 rounded bg-sky-950/80 border border-sky-800 text-[11px]">
                          {u.role?.name || 'User'}
                        </span>
                        {u.is_admin && (
                          <span className="font-semibold text-amber-400 px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-[10px]">
                            Admin
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-1">{u.department}</span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="font-mono text-emerald-400 text-xs px-2 py-1 rounded bg-slate-900/80 border border-slate-700">
                        {u.wireguard_client_id ? 'Allocated (wg0)' : 'Pending'}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                          u.is_active
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                            : 'bg-rose-950/60 text-rose-400 border border-rose-800'
                        }`}
                      >
                        {u.is_active ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" />
                            <span>Disabled</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleDownloadConfig(u)}
                          title="Download .conf file"
                          className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        >
                          <Download className="w-4 h-4 text-sky-400" />
                        </button>
                        <button
                          onClick={() => {
                            setCurrentUser(u);
                            setIsEditOpen(true);
                          }}
                          title="Edit user"
                          className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-slate-300" />
                        </button>
                        <button
                          onClick={() => handleDelete(u.id, u.username)}
                          title="Delete user"
                          className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-rose-900/60 text-slate-300 hover:text-rose-300 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Provision New Enterprise VPN User"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Username</label>
            <input
              type="text"
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-sky-500"
              placeholder="e.g. jdoe"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Email Address</label>
            <input
              type="text"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-sky-500"
              placeholder="e.g. jdoe@vpn.local"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-sky-500"
              placeholder="e.g. Jane Doe"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Initial Password</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-sky-500"
              placeholder="••••••••••••"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
              >
                <option value="HR">HR</option>
                <option value="Finance">Finance</option>
                <option value="IT">IT</option>
                <option value="Operations">Operations</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Assigned Role</label>
              <select
                value={formData.role_id}
                onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="is_admin"
              checked={formData.is_admin}
              onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
              className="rounded border-slate-700 bg-slate-900 text-sky-600 focus:ring-sky-500"
            />
            <label htmlFor="is_admin" className="text-slate-300 font-medium cursor-pointer">
              Grant Administrator Privileges
            </label>
          </div>

          <div className="p-3 bg-sky-950/40 border border-sky-800/60 rounded-xl text-sky-300 text-[11px]">
            ⚡ WireGuard keypair generation and VPN IP allocation (10.10.0.x) are automatically performed upon creation.
          </div>

          <div className="flex justify-end space-x-3 pt-3">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-slate-200 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl font-semibold shadow"
            >
              Provision Account
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      {currentUser && (
        <Modal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title={`Edit User: ${currentUser.username}`}
        >
          <form onSubmit={handleEditUser} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Department</label>
              <input
                type="text"
                value={currentUser.department}
                onChange={(e) => setCurrentUser({ ...currentUser, department: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Role Assignment</label>
              <select
                value={currentUser.role_id}
                onChange={(e) => setCurrentUser({ ...currentUser, role_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.allowed_segments?.join(', ') || 'none'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="edit_is_admin"
                checked={currentUser.is_admin}
                onChange={(e) => setCurrentUser({ ...currentUser, is_admin: e.target.checked })}
                className="rounded border-slate-700 bg-slate-900 text-sky-600"
              />
              <label htmlFor="edit_is_admin" className="text-slate-300 font-medium cursor-pointer">
                Administrator Privileges
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-slate-200 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl font-semibold shadow"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
