/**
 * Wallet stack — three semantic Cards (shadcn/Tailwind only).
 * Structure mirrors product reference: Comfort → Obligations → Reserve + clasp cue.
 */
import type { RefObject } from 'react';
import { Coffee, ReceiptText, Shield, Sparkles } from 'lucide-react';
import { formatMoney } from '../../domain/money';
import type { Currency } from '../../domain/models';
import { cn } from '../../lib/utils';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';

export type WalletPhase = 'closed' | 'opening' | 'open' | 'closing';

export type WalletAmounts = {
  comfort: number;
  obligations: number;
  reserve: number;
  total: number;
  safeDaily: number;
  currency: Currency;
};

type Props = {
  phase: WalletPhase;
  amounts: WalletAmounts;
  onOpen: () => void;
  triggerRef?: RefObject<HTMLButtonElement | null>;
  reducedMotion?: boolean;
};

function isOpenPhase(phase: WalletPhase) {
  return phase === 'opening' || phase === 'open' || phase === 'closing';
}

export function LiquidWallet({ phase, amounts, onOpen, triggerRef }: Props) {
  const open = isOpenPhase(phase);

  return (
    <section
      className="w-full"
      aria-label="Кошелёк"
      data-testid="wallet-stage"
      data-wallet-layers="3"
      data-wallet-engine="shadcn"
    >
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          'wallet-stack group relative w-full space-y-0 border-0 bg-transparent p-0 text-left',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:cursor-default',
        )}
        data-testid="wallet-stack"
        onClick={onOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Открыть кошелёк и историю"
        disabled={open}
        tabIndex={open ? -1 : 0}
      >
        {/* Comfort */}
        <Card
          className={cn(
            'relative z-0 border-border bg-secondary/80 p-4 shadow-sm transition-transform duration-300',
            open ? '-translate-y-2 scale-95 opacity-80' : 'translate-y-0',
            'group-active:scale-[0.99]',
          )}
          data-layer="comfort"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Coffee className="h-4 w-4" aria-hidden />
            <span className="font-medium">Комфорт</span>
          </div>
          <p className="mt-2 text-base font-semibold tabular-nums text-foreground">
            {formatMoney(amounts.comfort, amounts.currency)}
          </p>
        </Card>

        {/* Obligations */}
        <Card
          className={cn(
            'relative z-10 -mt-4 border-border bg-muted p-4 shadow-sm transition-transform duration-300',
            open ? '-translate-y-1 scale-95 opacity-90' : 'translate-y-0',
            'group-active:scale-[0.99]',
          )}
          data-layer="obligations"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ReceiptText className="h-4 w-4" aria-hidden />
            <span className="font-medium">Платежи</span>
          </div>
          <p className="mt-2 text-base font-semibold tabular-nums text-foreground">
            {formatMoney(amounts.obligations, amounts.currency)}
          </p>
        </Card>

        {/* Reserve */}
        <Card
          className={cn(
            'relative z-20 -mt-4 border-border bg-card p-6 shadow-md transition-transform duration-300',
            open ? 'translate-y-1' : 'translate-y-0',
            'group-active:scale-[0.99]',
          )}
          data-layer="reserve"
        >
          <div
            className="clasp absolute right-4 top-6 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background shadow-sm"
            aria-hidden
          >
            <span className="clasp-neck sr-only" />
            <i className="block h-3 w-3 rounded-md bg-primary/80" />
          </div>

          <div className="flex items-center gap-2 pr-12 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" aria-hidden />
            <span className="font-medium">Запас</span>
          </div>

          <p className="wallet-amount mt-3 text-3xl font-semibold tracking-tight tabular-nums text-foreground md:text-3xl">
            {formatMoney(amounts.reserve, amounts.currency)}
          </p>

          <div className="safe-strip mt-4 inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            <span>Безопасно сегодня</span>
            <strong className="font-semibold tabular-nums">
              {formatMoney(amounts.safeDaily, amounts.currency)}
            </strong>
          </div>

          <div className="mt-6 flex items-end justify-between gap-4 border-t border-border pt-4">
            <div>
              <p className="text-sm text-muted-foreground">Всего</p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {formatMoney(amounts.total, amounts.currency)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Платежи</p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {formatMoney(amounts.obligations, amounts.currency)}
              </p>
            </div>
          </div>
        </Card>
      </button>

      {!open && (
        <p className="mt-3 text-center text-sm text-muted-foreground">Нажмите, чтобы открыть историю</p>
      )}
    </section>
  );
}
