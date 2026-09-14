import { create } from 'zustand';
import api from '../services/api';

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user_profile') || 'null'),
  token: localStorage.getItem('access_token') || null,
  refreshToken: localStorage.getItem('refresh_token') || null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  isLoading: false,
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', { username, password });
      const { access_token, refresh_token, user } = response.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user_profile', JSON.stringify(user));

      set({
        token: access_token,
        refreshToken: refresh_token,
        user: user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return { success: true, user };
    } catch (err) {
      const msg = err.response?.data?.detail || 'Authentication failed. Please check your credentials.';
      set({ error: msg, isLoading: false });
      return { success: false, error: msg };
    }
  },

  logout: async () => {
    try {
      const refreshToken = get().refreshToken;
      await api.post('/auth/logout', { refresh_token: refreshToken });
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_profile');
      set({
        token: null,
        refreshToken: null,
        user: null,
        isAuthenticated: false,
        error: null,
      });
    }
  },

  checkAuth: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }

    try {
      const resp = await api.get('/auth/me');
      const user = resp.data;
      localStorage.setItem('user_profile', JSON.stringify(user));
      set({ user, isAuthenticated: true });
    } catch (e) {
      // Token will be refreshed by interceptor or logged out
    }
  },

  clearError: () => set({ error: null }),
}));
