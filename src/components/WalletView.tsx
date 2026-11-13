import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Currency, PaymentMethod } from '../types';
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  CheckCircle,
  Copy,
  Info,
  ShieldCheck,
  Building,
  Smartphone,
  ExternalLink,
  Upload
} from 'lucide-react';

export const WalletView: React.FC = () => {
  const {
    currentUser,
    transactions,
    exchangeRate,
    requestDeposit,
    requestWithdrawal,
    paymentSettings
  } = useGame();

  const [walletTab, setWalletTab] = useState<'overview' | 'deposit' | 'withdraw' | 'history'>('overview');
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('KZ');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('MULTICAIXA_EXPRESS');

  // Deposit Form State
  const [depositAmount, setDepositAmount] = useState<number>(5000);
  const [depositNetwork, setDepositNetwork] = useState<'TRC20' | 'ERC20' | 'BEP20'>('TRC20');
  const [depositRefInput, setDepositRefInput] = useState('');
  const [depositSuccessMsg, setDepositSuccessMsg] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Withdraw Form State
  const [withdrawAmount, setWithdrawAmount] = useState<number>(5000);
  const [withdrawDestination, setWithdrawDestination] = useState('');
  const [withdrawSuccessMsg, setWithdrawSuccessMsg] = useState(false);

  // Preset chips for Kwanza
  const KZ_PRESETS = [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000, 5000000];
  // Preset chips for USDT
  const USDT_PRESETS = [5, 10, 25, 50, 100, 250, 500, 1000, 5000, 20000];

  const handleCopy = (field: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (depositAmount <= 0) return;

    requestDeposit({
      currency: selectedCurrency,
      amount: depositAmount,
      method: selectedMethod,
      network: selectedCurrency === 'USDT' ? depositNetwork : undefined
    });

    setDepositSuccessMsg(true);
    setTimeout(() => {
      setDepositSuccessMsg(false);
      setWalletTab('history');
    }, 2500);
  };

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawAmount <= 0 || !withdrawDestination.trim()) return;

    requestWithdrawal({
      currency: selectedCurrency,
      amount: withdrawAmount,
      method: selectedMethod,
      destination: withdrawDestination,
      network: selectedCurrency === 'USDT' ? depositNetwork : undefined
    });

    setWithdrawSuccessMsg(true);
    setTimeout(() => {
      setWithdrawSuccessMsg(false);
      setWalletTab('history');
    }, 2500);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
            <Wallet className="w-7 h-7 text-yellow-400" />
            N – Minha Carteira
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Gestão integrada multimoeda: Kwanza (KZ) e Tether (USDT) com saldos independentes.
          </p>
        </div>

        {/* Currency Tab Selector */}
        <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
          <button
            onClick={() => {
              setSelectedCurrency('KZ');
              setSelectedMethod('MULTICAIXA_EXPRESS');
              setDepositAmount(5000);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              selectedCurrency === 'KZ'
                ? 'bg-red-600 text-white shadow-md shadow-red-950'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Nacional · KZ
          </button>
          <button
            onClick={() => {
              setSelectedCurrency('USDT');
              setSelectedMethod('BINANCE');
              setDepositAmount(50);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              selectedCurrency === 'USDT'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Internacional · USDT
          </button>
        </div>
      </div>

      {/* DUAL BALANCE CARDS + SALDO DEMO - With zero real balance rule notice */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card Saldo Real KZ */}
        <div className="rounded-2xl p-6 bg-gradient-to-br from-[#1c1d22] to-[#121317] border border-red-900/40 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold uppercase tracking-widest text-red-400">
              SALDO REAL KZ
            </span>
            <span className="text-[10px] text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-800">
              Oficial
            </span>
          </div>

          <div className="text-3xl sm:text-4xl font-black text-white tabular-nums tracking-tight">
            {currentUser.kzBalance.toLocaleString('pt-AO')} Kz
          </div>

          <div className="mt-3 pt-3 border-t border-neutral-800 text-[11px] text-neutral-400">
            {currentUser.kzBalance === 0 ? (
              <span className="text-yellow-400 font-semibold block">
                Saldo Real Zero. Faça um depósito e aguarde a validação do Admin para creditar.
              </span>
            ) : (
              <span className="text-emerald-400 font-semibold block">
                Disponível para apostas e levantamentos em Angola.
              </span>
            )}
          </div>
        </div>

        {/* Card Saldo Real USDT */}
        <div className="rounded-2xl p-6 bg-gradient-to-br from-[#1c1d22] to-[#121317] border border-emerald-900/40 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
              SALDO REAL USDT
            </span>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
              Crypto
            </span>
          </div>

          <div className="text-3xl sm:text-4xl font-black text-emerald-300 tabular-nums tracking-tight">
            {currentUser.usdtBalance.toLocaleString('pt-AO')} USDT
          </div>

          <div className="mt-3 pt-3 border-t border-neutral-800 text-[11px] text-neutral-400">
            {currentUser.usdtBalance === 0 ? (
              <span className="text-neutral-400 block">
                Saldo inicial Zero. Deposite via Binance/Bybit.
              </span>
            ) : (
              <span className="text-emerald-400 font-semibold block">
                Disponível para apostas internacionais.
              </span>
            )}
          </div>
        </div>

        {/* Card Saldo Demo Simulado */}
        <div className="rounded-2xl p-6 bg-gradient-to-br from-[#211a14] to-[#15120e] border border-yellow-600/40 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold uppercase tracking-widest text-yellow-400">
              SALDO DEMO (SIMULADO)
            </span>
            <span className="text-[10px] text-yellow-400 bg-yellow-950/60 px-2 py-0.5 rounded border border-yellow-600">
              Treino
            </span>
          </div>

          <div className="text-3xl sm:text-4xl font-black text-yellow-300 tabular-nums tracking-tight">
            {(currentUser.demoKzBalance ?? 50000).toLocaleString('pt-AO')} Kz
          </div>

          <div className="mt-3 pt-3 border-t border-neutral-800 text-[11px] text-yellow-500 font-medium">
            Fichas demonstrativas para jogar nas mesas sem arriscar dinheiro real.
          </div>
        </div>
      </div>

      {/* Indicative Exchange Rate Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800 text-xs text-neutral-300">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-yellow-400 shrink-0" />
          <span>
            <b>Cotação Indicativa:</b> 1 USDT = <span className="text-yellow-400 font-bold">{exchangeRate.usdToKz.toFixed(2)} Kz</span>
          </span>
        </div>
        <div className="flex items-center gap-3 text-neutral-400 text-[11px]">
          <span>Fonte: {exchangeRate.source}</span>
          <span>·</span>
          <span>Atualizado: {exchangeRate.updatedAt}</span>
        </div>
      </div>

      {/* Section: Métodos de Pagamento (Visual representation as in user upload) */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">
          Métodos de pagamento preparados
        </h2>

        {selectedCurrency === 'USDT' ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Binance Card */}
            <div
              onClick={() => setSelectedMethod('BINANCE')}
              className={`cursor-pointer rounded-2xl p-5 border transition-all flex flex-col items-center justify-center text-center ${
                selectedMethod === 'BINANCE'
                  ? 'bg-neutral-900 border-yellow-500 shadow-lg shadow-yellow-950/20'
                  : 'bg-[#14151a] border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="w-full h-16 flex items-center justify-center bg-black rounded-xl mb-3 p-3 border border-neutral-800">
                <span className="text-xl font-black text-[#F3BA2F] tracking-wider flex items-center gap-2">
                  <span className="text-2xl">❖</span> BINANCE
                </span>
              </div>
              <span className="text-sm font-bold text-white">Binance Pay</span>
              <span className="text-[11px] text-neutral-400">TRC20, BEP20, BSC</span>
            </div>

            {/* Bybit Card */}
            <div
              onClick={() => setSelectedMethod('BYBIT')}
              className={`cursor-pointer rounded-2xl p-5 border transition-all flex flex-col items-center justify-center text-center ${
                selectedMethod === 'BYBIT'
                  ? 'bg-neutral-900 border-yellow-500 shadow-lg shadow-yellow-950/20'
                  : 'bg-[#14151a] border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="w-full h-16 flex items-center justify-center bg-white rounded-xl mb-3 p-3">
                <span className="text-xl font-black text-neutral-950 tracking-wider">
                  BYB<span className="text-amber-500">I</span>T
                </span>
              </div>
              <span className="text-sm font-bold text-white">Bybit Direct</span>
              <span className="text-[11px] text-neutral-400">TRC20, ERC20</span>
            </div>

            {/* Airtm Card */}
            <div
              onClick={() => setSelectedMethod('AIRTM')}
              className={`cursor-pointer rounded-2xl p-5 border transition-all flex flex-col items-center justify-center text-center ${
                selectedMethod === 'AIRTM'
                  ? 'bg-neutral-900 border-yellow-500 shadow-lg shadow-yellow-950/20'
                  : 'bg-[#14151a] border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="w-full h-16 flex items-center justify-center bg-gradient-to-r from-[#200B3B] to-[#0A1B38] rounded-xl mb-3 p-3 border border-purple-900/50">
                <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-200 tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-400 inline-block" /> AIRTM
                </span>
              </div>
              <span className="text-sm font-bold text-white">Airtm P2P</span>
              <span className="text-[11px] text-neutral-400">Transferência Instantânea</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Multicaixa Express */}
            <div
              onClick={() => setSelectedMethod('MULTICAIXA_EXPRESS')}
              className={`cursor-pointer rounded-2xl p-5 border transition-all flex items-center gap-4 ${
                selectedMethod === 'MULTICAIXA_EXPRESS'
                  ? 'bg-neutral-900 border-red-500 shadow-lg shadow-red-950/20'
                  : 'bg-[#14151a] border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="w-14 h-14 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500">
                <Smartphone className="w-7 h-7" />
              </div>
              <div>
                <span className="text-base font-bold text-white block">Multicaixa Express</span>
                <span className="text-xs text-neutral-400 block mt-0.5">Pagamento por telemóvel (+244)</span>
                <span className="text-[10px] text-red-400 font-semibold">Crédito rápido pós-validação</span>
              </div>
            </div>

            {/* Transferência Bancária IBAN */}
            <div
              onClick={() => setSelectedMethod('IBAN')}
              className={`cursor-pointer rounded-2xl p-5 border transition-all flex items-center gap-4 ${
                selectedMethod === 'IBAN'
                  ? 'bg-neutral-900 border-red-500 shadow-lg shadow-red-950/20'
                  : 'bg-[#14151a] border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="w-14 h-14 rounded-xl bg-yellow-600/20 border border-yellow-500/40 flex items-center justify-center text-yellow-400">
                <Building className="w-7 h-7" />
              </div>
              <div>
                <span className="text-base font-bold text-white block">Transferência Bancária (IBAN)</span>
                <span className="text-xs text-neutral-400 block mt-0.5">BAI, BFA, BIC, BMA, BNI (AO06)</span>
                <span className="text-[10px] text-yellow-400 font-semibold">Comprovativo com auditoria</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-neutral-800 gap-6 text-sm font-semibold">
        <button
          onClick={() => setWalletTab('overview')}
          className={`pb-3 transition-colors ${
            walletTab === 'overview' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Visão Geral
        </button>
        <button
          onClick={() => setWalletTab('deposit')}
          className={`pb-3 transition-colors flex items-center gap-1.5 ${
            walletTab === 'deposit' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <ArrowDownCircle className="w-4 h-4" />
          Depositar
        </button>
        <button
          onClick={() => setWalletTab('withdraw')}
          className={`pb-3 transition-colors flex items-center gap-1.5 ${
            walletTab === 'withdraw' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <ArrowUpCircle className="w-4 h-4" />
          Minhas Retiradas
        </button>
        <button
          onClick={() => setWalletTab('history')}
          className={`pb-3 transition-colors flex items-center gap-1.5 ${
            walletTab === 'history' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          Histórico
        </button>
      </div>

      {/* SUB-TAB: OVERVIEW */}
      {walletTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="rounded-2xl p-6 bg-neutral-900 border border-neutral-800 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Segurança e Governança da Carteira
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                A plataforma N – NÃO TE IRRITES mantém os fundos dos jogadores totalmente segregados das contas operacionais da empresa. Nenhuma chave privada ou credencial bancária é armazenada em nossos servidores.
              </p>
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Limites de Participação KZ:</span>
                  <span className="font-bold text-white">100 Kz a 5.000.000 Kz</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Limites de Participação USDT:</span>
                  <span className="font-bold text-white">2 USDT a 200.000 USDT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Distribuição Padrão da Mesa:</span>
                  <span className="font-bold text-yellow-400">75% Prémios / 25% Taxa N</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setWalletTab('deposit')}
                className="p-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 shadow-lg shadow-red-950"
              >
                <ArrowDownCircle className="w-5 h-5" />
                Fazer Depósito
              </button>
              <button
                onClick={() => setWalletTab('withdraw')}
                className="p-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-bold text-sm flex items-center justify-center gap-2"
              >
                <ArrowUpCircle className="w-5 h-5" />
                Pedir Levantamento
              </button>
            </div>
          </div>

          {/* Legal Compliance Box */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-yellow-500/30 text-xs space-y-3">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
              <span>AVISO REGULATÓRIO</span>
            </span>
            <p className="text-neutral-300 leading-relaxed text-[11px]">
              Em rigoroso cumprimento com as diretrizes do Banco Nacional de Angola (BNA) e do Instituto de Supervisão de Jogos (ISJ), as operações com moeda fiduciária real permanecem em regime de teste e pré-licenciamento com créditos demonstrativos.
            </p>
            <p className="text-neutral-400 text-[11px] leading-relaxed">
              Todos os saldos exibidos são assegurados por contratos de teste até ao anúncio oficial do lançamento regulado.
            </p>
          </div>
        </div>
      )}

      {/* SUB-TAB: DEPOSITAR */}
      {walletTab === 'deposit' && (
        <div className="max-w-2xl mx-auto rounded-2xl p-6 bg-neutral-900 border border-neutral-800 space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Depositar Fundos</h3>
              <p className="text-xs text-neutral-400">
                Selecione o valor e siga as instruções para crédito em sua carteira.
              </p>
            </div>
            <span className="text-xs font-bold text-yellow-400 bg-neutral-800 px-3 py-1 rounded-full">
              {selectedCurrency}
            </span>
          </div>

          {depositSuccessMsg && (
            <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500 text-emerald-200 text-xs flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <b className="block">Solicitação de depósito enviada com sucesso!</b>
                O comprovativo foi encaminhado ao Administrador N para validação.
              </div>
            </div>
          )}

          <form onSubmit={handleDepositSubmit} className="space-y-6">
            {/* Currency selection presets */}
            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-2">
                Valores sugeridos ({selectedCurrency}):
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {(selectedCurrency === 'KZ' ? KZ_PRESETS : USDT_PRESETS).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setDepositAmount(val)}
                    className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all ${
                      depositAmount === val
                        ? 'bg-yellow-500 text-black border-yellow-400 shadow-sm'
                        : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:border-neutral-600'
                    }`}
                  >
                    {val.toLocaleString('pt-AO')} {selectedCurrency === 'KZ' ? 'Kz' : 'USDT'}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount input */}
            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">
                Ou digite outro valor ({selectedCurrency}):
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={selectedCurrency === 'KZ' ? 100 : 2}
                  max={selectedCurrency === 'KZ' ? 5000000 : 200000}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-yellow-500 focus:outline-none"
                />
                <span className="absolute right-4 top-3 text-xs font-bold text-neutral-400">
                  {selectedCurrency}
                </span>
              </div>
            </div>

            {/* Payment Method Details (Dynamic from Admin Settings) */}
            {selectedCurrency === 'KZ' ? (
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white block">Dados Oficiais para Pagamento em Angola:</span>
                  <span className="text-[10px] text-yellow-400 font-semibold bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                    Auditado pelo Admin N
                  </span>
                </div>
                {selectedMethod === 'MULTICAIXA_EXPRESS' ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-1.5 border-b border-neutral-800">
                      <span className="text-neutral-400">Entidade Multicaixa:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-yellow-400 text-sm">{paymentSettings.mcxEntity}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy('mcxEntity', paymentSettings.mcxEntity)}
                          className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 font-mono bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800"
                        >
                          <Copy className="w-3 h-3" />
                          {copiedField === 'mcxEntity' ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-neutral-800">
                      <span className="text-neutral-400">Referência MCX:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-sm">{paymentSettings.mcxReference}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy('mcxReference', paymentSettings.mcxReference)}
                          className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 font-mono bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800"
                        >
                          <Copy className="w-3 h-3" />
                          {copiedField === 'mcxReference' ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-neutral-400">Telemóvel Suporte / Express:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-xs">{paymentSettings.mcxPhone}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy('mcxPhone', paymentSettings.mcxPhone)}
                          className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 font-mono bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800"
                        >
                          <Copy className="w-3 h-3" />
                          {copiedField === 'mcxPhone' ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-1.5 border-b border-neutral-800">
                      <span className="text-neutral-400">Instituição Bancária:</span>
                      <span className="font-bold text-white">{paymentSettings.bankName}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-neutral-800">
                      <span className="text-neutral-400">Titular da Conta:</span>
                      <span className="font-bold text-white">{paymentSettings.accountHolder}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1.5">
                      <span className="text-neutral-400">IBAN Oficial (AO06):</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-yellow-400 text-xs sm:text-sm">
                          {paymentSettings.iban}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy('iban', paymentSettings.iban)}
                          className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 font-mono bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800 shrink-0"
                        >
                          <Copy className="w-3 h-3" />
                          {copiedField === 'iban' ? 'Copiado!' : 'Copiar IBAN'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs space-y-3">
                <span className="font-bold text-white block">Dados Oficiais de Depósito USDT:</span>
                {/* Network selector */}
                <div className="flex gap-2 mb-2">
                  {(['TRC20', 'BEP20', 'ERC20'] as const).map((net) => (
                    <button
                      key={net}
                      type="button"
                      onClick={() => setDepositNetwork(net)}
                      className={`px-3 py-1 rounded text-xs font-bold border ${
                        depositNetwork === net
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                      }`}
                    >
                      {net}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1 border-b border-neutral-800">
                    <span className="text-neutral-400">Endereço Oficial USDT ({depositNetwork}):</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('usdtAddress', paymentSettings.usdtAddress)}
                      className="text-xs text-yellow-400 hover:text-white flex items-center gap-1 font-mono"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedField === 'usdtAddress' ? 'Copiado!' : 'Copiar Endereço'}
                    </button>
                  </div>
                  <div className="p-2.5 bg-neutral-900 rounded font-mono text-xs text-emerald-300 break-all select-all border border-neutral-800">
                    {paymentSettings.usdtAddress}
                  </div>

                  {paymentSettings.binancePayId && selectedMethod === 'BINANCE' && (
                    <div className="flex justify-between items-center py-1.5 border-t border-neutral-800">
                      <span className="text-neutral-400">Binance Pay ID:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white">{paymentSettings.binancePayId}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy('binanceId', paymentSettings.binancePayId!)}
                          className="text-[11px] text-yellow-400 hover:text-white font-mono"
                        >
                          {copiedField === 'binanceId' ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    </div>
                  )}

                  {paymentSettings.bybitUid && selectedMethod === 'BYBIT' && (
                    <div className="flex justify-between items-center py-1.5 border-t border-neutral-800">
                      <span className="text-neutral-400">Bybit UID:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white">{paymentSettings.bybitUid}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy('bybitUid', paymentSettings.bybitUid!)}
                          className="text-[11px] text-yellow-400 hover:text-white font-mono"
                        >
                          {copiedField === 'bybitUid' ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reference input & proof simulation */}
            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">
                Referência da Transação / Hash:
              </label>
              <input
                type="text"
                value={depositRefInput}
                onChange={(e) => setDepositRefInput(e.target.value)}
                placeholder="Ex: MCX-99482104 ou TxHash 0x..."
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-2.5 text-xs text-white focus:border-yellow-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-yellow-500 text-white font-extrabold text-sm shadow-xl shadow-red-950 hover:brightness-110 active:scale-95 transition-all"
            >
              CONFIRMAR REGISTRO DE DEPÓSITO
            </button>
          </form>
        </div>
      )}

      {/* SUB-TAB: MINHAS RETIRADAS */}
      {walletTab === 'withdraw' && (
        <div className="max-w-2xl mx-auto rounded-2xl p-6 bg-neutral-900 border border-neutral-800 space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Minhas Retiradas</h3>
              <p className="text-xs text-neutral-400">
                Levante os seus prémios conquistados nas mesas para a sua conta ou carteira.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-neutral-800 px-3 py-1 rounded-full">
              Saldo: {selectedCurrency === 'KZ' ? `${currentUser.kzBalance.toLocaleString('pt-AO')} Kz` : `${currentUser.usdtBalance.toLocaleString('pt-AO')} USDT`}
            </span>
          </div>

          {withdrawSuccessMsg && (
            <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500 text-emerald-200 text-xs flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <b className="block">Pedido de levantamento registrado com sucesso!</b>
                O montante foi reservado e está sob análise financeira.
              </div>
            </div>
          )}

          <form onSubmit={handleWithdrawSubmit} className="space-y-6">
            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">
                Valor a Levantar ({selectedCurrency}):
              </label>
              <input
                type="number"
                min={selectedCurrency === 'KZ' ? 500 : 5}
                max={selectedCurrency === 'KZ' ? currentUser.kzBalance : currentUser.usdtBalance}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-yellow-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">
                {selectedCurrency === 'KZ' ? 'Número de Telefone MCX ou IBAN de Destino:' : 'Endereço da Carteira USDT (TRC20 / BEP20):'}
              </label>
              <input
                type="text"
                required
                value={withdrawDestination}
                onChange={(e) => setWithdrawDestination(e.target.value)}
                placeholder={selectedCurrency === 'KZ' ? 'Ex: +244 923 884 102 ou AO06...' : 'Ex: TX9qK8... ou Bybit UID'}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-2.5 text-xs text-white focus:border-yellow-500 focus:outline-none"
              />
            </div>

            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-400 space-y-1">
              <div className="flex justify-between">
                <span>Taxa de processamento:</span>
                <span className="font-bold text-white">{selectedCurrency === 'KZ' ? '100 Kz' : '1 USDT'}</span>
              </div>
              <div className="flex justify-between">
                <span>Prazo estimado:</span>
                <span className="font-bold text-emerald-400">Até 15 minutos pós-aprovação</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-yellow-500 text-white font-extrabold text-sm shadow-xl shadow-red-950 hover:brightness-110 active:scale-95 transition-all"
            >
              SOLICITAR LEVANTAMENTO
            </button>
          </form>
        </div>
      )}

      {/* SUB-TAB: HISTÓRICO */}
      {walletTab === 'history' && (
        <div className="rounded-2xl p-6 bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Histórico de Operações</h3>
            <span className="text-xs text-neutral-400">{transactions.length} transações registradas</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Data</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Método</th>
                  <th className="p-3">Referência</th>
                  <th className="p-3">Valor</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-neutral-800/40">
                    <td className="p-3 text-neutral-400">{tx.createdAt}</td>
                    <td className="p-3 font-semibold text-white">
                      {tx.type === 'DEPOSIT' ? 'Depósito' : tx.type === 'WITHDRAW' ? 'Levantamento' : tx.type === 'BET_WIN' ? 'Prémio de Partida' : 'Aposta'}
                    </td>
                    <td className="p-3 text-neutral-300 font-mono text-[11px]">{tx.method}</td>
                    <td className="p-3 font-mono text-neutral-400 text-[11px]">{tx.reference}</td>
                    <td className="p-3 font-bold tabular-nums">
                      <span className={tx.type === 'WITHDRAW' ? 'text-red-400' : 'text-emerald-400'}>
                        {tx.type === 'WITHDRAW' ? '-' : '+'}{tx.amount.toLocaleString('pt-AO')} {tx.currency}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        tx.status === 'Confirmado' || tx.status === 'Pago'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : tx.status === 'Em validação' || tx.status === 'Pendente'
                          ? 'bg-amber-950 text-yellow-300 border border-yellow-800'
                          : 'bg-red-950 text-red-300 border border-red-800'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
