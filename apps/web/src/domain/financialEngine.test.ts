import { describe,expect,it } from 'vitest';
import { applyScenario, assessPurchase, calculatePlan, forecast, monthlyInterest, priorityDebt } from './financialEngine';
import { createDemo } from '../demo/data';
const reference='2026-08-01T12:00:00.000Z';
describe('deterministic financial engine',()=>{
 it.each(['normal','critical','empty'] as const)('calculates %s from source data',(scenario)=>{const d=createDemo(scenario,new Date(reference));const r=calculatePlan(d.baseline,d.debts,undefined,reference,'RUB');expect(r.plan.generated_at).toBe(reference);expect(r.projection.points[0].date).toBe(reference);if(scenario==='critical')expect(r.plan.state).toBe('critical');if(scenario==='empty')expect(r.plan.snapshot.safe_to_spend).toBe(0)});
 it('handles no debt and zero income',()=>{const d=createDemo('empty',new Date(reference));expect(forecast(d.baseline,[],0,reference).debtFreeMonths).toBe(0);expect(d.plan.snapshot.monthly_free_cash_flow).toBe(0)});
 it('detects a cash gap',()=>{const d=createDemo('critical',new Date(reference));expect(d.plan.snapshot.projected_balance_before_next_income).toBeLessThan(0)});
 it('calculates zero and expensive interest',()=>{expect(monthlyInterest(100000,0)).toBe(0);expect(monthlyInterest(100000,3600)).toBe(3000)});
 it('selects avalanche priority',()=>{expect(priorityDebt(createDemo('normal',new Date(reference)).debts)?.id).toBe('debt-card')});
 it('applies and cancels scenario without mutating base',()=>{const d=createDemo('normal',new Date(reference));const a=applyScenario(d.baseline,{extraIncome:100000,expenseChange:50000,extraDebtPayment:0,reserve:200000,extraHours:2,acceptedAt:reference});expect(a.monthlyIncome).toBe(d.baseline.monthlyIncome+100000);expect(applyScenario(d.baseline).monthlyIncome).toBe(d.baseline.monthlyIncome)});
 it('builds dated chart and milestones',()=>{const d=createDemo('normal',new Date(reference));expect(d.projection.points.length).toBeGreaterThan(6);expect(d.projection.nextPayment?.date).toContain('2026-08')});
 it('assesses tools conservatively',()=>expect(assessPurchase(100000,20000,50,50000)).toEqual(expect.objectContaining({conservativeIncome:10000,paybackMonths:10,createsCashGap:true})));
});
