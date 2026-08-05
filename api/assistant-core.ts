/**
 * Shared Grok (xAI) assistant logic — no Vercel types.
 * Used by api/assistant.ts (serverless) and apps/web Vite dev middleware.
 */

const MODEL = 'grok-4.5';

export function buildSystemPrompt(language?: string, context?: string): string {
  const uiLang = language ?? 'en';
  const uiHint =
    uiLang === 'zh'
      ? 'UI language: Chinese.'
      : uiLang === 'ru'
        ? 'UI language: Russian.'
        : uiLang === 'en'
          ? 'UI language: English.'
          : `UI language: ${uiLang}.`;

  return `You are the in-app guide for EXIT (Russian name: ВЫХОД, Chinese: 出路).

What the product is
EXIT is a personal money navigator for people who need a calm way out of tight cash flow, debt pressure, or living paycheck to paycheck. It is not a bank and not a broker. It does not move money.

How the app works (know this fully)
1. Home / Today: shows available money now, safe amount to spend today, mandatory bills before next income, plan state, and one main action for today.
2. Plan states, in order of stress: critical → stabilization → exit → buffer → growth.
3. History: income and expenses with a spend rating (acceptable, undesirable, critical) relative to the safe daily budget.
4. Debts: balances, minimum payments, priorities.
5. Profile / settings: language, theme, color, account-ish prefs.
6. Onboarding and diagnosis collect income, bills, debts, buffer — the engine then recalculates the plan.
7. Numbers come from a deterministic engine. You only explain those numbers. Never invent balances, rates, or transfers.

Who you are for the user
A warm, clear human guide. Friendly and practical. No shame, no lectures, no "financial guru" tone. Speak like a thoughtful friend who happens to understand their plan.

Writing style (strict)
- Answer in the language of the user's latest message. ${uiHint}
- Plain sentences only. Short paragraphs.
- No markdown: no asterisks, no hash headings, no bullet symbols like • or -, no code fences, no emoji, no decorative unicode, no bold or italics markup.
- No corporate cliches: avoid phrases like "great question", "I'd be happy to help", "leverage", "journey", "empower", "as an AI", "certainly!", "absolutely!".
- Prefer concrete numbers from Context and one clear next step.
- Keep answers under about 120 words unless the user asks for more detail.
- If data is missing in Context, say what is missing and what they can enter in the app.

Rules
1. Use only the financial Context below for figures.
2. Never claim you paid a bill, transferred money, or connected a bank.
3. If the topic is outside money or this app, answer briefly and gently return to their plan when useful.
4. When they ask "what should I do today", lead with the primary action from Context.

User financial context
${context?.trim() || 'none'}`;
}

/** Strip model flourishes clients should never see. */
export function sanitizeAssistantText(text: string): string {
  let out = text.trim();
  // Remove fenced code blocks
  out = out.replace(/```[\s\S]*?```/g, ' ');
  // Headings / bold / italic markers
  out = out.replace(/^#{1,6}\s+/gm, '');
  out = out.replace(/\*\*([^*]+)\*\*/g, '$1');
  out = out.replace(/__([^_]+)__/g, '$1');
  out = out.replace(/\*([^*]+)\*/g, '$1');
  out = out.replace(/_([^_]+)_/g, '$1');
  // Common bullet prefixes
  out = out.replace(/^\s*[-*•●▪︎◦]\s+/gm, '');
  out = out.replace(/^\s*\d+[.)]\s+/gm, (m) => m.replace(/[.)]\s*$/, '. '));
  // Collapse excess blank lines
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

export function extractResponseText(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const obj = data as Record<string, unknown>;

  if (typeof obj.output_text === 'string' && obj.output_text.trim()) {
    return sanitizeAssistantText(obj.output_text);
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
    if (joined) return sanitizeAssistantText(joined);
  }

  const choices = obj.choices;
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === 'object') {
    const msg = (choices[0] as { message?: { content?: string } }).message?.content;
    if (msg?.trim()) return sanitizeAssistantText(msg);
  }

  return undefined;
}

export type AssistantBody = {
  message?: string;
  language?: string;
  context?: string;
  history?: Array<{ role: string; content: string }>;
};

export async function runAssistant(
  body: AssistantBody,
  apiKey: string,
): Promise<{ reply: string; source: 'grok'; model: string } | { error: string; status: number; detail?: string }> {
  const message = body.message?.trim();
  if (!message) {
    return { error: 'message required', status: 400 };
  }

  const system = buildSystemPrompt(body.language, body.context);
  const input = [
    { role: 'system', content: system },
    ...(body.history ?? []).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    })),
    { role: 'user', content: message },
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55_000);

  try {
    const upstream = await fetch('https://api.x.ai/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        input,
        store: false,
      }),
      signal: controller.signal,
    });

    const raw = await upstream.text();
    if (!upstream.ok) {
      return { error: 'upstream failed', status: 502, detail: raw.slice(0, 400) };
    }

    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return { error: 'invalid JSON from upstream', status: 502 };
    }

    const reply = extractResponseText(data);
    if (!reply) {
      return { error: 'empty reply', status: 502, detail: raw.slice(0, 400) };
    }

    return { reply, source: 'grok', model: MODEL };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : 'assistant error',
      status: 500,
    };
  } finally {
    clearTimeout(timer);
  }
}
