import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Grok (xAI) proxy via Responses API.
 * Env: XAI_API_KEY on Vercel.
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

  const body = req.body as {
    message?: string;
    language?: string;
    context?: string;
    history?: Array<{ role: string; content: string }>;
  };

  const message = body.message?.trim();
  if (!message) {
    res.status(400).json({ error: 'message required' });
    return;
  }

  const lang = body.language ?? 'en';
  const system = `You are Vyhod, a calm personal finance co-pilot powered by Grok.
Answer in ${lang === 'zh' ? 'Chinese' : lang === 'ru' ? 'Russian' : 'English'}.
Use ONLY the provided user financial context. Be concise (max 120 words), practical, never shame the user.
Do not invent bank balances. If data is missing, say so briefly.
Context:
${body.context ?? 'none'}`;

  const input = [
    { role: 'system', content: system },
    ...(body.history ?? []).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    })),
    { role: 'user', content: message },
  ];

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 55_000);

    const upstream = await fetch('https://api.x.ai/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-4.5',
        input,
        store: false,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    const raw = await upstream.text();
    if (!upstream.ok) {
      res.status(502).json({ error: 'upstream failed', detail: raw.slice(0, 400) });
      return;
    }

    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      res.status(502).json({ error: 'invalid JSON from upstream' });
      return;
    }

    const reply = extractResponseText(data);
    if (!reply) {
      res.status(502).json({ error: 'empty reply', detail: raw.slice(0, 400) });
      return;
    }

    res.status(200).json({ reply, source: 'grok', model: 'grok-4.5' });
  } catch (e) {
    res.status(500).json({
      error: e instanceof Error ? e.message : 'assistant error',
    });
  }
}

/** Parse xAI Responses API payload (output_text or output[].content[].text). */
function extractResponseText(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const obj = data as Record<string, unknown>;

  if (typeof obj.output_text === 'string' && obj.output_text.trim()) {
    return obj.output_text.trim();
  }

  const output = obj.output;
  if (Array.isArray(output)) {
    const chunks: string[] = [];
    for (const item of output) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      if (row.type === 'message' && Array.isArray(row.content)) {
        for (const part of row.content) {
          if (!part || typeof part !== 'object') continue;
          const p = part as Record<string, unknown>;
          if ((p.type === 'output_text' || p.type === 'text') && typeof p.text === 'string') {
            chunks.push(p.text);
          }
        }
      }
      if (typeof row.text === 'string') chunks.push(row.text);
    }
    const joined = chunks.join('\n').trim();
    if (joined) return joined;
  }

  // Legacy chat.completions shape (fallback)
  const choices = obj.choices;
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === 'object') {
    const msg = (choices[0] as { message?: { content?: string } }).message?.content;
    if (msg?.trim()) return msg.trim();
  }

  return undefined;
}
