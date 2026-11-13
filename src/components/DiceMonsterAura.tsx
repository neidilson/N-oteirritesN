import React from 'react';

export type MonsterAuraKind = 'six' | 'capture' | 'knocked' | 'goal' | 'victory';

interface AvatarMonsterProps {
  kind: MonsterAuraKind;
  label: string;
}

// Expressive, colorful 2D Monster Sprite rendered OUTSIDE the board on the Player Avatar Card
// Uses crisp flat vector fills + GPU-only transform/opacity (zero SVG filters, zero board impact)
export const AvatarMonster: React.FC<AvatarMonsterProps> = React.memo(({ kind, label }) => {
  const badgeColor =
    kind === 'six'
      ? 'bg-fuchsia-600 border-yellow-300 text-white'
      : kind === 'capture'
      ? 'bg-red-600 border-yellow-300 text-white'
      : kind === 'knocked'
      ? 'bg-neutral-800 border-red-400 text-red-200'
      : 'bg-amber-400 border-white text-neutral-950';

  return (
    <div className="absolute right-1 -top-4 z-30 pointer-events-none flex flex-col items-center animate-avatar-monster">
      {kind === 'six' && (
        <svg viewBox="0 0 64 64" width="58" height="58">
          {/* Flame Aura Silhouette (flat fill) */}
          <polygon points="32,2 42,16 58,12 50,28 60,40 44,46 32,58 20,46 4,40 14,28 6,12 22,16" fill="#a855f7" opacity="0.35" />
          {/* Golden Horns */}
          <polygon points="16,24 10,8 24,18" fill="#facc15" />
          <polygon points="48,24 54,8 40,18" fill="#facc15" />
          {/* Oni Head */}
          <rect x="14" y="16" width="36" height="34" rx="13" fill="#9333ea" />
          {/* Forehead 6 Gem */}
          <circle cx="32" cy="23" r="4.5" fill="#fde047" />
          {/* Glowing Eyes */}
          <polygon points="19,30 28,33 21,36" fill="#38bdf8" />
          <polygon points="45,30 36,33 43,36" fill="#38bdf8" />
          {/* Mouth + Fangs */}
          <path d="M21 41 Q32 47 43 41 L40 46 H24 Z" fill="#18181b" />
          <polygon points="22,41 25,36 28,42" fill="#ffffff" />
          <polygon points="42,41 39,36 36,42" fill="#ffffff" />
        </svg>
      )}

      {kind === 'capture' && (
        <svg viewBox="0 0 64 64" width="58" height="58">
          {/* Sharp Red Burst */}
          <polygon points="32,3 40,15 56,14 48,28 58,39 44,45 32,58 20,45 6,39 16,28 8,14 24,15" fill="#ef4444" opacity="0.35" />
          {/* Big Battle Horns */}
          <polygon points="16,24 7,6 25,17" fill="#facc15" />
          <polygon points="48,24 57,6 39,17" fill="#facc15" />
          {/* Beast Face */}
          <path d="M13 24 Q32 10 51 24 L48 47 Q32 56 16 47 Z" fill="#dc2626" />
          {/* Fierce Eyes */}
          <polygon points="19,29 29,33 21,36" fill="#fef08a" />
          <polygon points="45,29 35,33 43,36" fill="#fef08a" />
          {/* Chomp Mouth */}
          <polygon points="20,40 32,43 44,40 40,48 32,45 24,48" fill="#18181b" />
          <polygon points="22,40 25,46 28,41" fill="#ffffff" />
          <polygon points="42,40 39,46 36,41" fill="#ffffff" />
        </svg>
      )}

      {kind === 'knocked' && (
        <svg viewBox="0 0 64 64" width="54" height="54">
          {/* Dizzy Ko Ghost/Skull */}
          <circle cx="32" cy="30" r="18" fill="#3f3f46" />
          <rect x="23" y="42" width="18" height="10" rx="4" fill="#3f3f46" />
          {/* X Eyes */}
          <path d="M21 25 L27 31 M27 25 L21 31" stroke="#fca5a5" strokeWidth="3" strokeLinecap="round" />
          <path d="M37 25 L43 31 M43 25 L37 31" stroke="#fca5a5" strokeWidth="3" strokeLinecap="round" />
          {/* Dizzy Mouth */}
          <path d="M24 41 Q28 37 32 41 Q36 45 40 41" fill="none" stroke="#e4e4e7" strokeWidth="2.5" strokeLinecap="round" />
          {/* Little Dizzy Stars */}
          <polygon points="14,14 16,10 18,14 22,15 18,17 16,21 14,17 10,15" fill="#facc15" />
          <polygon points="50,12 51.5,9 53,12 56,13 53,14.5 51.5,17.5 50,14.5 47,13" fill="#facc15" />
        </svg>
      )}

      {(kind === 'goal' || kind === 'victory') && (
        <svg viewBox="0 0 64 64" width="60" height="60">
          {/* Golden Glory Starburst */}
          <polygon points="32,2 40,16 56,14 48,29 58,42 42,46 32,59 22,46 6,42 16,29 8,14 24,16" fill="#facc15" opacity="0.35" />
          {/* Crown */}
          <polygon points="17,22 21,9 28,17 32,7 36,17 43,9 47,22" fill="#fde047" />
          {/* Champion Titan Head */}
          <rect x="16" y="21" width="32" height="30" rx="12" fill="#eab308" />
          {/* Happy Emerald Eyes */}
          <path d="M21 32 Q24.5 28 28 32" fill="none" stroke="#064e3b" strokeWidth="3" strokeLinecap="round" />
          <path d="M36 32 Q39.5 28 43 32" fill="none" stroke="#064e3b" strokeWidth="3" strokeLinecap="round" />
          {/* Big Victory Grin */}
          <path d="M22 39 Q32 47 42 39 Z" fill="#18181b" />
          <rect x="26" y="39" width="12" height="3" fill="#ffffff" />
        </svg>
      )}

      <span className={`-mt-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider whitespace-nowrap shadow-md ${badgeColor}`}>
        {label}
      </span>
    </div>
  );
});
