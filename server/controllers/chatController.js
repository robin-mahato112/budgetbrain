import 'dotenv/config';
import Groq from 'groq-sdk';
import { createChat, findChatById, getUserChats, saveChat, deleteChat } from '../models/Chat.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
console.log('GROQ KEY LOADED:', process.env.GROQ_API_KEY ? 'YES' : 'NO');

const SYSTEM_PROMPT = `You are BudgetBrain, an expert AI financial advisor. You help users with budgeting, saving, investing, debt management, and financial planning. Always give practical advice and remind users to consult a certified financial advisor for major decisions.`;

export const sendMessage = async (req, res) => {
  try {
    const { message, chatId } = req.body;
    console.log('Message received:', message);
    let chat;
    if (chatId) {
      chat = findChatById(chatId, req.user._id);
      if (!chat) return res.status(404).json({ message: 'Chat not found' });
    } else {
      chat = createChat(req.user._id, message.slice(0, 40));
    }
    chat.messages.push({ role: 'user', content: message });
    const history = chat.messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
      max_tokens: 1024,
    });
    const reply = completion.choices[0].message.content;
    console.log('Groq replied successfully');
    chat.messages.push({ role: 'assistant', content: reply });
    saveChat(chat);
    res.json({ chatId: chat._id, reply, title: chat.title });
  } catch (err) {
    console.error('ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
};

export const getChats = (req, res) => {
  try {
    res.json(getUserChats(req.user._id));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getChatById = (req, res) => {
  try {
    const chat = findChatById(req.params.id, req.user._id);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    res.json(chat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteChatRoute = (req, res) => {
  try {
    deleteChat(req.params.id, req.user._id);
    res.json({ message: 'Chat deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};