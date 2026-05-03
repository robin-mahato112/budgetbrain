import { read, write } from '../db.js';
import { randomUUID } from 'crypto';

export const createChat = (userId, title) => {
  const db = read();
  const chat = { _id: randomUUID(), user: userId, title, messages: [], createdAt: new Date() };
  db.chats.push(chat);
  write(db);
  return chat;
};

export const findChatById = (id, userId) => {
  const db = read();
  return db.chats.find(c => c._id === id && c.user === userId);
};

export const getUserChats = (userId) => {
  const db = read();
  return db.chats.filter(c => c.user === userId).map(c => ({ _id: c._id, title: c.title, createdAt: c.createdAt }));
};

export const saveChat = (chat) => {
  const db = read();
  const i = db.chats.findIndex(c => c._id === chat._id);
  if (i !== -1) db.chats[i] = chat;
  write(db);
};

export const deleteChat = (id, userId) => {
  const db = read();
  db.chats = db.chats.filter(c => !(c._id === id && c.user === userId));
  write(db);
};