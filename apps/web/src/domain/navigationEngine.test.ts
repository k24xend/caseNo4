import { describe, expect, it } from 'vitest';
import { createDemo } from '../demo/data';
import { assessTool, monthlyInterest, projectScenario, stageIndex } from './navigationEngine';

describe('financial navigation engine', () => {
  const data = createDemo();

  it('calculates monthly interest using integer minor units', () => {
    const firstDebt = data.debts[0];

    expect(firstDebt).toBeDefined();
    if (!firstDebt) throw new Error('Demo data must include at least one debt');

    expect(monthlyInterest(firstDebt)).toBe(244300);
  });

  it('orders all five journey stages', () =>
    expect(
      (['critical', 'stabilization', 'exit', 'buffer', 'growth'] as const).map(stageIndex),
    ).toEqual([0, 1, 2, 3, 4]));

  it('keeps what-if isolated and deterministic', () => {
    const input = {
      extraIncome: 1000000,
      fixedExpenseChange: 0,
      variableExpenseChange: 0,
      extraDebtPayment: 0,
      reserve: 1000000,
      extraHours: 6,
      toolCost: 0,
      toolIncome: 0,
      confidence: 75 as const,
    };
    const first = projectScenario(data.plan, data.debts, input);

    expect(projectScenario(data.plan, data.debts, input)).toEqual(first);
    expect(data.plan.snapshot.monthly_free_cash_flow).toBe(620000);
    expect(first.load).toBe('low');
  });

  it('blocks a work tool that consumes protected cash', () => {
    const result = assessTool(data.plan, 5500000, 3000000, 50);

    expect(result).toMatchObject({
      paybackMonths: 4,
      conservativeMonthlyIncome: 1500000,
      createsCashGap: false,
    });
  });
});
