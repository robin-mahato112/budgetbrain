import api from './api';

export const budgetService = {
  getSummary: () => api.get('/api/finance/summary').then(({ data }) => data),
  getBudgets: () => api.get('/api/finance/budgets').then(({ data }) => data),
  getTransactions: (limit = 50) => api.get('/api/finance/transactions', { params: { limit } }).then(({ data }) => data.map(normalizeTransaction)),
  getSpendingTrend: () => api.get('/api/finance/spending-trend').then(({ data }) => data),
  createBudget: (payload) => api.post('/api/finance/budgets', payload).then(({ data }) => data),
  updateBudget: (id, payload) => api.patch(`/api/finance/budgets/${id}`, payload).then(({ data }) => data),
  deleteBudget: (id) => api.delete(`/api/finance/budgets/${id}`),
  createTransaction: (payload) => api.post('/api/finance/transactions', payload).then(({ data }) => normalizeTransaction(data)),
  deleteTransaction: (id) => api.delete(`/api/finance/transactions/${id}`),
};

function normalizeTransaction(transaction) {
  const occurredAt = new Date(transaction.occurredAt);
  return {
    ...transaction,
    date: Number.isNaN(occurredAt.getTime())
      ? 'Date unavailable'
      : occurredAt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
  };
}
