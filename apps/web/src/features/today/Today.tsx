import { ArrowLeft, ArrowRight, MessageCircle, WifiOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { Skeleton } from '../../components/ui';
import { formatMoney } from '../../domain/money';

export function Today() {
  const { data, loading, error, settings, refresh } = useApp();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) trigger.current?.focus();
  }, [open]);
  if (loading)
    return (
      <div className="overview">
        <Skeleton />
      </div>
    );
  if (error)
    return (
      <div className="overview">
        <div className="empty-state">
          <h2>Не удалось открыть обзор</h2>
          <p>{error}</p>
          <button className="button" onClick={refresh}>
            Повторить
          </button>
        </div>
      </div>
    );
  if (!data) return null;
  const { plan } = data,
    s = plan.snapshot;
  const comfort = Math.min(settings.comfortBudget, Math.max(0, s.available_now));
  const obligations = s.mandatory_before_next_income + s.minimum_debt_payments_before_next_income;
  const reserve = Math.max(0, s.available_now - comfort - obligations);
  return (
    <div className="overview">
      {settings.demoOffline && (
        <div className="status-banner">
          <WifiOff />
          Сохранённый план · офлайн
        </div>
      )}
      <section className="wallet-stage" aria-label="Кошелёк">
        <button
          ref={trigger}
          className="wallet-stack"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-label="Открыть кошелёк и историю"
        >
          <span className="wallet-layer comfort">
            <small>Комфорт</small>
            <b>{formatMoney(comfort, plan.currency)}</b>
          </span>
          <span className="wallet-layer obligations">
            <small>Платежи</small>
            <b>{formatMoney(obligations, plan.currency)}</b>
          </span>
          <span className="wallet-layer reserve">
            <span className="clasp" aria-hidden="true">
              <i />
            </span>
            <small>Запас</small>
            <b className="wallet-amount">{formatMoney(reserve, plan.currency)}</b>
            <span className="safe-strip">
              Безопасно сегодня · <strong>{formatMoney(s.safe_daily_amount, plan.currency)}</strong>
            </span>
            <span className="wallet-lip">
              <em>
                Всего <b>{formatMoney(s.available_now, plan.currency)}</b>
              </em>
              <em>
                Платежи <b>{formatMoney(obligations, plan.currency)}</b>
              </em>
            </span>
          </span>
        </button>
      </section>
      <section className="assistant-capsule liquid-panel">
        <span className="lens-dot">
          <MessageCircle />
        </span>
        <div>
          <small>Помощник</small>
          <h2>{s.available_now === 0 ? 'Начнём с нуля — без спешки' : 'С чего начнём?'}</h2>
          <div>
            <Link to="/assistant">Доход</Link>
            <Link to="/plan">План</Link>
            <Link to="/assistant">
              Спросить <ArrowRight />
            </Link>
          </div>
        </div>
      </section>
      <p className="overview-note">
        {settings.guidanceMode === 'base'
          ? 'Base бережёт обязательства, резерв и выбранный комфорт.'
          : 'Hard ускоряет действия, но не рискует обязательными деньгами.'}
      </p>
      {open && <WalletExpanded onClose={() => setOpen(false)} />}
    </div>
  );
}

function WalletExpanded({ onClose }: { onClose: () => void }) {
  const { data, settings } = useApp();
  const [tab, setTab] = useState<'summary' | 'history' | 'chart'>('summary');
  if (!data) return null;
  const currency = data.currency;
  const points = data.transactions.slice(0, 8).reverse();
  let level = 0;
  const values = points.map((x) => {
    level += x.kind === 'income' ? x.amount : -x.amount;
    return level;
  });
  const min = Math.min(0, ...values),
    max = Math.max(1, ...values);
  const coords = values
    .map(
      (v, i) =>
        `${i * (100 / Math.max(1, values.length - 1))},${88 - ((v - min) / (max - min || 1)) * 70}`,
    )
    .join(' ');
  return (
    <div className="money-view" role="dialog" aria-modal="true" aria-label="Деньги">
      <header>
        <button onClick={onClose} aria-label="Закрыть кошелёк">
          <ArrowLeft />
        </button>
        <div>
          <small>Деньги</small>
          <h1>{formatMoney(data.plan.snapshot.available_now, currency)}</h1>
        </div>
        <span className="demo-mark">{data.scenario === 'empty' ? 'Новый' : 'Демо'}</span>
      </header>
      <div className="expanded-fan" aria-hidden="true">
        <i />
        <i />
        <i className="fan-clasp" />
      </div>
      <div className="money-tabs" role="tablist">
        {(
          [
            ['summary', 'Сводка'],
            ['history', 'История'],
            ['chart', 'График'],
          ] as const
        ).map(([id, label]) => (
          <button role="tab" aria-selected={tab === id} onClick={() => setTab(id)} key={id}>
            {label}
          </button>
        ))}
      </div>
      <div className="money-scroll">
        {(tab === 'summary' || tab === 'chart') && (
          <section className="movement">
            <div>
              <h2>Движение денег</h2>
              <span>Последние операции</span>
            </div>
            {values.length ? (
              <svg
                viewBox="0 0 100 100"
                role="img"
                aria-label={`График движения денег от ${formatMoney(min, currency)} до ${formatMoney(max, currency)}`}
                preserveAspectRatio="none"
              >
                <line x1="0" y1="88" x2="100" y2="88" />
                <polyline points={coords} />
                {values.map((v, i) => (
                  <circle
                    key={i}
                    tabIndex={0}
                    aria-label={formatMoney(v, currency)}
                    cx={i * (100 / Math.max(1, values.length - 1))}
                    cy={88 - ((v - min) / (max - min || 1)) * 70}
                    r="2"
                  />
                ))}
              </svg>
            ) : (
              <div className="chart-empty">Пока нет операций для графика</div>
            )}
          </section>
        )}
        {(tab === 'summary' || tab === 'history') && (
          <section className="transactions-preview">
            <h2>Последние операции</h2>
            {data.transactions.length ? (
              data.transactions.map((tx) => (
                <article key={tx.id}>
                  <span className={tx.kind === 'income' ? 'income' : 'expense'}>
                    {tx.category.slice(0, 1)}
                  </span>
                  <div>
                    <b>{tx.description || tx.category}</b>
                    <small>
                      {new Intl.DateTimeFormat(settings.language === 'ru' ? 'ru-RU' : 'en-US', {
                        day: 'numeric',
                        month: 'short',
                      }).format(new Date(tx.occurred_at))}
                    </small>
                  </div>
                  <strong className={tx.kind === 'income' ? 'income-text' : 'expense-text'}>
                    {tx.kind === 'income' ? '+' : '−'} {formatMoney(tx.amount, currency)}
                  </strong>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <h3>Операций пока нет</h3>
                <p>Добавьте первую, когда будете готовы.</p>
              </div>
            )}
            <Link className="row-link" to="/transactions">
              Все операции <ArrowRight />
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}
