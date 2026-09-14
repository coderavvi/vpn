import React, { useEffect, useState } from 'react';
import { vpnService } from '../../services/vpnService';
import Modal from '../../components/Modal';
import {
  ShieldCheck,
  Plus,
  Edit2,
  Layers,
  Users,
  CheckCircle2,
  Loader2
} from 'lucide-react';

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState(null);

  const availableSegments = [
    { id: 'hr-ns', label: 'HR Segment (10.20.10.0/24)' },
    { id: 'finance-ns', label: 'Finance Segment (10.20.20.0/24)' },
    { id: 'it-ns', label: 'IT Segment (10.20.30.0/24)' },
  ];

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    allowed_segments: [],
  });

  const loadRoles = async () => {
    try {
      setLoading(true);
      const data = await vpnService.getRoles();
      setRoles(data || []);
    } catch (err) {
      console.error('Failed to load roles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const handleToggleSegment = (segId, isEdit = false) => {
    if (isEdit && currentRole) {
      const current = currentRole.allowed_segments || [];
      const updated = current.includes(segId)
        ? current.filter((s) => s !== segId)
        : [...current, segId];
      setCurrentRole({ ...currentRole, allowed_segments: updated });
    } else {
      const current = formData.allowed_segments;
      const updated = current.includes(segId)
        ? current.filter((s) => s !== segId)
        : [...current, segId];
      setFormData({ ...formData, allowed_segments: updated });
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await vpnService.createRole(formData);
      setIsCreateOpen(false);
      setFormData({ name: '', description: '', allowed_segments: [] });
      loadRoles();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create role');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!currentRole) return;
    try {
      await vpnService.updateRole(currentRole.id, {
        name: currentRole.name,
        description: currentRole.description,
        allowed_segments: currentRole.allowed_segments,
      });
      setIsEditOpen(false);
      loadRoles();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update role');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-sky-400" />
            <span>Role-Based Micro-Segmentation Policies</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Map organizational roles to Linux Network Namespaces for granular zero-trust packet filtering.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-sky-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Define New Role</span>
        </button>
      </div>

      {/* Roles Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
          <p className="text-xs">Loading roles...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {roles.map((r) => (
            <div
              key={r.id}
              className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 backdrop-blur space-y-4 hover:border-slate-600 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-sky-950 text-sky-400 rounded-xl border border-sky-800">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white">{r.name}</h3>
                </div>

                <button
                  onClick={() => {
                    setCurrentRole(r);
                    setIsEditOpen(true);
                  }}
                  className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Edit role"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-400">{r.description || 'No description provided.'}</p>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Permitted Network Segments:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {r.allowed_segments?.length > 0 ? (
                    r.allowed_segments.map((seg) => (
                      <span
                        key={seg}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-sky-950/80 border border-sky-800 text-sky-300 font-mono text-xs"
                      >
                        <CheckCircle2 className="w-3 h-3 text-sky-400" />
                        <span>{seg}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">No network segments permitted (Isolated)</span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center space-x-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>{r.user_count} Assigned Users</span>
                </div>
                <span className="font-mono text-[10px] text-slate-500">{r.id}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Role Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Define Enterprise Role">
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Role Identifier</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-sky-500"
              placeholder="e.g. Compliance Officer"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-sky-500"
              placeholder="Responsibilities and access scope..."
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-2">Permitted Network Micro-Segments</label>
            <div className="space-y-2">
              {availableSegments.map((seg) => (
                <label
                  key={seg.id}
                  className="flex items-center space-x-2.5 p-2 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer hover:bg-slate-850"
                >
                  <input
                    type="checkbox"
                    checked={formData.allowed_segments.includes(seg.id)}
                    onChange={() => handleToggleSegment(seg.id, false)}
                    className="rounded border-slate-700 bg-slate-800 text-sky-600"
                  />
                  <span className="text-slate-300 font-mono">{seg.label}</span>
                </label>
              ))}
            </div>
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
              Save Role
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Role Modal */}
      {currentRole && (
        <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Edit Role: ${currentRole.name}`}>
          <form onSubmit={handleUpdate} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Description</label>
              <textarea
                rows={2}
                value={currentRole.description || ''}
                onChange={(e) => setCurrentRole({ ...currentRole, description: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-2">Permitted Network Micro-Segments</label>
              <div className="space-y-2">
                {availableSegments.map((seg) => (
                  <label
                    key={seg.id}
                    className="flex items-center space-x-2.5 p-2 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={(currentRole.allowed_segments || []).includes(seg.id)}
                      onChange={() => handleToggleSegment(seg.id, true)}
                      className="rounded border-slate-700 bg-slate-800 text-sky-600"
                    />
                    <span className="text-slate-300 font-mono">{seg.label}</span>
                  </label>
                ))}
              </div>
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
                Update Role
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
