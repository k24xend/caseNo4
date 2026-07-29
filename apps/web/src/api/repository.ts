import type { Debt, DemoData, OnboardingDraft, Scenario, ScenarioAdjustment, Transaction } from '../domain/models';
import { newId } from '../domain/money';
import { createDemo } from '../demo/data';
import { demoRepository } from '../demo/repository';
import { api } from './client';

export interface DataRepository {
  load(options?: { error?: boolean; offline?: boolean }): Promise<DemoData>;
  saveDebt(input: Omit<Debt, 'id' | 'syncStatus'>, id?: string, offline?: boolean): Promise<Debt>;
  deleteDebt(id: string, offline?: boolean): Promise<void>;
  addTransaction(
    input: Omit<Transaction, 'id' | 'syncStatus'>,
    offline?: boolean,
  ): Promise<Transaction>;
  deleteTransaction(id: string, offline?: boolean): Promise<void>;
  submitOnboarding(draft: OnboardingDraft): Promise<void>;
  sync(offline?: boolean): Promise<void>;
  queueStats(): Promise<{ pending: number; failed: number; total: number }>;
  reset(): Promise<void>;
  scenario(scenario: Scenario): Promise<DemoData>;
  applyScenario?(scenario?: ScenarioAdjustment): Promise<DemoData>;
}

export class DemoDataRepository implements DataRepository {
  load(options?: { error?: boolean; offline?: boolean }) {
    return demoRepository.data(options?.error, options?.offline);
  }
  saveDebt(input: Omit<Debt, 'id' | 'syncStatus'>, id?: string, offline = false) {
    return demoRepository.saveDebt(input, id, offline);
  }
  deleteDebt(id: string, offline = false) {
    return demoRepository.deleteDebt(id, offline);
  }
  addTransaction(input: Omit<Transaction, 'id' | 'syncStatus'>, offline = false) {
    return demoRepository.addTransaction(input, offline);
  }
  deleteTransaction(id: string, offline = false) {
    return demoRepository.deleteTransaction(id, offline);
  }
  submitOnboarding(draft: OnboardingDraft) {
    return demoRepository.submitOnboarding(draft);
  }
  sync(offline = false) {
    return demoRepository.sync(offline);
  }
  queueStats() {
    return demoRepository.queueStats();
  }
  reset() {
    return demoRepository.reset();
  }
  scenario(value: Scenario) {
    return demoRepository.scenario(value);
  }
  applyScenario(value?: ScenarioAdjustment) { return demoRepository.applyScenario(value); }
}

export class ApiRepository implements DataRepository {
  async load() {
    const [plan, explanation, debts, transactions] = await Promise.all([
      api.plan(),
      api.explanation(),
      api.debts(),
      api.transactions(),
    ]);
    return {
      ...createDemo('empty'),
      plan,
      explanation,
      debts,
      transactions,
      currency: plan.currency,
      updatedAt: new Date().toISOString(),
    };
  }
  async saveDebt(input: Omit<Debt, 'id' | 'syncStatus'>, id?: string) {
    return api.saveDebt(input, id, `debt-${id ?? newId()}`);
  }
  deleteDebt(id: string) {
    return api.deleteDebt(id);
  }
  async addTransaction(input: Omit<Transaction, 'id' | 'syncStatus'>) {
    const accounts = await api.accounts();
    const account = accounts[0];
    if (!account) throw new Error('Сначала завершите онбординг');
    return api.addTransaction({ ...input, account_id: account.id }, `transaction-${newId()}`);
  }
  deleteTransaction(id: string) {
    return api.deleteTransaction(id);
  }
  submitOnboarding(draft: OnboardingDraft) {
    return api.onboarding(draft);
  }
  async sync() {
    return;
  }
  async queueStats() {
    return { pending: 0, failed: 0, total: 0 };
  }
  async reset() {
    throw new Error('Сброс доступен только в demo mode');
  }
  async scenario(_scenario: Scenario): Promise<DemoData> {
    throw new Error('Сценарии доступны только в demo mode');
  }
}
