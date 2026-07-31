import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useApp } from '../../app/AppContext';
import { Badge, Empty, Field } from '../../components/ui';
import { Page } from '../../components/Page';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { formatMoney, parseMoney } from '../../domain/money';
import { cn } from '../../lib/utils';

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
    <form className="space-y-4" onSubmit={submit}>
      <DialogHeader>
        <DialogTitle>Новая операция</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-2">
        {(['expense', 'income'] as const).map((kind) => (
          <label
            key={kind}
            className={cn(
              'flex cursor-pointer items-center justify-center rounded-lg border px-4 py-3 text-sm font-medium transition-colors has-[:checked]:border-primary has-[:checked]:bg-secondary',
            )}
          >
            <input type="radio" value={kind} className="sr-only" {...register('kind')} />
            {kind === 'expense' ? 'Расход' : 'Доход'}
          </label>
        ))}
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
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-input accent-primary"
          {...register('recurring')}
        />
        Повторяется ежемесячно
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={close}>
          Отмена
        </Button>
        <Button type="submit">Добавить</Button>
      </div>
    </form>
  );
}

export function Transactions() {
  const { data, settings, refresh, repository } = useApp();
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [open, setOpen] = useState(false);
  if (!data) return null;
  const items = data.transactions.filter((x) => filter === 'all' || x.kind === filter);
  return (
    <Page title="Операции" sub="Доходы и расходы вручную">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 flex-wrap gap-2">
          {(['all', 'expense', 'income'] as const).map((x) => (
            <Button
              key={x}
              type="button"
              size="sm"
              variant={filter === x ? 'secondary' : 'outline'}
              onClick={() => setFilter(x)}
            >
              {x === 'all' ? 'Все' : x === 'expense' ? 'Расходы' : 'Доходы'}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          size="icon"
          aria-label="Добавить операцию"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {items.length === 0 ? (
        <Empty title="Операций нет" text="Добавьте первую операцию — она сохранится и без сети." />
      ) : (
        <div className="space-y-2">
          {items.map((x) => (
            <Card key={x.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold',
                    x.kind === 'income'
                      ? 'bg-secondary text-secondary-foreground'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {x.kind === 'income' ? '↓' : '↑'}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <b className="block truncate text-sm font-semibold">
                    {x.description || x.category}
                  </b>
                  <small className="block text-sm text-muted-foreground">
                    {x.category} ·{' '}
                    {new Intl.DateTimeFormat(settings.language === 'ru' ? 'ru-RU' : 'en-US').format(
                      new Date(x.occurred_at),
                    )}
                  </small>
                  <Badge status={x.syncStatus} />
                </div>
                <strong
                  className={cn(
                    'text-sm font-semibold tabular-nums',
                    x.kind === 'income' ? 'text-primary' : 'text-foreground',
                  )}
                >
                  {x.kind === 'income' ? '+' : '−'}
                  {formatMoney(x.amount, x.currency)}
                </strong>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Удалить операцию"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={async () => {
                    await repository.deleteTransaction(x.id, settings.demoOffline);
                    await refresh();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          {open && <TransactionEditor close={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </Page>
  );
}
