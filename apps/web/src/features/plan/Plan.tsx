import { Briefcase, Coffee, Heart, ShoppingBag, Wallet } from 'lucide-react';
import { useApp } from '../../app/AppContext';
import { formatMoney } from '../../domain/money';

const buckets = [
  { label: 'Shopping', Icon: ShoppingBag, ratio: 0.18 },
  { label: 'Food & Drink', Icon: Coffee, ratio: 0.12 },
  { label: 'Work', Icon: Briefcase, ratio: 0.45 },
  { label: 'Health', Icon: Heart, ratio: 0.08 },
] as const;

export function Plan() {
  const { data, settings, patch } = useApp();
  if (!data) return null;

  const currency = data.plan.currency;
  const available = data.plan.snapshot.available_now;
  const comfort = settings.comfortBudget;

  return (
    <div>
      <div className="mint-wallet-hero">
        <div className="mint-brand-mark" style={{ margin: '0 auto 12px' }} aria-hidden>
          <Wallet size={20} color="#fff" />
        </div>
        <small>Wallet balance</small>
        <h1>{formatMoney(available, currency)}</h1>
      </div>

      <section className="mint-card">
        <h2 className="mint-section-title">Comfort buffer</h2>
        <p className="mint-section-sub">Untouchable comfort for daily life</p>
        <p className="mint-available" style={{ fontSize: 28, marginTop: 10 }}>
          {formatMoney(comfort, currency)}
        </p>
        <div className="mint-diff-seg" style={{ marginTop: 14 }}>
          {(
            [
              [300000, '3 000'],
              [500000, '5 000'],
              [800000, '8 000'],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              className={comfort === v ? 'active' : undefined}
              onClick={() => void patch({ comfortBudget: v })}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="mint-card" style={{ marginTop: 12 }}>
        <h2 className="mint-section-title">Money categories</h2>
        <p className="mint-section-sub">Where your budget goes</p>
        <div className="mint-cat-grid">
          {buckets.map(({ label, Icon, ratio }) => (
            <div key={label} className="mint-cat">
              <div className="mint-cat-top">
                <span className="mint-cat-ic">
                  <Icon size={16} />
                </span>
              </div>
              <b>{label}</b>
              <strong>{formatMoney(Math.round(available * ratio), currency)}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="mint-card" style={{ marginTop: 12 }}>
        <h2 className="mint-section-title">Plan state</h2>
        <p className="mint-section-sub">
          {data.plan.action?.title || 'Keep your pace steady'}
        </p>
        <p style={{ margin: '10px 0 0', fontSize: 14, color: 'var(--mint-muted)', lineHeight: 1.45 }}>
          State: {data.plan.state}
          {data.plan.action?.amount
            ? ` · ${formatMoney(data.plan.action.amount, currency)}`
            : ''}
        </p>
      </section>
    </div>
  );
}
