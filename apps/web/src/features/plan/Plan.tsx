import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { stageIndex } from '../../domain/navigationEngine';
import { Link } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { Card, Skeleton } from '../../components/ui';
import { Page } from '../../components/Page';
import { formatMoney } from '../../domain/money';
import { formatDate } from '../../i18n';
import { stateLabel } from './stateLabel';
export function Plan() {
  const { data, settings } = useApp();
  if (!data)
    return (
      <Page title="План">
        <Skeleton />
      </Page>
    );
  const p = data.plan;
  return (
    <Page title="Путь" sub="От кассового разрыва — к свободе выбора">
      <Card className="route-card">
        <div className="route-track">
          {['Кризис', 'Стабилизация', 'Выход', 'Резерв', 'Рост'].map((x, i) => (
            <div className={i <= stageIndex(p.state) ? 'passed' : ''} key={x}>
              <i>{i < stageIndex(p.state) ? '✓' : i + 1}</i>
              <span>{x}</span>
            </div>
          ))}
        </div>
        <p>Текущий этап</p>
        <h2>{stateLabel(p.state)}</h2>
        <strong>Переход ожидается через 8–12 недель</strong>
        <small>Диапазон изменится при новых операциях</small>
      </Card>
      <Card className="plan-state">
        <span className={`state ${p.state}`}>{stateLabel(p.state)}</span>
        <h2>{p.action.title}</h2>
        <strong>{formatMoney(p.action.amount, p.currency)}</strong>
        <p>Свободный поток: {formatMoney(p.snapshot.monthly_free_cash_flow, p.currency)}</p>
        <p>Защищённый резерв: {formatMoney(p.snapshot.minimum_buffer_target, p.currency)}</p>
      </Card>
      <Card>
        <div className="card-heading">
          <h3>Как меняется положение</h3>
          <span className="muted">6 месяцев</span>
        </div>
        <div className="forecast-chart" aria-label="Прогноз: долг снижается, резерв растёт">
          <div className="chart-debt">
            {[100, 88, 73, 58, 42, 29].map((v, i) => (
              <i key={i} style={{ height: `${v}%` }}>
                <span>{i === 0 ? 'Долг' : ''}</span>
              </i>
            ))}
          </div>
          <div className="chart-buffer">
            {[8, 18, 30, 43, 57, 72].map((v, i) => (
              <i key={i} style={{ height: `${v}%` }}>
                <span>{i === 5 ? 'Резерв' : ''}</span>
              </i>
            ))}
          </div>
        </div>
        <p className="muted">
          Долг уменьшается после защиты обязательных расходов; резерв растёт без кассового разрыва.
        </p>
      </Card>
      <Card>
        <h3>Ближайшие вехи</h3>
        <ol className="milestones">
          <li>
            <b>5 августа</b>
            <span>Пройти месяц без нового долга</span>
          </li>
          <li>
            <b>Сентябрь</b>
            <span>Защитить резерв 10 000 ₽</span>
          </li>
          <li>
            <b>Октябрь–ноябрь</b>
            <span>Ускорить дорогую кредитную карту</span>
          </li>
        </ol>
      </Card>
      <Link className="button full" to="/scenarios">
        Проверить ускорение <ArrowUpRight />
      </Link>
      <Link className="row-link" to="/debts">
        <span>
          <b>Долги и стратегия</b>
          <small>{data.debts.length} обязательства</small>
        </span>
        <ChevronRight />
      </Link>
      <Card>
        <div className="card-heading">
          <h3>Почему этот шаг</h3>
          <span className="source">
            {data.explanation.source === 'ai' ? 'AI' : 'Fallback · детерминировано'}
          </span>
        </div>
        <h4>{data.explanation.headline}</h4>
        <p>{data.explanation.explanation}</p>
        <ul>
          {data.explanation.reasons.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <small>Сформировано {formatDate(data.explanation.generated_at, settings.language)}</small>
      </Card>
      <p className="disclaimer">
        Информация носит справочный характер и не является индивидуальной финансовой рекомендацией.
      </p>
    </Page>
  );
}
