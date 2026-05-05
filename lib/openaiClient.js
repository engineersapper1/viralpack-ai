import OpenAI from 'openai';

let cached = null;

export function getOpenAIClient() {
  if (cached) return cached;
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is missing.');
  }
  cached = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return cached;
}

export function extractJson(text) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('OpenAI returned an empty response.');

  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('OpenAI did not return JSON.');
    return JSON.parse(match[0]);
  }
}
