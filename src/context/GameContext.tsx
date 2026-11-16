import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  User,
  Room,
  Transaction,
  SupportTicket,
  Currency,
  PaymentMethod,
  RankingPlayer,
  PaymentSettings,
  PlayerColor,
  BoardThemeId,
  PlatformConfig,
  ThemePriceConfig,
  MatchHistoryEntry,
  AdminOverview
} from '../types';
import { soundManager } from '../utils/soundEffects';
import { getNextPosition } from '../utils/ludoRules';
import { BOARD_THEMES } from '../utils/boardThemes';
import { getBaseCaptureSkill } from '../utils/captureSkills';

export type ActiveTab = 'dashboard' | 'game' | 'rooms' | 'wallet' | 'ranking' | 'support' | 'admin';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

interface GameContextType {
  currentUser: User;
  isLoggedIn: boolean;
  authLoading: boolean;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedRoom: Room | null;
  rooms: Room[];
  onlineCount: number;
  wsConnected: boolean;
  roomError: string | null;
  clearRoomError: () => void;
  pendingInviteCode: string | null;
  transactions: Transaction[];
  matchHistory: MatchHistoryEntry[];
  supportTickets: SupportTicket[];
  rankingList: RankingPlayer[];
  refreshRanking: () => Promise<void>;
  adminOverview: AdminOverview | null;
  refreshAdminOverview: () => Promise<void>;
  exchangeRate: { usdToKz: number; updatedAt: string; source: string };
  isMuted: boolean;
  toggleSound: () => void;
  register: (data: { name: string; phone: string; email?: string; password: string }) => Promise<ActionResult>;
  login: (params: { phone: string; password: string }) => Promise<ActionResult>;
  loginAdmin: (pin: string) => Promise<ActionResult>;
  logout: () => void;
  switchRole: (role: 'player' | 'admin') => void;
  // Real-time Multiplayer Game Actions
  createRoom: (params: {
    name: string;
    maxPlayers: 2 | 3 | 4;
    currency: Currency;
    betAmount: number;
    isPrivate: boolean;
    withBots?: boolean;
    preferredColor?: PlayerColor;
    boardTheme?: BoardThemeId;
  }) => string;
  joinRoom: (roomId: string) => void;
  joinRoomByCode: (code: string) => void;
  selectBaseColor: (color: PlayerColor) => void;
  selectBoardTheme: (themeId: BoardThemeId) => void;
  requestThemeUnlock: (params: {
    themeId: BoardThemeId;
    currency: Currency;
    method: PaymentMethod;
    reference: string;
    proofUrl?: string;
  }) => Promise<ActionResult>;
  addBotToRoom: () => void;
  startMatch: () => void;
  leaveCurrentRoom: () => void;
  restartMatch: () => void;
  rollDice: (options?: { instant?: boolean }) => void;
  movePiece: (pieceIndex: number) => void;
  respondSurrenderOffer: (decision: 'continue' | 'accept_defeat') => void;
  getRoomTurnTimer: (roomId: string) => number | undefined;
  subscribeTurnTimer: (listener: (roomId: string, seconds: number) => void) => () => void;
  sendChatMessage: (text: string) => void;
  // Financial Actions (100% Server-Authoritative)
  requestDeposit: (params: {
    currency: Currency;
    amount: number;
    method: PaymentMethod;
    network?: string;
    reference?: string;
    proofUrl?: string;
  }) => Promise<ActionResult>;
  requestWithdrawal: (params: {
    currency: Currency;
    amount: number;
    method: PaymentMethod;
    destination: string;
    network?: string;
  }) => Promise<ActionResult>;
  // Support Actions
  sendSupportMessage: (text: string, subject?: string) => Promise<ActionResult>;
  // Admin Actions
  adminApproveDeposit: (txId: string) => Promise<ActionResult>;
  adminRejectDeposit: (txId: string) => Promise<ActionResult>;
  adminApproveWithdrawal: (txId: string) => Promise<ActionResult>;
  adminRejectWithdrawal: (txId: string) => Promise<ActionResult>;
  adminReplySupport: (ticketId: string, text: string) => Promise<ActionResult>;
  adminToggleUserSuspension: (userId: string) => Promise<ActionResult>;
  // Payment Receiving Settings (Admin editable IBAN, Express, USDT)
  paymentSettings: PaymentSettings;
  updatePaymentSettings: (settings: Partial<PaymentSettings>) => Promise<ActionResult>;
  // Platform Percentages & Locked Theme Prices (Admin editable)
  platformConfig: PlatformConfig;
  updatePlatformConfig: (config: Partial<PlatformConfig>) => Promise<ActionResult>;
  getThemePrice: (themeId: BoardThemeId) => ThemePriceConfig;
  // Wallet Mode (Real vs Demo)
  walletMode: 'REAL' | 'DEMO';
  setWalletMode: (mode: 'REAL' | 'DEMO') => void;
  // Profile Editing
  updateProfile: (data: { name?: string; phone?: string; password?: string; avatar?: string }) => Promise<ActionResult>;
  // Admin PIN Protection
  isAdminUnlocked: boolean;
  unlockAdmin: (pin: string) => Promise<boolean>;
  lockAdmin: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'nti_auth_token';
const ADMIN_TOKEN_STORAGE_KEY = 'nti_admin_token';

const GUEST_USER: User = {
  id: '',
  name: 'Jogador',
  phone: '',
  email: '',
  avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=KingLudo&backgroundColor=ffc300,ff595e',
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
  createdAt: ''
};

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

function readStoredToken(key: string): string | null {
  try {
    return sessionStorage.getItem(key) || localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStoredToken(key: string, value: string | null) {
  try {
    if (value) {
      sessionStorage.setItem(key, value);
      localStorage.setItem(key, value);
    } else {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

async function apiJson<T>(
  url: string,
  options: {
    method?: string;
    token?: string | null;
    body?: unknown;
  } = {}
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  try {
    const headers: Record<string, string> = {};
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined
    });
    const parsed = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: String(parsed.error || 'Erro ao comunicar com o servidor.')
      };
    }
    return { ok: true, data: parsed as T };
  } catch {
    return {
      ok: false,
      status: 0,
      error: 'Sem ligação ao servidor. Tente novamente num instante.'
    };
  }
}

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authToken, setAuthToken] = useState<string | null>(() => readStoredToken(TOKEN_STORAGE_KEY));
  const [adminToken, setAdminToken] = useState<string | null>(() => readStoredToken(ADMIN_TOKEN_STORAGE_KEY));
  const [currentUser, setCurrentUser] = useState<User>(GUEST_USER);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(() => Boolean(readStoredToken(TOKEN_STORAGE_KEY) || readStoredToken(ADMIN_TOKEN_STORAGE_KEY)));
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isMuted, setIsMuted] = useState(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => Boolean(readStoredToken(ADMIN_TOKEN_STORAGE_KEY)));

  const [walletMode, setWalletModeState] = useState<'REAL' | 'DEMO'>(() => {
    try {
      return (sessionStorage.getItem('nti_wallet_mode') as 'REAL' | 'DEMO') || 'REAL';
    } catch {
      return 'REAL';
    }
  });

  const setWalletMode = (mode: 'REAL' | 'DEMO') => {
    setWalletModeState(mode);
    try {
      sessionStorage.setItem('nti_wallet_mode', mode);
    } catch {
      // ignore
    }
  };

  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig>(DEFAULT_PLATFORM_CONFIG);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchHistoryEntry[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [rankingList, setRankingList] = useState<RankingPlayer[]>([]);
  const [adminOverview, setAdminOverview] = useState<AdminOverview | null>(null);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('sala') || params.get('code');
      return code ? code.trim().toUpperCase() : null;
    } catch {
      return null;
    }
  });

  const wsRef = useRef<WebSocket | null>(null);
  const roomsRef = useRef<Room[]>([]);
  const currentUserRef = useRef<User>(currentUser);
  const authTokenRef = useRef<string | null>(authToken);
  const adminTokenRef = useRef<string | null>(adminToken);
  const isAdminUnlockedRef = useRef<boolean>(isAdminUnlocked);
  const victorySoundPlayedRef = useRef<Set<string>>(new Set());
  const turnTimersRef = useRef<Record<string, number>>({});
  const timerListenersRef = useRef<Set<(roomId: string, seconds: number) => void>>(new Set());

  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    authTokenRef.current = authToken;
  }, [authToken]);

  useEffect(() => {
    adminTokenRef.current = adminToken;
  }, [adminToken]);

  useEffect(() => {
    isAdminUnlockedRef.current = isAdminUnlocked;
  }, [isAdminUnlocked]);

  const getThemePrice = useCallback(
    (themeId: BoardThemeId): ThemePriceConfig => {
      return (
        platformConfig.themePrices[themeId] ||
        DEFAULT_PLATFORM_CONFIG.themePrices[themeId] || {
          priceKz: BOARD_THEMES[themeId]?.priceKz ?? 0,
          priceUsdt: BOARD_THEMES[themeId]?.priceUsdt ?? 0
        }
      );
    },
    [platformConfig.themePrices]
  );

  const getRoomTurnTimer = useCallback((roomId: string): number | undefined => {
    return turnTimersRef.current[roomId];
  }, []);

  const subscribeTurnTimer = useCallback((listener: (roomId: string, seconds: number) => void) => {
    timerListenersRef.current.add(listener);
    return () => {
      timerListenersRef.current.delete(listener);
    };
  }, []);

  const publishTurnTimer = useCallback((roomId: string, seconds: number) => {
    turnTimersRef.current[roomId] = seconds;
    timerListenersRef.current.forEach((fn) => fn(roomId, seconds));
  }, []);

  const clearRoomError = () => setRoomError(null);

  const exchangeRate = {
    usdToKz: 915.5,
    updatedAt: 'Mercado Interbancário BNA',
    source: 'Banco Nacional de Angola (BNA)'
  };

  const applyNormalizedPlatformConfig = useCallback((srvCfg?: Partial<PlatformConfig>) => {
    if (!srvCfg) return;
    setPlatformConfig({
      winnerPercent: Number(srvCfg.winnerPercent) || DEFAULT_PLATFORM_CONFIG.winnerPercent,
      commissionPercent: Number(srvCfg.commissionPercent) || DEFAULT_PLATFORM_CONFIG.commissionPercent,
      themePrices: {
        ...DEFAULT_PLATFORM_CONFIG.themePrices,
        ...(srvCfg.themePrices || {})
      }
    });
  }, []);

  const refreshRanking = useCallback(async () => {
    const res = await apiJson<{ ranking: RankingPlayer[] }>('/api/ranking');
    if (res.ok && Array.isArray(res.data.ranking)) {
      setRankingList(res.data.ranking);
    }
  }, []);

  const refreshAdminOverview = useCallback(async () => {
    const token = adminTokenRef.current;
    if (!token) return;
    const res = await apiJson<{ overview: AdminOverview }>('/api/admin/overview', { token });
    if (res.ok && res.data.overview) {
      setAdminOverview(res.data.overview);
    } else if (!res.ok && (res.status === 401 || res.status === 403)) {
      writeStoredToken(ADMIN_TOKEN_STORAGE_KEY, null);
      setAdminToken(null);
      setIsAdminUnlocked(false);
    }
  }, []);

  // Hydrate public settings & existing session from PostgreSQL backend on mount
  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      const [cfgRes, payRes, rankRes] = await Promise.all([
        apiJson<{ config: PlatformConfig }>('/api/platform-config'),
        apiJson<{ paymentSettings: PaymentSettings }>('/api/payment-settings'),
        apiJson<{ ranking: RankingPlayer[] }>('/api/ranking')
      ]);

      if (cancelled) return;
      if (cfgRes.ok && cfgRes.data.config) {
        applyNormalizedPlatformConfig(cfgRes.data.config);
      }
      if (payRes.ok && payRes.data.paymentSettings) {
        setPaymentSettings(payRes.data.paymentSettings);
      }
      if (rankRes.ok && Array.isArray(rankRes.data.ranking)) {
        setRankingList(rankRes.data.ranking);
      }

      const storedUserToken = readStoredToken(TOKEN_STORAGE_KEY);
      const storedAdminToken = readStoredToken(ADMIN_TOKEN_STORAGE_KEY);
      const sessionToken = storedUserToken || storedAdminToken;

      if (sessionToken) {
        const meRes = await apiJson<{
          user: User;
          transactions: Transaction[];
          matchHistory: MatchHistoryEntry[];
          supportTickets: SupportTicket[];
          paymentSettings: PaymentSettings;
          platformConfig: PlatformConfig;
        }>('/api/me', { token: sessionToken });

        if (!cancelled && meRes.ok && meRes.data.user) {
          setCurrentUser({
            ...meRes.data.user,
            role: storedAdminToken && !storedUserToken ? 'admin' : meRes.data.user.role
          });
          setTransactions(meRes.data.transactions || []);
          setMatchHistory(meRes.data.matchHistory || []);
          setSupportTickets(meRes.data.supportTickets || []);
          if (meRes.data.paymentSettings) setPaymentSettings(meRes.data.paymentSettings);
          if (meRes.data.platformConfig) applyNormalizedPlatformConfig(meRes.data.platformConfig);
          setIsLoggedIn(true);
          if (storedAdminToken) {
            setIsAdminUnlocked(true);
            if (!storedUserToken) setActiveTab('admin');
            const ovRes = await apiJson<{ overview: AdminOverview }>('/api/admin/overview', {
              token: storedAdminToken
            });
            if (!cancelled && ovRes.ok) {
              setAdminOverview(ovRes.data.overview);
            }
          }
        } else if (!cancelled) {
          writeStoredToken(TOKEN_STORAGE_KEY, null);
          writeStoredToken(ADMIN_TOKEN_STORAGE_KEY, null);
          setAuthToken(null);
          setAdminToken(null);
          setIsAdminUnlocked(false);
          setIsLoggedIn(false);
        }
      }

      if (!cancelled) {
        setAuthLoading(false);
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [applyNormalizedPlatformConfig]);

  // WebSocket Real-Time Multiplayer Connection
  useEffect(() => {
    let isDisposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = 800;

    const connectWs = () => {
      if (isDisposed) return;
      const originUrl = new URL(window.location.origin);
      const protocol = originUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${originUrl.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isDisposed) return;
        setWsConnected(true);
        retryDelay = 800;
        ws.send(
          JSON.stringify({
            type: 'auth:hello',
            token: authTokenRef.current || adminTokenRef.current || undefined,
            adminToken: adminTokenRef.current || undefined
          })
        );
      };

      ws.onmessage = (event) => {
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(event.data as string) as Record<string, unknown>;
        } catch {
          return;
        }

        const type = String(msg.type || '');

        if (type === 'user:sync') {
          const srvUser = msg.user as User | undefined;
          if (srvUser) {
            setCurrentUser((prev) => ({
              ...srvUser,
              role: isAdminUnlockedRef.current && !authTokenRef.current ? 'admin' : srvUser.role
            }));
          }
          if (Array.isArray(msg.transactions)) {
            setTransactions(msg.transactions as Transaction[]);
          }
          if (Array.isArray(msg.matchHistory)) {
            setMatchHistory(msg.matchHistory as MatchHistoryEntry[]);
          }
          return;
        }

        if (type === 'support:sync') {
          if (Array.isArray(msg.supportTickets)) {
            setSupportTickets(msg.supportTickets as SupportTicket[]);
          }
          return;
        }

        if (type === 'payment:settings') {
          const ps = msg.paymentSettings as PaymentSettings | undefined;
          if (ps) setPaymentSettings(ps);
          return;
        }

        if (type === 'platform:config') {
          applyNormalizedPlatformConfig(msg.config as Partial<PlatformConfig> | undefined);
          return;
        }

        if (type === 'admin:refresh') {
          if (isAdminUnlockedRef.current) {
            void refreshAdminOverview();
          }
          return;
        }

        if (type === 'rooms:list') {
          const list = (msg.rooms as Room[]) || [];
          for (const r of list) {
            publishTurnTimer(r.id, r.boardState.turnTimer);
          }
          setRooms(list);
          if (typeof msg.onlineCount === 'number') {
            setOnlineCount(msg.onlineCount);
          }
          return;
        }

        if (type === 'room:joined') {
          const joinedRoom = msg.room as Room;
          publishTurnTimer(joinedRoom.id, joinedRoom.boardState.turnTimer);
          setRooms((prev) => {
            const exists = prev.some((r) => r.id === joinedRoom.id);
            return exists ? prev.map((r) => (r.id === joinedRoom.id ? joinedRoom : r)) : [joinedRoom, ...prev];
          });
          setSelectedRoomId(joinedRoom.id);
          setActiveTab('game');
          setRoomError(null);
          return;
        }

        if (type === 'room:state') {
          const updatedRoom = msg.room as Room;
          publishTurnTimer(updatedRoom.id, updatedRoom.boardState.turnTimer);
          const prevRoom = roomsRef.current.find((r) => r.id === updatedRoom.id);

          const activeSlot = updatedRoom.players.find((p) => p.color === updatedRoom.boardState.currentTurnColor);
          if (
            updatedRoom.boardState.isRolling &&
            !prevRoom?.boardState.isRolling &&
            activeSlot?.userId !== currentUserRef.current.id
          ) {
            soundManager.playDiceRoll();
          }
          if (
            updatedRoom.boardState.captureEvent &&
            updatedRoom.boardState.captureEvent.text !== prevRoom?.boardState.captureEvent?.text
          ) {
            const roomTheme =
              updatedRoom.boardTheme || currentUserRef.current.selectedTheme || 'classic';
            const skill = getBaseCaptureSkill(
              roomTheme,
              updatedRoom.boardState.captureEvent.captorColor
            );
            soundManager.playCaptureSkill(skill.kind);
          }
          if (updatedRoom.chat.length > (prevRoom?.chat.length || 0)) {
            const lastMsg = updatedRoom.chat[updatedRoom.chat.length - 1];
            if (lastMsg && lastMsg.userId !== currentUserRef.current.id) {
              soundManager.playMessagePop();
            }
          }

          if (updatedRoom.boardState.winner && !prevRoom?.boardState.winner) {
            const mySlot = updatedRoom.players.find((p) => p.userId === currentUserRef.current.id);
            const winKey = `${updatedRoom.id}_${updatedRoom.boardState.winner}_${updatedRoom.players.map((p) => p.pieces.map((pc) => pc.position).join(',')).join('|')}`;
            if (mySlot && mySlot.color === updatedRoom.boardState.winner && !victorySoundPlayedRef.current.has(winKey)) {
              victorySoundPlayedRef.current.add(winKey);
              soundManager.playVictory();
            }
            void refreshRanking();
          }

          setRooms((prev) => {
            const exists = prev.some((r) => r.id === updatedRoom.id);
            return exists ? prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)) : [updatedRoom, ...prev];
          });
          return;
        }

        if (type === 'room:tick') {
          const tickRoomId = String(msg.roomId || '');
          const nextTimer = Number(msg.turnTimer);
          if (!tickRoomId || !Number.isFinite(nextTimer)) return;
          publishTurnTimer(tickRoomId, nextTimer);
          return;
        }

        if (type === 'error') {
          setRoomError(String(msg.message || 'Erro na sala multiplayer.'));
        }
      };

      ws.onclose = () => {
        if (isDisposed) return;
        setWsConnected(false);
        reconnectTimer = setTimeout(() => {
          retryDelay = Math.min(5000, retryDelay * 1.5);
          connectWs();
        }, retryDelay);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connectWs();

    return () => {
      isDisposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [applyNormalizedPlatformConfig, publishTurnTimer, refreshAdminOverview, refreshRanking]);

  // Re-sync WS session whenever token/adminToken changes
  useEffect(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'auth:hello',
          token: authToken || adminToken || undefined,
          adminToken: adminToken || undefined
        })
      );
    }
  }, [authToken, adminToken]);

  // Auto-join room from invite URL (?sala=AO-XXXX) once logged in & connected
  useEffect(() => {
    if (isLoggedIn && wsConnected && pendingInviteCode) {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'room:join_by_code', code: pendingInviteCode }));
        setPendingInviteCode(null);
        try {
          window.history.replaceState({}, '', window.location.pathname);
        } catch {
          // ignore
        }
      }
    }
  }, [isLoggedIn, wsConnected, pendingInviteCode]);

  // Init sound
  useEffect(() => {
    soundManager.init();
    setIsMuted(soundManager.isMuted);
  }, []);

  const toggleSound = () => {
    const next = !isMuted;
    soundManager.setMuted(next);
    setIsMuted(next);
  };

  // ---------- Auth Actions (PostgreSQL Backend) ----------

  const register = async (data: {
    name: string;
    phone: string;
    email?: string;
    password: string;
  }): Promise<ActionResult> => {
    const res = await apiJson<{
      user: User;
      token: string;
      transactions: Transaction[];
      matchHistory: MatchHistoryEntry[];
      supportTickets: SupportTicket[];
      paymentSettings: PaymentSettings;
      platformConfig: PlatformConfig;
    }>('/api/auth/register', { method: 'POST', body: data });

    if (!res.ok) {
      return { ok: false, error: res.error };
    }

    soundManager.playCoin();
    writeStoredToken(TOKEN_STORAGE_KEY, res.data.token);
    setAuthToken(res.data.token);
    setCurrentUser(res.data.user);
    setTransactions(res.data.transactions || []);
    setMatchHistory(res.data.matchHistory || []);
    setSupportTickets(res.data.supportTickets || []);
    if (res.data.paymentSettings) setPaymentSettings(res.data.paymentSettings);
    if (res.data.platformConfig) applyNormalizedPlatformConfig(res.data.platformConfig);
    setIsLoggedIn(true);
    setActiveTab('dashboard');
    void refreshRanking();
    return { ok: true };
  };

  const login = async (params: { phone: string; password: string }): Promise<ActionResult> => {
    const res = await apiJson<{
      user: User;
      token: string;
      transactions: Transaction[];
      matchHistory: MatchHistoryEntry[];
      supportTickets: SupportTicket[];
      paymentSettings: PaymentSettings;
      platformConfig: PlatformConfig;
    }>('/api/auth/login', { method: 'POST', body: params });

    if (!res.ok) {
      return { ok: false, error: res.error };
    }

    soundManager.playCoin();
    writeStoredToken(TOKEN_STORAGE_KEY, res.data.token);
    setAuthToken(res.data.token);
    setCurrentUser(res.data.user);
    setTransactions(res.data.transactions || []);
    setMatchHistory(res.data.matchHistory || []);
    setSupportTickets(res.data.supportTickets || []);
    if (res.data.paymentSettings) setPaymentSettings(res.data.paymentSettings);
    if (res.data.platformConfig) applyNormalizedPlatformConfig(res.data.platformConfig);
    setIsLoggedIn(true);
    setActiveTab('dashboard');
    void refreshRanking();
    return { ok: true };
  };

  const loginAdmin = async (pin: string): Promise<ActionResult> => {
    const res = await apiJson<{ token: string; user: User | null }>('/api/auth/admin', {
      method: 'POST',
      token: authToken || undefined,
      body: { pin }
    });

    if (!res.ok) {
      return { ok: false, error: res.error };
    }

    soundManager.playCoin();
    writeStoredToken(ADMIN_TOKEN_STORAGE_KEY, res.data.token);
    setAdminToken(res.data.token);
    setIsAdminUnlocked(true);
    if (res.data.user) {
      setCurrentUser((prev) => ({
        ...(res.data.user || prev),
        role: 'admin'
      }));
    } else {
      setCurrentUser((prev) => ({ ...prev, role: 'admin', name: 'Administrador N' }));
    }
    setIsLoggedIn(true);
    setActiveTab('admin');

    const ovRes = await apiJson<{ overview: AdminOverview }>('/api/admin/overview', {
      token: res.data.token
    });
    if (ovRes.ok) {
      setAdminOverview(ovRes.data.overview);
    }

    return { ok: true };
  };

  const unlockAdmin = async (pin: string): Promise<boolean> => {
    const res = await loginAdmin(pin);
    return res.ok;
  };

  const lockAdmin = () => {
    writeStoredToken(ADMIN_TOKEN_STORAGE_KEY, null);
    setAdminToken(null);
    setIsAdminUnlocked(false);
    setAdminOverview(null);
    if (!authToken) {
      setIsLoggedIn(false);
      setCurrentUser(GUEST_USER);
      try {
        sessionStorage.setItem('nti_auth_mode', 'admin');
      } catch {
        // ignore
      }
    } else {
      setCurrentUser((u) => ({ ...u, role: 'player' }));
      setActiveTab('dashboard');
    }
  };

  const logout = () => {
    if (selectedRoomId) {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'room:leave', roomId: selectedRoomId }));
      }
    }
    writeStoredToken(TOKEN_STORAGE_KEY, null);
    writeStoredToken(ADMIN_TOKEN_STORAGE_KEY, null);
    setAuthToken(null);
    setAdminToken(null);
    setIsLoggedIn(false);
    setIsAdminUnlocked(false);
    setAdminOverview(null);
    setCurrentUser(GUEST_USER);
    setTransactions([]);
    setMatchHistory([]);
    setSupportTickets([]);
    setSelectedRoomId('');
    try {
      sessionStorage.setItem('nti_auth_mode', 'login');
    } catch {
      // ignore
    }
    setActiveTab('dashboard');
  };

  const switchRole = (role: 'player' | 'admin') => {
    setCurrentUser((prev) => ({ ...prev, role }));
  };

  const updateProfile = async (data: {
    name?: string;
    phone?: string;
    password?: string;
    avatar?: string;
  }): Promise<ActionResult> => {
    const token = authToken || adminToken;
    if (!token) return { ok: false, error: 'Sessão expirada.' };

    const res = await apiJson<{ user: User }>('/api/me', {
      method: 'PATCH',
      token,
      body: data
    });

    if (!res.ok) {
      return { ok: false, error: res.error };
    }

    soundManager.playCoin();
    setCurrentUser(res.data.user);
    return { ok: true };
  };

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) || null;

  const sendWs = (payload: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
      return true;
    }
    setRoomError('A ligar ao servidor online... Tente novamente num instante.');
    return false;
  };

  // ---------- Gameplay Actions ----------

  const rollDice = (options?: { instant?: boolean }) => {
    if (!selectedRoom || selectedRoom.status !== 'PLAYING') return;
    const mySlot = selectedRoom.players.find((p) => p.userId === currentUser.id);
    if (!mySlot || selectedRoom.boardState.currentTurnColor !== mySlot.color) return;
    if (selectedRoom.boardState.hasRolled || selectedRoom.boardState.isRolling) return;

    if (options?.instant) {
      soundManager.playDiceTap();
    } else {
      soundManager.playDiceRoll();
    }
    sendWs({ type: 'game:roll', roomId: selectedRoom.id, instant: Boolean(options?.instant) });
  };

  const movePiece = (pieceIndex: number) => {
    if (!selectedRoom || selectedRoom.status !== 'PLAYING') return;
    const mySlot = selectedRoom.players.find((p) => p.userId === currentUser.id);
    if (!mySlot || selectedRoom.boardState.currentTurnColor !== mySlot.color) return;
    if (!selectedRoom.boardState.hasRolled) return;
    if (!selectedRoom.boardState.eligiblePieces.includes(pieceIndex)) return;

    const targetPiece = mySlot.pieces.find((pc) => pc.id === pieceIndex);
    if (targetPiece) {
      const optimisticPos = getNextPosition(targetPiece, selectedRoom.boardState.diceValue);
      setRooms((prev) =>
        prev.map((r) =>
          r.id !== selectedRoom.id
            ? r
            : {
                ...r,
                players: r.players.map((p) =>
                  p.userId !== currentUser.id
                    ? p
                    : {
                        ...p,
                        pieces: p.pieces.map((pc) =>
                          pc.id === pieceIndex ? { ...pc, position: optimisticPos } : pc
                        )
                      }
                ),
                boardState: {
                  ...r.boardState,
                  hasRolled: false,
                  eligiblePieces: []
                }
              }
        )
      );
    }

    soundManager.playPieceMove();
    sendWs({ type: 'game:move', roomId: selectedRoom.id, pieceIndex });
  };

  const respondSurrenderOffer = (decision: 'continue' | 'accept_defeat') => {
    if (!selectedRoom || selectedRoom.status !== 'PLAYING') return;
    soundManager.playCoin();
    sendWs({ type: 'game:surrender_decision', roomId: selectedRoom.id, decision });
  };

  const selectBaseColor = (color: PlayerColor) => {
    if (!selectedRoom || selectedRoom.status !== 'WAITING') return;
    soundManager.playDiceTap();
    sendWs({ type: 'room:select_color', roomId: selectedRoom.id, color });
  };

  const selectBoardTheme = (themeId: BoardThemeId) => {
    const unlocked = currentUser.unlockedThemes || ['classic'];
    if (!unlocked.includes(themeId)) return;
    soundManager.playCoin();
    setCurrentUser((prev) => ({ ...prev, selectedTheme: themeId }));
    const token = authToken || adminToken;
    if (token) {
      void apiJson<{ user: User }>('/api/me', {
        method: 'PATCH',
        token,
        body: { selectedTheme: themeId }
      });
    }
    if (selectedRoom) {
      sendWs({ type: 'room:set_theme', roomId: selectedRoom.id, boardTheme: themeId });
    }
  };

  const requestThemeUnlock = async (params: {
    themeId: BoardThemeId;
    currency: Currency;
    method: PaymentMethod;
    reference: string;
    proofUrl?: string;
  }): Promise<ActionResult> => {
    const theme = BOARD_THEMES[params.themeId];
    if (!theme || theme.isFree) return { ok: false, error: 'Tabuleiro inválido.' };
    const token = authToken || adminToken;
    if (!token) return { ok: false, error: 'Inicie sessão primeiro.' };

    const dynamicPrice = getThemePrice(params.themeId);
    const amount = params.currency === 'KZ' ? dynamicPrice.priceKz : dynamicPrice.priceUsdt;

    const res = await apiJson<{ transaction: Transaction }>('/api/wallet/deposit', {
      method: 'POST',
      token,
      body: {
        type: 'THEME_UNLOCK',
        currency: params.currency,
        amount,
        method: params.method,
        reference: params.reference.trim(),
        proofUrl: params.proofUrl,
        themeId: theme.id,
        themeName: theme.name
      }
    });

    if (!res.ok) {
      return { ok: false, error: res.error };
    }

    soundManager.playCoin();
    setTransactions((prev) => [res.data.transaction, ...prev]);
    return { ok: true };
  };

  const addBotToRoom = () => {
    if (!selectedRoom) return;
    soundManager.playCoin();
    sendWs({ type: 'room:add_bot', roomId: selectedRoom.id });
  };

  const startMatch = () => {
    if (!selectedRoom) return;
    sendWs({ type: 'room:start', roomId: selectedRoom.id });
  };

  const restartMatch = () => {
    if (!selectedRoom) return;
    soundManager.playDiceRoll();
    sendWs({ type: 'game:restart', roomId: selectedRoom.id });
  };

  const sendChatMessage = (text: string) => {
    if (!selectedRoom || !text.trim()) return;
    soundManager.playMessagePop();
    sendWs({ type: 'game:chat', roomId: selectedRoom.id, text: text.trim() });
  };

  const createRoom = (params: {
    name: string;
    maxPlayers: 2 | 3 | 4;
    currency: Currency;
    betAmount: number;
    isPrivate: boolean;
    withBots?: boolean;
    preferredColor?: PlayerColor;
    boardTheme?: BoardThemeId;
  }): string => {
    const isDemoMatch = walletMode === 'DEMO' || params.betAmount === 0;

    if (params.betAmount > 0 && !isDemoMatch) {
      if (params.currency === 'KZ' && currentUser.kzBalance < params.betAmount) {
        setRoomError(
          'Saldo Real KZ insuficiente para esta aposta. Use o Modo DEMO ou valor 0 Kz (Amigável) para jogar grátis!'
        );
        return '';
      }
      if (params.currency === 'USDT' && currentUser.usdtBalance < params.betAmount) {
        setRoomError(
          'Saldo Real USDT insuficiente para esta aposta. Use o Modo DEMO ou valor 0 (Amigável)!'
        );
        return '';
      }
    }

    const unlocked = currentUser.unlockedThemes || ['classic'];
    const chosenTheme =
      params.boardTheme && unlocked.includes(params.boardTheme)
        ? params.boardTheme
        : currentUser.selectedTheme && unlocked.includes(currentUser.selectedTheme)
        ? currentUser.selectedTheme
        : 'classic';

    sendWs({
      type: 'room:create',
      name: params.name,
      maxPlayers: params.maxPlayers,
      currency: params.currency,
      betAmount: params.betAmount,
      isPrivate: params.isPrivate,
      withBots: Boolean(params.withBots),
      isDemo: isDemoMatch,
      preferredColor: params.preferredColor,
      boardTheme: chosenTheme
    });
    return 'pending';
  };

  const joinRoom = (roomId: string) => {
    setRoomError(null);
    sendWs({ type: 'room:join', roomId });
  };

  const joinRoomByCode = (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      setRoomError('Introduza o código da sala do seu amigo (ex: AO-4829).');
      return;
    }
    setRoomError(null);
    sendWs({ type: 'room:join_by_code', code: clean });
  };

  const leaveCurrentRoom = () => {
    if (selectedRoom) {
      sendWs({ type: 'room:leave', roomId: selectedRoom.id });
    }
    setSelectedRoomId('');
    setActiveTab('rooms');
  };

  // ---------- Financial Requests (100% Server-Authoritative) ----------

  const requestDeposit = async (params: {
    currency: Currency;
    amount: number;
    method: PaymentMethod;
    network?: string;
    reference?: string;
    proofUrl?: string;
  }): Promise<ActionResult> => {
    const token = authToken || adminToken;
    if (!token) return { ok: false, error: 'Sessão expirada.' };

    const res = await apiJson<{ transaction: Transaction }>('/api/wallet/deposit', {
      method: 'POST',
      token,
      body: {
        type: 'DEPOSIT',
        currency: params.currency,
        amount: params.amount,
        method: params.method,
        network: params.network,
        reference: params.reference,
        proofUrl: params.proofUrl
      }
    });

    if (!res.ok) {
      return { ok: false, error: res.error };
    }

    soundManager.playCoin();
    setTransactions((prev) => [res.data.transaction, ...prev]);
    return { ok: true };
  };

  const requestWithdrawal = async (params: {
    currency: Currency;
    amount: number;
    method: PaymentMethod;
    destination: string;
    network?: string;
  }): Promise<ActionResult> => {
    const token = authToken || adminToken;
    if (!token) return { ok: false, error: 'Sessão expirada.' };

    const res = await apiJson<{ user: User; transaction: Transaction }>('/api/wallet/withdraw', {
      method: 'POST',
      token,
      body: params
    });

    if (!res.ok) {
      return { ok: false, error: res.error };
    }

    soundManager.playCoin();
    if (res.data.user) {
      setCurrentUser(res.data.user);
    }
    setTransactions((prev) => [res.data.transaction, ...prev]);
    return { ok: true };
  };

  // ---------- Support ----------

  const sendSupportMessage = async (text: string, subject?: string): Promise<ActionResult> => {
    const token = authToken || adminToken;
    if (!token) return { ok: false, error: 'Sessão expirada.' };

    const res = await apiJson<{ ticket: SupportTicket; supportTickets: SupportTicket[] }>(
      '/api/support/message',
      {
        method: 'POST',
        token,
        body: { text, subject }
      }
    );

    if (!res.ok) {
      return { ok: false, error: res.error };
    }

    soundManager.playMessagePop();
    setSupportTickets(res.data.supportTickets || []);
    return { ok: true };
  };

  // ---------- Admin Actions (100% Server-Authoritative) ----------

  const adminApproveDeposit = async (txId: string): Promise<ActionResult> => {
    if (!adminToken) return { ok: false, error: 'Sessão administrativa expirada.' };
    const res = await apiJson<{ transaction: Transaction; overview: AdminOverview }>(
      `/api/admin/deposits/${encodeURIComponent(txId)}/approve`,
      { method: 'POST', token: adminToken }
    );
    if (!res.ok) return { ok: false, error: res.error };
    soundManager.playCoin();
    if (res.data.overview) setAdminOverview(res.data.overview);
    return { ok: true };
  };

  const adminRejectDeposit = async (txId: string): Promise<ActionResult> => {
    if (!adminToken) return { ok: false, error: 'Sessão administrativa expirada.' };
    const res = await apiJson<{ transaction: Transaction; overview: AdminOverview }>(
      `/api/admin/deposits/${encodeURIComponent(txId)}/reject`,
      { method: 'POST', token: adminToken }
    );
    if (!res.ok) return { ok: false, error: res.error };
    if (res.data.overview) setAdminOverview(res.data.overview);
    return { ok: true };
  };

  const adminApproveWithdrawal = async (txId: string): Promise<ActionResult> => {
    if (!adminToken) return { ok: false, error: 'Sessão administrativa expirada.' };
    const res = await apiJson<{ transaction: Transaction; overview: AdminOverview }>(
      `/api/admin/withdrawals/${encodeURIComponent(txId)}/approve`,
      { method: 'POST', token: adminToken }
    );
    if (!res.ok) return { ok: false, error: res.error };
    soundManager.playCoin();
    if (res.data.overview) setAdminOverview(res.data.overview);
    return { ok: true };
  };

  const adminRejectWithdrawal = async (txId: string): Promise<ActionResult> => {
    if (!adminToken) return { ok: false, error: 'Sessão administrativa expirada.' };
    const res = await apiJson<{ transaction: Transaction; overview: AdminOverview }>(
      `/api/admin/withdrawals/${encodeURIComponent(txId)}/reject`,
      { method: 'POST', token: adminToken }
    );
    if (!res.ok) return { ok: false, error: res.error };
    if (res.data.overview) setAdminOverview(res.data.overview);
    return { ok: true };
  };

  const adminReplySupport = async (ticketId: string, text: string): Promise<ActionResult> => {
    if (!adminToken) return { ok: false, error: 'Sessão administrativa expirada.' };
    const res = await apiJson<{ ticket: SupportTicket; overview: AdminOverview }>(
      `/api/admin/support/${encodeURIComponent(ticketId)}/reply`,
      { method: 'POST', token: adminToken, body: { text } }
    );
    if (!res.ok) return { ok: false, error: res.error };
    soundManager.playMessagePop();
    if (res.data.overview) setAdminOverview(res.data.overview);
    return { ok: true };
  };

  const adminToggleUserSuspension = async (userId: string): Promise<ActionResult> => {
    if (!adminToken) return { ok: false, error: 'Sessão administrativa expirada.' };
    const res = await apiJson<{ user: User; overview: AdminOverview }>(
      `/api/admin/users/${encodeURIComponent(userId)}/suspend`,
      { method: 'POST', token: adminToken }
    );
    if (!res.ok) return { ok: false, error: res.error };
    if (res.data.overview) setAdminOverview(res.data.overview);
    return { ok: true };
  };

  const updatePaymentSettings = async (newSettings: Partial<PaymentSettings>): Promise<ActionResult> => {
    if (!adminToken) return { ok: false, error: 'Sessão administrativa expirada.' };
    const res = await apiJson<{ paymentSettings: PaymentSettings }>('/api/admin/payment-settings', {
      method: 'PUT',
      token: adminToken,
      body: newSettings
    });
    if (!res.ok) return { ok: false, error: res.error };
    soundManager.playCoin();
    setPaymentSettings(res.data.paymentSettings);
    return { ok: true };
  };

  const updatePlatformConfig = async (incoming: Partial<PlatformConfig>): Promise<ActionResult> => {
    if (!adminToken) return { ok: false, error: 'Sessão administrativa expirada.' };
    const res = await apiJson<{ config: PlatformConfig }>('/api/admin/platform-config', {
      method: 'PUT',
      token: adminToken,
      body: incoming
    });
    if (!res.ok) return { ok: false, error: res.error };
    soundManager.playCoin();
    applyNormalizedPlatformConfig(res.data.config);
    return { ok: true };
  };

  return (
    <GameContext.Provider
      value={{
        currentUser,
        isLoggedIn,
        authLoading,
        activeTab,
        setActiveTab,
        selectedRoom,
        rooms,
        onlineCount,
        wsConnected,
        roomError,
        clearRoomError,
        pendingInviteCode,
        transactions,
        matchHistory,
        supportTickets,
        rankingList,
        refreshRanking,
        adminOverview,
        refreshAdminOverview,
        exchangeRate,
        isMuted,
        toggleSound,
        register,
        login,
        loginAdmin,
        logout,
        switchRole,
        createRoom,
        joinRoom,
        joinRoomByCode,
        selectBaseColor,
        selectBoardTheme,
        requestThemeUnlock,
        addBotToRoom,
        startMatch,
        leaveCurrentRoom,
        restartMatch,
        rollDice,
        movePiece,
        respondSurrenderOffer,
        getRoomTurnTimer,
        subscribeTurnTimer,
        sendChatMessage,
        requestDeposit,
        requestWithdrawal,
        sendSupportMessage,
        adminApproveDeposit,
        adminRejectDeposit,
        adminApproveWithdrawal,
        adminRejectWithdrawal,
        adminReplySupport,
        adminToggleUserSuspension,
        isAdminUnlocked,
        unlockAdmin,
        lockAdmin,
        paymentSettings,
        updatePaymentSettings,
        platformConfig,
        updatePlatformConfig,
        getThemePrice,
        walletMode,
        setWalletMode,
        updateProfile
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
