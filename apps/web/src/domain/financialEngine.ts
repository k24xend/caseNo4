import type { Debt, FinancialInputs, FinancialProjection, Plan, ScenarioAdjustment, ScheduledItem } from './models';

export const MAX_FORECAST_MONTHS = 360;
export const FORECAST_VARIANCE_MONTHS = 2;
export const MAX_MONEY = 100_000_000_00;
const DAY = 86_400_000;

export const daysBetween = (from: string | Date, to: string | Date) =>
  Math.max(1, Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / DAY));
export const dueBefore = (items: ScheduledItem[], horizon: string) =>
  items.filter((x) => x.confirmed && x.date <= horizon).reduce((sum, x) => sum + x.amount, 0);
export const minimumDebtPayments = (debts: Debt[]) => debts.reduce((sum, d) => sum + d.minimum_payment, 0);
export const monthlyInterest = (balance: number, annualRateBps: number) =>
  Math.round((balance * annualRateBps) / 120_000);
export const priorityDebt = (debts: Debt[], strategy: 'avalanche' | 'snowball' | 'custom' = 'avalanche') =>
  [...debts].filter((d) => d.balance > 0).sort((a, b) => strategy === 'snowball'
    ? a.balance - b.balance
    : strategy === 'custom' ? a.custom_priority - b.custom_priority
      : b.annual_rate_bps - a.annual_rate_bps || a.balance - b.balance)[0];

export function applyScenario(base: FinancialInputs, scenario?: ScenarioAdjustment): FinancialInputs {
  if (!scenario) return structuredClone(base);
  return { ...structuredClone(base), monthlyIncome: base.monthlyIncome + scenario.extraIncome,
    minimumBuffer: scenario.reserve, expenses: base.expenses.map((x, i) => i === 0 ? { ...x, amount: Math.max(0, x.amount + scenario.expenseChange) } : x) };
}

export function forecast(inputs: FinancialInputs, debts: Debt[], extraPayment = 0, referenceDate = '2026-08-01T12:00:00.000Z'): FinancialProjection {
  const balances = debts.map((d) => ({ ...d }));
  const points = [];
  let reserve = Math.max(0, inputs.availableNow - dueBefore(inputs.expenses, inputs.nextIncomeDate));
  let totalInterest = 0;
  let debtFreeMonths: number | null = balances.every((d) => d.balance === 0) ? 0 : null;
  let stabilizationMonths: number | null = reserve >= inputs.minimumBuffer ? 0 : null;
  const baseMinimums = minimumDebtPayments(debts);
  const monthlyMandatory = inputs.expenses.reduce((s, x) => s + x.amount, 0);
  const free = inputs.monthlyIncome - monthlyMandatory - baseMinimums;
  for (let month = 0; month <= MAX_FORECAST_MONTHS; month++) {
    const date = new Date(referenceDate); date.setUTCMonth(date.getUTCMonth() + month);
    if (month > 0) {
      for (const debt of balances) {
        if (!debt.balance) continue;
        const interest = monthlyInterest(debt.balance, debt.annual_rate_bps);
        totalInterest += interest; debt.balance += interest;
        debt.balance = Math.max(0, debt.balance - Math.min(debt.balance, debt.minimum_payment));
      }
      const target = priorityDebt(balances);
      const acceleration = Math.max(0, free) + Math.max(0, extraPayment);
      if (target) target.balance = Math.max(0, target.balance - Math.min(target.balance, acceleration));
      const remainingDebt = balances.reduce((s, d) => s + d.balance, 0);
      if (remainingDebt === 0 && debtFreeMonths === null) debtFreeMonths = month;
      if (remainingDebt === 0) reserve += Math.max(0, free + baseMinimums);
      else reserve += Math.max(0, free - acceleration);
      if (reserve >= inputs.minimumBuffer && stabilizationMonths === null) stabilizationMonths = month;
    }
    points.push({ date: date.toISOString(), debt: balances.reduce((s, d) => s + d.balance, 0), reserve, interest: totalInterest });
    if (month >= 12 && debtFreeMonths !== null && stabilizationMonths !== null) break;
  }
  const nextPayment = [...inputs.expenses].filter((x) => x.confirmed && x.date >= referenceDate).sort((a,b) => a.date.localeCompare(b.date))[0];
  return { points, debtFreeMonths, stabilizationMonths, totalInterest, nextPayment,
    assumptions: ['Подтверждённый доход поступает по плану', 'Ставки и минимальные платежи не меняются', 'Диапазон срока учитывает отклонение до двух месяцев'] };
}

export function calculatePlan(inputs: FinancialInputs, debts: Debt[], scenario: ScenarioAdjustment | undefined, referenceDate: string, currency: Plan['currency']): { plan: Plan; projection: FinancialProjection } {
  const current = applyScenario(inputs, scenario);
  const income = dueBefore(current.incomes, current.nextIncomeDate);
  const mandatory = dueBefore(current.expenses, current.nextIncomeDate);
  const minimum = minimumDebtPayments(debts);
  const projected = current.availableNow + income - mandatory - minimum;
  const protectedReserve = Math.min(current.minimumBuffer, Math.max(0, projected));
  const safe = Math.max(0, projected - protectedReserve);
  const days = daysBetween(referenceDate, current.nextIncomeDate);
  const monthlyMandatory = current.expenses.reduce((s,x)=>s+x.amount,0);
  const monthlyFree = current.monthlyIncome - monthlyMandatory - minimum - (scenario?.extraDebtPayment ?? 0);
  const projection = forecast(current, debts, scenario?.extraDebtPayment ?? 0, referenceDate);
  const overdue = debts.some((d) => d.overdue);
  const state: Plan['state'] = projected < 0 ? 'critical' : overdue || current.availableNow < current.minimumBuffer ? 'stabilization' : debts.some(d=>d.balance>0) ? 'exit' : current.availableNow < current.minimumBuffer ? 'buffer' : 'growth';
  const target = priorityDebt(debts);
  const action = projected < 0 ? { type:'review_expense', title:'Сократите или перенесите ближайший платёж', amount:-projected }
    : overdue ? { type:'pay_mandatory', title:'Разберите просроченный платёж', amount: debts.find(d=>d.overdue)?.minimum_payment ?? 0 }
    : current.availableNow < current.minimumBuffer ? { type:'build_buffer', title:'Защитите минимальный резерв', amount: current.minimumBuffer-current.availableNow }
    : target ? { type:'pay_target_debt', title:`Ускорьте «${target.name}»`, amount: Math.max(0, scenario?.extraDebtPayment ?? monthlyFree) }
    : { type:'build_buffer', title:'Продолжайте пополнять подушку', amount:Math.max(0,monthlyFree) };
  return { plan:{ currency,state,snapshot:{available_now:current.availableNow,mandatory_before_next_income:mandatory,minimum_debt_payments_before_next_income:minimum,projected_balance_before_next_income:projected,safe_to_spend:safe,safe_daily_amount:Math.floor(safe/days),monthly_free_cash_flow:monthlyFree,minimum_buffer_target:current.minimumBuffer},action,generated_at:referenceDate,debt_forecasts:{} }, projection };
}

export const comparePlans = (base: Plan, candidate: Plan) => ({ safeDelta:candidate.snapshot.safe_to_spend-base.snapshot.safe_to_spend, cashFlowDelta:candidate.snapshot.monthly_free_cash_flow-base.snapshot.monthly_free_cash_flow });
export const assessWorkload = (hours: number) => hours <= 8 ? 'low' : hours <= 16 ? 'medium' : 'high';
export function assessPurchase(cost: number, optimisticIncome: number, confidencePercent: number, safeToSpend: number) {
  const conservativeIncome = Math.floor(optimisticIncome * Math.max(0,Math.min(100,confidencePercent))/100);
  return { conservativeIncome, paybackMonths: conservativeIncome > 0 ? Math.ceil(cost/conservativeIncome) : null, createsCashGap: cost > safeToSpend, risk: cost > safeToSpend ? 'high' : conservativeIncome === 0 ? 'high' : 'moderate' } as const;
}
