import {
  ArrowDownLeft,
  ArrowUpRight,
  ShoppingBag,
  Shirt,
  WalletCards,
  WifiOff,
  X,
} from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { Skeleton } from '../../components/ui';
import { formatMoney } from '../../domain/money';
import { LiquidWallet, type WalletPhase } from './Wallet3D';

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
          <button className="button" type="button" onClick={refresh}>
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
    openTimer.current = window.setTimeout(() => setPhase('open'), 480);
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

  const amounts = {
    comfort,
    obligations,
    reserve,
    total: snapshot.available_now,
    safeDaily: snapshot.safe_daily_amount,
    currency: plan.currency,
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

      <LiquidWallet
        phase={phase}
        amounts={amounts}
        onOpen={openWallet}
        triggerRef={trigger}
        reducedMotion={prefersReducedMotion()}
      />

      <section className="rb-assistant" data-testid="assistant-capsule">
        <div className="rb-assistant-water" aria-hidden />
        <small>Помощник</small>
        <h2>
          {snapshot.available_now === 0
            ? 'Начнём с нуля — без спешки'
            : 'С чего начнём: доход, план или расходы?'}
        </h2>
        <div className="rb-assistant-actions">
          <Link to="/assistant">Доход</Link>
          <Link to="/plan">План</Link>
          <Link className="rb-ask" to="/assistant">
            Спросить
          </Link>
        </div>
      </section>

      {open && <WalletExpanded phase={phase} onClose={closeWallet} />}
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

function txIcon(category: string, income: boolean) {
  if (income) return ArrowDownLeft;
  const c = category.toLowerCase();
  if (c.includes('wild') || c.includes('магаз') || c.includes('shop')) return ShoppingBag;
  if (c.includes('одежд') || c.includes('cloth')) return Shirt;
  return ArrowUpRight;
}

function WalletExpanded({
  onClose,
  phase,
}: {
  onClose: () => void;
  phase: WalletPhase;
}) {
  const { data, settings } = useApp();
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
  const transactions = data.transactions.slice(0, 6);
  const chronological = [...transactions].reverse();
  let level = 0;
  const values = chronological.map((transaction) => {
    level += transaction.kind === 'income' ? transaction.amount : -transaction.amount;
    return level;
  });
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const chartPoints: Array<[number, number]> = values.map((value, index) => [
    18 + index * (260 / Math.max(1, values.length - 1)),
    100 - ((value - min) / (max - min || 1)) * 72,
  ]);
  const curve = smoothPath(chartPoints);
  const latest = chartPoints.at(-1);

  return (
    <div
      className={`rb-money money-phase-${phase}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-wallet-phase={phase}
      data-testid="money-view"
    >
      <header className="rb-money-header" data-testid="money-header">
        <div>
          <p id={titleId} className="rb-money-title">
            Деньги
          </p>
          <small>Всего</small>
          <h1>{formatMoney(data.plan.snapshot.available_now, currency)}</h1>
        </div>
        <button ref={close} type="button" className="rb-close" onClick={onClose} aria-label="Закрыть кошелёк">
          <X size={18} aria-hidden />
        </button>
      </header>

      <div className="rb-folder" data-testid="expanded-fan">
        <div className="rb-sheet rb-sheet-3" aria-hidden />
        <div className="rb-sheet rb-sheet-2" aria-hidden />
        <div className="rb-sheet rb-sheet-1">
          <div className="rb-folder-pearl" aria-hidden>
            <span className="rb-pearl" />
          </div>

          <section className="rb-movement">
            <h2>Движение денег</h2>
            {values.length ? (
              <svg
                viewBox="0 0 300 120"
                role="img"
                aria-label={`График от ${formatMoney(min, currency)} до ${formatMoney(max, currency)}`}
              >
                <defs>
                  <linearGradient id="rbChartFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#8174E8" stopOpacity=".18" />
                    <stop offset="1" stopColor="#8174E8" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  className="rb-chart-area"
                  d={`${curve} L ${latest?.[0] ?? 18} 110 L 18 110 Z`}
                />
                <path className="rb-chart-curve" d={curve} />
                {latest && (
                  <>
                    <circle className="rb-chart-halo" cx={latest[0]} cy={latest[1]} r="7" />
                    <circle className="rb-chart-dot" cx={latest[0]} cy={latest[1]} r="3.5" />
                  </>
                )}
                <g className="rb-chart-axis">
                  <text x="18" y="118">
                    7
                  </text>
                  <text x="95" y="118">
                    14
                  </text>
                  <text x="172" y="118">
                    21
                  </text>
                  <text x="248" y="118">
                    28
                  </text>
                </g>
              </svg>
            ) : (
              <p className="rb-empty">Пока нет операций</p>
            )}
          </section>

          <section className="rb-tx">
            <h2>Последние операции</h2>
            {transactions.length ? (
              <ul>
                {transactions.map((transaction) => {
                  const income = transaction.kind === 'income';
                  const Icon = txIcon(transaction.category, income);
                  return (
                    <li key={transaction.id}>
                      <span className={income ? 'rb-tx-ic income' : 'rb-tx-ic expense'}>
                        <Icon size={16} aria-hidden />
                      </span>
                      <div>
                        <b>{transaction.description || transaction.category}</b>
                        <small>
                          {new Intl.DateTimeFormat(settings.language === 'ru' ? 'ru-RU' : 'en-US', {
                            weekday: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          }).format(new Date(transaction.occurred_at))}
                        </small>
                      </div>
                      <strong className={income ? 'income-text' : 'expense-text'}>
                        {income ? '+' : '−'}
                        {formatMoney(transaction.amount, currency)}
                      </strong>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="rb-empty">
                <WalletCards size={20} aria-hidden />
                <p>Операций пока нет</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
