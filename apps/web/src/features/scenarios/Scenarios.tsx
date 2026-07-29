import { useMemo, useState } from 'react';
import { Page } from '../../components/Page';
import { Banner, Button, Card, Field } from '../../components/ui';
import { useApp } from '../../app/AppContext';
import { formatMoney, parseMoney } from '../../domain/money';
import {
  assessWorkload,
  calculatePlan,
  comparePlans,
  FORECAST_VARIANCE_MONTHS,
} from '../../domain/financialEngine';
import type { ScenarioAdjustment } from '../../domain/models';

const presets = [
  { name: 'Бережный', income: 500000, payment: 0, hours: 4 },
  { name: 'Сбалансированный', income: 1200000, payment: 500000, hours: 8 },
  { name: 'Ускоренный', income: 2200000, payment: 1000000, hours: 16 },
];
export function Scenarios() {
  const { data, settings, applyScenario } = useApp();
  const active = data?.activeScenario ?? settings.acceptedScenario;
  const [income, setIncome] = useState(active?.extraIncome ?? 1200000),
    [expense, setExpense] = useState(active?.expenseChange ?? 0),
    [payment, setPayment] = useState(active?.extraDebtPayment ?? 500000),
    [reserve, setReserve] = useState(active?.reserve ?? 1000000),
    [hours, setHours] = useState(active?.extraHours ?? 8),
    [error, setError] = useState('');
  const candidate: ScenarioAdjustment = {
    extraIncome: income,
    expenseChange: expense,
    extraDebtPayment: payment,
    reserve,
    extraHours: hours,
    acceptedAt: new Date().toISOString(),
  };
  const result = useMemo(
    () =>
      data
        ? calculatePlan(data.baseline, data.debts, candidate, data.updatedAt, data.currency)
        : undefined,
    [data, income, expense, payment, reserve, hours],
  );
  if (!data || !result)
    return (
      <Page title="Сценарии">
        <div />
      </Page>
    );
  const delta = comparePlans(
    calculatePlan(data.baseline, data.debts, undefined, data.updatedAt, data.currency).plan,
    result.plan,
  );
  const months = result.projection.debtFreeMonths;
  const invalid =
    [income, expense, payment, reserve].some(
      (x) => !Number.isSafeInteger(x) || Math.abs(x) > 100_000_000_00,
    ) ||
    income < 0 ||
    payment < 0 ||
    reserve < 0;
  const cashGap = result.plan.snapshot.projected_balance_before_next_income < 0;
  return (
    <Page title="Сценарии" sub="Проверьте решение, не изменяя долги и операции">
      {active && (
        <Banner>
          <b>Активен пользовательский план.</b> Today и прогноз уже пересчитаны.{' '}
          <button onClick={() => applyScenario(undefined)}>Вернуться к базовому</button>
        </Banner>
      )}
      <Card className="scenario-editor">
        <p className="eyebrow">Кандидат</p>
        <h2>Что изменится каждый месяц?</h2>
        <div className="field-row">
          <Money label="Доп. доход / месяц" value={income} set={setIncome} />
          <Money label="Изменение расходов" value={expense} set={setExpense} />
          <Money label="Доплата по долгу" value={payment} set={setPayment} />
          <Money label="Защищённый резерв" value={reserve} set={setReserve} />
        </div>
        <label className="range">
          <span>
            Дополнительная нагрузка <b>{hours} ч/нед.</b>
          </span>
          <input
            aria-label="Дополнительные часы"
            type="range"
            min="0"
            max="30"
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
          />
        </label>
      </Card>
      <div className="scenario-grid">
        {presets.map((p) => (
          <button
            className="preset-card"
            key={p.name}
            onClick={() => {
              setIncome(p.income);
              setPayment(p.payment);
              setHours(p.hours);
            }}
          >
            <b>{p.name}</b>
            <span>
              {p.hours} ч/нед. · {formatMoney(p.income, data.currency)}
            </span>
          </button>
        ))}
      </div>
      <Card className="scenario-result">
        <p className="eyebrow">Base → candidate</p>
        <h2>
          {months === null
            ? 'Больше 30 лет'
            : `${Math.max(0, months - FORECAST_VARIANCE_MONTHS)}–${months + FORECAST_VARIANCE_MONTHS} мес.`}
        </h2>
        <p className="muted">
          Оценка выхода из дорогих долгов, а не обещание. Допущения: доход стабилен, ставки не
          меняются.
        </p>
        <dl>
          <div>
            <dt>Безопасная сумма</dt>
            <dd>{formatMoney(result.plan.snapshot.safe_to_spend, data.currency)}</dd>
          </div>
          <div>
            <dt>Изменение</dt>
            <dd>{formatMoney(delta.safeDelta, data.currency)}</dd>
          </div>
          <div>
            <dt>Свободный поток</dt>
            <dd>{formatMoney(result.plan.snapshot.monthly_free_cash_flow, data.currency)}</dd>
          </div>
          <div>
            <dt>Нагрузка</dt>
            <dd>
              {assessWorkload(hours) === 'high'
                ? 'Высокая'
                : assessWorkload(hours) === 'medium'
                  ? 'Средняя'
                  : 'Низкая'}
            </dd>
          </div>
        </dl>
        {cashGap && (
          <Banner kind="danger">
            Кандидат создаёт кассовый разрыв. Уменьшите доплату или расходы.
          </Banner>
        )}
        {(invalid || error) && (
          <Banner kind="danger">
            {error || 'Проверьте суммы: только неотрицательные значения до 100 млн.'}
          </Banner>
        )}
        <Button
          disabled={cashGap || invalid}
          onClick={async () => {
            try {
              setError('');
              await applyScenario(candidate);
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Не удалось сохранить');
            }
          }}
        >
          Принять как основной план
        </Button>
      </Card>
    </Page>
  );
}
function Money({ label, value, set }: { label: string; value: number; set: (n: number) => void }) {
  return (
    <Field
      label={label}
      inputMode="decimal"
      value={String(value / 100)}
      onChange={(e) => {
        const n = parseMoney(e.target.value);
        set(n ?? -1);
      }}
    />
  );
}
