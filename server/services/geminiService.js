import { env } from '../config/env.js';

export function geminiStatus() {
  const configured = Boolean(process.env.GEMINI_API_KEY) && env.GEMINI_OCR_ENABLED;
  return {
    configured,
    model: env.GEMINI_MODEL,
    message: configured
      ? 'Gemini OCR extraction is available.'
      : 'Gemini OCR is not configured. Review and enter the details manually.',
  };
}
