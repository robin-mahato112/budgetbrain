import Groq from 'groq-sdk';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';

const missingConfigMessage = 'AI features are not configured. Please add GROQ_API_KEY on the server.';

export function assertAiConfigured() {
  if (!env.AI_FEATURES_ENABLED) {
    throw new AppError(503, 'AI_FEATURES_DISABLED', 'AI features are currently disabled.');
  }
  if (!process.env.GROQ_API_KEY) {
    throw new AppError(503, 'AI_NOT_CONFIGURED', missingConfigMessage);
  }
}

export async function createGroqChatCompletion({ messages, maxTokens = 1024 }) {
  assertAiConfigured();
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return client.chat.completions.create({
    model: process.env.GROQ_MODEL || env.GROQ_MODEL,
    messages,
    max_tokens: maxTokens,
  });
}

export function aiNotConfiguredMessage() {
  return missingConfigMessage;
}
