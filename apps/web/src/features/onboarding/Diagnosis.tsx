import { ArrowRight, CircleAlert, ShieldCheck, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { formatMoney } from '../../domain/money';

export function Diagnosis() {
  const { data, patch } = useApp();
  const navigate = useNavigate();
  if (!data) return null;
  const snapshot = data.plan.snapshot;
  const gap = Math.max(0, -snapshot.projected_balance_before_next_income);
  const empty =
    data.debts.length === 0 &&
    data.baseline.incomes.length === 0 &&
    data.baseline.expenses.length === 0;
  const headline = empty
    ? 'Начните с трёх опор: деньги, доход и обязательства'
    : gap
      ? 'До следующего дохода возможен кассовый разрыв'
      : 'Обязательства покрыты — можно двигаться к резерву';
  const factors = empty
    ? ['Укажите доступный остаток', 'Добавьте ближайший доход', 'Запишите обязательные расходы']
    : [
        `Доступно ${formatMoney(snapshot.available_now, data.currency)}`,
        `Обязательства ${formatMoney(snapshot.mandatory_before_next_income + snapshot.minimum_debt_payments_before_next_income, data.currency)}`,
        gap
          ? `Не хватает ${formatMoney(gap, data.currency)}`
          : `Безопасно ${formatMoney(snapshot.safe_to_spend, data.currency)}`,
        data.debts.length ? `${data.debts.length} долговых обязательства` : 'Долгов не указано',
      ];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-6 px-4 py-8">
      <div className="mx-auto flex h-12 w-12 items-center justify-center gap-1 rounded-xl border border-border bg-card shadow-sm" aria-hidden="true">
        <i className="block h-2 w-2 rounded-full bg-primary" />
        <i className="block h-2 w-2 rounded-full bg-primary/60" />
        <i className="block h-2 w-2 rounded-full bg-primary/30" />
      </div>
      <div className="space-y-3 text-center">
        <p className="text-sm font-medium text-primary">Твой финансовый диагноз</p>
        <h1 className="text-2xl font-semibold tracking-tight">{headline}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Это не оценка вас. Диагноз построен из введённых сумм и меняется вместе с данными.
        </p>
      </div>

      <Card>
        <CardContent className="flex items-start gap-3 p-4">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="space-y-1">
            <small className="text-sm text-muted-foreground">Главный риск до следующего дохода</small>
            <strong className="block text-sm font-semibold">
              {gap
                ? `Кассовый разрыв ${formatMoney(gap, data.currency)}`
                : empty
                  ? 'Пока недостаточно данных'
                  : 'Подтверждённые платежи покрыты'}
            </strong>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {factors.map((x, i) => (
          <div
            key={x}
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-sm"
          >
            {i % 2 ? (
              <TrendingUp className="h-4 w-4 shrink-0 text-primary" />
            ) : (
              <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
            )}
            <span>{x}</span>
          </div>
        ))}
      </div>

      <Button
        size="lg"
        className="w-full"
        onClick={async () => {
          await patch({ entered: true });
          navigate('/today');
        }}
      >
        Показать маршрут <ArrowRight className="h-4 w-4" />
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Прогноз — диапазон, а не обещание. Он обновится после операций.
      </p>
    </main>
  );
}
