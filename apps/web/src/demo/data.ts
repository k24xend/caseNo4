import type { DemoData, Debt, Plan, Scenario, Transaction } from '../domain/models';
const now = () => new Date().toISOString();
const debts: Debt[] = [
  {
    id: 'debt-card',
    name: 'Кредитная карта',
    debt_type: 'credit_card',
    balance: 8400000,
    currency: 'RUB',
    annual_rate_bps: 3490,
    minimum_payment: 550000,
    due_day: 8,
    overdue: false,
    custom_priority: 1,
    syncStatus: 'synced',
  },
  {
    id: 'debt-phone',
    name: 'Рассрочка',
    debt_type: 'installment',
    balance: 2800000,
    currency: 'RUB',
    annual_rate_bps: 0,
    minimum_payment: 400000,
    due_day: 15,
    overdue: false,
    custom_priority: 3,
    syncStatus: 'synced',
  },
  {
    id: 'debt-friend',
    name: 'Долг другу',
    debt_type: 'personal',
    balance: 2000000,
    currency: 'RUB',
    annual_rate_bps: 0,
    minimum_payment: 0,
    due_day: 25,
    overdue: false,
    custom_priority: 2,
    syncStatus: 'synced',
  },
];
const labels = [
  ['expense', 159900, 'Кафе', 'Обед'],
  ['expense', 420000, 'Транспорт', 'Проездной'],
  ['income', 7200000, 'Работа', 'Аванс'],
  ['expense', 128000, 'Продукты', 'Магазин'],
  ['expense', 89000, 'Связь', 'Мобильная связь'],
  ['expense', 740000, 'Дом', 'Коммунальные'],
  ['expense', 215000, 'Здоровье', 'Аптека'],
  ['expense', 99000, 'Подписки', 'Музыка'],
  ['income', 2500000, 'Подработка', 'Дизайн'],
  ['expense', 310000, 'Продукты', 'Рынок'],
  ['expense', 57000, 'Транспорт', 'Метро'],
  ['expense', 1200000, 'Долги', 'Минимальный платёж'],
] as const;
const transactions: Transaction[] = labels.map((x, i) => ({
  id: `tx-${i}`,
  account_id: 'main',
  kind: x[0],
  amount: x[1],
  currency: 'RUB',
  category: x[2],
  description: x[3],
  occurred_at: new Date(Date.now() - i * 86400000).toISOString(),
  recurring: false,
  syncStatus: 'synced',
}));
function plan(scenario: Scenario): Plan {
  const critical = scenario === 'critical';
  const empty = scenario === 'empty';
  const available = empty ? 0 : critical ? 4300000 : 3800000;
  const mandatory = empty ? 0 : critical ? 6100000 : 3130000;
  const minimum = empty ? 0 : 950000;
  const projected = available - mandatory - minimum;
  const reserve = empty ? 0 : 10000000;
  const safe = Math.max(0, projected - reserve);
  return {
    currency: 'RUB',
    state: empty ? 'buffer' : critical ? 'critical' : 'exit',
    snapshot: {
      available_now: available,
      mandatory_before_next_income: mandatory,
      minimum_debt_payments_before_next_income: minimum,
      projected_balance_before_next_income: projected,
      safe_to_spend: safe,
      safe_daily_amount: Math.floor(safe / 12),
      monthly_free_cash_flow: empty ? 0 : critical ? -4219000 : 570000,
      minimum_buffer_target: empty ? 0 : 1000000,
    },
    action: critical
      ? { type: 'review_expense', title: 'Защитите обязательные платежи', amount: -projected }
      : empty
        ? { type: 'build_buffer', title: 'Добавьте исходные данные', amount: 0 }
        : {
            type: 'protect_cashflow',
            title: 'Оставьте деньги до следующего дохода',
            amount: Math.max(0, projected),
          },
    generated_at: now(),
    debt_forecasts: { avalanche: { months: 31 }, snowball: { months: 34 }, custom: { months: 33 } },
  };
}
export function createDemo(scenario: Scenario = 'normal'): DemoData {
  const p = plan(scenario);
  return {
    scenario,
    currency: 'RUB',
    plan: p,
    debts: scenario === 'empty' ? [] : structuredClone(debts),
    transactions: scenario === 'empty' ? [] : structuredClone(transactions),
    updatedAt: now(),
    explanation: {
      headline: p.action.title,
      explanation:
        'План рассчитан по подтверждённым данным. Сначала защищаем обязательные платежи и резерв, затем ускоряем выбранный долг.',
      reasons: [
        'Суммы определены детерминированным финансовым движком',
        'Неподтверждённые доходы не считаются гарантированными',
      ],
      next_steps: [
        {
          title: p.action.title,
          description: 'Проверьте сумму и выполните действие, когда будете готовы.',
          action_type: p.action.type,
        },
      ],
      uncertainties: [],
      generated_at: now(),
      source: 'fallback',
    },
  };
}
