/**
 * Liquid Glass Wallet — THREE independent volumetric plates (reference structure).
 *
 * Reference stack (closed):
 *   Comfort (back/top strip) → Obligations (mid strip) → Reserve (front body + clasp)
 *
 * No drei Html. Labels = canvas textures per plate.
 * No MeshTransmissionMaterial. Physical glass only.
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
} as const;

/**
 * Card proportions: shorter than old plates so stacked offsets reveal
 * full title+amount of Comfort & Obligations (reference peek).
 */
const PLATE = { w: 2.85, h: 1.22, d: 0.155, r: 0.2 } as const;

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

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

type LayerKind = 'comfort' | 'obligations' | 'reserve';

function buildLabelTexture(
  kind: LayerKind,
  title: string,
  amount: string,
  extra?: { safeLine?: string; total?: string; payments?: string },
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const W = 1024;
  const H = kind === 'reserve' ? 640 : 480;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.clearRect(0, 0, W, H);

  // top specular
  const g = ctx.createLinearGradient(0, 0, 0, H * 0.5);
  g.addColorStop(0, 'rgba(255,255,255,0.28)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.06)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(40, 28, W - 80, H * 0.42);

  ctx.fillStyle = 'rgba(26,24,48,0.58)';
  ctx.font = '600 44px system-ui,-apple-system,BlinkMacSystemFont,sans-serif';
  ctx.fillText(title, 84, 96);

  const big = kind === 'reserve';
  ctx.fillStyle = COL.ink;
  ctx.font = big
    ? '600 118px system-ui,-apple-system,BlinkMacSystemFont,sans-serif'
    : '600 72px system-ui,-apple-system,BlinkMacSystemFont,sans-serif';
  let amt = amount;
  while (ctx.measureText(amt).width > W - 170 && amt.length > 3) amt = `${amt.slice(0, -2)}…`;
  ctx.fillText(amt, 84, big ? 240 : 200);

  if (kind === 'reserve' && extra) {
    const sy = 300;
    const sh = 68;
    const sx = 84;
    const sw = Math.min(680, W - 180);
    roundRect(ctx, sx, sy, sw, sh, 34);
    const sg = ctx.createLinearGradient(sx, sy, sx + sw, sy);
    sg.addColorStop(0, 'rgba(129,116,232,0.32)');
    sg.addColorStop(1, 'rgba(113,134,200,0.36)');
    ctx.fillStyle = sg;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(35,32,64,0.85)';
    ctx.font = '600 32px system-ui,-apple-system,sans-serif';
    ctx.fillText(extra.safeLine ?? '', sx + 26, sy + 44);

    ctx.strokeStyle = 'rgba(255,255,255,0.38)';
    ctx.beginPath();
    ctx.moveTo(70, H - 130);
    ctx.lineTo(W - 70, H - 130);
    ctx.stroke();
    ctx.fillStyle = 'rgba(40,36,70,0.55)';
    ctx.font = '500 28px system-ui,-apple-system,sans-serif';
    ctx.fillText('Всего', 84, H - 84);
    ctx.fillText('Платежи', W - 300, H - 84);
    ctx.fillStyle = COL.ink;
    ctx.font = '700 36px system-ui,-apple-system,sans-serif';
    ctx.fillText(extra.total ?? '', 84, H - 38);
    const pay = extra.payments ?? '';
    ctx.fillText(pay, W - 84 - ctx.measureText(pay).width, H - 38);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/**
 * One independent glass card. Three of these = three layers.
 * transmission lower on rear cards so edges don't melt into one blob.
 */
function GlassCard({
  color,
  transmission,
  thickness,
  labelTexture,
  children,
}: {
  color: string;
  transmission: number;
  thickness: number;
  labelTexture: THREE.CanvasTexture | null;
  children?: React.ReactNode;
}) {
  return (
    <group>
      <RoundedBox args={[PLATE.w, PLATE.h, PLATE.d]} radius={PLATE.r} smoothness={6}>
        <meshPhysicalMaterial
          color={color}
          metalness={0.015}
          roughness={0.08}
          transmission={transmission}
          thickness={thickness}
          ior={1.42}
          transparent
          opacity={0.98}
          attenuationColor={color}
          attenuationDistance={1.15}
          clearcoat={1}
          clearcoatRoughness={0.06}
          envMapIntensity={1.15}
          reflectivity={0.6}
          side={THREE.FrontSide}
        />
      </RoundedBox>
      {/* thickness silhouette — dark-ish edge ring */}
      <RoundedBox
        args={[PLATE.w * 1.018, PLATE.h * 1.018, PLATE.d * 0.55]}
        radius={PLATE.r * 1.03}
        smoothness={4}
      >
        <meshBasicMaterial color="#ffffff" transparent opacity={0.14} side={THREE.BackSide} depthWrite={false} />
      </RoundedBox>
      {/* liquid core tint — makes body read as volume */}
      <RoundedBox
        args={[PLATE.w * 0.88, PLATE.h * 0.82, PLATE.d * 0.45]}
        radius={PLATE.r * 0.8}
        smoothness={3}
        position={[0, 0, -0.01]}
      >
        <meshPhysicalMaterial
          color={color}
          metalness={0}
          roughness={0.25}
          transmission={0.35}
          thickness={0.3}
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </RoundedBox>
      {labelTexture && (
        <mesh position={[0, 0.02, PLATE.d / 2 + 0.014]} renderOrder={2}>
          <planeGeometry args={[PLATE.w * 0.88, PLATE.h * 0.82]} />
          <meshBasicMaterial
            map={labelTexture}
            transparent
            depthWrite={false}
            toneMapped={false}
            side={THREE.FrontSide}
          />
        </mesh>
      )}
      {children}
    </group>
  );
}

function Clasp3D({
  x,
  y,
  z,
  rz,
}: {
  x: unknown;
  y: unknown;
  z: unknown;
  rz: unknown;
}) {
  return (
    <a.group position-x={x as never} position-y={y as never} position-z={z as never} rotation-z={rz as never}>
      <mesh>
        <capsuleGeometry args={[0.1, 0.24, 8, 16]} />
        <meshPhysicalMaterial
          color="#F5F7FD"
          metalness={0.12}
          roughness={0.06}
          transmission={0.55}
          thickness={0.32}
          ior={1.4}
          clearcoat={1}
          clearcoatRoughness={0.04}
          transparent
          opacity={0.98}
        />
      </mesh>
      <mesh position={[0.025, 0, 0.075]}>
        <sphereGeometry args={[0.082, 20, 20]} />
        <meshPhysicalMaterial
          color="#FFFFFF"
          metalness={0.18}
          roughness={0.035}
          transmission={0.4}
          thickness={0.22}
          clearcoat={1}
          clearcoatRoughness={0.025}
        />
      </mesh>
    </a.group>
  );
}

function Caustic({ enabled }: { enabled: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock, invalidate }) => {
    if (!enabled || !ref.current || !mat.current) return;
    const t = clock.elapsedTime;
    mat.current.opacity = 0.05 + Math.sin(t * 1.2) * 0.02;
    ref.current.position.x = 0.42 + Math.sin(t * 0.55) * 0.05;
    invalidate();
  });
  if (!enabled) return null;
  return (
    <mesh ref={ref} position={[0.42, 0.12, PLATE.d / 2 + 0.02]} renderOrder={3}>
      <circleGeometry args={[0.48, 28]} />
      <meshBasicMaterial
        ref={mat}
        color="#ffffff"
        transparent
        opacity={0.055}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
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
  const soft = reducedMotion;
  const root = useRef<THREE.Group>(null);
  const [pressed, setPressed] = useState(false);

  const comfortTex = useMemo(
    () => buildLabelTexture('comfort', 'Комфорт', formatMoney(amounts.comfort, amounts.currency)),
    [amounts.comfort, amounts.currency],
  );
  const oblTex = useMemo(
    () =>
      buildLabelTexture('obligations', 'Платежи', formatMoney(amounts.obligations, amounts.currency)),
    [amounts.obligations, amounts.currency],
  );
  const resTex = useMemo(
    () =>
      buildLabelTexture('reserve', 'Запас', formatMoney(amounts.reserve, amounts.currency), {
        safeLine: `✦  Безопасно сегодня   ${formatMoney(amounts.safeDaily, amounts.currency)}`,
        total: formatMoney(amounts.total, amounts.currency),
        payments: formatMoney(amounts.obligations, amounts.currency),
      }),
    [amounts.reserve, amounts.safeDaily, amounts.total, amounts.obligations, amounts.currency],
  );

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
      ? { tension: 280, friction: 42, clamp: true }
      : { tension: 130, friction: 20, mass: 1.08 },
    onChange: () => invalidate(),
  });
  const press = useSpring({
    s: pressed ? 0.985 : 1,
    config: { tension: 420, friction: 26 },
    onChange: () => invalidate(),
  });

  useEffect(() => {
    invalidate();
    const ids = [30, 120, 300, 560, 900].map((ms) => window.setTimeout(() => invalidate(), ms));
    return () => ids.forEach(clearTimeout);
  }, [phase, invalidate]);

  // idle: float only (no Z rotation — avoids skew)
  useFrame(({ clock }) => {
    if (soft || target > 0.3 || !root.current) return;
    root.current.position.y = Math.sin(clock.elapsedTime * 0.75) * 0.01;
    invalidate();
  });

  const handleOpen = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (isOpenPhase(phase)) return;
      onOpen();
    },
    [onOpen, phase],
  );

  const o = spring.o;

  /**
   * CLOSED stack — three visible card tops (reference):
   *   Comfort peeks at top, Obligations mid band, Reserve full front.
   * Spacing ~0.40–0.42 so title+amount of upper cards read clearly.
   * OPEN fan: extra Y/Z, rotateX max ~9°, rotateZ = 0 always.
   */
  const layer1 = {
    y: o.to((v) => 0.48 + v * 0.18),
    z: o.to((v) => -0.28 - v * 0.2),
    rx: o.to((v) => THREE.MathUtils.degToRad(-2.5 - v * 6.5)),
  };
  const layer2 = {
    y: o.to((v) => 0.08 + v * 0.07),
    z: o.to((v) => -0.12 - v * 0.1),
    rx: o.to((v) => THREE.MathUtils.degToRad(-1.2 - v * 4)),
  };
  const layer3 = {
    y: o.to((v) => -0.32 - v * 0.02),
    z: o.to((v) => 0.06 + v * 0.04),
    rx: o.to((v) => THREE.MathUtils.degToRad(-v * 1.0)),
  };

  // lower transmission on rear plates = readable edges of three cards
  const tComfort = soft ? 0.62 : 0.7;
  const tObl = soft ? 0.68 : 0.76;
  const tRes = soft ? 0.78 : 0.88;

  return (
    <>
      <ambientLight intensity={0.52} />
      <directionalLight position={[3.0, 4.2, 2.6]} intensity={1.05} color="#fffafc" />
      <directionalLight position={[-2.6, 1.6, 0.5]} intensity={0.35} color="#d0d8ff" />
      <Environment preset="apartment" environmentIntensity={soft ? 0.32 : 0.58} />

      <a.group
        ref={root}
        scale={press.s}
        onClick={handleOpen}
        onPointerDown={(e) => {
          e.stopPropagation();
          setPressed(true);
        }}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
      >
        {/* LAYER 1 — Комфорт (back) */}
        <a.group position-y={layer1.y as never} position-z={layer1.z as never} rotation-x={layer1.rx as never}>
          <GlassCard
            color={COL.comfort}
            transmission={tComfort}
            thickness={0.55}
            labelTexture={comfortTex}
          />
        </a.group>

        {/* LAYER 2 — Платежи (mid) */}
        <a.group position-y={layer2.y as never} position-z={layer2.z as never} rotation-x={layer2.rx as never}>
          <GlassCard color={COL.obligations} transmission={tObl} thickness={0.6} labelTexture={oblTex} />
        </a.group>

        {/* LAYER 3 — Запас (front) + clasp */}
        <a.group position-y={layer3.y as never} position-z={layer3.z as never} rotation-x={layer3.rx as never}>
          <GlassCard color={COL.reserve} transmission={tRes} thickness={0.72} labelTexture={resTex}>
            <Caustic enabled={!soft} />
            <Clasp3D
              x={o.to((v) => 1.28 + v * 0.04)}
              y={o.to((v) => 0.0 + v * 0.05)}
              z={o.to((v) => 0.14 + v * 0.03)}
              rz={o.to((v) => v * 0.12)}
            />
          </GlassCard>
        </a.group>
      </a.group>

      <ContactShadows
        position={[0, -1.15, 0]}
        opacity={0.4}
        scale={6.2}
        blur={2.4}
        far={3.2}
        resolution={256}
        color="#35304f"
      />
    </>
  );
}

/** DOM fallback: THREE separate glass cards, same hierarchy as reference */
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
      <span className="w3d-card comfort" data-layer="comfort">
        <span className="w3d-card-head">
          <Coffee size={14} aria-hidden />
          <small>Комфорт</small>
        </span>
        <b className="w3d-card-amt">{formatMoney(amounts.comfort, amounts.currency)}</b>
      </span>
      <span className="w3d-card obligations" data-layer="obligations">
        <span className="w3d-card-head">
          <ReceiptText size={14} aria-hidden />
          <small>Платежи</small>
        </span>
        <b className="w3d-card-amt">{formatMoney(amounts.obligations, amounts.currency)}</b>
      </span>
      <span className="w3d-card reserve" data-layer="reserve">
        <span className="clasp" aria-hidden>
          <span className="clasp-neck" />
          <i />
        </span>
        <span className="w3d-card-head">
          <Shield size={14} aria-hidden />
          <small>Запас</small>
        </span>
        <b className="w3d-card-amt w3d-card-amt-lg">{formatMoney(amounts.reserve, amounts.currency)}</b>
        <span className="safe-strip">
          <Sparkles size={12} aria-hidden />
          <span>Безопасно сегодня</span>
          <strong>{formatMoney(amounts.safeDaily, amounts.currency)}</strong>
        </span>
        <span className="w3d-card-lip">
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
        className={`w3d-root ${open ? 'is-open' : ''}`}
        aria-label="Кошелёк"
        data-testid="wallet-stage"
        data-wallet-layers="3"
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
      data-wallet-layers="3"
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
          /* slight elevation + distance so plate thickness reads */
          camera={{ position: [0.12, 0.35, 4.55], fov: 26, near: 0.1, far: 30 }}
          onCreated={({ gl, camera }) => {
            gl.setClearColor(0x000000, 0);
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.07;
            gl.outputColorSpace = THREE.SRGBColorSpace;
            camera.lookAt(0, -0.05, 0);
          }}
          style={{ width: '100%', height: '100%', touchAction: 'manipulation' }}
        >
          <Suspense fallback={null}>
            <WalletScene phase={phase} amounts={amounts} onOpen={onOpen} reducedMotion={rm} />
          </Suspense>
        </Canvas>
        <div className="w3d-sr-only">
          <span>Комфорт {formatMoney(amounts.comfort, amounts.currency)}</span>
          <span>Платежи {formatMoney(amounts.obligations, amounts.currency)}</span>
          <span>Запас {formatMoney(amounts.reserve, amounts.currency)}</span>
          <span>Безопасно сегодня {formatMoney(amounts.safeDaily, amounts.currency)}</span>
        </div>
        {/* e2e / layout clasp marker (3D clasp is visual) */}
        <span className="clasp w3d-clasp-marker" aria-hidden />
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
