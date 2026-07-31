/**
 * Liquid wallet — structure from vyhod-selected-direction-b only.
 * Closed: side-by-side Comfort | Платежи peeks + hero Запас + pearl clasp.
 */
import { useEffect, useState, type RefObject } from 'react';
import { Coffee, MapPin, ReceiptText } from 'lucide-react';
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

  useEffect(() => {
    if (open) setPressed(false);
  }, [open]);

  return (
    <section
      className={['rb-wallet', open ? 'is-open' : '', pressed ? 'is-pressed' : '', rm ? 'is-reduced' : '']
        .filter(Boolean)
        .join(' ')}
      aria-label="Кошелёк"
      data-testid="wallet-stage"
      data-wallet-layers="3"
      data-wallet-engine="ref-b"
    >
      <button
        ref={triggerRef}
        type="button"
        className="rb-wallet-btn"
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
        {/* Side peeks — Comfort | Платежи */}
        <div className="rb-peeks" aria-hidden={open}>
          <div className="rb-peek rb-peek-comfort" data-layer="comfort">
            <div className="rb-peek-head">
              <Coffee size={15} strokeWidth={1.8} aria-hidden />
              <span>Комфорт</span>
            </div>
            <strong className="rb-peek-amt">{formatMoney(amounts.comfort, amounts.currency)}</strong>
          </div>
          <div className="rb-peek rb-peek-obl" data-layer="obligations">
            <div className="rb-peek-head">
              <ReceiptText size={15} strokeWidth={1.8} aria-hidden />
              <span>Платежи</span>
            </div>
            <strong className="rb-peek-amt">{formatMoney(amounts.obligations, amounts.currency)}</strong>
          </div>
        </div>

        {/* Hero reserve */}
        <div className="rb-hero" data-layer="reserve">
          <div className="rb-hero-water" aria-hidden />
          <div className="rb-hero-sheen" aria-hidden />

          <div className="rb-pearl-clasp" aria-hidden>
            <span className="rb-clasp-body" />
            <span className="rb-pearl" />
          </div>

          <div className="rb-hero-head">
            <MapPin size={14} strokeWidth={1.9} aria-hidden />
            <span>Запас</span>
          </div>

          <p className="rb-hero-amt">{formatMoney(amounts.reserve, amounts.currency)}</p>

          <div className="rb-safe">
            <span>Безопасно сегодня</span>
            <i aria-hidden />
            <strong>{formatMoney(amounts.safeDaily, amounts.currency)}</strong>
          </div>

          <div className="rb-lip">
            <span>
              <em>Всего</em>
              <b>{formatMoney(amounts.total, amounts.currency)}</b>
            </span>
            <span className="rb-lip-div" aria-hidden />
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
