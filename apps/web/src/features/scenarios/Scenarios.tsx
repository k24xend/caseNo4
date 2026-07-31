import { useMemo, useState } from 'react';
import { Page } from '../../components/Page';
import { Banner, Field } from '../../components/ui';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { useApp } from '../../app/AppContext';
import { formatMoney, parseMoney } from '../../domain/money';
import {
  assessWorkload,
  calculatePlan,
  comparePlans,
  FORECAST_VARIANCE_MONTHS,
} from '../../domain/financialEngine';
import type { ScenarioAdjustment } from '../../domain/models';
import { cn } from '../../lib/utils';

const presets = [
  { name: 'Бережный', income: 500000, payment: 0, hours: 4 },
  { name: 'Сбалансированный', income: 1200000, payment: 500000, hours: 8 },
  { name: 'Ускоренный', income: 2200000, payment: 1000000, hours: 16 },
];

export function Scenarios() {
  const { data, settings, applyScenario } = useApp();
  const active = data?.activeScenario ?? settings.acceptedScenario;
  const [income, setIncome] = useState(active?.extraIncome ?? 1200000);
  const [expense, setExpense] = useState(active?.expenseChange ?? 0);
  const [payment, setPayment] = useState(active?.extraDebtPayment ?? 500000);
  const [reserve, setReserve] = useState(active?.reserve ?? 1000000);
  const [hours, setHours] = useState(active?.extraHours ?? 8);
  const [error, setError] = useState('');
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
  const workload = assessWorkload(hours);

  return (
    <Page title="Сценарии" sub="Проверьте решение, не изменяя долги и операции">
      {active && (
        <Banner>
          <span className="flex-1">
            <b>Активен пользовательский план.</b> Today и прогноз уже пересчитаны.
          </span>
          <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => applyScenario(undefined)}>
            Вернуться к базовому
          </Button>
        </Banner>
      )}

      <Card>
        <CardHeader>
          <p className="text-sm font-medium text-primary">Кандидат</p>
          <CardTitle>Что изменится каждый месяц?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Money label="Доп. доход / месяц" value={income} set={setIncome} />
            <Money label="Изменение расходов" value={expense} set={setExpense} />
            <Money label="Доплата по долгу" value={payment} set={setPayment} />
            <Money label="Защищённый резерв" value={reserve} set={setReserve} />
          </div>
          <label className="block space-y-2">
            <span className="flex items-center justify-between text-sm">
              <span>Дополнительная нагрузка</span>
              <b className="font-semibold tabular-nums">{hours} ч/нед.</b>
            </span>
            <input
              aria-label="Дополнительные часы"
              type="range"
              min={0}
              max={30}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
            />
          </label>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {presets.map((p) => (
          <button
            type="button"
            key={p.name}
            onClick={() => {
              setIncome(p.income);
              setPayment(p.payment);
              setHours(p.hours);
            }}
            className={cn(
              'rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-colors',
              'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <b className="block text-sm font-semibold">{p.name}</b>
            <span className="mt-1 block text-sm text-muted-foreground">
              {p.hours} ч/нед. · {formatMoney(p.income, data.currency)}
            </span>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm font-medium text-primary">Base → candidate</p>
          <CardTitle>
            {months === null
              ? 'Больше 30 лет'
              : `${Math.max(0, months - FORECAST_VARIANCE_MONTHS)}–${months + FORECAST_VARIANCE_MONTHS} мес.`}
          </CardTitle>
          <CardDescription>
            Оценка выхода из дорогих долгов, а не обещание. Допущения: доход стабилен, ставки не
            меняются.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">Безопасная сумма</dt>
              <dd className="text-sm font-semibold tabular-nums">
                {formatMoney(result.plan.snapshot.safe_to_spend, data.currency)}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">Изменение</dt>
              <dd className="text-sm font-semibold tabular-nums">
                {formatMoney(delta.safeDelta, data.currency)}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">Свободный поток</dt>
              <dd className="text-sm font-semibold tabular-nums">
                {formatMoney(result.plan.snapshot.monthly_free_cash_flow, data.currency)}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">Нагрузка</dt>
              <dd className="text-sm font-semibold">
                {workload === 'high' ? 'Высокая' : workload === 'medium' ? 'Средняя' : 'Низкая'}
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
            className="w-full"
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
        </CardContent>
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
