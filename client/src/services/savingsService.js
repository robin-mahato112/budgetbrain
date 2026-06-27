import api from './api';

export const savingsService = {
  getGoals: () => api.get('/api/finance/savings-goals').then(({ data }) => data),
  createGoal: (payload) => api.post('/api/finance/savings-goals', payload).then(({ data }) => data),
  updateGoal: (id, payload) => api.patch(`/api/finance/savings-goals/${id}`, payload).then(({ data }) => data),
  deleteGoal: (id) => api.delete(`/api/finance/savings-goals/${id}`),
};
