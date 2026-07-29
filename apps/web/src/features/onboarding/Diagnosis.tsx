import { ArrowRight, CircleAlert, ShieldCheck, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { Button, Card } from '../../components/ui';
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
    <main className="diagnosis-page">
      <div className="brand-symbol" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <p className="eyebrow">Твой финансовый диагноз</p>
      <h1>{headline}</h1>
      <p className="diagnosis-lead">
        Это не оценка вас. Диагноз построен из введённых сумм и меняется вместе с данными.
      </p>
      <Card className="diagnosis-risk">
        <CircleAlert />
        <div>
          <small>Главный риск до следующего дохода</small>
          <strong>
            {gap
              ? `Кассовый разрыв ${formatMoney(gap, data.currency)}`
              : empty
                ? 'Пока недостаточно данных'
                : 'Подтверждённые платежи покрыты'}
          </strong>
        </div>
      </Card>
      <div className="diagnosis-factors">
        {factors.map((x, i) => (
          <div key={x}>
            {i % 2 ? <TrendingUp /> : <ShieldCheck />}
            <span>{x}</span>
          </div>
        ))}
      </div>
      <Button
        onClick={async () => {
          await patch({ entered: true });
          navigate('/today');
        }}
      >
        Показать маршрут <ArrowRight />
      </Button>
      <small>Прогноз — диапазон, а не обещание. Он обновится после операций.</small>
    </main>
  );
}
