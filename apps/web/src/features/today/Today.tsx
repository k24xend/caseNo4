/**
 * Home — adapted from Figma/Flowstep Screen 3 export.
 * Visual: glass mint cyan; data from app plan.
 */
import {
  BarChart3,
  CircleUser,
  Globe,
  Palette,
  ShoppingBag,
  Snowflake,
  Star,
  SunMoon,
  Utensils,
  WifiOff,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo, useState, type ReactNode } from 'react';
import { useApp } from '../../app/AppContext';
import { Skeleton } from '../../components/ui';
import { formatMoney } from '../../domain/money';
import { cn } from '../../lib/utils';

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const barHeights = [80, 64, 72, 48, 68, 76, 52];

export function Today() {
  const { data, loading, error, settings, refresh, patch } = useApp();
  const [pace, setPace] = useState<'basic' | 'hard'>(
    settings.guidanceMode === 'hard' ? 'hard' : 'basic',
  );
  const [starred, setStarred] = useState({ shopping: true, food: false });

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
    return {
      shopping: shopping || 31280,
      food: food || 9840,
    };
  }, [data]);

  if (loading) return <Skeleton />;
  if (error)
    return (
      <div className="fs-card p-4">
        <p className="font-semibold text-slate-950">Couldn’t load overview</p>
        <p className="mt-1 text-xs text-slate-500">{error}</p>
        <button type="button" className="mt-3 text-sm font-semibold text-cyan-600" onClick={refresh}>
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
    <div className="fs-home">
      {settings.demoOffline && (
        <div className="mb-3 flex items-center gap-2 rounded-2xl border border-white/70 bg-white/55 px-3 py-2 text-xs text-slate-600 backdrop-blur-xl">
          <WifiOff size={14} /> Offline demo
        </div>
      )}

      {/* Header — Screen 3 */}
      <header className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <div className="fs-icon-btn size-10">
            <Snowflake className="size-5 text-cyan-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-[22px] font-semibold tracking-tight text-slate-950">Vyhod</span>
            <span className="max-w-[150px] text-[11px] font-medium leading-4 text-slate-600">
              Track money, improve balance
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="fs-icon-btn size-10" aria-label="Theme">
            <Palette className="size-4 text-slate-700" />
          </button>
          <button type="button" className="fs-icon-btn size-10" aria-label="Language">
            <Globe className="size-4 text-slate-700" />
          </button>
          <button type="button" className="fs-icon-btn size-10" aria-label="Appearance">
            <SunMoon className="size-4 text-slate-700" />
          </button>
          <Link to="/profile" className="fs-icon-btn size-10" aria-label="Profile">
            <CircleUser className="size-4 text-slate-700" />
          </Link>
        </div>
      </header>

      <div className="mt-4 flex flex-col gap-4">
        {/* Difficulty */}
        <section className="fs-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-[0.32em] text-slate-500">
                Difficulty
              </span>
              <span className="text-sm font-semibold leading-5 text-slate-950">Choose your pace</span>
            </div>
            <div className="fs-seg flex items-center gap-1 p-1">
              <button
                type="button"
                className={cn('fs-seg-btn', pace === 'basic' && 'active')}
                onClick={() => choosePace('basic')}
              >
                Basic
              </button>
              <button
                type="button"
                className={cn('fs-seg-btn', pace === 'hard' && 'active')}
                onClick={() => choosePace('hard')}
              >
                Hard
              </button>
            </div>
          </div>
        </section>

        {/* Financial progress */}
        <section className="fs-progress p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="fs-icon-btn size-12">
                <BarChart3 className="size-5 text-cyan-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold leading-5 text-slate-950">
                  Financial progress
                </span>
                <span className="text-xs leading-4 text-slate-500">Your balance is improving</span>
              </div>
            </div>
            <div className="rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-semibold leading-4 text-emerald-700 shadow-[0_8px_18px_rgba(61,158,168,0.08)]">
              +12.4%
            </div>
          </div>

          <div className="fs-inner mt-5 p-4">
            <div className="flex items-end justify-between gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs leading-4 text-slate-500">Available to spend</span>
                <span className="text-3xl font-semibold leading-9 tracking-tight text-slate-950 tabular-nums">
                  {formatMoney(available, currency)}
                </span>
              </div>
              <div className="rounded-2xl bg-cyan-500/12 px-3 py-2 text-right shadow-[0_10px_20px_rgba(6,182,212,0.12)]">
                <div className="text-[11px] font-medium text-slate-500">This month</div>
                <div className="text-sm font-semibold leading-5 text-slate-950">Stable</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-2">
              {barHeights.map((h, i) => (
                <div
                  key={weekDays[i]}
                  className="fs-bar rounded-2xl bg-cyan-400/30"
                  style={{ height: h, marginTop: Math.max(0, 80 - h) }}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
              {weekDays.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Money categories */}
        <section className="fs-card rounded-[28px] p-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-base font-semibold leading-6 text-slate-950">Money categories</span>
              <span className="text-xs leading-4 text-slate-500">Where your budget goes</span>
            </div>
            <Link to="/plan" className="text-xs font-semibold leading-4 text-cyan-600">
              Edit
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <CategoryCard
              label="Shopping"
              amount={formatMoney(categories.shopping, currency)}
              icon={<ShoppingBag className="size-4" />}
              starred={starred.shopping}
              onStar={() => setStarred((s) => ({ ...s, shopping: !s.shopping }))}
            />
            <CategoryCard
              label="Food & Drink"
              amount={formatMoney(categories.food, currency)}
              icon={<Utensils className="size-4" />}
              starred={starred.food}
              onStar={() => setStarred((s) => ({ ...s, food: !s.food }))}
            />
          </div>
        </section>
      </div>
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
        <div className="flex size-10 items-center justify-center rounded-2xl bg-cyan-500/12 text-cyan-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
          {icon}
        </div>
        <button type="button" onClick={onStar} aria-label={`Favorite ${label}`}>
          <Star
            className={cn('size-4', starred ? 'fill-cyan-500 text-cyan-500' : 'text-slate-400')}
          />
        </button>
      </div>
      <div className="mt-3 text-xs leading-4 text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold leading-7 text-slate-950 tabular-nums">{amount}</div>
    </div>
  );
}
