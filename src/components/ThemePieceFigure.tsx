import React from 'react';
import { BoardThemeId, PieceExpression, PlayerColor } from '../types';

interface ThemePieceFigureProps {
  themeId: BoardThemeId;
  color: PlayerColor;
  expression?: PieceExpression;
  isInGoal?: boolean;
  pieceIndex?: number;
  className?: string;
}

const PALETTE: Record<
  PlayerColor,
  { main: string; dark: string; light: string; tint: string; rim: string }
> = {
  red: {
    main: '#dc2626',
    dark: '#991b1b',
    light: '#f87171',
    tint: '#fecaca',
    rim: '#fee2e2'
  },
  green: {
    main: '#16a34a',
    dark: '#14532d',
    light: '#4ade80',
    tint: '#bbf7d0',
    rim: '#dcfce7'
  },
  yellow: {
    main: '#eab308',
    dark: '#a16207',
    light: '#fde047',
    tint: '#fef08a',
    rim: '#fef9c3'
  },
  blue: {
    main: '#2563eb',
    dark: '#1e3a8a',
    light: '#60a5fa',
    tint: '#bfdbfe',
    rim: '#dbeafe'
  }
};

const SKIN_BY_COLOR: Record<PlayerColor, { skin: string; shade: string }> = {
  red: { skin: '#f3c6a5', shade: '#d99e77' },
  green: { skin: '#e8b994', shade: '#c9936a' },
  yellow: { skin: '#f6d2b5', shade: '#d8ab87' },
  blue: { skin: '#d89b72', shade: '#b5774f' }
};

const CharacterFace: React.FC<{
  cx?: number;
  cy?: number;
  expression?: PieceExpression;
  isInGoal?: boolean;
  kohlEyes?: boolean;
  sunglasses?: boolean;
  visorColor?: string;
}> = ({
  cx = 22,
  cy = 18.5,
  expression = 'smiling',
  isInGoal = false,
  kohlEyes = false,
  sunglasses = false,
  visorColor
}) => {
  if (visorColor) {
    // Cyber Neon Visor Expression
    const isAngry = expression === 'angry' || expression === 'irritated';
    const isDead = expression === 'defeated';
    const isScared = expression === 'scared' || expression === 'crying';
    return (
      <g>
        <rect
          x={cx - 6.8}
          y={cy - 2.6}
          width="13.6"
          height="5.2"
          rx="2.2"
          fill="#090d16"
          stroke={visorColor}
          strokeWidth="1.2"
        />
        {isDead ? (
          <g stroke={visorColor} strokeWidth="1.3" strokeLinecap="round">
            <line x1={cx - 4.5} y1={cy - 1.2} x2={cx - 1.8} y2={cy + 1.2} />
            <line x1={cx - 1.8} y1={cy - 1.2} x2={cx - 4.5} y2={cy + 1.2} />
            <line x1={cx + 1.8} y1={cy - 1.2} x2={cx + 4.5} y2={cy + 1.2} />
            <line x1={cx + 4.5} y1={cy - 1.2} x2={cx + 1.8} y2={cy + 1.2} />
          </g>
        ) : isAngry ? (
          <g fill={visorColor}>
            <polygon points={`${cx - 5.2},${cy - 1.4} ${cx - 1.2},${cy + 0.2} ${cx - 5},${cy + 1.4}`} />
            <polygon points={`${cx + 5.2},${cy - 1.4} ${cx + 1.2},${cy + 0.2} ${cx + 5},${cy + 1.4}`} />
          </g>
        ) : isScared ? (
          <g fill={visorColor}>
            <circle cx={cx - 3.2} cy={cy} r="1.6" />
            <circle cx={cx + 3.2} cy={cy} r="1.6" />
          </g>
        ) : (
          <g fill={visorColor}>
            <rect x={cx - 5.2} y={cy - 0.9} width="4" height="1.8" rx="0.9" />
            <rect x={cx + 1.2} y={cy - 0.9} width="4" height="1.8" rx="0.9" />
          </g>
        )}
      </g>
    );
  }

  const isAngry = expression === 'angry' || expression === 'irritated';
  const isScared = expression === 'scared';
  const isCrying = expression === 'crying';
  const isDead = expression === 'defeated';
  const isCelebrating = isInGoal || expression === 'celebrating' || expression === 'laughing' || expression === 'rich';

  return (
    <g>
      {sunglasses ? (
        <g>
          <rect x={cx - 6.8} y={cy - 2.3} width="5.8" height="3.8" rx="1" fill="#111827" stroke="#facc15" strokeWidth="0.7" />
          <rect x={cx + 1} y={cy - 2.3} width="5.8" height="3.8" rx="1" fill="#111827" stroke="#facc15" strokeWidth="0.7" />
          <line x1={cx - 1} y1={cy - 0.7} x2={cx + 1} y2={cy - 0.7} stroke="#facc15" strokeWidth="0.9" />
          <line x1={cx - 5.5} y1={cy - 1.4} x2={cx - 3.2} y2={cy - 1.4} stroke="#ffffff" strokeWidth="0.7" strokeOpacity="0.6" />
          <line x1={cx + 2.3} y1={cy - 1.4} x2={cx + 4.6} y2={cy - 1.4} stroke="#ffffff" strokeWidth="0.7" strokeOpacity="0.6" />
        </g>
      ) : isDead ? (
        <g stroke="#111827" strokeWidth="1.2" strokeLinecap="round">
          <line x1={cx - 4.2} y1={cy - 1.8} x2={cx - 1.8} y2={cy + 0.6} />
          <line x1={cx - 1.8} y1={cy - 1.8} x2={cx - 4.2} y2={cy + 0.6} />
          <line x1={cx + 1.8} y1={cy - 1.8} x2={cx + 4.2} y2={cy + 0.6} />
          <line x1={cx + 4.2} y1={cy - 1.8} x2={cx + 1.8} y2={cy + 0.6} />
        </g>
      ) : (
        <g>
          {kohlEyes && (
            <>
              <line x1={cx - 5.6} y1={cy - 0.8} x2={cx - 1.6} y2={cy - 0.6} stroke="#111827" strokeWidth="1.3" strokeLinecap="round" />
              <line x1={cx + 1.6} y1={cy - 0.6} x2={cx + 5.6} y2={cy - 0.8} stroke="#111827" strokeWidth="1.3" strokeLinecap="round" />
            </>
          )}
          <circle cx={cx - 3} cy={cy - 0.5} r={isScared ? 1.5 : 1.15} fill="#111827" />
          <circle cx={cx + 3} cy={cy - 0.5} r={isScared ? 1.5 : 1.15} fill="#111827" />
          <circle cx={cx - 3.3} cy={cy - 0.9} r="0.4" fill="#ffffff" />
          <circle cx={cx + 2.7} cy={cy - 0.9} r="0.4" fill="#ffffff" />

          {isAngry && (
            <g stroke="#111827" strokeWidth="1.2" strokeLinecap="round">
              <line x1={cx - 4.8} y1={cy - 2.9} x2={cx - 1.5} y2={cy - 1.7} />
              <line x1={cx + 4.8} y1={cy - 2.9} x2={cx + 1.5} y2={cy - 1.7} />
            </g>
          )}
          {isCrying && (
            <g fill="#38bdf8">
              <ellipse cx={cx - 3.3} cy={cy + 1.8} rx="0.8" ry="1.4" />
              <ellipse cx={cx + 3.3} cy={cy + 1.8} rx="0.8" ry="1.4" />
            </g>
          )}
        </g>
      )}

      {/* Mouth */}
      {isCelebrating ? (
        <path
          d={`M ${cx - 3} ${cy + 2} Q ${cx} ${cy + 5.2} ${cx + 3} ${cy + 2} Z`}
          fill="#991b1b"
          stroke="#111827"
          strokeWidth="0.9"
        />
      ) : isAngry ? (
        <path
          d={`M ${cx - 2.8} ${cy + 3.4} Q ${cx} ${cy + 1.6} ${cx + 2.8} ${cy + 3.4}`}
          fill="none"
          stroke="#111827"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      ) : isScared || isCrying ? (
        <ellipse cx={cx} cy={cy + 3} rx="1.5" ry="1.8" fill="#111827" />
      ) : isDead ? (
        <line x1={cx - 2.5} y1={cy + 3} x2={cx + 2.5} y2={cy + 3} stroke="#111827" strokeWidth="1.2" strokeLinecap="round" />
      ) : (
        <path
          d={`M ${cx - 2.6} ${cy + 2.1} Q ${cx} ${cy + 4.2} ${cx + 2.6} ${cy + 2.1}`}
          fill="none"
          stroke="#111827"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      )}
    </g>
  );
};

export const ThemePieceFigure: React.FC<ThemePieceFigureProps> = React.memo(({
  themeId,
  color,
  expression = 'smiling',
  isInGoal = false,
  pieceIndex = 0,
  className = 'w-8 h-9 sm:w-9 sm:h-10'
}) => {
  const pal = PALETTE[color];
  const { skin, shade } = SKIN_BY_COLOR[color];
  const strokeColor = isInGoal ? '#fde047' : '#111827';
  const strokeWidth = isInGoal ? '1.6' : '1.45';
  const jerseyNum = ['10', '9', '7', '11'][pieceIndex % 4];

  // Shared 2D Colored Base Pedestal so color team is ALWAYS crystal-clear
  const Pedestal = () => (
    <g>
      <ellipse cx="22" cy="43.5" rx="13.5" ry="3.6" fill="#09090b" fillOpacity="0.45" />
      <ellipse cx="22" cy="42" rx="12.5" ry="3.5" fill={pal.dark} stroke={strokeColor} strokeWidth={strokeWidth} />
      <ellipse cx="22" cy="40.5" rx="11.2" ry="2.8" fill={pal.main} stroke={pal.light} strokeWidth="0.9" />
    </g>
  );

  // 1. REINOS MEDIEVAIS (Cavaleiro Dragão, Rei do Ouro, Arqueiro da Floresta, Mago Safira)
  if (themeId === 'kingdoms') {
    return (
      <svg viewBox="0 0 44 48" className={className} aria-hidden="true">
        <Pedestal />
        {/* Royal Cape */}
        <path
          d="M 10 26 L 7 40 L 37 40 L 34 26 Z"
          fill={pal.dark}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
        {/* Armored Torso / Tunic */}
        <path
          d="M 13 25 C 13 22, 31 22, 31 25 L 33 39 L 11 39 Z"
          fill={pal.main}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
        {/* Golden Belt & Emblem */}
        <rect x="12" y="33.5" width="20" height="2.6" rx="1" fill="#eab308" stroke="#111827" strokeWidth="0.9" />
        <polygon points="22,26.5 25,29.5 22,32.5 19,29.5" fill="#fde047" stroke="#111827" strokeWidth="0.8" />

        {/* Shoulder Pauldrons */}
        <circle cx="11.5" cy="27" r="3.6" fill={pal.light} stroke={strokeColor} strokeWidth="1.2" />
        <circle cx="32.5" cy="27" r="3.6" fill={pal.light} stroke={strokeColor} strokeWidth="1.2" />

        {/* Head */}
        <circle cx="22" cy="18.2" r="7.2" fill={skin} stroke={strokeColor} strokeWidth={strokeWidth} />

        {color === 'yellow' && (
          /* Golden King Crown + Beard */
          <>
            <path
              d="M 14.5 14 L 13.5 7 L 18 10.5 L 22 4.5 L 26 10.5 L 30.5 7 L 29.5 14 Z"
              fill="#facc15"
              stroke={strokeColor}
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
            <circle cx="22" cy="10.8" r="1.3" fill="#dc2626" />
          </>
        )}

        {color === 'red' && (
          /* Dragon Knight Horned Helmet */
          <>
            <path
              d="M 14.2 17 C 14.2 10.5, 29.8 10.5, 29.8 17 L 29 13.5 L 15 13.5 Z"
              fill="#b91c1c"
              stroke={strokeColor}
              strokeWidth="1.3"
            />
            <path d="M 14.5 13.5 Q 9.5 9.5 11.5 5.5 Q 14.5 8.5 17 11.5 Z" fill="#facc15" stroke={strokeColor} strokeWidth="1.1" />
            <path d="M 29.5 13.5 Q 34.5 9.5 32.5 5.5 Q 29.5 8.5 27 11.5 Z" fill="#facc15" stroke={strokeColor} strokeWidth="1.1" />
          </>
        )}

        {color === 'green' && (
          /* Forest Archer Hood + Feather */
          <>
            <path
              d="M 13.5 18 C 13 10.5, 19 6.5, 23 6.5 C 27 6.5, 31 10.5, 30.5 18 C 28 13.5, 16 13.5, 13.5 18 Z"
              fill="#15803d"
              stroke={strokeColor}
              strokeWidth="1.3"
            />
            <path d="M 27 9 Q 34 4.5 36 8 Q 31 10.5 27 11 Z" fill="#facc15" stroke={strokeColor} strokeWidth="1" />
          </>
        )}

        {color === 'blue' && (
          /* Royal Wizard / Sapphire Guardian Pointed Hat */
          <>
            <ellipse cx="22" cy="13.2" rx="10" ry="2.2" fill="#1d4ed8" stroke={strokeColor} strokeWidth="1.2" />
            <path
              d="M 15.5 13 L 22.5 2.8 L 28.5 13 Z"
              fill="#1e40af"
              stroke={strokeColor}
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
            <circle cx="22.2" cy="9.2" r="1.4" fill="#fde047" />
          </>
        )}

        <CharacterFace cy={18.8} expression={expression} isInGoal={isInGoal} />
      </svg>
    );
  }

  // 2. FUTEBOL: REAL MADRID vs BARÇA (Mini Craques com Camisola, Número & Bola!)
  if (themeId === 'football') {
    const isReal = color === 'yellow';
    const isBarcaRed = color === 'red';
    const isBarcaBlue = color === 'blue';
    return (
      <svg viewBox="0 0 44 48" className={className} aria-hidden="true">
        <Pedestal />
        {/* Player Shorts / Boots Hint */}
        <rect x="15" y="34" width="14" height="5.5" rx="1.5" fill={isReal ? '#f8fafc' : pal.dark} stroke={strokeColor} strokeWidth="1.2" />

        {/* Football Jersey */}
        <path
          d="M 12 24 L 8 28 L 11.5 31 L 14 28.5 L 14 35.5 L 30 35.5 L 30 28.5 L 32.5 31 L 36 28 L 32 24 Z"
          fill={isReal ? '#ffffff' : pal.main}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />

        {/* Club Stripes */}
        {(isBarcaRed || isBarcaBlue) && (
          <g>
            <rect x="17" y="24.5" width="3.2" height="10.5" fill={isBarcaRed ? '#1d4ed8' : '#b91c1c'} />
            <rect x="23.8" y="24.5" width="3.2" height="10.5" fill={isBarcaRed ? '#1d4ed8' : '#b91c1c'} />
          </g>
        )}
        {isReal && (
          <g>
            <path d="M 14 24 L 22 27.5 L 30 24" fill="none" stroke="#eab308" strokeWidth="1.8" />
            <rect x="14.5" y="28" width="15" height="2" fill="#eab308" fillOpacity="0.25" />
          </g>
        )}
        {color === 'green' && (
          <g fill="#ffffff">
            <rect x="14.5" y="27" width="15" height="2.4" />
            <rect x="14.5" y="31.5" width="15" height="2.2" />
          </g>
        )}

        {/* Jersey Number */}
        <rect x="18" y="27.2" width="8" height="6.2" rx="1.5" fill="#09090b" fillOpacity="0.65" />
        <text x="22" y="32" textAnchor="middle" fontSize="5" fontWeight="900" fill="#fde047">
          {jerseyNum}
        </text>

        {/* Athlete Head + Hair */}
        <circle cx="22" cy="17.5" r="7.2" fill={skin} stroke={strokeColor} strokeWidth={strokeWidth} />
        <path
          d="M 14.5 16.5 C 14 10, 29.5 9.5, 29.5 16.5 C 27.5 13, 24 12, 22 13 C 19.5 12, 16.5 13, 14.5 16.5 Z"
          fill={color === 'yellow' ? '#78350f' : '#18181b'}
          stroke={strokeColor}
          strokeWidth="1.1"
        />
        {/* Athlete Headband in team color */}
        <path d="M 15.1 14.2 Q 22 12.2 28.9 14.2" fill="none" stroke={pal.main} strokeWidth="2" />

        <CharacterFace cy={18.2} expression={expression} isInGoal={isInGoal} />

        {/* Mini Soccer Ball next to foot */}
        <circle cx="33.5" cy="39" r="3.8" fill="#ffffff" stroke="#111827" strokeWidth="1.2" />
        <polygon points="33.5,37.4 35,38.5 34.4,40.2 32.6,40.2 32,38.5" fill="#111827" />
      </svg>
    );
  }

  // 3. FUTURO CYBER NEON (Robô / Guerreiro Mech 2099)
  if (themeId === 'future') {
    return (
      <svg viewBox="0 0 44 48" className={className} aria-hidden="true">
        {/* Neon Hover Pad Base */}
        <ellipse cx="22" cy="43.5" rx="13.5" ry="3.2" fill={pal.main} fillOpacity="0.4" />
        <ellipse cx="22" cy="41.5" rx="12" ry="3.2" fill="#0f172a" stroke={pal.light} strokeWidth="1.4" />

        {/* Cyber Exo-Suit Shoulders & Chest */}
        <path
          d="M 10 26 L 14 23 L 30 23 L 34 26 L 31 39 L 13 39 Z"
          fill="#1e293b"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
        <path d="M 13 25 L 16 38 M 31 25 L 28 38" stroke={pal.main} strokeWidth="2.4" strokeLinecap="round" />

        {/* Glowing Energy Core Reactor */}
        <polygon points="22,26.5 26,30.5 22,34.5 18,30.5" fill={pal.light} stroke="#090d16" strokeWidth="1" />
        <circle cx="22" cy="30.5" r="1.5" fill="#ffffff" />

        {/* Cyber Antennae */}
        <line x1="14" y1="15" x2="11" y2="7" stroke={pal.light} strokeWidth="2" strokeLinecap="round" />
        <circle cx="11" cy="6.8" r="1.5" fill={pal.light} />
        <line x1="30" y1="15" x2="33" y2="7" stroke={pal.light} strokeWidth="2" strokeLinecap="round" />
        <circle cx="33" cy="6.8" r="1.5" fill={pal.light} />

        {/* Mecha Helmet */}
        <path
          d="M 14 19 C 14 10.5, 30 10.5, 30 19 L 28.5 23.5 L 15.5 23.5 Z"
          fill="#334155"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
        {/* Helmet Color Crest */}
        <rect x="20.2" y="10.2" width="3.6" height="4.2" rx="1" fill={pal.main} stroke={strokeColor} strokeWidth="0.9" />

        <CharacterFace cy={18.2} expression={expression} isInGoal={isInGoal} visorColor={pal.light} />
      </svg>
    );
  }

  // 4. BAIRRO GANG (Personagem Urbano de Rua com Boné, Corrente & Hoodie)
  if (themeId === 'gang') {
    return (
      <svg viewBox="0 0 44 48" className={className} aria-hidden="true">
        <Pedestal />
        {/* Oversized Street Hoodie */}
        <path
          d="M 10 26 C 10 22.5, 34 22.5, 34 26 L 35 39.5 L 9 39.5 Z"
          fill={pal.main}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
        {/* Hoodie Pocket & Drawstrings */}
        <path d="M 15 33 L 29 33 L 27.5 38.5 L 16.5 38.5 Z" fill={pal.dark} stroke="#111827" strokeWidth="0.9" />
        {/* Chunky Gold Chain */}
        <path
          d="M 16.5 24.5 Q 22 30.5 27.5 24.5"
          fill="none"
          stroke="#facc15"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        <circle cx="22" cy="28.3" r="1.8" fill="#fde047" stroke="#111827" strokeWidth="0.8" />

        {/* Head */}
        <circle cx="22" cy="18" r="7.2" fill={skin} stroke={strokeColor} strokeWidth={strokeWidth} />

        {/* Snapback Cap (Boné Aba Reta) */}
        <path
          d="M 14.5 15.5 C 14.5 9.2, 29.5 9.2, 29.5 15.5 Z"
          fill={pal.dark}
          stroke={strokeColor}
          strokeWidth="1.3"
        />
        {/* Flat Brim angled sideways */}
        <path
          d="M 14 14.8 L 32.5 13.2 L 31.5 15.8 L 14.5 16.2 Z"
          fill={pal.main}
          stroke={strokeColor}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <rect x="20.2" y="10.8" width="3.6" height="2.6" rx="0.6" fill="#facc15" />

        <CharacterFace
          cy={18.8}
          expression={expression}
          isInGoal={isInGoal}
          sunglasses={expression === 'smiling' || expression === 'confident' || expression === 'celebrating'}
        />
      </svg>
    );
  }

  // 5. EGÍPCIO (Faraó com Nemes Real, Serpente Dourada & Colar Usekh)
  if (themeId === 'egyptian') {
    return (
      <svg viewBox="0 0 44 48" className={className} aria-hidden="true">
        <Pedestal />
        {/* Egyptian Royal Tunic */}
        <path
          d="M 13 24 L 31 24 L 33 39.5 L 11 39.5 Z"
          fill={pal.main}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
        {/* Golden Usekh Royal Collar */}
        <path
          d="M 13.5 24 Q 22 31 30.5 24 L 29 28 Q 22 33.5 15 28 Z"
          fill="#facc15"
          stroke="#111827"
          strokeWidth="1.1"
        />

        {/* Pharaoh Nemes Headdress Wings */}
        <path
          d="M 15.5 11.5 L 9.5 27.5 L 15 28 L 16.5 18 Z"
          fill="#eab308"
          stroke={strokeColor}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M 28.5 11.5 L 34.5 27.5 L 29 28 L 27.5 18 Z"
          fill="#eab308"
          stroke={strokeColor}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Stripes on Nemes */}
        <line x1="12" y1="21" x2="15.5" y2="21" stroke={pal.dark} strokeWidth="1.6" />
        <line x1="10.8" y1="24.5" x2="15" y2="24.5" stroke={pal.dark} strokeWidth="1.6" />
        <line x1="28.5" y1="21" x2="32" y2="21" stroke={pal.dark} strokeWidth="1.6" />
        <line x1="29" y1="24.5" x2="33.2" y2="24.5" stroke={pal.dark} strokeWidth="1.6" />

        {/* Nemes Crown Dome */}
        <path
          d="M 15 15.5 C 15 8.5, 29 8.5, 29 15.5 Z"
          fill={pal.dark}
          stroke={strokeColor}
          strokeWidth="1.3"
        />
        {/* Golden Cobra Crest (Uraeus) */}
        <circle cx="22" cy="11.2" r="1.9" fill="#fde047" stroke="#111827" strokeWidth="0.9" />

        {/* Face */}
        <circle cx="22" cy="18.2" r="6.8" fill={skin} stroke={strokeColor} strokeWidth={strokeWidth} />
        <CharacterFace cy={18.3} expression={expression} isInGoal={isInGoal} kohlEyes />
      </svg>
    );
  }

  // 6. CLÁSSICO ANGOLA (Boneco Peão 2D com Corpo, Bracinhos e Rosto Expressivo)
  return (
    <svg viewBox="0 0 44 48" className={className} aria-hidden="true">
      <Pedestal />
      {/* Little Arms */}
      <circle cx="11.5" cy="31" r="3.1" fill={pal.light} stroke={strokeColor} strokeWidth="1.3" />
      <circle cx="32.5" cy="31" r="3.1" fill={pal.light} stroke={strokeColor} strokeWidth="1.3" />

      {/* Sculpted Pawn Torso */}
      <path
        d="M 15 24 C 15 22, 29 22, 29 24 L 32.5 39.5 L 11.5 39.5 Z"
        fill={pal.main}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* Highlight sheen on torso */}
      <path d="M 17 26 L 15 37" stroke={pal.tint} strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.65" />
      {/* Collar Ring */}
      <ellipse cx="22" cy="24.2" rx="6.5" ry="1.8" fill={pal.light} stroke={strokeColor} strokeWidth="1.1" />

      {/* Character Head */}
      <circle cx="22" cy="16.5" r="7.8" fill={pal.main} stroke={strokeColor} strokeWidth={strokeWidth} />
      {/* Inner Face Medallion for bright expression readability */}
      <circle cx="22" cy="17" r="5.9" fill={shade} fillOpacity="0.18" />
      <circle cx="22" cy="16.8" r="5.8" fill="#fffbeb" stroke={pal.dark} strokeWidth="0.9" />

      <CharacterFace cy={16.9} expression={expression} isInGoal={isInGoal} />
    </svg>
  );
});
