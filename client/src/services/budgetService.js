import api from './api';

export const budgetService = {
  getSummary: () => api.get('/api/finance/summary').then(({ data }) => data),
  getTransactions: (limit = 50, search = '') => api.get('/api/finance/transactions', { params: { limit, search } }).then(({ data }) => data.map(normalizeTransaction)),
  getInsights: () => api.get('/api/finance/insights').then(({ data }) => data),
  checkAffordability: (payload) => api.post('/api/finance/affordability', payload).then(({ data }) => data),
  getDemoScenarios: () => api.get('/api/demo-bank/scenarios').then(({ data }) => data),
  connectDemoBank: (scenario) => api.post('/api/demo-bank/connect', { scenario }).then(({ data }) => data),
  syncDemoBank: (scenario) => api.post('/api/demo-bank/sync', { scenario }).then(({ data }) => data),
  disconnectDemoBank: () => api.delete('/api/demo-bank/disconnect').then(({ data }) => data),
  uploadDocument: ({ file, kind }) => api.post('/api/finance/documents/upload', file, {
    params: { kind },
    headers: {
      'Content-Type': file.type,
      'X-File-Name': file.name,
      'X-Document-Kind': kind,
    },
  }).then(({ data }) => data),
  quickAddPreview: (text) => api.post('/api/finance/documents/quick-add', { text }).then(({ data }) => data),
  confirmDocument: (id, editedData) => api.post(`/api/finance/documents/${id}/confirm`, { editedData }).then(({ data }) => data),
  deleteDocument: (id) => api.delete(`/api/finance/documents/${id}`),
  importTransactions: (csvText) => api.post('/api/finance/transactions/import', csvText, {
    headers: { 'Content-Type': 'text/csv' },
  }).then(({ data }) => data),
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
