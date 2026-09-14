import api from './api';

export const vpnService = {
  // WireGuard Configs
  getUserConfig: async (userId, download = false) => {
    if (download) {
      const response = await api.get(`/wireguard/config/${userId}?download=true`, {
        responseType: 'blob',
      });
      return response.data;
    }
    const response = await api.get(`/wireguard/config/${userId}`);
    return response.data;
  },

  generateKeys: async (userId) => {
    const response = await api.post(`/wireguard/generate/${userId}`);
    return response.data;
  },

  getWireGuardStatus: async () => {
    const response = await api.get('/wireguard/status');
    return response.data;
  },

  getPeers: async () => {
    const response = await api.get('/wireguard/peers');
    return response.data;
  },

  removePeer: async (userId) => {
    const response = await api.delete(`/wireguard/peer/${userId}`);
    return response.data;
  },

  // Users CRUD
  getUsers: async (params = {}) => {
    const response = await api.get('/users', { params });
    return response.data;
  },

  getUser: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  createUser: async (data) => {
    const response = await api.post('/users', data);
    return response.data;
  },

  updateUser: async (id, data) => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  activateUser: async (id) => {
    const response = await api.post(`/users/${id}/activate`);
    return response.data;
  },

  deactivateUser: async (id) => {
    const response = await api.post(`/users/${id}/deactivate`);
    return response.data;
  },

  // Roles CRUD
  getRoles: async () => {
    const response = await api.get('/roles');
    return response.data;
  },

  createRole: async (data) => {
    const response = await api.post('/roles', data);
    return response.data;
  },

  updateRole: async (id, data) => {
    const response = await api.put(`/roles/${id}`, data);
    return response.data;
  },

  // Department Portals
  getPortal: async (department) => {
    const response = await api.get(`/portals/${department}`);
    return response.data;
  },

  // Logs and Monitoring
  getAuditLogs: async (params = {}) => {
    const response = await api.get('/logs/audit', { params });
    return response.data;
  },

  getViolations: async (params = {}) => {
    const response = await api.get('/logs/violations', { params });
    return response.data;
  },

  getSummary: async () => {
    const response = await api.get('/logs/summary');
    return response.data;
  },

  // Sessions
  getSessions: async (params = {}) => {
    const response = await api.get('/sessions', { params });
    return response.data;
  },

  getActiveSessions: async () => {
    const response = await api.get('/sessions/active');
    return response.data;
  },

  disconnectSession: async (sessionId) => {
    const response = await api.post(`/sessions/disconnect/${sessionId}`);
    return response.data;
  },
};
