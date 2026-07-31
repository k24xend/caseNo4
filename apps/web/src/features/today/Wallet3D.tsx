/**
 * Liquid Glass Wallet — R3F primary path.
 *
 * Design rules (product + mobile):
 * - One volumetric glass object (3 equal plates + clasp), not floating cards
 * - meshPhysicalMaterial only (no MeshTransmissionMaterial on mobile path)
 * - Text is DOM overlay on the front (Reserve) face — never drei Html in 3D space
 * - Closed: tight stack. Open: small fan (≤12° rotateX, ~0 rotateZ)
 */
import { ContactShadows, Environment, RoundedBox } from '@react-three/drei';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { a, useSpring } from '@react-spring/three';
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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

const C = {
  comfort: '#9A8AF4',
  obligations: '#C98272',
  reserve: '#7186C8',
  ink: '#171621',
} as const;

/** Equal plate size — tuned for 390–430px stage */
const PLATE = { w: 2.72, h: 1.62, d: 0.11, r: 0.2 } as const;

function prefersReducedMotion() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function supportsWebGL() {
  if (typeof document === 'undefined') return false;
  if (import.meta.env.MODE === 'test') return false;
  try {
    const el = document.createElement('canvas');
    return !!(
      el.getContext('webgl2', { failIfMajorPerformanceCaveat: false }) ||
      el.getContext('webgl', { failIfMajorPerformanceCaveat: false })
    );
  } catch {
    return false;
  }
}

function isOpenPhase(phase: WalletPhase) {
  return phase === 'opening' || phase === 'open' || phase === 'closing';
}

function openTarget(phase: WalletPhase) {
  return phase === 'open' || phase === 'opening' ? 1 : 0;
}

function isNarrow() {
  return typeof window !== 'undefined' && window.innerWidth < 480;
}

/** Thick liquid glass plate — physical only, no multi-pass transmission */
function GlassPlate({
  color,
  thickness,
  soft,
  children,
}: {
  color: string;
  thickness: number;
  soft?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <group>
      <RoundedBox args={[PLATE.w, PLATE.h, PLATE.d]} radius={PLATE.r} smoothness={5}>
        <meshPhysicalMaterial
          color={color}
          metalness={0.02}
          roughness={soft ? 0.14 : 0.07}
          transmission={soft ? 0.78 : 0.9}
          thickness={thickness}
          ior={1.42}
          transparent
          opacity={0.96}
          attenuationColor={color}
          attenuationDistance={soft ? 0.95 : 1.25}
          clearcoat={0.95}
          clearcoatRoughness={soft ? 0.12 : 0.06}
          envMapIntensity={soft ? 0.85 : 1.15}
          reflectivity={0.55}
          specularIntensity={1}
          side={THREE.FrontSide}
          depthWrite
        />
      </RoundedBox>
      {/* rim / edge highlight — slightly larger thin shell */}
      <RoundedBox
        args={[PLATE.w * 1.015, PLATE.h * 1.015, PLATE.d * 0.45]}
        radius={PLATE.r * 1.02}
        smoothness={4}
      >
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.11}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </RoundedBox>
      {/* soft inner liquid tint */}
      <RoundedBox
        args={[PLATE.w * 0.9, PLATE.h * 0.86, PLATE.d * 0.28]}
        radius={PLATE.r * 0.85}
        smoothness={3}
        position={[0, -0.02, 0.01]}
      >
        <meshBasicMaterial color={color} transparent opacity={0.16} depthWrite={false} />
      </RoundedBox>
      {children}
    </group>
  );
}

function CausticShimmer({ enabled }: { enabled: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock, invalidate }) => {
    if (!enabled || !ref.current || !mat.current) return;
    const t = clock.elapsedTime;
    mat.current.opacity = 0.05 + Math.sin(t * 1.25) * 0.02;
    ref.current.position.x = 0.25 + Math.sin(t * 0.55) * 0.06;
    ref.current.position.y = 0.08 + Math.cos(t * 0.4) * 0.04;
    ref.current.rotation.z = Math.sin(t * 0.3) * 0.12;
    invalidate();
  });
  if (!enabled) return null;
  return (
    <mesh ref={ref} position={[0.3, 0.05, 0.058]} scale={[1.15, 0.7, 1]}>
      <circleGeometry args={[0.55, 24]} />
      <meshBasicMaterial
        ref={mat}
        color="#ffffff"
        transparent
        opacity={0.06}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

function Clasp({
  x,
  y,
  z,
  rz,
  soft,
}: {
  x: unknown;
  y: unknown;
  z: unknown;
  rz: unknown;
  soft: boolean;
}) {
  return (
    <a.group position-x={x as never} position-y={y as never} position-z={z as never} rotation-z={rz as never}>
      <mesh>
        <capsuleGeometry args={[0.09, 0.2, 6, 14]} />
        <meshPhysicalMaterial
          color="#F4F6FC"
          metalness={0.12}
          roughness={0.08}
          transmission={soft ? 0.35 : 0.55}
          thickness={0.28}
          ior={1.4}
          clearcoat={1}
          clearcoatRoughness={0.05}
          transparent
          opacity={0.97}
          envMapIntensity={1.05}
        />
      </mesh>
      <mesh position={[0.02, 0, 0.065]}>
        <sphereGeometry args={[0.072, 18, 18]} />
        <meshPhysicalMaterial
          color="#FFFFFF"
          metalness={0.18}
          roughness={0.05}
          transmission={soft ? 0.2 : 0.4}
          thickness={0.2}
          clearcoat={1}
          clearcoatRoughness={0.03}
        />
      </mesh>
    </a.group>
  );
}

/**
 * Closed poses: dense stack, tiny Y/Z offsets.
 * Open poses: controlled fan — small Y/Z, rotateX ≤ ~11°, rotateZ ≈ 0.
 */
function WalletScene({
  phase,
  onOpen,
  reducedMotion,
}: {
  phase: WalletPhase;
  onOpen: () => void;
  reducedMotion: boolean;
}) {
  const target = openTarget(phase);
  const { invalidate } = useThree();
  const soft = reducedMotion;
  const root = useRef<THREE.Group>(null);
  const [pressed, setPressed] = useState(false);

  const spring = useSpring({
    o: target,
    config: soft
      ? { tension: 280, friction: 40, clamp: true }
      : { tension: 140, friction: 20, mass: 1.05 },
    onChange: () => invalidate(),
  });

  const press = useSpring({
    s: pressed ? 0.988 : 1,
    config: { tension: 380, friction: 24 },
    onChange: () => invalidate(),
  });

  useEffect(() => {
    invalidate();
    const ids = [30, 100, 260, 520, 800].map((ms) => window.setTimeout(() => invalidate(), ms));
    return () => ids.forEach(clearTimeout);
  }, [phase, invalidate]);

  useFrame(({ clock }) => {
    if (soft || target > 0.4 || !root.current) return;
    const t = clock.elapsedTime;
    // idle liquid: ~1–1.2° micro motion
    root.current.position.y = Math.sin(t * 0.85) * 0.014;
    root.current.rotation.z = Math.sin(t * 0.5) * THREE.MathUtils.degToRad(1.1);
    root.current.rotation.x = Math.cos(t * 0.4) * THREE.MathUtils.degToRad(0.6);
    invalidate();
  });

  const open = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (isOpenPhase(phase)) return;
      onOpen();
    },
    [onOpen, phase],
  );

  const o = spring.o;
  // Comfort (back)
  const cY = o.to((v) => 0.1 + v * 0.22);
  const cZ = o.to((v) => -0.14 - v * 0.28);
  const cRx = o.to((v) => THREE.MathUtils.degToRad(-2 - v * 9)); // max ~11°
  // Obligations (mid)
  const mY = o.to((v) => 0.0 + v * 0.08);
  const mZ = o.to((v) => -0.06 - v * 0.12);
  const mRx = o.to((v) => THREE.MathUtils.degToRad(-1 - v * 5));
  // Reserve (front)
  const fY = o.to((v) => -0.1 - v * 0.02);
  const fZ = o.to((v) => 0.04 + v * 0.06);
  const fRx = o.to((v) => THREE.MathUtils.degToRad(v * -1.5));

  return (
    <>
      <ambientLight intensity={0.48} />
      <directionalLight position={[2.6, 3.8, 2.2]} intensity={0.95} color="#fffafc" />
      <directionalLight position={[-2.2, 1.2, -1.4]} intensity={0.28} color="#c9d2ff" />
      <Environment preset="apartment" environmentIntensity={soft ? 0.32 : 0.58} />

      <a.group
        ref={root}
        scale={press.s}
        onClick={open}
        onPointerDown={(e) => {
          e.stopPropagation();
          setPressed(true);
        }}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
      >
        {/* Comfort — furthest */}
        <a.group position-y={cY as never} position-z={cZ as never} rotation-x={cRx as never}>
          <GlassPlate color={C.comfort} thickness={0.48} soft={soft} />
        </a.group>

        {/* Obligations */}
        <a.group position-y={mY as never} position-z={mZ as never} rotation-x={mRx as never}>
          <GlassPlate color={C.obligations} thickness={0.52} soft={soft} />
        </a.group>

        {/* Reserve — front */}
        <a.group position-y={fY as never} position-z={fZ as never} rotation-x={fRx as never}>
          <GlassPlate color={C.reserve} thickness={0.65} soft={soft}>
            <CausticShimmer enabled={!soft} />
            <Clasp
              soft={soft}
              x={o.to((v) => 1.22 + v * 0.06)}
              y={o.to((v) => 0.04 + v * 0.08)}
              z={o.to((v) => 0.1 + v * 0.05)}
              rz={o.to((v) => v * 0.18)}
            />
          </GlassPlate>
        </a.group>
      </a.group>

      <ContactShadows
        position={[0, -1.18, 0]}
        opacity={0.34}
        scale={5.8}
        blur={2.5}
        far={3.2}
        resolution={256}
        color="#3c3758"
      />
    </>
  );
}

/** Stable 2D labels — only front face content (Variant A) */
function ReserveDomOverlay({ amounts }: { amounts: WalletAmounts }) {
  return (
    <div className="w3d-dom-face" aria-hidden={false}>
      <div className="w3d-dom-face-inner">
        <div className="w3d-dom-head">
          <Shield size={15} aria-hidden />
          <span>Запас</span>
        </div>
        <div className="w3d-dom-amount">{formatMoney(amounts.reserve, amounts.currency)}</div>
        <div className="w3d-dom-safe">
          <Sparkles size={12} aria-hidden />
          <span>Безопасно сегодня</span>
          <strong>{formatMoney(amounts.safeDaily, amounts.currency)}</strong>
        </div>
        <div className="w3d-dom-lip">
          <span>
            Всего
            <b>{formatMoney(amounts.total, amounts.currency)}</b>
          </span>
          <span>
            Платежи
            <b>{formatMoney(amounts.obligations, amounts.currency)}</b>
          </span>
        </div>
      </div>
      {/* back-layer chips — minimal, non-3D */}
      <div className="w3d-dom-chip w3d-chip-comfort">
        <Coffee size={12} aria-hidden />
        <span>Комфорт</span>
        <em>{formatMoney(amounts.comfort, amounts.currency)}</em>
      </div>
      <div className="w3d-dom-chip w3d-chip-obl">
        <ReceiptText size={12} aria-hidden />
        <span>Платежи</span>
        <em>{formatMoney(amounts.obligations, amounts.currency)}</em>
      </div>
    </div>
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
      className="w3d-fallback"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label="Открыть кошелёк и историю"
      disabled={open}
      tabIndex={open ? -1 : 0}
      data-testid="wallet-stack"
    >
      <span className="w3d-fb-layer comfort">
        <span>
          <Coffee size={14} aria-hidden /> Комфорт
        </span>
        <b>{formatMoney(amounts.comfort, amounts.currency)}</b>
      </span>
      <span className="w3d-fb-layer obligations">
        <span>
          <ReceiptText size={14} aria-hidden /> Платежи
        </span>
        <b>{formatMoney(amounts.obligations, amounts.currency)}</b>
      </span>
      <span className="w3d-fb-layer reserve">
        <span className="clasp" aria-hidden>
          <span className="clasp-neck" />
          <i />
        </span>
        <span className="w3d-fb-head">
          <Shield size={14} aria-hidden /> Запас
        </span>
        <b className="w3d-fb-amount">{formatMoney(amounts.reserve, amounts.currency)}</b>
        <span className="safe-strip">
          <Sparkles size={12} aria-hidden />
          <span>Безопасно сегодня</span>
          <strong>{formatMoney(amounts.safeDaily, amounts.currency)}</strong>
        </span>
        <span className="w3d-fb-lip">
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
    const fn = () => setPageVisible(document.visibilityState === 'visible');
    fn();
    document.addEventListener('visibilitychange', fn);
    return () => document.removeEventListener('visibilitychange', fn);
  }, []);

  const dpr = useMemo<[number, number]>(() => {
    if (rm) return [1, 1];
    if (isNarrow()) return [1, 1.25];
    return [1, 1.5];
  }, [rm]);

  if (!webgl) {
    return (
      <section
        className={`w3d-root w3d-fallback-root ${open ? 'is-open' : ''}`}
        aria-label="Кошелёк"
        data-testid="wallet-stage"
      >
        <div className="w3d-aura" aria-hidden />
        <WalletDomFallback amounts={amounts} onOpen={onOpen} triggerRef={triggerRef} open={open} />
      </section>
    );
  }

  return (
    <section
      className={`w3d-root ${open ? 'is-open' : ''} ${rm ? 'is-reduced' : ''}`}
      aria-label="Кошелёк"
      data-testid="wallet-stage"
    >
      <div className="w3d-aura" aria-hidden />
      <div className="w3d-stage wallet-stack" data-testid="wallet-stack">
        <Canvas
          className="w3d-canvas"
          dpr={dpr}
          frameloop={pageVisible ? 'demand' : 'never'}
          gl={{
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance',
            stencil: false,
            depth: true,
          }}
          camera={{ position: [0, 0.02, 4.0], fov: 30, near: 0.1, far: 24 }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.07;
            gl.outputColorSpace = THREE.SRGBColorSpace;
          }}
          style={{ width: '100%', height: '100%', touchAction: 'manipulation' }}
        >
          <Suspense fallback={null}>
            <WalletScene phase={phase} onOpen={onOpen} reducedMotion={rm} />
          </Suspense>
        </Canvas>

        {/* Variant A: stable DOM labels over front plate only */}
        {!open && <ReserveDomOverlay amounts={amounts} />}

        <button
          ref={triggerRef}
          type="button"
          className="w3d-hit"
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
