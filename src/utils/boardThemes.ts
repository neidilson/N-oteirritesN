import type { BoardThemeId } from '../types';
import kingdomsArt from '../assets/images/board_kingdoms_1794567505701.jpg';
import footballArt from '../assets/images/board_football_1794567506857.jpg';
import futureArt from '../assets/images/board_future_1794567506478.jpg';
import gangArt from '../assets/images/board_gang_1794567508676.jpg';
import egyptianArt from '../assets/images/board_egyptian_1794567508422.jpg';

export interface BoardThemeDefinition {
  id: BoardThemeId;
  name: string;
  subtitle: string;
  description: string;
  priceKz: number;
  priceUsdt: number;
  isFree: boolean;
  badge: string;
  artUrl?: string;
  frameBg: string;
  frameBorder: string;
  canvasBg: string;
  tileBg: string;
  tileBorder: string;
  safeTileBg: string;
  safeTileBorder: string;
  safeStarColor: string;
  yardInnerBg: string;
  // Base colors (always clearly identifiable as Verde, Amarelo, Vermelho, Azul)
  bases: {
    green: { outer: string; innerBorder: string; slotBg: string; titleColor: string; label: string };
    yellow: { outer: string; innerBorder: string; slotBg: string; titleColor: string; label: string };
    red: { outer: string; innerBorder: string; slotBg: string; titleColor: string; label: string };
    blue: { outer: string; innerBorder: string; slotBg: string; titleColor: string; label: string };
  };
  centerSymbol: string;
}

export const BOARD_THEMES: Record<BoardThemeId, BoardThemeDefinition> = {
  classic: {
    id: 'classic',
    name: 'Clássico Angola',
    subtitle: 'Tabuleiro Tradicional N',
    description: 'Fundo branco de alto contraste com cores clássicas e leitura cristalina.',
    priceKz: 0,
    priceUsdt: 0,
    isFree: true,
    badge: 'GRÁTIS',
    frameBg: '#1b1c23',
    frameBorder: '#2d303f',
    canvasBg: '#ffffff',
    tileBg: '#ffffff',
    tileBorder: '#d4d4d8',
    safeTileBg: '#fffbeb',
    safeTileBorder: '#fcd34d',
    safeStarColor: '#f59e0b',
    yardInnerBg: '#ffffff',
    bases: {
      green: { outer: '#16a34a', innerBorder: '#15803d', slotBg: '#ecfdf5', titleColor: '#15803d', label: 'BASE VERDE' },
      yellow: { outer: '#facc15', innerBorder: '#ca8a04', slotBg: '#fefce8', titleColor: '#854d0e', label: 'BASE AMARELA' },
      red: { outer: '#dc2626', innerBorder: '#b91c1c', slotBg: '#fef2f2', titleColor: '#b91c1c', label: 'BASE VERMELHA' },
      blue: { outer: '#2563eb', innerBorder: '#1d4ed8', slotBg: '#eff6ff', titleColor: '#1d4ed8', label: 'BASE AZUL' }
    },
    centerSymbol: '★'
  },
  kingdoms: {
    id: 'kingdoms',
    name: 'Reinos Medievais',
    subtitle: 'Coroas, Castelos & Escudos',
    description: 'Tabuleiro em pergaminho real com brasões de reinos, muralhas de pedra e estrelas douradas.',
    priceKz: 15000,
    priceUsdt: 16,
    isFree: false,
    badge: 'REINOS 👑',
    artUrl: kingdomsArt,
    frameBg: '#271c15',
    frameBorder: '#b45309',
    canvasBg: '#f5ebd6',
    tileBg: '#fbf4e4',
    tileBorder: '#cbb389',
    safeTileBg: '#fef3c7',
    safeTileBorder: '#d97706',
    safeStarColor: '#b45309',
    yardInnerBg: '#fcf6e8',
    bases: {
      green: { outer: '#14532d', innerBorder: '#166534', slotBg: '#dcfce7', titleColor: '#14532d', label: 'REINO FLORESTA' },
      yellow: { outer: '#ca8a04', innerBorder: '#854d0e', slotBg: '#fef9c3', titleColor: '#713f12', label: 'REINO DO OURO' },
      red: { outer: '#991b1b', innerBorder: '#7f1d1d', slotBg: '#fee2e2', titleColor: '#7f1d1d', label: 'REINO DRAGÃO' },
      blue: { outer: '#1e3a8a', innerBorder: '#1e40af', slotBg: '#dbeafe', titleColor: '#1e3a8a', label: 'REINO SAFIRA' }
    },
    centerSymbol: '👑'
  },
  football: {
    id: 'football',
    name: 'Futebol: Real Madrid vs Barça',
    subtitle: 'El Clásico no Relvado',
    description: 'Campo de estádio com faixas de relva, linhas brancas de cal, Real Madrid vs Barça e troféu no meio.',
    priceKz: 25000,
    priceUsdt: 27,
    isFree: false,
    badge: 'EL CLÁSICO ⚽',
    artUrl: footballArt,
    frameBg: '#0a2e1a',
    frameBorder: '#22c55e',
    canvasBg: '#15803d',
    tileBg: '#dcfce7',
    tileBorder: '#4ade80',
    safeTileBg: '#fef08a',
    safeTileBorder: '#eab308',
    safeStarColor: '#ca8a04',
    yardInnerBg: '#f8fafc',
    bases: {
      green: { outer: '#15803d', innerBorder: '#166534', slotBg: '#bbf7d0', titleColor: '#14532d', label: 'SPORTING CLUBE' },
      yellow: { outer: '#eab308', innerBorder: '#a16207', slotBg: '#fef9c3', titleColor: '#78350f', label: 'REAL MADRID 👑' },
      red: { outer: '#b91c1c', innerBorder: '#7f1d1d', slotBg: '#fee2e2', titleColor: '#991b1b', label: 'BARÇA GRANA' },
      blue: { outer: '#1d4ed8', innerBorder: '#1e3a8a', slotBg: '#dbeafe', titleColor: '#1e3a8a', label: 'FC BARÇA BLAU' }
    },
    centerSymbol: '⚽'
  },
  future: {
    id: 'future',
    name: 'Futuro Cyber Neon',
    subtitle: 'Arena Sci-Fi 2099',
    description: 'Grelha futurista em obsidiana escura com circuitos néon de alta energia e núcleo quântico.',
    priceKz: 20000,
    priceUsdt: 22,
    isFree: false,
    badge: 'FUTURO 🚀',
    artUrl: futureArt,
    frameBg: '#050814',
    frameBorder: '#06b6d4',
    canvasBg: '#0b1120',
    tileBg: '#0f172a',
    tileBorder: '#38bdf8',
    safeTileBg: '#1e3a8a',
    safeTileBorder: '#67e8f9',
    safeStarColor: '#67e8f9',
    yardInnerBg: '#0f172a',
    bases: {
      green: { outer: '#059669', innerBorder: '#34d399', slotBg: '#064e3b', titleColor: '#6ee7b7', label: 'CYBER VERDE' },
      yellow: { outer: '#d97706', innerBorder: '#fbbf24', slotBg: '#451a03', titleColor: '#fde047', label: 'SOLAR NEON' },
      red: { outer: '#e11d48', innerBorder: '#fb7185', slotBg: '#4c0519', titleColor: '#fda4af', label: 'LASER RUBI' },
      blue: { outer: '#0284c7', innerBorder: '#38bdf8', slotBg: '#082f49', titleColor: '#7dd3fc', label: 'QUANTUM AZUL' }
    },
    centerSymbol: '⚡'
  },
  gang: {
    id: 'gang',
    name: 'Bairro Gang',
    subtitle: 'Rua, Asfalto & Graffiti',
    description: 'Asfalto urbano escuro com tags de rua, faixas de perigo douradas e respeito de bairro.',
    priceKz: 18000,
    priceUsdt: 20,
    isFree: false,
    badge: 'BAIRRO 🔥',
    artUrl: gangArt,
    frameBg: '#141414',
    frameBorder: '#facc15',
    canvasBg: '#262626',
    tileBg: '#27272a',
    tileBorder: '#a1a1aa',
    safeTileBg: '#422006',
    safeTileBorder: '#facc15',
    safeStarColor: '#facc15',
    yardInnerBg: '#171717',
    bases: {
      green: { outer: '#16a34a', innerBorder: '#4ade80', slotBg: '#14532d', titleColor: '#86efac', label: 'ZONA VERDE' },
      yellow: { outer: '#eab308', innerBorder: '#fde047', slotBg: '#422006', titleColor: '#fef08a', label: 'OURO DO GUETO' },
      red: { outer: '#dc2626', innerBorder: '#f87171', slotBg: '#450a0a', titleColor: '#fca5a5', label: 'TROPA VERMELHA' },
      blue: { outer: '#2563eb', innerBorder: '#60a5fa', slotBg: '#172554', titleColor: '#93c5fd', label: 'BLOCO AZUL' }
    },
    centerSymbol: '🔥'
  },
  egyptian: {
    id: 'egyptian',
    name: 'Egípcio (Faraós)',
    subtitle: 'Areia, Ouro & Pirâmides',
    description: 'Arenito do deserto do Egito com lápis-lazúli real, escaravelhos e Olho de Hórus na meta.',
    priceKz: 22000,
    priceUsdt: 24,
    isFree: false,
    badge: 'EGÍPCIO 🏺',
    artUrl: egyptianArt,
    frameBg: '#2b1e10',
    frameBorder: '#eab308',
    canvasBg: '#ebd5a7',
    tileBg: '#f6e7c5',
    tileBorder: '#c29b58',
    safeTileBg: '#fef08a',
    safeTileBorder: '#b45309',
    safeStarColor: '#92400e',
    yardInnerBg: '#faeed2',
    bases: {
      green: { outer: '#0f766e', innerBorder: '#115e59', slotBg: '#ccfbf1', titleColor: '#134e4a', label: 'OASIS VERDE' },
      yellow: { outer: '#d97706', innerBorder: '#92400e', slotBg: '#fef3c7', titleColor: '#78350f', label: 'SOL DE RÁ' },
      red: { outer: '#b91c1c', innerBorder: '#7f1d1d', slotBg: '#fee2e2', titleColor: '#7f1d1d', label: 'ESFINGE RUBI' },
      blue: { outer: '#1d4ed8', innerBorder: '#1e3a8a', slotBg: '#dbeafe', titleColor: '#1e3a8a', label: 'LÁPIS DO NILO' }
    },
    centerSymbol: '🏺'
  }
};

export const BOARD_THEME_LIST: BoardThemeDefinition[] = Object.values(BOARD_THEMES);
