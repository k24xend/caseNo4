/**
 * Wallet stack — three fanned glass layers (Comfort → Obligations → Reserve + clasp).
 * Structure 1:1 with design reference; Tailwind + semantic tokens only.
 */
import type { RefObject } from 'react';
import { Coffee, ReceiptText, Shield, Sparkles } from 'lucide-react';
import { formatMoney } from '../../domain/money';
import type { Currency } from '../../domain/models';
import { cn } from '../../lib/utils';

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
      data-wallet-engine="shadcn-glass"
    >
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          'wallet-stack relative w-full border-0 bg-transparent p-0 text-left',
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
        {/* Comfort — top peek */}
        <div
          className={cn(
            'relative z-0 mx-2 rounded-xl border border-white/50 bg-layer-comfort/90 px-4 py-3 shadow-glass backdrop-blur-xl transition-transform duration-300',
            open ? '-translate-y-1 scale-95 opacity-70' : 'translate-y-0',
          )}
          data-layer="comfort"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Coffee className="h-4 w-4" aria-hidden />
              <span className="font-medium">Комфорт</span>
            </div>
            <p className="text-sm font-semibold tabular-nums text-foreground/80">
              {formatMoney(amounts.comfort, amounts.currency)}
            </p>
          </div>
        </div>

        {/* Obligations — middle peek */}
        <div
          className={cn(
            'relative z-10 -mt-2 mx-1 rounded-xl border border-white/50 bg-layer-obligations/90 px-4 py-3 shadow-glass backdrop-blur-xl transition-transform duration-300',
            open ? 'translate-y-0 scale-95 opacity-80' : 'translate-y-0',
          )}
          data-layer="obligations"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ReceiptText className="h-4 w-4" aria-hidden />
              <span className="font-medium">Платежи</span>
            </div>
            <p className="text-sm font-semibold tabular-nums text-foreground/80">
              {formatMoney(amounts.obligations, amounts.currency)}
            </p>
          </div>
        </div>

        {/* Reserve — hero card + clasp */}
        <div
          className={cn(
            'relative z-20 -mt-2 rounded-xl border border-white/60 bg-layer-reserve/95 p-6 shadow-md backdrop-blur-xl transition-transform duration-300',
            open ? 'translate-y-1' : 'translate-y-0',
          )}
          data-layer="reserve"
        >
          {/* Clasp — metallic pill on right edge */}
          <div
            className="clasp absolute -right-1 top-1/2 z-30 flex h-12 w-8 -translate-y-1/2 items-center justify-center rounded-l-lg rounded-r-md border border-white/70 bg-gradient-to-b from-white to-secondary shadow-clasp"
            aria-hidden
          >
            <span className="clasp-neck sr-only" />
            <i className="block h-5 w-1.5 rounded-full bg-primary/30 shadow-sm" />
          </div>

          <div className="flex items-center gap-2 pr-8 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" aria-hidden />
            <span className="font-medium">Запас</span>
          </div>

          <p className="wallet-amount mt-3 text-4xl font-semibold tracking-tight tabular-nums text-foreground">
            {formatMoney(amounts.reserve, amounts.currency)}
          </p>

          <div className="safe-strip mt-4 inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/60 px-3 py-2 text-sm text-secondary-foreground shadow-sm backdrop-blur">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            <span>Безопасно сегодня</span>
            <strong className="font-semibold tabular-nums">
              {formatMoney(amounts.safeDaily, amounts.currency)}
            </strong>
          </div>

          <div className="mt-6 flex items-end justify-between gap-4 border-t border-border/60 pt-4">
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
        </div>
      </button>

      {!open && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Нажмите, чтобы открыть историю
        </p>
      )}
    </section>
  );
}
