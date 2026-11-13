import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import {
  Trophy,
  PlusCircle,
  LogIn,
  Users,
  Wallet,
  Clock,
  ArrowUpCircle,
  HelpCircle,
  UserCheck,
  Play,
  Gamepad2,
  KeyRound,
  Wifi,
  Bot
} from 'lucide-react';
import { EditProfileModal } from './EditProfileModal';

export const DashboardView: React.FC = () => {
  const {
    currentUser,
    setActiveTab,
    rooms,
    joinRoom,
    joinRoomByCode,
    createRoom,
    onlineCount,
    wsConnected,
    roomError,
    clearRoomError,
    walletMode,
    setWalletMode
  } = useGame();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState('');

  // Calculate win percentage
  const totalMatches = currentUser.matchesPlayed || 1;
  const winRate = Math.round((currentUser.wins / totalMatches) * 100);

  // Category badge colors
  const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    'Bronze': { bg: 'bg-amber-950/60', text: 'text-amber-500', border: 'border-amber-700/50' },
    'Prata': { bg: 'bg-slate-800/60', text: 'text-slate-300', border: 'border-slate-500/50' },
    'Ouro': { bg: 'bg-yellow-950/60', text: 'text-yellow-400', border: 'border-yellow-500/50' },
    'Platina': { bg: 'bg-cyan-950/60', text: 'text-cyan-300', border: 'border-cyan-500/50' },
    'Diamante': { bg: 'bg-blue-950/60', text: 'text-blue-400', border: 'border-blue-500/50' },
    'Lenda N': { bg: 'bg-red-950/80', text: 'text-red-400', border: 'border-red-500' }
  };

  const badgeStyle = CATEGORY_STYLES[currentUser.category] || CATEGORY_STYLES['Ouro'];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* HERO BANNER: Player Card & Main Status */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[#17181f] via-[#1b1216] to-[#111217] border border-neutral-800 shadow-2xl overflow-hidden">
        {/* Angolan decorative flame glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Player Identity */}
          <div className="flex items-center gap-5">
            <div 
              onClick={() => setShowProfileModal(true)}
              className="relative cursor-pointer group"
              title="Clique para editar o seu boneco de jogo"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                referrerPolicy="no-referrer"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-yellow-500/60 group-hover:border-yellow-400 shadow-xl transition-all"
              />
              <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md bg-neutral-900 border border-yellow-500 text-[10px] font-extrabold text-yellow-400 uppercase tracking-wider shadow flex items-center gap-1">
                <span>{currentUser.category}</span>
                <span className="text-red-500">✎</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-3xl font-black text-white">{currentUser.name}</h1>
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-yellow-400 hover:text-white text-xs font-bold border border-neutral-700 flex items-center gap-1 transition-colors"
                >
                  <Gamepad2 className="w-3.5 h-3.5" />
                  <span>Editar Perfil</span>
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 mt-1">
                <span>{currentUser.phone}</span>
                <span>·</span>
                <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                  Categoria {currentUser.category}
                </span>
                <span>·</span>
                <span className="text-neutral-500">Membro N Angola</span>
              </div>

              {/* Quick Play & Deposit CTA */}
              <div className="flex items-center gap-3 mt-4 flex-wrap">
                <button
                  onClick={() => {
                    const freeOrAffordable = rooms.find(
                      (r) => r.status === 'WAITING' && r.players.length < r.maxPlayers && r.betAmount === 0
                    );
                    if (freeOrAffordable) {
                      joinRoom(freeOrAffordable.id);
                    } else {
                      setActiveTab('rooms');
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-yellow-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-950/60 hover:brightness-110 active:scale-95 transition-all"
                >
                  <Play className="w-4 h-4 fill-white" />
                  JOGAR AGORA
                </button>
                <button
                  onClick={() => setActiveTab('wallet')}
                  className="px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-xs font-bold hover:bg-neutral-800 transition-colors"
                >
                  Depositar (BFA / Express)
                </button>
              </div>
            </div>
          </div>

          {/* Dual Balances Display (Real ZERO e Demo Simulado) */}
          <div className="flex flex-col gap-2.5 bg-neutral-950/90 p-4 rounded-2xl border border-neutral-800">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-extrabold">
                STATUS DOS SALDOS
              </span>
              <button
                onClick={() => setWalletMode(walletMode === 'REAL' ? 'DEMO' : 'REAL')}
                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border transition-all ${
                  walletMode === 'REAL'
                    ? 'bg-red-600/30 border-red-500 text-red-300'
                    : 'bg-yellow-500/30 border-yellow-400 text-yellow-300'
                }`}
              >
                Ativo: {walletMode}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-neutral-800/80">
              <div className="text-left">
                <span className="text-[9px] uppercase tracking-wider text-red-400 font-bold block">
                  SALDO REAL (KZ)
                </span>
                <span className="text-xl font-black text-white tabular-nums">
                  {currentUser.kzBalance.toLocaleString('pt-AO')} <span className="text-[10px] text-neutral-400">Kz</span>
                </span>
                <span className="text-[8px] text-neutral-500 block leading-tight">
                  {currentUser.kzBalance === 0 ? 'Requer depósito aprovado pelo Admin' : 'Saldo confirmado'}
                </span>
              </div>
              <div className="text-left">
                <span className="text-[9px] uppercase tracking-wider text-yellow-400 font-bold block">
                  SALDO DEMO (KZ)
                </span>
                <span className="text-xl font-black text-yellow-300 tabular-nums">
                  {(currentUser.demoKzBalance ?? 50000).toLocaleString('pt-AO')} <span className="text-[10px] text-yellow-500">Kz</span>
                </span>
                <span className="text-[8px] text-yellow-600 block leading-tight">
                  Simulado para treinar nas mesas
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 10 ATALHOS OBRIGATÓRIOS DO DASHBOARD (Specified in project spec) */}
      <div>
        <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3 px-1">
          Atalhos Rápidos do Jogador
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {/* 1. Jogar agora */}
          <button
            onClick={() => setActiveTab('rooms')}
            className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-red-500/50 flex flex-col items-center justify-center text-center transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 fill-red-400" />
            </div>
            <span className="text-xs font-bold text-white">1. Jogar Agora</span>
          </button>

          {/* 2. Criar sala */}
          <button
            onClick={() => setActiveTab('rooms')}
            className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-yellow-500/50 flex flex-col items-center justify-center text-center transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 text-yellow-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <PlusCircle className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">2. Criar Sala</span>
          </button>

          {/* 3. Entrar numa sala */}
          <button
            onClick={() => setActiveTab('rooms')}
            className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-blue-500/50 flex flex-col items-center justify-center text-center transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <LogIn className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">3. Entrar numa Sala</span>
          </button>

          {/* 4. Jogar com amigos */}
          <button
            onClick={() => setActiveTab('rooms')}
            className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-emerald-500/50 flex flex-col items-center justify-center text-center transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">4. Jogar com Amigos</span>
          </button>

          {/* 5. Ranking */}
          <button
            onClick={() => setActiveTab('ranking')}
            className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-yellow-500/50 flex flex-col items-center justify-center text-center transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-yellow-600/20 text-yellow-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Trophy className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">5. Ranking</span>
          </button>

          {/* 6. Minha carteira */}
          <button
            onClick={() => setActiveTab('wallet')}
            className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 flex flex-col items-center justify-center text-center transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">6. Minha Carteira</span>
          </button>

          {/* 7. Histórico */}
          <button
            onClick={() => setActiveTab('wallet')}
            className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-purple-500/50 flex flex-col items-center justify-center text-center transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">7. Histórico</span>
          </button>

          {/* 8. Levantamentos */}
          <button
            onClick={() => setActiveTab('wallet')}
            className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-emerald-500/50 flex flex-col items-center justify-center text-center transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <ArrowUpCircle className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">8. Levantamentos</span>
          </button>

          {/* 9. Chat de suporte */}
          <button
            onClick={() => setActiveTab('support')}
            className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-sky-500/50 flex flex-col items-center justify-center text-center transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-sky-600/20 text-sky-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <HelpCircle className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">9. Chat Suporte</span>
          </button>

          {/* 10. Meu perfil */}
          <button
            onClick={() => setShowProfileModal(true)}
            className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-pink-500/50 flex flex-col items-center justify-center text-center transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-pink-600/20 text-pink-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <UserCheck className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">10. Meu Perfil</span>
          </button>
        </div>
      </div>

      {/* METRICS & PERFORMANCE GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
          <span className="text-neutral-400 text-xs font-medium block">Total de Partidas</span>
          <span className="text-2xl font-black text-white tabular-nums mt-1 block">
            {currentUser.matchesPlayed}
          </span>
          <span className="text-[11px] text-neutral-500 mt-1 block">
            {currentUser.wins} vitórias · {currentUser.losses} derrotas
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
          <span className="text-neutral-400 text-xs font-medium block">Aproveitamento</span>
          <span className="text-2xl font-black text-yellow-400 tabular-nums mt-1 block">
            {winRate}%
          </span>
          <span className="text-[11px] text-neutral-500 mt-1 block">
            Eficiência competitiva
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
          <span className="text-neutral-400 text-xs font-medium block">Total de Ganhos</span>
          <span className="text-2xl font-black text-emerald-400 tabular-nums mt-1 block">
            {currentUser.totalEarnedKz.toLocaleString('pt-AO')} <span className="text-xs text-neutral-400">Kz</span>
          </span>
          <span className="text-[11px] text-emerald-500/80 mt-1 block">
            + {currentUser.totalEarnedUsdt} USDT
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
          <span className="text-neutral-400 text-xs font-medium block">Total de Perdas</span>
          <span className="text-2xl font-black text-red-400 tabular-nums mt-1 block">
            {currentUser.totalLostKz.toLocaleString('pt-AO')} <span className="text-xs text-neutral-400">Kz</span>
          </span>
          <span className="text-[11px] text-red-500/80 mt-1 block">
            - {currentUser.totalLostUsdt} USDT
          </span>
        </div>
      </div>

      {/* JOGAR COM AMIGO POR CÓDIGO OU VS BOT (IA) */}
      <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-r from-emerald-950/50 via-neutral-900 to-neutral-900 border border-emerald-500/30 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Users className="w-4 h-4 text-emerald-400" />
              <h3 className="text-base font-black text-white">Jogar com Amigo (Código) ou Contra Bot (IA)</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-950 border border-neutral-800 text-[10px] font-bold text-emerald-400">
                <Wifi className={`w-3 h-3 ${wsConnected ? 'text-emerald-400' : 'text-red-400'}`} />
                {onlineCount} online
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Convide o seu amigo enviando o código da sala ou escolha jogar imediatamente contra o Bot (IA).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() =>
                createRoom({
                  name: `Treino vs Bot`,
                  currency: 'KZ',
                  betAmount: 0,
                  maxPlayers: 2,
                  isPrivate: true,
                  withBots: true
                })
              }
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <Bot className="w-4 h-4" />
              Jogar vs Bot (IA)
            </button>

            <button
              onClick={() =>
                createRoom({
                  name: `Sala de ${currentUser.name.split(' ')[0]}`,
                  currency: 'KZ',
                  betAmount: 0,
                  maxPlayers: 2,
                  isPrivate: true,
                  withBots: false
                })
              }
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              Criar Sala p/ Amigo
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            clearRoomError();
            if (inviteCodeInput.trim()) {
              joinRoomByCode(inviteCodeInput.trim());
            }
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <KeyRound className="w-4 h-4 text-yellow-400 absolute left-3 top-3" />
            <input
              type="text"
              value={inviteCodeInput}
              onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
              placeholder="Introduza o código da sala do amigo (Ex: AO-4821)"
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={!inviteCodeInput.trim()}
            className="px-5 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black font-black text-xs uppercase tracking-wider transition-all"
          >
            Entrar com Código
          </button>
        </form>

        {roomError && (
          <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-600 text-xs font-bold text-red-300">
            {roomError}
          </div>
        )}
      </div>

      {/* ACTIVE ROOMS SHOWCASE */}
      <div className="rounded-2xl p-6 bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Mesas Online Abertas</h3>
            <p className="text-xs text-neutral-400">Apenas jogadores humanos reais · Sem robôs</p>
          </div>
          <button
            onClick={() => setActiveTab('rooms')}
            className="text-xs text-yellow-400 hover:text-white font-semibold"
          >
            Ver Todas as Mesas →
          </button>
        </div>

        {rooms.filter((r) => !r.isPrivate && r.status === 'WAITING').length === 0 ? (
          <div className="p-5 rounded-xl bg-neutral-950 border border-neutral-800 text-center text-xs text-neutral-400">
            Nenhuma mesa pública disponível no momento. Crie uma sala ou entre com o código de um amigo acima.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rooms
              .filter((r) => !r.isPrivate)
              .slice(0, 2)
              .map((room) => (
                <div
                  key={room.id}
                  className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{room.name}</span>
                      <span className="text-[10px] bg-neutral-800 text-yellow-400 px-1.5 py-0.5 rounded font-mono">
                        {room.code}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1">
                      <span>{room.players.length}/{room.maxPlayers} Jogadores Reais</span>
                      <span>·</span>
                      <span className="text-emerald-400 font-bold">
                        {room.betAmount === 0
                          ? 'Amigável (Grátis)'
                          : `Prémio: ${room.prizePool.toLocaleString('pt-AO')} ${room.currency}`}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => joinRoom(room.id)}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold text-xs hover:bg-red-500 transition-colors shadow-md shadow-red-950 shrink-0"
                  >
                    Entrar
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Full Edit Profile Modal (Bonecos de Game, Nome, Passe, Telefone) */}
      <EditProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
    </div>
  );
};
