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
  return (
    <main className="diagnosis-page">
      <div className="brand-symbol" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <p className="eyebrow">Твой финансовый диагноз</p>
      <h1>Обычный месяц почти сходится. Уязвимость — дни до дохода.</h1>
      <p className="diagnosis-lead">
        Это не оценка тебя. Мы нашли место, где плану нужна защита: резерв пока не перекрывает
        обязательные платежи и нерегулярные траты.
      </p>
      <Card className="diagnosis-risk">
        <CircleAlert />
        <div>
          <small>Главный риск до следующего дохода</small>
          <strong>
            {gap
              ? `Кассовый разрыв ${formatMoney(gap, data.currency)}`
              : 'Запас слишком близок к нулю'}
          </strong>
        </div>
      </Card>
      <div className="diagnosis-factors">
        <div>
          <ShieldCheck />
          <span>
            <b>Сначала</b> жильё, еда и транспорт
          </span>
        </div>
        <div>
          <TrendingUp />
          <span>
            <b>Затем</b> резерв 10 000 ₽ и дорогой долг
          </span>
        </div>
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
