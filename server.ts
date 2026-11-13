import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import type {
  Room,
  PlayerSlot,
  PlayerColor,
  Piece,
  PieceExpression,
  Currency,
  PlayerCategory,
  ChatMessage,
  BoardThemeId
} from './src/types/index.ts';
import {
  SAFE_CELLS,
  canPieceMove,
  getNextPosition,
  hasPlayerWon,
  getRandomPositiveExpression,
  getRandomNegativeExpression
} from './src/utils/ludoRules.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const TURN_SECONDS = 20;

interface ClientMeta {
  ws: WebSocket;
  userId: string;
  userName: string;
  userAvatar: string;
  userCategory: PlayerCategory;
  roomId: string | null;
}

const roomsMap = new Map<string, Room>();
const clientsMap = new Map<WebSocket, ClientMeta>();
const rollingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
const botTurnTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const BOT_PROFILES = [
  { name: 'Bot Kilamba (IA)', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=BotKilamba&backgroundColor=2563eb' },
  { name: 'Bot Benguela (IA)', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=BotBenguela&backgroundColor=16a34a' },
  { name: 'Bot Huambo (IA)', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=BotHuambo&backgroundColor=eab308' }
];

function createBotSlot(color: PlayerColor, botIndex: number): PlayerSlot {
  const profile = BOT_PROFILES[botIndex % BOT_PROFILES.length];
  return {
    userId: `bot_${color}_${Date.now()}_${botIndex}`,
    name: profile.name,
    avatar: profile.avatar,
    color,
    isReady: true,
    isBot: true,
    isConnected: true,
    pieces: createInitialPieces(color),
    category: 'Ouro'
  };
}

function clearRoomTimers(roomId: string) {
  const rTimer = rollingTimeouts.get(roomId);
  if (rTimer) {
    clearTimeout(rTimer);
    rollingTimeouts.delete(roomId);
  }
  const bTimer = botTurnTimeouts.get(roomId);
  if (bTimer) {
    clearTimeout(bTimer);
    botTurnTimeouts.delete(roomId);
  }
}

function createInitialPieces(color: PlayerColor): Piece[] {
  return [0, 1, 2, 3].map((id) => ({
    id,
    color,
    position: -1,
    expression: 'smiling'
  }));
}

function generateRoomCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  const code = `AO-${num}`;
  for (const room of roomsMap.values()) {
    if (room.code === code) return generateRoomCode();
  }
  return code;
}

const ALL_COLORS: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

function isValidColor(c: unknown): c is PlayerColor {
  return c === 'red' || c === 'green' || c === 'yellow' || c === 'blue';
}

function getOppositeColor(c: PlayerColor): PlayerColor {
  if (c === 'red') return 'yellow';
  if (c === 'yellow') return 'red';
  if (c === 'green') return 'blue';
  return 'green';
}

function getAvailableColors(maxPlayers: 2 | 3 | 4): PlayerColor[] {
  if (maxPlayers === 2) return ['red', 'yellow', 'green', 'blue'];
  if (maxPlayers === 3) return ['red', 'green', 'yellow', 'blue'];
  return ['red', 'green', 'yellow', 'blue'];
}

function createEmptyRoom(params: {
  id: string;
  code: string;
  name: string;
  hostId: string;
  maxPlayers: 2 | 3 | 4;
  currency: Currency;
  betAmount: number;
  isPrivate: boolean;
  isDemo?: boolean;
  boardTheme?: BoardThemeId;
}): Room {
  const totalPot = params.betAmount * params.maxPlayers;
  const prizePool = Math.round(totalPot * 0.75);
  const platformCommission = Math.round(totalPot * 0.25);

  return {
    id: params.id,
    code: params.code,
    name: params.name,
    hostId: params.hostId,
    maxPlayers: params.maxPlayers,
    currency: params.currency,
    betAmount: params.betAmount,
    prizePool,
    platformCommission,
    isPrivate: params.isPrivate,
    isDemo: params.isDemo,
    boardTheme: params.boardTheme || 'classic',
    status: 'WAITING',
    players: [],
    boardState: {
      currentTurnColor: 'red',
      diceValue: 1,
      isRolling: false,
      hasRolled: false,
      eligiblePieces: [],
      winner: null,
      turnTimer: TURN_SECONDS,
      consecutiveSixes: 0,
      lastAction: 'Aguardando jogadores reais entrarem na sala...',
      captureEvent: null,
      surrenderOffer: null,
      askedTwoGoalColors: []
    },
    chat: [
      {
        id: `sys_${Date.now()}`,
        userId: 'system',
        userName: 'N – Sistema',
        text: `Sala ${params.code} aberta! Partilhe o código com os seus amigos para jogar online sem bots.`,
        timestamp: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
        isSystem: true
      }
    ],
    createdAt: new Date().toISOString()
  };
}

// Seed open public rooms with ZERO bots (waiting for real human players online)
function seedPublicRooms() {
  const publicSeeds: Array<{
    id: string;
    code: string;
    name: string;
    maxPlayers: 2 | 3 | 4;
    currency: Currency;
    betAmount: number;
  }> = [
    { id: 'pub_luanda_2p', code: 'AO-1010', name: 'Duelo Luanda 1 vs 1 (Online)', maxPlayers: 2, currency: 'KZ', betAmount: 0 },
    { id: 'pub_luanda_4p', code: 'AO-2020', name: 'Mesa Clássica Angola (4 Jogadores)', maxPlayers: 4, currency: 'KZ', betAmount: 1000 },
    { id: 'pub_benguela_2p', code: 'AO-3030', name: 'Benguela Amigos 1 vs 1', maxPlayers: 2, currency: 'KZ', betAmount: 5000 },
    { id: 'pub_usdt_2p', code: 'INT-4040', name: 'Arena Internacional USDT (1 vs 1)', maxPlayers: 2, currency: 'USDT', betAmount: 10 }
  ];

  for (const seed of publicSeeds) {
    roomsMap.set(
      seed.id,
      createEmptyRoom({
        id: seed.id,
        code: seed.code,
        name: seed.name,
        hostId: 'system',
        maxPlayers: seed.maxPlayers,
        currency: seed.currency,
        betAmount: seed.betAmount,
        isPrivate: false,
        isDemo: seed.betAmount === 0
      })
    );
  }
}

seedPublicRooms();

function sendToClient(ws: WebSocket, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function getVisibleRoomsForUser(userId: string): Room[] {
  return Array.from(roomsMap.values()).filter(
    (r) => !r.isPrivate || r.hostId === userId || r.players.some((p) => p.userId === userId)
  );
}

function getOnlineCount(): number {
  const uniqueUsers = new Set<string>();
  for (const meta of clientsMap.values()) {
    if (meta.userId) uniqueUsers.add(meta.userId);
  }
  return Math.max(1, uniqueUsers.size);
}

function broadcastRoomsList() {
  const onlineCount = getOnlineCount();
  for (const [ws, meta] of clientsMap.entries()) {
    sendToClient(ws, {
      type: 'rooms:list',
      rooms: getVisibleRoomsForUser(meta.userId),
      onlineCount
    });
  }
}

function broadcastRoomState(roomId: string) {
  const room = roomsMap.get(roomId);
  if (!room) return;
  const serialized = JSON.stringify({ type: 'room:state', room });
  for (const [ws, meta] of clientsMap.entries()) {
    if (
      ws.readyState === WebSocket.OPEN &&
      (meta.roomId === roomId || room.players.some((p) => p.userId === meta.userId))
    ) {
      ws.send(serialized);
    }
  }
}

function broadcastRoomTick(roomId: string, turnTimer: number) {
  const room = roomsMap.get(roomId);
  if (!room) return;
  const serialized = JSON.stringify({ type: 'room:tick', roomId, turnTimer });
  for (const [ws, meta] of clientsMap.entries()) {
    if (ws.readyState === WebSocket.OPEN && meta.roomId === roomId) {
      ws.send(serialized);
    }
  }
}

function passTurnToNextPlayer(room: Room, reason: string): Room {
  const eligiblePlayers = room.players.filter((p) => !p.resigned);
  const pool = eligiblePlayers.length > 0 ? eligiblePlayers : room.players;
  if (pool.length === 0) return room;

  const activeColors = pool.map((p) => p.color);
  const currentIndex = activeColors.indexOf(room.boardState.currentTurnColor);
  const nextColor = activeColors[(currentIndex + 1) % activeColors.length];
  const nextPlayer = pool.find((p) => p.color === nextColor);

  return {
    ...room,
    boardState: {
      ...room.boardState,
      currentTurnColor: nextColor,
      hasRolled: false,
      isRolling: false,
      eligiblePieces: [],
      turnTimer: TURN_SECONDS,
      consecutiveSixes: 0,
      lastAction: `${reason} Agora é a vez de ${nextPlayer?.name || nextColor}.`,
      captureEvent: null
    }
  };
}

function executeMoveOnRoom(room: Room, playerColor: PlayerColor, pieceIndex: number): Room {
  const diceVal = room.boardState.diceValue;
  const player = room.players.find((p) => p.color === playerColor);
  if (!player) return room;

  const piece = player.pieces[pieceIndex];
  if (!piece || !canPieceMove(piece, diceVal)) return room;

  const newPos = getNextPosition(piece, diceVal);
  let capturedOpponent: { color: PlayerColor; pieceIndex: number; playerName: string } | null = null;

  if (newPos >= 0 && newPos <= 51 && !SAFE_CELLS.has(newPos)) {
    for (const otherPlayer of room.players) {
      if (otherPlayer.color === playerColor) continue;
      const hitPieceIdx = otherPlayer.pieces.findIndex((p) => p.position === newPos);
      if (hitPieceIdx !== -1) {
        capturedOpponent = {
          color: otherPlayer.color,
          pieceIndex: hitPieceIdx,
          playerName: otherPlayer.name
        };
        break;
      }
    }
  }

  const updatedPlayers = room.players.map((p) => {
    if (p.color === playerColor) {
      const nextPieces = p.pieces.map((pc) => {
        if (pc.id === pieceIndex) {
          const isGoal = newPos === 200;
          return {
            ...pc,
            position: newPos,
            expression: (isGoal || capturedOpponent ? getRandomPositiveExpression() : pc.expression) as PieceExpression,
            bubbleText: isGoal ? 'CHEGUEI À META!' : capturedOpponent ? 'FOSTE APANHADO! 🔥' : undefined
          };
        }
        return { ...pc, bubbleText: undefined };
      });
      return { ...p, pieces: nextPieces };
    }

    if (capturedOpponent && p.color === capturedOpponent.color) {
      const nextPieces = p.pieces.map((pc) => {
        if (pc.id === capturedOpponent.pieceIndex) {
          return {
            ...pc,
            position: -1,
            expression: getRandomNegativeExpression(),
            bubbleText: 'NÃO ACREDITO! 😭'
          };
        }
        return pc;
      });
      return { ...p, pieces: nextPieces };
    }

    return p;
  });

  const activePlayerAfterMove = updatedPlayers.find((p) => p.color === playerColor)!;
  const finishedCount = activePlayerAfterMove.pieces.filter((p) => p.position === 200).length;
  const isWin = hasPlayerWon(activePlayerAfterMove.pieces, 3);

  if (isWin) {
    return {
      ...room,
      status: 'FINISHED',
      players: updatedPlayers,
      boardState: {
        ...room.boardState,
        winner: playerColor,
        hasRolled: false,
        isRolling: false,
        eligiblePieces: [],
        surrenderOffer: null,
        lastAction: `🏆 ${activePlayerAfterMove.name} colocou 3 peças na meta e venceu a partida!`
      }
    };
  }

  const getsBonusRoll = diceVal === 6 || capturedOpponent !== null;
  let nextRoomState: Room = getsBonusRoll
    ? {
        ...room,
        players: updatedPlayers,
        boardState: {
          ...room.boardState,
          hasRolled: false,
          isRolling: false,
          eligiblePieces: [],
          turnTimer: TURN_SECONDS,
          lastAction: capturedOpponent
            ? `🔥 ${player.name} capturou a peça de ${capturedOpponent.playerName}! Joga novamente!`
            : `🎲 ${player.name} tirou um 6! Tem direito a mais uma jogada!`,
          captureEvent: capturedOpponent
            ? {
                captorColor: playerColor,
                capturedColor: capturedOpponent.color,
                position: newPos,
                text: `${player.name} capturou ${capturedOpponent.playerName}! Foste apanhado!`
              }
            : null
        }
      }
    : passTurnToNextPlayer(
        {
          ...room,
          players: updatedPlayers
        },
        `${player.name} moveu a peça.`
      );

  // When a player hits 2 pieces in the goal for the first time, ask losing opponent(s) to continue or accept defeat
  const alreadyAsked = nextRoomState.boardState.askedTwoGoalColors || [];
  if (finishedCount === 2 && !alreadyAsked.includes(playerColor)) {
    const losingOpponents = updatedPlayers.filter(
      (p) =>
        p.color !== playerColor &&
        !p.resigned &&
        p.pieces.filter((pc) => pc.position === 200).length < 2
    );
    const humanLosers = losingOpponents.filter((p) => !p.isBot);
    const updatedAsked = [...alreadyAsked, playerColor];

    if (humanLosers.length > 0) {
      nextRoomState = {
        ...nextRoomState,
        boardState: {
          ...nextRoomState.boardState,
          askedTwoGoalColors: updatedAsked,
          surrenderOffer: {
            leaderColor: playerColor,
            leaderName: activePlayerAfterMove.name,
            targetColors: humanLosers.map((p) => p.color),
            respondedColors: []
          },
          lastAction: `⚠️ ${activePlayerAfterMove.name} colocou 2 peças na meta! Aguardando o adversário decidir se continua o jogo ou aceita a derrota.`
        }
      };
    } else if (losingOpponents.length > 0) {
      nextRoomState = {
        ...nextRoomState,
        boardState: {
          ...nextRoomState.boardState,
          askedTwoGoalColors: updatedAsked,
          lastAction: `⚠️ ${activePlayerAfterMove.name} já tem 2 peças na meta (falta 1)! O adversário decidiu continuar até ao fim!`
        }
      };
    }
  }

  return nextRoomState;
}

function joinClientToRoom(
  meta: ClientMeta,
  room: Room,
  preferredColor?: PlayerColor
): { ok: boolean; error?: string; room?: Room } {
  // Check if already in room (idempotent reconnection)
  const existingIndex = room.players.findIndex((p) => p.userId === meta.userId);
  if (existingIndex !== -1) {
    room.players[existingIndex] = {
      ...room.players[existingIndex],
      name: meta.userName,
      avatar: meta.userAvatar,
      category: meta.userCategory,
      isConnected: true,
      isBot: false
    };
    meta.roomId = room.id;
    roomsMap.set(room.id, room);
    return { ok: true, room };
  }

  if (room.players.length >= room.maxPlayers) {
    return { ok: false, error: 'Esta sala já está cheia.' };
  }

  if (room.status === 'FINISHED') {
    return { ok: false, error: 'Esta partida já terminou.' };
  }

  const usedColors = new Set(room.players.map((p) => p.color));
  let assignedColor: PlayerColor | undefined;

  if (preferredColor && isValidColor(preferredColor) && !usedColors.has(preferredColor)) {
    assignedColor = preferredColor;
  } else if (room.maxPlayers === 2 && room.players.length === 1) {
    const opposite = getOppositeColor(room.players[0].color);
    if (!usedColors.has(opposite)) assignedColor = opposite;
  }

  if (!assignedColor) {
    const allowedColors = getAvailableColors(room.maxPlayers);
    assignedColor = allowedColors.find((c) => !usedColors.has(c));
  }

  if (!assignedColor) {
    return { ok: false, error: 'Não há lugares disponíveis nesta mesa.' };
  }

  const newSlot: PlayerSlot = {
    userId: meta.userId,
    name: meta.userName,
    avatar: meta.userAvatar,
    color: assignedColor,
    isReady: true,
    isBot: false,
    isConnected: true,
    pieces: createInitialPieces(assignedColor),
    category: meta.userCategory
  };

  // If public seeded room had hostId === 'system', promote first human player to host
  const updatedHostId = room.hostId === 'system' || room.players.length === 0 ? meta.userId : room.hostId;

  const updatedPlayers = [...room.players, newSlot];
  const shouldAutoStart = updatedPlayers.length >= room.maxPlayers;

  const systemMsg: ChatMessage = {
    id: `sys_join_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId: 'system',
    userName: 'N – Sistema',
    text: shouldAutoStart
      ? `${meta.userName} entrou na sala! Mesa completa — partida iniciada!`
      : `${meta.userName} entrou na sala (${updatedPlayers.length}/${room.maxPlayers}).`,
    timestamp: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
    isSystem: true
  };

  const updatedRoom: Room = {
    ...room,
    hostId: updatedHostId,
    players: updatedPlayers,
    status: shouldAutoStart ? 'PLAYING' : room.status,
    boardState: {
      ...room.boardState,
      currentTurnColor: shouldAutoStart ? updatedPlayers[0].color : room.boardState.currentTurnColor,
      turnTimer: TURN_SECONDS,
      lastAction: shouldAutoStart
        ? `Partida iniciada! É a vez de ${updatedPlayers[0].name}. Role o dado!`
        : `${meta.userName} sentou-se na mesa. Aguardando mais jogadores (${updatedPlayers.length}/${room.maxPlayers})...`
    },
    chat: [...room.chat, systemMsg]
  };

  meta.roomId = updatedRoom.id;
  roomsMap.set(updatedRoom.id, updatedRoom);
  return { ok: true, room: updatedRoom };
}

function removeClientFromCurrentRoom(meta: ClientMeta) {
  if (!meta.roomId) return;
  const room = roomsMap.get(meta.roomId);
  const prevRoomId = meta.roomId;
  meta.roomId = null;

  if (!room) return;

  const leavingPlayer = room.players.find((p) => p.userId === meta.userId);
  if (!leavingPlayer) return;

  const remainingPlayers = room.players.filter((p) => p.userId !== meta.userId);
  const remainingHumans = remainingPlayers.filter((p) => !p.isBot);

  // If no human players remain in the room, clear timers and remove/reset the room
  if (remainingHumans.length === 0) {
    clearRoomTimers(room.id);
    if (room.id.startsWith('pub_')) {
      const resetSeed = createEmptyRoom({
        id: room.id,
        code: room.code,
        name: room.name,
        hostId: 'system',
        maxPlayers: room.maxPlayers,
        currency: room.currency,
        betAmount: room.betAmount,
        isPrivate: false,
        isDemo: room.isDemo
      });
      roomsMap.set(room.id, resetSeed);
    } else {
      roomsMap.delete(room.id);
    }
    broadcastRoomsList();
    return;
  }

  // Reassign host to a human player if needed
  const nextHostId = room.hostId === meta.userId ? remainingHumans[0].userId : room.hostId;
  let updatedRoom: Room = {
    ...room,
    hostId: nextHostId,
    players: remainingPlayers,
    chat: [
      ...room.chat,
      {
        id: `sys_leave_${Date.now()}`,
        userId: 'system',
        userName: 'N – Sistema',
        text: `${leavingPlayer.name} saiu da mesa.`,
        timestamp: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
        isSystem: true
      }
    ]
  };

  if (room.status === 'PLAYING' && remainingPlayers.length < 2) {
    updatedRoom = {
      ...updatedRoom,
      status: 'WAITING',
      players: remainingPlayers.map((p) => ({ ...p, pieces: createInitialPieces(p.color) })),
      boardState: {
        ...updatedRoom.boardState,
        currentTurnColor: remainingPlayers[0].color,
        hasRolled: false,
        isRolling: false,
        eligiblePieces: [],
        winner: null,
        turnTimer: TURN_SECONDS,
        lastAction: `${leavingPlayer.name} saiu. Aguardando outro jogador para continuar.`
      }
    };
  } else if (room.status === 'PLAYING' && room.boardState.currentTurnColor === leavingPlayer.color) {
    updatedRoom = {
      ...updatedRoom,
      boardState: {
        ...updatedRoom.boardState,
        currentTurnColor: remainingPlayers[0].color,
        hasRolled: false,
        isRolling: false,
        eligiblePieces: [],
        turnTimer: TURN_SECONDS,
        lastAction: `${leavingPlayer.name} saiu. Agora é a vez de ${remainingPlayers[0].name}.`
      }
    };
  }

  roomsMap.set(prevRoomId, updatedRoom);
  broadcastRoomState(prevRoomId);
  broadcastRoomsList();
  scheduleBotTurnIfNeeded(prevRoomId);
}

function chooseBestBotPiece(room: Room, botColor: PlayerColor, diceVal: number, eligible: number[]): number {
  const botPlayer = room.players.find((p) => p.color === botColor);
  if (!botPlayer) return eligible[0];

  let bestPieceId = eligible[0];
  let bestScore = -999;

  for (const pieceId of eligible) {
    const piece = botPlayer.pieces.find((p) => p.id === pieceId);
    if (!piece) continue;
    const nextPos = getNextPosition(piece, diceVal);
    let score = 0;

    // 1. Highest priority: reaching the goal
    if (nextPos === 200) score += 200;

    // 2. Capturing an opponent piece
    if (nextPos >= 0 && nextPos <= 51 && !SAFE_CELLS.has(nextPos)) {
      const captures = room.players.some(
        (other) => other.color !== botColor && other.pieces.some((op) => op.position === nextPos)
      );
      if (captures) score += 150;
    }

    // 3. Leaving yard on 6
    if (piece.position === -1 && nextPos >= 0) score += 90;

    // 4. Landing on a safe star cell
    if (SAFE_CELLS.has(nextPos)) score += 45;

    // 5. Entering home straight lane
    if (nextPos >= 100 && nextPos <= 104) score += 65;

    // 6. Advance furthest piece slightly faster
    if (piece.position >= 0) score += piece.position * 0.5;

    if (score > bestScore) {
      bestScore = score;
      bestPieceId = pieceId;
    }
  }

  return bestPieceId;
}

function scheduleBotTurnIfNeeded(roomId: string) {
  const existingBotTimer = botTurnTimeouts.get(roomId);
  if (existingBotTimer) {
    clearTimeout(existingBotTimer);
    botTurnTimeouts.delete(roomId);
  }

  const room = roomsMap.get(roomId);
  if (!room || room.status !== 'PLAYING' || room.boardState.winner || room.boardState.surrenderOffer || room.players.length < 2) return;

  const activePlayer = room.players.find((p) => p.color === room.boardState.currentTurnColor);
  if (!activePlayer || !activePlayer.isBot || activePlayer.resigned) return;

  // Step 1: Fast snappy Bot dice roll
  const rollDelay = setTimeout(() => {
    const curRoom = roomsMap.get(roomId);
    if (!curRoom || curRoom.status !== 'PLAYING' || curRoom.boardState.winner || curRoom.boardState.surrenderOffer) return;
    const bot = curRoom.players.find((p) => p.color === curRoom.boardState.currentTurnColor);
    if (!bot || !bot.isBot || curRoom.boardState.hasRolled || curRoom.boardState.isRolling) return;

    const rollingRoom: Room = {
      ...curRoom,
      boardState: {
        ...curRoom.boardState,
        isRolling: true,
        lastAction: `🤖 ${bot.name} lançou o dado...`
      }
    };
    roomsMap.set(roomId, rollingRoom);
    broadcastRoomState(roomId);

    // Step 2: Reveal dice roll quickly
    const resolveTimer = setTimeout(() => {
      const latestRoom = roomsMap.get(roomId);
      if (!latestRoom || latestRoom.status !== 'PLAYING' || latestRoom.boardState.winner || latestRoom.boardState.surrenderOffer) return;
      const activeBot = latestRoom.players.find((p) => p.color === latestRoom.boardState.currentTurnColor);
      if (!activeBot || !activeBot.isBot) return;

      const diceVal = Math.floor(Math.random() * 6) + 1;
      const eligible = activeBot.pieces.filter((p) => canPieceMove(p, diceVal)).map((p) => p.id);

      if (eligible.length === 0) {
        const passedRoom = passTurnToNextPlayer(
          {
            ...latestRoom,
            boardState: { ...latestRoom.boardState, diceValue: diceVal }
          },
          `🤖 ${activeBot.name} tirou ${diceVal}, sem jogadas possíveis.`
        );
        roomsMap.set(roomId, passedRoom);
        broadcastRoomState(roomId);
        scheduleBotTurnIfNeeded(roomId);
        return;
      }

      const rolledRoom: Room = {
        ...latestRoom,
        boardState: {
          ...latestRoom.boardState,
          diceValue: diceVal,
          isRolling: false,
          hasRolled: true,
          eligiblePieces: eligible,
          lastAction: `🤖 ${activeBot.name} tirou um ${diceVal}!`
        }
      };
      roomsMap.set(roomId, rolledRoom);
      broadcastRoomState(roomId);

      // Step 3: Bot moves briskly
      const moveTimer = setTimeout(() => {
        const preMoveRoom = roomsMap.get(roomId);
        if (!preMoveRoom || preMoveRoom.status !== 'PLAYING' || preMoveRoom.boardState.winner || preMoveRoom.boardState.surrenderOffer) return;
        const movingBot = preMoveRoom.players.find((p) => p.color === preMoveRoom.boardState.currentTurnColor);
        if (!movingBot || !movingBot.isBot || !preMoveRoom.boardState.hasRolled) return;

        const chosenPieceId = chooseBestBotPiece(
          preMoveRoom,
          movingBot.color,
          preMoveRoom.boardState.diceValue,
          preMoveRoom.boardState.eligiblePieces
        );
        const afterMoveRoom = executeMoveOnRoom(preMoveRoom, movingBot.color, chosenPieceId);
        roomsMap.set(roomId, afterMoveRoom);
        broadcastRoomState(roomId);
        if (afterMoveRoom.status === 'FINISHED') {
          broadcastRoomsList();
        } else {
          scheduleBotTurnIfNeeded(roomId);
        }
      }, 130);

      botTurnTimeouts.set(roomId, moveTimer);
    }, 150);

    botTurnTimeouts.set(roomId, resolveTimer);
  }, 110);

  botTurnTimeouts.set(roomId, rollDelay);
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      onlineUsers: getOnlineCount(),
      roomsCount: roomsMap.size
    });
  });

  app.get('/api/rooms', (req, res) => {
    const code = typeof req.query.code === 'string' ? req.query.code.trim().toUpperCase() : '';
    if (code) {
      const match = Array.from(roomsMap.values()).find((r) => r.code.toUpperCase() === code);
      res.json({ room: match || null });
      return;
    }
    res.json({
      rooms: Array.from(roomsMap.values()).filter((r) => !r.isPrivate),
      onlineCount: getOnlineCount()
    });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    const meta: ClientMeta = {
      ws,
      userId: '',
      userName: 'Jogador',
      userAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=KingLudo',
      userCategory: 'Bronze',
      roomId: null
    };
    clientsMap.set(ws, meta);

    ws.on('message', (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw.toString()) as Record<string, unknown>;
      } catch {
        return;
      }

      const type = String(msg.type || '');

      if (type === 'auth:hello') {
        meta.userId = String(msg.userId || `usr_${Date.now()}`);
        meta.userName = String(msg.userName || 'Jogador');
        meta.userAvatar = String(msg.userAvatar || meta.userAvatar);
        meta.userCategory = (msg.userCategory as PlayerCategory) || 'Bronze';

        // Reconnect to room if already seated in one
        for (const room of roomsMap.values()) {
          const pIdx = room.players.findIndex((p) => p.userId === meta.userId);
          if (pIdx !== -1) {
            room.players[pIdx] = {
              ...room.players[pIdx],
              name: meta.userName,
              avatar: meta.userAvatar,
              isConnected: true
            };
            meta.roomId = room.id;
            roomsMap.set(room.id, room);
            sendToClient(ws, { type: 'room:state', room });
            broadcastRoomState(room.id);
          }
        }

        sendToClient(ws, {
          type: 'rooms:list',
          rooms: getVisibleRoomsForUser(meta.userId),
          onlineCount: getOnlineCount()
        });
        broadcastRoomsList();
        return;
      }

      if (type === 'rooms:sync') {
        sendToClient(ws, {
          type: 'rooms:list',
          rooms: getVisibleRoomsForUser(meta.userId),
          onlineCount: getOnlineCount()
        });
        return;
      }

      if (type === 'room:create') {
        if (!meta.userId) return;
        // Leave previous room first if seated elsewhere
        if (meta.roomId) {
          removeClientFromCurrentRoom(meta);
        }

        const maxPlayers = ([2, 3, 4].includes(Number(msg.maxPlayers)) ? Number(msg.maxPlayers) : 2) as 2 | 3 | 4;
        const currency = (msg.currency === 'USDT' ? 'USDT' : 'KZ') as Currency;
        const betAmount = Math.max(0, Number(msg.betAmount) || 0);
        const withBots = Boolean(msg.withBots);
        const isPrivate = withBots ? true : Boolean(msg.isPrivate);
        const isDemo = Boolean(msg.isDemo);
        const preferredColor = isValidColor(msg.preferredColor) ? msg.preferredColor : undefined;
        const boardTheme = (typeof msg.boardTheme === 'string' ? msg.boardTheme : 'classic') as BoardThemeId;
        const roomName = String(msg.name || '').trim() || (withBots ? 'Duelo contra Bot (IA)' : 'Mesa Privada com Amigos');

        const roomId = `room_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const code = generateRoomCode();

        const room = createEmptyRoom({
          id: roomId,
          code,
          name: roomName,
          hostId: meta.userId,
          maxPlayers,
          currency,
          betAmount,
          isPrivate,
          isDemo,
          boardTheme
        });

        roomsMap.set(room.id, room);
        const joined = joinClientToRoom(meta, room, preferredColor);
        if (joined.ok && joined.room) {
          let finalRoom = joined.room;
          if (withBots) {
            const hostColor = finalRoom.players[0]?.color || 'red';
            const usedColors = new Set(finalRoom.players.map((p) => p.color));
            let openColors: PlayerColor[];
            if (finalRoom.maxPlayers === 2) {
              const opp = getOppositeColor(hostColor);
              openColors = !usedColors.has(opp) ? [opp] : ALL_COLORS.filter((c) => !usedColors.has(c)).slice(0, 1);
            } else {
              openColors = ALL_COLORS.filter((c) => !usedColors.has(c)).slice(0, finalRoom.maxPlayers - finalRoom.players.length);
            }
            const botSlots = openColors.map((c, idx) => createBotSlot(c, idx));
            const allPlayers = [...finalRoom.players, ...botSlots];
            finalRoom = {
              ...finalRoom,
              players: allPlayers,
              status: 'PLAYING',
              boardState: {
                ...finalRoom.boardState,
                currentTurnColor: allPlayers[0].color,
                turnTimer: TURN_SECONDS,
                lastAction: `Partida contra Bot (IA) iniciada! É a sua vez, ${allPlayers[0].name}. Role o dado!`
              },
              chat: [
                ...finalRoom.chat,
                {
                  id: `sys_bot_${Date.now()}`,
                  userId: 'system',
                  userName: 'N – Sistema',
                  text: `Modo Bot (IA) ativado! ${botSlots.map((b) => b.name).join(', ')} entrou na mesa.`,
                  timestamp: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
                  isSystem: true
                }
              ]
            };
            roomsMap.set(finalRoom.id, finalRoom);
          }

          sendToClient(ws, { type: 'room:joined', room: finalRoom });
          broadcastRoomState(finalRoom.id);
          broadcastRoomsList();
          scheduleBotTurnIfNeeded(finalRoom.id);
        }
        return;
      }

      if (type === 'room:select_color') {
        if (!meta.userId) return;
        const roomId = String(msg.roomId || meta.roomId || '');
        const desiredColor = msg.color;
        if (!isValidColor(desiredColor)) return;
        const room = roomsMap.get(roomId);
        if (!room || room.status !== 'WAITING') return;

        const playerIdx = room.players.findIndex((p) => p.userId === meta.userId);
        if (playerIdx === -1) return;

        const takenByOther = room.players.some((p, idx) => idx !== playerIdx && p.color === desiredColor);
        if (takenByOther) {
          sendToClient(ws, { type: 'error', message: 'Essa cor de base já está ocupada por outro jogador.' });
          return;
        }

        const updatedPlayers = room.players.map((p, idx) =>
          idx === playerIdx
            ? { ...p, color: desiredColor, pieces: createInitialPieces(desiredColor) }
            : p
        );

        const updatedRoom: Room = {
          ...room,
          players: updatedPlayers,
          boardState: {
            ...room.boardState,
            currentTurnColor: updatedPlayers[0]?.color || desiredColor
          }
        };
        roomsMap.set(roomId, updatedRoom);
        broadcastRoomState(roomId);
        return;
      }

      if (type === 'room:set_theme') {
        if (!meta.userId) return;
        const roomId = String(msg.roomId || meta.roomId || '');
        const themeId = String(msg.boardTheme || 'classic') as BoardThemeId;
        const room = roomsMap.get(roomId);
        if (!room) return;
        const updatedRoom: Room = { ...room, boardTheme: themeId };
        roomsMap.set(roomId, updatedRoom);
        broadcastRoomState(roomId);
        return;
      }

      if (type === 'room:add_bot') {
        if (!meta.userId) return;
        const roomId = String(msg.roomId || meta.roomId || '');
        const room = roomsMap.get(roomId);
        if (!room) return;
        if (room.hostId !== meta.userId) {
          sendToClient(ws, { type: 'error', message: 'Apenas o anfitrião pode adicionar um Bot na sala.' });
          return;
        }
        if (room.players.length >= room.maxPlayers) {
          sendToClient(ws, { type: 'error', message: 'A sala já está completa.' });
          return;
        }

        const allowedColors = getAvailableColors(room.maxPlayers);
        const usedColors = new Set(room.players.map((p) => p.color));
        const nextColor = allowedColors.find((c) => !usedColors.has(c));
        if (!nextColor) return;

        const botIndex = room.players.filter((p) => p.isBot).length;
        const botSlot = createBotSlot(nextColor, botIndex);
        const updatedPlayers = [...room.players, botSlot];
        const shouldStart = updatedPlayers.length >= room.maxPlayers || (room.maxPlayers === 2 && updatedPlayers.length >= 2);

        const updatedRoom: Room = {
          ...room,
          players: updatedPlayers,
          status: shouldStart ? 'PLAYING' : room.status,
          boardState: {
            ...room.boardState,
            currentTurnColor: shouldStart ? updatedPlayers[0].color : room.boardState.currentTurnColor,
            turnTimer: TURN_SECONDS,
            lastAction: shouldStart
              ? `${botSlot.name} entrou! Partida iniciada — vez de ${updatedPlayers[0].name}.`
              : `${botSlot.name} entrou na mesa (${updatedPlayers.length}/${room.maxPlayers}).`
          },
          chat: [
            ...room.chat,
            {
              id: `sys_addbot_${Date.now()}`,
              userId: 'system',
              userName: 'N – Sistema',
              text: `${botSlot.name} foi adicionado à mesa pelo anfitrião.`,
              timestamp: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
              isSystem: true
            }
          ]
        };

        roomsMap.set(room.id, updatedRoom);
        broadcastRoomState(room.id);
        broadcastRoomsList();
        scheduleBotTurnIfNeeded(room.id);
        return;
      }

      if (type === 'room:join') {
        if (!meta.userId) return;
        const roomId = String(msg.roomId || '');
        const room = roomsMap.get(roomId);
        if (!room) {
          sendToClient(ws, { type: 'error', message: 'Esta mesa já não existe ou foi encerrada.' });
          return;
        }
        if (meta.roomId && meta.roomId !== roomId) {
          removeClientFromCurrentRoom(meta);
        }
        const preferredColor = isValidColor(msg.preferredColor) ? msg.preferredColor : undefined;
        const res = joinClientToRoom(meta, room, preferredColor);
        if (!res.ok || !res.room) {
          sendToClient(ws, { type: 'error', message: res.error || 'Não foi possível entrar na mesa.' });
          return;
        }
        sendToClient(ws, { type: 'room:joined', room: res.room });
        broadcastRoomState(res.room.id);
        broadcastRoomsList();
        return;
      }

      if (type === 'room:join_by_code') {
        if (!meta.userId) return;
        const rawCode = String(msg.code || '').trim().toUpperCase();
        const found = Array.from(roomsMap.values()).find((r) => r.code.toUpperCase() === rawCode);
        if (!found) {
          sendToClient(ws, {
            type: 'error',
            message: `Nenhuma sala encontrada com o código "${rawCode}". Verifique o código enviado pelo seu amigo.`
          });
          return;
        }
        if (meta.roomId && meta.roomId !== found.id) {
          removeClientFromCurrentRoom(meta);
        }
        const preferredColor = isValidColor(msg.preferredColor) ? msg.preferredColor : undefined;
        const res = joinClientToRoom(meta, found, preferredColor);
        if (!res.ok || !res.room) {
          sendToClient(ws, { type: 'error', message: res.error || 'Não foi possível entrar na sala.' });
          return;
        }
        sendToClient(ws, { type: 'room:joined', room: res.room });
        broadcastRoomState(res.room.id);
        broadcastRoomsList();
        return;
      }

      if (type === 'room:leave') {
        removeClientFromCurrentRoom(meta);
        return;
      }

      if (type === 'room:start') {
        const roomId = String(msg.roomId || meta.roomId || '');
        const room = roomsMap.get(roomId);
        if (!room) return;
        if (room.hostId !== meta.userId) {
          sendToClient(ws, { type: 'error', message: 'Apenas o criador da sala pode iniciar a partida.' });
          return;
        }
        if (room.players.length < 2) {
          sendToClient(ws, { type: 'error', message: 'Precisa de pelo menos 2 jogadores reais na sala para iniciar.' });
          return;
        }
        const updated: Room = {
          ...room,
          status: 'PLAYING',
          boardState: {
            ...room.boardState,
            currentTurnColor: room.players[0].color,
            hasRolled: false,
            isRolling: false,
            eligiblePieces: [],
            winner: null,
            turnTimer: TURN_SECONDS,
            lastAction: `Partida iniciada pelo anfitrião! É a vez de ${room.players[0].name}. Role o dado!`
          }
        };
        roomsMap.set(room.id, updated);
        broadcastRoomState(room.id);
        broadcastRoomsList();
        scheduleBotTurnIfNeeded(room.id);
        return;
      }

      if (type === 'game:roll') {
        const roomId = String(msg.roomId || meta.roomId || '');
        const instant = Boolean(msg.instant);
        const room = roomsMap.get(roomId);
        if (!room || room.status !== 'PLAYING' || room.boardState.winner || room.boardState.surrenderOffer) return;

        const currentPlayer = room.players.find((p) => p.color === room.boardState.currentTurnColor);
        if (!currentPlayer || currentPlayer.userId !== meta.userId || currentPlayer.resigned) return;
        if (room.boardState.hasRolled || room.boardState.isRolling) return;

        const existingTimer = rollingTimeouts.get(roomId);
        if (existingTimer) clearTimeout(existingTimer);

        const resolveDiceRoll = () => {
          rollingTimeouts.delete(roomId);
          const latestRoom = roomsMap.get(roomId);
          if (!latestRoom || latestRoom.status !== 'PLAYING') return;
          const activePlayer = latestRoom.players.find((p) => p.color === latestRoom.boardState.currentTurnColor);
          if (!activePlayer) return;

          const diceVal = Math.floor(Math.random() * 6) + 1;
          const eligible = activePlayer.pieces.filter((p) => canPieceMove(p, diceVal)).map((p) => p.id);

          let nextRoom: Room;
          if (eligible.length === 0) {
            nextRoom = passTurnToNextPlayer(
              {
                ...latestRoom,
                boardState: { ...latestRoom.boardState, diceValue: diceVal }
              },
              `${activePlayer.name} tirou ${diceVal}, mas nenhuma peça pode se mover.`
            );
          } else {
            nextRoom = {
              ...latestRoom,
              boardState: {
                ...latestRoom.boardState,
                diceValue: diceVal,
                isRolling: false,
                hasRolled: true,
                eligiblePieces: eligible,
                lastAction: `${activePlayer.name} tirou um ${diceVal}! Selecione uma peça destacada.`
              }
            };
          }

          roomsMap.set(roomId, nextRoom);
          broadcastRoomState(roomId);
          scheduleBotTurnIfNeeded(roomId);
        };

        if (instant) {
          resolveDiceRoll();
          return;
        }

        const rollingRoom: Room = {
          ...room,
          boardState: {
            ...room.boardState,
            isRolling: true
          }
        };
        roomsMap.set(roomId, rollingRoom);
        broadcastRoomState(roomId);

        const t = setTimeout(resolveDiceRoll, 25);
        rollingTimeouts.set(roomId, t);
        return;
      }

      if (type === 'game:move') {
        const roomId = String(msg.roomId || meta.roomId || '');
        const pieceIndex = Number(msg.pieceIndex);
        const room = roomsMap.get(roomId);
        if (!room || room.status !== 'PLAYING' || room.boardState.winner || room.boardState.surrenderOffer) return;

        const currentPlayer = room.players.find((p) => p.color === room.boardState.currentTurnColor);
        if (!currentPlayer || currentPlayer.userId !== meta.userId || currentPlayer.resigned) return;
        if (!room.boardState.hasRolled) return;
        if (!room.boardState.eligiblePieces.includes(pieceIndex)) return;

        const nextRoom = executeMoveOnRoom(room, currentPlayer.color, pieceIndex);
        roomsMap.set(roomId, nextRoom);
        broadcastRoomState(roomId);
        if (nextRoom.status === 'FINISHED') {
          broadcastRoomsList();
        } else {
          scheduleBotTurnIfNeeded(roomId);
        }
        return;
      }

      if (type === 'game:surrender_decision') {
        const roomId = String(msg.roomId || meta.roomId || '');
        const decision = msg.decision === 'accept_defeat' ? 'accept_defeat' : 'continue';
        const room = roomsMap.get(roomId);
        if (!room || room.status !== 'PLAYING' || room.boardState.winner) return;

        const offer = room.boardState.surrenderOffer;
        if (!offer) return;

        const responder = room.players.find((p) => p.userId === meta.userId);
        if (!responder || !offer.targetColors.includes(responder.color)) return;

        const remainingTargets = offer.targetColors.filter((c) => c !== responder.color);

        if (decision === 'accept_defeat') {
          const updatedPlayers = room.players.map((p) =>
            p.color === responder.color ? { ...p, resigned: true } : p
          );
          const remainingActive = updatedPlayers.filter((p) => !p.resigned);

          // If only 1 player remains (all 2-player duels, or last opponent resigned), leader wins immediately
          if (remainingActive.length <= 1) {
            clearRoomTimers(roomId);
            const finishedRoom: Room = {
              ...room,
              status: 'FINISHED',
              players: updatedPlayers,
              boardState: {
                ...room.boardState,
                winner: offer.leaderColor,
                hasRolled: false,
                isRolling: false,
                eligiblePieces: [],
                surrenderOffer: null,
                lastAction: `🏳️ ${responder.name} aceitou a derrota! 🏆 ${offer.leaderName} venceu a partida!`
              }
            };
            roomsMap.set(roomId, finishedRoom);
            broadcastRoomState(roomId);
            broadcastRoomsList();
            return;
          }

          // Multi-player (3P/4P) where another opponent still wants to play
          let multiRoom: Room = {
            ...room,
            players: updatedPlayers,
            boardState: {
              ...room.boardState,
              surrenderOffer:
                remainingTargets.length > 0
                  ? { ...offer, targetColors: remainingTargets }
                  : null,
              turnTimer: TURN_SECONDS,
              lastAction: `🏳️ ${responder.name} aceitou a derrota! A partida continua para os restantes jogadores.`
            }
          };
          if (multiRoom.boardState.currentTurnColor === responder.color) {
            multiRoom = passTurnToNextPlayer(multiRoom, `${responder.name} aceitou a derrota.`);
          }
          roomsMap.set(roomId, multiRoom);
          broadcastRoomState(roomId);
          scheduleBotTurnIfNeeded(roomId);
          return;
        }

        // Player chose to CONTINUE the game until 3 pieces reach the goal
        const nextOffer =
          remainingTargets.length > 0
            ? {
                ...offer,
                targetColors: remainingTargets,
                respondedColors: [...offer.respondedColors, responder.color]
              }
            : null;

        const continuedRoom: Room = {
          ...room,
          boardState: {
            ...room.boardState,
            surrenderOffer: nextOffer,
            turnTimer: TURN_SECONDS,
            lastAction: nextOffer
              ? `💪 ${responder.name} escolheu continuar! Aguardando resposta de outro adversário...`
              : `💪 ${responder.name} decidiu continuar o jogo! A disputa segue até às 3 peças na meta!`
          }
        };
        roomsMap.set(roomId, continuedRoom);
        broadcastRoomState(roomId);
        if (!nextOffer) {
          scheduleBotTurnIfNeeded(roomId);
        }
        return;
      }

      if (type === 'game:restart') {
        const roomId = String(msg.roomId || meta.roomId || '');
        const room = roomsMap.get(roomId);
        if (!room) return;
        if (!room.players.some((p) => p.userId === meta.userId)) return;

        clearRoomTimers(roomId);

        const resetPlayers = room.players.map((p) => ({
          ...p,
          pieces: createInitialPieces(p.color),
          rank: undefined,
          resigned: false
        }));

        const canPlay = resetPlayers.length >= 2;
        const restartedRoom: Room = {
          ...room,
          status: canPlay ? 'PLAYING' : 'WAITING',
          players: resetPlayers,
          boardState: {
            currentTurnColor: resetPlayers[0]?.color || 'red',
            diceValue: 1,
            isRolling: false,
            hasRolled: false,
            eligiblePieces: [],
            winner: null,
            turnTimer: TURN_SECONDS,
            consecutiveSixes: 0,
            lastAction: canPlay
              ? `Nova partida iniciada! É a vez de ${resetPlayers[0].name}. Role o dado!`
              : 'Aguardando outro jogador para começar a partida...',
            captureEvent: null,
            surrenderOffer: null,
            askedTwoGoalColors: []
          }
        };

        roomsMap.set(roomId, restartedRoom);
        broadcastRoomState(roomId);
        broadcastRoomsList();
        scheduleBotTurnIfNeeded(roomId);
        return;
      }

      if (type === 'game:chat') {
        const roomId = String(msg.roomId || meta.roomId || '');
        const text = String(msg.text || '').trim();
        const room = roomsMap.get(roomId);
        if (!room || !text) return;

        const senderPlayer = room.players.find((p) => p.userId === meta.userId);
        const chatMsg: ChatMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          userId: meta.userId,
          userName: meta.userName,
          userColor: senderPlayer?.color,
          text: text.slice(0, 300),
          timestamp: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })
        };

        const updated: Room = {
          ...room,
          chat: [...room.chat.slice(-80), chatMsg]
        };
        roomsMap.set(roomId, updated);
        broadcastRoomState(roomId);
      }
    });

    ws.on('close', () => {
      const closingMeta = clientsMap.get(ws);
      clientsMap.delete(ws);

      if (closingMeta && closingMeta.roomId) {
        const room = roomsMap.get(closingMeta.roomId);
        if (room) {
          // Check if user still has another open socket
          const hasOtherSocket = Array.from(clientsMap.values()).some((m) => m.userId === closingMeta.userId);
          if (!hasOtherSocket) {
            const pIdx = room.players.findIndex((p) => p.userId === closingMeta.userId);
            if (pIdx !== -1) {
              room.players[pIdx] = { ...room.players[pIdx], isConnected: false };
              roomsMap.set(room.id, room);
              broadcastRoomState(room.id);
            }
          }
        }
      }
      broadcastRoomsList();
    });
  });

  // Authoritative 1-second Turn Timer across all active PLAYING rooms
  setInterval(() => {
    for (const [roomId, room] of roomsMap.entries()) {
      if (room.status !== 'PLAYING' || room.boardState.winner || room.boardState.surrenderOffer || room.players.length < 2) continue;

      const currentTimer = room.boardState.turnTimer;
      if (currentTimer <= 1) {
        const nextRoom = passTurnToNextPlayer(room, 'Tempo esgotado! A vez passou.');
        roomsMap.set(roomId, nextRoom);
        broadcastRoomState(roomId);
        scheduleBotTurnIfNeeded(roomId);
      } else {
        const nextTimer = currentTimer - 1;
        room.boardState.turnTimer = nextTimer;
        broadcastRoomTick(roomId, nextTimer);
      }
    }
  }, 1000);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[N – NÃO TE IRRITES] Multiplayer Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
