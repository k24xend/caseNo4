import { useState } from 'react';
import { Page } from '../../components/Page';
import { Banner, Button, Card, Field } from '../../components/ui';
import { useApp } from '../../app/AppContext';
import { formatMoney, parseMoney } from '../../domain/money';
import { projectScenario, type ScenarioInputs } from '../../domain/navigationEngine';

const presets = [
  { name: 'Мягкий', income: 500000, payment: 0, hours: 4, note: 'Ниже нагрузка, больше времени' },
  {
    name: 'Сбалансированный',
    income: 1200000,
    payment: 500000,
    hours: 8,
    note: 'Рекомендуемый баланс',
  },
  {
    name: 'Ускоренный',
    income: 2200000,
    payment: 1000000,
    hours: 16,
    note: 'Быстрее, выше риск усталости',
  },
] as const;
export function Scenarios() {
  const { data, settings, patch } = useApp();
  const [extraIncome, setExtraIncome] = useState(1200000),
    [expense, setExpense] = useState(0);
  const [payment, setPayment] = useState(500000),
    [hours, setHours] = useState(8);
  const [reserve, setReserve] = useState(1000000),
    [applied, setApplied] = useState(false);
  if (!data)
    return (
      <Page title="Сценарии">
        <div />
      </Page>
    );
  const base: ScenarioInputs = {
    extraIncome,
    fixedExpenseChange: expense,
    variableExpenseChange: 0,
    extraDebtPayment: payment,
    reserve,
    extraHours: hours,
    toolCost: 0,
    toolIncome: 0,
    confidence: 75,
  };
  const custom = projectScenario(data.plan, data.debts, base);
  return (
    <Page title="Сценарии" sub="Проверь решение до того, как менять план">
      <Card className="scenario-editor">
        <h2>Настрой свой вариант</h2>
        <div className="field-row">
          <MoneyField label="Доп. доход / месяц" value={extraIncome} set={setExtraIncome} />
          <MoneyField label="Рост расходов" value={expense} set={setExpense} />
          <MoneyField label="Доплата по долгу" value={payment} set={setPayment} />
          <MoneyField label="Защитить в резерве" value={reserve} set={setReserve} />
        </div>
        <label className="range">
          <span>
            Дополнительная нагрузка <b>{hours} ч/нед.</b>
          </span>
          <input
            aria-label="Дополнительные часы"
            type="range"
            min="0"
            max="24"
            step="2"
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
          />
        </label>
      </Card>
      <div className="scenario-grid">
        {presets.map((p, i) => {
          const result = projectScenario(data.plan, data.debts, {
            ...base,
            extraIncome: p.income,
            extraDebtPayment: p.payment,
            extraHours: p.hours,
          });
          return (
            <Card className={i === 1 ? 'recommended' : ''} key={p.name}>
              <div className="card-heading">
                <h3>{p.name}</h3>
                {i === 1 && <span className="state exit">Рекомендуем</span>}
              </div>
              <p className="muted">{p.note}</p>
              <strong className="scenario-time">
                {result.debtFreeMonths}–{result.debtFreeMonths + 2} мес.
              </strong>
              <small>до закрытия дорогих долгов</small>
              <dl>
                <div>
                  <dt>Свободный поток</dt>
                  <dd>{formatMoney(result.freeCashFlow, data.currency)}</dd>
                </div>
                <div>
                  <dt>Проценты</dt>
                  <dd>{formatMoney(result.interestCost, data.currency)}</dd>
                </div>
                <div>
                  <dt>Нагрузка</dt>
                  <dd>
                    {result.load === 'high'
                      ? 'Высокая'
                      : result.load === 'medium'
                        ? 'Средняя'
                        : 'Низкая'}
                  </dd>
                </div>
              </dl>
            </Card>
          );
        })}
      </div>
      <Card className="scenario-result">
        <p className="eyebrow">Твой вариант · пересчитано</p>
        <h2>
          {custom.debtFreeMonths}–{custom.debtFreeMonths + 2} месяцев
        </h2>
        <p>
          Стабилизация через {custom.stabilizationMonths} мес. · свободный поток{' '}
          {formatMoney(custom.freeCashFlow, data.currency)} · резерв через месяц{' '}
          {formatMoney(custom.reserveAfterMonth, data.currency)}
        </p>
        {custom.cashGap && (
          <Banner kind="danger">
            План создаёт кассовый разрыв — не применяем ускоренную выплату.
          </Banner>
        )}
        <Button
          disabled={custom.cashGap}
          onClick={async () => {
            await patch({
              acceptedScenario: {
                extraIncome,
                expenseChange: expense,
                extraDebtPayment: payment,
                reserve,
                extraHours: hours,
                acceptedAt: new Date().toISOString(),
              },
            });
            setApplied(true);
          }}
        >
          Принять как основной план
        </Button>
        {(applied || settings.acceptedScenario) && (
          <Banner>План сохранён на устройстве. Операции и долги не изменены.</Banner>
        )}
      </Card>
    </Page>
  );
}
function MoneyField({
  label,
  value,
  set,
}: {
  label: string;
  value: number;
  set: (n: number) => void;
}) {
  return (
    <Field
      label={label}
      inputMode="decimal"
      value={String(value / 100)}
      onChange={(e) => {
        const n = parseMoney(e.target.value);
        if (n !== null) set(n);
      }}
    />
  );
}
