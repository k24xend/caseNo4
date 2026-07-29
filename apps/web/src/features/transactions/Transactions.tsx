import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useApp } from '../../app/AppContext';
import { Badge, Button, Empty, Field } from '../../components/ui';
import { Page } from '../../components/Page';
import { formatMoney, parseMoney } from '../../domain/money';
const txForm = z.object({
  kind: z.enum(['expense', 'income']),
  amount: z.string().refine((x) => (parseMoney(x) ?? 0) > 0, 'Введите сумму'),
  category: z.string().min(1, 'Введите категорию'),
  description: z.string(),
  date: z.string(),
  recurring: z.boolean(),
});
type TxForm = z.infer<typeof txForm>;
function TransactionEditor({ close }: { close: () => void }) {
  const { settings, refresh, repository, data } = useApp();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TxForm>({
    resolver: zodResolver(txForm),
    defaultValues: {
      kind: 'expense',
      amount: '',
      category: '',
      description: '',
      date: new Date().toISOString().slice(0, 10),
      recurring: false,
    },
  });
  const submit = handleSubmit(async (v) => {
    await repository.addTransaction(
      {
        account_id: 'main',
        kind: v.kind,
        amount: parseMoney(v.amount)!,
        currency: data?.currency ?? 'RUB',
        category: v.category,
        description: v.description,
        occurred_at: new Date(`${v.date}T12:00:00`).toISOString(),
        recurring: v.recurring,
      },
      settings.demoOffline,
    );
    await refresh();
    close();
  });
  return (
    <form className="sheet-form" onSubmit={submit}>
      <h2>Новая операция</h2>
      <div className="segment">
        <label>
          <input type="radio" value="expense" {...register('kind')} />
          <span>Расход</span>
        </label>
        <label>
          <input type="radio" value="income" {...register('kind')} />
          <span>Доход</span>
        </label>
      </div>
      <Field
        label="Сумма, ₽"
        inputMode="decimal"
        {...register('amount')}
        error={errors.amount?.message}
      />
      <Field label="Категория" {...register('category')} error={errors.category?.message} />
      <Field label="Описание" {...register('description')} />
      <Field label="Дата" type="date" {...register('date')} />
      <label className="check">
        <input type="checkbox" {...register('recurring')} /> Повторяется ежемесячно
      </label>
      <div className="sheet-actions">
        <Button type="button" className="secondary" onClick={close}>
          Отмена
        </Button>
        <Button>Добавить</Button>
      </div>
    </form>
  );
}
export function Transactions() {
  const { data, settings, refresh, repository } = useApp();
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all'),
    [open, setOpen] = useState(false);
  if (!data) return null;
  const items = data.transactions.filter((x) => filter === 'all' || x.kind === filter);
  return (
    <Page title="Операции" sub="Доходы и расходы вручную">
      <div className="toolbar">
        <div className="chips">
          {(['all', 'expense', 'income'] as const).map((x) => (
            <button className={filter === x ? 'active' : ''} key={x} onClick={() => setFilter(x)}>
              {x === 'all' ? 'Все' : x === 'expense' ? 'Расходы' : 'Доходы'}
            </button>
          ))}
        </div>
        <Button
          className="icon-button"
          aria-label="Добавить операцию"
          onClick={() => setOpen(true)}
        >
          <Plus />
        </Button>
      </div>
      {items.length === 0 ? (
        <Empty title="Операций нет" text="Добавьте первую операцию — она сохранится и без сети." />
      ) : (
        <div className="transaction-list">
          {items.map((x) => (
            <article key={x.id}>
              <div className={`tx-icon ${x.kind}`}>{x.kind === 'income' ? '↓' : '↑'}</div>
              <div>
                <b>{x.description || x.category}</b>
                <small>
                  {x.category} ·{' '}
                  {new Intl.DateTimeFormat(settings.language === 'ru' ? 'ru-RU' : 'en-US').format(
                    new Date(x.occurred_at),
                  )}
                </small>
                <Badge status={x.syncStatus} />
              </div>
              <strong className={x.kind}>
                {x.kind === 'income' ? '+' : '−'}
                {formatMoney(x.amount, x.currency)}
              </strong>
              <button
                aria-label="Удалить операцию"
                onClick={async () => {
                  await repository.deleteTransaction(x.id, settings.demoOffline);
                  await refresh();
                }}
              >
                <Trash2 />
              </button>
            </article>
          ))}
        </div>
      )}
      {open && (
        <div className="modal-wrap" role="dialog" aria-modal="true">
          <div className="modal">
            <TransactionEditor close={() => setOpen(false)} />
          </div>
        </div>
      )}
    </Page>
  );
}
