import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  MessageCircle,
  WalletCards,
  WifiOff,
  X,
} from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { Skeleton } from '../../components/ui';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { formatMoney } from '../../domain/money';
import { LiquidWallet, type WalletPhase } from './Wallet3D';

type MoneyTab = 'summary' | 'history' | 'chart';

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
        prefersReducedMotion() ? 0 : 280,
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

  if (loading) return <Skeleton />;
  if (error)
    return (
      <Card className="space-y-4 p-6">
        <CardTitle>Не удалось открыть обзор</CardTitle>
        <CardDescription>{error}</CardDescription>
        <Button onClick={refresh}>Повторить</Button>
      </Card>
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
    openTimer.current = window.setTimeout(() => setPhase('open'), 200);
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
      closeTimer.current = window.setTimeout(() => setPhase('closed'), 200);
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
    <div className={`space-y-6 ${open ? 'wallet-is-open' : ''}`} data-wallet-phase={phase}>
      {settings.demoOffline && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
          <WifiOff className="h-4 w-4" />
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

      <Card
        className="border-white/60 bg-white/70 shadow-glass backdrop-blur-xl"
        data-testid="assistant-capsule"
      >
        <CardHeader className="flex-row items-start gap-4 space-y-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-secondary text-primary shadow-sm">
            <MessageCircle className="h-5 w-5" aria-hidden />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">Помощник</p>
            <CardTitle className="text-base">
              {snapshot.available_now === 0 ? 'Начнём с нуля — без спешки' : 'С чего начнём?'}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-full border-white/60 bg-white/50">
            <Link to="/assistant">Доход</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-full border-white/60 bg-white/50">
            <Link to="/plan">План</Link>
          </Button>
          <Button asChild size="sm" className="ml-auto rounded-full">
            <Link to="/assistant">
              Спросить <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

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
      className="fixed inset-0 z-50 mx-auto flex max-w-lg flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-wallet-phase={phase}
    >
      <header
        className="money-header flex items-start gap-3 border-b border-border px-4 py-6"
        data-testid="money-header"
      >
        <div className="min-w-0 flex-1 space-y-2">
          <p id={titleId} className="text-base font-semibold">
            Деньги
          </p>
          <p className="text-sm text-muted-foreground">Всего</p>
          <h1 className="truncate text-3xl font-semibold tracking-tight tabular-nums">
            {formatMoney(data.plan.snapshot.available_now, currency)}
          </h1>
        </div>
        <Badge variant="muted">{data.scenario === 'empty' ? 'Новый' : 'Демо'}</Badge>
        <Button ref={close} type="button" size="icon" variant="outline" onClick={onClose} aria-label="Закрыть кошелёк">
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="expanded-scene flex-1 space-y-4 overflow-auto px-4 py-6">
        <div
          className="expanded-fan relative mx-auto h-36 w-full max-w-sm"
          aria-hidden
          data-testid="expanded-fan"
        >
          <div className="fan-comfort absolute inset-x-6 top-0 h-20 -rotate-3 rounded-xl border border-white/50 bg-layer-comfort shadow-glass backdrop-blur-xl" />
          <div className="fan-obligations absolute inset-x-3 top-6 h-20 rotate-1 rounded-xl border border-white/50 bg-layer-obligations shadow-glass backdrop-blur-xl" />
          <div className="fan-reserve absolute inset-x-0 top-12 flex h-20 items-center justify-between rounded-xl border border-white/70 bg-layer-reserve px-5 shadow-md backdrop-blur-xl">
            <span className="text-sm font-medium text-muted-foreground">
              Запас · {formatMoney(reserve, currency)}
            </span>
            <span className="fan-clasp clasp flex h-10 w-8 items-center justify-center rounded-lg border border-white/80 bg-gradient-to-b from-white to-secondary shadow-clasp">
              <i className="block h-4 w-1.5 rounded-full bg-primary/25" />
            </span>
          </div>
          <span className="sr-only">
            Комфорт {formatMoney(comfort, currency)}, Платежи {formatMoney(obligations, currency)}
          </span>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as MoneyTab)}>
          <TabsList>
            <TabsTrigger value="summary">Сводка</TabsTrigger>
            <TabsTrigger value="history">История</TabsTrigger>
            <TabsTrigger value="chart">График</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <MovementChart
              values={values}
              min={min}
              max={max}
              curve={curve}
              latest={latest}
              currency={currency}
              count={transactions.length}
            />
            <TxList transactions={transactions} currency={currency} language={settings.language} />
          </TabsContent>
          <TabsContent value="history">
            <TxList transactions={transactions} currency={currency} language={settings.language} />
          </TabsContent>
          <TabsContent value="chart">
            <MovementChart
              values={values}
              min={min}
              max={max}
              curve={curve}
              latest={latest}
              currency={currency}
              count={transactions.length}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function MovementChart({
  values,
  min,
  max,
  curve,
  latest,
  currency,
  count,
}: {
  values: number[];
  min: number;
  max: number;
  curve: string;
  latest?: [number, number];
  currency: string;
  count: number;
}) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Баланс за период</p>
          <h2 className="text-base font-semibold">Движение денег</h2>
        </div>
        <span className="text-sm text-muted-foreground">{count} операций</span>
      </div>
      {values.length ? (
        <svg
          viewBox="0 0 320 148"
          className="h-36 w-full overflow-visible"
          role="img"
          aria-label={`График движения денег от ${formatMoney(min, currency as never)} до ${formatMoney(max, currency as never)}`}
        >
          <defs>
            <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity=".2" />
              <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[36, 78, 120].map((y) => (
            <line key={y} x1="12" x2="308" y1={y} y2={y} className="stroke-border" strokeWidth="1" />
          ))}
          <path className="chart-area fill-[url(#chartFill)]" d={`${curve} L ${latest?.[0] ?? 14} 136 L 14 136 Z`} />
          <path
            className="chart-curve fill-none stroke-primary"
            d={curve}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {latest && (
            <>
              <circle className="chart-point-halo fill-primary/20" cx={latest[0]} cy={latest[1]} r="8" />
              <circle className="chart-point fill-background stroke-primary" cx={latest[0]} cy={latest[1]} r="4" strokeWidth="2" />
            </>
          )}
        </svg>
      ) : (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          Пока нет операций для графика
        </div>
      )}
    </Card>
  );
}

function TxList({
  transactions,
  currency,
  language,
}: {
  transactions: Array<{
    id: string;
    kind: string;
    amount: number;
    description?: string;
    category: string;
    occurred_at: string;
  }>;
  currency: string;
  language: string;
}) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">Последние операции</h2>
        <Button asChild size="icon" variant="ghost">
          <Link to="/transactions" aria-label="Все операции">
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      {transactions.length ? (
        <ul className="space-y-3">
          {transactions.map((transaction) => {
            const income = transaction.kind === 'income';
            const Icon = income ? ArrowDownLeft : ArrowUpRight;
            return (
              <li
                key={transaction.id}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-3"
                tabIndex={0}
              >
                <span
                  className={
                    income
                      ? 'flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-foreground'
                      : 'flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground'
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {transaction.description || transaction.category}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {transaction.category} ·{' '}
                    {new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-US', {
                      day: 'numeric',
                      month: 'short',
                    }).format(new Date(transaction.occurred_at))}
                  </p>
                </div>
                <strong
                  className={
                    income
                      ? 'income-text text-sm font-semibold tabular-nums'
                      : 'expense-text text-sm font-semibold tabular-nums text-muted-foreground'
                  }
                >
                  {income ? '+' : '−'} {formatMoney(transaction.amount, currency as never)}
                </strong>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="space-y-2 py-8 text-center">
          <WalletCards className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden />
          <h3 className="text-sm font-semibold">Операций пока нет</h3>
          <p className="text-sm text-muted-foreground">Добавьте первую, когда будете готовы.</p>
        </div>
      )}
    </Card>
  );
}
