export type Currency = 'KZ' | 'USDT';

export type PlayerCategory = 'Bronze' | 'Prata' | 'Ouro' | 'Platina' | 'Diamante' | 'Lenda N';

export type UserRole = 'player' | 'admin';

export type PieceExpression =
  | 'confident'   // 😎 Confiante
  | 'laughing'    // 😂 A rir
  | 'rich'        // 🤑 Feliz com moedas
  | 'celebrating' // 🏆 A comemorar
  | 'smiling'     // 😁 Sorridente
  | 'crying'      // 😭 A chorar
  | 'angry'       // 😡 Zangada
  | 'scared'      // 😱 Assustada
  | 'irritated'   // 🤬 Irritada
  | 'defeated';   // 💀 Derrotada

export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export type BoardThemeId =
  | 'classic'
  | 'kingdoms'
  | 'football'
  | 'future'
  | 'gang'
  | 'egyptian';

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  password?: string;
  avatar: string;
  role: UserRole;
  category: PlayerCategory;
  kzBalance: number; // Saldo Real em Kwanzas (inicia a zero)
  usdtBalance: number; // Saldo Real em USDT (inicia a zero)
  demoKzBalance?: number; // Saldo Simulado/Demo em Kwanzas para treinar
  demoUsdtBalance?: number; // Saldo Simulado/Demo em USDT
  kzReserved: number;
  usdtReserved: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  totalEarnedKz: number;
  totalEarnedUsdt: number;
  totalLostKz: number;
  totalLostUsdt: number;
  unlockedThemes?: BoardThemeId[];
  selectedTheme?: BoardThemeId;
  isIdentityVerified: boolean;
  isAgeVerified: boolean;
  isSuspended: boolean;
  createdAt: string;
}

export interface Piece {
  id: number; // 0 to 3
  color: PlayerColor;
  // position:
  // -1 = home base (in the yard)
  // 0..51 = on the main 52-tile circuit
  // 100..104 = home straight track (tiles 1..5)
  // 200 = finished at the center goal
  position: number;
  expression: PieceExpression;
  bubbleText?: string;
}

export interface PlayerSlot {
  userId: string;
  name: string;
  avatar: string;
  color: PlayerColor;
  isReady: boolean;
  isBot: boolean;
  isConnected: boolean;
  pieces: Piece[];
  category: PlayerCategory;
  rank?: number;
  resigned?: boolean;
}

export interface SurrenderOffer {
  leaderColor: PlayerColor;
  leaderName: string;
  targetColors: PlayerColor[];
  respondedColors: PlayerColor[];
}

export interface GameBoardState {
  currentTurnColor: PlayerColor;
  diceValue: number;
  isRolling: boolean;
  hasRolled: boolean;
  eligiblePieces: number[]; // indices 0..3 of current player's pieces that can move
  winner: PlayerColor | null;
  turnTimer: number; // seconds left (e.g. 20)
  consecutiveSixes: number;
  lastAction: string | null;
  captureEvent: {
    captorColor: PlayerColor;
    capturedColor: PlayerColor;
    position: number;
    text: string;
  } | null;
  surrenderOffer?: SurrenderOffer | null;
  askedTwoGoalColors?: PlayerColor[];
}

export type RoomStatus = 'WAITING' | 'PLAYING' | 'FINISHED';

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userColor?: PlayerColor;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  hostId: string;
  maxPlayers: 2 | 3 | 4;
  currency: Currency;
  betAmount: number;
  prizePool: number; // 75% of total
  platformCommission: number; // 25% of total
  isPrivate: boolean;
  isDemo?: boolean;
  boardTheme?: BoardThemeId;
  status: RoomStatus;
  players: PlayerSlot[];
  boardState: GameBoardState;
  chat: ChatMessage[];
  createdAt: string;
}

export type TransactionType =
  | 'DEPOSIT'
  | 'WITHDRAW'
  | 'BET_ENTRY'
  | 'BET_WIN'
  | 'COMMISSION'
  | 'THEME_UNLOCK';

export type TransactionStatus =
  | 'Aguardando pagamento'
  | 'Em validação'
  | 'Confirmado'
  | 'Rejeitado'
  | 'Expirado'
  | 'Pendente'
  | 'Em análise'
  | 'Aprovado'
  | 'Pago';

export type PaymentMethod =
  | 'MULTICAIXA_EXPRESS'
  | 'IBAN'
  | 'BINANCE'
  | 'BYBIT'
  | 'AIRTM';

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  type: TransactionType;
  currency: Currency;
  amount: number;
  fee: number;
  status: TransactionStatus;
  method: PaymentMethod;
  network?: string; // e.g. TRC20, ERC20
  reference: string;
  proofUrl?: string;
  notes?: string;
  themeId?: BoardThemeId;
  themeName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SupportMessage {
  id: string;
  sender: 'user' | 'admin';
  text: string;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  subject: string;
  status: 'OPEN' | 'RESOLVED';
  messages: SupportMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface RankingPlayer {
  id: string;
  name: string;
  avatar: string;
  category: PlayerCategory;
  wins: number;
  matchesPlayed: number;
  winRate: number;
  totalEarningsKz: number;
  totalEarningsUsdt: number;
  score: number;
  rank: number;
  country: string;
}

export interface PaymentSettings {
  // Multicaixa Express
  mcxEntity: string;
  mcxReference: string;
  mcxPhone: string;
  // Transferência Bancária IBAN
  bankName: string;
  accountHolder: string;
  iban: string;
  // USDT
  usdtAddress: string;
  usdtNetwork: string;
  binancePayId?: string;
  bybitUid?: string;
}
