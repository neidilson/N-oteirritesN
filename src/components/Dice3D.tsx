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

const PIP_CELLS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8]
};

const ClassicDiceFace: React.FC<{ value: number }> = React.memo(({ value }) => {
  const active = PIP_CELLS[value] || PIP_CELLS[1];
  return (
    <div className={`dice-3d-face dice-face-${value}`}>
      {Array.from({ length: 9 }, (_, idx) => {
        const hasPip = active.includes(idx);
        if (!hasPip) return <span key={idx} />;
        return (
          <span
            key={idx}
            className={`dice-pip ${value === 1 ? 'dice-pip-red' : ''}`}
          />
        );
      })}
    </div>
  );
});

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
    const shadowOpacity = Math.max(0.16, 0.52 - elevation * 0.008);
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
      {/* Ground Shadow */}
      <div
        ref={setShadowRef}
        className="absolute left-1/2 top-[112%] w-12 h-3.5 sm:w-14 sm:h-4 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.28) 52%, transparent 78%)',
          transition: instantTransition ? 'none' : 'transform 0.12s ease-out, opacity 0.12s ease-out',
          willChange: 'transform, opacity'
        }}
      />

      {/* Classic 6-Faced 3D Casino Cube */}
      <div
        ref={setCubeRef}
        className={`dice-3d-cube ${instantTransition ? 'is-dragging' : ''}`}
        style={{
          transition: instantTransition ? 'none' : 'transform 0.12s cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      >
        <ClassicDiceFace value={1} />
        <ClassicDiceFace value={2} />
        <ClassicDiceFace value={3} />
        <ClassicDiceFace value={4} />
        <ClassicDiceFace value={5} />
        <ClassicDiceFace value={6} />
      </div>
    </div>
  );
});
