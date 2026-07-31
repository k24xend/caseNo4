import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runAssistant, type AssistantBody } from './assistant-core';

/**
 * Grok (xAI / SpaceXAI) proxy via Responses API.
 * Env: XAI_API_KEY (Vercel project env or root .env for local).
 * Client falls back to local financial answers if this returns non-2xx.
 *
 * @see https://docs.x.ai/docs/guides/chat
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const key = process.env.XAI_API_KEY;
  if (!key) {
    res.status(503).json({ error: 'XAI_API_KEY not configured' });
    return;
  }

  const result = await runAssistant(req.body as AssistantBody, key);
  if ('reply' in result) {
    res.status(200).json(result);
    return;
  }
  res.status(result.status).json({
    error: result.error,
    ...(result.detail ? { detail: result.detail } : {}),
  });
}

export { runAssistant, buildSystemPrompt, extractResponseText } from './assistant-core';
export type { AssistantBody } from './assistant-core';
