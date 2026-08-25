import api from './api';

export const budgetService = {
  getSummary: () => api.get('/api/finance/summary').then(({ data }) => data),
  getTransactions: (limit = 50, search = '') => api.get('/api/finance/transactions', { params: { limit, search } }).then(({ data }) => data.map(normalizeTransaction)),
  getInsights: () => api.get('/api/finance/insights').then(({ data }) => data),
  getFinancialState: () => api.get('/api/finance/financial-state').then(({ data }) => data),
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
  previewCsvImport: (csvText, fileName, mapping = {}) => api.post('/api/finance/transactions/import/preview', csvText, {
    headers: { 'Content-Type': 'text/csv', 'X-File-Name': fileName, 'X-Column-Mapping': JSON.stringify(mapping) },
  }).then(({ data }) => data),
  confirmCsvImport: (id) => api.post(`/api/finance/transactions/import/${id}/confirm`).then(({ data }) => data),
  getCsvImports: () => api.get('/api/finance/transactions/imports').then(({ data }) => data),
  deleteCsvImport: (id, deleteTransactions = false) => api.delete(`/api/finance/transactions/import/${id}`, { params: { deleteTransactions } }).then(({ data }) => data),
  updateTransactionCategory: (id, category) => api.patch(`/api/finance/transactions/${id}/category`, { category }).then(({ data }) => data),
  getRecurringPatterns: () => api.get('/api/finance/recurring').then(({ data }) => data),
  updateRecurringPattern: (id, protectionStatus) => api.patch(`/api/finance/recurring/${id}`, { protectionStatus }).then(({ data }) => data),
  getYnabStatus: () => api.get('/api/integrations/ynab/status').then(({ data }) => data),
  startYnabConnection: () => api.get('/api/integrations/ynab/connect').then(({ data }) => data),
  getYnabBudgets: () => api.get('/api/integrations/ynab/budgets').then(({ data }) => data),
  selectYnabBudget: (budgetId, name) => api.post('/api/integrations/ynab/select-budget', { budgetId, name }).then(({ data }) => data),
  syncYnab: () => api.post('/api/integrations/ynab/sync').then(({ data }) => data),
  disconnectYnab: (deleteHistory = false) => api.delete('/api/integrations/ynab', { params: { deleteHistory } }).then(({ data }) => data),
  getPayday: () => api.get('/api/finance/payday').then(({ data }) => data),
  savePayday: (payload) => api.put('/api/finance/payday', payload).then(({ data }) => data),
  getProtectedCosts: () => api.get('/api/finance/protected-costs').then(({ data }) => data),
  createProtectedCost: (payload) => api.post('/api/finance/protected-costs', payload).then(({ data }) => data),
  updateProtectedCost: (id, payload) => api.patch(`/api/finance/protected-costs/${id}`, payload).then(({ data }) => data),
  deleteProtectedCost: (id) => api.delete(`/api/finance/protected-costs/${id}`).then(({ data }) => data),
  createTransaction: (payload) => api.post('/api/finance/transactions', payload).then(({ data }) => normalizeTransaction(data)),
  updateTransaction: (id, payload) => api.patch(`/api/finance/transactions/${id}`, payload).then(({ data }) => normalizeTransaction(data)),
  deleteTransaction: (id) => api.delete(`/api/finance/transactions/${id}`),
  markTransactionRecurring: (id, cadence) => api.post(`/api/finance/transactions/${id}/recurring`, { cadence }).then(({ data }) => data),
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
