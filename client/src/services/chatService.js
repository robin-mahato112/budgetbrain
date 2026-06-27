import api from './api';

export const chatService = {
  explainSafeToSpend: () => api.post('/api/ai/explain-safe-to-spend').then(({ data }) => data),
};
