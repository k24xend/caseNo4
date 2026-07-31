import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Optional Grok (xAI) proxy. Set XAI_API_KEY in Vercel env.
 * Falls back to 503 so the client uses local financial answers.
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
  const system = `You are Vyhod, a calm personal finance co-pilot. Answer in ${lang === 'zh' ? 'Chinese' : lang === 'ru' ? 'Russian' : 'English'}.
Use ONLY the provided user financial context. Be concise (max 120 words), practical, never shame the user.
Do not invent bank balances. If data is missing, say so briefly.
Context:\n${body.context ?? 'none'}`;

  const messages = [
    { role: 'system', content: system },
    ...(body.history ?? []).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    })),
    { role: 'user', content: message },
  ];

  try {
    const upstream = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-4-1-fast-non-reasoning',
        messages,
        temperature: 0.4,
        max_tokens: 400,
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      res.status(502).json({ error: 'upstream failed', detail: text.slice(0, 300) });
      return;
    }

    const data = (await upstream.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      res.status(502).json({ error: 'empty reply' });
      return;
    }
    res.status(200).json({ reply, source: 'grok' });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'assistant error' });
  }
}
