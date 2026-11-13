import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Volume2, VolumeX, Shield, Wallet, Trophy, Swords, Home, HelpCircle, Lock, Unlock, LogOut, User, Sparkles, Gamepad2 } from 'lucide-react';
import { AdminPinModal } from './AdminPinModal';
import { EditProfileModal } from './EditProfileModal';

export const Navbar: React.FC = () => {
  const {
    currentUser,
    activeTab,
    setActiveTab,
    isMuted,
    toggleSound,
    isAdminUnlocked,
    lockAdmin,
    logout,
    walletMode,
    setWalletMode
  } = useGame();
  const [showPinModal, setShowPinModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  const handleAdminClick = () => {
    if (isAdminUnlocked) {
      setActiveTab('admin');
    } else {
      setShowPinModal(true);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#0c0d10] border-b border-red-900/30 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 md:gap-6">
          {/* Zone 1: Brand title with Angolan stylized N */}
          <div 
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer group shrink-0"
          >
            <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-yellow-500/40 shadow-lg shadow-red-950/50 flex items-center justify-center bg-gradient-to-br from-red-700 via-neutral-900 to-black">
              <span className="font-extrabold text-2xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-t from-yellow-400 via-amber-200 to-white">
                N
              </span>
              <div className="absolute inset-0 bg-yellow-500/10 pointer-events-none group-hover:bg-yellow-500/20 transition-colors" />
            </div>
            <div>
              <span className="text-base sm:text-xl font-black tracking-tight text-white block leading-none">
                N – NÃO TE IRRITES
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-yellow-400 font-semibold block mt-0.5">
                Angola Gaming · KZ & USDT
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-5 text-sm font-medium">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'dashboard' ? 'text-yellow-400 font-semibold' : 'text-neutral-300 hover:text-white'
              }`}
            >
              <Home className="w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('rooms')}
              className={`flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'rooms' || activeTab === 'game' ? 'text-yellow-400 font-semibold' : 'text-neutral-300 hover:text-white'
              }`}
            >
              <Swords className="w-4 h-4" />
              Mesas de Jogo
            </button>
            <button
              onClick={() => setActiveTab('wallet')}
              className={`flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'wallet' ? 'text-yellow-400 font-semibold' : 'text-neutral-300 hover:text-white'
              }`}
            >
              <Wallet className="w-4 h-4" />
              Minha Carteira
            </button>
            <button
              onClick={() => setActiveTab('ranking')}
              className={`flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'ranking' ? 'text-yellow-400 font-semibold' : 'text-neutral-300 hover:text-white'
              }`}
            >
              <Trophy className="w-4 h-4" />
              Ranking
            </button>
            <button
              onClick={() => setActiveTab('support')}
              className={`flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'support' ? 'text-yellow-400 font-semibold' : 'text-neutral-300 hover:text-white'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              Suporte
            </button>
            <button
              onClick={handleAdminClick}
              className={`flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'admin' ? 'text-red-400 font-bold' : 'text-neutral-400 hover:text-red-300'
              }`}
            >
              <Shield className="w-4 h-4" />
              ADMIN N
              {!isAdminUnlocked && <Lock className="w-3 h-3 text-red-500" />}
            </button>
          </nav>

          {/* Zone 3: Balances, Admin Status, sound toggle and User/Admin Enter-Exit */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick Balance pills with Real vs Demo toggle */}
            <div className="hidden sm:flex items-center gap-2 bg-neutral-900/90 border border-neutral-800 rounded-xl p-1">
              <div 
                onClick={() => setActiveTab('wallet')}
                className="cursor-pointer flex items-center gap-2 px-2.5 py-1 hover:border-yellow-500/50 transition-colors"
                title={walletMode === 'REAL' ? 'Saldo Real (0 Kz inicial, aumentará após depósito aprovado pelo Admin)' : 'Saldo Demo para treinar nas mesas'}
              >
                {walletMode === 'REAL' ? (
                  <>
                    <div className="text-right">
                      <span className="block text-[9px] text-red-400 font-extrabold tracking-tight">REAL KZ</span>
                      <span className="text-xs font-bold text-white tabular-nums">
                        {currentUser.kzBalance.toLocaleString('pt-AO')} Kz
                      </span>
                    </div>
                    <div className="h-5 w-[1px] bg-neutral-700" />
                    <div className="text-right">
                      <span className="block text-[9px] text-emerald-400 font-extrabold tracking-tight">REAL USDT</span>
                      <span className="text-xs font-bold text-emerald-300 tabular-nums">
                        {currentUser.usdtBalance.toLocaleString('pt-AO')} USDT
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-right">
                    <span className="block text-[9px] text-yellow-400 font-extrabold tracking-tight">DEMO SIMULADO</span>
                    <span className="text-xs font-bold text-yellow-300 tabular-nums">
                      {(currentUser.demoKzBalance ?? 50000).toLocaleString('pt-AO')} Kz
                    </span>
                  </div>
                )}
              </div>

              {/* Mode Toggle Button */}
              <button
                onClick={() => setWalletMode(walletMode === 'REAL' ? 'DEMO' : 'REAL')}
                className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border transition-all ${
                  walletMode === 'REAL'
                    ? 'bg-red-600/30 border-red-500 text-red-300 hover:bg-red-600 hover:text-white'
                    : 'bg-yellow-500/30 border-yellow-400 text-yellow-300 hover:bg-yellow-500 hover:text-black'
                }`}
                title="Alternar entre Saldo Real e Saldo Demo"
              >
                {walletMode === 'REAL' ? 'MODO: REAL' : 'MODO: DEMO'}
              </button>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              aria-label="Ativar ou desativar som"
              className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-yellow-400 hover:border-neutral-700 transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-neutral-500" /> : <Volume2 className="w-4 h-4 text-yellow-400" />}
            </button>

            {/* Admin Enter / Exit buttons */}
            {isAdminUnlocked ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`px-2.5 py-1.5 text-xs rounded-lg font-black uppercase tracking-wider flex items-center gap-1 transition-all ${
                    activeTab === 'admin'
                      ? 'bg-red-600 text-white shadow-md shadow-red-950 ring-1 ring-yellow-400'
                      : 'bg-red-950/80 text-yellow-400 hover:bg-red-900 border border-red-700'
                  }`}
                  title="Abrir painel administrativo"
                >
                  <Shield className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="hidden sm:inline">Admin N</span>
                </button>
                <button
                  onClick={lockAdmin}
                  className="px-2.5 py-1.5 text-xs rounded-lg font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-red-400 border border-neutral-700 flex items-center gap-1 transition-all"
                  title="Sair do modo administrador e voltar ao modo jogador"
                >
                  <Lock className="w-3.5 h-3.5 text-red-400" />
                  <span className="hidden md:inline">Sair do Admin</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleAdminClick}
                className="px-2.5 py-1.5 text-xs rounded-lg font-bold bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-yellow-400 border border-neutral-800 hover:border-red-900/50 flex items-center gap-1.5 transition-all"
                title="Entrar com PIN no painel administrativo"
              >
                <Shield className="w-3.5 h-3.5 text-red-500" />
                <span className="hidden sm:inline">Entrar Admin</span>
              </button>
            )}

            {/* User Profile Badge (Click to Edit Profile Bonecos / Nome / Telefone / Senha) */}
            <div 
              onClick={() => setShowEditProfileModal(true)}
              className="flex items-center gap-2 cursor-pointer group bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 hover:border-yellow-400 rounded-lg px-2 py-1 transition-all"
              title="Clique para editar o seu boneco de jogo, nome, palavra-passe e telemóvel"
            >
              <div className="relative">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full object-cover border border-yellow-500/50 group-hover:border-yellow-400"
                />
                <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-red-600 rounded-full border border-black flex items-center justify-center text-[7px] text-white">
                  ✎
                </span>
              </div>
              <div className="hidden xl:block text-left leading-tight">
                <span className="block text-xs font-semibold text-neutral-200 group-hover:text-white">
                  {currentUser.name.split(' ')[0]}
                </span>
                <span className="block text-[9px] text-yellow-400 font-mono">
                  {isAdminUnlocked ? 'Auditor Admin' : 'Editar Perfil'}
                </span>
              </div>
            </div>

            {/* Logout button (Sair tanto para utilizador como para admin) */}
            <button
              onClick={logout}
              title="Terminar Sessão e Sair"
              className="px-2.5 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-900/60 text-red-400 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>

        {/* Mobile navigation tab strip */}
        <div className="flex lg:hidden items-center justify-around pt-2.5 mt-2 border-t border-neutral-800 text-xs text-neutral-400">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-0.5 ${activeTab === 'dashboard' ? 'text-yellow-400 font-semibold' : ''}`}
          >
            <Home className="w-4 h-4" />
            <span>Início</span>
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`flex flex-col items-center gap-0.5 ${activeTab === 'rooms' || activeTab === 'game' ? 'text-yellow-400 font-semibold' : ''}`}
          >
            <Swords className="w-4 h-4" />
            <span>Jogar</span>
          </button>
          <button
            onClick={() => setActiveTab('wallet')}
            className={`flex flex-col items-center gap-0.5 ${activeTab === 'wallet' ? 'text-yellow-400 font-semibold' : ''}`}
          >
            <Wallet className="w-4 h-4" />
            <span>Carteira</span>
          </button>
          <button
            onClick={() => setActiveTab('ranking')}
            className={`flex flex-col items-center gap-0.5 ${activeTab === 'ranking' ? 'text-yellow-400 font-semibold' : ''}`}
          >
            <Trophy className="w-4 h-4" />
            <span>Ranking</span>
          </button>
          <button
            onClick={handleAdminClick}
            className={`flex flex-col items-center gap-0.5 ${activeTab === 'admin' ? 'text-red-400 font-bold' : ''}`}
          >
            <Shield className="w-4 h-4" />
            <span>{isAdminUnlocked ? 'Admin (Ativo)' : 'Admin'}</span>
          </button>
          <button
            onClick={logout}
            className="flex flex-col items-center gap-0.5 text-red-400 hover:text-white"
            title="Sair da Conta"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* Admin PIN Protection Modal */}
      <AdminPinModal isOpen={showPinModal} onClose={() => setShowPinModal(false)} />

      {/* Edit Profile (Bonecos de Game, Nome, Passe, Telefone) Modal */}
      <EditProfileModal isOpen={showEditProfileModal} onClose={() => setShowEditProfileModal(false)} />
    </>
  );
};
