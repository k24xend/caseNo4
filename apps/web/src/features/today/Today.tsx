import { RefreshCw, WifiOff } from 'lucide-react';
import { useApp } from '../../app/AppContext';
import { Banner, Card, Skeleton } from '../../components/ui';
import { Page } from '../../components/Page';
import { formatMoney } from '../../domain/money';
import { formatDate } from '../../i18n';
import { stateLabel } from '../plan/stateLabel';
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
  return (
    <Page title="Сегодня" sub="Ваш ориентир на ближайшие дни">
      {settings.demoOffline && (
        <Banner kind="offline">
          <WifiOff /> Офлайн: показаны сохранённые данные
        </Banner>
      )}
      <Card className="hero">
        <span className={`state ${p.state}`}>{stateLabel(p.state)}</span>
        <p>Главный шаг</p>
        <h2>{p.action.title}</h2>
        <strong>{formatMoney(p.action.amount, p.currency)}</strong>
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
