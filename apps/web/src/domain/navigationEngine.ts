import type { Debt, Plan } from './models';

export type ScenarioInputs = {
  extraIncome: number;
  fixedExpenseChange: number;
  variableExpenseChange: number;
  extraDebtPayment: number;
  reserve: number;
  extraHours: number;
  toolCost: number;
  toolIncome: number;
  confidence: 50 | 75 | 100;
};
export type ScenarioResult = ScenarioInputs & {
  freeCashFlow: number;
  stabilizationMonths: number;
  debtFreeMonths: number;
  interestCost: number;
  reserveAfterMonth: number;
  cashGap: boolean;
  load: 'low' | 'medium' | 'high';
};
export type ToolAssessment = {
  paybackMonths: number | null;
  conservativeMonthlyIncome: number;
  createsCashGap: boolean;
  message: string;
};

export function monthlyInterest(debt: Debt): number {
  return Math.floor((debt.balance * debt.annual_rate_bps) / 120000);
}
export function totalDebt(debts: Debt[]): number {
  return debts.reduce((sum, x) => sum + x.balance, 0);
}
export function projectScenario(plan: Plan, debts: Debt[], input: ScenarioInputs): ScenarioResult {
  const confirmedToolIncome = Math.floor((input.toolIncome * input.confidence) / 100);
  const freeCashFlow =
    plan.snapshot.monthly_free_cash_flow +
    input.extraIncome +
    confirmedToolIncome -
    input.fixedExpenseChange -
    input.variableExpenseChange -
    input.extraDebtPayment;
  const availableForDebt = Math.max(1, freeCashFlow + input.extraDebtPayment);
  const debt = totalDebt(debts);
  const interestCost = debts.reduce((sum, item) => sum + monthlyInterest(item), 0);
  const reserveGap = Math.max(0, input.reserve - plan.snapshot.available_now + input.toolCost);
  return {
    ...input,
    freeCashFlow,
    stabilizationMonths: Math.max(1, Math.ceil(reserveGap / Math.max(1, freeCashFlow))),
    debtFreeMonths: debt ? Math.ceil(debt / availableForDebt) : 0,
    interestCost: Math.floor((interestCost * Math.max(1, Math.ceil(debt / availableForDebt))) / 2),
    reserveAfterMonth: Math.max(0, plan.snapshot.available_now + freeCashFlow - input.toolCost),
    cashGap: plan.snapshot.projected_balance_before_next_income - input.toolCost < 0,
    load: input.extraHours >= 16 ? 'high' : input.extraHours >= 8 ? 'medium' : 'low',
  };
}
export function stageIndex(state: Plan['state']) {
  return ['critical', 'stabilization', 'exit', 'buffer', 'growth'].indexOf(state);
}
export function assessTool(
  plan: Plan,
  cost: number,
  expectedMonthlyIncome: number,
  confidence: 50 | 75 | 100,
): ToolAssessment {
  const conservativeMonthlyIncome = Math.floor((expectedMonthlyIncome * confidence) / 100);
  const createsCashGap = plan.snapshot.projected_balance_before_next_income - cost < 0;
  const paybackMonths =
    conservativeMonthlyIncome > 0 ? Math.ceil(cost / conservativeMonthlyIncome) : null;
  return {
    paybackMonths,
    conservativeMonthlyIncome,
    createsCashGap,
    message: createsCashGap
      ? 'Покупка создаст кассовый разрыв. Сначала подтвердите доход и накопите сумму.'
      : `Окупаемость рассчитана по ${confidence}% ожидаемого дохода, без гарантии результата.`,
  };
}
