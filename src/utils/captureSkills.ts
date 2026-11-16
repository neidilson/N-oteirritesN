import type { BoardThemeId, PlayerColor } from '../types';

export type CaptureSkillKind =
  | 'fire_breath'
  | 'lightning_bolt'
  | 'monster_fist'
  | 'football_shot'
  | 'royal_sword'
  | 'forest_arrows'
  | 'cyber_laser'
  | 'graffiti_boom'
  | 'scarab_swarm';

export interface CaptureSkillDef {
  kind: CaptureSkillKind;
  name: string;
  shortLabel: string;
  emoji: string;
  primaryColor: string;
  secondaryColor: string;
}

export const THEME_BASE_SKILLS: Record<BoardThemeId, Record<PlayerColor, CaptureSkillDef>> = {
  classic: {
    red: {
      kind: 'fire_breath',
      name: 'Cospe Fogo',
      shortLabel: '🔥 COSPE FOGO!',
      emoji: '🔥',
      primaryColor: '#ef4444',
      secondaryColor: '#facc15'
    },
    yellow: {
      kind: 'lightning_bolt',
      name: 'Raio Relâmpago',
      shortLabel: '⚡ RAIO ELÉTRICO!',
      emoji: '⚡',
      primaryColor: '#facc15',
      secondaryColor: '#fef08a'
    },
    blue: {
      kind: 'monster_fist',
      name: 'Punho de Monstro',
      shortLabel: '👊 PUNHO MONSTRO!',
      emoji: '👊',
      primaryColor: '#2563eb',
      secondaryColor: '#93c5fd'
    },
    green: {
      kind: 'football_shot',
      name: 'Bola de Futebol',
      shortLabel: '⚽ CHUTE DE BOLA!',
      emoji: '⚽',
      primaryColor: '#16a34a',
      secondaryColor: '#bbf7d0'
    }
  },
  kingdoms: {
    red: {
      kind: 'fire_breath',
      name: 'Bafo do Dragão',
      shortLabel: '🐉 BAFO DO DRAGÃO!',
      emoji: '🔥',
      primaryColor: '#dc2626',
      secondaryColor: '#fbbf24'
    },
    yellow: {
      kind: 'royal_sword',
      name: 'Golpe Real',
      shortLabel: '⚔️ GOLPE REAL!',
      emoji: '⚔️',
      primaryColor: '#eab308',
      secondaryColor: '#fef08a'
    },
    green: {
      kind: 'forest_arrows',
      name: 'Chuva de Flechas',
      shortLabel: '🏹 CHUVA DE FLECHAS!',
      emoji: '🏹',
      primaryColor: '#16a34a',
      secondaryColor: '#fde047'
    },
    blue: {
      kind: 'lightning_bolt',
      name: 'Raio Arcano',
      shortLabel: '⚡ RAIO ARCANO!',
      emoji: '⚡',
      primaryColor: '#2563eb',
      secondaryColor: '#67e8f9'
    }
  },
  football: {
    yellow: {
      kind: 'football_shot',
      name: 'Chute de Ouro',
      shortLabel: '⚽ CHUTE DE OURO!',
      emoji: '⚽',
      primaryColor: '#eab308',
      secondaryColor: '#ffffff'
    },
    red: {
      kind: 'football_shot',
      name: 'Bola Foguete Grana',
      shortLabel: '⚽ BOLA FOGUETE!',
      emoji: '⚽',
      primaryColor: '#dc2626',
      secondaryColor: '#1d4ed8'
    },
    blue: {
      kind: 'football_shot',
      name: 'Remate Elétrico Blau',
      shortLabel: '⚽ REMATE ELÉTRICO!',
      emoji: '⚽',
      primaryColor: '#2563eb',
      secondaryColor: '#dc2626'
    },
    green: {
      kind: 'football_shot',
      name: 'Canhão do Relvado',
      shortLabel: '⚽ CANHÃO VERDE!',
      emoji: '⚽',
      primaryColor: '#16a34a',
      secondaryColor: '#facc15'
    }
  },
  future: {
    red: {
      kind: 'cyber_laser',
      name: 'Feixe Laser Rubi',
      shortLabel: '🔴 LASER RUBI!',
      emoji: '⚡',
      primaryColor: '#f43f5e',
      secondaryColor: '#fda4af'
    },
    blue: {
      kind: 'lightning_bolt',
      name: 'Raio Quântico',
      shortLabel: '⚡ RAIO QUÂNTICO!',
      emoji: '⚡',
      primaryColor: '#06b6d4',
      secondaryColor: '#67e8f9'
    },
    green: {
      kind: 'cyber_laser',
      name: 'Pulso de Plasma',
      shortLabel: '💚 PULSO PLASMA!',
      emoji: '⚡',
      primaryColor: '#10b981',
      secondaryColor: '#6ee7b7'
    },
    yellow: {
      kind: 'fire_breath',
      name: 'Erupção Solar',
      shortLabel: '☀️ ERUPÇÃO SOLAR!',
      emoji: '🔥',
      primaryColor: '#f59e0b',
      secondaryColor: '#fef08a'
    }
  },
  gang: {
    red: {
      kind: 'monster_fist',
      name: 'Punho de Monstro',
      shortLabel: '👊 PUNHO MONSTRO!',
      emoji: '👊',
      primaryColor: '#dc2626',
      secondaryColor: '#fde047'
    },
    yellow: {
      kind: 'monster_fist',
      name: 'Soco Pesado de Ouro',
      shortLabel: '🥊 SOCO DE OURO!',
      emoji: '🥊',
      primaryColor: '#eab308',
      secondaryColor: '#ffffff'
    },
    green: {
      kind: 'graffiti_boom',
      name: 'Bomba Graffiti',
      shortLabel: '💥 BOMBA GRAFFITI!',
      emoji: '💥',
      primaryColor: '#22c55e',
      secondaryColor: '#facc15'
    },
    blue: {
      kind: 'lightning_bolt',
      name: 'Onda de Choque',
      shortLabel: '⚡ ONDA DE CHOQUE!',
      emoji: '⚡',
      primaryColor: '#3b82f6',
      secondaryColor: '#93c5fd'
    }
  },
  egyptian: {
    yellow: {
      kind: 'fire_breath',
      name: 'Chama Solar de Rá',
      shortLabel: '☀️ CHAMA DE RÁ!',
      emoji: '🔥',
      primaryColor: '#f59e0b',
      secondaryColor: '#fef08a'
    },
    red: {
      kind: 'monster_fist',
      name: 'Garra da Esfinge',
      shortLabel: '🦁 GARRA ESFINGE!',
      emoji: '👊',
      primaryColor: '#b91c1c',
      secondaryColor: '#facc15'
    },
    green: {
      kind: 'scarab_swarm',
      name: 'Escaravelhos do Oásis',
      shortLabel: '🪲 ESCARAVELHOS!',
      emoji: '🪲',
      primaryColor: '#0d9488',
      secondaryColor: '#fde047'
    },
    blue: {
      kind: 'lightning_bolt',
      name: 'Trovão do Nilo',
      shortLabel: '⚡ TROVÃO DO NILO!',
      emoji: '⚡',
      primaryColor: '#1d4ed8',
      secondaryColor: '#67e8f9'
    }
  }
};

export function getBaseCaptureSkill(themeId: BoardThemeId, color: PlayerColor): CaptureSkillDef {
  const themeSkills = THEME_BASE_SKILLS[themeId] || THEME_BASE_SKILLS.classic;
  return themeSkills[color] || THEME_BASE_SKILLS.classic[color];
}
