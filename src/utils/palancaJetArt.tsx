import React, { useMemo } from 'react';
import type { PalancaJetPhase } from '../types';

interface PalancaJetFlightSceneProps {
  phase: PalancaJetPhase;
  multiplier: number;
  elapsedMs: number;
  bettingRemainingMs: number;
  bettingDurationSec: number;
  crashPoint: number | null;
  roundNumber: number;
}

export const PalancaJetFlightScene: React.FC<PalancaJetFlightSceneProps> = ({
  phase,
  multiplier,
  elapsedMs,
  bettingRemainingMs,
  bettingDurationSec,
  crashPoint,
  roundNumber
}) => {
  // Normalized flight progress along chart (smoothly adapts scale at high multipliers)
  const { pointsPath, areaPath, jetX, jetY, jetAngleDeg, yTicks } = useMemo(() => {
    const startX = 62;
    const startY = 304;
    const maxW = 650;
    const maxH = 228;

    const progressTime =
      phase === 'BETTING' ? 0 : Math.min(1, Math.sqrt(Math.max(0, elapsedMs) / 28000));
    const multSpan = Math.max(1.0, multiplier - 1.0);
    const maxScaleMult = Math.max(2.0, multiplier * 1.18);
    const progressY =
      phase === 'BETTING' ? 0 : Math.min(1, Math.log(1 + multSpan) / Math.log(1 + (maxScaleMult - 1)));

    const endX = startX + Math.max(0.04, progressTime) * maxW;
    const endY = startY - progressY * maxH;

    // Quadratic bezier control point creating authentic aviation ascent curve
    const cpX = startX + (endX - startX) * 0.62;
    const cpY = startY - (startY - endY) * 0.14;

    const d = `M ${startX} ${startY} Q ${cpX.toFixed(1)} ${cpY.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
    const area = `${d} L ${endX.toFixed(1)} ${startY} L ${startX} ${startY} Z`;

    // Tangent angle at t=1 for quadratic bezier: 2*(P2 - P1)
    const dx = endX - cpX;
    const dy = endY - cpY;
    const angleRad = Math.atan2(dy, Math.max(1, dx));
    const angleDeg = phase === 'BETTING' ? -6 : Math.max(-42, Math.min(-4, (angleRad * 180) / Math.PI));

    const ticks = [1.0, 1.5, 2.0, 3.0, 5.0, 10.0, 20.0, 50.0, 100.0]
      .filter((t) => t === 1.0 || t <= maxScaleMult * 1.05)
      .slice(-5)
      .map((t) => {
        const yFrac = Math.min(1, Math.log(1 + (t - 1)) / Math.log(1 + (maxScaleMult - 1)));
        return {
          label: `${t.toFixed(1)}x`,
          y: startY - yFrac * maxH
        };
      });

    return {
      pointsPath: d,
      areaPath: area,
      jetX: phase === 'BETTING' ? startX : endX,
      jetY: phase === 'BETTING' ? startY : endY,
      jetAngleDeg: angleDeg,
      yTicks: ticks
    };
  }, [phase, multiplier, elapsedMs]);

  const countdownSec = Math.max(0, bettingRemainingMs / 1000);
  const countdownPct = Math.min(
    100,
    Math.max(0, (bettingRemainingMs / Math.max(1000, bettingDurationSec * 1000)) * 100)
  );

  return (
    <div className="relative w-full h-[300px] sm:h-[360px] rounded-2xl overflow-hidden border border-neutral-800 bg-[#090a0f] select-none">
      {/* Original Angolan Aviation & Horizon SVG */}
      <svg
        viewBox="0 0 800 360"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full block"
        aria-label="Painel de voo do Palanca Jet sobre a paisagem de Angola"
      >
        <defs>
          <linearGradient id="angolaSkyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#090a10" />
            <stop offset="52%" stopColor="#160c11" />
            <stop offset="86%" stopColor="#2a110d" />
            <stop offset="100%" stopColor="#3c1b0c" />
          </linearGradient>
          <radialGradient id="angolaSunGlow" cx="76%" cy="84%" r="48%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.34" />
            <stop offset="50%" stopColor="#dc2626" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#090a10" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="curveAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={phase === 'CRASHED' ? '#ef4444' : '#f59e0b'} stopOpacity="0.34" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="curveStrokeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="55%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fde047" />
          </linearGradient>
          <linearGradient id="afterburnerGrad" x1="1" y1="0.5" x2="0" y2="0.5">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
            <stop offset="45%" stopColor="#f97316" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
          </linearGradient>
          <filter id="jetGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Sky & Horizon Warmth */}
        <rect width="800" height="360" fill="url(#angolaSkyGrad)" />
        <rect width="800" height="360" fill="url(#angolaSunGlow)" />

        {/* Subtle Stars */}
        <g fill="#fde68a" opacity="0.45">
          <circle cx="95" cy="48" r="1.1" />
          <circle cx="170" cy="34" r="1.4" />
          <circle cx="265" cy="72" r="1" />
          <circle cx="385" cy="28" r="1.3" />
          <circle cx="490" cy="54" r="1.1" />
          <circle cx="610" cy="38" r="1.5" />
          <circle cx="715" cy="64" r="1.2" />
          <circle cx="745" cy="30" r="1" />
        </g>

        {/* Rising Angolan Sun disc on horizon */}
        <circle cx="620" cy="296" r="64" fill="#f59e0b" opacity="0.16" />
        <circle cx="620" cy="296" r="40" fill="#fbbf24" opacity="0.18" />

        {/* Distant Savanna Hills */}
        <path
          d="M 0 304 Q 140 278 280 296 T 560 288 T 800 302 L 800 360 L 0 360 Z"
          fill="#110b0d"
          opacity="0.9"
        />

        {/* Luanda Bay Skyline Silhouette (center-right) */}
        <g fill="#160f14" stroke="#f59e0b" strokeOpacity="0.14" strokeWidth="0.6">
          <rect x="470" y="268" width="16" height="36" rx="1" />
          <rect x="490" y="252" width="18" height="52" rx="1" />
          <rect x="512" y="260" width="14" height="44" rx="1" />
          <rect x="530" y="238" width="22" height="66" rx="1.5" />
          <polygon points="535,238 541,226 547,238" fill="#160f14" />
          <rect x="556" y="256" width="16" height="48" rx="1" />
          <rect x="576" y="246" width="20" height="58" rx="1" />
          <rect x="600" y="265" width="14" height="39" rx="1" />
        </g>
        {/* Tiny warm Luanda tower lights */}
        <g fill="#fbbf24" opacity="0.55">
          <rect x="495" y="260" width="3" height="2" />
          <rect x="501" y="268" width="3" height="2" />
          <rect x="536" y="248" width="4" height="2" />
          <rect x="543" y="256" width="4" height="2" />
          <rect x="536" y="266" width="4" height="2" />
          <rect x="582" y="254" width="3" height="2" />
          <rect x="588" y="264" width="3" height="2" />
        </g>

        {/* Baobab (Imbondeiro) Silhouette Left */}
        <g fill="#0c080a" transform="translate(86, 250)">
          <path d="M 18 56 C 18 40 20 26 20 18 C 12 14 4 14 0 10 C 6 7 13 8 19 10 C 16 4 12 2 10 0 C 16 0 21 3 24 8 C 28 2 34 0 40 2 C 36 4 32 7 29 11 C 35 10 42 8 46 11 C 40 15 33 15 28 18 C 28 28 30 42 32 56 Z" />
          <ellipse cx="14" cy="7" rx="14" ry="7" />
          <ellipse cx="29" cy="6" rx="15" ry="7.5" />
          <ellipse cx="22" cy="12" rx="19" ry="7" />
        </g>

        {/* Palanca Negra Emblem Silhouette Right Ridge */}
        <g fill="#0c080a" transform="translate(692, 260)" opacity="0.95">
          {/* Majestic sweeping curved horns + head/body silhouette */}
          <path d="M 8 44 L 10 28 L 22 22 L 32 23 L 36 14 C 31 6 20 1 8 4 C 19 0 33 4 40 14 L 44 18 L 38 24 L 38 44 L 33 44 L 33 32 L 15 32 L 13 44 Z" />
        </g>

        {/* Runway / Ground Strip with Angolan Red-Gold stripe */}
        <rect x="0" y="304" width="800" height="56" fill="#07070b" />
        <line x1="0" y1="304" x2="800" y2="304" stroke="#dc2626" strokeOpacity="0.45" strokeWidth="1.5" />
        <line x1="62" y1="306" x2="735" y2="306" stroke="#facc15" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="10 10" />

        {/* Subtle Chart Grid Lines & Y-Axis Ticks */}
        <g>
          {yTicks.map((tick) => (
            <g key={tick.label}>
              <line
                x1="58"
                y1={tick.y}
                x2="758"
                y2={tick.y}
                stroke="#ffffff"
                strokeOpacity="0.06"
                strokeDasharray="4 6"
              />
              <text
                x="14"
                y={tick.y + 4}
                fill="#a3a3a3"
                fontSize="11"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fontWeight="700"
              >
                {tick.label}
              </text>
            </g>
          ))}
        </g>

        {/* Flight Curve Area & Trajectory Line */}
        {phase !== 'BETTING' && (
          <>
            <path d={areaPath} fill="url(#curveAreaGrad)" />
            <path
              d={pointsPath}
              fill="none"
              stroke={phase === 'CRASHED' ? '#ef4444' : 'url(#curveStrokeGrad)'}
              strokeWidth="4"
              strokeLinecap="round"
              filter="url(#jetGlow)"
            />
          </>
        )}

        {/* Palanca Jet Aircraft (Flying or Perched at Start) */}
        {phase !== 'CRASHED' && (
          <g transform={`translate(${jetX.toFixed(1)}, ${jetY.toFixed(1)}) rotate(${jetAngleDeg.toFixed(1)})`}>
            {/* Supersonic Afterburner Flame */}
            {phase === 'FLYING' && (
              <g>
                <polygon
                  points="-22,2 -58,-3 -44,2 -58,7"
                  fill="url(#afterburnerGrad)"
                />
                <polygon
                  points="-20,2 -38,0 -32,2 -38,4"
                  fill="#fef08a"
                />
              </g>
            )}
            {/* Main Delta Wing & Fuselage in Angolan Red / Obsidian / Gold */}
            <path
              d="M -22 6 L -12 -10 L 8 -2 L 32 1 C 37 2 37 4 32 5 L 8 8 L -14 11 Z"
              fill="#111116"
              stroke="#fbbf24"
              strokeWidth="1.2"
            />
            {/* Crimson Wing Stripe */}
            <path d="M -14 3 L 10 -1 L 20 3 L -12 8 Z" fill="#dc2626" />
            {/* Gold Nose & Canopy */}
            <path d="M 8 -1.5 Q 18 -5 24 1 L 10 1.5 Z" fill="#fde047" opacity="0.9" />
            {/* Tailfin with Palanca Horn Accent */}
            <path d="M -20 3 L -26 -13 L -13 -3 Z" fill="#dc2626" stroke="#facc15" strokeWidth="0.9" />
            <path d="M -22 -5 C -23 -9 -19 -11 -16 -9" fill="none" stroke="#facc15" strokeWidth="1.1" />
          </g>
        )}

        {/* Crash Explosion Ring */}
        {phase === 'CRASHED' && (
          <g transform={`translate(${jetX.toFixed(1)}, ${jetY.toFixed(1)})`}>
            <circle r="38" fill="#ef4444" opacity="0.22" />
            <circle r="22" fill="#f97316" opacity="0.4" />
            <circle r="10" fill="#fde047" opacity="0.85" />
            <path
              d="M -26 -14 L -8 -4 L -16 -24 L 0 -10 L 18 -24 L 10 -4 L 30 -6 L 14 4 L 24 20 L 4 10 L -10 24 L -6 6 Z"
              fill="#fbbf24"
              opacity="0.75"
            />
          </g>
        )}
      </svg>

      {/* Top Left Round Badge */}
      <div className="absolute top-3 left-3 flex items-center gap-2 text-[11px] font-mono text-neutral-300 bg-black/55 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/10">
        <span>Ronda #{roundNumber}</span>
        <span aria-hidden="true">·</span>
        <span className={phase === 'FLYING' ? 'text-emerald-400 font-bold' : phase === 'CRASHED' ? 'text-red-400 font-bold' : 'text-yellow-400 font-bold'}>
          {phase === 'BETTING' ? 'Apostas Abertas' : phase === 'FLYING' ? 'Em Voo' : 'Crash'}
        </span>
      </div>

      {/* Center Giant Multiplier / Phase Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 text-center">
        {phase === 'BETTING' && (
          <div className="space-y-3 max-w-sm w-full bg-black/60 backdrop-blur-sm px-6 py-5 rounded-2xl border border-yellow-500/30 shadow-2xl">
            <span className="text-xs font-black uppercase tracking-widest text-yellow-400 block">
              Apostas Abertas · Próximo Voo
            </span>
            <div className="text-4xl sm:text-5xl font-black text-white tabular-nums">
              {countdownSec.toFixed(1)}s
            </div>
            <div className="w-full h-2.5 bg-neutral-800 rounded-full overflow-hidden border border-neutral-700">
              <div
                className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 transition-all duration-100"
                style={{ width: `${countdownPct}%` }}
              />
            </div>
            <span className="text-[11px] text-neutral-300 block">
              Prepare as suas 2 apostas antes da descolagem
            </span>
          </div>
        )}

        {phase === 'FLYING' && (
          <div className="space-y-1 drop-shadow-[0_6px_24px_rgba(0,0,0,0.9)]">
            <div className="text-5xl sm:text-7xl font-black tracking-tight tabular-nums text-white">
              {multiplier.toFixed(2)}
              <span className="text-yellow-400">x</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-300/90 block">
              Palanca Jet a subir
            </span>
          </div>
        )}

        {phase === 'CRASHED' && (
          <div className="space-y-1.5 bg-red-950/75 backdrop-blur-sm px-7 py-5 rounded-2xl border border-red-500/70 shadow-2xl">
            <span className="text-xs font-black uppercase tracking-widest text-red-300 block">
              O Jato Desapareceu!
            </span>
            <div className="text-5xl sm:text-6xl font-black tracking-tight tabular-nums text-red-400">
              {(crashPoint ?? multiplier).toFixed(2)}x
            </div>
            <span className="text-[11px] text-neutral-300 block">
              A preparar a próxima ronda...
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
