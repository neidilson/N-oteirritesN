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
  2: [[17.5, 17.5], [46.5, 46.5]],
  3: [[17.5, 17.5], [32, 32], [46.5, 46.5]],
  4: [[17.5, 17.5], [46.5, 17.5], [17.5, 46.5], [46.5, 46.5]],
  5: [[17.5, 17.5], [46.5, 17.5], [32, 32], [17.5, 46.5], [46.5, 46.5]],
  6: [[18, 16], [46, 16], [18, 32], [46, 32], [18, 48], [46, 48]]
};

const DiceFaceSvg: React.FC<{ value: number; highlightTone: string; midTone: string; rimTone: string }> = React.memo(
  ({ value, highlightTone, midTone, rimTone }) => {
    const pips = PIP_POS[value] || PIP_POS[1];
    const isOne = value === 1;
    const pipRadius = isOne ? 6.6 : 4.45;
    const gradFaceId = `ivory_face_${value}`;
    const gradDarkId = `pip_pit_dark_${value}`;
    const gradRedId = `pip_pit_red_${value}`;

    return (
      <svg viewBox="0 0 64 64" className="w-full h-full block">
        <defs>
          <radialGradient id={gradFaceId} cx="34%" cy="30%" r="76%">
            <stop offset="0%" stopColor={highlightTone} />
            <stop offset="56%" stopColor={midTone} />
            <stop offset="100%" stopColor={rimTone} />
          </radialGradient>
          <radialGradient id={gradDarkId} cx="62%" cy="64%" r="68%">
            <stop offset="0%" stopColor="#2e2e34" />
            <stop offset="48%" stopColor="#121216" />
            <stop offset="100%" stopColor="#050507" />
          </radialGradient>
          <radialGradient id={gradRedId} cx="62%" cy="64%" r="68%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="52%" stopColor="#b91c1c" />
            <stop offset="100%" stopColor="#6b0f0f" />
          </radialGradient>
        </defs>

        {/* Rounded Corner Molded Ivory Chassis */}
        <rect x="0" y="0" width="64" height="64" rx="12" fill={rimTone} />
        {/* Outer subtle edge bevel */}
        <rect
          x="1.2"
          y="1.2"
          width="61.6"
          height="61.6"
          rx="11"
          fill={midTone}
          stroke="#9e9581"
          strokeWidth="0.7"
        />
        {/* Main Polished Convex Ivory Face */}
        <rect x="3" y="3" width="58" height="58" rx="9.5" fill={`url(#${gradFaceId})`} />
        {/* Soft Machined Rim Bevel (top-left catchlight & bottom-right shadow) */}
        <path
          d="M 12 3.8 H 52 Q 59.5 4.2 60.2 12"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeOpacity="0.82"
          strokeLinecap="round"
        />
        <path
          d="M 12 60.2 H 52 Q 59.5 59.8 60.2 52"
          fill="none"
          stroke="#7c7361"
          strokeWidth="0.9"
          strokeOpacity="0.45"
          strokeLinecap="round"
        />

        {/* Precision Drilled Concave Enamel Pips */}
        {pips.map(([cx, cy], idx) => {
          const isRedPit = isOne;
          return (
            <g key={idx}>
              {/* Outer chamfered well rim: dark top-left inner wall + bright bottom-right catchlight */}
              <circle cx={cx - 0.45} cy={cy - 0.55} r={pipRadius + 0.55} fill="#8a816e" fillOpacity="0.58" />
              <circle cx={cx + 0.5} cy={cy + 0.65} r={pipRadius + 0.45} fill="#ffffff" fillOpacity="0.88" />
              {/* Recessed concave enamel pit */}
              <circle
                cx={cx}
                cy={cy}
                r={pipRadius}
                fill={isRedPit ? `url(#${gradRedId})` : `url(#${gradDarkId})`}
              />
              {/* Subtle inner specular reflection at bottom-right of concave bowl */}
              <ellipse
                cx={cx + pipRadius * 0.28}
                cy={cy + pipRadius * 0.3}
                rx={pipRadius * 0.24}
                ry={pipRadius * 0.14}
                transform={`rotate(-35 ${cx + pipRadius * 0.28} ${cy + pipRadius * 0.3})`}
                fill="#ffffff"
                fillOpacity={isRedPit ? 0.34 : 0.22}
              />
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
    const shadowScale = 1 + Math.min(0.55, elevation * 0.014);
    const shadowOpacity = Math.max(0.16, 0.58 - elevation * 0.008);
    const shadowOffsetX = elevation * 0.28;
    const shadowOffsetY = elevation * 0.48;
    if (internalCubeRef.current) {
      internalCubeRef.current.style.transform = `rotateX(-22deg) rotateY(24deg) translate3d(0, ${-elevation}px, ${elevation}px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)`;
    }
    if (internalShadowRef.current) {
      internalShadowRef.current.style.opacity = String(shadowOpacity);
      internalShadowRef.current.style.transform = `translate3d(-44%, -46%, 0) translate(${shadowOffsetX}px, ${shadowOffsetY}px) scale(${shadowScale})`;
    }
  }, [rotation.x, rotation.y, rotation.z, elevation, instantTransition]);

  return (
    <div className="relative dice-3d-scene flex items-center justify-center">
      {/* Realistic Soft Directional Contact Shadow on the Board */}
      <div
        ref={setShadowRef}
        className="absolute left-1/2 top-[112%] w-14 h-4 sm:w-16 sm:h-5 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.34) 48%, transparent 76%)',
          transition: instantTransition ? 'none' : 'transform 0.12s ease-out, opacity 0.12s ease-out',
          willChange: 'transform, opacity'
        }}
      />

      {/* Solid Internal Ivory Core + 6 Studio-Lit Molded Faces (zero hollow seams!) */}
      <div
        ref={setCubeRef}
        className={`dice-3d-cube ${instantTransition ? 'is-dragging' : ''}`}
        style={{
          transition: instantTransition ? 'none' : 'transform 0.12s cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      >
        {/* Internal opaque ivory core planes so rotating corners never expose gaps */}
        <div className="dice-core-plane dice-core-xy" />
        <div className="dice-core-plane dice-core-xz" />
        <div className="dice-core-plane dice-core-yz" />

        <div className="dice-3d-face dice-face-1">
          <DiceFaceSvg value={1} highlightTone="#fffdf8" midTone="#f3ede0" rimTone="#d8cfbc" />
        </div>
        <div className="dice-3d-face dice-face-2">
          <DiceFaceSvg value={2} highlightTone="#ffffff" midTone="#f6f1e6" rimTone="#ded6c4" />
        </div>
        <div className="dice-3d-face dice-face-3">
          <DiceFaceSvg value={3} highlightTone="#f7f2e7" midTone="#e9e1cf" rimTone="#cbc0aa" />
        </div>
        <div className="dice-3d-face dice-face-4">
          <DiceFaceSvg value={4} highlightTone="#f2ece0" midTone="#e2dac7" rimTone="#c2b79f" />
        </div>
        <div className="dice-3d-face dice-face-5">
          <DiceFaceSvg value={5} highlightTone="#ece5d6" midTone="#dad0bb" rimTone="#b8ac94" />
        </div>
        <div className="dice-3d-face dice-face-6">
          <DiceFaceSvg value={6} highlightTone="#faf6ec" midTone="#eee6d6" rimTone="#d1c7b2" />
        </div>
      </div>
    </div>
  );
});
