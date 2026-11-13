import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useGame } from '../context/GameContext';
import {
  CIRCUIT_COORDS,
  HOME_LANES,
  YARD_COORDS,
  GOAL_COORD,
  COLOR_HEX,
  COLOR_NAMES,
  SAFE_CELLS
} from '../utils/ludoRules';
import { PlayerColor, Piece, BoardThemeId } from '../types';
import {
  Sparkles,
  Trophy,
  Send,
  RotateCcw,
  AlertTriangle,
  MessageSquare,
  Flame,
  Copy,
  Check,
  Share2,
  Play,
  Users,
  Bot,
  Palette,
  Volume2
} from 'lucide-react';
import { Dice3D, FACE_ORIENTATIONS } from './Dice3D';
import { AvatarMonster, MonsterAuraKind } from './DiceMonsterAura';
import { BOARD_THEMES } from '../utils/boardThemes';
import { BoardThemesModal } from './BoardThemesModal';
import { ThemePieceFigure } from './ThemePieceFigure';
import { soundManager, DICE_SOUND_OPTIONS, DiceSoundPreset } from '../utils/soundEffects';

function nearestCongruentAngle(current: number, targetBase: number, angularVel: number): number {
  let diff = ((targetBase - current) % 360 + 540) % 360 - 180;
  if (angularVel > 40 && diff < -20) diff += 360;
  else if (angularVel < -40 && diff > 20) diff -= 360;
  return current + diff;
}

const TurnTimerText: React.FC<{ roomId: string; fallback: number }> = React.memo(({ roomId, fallback }) => {
  const { getRoomTurnTimer, subscribeTurnTimer } = useGame();
  const [seconds, setSeconds] = useState<number>(() => getRoomTurnTimer(roomId) ?? fallback);

  useEffect(() => {
    setSeconds(getRoomTurnTimer(roomId) ?? fallback);
    return subscribeTurnTimer((updatedRoomId, nextSec) => {
      if (updatedRoomId === roomId) {
        setSeconds(nextSec);
      }
    });
  }, [roomId, fallback, getRoomTurnTimer, subscribeTurnTimer]);

  return <>{seconds}s</>;
});

const LudoBoardGrid = React.memo(
  ({ myColor, themeId }: { myColor: PlayerColor | null; themeId: BoardThemeId }) => {
    const theme = BOARD_THEMES[themeId] || BOARD_THEMES.classic;
    const { bases } = theme;
    const hasArt = Boolean(theme.artUrl);

    const yardCorners = [
      { key: 'green' as const, x: 0, y: 0, cfg: bases.green, circles: [[20, 24], [40, 24], [20, 42], [40, 42]] },
      { key: 'yellow' as const, x: 90, y: 0, cfg: bases.yellow, circles: [[110, 24], [130, 24], [110, 42], [130, 42]] },
      { key: 'red' as const, x: 0, y: 90, cfg: bases.red, circles: [[20, 114], [40, 114], [20, 132], [40, 132]] },
      { key: 'blue' as const, x: 90, y: 90, cfg: bases.blue, circles: [[110, 114], [130, 114], [110, 132], [130, 132]] }
    ];

    return (
      <div
        className="absolute inset-0 rounded-2xl overflow-hidden border-2 pointer-events-none"
        style={{
          backgroundColor: theme.canvasBg,
          borderColor: theme.frameBorder,
          contain: 'strict',
          transform: 'translateZ(0)'
        }}
      >
        {hasArt && (
          <img
            src={theme.artUrl}
            alt={theme.name}
            referrerPolicy="no-referrer"
            decoding="async"
            loading="eager"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        <svg viewBox="0 0 150 150" className="relative z-10 w-full h-full block" shapeRendering="crispEdges">
          {!hasArt && <rect width="150" height="150" fill={theme.canvasBg} />}

          {/* 4 Corner Yards (keep 2D theme illustration visible inside frames, crisp high-contrast sockets) */}
          {yardCorners.map((yard) => (
            <g key={yard.key}>
              {!hasArt ? (
                <>
                  <rect x={yard.x} y={yard.y} width="60" height="60" fill={yard.cfg.outer} stroke="#1f2937" strokeWidth="0.6" />
                  <rect x={yard.x + 7} y={yard.y + 7} width="46" height="46" rx="4" fill={theme.yardInnerBg} stroke={yard.cfg.innerBorder} strokeWidth="0.7" />
                </>
              ) : (
                <>
                  <rect
                    x={yard.x + 0.6}
                    y={yard.y + 0.6}
                    width="58.8"
                    height="58.8"
                    fill={yard.cfg.outer}
                    fillOpacity="0.12"
                    stroke={yard.cfg.outer}
                    strokeWidth="1.6"
                  />
                  <rect
                    x={yard.x + 8}
                    y={yard.y + 7.5}
                    width="44"
                    height="7"
                    rx="2.5"
                    fill="#09090b"
                    fillOpacity="0.85"
                    stroke={yard.cfg.outer}
                    strokeWidth="0.7"
                  />
                </>
              )}

              {yard.circles.map(([cx, cy], idx) => (
                <circle
                  key={idx}
                  cx={cx}
                  cy={cy}
                  r="5.6"
                  fill={yard.cfg.slotBg}
                  fillOpacity={hasArt ? 0.94 : 1}
                  stroke={yard.cfg.outer}
                  strokeWidth={hasArt ? '1.35' : '0.8'}
                />
              ))}

              <text
                x={yard.x + 30}
                y={yard.y + 12.4}
                textAnchor="middle"
                fontSize="3.1"
                fontWeight="900"
                fill={hasArt ? '#ffffff' : yard.cfg.titleColor}
              >
                {yard.cfg.label}{myColor === yard.key ? ' ★' : ''}
              </text>
            </g>
          ))}

          {/* Center Goal Triangles */}
          <polygon points="60,60 90,60 75,75" fill={bases.yellow.outer} fillOpacity={hasArt ? 0.78 : 1} stroke="#09090b" strokeWidth="0.65" />
          <polygon points="60,60 60,90 75,75" fill={bases.green.outer} fillOpacity={hasArt ? 0.78 : 1} stroke="#09090b" strokeWidth="0.65" />
          <polygon points="60,90 90,90 75,75" fill={bases.red.outer} fillOpacity={hasArt ? 0.78 : 1} stroke="#09090b" strokeWidth="0.65" />
          <polygon points="90,60 90,90 75,75" fill={bases.blue.outer} fillOpacity={hasArt ? 0.78 : 1} stroke="#09090b" strokeWidth="0.65" />
          <circle cx="75" cy="75" r="5.6" fill={theme.canvasBg} fillOpacity={0.96} stroke="#09090b" strokeWidth="0.65" />
          <text x="75" y="77.4" textAnchor="middle" fontSize="6.5">
            {theme.centerSymbol}
          </text>

          {/* 52 Circuit Cells — 100% OPAQUE & HIGH-CONTRAST so walkable squares are always crystal-clear */}
          {CIRCUIT_COORDS.map((coord, idx) => {
            const isSafe = SAFE_CELLS.has(idx);
            const isStart = idx === 0 || idx === 13 || idx === 26 || idx === 39;
            const fill =
              idx === 0
                ? bases.red.outer
                : idx === 13
                ? bases.green.outer
                : idx === 26
                ? bases.yellow.outer
                : idx === 39
                ? bases.blue.outer
                : isSafe
                ? theme.safeTileBg
                : theme.tileBg;
            const stroke =
              idx === 0
                ? bases.red.innerBorder
                : idx === 13
                ? bases.green.innerBorder
                : idx === 26
                ? bases.yellow.innerBorder
                : idx === 39
                ? bases.blue.innerBorder
                : isSafe
                ? theme.safeTileBorder
                : theme.tileBorder;
            return (
              <g key={idx}>
                <rect
                  x={coord.x * 10}
                  y={coord.y * 10}
                  width="10"
                  height="10"
                  fill={fill}
                  fillOpacity={1}
                  stroke={stroke}
                  strokeWidth={hasArt ? '0.7' : '0.5'}
                />
                {isSafe && !isStart && (
                  <text
                    x={coord.x * 10 + 5}
                    y={coord.y * 10 + 6.8}
                    textAnchor="middle"
                    fontSize="5.6"
                    fill={theme.safeStarColor}
                    fontWeight="bold"
                  >
                    ★
                  </text>
                )}
              </g>
            );
          })}

          {/* Home Straight Lanes — 100% OPAQUE & CRISP */}
          {HOME_LANES.red.map((c, i) => (
            <rect key={`rl_${i}`} x={c.x * 10} y={c.y * 10} width="10" height="10" fill={bases.red.outer} fillOpacity={1} stroke={bases.red.innerBorder} strokeWidth="0.65" />
          ))}
          {HOME_LANES.green.map((c, i) => (
            <rect key={`gl_${i}`} x={c.x * 10} y={c.y * 10} width="10" height="10" fill={bases.green.outer} fillOpacity={1} stroke={bases.green.innerBorder} strokeWidth="0.65" />
          ))}
          {HOME_LANES.yellow.map((c, i) => (
            <rect key={`yl_${i}`} x={c.x * 10} y={c.y * 10} width="10" height="10" fill={bases.yellow.outer} fillOpacity={1} stroke={bases.yellow.innerBorder} strokeWidth="0.65" />
          ))}
          {HOME_LANES.blue.map((c, i) => (
            <rect key={`bl_${i}`} x={c.x * 10} y={c.y * 10} width="10" height="10" fill={bases.blue.outer} fillOpacity={1} stroke={bases.blue.innerBorder} strokeWidth="0.65" />
          ))}
        </svg>
      </div>
    );
  }
);

export const LudoBoard: React.FC = () => {
  const {
    selectedRoom,
    currentUser,
    selectBaseColor,
    addBotToRoom,
    startMatch,
    restartMatch,
    rollDice,
    movePiece,
    respondSurrenderOffer,
    sendChatMessage,
    leaveCurrentRoom
  } = useGame();

  const [chatInput, setChatInput] = useState('');
  const [showVictoryConfetti, setShowVictoryConfetti] = useState(false);
  const [copiedCode, setCopiedCode] = useState<'code' | 'link' | null>(null);
  const [showThemesModal, setShowThemesModal] = useState(false);
  const [diceSound, setDiceSound] = useState<DiceSoundPreset>(() => soundManager.getDiceSoundPreset());

  // Board reference and 60fps 3D rigid-body dice physics state (direct-DOM GPU transforms)
  const boardRef = useRef<HTMLDivElement>(null);
  const diceMoverRef = useRef<HTMLDivElement>(null);
  const diceCubeRef = useRef<HTMLDivElement>(null);
  const diceShadowRef = useRef<HTMLDivElement>(null);

  const [dicePos, setDicePos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isDraggingDice, setIsDraggingDice] = useState(false);
  const [isPhysicsRolling, setIsPhysicsRolling] = useState(false);
  const [diceElevation, setDiceElevation] = useState(0);
  const [playerMonsters, setPlayerMonsters] = useState<
    Partial<Record<PlayerColor, { key: number; kind: MonsterAuraKind; label: string }>>
  >({});

  const lastAuraSignatureRef = useRef<string>('');
  const lastCaptureSigRef = useRef<string>('');
  const lastWinnerSigRef = useRef<string>('');
  const prevPiecePosRef = useRef<Map<string, number>>(new Map());
  const monsterTimersRef = useRef<Partial<Record<PlayerColor, ReturnType<typeof setTimeout>>>>({});
  const [diceRotation, setDiceRotation] = useState<{ x: number; y: number; z: number }>(() => ({
    x: FACE_ORIENTATIONS[1].rx,
    y: FACE_ORIENTATIONS[1].ry,
    z: 0
  }));

  const anchorPosRef = useRef<{ x: number; y: number }>({ x: 50, y: 50 });
  const dicePosRef = useRef<{ x: number; y: number }>({ x: 50, y: 50 });
  const diceRotRef = useRef<{ x: number; y: number; z: number }>({
    x: FACE_ORIENTATIONS[1].rx,
    y: FACE_ORIENTATIONS[1].ry,
    z: 0
  });
  const boardRectRef = useRef<{ left: number; top: number; width: number; height: number }>({
    left: 0,
    top: 0,
    width: 500,
    height: 500
  });
  const lastPointerRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const velocityRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });
  const totalDragDistRef = useRef(0);
  const isDraggingDiceRef = useRef(false);

  const isPhysicsRollingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const serverRollRef = useRef<{
    isRolling: boolean;
    diceValue: number;
    hasRolled: boolean;
    lastAction: string;
    sawRolling: boolean;
    preThrowAction: string;
  }>({
    isRolling: false,
    diceValue: 1,
    hasRolled: false,
    lastAction: '',
    sawRolling: false,
    preThrowAction: ''
  });

  // Imperative 60fps GPU-only DOM updater (ZERO React re-renders & ZERO layout recalcs per frame)
  const applyDiceVisuals = (
    xPct: number,
    yPct: number,
    rx: number,
    ry: number,
    rz: number,
    elevation: number
  ) => {
    dicePosRef.current = { x: xPct, y: yPct };
    diceRotRef.current = { x: rx, y: ry, z: rz };

    if (diceMoverRef.current) {
      const bw = boardRectRef.current.width || 500;
      const bh = boardRectRef.current.height || 500;
      const dxPx = ((xPct - anchorPosRef.current.x) / 100) * bw;
      const dyPx = ((yPct - anchorPosRef.current.y) / 100) * bh;
      diceMoverRef.current.style.transform = `translate3d(${dxPx.toFixed(1)}px, ${dyPx.toFixed(1)}px, 0)`;
    }
    if (diceCubeRef.current) {
      diceCubeRef.current.style.transform = `rotateX(-24deg) rotateY(28deg) translate3d(0, ${(-elevation).toFixed(1)}px, ${elevation.toFixed(1)}px) rotateX(${rx.toFixed(1)}deg) rotateY(${ry.toFixed(1)}deg) rotateZ(${rz.toFixed(1)}deg)`;
    }
    if (diceShadowRef.current) {
      const shadowScale = 1 + Math.min(0.45, elevation * 0.011);
      const shadowOpacity = Math.max(0.18, 0.5 - elevation * 0.006);
      const shadowOffsetY = elevation * 0.45;
      diceShadowRef.current.style.opacity = shadowOpacity.toFixed(3);
      diceShadowRef.current.style.transform = `translate3d(-44%, -46%, 0) translateY(${shadowOffsetY.toFixed(1)}px) scale(${shadowScale.toFixed(3)})`;
    }
  };

  const myPlayer = selectedRoom?.players.find(p => p.userId === currentUser.id) || null;
  const myColor: PlayerColor | null = myPlayer?.color || null;
  const isMyTurn =
    Boolean(selectedRoom) &&
    selectedRoom?.status === 'PLAYING' &&
    Boolean(myColor) &&
    selectedRoom?.boardState.currentTurnColor === myColor;

  // Keep latest server boardState synced into ref for the 60fps RAF loop
  useEffect(() => {
    if (!selectedRoom) return;
    const bs = selectedRoom.boardState;
    serverRollRef.current.isRolling = bs.isRolling;
    serverRollRef.current.diceValue = bs.diceValue;
    serverRollRef.current.hasRolled = bs.hasRolled;
    serverRollRef.current.lastAction = bs.lastAction || '';
    if (bs.isRolling) {
      serverRollRef.current.sawRolling = true;
    }
  }, [
    selectedRoom?.boardState.isRolling,
    selectedRoom?.boardState.diceValue,
    selectedRoom?.boardState.hasRolled,
    selectedRoom?.boardState.lastAction,
    selectedRoom
  ]);

  // Launch 60fps wall-bounce & floor-bounce 3D physics roll immediately on frame 0
  const startPhysicsThrow = (initVxPctPerSec: number, initVyPctPerSec: number) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (boardRef.current) {
      const r = boardRef.current.getBoundingClientRect();
      boardRectRef.current = { left: r.left, top: r.top, width: r.width, height: r.height };
    }

    isPhysicsRollingRef.current = true;
    setIsPhysicsRolling(true);
    serverRollRef.current.sawRolling = serverRollRef.current.isRolling;
    serverRollRef.current.preThrowAction = serverRollRef.current.lastAction;

    let x = dicePosRef.current.x;
    let y = dicePosRef.current.y;
    let vx = initVxPctPerSec;
    let vy = initVyPctPerSec;

    // Ensure ultra-fast, energetic rolling velocity along the throw vector
    const speed = Math.hypot(vx, vy);
    if (speed < 480) {
      const angle = speed > 5 ? Math.atan2(vy, vx) : Math.random() * Math.PI * 2;
      vx = Math.cos(angle) * 520;
      vy = Math.sin(angle) * 520;
    } else if (speed > 760) {
      const scale = 760 / speed;
      vx *= scale;
      vy *= scale;
    }

    let z = 24;
    let vz = 240;
    let rx = diceRotRef.current.x;
    let ry = diceRotRef.current.y;
    let rz = diceRotRef.current.z;

    let vrx = -vy * 11.8 + (Math.random() - 0.5) * 200;
    let vry = vx * 11.8 + (Math.random() - 0.5) * 200;
    let vrz = (vx - vy) * 3.8;

    const MIN_WALL = 8.5;
    const MAX_WALL = 91.5;
    const GRAVITY = 1750;
    const startTime = performance.now();
    let lastTime = startTime;
    let lastWallSoundAt = startTime;

    let settling = false;
    let settleStart = 0;
    const SETTLE_DURATION = 58;
    let sRx = rx;
    let sRy = ry;
    let sRz = rz;
    let sZ = z;
    let tRx = rx;
    let tRy = ry;
    let tRz = rz;

    const step = (now: number) => {
      const dt = Math.min(0.032, Math.max(0.004, (now - lastTime) / 1000));
      lastTime = now;
      const elapsed = now - startTime;

      // Move on board & collide fast with all 4 walls and corners
      x += vx * dt;
      y += vy * dt;
      let hitWall = false;

      if (x < MIN_WALL) {
        x = MIN_WALL;
        vx = Math.abs(vx) * 0.85;
        vry = vx * 10.5;
        vrz += (Math.random() - 0.5) * 340;
        vz = Math.max(vz, 95);
        hitWall = true;
      } else if (x > MAX_WALL) {
        x = MAX_WALL;
        vx = -Math.abs(vx) * 0.85;
        vry = vx * 10.5;
        vrz += (Math.random() - 0.5) * 340;
        vz = Math.max(vz, 95);
        hitWall = true;
      }

      if (y < MIN_WALL) {
        y = MIN_WALL;
        vy = Math.abs(vy) * 0.85;
        vrx = -vy * 10.5;
        vrz += (Math.random() - 0.5) * 340;
        vz = Math.max(vz, 95);
        hitWall = true;
      } else if (y > MAX_WALL) {
        y = MAX_WALL;
        vy = -Math.abs(vy) * 0.85;
        vrx = -vy * 10.5;
        vrz += (Math.random() - 0.5) * 340;
        vz = Math.max(vz, 95);
        hitWall = true;
      }

      if (hitWall && now - lastWallSoundAt > 55) {
        lastWallSoundAt = now;
        soundManager.playDiceWallBounce();
      }

      const srv = serverRollRef.current;
      const serverReady =
        !srv.isRolling &&
        (srv.sawRolling || srv.hasRolled || srv.lastAction !== srv.preThrowAction || elapsed > 450);

      if (!settling) {
        vz -= GRAVITY * dt;
        z += vz * dt;
        if (z <= 0) {
          z = 0;
          if (!serverReady && elapsed < 115) {
            vz = Math.max(Math.abs(vz) * 0.58, 95);
          } else if (Math.abs(vz) > 45) {
            vz = -vz * 0.5;
            vrx *= 0.9;
            vry *= 0.9;
          } else {
            vz = 0;
          }
        }

        rx += vrx * dt;
        ry += vry * dt;
        rz += vrz * dt;

        const damp = Math.pow(0.992, dt * 60);
        vx *= damp;
        vy *= damp;
        vrx *= damp;
        vry *= damp;
        vrz *= damp;

        if (serverReady && elapsed >= 115) {
          settling = true;
          settleStart = now;
          const targetFace = FACE_ORIENTATIONS[srv.diceValue] || FACE_ORIENTATIONS[1];
          sRx = rx;
          sRy = ry;
          sRz = rz;
          sZ = z;
          tRx = nearestCongruentAngle(rx, targetFace.rx, vrx);
          tRy = nearestCongruentAngle(ry, targetFace.ry, vry);
          tRz = nearestCongruentAngle(rz, 0, vrz);
        }
      } else {
        const p = Math.min(1, (now - settleStart) / SETTLE_DURATION);
        const ease = 1 - Math.pow(1 - p, 3);

        vx *= Math.pow(0.82, dt * 60);
        vy *= Math.pow(0.82, dt * 60);
        rx = sRx + (tRx - sRx) * ease;
        ry = sRy + (tRy - sRy) * ease;
        rz = sRz + (tRz - sRz) * ease;
        z = sZ * (1 - ease);

        if (p >= 1) {
          anchorPosRef.current = { x, y };
          dicePosRef.current = { x, y };
          diceRotRef.current = { x: tRx, y: tRy, z: tRz };
          setDicePos({ x, y });
          setDiceRotation({ x: tRx, y: tRy, z: tRz });
          setDiceElevation(0);
          isPhysicsRollingRef.current = false;
          setIsPhysicsRolling(false);
          rafRef.current = null;
          return;
        }
      }

      // Direct GPU-composited DOM update (ZERO React re-render per frame!)
      applyDiceVisuals(x, y, rx, ry, rz, z);
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
  };

  // Sync diceMoverRef transform atomically when React commits the final dicePos
  useLayoutEffect(() => {
    if (diceMoverRef.current && !isPhysicsRollingRef.current && !isDraggingDiceRef.current) {
      diceMoverRef.current.style.transform = 'translate3d(0px, 0px, 0px)';
    }
  }, [dicePos.x, dicePos.y]);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Watch for server-triggered rolls (e.g. Bot or online opponent) OR instant click result update
  const prevServerRollingRef = useRef(false);
  const prevDiceValueRef = useRef(1);
  const prevRollActionRef = useRef('');
  useEffect(() => {
    if (!selectedRoom) return;
    const bs = selectedRoom.boardState;

    // Bot or remote player started a roll -> show fast 3D throw on board
    if (bs.isRolling && !prevServerRollingRef.current && !isPhysicsRollingRef.current && !isDraggingDice) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 380 + Math.random() * 140;
      startPhysicsThrow(Math.cos(angle) * speed, Math.sin(angle) * speed);
    }

    // Instant click roll (no isRolling phase) -> turn cube crisply to new face (even if same number!)
    const actionStr = bs.lastAction || '';
    const actionChanged = actionStr !== prevRollActionRef.current && actionStr.includes('tirou');
    if (
      !bs.isRolling &&
      !isPhysicsRollingRef.current &&
      !isDraggingDice &&
      (bs.diceValue !== prevDiceValueRef.current || actionChanged)
    ) {
      const targetFace = FACE_ORIENTATIONS[bs.diceValue] || FACE_ORIENTATIONS[1];
      const extraSpin = bs.diceValue === prevDiceValueRef.current ? 360 : 80;
      const nextRot = {
        x: nearestCongruentAngle(diceRotRef.current.x, targetFace.rx, extraSpin),
        y: nearestCongruentAngle(diceRotRef.current.y, targetFace.ry, extraSpin),
        z: nearestCongruentAngle(diceRotRef.current.z, 0, 0)
      };
      diceRotRef.current = nextRot;
      setDiceRotation(nextRot);
    }

    prevServerRollingRef.current = bs.isRolling;
    prevDiceValueRef.current = bs.diceValue;
    prevRollActionRef.current = actionStr;
  }, [
    selectedRoom?.boardState.isRolling,
    selectedRoom?.boardState.diceValue,
    selectedRoom?.boardState.lastAction,
    isDraggingDice
  ]);

  const triggerPlayerMonster = (color: PlayerColor, kind: MonsterAuraKind, label: string, durationMs = 2100) => {
    const existingTimer = monsterTimersRef.current[color];
    if (existingTimer) clearTimeout(existingTimer);

    setPlayerMonsters(prev => ({
      ...prev,
      [color]: { key: Date.now() + Math.random(), kind, label }
    }));

    monsterTimersRef.current[color] = setTimeout(() => {
      setPlayerMonsters(prev => {
        const next = { ...prev };
        delete next[color];
        return next;
      });
    }, durationMs);
  };

  // 1. Manifest Monster on the player's Side Avatar Card when rolling 6
  useEffect(() => {
    if (!selectedRoom || selectedRoom.status !== 'PLAYING' || isPhysicsRolling || isDraggingDice) return;
    const bs = selectedRoom.boardState;
    if (bs.isRolling) return;

    const actionText = bs.lastAction || '';
    const sig = `${bs.currentTurnColor}|${bs.diceValue}|${bs.hasRolled}|${actionText}`;
    if (sig === lastAuraSignatureRef.current) return;
    lastAuraSignatureRef.current = sig;

    const isRollResult = bs.hasRolled || actionText.includes('tirou');
    if (isRollResult && bs.diceValue === 6) {
      const roller =
        selectedRoom.players.find(p => actionText.includes(`${p.name} tirou`)) ||
        selectedRoom.players.find(p => p.color === bs.currentTurnColor);
      if (roller) {
        triggerPlayerMonster(roller.color, 'six', 'MONSTRO DO 6! ⚡');
      }
    }
  }, [
    selectedRoom?.status,
    selectedRoom?.boardState.isRolling,
    selectedRoom?.boardState.hasRolled,
    selectedRoom?.boardState.diceValue,
    selectedRoom?.boardState.lastAction,
    selectedRoom?.boardState.currentTurnColor,
    isPhysicsRolling,
    isDraggingDice
  ]);

  // 2. Manifest Monsters on Side Avatar Cards when an opponent piece is captured
  useEffect(() => {
    if (!selectedRoom) return;
    const cap = selectedRoom.boardState.captureEvent;
    if (!cap) return;

    const capSig = `${cap.captorColor}|${cap.capturedColor}|${cap.position}|${cap.text}`;
    if (capSig === lastCaptureSigRef.current) return;
    lastCaptureSigRef.current = capSig;

    triggerPlayerMonster(cap.captorColor, 'capture', 'DERRUBOU! 💥');
    triggerPlayerMonster(cap.capturedColor, 'knocked', 'COMIDO! 💀');
  }, [selectedRoom?.boardState.captureEvent]);

  // 3. Manifest Goal / Victory Monster on Side Avatar Card when a piece reaches 200 or player wins
  useEffect(() => {
    if (!selectedRoom) {
      prevPiecePosRef.current.clear();
      return;
    }

    const nextMap = new Map<string, number>();
    let goalColor: PlayerColor | null = null;

    for (const p of selectedRoom.players) {
      for (const pc of p.pieces) {
        const k = `${selectedRoom.id}_${p.color}_${pc.id}`;
        nextMap.set(k, pc.position);
        const prevPos = prevPiecePosRef.current.get(k);
        if (prevPos !== undefined && prevPos !== 200 && pc.position === 200) {
          goalColor = p.color;
        }
      }
    }
    prevPiecePosRef.current = nextMap;

    if (goalColor) {
      triggerPlayerMonster(goalColor, 'goal', 'PEÇA NA META! 🏆');
    }

    const winnerColor = selectedRoom.boardState.winner;
    if (winnerColor) {
      const winSig = `${selectedRoom.id}_${winnerColor}`;
      if (winSig !== lastWinnerSigRef.current) {
        lastWinnerSigRef.current = winSig;
        triggerPlayerMonster(winnerColor, 'victory', 'CAMPEÃO! 👑', 3000);
      }
    } else {
      lastWinnerSigRef.current = '';
    }
  }, [selectedRoom?.id, selectedRoom?.players, selectedRoom?.boardState.winner]);

  useEffect(() => {
    return () => {
      Object.values(monsterTimersRef.current).forEach(t => {
        if (t) clearTimeout(t);
      });
    };
  }, []);

  // Trigger confetti when someone wins the match
  useEffect(() => {
    if (selectedRoom?.boardState.winner) {
      setShowVictoryConfetti(true);
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#DC2626', '#FFCE00', '#000000', '#2563EB', '#16A34A']
      });
    } else {
      setShowVictoryConfetti(false);
    }
  }, [selectedRoom?.boardState.winner]);

  // Only center dice when entering a room or waiting to start (never pull it back after a roll!)
  useEffect(() => {
    anchorPosRef.current = { x: 50, y: 50 };
    dicePosRef.current = { x: 50, y: 50 };
    if (diceMoverRef.current) {
      diceMoverRef.current.style.transform = 'translate3d(0px, 0px, 0px)';
    }
    setDicePos({ x: 50, y: 50 });
  }, [selectedRoom?.id]);

  if (!selectedRoom) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Nenhuma mesa ativa selecionada</h2>
        <p className="text-neutral-400 mb-4">Escolha uma mesa no lobby ou entre com o código do seu amigo.</p>
        <button
          onClick={leaveCurrentRoom}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 font-semibold"
        >
          Voltar às Mesas
        </button>
      </div>
    );
  }

  const { boardState, players, currency, betAmount, prizePool, platformCommission } = selectedRoom;
  const winnerPlayer = boardState.winner ? players.find(p => p.color === boardState.winner) : null;
  const isHost = selectedRoom.hostId === currentUser.id;
  const inviteLink = `${window.location.origin}/?sala=${selectedRoom.code}`;

  const handleCopyInvite = (kind: 'code' | 'link') => {
    const value = kind === 'code' ? selectedRoom.code : inviteLink;
    navigator.clipboard.writeText(value);
    setCopiedCode(kind);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Pointer drag & throw physics handlers (zero React re-renders & zero CSS transition lag!)
  const handleDicePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isMyTurn || boardState.hasRolled || boardState.isRolling || isPhysicsRollingRef.current) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (boardRef.current) {
      const r = boardRef.current.getBoundingClientRect();
      boardRectRef.current = { left: r.left, top: r.top, width: r.width, height: r.height };
    }
    // Disable CSS transition immediately on pointerdown before React re-renders
    if (diceCubeRef.current) {
      diceCubeRef.current.style.transition = 'none';
    }
    if (diceShadowRef.current) {
      diceShadowRef.current.style.transition = 'none';
    }
    isDraggingDiceRef.current = true;
    setIsDraggingDice(true);
    totalDragDistRef.current = 0;
    velocityRef.current = { vx: 0, vy: 0 };
    lastPointerRef.current = { x: e.clientX, y: e.clientY, time: performance.now() };
    applyDiceVisuals(
      dicePosRef.current.x,
      dicePosRef.current.y,
      diceRotRef.current.x,
      diceRotRef.current.y,
      diceRotRef.current.z,
      26
    );
  };

  const handleDicePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingDiceRef.current) return;

    const now = performance.now();
    const dt = Math.max(8, now - lastPointerRef.current.time);
    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    totalDragDistRef.current += Math.hypot(dx, dy);

    const instVx = dx / dt;
    const instVy = dy / dt;
    velocityRef.current = {
      vx: instVx * 0.65 + velocityRef.current.vx * 0.35,
      vy: instVy * 0.65 + velocityRef.current.vy * 0.35
    };

    const nextRx = diceRotRef.current.x - dy * 2.4;
    const nextRy = diceRotRef.current.y + dx * 2.4;
    const nextRz = diceRotRef.current.z + (dx - dy) * 0.6;
    lastPointerRef.current = { x: e.clientX, y: e.clientY, time: now };

    const rect = boardRectRef.current;
    const pctX = Math.max(9, Math.min(91, ((e.clientX - rect.left) / rect.width) * 100));
    const pctY = Math.max(9, Math.min(91, ((e.clientY - rect.top) / rect.height) * 100));

    applyDiceVisuals(pctX, pctY, nextRx, nextRy, nextRz, 26);
  };

  const handleDicePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingDiceRef.current) return;
    isDraggingDiceRef.current = false;
    setIsDraggingDice(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const { vx, vy } = velocityRef.current;
    const throwSpeedPxMs = Math.hypot(vx, vy);
    const didThrow = totalDragDistRef.current >= 20 || throwSpeedPxMs >= 0.16;

    if (!didThrow) {
      // Function 1: Simple click on the dice -> stay right where it is and present result immediately
      anchorPosRef.current = { ...dicePosRef.current };
      if (diceMoverRef.current) {
        diceMoverRef.current.style.transform = 'translate3d(0px, 0px, 0px)';
      }
      setDicePos({ ...dicePosRef.current });
      setDiceElevation(0);
      if (isMyTurn && !boardState.hasRolled && !boardState.isRolling) {
        rollDice({ instant: true });
      }
      return;
    }

    // Function 2: Click & throw/launch on the board -> immediate 60fps rigid-body roll + wall bounces + server roll!
    const boardWidth = boardRectRef.current.width || 500;
    const vxPctPerSec = ((vx * 1000) / boardWidth) * 100;
    const vyPctPerSec = ((vy * 1000) / boardWidth) * 100;

    if (isMyTurn && !boardState.hasRolled && !boardState.isRolling) {
      startPhysicsThrow(vxPctPerSec, vyPctPerSec);
      rollDice({ instant: false });
    } else {
      anchorPosRef.current = { ...dicePosRef.current };
      if (diceMoverRef.current) {
        diceMoverRef.current.style.transform = 'translate3d(0px, 0px, 0px)';
      }
      setDicePos({ ...dicePosRef.current });
      setDiceRotation({ ...diceRotRef.current });
      setDiceElevation(0);
    }
  };

  const handleLaunchButtonClick = () => {
    if (!isMyTurn || boardState.hasRolled || boardState.isRolling || isPhysicsRollingRef.current) return;
    const angle = Math.random() * Math.PI * 2;
    const speed = 440 + Math.random() * 180;
    startPhysicsThrow(Math.cos(angle) * speed, Math.sin(angle) * speed);
    rollDice({ instant: false });
  };

  // Calculate 15x15 grid coordinates for GPU translate3d piece positioning
  const getPieceGridPosition = (piece: Piece): { gridX: number; gridY: number } => {
    let x = 7;
    let y = 7;

    if (piece.position === -1) {
      const coords = YARD_COORDS[piece.color][piece.id] || YARD_COORDS[piece.color][0];
      x = coords.x;
      y = coords.y;
    } else if (piece.position >= 0 && piece.position <= 51) {
      const coord = CIRCUIT_COORDS[piece.position] || { x: 7, y: 7 };
      x = coord.x;
      y = coord.y;
    } else if (piece.position >= 100 && piece.position <= 104) {
      const laneIdx = piece.position - 100;
      const coord = HOME_LANES[piece.color][laneIdx] || { x: 7, y: 7 };
      x = coord.x;
      y = coord.y;
    } else if (piece.position === 200) {
      const spread = piece.id % 2 === 0 ? -0.32 : 0.32;
      if (piece.color === 'red') {
        x = GOAL_COORD.x + spread;
        y = GOAL_COORD.y + 0.65;
      } else if (piece.color === 'yellow') {
        x = GOAL_COORD.x + spread;
        y = GOAL_COORD.y - 0.65;
      } else if (piece.color === 'green') {
        x = GOAL_COORD.x - 0.65;
        y = GOAL_COORD.y + spread;
      } else {
        x = GOAL_COORD.x + 0.65;
        y = GOAL_COORD.y + spread;
      }
    }

    return { gridX: x, gridY: y };
  };

  const unlockedThemes = currentUser.unlockedThemes || ['classic'];
  const requestedTheme = selectedRoom.boardTheme || currentUser.selectedTheme || 'classic';
  const activeThemeId: BoardThemeId = unlockedThemes.includes(requestedTheme)
    ? requestedTheme
    : currentUser.selectedTheme && unlockedThemes.includes(currentUser.selectedTheme)
    ? currentUser.selectedTheme
    : 'classic';
  const activeTheme = BOARD_THEMES[activeThemeId] || BOARD_THEMES.classic;

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput);
    setChatInput('');
  };

  const handleSendQuickEmoji = (emoji: string) => {
    sendChatMessage(emoji);
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 md:py-6">
      {/* Game Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center font-black text-red-400">
            {selectedRoom.maxPlayers}P
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white">{selectedRoom.name}</h1>
              <span className="text-xs bg-neutral-800 text-yellow-400 font-mono px-2 py-0.5 rounded border border-neutral-700">
                {selectedRoom.code}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
              <span>Entrada: <b className="text-white">{betAmount.toLocaleString('pt-AO')} {currency}</b></span>
              <span>·</span>
              <span className="text-yellow-400">Prémio (75%): <b className="font-bold">{prizePool.toLocaleString('pt-AO')} {currency}</b></span>
              <span>·</span>
              <span className="text-neutral-500">Taxa N (25%): {platformCommission.toLocaleString('pt-AO')} {currency}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Turn timer */}
          <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: COLOR_HEX[boardState.currentTurnColor].bg }}
            />
            <span className="text-xs text-neutral-300 font-medium">
              Vez: <b style={{ color: COLOR_HEX[boardState.currentTurnColor].bg }}>{COLOR_NAMES[boardState.currentTurnColor]}</b>
            </span>
            <span className="text-xs font-mono font-bold text-yellow-400 bg-neutral-800 px-1.5 py-0.5 rounded">
              <TurnTimerText roomId={selectedRoom.id} fallback={boardState.turnTimer} />
            </span>
          </div>

          {/* Compact Dice Sound Selector right in the top bar */}
          <div className="flex items-center gap-1.5 bg-neutral-950 px-2.5 py-1.5 rounded-lg border border-yellow-500/40">
            <Volume2 className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
            <span className="text-[11px] font-bold text-neutral-300 hidden sm:inline">Som do Dado:</span>
            <select
              aria-label="Escolher som do dado"
              value={diceSound}
              onChange={(e) => {
                const next = e.target.value as DiceSoundPreset;
                setDiceSound(next);
                soundManager.setDiceSoundPreset(next);
                if (next !== 'silent') {
                  soundManager.playDiceRoll();
                }
              }}
              className="bg-transparent text-xs font-bold text-yellow-300 focus:outline-none cursor-pointer"
            >
              {DICE_SOUND_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id} className="bg-neutral-900 text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowThemesModal(true)}
            title="Mudar modelo de tabuleiro ou desbloquear temas"
            className="text-xs px-3 py-1.5 rounded-lg border border-purple-500/40 bg-neutral-900 text-purple-300 hover:text-white hover:bg-neutral-800 flex items-center gap-1.5 font-bold transition-colors"
          >
            <Palette className="w-3.5 h-3.5 text-yellow-400" />
            <span className="hidden sm:inline">{activeTheme.name}</span>
            <span className="sm:hidden">Tabuleiros</span>
          </button>

          <button
            onClick={() => {
              setShowVictoryConfetti(false);
              restartMatch();
            }}
            title="Recomeçar Partida nesta mesa"
            className="text-xs px-3 py-1.5 rounded-lg border border-yellow-500/40 bg-neutral-900 text-yellow-400 hover:text-white hover:bg-neutral-800 flex items-center gap-1.5 font-bold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Recomeçar</span>
          </button>

          <button
            onClick={leaveCurrentRoom}
            className="text-xs px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700"
          >
            Sair da Mesa
          </button>
        </div>
      </div>

      {/* Main Grid: Ludo Board + Player Panels + Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
        {/* Left Column: Player Cards */}
        <div className="lg:col-span-3 space-y-3 order-2 lg:order-1">
          <div className="text-xs uppercase tracking-wider text-neutral-400 font-semibold px-1">
            Jogadores na Mesa ({players.length}/{selectedRoom.maxPlayers})
          </div>

          {players.map((p) => {
            const isTurn = boardState.currentTurnColor === p.color;
            const piecesAtGoal = p.pieces.filter(pc => pc.position === 200).length;
            const activeMonster = playerMonsters[p.color];

            return (
              <div
                key={p.userId}
                className={`relative p-3 rounded-xl border transition-all ${
                  isTurn
                    ? 'bg-neutral-800/90 border-yellow-500/80 shadow-md shadow-yellow-950/20'
                    : 'bg-neutral-900/60 border-neutral-800/80 opacity-90'
                }`}
              >
                {/* 2D Monster Manifestation outside the board right on the Player's Avatar Card */}
                {activeMonster && (
                  <AvatarMonster
                    key={activeMonster.key}
                    kind={activeMonster.kind}
                    label={activeMonster.label}
                  />
                )}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={p.avatar}
                      alt={p.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover border-2"
                      style={{ borderColor: COLOR_HEX[p.color].bg }}
                    />
                    <div
                      className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white border border-black"
                      style={{ backgroundColor: COLOR_HEX[p.color].bg }}
                    >
                      {p.color[0].toUpperCase()}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-bold text-white truncate">
                        {p.name}
                        {p.userId === currentUser.id && (
                          <span className="ml-1.5 text-[9px] bg-red-600/80 text-white px-1.5 py-0.5 rounded font-bold">
                            VOCÊ
                          </span>
                        )}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                          p.isBot
                            ? 'bg-blue-950 text-blue-300 border border-blue-700/60'
                            : p.isConnected
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {p.isBot ? '🤖 BOT IA' : p.isConnected ? '● Online' : 'Reconectar'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
                      <span style={{ color: COLOR_HEX[p.color].bg }}>{COLOR_NAMES[p.color]}</span>
                      <span>·</span>
                      <span className="text-yellow-400 font-medium">
                        {p.resigned ? 'Aceitou Derrota' : `Meta: ${piecesAtGoal}/3`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pieces mini progress */}
                <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-neutral-800/80">
                  {p.pieces.map((pc, idx) => (
                    <div
                      key={pc.id}
                      className="flex-1 h-1.5 rounded-full overflow-hidden bg-neutral-950"
                      title={`Peça ${idx + 1}: ${pc.position === 200 ? 'Meta!' : pc.position === -1 ? 'Na Base' : `Posição ${pc.position}`}`}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: pc.position === 200 ? '100%' : pc.position === -1 ? '0%' : '60%',
                          backgroundColor: COLOR_HEX[p.color].bg
                        }}
                      />
                    </div>
                  ))}
                </div>

                {isTurn && !p.resigned && (
                  <div className="mt-2 text-[11px] font-semibold text-yellow-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Jogando agora (<TurnTimerText roomId={selectedRoom.id} fallback={boardState.turnTimer} />)
                  </div>
                )}
              </div>
            );
          })}

          {/* Action Log Banner */}
          <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs">
            <span className="text-neutral-400 block text-[10px] uppercase font-semibold mb-1">Última Ação</span>
            <p className="text-neutral-200 font-medium leading-relaxed">
              {boardState.lastAction || 'Partida a decorrer...'}
            </p>
          </div>
        </div>

        {/* Center Column: The Interactive Board with Themed Canvas & On-Board Rolling Dice */}
        <div className="lg:col-span-6 flex flex-col items-center order-1 lg:order-2">
          {/* Board Outer Border Frame */}
          <div
            className="relative w-full max-w-[540px] aspect-square rounded-3xl p-3 sm:p-4 border-4 select-none"
            style={{ backgroundColor: activeTheme.frameBg, borderColor: activeTheme.frameBorder }}
          >
            {/* 15x15 Interactive Board Layer (NO overflow-hidden/border-radius on 3D dice parent!) */}
            <div ref={boardRef} className="relative w-full h-full touch-none select-none">
              <LudoBoardGrid myColor={myColor} themeId={activeThemeId} />

              {/* RENDER THE 2D THEMED CHARACTER PIECES WITH GPU TRANSLATE3D MOVEMENT (60FPS ZERO STUTTER) */}
              {(() => {
                // Group co-located pieces on track/lanes so stacked character figures remain visible side-by-side
                const cellGroups = new Map<string, string[]>();
                for (const pl of players) {
                  for (const pc of pl.pieces) {
                    if (pc.position >= 0 && pc.position <= 104) {
                      const posKey = pc.position >= 100 ? `${pl.color}_${pc.position}` : `${pc.position}`;
                      const list = cellGroups.get(posKey) || [];
                      list.push(`${pl.color}_${pc.id}`);
                      cellGroups.set(posKey, list);
                    }
                  }
                }

                return players.map((p) =>
                  p.pieces.map((piece) => {
                    const { gridX, gridY } = getPieceGridPosition(piece);
                    const isEligible = isMyTurn && p.color === myColor && boardState.eligiblePieces.includes(piece.id);
                    const isInGoal = piece.position === 200;

                    let stackOffsetX = 0;
                    let stackOffsetY = 0;
                    if (piece.position >= 0 && piece.position <= 104) {
                      const posKey = piece.position >= 100 ? `${p.color}_${piece.position}` : `${piece.position}`;
                      const group = cellGroups.get(posKey) || [];
                      if (group.length > 1) {
                        const idxInGroup = group.indexOf(`${p.color}_${piece.id}`);
                        const angle = (idxInGroup / group.length) * Math.PI * 2;
                        stackOffsetX = Math.cos(angle) * 4.5;
                        stackOffsetY = Math.sin(angle) * 4.5;
                      }
                    }

                    return (
                      <div
                        key={`${p.color}_${piece.id}`}
                        onClick={() => {
                          if (isEligible) {
                            movePiece(piece.id);
                          }
                        }}
                        className={`absolute left-0 top-0 flex items-center justify-center z-20 ${
                          isEligible ? 'cursor-pointer z-30' : 'pointer-events-none'
                        }`}
                        style={{
                          width: `${100 / 15}%`,
                          height: `${100 / 15}%`,
                          transform: `translate3d(${gridX * 100}%, ${gridY * 100}%, 0)`,
                          transition: 'transform 85ms cubic-bezier(0.22, 1, 0.36, 1)',
                          willChange: 'transform'
                        }}
                      >
                        <div
                          className={`relative flex items-center justify-center ${isEligible ? 'hover:scale-110 transition-transform duration-100' : ''}`}
                          style={
                            stackOffsetX !== 0 || stackOffsetY !== 0
                              ? { transform: `translate3d(${stackOffsetX.toFixed(1)}px, ${stackOffsetY.toFixed(1)}px, 0)` }
                              : undefined
                          }
                        >
                          {/* Static crisp highlight ring if movable (zero idle animation lag) */}
                          {isEligible && (
                            <div className="absolute inset-0 -m-1 rounded-full border-2 border-yellow-400 bg-yellow-400/15 pointer-events-none" />
                          )}

                          {/* Trophy Crown when piece is in final goal */}
                          {isInGoal && (
                            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[10px] leading-none pointer-events-none z-30">
                              🏆
                            </div>
                          )}

                          {/* 2D Thematic Character / Figure Piece */}
                          <div className="relative flex items-center justify-center -translate-y-0.5">
                            <ThemePieceFigure
                              themeId={activeThemeId}
                              color={p.color}
                              expression={piece.expression}
                              isInGoal={isInGoal}
                              pieceIndex={piece.id}
                              className="w-7 h-8 sm:w-9 sm:h-10"
                            />

                            {/* Speech Bubble when event happens */}
                            {piece.bubbleText && (
                              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-neutral-900 text-[9px] text-yellow-300 font-black px-1.5 py-0.5 rounded border border-yellow-400 whitespace-nowrap z-30 pointer-events-none">
                                {piece.bubbleText}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                );
              })()}

              {/* Clean 15x15 board & pure 3D dice (monsters appear on the outer player avatar cards) */}

              {/* THE 3D INTERACTIVE ROLLING DICE DIRECTLY ON THE BOARD (CLICK RESULT OR DRAG & THROW TO ROLL) */}
              <div
                onPointerDown={handleDicePointerDown}
                onPointerMove={handleDicePointerMove}
                onPointerUp={handleDicePointerUp}
                onPointerCancel={handleDicePointerUp}
                className={`absolute z-30 select-none ${
                  isMyTurn && !boardState.hasRolled && !isPhysicsRolling
                    ? isDraggingDice
                      ? 'cursor-grabbing z-40'
                      : 'cursor-grab'
                    : 'cursor-default pointer-events-none'
                }`}
                style={{
                  left: `${dicePos.x}%`,
                  top: `${dicePos.y}%`,
                  transform: 'translate(-50%, -50%)',
                  touchAction: 'none'
                }}
              >
                <div ref={diceMoverRef} style={{ willChange: 'transform' }}>
                  {/* Turn border glow (static, zero continuous animation) */}
                  {isMyTurn && !boardState.hasRolled && !boardState.isRolling && !isPhysicsRolling && (
                    <div
                      className={`absolute inset-0 -m-3 rounded-2xl bg-yellow-400/20 pointer-events-none border-2 border-yellow-400/80 ${
                        isDraggingDice ? 'scale-125' : ''
                      }`}
                    />
                  )}

                  {/* Floating dual-mode hint (always upright!) */}
                  {isMyTurn && !boardState.hasRolled && !boardState.isRolling && !isPhysicsRolling && (
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full border border-yellow-400 whitespace-nowrap pointer-events-none tracking-wider z-40">
                      {isDraggingDice
                        ? 'LANCE NO TABULEIRO! 🎲'
                        : 'CLIQUE OU ARRASTE PARA LANÇAR! 🎲'}
                    </div>
                  )}

                  {/* Real 6-Faced 3D Casino Dice (completely unobstructed!) */}
                  <Dice3D
                    rotation={diceRotation}
                    elevation={diceElevation}
                    instantTransition={isDraggingDice || isPhysicsRolling}
                    cubeRef={diceCubeRef}
                    shadowRef={diceShadowRef}
                  />
                </div>
              </div>

              {/* WAITING FOR FRIEND INVITE OVERLAY */}
              {selectedRoom.status === 'WAITING' && (
                <div className="absolute inset-0 z-40 bg-black/82 flex items-center justify-center p-4">
                  <div className="max-w-sm w-full bg-neutral-950/95 border-2 border-yellow-500/80 rounded-2xl p-5 text-center shadow-2xl space-y-4">
                    <div className="w-12 h-12 mx-auto rounded-full bg-red-600/20 border border-red-500 flex items-center justify-center text-yellow-400">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-yellow-400 font-bold block">
                        SALA SEM BOTS · MULTIPLAYER ONLINE
                      </span>
                      <h3 className="text-lg font-black text-white mt-0.5">
                        Aguardando Jogadores ({players.length}/{selectedRoom.maxPlayers})
                      </h3>
                      <p className="text-xs text-neutral-400 mt-1">
                        Envie este código ou link para o seu amigo entrar na mesma sala:
                      </p>
                    </div>

                    {/* Big Invite Code Box */}
                    <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-700 flex items-center justify-between gap-2">
                      <span className="text-2xl font-mono font-black tracking-widest text-yellow-400 pl-2">
                        {selectedRoom.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyInvite('code')}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        {copiedCode === 'code' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedCode === 'code' ? 'Copiado!' : 'Copiar Código'}
                      </button>
                    </div>

                    {/* Copy Link & WhatsApp */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyInvite('link')}
                        className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-bold text-white flex items-center justify-center gap-1.5"
                      >
                        {copiedCode === 'link' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-yellow-400" />}
                        {copiedCode === 'link' ? 'Link Copiado!' : 'Copiar Link'}
                      </button>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(
                          `Bora jogar N – Não Te Irrites comigo! Entra na minha sala com o código *${selectedRoom.code}* ou pelo link: ${inviteLink}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-xs font-bold text-white flex items-center justify-center gap-1.5"
                      >
                        WhatsApp
                      </a>
                    </div>

                    {/* Base Color Chooser */}
                    <div className="pt-1 border-t border-neutral-800/80 text-left space-y-1.5">
                      <span className="text-[11px] font-bold text-neutral-300 block">
                        Escolha a cor da sua base:
                      </span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(['red', 'green', 'yellow', 'blue'] as PlayerColor[]).map((c) => {
                          const occupant = players.find((pl) => pl.color === c);
                          const isMine = occupant?.userId === currentUser.id;
                          const isTakenByOther = Boolean(occupant && !isMine);
                          return (
                            <button
                              key={c}
                              type="button"
                              disabled={isTakenByOther}
                              onClick={() => selectBaseColor(c)}
                              className={`py-1.5 px-1.5 rounded-lg border text-[10px] font-black flex items-center justify-center gap-1 transition-all ${
                                isMine
                                  ? 'bg-neutral-800 border-yellow-400 text-white'
                                  : isTakenByOther
                                  ? 'bg-neutral-900/50 border-neutral-800 text-neutral-500 cursor-not-allowed opacity-60'
                                  : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-neutral-200'
                              }`}
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/50"
                                style={{ backgroundColor: COLOR_HEX[c].bg }}
                              />
                              <span className="truncate">
                                {COLOR_NAMES[c].slice(0, 4)}
                                {isMine ? ' ✓' : ''}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Start early if >= 2 players, OR add an optional Bot if host wants */}
                    {isHost && players.length >= 2 && (
                      <button
                        type="button"
                        onClick={startMatch}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-yellow-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 shadow-lg"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        Iniciar Partida Agora ({players.length} Jogadores)
                      </button>
                    )}

                    {isHost && players.length < selectedRoom.maxPlayers && (
                      <button
                        type="button"
                        onClick={addBotToRoom}
                        className="w-full py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/60 text-blue-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                      >
                        <Bot className="w-4 h-4" />
                        Adicionar Bot (IA) para Jogar Agora
                      </button>
                    )}
                  </div>
                </div>
              )}
              {/* 2-PIECES IN GOAL: ASK LOSING OPPONENT TO CONTINUE OR ACCEPT DEFEAT */}
              {selectedRoom.status === 'PLAYING' && boardState.surrenderOffer && !boardState.winner && (
                <div className="absolute inset-0 z-40 bg-black/80 flex items-center justify-center p-4">
                  {myColor && boardState.surrenderOffer.targetColors.includes(myColor) ? (
                    <div className="max-w-sm w-full bg-neutral-950 border-2 border-yellow-500 rounded-2xl p-5 text-center shadow-2xl space-y-4">
                      <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-yellow-400">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase tracking-widest text-yellow-400 font-black block">
                          2 PEÇAS NA META (FALTA 1 PARA VENCER)
                        </span>
                        <h3 className="text-lg font-black text-white">
                          Continuar o Jogo ou Aceitar Derrota?
                        </h3>
                        <p className="text-xs text-neutral-300 leading-relaxed">
                          <b className="text-yellow-300">{boardState.surrenderOffer.leaderName}</b> já colocou{' '}
                          <b>2 de 3 peças</b> na meta. Desejas continuar a disputar até às 3 peças ou aceitar a derrota agora?
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => respondSurrenderOffer('continue')}
                          className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-colors"
                        >
                          Continuar o Jogo
                        </button>
                        <button
                          type="button"
                          onClick={() => respondSurrenderOffer('accept_defeat')}
                          className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider transition-colors"
                        >
                          Aceitar Derrota
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-sm w-full bg-neutral-950/95 border border-yellow-500/60 rounded-2xl p-5 text-center space-y-2">
                      <span className="text-[10px] uppercase tracking-widest text-yellow-400 font-black block">
                        2 PEÇAS NA META
                      </span>
                      <h3 className="text-base font-black text-white">
                        Aguardando Resposta do Adversário...
                      </h3>
                      <p className="text-xs text-neutral-300 leading-relaxed">
                        {boardState.surrenderOffer.leaderName} atingiu 2 de 3 peças na meta. O adversário está a decidir se continua o jogo ou aceita a derrota.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Controls Bar Below Board */}
          <div className="w-full max-w-[540px] mt-4 p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between gap-4">
              {/* Left: Turn Status */}
              <div className="flex-1">
                <span className="text-xs text-neutral-400 block">Status da Jogada</span>
                <p className="text-sm font-bold text-white">
                  {selectedRoom.status === 'WAITING' ? (
                    <span className="text-yellow-400">
                      Aguardando amigo entrar com o código {selectedRoom.code}...
                    </span>
                  ) : isMyTurn ? (
                    boardState.hasRolled ? (
                      <span className="text-yellow-400">Escolha uma peça para mover!</span>
                    ) : (
                      <span className="text-red-400">
                        Clique no dado para ver o resultado direto ou arraste e lance no tabuleiro para rolar!
                      </span>
                    )
                  ) : (
                    <span className="text-neutral-400">
                      Aguarde a jogada de {COLOR_NAMES[boardState.currentTurnColor]}...
                    </span>
                  )}
                </p>
              </div>

              {/* Roll Action Button */}
              {isMyTurn && !boardState.hasRolled && (
                <button
                  onClick={handleLaunchButtonClick}
                  disabled={boardState.isRolling || isPhysicsRolling}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-yellow-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-950/50 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 shrink-0"
                >
                  <Flame className="w-4 h-4 text-yellow-300" />
                  LANÇAR DADO
                </button>
              )}
            </div>

            {/* Dice Sound Selector Bar */}
            <div className="pt-2.5 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-semibold">
                <Volume2 className="w-3.5 h-3.5 text-yellow-400" />
                <span>Som do Dado:</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {DICE_SOUND_OPTIONS.map((opt) => {
                  const active = diceSound === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setDiceSound(opt.id);
                        soundManager.setDiceSoundPreset(opt.id);
                        if (opt.id !== 'silent') {
                          soundManager.playDiceRoll();
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                        active
                          ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: In-Game Chat & Live Reactions */}
        <div className="lg:col-span-3 flex flex-col h-[520px] rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden order-3">
          <div className="p-3 border-b border-neutral-800 bg-neutral-950/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-bold text-white">Chat da Mesa</span>
            </div>
            <span className="text-[10px] text-neutral-500 font-mono">Tempo Real</span>
          </div>

          {/* Quick Reaction Emojis bar */}
          <div className="p-2 border-b border-neutral-800 bg-neutral-950/30 flex items-center justify-around text-lg">
            {['😂', '😎', '😭', '😡', '🏆', '🔥', '🎲', '🇦🇴'].map((em) => (
              <button
                key={em}
                onClick={() => handleSendQuickEmoji(em)}
                className="hover:scale-125 transition-transform p-1 rounded"
              >
                {em}
              </button>
            ))}
          </div>

          {/* Messages scroll area */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
            {selectedRoom.chat.map((msg) => (
              <div
                key={msg.id}
                className={`p-2 rounded-lg ${
                  msg.isSystem
                    ? 'bg-neutral-800/40 text-neutral-400 text-[11px] text-center'
                    : msg.userId === currentUser.id
                    ? 'bg-red-950/40 border border-red-900/40 ml-4'
                    : 'bg-neutral-800/80 mr-4'
                }`}
              >
                {!msg.isSystem && (
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-white text-[11px]">{msg.userName}</span>
                    <span className="text-[10px] text-neutral-500">{msg.timestamp}</span>
                  </div>
                )}
                <p className="text-neutral-200">{msg.text}</p>
              </div>
            ))}
          </div>

          {/* Chat input form */}
          <form onSubmit={handleSendChat} className="p-2 border-t border-neutral-800 bg-neutral-950/60 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Digite uma mensagem..."
              className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-yellow-500"
            />
            <button
              type="submit"
              className="p-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* VICTORY CELEBRATION MODAL */}
      {boardState.winner && winnerPlayer && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="relative max-w-md w-full bg-gradient-to-b from-neutral-900 via-neutral-900 to-black border-2 border-yellow-500/80 rounded-2xl p-6 text-center shadow-2xl">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-yellow-500 to-amber-200 flex items-center justify-center shadow-lg mb-4">
              <Trophy className="w-10 h-10 text-neutral-950" />
            </div>

            <span className="text-xs uppercase tracking-widest text-yellow-400 font-bold block mb-1">
              FIM DE PARTIDA
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
              {boardState.winner === myColor ? 'ÉS O CAMPEÃO! 🎉' : `${winnerPlayer.name} VENCEU! 🏆`}
            </h2>
            <p className="text-xs text-neutral-300 mb-6">
              Uma disputa emocionante no tabuleiro N – Não Te Irrites!
            </p>

            {/* Prize breakdown */}
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 mb-6 text-left space-y-2">
              <div className="flex justify-between text-xs text-neutral-400">
                <span>Vencedor:</span>
                <span className="font-bold text-white">{winnerPlayer.name}</span>
              </div>
              <div className="flex justify-between text-xs text-neutral-400">
                <span>Total Apostado na Mesa:</span>
                <span className="font-bold text-white">{(betAmount * selectedRoom.maxPlayers).toLocaleString('pt-AO')} {currency}</span>
              </div>
              <div className="flex justify-between text-xs text-neutral-400">
                <span>Comissão da Plataforma (25%):</span>
                <span className="font-bold text-neutral-400">{platformCommission.toLocaleString('pt-AO')} {currency}</span>
              </div>
              <div className="h-[1px] bg-neutral-800 my-1" />
              <div className="flex justify-between text-sm font-bold">
                <span className="text-yellow-400">Prémio Final do Vencedor (75%):</span>
                <span className="text-emerald-400">{prizePool.toLocaleString('pt-AO')} {currency}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={leaveCurrentRoom}
                className="flex-1 py-3 rounded-xl bg-neutral-800 text-neutral-200 font-bold text-xs hover:bg-neutral-700"
              >
                Voltar ao Lobby
              </button>
              <button
                onClick={() => {
                  setShowVictoryConfetti(false);
                  restartMatch();
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-yellow-500 text-white font-black text-xs uppercase tracking-wider hover:brightness-110 shadow-lg shadow-red-950 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Jogar Novamente</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Board Themes Modal */}
      <BoardThemesModal isOpen={showThemesModal} onClose={() => setShowThemesModal(false)} />
    </div>
  );
};
