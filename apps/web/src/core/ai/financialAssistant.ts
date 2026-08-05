import type { AppLanguage, DemoData } from '../../domain/models';
import { formatMoney } from '../../domain/money';
import { rateTransaction } from '../../domain/spendRating';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

function buildContext(data: DemoData | undefined, lang: AppLanguage) {
  if (!data) return lang === 'ru' ? 'Данных пока нет.' : lang === 'zh' ? '暂无数据。' : 'No data yet.';
  const { plan, transactions, debts } = data;
  const expenses = transactions.filter((t) => t.kind === 'expense' || t.kind === 'debt_payment');
  const income = transactions.filter((t) => t.kind === 'income');
  const spent = expenses.reduce((s, t) => s + t.amount, 0);
  const earned = income.reduce((s, t) => s + t.amount, 0);
  const byCat = new Map<string, number>();
  for (const t of expenses) byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
  const topCats = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topTx = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 3);
  const cur = plan.currency;
  const rated = expenses
    .map((t) => {
      const r = rateTransaction(t, plan);
      return r ? `${t.description || t.category}=${r}` : null;
    })
    .filter(Boolean)
    .slice(0, 8);

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
    `Spend ratings (ok=acceptable, caution=undesirable, critical): ${rated.join('; ') || 'n/a'}`,
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
  const expenses = data?.transactions.filter((t) => t.kind === 'expense' || t.kind === 'debt_payment') ?? [];
  const spent = expenses.reduce((s, t) => s + t.amount, 0);
  const byCat = new Map<string, number>();
  for (const t of expenses) byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
  const top = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
  const largest = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 3);
  const debts = data?.debts ?? [];

  const isZh = lang === 'zh' || /[\u4e00-\u9fff]/.test(question);
  const isRu = !isZh && (lang === 'ru' || /[а-яё]/i.test(question));
  const pick = (ru: string, en: string, zh: string) => (isZh ? zh : isRu ? ru : en);

  const ratingWord = (r: string) =>
    pick(
      r === 'ok' ? 'допустимая' : r === 'caution' ? 'нежелательная' : 'критическая',
      r === 'ok' ? 'acceptable' : r === 'caution' ? 'undesirable' : 'critical',
      r === 'ok' ? '可接受' : r === 'caution' ? '不宜' : '危险',
    );

  if (/who are you|кто ты|что ты|what are you|你是谁|ассистент|гид|guide|vyhod|выход|出路/.test(q)) {
    return pick(
      'Я гид приложения ВЫХОД. Помогаю понять ваш план: сколько можно сегодня, что обязательно до дохода, какие долги в приоритете и какой один шаг сделать сейчас. Суммы считает приложение, я только объясняю. Пишите обычными словами.',
      'I am the EXIT app guide. I help you understand your plan: what is safe today, what must be paid before income, which debts matter first, and the one step to take now. The app calculates the numbers; I explain them. Write in plain words.',
      '我是「出路」应用里的向导。帮你看懂计划：今天能花多少、收入前必须付什么、债务优先顺序，以及现在最该做的一步。数字由应用计算，我负责说明。用平常话问我就好。',
    );
  }
  if (/today|сегодня|что делать|action|действие|主行动|今天/.test(q) && /do|делать|action|действие|should|надо|该/.test(q)) {
    return pick(
      `Сейчас главное: ${data?.plan.action.title ?? '—'}. Сумма ${formatMoney(data?.plan.action.amount ?? 0, cur)}. Доступно ${formatMoney(snap?.available_now ?? 0, cur)}, безопасный день ${formatMoney(snap?.safe_daily_amount ?? 0, cur)}. Состояние плана: ${data?.plan.state ?? '—'}.`,
      `Right now the main step is: ${data?.plan.action.title ?? '—'} (${formatMoney(data?.plan.action.amount ?? 0, cur)}). Available ${formatMoney(snap?.available_now ?? 0, cur)}, safe daily ${formatMoney(snap?.safe_daily_amount ?? 0, cur)}. Plan state: ${data?.plan.state ?? '—'}.`,
      `现在优先：${data?.plan.action.title ?? '—'}（${formatMoney(data?.plan.action.amount ?? 0, cur)}）。可用 ${formatMoney(snap?.available_now ?? 0, cur)}，安全日额度 ${formatMoney(snap?.safe_daily_amount ?? 0, cur)}。计划状态：${data?.plan.state ?? '—'}。`,
    );
  }
  if (/debt|долг|кредит|债/.test(q)) {
    const list =
      debts.map((d) => `${d.name}: ${formatMoney(d.balance, cur)}, минимум ${formatMoney(d.minimum_payment, cur)}`).join('\n') ||
      pick('В данных долгов нет.', 'No debts in the data.', '数据中没有债务。');
    return pick(
      `Ваши долги:\n${list}\nСначала закройте обязательное до дохода (${formatMoney(snap?.mandatory_before_next_income ?? 0, cur)}), потом шаг плана: ${data?.plan.action.title ?? '—'}.`,
      `Your debts:\n${list}\nCover what is mandatory before income (${formatMoney(snap?.mandatory_before_next_income ?? 0, cur)}), then the plan step: ${data?.plan.action.title ?? '—'}.`,
      `你的债务：\n${list}\n先覆盖收入前必须支出（${formatMoney(snap?.mandatory_before_next_income ?? 0, cur)}），再做计划步骤：${data?.plan.action.title ?? '—'}。`,
    );
  }
  if (/spend|потрат|расход|花了|支出|week|недел|周|оценк|rating|допустим|критич/.test(q)) {
    const samples = expenses
      .slice(0, 4)
      .map((t) => {
        const r = rateTransaction(t, data?.plan);
        return r
          ? `${t.description || t.category}: ${formatMoney(t.amount, cur)} (${ratingWord(r)})`
          : `${t.description || t.category}: ${formatMoney(t.amount, cur)}`;
      })
      .join('\n');
    return pick(
      `В этой выборке расходы ${formatMoney(spent, cur)}. Доступно ${formatMoney(snap?.available_now ?? 0, cur)}, безопасный день ${formatMoney(snap?.safe_daily_amount ?? 0, cur)}.\n${samples || 'Пока мало операций.'}`,
      `In this set you spent ${formatMoney(spent, cur)}. Available ${formatMoney(snap?.available_now ?? 0, cur)}, safe daily ${formatMoney(snap?.safe_daily_amount ?? 0, cur)}.\n${samples || 'Few transactions yet.'}`,
      `本样本支出 ${formatMoney(spent, cur)}。可用 ${formatMoney(snap?.available_now ?? 0, cur)}，安全日额度 ${formatMoney(snap?.safe_daily_amount ?? 0, cur)}。\n${samples || '交易还不多。'}`,
    );
  }
  if (/budget|бюджет|категор|where|куда|预算|分类/.test(q)) {
    const list = top
      .slice(0, 4)
      .map(([c, a]) => `${c}: ${formatMoney(a, cur)}`)
      .join('\n');
    return pick(
      `Куда уходит бюджет:\n${list || 'Пока мало данных.'}\nСостояние плана: ${data?.plan.state ?? '—'}.`,
      `Where the budget goes:\n${list || 'Not enough data yet.'}\nPlan state: ${data?.plan.state ?? '—'}.`,
      `预算去向：\n${list || '数据还不够。'}\n计划状态：${data?.plan.state ?? '—'}。`,
    );
  }
  if (/save|отклад|экономи|存|节省/.test(q)) {
    const daily = snap?.safe_daily_amount ?? 0;
    return pick(
      `Простой порядок: сначала обязательное (${formatMoney(snap?.mandatory_before_next_income ?? 0, cur)}), потом держитесь дневного ориентира ${formatMoney(daily, cur)}, крупное сверх этого откладывайте. Главный шаг плана: ${data?.plan.action.title ?? '—'}.`,
      `A simple order: cover mandatory (${formatMoney(snap?.mandatory_before_next_income ?? 0, cur)}) first, stay near the daily guide of ${formatMoney(daily, cur)}, pause big extras. Plan step: ${data?.plan.action.title ?? '—'}.`,
      `简单顺序：先覆盖必须支出（${formatMoney(snap?.mandatory_before_next_income ?? 0, cur)}），日额度约 ${formatMoney(daily, cur)}，大额额外先放一放。计划步骤：${data?.plan.action.title ?? '—'}。`,
    );
  }
  if (/largest|крупн|biggest|最大|最大支出/.test(q)) {
    const list = largest
      .map((t, i) => {
        const r = rateTransaction(t, data?.plan);
        return `${i + 1}. ${t.description || t.category} — ${formatMoney(t.amount, cur)}${r ? ` (${ratingWord(r)})` : ''}`;
      })
      .join('\n');
    return pick(
      `Крупнейшие траты:\n${list || 'Пока нет расходов.'}`,
      `Largest expenses:\n${list || 'No expenses yet.'}`,
      `最大支出：\n${list || '暂无支出。'}`,
    );
  }

  return pick(
    `Я гид ВЫХОД. Сейчас доступно ${formatMoney(snap?.available_now ?? 0, cur)}, состояние ${data?.plan.state ?? '—'}. Можно спросить про расходы, оценку трат, категории, долги или что делать сегодня.`,
    `I am the EXIT guide. Available now: ${formatMoney(snap?.available_now ?? 0, cur)}. Plan state: ${data?.plan.state ?? '—'}. Ask about spending, spend ratings, categories, debts, or what to do today.`,
    `我是「出路」向导。当前可用 ${formatMoney(snap?.available_now ?? 0, cur)}，计划状态 ${data?.plan.state ?? '—'}。可以问支出、评级、分类、债务或今天该做什么。`,
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
