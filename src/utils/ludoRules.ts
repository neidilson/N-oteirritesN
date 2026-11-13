import type { PlayerColor, Piece, PieceExpression } from '../types/index.ts';

/**
 * 52-tile classic Ludo / Não Te Irrites board layout.
 * Color starting indexes on the 0..51 loop:
 * Red: 0
 * Green: 13
 * Yellow: 26
 * Blue: 39
 */
export const COLOR_START_CELL: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39
};

// Safe squares where captures cannot happen (start cells + safe stars)
export const SAFE_CELLS = new Set<number>([0, 8, 13, 21, 26, 34, 39, 47]);

// Color names in Portuguese
export const COLOR_NAMES: Record<PlayerColor, string> = {
  red: 'Vermelho',
  green: 'Verde',
  yellow: 'Amarelo',
  blue: 'Azul'
};

// Hex colors for UI
export const COLOR_HEX: Record<PlayerColor, { bg: string; text: string; border: string; lightBg: string }> = {
  red: { bg: '#DC2626', text: '#FEE2E2', border: '#991B1B', lightBg: 'rgba(220, 38, 38, 0.15)' },
  green: { bg: '#16A34A', text: '#DCFCE7', border: '#166534', lightBg: 'rgba(22, 163, 74, 0.15)' },
  yellow: { bg: '#EAB308', text: '#FEF08A', border: '#854D0E', lightBg: 'rgba(234, 179, 8, 0.15)' },
  blue: { bg: '#2563EB', text: '#DBEAFE', border: '#1E40AF', lightBg: 'rgba(37, 99, 235, 0.15)' }
};

export const COLOR_ORDER: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

/**
 * Expression emojis and text descriptions
 */
export const EXPRESSION_DATA: Record<PieceExpression, { emoji: string; label: string; positive: boolean }> = {
  confident:   { emoji: '😎', label: 'Confiante', positive: true },
  laughing:    { emoji: '😂', label: 'A rir', positive: true },
  rich:        { emoji: '🤑', label: 'Com moedas', positive: true },
  celebrating: { emoji: '🏆', label: 'A comemorar', positive: true },
  smiling:     { emoji: '😁', label: 'Sorridente', positive: true },
  crying:      { emoji: '😭', label: 'A chorar', positive: false },
  angry:       { emoji: '😡', label: 'Zangada', positive: false },
  scared:      { emoji: '😱', label: 'Assustada', positive: false },
  irritated:   { emoji: '🤬', label: 'Irritada', positive: false },
  defeated:    { emoji: '💀', label: 'Derrotada', positive: false }
};

/**
 * Calculate how many steps a piece has travelled from its color's starting cell.
 */
export function getStepsTravelled(color: PlayerColor, position: number): number {
  if (position === -1) return -1;
  if (position >= 100 && position <= 104) {
    return 51 + (position - 100);
  }
  if (position === 200) return 57; // finished

  const start = COLOR_START_CELL[color];
  if (position >= start) {
    return position - start;
  }
  return 52 - start + position;
}

/**
 * Check if a piece can move with the rolled dice value.
 */
export function canPieceMove(piece: Piece, diceValue: number): boolean {
  if (piece.position === 200) {
    return false; // already at the goal
  }

  // At home yard: can only move out with a 6
  if (piece.position === -1) {
    return diceValue === 6;
  }

  // In home lane:
  if (piece.position >= 100 && piece.position <= 104) {
    const laneIndex = piece.position - 100; // 0..4
    const targetLane = laneIndex + diceValue;
    return targetLane <= 5; // 5 means exactly reaching goal (200)
  }

  // On main board:
  const currentSteps = getStepsTravelled(piece.color, piece.position);
  const nextSteps = currentSteps + diceValue;
  return nextSteps <= 56; // 56 is the max reachable before overshoot
}

/**
 * Calculate the new position of a piece when moved by diceValue.
 */
export function getNextPosition(piece: Piece, diceValue: number): number {
  // If moving out of yard with a 6:
  if (piece.position === -1) {
    if (diceValue === 6) {
      return COLOR_START_CELL[piece.color];
    }
    return -1;
  }

  // If already in home lane:
  if (piece.position >= 100 && piece.position <= 104) {
    const laneIdx = piece.position - 100;
    const target = laneIdx + diceValue;
    if (target === 5) return 200; // GOAL!
    if (target < 5) return 100 + target;
    return piece.position; // cannot overshoot
  }

  // On main loop:
  const steps = getStepsTravelled(piece.color, piece.position);
  const nextSteps = steps + diceValue;

  // Reached or entering home straight
  if (nextSteps > 50) {
    const straightStep = nextSteps - 51; // 0..5
    if (straightStep === 5) return 200; // reached center goal
    if (straightStep < 5) return 100 + straightStep;
    return piece.position; // overshoot not allowed
  }

  // Normal movement on 52-cell loop
  return (piece.position + diceValue) % 52;
}

/**
 * Select a random expression based on performance or event.
 */
export function getRandomPositiveExpression(): PieceExpression {
  const list: PieceExpression[] = ['confident', 'laughing', 'rich', 'celebrating', 'smiling'];
  return list[Math.floor(Math.random() * list.length)];
}

export function getRandomNegativeExpression(): PieceExpression {
  const list: PieceExpression[] = ['crying', 'angry', 'scared', 'irritated', 'defeated'];
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Check win condition:
 * Match ends only when 3 pieces reach the goal (200).
 */
export function hasPlayerWon(pieces: Piece[], piecesToWin: number = 3): boolean {
  const finishedCount = pieces.filter(p => p.position === 200).length;
  return finishedCount >= piecesToWin;
}

/**
 * 15x15 Coordinate mapping for standard Ludo board
 * Generates the SVG/grid coordinate for each of the 52 circuit cells,
 * home lanes, yards, and goal.
 */
export interface CellCoord {
  x: number; // 0..14
  y: number; // 0..14
}

// 52 cells clockwise track starting from Red's entry (bottom left branch: x=6, y=13)
export const CIRCUIT_COORDS: CellCoord[] = [
  // 0..4: Red ascending
  { x: 6, y: 13 }, { x: 6, y: 12 }, { x: 6, y: 11 }, { x: 6, y: 10 }, { x: 6, y: 9 },
  // 5..10: Turn left into Green territory
  { x: 5, y: 8 }, { x: 4, y: 8 }, { x: 3, y: 8 }, { x: 2, y: 8 }, { x: 1, y: 8 }, { x: 0, y: 8 },
  // 11..12: Up
  { x: 0, y: 7 }, { x: 0, y: 6 },
  // 13..17: Green entry moving right
  { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 },
  // 18..23: Turn up into top column
  { x: 6, y: 5 }, { x: 6, y: 4 }, { x: 6, y: 3 }, { x: 6, y: 2 }, { x: 6, y: 1 }, { x: 6, y: 0 },
  // 24..25: Across top
  { x: 7, y: 0 }, { x: 8, y: 0 },
  // 26..30: Yellow entry moving down
  { x: 8, y: 1 }, { x: 8, y: 2 }, { x: 8, y: 3 }, { x: 8, y: 4 }, { x: 8, y: 5 },
  // 31..36: Turn right into Yellow/Blue arm
  { x: 9, y: 6 }, { x: 10, y: 6 }, { x: 11, y: 6 }, { x: 12, y: 6 }, { x: 13, y: 6 }, { x: 14, y: 6 },
  // 37..38: Down right edge
  { x: 14, y: 7 }, { x: 14, y: 8 },
  // 39..43: Blue entry moving left
  { x: 13, y: 8 }, { x: 12, y: 8 }, { x: 11, y: 8 }, { x: 10, y: 8 }, { x: 9, y: 8 },
  // 44..49: Turn down into bottom column
  { x: 8, y: 9 }, { x: 8, y: 10 }, { x: 8, y: 11 }, { x: 8, y: 12 }, { x: 8, y: 13 }, { x: 8, y: 14 },
  // 50..51: Across bottom to Red entry
  { x: 7, y: 14 }, { x: 6, y: 14 }
];

// Home stretch private lanes (5 tiles each leading to goal at 7,7)
export const HOME_LANES: Record<PlayerColor, CellCoord[]> = {
  red: [
    { x: 7, y: 13 }, { x: 7, y: 12 }, { x: 7, y: 11 }, { x: 7, y: 10 }, { x: 7, y: 9 }
  ],
  green: [
    { x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 7 }
  ],
  yellow: [
    { x: 7, y: 1 }, { x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }
  ],
  blue: [
    { x: 13, y: 7 }, { x: 12, y: 7 }, { x: 11, y: 7 }, { x: 10, y: 7 }, { x: 9, y: 7 }
  ]
};

// Yard positions for the 4 pieces inside each color's corner base
export const YARD_COORDS: Record<PlayerColor, CellCoord[]> = {
  red: [
    { x: 2, y: 11 }, { x: 3.5, y: 11 }, { x: 2, y: 12.5 }, { x: 3.5, y: 12.5 }
  ],
  green: [
    { x: 2, y: 2 }, { x: 3.5, y: 2 }, { x: 2, y: 3.5 }, { x: 3.5, y: 3.5 }
  ],
  yellow: [
    { x: 11, y: 2 }, { x: 12.5, y: 2 }, { x: 11, y: 3.5 }, { x: 12.5, y: 3.5 }
  ],
  blue: [
    { x: 11, y: 11 }, { x: 12.5, y: 11 }, { x: 11, y: 12.5 }, { x: 12.5, y: 12.5 }
  ]
};

// Goal center coordinates
export const GOAL_COORD: CellCoord = { x: 7, y: 7 };
