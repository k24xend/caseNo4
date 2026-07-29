import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useApp } from '../../app/AppContext';
import { Badge, Button, Card, Empty, Field } from '../../components/ui';
import { Page } from '../../components/Page';
import type { Debt } from '../../domain/models';
import { formatMoney, parseMoney } from '../../domain/money';
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
    <form className="sheet-form" onSubmit={submit}>
      <h2>{item ? 'Изменить долг' : 'Новый долг'}</h2>
      <Field label="Название" {...register('name')} error={errors.name?.message} />
      <Field
        label="Остаток, ₽"
        inputMode="decimal"
        {...register('balance')}
        error={errors.balance?.message}
      />
      <div className="field-row">
        <Field label="Ставка, %" inputMode="decimal" {...register('rate')} />
        <Field label="День платежа" inputMode="numeric" {...register('due')} />
      </div>
      <Field
        label="Минимальный платёж, ₽"
        inputMode="decimal"
        {...register('minimum')}
        error={errors.minimum?.message}
      />
      <label className="check">
        <input type="checkbox" {...register('overdue')} /> Есть просрочка
      </label>
      <div className="sheet-actions">
        <Button type="button" className="secondary" onClick={onClose}>
          Отмена
        </Button>
        <Button>Сохранить</Button>
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
      <Button className="compact" onClick={() => setEdit('new')}>
        <Plus />
        Добавить долг
      </Button>
      {data.debts.length === 0 ? (
        <Empty
          title="Долгов нет"
          text="Добавьте долг, чтобы увидеть стратегию и минимальные платежи."
        />
      ) : (
        <div className="list">
          {data.debts.map((d) => (
            <Card key={d.id}>
              <button className="debt-main" onClick={() => setEdit(d)}>
                <span>
                  <b>{d.name}</b>
                  <small>
                    {d.annual_rate_bps / 100}% · платёж {d.due_day} числа
                  </small>
                </span>
                <strong>{formatMoney(d.balance, d.currency)}</strong>
              </button>
              <div className="debt-foot">
                <Badge status={d.syncStatus} />
                <span>мин. {formatMoney(d.minimum_payment, d.currency)}</span>
                <AlertDialog.Root>
                  <AlertDialog.Trigger asChild>
                    <button aria-label={`Удалить ${d.name}`}>
                      <Trash2 />
                    </button>
                  </AlertDialog.Trigger>
                  <AlertDialog.Portal>
                    <AlertDialog.Overlay className="dialog-overlay" />
                    <AlertDialog.Content className="dialog">
                      <AlertDialog.Title>Удалить долг?</AlertDialog.Title>
                      <AlertDialog.Description>
                        Запись исчезнет из плана. Это действие нельзя отменить.
                      </AlertDialog.Description>
                      <div>
                        <AlertDialog.Cancel asChild>
                          <Button className="secondary">Отмена</Button>
                        </AlertDialog.Cancel>
                        <AlertDialog.Action asChild>
                          <Button className="danger" onClick={() => remove(d.id)}>
                            Удалить
                          </Button>
                        </AlertDialog.Action>
                      </div>
                    </AlertDialog.Content>
                  </AlertDialog.Portal>
                </AlertDialog.Root>
              </div>
            </Card>
          ))}
        </div>
      )}
      {edit && (
        <div className="modal-wrap" role="dialog" aria-modal="true">
          <div className="modal">
            <DebtEditor
              item={edit === 'new' ? undefined : edit}
              onClose={() => setEdit(undefined)}
            />
          </div>
        </div>
      )}
    </Page>
  );
}
