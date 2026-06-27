import api from './api';

export const authService = {
  login: (credentials) => api.post('/api/auth/login', credentials).then(({ data }) => data),
  register: (payload) => api.post('/api/auth/register', payload).then(({ data }) => data),
  getProfile: () => api.get('/api/auth/me').then(({ data }) => data),
  exportData: () => api.get('/api/auth/export').then(({ data }) => data),
  deleteAccount: (password) => api.delete('/api/auth/account', { data: { password } }).then(({ data }) => data),
};
