import type { PalancaJetConfig } from '../types/index.ts';

export const JET_GROWTH_RATE = 0.068;

export const DEFAULT_JET_CONFIG: PalancaJetConfig = {
  enabled: true,
  realMoneyEnabled: true,
  houseEdgePercent: 5,
  minBetKz: 100,
  maxBetKz: 50000,
  maxWinKz: 500000,
  bettingDurationSec: 8
};

export function sanitizeJetConfig(raw: Partial<PalancaJetConfig> | null | undefined): PalancaJetConfig {
  const minBetKz = Math.min(100_000, Math.max(50, Math.round(Number(raw?.minBetKz ?? DEFAULT_JET_CONFIG.minBetKz))));
  const maxBetKz = Math.min(
    5_000_000,
    Math.max(minBetKz, Math.round(Number(raw?.maxBetKz ?? DEFAULT_JET_CONFIG.maxBetKz)))
  );
  const maxWinKz = Math.min(
    50_000_000,
    Math.max(maxBetKz, Math.round(Number(raw?.maxWinKz ?? DEFAULT_JET_CONFIG.maxWinKz)))
  );
  const rawEdge = Number(raw?.houseEdgePercent ?? DEFAULT_JET_CONFIG.houseEdgePercent);
  const houseEdgePercent = Number.isFinite(rawEdge)
    ? Math.min(12, Math.max(4, Math.round(rawEdge * 10) / 10))
    : DEFAULT_JET_CONFIG.houseEdgePercent;
  const rawSec = Number(raw?.bettingDurationSec ?? DEFAULT_JET_CONFIG.bettingDurationSec);
  const bettingDurationSec = Number.isFinite(rawSec)
    ? Math.min(30, Math.max(4, Math.round(rawSec)))
    : DEFAULT_JET_CONFIG.bettingDurationSec;

  return {
    enabled: raw?.enabled !== false,
    realMoneyEnabled: raw?.realMoneyEnabled !== false,
    houseEdgePercent,
    minBetKz,
    maxBetKz,
    maxWinKz,
    bettingDurationSec
  };
}

export function computeMultiplierAtElapsedMs(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 1.0;
  const raw = Math.exp(JET_GROWTH_RATE * (elapsedMs / 1000));
  return Math.min(1000, Math.max(1.0, Math.floor(raw * 100) / 100));
}

export function computeElapsedMsForMultiplier(multiplier: number): number {
  if (!Number.isFinite(multiplier) || multiplier <= 1.0) return 0;
  const capped = Math.min(1000, multiplier);
  return Math.max(0, Math.ceil((Math.log(capped) / JET_GROWTH_RATE) * 1000));
}

/**
 * Deterministic provably-fair crash calculation using the first 52 bits of SHA-256(seed:roundId:houseEdgePercent).
 * Achieves exact theoretical RTP = (100 - houseEdgePercent)% at every multiplier target.
 */
export function computeCrashPointFromGameHashHex(gameHashHex: string, houseEdgePercent: number): number {
  const cleanHex = String(gameHashHex || '').replace(/[^0-9a-fA-F]/g, '');
  if (cleanHex.length < 13) return 1.0;
  const slice = cleanHex.slice(0, 13);
  const intVal = parseInt(slice, 16);
  const u = intVal / 0x10000000000000; // [0, 1)
  const edge = Math.min(0.25, Math.max(0.01, (Number(houseEdgePercent) || 5) / 100));

  if (u < edge) {
    return 1.0;
  }

  const v = (u - edge) / (1 - edge);
  const raw = 1 / Math.max(1e-9, 1 - v);
  const floored = Math.floor(raw * 100) / 100;
  return Math.min(1000, Math.max(1.01, floored));
}

export function maskPlayerName(name: string): string {
  const trimmed = String(name || 'Jogador').trim();
  if (!trimmed) return 'Jo***';
  const parts = trimmed.split(/\s+/);
  const first = parts[0];
  const prefix = first.slice(0, Math.min(2, first.length));
  const lastInitial = parts.length > 1 && parts[parts.length - 1] ? ` ${parts[parts.length - 1][0].toUpperCase()}.` : '';
  return `${prefix}***${lastInitial}`;
}
