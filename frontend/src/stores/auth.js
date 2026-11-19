
import { defineStore } from 'pinia';
import api from '../services/api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('access_token') || null,
    user: JSON.parse(localStorage.getItem('auth_user') || 'null'),
    loading: false,
    initialized: false,
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.token && state.user),

    userRole: (state) => state.user?.role || null,

    isAdmin: (state) => state.user?.role === 'ADMIN',

    isTechnician: (state) => state.user?.role === 'TECHNICIAN',

    isUser: (state) => state.user?.role === 'USER',
  },

  actions: {
    async login(username, password) {
      this.loading = true;

      try {
        const response = await api.post('/auth/login', {
          username,
          password,
        });

        const data = response.data.data;

        this.token = data.token;
        this.user = data.user;

        localStorage.setItem('access_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));

        return {
          success: true,
          user: data.user,
        };
      } catch (error) {
        return {
          success: false,
          message:
            error.response?.data?.message ||
            'Unable to connect to the server.',
        };
      } finally {
        this.loading = false;
      }
    },

    async fetchUser() {
      if (!this.token) {
        this.initialized = true;
        return false;
      }

      try {
        const response = await api.get('/auth/me');

        this.user = response.data.data.user;

        localStorage.setItem(
          'auth_user',
          JSON.stringify(this.user)
        );

        return true;
      } catch {
        this.clearAuth();
        return false;
      } finally {
        this.initialized = true;
      }
    },

    async logout() {
      try {
        if (this.token) {
          await api.post('/auth/logout');
        }
      } catch (error) {
        console.error('Logout request failed:', error);
      } finally {
        this.clearAuth();
      }
    },

    clearAuth() {
      this.token = null;
      this.user = null;

      localStorage.removeItem('access_token');
      localStorage.removeItem('auth_user');
    },
  },
});
