import * as AlertDialog from '@radix-ui/react-alert-dialog';
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
import type { Debt } from '../../domain/models';
import { formatMoney, parseMoney } from '../../domain/money';
import { cn } from '../../lib/utils';

const debtForm = z.object({
  name: z.string().min(1, 'Введите название'),
  balance: z.string().refine((x) => (parseMoney(x) ?? 0) > 0, 'Введите сумму'),
  rate: z.coerce.number().min(0).max(100),
  minimum: z.string().refine((x) => (parseMoney(x) ?? 0) > 0, 'Введите платёж'),
  due: z.coerce.number().int().min(1).max(31),
  overdue: z.boolean(),
});
type DebtFormInput = z.input<typeof debtForm>;
type DebtFormOutput = z.output<typeof debtForm>;

function DebtEditor({ item, onClose }: { item?: Debt; onClose: () => void }) {
  const { settings, refresh, repository, data } = useApp();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DebtFormInput, unknown, DebtFormOutput>({
    resolver: zodResolver(debtForm),
    defaultValues: {
      name: item?.name ?? '',
      balance: item ? String(item.balance / 100) : '',
      rate: item ? item.annual_rate_bps / 100 : 0,
      minimum: item ? String(item.minimum_payment / 100) : '',
      due: item?.due_day ?? 15,
      overdue: item?.overdue ?? false,
    },
  });
  const submit = handleSubmit(async (v) => {
    await repository.saveDebt(
      {
        name: v.name,
        debt_type: item?.debt_type ?? 'credit',
        balance: parseMoney(v.balance)!,
        currency: data?.currency ?? 'RUB',
        annual_rate_bps: Math.round(v.rate * 100),
        minimum_payment: parseMoney(v.minimum)!,
        due_day: v.due,
        overdue: v.overdue,
        custom_priority: item?.custom_priority ?? 99,
      },
      item?.id,
      settings.demoOffline,
    );
    await refresh();
    onClose();
  });
  return (
    <form className="space-y-4" onSubmit={submit}>
      <DialogHeader>
        <DialogTitle>{item ? 'Изменить долг' : 'Новый долг'}</DialogTitle>
      </DialogHeader>
      <Field label="Название" {...register('name')} error={errors.name?.message} />
      <Field
        label="Остаток, ₽"
        inputMode="decimal"
        {...register('balance')}
        error={errors.balance?.message}
      />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Ставка, %" inputMode="decimal" {...register('rate')} />
        <Field label="День платежа" inputMode="numeric" {...register('due')} />
      </div>
      <Field
        label="Минимальный платёж, ₽"
        inputMode="decimal"
        {...register('minimum')}
        error={errors.minimum?.message}
      />
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-input accent-primary"
          {...register('overdue')}
        />
        Есть просрочка
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Отмена
        </Button>
        <Button type="submit">Сохранить</Button>
      </div>
    </form>
  );
}

export function Debts() {
  const { data, settings, refresh, repository } = useApp();
  const [edit, setEdit] = useState<Debt | 'new'>();
  if (!data) return null;
  const remove = async (id: string) => {
    await repository.deleteDebt(id, settings.demoOffline);
    await refresh();
  };
  return (
    <Page title="Долги" sub="Приоритет: высокая ставка" backLabel="Назад">
      <Button size="sm" onClick={() => setEdit('new')}>
        <Plus className="h-4 w-4" />
        Добавить долг
      </Button>
      {data.debts.length === 0 ? (
        <Empty
          title="Долгов нет"
          text="Добавьте долг, чтобы увидеть стратегию и минимальные платежи."
        />
      ) : (
        <div className="space-y-3">
          {data.debts.map((d) => (
            <Card key={d.id}>
              <CardContent className="space-y-3 p-4">
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-3 text-left"
                  onClick={() => setEdit(d)}
                >
                  <span className="min-w-0 space-y-1">
                    <b className="block text-sm font-semibold">{d.name}</b>
                    <small className="text-sm text-muted-foreground">
                      {d.annual_rate_bps / 100}% · платёж {d.due_day} числа
                    </small>
                  </span>
                  <strong className="text-base font-semibold tabular-nums">
                    {formatMoney(d.balance, d.currency)}
                  </strong>
                </button>
                <div className="flex items-center gap-3 border-t border-border pt-3">
                  <Badge status={d.syncStatus} />
                  <span className="flex-1 text-sm text-muted-foreground">
                    мин. {formatMoney(d.minimum_payment, d.currency)}
                  </span>
                  <AlertDialog.Root>
                    <AlertDialog.Trigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Удалить ${d.name}`}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialog.Trigger>
                    <AlertDialog.Portal>
                      <AlertDialog.Overlay className="fixed inset-0 z-50 bg-background/80" />
                      <AlertDialog.Content
                        className={cn(
                          'fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2',
                          'space-y-4 rounded-xl border bg-card p-6 shadow-md',
                        )}
                      >
                        <AlertDialog.Title className="text-base font-semibold">
                          Удалить долг?
                        </AlertDialog.Title>
                        <AlertDialog.Description className="text-sm text-muted-foreground">
                          Запись исчезнет из плана. Это действие нельзя отменить.
                        </AlertDialog.Description>
                        <div className="flex justify-end gap-2">
                          <AlertDialog.Cancel asChild>
                            <Button variant="outline">Отмена</Button>
                          </AlertDialog.Cancel>
                          <AlertDialog.Action asChild>
                            <Button variant="destructive" onClick={() => remove(d.id)}>
                              Удалить
                            </Button>
                          </AlertDialog.Action>
                        </div>
                      </AlertDialog.Content>
                    </AlertDialog.Portal>
                  </AlertDialog.Root>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={!!edit} onOpenChange={(open) => !open && setEdit(undefined)}>
        <DialogContent>
          {edit && (
            <DebtEditor
              item={edit === 'new' ? undefined : edit}
              onClose={() => setEdit(undefined)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Page>
  );
}
