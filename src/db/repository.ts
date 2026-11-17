import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Pool, PoolClient } from 'pg';
import type {
  AdminOverview,
  AdminPlayerSummary,
  AppNotification,
  BoardThemeId,
  Currency,
  MatchHistoryEntry,
  MatchHistoryPlayer,
  NotificationType,
  PalancaJetAdminStats,
  PalancaJetBet,
  PalancaJetBetStatus,
  PalancaJetBiggestWin,
  PalancaJetHistoryRound,
  PalancaJetPhase,
  PaymentMethod,
  PaymentSettings,
  PlatformConfig,
  PlayerCategory,
  PlayerColor,
  PushSubscriptionKeys,
  PushSubscriptionRecord,
  RankingPlayer,
  Room,
  SupportMessage,
  SupportTicket,
  Transaction,
  User
} from '../types/index.ts';
import {
  DEFAULT_JET_CONFIG,
  maskPlayerName,
  sanitizeJetConfig
} from '../utils/palancaJetEngine.ts';

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  mcxEntity: '99412',
  mcxReference: '926020283',
  mcxPhone: '926020283',
  bankName: 'BFA',
  accountHolder: 'NEIDILSON FILIPE CHIHAMA DAS NEVES',
  iban: '0006.0000.8582.5409.3015.5',
  usdtAddress: 'TX9qK8x3k8wP29MNa9817ZbvxT69921b',
  usdtNetwork: 'TRC20',
  binancePayId: '849201948',
  bybitUid: '6291048'
};

export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  winnerPercent: 75,
  commissionPercent: 25,
  themePrices: {
    classic: { priceKz: 0, priceUsdt: 0 },
    kingdoms: { priceKz: 15000, priceUsdt: 16 },
    football: { priceKz: 25000, priceUsdt: 27 },
    future: { priceKz: 20000, priceUsdt: 22 },
    gang: { priceKz: 18000, priceUsdt: 20 },
    egyptian: { priceKz: 22000, priceUsdt: 24 }
  },
  minWithdrawKz: 500,
  jetConfig: DEFAULT_JET_CONFIG
};

const DEFAULT_AVATAR =
  'https://api.dicebear.com/7.x/bottts/svg?seed=KingLudo&backgroundColor=ffc300,ff595e';
const PLATFORM_CONFIG_FALLBACK_FILE =
  process.env.PLATFORM_CONFIG_PATH?.trim() || path.join(os.tmpdir(), 'nti_platform_config.json');

const ADMIN_PIN = (process.env.ADMIN_PIN || '123456').trim();
const SESSION_SECRET =
  process.env.SESSION_SECRET?.trim() ||
  crypto.createHash('sha256').update(`nti-session-${ADMIN_PIN}-ao`).digest('hex');

export function sanitizePlatformConfig(
  raw: Partial<PlatformConfig> | null | undefined
): PlatformConfig {
  const base = DEFAULT_PLATFORM_CONFIG;
  let winnerPercent = Number(raw?.winnerPercent);
  let commissionPercent = Number(raw?.commissionPercent);

  if (Number.isFinite(winnerPercent) && !Number.isFinite(commissionPercent)) {
    winnerPercent = Math.min(99, Math.max(1, Math.round(winnerPercent)));
    commissionPercent = 100 - winnerPercent;
  } else if (Number.isFinite(commissionPercent) && !Number.isFinite(winnerPercent)) {
    commissionPercent = Math.min(99, Math.max(1, Math.round(commissionPercent)));
    winnerPercent = 100 - commissionPercent;
  } else if (Number.isFinite(winnerPercent) && Number.isFinite(commissionPercent)) {
    winnerPercent = Math.min(99, Math.max(1, Math.round(winnerPercent)));
    commissionPercent = 100 - winnerPercent;
  } else {
    winnerPercent = base.winnerPercent;
    commissionPercent = base.commissionPercent;
  }

  const themeIds: BoardThemeId[] = [
    'classic',
    'kingdoms',
    'football',
    'future',
    'gang',
    'egyptian'
  ];
  const themePrices = { ...base.themePrices };
  for (const id of themeIds) {
    const incoming = raw?.themePrices?.[id];
    if (incoming) {
      themePrices[id] = {
        priceKz: Math.max(0, Math.round(Number(incoming.priceKz) || 0)),
        priceUsdt: Math.max(0, Number((Number(incoming.priceUsdt) || 0).toFixed(2)))
      };
    }
  }

  const legacyPuzzleMin = (raw as { puzzleConfig?: { minWithdrawKz?: number } } | null | undefined)
    ?.puzzleConfig?.minWithdrawKz;
  const rawMinWithdraw = Number(raw?.minWithdrawKz ?? legacyPuzzleMin ?? base.minWithdrawKz);
  const minWithdrawKz = Number.isFinite(rawMinWithdraw)
    ? Math.min(100_000, Math.max(100, Math.round(rawMinWithdraw)))
    : base.minWithdrawKz;

  const jetConfig = sanitizeJetConfig(raw?.jetConfig);

  return { winnerPercent, commissionPercent, themePrices, minWithdrawKz, jetConfig };
}

export function normalizePhone(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('244')) return `+${digits}`;
  return `+244${digits}`;
}

export function formatPhoneDisplay(rawPhone: string): string {
  const norm = normalizePhone(rawPhone);
  if (!norm) return rawPhone.trim();
  const local = norm.slice(4);
  if (local.length === 9) {
    return `+244 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }
  return `+244 ${local}`;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, expectedHex] = storedHash.split(':');
  if (!salt || !expectedHex) return false;
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  if (derivedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(derivedBuf, expectedBuf);
}

export interface SessionClaims {
  userId: string;
  isAdmin: boolean;
  exp: number;
}

export function createSessionToken(userId: string, isAdmin = false): string {
  const claims: SessionClaims = {
    userId,
    isAdmin,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30 // 30 days
  };
  const payload = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null): SessionClaims | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionClaims;
    if (!parsed.userId || !parsed.exp || Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function verifyAdminPin(pin: string): boolean {
  if (!pin) return false;
  const a = Buffer.from(pin.trim());
  const b = Buffer.from(ADMIN_PIN);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function computeCategory(wins: number): PlayerCategory {
  if (wins >= 150) return 'Lenda N';
  if (wins >= 80) return 'Diamante';
  if (wins >= 40) return 'Platina';
  if (wins >= 15) return 'Ouro';
  if (wins >= 5) return 'Prata';
  return 'Bronze';
}

function shouldUseSsl(connectionString: string): boolean {
  const lower = connectionString.toLowerCase();
  if (lower.includes('sslmode=disable')) return false;
  if (lower.includes('localhost') || lower.includes('127.0.0.1')) return false;
  return true;
}

function formatDatePtAo(d: Date | string): string {
  try {
    const dt = typeof d === 'string' ? new Date(d) : d;
    return dt.toLocaleString('pt-AO');
  } catch {
    return String(d);
  }
}

interface StoredUser extends User {
  passwordHash: string;
}

interface StoredJetRound {
  id: string;
  roundNumber: number;
  status: PalancaJetPhase | 'REFUNDED';
  seedHash: string;
  serverSeed: string;
  crashPoint: number;
  houseEdgePercent: number;
  bettingEndsAtMs: number;
  flightStartedAtMs: number;
  createdAtIso: string;
  crashedAtIso?: string;
}

interface StoredJetBet {
  id: string;
  roundId: string;
  roundNumber: number;
  userId: string;
  userName: string;
  maskedName: string;
  slot: 0 | 1;
  isDemo: boolean;
  amount: number;
  autoCashoutMultiplier: number | null;
  cashoutMultiplier: number | null;
  payout: number;
  status: PalancaJetBetStatus;
  createdAtIso: string;
  createdAtDisplay: string;
}

// =========================================================
// Repository Implementation (PostgreSQL via DATABASE_URL + Memory Dev Fallback)
// =========================================================

class DatabaseRepository {
  private pool: Pool | null = null;
  public storageMode: 'postgres' | 'memory' = 'memory';

  // In-memory store (used ONLY when DATABASE_URL is not configured in local dev)
  private memUsers = new Map<string, StoredUser>();
  private memPhoneIndex = new Map<string, string>();
  private memTransactions: Transaction[] = [];
  private memMatches: MatchHistoryEntry[] = [];
  private memJetRounds: StoredJetRound[] = [];
  private memJetBets = new Map<string, StoredJetBet>();
  private memTickets: SupportTicket[] = [];
  private memNotifications: AppNotification[] = [];
  private memPushSubscriptions: PushSubscriptionRecord[] = [];
  private memPlatformConfig: PlatformConfig = DEFAULT_PLATFORM_CONFIG;
  private memPaymentSettings: PaymentSettings = DEFAULT_PAYMENT_SETTINGS;
  private settledMatchKeys = new Set<string>();

  async init(): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    if (!databaseUrl) {
      console.warn(
        '[N – DB] DATABASE_URL não definida. A operar em modo memória local no servidor (dados serão persistidos em PostgreSQL assim que DATABASE_URL for configurada).'
      );
      this.storageMode = 'memory';
      this.loadFallbackConfigFile();
      this.seedMemoryDefaults();
      return;
    }

    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: shouldUseSsl(databaseUrl) ? { rejectUnauthorized: false } : false,
      max: 15,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000
    });

    this.pool.on('error', (err) => {
      console.error('[N – DB] Erro inesperado na pool PostgreSQL:', err);
    });

    await this.createSchema();
    await this.seedPostgresDefaults();
    this.storageMode = 'postgres';
    console.log('[N – DB] PostgreSQL ligado e esquema verificado com sucesso.');
  }

  private loadFallbackConfigFile() {
    try {
      if (fs.existsSync(PLATFORM_CONFIG_FALLBACK_FILE)) {
        const text = fs.readFileSync(PLATFORM_CONFIG_FALLBACK_FILE, 'utf8');
        this.memPlatformConfig = sanitizePlatformConfig(JSON.parse(text));
      }
    } catch {
      this.memPlatformConfig = sanitizePlatformConfig(DEFAULT_PLATFORM_CONFIG);
    }
  }

  private seedMemoryDefaults() {
    if (this.memUsers.size === 0) {
      const demoUser: StoredUser = {
        id: 'usr_ao_kassoma',
        name: 'Kassoma Manuel',
        phone: '+244 923 884 102',
        email: 'kassoma.manuel@ao.net',
        passwordHash: hashPassword('senhasegura2026'),
        avatar: DEFAULT_AVATAR,
        role: 'player',
        category: 'Bronze',
        kzBalance: 0,
        usdtBalance: 0,
        demoKzBalance: 50000,
        demoUsdtBalance: 50,
        kzReserved: 0,
        usdtReserved: 0,
        dailyEntryLimitKz: null,
        dailyLossLimitKz: null,
        selfExcludedUntil: null,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        totalEarnedKz: 0,
        totalEarnedUsdt: 0,
        totalLostKz: 0,
        totalLostUsdt: 0,
        unlockedThemes: ['classic'],
        selectedTheme: 'classic',
        isIdentityVerified: true,
        isAgeVerified: true,
        isSuspended: false,
        createdAt: new Date().toISOString()
      };
      this.memUsers.set(demoUser.id, demoUser);
      this.memPhoneIndex.set(normalizePhone(demoUser.phone), demoUser.id);
    }
  }

  private async createSchema(): Promise<void> {
    if (!this.pool) return;
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        phone_normalized TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL DEFAULT '',
        password_hash TEXT NOT NULL DEFAULT '',
        avatar TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'player',
        category TEXT NOT NULL DEFAULT 'Bronze',
        kz_balance NUMERIC(18, 2) NOT NULL DEFAULT 0,
        usdt_balance NUMERIC(18, 4) NOT NULL DEFAULT 0,
        demo_kz_balance NUMERIC(18, 2) NOT NULL DEFAULT 50000,
        demo_usdt_balance NUMERIC(18, 4) NOT NULL DEFAULT 50,
        kz_reserved NUMERIC(18, 2) NOT NULL DEFAULT 0,
        usdt_reserved NUMERIC(18, 4) NOT NULL DEFAULT 0,
        matches_played INTEGER NOT NULL DEFAULT 0,
        wins INTEGER NOT NULL DEFAULT 0,
        losses INTEGER NOT NULL DEFAULT 0,
        total_earned_kz NUMERIC(18, 2) NOT NULL DEFAULT 0,
        total_earned_usdt NUMERIC(18, 4) NOT NULL DEFAULT 0,
        total_lost_kz NUMERIC(18, 2) NOT NULL DEFAULT 0,
        total_lost_usdt NUMERIC(18, 4) NOT NULL DEFAULT 0,
        unlocked_themes JSONB NOT NULL DEFAULT '["classic"]'::jsonb,
        selected_theme TEXT NOT NULL DEFAULT 'classic',
        is_identity_verified BOOLEAN NOT NULL DEFAULT true,
        is_age_verified BOOLEAN NOT NULL DEFAULT true,
        is_suspended BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_name TEXT NOT NULL,
        type TEXT NOT NULL,
        currency TEXT NOT NULL,
        amount NUMERIC(18, 4) NOT NULL,
        fee NUMERIC(18, 4) NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        method TEXT NOT NULL,
        network TEXT,
        reference TEXT NOT NULL,
        proof_url TEXT,
        notes TEXT,
        theme_id TEXT,
        theme_name TEXT,
        room_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

      CREATE TABLE IF NOT EXISTS match_history (
        id TEXT PRIMARY KEY,
        match_key TEXT UNIQUE NOT NULL,
        room_id TEXT NOT NULL,
        room_code TEXT NOT NULL,
        room_name TEXT NOT NULL,
        winner_user_id TEXT,
        winner_name TEXT,
        winner_color TEXT,
        currency TEXT NOT NULL,
        bet_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
        total_pot NUMERIC(18, 4) NOT NULL DEFAULT 0,
        prize_pool NUMERIC(18, 4) NOT NULL DEFAULT 0,
        platform_commission NUMERIC(18, 4) NOT NULL DEFAULT 0,
        is_demo BOOLEAN NOT NULL DEFAULT false,
        board_theme TEXT NOT NULL DEFAULT 'classic',
        players JSONB NOT NULL,
        finished_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_match_history_finished ON match_history(finished_at DESC);

      CREATE TABLE IF NOT EXISTS support_tickets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        user_phone TEXT NOT NULL,
        subject TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'OPEN',
        messages JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS platform_settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reason TEXT;
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS granted_by TEXT;

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'system',
        is_read BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT UNIQUE NOT NULL,
        keys JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);

      ALTER TABLE users ADD COLUMN IF NOT EXISTS bonus_kz_balance NUMERIC(18, 2) NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_entry_limit_kz NUMERIC(18, 2);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_loss_limit_kz NUMERIC(18, 2);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS self_excluded_until TIMESTAMPTZ;
      ALTER TABLE match_history ADD COLUMN IF NOT EXISTS game_type TEXT NOT NULL DEFAULT 'ludo';
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS used_bonus_kz NUMERIC(18, 2) NOT NULL DEFAULT 0;

      CREATE TABLE IF NOT EXISTS palanca_jet_rounds (
        id TEXT PRIMARY KEY,
        round_number INTEGER NOT NULL,
        status TEXT NOT NULL,
        seed_hash TEXT NOT NULL,
        server_seed TEXT NOT NULL,
        crash_point NUMERIC(10, 2) NOT NULL,
        house_edge_percent NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
        betting_ends_at_ms BIGINT NOT NULL DEFAULT 0,
        flight_started_at_ms BIGINT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        crashed_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_jet_rounds_num ON palanca_jet_rounds(round_number DESC);
      CREATE INDEX IF NOT EXISTS idx_jet_rounds_status ON palanca_jet_rounds(status);

      CREATE TABLE IF NOT EXISTS palanca_jet_bets (
        id TEXT PRIMARY KEY,
        round_id TEXT NOT NULL REFERENCES palanca_jet_rounds(id) ON DELETE CASCADE,
        round_number INTEGER NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_name TEXT NOT NULL,
        masked_name TEXT NOT NULL,
        slot SMALLINT NOT NULL DEFAULT 0,
        is_demo BOOLEAN NOT NULL DEFAULT false,
        amount NUMERIC(18, 2) NOT NULL,
        auto_cashout_multiplier NUMERIC(10, 2),
        cashout_multiplier NUMERIC(10, 2),
        payout NUMERIC(18, 2) NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_jet_bets_round ON palanca_jet_bets(round_id, created_at ASC);
      CREATE INDEX IF NOT EXISTS idx_jet_bets_user_created ON palanca_jet_bets(user_id, created_at DESC);
    `);
  }

  private async seedPostgresDefaults(): Promise<void> {
    if (!this.pool) return;
    await this.pool.query(
      `INSERT INTO platform_settings (key, value) VALUES ('platform_config', $1::jsonb) ON CONFLICT (key) DO NOTHING`,
      [JSON.stringify(DEFAULT_PLATFORM_CONFIG)]
    );
    await this.pool.query(
      `INSERT INTO platform_settings (key, value) VALUES ('payment_settings', $1::jsonb) ON CONFLICT (key) DO NOTHING`,
      [JSON.stringify(DEFAULT_PAYMENT_SETTINGS)]
    );

    // Seed demo example player (real balance strictly 0, demo balance 50.000 Kz)
    const demoPass = hashPassword('senhasegura2026');
    await this.pool.query(
      `INSERT INTO users (
        id, name, phone, phone_normalized, email, password_hash, avatar, role, category,
        kz_balance, usdt_balance, demo_kz_balance, demo_usdt_balance
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'player', 'Bronze', 0, 0, 50000, 50)
      ON CONFLICT (phone_normalized) DO NOTHING`,
      [
        'usr_ao_kassoma',
        'Kassoma Manuel',
        '+244 923 884 102',
        '+244923884102',
        'kassoma.manuel@ao.net',
        demoPass,
        DEFAULT_AVATAR
      ]
    );
  }

  private mapUserRow(row: Record<string, unknown>): User {
    const unlockedRaw = row.unlocked_themes;
    const unlockedThemes: BoardThemeId[] = Array.isArray(unlockedRaw)
      ? (unlockedRaw as BoardThemeId[])
      : ['classic'];
    if (!unlockedThemes.includes('classic')) unlockedThemes.unshift('classic');

    return {
      id: String(row.id),
      name: String(row.name),
      phone: String(row.phone),
      email: String(row.email || ''),
      avatar: String(row.avatar || DEFAULT_AVATAR),
      role: (row.role === 'admin' ? 'admin' : 'player') as 'player' | 'admin',
      category: (row.category as PlayerCategory) || 'Bronze',
      kzBalance: Number(row.kz_balance ?? 0),
      usdtBalance: Number(row.usdt_balance ?? 0),
      demoKzBalance: Number(row.demo_kz_balance ?? 50000),
      demoUsdtBalance: Number(row.demo_usdt_balance ?? 50),
      kzReserved: Number(row.kz_reserved ?? 0),
      usdtReserved: Number(row.usdt_reserved ?? 0),
      dailyEntryLimitKz:
        row.daily_entry_limit_kz !== null && row.daily_entry_limit_kz !== undefined
          ? Number(row.daily_entry_limit_kz)
          : null,
      dailyLossLimitKz:
        row.daily_loss_limit_kz !== null && row.daily_loss_limit_kz !== undefined
          ? Number(row.daily_loss_limit_kz)
          : null,
      selfExcludedUntil: row.self_excluded_until
        ? new Date(row.self_excluded_until as string | Date).toISOString()
        : null,
      matchesPlayed: Number(row.matches_played ?? 0),
      wins: Number(row.wins ?? 0),
      losses: Number(row.losses ?? 0),
      totalEarnedKz: Number(row.total_earned_kz ?? 0),
      totalEarnedUsdt: Number(row.total_earned_usdt ?? 0),
      totalLostKz: Number(row.total_lost_kz ?? 0),
      totalLostUsdt: Number(row.total_lost_usdt ?? 0),
      unlockedThemes,
      selectedTheme: (row.selected_theme as BoardThemeId) || 'classic',
      isIdentityVerified: Boolean(row.is_identity_verified ?? true),
      isAgeVerified: Boolean(row.is_age_verified ?? true),
      isSuspended: Boolean(row.is_suspended ?? false),
      createdAt: formatDatePtAo(row.created_at as string | Date)
    };
  }

  private mapTransactionRow(row: Record<string, unknown>): Transaction {
    return {
      id: String(row.id),
      userId: String(row.user_id),
      userName: String(row.user_name),
      type: row.type as Transaction['type'],
      currency: row.currency as Currency,
      amount: Number(row.amount ?? 0),
      fee: Number(row.fee ?? 0),
      status: row.status as Transaction['status'],
      method: row.method as PaymentMethod,
      network: row.network ? String(row.network) : undefined,
      reference: String(row.reference),
      proofUrl: row.proof_url ? String(row.proof_url) : undefined,
      notes: row.notes ? String(row.notes) : undefined,
      themeId: row.theme_id ? (String(row.theme_id) as BoardThemeId) : undefined,
      themeName: row.theme_name ? String(row.theme_name) : undefined,
      reason: row.reason ? String(row.reason) : undefined,
      grantedBy: row.granted_by ? String(row.granted_by) : undefined,
      createdAt: formatDatePtAo(row.created_at as string | Date),
      updatedAt: row.updated_at ? formatDatePtAo(row.updated_at as string | Date) : undefined
    };
  }

  private mapNotificationRow(row: Record<string, unknown>): AppNotification {
    return {
      id: String(row.id),
      userId: String(row.user_id),
      title: String(row.title),
      body: String(row.body),
      type: (row.type as NotificationType) || 'system',
      read: Boolean(row.is_read),
      createdAt: formatDatePtAo(row.created_at as string | Date)
    };
  }

  private mapMatchRow(row: Record<string, unknown>): MatchHistoryEntry {
    return {
      id: String(row.id),
      gameType:
        row.game_type === 'palanca_jet'
          ? 'palanca_jet'
          : row.game_type === 'puzzle_angola'
          ? 'puzzle_angola'
          : 'ludo',
      roomId: String(row.room_id),
      roomCode: String(row.room_code),
      roomName: String(row.room_name),
      winnerUserId: row.winner_user_id ? String(row.winner_user_id) : null,
      winnerName: row.winner_name ? String(row.winner_name) : null,
      winnerColor: row.winner_color ? (String(row.winner_color) as PlayerColor) : null,
      currency: (row.currency === 'USDT' ? 'USDT' : 'KZ') as Currency,
      betAmount: Number(row.bet_amount ?? 0),
      totalPot: Number(row.total_pot ?? 0),
      prizePool: Number(row.prize_pool ?? 0),
      platformCommission: Number(row.platform_commission ?? 0),
      isDemo: Boolean(row.is_demo),
      boardTheme: (row.board_theme as BoardThemeId) || 'classic',
      players: Array.isArray(row.players) ? (row.players as MatchHistoryPlayer[]) : [],
      finishedAt: formatDatePtAo(row.finished_at as string | Date)
    };
  }

  private mapTicketRow(row: Record<string, unknown>): SupportTicket {
    return {
      id: String(row.id),
      userId: String(row.user_id),
      userName: String(row.user_name),
      userPhone: String(row.user_phone),
      subject: String(row.subject),
      status: row.status === 'RESOLVED' ? 'RESOLVED' : 'OPEN',
      messages: Array.isArray(row.messages) ? (row.messages as SupportMessage[]) : [],
      createdAt: formatDatePtAo(row.created_at as string | Date),
      updatedAt: formatDatePtAo(row.updated_at as string | Date)
    };
  }

  private sanitizeUser(u: StoredUser): User {
    const { passwordHash: _omit, password: _omit2, ...clean } = u;
    return clean;
  }

  // ---------- Platform Config & Payment Settings ----------

  async getPlatformConfig(): Promise<PlatformConfig> {
    if (!this.pool) return this.memPlatformConfig;
    const res = await this.pool.query(
      `SELECT value FROM platform_settings WHERE key = 'platform_config' LIMIT 1`
    );
    if (res.rows[0]?.value) {
      return sanitizePlatformConfig(res.rows[0].value as Partial<PlatformConfig>);
    }
    return DEFAULT_PLATFORM_CONFIG;
  }

  async savePlatformConfig(incoming: Partial<PlatformConfig>): Promise<PlatformConfig> {
    const current = await this.getPlatformConfig();
    const merged = sanitizePlatformConfig({
      winnerPercent: incoming.winnerPercent ?? current.winnerPercent,
      commissionPercent: incoming.commissionPercent ?? current.commissionPercent,
      themePrices: {
        ...current.themePrices,
        ...(incoming.themePrices || {})
      },
      minWithdrawKz: incoming.minWithdrawKz ?? current.minWithdrawKz,
      jetConfig: {
        ...current.jetConfig,
        ...(incoming.jetConfig || {})
      }
    });

    if (!this.pool) {
      this.memPlatformConfig = merged;
      try {
        fs.mkdirSync(path.dirname(PLATFORM_CONFIG_FALLBACK_FILE), { recursive: true });
        fs.writeFileSync(PLATFORM_CONFIG_FALLBACK_FILE, JSON.stringify(merged, null, 2), 'utf8');
      } catch {
        // ignore
      }
      return merged;
    }

    await this.pool.query(
      `INSERT INTO platform_settings (key, value, updated_at)
       VALUES ('platform_config', $1::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1::jsonb, updated_at = NOW()`,
      [JSON.stringify(merged)]
    );
    return merged;
  }

  async getPaymentSettings(): Promise<PaymentSettings> {
    if (!this.pool) return this.memPaymentSettings;
    const res = await this.pool.query(
      `SELECT value FROM platform_settings WHERE key = 'payment_settings' LIMIT 1`
    );
    if (res.rows[0]?.value) {
      return { ...DEFAULT_PAYMENT_SETTINGS, ...(res.rows[0].value as Partial<PaymentSettings>) };
    }
    return DEFAULT_PAYMENT_SETTINGS;
  }

  async savePaymentSettings(incoming: Partial<PaymentSettings>): Promise<PaymentSettings> {
    const current = await this.getPaymentSettings();
    const merged: PaymentSettings = { ...current, ...incoming };
    if (!this.pool) {
      this.memPaymentSettings = merged;
      return merged;
    }
    await this.pool.query(
      `INSERT INTO platform_settings (key, value, updated_at)
       VALUES ('payment_settings', $1::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1::jsonb, updated_at = NOW()`,
      [JSON.stringify(merged)]
    );
    return merged;
  }

  // ---------- Auth & Users ----------

  async registerUser(params: {
    name: string;
    phone: string;
    email?: string;
    password: string;
  }): Promise<{ ok: true; user: User; token: string } | { ok: false; error: string }> {
    const cleanName = params.name.trim();
    const normPhone = normalizePhone(params.phone);
    const displayPhone = formatPhoneDisplay(params.phone);
    const cleanPassword = params.password.trim();
    const cleanEmail = (params.email || '').trim();

    if (!cleanName || !normPhone || cleanPhoneDigits(normPhone) < 9 || !cleanPassword) {
      return { ok: false, error: 'Preencha nome, telemóvel válido e palavra-passe.' };
    }

    const userId = `usr_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
    const passHash = hashPassword(cleanPassword);
    const nowStr = formatDatePtAo(new Date());

    if (!this.pool) {
      if (this.memPhoneIndex.has(normPhone)) {
        return { ok: false, error: 'Este número de telemóvel já está cadastrado. Faça login.' };
      }

      const user: StoredUser = {
        id: userId,
        name: cleanName,
        phone: displayPhone,
        email: cleanEmail || `${cleanName.toLowerCase().replace(/\s+/g, '')}@jogador.ao`,
        passwordHash: passHash,
        avatar: DEFAULT_AVATAR,
        role: 'player',
        category: 'Bronze',
        kzBalance: 0,
        usdtBalance: 0,
        demoKzBalance: 50000,
        demoUsdtBalance: 50,
        kzReserved: 0,
        usdtReserved: 0,
        dailyEntryLimitKz: null,
        dailyLossLimitKz: null,
        selfExcludedUntil: null,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        totalEarnedKz: 0,
        totalEarnedUsdt: 0,
        totalLostKz: 0,
        totalLostUsdt: 0,
        unlockedThemes: ['classic'],
        selectedTheme: 'classic',
        isIdentityVerified: true,
        isAgeVerified: true,
        isSuspended: false,
        createdAt: nowStr
      };
      this.memUsers.set(userId, user);
      this.memPhoneIndex.set(normPhone, userId);

      return {
        ok: true,
        user: this.sanitizeUser(user),
        token: createSessionToken(userId, false)
      };
    }

    return this.withPgTransaction(async (client) => {
      const existing = await client.query(
        `SELECT id FROM users WHERE phone_normalized = $1 LIMIT 1`,
        [normPhone]
      );
      if (existing.rows.length > 0) {
        return { ok: false, error: 'Este número de telemóvel já está cadastrado. Faça login.' };
      }

      const res = await client.query(
        `INSERT INTO users (
          id, name, phone, phone_normalized, email, password_hash, avatar, role, category,
          kz_balance, usdt_balance, demo_kz_balance, demo_usdt_balance
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'player', 'Bronze', 0, 0, 50000, 50)
        RETURNING *`,
        [
          userId,
          cleanName,
          displayPhone,
          normPhone,
          cleanEmail || `${cleanName.toLowerCase().replace(/\s+/g, '')}@jogador.ao`,
          passHash,
          DEFAULT_AVATAR
        ]
      );

      const user = this.mapUserRow(res.rows[0]);
      return {
        ok: true,
        user,
        token: createSessionToken(user.id, false)
      };
    });
  }

  async loginUser(params: {
    phone: string;
    password: string;
  }): Promise<{ ok: true; user: User; token: string } | { ok: false; error: string }> {
    const normPhone = normalizePhone(params.phone);
    const cleanPassword = params.password.trim();
    if (!normPhone || !cleanPassword) {
      return { ok: false, error: 'Introduza o telemóvel e a palavra-passe.' };
    }

    if (!this.pool) {
      const uid = this.memPhoneIndex.get(normPhone);
      const user = uid ? this.memUsers.get(uid) : undefined;
      if (!user || !verifyPassword(cleanPassword, user.passwordHash)) {
        return { ok: false, error: 'Telemóvel ou palavra-passe incorretos.' };
      }
      if (user.isSuspended) {
        return { ok: false, error: 'Esta conta está suspensa. Contacte o suporte.' };
      }
      return { ok: true, user: this.sanitizeUser(user), token: createSessionToken(user.id, false) };
    }

    const res = await this.pool.query(
      `SELECT * FROM users WHERE phone_normalized = $1 LIMIT 1`,
      [normPhone]
    );
    const row = res.rows[0];
    if (!row || !verifyPassword(cleanPassword, String(row.password_hash || ''))) {
      return { ok: false, error: 'Telemóvel ou palavra-passe incorretos.' };
    }
    if (row.is_suspended) {
      return { ok: false, error: 'Esta conta está suspensa. Contacte o suporte.' };
    }

    const user = this.mapUserRow(row);
    return { ok: true, user, token: createSessionToken(user.id, user.role === 'admin') };
  }

  async getUserById(userId: string): Promise<User | null> {
    if (!userId) return null;
    if (!this.pool) {
      const u = this.memUsers.get(userId);
      return u ? this.sanitizeUser(u) : null;
    }
    const res = await this.pool.query(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [userId]);
    if (!res.rows[0]) return null;
    return this.mapUserRow(res.rows[0]);
  }

  async updateUserProfile(
    userId: string,
    data: {
      name?: string;
      phone?: string;
      password?: string;
      avatar?: string;
      selectedTheme?: BoardThemeId;
    }
  ): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
    const existing = await this.getUserById(userId);
    if (!existing) return { ok: false, error: 'Utilizador não encontrado.' };

    const nextName = data.name?.trim() || existing.name;
    const nextAvatar = data.avatar?.trim() || existing.avatar;
    const nextPhone = data.phone?.trim() ? formatPhoneDisplay(data.phone) : existing.phone;
    const nextNormPhone = normalizePhone(nextPhone);
    const nextPassHash = data.password?.trim() ? hashPassword(data.password.trim()) : undefined;

    let nextSelectedTheme = existing.selectedTheme || 'classic';
    if (data.selectedTheme) {
      const unlocked = existing.unlockedThemes || ['classic'];
      if (unlocked.includes(data.selectedTheme)) {
        nextSelectedTheme = data.selectedTheme;
      }
    }

    if (!this.pool) {
      const stored = this.memUsers.get(userId);
      if (!stored) return { ok: false, error: 'Utilizador não encontrado.' };
      const prevNorm = normalizePhone(stored.phone);
      if (nextNormPhone !== prevNorm && this.memPhoneIndex.has(nextNormPhone)) {
        return { ok: false, error: 'Este número de telemóvel já pertence a outra conta.' };
      }
      this.memPhoneIndex.delete(prevNorm);
      this.memPhoneIndex.set(nextNormPhone, userId);
      stored.name = nextName;
      stored.phone = nextPhone;
      stored.avatar = nextAvatar;
      stored.selectedTheme = nextSelectedTheme;
      if (nextPassHash) stored.passwordHash = nextPassHash;
      return { ok: true, user: this.sanitizeUser(stored) };
    }

    if (nextNormPhone !== normalizePhone(existing.phone)) {
      const dup = await this.pool.query(
        `SELECT id FROM users WHERE phone_normalized = $1 AND id <> $2 LIMIT 1`,
        [nextNormPhone, userId]
      );
      if (dup.rows.length > 0) {
        return { ok: false, error: 'Este número de telemóvel já pertence a outra conta.' };
      }
    }

    const res = await this.pool.query(
      `UPDATE users
       SET name = $2,
           phone = $3,
           phone_normalized = $4,
           avatar = $5,
           selected_theme = $6,
           password_hash = COALESCE($7, password_hash),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [userId, nextName, nextPhone, nextNormPhone, nextAvatar, nextSelectedTheme, nextPassHash || null]
    );
    return { ok: true, user: this.mapUserRow(res.rows[0]) };
  }

  // ---------- Wallet: Deposits & Withdrawals (Server Authoritative) ----------

  async createDepositRequest(params: {
    userId: string;
    type: 'DEPOSIT' | 'THEME_UNLOCK';
    currency: Currency;
    amount: number;
    method: PaymentMethod;
    network?: string;
    reference?: string;
    proofUrl?: string;
    themeId?: BoardThemeId;
    themeName?: string;
  }): Promise<{ ok: true; transaction: Transaction } | { ok: false; error: string }> {
    const user = await this.getUserById(params.userId);
    if (!user) return { ok: false, error: 'Sessão inválida.' };

    let finalAmount = Number(params.amount);
    if (params.type === 'THEME_UNLOCK' && params.themeId) {
      const cfg = await this.getPlatformConfig();
      const priceCfg = cfg.themePrices[params.themeId];
      if (!priceCfg || params.themeId === 'classic') {
        return { ok: false, error: 'Tabuleiro inválido para desbloqueio.' };
      }
      finalAmount = params.currency === 'KZ' ? priceCfg.priceKz : priceCfg.priceUsdt;
    }

    if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
      return { ok: false, error: 'O montante do depósito deve ser superior a zero.' };
    }

    const txId = `tx_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
    const ref =
      params.reference?.trim() ||
      (params.type === 'THEME_UNLOCK' && params.themeId
        ? `TEMA-${params.themeId.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`
        : `${params.method === 'MULTICAIXA_EXPRESS' ? 'MCX' : 'REF'}-${Math.floor(10000000 + Math.random() * 90000000)}`);
    const notes =
      params.type === 'THEME_UNLOCK'
        ? `Desbloqueio de tabuleiro premium (${params.themeName || params.themeId}). Aguardando confirmação real do Administrador N.`
        : 'Depósito registrado pelo jogador. Aguardando aprovação administrativa.';

    if (!this.pool) {
      const tx: Transaction = {
        id: txId,
        userId: user.id,
        userName: user.name,
        type: params.type,
        currency: params.currency,
        amount: finalAmount,
        fee: 0,
        status: 'Em validação',
        method: params.method,
        network: params.network,
        reference: ref,
        proofUrl: params.proofUrl,
        notes,
        themeId: params.themeId,
        themeName: params.themeName,
        createdAt: formatDatePtAo(new Date())
      };
      this.memTransactions.unshift(tx);
      return { ok: true, transaction: tx };
    }

    const res = await this.pool.query(
      `INSERT INTO transactions (
        id, user_id, user_name, type, currency, amount, fee, status, method, network,
        reference, proof_url, notes, theme_id, theme_name
      ) VALUES ($1, $2, $3, $4, $5, $6, 0, 'Em validação', $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        txId,
        user.id,
        user.name,
        params.type,
        params.currency,
        finalAmount,
        params.method,
        params.network || null,
        ref,
        params.proofUrl || null,
        notes,
        params.themeId || null,
        params.themeName || null
      ]
    );
    return { ok: true, transaction: this.mapTransactionRow(res.rows[0]) };
  }

  async createWithdrawalRequest(params: {
    userId: string;
    currency: Currency;
    amount: number;
    method: PaymentMethod;
    destination: string;
    network?: string;
  }): Promise<{ ok: true; user: User; transaction: Transaction } | { ok: false; error: string }> {
    const cfg = await this.getPlatformConfig();
    const minKz = Math.max(100, Math.round(cfg.minWithdrawKz ?? 500));
    const amount = Number(params.amount);
    const minAmount = params.currency === 'KZ' ? minKz : 5;
    if (!Number.isFinite(amount) || amount < minAmount) {
      return {
        ok: false,
        error: `Valor mínimo de levantamento: ${minAmount.toLocaleString('pt-AO')} ${params.currency}.`
      };
    }
    if (!params.destination.trim()) {
      return { ok: false, error: 'Informe o IBAN / Telefone / Carteira de destino.' };
    }

    const fee = params.currency === 'KZ' ? 100 : 1;
    const txId = `tx_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
    const reference = `RET-${Math.floor(100000 + Math.random() * 900000)}`;
    const notes = `Destino: ${params.destination.trim()}`;

    if (!this.pool) {
      const u = this.memUsers.get(params.userId);
      if (!u) return { ok: false, error: 'Utilizador não encontrado.' };
      if (params.currency === 'KZ') {
        if (u.kzBalance < amount) {
          return {
            ok: false,
            error: 'Saldo Real em Kz insuficiente para realizar este levantamento.'
          };
        }
        u.kzBalance = Number((u.kzBalance - amount).toFixed(2));
        u.kzReserved = Number((u.kzReserved + amount).toFixed(2));
      } else {
        if (u.usdtBalance < amount) {
          return { ok: false, error: 'Saldo em USDT insuficiente para realizar este levantamento.' };
        }
        u.usdtBalance = Number((u.usdtBalance - amount).toFixed(4));
        u.usdtReserved = Number((u.usdtReserved + amount).toFixed(4));
      }
      const tx: Transaction = {
        id: txId,
        userId: u.id,
        userName: u.name,
        type: 'WITHDRAW',
        currency: params.currency,
        amount,
        fee,
        status: 'Pendente',
        method: params.method,
        network: params.network,
        reference,
        notes,
        createdAt: formatDatePtAo(new Date())
      };
      this.memTransactions.unshift(tx);
      return { ok: true, user: this.sanitizeUser(u), transaction: tx };
    }

    return this.withPgTransaction(async (client) => {
      const userRes = await client.query(`SELECT * FROM users WHERE id = $1 FOR UPDATE`, [
        params.userId
      ]);
      const row = userRes.rows[0];
      if (!row) return { ok: false, error: 'Utilizador não encontrado.' };

      const avail =
        params.currency === 'KZ' ? Number(row.kz_balance) : Number(row.usdt_balance);
      if (avail < amount) {
        return {
          ok: false,
          error: `Saldo em ${params.currency} insuficiente para realizar este levantamento.`
        };
      }

      const updateQuery =
        params.currency === 'KZ'
          ? `UPDATE users SET kz_balance = kz_balance - $2, kz_reserved = kz_reserved + $2, updated_at = NOW() WHERE id = $1 RETURNING *`
          : `UPDATE users SET usdt_balance = usdt_balance - $2, usdt_reserved = usdt_reserved + $2, updated_at = NOW() WHERE id = $1 RETURNING *`;

      const updatedUserRes = await client.query(updateQuery, [params.userId, amount]);

      const txRes = await client.query(
        `INSERT INTO transactions (
          id, user_id, user_name, type, currency, amount, fee, status, method, network, reference, notes
        ) VALUES ($1, $2, $3, 'WITHDRAW', $4, $5, $6, 'Pendente', $7, $8, $9, $10)
        RETURNING *`,
        [
          txId,
          params.userId,
          String(row.name),
          params.currency,
          amount,
          fee,
          params.method,
          params.network || null,
          reference,
          notes
        ]
      );

      return {
        ok: true,
        user: this.mapUserRow(updatedUserRes.rows[0]),
        transaction: this.mapTransactionRow(txRes.rows[0])
      };
    });
  }

  // ---------- Server-Authoritative Match Stakes & Settlement ----------

  async debitMatchStake(params: {
    userId: string;
    currency: Currency;
    amount: number;
    isDemo: boolean;
    roomId: string;
    roomCode: string;
  }): Promise<{ ok: true; user: User | null } | { ok: false; error: string }> {
    const amount = Number(params.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      const u = await this.getUserById(params.userId);
      return { ok: true, user: u };
    }

    if (!this.pool) {
      const u = this.memUsers.get(params.userId);
      if (!u) return { ok: false, error: 'Sessão de jogador inválida. Faça login novamente.' };
      if (u.isSuspended) return { ok: false, error: 'Conta suspensa.' };

      if (params.isDemo) {
        if (params.currency === 'KZ') {
          if ((u.demoKzBalance ?? 0) < amount) {
            return { ok: false, error: 'Saldo Demo KZ insuficiente para esta aposta.' };
          }
          u.demoKzBalance = Number(((u.demoKzBalance ?? 0) - amount).toFixed(2));
        } else {
          if ((u.demoUsdtBalance ?? 0) < amount) {
            return { ok: false, error: 'Saldo Demo USDT insuficiente para esta aposta.' };
          }
          u.demoUsdtBalance = Number(((u.demoUsdtBalance ?? 0) - amount).toFixed(4));
        }
        return { ok: true, user: this.sanitizeUser(u) };
      }

      if (params.currency === 'KZ') {
        if (u.kzBalance < amount) {
          return {
            ok: false,
            error: 'Saldo Real KZ insuficiente para esta aposta. Deposite na carteira ou use o Modo DEMO.'
          };
        }
        u.kzBalance = Number((u.kzBalance - amount).toFixed(2));
      } else {
        if (u.usdtBalance < amount) {
          return {
            ok: false,
            error: 'Saldo Real USDT insuficiente para esta aposta. Deposite na carteira ou use o Modo DEMO.'
          };
        }
        u.usdtBalance = Number((u.usdtBalance - amount).toFixed(4));
      }

      this.memTransactions.unshift({
        id: `tx_bet_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
        userId: u.id,
        userName: u.name,
        type: 'BET_ENTRY',
        currency: params.currency,
        amount,
        fee: 0,
        status: 'Confirmado',
        method: 'MULTICAIXA_EXPRESS',
        reference: `BET-${params.roomCode}`,
        notes: `Entrada na mesa ${params.roomCode}`,
        createdAt: formatDatePtAo(new Date())
      });

      return { ok: true, user: this.sanitizeUser(u) };
    }

    return this.withPgTransaction(async (client) => {
      const userRes = await client.query(`SELECT * FROM users WHERE id = $1 FOR UPDATE`, [
        params.userId
      ]);
      const row = userRes.rows[0];
      if (!row) return { ok: false, error: 'Sessão de jogador inválida. Faça login novamente.' };
      if (row.is_suspended) return { ok: false, error: 'Conta suspensa.' };

      if (params.isDemo) {
        const col = params.currency === 'KZ' ? 'demo_kz_balance' : 'demo_usdt_balance';
        if (Number(row[col] ?? 0) < amount) {
          return { ok: false, error: `Saldo Demo ${params.currency} insuficiente para esta aposta.` };
        }
        const updated = await client.query(
          `UPDATE users SET ${col} = ${col} - $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
          [params.userId, amount]
        );
        return { ok: true, user: this.mapUserRow(updated.rows[0]) };
      }

      const balCol = params.currency === 'KZ' ? 'kz_balance' : 'usdt_balance';
      if (Number(row[balCol] ?? 0) < amount) {
        return {
          ok: false,
          error: `Saldo Real ${params.currency} insuficiente para esta aposta. Deposite na carteira ou use o Modo DEMO.`
        };
      }
      const updated = await client.query(
        `UPDATE users SET ${balCol} = ${balCol} - $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [params.userId, amount]
      );

      await client.query(
        `INSERT INTO transactions (
          id, user_id, user_name, type, currency, amount, fee, status, method, reference, notes, room_id
        ) VALUES ($1, $2, $3, 'BET_ENTRY', $4, $5, 0, 'Confirmado', 'MULTICAIXA_EXPRESS', $6, $7, $8)`,
        [
          `tx_bet_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
          params.userId,
          String(row.name),
          params.currency,
          amount,
          `BET-${params.roomCode}`,
          `Entrada na mesa ${params.roomCode}`,
          params.roomId
        ]
      );

      return { ok: true, user: this.mapUserRow(updated.rows[0]) };
    });
  }

  async refundMatchStake(params: {
    userId: string;
    currency: Currency;
    amount: number;
    isDemo: boolean;
    roomId: string;
    roomCode: string;
  }): Promise<User | null> {
    const amount = Number(params.amount);
    if (!Number.isFinite(amount) || amount <= 0) return null;

    if (!this.pool) {
      const u = this.memUsers.get(params.userId);
      if (!u) return null;
      if (params.isDemo) {
        if (params.currency === 'KZ') u.demoKzBalance = Number(((u.demoKzBalance ?? 0) + amount).toFixed(2));
        else u.demoUsdtBalance = Number(((u.demoUsdtBalance ?? 0) + amount).toFixed(4));
      } else {
        if (params.currency === 'KZ') u.kzBalance = Number((u.kzBalance + amount).toFixed(2));
        else u.usdtBalance = Number((u.usdtBalance + amount).toFixed(4));
        this.memTransactions.unshift({
          id: `tx_ref_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
          userId: u.id,
          userName: u.name,
          type: 'DEPOSIT',
          currency: params.currency,
          amount,
          fee: 0,
          status: 'Confirmado',
          method: 'MULTICAIXA_EXPRESS',
          reference: `REFUND-${params.roomCode}`,
          notes: `Reembolso de aposta (saída antes do início na mesa ${params.roomCode})`,
          createdAt: formatDatePtAo(new Date())
        });
      }
      return this.sanitizeUser(u);
    }

    return this.withPgTransaction(async (client) => {
      if (params.isDemo) {
        const col = params.currency === 'KZ' ? 'demo_kz_balance' : 'demo_usdt_balance';
        const res = await client.query(
          `UPDATE users SET ${col} = ${col} + $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
          [params.userId, amount]
        );
        return res.rows[0] ? this.mapUserRow(res.rows[0]) : null;
      }

      const balCol = params.currency === 'KZ' ? 'kz_balance' : 'usdt_balance';
      const res = await client.query(
        `UPDATE users SET ${balCol} = ${balCol} + $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [params.userId, amount]
      );
      if (!res.rows[0]) return null;

      await client.query(
        `INSERT INTO transactions (
          id, user_id, user_name, type, currency, amount, fee, status, method, reference, notes, room_id
        ) VALUES ($1, $2, $3, 'DEPOSIT', $4, $5, 0, 'Confirmado', 'MULTICAIXA_EXPRESS', $6, $7, $8)`,
        [
          `tx_ref_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
          params.userId,
          String(res.rows[0].name),
          params.currency,
          amount,
          `REFUND-${params.roomCode}`,
          `Reembolso de aposta (saída antes do início na mesa ${params.roomCode})`,
          params.roomId
        ]
      );

      return this.mapUserRow(res.rows[0]);
    });
  }

  async settleMatchVictory(params: {
    room: Room;
    matchKey: string;
    winnerColor: PlayerColor;
  }): Promise<{ affectedUsers: User[]; matchEntry: MatchHistoryEntry | null }> {
    const { room, matchKey, winnerColor } = params;
    const winnerSlot = room.players.find((p) => p.color === winnerColor) || null;

    const totalPot = room.betAmount > 0 ? room.betAmount * room.players.length : 0;
    const winnerPct = room.winnerPercent ?? 75;
    const prizePool = totalPot > 0 ? Math.round(totalPot * (winnerPct / 100)) : 0;
    const platformCommission = Math.max(0, totalPot - prizePool);
    const isDemo = Boolean(room.isDemo || room.betAmount === 0);

    const playersSummary: MatchHistoryPlayer[] = room.players.map((p) => ({
      userId: p.userId,
      name: p.name,
      color: p.color,
      isBot: p.isBot,
      resigned: Boolean(p.resigned)
    }));

    const matchId = `match_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;

    if (!this.pool) {
      if (this.settledMatchKeys.has(matchKey)) {
        return { affectedUsers: [], matchEntry: null };
      }
      this.settledMatchKeys.add(matchKey);

      const affected: User[] = [];
      for (const slot of room.players) {
        if (slot.isBot) continue;
        const u = this.memUsers.get(slot.userId);
        if (!u) continue;
        u.matchesPlayed += 1;

        if (slot.color === winnerColor) {
          u.wins += 1;
          u.category = computeCategory(u.wins);
          if (prizePool > 0) {
            if (isDemo) {
              if (room.currency === 'KZ') {
                u.demoKzBalance = Number(((u.demoKzBalance ?? 0) + prizePool).toFixed(2));
              } else {
                u.demoUsdtBalance = Number(((u.demoUsdtBalance ?? 0) + prizePool).toFixed(4));
              }
            } else {
              if (room.currency === 'KZ') {
                u.kzBalance = Number((u.kzBalance + prizePool).toFixed(2));
                u.totalEarnedKz = Number((u.totalEarnedKz + prizePool).toFixed(2));
              } else {
                u.usdtBalance = Number((u.usdtBalance + prizePool).toFixed(4));
                u.totalEarnedUsdt = Number((u.totalEarnedUsdt + prizePool).toFixed(4));
              }
              this.memTransactions.unshift({
                id: `tx_win_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
                userId: u.id,
                userName: u.name,
                type: 'BET_WIN',
                currency: room.currency,
                amount: prizePool,
                fee: platformCommission,
                status: 'Pago',
                method: 'MULTICAIXA_EXPRESS',
                reference: `WIN-${room.code}`,
                notes: `Prémio de vitória na mesa ${room.name} (${room.code})`,
                createdAt: formatDatePtAo(new Date())
              });
            }
          }
        } else {
          u.losses += 1;
          if (!isDemo && room.betAmount > 0) {
            if (room.currency === 'KZ') {
              u.totalLostKz = Number((u.totalLostKz + room.betAmount).toFixed(2));
            } else {
              u.totalLostUsdt = Number((u.totalLostUsdt + room.betAmount).toFixed(4));
            }
          }
        }
        affected.push(this.sanitizeUser(u));
      }

      if (!isDemo && platformCommission > 0 && winnerSlot) {
        const commUserId =
          room.players.find((p) => !p.isBot)?.userId || winnerSlot.userId;
        if (!commUserId.startsWith('bot_')) {
          this.memTransactions.unshift({
            id: `tx_comm_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
            userId: commUserId,
            userName: 'Banca N',
            type: 'COMMISSION',
            currency: room.currency,
            amount: platformCommission,
            fee: 0,
            status: 'Pago',
            method: 'MULTICAIXA_EXPRESS',
            reference: `COM-${room.code}`,
            notes: `Comissão da Banca (${100 - winnerPct}%) da mesa ${room.code}`,
            createdAt: formatDatePtAo(new Date())
          });
        }
      }

      const entry: MatchHistoryEntry = {
        id: matchId,
        roomId: room.id,
        roomCode: room.code,
        roomName: room.name,
        winnerUserId: winnerSlot?.userId || null,
        winnerName: winnerSlot?.name || null,
        winnerColor,
        currency: room.currency,
        betAmount: room.betAmount,
        totalPot,
        prizePool,
        platformCommission,
        isDemo,
        boardTheme: room.boardTheme || 'classic',
        players: playersSummary,
        finishedAt: formatDatePtAo(new Date())
      };
      this.memMatches.unshift(entry);
      return { affectedUsers: affected, matchEntry: entry };
    }

    return this.withPgTransaction(async (client) => {
      const insertMatch = await client.query(
        `INSERT INTO match_history (
          id, match_key, room_id, room_code, room_name, winner_user_id, winner_name, winner_color,
          currency, bet_amount, total_pot, prize_pool, platform_commission, is_demo, board_theme, players
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb)
        ON CONFLICT (match_key) DO NOTHING
        RETURNING *`,
        [
          matchId,
          matchKey,
          room.id,
          room.code,
          room.name,
          winnerSlot?.userId || null,
          winnerSlot?.name || null,
          winnerColor,
          room.currency,
          room.betAmount,
          totalPot,
          prizePool,
          platformCommission,
          isDemo,
          room.boardTheme || 'classic',
          JSON.stringify(playersSummary)
        ]
      );

      // Already settled idempotently
      if (insertMatch.rows.length === 0) {
        return { affectedUsers: [], matchEntry: null };
      }

      const affectedUsers: User[] = [];
      let firstHumanUserId: string | null = null;

      for (const slot of room.players) {
        if (slot.isBot) continue;
        if (!firstHumanUserId) firstHumanUserId = slot.userId;

        const uRes = await client.query(`SELECT * FROM users WHERE id = $1 FOR UPDATE`, [
          slot.userId
        ]);
        const row = uRes.rows[0];
        if (!row) continue;

        if (slot.color === winnerColor) {
          const nextWins = Number(row.wins ?? 0) + 1;
          const nextCat = computeCategory(nextWins);

          let balUpdate = '';
          if (prizePool > 0) {
            if (isDemo) {
              balUpdate =
                room.currency === 'KZ'
                  ? `, demo_kz_balance = demo_kz_balance + $4`
                  : `, demo_usdt_balance = demo_usdt_balance + $4`;
            } else {
              balUpdate =
                room.currency === 'KZ'
                  ? `, kz_balance = kz_balance + $4, total_earned_kz = total_earned_kz + $4`
                  : `, usdt_balance = usdt_balance + $4, total_earned_usdt = total_earned_usdt + $4`;
            }
          }

          const updatedRes = await client.query(
            `UPDATE users
             SET matches_played = matches_played + 1,
                 wins = $2,
                 category = $3
                 ${balUpdate},
                 updated_at = NOW()
             WHERE id = $1
             RETURNING *`,
            prizePool > 0 ? [slot.userId, nextWins, nextCat, prizePool] : [slot.userId, nextWins, nextCat]
          );
          affectedUsers.push(this.mapUserRow(updatedRes.rows[0]));

          if (prizePool > 0 && !isDemo) {
            await client.query(
              `INSERT INTO transactions (
                id, user_id, user_name, type, currency, amount, fee, status, method, reference, notes, room_id
              ) VALUES ($1, $2, $3, 'BET_WIN', $4, $5, $6, 'Pago', 'MULTICAIXA_EXPRESS', $7, $8, $9)`,
              [
                `tx_win_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
                slot.userId,
                String(row.name),
                room.currency,
                prizePool,
                platformCommission,
                `WIN-${room.code}`,
                `Prémio de vitória na mesa ${room.name} (${room.code})`,
                room.id
              ]
            );
          }
        } else {
          const lossUpdate =
            !isDemo && room.betAmount > 0
              ? room.currency === 'KZ'
                ? `, total_lost_kz = total_lost_kz + $2`
                : `, total_lost_usdt = total_lost_usdt + $2`
              : '';
          const updatedRes = await client.query(
            `UPDATE users
             SET matches_played = matches_played + 1,
                 losses = losses + 1
                 ${lossUpdate},
                 updated_at = NOW()
             WHERE id = $1
             RETURNING *`,
            !isDemo && room.betAmount > 0 ? [slot.userId, room.betAmount] : [slot.userId]
          );
          affectedUsers.push(this.mapUserRow(updatedRes.rows[0]));
        }
      }

      if (!isDemo && platformCommission > 0 && firstHumanUserId) {
        await client.query(
          `INSERT INTO transactions (
            id, user_id, user_name, type, currency, amount, fee, status, method, reference, notes, room_id
          ) VALUES ($1, $2, 'Banca N', 'COMMISSION', $3, $4, 0, 'Pago', 'MULTICAIXA_EXPRESS', $5, $6, $7)`,
          [
            `tx_comm_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
            firstHumanUserId,
            room.currency,
            platformCommission,
            `COM-${room.code}`,
            `Comissão da Banca (${100 - winnerPct}%) da mesa ${room.code}`,
            room.id
          ]
        );
      }

      return {
        affectedUsers,
        matchEntry: this.mapMatchRow(insertMatch.rows[0])
      };
    });
  }

  // ---------- Queries for User & Public ----------

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    if (!this.pool) {
      return this.memTransactions.filter(
        (t) => t.userId === userId && t.type !== 'COMMISSION'
      );
    }
    const res = await this.pool.query(
      `SELECT * FROM transactions WHERE user_id = $1 AND type <> 'COMMISSION' ORDER BY created_at DESC LIMIT 100`,
      [userId]
    );
    return res.rows.map((r) => this.mapTransactionRow(r));
  }

  async getUserMatchHistory(userId: string): Promise<MatchHistoryEntry[]> {
    if (!this.pool) {
      return this.memMatches
        .filter((m) => m.players.some((p) => p.userId === userId))
        .slice(0, 50);
    }
    const res = await this.pool.query(
      `SELECT * FROM match_history
       WHERE EXISTS (
         SELECT 1 FROM jsonb_array_elements(players) elem
         WHERE elem->>'userId' = $1
       )
       ORDER BY finished_at DESC
       LIMIT 50`,
      [userId]
    );
    return res.rows.map((r) => this.mapMatchRow(r));
  }

  async getRankingList(): Promise<RankingPlayer[]> {
    if (!this.pool) {
      const list = Array.from(this.memUsers.values())
        .sort((a, b) => b.wins - a.wins || b.totalEarnedKz - a.totalEarnedKz)
        .slice(0, 30)
        .map((u, idx) => {
          const winRate =
            u.matchesPlayed > 0 ? Number(((u.wins / u.matchesPlayed) * 100).toFixed(1)) : 0;
          return {
            id: u.id,
            name: u.name,
            avatar: u.avatar,
            category: u.category,
            wins: u.wins,
            matchesPlayed: u.matchesPlayed,
            winRate,
            totalEarningsKz: u.totalEarnedKz,
            totalEarningsUsdt: u.totalEarnedUsdt,
            score: u.wins * 120 + u.matchesPlayed * 15,
            rank: idx + 1,
            country: 'Angola'
          };
        });
      return list;
    }

    const res = await this.pool.query(
      `SELECT id, name, avatar, category, wins, matches_played, total_earned_kz, total_earned_usdt
       FROM users
       WHERE is_suspended = false
       ORDER BY wins DESC, total_earned_kz DESC, matches_played DESC
       LIMIT 30`
    );
    return res.rows.map((row, idx) => {
      const wins = Number(row.wins ?? 0);
      const matchesPlayed = Number(row.matches_played ?? 0);
      const winRate = matchesPlayed > 0 ? Number(((wins / matchesPlayed) * 100).toFixed(1)) : 0;
      return {
        id: String(row.id),
        name: String(row.name),
        avatar: String(row.avatar || DEFAULT_AVATAR),
        category: (row.category as PlayerCategory) || 'Bronze',
        wins,
        matchesPlayed,
        winRate,
        totalEarningsKz: Number(row.total_earned_kz ?? 0),
        totalEarningsUsdt: Number(row.total_earned_usdt ?? 0),
        score: wins * 120 + matchesPlayed * 15,
        rank: idx + 1,
        country: 'Angola'
      };
    });
  }

  // ---------- Support Tickets ----------

  async getUserSupportTickets(userId: string): Promise<SupportTicket[]> {
    if (!this.pool) {
      return this.memTickets.filter((t) => t.userId === userId);
    }
    const res = await this.pool.query(
      `SELECT * FROM support_tickets WHERE user_id = $1 ORDER BY updated_at DESC`,
      [userId]
    );
    return res.rows.map((r) => this.mapTicketRow(r));
  }

  async addUserSupportMessage(params: {
    userId: string;
    text: string;
    subject?: string;
  }): Promise<SupportTicket | null> {
    const user = await this.getUserById(params.userId);
    if (!user || !params.text.trim()) return null;

    const newMsg: SupportMessage = {
      id: `sm_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
      sender: 'user',
      text: params.text.trim(),
      timestamp: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })
    };

    if (!this.pool) {
      const existing = this.memTickets.find(
        (t) => t.userId === user.id && t.status === 'OPEN'
      );
      if (existing) {
        existing.messages = [...existing.messages, newMsg];
        existing.updatedAt = formatDatePtAo(new Date());
        return existing;
      }
      const ticket: SupportTicket = {
        id: `tick_${Date.now()}`,
        userId: user.id,
        userName: user.name,
        userPhone: user.phone,
        subject: params.subject?.trim() || 'Atendimento ao Jogador',
        status: 'OPEN',
        messages: [newMsg],
        createdAt: formatDatePtAo(new Date()),
        updatedAt: formatDatePtAo(new Date())
      };
      this.memTickets.unshift(ticket);
      return ticket;
    }

    const openRes = await this.pool.query(
      `SELECT * FROM support_tickets WHERE user_id = $1 AND status = 'OPEN' ORDER BY updated_at DESC LIMIT 1`,
      [user.id]
    );
    if (openRes.rows[0]) {
      const existing = this.mapTicketRow(openRes.rows[0]);
      const updatedMsgs = [...existing.messages, newMsg];
      const upd = await this.pool.query(
        `UPDATE support_tickets SET messages = $2::jsonb, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [existing.id, JSON.stringify(updatedMsgs)]
      );
      return this.mapTicketRow(upd.rows[0]);
    }

    const tickId = `tick_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
    const ins = await this.pool.query(
      `INSERT INTO support_tickets (id, user_id, user_name, user_phone, subject, status, messages)
       VALUES ($1, $2, $3, $4, $5, 'OPEN', $6::jsonb)
       RETURNING *`,
      [
        tickId,
        user.id,
        user.name,
        user.phone,
        params.subject?.trim() || 'Atendimento ao Jogador',
        JSON.stringify([newMsg])
      ]
    );
    return this.mapTicketRow(ins.rows[0]);
  }

  async adminReplySupportTicket(
    ticketId: string,
    text: string
  ): Promise<SupportTicket | null> {
    if (!text.trim()) return null;
    const replyMsg: SupportMessage = {
      id: `sm_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
      sender: 'admin',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })
    };

    if (!this.pool) {
      const t = this.memTickets.find((x) => x.id === ticketId);
      if (!t) return null;
      t.messages = [...t.messages, replyMsg];
      t.updatedAt = formatDatePtAo(new Date());
      return t;
    }

    const cur = await this.pool.query(`SELECT * FROM support_tickets WHERE id = $1 LIMIT 1`, [
      ticketId
    ]);
    if (!cur.rows[0]) return null;
    const existing = this.mapTicketRow(cur.rows[0]);
    const upd = await this.pool.query(
      `UPDATE support_tickets SET messages = $2::jsonb, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [ticketId, JSON.stringify([...existing.messages, replyMsg])]
    );
    return this.mapTicketRow(upd.rows[0]);
  }

  // ---------- Admin Financial & User Management (Atomic in PostgreSQL) ----------

  async adminApproveDeposit(
    txId: string
  ): Promise<{ ok: true; user: User | null; transaction: Transaction } | { ok: false; error: string }> {
    if (!this.pool) {
      const tx = this.memTransactions.find((t) => t.id === txId);
      if (!tx) return { ok: false, error: 'Transação não encontrada.' };
      if (tx.status === 'Confirmado') return { ok: false, error: 'Depósito já confirmado.' };

      const u = this.memUsers.get(tx.userId) || null;
      if (tx.type === 'THEME_UNLOCK' && tx.themeId) {
        if (u) {
          const prev = u.unlockedThemes || ['classic'];
          if (!prev.includes(tx.themeId)) u.unlockedThemes = [...prev, tx.themeId];
          u.selectedTheme = tx.themeId;
        }
        tx.status = 'Confirmado';
        tx.notes = `Pagamento real confirmado. Tabuleiro "${tx.themeName || tx.themeId}" desbloqueado!`;
        tx.updatedAt = formatDatePtAo(new Date());
        return { ok: true, user: u ? this.sanitizeUser(u) : null, transaction: tx };
      }

      if (u) {
        if (tx.currency === 'KZ') u.kzBalance = Number((u.kzBalance + tx.amount).toFixed(2));
        else u.usdtBalance = Number((u.usdtBalance + tx.amount).toFixed(4));
      }
      tx.status = 'Confirmado';
      tx.notes = 'Aprovado pelo Administrador N';
      tx.updatedAt = formatDatePtAo(new Date());
      return { ok: true, user: u ? this.sanitizeUser(u) : null, transaction: tx };
    }

    return this.withPgTransaction(async (client) => {
      const txRes = await client.query(`SELECT * FROM transactions WHERE id = $1 FOR UPDATE`, [
        txId
      ]);
      const txRow = txRes.rows[0];
      if (!txRow) return { ok: false, error: 'Transação não encontrada.' };
      if (txRow.status === 'Confirmado') return { ok: false, error: 'Depósito já confirmado.' };

      let updatedUser: User | null = null;
      const amount = Number(txRow.amount);

      if (txRow.type === 'THEME_UNLOCK' && txRow.theme_id) {
        const themeId = String(txRow.theme_id) as BoardThemeId;
        const userRes = await client.query(`SELECT * FROM users WHERE id = $1 FOR UPDATE`, [
          txRow.user_id
        ]);
        if (userRes.rows[0]) {
          const existingThemes = Array.isArray(userRes.rows[0].unlocked_themes)
            ? (userRes.rows[0].unlocked_themes as BoardThemeId[])
            : ['classic'];
          const nextThemes = existingThemes.includes(themeId)
            ? existingThemes
            : [...existingThemes, themeId];
          const uUpd = await client.query(
            `UPDATE users SET unlocked_themes = $2::jsonb, selected_theme = $3, updated_at = NOW() WHERE id = $1 RETURNING *`,
            [txRow.user_id, JSON.stringify(nextThemes), themeId]
          );
          updatedUser = this.mapUserRow(uUpd.rows[0]);
        }
        const updTx = await client.query(
          `UPDATE transactions SET status = 'Confirmado', notes = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
          [
            txId,
            `Pagamento real confirmado. Tabuleiro "${txRow.theme_name || themeId}" desbloqueado!`
          ]
        );
        return { ok: true, user: updatedUser, transaction: this.mapTransactionRow(updTx.rows[0]) };
      }

      const balCol = txRow.currency === 'USDT' ? 'usdt_balance' : 'kz_balance';
      const uUpd = await client.query(
        `UPDATE users SET ${balCol} = ${balCol} + $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [txRow.user_id, amount]
      );
      if (uUpd.rows[0]) updatedUser = this.mapUserRow(uUpd.rows[0]);

      const updTx = await client.query(
        `UPDATE transactions SET status = 'Confirmado', notes = 'Aprovado pelo Administrador N', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [txId]
      );
      return { ok: true, user: updatedUser, transaction: this.mapTransactionRow(updTx.rows[0]) };
    });
  }

  async adminRejectDeposit(
    txId: string
  ): Promise<{ ok: true; transaction: Transaction } | { ok: false; error: string }> {
    if (!this.pool) {
      const tx = this.memTransactions.find((t) => t.id === txId);
      if (!tx) return { ok: false, error: 'Transação não encontrada.' };
      tx.status = 'Rejeitado';
      tx.notes = 'Comprovativo inválido ou pagamento não confirmado';
      tx.updatedAt = formatDatePtAo(new Date());
      return { ok: true, transaction: tx };
    }

    const res = await this.pool.query(
      `UPDATE transactions SET status = 'Rejeitado', notes = 'Comprovativo inválido ou pagamento não confirmado', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [txId]
    );
    if (!res.rows[0]) return { ok: false, error: 'Transação não encontrada.' };
    return { ok: true, transaction: this.mapTransactionRow(res.rows[0]) };
  }

  async adminApproveWithdrawal(
    txId: string
  ): Promise<{ ok: true; user: User | null; transaction: Transaction } | { ok: false; error: string }> {
    if (!this.pool) {
      const tx = this.memTransactions.find((t) => t.id === txId);
      if (!tx) return { ok: false, error: 'Levantamento não encontrado.' };
      if (tx.status === 'Pago') return { ok: false, error: 'Já liquidado.' };
      const u = this.memUsers.get(tx.userId) || null;
      if (u) {
        if (tx.currency === 'KZ') u.kzReserved = Math.max(0, Number((u.kzReserved - tx.amount).toFixed(2)));
        else u.usdtReserved = Math.max(0, Number((u.usdtReserved - tx.amount).toFixed(4)));
      }
      tx.status = 'Pago';
      tx.notes = 'Transferência liquidada pela tesouraria';
      tx.updatedAt = formatDatePtAo(new Date());
      return { ok: true, user: u ? this.sanitizeUser(u) : null, transaction: tx };
    }

    return this.withPgTransaction(async (client) => {
      const txRes = await client.query(`SELECT * FROM transactions WHERE id = $1 FOR UPDATE`, [
        txId
      ]);
      const txRow = txRes.rows[0];
      if (!txRow) return { ok: false, error: 'Levantamento não encontrado.' };
      if (txRow.status === 'Pago') return { ok: false, error: 'Já liquidado.' };

      const resCol = txRow.currency === 'USDT' ? 'usdt_reserved' : 'kz_reserved';
      const uUpd = await client.query(
        `UPDATE users SET ${resCol} = GREATEST(0, ${resCol} - $2), updated_at = NOW() WHERE id = $1 RETURNING *`,
        [txRow.user_id, Number(txRow.amount)]
      );
      const updTx = await client.query(
        `UPDATE transactions SET status = 'Pago', notes = 'Transferência liquidada pela tesouraria', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [txId]
      );
      return {
        ok: true,
        user: uUpd.rows[0] ? this.mapUserRow(uUpd.rows[0]) : null,
        transaction: this.mapTransactionRow(updTx.rows[0])
      };
    });
  }

  async adminRejectWithdrawal(
    txId: string
  ): Promise<{ ok: true; user: User | null; transaction: Transaction } | { ok: false; error: string }> {
    if (!this.pool) {
      const tx = this.memTransactions.find((t) => t.id === txId);
      if (!tx) return { ok: false, error: 'Levantamento não encontrado.' };
      if (tx.status === 'Rejeitado') return { ok: false, error: 'Já rejeitado.' };
      const u = this.memUsers.get(tx.userId) || null;
      if (u) {
        if (tx.currency === 'KZ') {
          u.kzBalance = Number((u.kzBalance + tx.amount).toFixed(2));
          u.kzReserved = Math.max(0, Number((u.kzReserved - tx.amount).toFixed(2)));
        } else {
          u.usdtBalance = Number((u.usdtBalance + tx.amount).toFixed(4));
          u.usdtReserved = Math.max(0, Number((u.usdtReserved - tx.amount).toFixed(4)));
        }
      }
      tx.status = 'Rejeitado';
      tx.notes = 'Dados bancários ou de carteira incorretos (saldo devolvido)';
      tx.updatedAt = formatDatePtAo(new Date());
      return { ok: true, user: u ? this.sanitizeUser(u) : null, transaction: tx };
    }

    return this.withPgTransaction(async (client) => {
      const txRes = await client.query(`SELECT * FROM transactions WHERE id = $1 FOR UPDATE`, [
        txId
      ]);
      const txRow = txRes.rows[0];
      if (!txRow) return { ok: false, error: 'Levantamento não encontrado.' };
      if (txRow.status === 'Rejeitado') return { ok: false, error: 'Já rejeitado.' };

      const balCol = txRow.currency === 'USDT' ? 'usdt_balance' : 'kz_balance';
      const resCol = txRow.currency === 'USDT' ? 'usdt_reserved' : 'kz_reserved';
      const uUpd = await client.query(
        `UPDATE users SET ${balCol} = ${balCol} + $2, ${resCol} = GREATEST(0, ${resCol} - $2), updated_at = NOW() WHERE id = $1 RETURNING *`,
        [txRow.user_id, Number(txRow.amount)]
      );
      const updTx = await client.query(
        `UPDATE transactions SET status = 'Rejeitado', notes = 'Dados bancários ou de carteira incorretos (saldo devolvido)', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [txId]
      );
      return {
        ok: true,
        user: uUpd.rows[0] ? this.mapUserRow(uUpd.rows[0]) : null,
        transaction: this.mapTransactionRow(updTx.rows[0])
      };
    });
  }

  async adminToggleUserSuspension(userId: string): Promise<User | null> {
    if (!this.pool) {
      const u = this.memUsers.get(userId);
      if (!u) return null;
      u.isSuspended = !u.isSuspended;
      return this.sanitizeUser(u);
    }

    const res = await this.pool.query(
      `UPDATE users SET is_suspended = NOT is_suspended, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [userId]
    );
    return res.rows[0] ? this.mapUserRow(res.rows[0]) : null;
  }

  // ---------- Admin Bonus Grant (Atomic SQL Transaction) ----------

  async adminGrantBonus(params: {
    userId: string;
    currency: Currency;
    amount: number;
    reason?: string;
    grantedBy: string;
  }): Promise<
    | { ok: true; user: User; transaction: Transaction; notification: AppNotification }
    | { ok: false; error: string }
  > {
    if (params.currency !== 'KZ' && params.currency !== 'USDT') {
      return { ok: false, error: 'Moeda inválida. Escolha KZ ou USDT.' };
    }

    const amount =
      params.currency === 'KZ'
        ? Math.round(Number(params.amount))
        : Number(Number(params.amount).toFixed(4));

    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, error: 'O valor do bónus deve ser positivo.' };
    }

    const MAX_BONUS_KZ = 5_000_000;
    const MAX_BONUS_USDT = 5_000;
    if (params.currency === 'KZ' && amount > MAX_BONUS_KZ) {
      return {
        ok: false,
        error: `Valor máximo permitido por bónus é ${MAX_BONUS_KZ.toLocaleString('pt-AO')} Kz.`
      };
    }
    if (params.currency === 'USDT' && amount > MAX_BONUS_USDT) {
      return {
        ok: false,
        error: `Valor máximo permitido por bónus é ${MAX_BONUS_USDT.toLocaleString('pt-AO')} USDT.`
      };
    }

    const cleanReason = (params.reason || '').trim().slice(0, 200) || 'Bónus promocional concedido pela administração';
    const grantedBy = (params.grantedBy || 'Admin N').trim().slice(0, 100);
    const txId = `tx_bon_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
    const notifId = `ntf_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
    const formattedVal = `${amount.toLocaleString('pt-AO')} ${params.currency === 'KZ' ? 'Kz' : 'USDT'}`;
    const notifTitle = 'Bónus Recebido!';
    const notifBody = `Recebeste um bónus de ${formattedVal}${params.reason?.trim() ? ` — ${params.reason.trim()}` : ''}.`;

    if (!this.pool) {
      const u = this.memUsers.get(params.userId);
      if (!u) return { ok: false, error: 'Utilizador não encontrado.' };
      if (u.isSuspended) {
        return { ok: false, error: 'Não é possível conceder bónus a um utilizador suspenso.' };
      }

      if (params.currency === 'KZ') {
        u.kzBalance = Number((u.kzBalance + amount).toFixed(2));
      } else {
        u.usdtBalance = Number((u.usdtBalance + amount).toFixed(4));
      }

      const nowStr = formatDatePtAo(new Date());
      const tx: Transaction = {
        id: txId,
        userId: u.id,
        userName: u.name,
        type: 'bonus',
        currency: params.currency,
        amount,
        fee: 0,
        status: 'Confirmado',
        method: 'MULTICAIXA_EXPRESS',
        reference: `BONUS-${Date.now().toString().slice(-6)}`,
        notes: `${cleanReason} (Por: ${grantedBy})`,
        reason: cleanReason,
        grantedBy,
        createdAt: nowStr,
        updatedAt: nowStr
      };
      this.memTransactions.unshift(tx);

      const notif: AppNotification = {
        id: notifId,
        userId: u.id,
        title: notifTitle,
        body: notifBody,
        type: 'bonus',
        read: false,
        createdAt: nowStr
      };
      this.memNotifications.unshift(notif);

      return { ok: true, user: this.sanitizeUser(u), transaction: tx, notification: notif };
    }

    return this.withPgTransaction(async (client) => {
      const userRes = await client.query(`SELECT * FROM users WHERE id = $1 FOR UPDATE`, [
        params.userId
      ]);
      const row = userRes.rows[0];
      if (!row) {
        return { ok: false, error: 'Utilizador não encontrado.' };
      }
      if (row.is_suspended) {
        return { ok: false, error: 'Não é possível conceder bónus a um utilizador suspenso.' };
      }

      const balCol = params.currency === 'USDT' ? 'usdt_balance' : 'kz_balance';
      const uUpd = await client.query(
        `UPDATE users SET ${balCol} = ${balCol} + $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [params.userId, amount]
      );

      const txIns = await client.query(
        `INSERT INTO transactions (
          id, user_id, user_name, type, currency, amount, fee, status, method, reference, notes, reason, granted_by
        ) VALUES ($1, $2, $3, 'bonus', $4, $5, 0, 'Confirmado', 'MULTICAIXA_EXPRESS', $6, $7, $8, $9)
        RETURNING *`,
        [
          txId,
          params.userId,
          String(row.name),
          params.currency,
          amount,
          `BONUS-${Date.now().toString().slice(-6)}`,
          `${cleanReason} (Por: ${grantedBy})`,
          cleanReason,
          grantedBy
        ]
      );

      const notifIns = await client.query(
        `INSERT INTO notifications (id, user_id, title, body, type, is_read)
         VALUES ($1, $2, $3, $4, 'bonus', false)
         RETURNING *`,
        [notifId, params.userId, notifTitle, notifBody]
      );

      return {
        ok: true,
        user: this.mapUserRow(uUpd.rows[0]),
        transaction: this.mapTransactionRow(txIns.rows[0]),
        notification: this.mapNotificationRow(notifIns.rows[0])
      };
    });
  }

  // ---------- Notifications & Push Subscriptions ----------

  async createNotification(params: {
    userId: string;
    title: string;
    body: string;
    type: NotificationType;
  }): Promise<AppNotification | null> {
    const user = await this.getUserById(params.userId);
    if (!user) return null;

    const id = `ntf_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
    if (!this.pool) {
      const notif: AppNotification = {
        id,
        userId: params.userId,
        title: params.title,
        body: params.body,
        type: params.type,
        read: false,
        createdAt: formatDatePtAo(new Date())
      };
      this.memNotifications.unshift(notif);
      return notif;
    }

    const res = await this.pool.query(
      `INSERT INTO notifications (id, user_id, title, body, type, is_read)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING *`,
      [id, params.userId, params.title, params.body, params.type]
    );
    return res.rows[0] ? this.mapNotificationRow(res.rows[0]) : null;
  }

  async getUserNotifications(userId: string): Promise<AppNotification[]> {
    if (!this.pool) {
      return this.memNotifications.filter((n) => n.userId === userId).slice(0, 50);
    }
    const res = await this.pool.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );
    return res.rows.map((r) => this.mapNotificationRow(r));
  }

  async markNotificationsRead(userId: string, ids?: string[]): Promise<AppNotification[]> {
    if (!this.pool) {
      for (const n of this.memNotifications) {
        if (n.userId === userId && (!ids || ids.length === 0 || ids.includes(n.id))) {
          n.read = true;
        }
      }
      return this.getUserNotifications(userId);
    }

    if (ids && ids.length > 0) {
      await this.pool.query(
        `UPDATE notifications SET is_read = true WHERE user_id = $1 AND id = ANY($2::text[])`,
        [userId, ids]
      );
    } else {
      await this.pool.query(`UPDATE notifications SET is_read = true WHERE user_id = $1`, [userId]);
    }
    return this.getUserNotifications(userId);
  }

  async savePushSubscription(params: {
    userId: string;
    endpoint: string;
    keys: PushSubscriptionKeys;
  }): Promise<PushSubscriptionRecord> {
    const id = `psub_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
    if (!this.pool) {
      const existingIdx = this.memPushSubscriptions.findIndex(
        (s) => s.endpoint === params.endpoint
      );
      const record: PushSubscriptionRecord = {
        id,
        userId: params.userId,
        endpoint: params.endpoint,
        keys: params.keys,
        createdAt: formatDatePtAo(new Date())
      };
      if (existingIdx !== -1) {
        this.memPushSubscriptions[existingIdx] = record;
      } else {
        this.memPushSubscriptions.unshift(record);
      }
      return record;
    }

    const res = await this.pool.query(
      `INSERT INTO push_subscriptions (id, user_id, endpoint, keys)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (endpoint) DO UPDATE
         SET user_id = EXCLUDED.user_id,
             keys = EXCLUDED.keys
       RETURNING *`,
      [id, params.userId, params.endpoint, JSON.stringify(params.keys)]
    );
    const r = res.rows[0];
    return {
      id: String(r.id),
      userId: String(r.user_id),
      endpoint: String(r.endpoint),
      keys: r.keys as PushSubscriptionKeys,
      createdAt: formatDatePtAo(r.created_at as string | Date)
    };
  }

  async deletePushSubscription(userId: string, endpoint?: string): Promise<void> {
    if (!this.pool) {
      this.memPushSubscriptions = this.memPushSubscriptions.filter((s) =>
        endpoint ? !(s.userId === userId && s.endpoint === endpoint) : s.userId !== userId
      );
      return;
    }
    if (endpoint) {
      await this.pool.query(
        `DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2`,
        [userId, endpoint]
      );
    } else {
      await this.pool.query(`DELETE FROM push_subscriptions WHERE user_id = $1`, [userId]);
    }
  }

  async deletePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
    if (!this.pool) {
      this.memPushSubscriptions = this.memPushSubscriptions.filter((s) => s.endpoint !== endpoint);
      return;
    }
    await this.pool.query(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [endpoint]);
  }

  async getUserPushSubscriptions(userId: string): Promise<PushSubscriptionRecord[]> {
    if (!this.pool) {
      return this.memPushSubscriptions.filter((s) => s.userId === userId);
    }
    const res = await this.pool.query(
      `SELECT * FROM push_subscriptions WHERE user_id = $1`,
      [userId]
    );
    return res.rows.map((r) => ({
      id: String(r.id),
      userId: String(r.user_id),
      endpoint: String(r.endpoint),
      keys: r.keys as PushSubscriptionKeys,
      createdAt: formatDatePtAo(r.created_at as string | Date)
    }));
  }

  async findUserByPhoneOrName(query: string): Promise<User | null> {
    const q = query.trim();
    if (!q) return null;
    const normPhone = normalizePhone(q);

    if (!this.pool) {
      if (normPhone && this.memPhoneIndex.has(normPhone)) {
        const u = this.memUsers.get(this.memPhoneIndex.get(normPhone)!);
        return u ? this.sanitizeUser(u) : null;
      }
      const lower = q.toLowerCase();
      for (const u of this.memUsers.values()) {
        if (u.name.toLowerCase().includes(lower) || u.id === q) {
          return this.sanitizeUser(u);
        }
      }
      return null;
    }

    const res = await this.pool.query(
      `SELECT * FROM users
       WHERE id = $1 OR phone_normalized = $2 OR LOWER(name) LIKE $3
       LIMIT 1`,
      [q, normPhone || '__none__', `%${q.toLowerCase()}%`]
    );
    return res.rows[0] ? this.mapUserRow(res.rows[0]) : null;
  }

  async getAdminOverview(): Promise<AdminOverview> {
    if (!this.pool) {
      const players: AdminPlayerSummary[] = Array.from(this.memUsers.values()).map((u) => ({
        id: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email,
        category: u.category,
        kzBalance: u.kzBalance,
        usdtBalance: u.usdtBalance,
        demoKzBalance: u.demoKzBalance ?? 50000,
        matchesPlayed: u.matchesPlayed,
        wins: u.wins,
        losses: u.losses,
        isSuspended: u.isSuspended,
        createdAt: u.createdAt
      }));

      const totalDepositsKz = this.memTransactions
        .filter((t) => t.type === 'DEPOSIT' && t.currency === 'KZ' && t.status === 'Confirmado')
        .reduce((acc, t) => acc + t.amount, 0);
      const totalDepositsUsdt = this.memTransactions
        .filter((t) => t.type === 'DEPOSIT' && t.currency === 'USDT' && t.status === 'Confirmado')
        .reduce((acc, t) => acc + t.amount, 0);
      const totalCommissionKz = this.memTransactions
        .filter(
          (t) =>
            (t.type === 'COMMISSION' || t.type === 'THEME_UNLOCK') &&
            t.currency === 'KZ' &&
            (t.status === 'Pago' || t.status === 'Confirmado')
        )
        .reduce((acc, t) => acc + t.amount, 0);
      const totalCommissionUsdt = this.memTransactions
        .filter(
          (t) =>
            (t.type === 'COMMISSION' || t.type === 'THEME_UNLOCK') &&
            t.currency === 'USDT' &&
            (t.status === 'Pago' || t.status === 'Confirmado')
        )
        .reduce((acc, t) => acc + t.amount, 0);

      const settledRealJetBets = Array.from(this.memJetBets.values()).filter(
        (b) => !b.isDemo && (b.status === 'CASHED_OUT' || b.status === 'LOST')
      );
      const totalRealWageredKz = Number(
        settledRealJetBets.reduce((acc, b) => acc + b.amount, 0).toFixed(2)
      );
      const totalRealPayoutKz = Number(
        settledRealJetBets
          .filter((b) => b.status === 'CASHED_OUT')
          .reduce((acc, b) => acc + b.payout, 0)
          .toFixed(2)
      );
      const houseProfitKz = Number((totalRealWageredKz - totalRealPayoutKz).toFixed(2));
      const rtpPercent =
        totalRealWageredKz > 0
          ? Number(((totalRealPayoutKz / totalRealWageredKz) * 100).toFixed(2))
          : 0;

      const todayKey = this.getAngolaDayKey(new Date());
      const crashedRounds = this.memJetRounds.filter((r) => r.status === 'CRASHED');
      const roundsToday = crashedRounds.filter(
        (r) => this.getAngolaDayKey(new Date(r.createdAtIso)) === todayKey
      ).length;

      const biggestWins: PalancaJetBiggestWin[] = settledRealJetBets
        .filter((b) => b.status === 'CASHED_OUT' && b.payout > 0)
        .sort((a, b) => b.payout - a.payout)
        .slice(0, 10)
        .map((b) => ({
          id: b.id,
          roundNumber: b.roundNumber,
          maskedName: b.maskedName,
          amount: b.amount,
          cashoutMultiplier: b.cashoutMultiplier || 1,
          payout: b.payout,
          createdAt: b.createdAtDisplay
        }));

      const jetStats: PalancaJetAdminStats = {
        totalRealBets: settledRealJetBets.length,
        totalRealWageredKz,
        totalRealPayoutKz,
        houseProfitKz,
        rtpPercent,
        roundsToday,
        totalRounds: crashedRounds.length,
        biggestWins
      };

      return {
        storageMode: 'memory',
        totalUsers: players.length,
        totalMatches: this.memMatches.length,
        totalDepositsKz,
        totalDepositsUsdt,
        totalCommissionKz,
        totalCommissionUsdt,
        jetStats,
        players,
        transactions: this.memTransactions.slice(0, 200),
        supportTickets: this.memTickets.slice(0, 100),
        matchHistory: this.memMatches.slice(0, 100)
      };
    }

    const [usersRes, txRes, matchRes, tickRes, aggRes, jetAggRes, jetRoundsRes, biggestWinsRes] =
      await Promise.all([
        this.pool.query(
          `SELECT id, name, phone, email, category, kz_balance, usdt_balance, demo_kz_balance, matches_played, wins, losses, is_suspended, created_at
           FROM users ORDER BY created_at DESC LIMIT 200`
        ),
        this.pool.query(`SELECT * FROM transactions ORDER BY created_at DESC LIMIT 200`),
        this.pool.query(`SELECT * FROM match_history ORDER BY finished_at DESC LIMIT 100`),
        this.pool.query(`SELECT * FROM support_tickets ORDER BY updated_at DESC LIMIT 100`),
        this.pool.query(`
          SELECT
            (SELECT COUNT(*)::int FROM users) AS total_users,
            (SELECT COUNT(*)::int FROM match_history) AS total_matches,
            COALESCE((SELECT SUM(amount) FROM transactions WHERE type = 'DEPOSIT' AND currency = 'KZ' AND status = 'Confirmado'), 0) AS total_dep_kz,
            COALESCE((SELECT SUM(amount) FROM transactions WHERE type = 'DEPOSIT' AND currency = 'USDT' AND status = 'Confirmado'), 0) AS total_dep_usdt,
            COALESCE((SELECT SUM(amount) FROM transactions WHERE type IN ('COMMISSION', 'THEME_UNLOCK') AND currency = 'KZ' AND status IN ('Pago', 'Confirmado')), 0) AS total_comm_kz,
            COALESCE((SELECT SUM(amount) FROM transactions WHERE type IN ('COMMISSION', 'THEME_UNLOCK') AND currency = 'USDT' AND status IN ('Pago', 'Confirmado')), 0) AS total_comm_usdt
        `),
        this.pool.query(`
          SELECT
            COUNT(*)::int AS total_real_bets,
            COALESCE(SUM(amount), 0) AS total_wagered,
            COALESCE(SUM(CASE WHEN status = 'CASHED_OUT' THEN payout ELSE 0 END), 0) AS total_payout
          FROM palanca_jet_bets
          WHERE is_demo = false AND status IN ('CASHED_OUT', 'LOST')
        `),
        this.pool.query(`
          SELECT
            COUNT(*)::int AS total_rounds,
            COUNT(*) FILTER (
              WHERE (created_at AT TIME ZONE 'Africa/Luanda')::date = (NOW() AT TIME ZONE 'Africa/Luanda')::date
            )::int AS rounds_today
          FROM palanca_jet_rounds
          WHERE status = 'CRASHED'
        `),
        this.pool.query(`
          SELECT id, round_number, masked_name, amount, cashout_multiplier, payout, created_at
          FROM palanca_jet_bets
          WHERE is_demo = false AND status = 'CASHED_OUT' AND payout > 0
          ORDER BY payout DESC
          LIMIT 10
        `)
      ]);

    const agg = aggRes.rows[0] || {};
    const jAgg = jetAggRes.rows[0] || {};
    const jRounds = jetRoundsRes.rows[0] || {};
    const totalRealWageredKz = Number(Number(jAgg.total_wagered ?? 0).toFixed(2));
    const totalRealPayoutKz = Number(Number(jAgg.total_payout ?? 0).toFixed(2));
    const houseProfitKz = Number((totalRealWageredKz - totalRealPayoutKz).toFixed(2));
    const rtpPercent =
      totalRealWageredKz > 0
        ? Number(((totalRealPayoutKz / totalRealWageredKz) * 100).toFixed(2))
        : 0;

    const biggestWins: PalancaJetBiggestWin[] = biggestWinsRes.rows.map((r) => ({
      id: String(r.id),
      roundNumber: Number(r.round_number ?? 0),
      maskedName: String(r.masked_name || 'Jo***'),
      amount: Number(r.amount ?? 0),
      cashoutMultiplier: Number(r.cashout_multiplier ?? 1),
      payout: Number(r.payout ?? 0),
      createdAt: formatDatePtAo(r.created_at as string | Date)
    }));

    const jetStats: PalancaJetAdminStats = {
      totalRealBets: Number(jAgg.total_real_bets ?? 0),
      totalRealWageredKz,
      totalRealPayoutKz,
      houseProfitKz,
      rtpPercent,
      roundsToday: Number(jRounds.rounds_today ?? 0),
      totalRounds: Number(jRounds.total_rounds ?? 0),
      biggestWins
    };

    const players: AdminPlayerSummary[] = usersRes.rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      phone: String(r.phone),
      email: String(r.email || ''),
      category: (r.category as PlayerCategory) || 'Bronze',
      kzBalance: Number(r.kz_balance ?? 0),
      usdtBalance: Number(r.usdt_balance ?? 0),
      demoKzBalance: Number(r.demo_kz_balance ?? 50000),
      matchesPlayed: Number(r.matches_played ?? 0),
      wins: Number(r.wins ?? 0),
      losses: Number(r.losses ?? 0),
      isSuspended: Boolean(r.is_suspended),
      createdAt: formatDatePtAo(r.created_at as string | Date)
    }));

    return {
      storageMode: 'postgres',
      totalUsers: Number(agg.total_users ?? players.length),
      totalMatches: Number(agg.total_matches ?? 0),
      totalDepositsKz: Number(agg.total_dep_kz ?? 0),
      totalDepositsUsdt: Number(agg.total_dep_usdt ?? 0),
      totalCommissionKz: Number(agg.total_comm_kz ?? 0),
      totalCommissionUsdt: Number(agg.total_comm_usdt ?? 0),
      jetStats,
      players,
      transactions: txRes.rows.map((r) => this.mapTransactionRow(r)),
      supportTickets: tickRes.rows.map((r) => this.mapTicketRow(r)),
      matchHistory: matchRes.rows.map((r) => this.mapMatchRow(r))
    };
  }

  // ---------- Responsible Gaming & Palanca Jet (Server-Authoritative) ----------

  async updateResponsibleGaming(params: {
    userId: string;
    dailyEntryLimitKz?: number | null;
    dailyLossLimitKz?: number | null;
    selfExclusionHours?: number | null;
  }): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
    const cleanEntryLimit =
      params.dailyEntryLimitKz === undefined
        ? undefined
        : params.dailyEntryLimitKz === null || Number(params.dailyEntryLimitKz) <= 0
        ? null
        : Math.round(Number(params.dailyEntryLimitKz));

    if (
      cleanEntryLimit !== undefined &&
      cleanEntryLimit !== null &&
      (!Number.isFinite(cleanEntryLimit) || cleanEntryLimit < 100 || cleanEntryLimit > 50_000_000)
    ) {
      return {
        ok: false,
        error: 'Limite diário de apostas deve ser entre 100 Kz e 50.000.000 Kz (ou desativado).'
      };
    }

    const cleanLossLimit =
      params.dailyLossLimitKz === undefined
        ? undefined
        : params.dailyLossLimitKz === null || Number(params.dailyLossLimitKz) <= 0
        ? null
        : Math.round(Number(params.dailyLossLimitKz));

    if (
      cleanLossLimit !== undefined &&
      cleanLossLimit !== null &&
      (!Number.isFinite(cleanLossLimit) || cleanLossLimit < 100 || cleanLossLimit > 50_000_000)
    ) {
      return {
        ok: false,
        error: 'Limite diário de perdas deve ser entre 100 Kz e 50.000.000 Kz (ou desativado).'
      };
    }

    let nextExclusionIso: string | undefined;
    if (params.selfExclusionHours !== undefined && params.selfExclusionHours !== null) {
      const hours = Math.round(Number(params.selfExclusionHours));
      if (!Number.isFinite(hours) || hours < 1 || hours > 24 * 90) {
        return { ok: false, error: 'Período de pausa temporária inválido.' };
      }
      nextExclusionIso = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    }

    if (!this.pool) {
      const u = this.memUsers.get(params.userId);
      if (!u) return { ok: false, error: 'Utilizador não encontrado.' };
      if (cleanEntryLimit !== undefined) u.dailyEntryLimitKz = cleanEntryLimit;
      if (cleanLossLimit !== undefined) u.dailyLossLimitKz = cleanLossLimit;
      if (nextExclusionIso !== undefined) u.selfExcludedUntil = nextExclusionIso;
      return { ok: true, user: this.sanitizeUser(u) };
    }

    const curRes = await this.pool.query(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [params.userId]);
    if (!curRes.rows[0]) return { ok: false, error: 'Utilizador não encontrado.' };
    const cur = this.mapUserRow(curRes.rows[0]);

    const finalEntryLimit = cleanEntryLimit !== undefined ? cleanEntryLimit : cur.dailyEntryLimitKz ?? null;
    const finalLossLimit = cleanLossLimit !== undefined ? cleanLossLimit : cur.dailyLossLimitKz ?? null;
    const finalExclusion = nextExclusionIso !== undefined ? nextExclusionIso : cur.selfExcludedUntil ?? null;

    const res = await this.pool.query(
      `UPDATE users
       SET daily_entry_limit_kz = $2,
           daily_loss_limit_kz = $3,
           self_excluded_until = $4::timestamptz,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [params.userId, finalEntryLimit, finalLossLimit, finalExclusion]
    );
    if (!res.rows[0]) return { ok: false, error: 'Utilizador não encontrado.' };
    return { ok: true, user: this.mapUserRow(res.rows[0]) };
  }

  private getAngolaDayKey(d: Date): string {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Luanda' }).format(d);
    } catch {
      return d.toISOString().slice(0, 10);
    }
  }

  private mapJetBetRow(r: Record<string, unknown>): PalancaJetBet {
    return {
      id: String(r.id),
      roundId: String(r.round_id),
      userId: String(r.user_id),
      maskedName: String(r.masked_name || 'Jo***'),
      slot: Number(r.slot) === 1 ? 1 : 0,
      isDemo: Boolean(r.is_demo),
      amount: Number(r.amount ?? 0),
      autoCashoutMultiplier:
        r.auto_cashout_multiplier !== null && r.auto_cashout_multiplier !== undefined
          ? Number(r.auto_cashout_multiplier)
          : null,
      cashoutMultiplier:
        r.cashout_multiplier !== null && r.cashout_multiplier !== undefined
          ? Number(r.cashout_multiplier)
          : null,
      payout: Number(r.payout ?? 0),
      status: r.status as PalancaJetBetStatus,
      createdAt: formatDatePtAo(r.created_at as string | Date)
    };
  }

  private toPublicJetBet(b: StoredJetBet): PalancaJetBet {
    return {
      id: b.id,
      roundId: b.roundId,
      userId: b.userId,
      maskedName: b.maskedName,
      slot: b.slot,
      isDemo: b.isDemo,
      amount: b.amount,
      autoCashoutMultiplier: b.autoCashoutMultiplier,
      cashoutMultiplier: b.cashoutMultiplier,
      payout: b.payout,
      status: b.status,
      createdAt: b.createdAtDisplay
    };
  }

  private getJetDailyStatsMem(userId: string): { wageredToday: number; netLossToday: number } {
    const todayKey = this.getAngolaDayKey(new Date());
    let wageredToday = 0;
    let payoutToday = 0;
    for (const b of this.memJetBets.values()) {
      if (
        b.userId === userId &&
        !b.isDemo &&
        b.status !== 'CANCELLED' &&
        b.status !== 'REFUNDED' &&
        this.getAngolaDayKey(new Date(b.createdAtIso)) === todayKey
      ) {
        wageredToday += b.amount;
        if (b.status === 'CASHED_OUT') payoutToday += b.payout;
      }
    }
    return {
      wageredToday: Number(wageredToday.toFixed(2)),
      netLossToday: Number(Math.max(0, wageredToday - payoutToday).toFixed(2))
    };
  }

  async recoverInterruptedJetRounds(): Promise<number> {
    if (!this.pool) {
      let refunded = 0;
      for (const r of this.memJetRounds) {
        if (r.status === 'BETTING' || r.status === 'FLYING') {
          r.status = 'REFUNDED';
        }
      }
      for (const b of this.memJetBets.values()) {
        if (b.status === 'PLACED') {
          b.status = 'REFUNDED';
          const u = this.memUsers.get(b.userId);
          if (u) {
            if (b.isDemo) {
              u.demoKzBalance = Number(((u.demoKzBalance ?? 0) + b.amount).toFixed(2));
            } else {
              u.kzBalance = Number((u.kzBalance + b.amount).toFixed(2));
              this.memTransactions.unshift({
                id: `tx_jref_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
                userId: u.id,
                userName: u.name,
                type: 'JET_REFUND',
                currency: 'KZ',
                amount: b.amount,
                fee: 0,
                status: 'Confirmado',
                method: 'MULTICAIXA_EXPRESS',
                reference: `JET-${b.roundNumber}`,
                notes: `Reembolso automático Palanca Jet (ronda #${b.roundNumber} interrompida no servidor)`,
                createdAt: formatDatePtAo(new Date())
              });
            }
          }
          refunded += 1;
        }
      }
      return refunded;
    }

    return this.withPgTransaction(async (client) => {
      const roundsRes = await client.query(
        `SELECT id FROM palanca_jet_rounds WHERE status IN ('BETTING', 'FLYING') FOR UPDATE`
      );
      if (roundsRes.rows.length === 0) return 0;

      const betsRes = await client.query(
        `SELECT * FROM palanca_jet_bets WHERE status = 'PLACED' FOR UPDATE`
      );
      let refundedCount = 0;

      for (const row of betsRes.rows) {
        const amount = Number(row.amount ?? 0);
        const userId = String(row.user_id);
        const roundNumber = Number(row.round_number ?? 0);
        const isDemo = Boolean(row.is_demo);

        if (isDemo) {
          await client.query(
            `UPDATE users SET demo_kz_balance = demo_kz_balance + $2, updated_at = NOW() WHERE id = $1`,
            [userId, amount]
          );
        } else {
          await client.query(
            `UPDATE users SET kz_balance = kz_balance + $2, updated_at = NOW() WHERE id = $1`,
            [userId, amount]
          );
          await client.query(
            `INSERT INTO transactions (
              id, user_id, user_name, type, currency, amount, fee, status, method, reference, notes
            ) VALUES ($1, $2, $3, 'JET_REFUND', 'KZ', $4, 0, 'Confirmado', 'MULTICAIXA_EXPRESS', $5, $6)`,
            [
              `tx_jref_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
              userId,
              String(row.user_name || 'Jogador'),
              amount,
              `JET-${roundNumber}`,
              `Reembolso automático Palanca Jet (ronda #${roundNumber} interrompida no servidor)`
            ]
          );
        }

        await client.query(`UPDATE palanca_jet_bets SET status = 'REFUNDED' WHERE id = $1`, [row.id]);
        refundedCount += 1;
      }

      await client.query(
        `UPDATE palanca_jet_rounds SET status = 'REFUNDED' WHERE status IN ('BETTING', 'FLYING')`
      );
      return refundedCount;
    });
  }

  async getLatestJetRoundNumber(): Promise<number> {
    if (!this.pool) {
      return this.memJetRounds.reduce((max, r) => Math.max(max, r.roundNumber), 0);
    }
    const res = await this.pool.query(
      `SELECT COALESCE(MAX(round_number), 0)::int AS max_num FROM palanca_jet_rounds`
    );
    return Number(res.rows[0]?.max_num ?? 0);
  }

  async createJetRound(params: {
    id: string;
    roundNumber: number;
    seedHash: string;
    serverSeed: string;
    crashPoint: number;
    houseEdgePercent: number;
    bettingEndsAtMs: number;
  }): Promise<void> {
    if (!this.pool) {
      this.memJetRounds.unshift({
        id: params.id,
        roundNumber: params.roundNumber,
        status: 'BETTING',
        seedHash: params.seedHash,
        serverSeed: params.serverSeed,
        crashPoint: params.crashPoint,
        houseEdgePercent: params.houseEdgePercent,
        bettingEndsAtMs: params.bettingEndsAtMs,
        flightStartedAtMs: 0,
        createdAtIso: new Date().toISOString()
      });
      if (this.memJetRounds.length > 150) {
        this.memJetRounds = this.memJetRounds.slice(0, 150);
      }
      return;
    }

    await this.pool.query(
      `INSERT INTO palanca_jet_rounds (
        id, round_number, status, seed_hash, server_seed, crash_point, house_edge_percent, betting_ends_at_ms
      ) VALUES ($1, $2, 'BETTING', $3, $4, $5, $6, $7)`,
      [
        params.id,
        params.roundNumber,
        params.seedHash,
        params.serverSeed,
        params.crashPoint,
        params.houseEdgePercent,
        params.bettingEndsAtMs
      ]
    );
  }

  async markJetRoundFlying(roundId: string, flightStartedAtMs: number): Promise<void> {
    if (!this.pool) {
      const r = this.memJetRounds.find((x) => x.id === roundId);
      if (r) {
        r.status = 'FLYING';
        r.flightStartedAtMs = flightStartedAtMs;
      }
      return;
    }
    await this.pool.query(
      `UPDATE palanca_jet_rounds SET status = 'FLYING', flight_started_at_ms = $2 WHERE id = $1`,
      [roundId, flightStartedAtMs]
    );
  }

  async placeJetBet(params: {
    roundId: string;
    roundNumber: number;
    userId: string;
    slot: 0 | 1;
    amount: number;
    isDemo: boolean;
    autoCashoutMultiplier: number | null;
  }): Promise<
    | { ok: true; bet: PalancaJetBet; user: User }
    | { ok: false; error: string }
  > {
    const cfg = await this.getPlatformConfig();
    const jCfg = cfg.jetConfig;
    if (!jCfg.enabled) {
      return { ok: false, error: 'O Palanca Jet está temporariamente pausado pelo administrador.' };
    }
    if (!params.isDemo && !jCfg.realMoneyEnabled) {
      return {
        ok: false,
        error: 'As apostas a dinheiro real no Palanca Jet estão pausadas pelo administrador. Use o Modo DEMO.'
      };
    }

    const amount = Math.round(Number(params.amount));
    if (!Number.isFinite(amount) || amount < jCfg.minBetKz || amount > jCfg.maxBetKz) {
      return {
        ok: false,
        error: `Aposta permitida entre ${jCfg.minBetKz.toLocaleString('pt-AO')} Kz e ${jCfg.maxBetKz.toLocaleString('pt-AO')} Kz.`
      };
    }

    let autoMult: number | null = null;
    if (params.autoCashoutMultiplier !== null && params.autoCashoutMultiplier !== undefined) {
      const parsed = Math.floor(Number(params.autoCashoutMultiplier) * 100) / 100;
      if (!Number.isFinite(parsed) || parsed < 1.05 || parsed > 1000) {
        return { ok: false, error: 'Levantamento automático deve ser entre 1.05x e 1000x.' };
      }
      autoMult = parsed;
    }

    const slot: 0 | 1 = params.slot === 1 ? 1 : 0;
    const betId = `jbet_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const nowDisplay = formatDatePtAo(new Date());

    if (!this.pool) {
      const round = this.memJetRounds.find((r) => r.id === params.roundId);
      if (!round || round.status !== 'BETTING') {
        return { ok: false, error: 'As apostas para esta ronda já fecharam.' };
      }

      const u = this.memUsers.get(params.userId);
      if (!u) return { ok: false, error: 'Sessão inválida. Inicie sessão novamente.' };
      if (u.isSuspended) return { ok: false, error: 'Conta suspensa.' };

      if (!params.isDemo && u.selfExcludedUntil && new Date(u.selfExcludedUntil).getTime() > Date.now()) {
        return {
          ok: false,
          error: `Autoexclusão ativa até ${formatDatePtAo(u.selfExcludedUntil)}. Apenas o Modo DEMO está disponível.`
        };
      }

      for (const b of this.memJetBets.values()) {
        if (
          b.roundId === params.roundId &&
          b.userId === params.userId &&
          b.slot === slot &&
          b.status === 'PLACED'
        ) {
          return { ok: false, error: `Já tem uma aposta ativa no Painel ${slot + 1} desta ronda.` };
        }
      }

      if (params.isDemo) {
        if ((u.demoKzBalance ?? 0) < amount) {
          return { ok: false, error: 'Saldo Demo KZ insuficiente para esta aposta.' };
        }
        u.demoKzBalance = Number(((u.demoKzBalance ?? 0) - amount).toFixed(2));
      } else {
        const statsToday = this.getJetDailyStatsMem(params.userId);
        if (u.dailyEntryLimitKz && statsToday.wageredToday + amount > u.dailyEntryLimitKz) {
          return {
            ok: false,
            error: `Limite diário de apostas (${u.dailyEntryLimitKz.toLocaleString('pt-AO')} Kz) atingido. Apostado hoje: ${statsToday.wageredToday.toLocaleString('pt-AO')} Kz.`
          };
        }
        if (u.dailyLossLimitKz && statsToday.netLossToday >= u.dailyLossLimitKz) {
          return {
            ok: false,
            error: `Limite diário de perdas (${u.dailyLossLimitKz.toLocaleString('pt-AO')} Kz) atingido. Faça uma pausa ou jogue no Modo DEMO.`
          };
        }
        if (u.kzBalance < amount) {
          return {
            ok: false,
            error: 'Saldo Real KZ insuficiente. Deposite na carteira ou use o Modo DEMO.'
          };
        }
        u.kzBalance = Number((u.kzBalance - amount).toFixed(2));

        this.memTransactions.unshift({
          id: `tx_jbet_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
          userId: u.id,
          userName: u.name,
          type: 'JET_BET',
          currency: 'KZ',
          amount,
          fee: 0,
          status: 'Confirmado',
          method: 'MULTICAIXA_EXPRESS',
          reference: `JET-${params.roundNumber}-P${slot + 1}`,
          notes: `Aposta Palanca Jet (Ronda #${params.roundNumber} · Painel ${slot + 1})`,
          createdAt: nowDisplay
        });
      }

      const stored: StoredJetBet = {
        id: betId,
        roundId: params.roundId,
        roundNumber: params.roundNumber,
        userId: u.id,
        userName: u.name,
        maskedName: maskPlayerName(u.name),
        slot,
        isDemo: params.isDemo,
        amount,
        autoCashoutMultiplier: autoMult,
        cashoutMultiplier: null,
        payout: 0,
        status: 'PLACED',
        createdAtIso: new Date().toISOString(),
        createdAtDisplay: nowDisplay
      };
      this.memJetBets.set(betId, stored);

      return { ok: true, bet: this.toPublicJetBet(stored), user: this.sanitizeUser(u) };
    }

    return this.withPgTransaction(async (client) => {
      const roundRes = await client.query(
        `SELECT status FROM palanca_jet_rounds WHERE id = $1 FOR UPDATE`,
        [params.roundId]
      );
      if (!roundRes.rows[0] || roundRes.rows[0].status !== 'BETTING') {
        return { ok: false, error: 'As apostas para esta ronda já fecharam.' };
      }

      const uRes = await client.query(`SELECT * FROM users WHERE id = $1 FOR UPDATE`, [params.userId]);
      const uRow = uRes.rows[0];
      if (!uRow) return { ok: false, error: 'Sessão inválida. Inicie sessão novamente.' };
      if (uRow.is_suspended) return { ok: false, error: 'Conta suspensa.' };

      if (!params.isDemo && uRow.self_excluded_until) {
        const exclTime = new Date(uRow.self_excluded_until as string | Date).getTime();
        if (exclTime > Date.now()) {
          return {
            ok: false,
            error: `Autoexclusão ativa até ${formatDatePtAo(uRow.self_excluded_until as string | Date)}. Apenas o Modo DEMO está disponível.`
          };
        }
      }

      const dupRes = await client.query(
        `SELECT id FROM palanca_jet_bets
         WHERE round_id = $1 AND user_id = $2 AND slot = $3 AND status = 'PLACED'
         LIMIT 1`,
        [params.roundId, params.userId, slot]
      );
      if (dupRes.rows.length > 0) {
        return { ok: false, error: `Já tem uma aposta ativa no Painel ${slot + 1} desta ronda.` };
      }

      let updUserRes;
      if (params.isDemo) {
        if (Number(uRow.demo_kz_balance ?? 0) < amount) {
          return { ok: false, error: 'Saldo Demo KZ insuficiente para esta aposta.' };
        }
        updUserRes = await client.query(
          `UPDATE users SET demo_kz_balance = demo_kz_balance - $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
          [params.userId, amount]
        );
      } else {
        const entryLimit =
          uRow.daily_entry_limit_kz !== null && uRow.daily_entry_limit_kz !== undefined
            ? Number(uRow.daily_entry_limit_kz)
            : null;
        const lossLimit =
          uRow.daily_loss_limit_kz !== null && uRow.daily_loss_limit_kz !== undefined
            ? Number(uRow.daily_loss_limit_kz)
            : null;

        if ((entryLimit && entryLimit > 0) || (lossLimit && lossLimit > 0)) {
          const dailyRes = await client.query(
            `SELECT
               COALESCE(SUM(amount), 0) AS wagered,
               COALESCE(SUM(CASE WHEN status = 'CASHED_OUT' THEN payout ELSE 0 END), 0) AS payouts
             FROM palanca_jet_bets
             WHERE user_id = $1
               AND is_demo = false
               AND status NOT IN ('CANCELLED', 'REFUNDED')
               AND (created_at AT TIME ZONE 'Africa/Luanda')::date = (NOW() AT TIME ZONE 'Africa/Luanda')::date`,
            [params.userId]
          );
          const wageredToday = Number(dailyRes.rows[0]?.wagered ?? 0);
          const payoutsToday = Number(dailyRes.rows[0]?.payouts ?? 0);
          const netLossToday = Math.max(0, wageredToday - payoutsToday);

          if (entryLimit && entryLimit > 0 && wageredToday + amount > entryLimit) {
            return {
              ok: false,
              error: `Limite diário de apostas (${entryLimit.toLocaleString('pt-AO')} Kz) atingido. Apostado hoje: ${wageredToday.toLocaleString('pt-AO')} Kz.`
            };
          }
          if (lossLimit && lossLimit > 0 && netLossToday >= lossLimit) {
            return {
              ok: false,
              error: `Limite diário de perdas (${lossLimit.toLocaleString('pt-AO')} Kz) atingido. Faça uma pausa ou jogue no Modo DEMO.`
            };
          }
        }

        if (Number(uRow.kz_balance ?? 0) < amount) {
          return {
            ok: false,
            error: 'Saldo Real KZ insuficiente. Deposite na carteira ou use o Modo DEMO.'
          };
        }
        updUserRes = await client.query(
          `UPDATE users SET kz_balance = kz_balance - $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
          [params.userId, amount]
        );

        await client.query(
          `INSERT INTO transactions (
            id, user_id, user_name, type, currency, amount, fee, status, method, reference, notes
          ) VALUES ($1, $2, $3, 'JET_BET', 'KZ', $4, 0, 'Confirmado', 'MULTICAIXA_EXPRESS', $5, $6)`,
          [
            `tx_jbet_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
            params.userId,
            String(uRow.name),
            amount,
            `JET-${params.roundNumber}-P${slot + 1}`,
            `Aposta Palanca Jet (Ronda #${params.roundNumber} · Painel ${slot + 1})`
          ]
        );
      }

      const masked = maskPlayerName(String(uRow.name));
      const insBet = await client.query(
        `INSERT INTO palanca_jet_bets (
          id, round_id, round_number, user_id, user_name, masked_name, slot, is_demo, amount, auto_cashout_multiplier, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PLACED')
        RETURNING *`,
        [
          betId,
          params.roundId,
          params.roundNumber,
          params.userId,
          String(uRow.name),
          masked,
          slot,
          params.isDemo,
          amount,
          autoMult
        ]
      );

      return {
        ok: true,
        bet: this.mapJetBetRow(insBet.rows[0]),
        user: this.mapUserRow(updUserRes.rows[0])
      };
    });
  }

  async cancelJetBet(params: {
    roundId: string;
    userId: string;
    slot: 0 | 1;
  }): Promise<{ ok: true; betId: string; user: User } | { ok: false; error: string }> {
    const slot: 0 | 1 = params.slot === 1 ? 1 : 0;

    if (!this.pool) {
      const round = this.memJetRounds.find((r) => r.id === params.roundId);
      if (!round || round.status !== 'BETTING') {
        return { ok: false, error: 'Já não é possível cancelar após o início do voo.' };
      }
      let target: StoredJetBet | undefined;
      for (const b of this.memJetBets.values()) {
        if (
          b.roundId === params.roundId &&
          b.userId === params.userId &&
          b.slot === slot &&
          b.status === 'PLACED'
        ) {
          target = b;
          break;
        }
      }
      if (!target) return { ok: false, error: 'Aposta ativa não encontrada neste painel.' };

      const u = this.memUsers.get(params.userId);
      if (!u) return { ok: false, error: 'Utilizador não encontrado.' };

      target.status = 'CANCELLED';
      if (target.isDemo) {
        u.demoKzBalance = Number(((u.demoKzBalance ?? 0) + target.amount).toFixed(2));
      } else {
        u.kzBalance = Number((u.kzBalance + target.amount).toFixed(2));
        this.memTransactions.unshift({
          id: `tx_jcan_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
          userId: u.id,
          userName: u.name,
          type: 'JET_REFUND',
          currency: 'KZ',
          amount: target.amount,
          fee: 0,
          status: 'Confirmado',
          method: 'MULTICAIXA_EXPRESS',
          reference: `JET-${target.roundNumber}-CANC`,
          notes: `Cancelamento de aposta Palanca Jet (Ronda #${target.roundNumber} · Painel ${slot + 1})`,
          createdAt: formatDatePtAo(new Date())
        });
      }
      return { ok: true, betId: target.id, user: this.sanitizeUser(u) };
    }

    return this.withPgTransaction(async (client) => {
      const roundRes = await client.query(
        `SELECT status FROM palanca_jet_rounds WHERE id = $1 FOR UPDATE`,
        [params.roundId]
      );
      if (!roundRes.rows[0] || roundRes.rows[0].status !== 'BETTING') {
        return { ok: false, error: 'Já não é possível cancelar após o início do voo.' };
      }

      const betRes = await client.query(
        `SELECT * FROM palanca_jet_bets
         WHERE round_id = $1 AND user_id = $2 AND slot = $3 AND status = 'PLACED'
         FOR UPDATE`,
        [params.roundId, params.userId, slot]
      );
      const bRow = betRes.rows[0];
      if (!bRow) return { ok: false, error: 'Aposta ativa não encontrada neste painel.' };

      await client.query(`UPDATE palanca_jet_bets SET status = 'CANCELLED' WHERE id = $1`, [bRow.id]);
      const amount = Number(bRow.amount ?? 0);
      const isDemo = Boolean(bRow.is_demo);

      const uUpd = isDemo
        ? await client.query(
            `UPDATE users SET demo_kz_balance = demo_kz_balance + $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
            [params.userId, amount]
          )
        : await client.query(
            `UPDATE users SET kz_balance = kz_balance + $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
            [params.userId, amount]
          );

      if (!isDemo) {
        await client.query(
          `INSERT INTO transactions (
            id, user_id, user_name, type, currency, amount, fee, status, method, reference, notes
          ) VALUES ($1, $2, $3, 'JET_REFUND', 'KZ', $4, 0, 'Confirmado', 'MULTICAIXA_EXPRESS', $5, $6)`,
          [
            `tx_jcan_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
            params.userId,
            String(bRow.user_name || 'Jogador'),
            amount,
            `JET-${bRow.round_number}-CANC`,
            `Cancelamento de aposta Palanca Jet (Ronda #${bRow.round_number} · Painel ${slot + 1})`
          ]
        );
      }

      return {
        ok: true,
        betId: String(bRow.id),
        user: this.mapUserRow(uUpd.rows[0])
      };
    });
  }

  async cashoutJetBet(params: {
    roundId: string;
    betId: string;
    userId: string;
    multiplier: number;
    maxWinKz: number;
  }): Promise<
    | { ok: true; bet: PalancaJetBet; user: User; payout: number }
    | { ok: false; error: string }
  > {
    const cleanMult = Math.max(1.01, Math.floor(Number(params.multiplier) * 100) / 100);
    const maxWin = Math.max(100, Math.round(Number(params.maxWinKz) || 500000));

    if (!this.pool) {
      const round = this.memJetRounds.find((r) => r.id === params.roundId);
      if (!round || round.status !== 'FLYING') {
        return { ok: false, error: 'Voo já terminou ou ainda não descolou.' };
      }
      const bet = this.memJetBets.get(params.betId);
      if (!bet || bet.roundId !== params.roundId || bet.userId !== params.userId) {
        return { ok: false, error: 'Aposta não encontrada.' };
      }
      if (bet.status !== 'PLACED') {
        return { ok: false, error: 'Esta aposta já foi levantada ou encerrada.' };
      }

      const rawPayout = Number((bet.amount * cleanMult).toFixed(2));
      const payout = Math.min(maxWin, rawPayout);
      bet.status = 'CASHED_OUT';
      bet.cashoutMultiplier = cleanMult;
      bet.payout = payout;

      const u = this.memUsers.get(params.userId);
      if (!u) return { ok: false, error: 'Utilizador não encontrado.' };

      if (bet.isDemo) {
        u.demoKzBalance = Number(((u.demoKzBalance ?? 0) + payout).toFixed(2));
      } else {
        u.kzBalance = Number((u.kzBalance + payout).toFixed(2));
        u.matchesPlayed += 1;
        u.wins += 1;
        u.totalEarnedKz = Number((u.totalEarnedKz + payout).toFixed(2));
        u.category = computeCategory(u.wins);

        this.memTransactions.unshift({
          id: `tx_jwin_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
          userId: u.id,
          userName: u.name,
          type: 'JET_WIN',
          currency: 'KZ',
          amount: payout,
          fee: 0,
          status: 'Pago',
          method: 'MULTICAIXA_EXPRESS',
          reference: `JET-${bet.roundNumber}-${cleanMult.toFixed(2)}x`,
          notes: `Prémio Palanca Jet (${cleanMult.toFixed(2)}x sobre ${bet.amount.toLocaleString('pt-AO')} Kz)`,
          createdAt: formatDatePtAo(new Date())
        });
      }

      return { ok: true, bet: this.toPublicJetBet(bet), user: this.sanitizeUser(u), payout };
    }

    return this.withPgTransaction(async (client) => {
      const roundRes = await client.query(
        `SELECT status FROM palanca_jet_rounds WHERE id = $1`,
        [params.roundId]
      );
      if (!roundRes.rows[0] || roundRes.rows[0].status !== 'FLYING') {
        return { ok: false, error: 'Voo já terminou ou ainda não descolou.' };
      }

      const betRes = await client.query(
        `SELECT * FROM palanca_jet_bets WHERE id = $1 AND round_id = $2 AND user_id = $3 FOR UPDATE`,
        [params.betId, params.roundId, params.userId]
      );
      const bRow = betRes.rows[0];
      if (!bRow) return { ok: false, error: 'Aposta não encontrada.' };
      if (bRow.status !== 'PLACED') {
        return { ok: false, error: 'Esta aposta já foi levantada ou encerrada.' };
      }

      const stake = Number(bRow.amount ?? 0);
      const payout = Math.min(maxWin, Number((stake * cleanMult).toFixed(2)));
      const isDemo = Boolean(bRow.is_demo);

      const updBet = await client.query(
        `UPDATE palanca_jet_bets
         SET status = 'CASHED_OUT', cashout_multiplier = $2, payout = $3
         WHERE id = $1
         RETURNING *`,
        [params.betId, cleanMult, payout]
      );

      const uRes = await client.query(`SELECT * FROM users WHERE id = $1 FOR UPDATE`, [params.userId]);
      const uRow = uRes.rows[0];
      if (!uRow) return { ok: false, error: 'Utilizador não encontrado.' };

      let updUserRes;
      if (isDemo) {
        updUserRes = await client.query(
          `UPDATE users SET demo_kz_balance = demo_kz_balance + $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
          [params.userId, payout]
        );
      } else {
        const nextWins = Number(uRow.wins ?? 0) + 1;
        updUserRes = await client.query(
          `UPDATE users
           SET kz_balance = kz_balance + $2,
               matches_played = matches_played + 1,
               wins = wins + 1,
               total_earned_kz = total_earned_kz + $2,
               category = $3,
               updated_at = NOW()
           WHERE id = $1 RETURNING *`,
          [params.userId, payout, computeCategory(nextWins)]
        );

        await client.query(
          `INSERT INTO transactions (
            id, user_id, user_name, type, currency, amount, fee, status, method, reference, notes
          ) VALUES ($1, $2, $3, 'JET_WIN', 'KZ', $4, 0, 'Pago', 'MULTICAIXA_EXPRESS', $5, $6)`,
          [
            `tx_jwin_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
            params.userId,
            String(uRow.name),
            payout,
            `JET-${bRow.round_number}-${cleanMult.toFixed(2)}x`,
            `Prémio Palanca Jet (${cleanMult.toFixed(2)}x sobre ${stake.toLocaleString('pt-AO')} Kz)`
          ]
        );
      }

      return {
        ok: true,
        bet: this.mapJetBetRow(updBet.rows[0]),
        user: this.mapUserRow(updUserRes.rows[0]),
        payout
      };
    });
  }

  async settleJetRoundCrash(params: {
    roundId: string;
    crashPoint: number;
  }): Promise<{ affectedUsers: User[]; settledBets: PalancaJetBet[] }> {
    const nowDisplay = formatDatePtAo(new Date());

    if (!this.pool) {
      const round = this.memJetRounds.find((r) => r.id === params.roundId);
      if (round) {
        round.status = 'CRASHED';
        round.crashedAtIso = new Date().toISOString();
      }

      const affectedMap = new Map<string, User>();
      const settledBets: PalancaJetBet[] = [];
      const realParticipants = new Map<string, { name: string; staked: number; payout: number }>();

      for (const b of this.memJetBets.values()) {
        if (b.roundId !== params.roundId) continue;

        if (b.status === 'PLACED') {
          b.status = 'LOST';
          b.payout = 0;
          const u = this.memUsers.get(b.userId);
          if (u && !b.isDemo) {
            u.matchesPlayed += 1;
            u.losses += 1;
            u.totalLostKz = Number((u.totalLostKz + b.amount).toFixed(2));
            u.category = computeCategory(u.wins);
            affectedMap.set(u.id, this.sanitizeUser(u));

            this.memTransactions.unshift({
              id: `tx_jlos_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
              userId: u.id,
              userName: u.name,
              type: 'JET_LOSS',
              currency: 'KZ',
              amount: b.amount,
              fee: 0,
              status: 'Confirmado',
              method: 'MULTICAIXA_EXPRESS',
              reference: `JET-${b.roundNumber}-CRASH`,
              notes: `Voo Palanca Jet terminou em ${params.crashPoint.toFixed(2)}x (Ronda #${b.roundNumber})`,
              createdAt: nowDisplay
            });
          }
        }

        if (b.status !== 'CANCELLED' && b.status !== 'REFUNDED') {
          settledBets.push(this.toPublicJetBet(b));
          if (!b.isDemo) {
            const cur = realParticipants.get(b.userId) || { name: b.userName, staked: 0, payout: 0 };
            cur.staked += b.amount;
            cur.payout += b.payout;
            realParticipants.set(b.userId, cur);
          }
        }
      }

      if (round && realParticipants.size > 0) {
        const totalStaked = Array.from(realParticipants.values()).reduce((s, p) => s + p.staked, 0);
        const totalPayout = Array.from(realParticipants.values()).reduce((s, p) => s + p.payout, 0);
        const topWinner = Array.from(realParticipants.entries()).sort(
          (a, b) => b[1].payout - a[1].payout
        )[0];

        this.memMatches.unshift({
          id: `mh_jet_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
          gameType: 'palanca_jet',
          roomId: round.id,
          roomCode: `JET-${round.roundNumber}`,
          roomName: `Palanca Jet #${round.roundNumber} · ${params.crashPoint.toFixed(2)}x`,
          winnerUserId: topWinner && topWinner[1].payout > 0 ? topWinner[0] : null,
          winnerName:
            topWinner && topWinner[1].payout > 0 ? topWinner[1].name : 'Banca N',
          winnerColor: null,
          currency: 'KZ',
          betAmount: totalStaked,
          totalPot: totalStaked,
          prizePool: totalPayout,
          platformCommission: Math.max(0, Number((totalStaked - totalPayout).toFixed(2))),
          isDemo: false,
          boardTheme: 'classic',
          players: Array.from(realParticipants.entries()).map(([uid, info]) => ({
            userId: uid,
            name: info.name,
            color: info.payout > 0 ? 'yellow' : 'red',
            isBot: false
          })),
          finishedAt: nowDisplay
        });
      }

      return { affectedUsers: Array.from(affectedMap.values()), settledBets };
    }

    return this.withPgTransaction(async (client) => {
      const roundUpd = await client.query(
        `UPDATE palanca_jet_rounds SET status = 'CRASHED', crashed_at = NOW() WHERE id = $1 RETURNING *`,
        [params.roundId]
      );
      const roundRow = roundUpd.rows[0];
      const roundNumber = Number(roundRow?.round_number ?? 0);

      const lostBetsRes = await client.query(
        `SELECT * FROM palanca_jet_bets WHERE round_id = $1 AND status = 'PLACED' FOR UPDATE`,
        [params.roundId]
      );

      const affectedMap = new Map<string, User>();
      for (const bRow of lostBetsRes.rows) {
        await client.query(`UPDATE palanca_jet_bets SET status = 'LOST', payout = 0 WHERE id = $1`, [
          bRow.id
        ]);

        if (!bRow.is_demo) {
          const uRes = await client.query(`SELECT * FROM users WHERE id = $1 FOR UPDATE`, [
            bRow.user_id
          ]);
          const uRow = uRes.rows[0];
          if (uRow) {
            const wins = Number(uRow.wins ?? 0);
            const updU = await client.query(
              `UPDATE users
               SET matches_played = matches_played + 1,
                   losses = losses + 1,
                   total_lost_kz = total_lost_kz + $2,
                   category = $3,
                   updated_at = NOW()
               WHERE id = $1 RETURNING *`,
              [bRow.user_id, Number(bRow.amount ?? 0), computeCategory(wins)]
            );
            affectedMap.set(String(bRow.user_id), this.mapUserRow(updU.rows[0]));

            await client.query(
              `INSERT INTO transactions (
                id, user_id, user_name, type, currency, amount, fee, status, method, reference, notes
              ) VALUES ($1, $2, $3, 'JET_LOSS', 'KZ', $4, 0, 'Confirmado', 'MULTICAIXA_EXPRESS', $5, $6)`,
              [
                `tx_jlos_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
                bRow.user_id,
                String(uRow.name),
                Number(bRow.amount ?? 0),
                `JET-${roundNumber}-CRASH`,
                `Voo Palanca Jet terminou em ${params.crashPoint.toFixed(2)}x (Ronda #${roundNumber})`
              ]
            );
          }
        }
      }

      const allBetsRes = await client.query(
        `SELECT * FROM palanca_jet_bets WHERE round_id = $1 AND status NOT IN ('CANCELLED', 'REFUNDED') ORDER BY created_at ASC`,
        [params.roundId]
      );
      const settledBets = allBetsRes.rows.map((r) => this.mapJetBetRow(r));

      const realRows = allBetsRes.rows.filter((r) => !r.is_demo);
      if (realRows.length > 0) {
        const realParticipants = new Map<string, { name: string; staked: number; payout: number }>();
        for (const r of realRows) {
          const uid = String(r.user_id);
          const cur = realParticipants.get(uid) || {
            name: String(r.user_name || 'Jogador'),
            staked: 0,
            payout: 0
          };
          cur.staked += Number(r.amount ?? 0);
          cur.payout += Number(r.payout ?? 0);
          realParticipants.set(uid, cur);
        }
        const totalStaked = Array.from(realParticipants.values()).reduce((s, p) => s + p.staked, 0);
        const totalPayout = Array.from(realParticipants.values()).reduce((s, p) => s + p.payout, 0);
        const topWinner = Array.from(realParticipants.entries()).sort(
          (a, b) => b[1].payout - a[1].payout
        )[0];

        await client.query(
          `INSERT INTO match_history (
            id, match_key, game_type, room_id, room_code, room_name, winner_user_id, winner_name, winner_color,
            currency, bet_amount, total_pot, prize_pool, platform_commission, is_demo, board_theme, players
          ) VALUES ($1, $2, 'palanca_jet', $3, $4, $5, $6, $7, NULL, 'KZ', $8, $8, $9, $10, false, 'classic', $11::jsonb)
          ON CONFLICT (match_key) DO NOTHING`,
          [
            `mh_jet_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
            `jet:${params.roundId}`,
            params.roundId,
            `JET-${roundNumber}`,
            `Palanca Jet #${roundNumber} · ${params.crashPoint.toFixed(2)}x`,
            topWinner && topWinner[1].payout > 0 ? topWinner[0] : null,
            topWinner && topWinner[1].payout > 0 ? topWinner[1].name : 'Banca N',
            totalStaked,
            totalPayout,
            Math.max(0, Number((totalStaked - totalPayout).toFixed(2))),
            JSON.stringify(
              Array.from(realParticipants.entries()).map(([uid, info]) => ({
                userId: uid,
                name: info.name,
                color: info.payout > 0 ? 'yellow' : 'red',
                isBot: false
              }))
            )
          ]
        );
      }

      return { affectedUsers: Array.from(affectedMap.values()), settledBets };
    });
  }

  async getJetHistory(limit = 25): Promise<PalancaJetHistoryRound[]> {
    if (!this.pool) {
      return this.memJetRounds
        .filter((r) => r.status === 'CRASHED')
        .sort((a, b) => b.roundNumber - a.roundNumber)
        .slice(0, limit)
        .map((r) => ({
          id: r.id,
          roundNumber: r.roundNumber,
          seedHash: r.seedHash,
          serverSeed: r.serverSeed,
          crashPoint: r.crashPoint,
          houseEdgePercent: r.houseEdgePercent,
          crashedAt: formatDatePtAo(r.crashedAtIso || r.createdAtIso)
        }));
    }

    const res = await this.pool.query(
      `SELECT id, round_number, seed_hash, server_seed, crash_point, house_edge_percent, crashed_at, created_at
       FROM palanca_jet_rounds
       WHERE status = 'CRASHED'
       ORDER BY round_number DESC
       LIMIT $1`,
      [limit]
    );
    return res.rows.map((r) => ({
      id: String(r.id),
      roundNumber: Number(r.round_number ?? 0),
      seedHash: String(r.seed_hash),
      serverSeed: String(r.server_seed),
      crashPoint: Number(r.crash_point ?? 1),
      houseEdgePercent: Number(r.house_edge_percent ?? 5),
      crashedAt: formatDatePtAo((r.crashed_at || r.created_at) as string | Date)
    }));
  }

  async getJetRoundByIdOrNumber(roundKey: string): Promise<{
    id: string;
    roundNumber: number;
    status: string;
    seedHash: string;
    serverSeed: string | null;
    crashPoint: number | null;
    houseEdgePercent: number;
    crashedAt: string | null;
  } | null> {
    const clean = String(roundKey || '').trim();
    if (!clean) return null;
    const asNum = /^\d+$/.test(clean) ? Number(clean) : -1;

    if (!this.pool) {
      const r = this.memJetRounds.find((x) => x.id === clean || (asNum > 0 && x.roundNumber === asNum));
      if (!r) return null;
      const isRevealed = r.status === 'CRASHED';
      return {
        id: r.id,
        roundNumber: r.roundNumber,
        status: r.status,
        seedHash: r.seedHash,
        serverSeed: isRevealed ? r.serverSeed : null,
        crashPoint: isRevealed ? r.crashPoint : null,
        houseEdgePercent: r.houseEdgePercent,
        crashedAt: r.crashedAtIso ? formatDatePtAo(r.crashedAtIso) : null
      };
    }

    const res = await this.pool.query(
      `SELECT * FROM palanca_jet_rounds WHERE id = $1 OR round_number = $2 ORDER BY round_number DESC LIMIT 1`,
      [clean, asNum]
    );
    const r = res.rows[0];
    if (!r) return null;
    const isRevealed = r.status === 'CRASHED';
    return {
      id: String(r.id),
      roundNumber: Number(r.round_number ?? 0),
      status: String(r.status),
      seedHash: String(r.seed_hash),
      serverSeed: isRevealed ? String(r.server_seed) : null,
      crashPoint: isRevealed ? Number(r.crash_point ?? 1) : null,
      houseEdgePercent: Number(r.house_edge_percent ?? 5),
      crashedAt: r.crashed_at ? formatDatePtAo(r.crashed_at as string | Date) : null
    };
  }

  private async withPgTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!this.pool) throw new Error('PostgreSQL pool not initialized');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

function cleanPhoneDigits(normPhone: string): number {
  return normPhone.replace(/\D/g, '').length;
}

export const db = new DatabaseRepository();
