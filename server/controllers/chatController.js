import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { buildAiFinancialContext, buildMonthlyInsights, monthBounds } from '../services/financialContextService.js';
import { assertAiConfigured, createGroqChatCompletion } from '../services/groqService.js';
import { getAiUsage, recordAiTokens, reserveAiRequest } from '../services/usageService.js';

const SYSTEM_PROMPT = `You are BudgetBrain, an AI financial education assistant for Australian users.
Provide balanced, general educational information about budgeting, saving, debt and financial planning.
Do not claim to be a financial adviser and do not provide personalised financial product recommendations.
Never promise returns or certainty. Explain material risks and assumptions.
Encourage users to verify important information and consult an appropriately licensed professional when relevant.
Never ask for passwords, account numbers, tax file numbers, card details or identity documents.
When financial context is provided, use only that summarized context and keep the response educational.
When financial context includes a money mode, tailor the response to Freedom Mode, Watch Mode, or Recovery Mode without shame or judgment.`;

const mapMessage = (message) => ({
  role: message.role === 'ASSISTANT' ? 'assistant' : 'user',
  content: message.content,
});

export async function sendMessage(req, res) {
  assertAiConfigured();
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
  const context = await getUserFinancialContext(req.user.id);
  const history = [
    { role: 'system', content: context },
    ...chat.messages.reverse().map(mapMessage),
    { role: 'user', content: message },
  ];

  let completion;
  try {
    completion = await createGroqChatCompletion({
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
      maxTokens: 1024,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
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

export async function monthlySummary(req, res) {
  assertAiConfigured();
  await reserveAiRequest(req.user.id);
  const context = await getUserFinancialContext(req.user.id);

  let completion;
  try {
    completion = await createGroqChatCompletion({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'system', content: context },
        {
          role: 'user',
          content: 'Generate a concise mode-aware action plan. Include: short diagnosis, main risk, one realistic action for this week, and an optional Can I afford this? explanation when useful. Use supportive language and include a short reminder that this is general education, not financial advice.',
        },
      ],
      maxTokens: 700,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(502, 'AI_PROVIDER_ERROR', 'The AI service is temporarily unavailable');
  }

  const summary = completion.choices?.[0]?.message?.content?.trim();
  if (!summary) throw new AppError(502, 'AI_EMPTY_RESPONSE', 'The AI service returned an empty response');
  await recordAiTokens(req.user.id, completion.usage).catch(() => {});
  res.json({ summary, usage: await getAiUsage(req.user.id) });
}

export async function actionPlan(req, res) {
  assertAiConfigured();
  await reserveAiRequest(req.user.id);
  const context = await getUserFinancialContext(req.user.id);

  let completion;
  try {
    completion = await createGroqChatCompletion({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'system', content: context },
        {
          role: 'user',
          content: 'Create a short action plan for the current money mode. Include diagnosis, main risk, one action this week, and supportive educational wording.',
        },
      ],
      maxTokens: 700,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(502, 'AI_PROVIDER_ERROR', 'The AI service is temporarily unavailable');
  }

  const plan = completion.choices?.[0]?.message?.content?.trim();
  if (!plan) throw new AppError(502, 'AI_EMPTY_RESPONSE', 'The AI service returned an empty response');
  await recordAiTokens(req.user.id, completion.usage).catch(() => {});
  res.json({ plan, usage: await getAiUsage(req.user.id) });
}

export async function explainSafeToSpend(req, res) {
  assertAiConfigured();
  await reserveAiRequest(req.user.id);
  const { insights } = await getUserFinancialInsights(req.user.id);
  const safeSummary = [
    `Mode: ${insights.moneyMode.name}`,
    `Current balance: ${insights.moneyMode.currentBalance.toFixed(2)}`,
    `Confirmed income before payday: 0.00`,
    `Protected money before payday: ${insights.moneyMode.protectedMoney.toFixed(2)}`,
    `Safe to spend: ${insights.moneyMode.guiltFreeSpending.toFixed(2)}`,
    `Recovery gap: ${insights.moneyMode.recoveryGap.toFixed(2)}`,
    `Next payday: ${insights.moneyMode.nextPayday}`,
    `Confidence: ${insights.confidence.level}`,
  ].join('\n');

  let completion;
  try {
    completion = await createGroqChatCompletion({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'system', content: safeSummary },
        {
          role: 'user',
          content: 'Explain the safe-to-spend number in one or two supportive sentences. Do not recalculate values. Do not give investment, tax, legal, or professional advice.',
        },
      ],
      maxTokens: 220,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(502, 'AI_PROVIDER_ERROR', 'The AI service is temporarily unavailable');
  }

  const explanation = completion.choices?.[0]?.message?.content?.trim();
  if (!explanation) throw new AppError(502, 'AI_EMPTY_RESPONSE', 'The AI service returned an empty response');
  await recordAiTokens(req.user.id, completion.usage).catch(() => {});
  res.json({ explanation, usage: await getAiUsage(req.user.id) });
}

async function getUserFinancialContext(userId) {
  const { insights } = await getUserFinancialInsights(userId);
  return buildAiFinancialContext(insights.transactionsForAi, insights.optionsForAi);
}

async function getUserFinancialInsights(userId) {
  const { start, end } = monthBounds();
  const previousStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 1, 1));
  const [transactions, previousTransactions, debts, goals] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, occurredAt: { gte: start, lt: end } },
      orderBy: { occurredAt: 'desc' },
      take: 200,
    }),
    prisma.transaction.findMany({
      where: { userId, occurredAt: { gte: previousStart, lt: start } },
      take: 200,
    }),
    prisma.debt.findMany({ where: { userId } }),
    prisma.savingsGoal.findMany({ where: { userId } }),
  ]);
  const optionsForAi = { previousTransactions, debts, goals };
  return {
    insights: {
      ...buildMonthlyInsights(transactions, optionsForAi),
      transactionsForAi: transactions,
      optionsForAi,
    },
  };
}
