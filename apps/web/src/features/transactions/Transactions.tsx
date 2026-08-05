import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApp } from '../../app/AppContext';
import { HeaderChrome } from '../../components/HeaderChrome';
import { formatMoney } from '../../domain/money';
import { rateTransaction, type SpendRating } from '../../domain/spendRating';
import { formatDate, t } from '../../i18n';

export function Transactions() {
  const { data, settings } = useApp();
  const s = t(settings.language);
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

  const ratingLabel = (r: SpendRating) => {
    if (r === 'ok') return s.spendOk;
    if (r === 'caution') return s.spendCaution;
    return s.spendCritical;
  };

  return (
    <div>
      <HeaderChrome compact />
      <h1 className="fs-page-title mt-4">{s.historyTitle}</h1>
      <p className="fs-page-sub">{s.historySub}</p>
      <p className="fs-page-hint">{s.spendRatingHint}</p>

      <div className="fs-stats">
        <div className="fs-stat">
          <small>{s.totalIncome}</small>
          <strong className="income">+{formatMoney(income, currency)}</strong>
          <em>{s.thisWeek}</em>
        </div>
        <div className="fs-stat">
          <small>{s.totalSpent}</small>
          <strong className="expense">−{formatMoney(spent, currency)}</strong>
          <em>{s.thisWeek}</em>
        </div>
      </div>

      <label className="fs-search">
        <Search size={18} aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={s.searchTx}
          aria-label={s.searchTx}
        />
      </label>

      <section className="fs-card p-4">
        <ul className="fs-tx-list">
          {list.length ? (
            list.map((tx) => {
              const incomeTx = tx.kind === 'income';
              const rating = rateTransaction(tx, data.plan);
              return (
                <li key={tx.id}>
                  <span className={`fs-tx-ic ${incomeTx ? 'income' : 'expense'}`}>
                    {incomeTx ? '↑' : '↓'}
                  </span>
                  <div>
                    <b>{tx.description || tx.category}</b>
                    <small>
                      {tx.category} · {formatDate(tx.occurred_at, settings.language)}
                    </small>
                    {rating && (
                      <span className={`fs-spend-badge ${rating}`} title={s.spendRatingHint}>
                        {ratingLabel(rating)}
                      </span>
                    )}
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
                <b>{s.noTx}</b>
                <small>{s.trySearch}</small>
              </div>
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
