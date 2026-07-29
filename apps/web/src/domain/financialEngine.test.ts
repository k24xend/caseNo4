import { describe, expect, it } from 'vitest';
import {
  applyScenario,
  assessPurchase,
  calculatePlan,
  forecast,
  monthlyInterest,
  priorityDebt,
} from './financialEngine';
import { createDemo } from '../demo/data';

const reference = '2026-08-01T12:00:00.000Z';

describe('deterministic financial engine', () => {
  it.each(['normal', 'critical', 'empty'] as const)(
    'calculates %s from source data',
    (scenario) => {
      const data = createDemo(scenario, new Date(reference));
      const result = calculatePlan(
        data.baseline,
        data.debts,
        undefined,
        reference,
        'RUB',
      );
      const firstPoint = result.projection.points[0];

      expect(result.plan.generated_at).toBe(reference);
      expect(firstPoint).toBeDefined();
      expect(firstPoint?.date).toBe(reference);
      if (scenario === 'critical') expect(result.plan.state).toBe('critical');
      if (scenario === 'empty') expect(result.plan.snapshot.safe_to_spend).toBe(0);
    },
  );

  it('handles no debt and zero income', () => {
    const data = createDemo('empty', new Date(reference));
    expect(forecast(data.baseline, [], 0, reference).debtFreeMonths).toBe(0);
    expect(data.plan.snapshot.monthly_free_cash_flow).toBe(0);
  });

  it('detects a cash gap', () => {
    const data = createDemo('critical', new Date(reference));
    expect(data.plan.snapshot.projected_balance_before_next_income).toBeLessThan(0);
  });

  it('calculates zero and expensive interest', () => {
    expect(monthlyInterest(100000, 0)).toBe(0);
    expect(monthlyInterest(100000, 3600)).toBe(3000);
  });

  it('selects avalanche priority', () => {
    expect(priorityDebt(createDemo('normal', new Date(reference)).debts)?.id).toBe(
      'debt-card',
    );
  });

  it('applies and cancels scenario without mutating base', () => {
    const data = createDemo('normal', new Date(reference));
    const adjusted = applyScenario(data.baseline, {
      extraIncome: 100000,
      expenseChange: 50000,
      extraDebtPayment: 0,
      reserve: 200000,
      extraHours: 2,
      acceptedAt: reference,
    });

    expect(adjusted.monthlyIncome).toBe(data.baseline.monthlyIncome + 100000);
    expect(applyScenario(data.baseline).monthlyIncome).toBe(data.baseline.monthlyIncome);
  });

  it('builds dated chart and milestones', () => {
    const data = createDemo('normal', new Date(reference));
    expect(data.projection.points.length).toBeGreaterThan(6);
    expect(data.projection.nextPayment?.date).toContain('2026-08');
  });

  it('assesses tools conservatively', () => {
    expect(assessPurchase(100000, 20000, 50, 50000)).toEqual(
      expect.objectContaining({
        conservativeIncome: 10000,
        paybackMonths: 10,
        createsCashGap: true,
      }),
    );
  });
});
