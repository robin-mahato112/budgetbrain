import api from './api';

export const chatService = {
  list: () => api.get('/api/chat').then(({ data }) => data),
  getById: (id) => api.get(`/api/chat/${id}`).then(({ data }) => data),
  send: (message, chatId) => api.post('/api/chat/message', { message, chatId }).then(({ data }) => data),
  remove: (id) => api.delete(`/api/chat/${id}`).then(({ data }) => data),
};
