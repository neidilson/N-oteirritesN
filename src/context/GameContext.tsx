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
  BoardThemeId
} from '../types';
import { soundManager } from '../utils/soundEffects';
import { verifyAdminCredential } from '../utils/security';
import { getNextPosition } from '../utils/ludoRules';
import { BOARD_THEMES } from '../utils/boardThemes';

export type ActiveTab = 'dashboard' | 'game' | 'rooms' | 'wallet' | 'ranking' | 'support' | 'admin';

interface GameContextType {
  currentUser: User;
  isLoggedIn: boolean;
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
  supportTickets: SupportTicket[];
  rankingList: RankingPlayer[];
  exchangeRate: { usdToKz: number; updatedAt: string; source: string };
  isMuted: boolean;
  toggleSound: () => void;
  login: (userData: Partial<User>) => void;
  loginAdmin: (pin: string) => boolean;
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
  }) => void;
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
  // Financial Actions
  requestDeposit: (params: { currency: Currency; amount: number; method: PaymentMethod; network?: string; proofUrl?: string }) => void;
  requestWithdrawal: (params: { currency: Currency; amount: number; method: PaymentMethod; destination: string; network?: string }) => void;
  // Support Actions
  sendSupportMessage: (text: string, subject?: string) => void;
  // Admin Actions
  adminApproveDeposit: (txId: string) => void;
  adminRejectDeposit: (txId: string) => void;
  adminApproveWithdrawal: (txId: string) => void;
  adminRejectWithdrawal: (txId: string) => void;
  adminReplySupport: (ticketId: string, text: string) => void;
  adminToggleUserSuspension: (userId: string) => void;
  // Payment Receiving Settings (Admin editable IBAN, Express, USDT)
  paymentSettings: PaymentSettings;
  updatePaymentSettings: (settings: Partial<PaymentSettings>) => void;
  // Wallet Mode (Real vs Demo)
  walletMode: 'REAL' | 'DEMO';
  setWalletMode: (mode: 'REAL' | 'DEMO') => void;
  // Profile Editing (Game Avatars, Name, Phone, Password)
  updateProfile: (data: { name?: string; phone?: string; password?: string; avatar?: string }) => void;
  // Admin PIN Protection
  isAdminUnlocked: boolean;
  unlockAdmin: (pin: string) => boolean;
  lockAdmin: () => void;
  // Helpers
  simulateOTP: (phone: string) => string;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// Initial Mock User: Saldo Real ZERO por padrão (apenas recebe após depósito aprovado pelo Admin). Saldo Demo = 50.000 Kz.
const INITIAL_USER: User = {
  id: 'usr_ao_kassoma',
  name: 'Kassoma Manuel',
  phone: '+244 923 884 102',
  email: 'kassoma.manuel@ao.net',
  password: 'senhasegura2026',
  avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=KingLudo&backgroundColor=ffc300,ff595e',
  role: 'player',
  category: 'Bronze',
  kzBalance: 0, // Saldo Real ZERO rigoroso
  usdtBalance: 0, // Saldo Real ZERO rigoroso
  demoKzBalance: 50000, // Saldo Demo Simulado para jogar e treinar
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
  createdAt: '2026-01-15'
};

// Universal Payment Settings (Universal para todos que fizerem cadastro e depósitos)
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

function getSessionTabId(): string {
  try {
    let tabId = sessionStorage.getItem('nti_tab_uid');
    if (!tabId) {
      tabId = `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      sessionStorage.setItem('nti_tab_uid', tabId);
    }
    return tabId;
  } catch {
    return `usr_${Math.random().toString(36).slice(2, 9)}`;
  }
}

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const sessionSaved = sessionStorage.getItem('nti_session_user');
      if (sessionSaved) {
        const p = JSON.parse(sessionSaved);
        return {
          ...p,
          unlockedThemes: Array.isArray(p.unlockedThemes) && p.unlockedThemes.length > 0 ? p.unlockedThemes : ['classic'],
          selectedTheme: p.selectedTheme || 'classic'
        };
      }
      const saved = localStorage.getItem('nti_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          id: getSessionTabId(),
          kzBalance: parsed.kzBalance === 125000 ? 0 : (parsed.kzBalance ?? 0),
          usdtBalance: parsed.usdtBalance === 250 ? 0 : (parsed.usdtBalance ?? 0),
          demoKzBalance: parsed.demoKzBalance ?? 50000,
          demoUsdtBalance: parsed.demoUsdtBalance ?? 50,
          unlockedThemes: Array.isArray(parsed.unlockedThemes) && parsed.unlockedThemes.length > 0 ? parsed.unlockedThemes : ['classic'],
          selectedTheme: parsed.selectedTheme || 'classic',
          avatar: parsed.avatar || INITIAL_USER.avatar
        };
      }
      return { ...INITIAL_USER, id: getSessionTabId() };
    } catch {
      return { ...INITIAL_USER, id: getSessionTabId() };
    }
  });

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

  const updateProfile = (data: { name?: string; phone?: string; password?: string; avatar?: string }) => {
    soundManager.playCoin();
    setCurrentUser(prev => {
      const updated: User = {
        ...prev,
        name: data.name !== undefined && data.name.trim() !== '' ? data.name.trim() : prev.name,
        phone: data.phone !== undefined && data.phone.trim() !== '' ? data.phone.trim() : prev.phone,
        password: data.password !== undefined && data.password.trim() !== '' ? data.password.trim() : prev.password,
        avatar: data.avatar !== undefined && data.avatar.trim() !== '' ? data.avatar.trim() : prev.avatar
      };
      try {
        localStorage.setItem('nti_user', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('nti_is_logged_in') === 'true';
    } catch {
      return false;
    }
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'game' | 'rooms' | 'wallet' | 'ranking' | 'support' | 'admin'>('dashboard');
  const [isMuted, setIsMuted] = useState(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('nti_admin_unlocked') === 'true';
    } catch {
      return false;
    }
  });

  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(() => {
    try {
      const saved = localStorage.getItem('nti_payment_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // If old BAI IBAN is found, upgrade to universal BFA settings
        if (parsed.iban?.includes('8419') || parsed.bankName?.includes('BAI') || !parsed.iban) {
          return DEFAULT_PAYMENT_SETTINGS;
        }
        return parsed;
      }
      return DEFAULT_PAYMENT_SETTINGS;
    } catch {
      return DEFAULT_PAYMENT_SETTINGS;
    }
  });

  const updatePaymentSettings = (newSettings: Partial<PaymentSettings>) => {
    soundManager.playCoin();
    setPaymentSettings(prev => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('nti_payment_settings', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

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
  const awardedWinsRef = useRef<Set<string>>(new Set());
  const turnTimersRef = useRef<Record<string, number>>({});
  const timerListenersRef = useRef<Set<(roomId: string, seconds: number) => void>>(new Set());

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

  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const clearRoomError = () => setRoomError(null);

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('nti_txs');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [
      {
        id: 'tx_101',
        userId: INITIAL_USER.id,
        userName: INITIAL_USER.name,
        type: 'DEPOSIT',
        currency: 'KZ',
        amount: 50000,
        fee: 0,
        status: 'Em validação',
        method: 'MULTICAIXA_EXPRESS',
        reference: 'MCX-926020283-01',
        proofUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&auto=format&fit=crop&q=80',
        createdAt: '2026-11-12 09:15'
      },
      {
        id: 'tx_102',
        userId: INITIAL_USER.id,
        userName: INITIAL_USER.name,
        type: 'DEPOSIT',
        currency: 'USDT',
        amount: 250,
        fee: 0,
        status: 'Em validação',
        method: 'BINANCE',
        network: 'TRC20',
        reference: '0x9fa8e71c6d3381e',
        createdAt: '2026-11-12 08:30'
      },
      {
        id: 'tx_103',
        userId: INITIAL_USER.id,
        userName: INITIAL_USER.name,
        type: 'BET_WIN',
        currency: 'KZ',
        amount: 75000,
        fee: 0,
        status: 'Pago',
        method: 'MULTICAIXA_EXPRESS',
        reference: 'WIN-ROOM-482',
        createdAt: '2026-11-11 11:05'
      },
      {
        id: 'tx_104',
        userId: 'usr_rival_1',
        userName: 'Zito Bakita',
        type: 'DEPOSIT',
        currency: 'KZ',
        amount: 100000,
        fee: 0,
        status: 'Em validação',
        method: 'IBAN',
        reference: 'IBAN-AO06-449102',
        proofUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&auto=format&fit=crop&q=80',
        createdAt: '2026-11-11 13:40'
      },
      {
        id: 'tx_105',
        userId: 'usr_rival_2',
        userName: 'Mwene Kongo',
        type: 'WITHDRAW',
        currency: 'USDT',
        amount: 80,
        fee: 1,
        status: 'Pendente',
        method: 'BYBIT',
        network: 'TRC20',
        reference: 'WD-USDT-9941',
        createdAt: '2026-11-11 14:15'
      }
    ];
  });

  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([
    {
      id: 'tick_1',
      userId: INITIAL_USER.id,
      userName: INITIAL_USER.name,
      userPhone: INITIAL_USER.phone,
      subject: 'Dúvida sobre confirmação Multicaixa Express',
      status: 'RESOLVED',
      messages: [
        {
          id: 'sm_1',
          sender: 'user',
          text: 'Olá equipe N, o meu depósito por referência Multicaixa entra na hora?',
          timestamp: '10:00'
        },
        {
          id: 'sm_2',
          sender: 'admin',
          text: 'Olá Kassoma! Sim, após a validação da referência bancária os seus créditos KZ ficam disponíveis de imediato no saldo.',
          timestamp: '10:05'
        }
      ],
      createdAt: '2026-11-10',
      updatedAt: '2026-11-10'
    }
  ]);

  const [rankingList] = useState<RankingPlayer[]>([
    { id: '1', name: 'Valdemar Kalunga', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80', category: 'Lenda N', wins: 214, matchesPlayed: 260, winRate: 82.3, totalEarningsKz: 4250000, totalEarningsUsdt: 6800, score: 9850, rank: 1, country: 'Luanda' },
    { id: '2', name: 'Kassoma Manuel (Você)', avatar: INITIAL_USER.avatar, category: 'Ouro', wins: 34, matchesPlayed: 48, winRate: 70.8, totalEarningsKz: 840000, totalEarningsUsdt: 1200, score: 7420, rank: 2, country: 'Benguela' },
    { id: '3', name: 'Jandira dos Santos', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80', category: 'Diamante', wins: 142, matchesPlayed: 198, winRate: 71.7, totalEarningsKz: 2950000, totalEarningsUsdt: 3400, score: 6890, rank: 3, country: 'Huambo' },
    { id: '4', name: 'Zito Bakita', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80', category: 'Platina', wins: 89, matchesPlayed: 140, winRate: 63.5, totalEarningsKz: 1420000, totalEarningsUsdt: 950, score: 5120, rank: 4, country: 'Lubango' },
    { id: '5', name: 'Mwene Kongo', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=80', category: 'Ouro', wins: 62, matchesPlayed: 105, winRate: 59.0, totalEarningsKz: 980000, totalEarningsUsdt: 610, score: 4300, rank: 5, country: 'Cabinda' },
    { id: '6', name: 'Mauro Ndalatando', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=80', category: 'Prata', wins: 28, matchesPlayed: 56, winRate: 50.0, totalEarningsKz: 430000, totalEarningsUsdt: 180, score: 2800, rank: 6, country: 'Cuanza Norte' }
  ]);

  const exchangeRate = {
    usdToKz: 915.50,
    updatedAt: '11/11/2026 - 15:00',
    source: 'Banco Nacional de Angola (BNA) / Mercado Interbancário'
  };

  // Sync state to local/session storage independently so user updates don't re-serialize tx proofs
  useEffect(() => {
    try {
      sessionStorage.setItem('nti_session_user', JSON.stringify(currentUser));
      localStorage.setItem('nti_user', JSON.stringify(currentUser));
    } catch {
      // ignore
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem('nti_txs', JSON.stringify(transactions));
    } catch {
      // ignore
    }
  }, [transactions]);

  // WebSocket Real-Time Multiplayer Connection
  useEffect(() => {
    let isDisposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = 800;

    const connectWs = () => {
      if (isDisposed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isDisposed) return;
        setWsConnected(true);
        retryDelay = 800;
        const u = currentUserRef.current;
        ws.send(
          JSON.stringify({
            type: 'auth:hello',
            userId: u.id,
            userName: u.name,
            userAvatar: u.avatar,
            userCategory: u.category
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
          setRooms(prev => {
            const exists = prev.some(r => r.id === joinedRoom.id);
            return exists ? prev.map(r => (r.id === joinedRoom.id ? joinedRoom : r)) : [joinedRoom, ...prev];
          });
          setSelectedRoomId(joinedRoom.id);
          setActiveTab('game');
          setRoomError(null);
          return;
        }

        if (type === 'room:state') {
          const updatedRoom = msg.room as Room;
          publishTurnTimer(updatedRoom.id, updatedRoom.boardState.turnTimer);
          const prevRoom = roomsRef.current.find(r => r.id === updatedRoom.id);

          // Sound effects on server-authoritative state changes (only play roll sound for remote/bot turns so local throw never double-triggers)
          const activeSlot = updatedRoom.players.find(p => p.color === updatedRoom.boardState.currentTurnColor);
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
            soundManager.playCapture();
          }
          if (updatedRoom.chat.length > (prevRoom?.chat.length || 0)) {
            const lastMsg = updatedRoom.chat[updatedRoom.chat.length - 1];
            if (lastMsg && lastMsg.userId !== currentUserRef.current.id) {
              soundManager.playMessagePop();
            }
          }

          // Victory reward handling (idempotent)
          if (updatedRoom.boardState.winner && !prevRoom?.boardState.winner) {
            const mySlot = updatedRoom.players.find(p => p.userId === currentUserRef.current.id);
            const winKey = `${updatedRoom.id}_${updatedRoom.players.map(p => p.pieces.map(pc => pc.position).join(',')).join('|')}`;
            if (mySlot && mySlot.color === updatedRoom.boardState.winner && !awardedWinsRef.current.has(winKey)) {
              awardedWinsRef.current.add(winKey);
              soundManager.playVictory();
              if (updatedRoom.prizePool > 0) {
                setCurrentUser(u => {
                  if (updatedRoom.isDemo) {
                    return {
                      ...u,
                      demoKzBalance: updatedRoom.currency === 'KZ' ? (u.demoKzBalance ?? 50000) + updatedRoom.prizePool : u.demoKzBalance,
                      wins: u.wins + 1,
                      matchesPlayed: u.matchesPlayed + 1
                    };
                  }
                  return updatedRoom.currency === 'KZ'
                    ? { ...u, kzBalance: u.kzBalance + updatedRoom.prizePool, wins: u.wins + 1, matchesPlayed: u.matchesPlayed + 1, totalEarnedKz: u.totalEarnedKz + updatedRoom.prizePool }
                    : { ...u, usdtBalance: u.usdtBalance + updatedRoom.prizePool, wins: u.wins + 1, matchesPlayed: u.matchesPlayed + 1, totalEarnedUsdt: u.totalEarnedUsdt + updatedRoom.prizePool };
                });
              }
            }
          }

          setRooms(prev => {
            const exists = prev.some(r => r.id === updatedRoom.id);
            return exists ? prev.map(r => (r.id === updatedRoom.id ? updatedRoom : r)) : [updatedRoom, ...prev];
          });
          return;
        }

        if (type === 'room:tick') {
          const tickRoomId = String(msg.roomId || '');
          const nextTimer = Number(msg.turnTimer);
          if (!tickRoomId || !Number.isFinite(nextTimer)) return;
          // Update ONLY lightweight timer subscribers — ZERO full-board React re-renders per second!
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
  }, []);

  // Re-sync identity with WebSocket whenever profile (name/avatar/id) updates
  useEffect(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'auth:hello',
          userId: currentUser.id,
          userName: currentUser.name,
          userAvatar: currentUser.avatar,
          userCategory: currentUser.category
        })
      );
    }
  }, [currentUser.id, currentUser.name, currentUser.avatar, currentUser.category]);

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

  const login = (userData: Partial<User>) => {
    const uniqueId =
      currentUser.id && !currentUser.id.startsWith('usr_ao_kassoma')
        ? currentUser.id
        : getSessionTabId();
    const updated = { ...currentUser, ...userData, id: uniqueId };
    setCurrentUser(updated);
    setIsLoggedIn(true);
    try {
      sessionStorage.setItem('nti_is_logged_in', 'true');
      sessionStorage.setItem('nti_session_user', JSON.stringify(updated));
      localStorage.setItem('nti_user', JSON.stringify(updated));
    } catch {
      // ignore
    }
    setActiveTab('dashboard');
  };

  const loginAdmin = (pin: string): boolean => {
    if (verifyAdminCredential(pin)) {
      soundManager.playCoin();
      const updated: User = {
        ...currentUser,
        role: 'admin',
        name: 'Administrador N',
        category: 'Lenda N'
      };
      setCurrentUser(updated);
      setIsLoggedIn(true);
      setIsAdminUnlocked(true);
      try {
        sessionStorage.setItem('nti_is_logged_in', 'true');
        sessionStorage.setItem('nti_admin_unlocked', 'true');
        localStorage.setItem('nti_user', JSON.stringify(updated));
      } catch {
        // ignore
      }
      setActiveTab('admin');
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsLoggedIn(false);
    setIsAdminUnlocked(false);
    try {
      sessionStorage.removeItem('nti_is_logged_in');
      sessionStorage.removeItem('nti_admin_unlocked');
      sessionStorage.setItem('nti_auth_mode', 'login');
    } catch {
      // ignore
    }
    setActiveTab('dashboard');
  };

  const switchRole = (role: 'player' | 'admin') => {
    setCurrentUser(prev => ({ ...prev, role }));
  };

  const selectedRoom = rooms.find(r => r.id === selectedRoomId) || null;

  const sendWs = (payload: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
      return true;
    }
    setRoomError('A ligar ao servidor online... Tente novamente num instante.');
    return false;
  };

  // Player action: Roll Dice (Server-authoritative: instant click result or full board throw)
  const rollDice = (options?: { instant?: boolean }) => {
    if (!selectedRoom || selectedRoom.status !== 'PLAYING') return;
    const mySlot = selectedRoom.players.find(p => p.userId === currentUser.id);
    if (!mySlot || selectedRoom.boardState.currentTurnColor !== mySlot.color) return;
    if (selectedRoom.boardState.hasRolled || selectedRoom.boardState.isRolling) return;

    if (options?.instant) {
      soundManager.playDiceTap();
    } else {
      soundManager.playDiceRoll();
    }
    sendWs({ type: 'game:roll', roomId: selectedRoom.id, instant: Boolean(options?.instant) });
  };

  // Player action: Move Piece (Optimistic GPU move + Server-authoritative confirmation)
  const movePiece = (pieceIndex: number) => {
    if (!selectedRoom || selectedRoom.status !== 'PLAYING') return;
    const mySlot = selectedRoom.players.find(p => p.userId === currentUser.id);
    if (!mySlot || selectedRoom.boardState.currentTurnColor !== mySlot.color) return;
    if (!selectedRoom.boardState.hasRolled) return;
    if (!selectedRoom.boardState.eligiblePieces.includes(pieceIndex)) return;

    const targetPiece = mySlot.pieces.find(pc => pc.id === pieceIndex);
    if (targetPiece) {
      const optimisticPos = getNextPosition(targetPiece, selectedRoom.boardState.diceValue);
      setRooms(prev =>
        prev.map(r =>
          r.id !== selectedRoom.id
            ? r
            : {
                ...r,
                players: r.players.map(p =>
                  p.userId !== currentUser.id
                    ? p
                    : {
                        ...p,
                        pieces: p.pieces.map(pc =>
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

  // Player decision when opponent hits 2 pieces in goal: continue or accept defeat
  const respondSurrenderOffer = (decision: 'continue' | 'accept_defeat') => {
    if (!selectedRoom || selectedRoom.status !== 'PLAYING') return;
    soundManager.playCoin();
    sendWs({ type: 'game:surrender_decision', roomId: selectedRoom.id, decision });
  };

  // Select Base Color in Waiting Room
  const selectBaseColor = (color: PlayerColor) => {
    if (!selectedRoom || selectedRoom.status !== 'WAITING') return;
    soundManager.playDiceTap();
    sendWs({ type: 'room:select_color', roomId: selectedRoom.id, color });
  };

  // Select an unlocked Board Theme
  const selectBoardTheme = (themeId: BoardThemeId) => {
    const unlocked = currentUser.unlockedThemes || ['classic'];
    if (!unlocked.includes(themeId)) return;
    soundManager.playCoin();
    setCurrentUser(prev => ({ ...prev, selectedTheme: themeId }));
    if (selectedRoom) {
      sendWs({ type: 'room:set_theme', roomId: selectedRoom.id, boardTheme: themeId });
    }
  };

  // Request Theme Unlock via Real Payment (must be confirmed by Admin)
  const requestThemeUnlock = (params: {
    themeId: BoardThemeId;
    currency: Currency;
    method: PaymentMethod;
    reference: string;
    proofUrl?: string;
  }) => {
    const theme = BOARD_THEMES[params.themeId];
    if (!theme || theme.isFree) return;
    soundManager.playCoin();
    const amount = params.currency === 'KZ' ? theme.priceKz : theme.priceUsdt;
    const newTx: Transaction = {
      id: `tx_theme_${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      type: 'THEME_UNLOCK',
      currency: params.currency,
      amount,
      fee: 0,
      status: 'Em validação',
      method: params.method,
      reference: params.reference.trim() || `TEMA-${params.themeId.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      proofUrl: params.proofUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&auto=format&fit=crop&q=80',
      themeId: theme.id,
      themeName: theme.name,
      notes: `Desbloqueio de tabuleiro premium (${theme.name}). Aguardando confirmação real do Administrador N.`,
      createdAt: new Date().toLocaleString('pt-AO')
    };
    setTransactions(prev => [newTx, ...prev]);
  };

  // Add an optional AI Bot to the current WAITING room
  const addBotToRoom = () => {
    if (!selectedRoom) return;
    soundManager.playCoin();
    sendWs({ type: 'room:add_bot', roomId: selectedRoom.id });
  };

  // Start Match (Host starts manually once >= 2 players are seated)
  const startMatch = () => {
    if (!selectedRoom) return;
    sendWs({ type: 'room:start', roomId: selectedRoom.id });
  };

  // Restart match (recomeçar a partida e resetar o tabuleiro para todos os jogadores)
  const restartMatch = () => {
    if (!selectedRoom) return;
    soundManager.playDiceRoll();
    sendWs({ type: 'game:restart', roomId: selectedRoom.id });
  };

  // In-Game Chat (Server broadcast to all room players)
  const sendChatMessage = (text: string) => {
    if (!selectedRoom || !text.trim()) return;
    soundManager.playMessagePop();
    sendWs({ type: 'game:chat', roomId: selectedRoom.id, text: text.trim() });
  };

  // Create Room on Server (Supports Human-Only Invite Rooms OR Optional Play-vs-Bot Mode)
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
        setRoomError('Saldo Real KZ insuficiente para esta aposta. Use o Modo DEMO ou valor 0 Kz (Amigável) para jogar grátis!');
        return '';
      }
      if (params.currency === 'USDT' && currentUser.usdtBalance < params.betAmount) {
        setRoomError('Saldo Real USDT insuficiente para esta aposta. Use o Modo DEMO ou valor 0 (Amigável)!');
        return '';
      }
    }

    if (params.betAmount > 0) {
      if (isDemoMatch && params.currency === 'KZ') {
        setCurrentUser(u => ({ ...u, demoKzBalance: Math.max(0, (u.demoKzBalance ?? 50000) - params.betAmount) }));
      } else if (!isDemoMatch && params.currency === 'KZ') {
        setCurrentUser(u => ({ ...u, kzBalance: Math.max(0, u.kzBalance - params.betAmount) }));
      } else if (!isDemoMatch && params.currency === 'USDT') {
        setCurrentUser(u => ({ ...u, usdtBalance: Math.max(0, u.usdtBalance - params.betAmount) }));
      }
    }

    const unlocked = currentUser.unlockedThemes || ['classic'];
    const chosenTheme = params.boardTheme && unlocked.includes(params.boardTheme)
      ? params.boardTheme
      : (currentUser.selectedTheme && unlocked.includes(currentUser.selectedTheme) ? currentUser.selectedTheme : 'classic');

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

  // Financial request: Deposit
  const requestDeposit = (params: {
    currency: Currency;
    amount: number;
    method: PaymentMethod;
    network?: string;
    proofUrl?: string;
  }) => {
    soundManager.playCoin();
    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      type: 'DEPOSIT',
      currency: params.currency,
      amount: params.amount,
      fee: 0,
      status: 'Em validação',
      method: params.method,
      network: params.network,
      reference: `${params.method === 'MULTICAIXA_EXPRESS' ? 'MCX' : 'REF'}-${Math.floor(10000000 + Math.random() * 90000000)}`,
      proofUrl: params.proofUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&auto=format&fit=crop&q=80',
      notes: 'Depósito registrado pelo jogador. Aguardando aprovação administrativa.',
      createdAt: new Date().toLocaleString('pt-AO')
    };

    setTransactions(prev => [newTx, ...prev]);
  };

  // Financial request: Withdrawal
  const requestWithdrawal = (params: {
    currency: Currency;
    amount: number;
    method: PaymentMethod;
    destination: string;
    network?: string;
  }) => {
    // Verify sufficient balance
    if (params.currency === 'KZ' && currentUser.kzBalance < params.amount) {
      alert('Saldo em Kz insuficiente para realizar este levantamento.');
      return;
    }
    if (params.currency === 'USDT' && currentUser.usdtBalance < params.amount) {
      alert('Saldo em USDT insuficiente para realizar este levantamento.');
      return;
    }

    // Reserve balance
    if (params.currency === 'KZ') {
      setCurrentUser(u => ({ ...u, kzBalance: u.kzBalance - params.amount, kzReserved: u.kzReserved + params.amount }));
    } else {
      setCurrentUser(u => ({ ...u, usdtBalance: u.usdtBalance - params.amount, usdtReserved: u.usdtReserved + params.amount }));
    }

    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      type: 'WITHDRAW',
      currency: params.currency,
      amount: params.amount,
      fee: params.currency === 'KZ' ? 100 : 1,
      status: 'Pendente',
      method: params.method,
      network: params.network,
      reference: `RET-${Math.floor(100000 + Math.random() * 900000)}`,
      notes: `Destino: ${params.destination}`,
      createdAt: new Date().toLocaleString('pt-AO')
    };

    setTransactions(prev => [newTx, ...prev]);
  };

  // Support
  const sendSupportMessage = (text: string, subject?: string) => {
    soundManager.playMessagePop();
    const existing = supportTickets.find(t => t.userId === currentUser.id && t.status === 'OPEN');
    if (existing) {
      setSupportTickets(prev =>
        prev.map(t =>
          t.id === existing.id
            ? {
                ...t,
                messages: [
                  ...t.messages,
                  {
                    id: `sm_${Date.now()}`,
                    sender: 'user',
                    text,
                    timestamp: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })
                  }
                ],
                updatedAt: new Date().toISOString()
              }
            : t
        )
      );
    } else {
      const newTicket: SupportTicket = {
        id: `tick_${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.name,
        userPhone: currentUser.phone,
        subject: subject || 'Atendimento ao Jogador',
        status: 'OPEN',
        messages: [
          {
            id: `sm_${Date.now()}`,
            sender: 'user',
            text,
            timestamp: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })
          }
        ],
        createdAt: new Date().toLocaleDateString('pt-AO'),
        updatedAt: new Date().toISOString()
      };
      setSupportTickets(prev => [newTicket, ...prev]);
    }
  };

  // Admin Actions
  const adminApproveDeposit = (txId: string) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx || tx.status === 'Confirmado') return;

    soundManager.playCoin();

    // Handle Theme Unlock confirmation vs Balance Deposit confirmation
    if (tx.type === 'THEME_UNLOCK' && tx.themeId) {
      const themeId = tx.themeId;
      if (tx.userId === currentUser.id) {
        setCurrentUser(u => {
          const prevThemes = u.unlockedThemes || ['classic'];
          const nextThemes = prevThemes.includes(themeId) ? prevThemes : [...prevThemes, themeId];
          return { ...u, unlockedThemes: nextThemes, selectedTheme: themeId };
        });
      }
      setTransactions(prev =>
        prev.map(t =>
          t.id === txId
            ? { ...t, status: 'Confirmado', notes: `Pagamento real confirmado. Tabuleiro "${tx.themeName || themeId}" desbloqueado!` }
            : t
        )
      );
      return;
    }

    // Credit user balance
    if (tx.userId === currentUser.id) {
      if (tx.currency === 'KZ') {
        setCurrentUser(u => ({ ...u, kzBalance: u.kzBalance + tx.amount }));
      } else {
        setCurrentUser(u => ({ ...u, usdtBalance: u.usdtBalance + tx.amount }));
      }
    }

    setTransactions(prev =>
      prev.map(t => (t.id === txId ? { ...t, status: 'Confirmado', notes: 'Aprovado pelo Administrador N' } : t))
    );
  };

  const adminRejectDeposit = (txId: string) => {
    setTransactions(prev =>
      prev.map(t => (t.id === txId ? { ...t, status: 'Rejeitado', notes: 'Comprovativo inválido ou pagamento não confirmado' } : t))
    );
  };

  const adminApproveWithdrawal = (txId: string) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx || tx.status === 'Pago') return;

    // Release reserved
    if (tx.userId === currentUser.id) {
      if (tx.currency === 'KZ') {
        setCurrentUser(u => ({ ...u, kzReserved: Math.max(0, u.kzReserved - tx.amount) }));
      } else {
        setCurrentUser(u => ({ ...u, usdtReserved: Math.max(0, u.usdtReserved - tx.amount) }));
      }
    }

    setTransactions(prev =>
      prev.map(t => (t.id === txId ? { ...t, status: 'Pago', notes: 'Transferência liquidada pela tesouraria' } : t))
    );
  };

  const adminRejectWithdrawal = (txId: string) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;

    // Refund reserved back to available balance
    if (tx.userId === currentUser.id) {
      if (tx.currency === 'KZ') {
        setCurrentUser(u => ({ ...u, kzBalance: u.kzBalance + tx.amount, kzReserved: Math.max(0, u.kzReserved - tx.amount) }));
      } else {
        setCurrentUser(u => ({ ...u, usdtBalance: u.usdtBalance + tx.amount, usdtReserved: Math.max(0, u.usdtReserved - tx.amount) }));
      }
    }

    setTransactions(prev =>
      prev.map(t => (t.id === txId ? { ...t, status: 'Rejeitado', notes: 'Dados bancários ou de carteira incorretos' } : t))
    );
  };

  const adminReplySupport = (ticketId: string, text: string) => {
    soundManager.playMessagePop();
    setSupportTickets(prev =>
      prev.map(t =>
        t.id === ticketId
          ? {
              ...t,
              messages: [
                ...t.messages,
                {
                  id: `sm_${Date.now()}`,
                  sender: 'admin',
                  text,
                  timestamp: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })
                }
              ],
              updatedAt: new Date().toISOString()
            }
          : t
      )
    );
  };

  const adminToggleUserSuspension = (userId: string) => {
    if (userId === currentUser.id) {
      setCurrentUser(u => ({ ...u, isSuspended: !u.isSuspended }));
    }
  };

  const unlockAdmin = (pin: string): boolean => {
    if (verifyAdminCredential(pin)) {
      soundManager.playCoin();
      setIsAdminUnlocked(true);
      try {
        sessionStorage.setItem('nti_admin_unlocked', 'true');
      } catch {
        // ignore
      }
      setCurrentUser(u => ({ ...u, role: 'admin' }));
      setActiveTab('admin');
      return true;
    }
    return false;
  };

  const lockAdmin = () => {
    setIsAdminUnlocked(false);
    setIsLoggedIn(false);
    try {
      sessionStorage.removeItem('nti_admin_unlocked');
      sessionStorage.removeItem('nti_is_logged_in');
      sessionStorage.setItem('nti_auth_mode', 'admin');
    } catch {
      // ignore
    }
    setCurrentUser(u => ({ ...u, role: 'player' }));
    setActiveTab('dashboard');
  };

  const simulateOTP = (phone: string): string => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[N - NÃO TE IRRITES] Código OTP enviado para ${phone}: ${otp}`);
    return otp;
  };

  return (
    <GameContext.Provider
      value={{
        currentUser,
        isLoggedIn,
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
        supportTickets,
        rankingList,
        exchangeRate,
        isMuted,
        toggleSound,
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
        walletMode,
        setWalletMode,
        updateProfile,
        simulateOTP
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
