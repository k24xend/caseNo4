import { BarChart3, ShoppingBag, Star, Utensils, WifiOff } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useApp } from '../../app/AppContext';
import { HeaderChrome } from '../../components/HeaderChrome';
import { Skeleton } from '../../components/ui';
import { formatMoney } from '../../domain/money';
import { t } from '../../i18n';
import { cn } from '../../lib/utils';

const barHeights = [78, 62, 70, 46, 72, 80, 54];

export function Today() {
  const { data, loading, error, settings, refresh, patch } = useApp();
  const s = t(settings.language);
  const [pace, setPace] = useState<'basic' | 'hard'>(
    settings.guidanceMode === 'hard' ? 'hard' : 'basic',
  );
  const [starred, setStarred] = useState({ shopping: true, food: true });

  const categories = useMemo(() => {
    if (!data) return { shopping: 31280, food: 9840 };
    let shopping = 0;
    let food = 0;
    for (const tx of data.transactions) {
      if (tx.kind !== 'expense') continue;
      const c = tx.category.toLowerCase();
      if (c.includes('кафе') || c.includes('еда') || c.includes('food') || c.includes('продукт')) {
        food += tx.amount;
      } else {
        shopping += tx.amount;
      }
    }
    return { shopping: shopping || 31280, food: food || 9840 };
  }, [data]);

  if (loading) return <Skeleton />;
  if (error)
    return (
      <div className="fs-card p-4">
        <p className="font-semibold">{error}</p>
        <button type="button" className="mt-3 text-sm font-semibold text-accent" onClick={refresh}>
          Retry
        </button>
      </div>
    );
  if (!data) return null;

  const available = data.plan.snapshot.available_now;
  const currency = data.plan.currency;

  const choosePace = (next: 'basic' | 'hard') => {
    setPace(next);
    void patch({
      guidanceMode: next === 'hard' ? 'hard' : 'base',
      hardRiskLevel: next === 'hard' ? 'high' : 'moderate',
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {settings.demoOffline && (
        <div className="fs-card flex items-center gap-2 px-3 py-2 text-xs text-muted">
          <WifiOff size={14} /> {s.offlineDemo}
        </div>
      )}

      <HeaderChrome />

      <section className="fs-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">
              {s.difficulty}
            </span>
            <span className="text-sm font-semibold text-ink">{s.choosePace}</span>
          </div>
          <div className="fs-seg flex items-center gap-1 p-1">
            <button
              type="button"
              className={cn('fs-seg-btn', pace === 'basic' && 'active')}
              onClick={() => choosePace('basic')}
            >
              {s.basic}
            </button>
            <button
              type="button"
              className={cn('fs-seg-btn', pace === 'hard' && 'active')}
              onClick={() => choosePace('hard')}
            >
              {s.hard}
            </button>
          </div>
        </div>
      </section>

      <section className="fs-progress p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft">
              <BarChart3 className="size-5" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <div className="text-sm font-semibold text-ink">{s.financialProgress}</div>
              <div className="text-xs text-muted">{s.balanceImproving}</div>
            </div>
          </div>
          <div
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: 'color-mix(in srgb, var(--positive) 14%, transparent)', color: 'var(--positive)' }}
          >
            +12.4%
          </div>
        </div>

        <div className="fs-inner mt-5 p-4">
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="text-xs text-muted">{s.availableToSpend}</div>
              <div className="mt-1 text-3xl font-semibold tracking-tight text-ink tabular-nums">
                {formatMoney(available, currency)}
              </div>
            </div>
            <div className="rounded-2xl px-3 py-2 text-right" style={{ background: 'var(--accent-soft)' }}>
              <div className="text-[11px] font-medium text-muted">{s.thisMonth}</div>
              <div className="text-sm font-semibold text-ink">{s.stable}</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-2">
            {barHeights.map((h, i) => (
              <div
                key={s.weekDays[i]}
                className="fs-bar"
                style={{ height: h, marginTop: Math.max(0, 84 - h) }}
              />
            ))}
          </div>
          <div className="mt-3 flex justify-between text-[11px] text-muted">
            {s.weekDays.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="fs-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-base font-semibold text-ink">{s.moneyCategories}</div>
            <div className="mt-0.5 text-xs text-muted">{s.whereBudgetGoes}</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <CategoryCard
            label={s.shopping}
            amount={formatMoney(categories.shopping, currency)}
            icon={<ShoppingBag className="size-4" />}
            starred={starred.shopping}
            onStar={() => setStarred((v) => ({ ...v, shopping: !v.shopping }))}
          />
          <CategoryCard
            label={s.foodDrink}
            amount={formatMoney(categories.food, currency)}
            icon={<Utensils className="size-4" />}
            starred={starred.food}
            onStar={() => setStarred((v) => ({ ...v, food: !v.food }))}
          />
        </div>
      </section>
    </div>
  );
}

function CategoryCard({
  label,
  amount,
  icon,
  starred,
  onStar,
}: {
  label: string;
  amount: string;
  icon: ReactNode;
  starred: boolean;
  onStar: () => void;
}) {
  return (
    <div className="fs-cat rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          {icon}
        </div>
        <button type="button" onClick={onStar} aria-label={label}>
          <Star
            className={cn('size-4', starred ? 'fill-current text-accent' : 'text-muted')}
            style={starred ? { color: 'var(--accent)' } : undefined}
          />
        </button>
      </div>
      <div className="mt-3 text-xs text-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold text-ink tabular-nums">{amount}</div>
    </div>
  );
}
