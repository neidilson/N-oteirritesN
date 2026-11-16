import React, { useState, useEffect, useMemo } from 'react';
import { useGame, DEFAULT_PLATFORM_CONFIG } from '../context/GameContext';
import {
  Users,
  DollarSign,
  TrendingUp,
  FileText,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Eye,
  Lock,
  Unlock,
  MessageSquare,
  Search,
  Download,
  Swords,
  CreditCard,
  Building,
  Smartphone,
  Save,
  LogOut,
  ArrowLeft,
  Percent,
  Palette,
  RotateCcw,
  RefreshCw,
  Trophy
} from 'lucide-react';
import { Transaction, BoardThemeId, ThemePriceConfig } from '../types';
import { BOARD_THEME_LIST } from '../utils/boardThemes';

export const AdminPanel: React.FC = () => {
  const {
    rooms,
    transactions,
    supportTickets,
    adminOverview,
    refreshAdminOverview,
    adminApproveDeposit,
    adminRejectDeposit,
    adminApproveWithdrawal,
    adminRejectWithdrawal,
    adminReplySupport,
    adminToggleUserSuspension,
    joinRoom,
    isAdminUnlocked,
    unlockAdmin,
    lockAdmin,
    paymentSettings,
    updatePaymentSettings,
    platformConfig,
    updatePlatformConfig,
    setActiveTab,
    logout
  } = useGame();

  const [adminTab, setAdminTab] = useState<'kpis' | 'players' | 'finances' | 'treasury' | 'rooms' | 'support' | 'payments' | 'rules'>('kpis');
  const [searchTerm, setSearchTerm] = useState('');
  const [adminReplyText, setAdminReplyText] = useState('');
  const [activeTicketId, setActiveTicketId] = useState<string>(supportTickets[0]?.id || '');
  const [selectedProofTx, setSelectedProofTx] = useState<Transaction | null>(null);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [adminActionError, setAdminActionError] = useState<string | null>(null);
  const [isRefreshingOverview, setIsRefreshingOverview] = useState(false);

  // Payment configuration form state
  const [mcxEntity, setMcxEntity] = useState(paymentSettings.mcxEntity);
  const [mcxReference, setMcxReference] = useState(paymentSettings.mcxReference);
  const [mcxPhone, setMcxPhone] = useState(paymentSettings.mcxPhone);
  const [bankName, setBankName] = useState(paymentSettings.bankName);
  const [accountHolder, setAccountHolder] = useState(paymentSettings.accountHolder);
  const [iban, setIban] = useState(paymentSettings.iban);
  const [usdtAddress, setUsdtAddress] = useState(paymentSettings.usdtAddress);
  const [usdtNetwork, setUsdtNetwork] = useState(paymentSettings.usdtNetwork);
  const [binancePayId, setBinancePayId] = useState(paymentSettings.binancePayId || '');
  const [bybitUid, setBybitUid] = useState(paymentSettings.bybitUid || '');
  const [paymentSavedFeedback, setPaymentSavedFeedback] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Platform percentages & locked board theme prices draft state
  const [winnerPctDraft, setWinnerPctDraft] = useState<number>(platformConfig.winnerPercent);
  const [commPctDraft, setCommPctDraft] = useState<number>(platformConfig.commissionPercent);
  const [themePricesDraft, setThemePricesDraft] = useState<Record<BoardThemeId, ThemePriceConfig>>(
    platformConfig.themePrices
  );
  const [rulesSavedFeedback, setRulesSavedFeedback] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);

  useEffect(() => {
    if (isAdminUnlocked) {
      void refreshAdminOverview();
    }
  }, [isAdminUnlocked, refreshAdminOverview]);

  useEffect(() => {
    setMcxEntity(paymentSettings.mcxEntity);
    setMcxReference(paymentSettings.mcxReference);
    setMcxPhone(paymentSettings.mcxPhone);
    setBankName(paymentSettings.bankName);
    setAccountHolder(paymentSettings.accountHolder);
    setIban(paymentSettings.iban);
    setUsdtAddress(paymentSettings.usdtAddress);
    setUsdtNetwork(paymentSettings.usdtNetwork);
    setBinancePayId(paymentSettings.binancePayId || '');
    setBybitUid(paymentSettings.bybitUid || '');
  }, [paymentSettings]);

  useEffect(() => {
    setWinnerPctDraft(platformConfig.winnerPercent);
    setCommPctDraft(platformConfig.commissionPercent);
    setThemePricesDraft(platformConfig.themePrices);
  }, [platformConfig]);

  const allPlayers = adminOverview?.players ?? [];
  const allTransactions = adminOverview?.transactions ?? transactions;
  const allTickets = adminOverview?.supportTickets ?? supportTickets;
  const allMatches = adminOverview?.matchHistory ?? [];

  useEffect(() => {
    if (allTickets.length > 0 && !allTickets.some(t => t.id === activeTicketId)) {
      setActiveTicketId(allTickets[0].id);
    }
  }, [allTickets, activeTicketId]);

  const totalUsers = adminOverview?.totalUsers ?? allPlayers.length;
  const activeUsersCount = useMemo(
    () => allPlayers.filter(p => !p.isSuspended).length,
    [allPlayers]
  );
  const totalMatches = adminOverview?.totalMatches ?? allMatches.length;

  const totalKzDeposits =
    adminOverview?.totalDepositsKz ??
    allTransactions
      .filter(t => t.type === 'DEPOSIT' && t.currency === 'KZ' && t.status === 'Confirmado')
      .reduce((acc, t) => acc + t.amount, 0);

  const totalUsdtDeposits =
    adminOverview?.totalDepositsUsdt ??
    allTransactions
      .filter(t => t.type === 'DEPOSIT' && t.currency === 'USDT' && t.status === 'Confirmado')
      .reduce((acc, t) => acc + t.amount, 0);

  const pendingDeposits = useMemo(
    () =>
      allTransactions.filter(
        t => (t.type === 'DEPOSIT' || t.type === 'THEME_UNLOCK') && t.status === 'Em validação'
      ),
    [allTransactions]
  );

  const pendingWithdrawals = useMemo(
    () => allTransactions.filter(t => t.type === 'WITHDRAW' && t.status === 'Pendente'),
    [allTransactions]
  );

  const totalPlatformCommissionKz =
    adminOverview?.totalCommissionKz ??
    allMatches
      .filter(m => !m.isDemo && m.currency === 'KZ')
      .reduce((acc, m) => acc + m.platformCommission, 0);

  const totalPlatformCommissionUsdt =
    adminOverview?.totalCommissionUsdt ??
    allMatches
      .filter(m => !m.isDemo && m.currency === 'USDT')
      .reduce((acc, m) => acc + m.platformCommission, 0);

  const treasuryBreakdown = useMemo(() => {
    const themeSalesKz = allTransactions
      .filter(t => t.type === 'THEME_UNLOCK' && t.currency === 'KZ' && t.status === 'Confirmado')
      .reduce((acc, t) => acc + t.amount, 0);
    const themeSalesUsdt = allTransactions
      .filter(t => t.type === 'THEME_UNLOCK' && t.currency === 'USDT' && t.status === 'Confirmado')
      .reduce((acc, t) => acc + t.amount, 0);
    const paidWithdrawalsKz = allTransactions
      .filter(t => t.type === 'WITHDRAW' && t.currency === 'KZ' && (t.status === 'Pago' || t.status === 'Aprovado'))
      .reduce((acc, t) => acc + t.amount, 0);
    const paidWithdrawalsUsdt = allTransactions
      .filter(t => t.type === 'WITHDRAW' && t.currency === 'USDT' && (t.status === 'Pago' || t.status === 'Aprovado'))
      .reduce((acc, t) => acc + t.amount, 0);
    const playerReservesKz = allPlayers.reduce((acc, p) => acc + p.kzBalance, 0);
    const playerReservesUsdt = allPlayers.reduce((acc, p) => acc + p.usdtBalance, 0);
    return {
      themeSalesKz,
      themeSalesUsdt,
      paidWithdrawalsKz,
      paidWithdrawalsUsdt,
      playerReservesKz,
      playerReservesUsdt
    };
  }, [allTransactions, allPlayers]);

  const filteredPlayers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return allPlayers;
    return allPlayers.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q)
    );
  }, [allPlayers, searchTerm]);

  const [inlinePin, setInlinePin] = useState('');
  const [inlineError, setInlineError] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  const selectedTicket = allTickets.find(t => t.id === activeTicketId) || allTickets[0];

  const handleManualRefresh = async () => {
    setIsRefreshingOverview(true);
    await refreshAdminOverview();
    setIsRefreshingOverview(false);
  };

  const handleExportCsv = () => {
    const headers = ['ID', 'Jogador', 'Tipo', 'Moeda', 'Valor', 'Taxa', 'Metodo', 'Referencia', 'Estado', 'Data'];
    const escapeCsv = (val: unknown) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const rows = allTransactions.map(t => [
      t.id,
      t.userName,
      t.type,
      t.currency,
      t.amount,
      t.fee,
      t.method,
      t.reference,
      t.status,
      t.createdAt
    ]);
    const csvContent = [headers.map(escapeCsv).join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-financeiro-n-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReplyText.trim() || !selectedTicket || busyActionId) return;
    setAdminActionError(null);
    setBusyActionId(`reply_${selectedTicket.id}`);
    const res = await adminReplySupport(selectedTicket.id, adminReplyText);
    setBusyActionId(null);
    if (!res.ok) {
      setAdminActionError(res.error || 'Não foi possível enviar a resposta.');
      return;
    }
    setAdminReplyText('');
  };

  if (!isAdminUnlocked) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 rounded-3xl bg-gradient-to-b from-[#181920] to-black border-2 border-red-600/60 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-600/20 border-2 border-red-500 flex items-center justify-center text-red-400 shadow-xl shadow-red-950">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white">PAINEL ADMIN N</h2>
          <span className="text-xs text-yellow-400 font-bold uppercase tracking-wider block mt-1">
            Área Exclusiva · Acesso Protegido
          </span>
          <p className="text-xs text-neutral-400 mt-2">
            Introduza o PIN de 6 dígitos para aceder ao painel de administração e tesouraria.
          </p>
        </div>

        <form onSubmit={async (e) => {
          e.preventDefault();
          if (unlocking) return;
          setUnlocking(true);
          const ok = await unlockAdmin(inlinePin);
          setUnlocking(false);
          if (!ok) {
            setInlineError(true);
            setTimeout(() => setInlinePin(''), 800);
          }
        }} className="space-y-4">
          <input
            type="password"
            maxLength={6}
            autoFocus
            value={inlinePin}
            onChange={async (e) => {
              const val = e.target.value;
              setInlinePin(val);
              setInlineError(false);
              if (val.length === 6 && !unlocking) {
                setUnlocking(true);
                const ok = await unlockAdmin(val);
                setUnlocking(false);
                if (!ok) {
                  setInlineError(true);
                  setTimeout(() => setInlinePin(''), 800);
                }
              }
            }}
            placeholder="••••••"
            className="w-full bg-neutral-950 border-2 border-neutral-700 rounded-2xl px-4 py-3.5 text-center text-2xl font-mono tracking-widest text-yellow-400 focus:outline-none focus:border-red-500"
          />

          {inlineError && (
            <div className="text-xs font-bold text-red-400 bg-red-950/80 p-2.5 rounded-xl border border-red-500/60">
              PIN incorreto! Acesso reservado à administração.
            </div>
          )}

          <button
            type="submit"
            disabled={unlocking}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-yellow-500 text-white font-black text-xs uppercase tracking-wider hover:brightness-110 shadow-lg shadow-red-950 disabled:opacity-60"
          >
            {unlocking ? 'A VERIFICAR PIN...' : 'DESBLOQUEAR ADMIN (PIN)'}
          </button>

          <div className="flex items-center justify-between pt-3 border-t border-neutral-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="text-neutral-400 hover:text-white flex items-center gap-1 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao Jogo</span>
            </button>
            <button
              type="button"
              onClick={logout}
              className="text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair da Conta</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Admin Top Banner */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-red-950 via-neutral-900 to-black border-2 border-red-600/60 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-black">
              N
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white">PAINEL ADMINISTRATIVO – ADMIN N</h1>
          </div>
          <p className="text-xs text-neutral-300 mt-1">
            Gestão operacional da plataforma, tesouraria, controle de mesas e contas de recebimento.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshingOverview}
            className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow disabled:opacity-60"
            title="Atualizar dados do servidor"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isRefreshingOverview ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>

          {/* Sair do Modo Admin */}
          <button
            onClick={lockAdmin}
            className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow"
            title="Bloquear painel administrativo e retornar à visão do jogador"
          >
            <Lock className="w-3.5 h-3.5 text-yellow-400" />
            <span>Sair do Admin</span>
          </button>

          {/* Sair da Conta / Logout Total */}
          <button
            onClick={logout}
            className="px-3.5 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-600 text-red-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow"
            title="Terminar sessão completamente e ir para a tela de login"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Terminar Sessão</span>
          </button>
        </div>
      </div>

      {adminActionError && (
        <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/60 text-xs text-red-200 font-bold flex items-center justify-between">
          <span>{adminActionError}</span>
          <button onClick={() => setAdminActionError(null)} className="text-red-300 hover:text-white px-2">✕</button>
        </div>
      )}

      {/* Admin Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 p-1 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-bold scrollbar-none">
        {[
          { id: 'kpis', label: 'A. Dashboard Geral', icon: TrendingUp },
          { id: 'players', label: `B. Gestão Jogadores (${totalUsers})`, icon: Users },
          { id: 'finances', label: `C. Validações (${pendingDeposits.length + pendingWithdrawals.length})`, icon: DollarSign },
          { id: 'treasury', label: 'D. Tesouraria (Banca N)', icon: FileText },
          { id: 'rooms', label: `E. Mesas & Histórico (${rooms.length})`, icon: Swords },
          { id: 'support', label: `F. Mensagens Suporte (${allTickets.length})`, icon: MessageSquare },
          { id: 'payments', label: 'G. Formas de Pagamento (IBAN/MCX)', icon: CreditCard },
          { id: 'rules', label: 'H. Taxas & Tabuleiros', icon: Percent }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setAdminTab(tab.id as typeof adminTab)}
              className={`px-4 py-2.5 rounded-lg whitespace-nowrap flex items-center gap-2 transition-all ${
                adminTab === tab.id
                  ? 'bg-red-600 text-white shadow-md shadow-red-950'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* A. DASHBOARD GERAL */}
      {adminTab === 'kpis' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
              <span className="text-neutral-400 text-xs">Total de Utilizadores</span>
              <span className="text-2xl font-black text-white tabular-nums block mt-1">
                {totalUsers.toLocaleString('pt-AO')}
              </span>
              <span className="text-[10px] text-emerald-400 mt-1 block">
                {activeUsersCount} contas ativas
              </span>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
              <span className="text-neutral-400 text-xs">Partidas Realizadas</span>
              <span className="text-2xl font-black text-white tabular-nums block mt-1">
                {totalMatches.toLocaleString('pt-AO')}
              </span>
              <span className="text-[10px] text-yellow-400 mt-1 block">{rooms.length} mesas ativas</span>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
              <span className="text-neutral-400 text-xs">Depósitos Confirmados KZ</span>
              <span className="text-2xl font-black text-amber-400 tabular-nums block mt-1">
                {totalKzDeposits.toLocaleString('pt-AO')} <span className="text-xs">Kz</span>
              </span>
              <span className="text-[10px] text-neutral-400 mt-1 block">{allTransactions.length} registos totais</span>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
              <span className="text-neutral-400 text-xs">Depósitos Confirmados USDT</span>
              <span className="text-2xl font-black text-emerald-400 tabular-nums block mt-1">
                {totalUsdtDeposits.toLocaleString('pt-AO')} <span className="text-xs">USDT</span>
              </span>
              <span className="text-[10px] text-emerald-400 mt-1 block">TRC20 / Binance / Bybit</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
              <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider">
                Comissões Acumuladas da Plataforma ({platformConfig.commissionPercent}%)
              </span>
              <div className="text-2xl font-black text-yellow-400">
                {totalPlatformCommissionKz.toLocaleString('pt-AO')} Kz
              </div>
              <div className="text-lg font-bold text-emerald-400">
                + {totalPlatformCommissionUsdt.toLocaleString('pt-AO')} USDT
              </div>
              <span className="text-[11px] text-neutral-400 block pt-1 border-t border-neutral-800">
                Receita líquida retida pela casa em partidas reais finalizadas.
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
              <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider">
                Operações Pendentes de Validação
              </span>
              <div className="text-2xl font-black text-white">
                {pendingDeposits.length} Depósitos · {pendingWithdrawals.length} Levantamentos
              </div>
              <span className="text-[11px] text-yellow-400 block pt-1 border-t border-neutral-800">
                Requer aprovação manual dos comprovativos pelo auditor.
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
              <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider">
                Reservas dos Jogadores (Carteiras)
              </span>
              <div className="text-xl font-black text-white tabular-nums">
                {treasuryBreakdown.playerReservesKz.toLocaleString('pt-AO')} Kz
              </div>
              <div className="text-sm font-bold text-emerald-400 tabular-nums">
                + {treasuryBreakdown.playerReservesUsdt.toLocaleString('pt-AO')} USDT
              </div>
              <span className="text-[11px] text-neutral-400 block pt-1 border-t border-neutral-800">
                Soma dos saldos reais sob custódia do servidor.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* B. GESTÃO DE JOGADORES */}
      {adminTab === 'players' && (
        <div className="rounded-2xl p-6 bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <h3 className="text-base font-bold text-white">Base de Jogadores Cadastrados ({allPlayers.length})</h3>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar por nome, telefone..."
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Jogador</th>
                  <th className="p-3">Telefone (+244)</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">Saldo KZ</th>
                  <th className="p-3">Saldo USDT</th>
                  <th className="p-3">Partidas / Vitórias</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {filteredPlayers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-neutral-500">
                      Nenhum jogador encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredPlayers.map((player) => (
                    <tr key={player.id} className="hover:bg-neutral-800/40">
                      <td className="p-3">
                        <div>
                          <span className="font-bold text-white block">{player.name}</span>
                          <span className="text-[10px] text-neutral-400">{player.email || 'Sem e-mail'}</span>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-neutral-300">{player.phone}</td>
                      <td className="p-3 font-semibold text-yellow-400">{player.category}</td>
                      <td className="p-3 tabular-nums font-bold text-white">{player.kzBalance.toLocaleString('pt-AO')} Kz</td>
                      <td className="p-3 tabular-nums font-bold text-emerald-400">{player.usdtBalance} USDT</td>
                      <td className="p-3 text-neutral-300">{player.matchesPlayed} / {player.wins}</td>
                      <td className="p-3">
                        {player.isSuspended ? (
                          <span className="text-red-400 font-bold bg-red-950/80 px-2 py-0.5 rounded text-[10px]">
                            Suspenso
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded text-[10px]">
                            Ativo
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <button
                          disabled={busyActionId === `suspend_${player.id}`}
                          onClick={async () => {
                            setAdminActionError(null);
                            setBusyActionId(`suspend_${player.id}`);
                            const res = await adminToggleUserSuspension(player.id);
                            setBusyActionId(null);
                            if (!res.ok) setAdminActionError(res.error || 'Erro ao atualizar estado do jogador.');
                          }}
                          className={`px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1 disabled:opacity-50 ${
                            player.isSuspended
                              ? 'bg-emerald-700 text-white hover:bg-emerald-600'
                              : 'bg-red-700 text-white hover:bg-red-600'
                          }`}
                        >
                          {player.isSuspended ? (
                            <>
                              <Unlock className="w-3 h-3" /> Reativar
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3" /> Suspender
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* C. GESTÃO FINANCEIRA (Validação de Depósitos e Levantamentos) */}
      {adminTab === 'finances' && (
        <div className="space-y-6">
          {/* Pending Deposits Section */}
          <div className="rounded-2xl p-6 bg-neutral-900 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Depósitos e Desbloqueios de Tabuleiro Aguardando Validação</h3>
                <p className="text-xs text-neutral-400">Verifique a autenticidade do comprovativo e aprove o crédito ou o desbloqueio de tabuleiro premium.</p>
              </div>
              <button
                onClick={handleExportCsv}
                className="text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold"
              >
                <Download className="w-3.5 h-3.5" />
                Exportar Relatório (CSV)
              </button>
            </div>

            {pendingDeposits.length === 0 ? (
              <p className="text-xs text-neutral-500 py-4 text-center">Nenhum depósito ou desbloqueio pendente de validação no momento.</p>
            ) : (
              <div className="space-y-3">
                {pendingDeposits.map((tx) => {
                  const isThemeUnlock = tx.type === 'THEME_UNLOCK';
                  const busy = busyActionId === tx.id;
                  return (
                    <div key={tx.id} className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-white text-sm">{tx.userName}</span>
                          <span className="text-[10px] bg-neutral-800 text-yellow-400 px-2 py-0.5 rounded font-mono">
                            {tx.reference}
                          </span>
                          {isThemeUnlock && (
                            <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-500/60 px-2 py-0.5 rounded font-black uppercase">
                              DESBLOQUEIO DE TABULEIRO: {tx.themeName || tx.themeId}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 mt-1">
                          <span>Método: <b>{tx.method}</b></span>
                          <span>·</span>
                          <span>Valor: <b className="text-emerald-400">{tx.amount.toLocaleString('pt-AO')} {tx.currency}</b></span>
                          <span>·</span>
                          <span>Data: {tx.createdAt}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {tx.proofUrl && (
                          <button
                            onClick={() => setSelectedProofTx(tx)}
                            className="px-3 py-1.5 bg-neutral-800 text-neutral-300 rounded-lg text-xs font-bold hover:text-white flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ver Comprovativo
                          </button>
                        )}
                        <button
                          disabled={busy}
                          onClick={async () => {
                            setAdminActionError(null);
                            setBusyActionId(tx.id);
                            const res = await adminApproveDeposit(tx.id);
                            setBusyActionId(null);
                            if (!res.ok) setAdminActionError(res.error || 'Erro ao aprovar operação.');
                          }}
                          className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500 flex items-center gap-1 shadow disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          {isThemeUnlock ? 'Confirmar & Desbloquear' : 'Aprovar'}
                        </button>
                        <button
                          disabled={busy}
                          onClick={async () => {
                            setAdminActionError(null);
                            setBusyActionId(tx.id);
                            const res = await adminRejectDeposit(tx.id);
                            setBusyActionId(null);
                            if (!res.ok) setAdminActionError(res.error || 'Erro ao rejeitar operação.');
                          }}
                          className="px-3 py-1.5 bg-red-700 text-white rounded-lg text-xs font-bold hover:bg-red-600 flex items-center gap-1 disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Rejeitar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending Withdrawals Section */}
          <div className="rounded-2xl p-6 bg-neutral-900 border border-neutral-800 space-y-4">
            <h3 className="text-base font-bold text-white">Solicitações de Levantamento (Minhas Retiradas)</h3>
            {pendingWithdrawals.length === 0 ? (
              <p className="text-xs text-neutral-500 py-4 text-center">Nenhum levantamento pendente de processamento.</p>
            ) : (
              <div className="space-y-3">
                {pendingWithdrawals.map((tx) => {
                  const busy = busyActionId === tx.id;
                  return (
                    <div key={tx.id} className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{tx.userName}</span>
                          <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded font-mono">
                            {tx.reference}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1">
                          <span>Valor: <b className="text-red-400">{tx.amount.toLocaleString('pt-AO')} {tx.currency}</b></span>
                          <span>·</span>
                          <span className="text-white">{tx.notes}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          disabled={busy}
                          onClick={async () => {
                            setAdminActionError(null);
                            setBusyActionId(tx.id);
                            const res = await adminApproveWithdrawal(tx.id);
                            setBusyActionId(null);
                            if (!res.ok) setAdminActionError(res.error || 'Erro ao aprovar levantamento.');
                          }}
                          className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500 flex items-center gap-1 disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Confirmar Pagamento
                        </button>
                        <button
                          disabled={busy}
                          onClick={async () => {
                            setAdminActionError(null);
                            setBusyActionId(tx.id);
                            const res = await adminRejectWithdrawal(tx.id);
                            setBusyActionId(null);
                            if (!res.ok) setAdminActionError(res.error || 'Erro ao rejeitar levantamento.');
                          }}
                          className="px-3 py-1.5 bg-red-700 text-white rounded-lg text-xs font-bold hover:bg-red-600 flex items-center gap-1 disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Rejeitar (Estornar)
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* D. TESOURARIA – MINHA BANCA */}
      {adminTab === 'treasury' && (
        <div className="space-y-6">
          <div className="rounded-2xl p-6 bg-neutral-900 border border-neutral-800 space-y-4">
            <div className="border-b border-neutral-800 pb-3">
              <span className="text-xs font-bold text-red-500 uppercase tracking-widest block">Área Exclusiva do Proprietário</span>
              <h2 className="text-xl font-black text-white mt-0.5">Tesouraria N – Minha Banca</h2>
              <p className="text-xs text-neutral-400">
                Segregação estrita entre receitas da plataforma (comissões e vendas de arenas) e reservas dos jogadores.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-neutral-950 to-neutral-900 border border-amber-500/40 space-y-3">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                  Banca Nacional · Kwanza (KZ)
                </span>
                <div className="text-3xl font-black text-white tabular-nums">
                  {(totalPlatformCommissionKz + treasuryBreakdown.themeSalesKz).toLocaleString('pt-AO')} Kz
                </div>
                <div className="text-xs text-neutral-400 space-y-1.5 pt-2 border-t border-neutral-800">
                  <div className="flex justify-between">
                    <span>Comissões em Partidas:</span>
                    <span className="text-white font-bold">{totalPlatformCommissionKz.toLocaleString('pt-AO')} Kz</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Desbloqueio de Tabuleiros:</span>
                    <span className="text-white font-bold">{treasuryBreakdown.themeSalesKz.toLocaleString('pt-AO')} Kz</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Depositado (Confirmado):</span>
                    <span className="text-emerald-400 font-bold">{totalKzDeposits.toLocaleString('pt-AO')} Kz</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Levantado (Pago):</span>
                    <span className="text-red-400 font-bold">{treasuryBreakdown.paidWithdrawalsKz.toLocaleString('pt-AO')} Kz</span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-br from-neutral-950 to-neutral-900 border border-emerald-500/40 space-y-3">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                  Banca Internacional · Tether (USDT)
                </span>
                <div className="text-3xl font-black text-emerald-300 tabular-nums">
                  {(totalPlatformCommissionUsdt + treasuryBreakdown.themeSalesUsdt).toLocaleString('pt-AO')} USDT
                </div>
                <div className="text-xs text-neutral-400 space-y-1.5 pt-2 border-t border-neutral-800">
                  <div className="flex justify-between">
                    <span>Comissões em Partidas:</span>
                    <span className="text-white font-bold">{totalPlatformCommissionUsdt.toLocaleString('pt-AO')} USDT</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Desbloqueio de Tabuleiros:</span>
                    <span className="text-white font-bold">{treasuryBreakdown.themeSalesUsdt.toLocaleString('pt-AO')} USDT</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Depositado (Confirmado):</span>
                    <span className="text-emerald-400 font-bold">{totalUsdtDeposits.toLocaleString('pt-AO')} USDT</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Levantado (Pago):</span>
                    <span className="text-red-400 font-bold">{treasuryBreakdown.paidWithdrawalsUsdt.toLocaleString('pt-AO')} USDT</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* E. CONTROLO DE PARTIDAS & HISTÓRICO */}
      {adminTab === 'rooms' && (
        <div className="space-y-6">
          <div className="rounded-2xl p-6 bg-neutral-900 border border-neutral-800 space-y-4">
            <h3 className="text-base font-bold text-white">Monitorização de Salas em Andamento ({rooms.length})</h3>

            {rooms.length === 0 ? (
              <p className="text-xs text-neutral-500 py-4 text-center">Nenhuma sala ativa neste momento.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rooms.map((room) => (
                  <div key={room.id} className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{room.name}</span>
                        <span className="text-[10px] font-mono text-yellow-400 bg-neutral-800 px-1.5 py-0.5 rounded">
                          {room.code}
                        </span>
                        {room.isDemo && (
                          <span className="text-[10px] font-bold bg-sky-950 text-sky-300 px-1.5 py-0.5 rounded">
                            DEMO
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-400 mt-1">
                        <span>{room.players.length}/{room.maxPlayers} Jogadores</span>
                        <span> · </span>
                        <span className="text-emerald-400">{room.prizePool.toLocaleString('pt-AO')} {room.currency}</span>
                        <span> · </span>
                        <span className="text-yellow-400">Vez de: {room.boardState.currentTurnColor}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => joinRoom(room.id)}
                      className="px-3 py-1.5 bg-neutral-800 text-white rounded-lg text-xs font-bold hover:bg-neutral-700"
                    >
                      Inspecionar Mesa
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl p-6 bg-neutral-900 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                Histórico de Partidas Guardadas ({allMatches.length})
              </h3>
            </div>

            {allMatches.length === 0 ? (
              <p className="text-xs text-neutral-500 py-4 text-center">Ainda não existem partidas finalizadas registadas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800 uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Sala</th>
                      <th className="p-3">Vencedor</th>
                      <th className="p-3">Modo</th>
                      <th className="p-3">Prémio</th>
                      <th className="p-3">Comissão Banca</th>
                      <th className="p-3">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {allMatches.map((m) => (
                      <tr key={m.id} className="hover:bg-neutral-800/40">
                        <td className="p-3">
                          <span className="font-bold text-white block">{m.roomName}</span>
                          <span className="text-[10px] font-mono text-neutral-400">{m.roomCode} · {m.players.length} jog.</span>
                        </td>
                        <td className="p-3 font-bold text-emerald-400">{m.winnerName || '—'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.isDemo ? 'bg-sky-950 text-sky-300' : 'bg-amber-950 text-amber-300'}`}>
                            {m.isDemo ? 'Treino' : 'Real'}
                          </span>
                        </td>
                        <td className="p-3 tabular-nums font-bold text-white">
                          {m.prizePool.toLocaleString('pt-AO')} {m.currency}
                        </td>
                        <td className="p-3 tabular-nums font-bold text-yellow-400">
                          {m.isDemo ? '0' : m.platformCommission.toLocaleString('pt-AO')} {m.currency}
                        </td>
                        <td className="p-3 text-neutral-400">{m.finishedAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* F. CHAT DE SUPORTE ADMINISTRATIVO */}
      {adminTab === 'support' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden h-[540px]">
          {/* Ticket List */}
          <div className="md:col-span-4 border-r border-neutral-800 bg-neutral-950 p-3 space-y-2 overflow-y-auto">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block px-1">
              Tickets Abertos ({allTickets.length})
            </span>
            {allTickets.length === 0 ? (
              <p className="text-xs text-neutral-500 p-3 text-center">Sem tickets de suporte.</p>
            ) : (
              allTickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setActiveTicketId(t.id)}
                  className={`p-3 rounded-xl cursor-pointer border transition-colors ${
                    t.id === selectedTicket?.id
                      ? 'bg-neutral-900 border-red-500'
                      : 'bg-neutral-900/40 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{t.userName}</span>
                    <span className="text-[10px] text-neutral-500">{t.userPhone}</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 truncate mt-1">{t.subject}</p>
                </div>
              ))
            )}
          </div>

          {/* Chat Window */}
          <div className="md:col-span-8 flex flex-col h-full p-4">
            {selectedTicket ? (
              <>
                <div className="border-b border-neutral-800 pb-2 mb-3">
                  <h4 className="font-bold text-white text-sm">{selectedTicket.userName} · {selectedTicket.subject}</h4>
                  <span className="text-[11px] text-neutral-400">Telefone: {selectedTicket.userPhone}</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 text-xs mb-3">
                  {selectedTicket.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-2.5 rounded-xl max-w-[80%] ${
                        m.sender === 'admin'
                          ? 'ml-auto bg-red-600 text-white'
                          : 'mr-auto bg-neutral-800 text-neutral-200'
                      }`}
                    >
                      <p>{m.text}</p>
                      <span className="text-[9px] opacity-70 block text-right mt-1">{m.timestamp}</span>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAdminReply} className="flex gap-2">
                  <input
                    type="text"
                    value={adminReplyText}
                    onChange={(e) => setAdminReplyText(e.target.value)}
                    placeholder="Resposta do Administrador N ao jogador..."
                    className="flex-1 bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="submit"
                    disabled={busyActionId === `reply_${selectedTicket.id}`}
                    className="px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-500 disabled:opacity-50"
                  >
                    Responder
                  </button>
                </form>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-neutral-500 text-xs">
                Selecione um ticket ao lado
              </div>
            )}
          </div>
        </div>
      )}

      {/* G. FORMAS DE PAGAMENTO – EDITAR IBAN, EXPRESS E USDT */}
      {adminTab === 'payments' && (
        <div className="space-y-6">
          <div className="rounded-2xl p-6 bg-neutral-900 border border-neutral-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-yellow-400 block">
                  Gestão Financeira & Recebimentos
                </span>
                <h2 className="text-xl font-black text-white mt-0.5">
                  Configuração de Contas e Formas de Pagamento
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Altere a qualquer momento os dados de recebimento (IBAN, Multicaixa Express e Carteira USDT). As alterações são refletidas instantaneamente na carteira de todos os jogadores.
                </p>
              </div>

              <button
                type="button"
                onClick={async () => {
                  setPaymentError(null);
                  const res = await updatePaymentSettings({
                    mcxEntity,
                    mcxReference,
                    mcxPhone,
                    bankName,
                    accountHolder,
                    iban,
                    usdtAddress,
                    usdtNetwork,
                    binancePayId,
                    bybitUid
                  });
                  if (!res.ok) {
                    setPaymentError(res.error || 'Erro ao guardar formas de pagamento.');
                    return;
                  }
                  setPaymentSavedFeedback(true);
                  setTimeout(() => setPaymentSavedFeedback(false), 4000);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-yellow-500 hover:brightness-110 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-950 transition-all shrink-0 active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Alterações</span>
              </button>
            </div>

            {paymentError && (
              <div className="p-3 rounded-xl bg-red-950/80 border border-red-500 text-red-200 text-xs font-bold">
                {paymentError}
              </div>
            )}

            {/* Success Feedback Alert */}
            {paymentSavedFeedback && (
              <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <b className="block text-sm text-white">Contas de recebimento salvas com sucesso!</b>
                  O IBAN ({iban}) e os dados do Multicaixa Express ({mcxEntity} / {mcxReference}) já estão ativos e visíveis para os jogadores na carteira.
                </div>
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setPaymentError(null);
                const res = await updatePaymentSettings({
                  mcxEntity,
                  mcxReference,
                  mcxPhone,
                  bankName,
                  accountHolder,
                  iban,
                  usdtAddress,
                  usdtNetwork,
                  binancePayId,
                  bybitUid
                });
                if (!res.ok) {
                  setPaymentError(res.error || 'Erro ao guardar formas de pagamento.');
                  return;
                }
                setPaymentSavedFeedback(true);
                setTimeout(() => setPaymentSavedFeedback(false), 4000);
              }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Section 1: Multicaixa Express */}
                <div className="rounded-2xl p-5 bg-neutral-950 border border-red-900/40 space-y-4">
                  <div className="flex items-center gap-3 border-b border-neutral-800 pb-3">
                    <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 border border-red-500/40 flex items-center justify-center">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">Multicaixa Express (MCX)</h3>
                      <span className="text-[10px] text-neutral-400 block">Dados fornecidos aos jogadores no depósito KZ</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-neutral-300 block mb-1">
                      Entidade Multicaixa:
                    </label>
                    <input
                      type="text"
                      required
                      value={mcxEntity}
                      onChange={(e) => setMcxEntity(e.target.value)}
                      placeholder="Ex: 99412"
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-yellow-400 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-neutral-300 block mb-1">
                      Referência MCX Padrão:
                    </label>
                    <input
                      type="text"
                      required
                      value={mcxReference}
                      onChange={(e) => setMcxReference(e.target.value)}
                      placeholder="Ex: 924 810 551"
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-neutral-300 block mb-1">
                      Telemóvel Suporte / Express (+244):
                    </label>
                    <input
                      type="text"
                      required
                      value={mcxPhone}
                      onChange={(e) => setMcxPhone(e.target.value)}
                      placeholder="Ex: +244 923 884 102"
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono text-neutral-200 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Section 2: Transferência Bancária (IBAN) */}
                <div className="rounded-2xl p-5 bg-neutral-950 border border-yellow-500/30 space-y-4">
                  <div className="flex items-center gap-3 border-b border-neutral-800 pb-3">
                    <div className="w-10 h-10 rounded-xl bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 flex items-center justify-center">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">Transferência Bancária (IBAN AO06)</h3>
                      <span className="text-[10px] text-neutral-400 block">Conta para recebimento de transferências bancárias</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-neutral-300 block mb-1">
                      Instituição Bancária:
                    </label>
                    <input
                      type="text"
                      required
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="Ex: Banco Angolano de Investimentos (BAI)"
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-yellow-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-neutral-300 block mb-1">
                      Nome do Titular da Conta:
                    </label>
                    <input
                      type="text"
                      required
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value)}
                      placeholder="Ex: N – NÃO TE IRRITES PLATAFORMA LDA"
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-yellow-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-neutral-300 block mb-1">
                      Número de IBAN (AO06...):
                    </label>
                    <input
                      type="text"
                      required
                      value={iban}
                      onChange={(e) => setIban(e.target.value)}
                      placeholder="Ex: AO06.0040.0000.8419.2010.1018.4"
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-yellow-400 focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                </div>

                {/* Section 3: Carteiras USDT & Cripto */}
                <div className="md:col-span-2 rounded-2xl p-5 bg-neutral-950 border border-emerald-500/30 space-y-4">
                  <div className="flex items-center gap-3 border-b border-neutral-800 pb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">Carteiras Internacionais USDT & Cripto</h3>
                      <span className="text-[10px] text-neutral-400 block">Endereço de recebimento Binance, Bybit e Airtm</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-neutral-300 block mb-1">
                        Endereço Oficial da Carteira USDT (TRC20):
                      </label>
                      <input
                        type="text"
                        required
                        value={usdtAddress}
                        onChange={(e) => setUsdtAddress(e.target.value)}
                        placeholder="Ex: TX9qK8x3k8wP29MNa9817ZbvxT69921b"
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-neutral-300 block mb-1">
                        Rede Padrão de Recebimento:
                      </label>
                      <select
                        value={usdtNetwork}
                        onChange={(e) => setUsdtNetwork(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="TRC20">TRC20 (Tron Network - Recomendada)</option>
                        <option value="BEP20">BEP20 (BNB Smart Chain)</option>
                        <option value="ERC20">ERC20 (Ethereum)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-neutral-300 block mb-1">
                        Binance Pay ID:
                      </label>
                      <input
                        type="text"
                        value={binancePayId}
                        onChange={(e) => setBinancePayId(e.target.value)}
                        placeholder="Ex: 849201948"
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-yellow-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-neutral-300 block mb-1">
                        Bybit UID Oficial:
                      </label>
                      <input
                        type="text"
                        value={bybitUid}
                        onChange={(e) => setBybitUid(e.target.value)}
                        placeholder="Ex: 6291048"
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-yellow-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Real-time preview card */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-neutral-400 block">
                  Pré-visualização do Depósito do Jogador
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800 space-y-1">
                    <span className="font-bold text-yellow-400 block">Multicaixa Express Ativo:</span>
                    <p className="text-neutral-300">Entidade: <b className="font-mono text-white">{mcxEntity}</b></p>
                    <p className="text-neutral-300">Referência: <b className="font-mono text-white">{mcxReference}</b></p>
                    <p className="text-neutral-300">Telemóvel: <b className="font-mono text-white">{mcxPhone}</b></p>
                  </div>
                  <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800 space-y-1">
                    <span className="font-bold text-yellow-400 block">Transferência Bancária Ativa:</span>
                    <p className="text-neutral-300">Banco: <b className="text-white">{bankName}</b></p>
                    <p className="text-neutral-300">Titular: <b className="text-white">{accountHolder}</b></p>
                    <p className="text-neutral-300">IBAN: <b className="font-mono text-white">{iban}</b></p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMcxEntity(paymentSettings.mcxEntity);
                    setMcxReference(paymentSettings.mcxReference);
                    setMcxPhone(paymentSettings.mcxPhone);
                    setBankName(paymentSettings.bankName);
                    setAccountHolder(paymentSettings.accountHolder);
                    setIban(paymentSettings.iban);
                    setUsdtAddress(paymentSettings.usdtAddress);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs"
                >
                  Restaurar Valores Anteriores
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-yellow-500 hover:brightness-110 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-red-950 active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Formas de Pagamento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* H. PERCENTAGENS DO VENCEDOR, COMISSÃO DA BANCA & PREÇOS DOS TABULEIROS BLOQUEADOS */}
      {adminTab === 'rules' && (
        <div className="space-y-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setRulesError(null);
              const res = await updatePlatformConfig({
                winnerPercent: winnerPctDraft,
                commissionPercent: commPctDraft,
                themePrices: themePricesDraft
              });
              if (!res.ok) {
                setRulesError(res.error || 'Erro ao guardar configurações.');
                return;
              }
              setRulesSavedFeedback(true);
              setTimeout(() => setRulesSavedFeedback(false), 4000);
            }}
            className="rounded-2xl p-6 bg-neutral-900 border border-neutral-800 space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-yellow-400 block">
                  Regras Financeiras & Loja de Arenas
                </span>
                <h2 className="text-xl font-black text-white mt-0.5">
                  Percentagem do Vencedor, Comissão da Banca e Preços dos Tabuleiros
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Defina quanto o campeão ganha por partida, a comissão retida pela Banca N e os valores de desbloqueio de cada tabuleiro bloqueado.
                </p>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-yellow-500 hover:brightness-110 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-950 transition-all shrink-0 active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Taxas & Preços</span>
              </button>
            </div>

            {rulesError && (
              <div className="p-3 rounded-xl bg-red-950/80 border border-red-500 text-red-200 text-xs font-bold">
                {rulesError}
              </div>
            )}

            {rulesSavedFeedback && (
              <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <b className="block text-sm text-white">Configurações guardadas e sincronizadas em tempo real!</b>
                  Vencedor: <b>{winnerPctDraft}%</b> · Comissão da Banca: <b>{commPctDraft}%</b> · Preços dos tabuleiros atualizados para todos os jogadores.
                </div>
              </div>
            )}

            {/* Section 1: Winner & Bank Commission Split */}
            <div className="rounded-2xl p-5 bg-neutral-950 border border-yellow-500/30 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 flex items-center justify-center">
                    <Percent className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">Divisão do Prémio das Mesas</h3>
                    <span className="text-[10px] text-neutral-400 block">
                      A soma da percentagem do vencedor + comissão da banca fecha sempre em 100%
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { w: 70, c: 30 },
                    { w: 75, c: 25 },
                    { w: 80, c: 20 },
                    { w: 85, c: 15 },
                    { w: 90, c: 10 }
                  ].map((preset) => (
                    <button
                      key={preset.w}
                      type="button"
                      onClick={() => {
                        setWinnerPctDraft(preset.w);
                        setCommPctDraft(preset.c);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                        winnerPctDraft === preset.w
                          ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300'
                          : 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:border-neutral-500'
                      }`}
                    >
                      {preset.w}% / {preset.c}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-4 rounded-xl bg-neutral-900 border border-emerald-500/30 space-y-2">
                  <label className="text-xs font-bold text-emerald-300 block">
                    Percentagem Ganha pelo Vencedor (%)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={winnerPctDraft}
                      onChange={(e) => {
                        const val = Math.min(99, Math.max(1, Math.round(Number(e.target.value) || 1)));
                        setWinnerPctDraft(val);
                        setCommPctDraft(100 - val);
                      }}
                      className="w-28 bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-lg font-mono font-black text-emerald-400 focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="range"
                      min={1}
                      max={99}
                      value={winnerPctDraft}
                      onChange={(e) => {
                        const val = Math.min(99, Math.max(1, Math.round(Number(e.target.value))));
                        setWinnerPctDraft(val);
                        setCommPctDraft(100 - val);
                      }}
                      className="flex-1 accent-emerald-500"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-neutral-900 border border-red-500/30 space-y-2">
                  <label className="text-xs font-bold text-red-300 block">
                    Comissão da Banca N (%)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={commPctDraft}
                      onChange={(e) => {
                        const val = Math.min(99, Math.max(1, Math.round(Number(e.target.value) || 1)));
                        setCommPctDraft(val);
                        setWinnerPctDraft(100 - val);
                      }}
                      className="w-28 bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-lg font-mono font-black text-yellow-400 focus:outline-none focus:border-red-500"
                    />
                    <input
                      type="range"
                      min={1}
                      max={99}
                      value={commPctDraft}
                      onChange={(e) => {
                        const val = Math.min(99, Math.max(1, Math.round(Number(e.target.value))));
                        setCommPctDraft(val);
                        setWinnerPctDraft(100 - val);
                      }}
                      className="flex-1 accent-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* Live Example Simulation */}
              <div className="p-3.5 rounded-xl bg-neutral-900/70 border border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-neutral-400">
                  Simulação (Mesa de 2 Jogadores × 10.000 Kz = <b className="text-white">20.000 Kz</b>):
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-emerald-400 font-bold">
                    Vencedor ({winnerPctDraft}%): {Math.round(20000 * (winnerPctDraft / 100)).toLocaleString('pt-AO')} Kz
                  </span>
                  <span className="text-yellow-400 font-bold">
                    Banca ({commPctDraft}%): {(20000 - Math.round(20000 * (winnerPctDraft / 100))).toLocaleString('pt-AO')} Kz
                  </span>
                </div>
              </div>
            </div>

            {/* Section 2: Locked Board Themes Prices */}
            <div className="rounded-2xl p-5 bg-neutral-950 border border-purple-500/30 space-y-4">
              <div className="flex items-center gap-3 border-b border-neutral-800 pb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Valores dos Tabuleiros Bloqueados</h3>
                  <span className="text-[10px] text-neutral-400 block">
                    Edite o valor em Kwanzas (KZ) e em USDT para desbloquear cada arena premium
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {BOARD_THEME_LIST.filter((t) => !t.isFree).map((theme) => {
                  const cfg = themePricesDraft[theme.id] || {
                    priceKz: theme.priceKz,
                    priceUsdt: theme.priceUsdt
                  };
                  return (
                    <div
                      key={theme.id}
                      className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        {theme.artUrl ? (
                          <img
                            src={theme.artUrl}
                            alt={theme.name}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-lg object-cover border border-white/15 shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-lg bg-neutral-800 flex items-center justify-center text-lg shrink-0">
                            {theme.centerSymbol}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-black text-white truncate">{theme.name}</h4>
                          <span className="text-[11px] text-yellow-400 font-semibold block truncate">
                            {theme.subtitle}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                            Valor em Kwanzas (KZ):
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={500}
                            value={cfg.priceKz}
                            onChange={(e) => {
                              const nextKz = Math.max(0, Math.round(Number(e.target.value) || 0));
                              setThemePricesDraft((prev) => ({
                                ...prev,
                                [theme.id]: { ...cfg, priceKz: nextKz }
                              }));
                            }}
                            className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-yellow-400 focus:outline-none focus:border-yellow-500"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                            Valor em USDT:
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={cfg.priceUsdt}
                            onChange={(e) => {
                              const nextUsdt = Math.max(0, Number(e.target.value) || 0);
                              setThemePricesDraft((prev) => ({
                                ...prev,
                                [theme.id]: { ...cfg, priceUsdt: nextUsdt }
                              }));
                            }}
                            className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setWinnerPctDraft(DEFAULT_PLATFORM_CONFIG.winnerPercent);
                  setCommPctDraft(DEFAULT_PLATFORM_CONFIG.commissionPercent);
                  setThemePricesDraft(DEFAULT_PLATFORM_CONFIG.themePrices);
                }}
                className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Padrão (75% / 25%)</span>
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-yellow-500 hover:brightness-110 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-red-950 active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Percentagens & Preços</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PROOF VIEW MODAL */}
      {selectedProofTx && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-white">Comprovativo de Depósito</h3>
              <button
                onClick={() => setSelectedProofTx(null)}
                className="text-neutral-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-neutral-700 max-h-72">
              <img
                src={selectedProofTx.proofUrl}
                alt="Comprovativo"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="text-xs space-y-1 bg-neutral-950 p-3 rounded-xl border border-neutral-800">
              <p><b>Jogador:</b> {selectedProofTx.userName}</p>
              <p><b>Valor:</b> {selectedProofTx.amount.toLocaleString('pt-AO')} {selectedProofTx.currency}</p>
              <p><b>Referência:</b> {selectedProofTx.reference}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const res = await adminApproveDeposit(selectedProofTx.id);
                  if (!res.ok) {
                    setAdminActionError(res.error || 'Erro ao aprovar comprovativo.');
                    return;
                  }
                  setSelectedProofTx(null);
                }}
                className="flex-1 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-500"
              >
                Aprovar Agora
              </button>
              <button
                onClick={() => setSelectedProofTx(null)}
                className="py-2.5 px-4 bg-neutral-800 text-neutral-300 font-bold text-xs rounded-xl hover:bg-neutral-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
