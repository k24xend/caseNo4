import { ShoppingBag, Utensils, Wallet } from 'lucide-react';
import { useApp } from '../../app/AppContext';
import { formatMoney } from '../../domain/money';

export function Plan() {
  const { data, settings, patch } = useApp();
  if (!data) return null;

  const currency = data.plan.currency;
  const available = data.plan.snapshot.available_now;
  const comfort = settings.comfortBudget;

  return (
    <div>
      <div className="mb-4 flex flex-col items-center pt-4 text-center">
        <div className="fs-icon-btn mb-3 size-12">
          <Wallet className="size-5 text-cyan-500" />
        </div>
        <small className="text-xs font-semibold text-slate-500">Wallet balance</small>
        <h1 className="m-0 mt-1 text-4xl font-semibold tracking-tight text-slate-950 tabular-nums">
          {formatMoney(available, currency)}
        </h1>
      </div>

      <section className="fs-card p-5">
        <h2 className="m-0 text-base font-semibold text-slate-950">Comfort buffer</h2>
        <p className="m-0 mt-1 text-xs text-slate-500">Untouchable comfort for daily life</p>
        <p className="m-0 mt-3 text-3xl font-semibold tracking-tight text-slate-950 tabular-nums">
          {formatMoney(comfort, currency)}
        </p>
        <div className="fs-seg mt-4 flex gap-1 p-1">
          {(
            [
              [300000, '3k'],
              [500000, '5k'],
              [800000, '8k'],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              className={`fs-seg-btn flex-1 ${comfort === v ? 'active' : ''}`}
              onClick={() => void patch({ comfortBudget: v })}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="fs-card mt-4 rounded-[28px] p-5">
        <h2 className="m-0 text-base font-semibold text-slate-950">Money categories</h2>
        <p className="m-0 mt-1 text-xs text-slate-500">Where your budget goes</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="fs-cat rounded-2xl p-4">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-cyan-500/12 text-cyan-600">
              <ShoppingBag className="size-4" />
            </div>
            <div className="mt-3 text-xs text-slate-500">Shopping</div>
            <div className="mt-1 text-lg font-semibold text-slate-950 tabular-nums">
              {formatMoney(Math.round(available * 0.15), currency)}
            </div>
          </div>
          <div className="fs-cat rounded-2xl p-4">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-cyan-500/12 text-cyan-600">
              <Utensils className="size-4" />
            </div>
            <div className="mt-3 text-xs text-slate-500">Food & Drink</div>
            <div className="mt-1 text-lg font-semibold text-slate-950 tabular-nums">
              {formatMoney(Math.round(available * 0.08), currency)}
            </div>
          </div>
        </div>
      </section>

      <section className="fs-card mt-4 p-5">
        <h2 className="m-0 text-base font-semibold text-slate-950">Plan state</h2>
        <p className="m-0 mt-1 text-sm text-slate-600">{data.plan.action?.title || 'Keep your pace'}</p>
        <p className="m-0 mt-2 text-xs text-slate-500">State: {data.plan.state}</p>
      </section>
    </div>
  );
}
