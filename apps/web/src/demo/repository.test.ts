import { beforeEach, describe, expect, it } from 'vitest';
import { DemoRepository } from './repository';
import { db, getDemo } from '../persistence/db';
describe('DemoRepository', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });
  it('persists dataset and deduplicates queued entity', async () => {
    const r = new DemoRepository();
    await r.reset();
    const input = {
      account_id: 'main',
      kind: 'expense' as const,
      amount: 500,
      currency: 'RUB' as const,
      category: 'Тест',
      description: 'offline',
      occurred_at: new Date().toISOString(),
      recurring: false,
    };
    const item = await r.addTransaction(input, true);
    expect((await getDemo())?.transactions.some((x) => x.id === item.id)).toBe(true);
    expect((await db.queue.toArray()).length).toBe(1);
  });
  it('bounds retry and then syncs once', async () => {
    const r = new DemoRepository();
    await r.reset();
    await r.addTransaction(
      {
        account_id: 'main',
        kind: 'expense',
        amount: 500,
        currency: 'RUB',
        category: 'T',
        description: '',
        occurred_at: new Date().toISOString(),
        recurring: false,
      },
      true,
    );
    for (let i = 0; i < 4; i++) {
      await db.queue.toCollection().modify({ nextAttemptAt: 0 });
      await r.sync(true);
    }
    expect((await db.queue.toArray())[0]?.status).toBe('failed');
    await db.queue.toCollection().modify({ nextAttemptAt: 0 });
    await r.sync();
    expect((await db.queue.toArray())[0]?.status).toBe('synced');
  });
});
