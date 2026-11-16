import React from 'react';
import { CIRCUIT_COORDS } from '../utils/ludoRules';
import type { CaptureSkillDef } from '../utils/captureSkills';

interface PieceCaptureSkillFXProps {
  position: number;
  skill: CaptureSkillDef;
}

export const PieceCaptureSkillFX: React.FC<PieceCaptureSkillFXProps> = React.memo(({ position, skill }) => {
  const coord = CIRCUIT_COORDS[position];
  if (!coord) return null;

  const isSmash =
    skill.kind === 'monster_fist' ||
    skill.kind === 'royal_sword' ||
    skill.kind === 'lightning_bolt' ||
    skill.kind === 'graffiti_boom';

  return (
    <div
      className="absolute left-0 top-0 pointer-events-none z-40 flex items-center justify-center"
      style={{
        width: `${100 / 15}%`,
        height: `${100 / 15}%`,
        transform: `translate3d(${coord.x * 100}%, ${coord.y * 100}%, 0)`
      }}
    >
      {/* Expanding Impact Ring */}
      <div
        className="absolute w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 animate-skill-ring"
        style={{
          borderColor: skill.primaryColor,
          background: `radial-gradient(circle, ${skill.secondaryColor}55 0%, ${skill.primaryColor}22 55%, transparent 75%)`
        }}
      />

      {/* Bespoke 2D Combat Skill Graphic */}
      <div
        className={`relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center ${
          isSmash ? 'animate-skill-smash' : 'animate-skill-projectile'
        }`}
      >
        {/* 1. COSPE FOGO / BAFO DO DRAGÃO / ERUPÇÃO SOLAR */}
        {skill.kind === 'fire_breath' && (
          <svg viewBox="0 0 96 96" className="w-full h-full">
            {/* Fire Breath Cone */}
            <path
              d="M 10 56 C 24 38, 42 22, 68 18 C 78 16, 88 28, 86 44 C 84 62, 66 76, 46 76 C 28 76, 18 68, 10 56 Z"
              fill={skill.primaryColor}
              stroke="#111827"
              strokeWidth="2.5"
            />
            <path
              d="M 18 54 C 32 40, 48 30, 68 28 C 76 34, 76 54, 62 64 C 46 70, 30 64, 18 54 Z"
              fill="#f97316"
            />
            <path
              d="M 28 52 C 38 42, 50 37, 63 38 C 68 44, 64 55, 52 59 C 41 61, 34 57, 28 52 Z"
              fill={skill.secondaryColor}
            />
            {/* Flying Embers */}
            <circle cx="76" cy="22" r="4" fill="#fde047" stroke="#111827" strokeWidth="1.4" />
            <circle cx="84" cy="54" r="3.5" fill="#fb923c" stroke="#111827" strokeWidth="1.4" />
            <circle cx="56" cy="14" r="3" fill="#fef08a" />
            <circle cx="40" cy="80" r="3.5" fill="#ef4444" stroke="#111827" strokeWidth="1.2" />
          </svg>
        )}

        {/* 2. RAIO ELÉTRICO / ARCANO / QUÂNTICO / TROVÃO */}
        {skill.kind === 'lightning_bolt' && (
          <svg viewBox="0 0 96 96" className="w-full h-full">
            {/* Electric Flash Star */}
            <polygon
              points="48,6 56,28 80,22 64,42 86,54 62,62 68,86 46,70 26,84 32,60 10,50 34,40 20,18 42,26"
              fill={skill.secondaryColor}
              fillOpacity="0.45"
            />
            {/* Main Jagged Lightning Bolt */}
            <polygon
              points="54,6 26,50 46,50 38,90 72,42 50,42"
              fill={skill.primaryColor}
              stroke="#111827"
              strokeWidth="2.8"
              strokeLinejoin="round"
            />
            <polygon points="52,14 34,46 49,46 43,78 64,45 48,45" fill="#ffffff" fillOpacity="0.75" />
            {/* Crackling Arcs */}
            <path d="M 14 32 L 24 26 L 20 38 L 30 34" fill="none" stroke={skill.secondaryColor} strokeWidth="2.8" strokeLinecap="round" />
            <path d="M 68 62 L 78 58 L 74 70 L 84 66" fill="none" stroke={skill.secondaryColor} strokeWidth="2.8" strokeLinecap="round" />
          </svg>
        )}

        {/* 3. PUNHO DE MONSTRO / SOCO PESADO / GARRA DA ESFINGE */}
        {skill.kind === 'monster_fist' && (
          <svg viewBox="0 0 96 96" className="w-full h-full">
            {/* Ground Crater Impact Lines */}
            <path d="M 12 72 L 26 64 M 84 72 L 70 64 M 18 82 L 34 74 M 78 82 L 62 74" stroke="#fde047" strokeWidth="3.2" strokeLinecap="round" />
            {/* Massive Monster Forearm & Fist */}
            <path
              d="M 28 10 L 68 10 L 66 34 C 74 36, 78 44, 75 56 C 72 68, 60 76, 46 76 C 32 76, 20 67, 19 54 C 18 42, 24 35, 30 34 Z"
              fill={skill.primaryColor}
              stroke="#111827"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            {/* Knuckles & Monster Claws/Plates */}
            <rect x="24" y="48" width="12" height="17" rx="5" fill={skill.secondaryColor} stroke="#111827" strokeWidth="2.2" />
            <rect x="37" y="50" width="12" height="18" rx="5" fill={skill.secondaryColor} stroke="#111827" strokeWidth="2.2" />
            <rect x="50" y="50" width="12" height="18" rx="5" fill={skill.secondaryColor} stroke="#111827" strokeWidth="2.2" />
            <rect x="62" y="47" width="11" height="16" rx="5" fill={skill.secondaryColor} stroke="#111827" strokeWidth="2.2" />
            {/* Thumb Lock */}
            <path
              d="M 22 40 C 32 36, 44 40, 44 48 C 44 54, 32 54, 24 50 Z"
              fill={skill.primaryColor}
              stroke="#111827"
              strokeWidth="2.4"
            />
            {/* Spikes / Studs on Monster Fist */}
            <polygon points="32,36 36,27 40,36" fill="#fef08a" stroke="#111827" strokeWidth="1.5" />
            <polygon points="45,35 49,25 53,35" fill="#fef08a" stroke="#111827" strokeWidth="1.5" />
            <polygon points="58,36 62,27 66,36" fill="#fef08a" stroke="#111827" strokeWidth="1.5" />
          </svg>
        )}

        {/* 4. CHUTE DE BOLA DE FUTEBOL COM RASTRO DE ENERGIA */}
        {skill.kind === 'football_shot' && (
          <svg viewBox="0 0 96 96" className="w-full h-full">
            {/* Speed Flame / Power Trail */}
            <path
              d="M 6 60 Q 26 42 54 32 L 58 58 Q 28 66 6 60 Z"
              fill={skill.primaryColor}
              fillOpacity="0.88"
              stroke="#111827"
              strokeWidth="2"
            />
            <path
              d="M 12 56 Q 30 44 52 38 L 54 52 Q 32 58 12 56 Z"
              fill={skill.secondaryColor}
              fillOpacity="0.9"
            />
            <line x1="6" y1="36" x2="34" y2="30" stroke="#fde047" strokeWidth="3" strokeLinecap="round" />
            <line x1="10" y1="72" x2="38" y2="66" stroke="#fde047" strokeWidth="3" strokeLinecap="round" />

            {/* High-Contrast Classic Soccer Ball */}
            <circle cx="62" cy="46" r="21" fill="#ffffff" stroke="#111827" strokeWidth="3" />
            {/* Team Rim Accent */}
            <circle cx="62" cy="46" r="18" fill="none" stroke={skill.primaryColor} strokeWidth="2.2" strokeOpacity="0.7" />
            {/* Center Pentagon */}
            <polygon points="62,36 70,42 67,52 57,52 54,42" fill="#111827" />
            {/* Outer Pentagon Patches */}
            <polygon points="62,25 67,29 57,29" fill="#111827" />
            <polygon points="44,41 49,38 49,47" fill="#111827" />
            <polygon points="80,41 75,38 75,47" fill="#111827" />
            <polygon points="52,63 56,57 62,62" fill="#111827" />
            <polygon points="72,63 68,57 62,62" fill="#111827" />
            {/* Impact Star */}
            <polygon points="82,22 85,14 88,22 94,25 88,28 85,35 82,28 75,25" fill="#fde047" stroke="#111827" strokeWidth="1.2" />
          </svg>
        )}

        {/* 5. GOLPE REAL (ESPADAS CRUZADAS MEDIEVAIS) */}
        {skill.kind === 'royal_sword' && (
          <svg viewBox="0 0 96 96" className="w-full h-full">
            <polygon points="48,10 56,36 84,48 56,60 48,86 40,60 12,48 40,36" fill={skill.secondaryColor} fillOpacity="0.45" />
            {/* Sword 1 */}
            <g transform="rotate(-42 48 48)">
              <rect x="44" y="10" width="8" height="54" rx="2" fill="#f8fafc" stroke="#111827" strokeWidth="2.2" />
              <polygon points="44,12 48,3 52,12" fill="#ffffff" stroke="#111827" strokeWidth="1.8" />
              <rect x="34" y="60" width="28" height="6" rx="2" fill={skill.primaryColor} stroke="#111827" strokeWidth="2" />
              <rect x="45" y="66" width="6" height="14" rx="2" fill="#78350f" stroke="#111827" strokeWidth="2" />
            </g>
            {/* Sword 2 */}
            <g transform="rotate(42 48 48)">
              <rect x="44" y="10" width="8" height="54" rx="2" fill="#f8fafc" stroke="#111827" strokeWidth="2.2" />
              <polygon points="44,12 48,3 52,12" fill="#ffffff" stroke="#111827" strokeWidth="1.8" />
              <rect x="34" y="60" width="28" height="6" rx="2" fill={skill.primaryColor} stroke="#111827" strokeWidth="2" />
              <rect x="45" y="66" width="6" height="14" rx="2" fill="#78350f" stroke="#111827" strokeWidth="2" />
            </g>
          </svg>
        )}

        {/* 6. CHUVA DE FLECHAS (REINO FLORESTA) */}
        {skill.kind === 'forest_arrows' && (
          <svg viewBox="0 0 96 96" className="w-full h-full">
            {[-20, 0, 20].map((dy, i) => (
              <g key={i} transform={`translate(${i * 4}, ${dy}) rotate(-18 48 48)`}>
                <line x1="12" y1="48" x2="72" y2="48" stroke="#fef08a" strokeWidth="4" strokeLinecap="round" />
                <line x1="12" y1="48" x2="72" y2="48" stroke="#111827" strokeWidth="1.4" />
                <polygon points="78,48 64,41 67,48 64,55" fill={skill.primaryColor} stroke="#111827" strokeWidth="1.8" />
                <polygon points="10,48 20,42 18,48 20,54" fill="#22c55e" stroke="#111827" strokeWidth="1.4" />
              </g>
            ))}
          </svg>
        )}

        {/* 7. FEIXE LASER / PULSO PLASMA (FUTURO CYBER NEON) */}
        {skill.kind === 'cyber_laser' && (
          <svg viewBox="0 0 96 96" className="w-full h-full">
            <circle cx="62" cy="48" r="24" fill={skill.primaryColor} fillOpacity="0.35" stroke={skill.secondaryColor} strokeWidth="2.5" />
            <path d="M 6 38 L 72 44 L 72 52 L 6 58 Z" fill={skill.primaryColor} stroke="#111827" strokeWidth="2" />
            <path d="M 10 44 L 70 46 L 70 50 L 10 52 Z" fill="#ffffff" />
            <polygon points="62,18 68,40 90,48 68,56 62,78 56,56 34,48 56,40" fill={skill.secondaryColor} stroke="#111827" strokeWidth="1.8" />
          </svg>
        )}

        {/* 8. BOMBA GRAFFITI (BAIRRO GANG) */}
        {skill.kind === 'graffiti_boom' && (
          <svg viewBox="0 0 96 96" className="w-full h-full">
            <polygon
              points="48,6 59,24 82,16 74,38 92,48 74,60 82,82 59,74 48,92 37,74 14,82 22,60 4,48 22,38 14,16 37,24"
              fill={skill.primaryColor}
              stroke="#111827"
              strokeWidth="3"
            />
            <polygon
              points="48,18 56,32 72,26 66,42 80,48 66,56 72,70 56,64 48,78 40,64 24,70 30,56 16,48 30,42 24,26 40,32"
              fill={skill.secondaryColor}
            />
            <text x="48" y="54" textAnchor="middle" fontSize="18" fontWeight="900" fill="#111827">
              BOOM!
            </text>
          </svg>
        )}

        {/* 9. ENXAME DE ESCARAVELHOS (EGÍPCIO OÁSIS) */}
        {skill.kind === 'scarab_swarm' && (
          <svg viewBox="0 0 96 96" className="w-full h-full">
            {[
              { x: 48, y: 48, s: 1.15, r: -10 },
              { x: 26, y: 32, s: 0.72, r: 22 },
              { x: 70, y: 64, s: 0.72, r: -28 }
            ].map((b, idx) => (
              <g key={idx} transform={`translate(${b.x}, ${b.y}) rotate(${b.r}) scale(${b.s})`}>
                {/* Golden Scarab Wings */}
                <ellipse cx="-11" cy="2" rx="10" ry="6" fill="#fde047" stroke="#111827" strokeWidth="1.8" />
                <ellipse cx="11" cy="2" rx="10" ry="6" fill="#fde047" stroke="#111827" strokeWidth="1.8" />
                {/* Turquoise Body */}
                <ellipse cx="0" cy="2" rx="8" ry="12" fill={skill.primaryColor} stroke="#111827" strokeWidth="2.2" />
                <circle cx="0" cy="-10" r="4.5" fill="#eab308" stroke="#111827" strokeWidth="1.8" />
                <circle cx="0" cy="1" r="3" fill="#fef08a" />
              </g>
            ))}
          </svg>
        )}
      </div>

      {/* Crisp Combat Skill Callout Label */}
      <div
        className="absolute -top-8 left-1/2 px-2.5 py-0.5 rounded-md border-2 text-[10px] sm:text-xs font-black text-white whitespace-nowrap shadow-xl animate-skill-label"
        style={{
          backgroundColor: '#09090b',
          borderColor: skill.secondaryColor
        }}
      >
        {skill.shortLabel}
      </div>
    </div>
  );
});
