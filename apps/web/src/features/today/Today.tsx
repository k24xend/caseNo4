import {
  BarChart3,
  Bell,
  Briefcase,
  Coffee,
  Heart,
  Settings2,
  ShoppingBag,
  Sparkles,
  Star,
  WifiOff,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useApp } from '../../app/AppContext';
import { Skeleton } from '../../components/ui';
import { formatMoney } from '../../domain/money';

type Pace = 'easy' | 'medium' | 'hard';

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const categoryMeta = [
  { key: 'shopping', label: 'Shopping', Icon: ShoppingBag },
  { key: 'food', label: 'Food & Drink', Icon: Coffee },
  { key: 'work', label: 'Work', Icon: Briefcase },
  { key: 'health', label: 'Health', Icon: Heart },
] as const;

export function Today() {
  const { data, loading, error, settings, refresh, patch } = useApp();
  const [pace, setPace] = useState<Pace>(
    settings.guidanceMode === 'hard' ? 'hard' : settings.guidanceMode === 'base' ? 'easy' : 'medium',
  );
  const [aiOn, setAiOn] = useState(true);
  const [stars, setStars] = useState<Record<string, boolean>>({ shopping: true, food: true });

  const categories = useMemo(() => {
    if (!data) return [];
    const map = {
      shopping: 0,
      food: 0,
      work: 0,
      health: 0,
    };
    for (const tx of data.transactions) {
      if (tx.kind !== 'expense') continue;
      const c = tx.category.toLowerCase();
      if (c.includes('магаз') || c.includes('shop') || c.includes('wild')) map.shopping += tx.amount;
      else if (c.includes('кафе') || c.includes('еда') || c.includes('food') || c.includes('продукт'))
        map.food += tx.amount;
      else if (c.includes('работ') || c.includes('work')) map.work += tx.amount;
      else if (c.includes('health') || c.includes('здоров')) map.health += tx.amount;
      else map.shopping += tx.amount;
    }
    if (map.shopping === 0) map.shopping = 31280;
    if (map.food === 0) map.food = 9840;
    if (map.work === 0) map.work = 124000;
    if (map.health === 0) map.health = 6420;
    return categoryMeta.map((m) => ({ ...m, amount: map[m.key as keyof typeof map] }));
  }, [data]);

  const weekBars = useMemo(() => {
    // height 28–72 based on synthetic activity
    const levels = [0.35, 0.55, 0.45, 0.75, 0.9, 0.4, 0.25];
    return levels.map((l, i) => ({ day: weekDays[i], h: 28 + l * 44, filled: l > 0.3 }));
  }, []);

  if (loading) return <Skeleton />;
  if (error)
    return (
      <div className="mint-card">
        <h2 className="mint-section-title">Couldn’t load overview</h2>
        <p className="mint-section-sub">{error}</p>
        <button type="button" className="mint-link" onClick={refresh}>
          Retry
        </button>
      </div>
    );
  if (!data) return null;

  const available = data.plan.snapshot.available_now;
  const currency = data.plan.currency;
  const recent = data.transactions.slice(0, 4);

  const setPaceMode = (next: Pace) => {
    setPace(next);
    void patch({
      guidanceMode: next === 'hard' ? 'hard' : 'base',
      hardRiskLevel: next === 'hard' ? 'high' : 'moderate',
    });
  };

  return (
    <div className="mint-home">
      {settings.demoOffline && (
        <div className="status-banner">
          <WifiOff size={14} /> Offline demo
        </div>
      )}

      <header className="mint-home-header">
        <div className="mint-brand">
          <div className="mint-brand-mark" aria-hidden>
            <Sparkles size={20} />
          </div>
          <div>
            <h1>Vyhod</h1>
            <p>Track money, improve balance</p>
          </div>
        </div>
        <div className="mint-header-actions">
          <button type="button" className="mint-icon-btn" aria-label="Notifications">
            <Bell size={18} />
          </button>
          <Link to="/profile" className="mint-icon-btn" aria-label="Settings">
            <Settings2 size={18} />
          </Link>
        </div>
      </header>

      <section className="mint-diff mint-card">
        <div className="mint-diff-label">Difficulty</div>
        <h2 className="mint-diff-title">Choose your pace</h2>
        <div className="mint-diff-seg" role="group" aria-label="Pace">
          {(
            [
              ['easy', 'Easy'],
              ['medium', 'Medium'],
              ['hard', 'Hard'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={pace === id ? 'active' : undefined}
              onClick={() => setPaceMode(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="mint-card mint-progress">
        <div className="mint-progress-top">
          <div className="mint-progress-ic">
            <BarChart3 size={20} />
          </div>
          <div>
            <h2>Financial progress</h2>
            <p>Your balance is improving</p>
          </div>
          <span className="mint-delta">↑ +12.4%</span>
        </div>

        <div>
          <p className="mint-available-label">Available to spend</p>
          <p className="mint-available">{formatMoney(available, currency)}</p>
          <div className="mint-stable">
            <small>This month</small>
            <strong>Stable</strong>
          </div>
        </div>

        <div className="mint-week" aria-label="Week activity">
          {weekBars.map((d) => (
            <div key={d.day} className="mint-week-day">
              <div
                className={`mint-week-bar ${d.filled ? 'filled' : ''}`}
                style={{ height: d.h }}
              />
              <span>{d.day}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mint-card">
        <div className="mint-row">
          <div>
            <h2 className="mint-section-title">Money categories</h2>
            <p className="mint-section-sub">Where your budget goes</p>
          </div>
          <Link to="/plan" className="mint-link">
            Edit
          </Link>
        </div>
        <div className="mint-cat-grid">
          {categories.map(({ key, label, Icon, amount }) => (
            <div key={key} className="mint-cat">
              <div className="mint-cat-top">
                <span className="mint-cat-ic">
                  <Icon size={16} />
                </span>
                <button
                  type="button"
                  className="mint-link"
                  aria-label={`Favorite ${label}`}
                  onClick={() => setStars((s) => ({ ...s, [key]: !s[key] }))}
                  style={{ padding: 0, lineHeight: 0 }}
                >
                  <Star
                    size={16}
                    className={stars[key] ? 'mint-star on' : 'mint-star'}
                    fill={stars[key] ? 'currentColor' : 'none'}
                  />
                </button>
              </div>
              <b>{label}</b>
              <strong>{formatMoney(amount, currency)}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="mint-card">
        <div className="mint-ai-row">
          <div className="mint-ai-ic">
            <Sparkles size={20} />
          </div>
          <div>
            <h3>AI Assistant</h3>
            <p>Ready to help you improve</p>
          </div>
          <button
            type="button"
            className={`mint-toggle ${aiOn ? 'on' : ''}`}
            aria-pressed={aiOn}
            aria-label="Toggle AI assistant"
            onClick={() => setAiOn((v) => !v)}
          >
            <i />
          </button>
        </div>
      </section>

      <section className="mint-card">
        <div className="mint-row">
          <div>
            <h2 className="mint-section-title">History</h2>
            <p className="mint-section-sub">Recent transactions and trends</p>
          </div>
          <Link to="/transactions" className="mint-link">
            See all
          </Link>
        </div>
        <ul className="mint-tx-list">
          {recent.map((tx) => {
            const income = tx.kind === 'income';
            return (
              <li key={tx.id}>
                <span className={`mint-tx-ic ${income ? 'income' : 'expense'}`}>
                  {income ? '↑' : '↓'}
                </span>
                <div>
                  <b>{tx.description || tx.category}</b>
                  <small>
                    {tx.category} ·{' '}
                    {new Intl.DateTimeFormat(settings.language === 'ru' ? 'ru-RU' : 'en-US', {
                      weekday: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(tx.occurred_at))}
                  </small>
                </div>
                <strong className={income ? 'income' : 'expense'}>
                  {income ? '+' : '−'}
                  {formatMoney(tx.amount, currency)}
                </strong>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
