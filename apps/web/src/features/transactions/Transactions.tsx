import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApp } from '../../app/AppContext';
import { formatMoney } from '../../domain/money';

export function Transactions() {
  const { data, settings } = useApp();
  const [q, setQ] = useState('');

  const { income, spent, list } = useMemo(() => {
    type Tx = NonNullable<typeof data>['transactions'][number];
    if (!data) return { income: 0, spent: 0, list: [] as Tx[] };
    let incomeSum = 0;
    let spentSum = 0;
    for (const tx of data.transactions) {
      if (tx.kind === 'income') incomeSum += tx.amount;
      else spentSum += tx.amount;
    }
    const list = data.transactions.filter((tx: Tx) => {
      if (!q.trim()) return true;
      const hay = `${tx.description || ''} ${tx.category}`.toLowerCase();
      return hay.includes(q.trim().toLowerCase());
    });
    return { income: incomeSum, spent: spentSum, list };
  }, [data, q]);

  if (!data) return null;
  const currency = data.currency;

  return (
    <div>
      <h1 className="mint-page-title">History</h1>
      <p className="mint-page-sub">All transactions and trends</p>

      <div className="mint-stats">
        <div className="mint-stat">
          <small>Total Income</small>
          <strong className="income">+{formatMoney(income, currency)}</strong>
          <em>This week</em>
        </div>
        <div className="mint-stat">
          <small>Total Spent</small>
          <strong className="expense">−{formatMoney(spent, currency)}</strong>
          <em>This week</em>
        </div>
      </div>

      <label className="mint-search">
        <Search size={18} color="var(--mint-muted)" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search transactions…"
          aria-label="Search transactions"
        />
      </label>

      <section className="mint-card">
        <ul className="mint-tx-list">
          {list.length ? (
            list.map((tx) => {
              const incomeTx = tx.kind === 'income';
              return (
                <li key={tx.id}>
                  <span className={`mint-tx-ic ${incomeTx ? 'income' : 'expense'}`}>
                    {incomeTx ? '↑' : '↓'}
                  </span>
                  <div>
                    <b>{tx.description || tx.category}</b>
                    <small>
                      {tx.category} ·{' '}
                      {new Intl.DateTimeFormat(settings.language === 'ru' ? 'ru-RU' : 'en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(new Date(tx.occurred_at))}
                    </small>
                  </div>
                  <strong className={incomeTx ? 'income' : 'expense'}>
                    {incomeTx ? '+' : '−'}
                    {formatMoney(tx.amount, currency)}
                  </strong>
                </li>
              );
            })
          ) : (
            <li>
              <div>
                <b>No transactions</b>
                <small>Try another search</small>
              </div>
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
