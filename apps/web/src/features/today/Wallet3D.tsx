import {
  ContactShadows,
  Environment,
  Html,
  MeshTransmissionMaterial,
  RoundedBox,
} from '@react-three/drei';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { a, useSpring } from '@react-spring/three';
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
  pearl: '#ECEAF1',
  ink: '#171621',
} as const;

const LAYER = { w: 2.62, h: 1.58, d: 0.09, r: 0.17 } as const;

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
  return 0;
}

function isMobileViewport() {
  return typeof window !== 'undefined' && window.innerWidth < 480;
}

/** Soft caustic shimmer inside the active (reserve) layer */
function CausticFilm({ active }: { active: boolean }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(({ clock, invalidate }) => {
    if (!active || !mat.current || !mesh.current) return;
    const t = clock.elapsedTime;
    mat.current.opacity = 0.07 + Math.sin(t * 1.4) * 0.025;
    mesh.current.rotation.z = Math.sin(t * 0.35) * 0.08;
    mesh.current.position.x = Math.sin(t * 0.5) * 0.05;
    invalidate();
  });
  if (!active) return null;
  return (
    <mesh ref={mesh} position={[0.35, 0.05, 0.048]} scale={[1.1, 0.75, 1]}>
      <planeGeometry args={[1.6, 1.1]} />
      <meshBasicMaterial
        ref={mat}
        color="#ffffff"
        transparent
        opacity={0.08}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

function GlassPlate({
  color,
  thickness,
  light,
  premium,
  children,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
}: {
  color: string;
  thickness: number;
  light?: boolean;
  premium?: boolean;
  children?: ReactNode;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerUp?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerLeave?: (e: ThreeEvent<PointerEvent>) => void;
}) {
  const mobile = isMobileViewport();
  const useMtm = premium && !light && !mobile;

  return (
    <group
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
    >
      <RoundedBox args={[LAYER.w, LAYER.h, LAYER.d]} radius={LAYER.r} smoothness={4}>
        {useMtm ? (
          <MeshTransmissionMaterial
            backside
            samples={4}
            resolution={180}
            transmission={0.98}
            thickness={thickness}
            chromaticAberration={0.045}
            anisotropy={0.12}
            roughness={0.12}
            ior={1.42}
            color={color}
            attenuationDistance={1.1}
            attenuationColor={color}
            clearcoat={0.85}
            clearcoatRoughness={0.12}
            envMapIntensity={1.25}
            toneMapped
          />
        ) : (
          <meshPhysicalMaterial
            color={color}
            metalness={0.03}
            roughness={light ? 0.22 : 0.08}
            transmission={light ? 0.52 : 0.92}
            thickness={thickness}
            ior={1.44}
            transparent
            opacity={0.95}
            attenuationColor={color}
            attenuationDistance={light ? 0.85 : 1.4}
            clearcoat={0.82}
            clearcoatRoughness={0.1}
            envMapIntensity={light ? 0.55 : 1.2}
            reflectivity={0.62}
            specularIntensity={0.9}
            side={THREE.DoubleSide}
          />
        )}
      </RoundedBox>
      {/* edge tension / rim light */}
      <RoundedBox
        args={[LAYER.w * 1.012, LAYER.h * 1.012, LAYER.d * 0.55]}
        radius={LAYER.r * 1.05}
        smoothness={3}
      >
        <meshBasicMaterial color="#ffffff" transparent opacity={0.1} side={THREE.BackSide} depthWrite={false} />
      </RoundedBox>
      {/* inner liquid fill tint */}
      <RoundedBox
        args={[LAYER.w * 0.92, LAYER.h * 0.88, LAYER.d * 0.35]}
        radius={LAYER.r * 0.85}
        smoothness={2}
        position={[0, 0, -0.01]}
      >
        <meshBasicMaterial color={color} transparent opacity={0.14} depthWrite={false} />
      </RoundedBox>
      {children}
    </group>
  );
}

function Clasp3D({
  ox,
  oy,
  oz,
  rz,
  ry,
  light,
}: {
  ox: unknown;
  oy: unknown;
  oz: unknown;
  rz: unknown;
  ry: unknown;
  light: boolean;
}) {
  return (
    <a.group position-x={ox as never} position-y={oy as never} position-z={oz as never} rotation-z={rz as never} rotation-y={ry as never}>
      {/* body */}
      <mesh castShadow={false}>
        <capsuleGeometry args={[0.095, 0.24, 8, 16]} />
        <meshPhysicalMaterial
          color="#F2F4FC"
          metalness={0.2}
          roughness={0.07}
          transmission={light ? 0.2 : 0.62}
          thickness={0.35}
          ior={1.42}
          clearcoat={1}
          clearcoatRoughness={0.05}
          transparent
          opacity={0.97}
          envMapIntensity={1.1}
        />
      </mesh>
      {/* neck plate */}
      <mesh position={[0.07, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.16, 0.06, 0.04]} />
        <meshPhysicalMaterial
          color="#E4E8F8"
          metalness={0.15}
          roughness={0.12}
          transmission={0.35}
          thickness={0.2}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* gem / button */}
      <mesh position={[0.02, 0, 0.07]}>
        <sphereGeometry args={[0.078, 20, 20]} />
        <meshPhysicalMaterial
          color="#FFFFFF"
          metalness={0.25}
          roughness={0.04}
          transmission={light ? 0.15 : 0.48}
          thickness={0.25}
          clearcoat={1}
          clearcoatRoughness={0.03}
          envMapIntensity={1.3}
        />
      </mesh>
      <Html center className="clasp" style={{ width: 54, height: 44, pointerEvents: 'none' }}>
        <span className="clasp-neck" aria-hidden />
        <i aria-hidden />
      </Html>
    </a.group>
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
  const press = useRef(0);
  const idle = useRef(0);
  const root = useRef<THREE.Group>(null);

  const spring = useSpring({
    o: target,
    p: 0,
    config: reducedMotion
      ? { tension: 300, friction: 42, clamp: true }
      : { tension: 145, friction: 18, mass: 1.05 },
    onChange: () => invalidate(),
  });

  // sync press into spring via imperative updates is awkward — use local scale on pointer
  const [pressed, setPressed] = useState(false);
  const pressSpring = useSpring({
    s: pressed ? 0.985 : 1,
    config: { tension: 400, friction: 22 },
    onChange: () => invalidate(),
  });

  useEffect(() => {
    invalidate();
    const timers = [40, 120, 280, 560, 900].map((ms) => window.setTimeout(() => invalidate(), ms));
    return () => timers.forEach(clearTimeout);
  }, [phase, invalidate]);

  useFrame(({ clock }) => {
    if (light || target > 0.5) return;
    // subtle idle float when closed
    idle.current = Math.sin(clock.elapsedTime * 0.9) * 0.012;
    if (root.current) {
      root.current.position.y = idle.current;
      root.current.rotation.z = Math.sin(clock.elapsedTime * 0.55) * 0.008;
      invalidate();
    }
  });

  const handleOpen = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (isOpenPhase(phase)) return;
      onOpen();
    },
    [onOpen, phase],
  );

  const onDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setPressed(true);
    press.current = 1;
  }, []);
  const onUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setPressed(false);
    press.current = 0;
  }, []);

  const label: CSSProperties = {
    color: TOKENS.ink,
    fontFamily: 'inherit',
    pointerEvents: 'none',
    userSelect: 'none',
    width: 228,
  };

  const o = spring.o;
  // fan geometry tuned for reference-like stack → fan
  const comfort = {
    y: o.to((v) => 0.38 + v * (light ? 0.28 : 0.72)),
    z: o.to((v) => -0.22 - v * (light ? 0.18 : 0.78)),
    rx: o.to((v) => -0.12 - v * (light ? 0.1 : 0.52)),
    rz: o.to((v) => -v * 0.06),
    sc: o.to((v) => 0.948 - v * 0.035),
    op: o.to((v) => 1 - v * 0.15),
  };
  const obl = {
    y: o.to((v) => 0.1 + v * (light ? 0.12 : 0.28)),
    z: o.to((v) => -0.1 - v * (light ? 0.1 : 0.38)),
    rx: o.to((v) => -0.06 - v * (light ? 0.05 : 0.26)),
    rz: o.to((v) => v * 0.045),
    sc: o.to((v) => 0.972 - v * 0.02),
  };
  const res = {
    y: o.to((v) => -0.18 - v * 0.05),
    z: o.to((v) => 0.06 + v * 0.1),
    rx: o.to((v) => -v * 0.06),
    sc: o.to((v) => 1 + v * 0.02),
  };

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3.2, 4.2, 2.4]} intensity={1.05} color="#fff8ff" />
      <directionalLight position={[-2.5, 1.5, -1.5]} intensity={0.25} color="#c8d0ff" />
      <Environment preset="apartment" environmentIntensity={light ? 0.3 : 0.72} />

      <a.group ref={root} scale={pressSpring.s}>
        {/* Comfort */}
        <a.group
          position-y={comfort.y}
          position-z={comfort.z}
          rotation-x={comfort.rx}
          rotation-z={comfort.rz}
          scale={comfort.sc}
        >
          <GlassPlate
            color={TOKENS.comfort}
            thickness={0.48}
            light={light}
            premium
            onClick={handleOpen}
            onPointerDown={onDown}
            onPointerUp={onUp}
            onPointerLeave={onUp}
          >
            <Html position={[-0.92, 0.4, 0.06]} style={label} zIndexRange={[20, 0]} occlude={false}>
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
          position-y={obl.y}
          position-z={obl.z}
          rotation-x={obl.rx}
          rotation-z={obl.rz}
          scale={obl.sc}
        >
          <GlassPlate
            color={TOKENS.obligations}
            thickness={0.52}
            light={light}
            premium
            onClick={handleOpen}
            onPointerDown={onDown}
            onPointerUp={onUp}
            onPointerLeave={onUp}
          >
            <Html position={[-0.92, 0.4, 0.06]} style={label} zIndexRange={[25, 0]} occlude={false}>
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

        {/* Reserve */}
        <a.group position-y={res.y} position-z={res.z} rotation-x={res.rx} scale={res.sc}>
          <GlassPlate
            color={TOKENS.reserve}
            thickness={0.72}
            light={light}
            premium
            onClick={handleOpen}
            onPointerDown={onDown}
            onPointerUp={onUp}
            onPointerLeave={onUp}
          >
            <CausticFilm active={!light} />
            <Clasp3D
              light={light}
              ox={o.to((v) => 1.18 + v * 0.1)}
              oy={o.to((v) => 0.02 + v * 0.22)}
              oz={o.to((v) => 0.11 + v * 0.16)}
              rz={o.to((v) => v * 0.48)}
              ry={o.to((v) => -0.12 + v * 0.12)}
            />
            <Html
              position={[-0.92, 0.44, 0.06]}
              style={{ ...label, width: 242 }}
              zIndexRange={[40, 0]}
              occlude={false}
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
      </a.group>

      <ContactShadows
        position={[0, -1.22, 0]}
        opacity={0.38}
        scale={6}
        blur={2.6}
        far={3.4}
        resolution={256}
        color="#3d3860"
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

  const dpr = useMemo<[number, number]>(() => {
    if (rm) return [1, 1];
    if (isMobileViewport()) return [1, 1.35];
    return [1, 1.5];
  }, [rm]);

  if (!webgl) {
    return (
      <section
        className={`wallet3d-root ${open ? 'is-open' : ''}`}
        aria-label="Кошелёк"
        data-testid="wallet-stage"
      >
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
          frameloop={pageVisible ? (rm ? 'demand' : 'demand') : 'never'}
          gl={{
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance',
            stencil: false,
            depth: true,
          }}
          camera={{ position: [0, 0.08, 4.05], fov: 31, near: 0.1, far: 30 }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.08;
            gl.outputColorSpace = THREE.SRGBColorSpace;
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
