import { ChevronRight } from 'lucide-react';
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
    <Page title="План" sub="Один понятный приоритет">
      <Card className="plan-state">
        <span className={`state ${p.state}`}>{stateLabel(p.state)}</span>
        <h2>{p.action.title}</h2>
        <strong>{formatMoney(p.action.amount, p.currency)}</strong>
        <p>Свободный поток: {formatMoney(p.snapshot.monthly_free_cash_flow, p.currency)}</p>
        <p>Защищённый резерв: {formatMoney(p.snapshot.minimum_buffer_target, p.currency)}</p>
      </Card>
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
