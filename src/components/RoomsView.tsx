import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Currency, PlayerColor, BoardThemeId } from '../types';
import { COLOR_HEX, COLOR_NAMES } from '../utils/ludoRules';
import { BOARD_THEME_LIST } from '../utils/boardThemes';
import { BoardThemesModal } from './BoardThemesModal';
import {
  Swords,
  Plus,
  Lock,
  Users,
  Search,
  Flame,
  UserPlus,
  KeyRound,
  Wifi,
  AlertCircle,
  Sparkles,
  Bot,
  Palette
} from 'lucide-react';

export const RoomsView: React.FC = () => {
  const {
    currentUser,
    rooms,
    joinRoom,
    joinRoomByCode,
    createRoom,
    onlineCount,
    wsConnected,
    roomError,
    clearRoomError,
    walletMode
  } = useGame();

  const [filterCurrency, setFilterCurrency] = useState<'ALL' | Currency>('ALL');
  const [filterPlayers, setFilterPlayers] = useState<'ALL' | 2 | 3 | 4>('ALL');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showThemesModal, setShowThemesModal] = useState(false);

  // Create room modal state
  const [newRoomName, setNewRoomName] = useState('Mesa com Amigos');
  const [newRoomMaxPlayers, setNewRoomMaxPlayers] = useState<2 | 3 | 4>(2);
  const [newRoomCurrency, setNewRoomCurrency] = useState<Currency>('KZ');
  const [newRoomBet, setNewRoomBet] = useState<number>(0);
  const [newRoomIsPrivate, setNewRoomIsPrivate] = useState(true);
  const [newRoomWithBots, setNewRoomWithBots] = useState(false);
  const [newRoomPreferredColor, setNewRoomPreferredColor] = useState<PlayerColor>('red');
  const [newRoomTheme, setNewRoomTheme] = useState<BoardThemeId>(currentUser.selectedTheme || 'classic');

  const unlockedThemes = currentUser.unlockedThemes || ['classic'];

  const totalPot = newRoomBet * newRoomMaxPlayers;
  const prizePool = Math.round(totalPot * 0.75);
  const platformFee = Math.round(totalPot * 0.25);

  const filteredRooms = rooms.filter((r) => {
    if (filterCurrency !== 'ALL' && r.currency !== filterCurrency) return false;
    if (filterPlayers !== 'ALL' && r.maxPlayers !== filterPlayers) return false;
    if (inviteCodeInput.trim()) {
      const q = inviteCodeInput.toLowerCase().trim();
      return r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q);
    }
    return true;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoomBet < 0) return;
    clearRoomError();

    const safeTheme = unlockedThemes.includes(newRoomTheme) ? newRoomTheme : 'classic';

    createRoom({
      name: newRoomName.trim() || (newRoomWithBots ? 'Duelo contra Bot (IA)' : 'Mesa com Amigos'),
      maxPlayers: newRoomMaxPlayers,
      currency: newRoomCurrency,
      betAmount: newRoomBet,
      isPrivate: newRoomWithBots ? true : newRoomIsPrivate,
      withBots: newRoomWithBots,
      preferredColor: newRoomPreferredColor,
      boardTheme: safeTheme
    });

    setShowCreateModal(false);
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    joinRoomByCode(inviteCodeInput);
  };

  const openCreateFriendModal = () => {
    clearRoomError();
    setNewRoomName('Duelo de Amigos');
    setNewRoomMaxPlayers(2);
    setNewRoomBet(walletMode === 'DEMO' ? 1000 : 0);
    setNewRoomIsPrivate(true);
    setNewRoomWithBots(false);
    setNewRoomTheme(currentUser.selectedTheme && unlockedThemes.includes(currentUser.selectedTheme) ? currentUser.selectedTheme : 'classic');
    setShowCreateModal(true);
  };

  const handleQuickPlayBot = () => {
    clearRoomError();
    const safeTheme = currentUser.selectedTheme && unlockedThemes.includes(currentUser.selectedTheme) ? currentUser.selectedTheme : 'classic';
    createRoom({
      name: 'Treino vs Bot (IA)',
      maxPlayers: 2,
      currency: 'KZ',
      betAmount: 0,
      isPrivate: true,
      withBots: true,
      preferredColor: newRoomPreferredColor,
      boardTheme: safeTheme
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header with Title and Create Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
              <Swords className="w-7 h-7 text-red-500" />
              Mesas Online & Modo Bot
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                wsConnected
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-700/60'
                  : 'bg-amber-950/60 text-amber-400 border-amber-700/60'
              }`}
            >
              <Wifi className="w-3 h-3" />
              {wsConnected ? `${onlineCount} Online Agora` : 'A ligar...'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Convide o seu amigo por código, entre numa mesa online ou escolha jogar contra o Bot (IA).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowThemesModal(true)}
            className="px-4 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-purple-500/50 text-purple-300 font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all"
          >
            <Palette className="w-4 h-4 text-yellow-400" />
            TEMAS DE TABULEIRO 🔒
          </button>

          <button
            onClick={handleQuickPlayBot}
            className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all"
          >
            <Bot className="w-4 h-4" />
            JOGAR VS BOT (IA)
          </button>

          <button
            onClick={openCreateFriendModal}
            className="px-4 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-yellow-500/50 text-yellow-400 font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            CONVIDAR AMIGO (CÓDIGO)
          </button>

          <button
            onClick={() => {
              clearRoomError();
              setNewRoomIsPrivate(false);
              setNewRoomWithBots(false);
              setShowCreateModal(true);
            }}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-red-600 to-yellow-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-950 hover:brightness-110 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            CRIAR NOVA MESA
          </button>
        </div>
      </div>

      {/* Prominent "Entrar com Código do Amigo" Card */}
      <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-red-950/40 via-neutral-900 to-neutral-950 border border-red-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-yellow-400 shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-white">
              Tem o código de um amigo? Entre direto na sala!
            </h2>
            <p className="text-xs text-neutral-400">
              Peça o código ao seu amigo (ex: <span className="text-yellow-400 font-mono font-bold">AO-4829</span>) e cole aqui para jogarem 100% online sem bots.
            </p>
          </div>
        </div>

        <form onSubmit={handleJoinByCode} className="flex items-center gap-2 shrink-0">
          <div className="relative flex-1 sm:w-52">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={inviteCodeInput}
              onChange={(e) => {
                setInviteCodeInput(e.target.value.toUpperCase());
                if (roomError) clearRoomError();
              }}
              placeholder="Código (ex: AO-4829)"
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-yellow-500 font-mono uppercase tracking-wider"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-yellow-500 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:brightness-110 active:scale-95 transition-all shrink-0 shadow"
          >
            Entrar na Sala
          </button>
        </form>
      </div>

      {/* Inline Error Banner */}
      {roomError && (
        <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-600 text-red-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{roomError}</span>
          </div>
          <button
            onClick={clearRoomError}
            className="text-red-300 hover:text-white font-bold px-2 py-0.5 rounded bg-red-900/50"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-xl bg-neutral-900 border border-neutral-800">
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setFilterCurrency('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterCurrency === 'ALL' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Todas as Moedas
          </button>
          <button
            onClick={() => setFilterCurrency('KZ')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterCurrency === 'KZ' ? 'bg-red-600 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            KZ (Nacional)
          </button>
          <button
            onClick={() => setFilterCurrency('USDT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterCurrency === 'USDT' ? 'bg-emerald-600 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            USDT (Crypto)
          </button>
        </div>

        <div className="flex items-center gap-1 text-xs">
          <span className="text-neutral-500 hidden sm:inline mr-1">Jogadores:</span>
          {(['ALL', 2, 3, 4] as const).map((p) => (
            <button
              key={p}
              onClick={() => setFilterPlayers(p)}
              className={`px-2.5 py-1 rounded text-xs font-bold ${
                filterPlayers === p ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              {p === 'ALL' ? 'Todos' : `${p}P`}
            </button>
          ))}
        </div>
      </div>

      {/* Room Grid */}
      {filteredRooms.length === 0 ? (
        <div className="rounded-2xl p-10 bg-neutral-900/60 border border-neutral-800 text-center space-y-3">
          <Users className="w-10 h-10 text-neutral-500 mx-auto" />
          <h3 className="text-base font-bold text-white">Nenhuma sala pública corresponde ao filtro</h3>
          <p className="text-xs text-neutral-400">
            Crie uma sala nova e envie o código para o seu amigo entrar em segundos!
          </p>
          <button
            onClick={openCreateFriendModal}
            className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-500 inline-flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Criar Sala com Código
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map((room) => {
            const isFull = room.players.length >= room.maxPlayers;
            const statusLabel =
              room.status === 'WAITING'
                ? room.players.length === 0
                  ? 'Aberta · 0 Jogadores'
                  : `Aguardando (${room.players.length}/${room.maxPlayers})`
                : room.status === 'PLAYING'
                ? 'Em Partida'
                : 'Terminada';

            return (
              <div
                key={room.id}
                className="rounded-2xl p-5 bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-yellow-400 bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
                        {room.code}
                      </span>
                      {room.isPrivate && (
                        <span className="text-[10px] text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-700/50 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Privada
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {room.players.length}/{room.maxPlayers} Reais
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-1">{room.name}</h3>
                  <div className="flex items-center gap-2 text-[11px] mb-3">
                    <span
                      className={`px-2 py-0.5 rounded font-semibold ${
                        room.status === 'WAITING'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                          : 'bg-amber-950/60 text-amber-300 border border-amber-800/50'
                      }`}
                    >
                      {statusLabel}
                    </span>
                    <span className="text-neutral-500">
                      {room.players.some((p) => p.isBot) ? '· Com Bot (IA)' : '· Sem Bots'}
                    </span>
                  </div>

                  {/* Seated real players preview */}
                  {room.players.length > 0 && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex -space-x-2">
                        {room.players.map((p) => (
                          <img
                            key={p.userId}
                            src={p.avatar}
                            alt={p.name}
                            title={p.name}
                            className="w-7 h-7 rounded-full border-2 border-neutral-900 bg-neutral-800 object-cover"
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-neutral-300 truncate">
                        {room.players.map((p) => p.name.split(' ')[0]).join(', ')}
                      </span>
                    </div>
                  )}

                  {/* Pot & Commission Box */}
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Entrada:</span>
                      <span className="font-bold text-white">
                        {room.betAmount === 0
                          ? 'Grátis (Amigável)'
                          : `${room.betAmount.toLocaleString('pt-AO')} ${room.currency}`}
                      </span>
                    </div>
                    {room.betAmount > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-yellow-400 font-semibold">Prémio Campeão (75%):</span>
                          <span className="font-bold text-emerald-400">
                            {room.prizePool.toLocaleString('pt-AO')} {room.currency}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] text-neutral-500">
                          <span>Taxa da Plataforma (25%):</span>
                          <span>
                            {room.platformCommission.toLocaleString('pt-AO')} {room.currency}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => joinRoom(room.id)}
                  disabled={isFull}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    isFull
                      ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-red-600 to-red-700 hover:brightness-110 text-white shadow-md shadow-red-950'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-yellow-300" />
                  {isFull ? 'MESA CHEIA' : 'ENTRAR NA MESA'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE ROOM MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <h3 className="text-base font-bold text-white">Criar Sala de Jogo</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-neutral-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Modo de Adversário */}
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1.5">
                  Modo de Adversário:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRoomWithBots(false)}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      !newRoomWithBots
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Amigos / Online
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRoomWithBots(true)}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      newRoomWithBots
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Bot className="w-4 h-4" />
                    Jogar com Bot (IA)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">
                  Nome da Sala:
                </label>
                <input
                  type="text"
                  required
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500"
                />
              </div>

              {/* Escolha a Cor da Sua Base */}
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1.5">
                  Cor da Sua Base:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['red', 'green', 'yellow', 'blue'] as PlayerColor[]).map((c) => {
                    const selected = newRoomPreferredColor === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewRoomPreferredColor(c)}
                        className={`py-2 px-2 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                          selected
                            ? 'bg-neutral-800 border-yellow-400 text-white shadow'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-white/60 shrink-0"
                          style={{ backgroundColor: COLOR_HEX[c].bg }}
                        />
                        <span>{COLOR_NAMES[c]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Aspecto do Tabuleiro */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-neutral-300">
                    Aspecto do Tabuleiro:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowThemesModal(true)}
                    className="text-[11px] font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
                  >
                    <Lock className="w-3 h-3" />
                    Desbloquear Modelos
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {BOARD_THEME_LIST.map((theme) => {
                    const isUnlocked = theme.isFree || unlockedThemes.includes(theme.id);
                    const isSelected = newRoomTheme === theme.id && isUnlocked;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => {
                          if (isUnlocked) {
                            setNewRoomTheme(theme.id);
                          } else {
                            setShowThemesModal(true);
                          }
                        }}
                        className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 ${
                          isSelected
                            ? 'bg-neutral-800 border-yellow-400 text-white'
                            : isUnlocked
                            ? 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-600'
                            : 'bg-neutral-950/60 border-neutral-800/80 text-neutral-500 hover:border-yellow-500/40'
                        }`}
                      >
                        {theme.artUrl ? (
                          <img
                            src={theme.artUrl}
                            alt={theme.name}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-lg object-cover shrink-0 border border-white/15"
                          />
                        ) : (
                          <div
                            className="w-8 h-8 rounded-lg shrink-0 border border-neutral-600 flex items-center justify-center text-xs"
                            style={{ backgroundColor: theme.canvasBg, color: theme.safeStarColor }}
                          >
                            {theme.centerSymbol}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1 text-[11px] font-black">
                            <span className="truncate">{theme.name}</span>
                            {!isUnlocked && <Lock className="w-3 h-3 text-yellow-500 shrink-0" />}
                          </div>
                          <span className="text-[10px] text-neutral-400 block truncate">
                            {isUnlocked ? theme.badge : `${theme.priceKz.toLocaleString('pt-AO')} Kz`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">
                    Moeda:
                  </label>
                  <select
                    value={newRoomCurrency}
                    onChange={(e) => {
                      const c = e.target.value as Currency;
                      setNewRoomCurrency(c);
                      setNewRoomBet(c === 'KZ' ? 0 : 0);
                    }}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500"
                  >
                    <option value="KZ">Kwanza (KZ)</option>
                    <option value="USDT">Tether (USDT)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">
                    Jogadores Reais:
                  </label>
                  <select
                    value={newRoomMaxPlayers}
                    onChange={(e) => setNewRoomMaxPlayers(Number(e.target.value) as 2 | 3 | 4)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500"
                  >
                    <option value={2}>2 Jogadores (Você vs Amigo)</option>
                    <option value={3}>3 Jogadores Reais</option>
                    <option value={4}>4 Jogadores Reais</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">
                  Valor da Entrada ({newRoomCurrency}) — coloque 0 para Amigável Grátis:
                </label>
                <input
                  type="number"
                  min={0}
                  max={newRoomCurrency === 'KZ' ? 5000000 : 200000}
                  value={newRoomBet}
                  onChange={(e) => setNewRoomBet(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-yellow-500"
                />
              </div>

              {newRoomBet > 0 && (
                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Total Arrecadado na Mesa:</span>
                    <span className="font-bold text-white">
                      {totalPot.toLocaleString('pt-AO')} {newRoomCurrency}
                    </span>
                  </div>
                  <div className="flex justify-between text-yellow-400">
                    <span>Prémio do Campeão (75%):</span>
                    <span className="font-bold text-emerald-400">
                      {prizePool.toLocaleString('pt-AO')} {newRoomCurrency}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-500 text-[11px]">
                    <span>Comissão N (25%):</span>
                    <span>
                      {platformFee.toLocaleString('pt-AO')} {newRoomCurrency}
                    </span>
                  </div>
                </div>
              )}

              {!newRoomWithBots && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="privCheck"
                    checked={newRoomIsPrivate}
                    onChange={(e) => setNewRoomIsPrivate(e.target.checked)}
                    className="rounded text-red-600 focus:ring-0 bg-neutral-950 border-neutral-700"
                  />
                  <label htmlFor="privCheck" className="text-xs text-neutral-300 cursor-pointer">
                    Sala Privada (visível apenas para quem tiver o código de convite)
                  </label>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-yellow-500 text-white font-black text-xs uppercase tracking-wider hover:brightness-110 shadow-lg shadow-red-950"
              >
                {newRoomWithBots
                  ? 'INICIAR PARTIDA CONTRA BOT (IA)'
                  : 'CRIAR SALA E GERAR CÓDIGO DE CONVITE'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Board Themes Modal */}
      <BoardThemesModal
        isOpen={showThemesModal}
        onClose={() => setShowThemesModal(false)}
        onSelectTheme={(id) => setNewRoomTheme(id)}
      />
    </div>
  );
};
