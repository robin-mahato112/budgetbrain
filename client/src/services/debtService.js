import api from './api';

export const debtService = {
  getDebts: () => api.get('/api/finance/debts').then(({ data }) => data),
  createDebt: (payload) => api.post('/api/finance/debts', payload).then(({ data }) => data),
  updateDebt: (id, payload) => api.patch(`/api/finance/debts/${id}`, payload).then(({ data }) => data),
  deleteDebt: (id) => api.delete(`/api/finance/debts/${id}`),
};
