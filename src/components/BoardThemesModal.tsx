import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { BOARD_THEME_LIST, BoardThemeDefinition } from '../utils/boardThemes';
import { BoardThemeId, Currency, PaymentMethod } from '../types';
import { ThemePieceFigure } from './ThemePieceFigure';
import {
  X,
  Lock,
  CheckCircle2,
  Sparkles,
  CreditCard,
  Clock,
  ShieldCheck,
  Copy,
  Check,
  Upload
} from 'lucide-react';

interface BoardThemesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTheme?: (themeId: BoardThemeId) => void;
}

const ThemeMiniPreview: React.FC<{ theme: BoardThemeDefinition }> = ({ theme }) => {
  const hasArt = Boolean(theme.artUrl);
  return (
    <div
      className="relative w-full aspect-square rounded-xl p-1 border-2 overflow-hidden"
      style={{ backgroundColor: theme.frameBg, borderColor: theme.frameBorder }}
    >
      <div className="relative w-full h-full rounded-lg overflow-hidden">
        {hasArt && (
          <img
            src={theme.artUrl}
            alt={theme.name}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <svg viewBox="0 0 100 100" className="relative z-10 w-full h-full block">
          {!hasArt && <rect width="100" height="100" fill={theme.canvasBg} />}

          {/* Corner Bases: Solid for Classic, Translucent Framed Rings for 2D Illustrated Boards */}
          <rect
            x="0"
            y="0"
            width="40"
            height="40"
            fill={hasArt ? 'none' : theme.bases.green.outer}
            stroke={theme.bases.green.outer}
            strokeWidth={hasArt ? '2.2' : '0'}
          />
          <rect
            x="60"
            y="0"
            width="40"
            height="40"
            fill={hasArt ? 'none' : theme.bases.yellow.outer}
            stroke={theme.bases.yellow.outer}
            strokeWidth={hasArt ? '2.2' : '0'}
          />
          <rect
            x="0"
            y="60"
            width="40"
            height="40"
            fill={hasArt ? 'none' : theme.bases.red.outer}
            stroke={theme.bases.red.outer}
            strokeWidth={hasArt ? '2.2' : '0'}
          />
          <rect
            x="60"
            y="60"
            width="40"
            height="40"
            fill={hasArt ? 'none' : theme.bases.blue.outer}
            stroke={theme.bases.blue.outer}
            strokeWidth={hasArt ? '2.2' : '0'}
          />

          {!hasArt && (
            <>
              <rect x="5" y="5" width="30" height="30" rx="3" fill={theme.yardInnerBg} />
              <rect x="65" y="5" width="30" height="30" rx="3" fill={theme.yardInnerBg} />
              <rect x="5" y="65" width="30" height="30" rx="3" fill={theme.yardInnerBg} />
              <rect x="65" y="65" width="30" height="30" rx="3" fill={theme.yardInnerBg} />
            </>
          )}

          {/* Piece Slots */}
          {[
            { cx: 14, cy: 14, c: theme.bases.green.outer },
            { cx: 26, cy: 14, c: theme.bases.green.outer },
            { cx: 14, cy: 26, c: theme.bases.green.outer },
            { cx: 26, cy: 26, c: theme.bases.green.outer },
            { cx: 74, cy: 14, c: theme.bases.yellow.outer },
            { cx: 86, cy: 14, c: theme.bases.yellow.outer },
            { cx: 74, cy: 26, c: theme.bases.yellow.outer },
            { cx: 86, cy: 26, c: theme.bases.yellow.outer },
            { cx: 14, cy: 74, c: theme.bases.red.outer },
            { cx: 26, cy: 74, c: theme.bases.red.outer },
            { cx: 14, cy: 86, c: theme.bases.red.outer },
            { cx: 26, cy: 86, c: theme.bases.red.outer },
            { cx: 74, cy: 74, c: theme.bases.blue.outer },
            { cx: 86, cy: 74, c: theme.bases.blue.outer },
            { cx: 74, cy: 86, c: theme.bases.blue.outer },
            { cx: 86, cy: 86, c: theme.bases.blue.outer }
          ].map((dot, idx) => (
            <circle
              key={idx}
              cx={dot.cx}
              cy={dot.cy}
              r="3.4"
              fill={dot.c}
              fillOpacity={hasArt ? 0.78 : 1}
              stroke="#ffffff"
              strokeWidth="0.9"
            />
          ))}

          {/* Lanes (solid & crisp) */}
          <rect x="46.5" y="6" width="7" height="34" fill={theme.bases.yellow.outer} fillOpacity={1} stroke="#09090b" strokeWidth="0.6" />
          <rect x="46.5" y="60" width="7" height="34" fill={theme.bases.red.outer} fillOpacity={1} stroke="#09090b" strokeWidth="0.6" />
          <rect x="6" y="46.5" width="34" height="7" fill={theme.bases.green.outer} fillOpacity={1} stroke="#09090b" strokeWidth="0.6" />
          <rect x="60" y="46.5" width="34" height="7" fill={theme.bases.blue.outer} fillOpacity={1} stroke="#09090b" strokeWidth="0.6" />

          {/* Center Goal */}
          <polygon points="40,40 60,40 50,50" fill={theme.bases.yellow.outer} fillOpacity={0.9} />
          <polygon points="40,40 40,60 50,50" fill={theme.bases.green.outer} fillOpacity={0.9} />
          <polygon points="40,60 60,60 50,50" fill={theme.bases.red.outer} fillOpacity={0.9} />
          <polygon points="60,40 60,60 50,50" fill={theme.bases.blue.outer} fillOpacity={0.9} />
          <text x="50" y="53" textAnchor="middle" fontSize="9">
            {theme.centerSymbol}
          </text>
        </svg>
      </div>
    </div>
  );
};

export const BoardThemesModal: React.FC<BoardThemesModalProps> = ({
  isOpen,
  onClose,
  onSelectTheme
}) => {
  const {
    currentUser,
    transactions,
    paymentSettings,
    selectBoardTheme,
    requestThemeUnlock,
    walletMode
  } = useGame();

  const [payingTheme, setPayingTheme] = useState<BoardThemeDefinition | null>(null);
  const [payCurrency, setPayCurrency] = useState<Currency>('KZ');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('MULTICAIXA_EXPRESS');
  const [payReference, setPayReference] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [submittedNotice, setSubmittedNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const unlocked = currentUser.unlockedThemes || ['classic'];
  const activeTheme = currentUser.selectedTheme || 'classic';

  const copyText = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handleEquip = (themeId: BoardThemeId) => {
    selectBoardTheme(themeId);
    onSelectTheme?.(themeId);
    onClose();
  };

  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProofUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingTheme) return;
    requestThemeUnlock({
      themeId: payingTheme.id,
      currency: payCurrency,
      method: payMethod,
      reference: payReference.trim() || `PAG-${payingTheme.id.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      proofUrl: proofUrl || undefined
    });
    setSubmittedNotice(
      `Pagamento de "${payingTheme.name}" enviado! Assim que o Administrador N confirmar o pagamento real, o tabuleiro será desbloqueado na sua conta.`
    );
    setPayingTheme(null);
    setPayReference('');
    setProofUrl('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="max-w-4xl w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-4 sm:p-6 my-4 space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-neutral-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg sm:text-xl font-black text-white">
                Modelos de Tabuleiro & Arenas Premium
              </h2>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Personalize o visual do seu tabuleiro. Modelos bloqueados abrem apenas com pagamento real enviado e confirmado pelo Administrador N.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submittedNotice && (
          <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-600/70 text-emerald-200 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <b className="block text-emerald-300">Comprovativo Enviado para Confirmação!</b>
              {submittedNotice}
            </div>
          </div>
        )}

        {/* Payment Form Drawer when unlocking a locked theme */}
        {payingTheme && (
          <div className="rounded-2xl p-4 sm:p-5 bg-neutral-900 border-2 border-yellow-500/70 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-neutral-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400 block">
                  Desbloqueio por Pagamento Real (Sujeito a Aprovação Admin)
                </span>
                <h3 className="text-base font-black text-white">
                  Desbloquear: {payingTheme.name} ({payingTheme.badge})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPayingTheme(null)}
                className="text-xs text-neutral-400 hover:text-white px-2.5 py-1 rounded-lg bg-neutral-800"
              >
                Voltar à Lista
              </button>
            </div>

            {walletMode === 'DEMO' && (
              <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-700/60 text-amber-200 text-[11px] font-medium">
                Aviso: O saldo DEMO serve apenas para jogar mesas de treino e não desbloqueia tabuleiros bloqueados. Envie pagamento real abaixo para validação do Administrador.
              </div>
            )}

            <form onSubmit={handleSubmitUnlock} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">
                    Moeda de Pagamento
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPayCurrency('KZ');
                        setPayMethod('MULTICAIXA_EXPRESS');
                      }}
                      className={`py-2 px-3 rounded-xl border text-xs font-black ${
                        payCurrency === 'KZ'
                          ? 'bg-red-600/20 border-red-500 text-white'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      {payingTheme.priceKz.toLocaleString('pt-AO')} Kz
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPayCurrency('USDT');
                        setPayMethod('BINANCE');
                      }}
                      className={`py-2 px-3 rounded-xl border text-xs font-black ${
                        payCurrency === 'USDT'
                          ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      {payingTheme.priceUsdt} USDT
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">
                    Método de Pagamento Real
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500"
                  >
                    {payCurrency === 'KZ' ? (
                      <>
                        <option value="MULTICAIXA_EXPRESS">Multicaixa Express ({paymentSettings.mcxPhone})</option>
                        <option value="IBAN">Transferência Bancária ({paymentSettings.bankName} IBAN)</option>
                      </>
                    ) : (
                      <>
                        <option value="BINANCE">Binance Pay / USDT ({paymentSettings.usdtNetwork})</option>
                        <option value="BYBIT">Bybit UID / USDT ({paymentSettings.usdtNetwork})</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Payment Destination Instructions */}
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs space-y-2">
                <div className="text-[11px] font-bold text-yellow-400 uppercase tracking-wider">
                  Dados Oficiais para Envio ({payCurrency === 'KZ' ? `${payingTheme.priceKz.toLocaleString('pt-AO')} Kz` : `${payingTheme.priceUsdt} USDT`})
                </div>

                {payMethod === 'MULTICAIXA_EXPRESS' && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-neutral-300">
                      Express Telemóvel: <b className="text-white font-mono">{paymentSettings.mcxPhone}</b> · Entidade: <b className="text-yellow-400 font-mono">{paymentSettings.mcxEntity}</b>
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText(paymentSettings.mcxPhone, 'mcx')}
                      className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] font-bold flex items-center gap-1"
                    >
                      {copiedField === 'mcx' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      Copiar Express
                    </button>
                  </div>
                )}

                {payMethod === 'IBAN' && (
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-neutral-300">
                        {paymentSettings.bankName} · IBAN: <b className="text-yellow-400 font-mono">{paymentSettings.iban}</b>
                      </span>
                      <button
                        type="button"
                        onClick={() => copyText(paymentSettings.iban, 'iban')}
                        className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] font-bold flex items-center gap-1"
                      >
                        {copiedField === 'iban' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        Copiar IBAN
                      </button>
                    </div>
                    <span className="text-[11px] text-neutral-400 block">
                      Titular: {paymentSettings.accountHolder}
                    </span>
                  </div>
                )}

                {(payMethod === 'BINANCE' || payMethod === 'BYBIT') && (
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-neutral-300 break-all">
                        {payMethod === 'BINANCE'
                          ? `Binance Pay ID: ${paymentSettings.binancePayId || '849201948'}`
                          : `Bybit UID: ${paymentSettings.bybitUid || '6291048'}`}
                        {' · '}Rede {paymentSettings.usdtNetwork}: <b className="text-yellow-400 font-mono">{paymentSettings.usdtAddress}</b>
                      </span>
                      <button
                        type="button"
                        onClick={() => copyText(paymentSettings.usdtAddress, 'usdt')}
                        className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] font-bold flex items-center gap-1"
                      >
                        {copiedField === 'usdt' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        Copiar Carteira
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">
                    Código da Operação / Referência do Pagamento *
                  </label>
                  <input
                    type="text"
                    required
                    value={payReference}
                    onChange={(e) => setPayReference(e.target.value)}
                    placeholder="Ex: MCX-884120 ou ID da transferência"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">
                    Comprovativo (Imagem opcional)
                  </label>
                  <label className="w-full bg-neutral-950 border border-dashed border-neutral-700 hover:border-yellow-500 rounded-xl px-3 py-2 text-xs text-neutral-300 flex items-center justify-center gap-2 cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-yellow-400" />
                    <span>{proofUrl ? 'Comprovativo Anexado ✓' : 'Anexar Comprovativo'}</span>
                    <input type="file" accept="image/*" onChange={handleProofUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-yellow-500 text-white font-black text-xs uppercase tracking-wider hover:brightness-110 flex items-center justify-center gap-2 shadow-lg"
              >
                <CreditCard className="w-4 h-4" />
                Enviar Pagamento Real para Confirmação do Admin
              </button>
            </form>
          </div>
        )}

        {/* 6 Board Themes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BOARD_THEME_LIST.map((theme) => {
            const isUnlocked = theme.isFree || unlocked.includes(theme.id);
            const isEquipped = activeTheme === theme.id && isUnlocked;
            const isPending = transactions.some(
              (t) => t.type === 'THEME_UNLOCK' && t.themeId === theme.id && t.status === 'Em validação'
            );

            return (
              <div
                key={theme.id}
                className={`rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 ${
                  isEquipped
                    ? 'bg-neutral-900 border-yellow-500 shadow-lg shadow-yellow-950/20'
                    : isUnlocked
                    ? 'bg-neutral-900/80 border-neutral-700 hover:border-neutral-500'
                    : 'bg-neutral-950 border-neutral-800/90'
                }`}
              >
                <div className="space-y-3">
                  <div className="relative">
                    <ThemeMiniPreview theme={theme} />
                    {/* Status Badge Overlay */}
                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-black/80 text-white border border-white/15">
                        {theme.badge}
                      </span>
                      {!isUnlocked && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-red-950/90 text-red-300 border border-red-500/60 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> BLOQUEADO
                        </span>
                      )}
                      {isEquipped && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> EM USO
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-white">{theme.name}</h3>
                    <span className="text-[11px] font-semibold text-yellow-400 block">
                      {theme.subtitle}
                    </span>
                    <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                      {theme.description}
                    </p>
                  </div>

                  {/* Character / Figure Pieces Lineup */}
                  <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-neutral-900/90 border border-neutral-800">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider shrink-0">
                      Peças:
                    </span>
                    <div className="flex items-center gap-1.5">
                      {(['green', 'yellow', 'red', 'blue'] as const).map((c, idx) => (
                        <ThemePieceFigure
                          key={c}
                          themeId={theme.id}
                          color={c}
                          expression="smiling"
                          pieceIndex={idx}
                          className="w-6 h-7"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-800/80 space-y-2">
                  {!isUnlocked && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400">Desbloqueio Real:</span>
                      <span className="font-black text-yellow-400">
                        {theme.priceKz.toLocaleString('pt-AO')} Kz · {theme.priceUsdt} USDT
                      </span>
                    </div>
                  )}

                  {isUnlocked ? (
                    <button
                      type="button"
                      onClick={() => handleEquip(theme.id)}
                      className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                        isEquipped
                          ? 'bg-emerald-600/20 border border-emerald-500 text-emerald-300'
                          : 'bg-gradient-to-r from-red-600 to-yellow-500 text-white hover:brightness-110'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isEquipped ? 'Tabuleiro Selecionado' : 'Usar Este Tabuleiro'}
                    </button>
                  ) : isPending ? (
                    <div className="w-full py-2.5 px-3 rounded-xl bg-amber-950/60 border border-amber-600/60 text-amber-300 font-bold text-[11px] flex items-center justify-center gap-1.5 text-center">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      Pagamento em Validação pelo Admin
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setPayingTheme(theme);
                        setSubmittedNotice(null);
                      }}
                      className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-yellow-500/50 text-yellow-300 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Pagar & Desbloquear (Real)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
