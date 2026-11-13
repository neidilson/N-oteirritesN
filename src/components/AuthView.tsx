import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { ShieldCheck, Shield, Mail, Lock, User, ArrowRight, KeyRound, Users } from 'lucide-react';

export const AuthView: React.FC = () => {
  const { login, loginAdmin, pendingInviteCode } = useGame();
  const [mode, setModeState] = useState<'register' | 'login' | 'admin'>(() => {
    try {
      const saved = sessionStorage.getItem('nti_auth_mode');
      if (saved === 'login' || saved === 'admin' || saved === 'register') return saved;
    } catch {
      // ignore
    }
    return 'register';
  });

  const setMode = (m: 'register' | 'login' | 'admin') => {
    setModeState(m);
    setAuthError(null);
    try {
      sessionStorage.setItem('nti_auth_mode', m);
    } catch {
      // ignore
    }
  };

  // Form Fields for Player
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [ageVerified, setAgeVerified] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Form Fields for Admin
  const [adminPin, setAdminPin] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);

  // Handler for Player Registration (Direct login, NO OTP)
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!termsAccepted || !ageVerified) {
      setAuthError('É obrigatório ter 18 anos ou mais e aceitar os termos de uso.');
      return;
    }
    if (!name.trim()) {
      setAuthError('Por favor introduza o seu nome completo.');
      return;
    }
    if (!phone.trim()) {
      setAuthError('Por favor introduza o seu número de telemóvel.');
      return;
    }
    if (!password.trim()) {
      setAuthError('Por favor defina uma palavra-passe.');
      return;
    }

    login({
      name: name.trim(),
      phone: `+244 ${phone.trim()}`,
      email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '')}@jogador.ao`,
      password: password.trim(),
      isAgeVerified: true,
      isIdentityVerified: true
    });
  };

  // Handler for Player Login (Direct login, NO OTP)
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!phone.trim()) {
      setAuthError('Por favor introduza o seu número de telemóvel.');
      return;
    }
    if (!password.trim()) {
      setAuthError('Por favor introduza a sua palavra-passe.');
      return;
    }

    login({
      name: name.trim() || 'Jogador Angola',
      phone: `+244 ${phone.trim()}`,
      email: email.trim() || 'jogador@ao.net',
      password: password.trim(),
      isAgeVerified: true,
      isIdentityVerified: true
    });
  };

  // Handler for Admin Login (Checked against secure code database)
  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    const success = loginAdmin(adminPin);
    if (!success) {
      setAdminError('PIN incorreto. Acesso restrito à administração da plataforma.');
    }
  };

  // Quick fill helper for Player demo
  const handleQuickDemo = () => {
    setAuthError(null);
    setName('Kassoma Manuel');
    setPhone('923884102');
    setEmail('kassoma.manuel@ao.net');
    setPassword('senhasegura2026');
    setTermsAccepted(true);
    setAgeVerified(true);
  };

  return (
    <div className="min-h-screen bg-[#090a0d] text-neutral-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background Angolan Flag ambient glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-red-600/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-yellow-500/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-600 via-neutral-900 to-black border-2 border-yellow-500/80 flex items-center justify-center shadow-lg shadow-red-950/60">
            <span className="font-black text-2xl text-yellow-400">N</span>
          </div>
          <div>
            <span className="text-xl font-black text-white tracking-tight block leading-tight">
              N – NÃO TE IRRITES
            </span>
            <span className="text-[10px] uppercase tracking-widest text-yellow-400 font-bold block">
              Plataforma Oficial Angola · KZ & USDT
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {mode !== 'admin' ? (
            <button
              onClick={() => setMode('admin')}
              className="text-xs bg-neutral-900 hover:bg-neutral-800 text-red-400 hover:text-red-300 px-3 py-1.5 rounded-xl border border-red-900/40 flex items-center gap-1.5 transition-colors font-bold"
            >
              <Shield className="w-3.5 h-3.5 text-red-500" />
              <span>Entrar como Admin</span>
            </button>
          ) : (
            <button
              onClick={() => setMode('login')}
              className="text-xs bg-neutral-900 hover:bg-neutral-800 text-yellow-400 hover:text-yellow-300 px-3 py-1.5 rounded-xl border border-neutral-700 flex items-center gap-1.5 transition-colors font-bold"
            >
              <User className="w-3.5 h-3.5" />
              <span>Entrar como Jogador</span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-400 bg-neutral-900/80 px-3 py-1.5 rounded-xl border border-neutral-800">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Ambiente Seguro · +18 Anos</span>
          </div>
        </div>
      </header>

      {/* Main Authentication Card */}
      <div className="max-w-lg w-full mx-auto my-8 bg-gradient-to-b from-[#16171e] via-[#121319] to-black border-2 border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        {pendingInviteCode && (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-black text-emerald-300 uppercase tracking-wider">
                Convite para Sala {pendingInviteCode}
              </p>
              <p className="text-[11px] text-neutral-200 mt-0.5">
                Cadastre-se ou entre na sua conta para entrar automaticamente na mesa com o seu amigo (100% online, sem bots).
              </p>
            </div>
          </div>
        )}

        {authError && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/90 border border-red-600 text-xs font-bold text-red-300 text-center">
            {authError}
          </div>
        )}

        {/* Mode Selector Tabs (Jogador Cadastrar / Jogador Entrar / Admin Entrar) */}
        <div className="grid grid-cols-3 p-1 bg-neutral-950 border border-neutral-800 rounded-xl mb-6 text-center">
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
              mode === 'register'
                ? 'bg-gradient-to-r from-red-600 to-yellow-500 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Cadastrar
          </button>
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
              mode === 'login'
                ? 'bg-neutral-800 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Entrar Jogador
          </button>
          <button
            type="button"
            onClick={() => setMode('admin')}
            className={`py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
              mode === 'admin'
                ? 'bg-red-700 text-white shadow-md'
                : 'text-red-400 hover:text-white'
            }`}
          >
            <Shield className="w-3 h-3 text-yellow-400" />
            Entrar Admin
          </button>
        </div>

        {/* 1. ADMIN LOGIN VIEW */}
        {mode === 'admin' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-red-600/20 border-2 border-red-500 flex items-center justify-center text-red-400 shadow-xl shadow-red-950/50 mb-3">
                <KeyRound className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-black text-white">Acesso do Administrador</h2>
              <p className="text-xs text-neutral-400 mt-1">
                Introduza o PIN de segurança para aceder ao painel de administração da plataforma.
              </p>
            </div>

            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1 text-center">
                  PIN de Acesso:
                </label>
                <input
                  type="password"
                  maxLength={6}
                  autoFocus
                  required
                  value={adminPin}
                  onChange={(e) => {
                    setAdminPin(e.target.value);
                    setAdminError(null);
                  }}
                  placeholder="••••••"
                  className="w-full bg-neutral-950 border-2 border-neutral-700 rounded-2xl px-4 py-3.5 text-center text-2xl font-mono tracking-widest text-yellow-400 focus:outline-none focus:border-red-500"
                />
              </div>

              {adminError && (
                <div className="text-xs font-bold text-red-400 bg-red-950/90 p-3 rounded-xl border border-red-600 text-center">
                  {adminError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-yellow-500 text-white font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 shadow-xl shadow-red-950 transition-all flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4" />
                <span>ENTRAR COMO ADMINISTRADOR</span>
              </button>
            </form>
          </div>
        )}

        {/* 2. REGISTRATION VIEW (Direct Login, No OTP) */}
        {mode === 'register' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-white">Criar Conta de Jogador</h2>
              <p className="text-xs text-neutral-400 mt-1">
                Cadastre-se rapidamente para jogar Não Te Irrites com outros jogadores online.
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">
                  Nome Completo: <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Kassoma Manuel"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">
                  Número de Telemóvel (+244 Angola): <span className="text-red-500">*</span>
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-neutral-700 bg-neutral-900 text-xs font-black text-yellow-400 font-mono">
                    +244
                  </span>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="923 884 102"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-r-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">
                  Palavra-passe (Passe): <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Defina a sua palavra-passe"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-400 block mb-1">
                  Endereço de Email <span className="text-[10px] text-yellow-400 font-normal">(Opcional)</span>:
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemplo@email.ao (opcional)"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-neutral-800 text-xs text-neutral-300">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={ageVerified}
                    onChange={(e) => setAgeVerified(e.target.checked)}
                    className="mt-0.5 rounded text-red-600 focus:ring-0 bg-neutral-950 border-neutral-700"
                  />
                  <span className="text-[11px] leading-snug">
                    Declaro que tenho <b>18 anos de idade ou mais</b> (maioridade legal).
                  </span>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 rounded text-red-600 focus:ring-0 bg-neutral-950 border-neutral-700"
                  />
                  <span className="text-[11px] leading-snug">
                    Aceito os <b>Termos e Condições</b> da plataforma N.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-yellow-500 text-white font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 shadow-xl shadow-red-950 transition-all flex items-center justify-center gap-2 mt-4"
              >
                <span>CADASTRAR E ENTRAR NO JOGO</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleQuickDemo}
                  className="text-[11px] text-yellow-400 hover:text-white underline decoration-dotted"
                >
                  ⚡ Preencher com dados de exemplo (Kassoma Manuel)
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 3. LOGIN VIEW (Direct Login, No OTP) */}
        {mode === 'login' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-white">Entrar na sua Conta</h2>
              <p className="text-xs text-neutral-400 mt-1">
                Introduza o seu número de telemóvel e palavra-passe para aceder imediatamente.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">
                  Número de Telemóvel (+244 Angola):
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-neutral-700 bg-neutral-900 text-xs font-black text-yellow-400 font-mono">
                    +244
                  </span>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="923 884 102"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-r-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">
                  Palavra-passe:
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="A sua palavra-passe"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-400 block mb-1">
                  Email <span className="text-[10px] text-yellow-400 font-normal">(Opcional)</span>:
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemplo.ao (opcional)"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-yellow-500 text-white font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 shadow-xl shadow-red-950 transition-all flex items-center justify-center gap-2 mt-4"
              >
                <span>ENTRAR NO JOGO</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleQuickDemo}
                  className="text-[11px] text-yellow-400 hover:text-white underline decoration-dotted"
                >
                  ⚡ Preencher com dados de exemplo (Kassoma Manuel)
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <footer className="text-center text-[11px] text-neutral-500 max-w-2xl mx-auto space-y-1">
        <p>
          <b>N – NÃO TE IRRITES</b> · Plataforma Angolana de Jogos Multiplayer Online.
        </p>
        <p>
          Ambiente demonstrativo · Banco Nacional de Angola (BNA) & ISJ.
        </p>
      </footer>
    </div>
  );
};
