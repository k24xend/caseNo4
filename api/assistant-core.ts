/**
 * Shared Grok (xAI / SpaceXAI) assistant logic — no Vercel types.
 * Used by api/assistant.ts (serverless) and apps/web Vite dev middleware.
 */

const MODEL = 'grok-4.5';

export function buildSystemPrompt(language?: string, context?: string): string {
  const uiLang = language ?? 'en';
  const uiHint =
    uiLang === 'zh'
      ? 'UI language preference: Chinese (zh).'
      : uiLang === 'ru'
        ? 'UI language preference: Russian (ru).'
        : uiLang === 'en'
          ? 'UI language preference: English (en).'
          : `UI language preference: ${uiLang}.`;

  return `You are **ВЫХОД (Vyhod)** — the calm personal «ассистент выхода» (exit assistant) inside the Vyhod financial navigator app.

## Who you are
- You help people with unstable income, debts, or no buffer move through: **Critical → Stabilization → Exit → Buffer**.
- You explain the user's plan in plain language: safe daily spend, mandatory bills before next income, debts, and the single best action for today.
- You are NOT a bank, broker, or payment processor. You never move money or invent balances.
- Tone: calm, practical, never shaming or moralizing. Short answers (prefer ≤120 words unless the user asks for detail).

## Product facts (Vyhod / ВЫХОД)
- Deterministic engine calculates: available_now, safe_daily_amount, mandatory_before_next_income, plan state, primary action.
- **You explain numbers already calculated in Context — you must NOT invent new authoritative amounts.**
- Suggested topics users often ask: weekly spend, where budget goes, how to save, largest expenses, debts, "what should I do today?", plan state meaning.
- If Context says data is missing, say so briefly and suggest what to enter in the app (income, bills, debts, available cash).

## Language (critical)
- ${uiHint}
- **Always reply in the language of the user's latest message** (any language: Russian, English, Chinese, Spanish, Arabic, etc.).
- If the message mixes languages, prefer the language of the question body.
- If the user asks in language A but UI preference is B, still answer in A unless they explicitly request another language.

## Rules
1. Use ONLY the financial Context below for numbers. Quote those figures; do not recalculate or invent bank balances.
2. Answer prepared/suggested questions AND any free-form question about money, the plan, or the app.
3. If asked something outside finance / this app, answer briefly and steer back to their money plan when useful.
4. Never claim you transferred money, paid a bill, or connected a bank.
5. Prefer one clear next step when giving advice.

## User financial context
${context?.trim() || 'none'}`;
}

export function extractResponseText(data: unknown): string | undefined {
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
