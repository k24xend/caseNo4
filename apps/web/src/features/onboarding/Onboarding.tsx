import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Field } from '../../components/ui';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import type { Currency, Debt, DraftLine, OnboardingDraft } from '../../domain/models';
import { formatMoney, moneyInput, newId, parseMoney } from '../../domain/money';
import { getDraft, setDraft } from '../../persistence/db';
import { useApp } from '../../app/AppContext';
import { cn } from '../../lib/utils';

const currencies: Currency[] = ['RUB', 'USD', 'EUR'];
const strategies: Array<{ value: OnboardingDraft['strategy']; label: string }> = [
  { value: 'avalanche', label: 'Высокая ставка сначала' },
  { value: 'snowball', label: 'Маленький остаток сначала' },
  { value: 'custom', label: 'Свой порядок' },
];
const steps = [
  'Язык',
  'Валюта',
  'Доступно',
  'Резерв',
  'Доходы',
  'Расходы',
  'Долги',
  'Приоритет',
  'Проверка',
];

const initialDraft = (): OnboardingDraft => ({
  language: 'ru',
  currency: 'RUB',
  availableNow: 0,
  minimumReserve: 0,
  incomes: [],
  expenses: [],
  debts: [],
  strategy: 'avalanche',
  idempotencyKey: `onboarding-${newId()}`,
});

export function Onboarding() {
  const { repository, patch } = useApp();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [draft, setLocal] = useState<OnboardingDraft>(initialDraft);
  const [lineEditor, setLineEditor] = useState<{
    kind: 'incomes' | 'expenses';
    item?: DraftLine;
  }>();
  const [debtEditor, setDebtEditor] = useState<Debt>();
  const [addingDebt, setAddingDebt] = useState(false);

  useEffect(() => {
    void getDraft().then((saved) => saved && setLocal(saved));
  }, []);
  const update = async (patchDraft: Partial<OnboardingDraft>) => {
    const next = { ...draft, ...patchDraft };
    setLocal(next);
    await setDraft(next);
  };
  const saveLine = (kind: 'incomes' | 'expenses', item: DraftLine) => {
    const values = draft[kind];
    const next = values.some((value) => value.id === item.id)
      ? values.map((value) => (value.id === item.id ? item : value))
      : [...values, item];
    void update({ [kind]: next });
    setLineEditor(undefined);
  };
  const saveDebt = (item: Debt) => {
    const next = draft.debts.some((value) => value.id === item.id)
      ? draft.debts.map((value) => (value.id === item.id ? item : value))
      : [...draft.debts, item];
    void update({ debts: next });
    setDebtEditor(undefined);
    setAddingDebt(false);
  };

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-background">
      <header className="space-y-3 border-b border-border px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            Шаг {step + 1} из {steps.length}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={async () => {
              await repository.scenario('empty');
              await patch({ entered: true });
              nav('/today');
            }}
          >
            Пропустить
          </Button>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={steps.length}
        >
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="flex-1 space-y-6 overflow-auto px-4 py-6">
        <p className="text-sm font-medium text-primary">{steps[step]}</p>
        {step === 0 && (
          <ChoiceStep
            title="На каком языке удобнее?"
            values={[
              ['ru', 'Русский'],
              ['en', 'English'],
            ]}
            selected={draft.language}
            onSelect={(language) => void update({ language: language as 'ru' | 'en' })}
          />
        )}
        {step === 1 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold tracking-tight">Базовая валюта</h1>
            <p className="text-sm text-muted-foreground">Разные валюты не смешиваются.</p>
            <div className="grid grid-cols-3 gap-2">
              {currencies.map((currency) => (
                <Button
                  key={currency}
                  type="button"
                  variant={draft.currency === currency ? 'default' : 'outline'}
                  onClick={() => void update({ currency })}
                >
                  {currency}
                </Button>
              ))}
            </div>
          </div>
        )}
        {step === 2 && (
          <MoneyStep
            title="Сколько денег доступно сейчас?"
            value={draft.availableNow}
            onChange={(availableNow) => update({ availableNow })}
          />
        )}
        {step === 3 && (
          <MoneyStep
            title="Какой минимальный резерв защитить?"
            value={draft.minimumReserve}
            onChange={(minimumReserve) => update({ minimumReserve })}
          />
        )}
        {step === 4 && (
          <DraftList
            title="Какие доходы ожидаются?"
            currency={draft.currency}
            items={draft.incomes}
            onAdd={() => setLineEditor({ kind: 'incomes' })}
            onEdit={(item) => setLineEditor({ kind: 'incomes', item })}
            onRemove={(id) =>
              void update({ incomes: draft.incomes.filter((item) => item.id !== id) })
            }
          />
        )}
        {step === 5 && (
          <DraftList
            title="Обязательные расходы"
            currency={draft.currency}
            items={draft.expenses}
            onAdd={() => setLineEditor({ kind: 'expenses' })}
            onEdit={(item) => setLineEditor({ kind: 'expenses', item })}
            onRemove={(id) =>
              void update({ expenses: draft.expenses.filter((item) => item.id !== id) })
            }
          />
        )}
        {step === 6 && (
          <DebtList
            currency={draft.currency}
            items={draft.debts}
            onAdd={() => setAddingDebt(true)}
            onEdit={setDebtEditor}
            onRemove={(id) => void update({ debts: draft.debts.filter((item) => item.id !== id) })}
          />
        )}
        {step === 7 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold tracking-tight">Приоритет погашения</h1>
            <div className="space-y-2">
              {strategies.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    'flex w-full items-center rounded-lg border border-border px-4 py-3 text-left text-sm font-medium transition-colors',
                    'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    draft.strategy === value && 'border-primary bg-secondary',
                  )}
                  onClick={() => void update({ strategy: value })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
        {step === 8 && <Summary draft={draft} />}
      </main>

      <footer className="flex gap-3 border-t border-border px-4 py-4">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={step === 0}
          onClick={() => setStep((value) => value - 1)}
        >
          Назад
        </Button>
        <Button
          type="button"
          className="flex-1"
          onClick={() =>
            step === steps.length - 1 ? nav('/diagnosis') : setStep((value) => value + 1)
          }
        >
          {step === steps.length - 1 ? 'Собрать мой план' : 'Далее'}
        </Button>
      </footer>

      <Dialog open={!!lineEditor} onOpenChange={(open) => !open && setLineEditor(undefined)}>
        <DialogContent>
          {lineEditor && (
            <DraftLineForm
              kind={lineEditor.kind}
              item={lineEditor.item}
              onSave={(item) => saveLine(lineEditor.kind, item)}
              onClose={() => setLineEditor(undefined)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={addingDebt || !!debtEditor}
        onOpenChange={(open) => {
          if (!open) {
            setAddingDebt(false);
            setDebtEditor(undefined);
          }
        }}
      >
        <DialogContent>
          {(addingDebt || debtEditor) && (
            <DebtDraftForm
              currency={draft.currency}
              item={debtEditor}
              onSave={saveDebt}
              onClose={() => {
                setAddingDebt(false);
                setDebtEditor(undefined);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChoiceStep({
  title,
  values,
  selected,
  onSelect,
}: {
  title: string;
  values: Array<[string, string]>;
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {values.map(([value, label]) => (
          <Button
            key={value}
            type="button"
            variant={selected === value ? 'default' : 'outline'}
            className="h-12"
            onClick={() => onSelect(value)}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function MoneyStep({
  title,
  value,
  onChange,
}: {
  title: string;
  value: number;
  onChange: (value: number) => Promise<void>;
}) {
  const [text, setText] = useState(value ? moneyInput(value) : '');
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <Field
        label="Сумма"
        inputMode="decimal"
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          const minor = parseMoney(event.target.value);
          if (minor !== null) void onChange(minor);
        }}
      />
      <p className="text-sm text-muted-foreground">Внутри сумма хранится целым числом в копейках.</p>
    </div>
  );
}

function DraftList({
  title,
  currency,
  items,
  onAdd,
  onEdit,
  onRemove,
}: {
  title: string;
  currency: Currency;
  items: DraftLine[];
  onAdd: () => void;
  onEdit: (item: DraftLine) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="space-y-2">
        {items.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <span className="min-w-0 space-y-1">
                <b className="block text-sm font-semibold">{item.name}</b>
                <small className="text-sm text-muted-foreground">
                  {formatMoney(item.amount, currency)} · {item.date}
                </small>
              </span>
              <div className="flex shrink-0 gap-1">
                <Button type="button" variant="ghost" size="icon" aria-label="Изменить" onClick={() => onEdit(item)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Удалить"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button type="button" variant="outline" className="w-full" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Добавить строку
      </Button>
    </div>
  );
}

function DraftLineForm({
  kind,
  item,
  onSave,
  onClose,
}: {
  kind: 'incomes' | 'expenses';
  item?: DraftLine;
  onSave: (item: DraftLine) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(item?.name ?? '');
  const [amount, setAmount] = useState(item ? moneyInput(item.amount) : '');
  const [date, setDate] = useState(item?.date ?? new Date().toISOString().slice(0, 10));
  const [recurring, setRecurring] = useState(item?.recurring ?? true);
  const [confirmed, setConfirmed] = useState(item?.confirmed ?? true);
  const minor = parseMoney(amount);
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim() && minor && date)
          onSave({
            id: item?.id ?? newId(),
            name: name.trim(),
            amount: minor,
            date,
            recurring,
            confirmed,
          });
      }}
    >
      <DialogHeader>
        <DialogTitle>
          {item ? 'Изменить' : 'Добавить'} {kind === 'incomes' ? 'доход' : 'расход'}
        </DialogTitle>
      </DialogHeader>
      <Field label="Название" value={name} onChange={(e) => setName(e.target.value)} />
      <Field
        label="Сумма"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <Field label="Дата" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-input accent-primary"
          checked={recurring}
          onChange={(e) => setRecurring(e.target.checked)}
        />
        Повторяется
      </label>
      {kind === 'incomes' && (
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input accent-primary"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          Доход подтверждён
        </label>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Отмена
        </Button>
        <Button type="submit" disabled={!name.trim() || !minor || !date}>
          Сохранить
        </Button>
      </div>
    </form>
  );
}

function DebtList({
  currency,
  items,
  onAdd,
  onEdit,
  onRemove,
}: {
  currency: Currency;
  items: Debt[];
  onAdd: () => void;
  onEdit: (item: Debt) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Долги</h1>
      <div className="space-y-2">
        {items.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <span className="min-w-0 space-y-1">
                <b className="block text-sm font-semibold">{item.name}</b>
                <small className="text-sm text-muted-foreground">
                  {formatMoney(item.balance, currency)} · {item.annual_rate_bps / 100}%
                </small>
              </span>
              <div className="flex shrink-0 gap-1">
                <Button type="button" variant="ghost" size="icon" aria-label="Изменить" onClick={() => onEdit(item)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Удалить"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button type="button" variant="outline" className="w-full" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Добавить долг
      </Button>
    </div>
  );
}

function DebtDraftForm({
  currency,
  item,
  onSave,
  onClose,
}: {
  currency: Currency;
  item?: Debt;
  onSave: (item: Debt) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(item?.name ?? '');
  const [balance, setBalance] = useState(item ? moneyInput(item.balance) : '');
  const [rate, setRate] = useState(item ? String(item.annual_rate_bps / 100) : '');
  const [minimum, setMinimum] = useState(item ? moneyInput(item.minimum_payment) : '');
  const [dueDay, setDueDay] = useState(item?.due_day ?? 15);
  const [overdue, setOverdue] = useState(item?.overdue ?? false);
  const [priority, setPriority] = useState(item?.custom_priority ?? 0);
  const balanceMinor = parseMoney(balance);
  const minimumMinor = parseMoney(minimum);
  const valid =
    !!name.trim() &&
    !!balanceMinor &&
    minimumMinor !== null &&
    minimumMinor <= balanceMinor &&
    dueDay >= 1 &&
    dueDay <= 31;
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid)
          onSave({
            id: item?.id ?? newId(),
            name: name.trim(),
            debt_type: item?.debt_type ?? 'credit',
            balance: balanceMinor!,
            currency,
            annual_rate_bps: Math.round(Number(rate || 0) * 100),
            minimum_payment: minimumMinor!,
            due_day: dueDay,
            overdue,
            custom_priority: priority,
            syncStatus: 'synced',
          });
      }}
    >
      <DialogHeader>
        <DialogTitle>{item ? 'Изменить долг' : 'Новый долг'}</DialogTitle>
      </DialogHeader>
      <Field label="Название" value={name} onChange={(e) => setName(e.target.value)} />
      <Field
        label="Остаток"
        inputMode="decimal"
        value={balance}
        onChange={(e) => setBalance(e.target.value)}
      />
      <Field
        label="Ставка, %"
        inputMode="decimal"
        value={rate}
        onChange={(e) => setRate(e.target.value)}
      />
      <Field
        label="Минимальный платёж"
        inputMode="decimal"
        value={minimum}
        onChange={(e) => setMinimum(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="День платежа"
          type="number"
          min={1}
          max={31}
          value={dueDay}
          onChange={(e) => setDueDay(Number(e.target.value))}
        />
        <Field
          label="Приоритет"
          type="number"
          min={0}
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
        />
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-input accent-primary"
          checked={overdue}
          onChange={(e) => setOverdue(e.target.checked)}
        />
        Есть просрочка
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Отмена
        </Button>
        <Button type="submit" disabled={!valid}>
          Сохранить
        </Button>
      </div>
    </form>
  );
}

function Summary({ draft }: { draft: OnboardingDraft }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Всё готово</h1>
      <Card>
        <CardContent className="space-y-4 p-6">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">Доступно</dt>
              <dd className="text-sm font-semibold tabular-nums">
                {formatMoney(draft.availableNow, draft.currency)}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">Резерв</dt>
              <dd className="text-sm font-semibold tabular-nums">
                {formatMoney(draft.minimumReserve, draft.currency)}
              </dd>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <dt className="text-sm text-muted-foreground">Доходы / расходы / долги</dt>
              <dd className="text-sm font-semibold">
                {draft.incomes.length} / {draft.expenses.length} / {draft.debts.length}
              </dd>
            </div>
          </dl>
          <p className="text-sm text-muted-foreground">
            Ключ повторной отправки сохранён для защиты от дублей.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
