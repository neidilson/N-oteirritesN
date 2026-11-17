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
  }
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

  return { winnerPercent, commissionPercent, themePrices };
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
        createdAt: formatDatePtAo(new Date())
      };
      this.memUsers.set(userId, user);
      this.memPhoneIndex.set(normPhone, userId);
      return { ok: true, user: this.sanitizeUser(user), token: createSessionToken(userId, false) };
    }

    const existing = await this.pool.query(
      `SELECT id FROM users WHERE phone_normalized = $1 LIMIT 1`,
      [normPhone]
    );
    if (existing.rows.length > 0) {
      return { ok: false, error: 'Este número de telemóvel já está cadastrado. Faça login.' };
    }

    const res = await this.pool.query(
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
    return { ok: true, user, token: createSessionToken(user.id, false) };
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
    const amount = Number(params.amount);
    const minAmount = params.currency === 'KZ' ? 500 : 5;
    if (!Number.isFinite(amount) || amount < minAmount) {
      return {
        ok: false,
        error: `Valor mínimo de levantamento: ${minAmount} ${params.currency}.`
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
          return { ok: false, error: 'Saldo em Kz insuficiente para realizar este levantamento.' };
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

      const col = params.isDemo
        ? params.currency === 'KZ'
          ? 'demo_kz_balance'
          : 'demo_usdt_balance'
        : params.currency === 'KZ'
        ? 'kz_balance'
        : 'usdt_balance';

      const currentBal = Number(row[col] ?? 0);
      if (currentBal < amount) {
        return {
          ok: false,
          error: params.isDemo
            ? `Saldo Demo ${params.currency} insuficiente para esta aposta.`
            : `Saldo Real ${params.currency} insuficiente para esta aposta. Deposite na carteira ou use o Modo DEMO.`
        };
      }

      const updated = await client.query(
        `UPDATE users SET ${col} = ${col} - $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [params.userId, amount]
      );

      if (!params.isDemo) {
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
      }

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
      const col = params.isDemo
        ? params.currency === 'KZ'
          ? 'demo_kz_balance'
          : 'demo_usdt_balance'
        : params.currency === 'KZ'
        ? 'kz_balance'
        : 'usdt_balance';

      const res = await client.query(
        `UPDATE users SET ${col} = ${col} + $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [params.userId, amount]
      );
      if (!res.rows[0]) return null;

      if (!params.isDemo) {
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
      }

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
        .filter((t) => (t.type === 'COMMISSION' || t.type === 'THEME_UNLOCK') && t.currency === 'KZ' && (t.status === 'Pago' || t.status === 'Confirmado'))
        .reduce((acc, t) => acc + t.amount, 0);
      const totalCommissionUsdt = this.memTransactions
        .filter((t) => (t.type === 'COMMISSION' || t.type === 'THEME_UNLOCK') && t.currency === 'USDT' && (t.status === 'Pago' || t.status === 'Confirmado'))
        .reduce((acc, t) => acc + t.amount, 0);

      return {
        storageMode: 'memory',
        totalUsers: players.length,
        totalMatches: this.memMatches.length,
        totalDepositsKz,
        totalDepositsUsdt,
        totalCommissionKz,
        totalCommissionUsdt,
        players,
        transactions: this.memTransactions.slice(0, 200),
        supportTickets: this.memTickets.slice(0, 100),
        matchHistory: this.memMatches.slice(0, 100)
      };
    }

    const [usersRes, txRes, matchRes, tickRes, aggRes] = await Promise.all([
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
      `)
    ]);

    const agg = aggRes.rows[0] || {};
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
      players,
      transactions: txRes.rows.map((r) => this.mapTransactionRow(r)),
      supportTickets: tickRes.rows.map((r) => this.mapTicketRow(r)),
      matchHistory: matchRes.rows.map((r) => this.mapMatchRow(r))
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
