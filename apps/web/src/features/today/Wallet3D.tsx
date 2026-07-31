import { ContactShadows, Environment, Html, RoundedBox } from '@react-three/drei';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { a, useSpring } from '@react-spring/three';
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import * as THREE from 'three';
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

type Wallet3DProps = {
  phase: WalletPhase;
  amounts: WalletAmounts;
  onOpen: () => void;
  triggerRef?: RefObject<HTMLButtonElement | null>;
  reducedMotion?: boolean;
};

const TOKENS = {
  comfort: '#9A8AF4',
  obligations: '#C98272',
  reserve: '#7186C8',
  ink: '#171621',
} as const;

const LAYER = { w: 2.55, h: 1.52, d: 0.075, r: 0.15 } as const;

function prefersReducedMotion() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function supportsWebGL() {
  if (typeof document === 'undefined') return false;
  if (import.meta.env.MODE === 'test') return false;
  try {
    const c = document.createElement('canvas');
    const gl =
      c.getContext('webgl2', { failIfMajorPerformanceCaveat: false }) ||
      c.getContext('webgl', { failIfMajorPerformanceCaveat: false });
    return !!gl;
  } catch {
    return false;
  }
}

function isOpenPhase(phase: WalletPhase) {
  return phase === 'opening' || phase === 'open' || phase === 'closing';
}

function openTarget(phase: WalletPhase) {
  if (phase === 'open' || phase === 'opening') return 1;
  if (phase === 'closing') return 0;
  return 0;
}

function GlassPlate({
  color,
  thickness,
  light,
  children,
  onClick,
}: {
  color: string;
  thickness: number;
  light?: boolean;
  children?: ReactNode;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}) {
  return (
    <group onClick={onClick}>
      <RoundedBox args={[LAYER.w, LAYER.h, LAYER.d]} radius={LAYER.r} smoothness={3}>
        <meshPhysicalMaterial
          color={color}
          metalness={light ? 0.06 : 0.04}
          roughness={light ? 0.2 : 0.1}
          transmission={light ? 0.55 : 0.88}
          thickness={thickness}
          ior={1.45}
          transparent
          opacity={0.94}
          attenuationColor={color}
          attenuationDistance={light ? 0.9 : 1.35}
          clearcoat={0.7}
          clearcoatRoughness={0.14}
          envMapIntensity={light ? 0.65 : 1.15}
          reflectivity={0.55}
          side={THREE.DoubleSide}
        />
      </RoundedBox>
      <RoundedBox args={[LAYER.w * 0.992, LAYER.h * 0.992, LAYER.d * 1.08]} radius={LAYER.r} smoothness={2}>
        <meshBasicMaterial color="#ffffff" transparent opacity={0.06} side={THREE.BackSide} />
      </RoundedBox>
      {children}
    </group>
  );
}

function WalletScene({
  phase,
  amounts,
  onOpen,
  reducedMotion,
}: {
  phase: WalletPhase;
  amounts: WalletAmounts;
  onOpen: () => void;
  reducedMotion: boolean;
}) {
  const target = openTarget(phase);
  const { invalidate } = useThree();
  const light = reducedMotion;

  const spring = useSpring({
    o: target,
    config: reducedMotion
      ? { tension: 280, friction: 40, clamp: true }
      : { tension: 150, friction: 22, mass: 1.05 },
    onChange: () => invalidate(),
  });

  useEffect(() => {
    invalidate();
    const t1 = window.setTimeout(() => invalidate(), 40);
    const t2 = window.setTimeout(() => invalidate(), 520);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [phase, invalidate]);

  const handleOpen = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (isOpenPhase(phase)) return;
      onOpen();
    },
    [onOpen, phase],
  );

  const label: CSSProperties = {
    color: TOKENS.ink,
    fontFamily: 'inherit',
    pointerEvents: 'none',
    userSelect: 'none',
    width: 220,
  };

  return (
    <>
      <ambientLight intensity={0.58} />
      <directionalLight position={[2.8, 3.8, 2.6]} intensity={0.9} />
      <Environment preset="city" environmentIntensity={light ? 0.35 : 0.6} />

      {/* Comfort */}
      <a.group
        position-y={spring.o.to((o) => 0.4 + o * (light ? 0.25 : 0.58))}
        position-z={spring.o.to((o) => -0.2 - o * (light ? 0.15 : 0.62))}
        rotation-x={spring.o.to((o) => -0.1 - o * (light ? 0.08 : 0.42))}
        rotation-z={spring.o.to((o) => -o * 0.05)}
        scale={spring.o.to((o) => 0.955 - o * 0.03)}
      >
        <GlassPlate color={TOKENS.comfort} thickness={0.42} light={light} onClick={handleOpen}>
          <Html position={[-0.9, 0.38, 0.055]} style={label} zIndexRange={[20, 0]}>
            <div className="w3d-label">
              <span className="w3d-label-row">
                <Coffee size={14} aria-hidden />
                <small>Комфорт</small>
              </span>
              <b>{formatMoney(amounts.comfort, amounts.currency)}</b>
            </div>
          </Html>
        </GlassPlate>
      </a.group>

      {/* Obligations */}
      <a.group
        position-y={spring.o.to((o) => 0.12 + o * (light ? 0.1 : 0.2))}
        position-z={spring.o.to((o) => -0.09 - o * (light ? 0.08 : 0.3))}
        rotation-x={spring.o.to((o) => -0.05 - o * (light ? 0.04 : 0.2))}
        rotation-z={spring.o.to((o) => o * 0.035)}
        scale={spring.o.to((o) => 0.978 - o * 0.015)}
      >
        <GlassPlate color={TOKENS.obligations} thickness={0.48} light={light} onClick={handleOpen}>
          <Html position={[-0.9, 0.38, 0.055]} style={label} zIndexRange={[25, 0]}>
            <div className="w3d-label">
              <span className="w3d-label-row">
                <ReceiptText size={14} aria-hidden />
                <small>Платежи</small>
              </span>
              <b>{formatMoney(amounts.obligations, amounts.currency)}</b>
            </div>
          </Html>
        </GlassPlate>
      </a.group>

      {/* Reserve + clasp */}
      <a.group
        position-y={spring.o.to((o) => -0.16 - o * 0.06)}
        position-z={spring.o.to((o) => 0.05 + o * 0.08)}
        rotation-x={spring.o.to((o) => -o * 0.05)}
        scale={spring.o.to((o) => 1 + o * 0.015)}
      >
        <GlassPlate color={TOKENS.reserve} thickness={0.62} light={light} onClick={handleOpen}>
          <a.group
            position-x={spring.o.to((o) => 1.1 + o * 0.1)}
            position-y={spring.o.to((o) => 0.02 + o * 0.18)}
            position-z={spring.o.to((o) => 0.1 + o * 0.12)}
            rotation-z={spring.o.to((o) => o * 0.4)}
          >
            <mesh>
              <capsuleGeometry args={[0.085, 0.2, 6, 12]} />
              <meshPhysicalMaterial
                color="#EEF0FA"
                metalness={0.18}
                roughness={0.1}
                transmission={light ? 0.25 : 0.55}
                thickness={0.3}
                ior={1.4}
                clearcoat={0.85}
                clearcoatRoughness={0.08}
                transparent
                opacity={0.96}
              />
            </mesh>
            <mesh position={[0.015, 0, 0.055]}>
              <sphereGeometry args={[0.07, 16, 16]} />
              <meshPhysicalMaterial
                color="#FBFCFF"
                metalness={0.22}
                roughness={0.07}
                transmission={light ? 0.2 : 0.42}
                thickness={0.22}
                clearcoat={1}
                clearcoatRoughness={0.04}
              />
            </mesh>
            <Html center className="clasp" style={{ width: 52, height: 42, pointerEvents: 'none' }}>
              <span className="clasp-neck" aria-hidden />
              <i aria-hidden />
            </Html>
          </a.group>

          <Html
            position={[-0.9, 0.42, 0.055]}
            style={{ ...label, width: 236 }}
            zIndexRange={[35, 0]}
          >
            <div className="w3d-label w3d-label-reserve">
              <span className="w3d-label-row">
                <Shield size={14} aria-hidden />
                <small>Запас</small>
              </span>
              <b className="w3d-amount">{formatMoney(amounts.reserve, amounts.currency)}</b>
              <span className="w3d-safe safe-strip">
                <Sparkles size={12} aria-hidden />
                <span>Безопасно сегодня</span>
                <strong>{formatMoney(amounts.safeDaily, amounts.currency)}</strong>
              </span>
              <span className="w3d-lip wallet-lip">
                <em>
                  Всего <b>{formatMoney(amounts.total, amounts.currency)}</b>
                </em>
                <em>
                  Платежи <b>{formatMoney(amounts.obligations, amounts.currency)}</b>
                </em>
              </span>
            </div>
          </Html>
        </GlassPlate>
      </a.group>

      <ContactShadows
        position={[0, -1.2, 0]}
        opacity={0.32}
        scale={5.5}
        blur={2.4}
        far={3.2}
        resolution={256}
        color="#4a4570"
      />
    </>
  );
}

function WalletDomFallback({
  amounts,
  onOpen,
  triggerRef,
  open,
}: {
  amounts: WalletAmounts;
  onOpen: () => void;
  triggerRef?: RefObject<HTMLButtonElement | null>;
  open: boolean;
}) {
  return (
    <button
      ref={triggerRef}
      type="button"
      className="wallet-stack wallet-stack-fallback"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label="Открыть кошелёк и историю"
      disabled={open}
      tabIndex={open ? -1 : 0}
      data-testid="wallet-stack"
    >
      <span className="wallet-layer comfort">
        <span className="wallet-layer-heading">
          <Coffee aria-hidden />
          <small>Комфорт</small>
        </span>
        <b>{formatMoney(amounts.comfort, amounts.currency)}</b>
      </span>
      <span className="wallet-layer obligations">
        <span className="wallet-layer-heading">
          <ReceiptText aria-hidden />
          <small>Платежи</small>
        </span>
        <b>{formatMoney(amounts.obligations, amounts.currency)}</b>
      </span>
      <span className="wallet-layer reserve">
        <span className="clasp" aria-hidden>
          <span className="clasp-neck" />
          <i />
        </span>
        <span className="wallet-layer-heading">
          <Shield aria-hidden />
          <small>Запас</small>
        </span>
        <b className="wallet-amount">{formatMoney(amounts.reserve, amounts.currency)}</b>
        <span className="safe-strip">
          <Sparkles aria-hidden />
          <span>Безопасно сегодня</span>
          <strong>{formatMoney(amounts.safeDaily, amounts.currency)}</strong>
        </span>
        <span className="wallet-lip">
          <em>
            Всего <b>{formatMoney(amounts.total, amounts.currency)}</b>
          </em>
          <em>
            Платежи <b>{formatMoney(amounts.obligations, amounts.currency)}</b>
          </em>
        </span>
      </span>
    </button>
  );
}

export function LiquidWallet({ phase, amounts, onOpen, triggerRef, reducedMotion }: Wallet3DProps) {
  const open = isOpenPhase(phase);
  const [pageVisible, setPageVisible] = useState(true);
  const [webgl, setWebgl] = useState(false);
  const rm = reducedMotion ?? prefersReducedMotion();

  useEffect(() => {
    setWebgl(supportsWebGL() && import.meta.env.MODE !== 'test');
  }, []);

  useEffect(() => {
    const onVis = () => setPageVisible(document.visibilityState === 'visible');
    onVis();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const dpr = useMemo<[number, number]>(() => [1, rm ? 1 : 1.5], [rm]);

  if (!webgl) {
    return (
      <section className={`wallet3d-root ${open ? 'is-open' : ''}`} aria-label="Кошелёк" data-testid="wallet-stage">
        <div className="wallet-aura" aria-hidden />
        <WalletDomFallback amounts={amounts} onOpen={onOpen} triggerRef={triggerRef} open={open} />
      </section>
    );
  }

  return (
    <section
      className={`wallet3d-root ${open ? 'is-open' : ''} ${rm ? 'reduced-motion' : ''}`}
      aria-label="Кошелёк"
      data-testid="wallet-stage"
    >
      <div className="wallet-aura" aria-hidden />
      <div className="wallet-stack wallet3d-canvas-wrap" data-testid="wallet-stack">
        <Canvas
          className="wallet3d-canvas"
          dpr={dpr}
          frameloop={pageVisible ? 'demand' : 'never'}
          gl={{
            alpha: true,
            antialias: !rm,
            powerPreference: 'high-performance',
            stencil: false,
            depth: true,
          }}
          camera={{ position: [0, 0.12, 4.15], fov: 32, near: 0.1, far: 30 }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.04;
          }}
          style={{ width: '100%', height: '100%', touchAction: 'manipulation' }}
        >
          <Suspense fallback={null}>
            <WalletScene phase={phase} amounts={amounts} onOpen={onOpen} reducedMotion={rm} />
          </Suspense>
        </Canvas>
        <button
          ref={triggerRef}
          type="button"
          className="wallet3d-hit"
          onClick={onOpen}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label="Открыть кошелёк и историю"
          disabled={open}
          tabIndex={open ? -1 : 0}
        />
      </div>
    </section>
  );
}
