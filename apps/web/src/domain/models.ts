import { z } from 'zod';
export const Currency = z.enum(['RUB', 'USD', 'EUR']);
export type Currency = z.infer<typeof Currency>;
export const SyncStatus = z.enum(['pending', 'synced', 'failed', 'conflict']);
export type SyncStatus = z.infer<typeof SyncStatus>;
export const DebtSchema = z.object({
  id: z.string(),
  name: z.string(),
  debt_type: z
    .enum(['credit', 'credit_card', 'installment', 'personal', 'other'])
    .default('credit'),
  balance: z.number().int().nonnegative(),
  currency: Currency,
  annual_rate_bps: z.number().int().nonnegative(),
  minimum_payment: z.number().int().nonnegative(),
  due_day: z.number().int().min(1).max(31),
  overdue: z.boolean(),
  custom_priority: z.number().int(),
  syncStatus: SyncStatus.optional().default('synced'),
});
export type Debt = z.infer<typeof DebtSchema>;
export const TransactionSchema = z.object({
  id: z.string(),
  account_id: z.string(),
  kind: z.enum(['income', 'expense', 'transfer', 'debt_payment']),
  amount: z.number().int().positive(),
  currency: Currency,
  category: z.string(),
  description: z.string(),
  occurred_at: z.string(),
  recurring: z.boolean().default(false),
  syncStatus: SyncStatus.optional().default('synced'),
});
export type Transaction = z.infer<typeof TransactionSchema>;
export const SnapshotSchema = z.object({
  available_now: z.number().int(),
  mandatory_before_next_income: z.number().int(),
  minimum_debt_payments_before_next_income: z.number().int(),
  projected_balance_before_next_income: z.number().int(),
  safe_to_spend: z.number().int().nonnegative(),
  safe_daily_amount: z.number().int().nonnegative(),
  monthly_free_cash_flow: z.number().int(),
  minimum_buffer_target: z.number().int().nonnegative(),
});
export const PlanSchema = z.object({
  currency: Currency,
  state: z.enum(['critical', 'stabilization', 'exit', 'buffer', 'growth']),
  snapshot: SnapshotSchema,
  action: z.object({ type: z.string(), title: z.string(), amount: z.number().int() }),
  generated_at: z.string(),
  debt_forecasts: z.record(z.string(), z.unknown()).default({}),
});
export type Plan = z.infer<typeof PlanSchema>;
export const ExplanationSchema = z.object({
  headline: z.string(),
  explanation: z.string(),
  reasons: z.array(z.string()),
  next_steps: z.array(
    z.object({ title: z.string(), description: z.string(), action_type: z.string() }),
  ),
  uncertainties: z.array(z.string()),
  generated_at: z.string(),
  source: z.enum(['ai', 'fallback', 'deterministic']),
});
export type Explanation = z.infer<typeof ExplanationSchema>;
export const ApiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string(), details: z.unknown().optional() }),
});
export type Scenario = 'normal' | 'critical' | 'empty';
export interface DemoData {
  scenario: Scenario;
  currency: Currency;
  plan: Plan;
  explanation: Explanation;
  debts: Debt[];
  transactions: Transaction[];
  updatedAt: string;
}
export interface DraftLine {
  id: string;
  name: string;
  amount: number;
  date: string;
  confirmed: boolean;
  recurring: boolean;
}
export interface OnboardingDraft {
  language: 'ru' | 'en';
  currency: Currency;
  availableNow: number;
  minimumReserve: number;
  incomes: DraftLine[];
  expenses: DraftLine[];
  debts: Debt[];
  strategy: 'avalanche' | 'snowball' | 'custom';
  idempotencyKey: string;
}
export interface QueuedMutation {
  id: string;
  kind: 'transaction.create' | 'transaction.delete' | 'debt.create' | 'debt.update' | 'debt.delete';
  entityId: string;
  payload: unknown;
  idempotencyKey: string;
  status: SyncStatus;
  attempts: number;
  nextAttemptAt: number;
  createdAt: number;
  error?: string;
}
export interface AppSettings {
  theme: 'system' | 'light' | 'dark';
  language: 'ru' | 'en';
  demoOffline: boolean;
  demoError: boolean;
  scenario: Scenario;
  entered: boolean;
}
