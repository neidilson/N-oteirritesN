import React, { useCallback, useLayoutEffect, useRef } from 'react';

export const FACE_ORIENTATIONS: Record<number, { rx: number; ry: number }> = {
  1: { rx: 0, ry: 0 },
  2: { rx: -90, ry: 0 },
  3: { rx: 0, ry: -90 },
  4: { rx: 0, ry: 90 },
  5: { rx: 90, ry: 0 },
  6: { rx: 0, ry: 180 }
};

interface Dice3DProps {
  rotation: { x: number; y: number; z: number };
  elevation?: number;
  instantTransition?: boolean;
  cubeRef?: React.RefObject<HTMLDivElement | null>;
  shadowRef?: React.RefObject<HTMLDivElement | null>;
}

const PIP_POS: Record<number, Array<[number, number]>> = {
  1: [[32, 32]],
  2: [[18, 18], [46, 46]],
  3: [[18, 18], [32, 32], [46, 46]],
  4: [[18, 18], [46, 18], [18, 46], [46, 46]],
  5: [[18, 18], [46, 18], [32, 32], [18, 46], [46, 46]],
  6: [[19, 16], [45, 16], [19, 32], [45, 32], [19, 48], [45, 48]]
};

const DiceFaceSvg: React.FC<{ value: number; baseHex: string; shadeHex: string }> = React.memo(
  ({ value, baseHex, shadeHex }) => {
    const pips = PIP_POS[value] || PIP_POS[1];
    const isOne = value === 1;
    const pipRadius = isOne ? 7.8 : 5.1;

    return (
      <svg viewBox="0 0 64 64" className="w-full h-full block">
        {/* Outer ivory edge */}
        <rect x="0.5" y="0.5" width="63" height="63" rx="11" fill={shadeHex} stroke="#b8b2a3" strokeWidth="1.2" />
        {/* Beveled inner bright face */}
        <rect x="3" y="3" width="58" height="58" rx="9" fill={baseHex} />
        {/* Top-left specular highlight rim */}
        <path d="M12 4.5 H52 Q59 4.5 59.5 12" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.85" />
        {/* Carved concave 3D pips */}
        {pips.map(([cx, cy], idx) => {
          const isCenterRed = isOne || (value === 5 && idx === 2);
          return (
            <g key={idx}>
              {/* Bottom specular lip of carved dimple */}
              <circle cx={cx} cy={cy + 0.9} r={pipRadius} fill="#ffffff" opacity="0.85" />
              {/* Recessed pip body */}
              <circle cx={cx} cy={cy} r={pipRadius} fill={isCenterRed ? '#dc2626' : '#18181b'} />
              {/* Top inner shadow crescent */}
              <circle cx={cx} cy={cy - 0.6} r={pipRadius * 0.72} fill={isCenterRed ? '#991b1b' : '#09090b'} opacity="0.45" />
            </g>
          );
        })}
      </svg>
    );
  }
);

export const Dice3D: React.FC<Dice3DProps> = React.memo(({
  rotation,
  elevation = 0,
  instantTransition = false,
  cubeRef,
  shadowRef
}) => {
  const internalCubeRef = useRef<HTMLDivElement | null>(null);
  const internalShadowRef = useRef<HTMLDivElement | null>(null);

  const setCubeRef = useCallback((el: HTMLDivElement | null) => {
    internalCubeRef.current = el;
    if (cubeRef) cubeRef.current = el;
  }, [cubeRef]);

  const setShadowRef = useCallback((el: HTMLDivElement | null) => {
    internalShadowRef.current = el;
    if (shadowRef) shadowRef.current = el;
  }, [shadowRef]);

  useLayoutEffect(() => {
    if (instantTransition) return;
    const shadowScale = 1 + Math.min(0.45, elevation * 0.011);
    const shadowOpacity = Math.max(0.18, 0.5 - elevation * 0.006);
    const shadowOffsetY = elevation * 0.45;
    if (internalCubeRef.current) {
      internalCubeRef.current.style.transform = `rotateX(-24deg) rotateY(28deg) translate3d(0, ${-elevation}px, ${elevation}px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)`;
    }
    if (internalShadowRef.current) {
      internalShadowRef.current.style.opacity = String(shadowOpacity);
      internalShadowRef.current.style.transform = `translate3d(-44%, -46%, 0) translateY(${shadowOffsetY}px) scale(${shadowScale})`;
    }
  }, [rotation.x, rotation.y, rotation.z, elevation, instantTransition]);

  return (
    <div className="relative dice-3d-scene flex items-center justify-center">
      {/* Directional Floor Contact Shadow (single gradient, zero blur pass) */}
      <div
        ref={setShadowRef}
        className="absolute left-1/2 top-[116%] w-16 h-5 sm:w-20 sm:h-6 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.28) 52%, transparent 78%)',
          transition: instantTransition ? 'none' : 'transform 0.09s ease-out, opacity 0.09s ease-out',
          willChange: 'transform, opacity'
        }}
      />

      {/* Real 6-Faced 3D Ivory Casino Cube (SVG faces = crisp 3D depth + zero shadow lag) */}
      <div
        ref={setCubeRef}
        className={`dice-3d-cube ${instantTransition ? 'is-dragging' : ''}`}
        style={{
          transition: instantTransition ? 'none' : 'transform 0.09s cubic-bezier(0.22, 1.25, 0.36, 1)'
        }}
      >
        <div className="dice-3d-face dice-face-1">
          <DiceFaceSvg value={1} baseHex="#fbfaf5" shadeHex="#ebe7dc" />
        </div>
        <div className="dice-3d-face dice-face-2">
          <DiceFaceSvg value={2} baseHex="#ffffff" shadeHex="#f1eee5" />
        </div>
        <div className="dice-3d-face dice-face-3">
          <DiceFaceSvg value={3} baseHex="#ece8dd" shadeHex="#d7d1c3" />
        </div>
        <div className="dice-3d-face dice-face-4">
          <DiceFaceSvg value={4} baseHex="#e6e2d6" shadeHex="#d0cabb" />
        </div>
        <div className="dice-3d-face dice-face-5">
          <DiceFaceSvg value={5} baseHex="#ded9cc" shadeHex="#c6c0b0" />
        </div>
        <div className="dice-3d-face dice-face-6">
          <DiceFaceSvg value={6} baseHex="#f4f1e8" shadeHex="#dfd9cb" />
        </div>
      </div>
    </div>
  );
});
