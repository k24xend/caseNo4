/**
 * Liquid Glass Wallet — CSS 3D primary (reference structure 1:1).
 *
 * Three independent volumetric cards:
 *   Comfort (violet, back) → Obligations (terracotta, mid) → Reserve (blue-violet, front)
 * Reserve: large amount, safe-strip, lip, clasp.
 *
 * Why CSS 3D: R3F + canvas textures produced clipped/stretched text and
 * a fused single panel on mobile. CSS delivers readable type + true layered glass.
 */
import { useEffect, useState, type RefObject } from 'react';
import { Coffee, ReceiptText, Shield, Sparkles } from 'lucide-react';
import { formatMoney } from '../../domain/money';
import type { Currency } from '../../domain/models';

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

export function LiquidWallet({ phase, amounts, onOpen, triggerRef, reducedMotion }: Props) {
  const open = isOpenPhase(phase);
  const [pressed, setPressed] = useState(false);
  const rm =
    reducedMotion ??
    (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);

  // reset press if dialog opens
  useEffect(() => {
    if (open) setPressed(false);
  }, [open]);

  return (
    <section
      className={[
        'lq-wallet',
        open ? 'is-open' : '',
        pressed ? 'is-pressed' : '',
        rm ? 'is-reduced' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Кошелёк"
      data-testid="wallet-stage"
      data-wallet-layers="3"
      data-wallet-engine="css-3d"
    >
      <div className="lq-aura" aria-hidden />

      <button
        ref={triggerRef}
        type="button"
        className="lq-stack wallet-stack"
        data-testid="wallet-stack"
        onClick={onOpen}
        onPointerDown={() => !open && setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Открыть кошелёк и историю"
        disabled={open}
        tabIndex={open ? -1 : 0}
      >
        {/* —— Layer 1: Comfort (back) —— */}
        <div className="lq-layer lq-comfort" data-layer="comfort">
          <div className="lq-sheen" aria-hidden />
          <div className="lq-head">
            <Coffee size={15} strokeWidth={1.75} aria-hidden />
            <span>Комфорт</span>
          </div>
          <div className="lq-amt">{formatMoney(amounts.comfort, amounts.currency)}</div>
        </div>

        {/* —— Layer 2: Obligations (mid) —— */}
        <div className="lq-layer lq-obligations" data-layer="obligations">
          <div className="lq-sheen" aria-hidden />
          <div className="lq-head">
            <ReceiptText size={15} strokeWidth={1.75} aria-hidden />
            <span>Платежи</span>
          </div>
          <div className="lq-amt">{formatMoney(amounts.obligations, amounts.currency)}</div>
        </div>

        {/* —— Layer 3: Reserve (front) —— */}
        <div className="lq-layer lq-reserve" data-layer="reserve">
          <div className="lq-sheen lq-sheen-strong" aria-hidden />
          <div className="lq-caustic" aria-hidden />

          <div className="clasp lq-clasp" aria-hidden>
            <span className="clasp-neck" />
            <i />
          </div>

          <div className="lq-head">
            <Shield size={15} strokeWidth={1.75} aria-hidden />
            <span>Запас</span>
          </div>
          <div className="lq-amt lq-amt-xl">{formatMoney(amounts.reserve, amounts.currency)}</div>

          <div className="lq-safe safe-strip">
            <Sparkles size={13} strokeWidth={1.75} aria-hidden />
            <span>Безопасно сегодня</span>
            <strong>{formatMoney(amounts.safeDaily, amounts.currency)}</strong>
          </div>

          <div className="lq-lip">
            <span>
              <em>Всего</em>
              <b>{formatMoney(amounts.total, amounts.currency)}</b>
            </span>
            <span>
              <em>Платежи</em>
              <b>{formatMoney(amounts.obligations, amounts.currency)}</b>
            </span>
          </div>
        </div>
      </button>
    </section>
  );
}
