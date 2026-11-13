/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { LudoBoard } from './components/LudoBoard';
import { RoomsView } from './components/RoomsView';
import { WalletView } from './components/WalletView';
import { RankingView } from './components/RankingView';
import { SupportView } from './components/SupportView';
import { AdminPanel } from './components/AdminPanel';
import { AuthView } from './components/AuthView';
import { ShieldCheck, Heart } from 'lucide-react';

function MainLayout() {
  const { activeTab, setActiveTab, isLoggedIn } = useGame();

  if (!isLoggedIn) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-[#0c0d10] text-neutral-100 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* Top Bar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'game' && <LudoBoard />}
        {activeTab === 'rooms' && <RoomsView />}
        {activeTab === 'wallet' && <WalletView />}
        {activeTab === 'ranking' && <RankingView />}
        {activeTab === 'support' && <SupportView />}
        {activeTab === 'admin' && <AdminPanel />}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/80 bg-neutral-950/90 py-8 px-4 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-600 via-neutral-900 to-black border border-yellow-500/40 flex items-center justify-center font-black text-sm text-yellow-400">
              N
            </div>
            <div>
              <span className="font-bold text-white block">N – NÃO TE IRRITES</span>
              <span className="text-[11px] text-neutral-400">Plataforma Angolana de Jogos Multiplayer</span>
            </div>
          </div>

          <div className="text-center md:text-right text-[11px] text-neutral-400 space-y-1">
            <p className="flex items-center justify-center md:justify-end gap-1">
              <span>Desenvolvido com identidade 100% Angolana</span>
              <span className="text-red-500 font-bold">🇦🇴</span>
            </p>
            <p className="text-neutral-500 text-[10px]">
              Modo demonstrativo pré-regulatório · Banco Nacional de Angola (BNA) & ISJ · Termos e Jogo Responsável +18
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <MainLayout />
    </GameProvider>
  );
}
