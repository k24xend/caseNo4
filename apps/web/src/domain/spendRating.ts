import type { Plan, Transaction } from './models';

/** How a spend sits against the plan’s safe daily budget. */
export type SpendRating = 'ok' | 'caution' | 'critical';

/**
 * Rate an expense relative to safe daily spend and plan state.
 * Income and non-expense kinds return null (no badge).
 */
export function rateTransaction(
  tx: Pick<Transaction, 'kind' | 'amount' | 'category'>,
  plan: Pick<Plan, 'state' | 'snapshot'> | undefined,
): SpendRating | null {
  if (tx.kind !== 'expense' && tx.kind !== 'debt_payment') return null;

  const safeDaily = Math.max(0, plan?.snapshot.safe_daily_amount ?? 0);
  const state = plan?.state ?? 'stabilization';
  const category = (tx.category || '').toLowerCase();

  // Fixed / life-support categories get a softer reading when modest.
  const essential =
    /аренд|rent|ипотек|mortgage|коммун|utility|связ|internet|транспорт|transport|проезд|продукт|grocery|food|еда|medicine|аптек|health|страхов|insurance|долг|debt|кредит|loan/.test(
      category,
    );

  // Fun / impulse categories get a stricter reading.
  const discretionary =
    /кафе|cafe|рестор|restaurant|бар|bar|развлеч|entertainment|игр|game|подписк|subscription|шоп|shop|одежд|fashion|космет|beauty|доставк|delivery/.test(
      category,
    );

  if (safeDaily <= 0) {
    if (state === 'critical' || state === 'stabilization') return 'critical';
    return essential ? 'caution' : 'critical';
  }

  let ratio = tx.amount / safeDaily;
  if (essential) ratio *= 0.75;
  if (discretionary) ratio *= 1.25;
  if (tx.kind === 'debt_payment') ratio *= 0.55;

  // In critical plan state, anything above half a day is already heavy.
  if (state === 'critical') {
    if (ratio <= 0.35) return 'ok';
    if (ratio <= 0.85) return 'caution';
    return 'critical';
  }

  if (ratio <= 0.55) return 'ok';
  if (ratio <= 1.15) return 'caution';
  return 'critical';
}
