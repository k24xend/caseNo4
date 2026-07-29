import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Field } from '../../components/ui';
import type { Currency, Debt, DraftLine, OnboardingDraft } from '../../domain/models';
import { formatMoney, moneyInput, newId, parseMoney } from '../../domain/money';
import { getDraft, setDraft } from '../../persistence/db';
import { useApp } from '../../app/AppContext';

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
  const update = async (patch: Partial<OnboardingDraft>) => {
    const next = { ...draft, ...patch };
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

  return (
    <div className="onboarding">
      <header>
        <span>
          Шаг {step + 1} из {steps.length}
        </span>
        <progress value={step + 1} max={steps.length} />
      </header>
      <main>
        <p className="eyebrow">{steps[step]}</p>
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
          <>
            <h1>Базовая валюта</h1>
            <p>Разные валюты не смешиваются.</p>
            <div className="choice">
              {currencies.map((currency) => (
                <button
                  key={currency}
                  className={draft.currency === currency ? 'active' : ''}
                  onClick={() => void update({ currency })}
                >
                  {currency}
                </button>
              ))}
            </div>
          </>
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
          <>
            <h1>Приоритет погашения</h1>
            <div className="choice vertical">
              {strategies.map(({ value, label }) => (
                <button
                  key={value}
                  className={draft.strategy === value ? 'active' : ''}
                  onClick={() => void update({ strategy: value })}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
        {step === 8 && <Summary draft={draft} />}
      </main>
      <footer>
        <Button
          className="secondary"
          disabled={step === 0}
          onClick={() => setStep((value) => value - 1)}
        >
          Назад
        </Button>
        <Button
          onClick={() =>
            step === steps.length - 1 ? nav('/diagnosis') : setStep((value) => value + 1)
          }
        >
          {step === steps.length - 1 ? 'Получить диагноз' : 'Далее'}
        </Button>
      </footer>
      {lineEditor && (
        <div className="modal-wrap" role="dialog" aria-modal="true">
          <div className="modal">
            <DraftLineForm
              kind={lineEditor.kind}
              item={lineEditor.item}
              onSave={(item) => saveLine(lineEditor.kind, item)}
              onClose={() => setLineEditor(undefined)}
            />
          </div>
        </div>
      )}
      {(addingDebt || debtEditor) && (
        <div className="modal-wrap" role="dialog" aria-modal="true">
          <div className="modal">
            <DebtDraftForm
              currency={draft.currency}
              item={debtEditor}
              onSave={saveDebt}
              onClose={() => {
                setAddingDebt(false);
                setDebtEditor(undefined);
              }}
            />
          </div>
        </div>
      )}
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
    <>
      <h1>{title}</h1>
      <div className="choice">
        {values.map(([value, label]) => (
          <button
            key={value}
            className={selected === value ? 'active' : ''}
            onClick={() => onSelect(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </>
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
    <>
      <h1>{title}</h1>
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
      <p className="muted">Внутри сумма хранится целым числом в копейках.</p>
    </>
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
    <>
      <h1>{title}</h1>
      {items.map((item) => (
        <Card key={item.id}>
          <div className="setting">
            <span>
              <b>{item.name}</b>
              <small>
                {formatMoney(item.amount, currency)} · {item.date}
              </small>
            </span>
            <div>
              <button aria-label="Изменить" onClick={() => onEdit(item)}>
                <Pencil />
              </button>
              <button aria-label="Удалить" onClick={() => onRemove(item.id)}>
                <Trash2 />
              </button>
            </div>
          </div>
        </Card>
      ))}
      <Button className="secondary" onClick={onAdd}>
        <Plus />
        Добавить строку
      </Button>
    </>
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
      className="sheet-form"
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
      <h2>
        {item ? 'Изменить' : 'Добавить'} {kind === 'incomes' ? 'доход' : 'расход'}
      </h2>
      <Field label="Название" value={name} onChange={(e) => setName(e.target.value)} />
      <Field
        label="Сумма"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <Field label="Дата" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <label className="check">
        <input
          type="checkbox"
          checked={recurring}
          onChange={(e) => setRecurring(e.target.checked)}
        />
        Повторяется
      </label>
      {kind === 'incomes' && (
        <label className="check">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          Доход подтверждён
        </label>
      )}
      <div className="sheet-actions">
        <Button type="button" className="secondary" onClick={onClose}>
          Отмена
        </Button>
        <Button disabled={!name.trim() || !minor || !date}>Сохранить</Button>
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
    <>
      <h1>Долги</h1>
      {items.map((item) => (
        <Card key={item.id}>
          <div className="setting">
            <span>
              <b>{item.name}</b>
              <small>
                {formatMoney(item.balance, currency)} · {item.annual_rate_bps / 100}%
              </small>
            </span>
            <div>
              <button aria-label="Изменить" onClick={() => onEdit(item)}>
                <Pencil />
              </button>
              <button aria-label="Удалить" onClick={() => onRemove(item.id)}>
                <Trash2 />
              </button>
            </div>
          </div>
        </Card>
      ))}
      <Button className="secondary" onClick={onAdd}>
        <Plus />
        Добавить долг
      </Button>
    </>
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
  const balanceMinor = parseMoney(balance),
    minimumMinor = parseMoney(minimum);
  const valid =
    !!name.trim() &&
    !!balanceMinor &&
    minimumMinor !== null &&
    minimumMinor <= balanceMinor &&
    dueDay >= 1 &&
    dueDay <= 31;
  return (
    <form
      className="sheet-form"
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
      <h2>{item ? 'Изменить долг' : 'Новый долг'}</h2>
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
      <div className="field-row">
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
      <label className="check">
        <input type="checkbox" checked={overdue} onChange={(e) => setOverdue(e.target.checked)} />
        Есть просрочка
      </label>
      <div className="sheet-actions">
        <Button type="button" className="secondary" onClick={onClose}>
          Отмена
        </Button>
        <Button disabled={!valid}>Сохранить</Button>
      </div>
    </form>
  );
}
function Summary({ draft }: { draft: OnboardingDraft }) {
  return (
    <>
      <h1>Всё готово</h1>
      <Card>
        <dl>
          <div>
            <dt>Доступно</dt>
            <dd>{formatMoney(draft.availableNow, draft.currency)}</dd>
          </div>
          <div>
            <dt>Резерв</dt>
            <dd>{formatMoney(draft.minimumReserve, draft.currency)}</dd>
          </div>
          <div>
            <dt>Доходы / расходы / долги</dt>
            <dd>
              {draft.incomes.length} / {draft.expenses.length} / {draft.debts.length}
            </dd>
          </div>
        </dl>
        <small>Ключ повторной отправки сохранён для защиты от дублей.</small>
      </Card>
    </>
  );
}
