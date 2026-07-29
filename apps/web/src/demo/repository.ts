import type {
  Debt,
  DemoData,
  QueuedMutation,
  Scenario,
  ScenarioAdjustment,
  Transaction,
} from '../domain/models';
import { calculatePlan } from '../domain/financialEngine';
import { newId, stableKey } from '../domain/money';
import { db, getDemo, setDemo } from '../persistence/db';
import { createDemo } from './data';

const sleep = (ms = 260) => new Promise((resolve) => setTimeout(resolve, ms));
export class DemoRepository {
  private recalculate(data: DemoData) {
    const stamp = new Date().toISOString();
    const result = calculatePlan(
      data.baseline,
      data.debts,
      data.activeScenario,
      stamp,
      data.currency,
    );
    data.plan = result.plan;
    data.projection = result.projection;
    data.updatedAt = stamp;
    data.explanation.headline = data.plan.action.title;
    data.explanation.generated_at = stamp;
    return data;
  }
  async data(error = false, _offline = false) {
    void _offline;
    await sleep();
    if (error) throw new Error('Искусственная ошибка demo');
    let value = await getDemo();
    if (value && !value.baseline) {
      const migrated = createDemo(value.scenario);
      migrated.debts = value.debts;
      migrated.transactions = value.transactions;
      value = this.recalculate(migrated);
      await setDemo(value);
    }
    if (!value) {
      value = createDemo();
      await setDemo(value);
    }
    return value;
  }
  async submitOnboarding(draft: import('../domain/models').OnboardingDraft) {
    const data = createDemo('normal');
    data.currency = draft.currency;
    data.debts = draft.debts;
    data.plan.currency = draft.currency;
    data.plan.snapshot.available_now = draft.availableNow;
    data.plan.snapshot.minimum_buffer_target = draft.minimumReserve;
    data.baseline = {
      ...data.baseline,
      availableNow: draft.availableNow,
      minimumBuffer: draft.minimumReserve,
      nextIncomeDate: draft.incomes.find((x) => x.confirmed)?.date ?? data.baseline.nextIncomeDate,
      incomes: draft.incomes.map((x) => ({
        id: x.id,
        name: x.name,
        amount: x.amount,
        date: x.date,
        confirmed: x.confirmed,
      })),
      expenses: draft.expenses.map((x) => ({
        id: x.id,
        name: x.name,
        amount: x.amount,
        date: x.date,
        confirmed: x.confirmed,
      })),
    };
    await setDemo(this.recalculate(data));
  }
  async scenario(scenario: Scenario) {
    const value = createDemo(scenario);
    await setDemo(value);
    return value;
  }
  async applyScenario(scenario?: ScenarioAdjustment) {
    const data = (await getDemo()) ?? createDemo();
    data.activeScenario = scenario;
    await setDemo(this.recalculate(data));
    return data;
  }
  async reset() {
    await db.transaction('rw', db.records, db.queue, async () => {
      await db.queue.clear();
      await db.records.bulkDelete(['demo', 'onboarding', 'lastSync']);
      await setDemo(createDemo());
    });
  }
  private async queue(kind: QueuedMutation['kind'], entityId: string, payload: unknown) {
    const existing = await db.queue
      .where('entityId')
      .equals(entityId)
      .and((item) => item.kind === kind && item.status !== 'synced')
      .first();
    if (existing) return existing;
    const mutation: QueuedMutation = {
      id: newId(),
      kind,
      entityId,
      payload,
      idempotencyKey: stableKey(kind, entityId),
      status: 'pending',
      attempts: 0,
      nextAttemptAt: Date.now(),
      createdAt: Date.now(),
    };
    await db.queue.put(mutation);
    return mutation;
  }
  async addTransaction(input: Omit<Transaction, 'id' | 'syncStatus'>, offline: boolean) {
    const data = (await getDemo()) ?? createDemo();
    const item: Transaction = { ...input, id: newId(), syncStatus: offline ? 'pending' : 'synced' };
    data.transactions.unshift(item);
    if (item.kind === 'income') data.baseline.availableNow += item.amount;
    if (item.kind === 'expense' || item.kind === 'debt_payment')
      data.baseline.availableNow -= item.amount;
    await setDemo(this.recalculate(data));
    if (offline) await this.queue('transaction.create', item.id, item);
    return item;
  }
  async deleteTransaction(id: string, offline: boolean) {
    const data = (await getDemo()) ?? createDemo();
    const removed = data.transactions.find((item) => item.id === id);
    data.transactions = data.transactions.filter((item) => item.id !== id);
    if (removed?.kind === 'income') data.baseline.availableNow -= removed.amount;
    if (removed && (removed.kind === 'expense' || removed.kind === 'debt_payment'))
      data.baseline.availableNow += removed.amount;
    await setDemo(this.recalculate(data));
    if (offline) await this.queue('transaction.delete', id, undefined);
  }
  async saveDebt(input: Omit<Debt, 'id' | 'syncStatus'>, id: string | undefined, offline: boolean) {
    const data = (await getDemo()) ?? createDemo();
    const item: Debt = { ...input, id: id ?? newId(), syncStatus: offline ? 'pending' : 'synced' };
    const index = data.debts.findIndex((value) => value.id === item.id);
    if (index < 0) data.debts.push(item);
    else data.debts[index] = item;
    await setDemo(this.recalculate(data));
    if (offline) await this.queue(id ? 'debt.update' : 'debt.create', item.id, item);
    return item;
  }
  async deleteDebt(id: string, offline: boolean) {
    const data = (await getDemo()) ?? createDemo();
    data.debts = data.debts.filter((item) => item.id !== id);
    await setDemo(this.recalculate(data));
    if (offline) await this.queue('debt.delete', id, undefined);
  }
  async sync(forceFailure = false) {
    const all = await db.queue.where('status').anyOf('pending', 'failed').sortBy('createdAt');
    for (const mutation of all) {
      if (mutation.nextAttemptAt > Date.now()) continue;
      if (forceFailure) {
        mutation.attempts += 1;
        mutation.status = mutation.attempts >= 3 ? 'failed' : 'pending';
        mutation.nextAttemptAt = Date.now() + Math.min(30_000, 500 * 2 ** mutation.attempts);
        mutation.error = 'Нет связи';
        await db.queue.put(mutation);
        continue;
      }
      mutation.status = 'synced';
      mutation.error = undefined;
      await db.queue.put(mutation);
      const data = await getDemo();
      if (data) {
        data.transactions = data.transactions.map((item) =>
          item.id === mutation.entityId ? { ...item, syncStatus: 'synced' } : item,
        );
        data.debts = data.debts.map((item) =>
          item.id === mutation.entityId ? { ...item, syncStatus: 'synced' } : item,
        );
        data.updatedAt = new Date().toISOString();
        await setDemo(data);
      }
    }
  }
  async queueStats() {
    const values = await db.queue.toArray();
    return {
      pending: values.filter((item) => item.status === 'pending').length,
      failed: values.filter((item) => item.status === 'failed' || item.status === 'conflict')
        .length,
      total: values.length,
    };
  }
}
export const demoRepository = new DemoRepository();
