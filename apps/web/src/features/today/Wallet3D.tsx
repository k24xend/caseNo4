/**
 * Liquid Glass Wallet — three distinct volumetric plates (reference 1:1 structure).
 *
 * Comfort (back) → Obligations (mid) → Reserve (front + clasp + safe + lip)
 * Text: canvas textures on each plate (stable, no drei Html drift).
 * Material: meshPhysicalMaterial liquid glass only (no MTM).
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

const COL = {
  comfort: '#9A8AF4',
  obligations: '#C98272',
  reserve: '#7186C8',
  ink: '#1a1830',
  muted: '#4a4660',
} as const;

/** Equal size plates — clearly three cards when stacked with Y offsets */
const PLATE = { w: 2.78, h: 1.55, d: 0.12, r: 0.19 } as const;

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

/** Bake layer UI into a transparent canvas texture — never drifts like drei Html */
function useLayerTexture(
  kind: 'comfort' | 'obligations' | 'reserve',
  title: string,
  amount: string,
  extra?: { safe?: string; total?: string; payments?: string },
) {
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    const W = 1024;
    const H = 576;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, W, H);
    ctx.textBaseline = 'alphabetic';

    // soft top specular band
    const gloss = ctx.createLinearGradient(0, 0, 0, H * 0.45);
    gloss.addColorStop(0, 'rgba(255,255,255,0.22)');
    gloss.addColorStop(0.55, 'rgba(255,255,255,0.04)');
    gloss.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gloss;
    ctx.fillRect(48, 36, W - 96, H * 0.38);

    // title row
    ctx.fillStyle = 'rgba(26,24,48,0.62)';
    ctx.font = '600 42px system-ui, -apple-system, sans-serif';
    ctx.fillText(title, 88, 110);

    // amount
    const big = kind === 'reserve';
    ctx.fillStyle = COL.ink;
    ctx.font = big
      ? '600 120px system-ui, -apple-system, sans-serif'
      : '600 64px system-ui, -apple-system, sans-serif';
    // ellipsis if needed
    let amt = amount;
    while (ctx.measureText(amt).width > W - 160 && amt.length > 4) {
      amt = `${amt.slice(0, -2)}…`;
    }
    ctx.fillText(amt, 88, big ? 250 : 200);

    if (kind === 'reserve' && extra) {
      // safe strip
      const stripY = 300;
      const stripH = 64;
      const stripX = 88;
      const stripW = Math.min(620, W - 176);
      ctx.beginPath();
      roundRect(ctx, stripX, stripY, stripW, stripH, 32);
      const sg = ctx.createLinearGradient(stripX, stripY, stripX + stripW, stripY);
      sg.addColorStop(0, 'rgba(129,116,232,0.28)');
      sg.addColorStop(1, 'rgba(113,134,200,0.32)');
      ctx.fillStyle = sg;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(40,36,70,0.82)';
      ctx.font = '600 30px system-ui, -apple-system, sans-serif';
      ctx.fillText(`✦  ${extra.safe ?? ''}`, stripX + 28, stripY + 42);

      // lip
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.moveTo(72, H - 120);
      ctx.lineTo(W - 72, H - 120);
      ctx.stroke();
      ctx.fillStyle = 'rgba(40,36,70,0.55)';
      ctx.font = '500 28px system-ui, -apple-system, sans-serif';
      ctx.fillText('Всего', 88, H - 78);
      ctx.fillText('Платежи', W - 320, H - 78);
      ctx.fillStyle = COL.ink;
      ctx.font = '700 34px system-ui, -apple-system, sans-serif';
      ctx.fillText(extra.total ?? '', 88, H - 36);
      const pay = extra.payments ?? '';
      const pw = ctx.measureText(pay).width;
      ctx.fillText(pay, W - 88 - pw, H - 36);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  }, [kind, title, amount, extra?.safe, extra?.total, extra?.payments]);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function GlassPlate({
  color,
  thickness,
  soft,
  labelTexture,
  children,
}: {
  color: string;
  thickness: number;
  soft?: boolean;
  labelTexture: THREE.CanvasTexture | null;
  children?: React.ReactNode;
}) {
  return (
    <group>
      {/* body */}
      <RoundedBox args={[PLATE.w, PLATE.h, PLATE.d]} radius={PLATE.r} smoothness={5}>
        <meshPhysicalMaterial
          color={color}
          metalness={0.02}
          roughness={soft ? 0.13 : 0.065}
          transmission={soft ? 0.8 : 0.9}
          thickness={thickness}
          ior={1.42}
          transparent
          opacity={0.97}
          attenuationColor={color}
          attenuationDistance={soft ? 0.9 : 1.2}
          clearcoat={0.98}
          clearcoatRoughness={soft ? 0.1 : 0.05}
          envMapIntensity={soft ? 0.9 : 1.2}
          reflectivity={0.58}
          side={THREE.FrontSide}
        />
      </RoundedBox>
      {/* rim shell */}
      <RoundedBox
        args={[PLATE.w * 1.012, PLATE.h * 1.012, PLATE.d * 0.42]}
        radius={PLATE.r * 1.02}
        smoothness={4}
      >
        <meshBasicMaterial color="#ffffff" transparent opacity={0.12} side={THREE.BackSide} depthWrite={false} />
      </RoundedBox>
      {/* inner liquid tint */}
      <RoundedBox
        args={[PLATE.w * 0.9, PLATE.h * 0.86, PLATE.d * 0.3]}
        radius={PLATE.r * 0.82}
        smoothness={3}
        position={[0, 0, 0.01]}
      >
        <meshBasicMaterial color={color} transparent opacity={0.18} depthWrite={false} />
      </RoundedBox>
      {/* stable UI plane (slightly above face) */}
      {labelTexture && (
        <mesh position={[0, 0, PLATE.d / 2 + 0.012]}>
          <planeGeometry args={[PLATE.w * 0.9, PLATE.h * 0.86]} />
          <meshBasicMaterial map={labelTexture} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      {children}
    </group>
  );
}

function Caustic({ on }: { on: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock, invalidate }) => {
    if (!on || !mesh.current || !mat.current) return;
    const t = clock.elapsedTime;
    mat.current.opacity = 0.045 + Math.sin(t * 1.3) * 0.018;
    mesh.current.position.x = 0.35 + Math.sin(t * 0.5) * 0.05;
    mesh.current.position.y = 0.1 + Math.cos(t * 0.35) * 0.04;
    invalidate();
  });
  if (!on) return null;
  return (
    <mesh ref={mesh} position={[0.4, 0.1, PLATE.d / 2 + 0.02]}>
      <circleGeometry args={[0.5, 24]} />
      <meshBasicMaterial
        ref={mat}
        color="#ffffff"
        transparent
        opacity={0.05}
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
        <capsuleGeometry args={[0.095, 0.22, 6, 14]} />
        <meshPhysicalMaterial
          color="#F3F5FC"
          metalness={0.14}
          roughness={0.07}
          transmission={soft ? 0.35 : 0.58}
          thickness={0.3}
          ior={1.4}
          clearcoat={1}
          clearcoatRoughness={0.04}
          transparent
          opacity={0.98}
        />
      </mesh>
      <mesh position={[0.02, 0, 0.07]}>
        <sphereGeometry args={[0.078, 18, 18]} />
        <meshPhysicalMaterial
          color="#FFFFFF"
          metalness={0.2}
          roughness={0.04}
          transmission={soft ? 0.2 : 0.42}
          thickness={0.22}
          clearcoat={1}
          clearcoatRoughness={0.03}
        />
      </mesh>
      {/* DOM hit target for e2e .clasp */}
      <mesh position={[0, 0, 0.12]} visible={false}>
        <boxGeometry args={[0.28, 0.28, 0.05]} />
      </mesh>
    </a.group>
  );
}

/**
 * Poses — three clearly separated cards.
 * Closed: stacked with visible top strips of each layer (reference stack).
 * Open: gentle fan, rotateX ≤ 10°, rotateZ ≈ 0.
 */
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
  const soft = reducedMotion;
  const root = useRef<THREE.Group>(null);
  const [pressed, setPressed] = useState(false);

  const comfortTex = useLayerTexture(
    'comfort',
    'Комфорт',
    formatMoney(amounts.comfort, amounts.currency),
  );
  const oblTex = useLayerTexture(
    'obligations',
    'Платежи',
    formatMoney(amounts.obligations, amounts.currency),
  );
  const resTex = useLayerTexture('reserve', 'Запас', formatMoney(amounts.reserve, amounts.currency), {
    safe: `Безопасно сегодня  ${formatMoney(amounts.safeDaily, amounts.currency)}`,
    total: formatMoney(amounts.total, amounts.currency),
    payments: formatMoney(amounts.obligations, amounts.currency),
  });

  useEffect(
    () => () => {
      comfortTex?.dispose();
      oblTex?.dispose();
      resTex?.dispose();
    },
    [comfortTex, oblTex, resTex],
  );

  const spring = useSpring({
    o: target,
    config: soft
      ? { tension: 280, friction: 40, clamp: true }
      : { tension: 135, friction: 20, mass: 1.05 },
    onChange: () => invalidate(),
  });
  const press = useSpring({
    s: pressed ? 0.987 : 1,
    config: { tension: 400, friction: 24 },
    onChange: () => invalidate(),
  });

  useEffect(() => {
    invalidate();
    const ids = [40, 160, 360, 640, 960].map((ms) => window.setTimeout(() => invalidate(), ms));
    return () => ids.forEach(clearTimeout);
  }, [phase, invalidate]);

  useFrame(({ clock }) => {
    if (soft || target > 0.35 || !root.current) return;
    const t = clock.elapsedTime;
    root.current.position.y = Math.sin(t * 0.8) * 0.012;
    root.current.rotation.z = Math.sin(t * 0.45) * THREE.MathUtils.degToRad(1.0);
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

  // CLOSED offsets deliberately large enough to SHOW three layers
  // comfort top, obligations middle strip, reserve body
  const comfort = {
    y: o.to((v) => 0.36 + v * 0.2),
    z: o.to((v) => -0.2 - v * 0.22),
    rx: o.to((v) => THREE.MathUtils.degToRad(-3 - v * 7)), // max ~10°
  };
  const mid = {
    y: o.to((v) => 0.08 + v * 0.08),
    z: o.to((v) => -0.09 - v * 0.1),
    rx: o.to((v) => THREE.MathUtils.degToRad(-1.5 - v * 4)),
  };
  const front = {
    y: o.to((v) => -0.22 - v * 0.02),
    z: o.to((v) => 0.05 + v * 0.05),
    rx: o.to((v) => THREE.MathUtils.degToRad(-v * 1.2)),
  };

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[2.8, 4, 2.4]} intensity={1.0} color="#fffafc" />
      <directionalLight position={[-2.4, 1.4, -1.2]} intensity={0.3} color="#c8d4ff" />
      <Environment preset="apartment" environmentIntensity={soft ? 0.35 : 0.62} />

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
        {/* 1. Comfort — top / back */}
        <a.group position-y={comfort.y as never} position-z={comfort.z as never} rotation-x={comfort.rx as never}>
          <GlassPlate color={COL.comfort} thickness={0.5} soft={soft} labelTexture={comfortTex} />
        </a.group>

        {/* 2. Obligations — middle */}
        <a.group position-y={mid.y as never} position-z={mid.z as never} rotation-x={mid.rx as never}>
          <GlassPlate color={COL.obligations} thickness={0.55} soft={soft} labelTexture={oblTex} />
        </a.group>

        {/* 3. Reserve — front */}
        <a.group position-y={front.y as never} position-z={front.z as never} rotation-x={front.rx as never}>
          <GlassPlate color={COL.reserve} thickness={0.68} soft={soft} labelTexture={resTex}>
            <Caustic on={!soft} />
            <Clasp
              soft={soft}
              x={o.to((v) => 1.24 + v * 0.05)}
              y={o.to((v) => 0.02 + v * 0.06)}
              z={o.to((v) => 0.12 + v * 0.04)}
              rz={o.to((v) => v * 0.15)}
            />
          </GlassPlate>
        </a.group>
      </a.group>

      <ContactShadows
        position={[0, -1.25, 0]}
        opacity={0.36}
        scale={6}
        blur={2.5}
        far={3.3}
        resolution={256}
        color="#3a3555"
      />
    </>
  );
}

/** Premium 3-layer DOM fallback — same structure as reference */
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
      <span className="w3d-fb-layer comfort" data-layer="comfort">
        <span className="w3d-fb-row">
          <Coffee size={14} aria-hidden />
          <small>Комфорт</small>
        </span>
        <b>{formatMoney(amounts.comfort, amounts.currency)}</b>
      </span>
      <span className="w3d-fb-layer obligations" data-layer="obligations">
        <span className="w3d-fb-row">
          <ReceiptText size={14} aria-hidden />
          <small>Платежи</small>
        </span>
        <b>{formatMoney(amounts.obligations, amounts.currency)}</b>
      </span>
      <span className="w3d-fb-layer reserve" data-layer="reserve">
        <span className="clasp" aria-hidden>
          <span className="clasp-neck" />
          <i />
        </span>
        <span className="w3d-fb-row">
          <Shield size={14} aria-hidden />
          <small>Запас</small>
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
          camera={{ position: [0, 0.05, 4.35], fov: 28, near: 0.1, far: 24 }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.06;
            gl.outputColorSpace = THREE.SRGBColorSpace;
          }}
          style={{ width: '100%', height: '100%', touchAction: 'manipulation' }}
        >
          <Suspense fallback={null}>
            <WalletScene phase={phase} amounts={amounts} onOpen={onOpen} reducedMotion={rm} />
          </Suspense>
        </Canvas>
        {/* sr-only amounts for a11y / tests that query text */}
        <div className="w3d-sr-only">
          <span>Комфорт {formatMoney(amounts.comfort, amounts.currency)}</span>
          <span>Платежи {formatMoney(amounts.obligations, amounts.currency)}</span>
          <span>Запас {formatMoney(amounts.reserve, amounts.currency)}</span>
          <span>Безопасно сегодня {formatMoney(amounts.safeDaily, amounts.currency)}</span>
        </div>
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
