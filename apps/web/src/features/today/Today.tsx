import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Coffee,
  MessageCircle,
  ReceiptText,
  Shield,
  Sparkles,
  WalletCards,
  WifiOff,
  X,
} from 'lucide-react';
import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { Skeleton } from '../../components/ui';
import { formatMoney } from '../../domain/money';

type MoneyTab = 'summary' | 'history' | 'chart';
type WalletPhase = 'closed' | 'opening' | 'open' | 'closing';

const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Today() {
  const { data, loading, error, settings, refresh } = useApp();
  const [phase, setPhase] = useState<WalletPhase>('closed');
  const open = phase === 'opening' || phase === 'open' || phase === 'closing';
  const trigger = useRef<HTMLButtonElement>(null);
  const openTimer = useRef<number | undefined>(undefined);
  const closeTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (phase === 'closed') trigger.current?.focus();
  }, [phase]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    history.pushState({ vyhodWallet: true }, '');
    const pop = () => {
      window.clearTimeout(openTimer.current);
      setPhase(prefersReducedMotion() ? 'closed' : 'closing');
      window.clearTimeout(closeTimer.current);
      closeTimer.current = window.setTimeout(
        () => setPhase('closed'),
        prefersReducedMotion() ? 0 : 420,
      );
    };
    addEventListener('popstate', pop, { once: true });
    return () => {
      document.body.style.overflow = previousOverflow;
      removeEventListener('popstate', pop);
    };
  }, [open]);

  useEffect(
    () => () => {
      window.clearTimeout(openTimer.current);
      window.clearTimeout(closeTimer.current);
    },
    [],
  );

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

  const { plan } = data;
  const snapshot = plan.snapshot;
  const comfort = Math.min(settings.comfortBudget, Math.max(0, snapshot.available_now));
  const obligations =
    snapshot.mandatory_before_next_income + snapshot.minimum_debt_payments_before_next_income;
  const reserve = Math.max(0, snapshot.available_now - comfort - obligations);

  const openWallet = () => {
    if (phase !== 'closed') return;
    navigator.vibrate?.(6);
    if (prefersReducedMotion()) {
      setPhase('open');
      return;
    }
    setPhase('opening');
    window.clearTimeout(openTimer.current);
    openTimer.current = window.setTimeout(() => setPhase('open'), 520);
  };

  const closeWallet = () => {
    if (history.state?.vyhodWallet) history.back();
    else {
      if (prefersReducedMotion()) {
        setPhase('closed');
        return;
      }
      setPhase('closing');
      window.clearTimeout(closeTimer.current);
      closeTimer.current = window.setTimeout(() => setPhase('closed'), 420);
    }
  };

  const onWalletPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const stack = event.currentTarget;
    const rect = stack.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'wallet-ripple';
    const size = Math.max(rect.width, rect.height) * 1.15;
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
    stack.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), 650);
  };

  return (
    <div
      className={`overview wallet-phase-${phase} ${open ? 'wallet-is-open' : ''}`}
      data-wallet-phase={phase}
    >
      {settings.demoOffline && (
        <div className="status-banner">
          <WifiOff />
          Сохранённый план · офлайн
        </div>
      )}
      <section className="wallet-stage" aria-label="Кошелёк" data-testid="wallet-stage">
        <div className="wallet-aura" aria-hidden="true" />
        <button
          ref={trigger}
          className="wallet-stack"
          onClick={openWallet}
          onPointerDown={onWalletPointerDown}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label="Открыть кошелёк и историю"
          disabled={open}
          tabIndex={open ? -1 : 0}
        >
          <span className="wallet-layer comfort" data-layer="comfort">
            <span className="wallet-layer-heading">
              <Coffee aria-hidden="true" />
              <small>Комфорт</small>
            </span>
            <b>{formatMoney(comfort, plan.currency)}</b>
          </span>
          <span className="wallet-layer obligations" data-layer="obligations">
            <span className="wallet-layer-heading">
              <ReceiptText aria-hidden="true" />
              <small>Платежи</small>
            </span>
            <b>{formatMoney(obligations, plan.currency)}</b>
          </span>
          <span className="wallet-layer reserve" data-layer="reserve">
            <span className="wallet-caustic" aria-hidden="true" />
            <span className="wallet-edge-tension" aria-hidden="true" />
            <span className="clasp" aria-hidden="true">
              <span className="clasp-neck" />
              <i />
            </span>
            <span className="wallet-layer-heading">
              <Shield aria-hidden="true" />
              <small>Запас</small>
            </span>
            <b className="wallet-amount">{formatMoney(reserve, plan.currency)}</b>
            <span className="safe-strip">
              <Sparkles aria-hidden="true" />
              <span>Безопасно сегодня</span>
              <strong>{formatMoney(snapshot.safe_daily_amount, plan.currency)}</strong>
            </span>
            <span className="wallet-lip">
              <em>
                Всего <b>{formatMoney(snapshot.available_now, plan.currency)}</b>
              </em>
              <em>
                Платежи <b>{formatMoney(obligations, plan.currency)}</b>
              </em>
            </span>
          </span>
        </button>
      </section>

      <section className="assistant-capsule liquid-panel" data-testid="assistant-capsule">
        <span className="assistant-shimmer" aria-hidden="true" />
        <span className="lens-dot">
          <MessageCircle aria-hidden="true" />
        </span>
        <div>
          <small>Помощник</small>
          <h2>{snapshot.available_now === 0 ? 'Начнём с нуля — без спешки' : 'С чего начнём?'}</h2>
          <div>
            <Link to="/assistant">Доход</Link>
            <Link to="/plan">План</Link>
            <Link to="/assistant">
              Спросить <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {open && (
        <WalletExpanded
          phase={phase}
          onClose={closeWallet}
          comfort={comfort}
          obligations={obligations}
          reserve={reserve}
        />
      )}
    </div>
  );
}

function smoothPath(points: Array<[number, number]>) {
  if (points.length < 2) return '';
  const first = points[0]!;
  let path = `M ${first[0]} ${first[1]}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index]!;
    const next = points[index + 1]!;
    const previous = points[index - 1] ?? current;
    const after = points[index + 2] ?? next;
    const c1x = current[0] + (next[0] - previous[0]) / 6;
    const c1y = current[1] + (next[1] - previous[1]) / 6;
    const c2x = next[0] - (after[0] - current[0]) / 6;
    const c2y = next[1] - (after[1] - current[1]) / 6;
    path += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${next[0]} ${next[1]}`;
  }
  return path;
}

function WalletExpanded({
  onClose,
  phase,
  comfort,
  obligations,
  reserve,
}: {
  onClose: () => void;
  phase: WalletPhase;
  comfort: number;
  obligations: number;
  reserve: number;
}) {
  const { data, settings } = useApp();
  const [tab, setTab] = useState<MoneyTab>('summary');
  const titleId = useId();
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (phase === 'open') close.current?.focus();
  }, [phase]);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    addEventListener('keydown', keyboard);
    return () => removeEventListener('keydown', keyboard);
  }, [onClose]);

  if (!data) return null;
  const currency = data.currency;
  const transactions = data.transactions.slice(0, 8);
  const chronological = [...transactions].reverse();
  let level = 0;
  const values = chronological.map((transaction) => {
    level += transaction.kind === 'income' ? transaction.amount : -transaction.amount;
    return level;
  });
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const chartPoints: Array<[number, number]> = values.map((value, index) => [
    14 + index * (292 / Math.max(1, values.length - 1)),
    122 - ((value - min) / (max - min || 1)) * 86,
  ]);
  const curve = smoothPath(chartPoints);
  const latest = chartPoints.at(-1);

  return (
    <div
      className={`money-view money-phase-${phase}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-wallet-phase={phase}
    >
      <div className="money-backdrop-light" aria-hidden="true" />
      <header className="money-header" data-testid="money-header">
        <div>
          <span id={titleId}>Деньги</span>
          <small>Всего</small>
          <h1>{formatMoney(data.plan.snapshot.available_now, currency)}</h1>
        </div>
        <span className="demo-mark">{data.scenario === 'empty' ? 'Новый' : 'Демо'}</span>
        <button ref={close} onClick={onClose} aria-label="Закрыть кошелёк">
          <X aria-hidden="true" />
        </button>
      </header>

      <div className="expanded-scene">
        <div className="expanded-fan" aria-hidden="true" data-testid="expanded-fan">
          <i className="fan-comfort" data-amount={formatMoney(comfort, currency)} />
          <i className="fan-obligations" data-amount={formatMoney(obligations, currency)} />
          <i className="fan-reserve" data-amount={formatMoney(reserve, currency)} />
          <span className="fan-clasp">
            <span className="clasp-neck" />
            <i />
          </span>
        </div>
        <div className="money-surface">
          <div className="money-tabs" role="tablist" aria-label="Раздел денег">
            {(
              [
                ['summary', 'Сводка'],
                ['history', 'История'],
                ['chart', 'График'],
              ] as const
            ).map(([id, label]) => (
              <button
                role="tab"
                aria-selected={tab === id}
                aria-controls={`money-${id}`}
                onClick={() => setTab(id)}
                key={id}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="money-scroll">
            {(tab === 'summary' || tab === 'chart') && (
              <section className="movement" id={`money-${tab}`}>
                <div className="movement-heading">
                  <div>
                    <small>Баланс за период</small>
                    <h2>Движение денег</h2>
                  </div>
                  <span>{transactions.length} операций</span>
                </div>
                {values.length ? (
                  <svg
                    viewBox="0 0 320 148"
                    role="img"
                    aria-label={`График движения денег от ${formatMoney(min, currency)} до ${formatMoney(max, currency)}`}
                  >
                    <defs>
                      <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="var(--primary-violet)" stopOpacity=".22" />
                        <stop offset="1" stopColor="var(--primary-violet)" stopOpacity="0" />
                      </linearGradient>
                      <filter id="chartGlow" x="-20%" y="-30%" width="140%" height="160%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    {[36, 78, 120].map((y) => (
                      <line key={y} x1="12" x2="308" y1={y} y2={y} />
                    ))}
                    <path
                      className="chart-area"
                      d={`${curve} L ${latest?.[0] ?? 14} 136 L 14 136 Z`}
                    />
                    <path className="chart-curve" d={curve} filter="url(#chartGlow)" />
                    {latest && (
                      <>
                        <circle className="chart-point-halo" cx={latest[0]} cy={latest[1]} r="8" />
                        <circle className="chart-point" cx={latest[0]} cy={latest[1]} r="4" />
                      </>
                    )}
                  </svg>
                ) : (
                  <div className="chart-empty">Пока нет операций для графика</div>
                )}
              </section>
            )}

            {(tab === 'summary' || tab === 'history') && (
              <section className="transactions-preview" id={`money-${tab}`}>
                <div className="transactions-heading">
                  <h2>Последние операции</h2>
                  <Link to="/transactions" aria-label="Все операции">
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </div>
                {transactions.length ? (
                  transactions.map((transaction) => {
                    const income = transaction.kind === 'income';
                    const Icon = income ? ArrowDownLeft : ArrowUpRight;
                    return (
                      <article key={transaction.id} tabIndex={0}>
                        <span className={income ? 'income' : 'expense'}>
                          <Icon aria-hidden="true" />
                        </span>
                        <div>
                          <b>{transaction.description || transaction.category}</b>
                          <small>
                            {transaction.category} ·{' '}
                            {new Intl.DateTimeFormat(
                              settings.language === 'ru' ? 'ru-RU' : 'en-US',
                              { day: 'numeric', month: 'short' },
                            ).format(new Date(transaction.occurred_at))}
                          </small>
                        </div>
                        <strong className={income ? 'income-text' : 'expense-text'}>
                          {income ? '+' : '−'} {formatMoney(transaction.amount, currency)}
                        </strong>
                      </article>
                    );
                  })
                ) : (
                  <div className="empty-state compact-empty">
                    <WalletCards aria-hidden="true" />
                    <h3>Операций пока нет</h3>
                    <p>Добавьте первую, когда будете готовы.</p>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
