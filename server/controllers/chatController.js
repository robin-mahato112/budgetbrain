import Groq from 'groq-sdk';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { getAiUsage, recordAiTokens, reserveAiRequest } from '../services/usageService.js';

const groq = new Groq({ apiKey: env.GROQ_API_KEY });
const model = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `You are BudgetBrain, an AI financial education assistant for Australian users.
Provide balanced, general educational information about budgeting, saving, debt and financial planning.
Do not claim to be a financial adviser and do not provide personalised financial product recommendations.
Never promise returns or certainty. Explain material risks and assumptions.
Encourage users to verify important information and consult an appropriately licensed professional when relevant.
Never ask for passwords, account numbers, tax file numbers, card details or identity documents.`;

const mapMessage = (message) => ({
  role: message.role === 'ASSISTANT' ? 'assistant' : 'user',
  content: message.content,
});

export async function sendMessage(req, res) {
  const { message, chatId } = req.body;
  let chat;

  if (chatId) {
    chat = await prisma.chat.findFirst({
      where: { id: chatId, userId: req.user.id },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!chat) throw new AppError(404, 'CHAT_NOT_FOUND', 'Chat not found');
  } else {
    chat = { id: null, title: message.slice(0, 40), messages: [] };
  }

  await reserveAiRequest(req.user.id);
  const history = [...chat.messages.reverse().map(mapMessage), { role: 'user', content: message }];

  let completion;
  try {
    completion = await groq.chat.completions.create({
      model,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
      max_tokens: 1024,
    });
  } catch {
    throw new AppError(502, 'AI_PROVIDER_ERROR', 'The AI service is temporarily unavailable');
  }

  const reply = completion.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new AppError(502, 'AI_EMPTY_RESPONSE', 'The AI service returned an empty response');

  const saved = await prisma.$transaction(async (tx) => {
    const savedChat = chat.id
      ? await tx.chat.update({ where: { id: chat.id }, data: { updatedAt: new Date() } })
      : await tx.chat.create({ data: { userId: req.user.id, title: chat.title } });
    await tx.message.createMany({
      data: [
        { chatId: savedChat.id, role: 'USER', content: message },
        { chatId: savedChat.id, role: 'ASSISTANT', content: reply },
      ],
    });
    return savedChat;
  });

  await recordAiTokens(req.user.id, completion.usage).catch(() => {});
  res.json({ chatId: saved.id, reply, title: saved.title, usage: await getAiUsage(req.user.id) });
}

export async function getChats(req, res) {
  const chats = await prisma.chat.findMany({
    where: { userId: req.user.id },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });
  res.json(chats.map(({ id, ...chat }) => ({ _id: id, ...chat })));
}

export async function getChatById(req, res) {
  const chat = await prisma.chat.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!chat) throw new AppError(404, 'CHAT_NOT_FOUND', 'Chat not found');
  res.json({
    _id: chat.id,
    title: chat.title,
    createdAt: chat.createdAt,
    messages: chat.messages.map(mapMessage),
  });
}

export async function deleteChatRoute(req, res) {
  const deleted = await prisma.chat.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
  if (!deleted.count) throw new AppError(404, 'CHAT_NOT_FOUND', 'Chat not found');
  res.json({ message: 'Chat deleted' });
}

export async function usageStatus(req, res) {
  res.json(await getAiUsage(req.user.id));
}
