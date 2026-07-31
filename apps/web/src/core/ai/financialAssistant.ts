import type { AppLanguage, DemoData } from '../../domain/models';
import { formatMoney } from '../../domain/money';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

function buildContext(data: DemoData | undefined, lang: AppLanguage) {
  if (!data) return lang === 'ru' ? 'Данных пока нет.' : lang === 'zh' ? '暂无数据。' : 'No data yet.';
  const { plan, transactions, debts } = data;
  const expenses = transactions.filter((t) => t.kind === 'expense');
  const income = transactions.filter((t) => t.kind === 'income');
  const spent = expenses.reduce((s, t) => s + t.amount, 0);
  const earned = income.reduce((s, t) => s + t.amount, 0);
  const byCat = new Map<string, number>();
  for (const t of expenses) byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
  const topCats = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topTx = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 3);
  const cur = plan.currency;

  return [
    `Language preference: ${lang}`,
    `Plan state: ${plan.state}`,
    `Available now: ${formatMoney(plan.snapshot.available_now, cur)}`,
    `Safe daily: ${formatMoney(plan.snapshot.safe_daily_amount, cur)}`,
    `Mandatory before income: ${formatMoney(plan.snapshot.mandatory_before_next_income, cur)}`,
    `Primary action: ${plan.action.title} (${formatMoney(plan.action.amount, cur)})`,
    `Recent income sum: ${formatMoney(earned, cur)}`,
    `Recent expense sum: ${formatMoney(spent, cur)}`,
    `Top categories: ${topCats.map(([c, a]) => `${c}=${formatMoney(a, cur)}`).join('; ') || 'n/a'}`,
    `Largest expenses: ${topTx.map((t) => `${t.description || t.category} ${formatMoney(t.amount, cur)}`).join('; ') || 'n/a'}`,
    `Debts: ${debts.map((d) => `${d.name} bal ${formatMoney(d.balance, cur)} min ${formatMoney(d.minimum_payment, cur)}`).join('; ') || 'none'}`,
  ].join('\n');
}

/** Deterministic contextual answers — always available offline / if Grok is down. */
export function localFinancialReply(
  question: string,
  data: DemoData | undefined,
  lang: AppLanguage,
): string {
  const q = question.toLowerCase();
  const cur = data?.plan.currency ?? 'RUB';
  const snap = data?.plan.snapshot;
  const expenses = data?.transactions.filter((t) => t.kind === 'expense') ?? [];
  const spent = expenses.reduce((s, t) => s + t.amount, 0);
  const byCat = new Map<string, number>();
  for (const t of expenses) byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
  const top = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
  const largest = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 3);
  const debts = data?.debts ?? [];

  // Reply language: prefer script of the question, else UI language
  const isZh = lang === 'zh' || /[\u4e00-\u9fff]/.test(question);
  const isRu = !isZh && (lang === 'ru' || /[а-яё]/i.test(question));

  const pick = (ru: string, en: string, zh: string) => (isZh ? zh : isRu ? ru : en);

  if (/who are you|кто ты|что ты|what are you|你是谁|助手|ассистент выхода|vyhod|выход/.test(q)) {
    return pick(
      'Я ассистент выхода ВЫХОД: спокойно объясняю ваш план — сколько можно сегодня, что обязательно до дохода, какой долг гасить и одно главное действие. Суммы считает приложение, я их только поясняю. Пишите на любом языке.',
      "I'm Vyhod's exit assistant: I explain your plan — safe daily spend, bills before income, which debt to pay, and today's best action. The app calculates numbers; I only explain them. Ask in any language.",
      '我是 ВЫХОД 退出助手：用白话解释您的计划——今日安全额度、收入前必付项、优先还哪笔债、今天最该做的一件事。数字由应用计算，我只负责解释。可用任何语言提问。',
    );
  }
  if (/today|сегодня|что делать|action|действие|主行动|今天/.test(q) && /do|делать|action|действие|should|надо|该/.test(q)) {
    return pick(
      `Главное действие сейчас: «${data?.plan.action.title ?? '—'}» (${formatMoney(data?.plan.action.amount ?? 0, cur)}). Доступно: ${formatMoney(snap?.available_now ?? 0, cur)}, дневной ориентир: ${formatMoney(snap?.safe_daily_amount ?? 0, cur)}. Состояние: ${data?.plan.state ?? '—'}.`,
      `Your main action now: “${data?.plan.action.title ?? '—'}” (${formatMoney(data?.plan.action.amount ?? 0, cur)}). Available: ${formatMoney(snap?.available_now ?? 0, cur)}, safe daily: ${formatMoney(snap?.safe_daily_amount ?? 0, cur)}. State: ${data?.plan.state ?? '—'}.`,
      `当前主行动：「${data?.plan.action.title ?? '—'}」（${formatMoney(data?.plan.action.amount ?? 0, cur)}）。可用 ${formatMoney(snap?.available_now ?? 0, cur)}，安全日额度 ${formatMoney(snap?.safe_daily_amount ?? 0, cur)}。状态：${data?.plan.state ?? '—'}。`,
    );
  }
  if (/debt|долг|кредит|债/.test(q)) {
    const list =
      debts.map((d) => `• ${d.name}: ${formatMoney(d.balance, cur)} (min ${formatMoney(d.minimum_payment, cur)})`).join('\n') ||
      pick('• долгов нет в данных', '• no debts in data', '• 数据中无债务');
    return pick(
      `Долги:\n${list}\nСначала закрывайте обязательные платежи (${formatMoney(snap?.mandatory_before_next_income ?? 0, cur)}), затем действие плана: ${data?.plan.action.title ?? '—'}.`,
      `Debts:\n${list}\nCover mandatory ${formatMoney(snap?.mandatory_before_next_income ?? 0, cur)} first, then the plan action: ${data?.plan.action.title ?? '—'}.`,
      `债务：\n${list}\n先覆盖必须支出 ${formatMoney(snap?.mandatory_before_next_income ?? 0, cur)}，再执行计划行动：${data?.plan.action.title ?? '—'}。`,
    );
  }
  if (/spend|потрат|расход|花了|支出|week|недел|周/.test(q)) {
    return pick(
      `На этой выборке расходы: ${formatMoney(spent, cur)}. Доступно сейчас: ${formatMoney(snap?.available_now ?? 0, cur)}. Безопасный дневной лимит: ${formatMoney(snap?.safe_daily_amount ?? 0, cur)}.`,
      `In this set you spent ${formatMoney(spent, cur)}. Available now: ${formatMoney(snap?.available_now ?? 0, cur)}. Safe daily: ${formatMoney(snap?.safe_daily_amount ?? 0, cur)}.`,
      `本样本支出 ${formatMoney(spent, cur)}。当前可用 ${formatMoney(snap?.available_now ?? 0, cur)}，安全日额度 ${formatMoney(snap?.safe_daily_amount ?? 0, cur)}。`,
    );
  }
  if (/budget|бюджет|категор|where|куда|预算|分类/.test(q)) {
    const list = top
      .slice(0, 4)
      .map(([c, a]) => `• ${c}: ${formatMoney(a, cur)}`)
      .join('\n');
    return pick(
      `Куда уходит бюджет:\n${list || '• пока мало данных'}\nСостояние плана: ${data?.plan.state ?? '—'}.`,
      `Where budget goes:\n${list || '• not enough data yet'}\nPlan state: ${data?.plan.state ?? '—'}.`,
      `预算去向：\n${list || '• 数据不足'}\n计划状态：${data?.plan.state ?? '—'}。`,
    );
  }
  if (/save|отклад|экономи|存|节省/.test(q)) {
    const daily = snap?.safe_daily_amount ?? 0;
    return pick(
      `Чтобы копить спокойнее: держитесь дневного лимита ${formatMoney(daily, cur)}, сначала закройте обязательное (${formatMoney(snap?.mandatory_before_next_income ?? 0, cur)}), комфорт не трогайте. Главное действие: ${data?.plan.action.title ?? '—'}.`,
      `To save steadily: stay within daily ${formatMoney(daily, cur)}, cover mandatory ${formatMoney(snap?.mandatory_before_next_income ?? 0, cur)} first, protect comfort. Main action: ${data?.plan.action.title ?? '—'}.`,
      `稳健储蓄：日额度 ${formatMoney(daily, cur)}，先覆盖必须支出 ${formatMoney(snap?.mandatory_before_next_income ?? 0, cur)}，保留舒适预算。主行动：${data?.plan.action.title ?? '—'}。`,
    );
  }
  if (/largest|крупн|biggest|最大|最大支出/.test(q)) {
    const list = largest
      .map((t, i) => `${i + 1}. ${t.description || t.category} — ${formatMoney(t.amount, cur)}`)
      .join('\n');
    return pick(
      `Крупнейшие траты:\n${list || 'Пока нет расходов.'}`,
      `Largest expenses:\n${list || 'No expenses yet.'}`,
      `最大支出：\n${list || '暂无支出。'}`,
    );
  }

  return pick(
    `Я ассистент выхода ВЫХОД. Сейчас доступно ${formatMoney(snap?.available_now ?? 0, cur)}, состояние «${data?.plan.state ?? '—'}». Спросите про расходы, категории, сбережения, долги или «что делать сегодня» — отвечу по вашим данным на любом языке.`,
    `I'm Vyhod's exit assistant. You have ${formatMoney(snap?.available_now ?? 0, cur)} available; plan state “${data?.plan.state ?? '—'}”. Ask about spending, categories, savings, debts, or “what should I do today” — in any language.`,
    `我是 ВЫХОД 退出助手。当前可用 ${formatMoney(snap?.available_now ?? 0, cur)}，计划状态「${data?.plan.state ?? '—'}」。可问支出、分类、储蓄、债务或「今天该做什么」——支持任何语言。`,
  );
}

export async function askFinancialAssistant(opts: {
  message: string;
  history: ChatMessage[];
  data?: DemoData;
  language: AppLanguage;
}): Promise<{ reply: string; source: 'api' | 'local' }> {
  const context = buildContext(opts.data, opts.language);
  try {
    const res = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: opts.message,
        language: opts.language,
        context,
        history: opts.history.slice(-8),
      }),
    });
    if (res.ok) {
      const json = (await res.json()) as { reply?: string };
      if (json.reply?.trim()) return { reply: json.reply.trim(), source: 'api' };
    }
  } catch {
    /* fall through */
  }
  return {
    reply: localFinancialReply(opts.message, opts.data, opts.language),
    source: 'local',
  };
}
