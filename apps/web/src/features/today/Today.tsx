import { ArrowRight, CalendarClock, RefreshCw, ShieldCheck, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { Banner, Card, Skeleton } from '../../components/ui';
import { Page } from '../../components/Page';
import { formatMoney } from '../../domain/money';
import { formatDate } from '../../i18n';
import { stateLabel } from '../plan/stateLabel';
import { stageIndex } from '../../domain/navigationEngine';
export function Today() {
  const { data, loading, error, settings, refresh } = useApp();
  if (loading)
    return (
      <Page title="Сегодня">
        <Skeleton />
      </Page>
    );
  if (error)
    return (
      <Page title="Сегодня">
        <Banner kind="danger">
          {error} <button onClick={refresh}>Повторить</button>
        </Banner>
      </Page>
    );
  if (!data) return null;
  const p = data.plan,
    s = p.snapshot;
  const stage=stageIndex(p.state)+1, months=data.projection.stabilizationMonths;
  const payment=data.projection.nextPayment;
  const day=new Date().getDay()||7;
  return (
    <Page title="Сегодня" sub="Ваш следующий безопасный шаг">
      {settings.demoOffline && (
        <Banner kind="offline">
          <WifiOff /> Офлайн: показаны сохранённые данные
        </Banner>
      )}
      <div className="journey-summary">
        <span className={`state ${p.state}`}>{stateLabel(p.state)} · этап {stage} из 5</span>
        <strong>{months===null?'Срок устойчивости требует новых данных':months===0?'Обязательства защищены':`До устойчивости около ${Math.max(1,months*4-2)}–${months*4+2} недель`}</strong>
        <Link to="/plan">
          Весь путь <ArrowRight />
        </Link>
      </div>
      <Card className="hero command-card">
        <div className="card-heading">
          <span className="eyebrow">Главное сегодня</span>
          <ShieldCheck />
        </div>
        <h2>{p.action.title}</h2>
        <strong>{formatMoney(p.action.amount, p.currency)}</strong>
        <p>Так аренда, транспорт и минимальные платежи останутся покрыты без нового долга.</p>
        <Link className="button" to="/scenarios">
          Изменить план
        </Link>
      </Card>
      <div className="metrics">
        <Card>
          <span>Безопасно потратить</span>
          <strong>{formatMoney(s.safe_to_spend, p.currency)}</strong>
          <small>до следующего дохода</small>
        </Card>
        <Card>
          <span>Ориентир в день</span>
          <strong>{formatMoney(s.safe_daily_amount, p.currency)}</strong>
          <small>без ущерба обязательствам</small>
        </Card>
      </div>
      <Card className="risk-line">
        <CalendarClock />
        <div>
          <small>Ближайший обязательный платёж</small>
          <strong>{payment?`${payment.name} · ${new Intl.DateTimeFormat(settings.language==='ru'?'ru-RU':'en-US',{day:'numeric',month:'long'}).format(new Date(payment.date))}`:'Нет подтверждённых платежей'}</strong>
          <span>{payment?`${formatMoney(payment.amount,p.currency)} ${s.projected_balance_before_next_income>=0?'защищены планом':'под риском'} в текущем прогнозе`:'Добавьте обязательства в онбординге'}</span>
        </div>
      </Card>
      <Card>
        <div className="card-heading">
          <h3>Эта неделя</h3>
          <strong>{day} из 7 дней</strong>
        </div>
        <div className="week-progress">
          <i style={{ width: `${Math.round(day/7*100)}%` }} />
        </div>
        <p className="muted">Расходы в ориентире. Следующая сверка — в воскресенье.</p>
      </Card>
      <Card>
        <h3>Прогноз</h3>
        <dl>
          <div>
            <dt>Доступно сейчас</dt>
            <dd>{formatMoney(s.available_now, p.currency)}</dd>
          </div>
          <div>
            <dt>Обязательные платежи</dt>
            <dd>− {formatMoney(s.mandatory_before_next_income, p.currency)}</dd>
          </div>
          <div>
            <dt>Минимумы по долгам</dt>
            <dd>− {formatMoney(s.minimum_debt_payments_before_next_income, p.currency)}</dd>
          </div>
          <div className="total">
            <dt>Остаток до дохода</dt>
            <dd>{formatMoney(s.projected_balance_before_next_income, p.currency)}</dd>
          </div>
        </dl>
      </Card>
      <p className="sync-line">
        Обновлено {formatDate(data.updatedAt, settings.language)}{' '}
        <button aria-label="Синхронизировать" onClick={refresh}>
          <RefreshCw />
        </button>
      </p>
    </Page>
  );
}
