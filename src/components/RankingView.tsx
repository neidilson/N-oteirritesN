import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Trophy, Award, Crown, Medal, Flame } from 'lucide-react';
import { PlayerCategory } from '../types';

export const RankingView: React.FC = () => {
  const { rankingList } = useGame();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('weekly');

  const LEAGUES: { name: PlayerCategory; color: string; desc: string; icon: string }[] = [
    { name: 'Bronze', color: 'from-amber-700 to-amber-900', desc: 'Iniciantes até 1.000 pts', icon: '🥉' },
    { name: 'Prata', color: 'from-slate-400 to-slate-600', desc: 'Aspirantes 1.000–3.000 pts', icon: '🥈' },
    { name: 'Ouro', color: 'from-yellow-400 to-amber-600', desc: 'Veteranos 3.000–5.000 pts', icon: '🥇' },
    { name: 'Platina', color: 'from-cyan-400 to-blue-600', desc: 'Mestres 5.000–7.500 pts', icon: '💠' },
    { name: 'Diamante', color: 'from-blue-400 to-indigo-600', desc: 'Elite 7.500–9.000 pts', icon: '💎' },
    { name: 'Lenda N', color: 'from-red-600 to-yellow-500', desc: 'Campeões Nacionais > 9.000 pts', icon: '👑' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
            <Trophy className="w-7 h-7 text-yellow-400" />
            Ranking & Ligas de Campeões
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Os melhores jogadores de Não Te Irrites de Angola e da arena internacional.
          </p>
        </div>

        {/* Time filters */}
        <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-xl self-start sm:self-auto">
          {[
            { id: 'daily', label: 'Diário' },
            { id: 'weekly', label: 'Semanal' },
            { id: 'monthly', label: 'Mensal' },
            { id: 'all', label: 'Geral' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPeriod(item.id as typeof period)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === item.id
                  ? 'bg-yellow-500 text-black shadow-sm font-extrabold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* LEAGUES PROGRESSION SCROLL (matching user reference image) */}
      <div className="rounded-2xl p-5 bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800">
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-neutral-400 block mb-3">
          Categorias & Emblemas Oficiais N
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {LEAGUES.map((league) => (
            <div
              key={league.name}
              className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 flex flex-col items-center text-center hover:border-yellow-500/40 transition-colors"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${league.color} flex items-center justify-center text-lg shadow-md mb-2`}>
                {league.icon}
              </div>
              <span className="text-xs font-bold text-white">{league.name}</span>
              <span className="text-[10px] text-neutral-400 mt-0.5 leading-tight">{league.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* TOP 3 PODIUM */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        {/* 2nd Place */}
        {rankingList[1] && (
          <div className="rounded-2xl p-5 bg-gradient-to-b from-neutral-900 to-neutral-950 border border-slate-700/60 text-center flex flex-col items-center justify-center relative md:order-1 order-2">
            <div className="absolute -top-3 px-3 py-0.5 bg-slate-700 text-slate-200 text-[10px] font-bold rounded-full uppercase tracking-wider">
              2º LUGAR · PRATA
            </div>
            <img
              src={rankingList[1].avatar}
              alt={rankingList[1].name}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-full object-cover border-2 border-slate-400 shadow-lg mb-2 mt-2"
            />
            <h3 className="text-sm font-bold text-white">{rankingList[1].name}</h3>
            <span className="text-xs text-neutral-400">{rankingList[1].country}</span>
            <div className="mt-3 text-xs">
              <span className="text-yellow-400 font-bold block">{rankingList[1].score} pts</span>
              <span className="text-neutral-400 text-[11px]">{rankingList[1].wins} Vitórias ({rankingList[1].winRate}%)</span>
            </div>
          </div>
        )}

        {/* 1st Place (Champion) */}
        {rankingList[0] && (
          <div className="rounded-2xl p-6 bg-gradient-to-b from-[#241c0e] via-neutral-900 to-neutral-950 border-2 border-yellow-500/80 text-center flex flex-col items-center justify-center relative shadow-xl shadow-yellow-950/20 md:order-2 order-1 md:-translate-y-2">
            <div className="absolute -top-4 px-4 py-1 bg-gradient-to-r from-yellow-500 to-amber-400 text-black text-xs font-black rounded-full uppercase tracking-wider shadow flex items-center gap-1">
              <Crown className="w-3.5 h-3.5 fill-black" />
              1º LUGAR · CAMPEÃO N
            </div>
            <img
              src={rankingList[0].avatar}
              alt={rankingList[0].name}
              referrerPolicy="no-referrer"
              className="w-20 h-20 rounded-full object-cover border-4 border-yellow-400 shadow-xl mb-2 mt-2"
            />
            <h3 className="text-base font-extrabold text-white">{rankingList[0].name}</h3>
            <span className="text-xs text-yellow-400/90 font-medium">{rankingList[0].country} · {rankingList[0].category}</span>
            <div className="mt-3 text-xs space-y-0.5">
              <span className="text-xl font-black text-yellow-400 tabular-nums block">{rankingList[0].score} pts</span>
              <span className="text-emerald-400 font-bold block">{rankingList[0].totalEarningsKz.toLocaleString('pt-AO')} Kz Ganhos</span>
              <span className="text-neutral-400 text-[11px]">{rankingList[0].wins} Vitórias · {rankingList[0].winRate}% taxa</span>
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {rankingList[2] && (
          <div className="rounded-2xl p-5 bg-gradient-to-b from-neutral-900 to-neutral-950 border border-amber-900/60 text-center flex flex-col items-center justify-center relative md:order-3 order-3">
            <div className="absolute -top-3 px-3 py-0.5 bg-amber-900 text-amber-200 text-[10px] font-bold rounded-full uppercase tracking-wider">
              3º LUGAR · BRONZE
            </div>
            <img
              src={rankingList[2].avatar}
              alt={rankingList[2].name}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-full object-cover border-2 border-amber-600 shadow-lg mb-2 mt-2"
            />
            <h3 className="text-sm font-bold text-white">{rankingList[2].name}</h3>
            <span className="text-xs text-neutral-400">{rankingList[2].country}</span>
            <div className="mt-3 text-xs">
              <span className="text-yellow-400 font-bold block">{rankingList[2].score} pts</span>
              <span className="text-neutral-400 text-[11px]">{rankingList[2].wins} Vitórias ({rankingList[2].winRate}%)</span>
            </div>
          </div>
        )}
      </div>

      {/* COMPLETE RANKING TABLE */}
      <div className="rounded-2xl p-6 bg-neutral-900 border border-neutral-800 space-y-4">
        <h3 className="text-base font-bold text-white">Tabela Classificativa Completa</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Posição</th>
                <th className="p-3">Jogador</th>
                <th className="p-3">Província / Origem</th>
                <th className="p-3">Categoria</th>
                <th className="p-3">Partidas</th>
                <th className="p-3">Vitórias</th>
                <th className="p-3">Aproveitamento</th>
                <th className="p-3">Pontuação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80">
              {rankingList.map((player) => (
                <tr key={player.id} className="hover:bg-neutral-800/40">
                  <td className="p-3 font-mono font-bold text-yellow-400">
                    #{player.rank}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={player.avatar}
                        alt={player.name}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full object-cover border border-neutral-700"
                      />
                      <span className="font-bold text-white">{player.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-neutral-300">{player.country}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-yellow-400 border border-neutral-700">
                      {player.category}
                    </span>
                  </td>
                  <td className="p-3 tabular-nums text-neutral-400">{player.matchesPlayed}</td>
                  <td className="p-3 tabular-nums font-bold text-white">{player.wins}</td>
                  <td className="p-3 tabular-nums font-bold text-emerald-400">{player.winRate}%</td>
                  <td className="p-3 tabular-nums font-black text-yellow-400 text-sm">{player.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
