import type { DemoData, Debt, FinancialInputs, Scenario, Transaction } from '../domain/models';
import { calculatePlan } from '../domain/financialEngine';
const isoDay = (date: Date, plus: number) => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + plus);
  return d.toISOString();
};
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
] as const;
function baseline(scenario: Scenario, date: Date): FinancialInputs {
  if (scenario === 'empty')
    return {
      availableNow: 0,
      monthlyIncome: 0,
      minimumBuffer: 0,
      nextIncomeDate: isoDay(date, 14),
      incomes: [],
      expenses: [],
    };
  return {
    availableNow: scenario === 'critical' ? 4300000 : 3800000,
    monthlyIncome: 6200000,
    minimumBuffer: 1000000,
    nextIncomeDate: isoDay(date, 12),
    incomes: [
      { id: 'salary', name: 'Зарплата', amount: 6200000, date: isoDay(date, 12), confirmed: true },
    ],
    expenses: [
      {
        id: 'rent',
        name: 'Аренда',
        amount: scenario === 'critical' ? 9200000 : 2600000,
        date: isoDay(date, 5),
        confirmed: true,
      },
      {
        id: 'connection',
        name: 'Связь и интернет',
        amount: 130000,
        date: isoDay(date, 7),
        confirmed: true,
      },
      {
        id: 'transport',
        name: 'Транспорт',
        amount: 400000,
        date: isoDay(date, 9),
        confirmed: true,
      },
      { id: 'food', name: 'Продукты', amount: 1500000, date: isoDay(date, 18), confirmed: true },
    ],
  };
}
export function createDemo(scenario: Scenario = 'normal', reference = new Date()): DemoData {
  const stamp = reference.toISOString();
  const base = baseline(scenario, reference);
  const ds = scenario === 'empty' ? [] : structuredClone(debts);
  const { plan, projection } = calculatePlan(base, ds, undefined, stamp, 'RUB');
  const transactions: Transaction[] =
    scenario === 'empty'
      ? []
      : labels.map((x, i) => ({
          id: `tx-${i}`,
          account_id: 'main',
          kind: x[0],
          amount: x[1],
          currency: 'RUB',
          category: x[2],
          description: x[3],
          occurred_at: isoDay(reference, -i),
          recurring: false,
          syncStatus: 'synced',
        }));
  return {
    scenario,
    currency: 'RUB',
    plan,
    projection,
    baseline: base,
    debts: ds,
    transactions,
    updatedAt: stamp,
    explanation: {
      headline: plan.action.title,
      explanation:
        'План рассчитан только из подтверждённых данных. Сначала защищаем обязательства, затем резерв и дорогой долг.',
      reasons: [
        'Денежные значения рассчитаны целочисленно',
        'Неподтверждённый доход не считается гарантированным',
      ],
      next_steps: [
        {
          title: plan.action.title,
          description: 'Проверьте ближайшее обязательство и выполните шаг, когда будете готовы.',
          action_type: plan.action.type,
        },
      ],
      uncertainties: projection.assumptions,
      generated_at: stamp,
      source: 'deterministic',
    },
  };
}
