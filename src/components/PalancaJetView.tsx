import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { PalancaJetFlightScene } from '../utils/palancaJetArt';
import {
  computeMultiplierAtElapsedMs,
  computeCrashPointFromGameHashHex
} from '../utils/palancaJetEngine';
import { soundManager } from '../utils/soundEffects';
import type { PalancaJetBet, PalancaJetHistoryRound } from '../types';
import {
  Plane,
  ShieldCheck,
  Info,
  AlertTriangle,
  Users,
  MessageSquare,
  Send,
  CheckCircle2,
  XCircle,
  Lock,
  Search,
  Sparkles
} from 'lucide-react';

interface SlotControlState {
  amount: number;
  autoBet: boolean;
  autoCashoutEnabled: boolean;
  autoCashoutStr: string;
  queued: boolean;
  busy: boolean;
  error: string | null;
}

interface VerifiedRoundData {
  id: string;
  roundNumber: number;
  status: string;
  seedHash: string;
  serverSeed: string | null;
  crashPoint: number | null;
  houseEdgePercent: number;
  crashedAt: string | null;
}

async function sha256HexBrowser(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const PalancaJetView: React.FC = () => {
  const {
    currentUser,
    walletMode,
    setWalletMode,
    platformConfig,
    jetState,
    fetchJetState,
    placeJetBet,
    cancelJetBet,
    cashoutJetBet,
    sendJetChat,
    verifyJetRound,
    updateResponsibleGaming,
    setActiveTab
  } = useGame();

  const jetConfig = platformConfig.jetConfig;
  const isDemo = walletMode === 'DEMO';

  // Ensure initial jet state is fresh upon opening view
  useEffect(() => {
    void fetchJetState();
  }, [fetchJetState]);

  // Smooth 60fps interpolated flight values anchored to server timestamps
  const syncAnchorRef = useRef<{
    roundId: string;
    phase: string;
    elapsedMs: number;
    bettingRemainingMs: number;
    perfNow: number;
  }>({
    roundId: '',
    phase: 'BETTING',
    elapsedMs: 0,
    bettingRemainingMs: jetConfig.bettingDurationSec * 1000,
    perfNow: typeof performance !== 'undefined' ? performance.now() : 0
  });

  const [renderTelemetry, setRenderTelemetry] = useState<{
    multiplier: number;
    elapsedMs: number;
    bettingRemainingMs: number;
  }>({
    multiplier: 1.0,
    elapsedMs: 0,
    bettingRemainingMs: jetConfig.bettingDurationSec * 1000
  });

  useEffect(() => {
    if (!jetState) return;
    syncAnchorRef.current = {
      roundId: jetState.roundId,
      phase: jetState.phase,
      elapsedMs: jetState.elapsedMs,
      bettingRemainingMs: jetState.bettingRemainingMs,
      perfNow: performance.now()
    };

    if (jetState.phase === 'CRASHED') {
      setRenderTelemetry({
        multiplier: jetState.crashPoint ?? jetState.multiplier,
        elapsedMs: jetState.elapsedMs,
        bettingRemainingMs: 0
      });
    } else if (jetState.phase === 'BETTING') {
      setRenderTelemetry({
        multiplier: 1.0,
        elapsedMs: 0,
        bettingRemainingMs: jetState.bettingRemainingMs
      });
    }
  }, [jetState]);

  // Sound cues for takeoff, climb pulse, and crash
  const prevPhaseRef = useRef<string | null>(null);
  const lastPulseAtRef = useRef<number>(0);

  useEffect(() => {
    if (!jetState) return;
    const prev = prevPhaseRef.current;
    if (prev && prev !== jetState.phase) {
      if (jetState.phase === 'FLYING') {
        soundManager.playJetTakeoff();
        lastPulseAtRef.current = performance.now();
      } else if (jetState.phase === 'CRASHED') {
        soundManager.playJetCrash();
      }
    }
    prevPhaseRef.current = jetState.phase;
  }, [jetState]);

  useEffect(() => {
    if (!jetState || (jetState.phase !== 'FLYING' && jetState.phase !== 'BETTING')) return;
    let rafId = 0;

    const loop = () => {
      const anchor = syncAnchorRef.current;
      const dt = Math.max(0, performance.now() - anchor.perfNow);
      if (jetState.phase === 'BETTING') {
        setRenderTelemetry({
          multiplier: 1.0,
          elapsedMs: 0,
          bettingRemainingMs: Math.max(0, anchor.bettingRemainingMs - dt)
        });
      } else if (jetState.phase === 'FLYING') {
        const nextElapsed = Math.max(0, anchor.elapsedMs + dt);
        const nextMult = computeMultiplierAtElapsedMs(nextElapsed);
        setRenderTelemetry({
          multiplier: nextMult,
          elapsedMs: nextElapsed,
          bettingRemainingMs: 0
        });
        const nowPerf = performance.now();
        if (nowPerf - lastPulseAtRef.current >= 950 && nextMult >= 1.15) {
          lastPulseAtRef.current = nowPerf;
          soundManager.playJetClimbPulse(nextMult);
        }
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [jetState?.phase, jetState?.roundId]);

  // Two independent bet slots state
  const [slotStates, setSlotStates] = useState<[SlotControlState, SlotControlState]>([
    {
      amount: Math.max(100, jetConfig.minBetKz),
      autoBet: false,
      autoCashoutEnabled: false,
      autoCashoutStr: '2.00',
      queued: false,
      busy: false,
      error: null
    },
    {
      amount: Math.max(200, jetConfig.minBetKz),
      autoBet: false,
      autoCashoutEnabled: true,
      autoCashoutStr: '2.50',
      queued: false,
      busy: false,
      error: null
    }
  ]);

  const updateSlot = (slot: 0 | 1, patch: Partial<SlotControlState>) => {
    setSlotStates((prev) => {
      const next: [SlotControlState, SlotControlState] = [{ ...prev[0] }, { ...prev[1] }];
      next[slot] = { ...next[slot], ...patch };
      return next;
    });
  };

  // Look up user's active bets in current round
  const myBetsBySlot = useMemo(() => {
    const out: { 0: PalancaJetBet | null; 1: PalancaJetBet | null } = { 0: null, 1: null };
    if (!jetState || !currentUser.id) return out;
    for (const b of jetState.bets) {
      if (b.userId === currentUser.id && (b.slot === 0 || b.slot === 1)) {
        out[b.slot] = b;
      }
    }
    return out;
  }, [jetState, currentUser.id]);

  // Auto-bet & queued bet triggers when a BETTING round is active
  const autoTriggeredRoundRef = useRef<{ 0: string; 1: string }>({ 0: '', 1: '' });
  const slotStatesRef = useRef(slotStates);
  slotStatesRef.current = slotStates;

  useEffect(() => {
    if (!jetState || jetState.phase !== 'BETTING' || !currentUser.id) return;
    if (!jetConfig.enabled || (!isDemo && !jetConfig.realMoneyEnabled)) return;

    ([0, 1] as const).forEach((slot) => {
      const cfg = slotStatesRef.current[slot];
      const existingBet = myBetsBySlot[slot];
      const shouldRun = (cfg.autoBet || cfg.queued) && !existingBet && !cfg.busy;
      if (!shouldRun) return;
      if (autoTriggeredRoundRef.current[slot] === jetState.roundId) return;

      autoTriggeredRoundRef.current[slot] = jetState.roundId;
      const autoMult = cfg.autoCashoutEnabled
        ? Math.max(1.05, Math.round((Number(cfg.autoCashoutStr.replace(',', '.')) || 2) * 100) / 100)
        : null;

      updateSlot(slot, { busy: true, queued: false, error: null });
      void placeJetBet({
        roundId: jetState.roundId,
        slot,
        amount: cfg.amount,
        isDemo,
        autoCashoutMultiplier: autoMult
      }).then((res) => {
        if (!res.ok) {
          updateSlot(slot, {
            busy: false,
            autoBet: false,
            error: res.error || 'Aposta automática interrompida.'
          });
        } else {
          updateSlot(slot, { busy: false, error: null });
        }
      });
    });
  }, [
    jetState?.roundId,
    jetState?.phase,
    currentUser.id,
    isDemo,
    jetConfig.enabled,
    jetConfig.realMoneyEnabled,
    myBetsBySlot
  ]);

  // Side/bottom tabs: Live Bets vs Chat
  const [feedTab, setFeedTab] = useState<'bets' | 'chat'>('bets');
  const [chatInput, setChatInput] = useState('');

  // Modals state
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showRgModal, setShowRgModal] = useState(false);
  const [verifyModalRound, setVerifyModalRound] = useState<VerifiedRoundData | null>(null);
  const [verifySearchInput, setVerifySearchInput] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [cryptoCheck, setCryptoCheck] = useState<{
    computedSeedHash: string;
    seedHashMatch: boolean;
    computedCrashPoint: number | null;
    crashMatch: boolean;
  } | null>(null);

  // Responsible Gaming form state
  const [rgDailyEntry, setRgDailyEntry] = useState<string>(() =>
    currentUser.dailyEntryLimitKz ? String(currentUser.dailyEntryLimitKz) : ''
  );
  const [rgDailyLoss, setRgDailyLoss] = useState<string>(() =>
    currentUser.dailyLossLimitKz ? String(currentUser.dailyLossLimitKz) : ''
  );
  const [rgExclusionHours, setRgExclusionHours] = useState<number | null>(null);
  const [rgConfirmExclusion, setRgConfirmExclusion] = useState(false);
  const [rgSaving, setRgSaving] = useState(false);
  const [rgMsg, setRgMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (showRgModal) {
      setRgDailyEntry(currentUser.dailyEntryLimitKz ? String(currentUser.dailyEntryLimitKz) : '');
      setRgDailyLoss(currentUser.dailyLossLimitKz ? String(currentUser.dailyLossLimitKz) : '');
      setRgExclusionHours(null);
      setRgConfirmExclusion(false);
      setRgMsg(null);
    }
  }, [showRgModal, currentUser.dailyEntryLimitKz, currentUser.dailyLossLimitKz]);

  // Run browser SHA-256 verification whenever verifyModalRound opens/updates
  useEffect(() => {
    let cancelled = false;
    setCryptoCheck(null);
    if (!verifyModalRound || !verifyModalRound.serverSeed || verifyModalRound.crashPoint === null) {
      return;
    }

    const verify = async () => {
      try {
        const computedSeedHash = await sha256HexBrowser(verifyModalRound.serverSeed!);
        const gameHash = await sha256HexBrowser(
          `${verifyModalRound.serverSeed!}:${verifyModalRound.id}:${verifyModalRound.houseEdgePercent}`
        );
        const computedCrashPoint = computeCrashPointFromGameHashHex(
          gameHash,
          verifyModalRound.houseEdgePercent
        );
        if (!cancelled) {
          setCryptoCheck({
            computedSeedHash,
            seedHashMatch: computedSeedHash === verifyModalRound.seedHash,
            computedCrashPoint,
            crashMatch: Math.abs(computedCrashPoint - verifyModalRound.crashPoint!) < 0.001
          });
        }
      } catch {
        // SubtleCrypto unavailable in non-secure context
      }
    };

    void verify();
    return () => {
      cancelled = true;
    };
  }, [verifyModalRound]);

  const openVerifyFromHistory = (round: PalancaJetHistoryRound) => {
    setVerifyError(null);
    setVerifySearchInput(String(round.roundNumber));
    setVerifyModalRound({
      id: round.id,
      roundNumber: round.roundNumber,
      status: 'CRASHED',
      seedHash: round.seedHash,
      serverSeed: round.serverSeed,
      crashPoint: round.crashPoint,
      houseEdgePercent: round.houseEdgePercent,
      crashedAt: round.crashedAt
    });
  };

  const handleLookupRound = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError(null);
    setVerifyLoading(true);
    const res = await verifyJetRound(verifySearchInput);
    setVerifyLoading(false);
    if (!res.ok) {
      setVerifyError(res.error);
      return;
    }
    setVerifyModalRound(res.round);
  };

  const handlePlaceManual = async (slot: 0 | 1) => {
    if (!jetState) return;
    const cfg = slotStates[slot];
    updateSlot(slot, { error: null });

    if (jetState.phase !== 'BETTING') {
      updateSlot(slot, { queued: !cfg.queued });
      return;
    }

    const amount = Math.round(Number(cfg.amount) || 0);
    if (amount < jetConfig.minBetKz || amount > jetConfig.maxBetKz) {
      updateSlot(slot, {
        error: `Aposta permitida entre ${jetConfig.minBetKz.toLocaleString('pt-AO')} e ${jetConfig.maxBetKz.toLocaleString('pt-AO')} Kz.`
      });
      return;
    }

    const available = isDemo ? currentUser.demoKzBalance ?? 0 : currentUser.kzBalance;
    if (available < amount) {
      updateSlot(slot, {
        error: isDemo
          ? 'Saldo Demo insuficiente.'
          : 'Saldo Real KZ insuficiente. Faça um depósito na Carteira ou mude para Modo Demo.'
      });
      return;
    }

    const autoMult = cfg.autoCashoutEnabled
      ? Math.round((Number(cfg.autoCashoutStr.replace(',', '.')) || 0) * 100) / 100
      : null;

    if (autoMult !== null && (autoMult < 1.05 || autoMult > 1000)) {
      updateSlot(slot, { error: 'Multiplicador automático deve ser entre 1.05x e 1000x.' });
      return;
    }

    updateSlot(slot, { busy: true });
    const res = await placeJetBet({
      roundId: jetState.roundId,
      slot,
      amount,
      isDemo,
      autoCashoutMultiplier: autoMult
    });
    updateSlot(slot, {
      busy: false,
      error: res.ok ? null : res.error || 'Erro ao colocar aposta.'
    });
  };

  const handleCancelBet = async (slot: 0 | 1) => {
    if (!jetState) return;
    updateSlot(slot, { busy: true, error: null });
    const res = await cancelJetBet({ roundId: jetState.roundId, slot });
    updateSlot(slot, {
      busy: false,
      error: res.ok ? null : res.error || 'Não foi possível cancelar a aposta.'
    });
  };

  const handleCashoutBet = async (slot: 0 | 1, betId: string) => {
    if (!jetState) return;
    updateSlot(slot, { busy: true, error: null });
    const res = await cashoutJetBet({ roundId: jetState.roundId, betId });
    updateSlot(slot, {
      busy: false,
      error: res.ok ? null : res.error || 'Não foi possível levantar neste momento.'
    });
  };

  const isSelfExcluded = Boolean(
    currentUser.selfExcludedUntil && new Date(currentUser.selfExcludedUntil).getTime() > Date.now()
  );

  const activeBalance = isDemo ? currentUser.demoKzBalance ?? 50000 : currentUser.kzBalance;
  const phase = jetState?.phase ?? 'BETTING';
  const rtpPercent = Math.round((100 - jetConfig.houseEdgePercent) * 10) / 10;

  const totalRoundStaked = useMemo(
    () => (jetState?.bets || []).reduce((acc, b) => acc + b.amount, 0),
    [jetState?.bets]
  );

  const quickPresets = useMemo(() => {
    const base = [100, 500, 1000, 5000];
    return Array.from(new Set(base.map((v) => Math.min(jetConfig.maxBetKz, Math.max(jetConfig.minBetKz, v)))));
  }, [jetConfig.minBetKz, jetConfig.maxBetKz]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-5 space-y-4">
      {/* Top Bar: Game Identity, Mode Switch & Responsible Gaming (+18) */}
      <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-[#191116] via-[#13141b] to-[#111217] border border-red-900/40 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-600 via-orange-500 to-yellow-500 flex items-center justify-center shadow-lg shadow-red-950/60 shrink-0">
            <Plane className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                PALANCA JET
              </h1>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-red-950/80 border border-red-600/60 text-red-300">
                +18
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-700/50 text-emerald-300 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                RTP {rtpPercent.toFixed(1)}% · SHA-256
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Multiplicador ao vivo sobre Angola · Até 2 apostas simultâneas · Levante antes do crash
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Real vs Demo Switch */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-950 border border-neutral-800">
            <button
              type="button"
              onClick={() => setWalletMode('REAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                !isDemo
                  ? 'bg-red-600 text-white shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Real ({currentUser.kzBalance.toLocaleString('pt-AO')} Kz)
            </button>
            <button
              type="button"
              onClick={() => setWalletMode('DEMO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                isDemo
                  ? 'bg-yellow-500 text-black shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Demo ({(currentUser.demoKzBalance ?? 50000).toLocaleString('pt-AO')} Kz)
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowRulesModal(true)}
            className="px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-bold text-neutral-200 flex items-center gap-1.5 transition-colors"
          >
            <Info className="w-3.5 h-3.5 text-yellow-400" />
            <span>Regras & RTP</span>
          </button>

          <button
            type="button"
            onClick={() => setShowRgModal(true)}
            className="px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-bold text-amber-300 flex items-center gap-1.5 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Limites (+18)</span>
          </button>
        </div>
      </div>

      {/* Warning Banners (Disabled / Paused / Self-Excluded / Low Balance) */}
      {!jetConfig.enabled && (
        <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-600/70 text-xs text-red-200 flex items-center gap-2 font-semibold">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>O Palanca Jet está temporariamente pausado pela Administração. Novas apostas estão suspensas.</span>
        </div>
      )}

      {jetConfig.enabled && !isDemo && !jetConfig.realMoneyEnabled && (
        <div className="p-3.5 rounded-xl bg-amber-950/80 border border-amber-600/60 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>As apostas a dinheiro real estão pausadas neste momento. Jogue em Modo Demo gratuitamente.</span>
          </div>
          <button
            type="button"
            onClick={() => setWalletMode('DEMO')}
            className="px-3 py-1 rounded-lg bg-yellow-500 text-black font-black text-[11px]"
          >
            Mudar para Demo
          </button>
        </div>
      )}

      {!isDemo && isSelfExcluded && (
        <div className="p-3.5 rounded-xl bg-red-950/90 border border-red-500 text-xs text-red-200 flex items-center gap-2 font-semibold">
          <Lock className="w-4 h-4 text-red-400 shrink-0" />
          <span>
            Autoexclusão de jogo responsável ativa até{' '}
            <b>{new Date(currentUser.selfExcludedUntil!).toLocaleString('pt-AO')}</b>. Apostas reais bloqueadas.
          </span>
        </div>
      )}

      {/* Main Responsive Grid: Left/Top Flight + Bet Panels | Right Live Bets & Chat */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Main Arena (8 cols) */}
        <div className="xl:col-span-8 space-y-4">
          {/* Recent Multipliers Strip */}
          <div className="rounded-xl p-2.5 bg-neutral-900/90 border border-neutral-800 flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 shrink-0 px-1">
              Histórico:
            </span>
            {(!jetState || jetState.history.length === 0) ? (
              <span className="text-xs text-neutral-500 px-2">A aguardar primeiras rondas...</span>
            ) : (
              jetState.history.map((h) => {
                const badgeClass =
                  h.crashPoint >= 10
                    ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300'
                    : h.crashPoint >= 3
                    ? 'bg-amber-950/80 border-amber-500/60 text-amber-300'
                    : h.crashPoint >= 1.5
                    ? 'bg-emerald-950/80 border-emerald-600/50 text-emerald-300'
                    : 'bg-red-950/80 border-red-700/60 text-red-300';
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => openVerifyFromHistory(h)}
                    title={`Verificar Ronda #${h.roundNumber} (Provably Fair)`}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-black tabular-nums shrink-0 hover:brightness-125 transition-all ${badgeClass}`}
                  >
                    {h.crashPoint.toFixed(2)}x
                  </button>
                );
              })
            )}
          </div>

          {/* Flight Canvas */}
          <PalancaJetFlightScene
            phase={phase}
            multiplier={phase === 'CRASHED' ? (jetState?.crashPoint ?? renderTelemetry.multiplier) : renderTelemetry.multiplier}
            elapsedMs={renderTelemetry.elapsedMs}
            bettingRemainingMs={renderTelemetry.bettingRemainingMs}
            bettingDurationSec={jetConfig.bettingDurationSec}
            crashPoint={jetState?.crashPoint ?? null}
            roundNumber={jetState?.roundNumber ?? 1}
          />

          {/* Provably Fair Commit Strip */}
          {jetState && (
            <div className="rounded-xl px-3.5 py-2 bg-neutral-950 border border-neutral-800/90 flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-400">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate font-mono">
                  Hash da Ronda #{jetState.roundNumber}: <b className="text-neutral-200">{jetState.seedHash.slice(0, 22)}...</b>
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setVerifyError(null);
                  setVerifySearchInput(String(jetState.roundNumber));
                  setVerifyModalRound({
                    id: jetState.roundId,
                    roundNumber: jetState.roundNumber,
                    status: jetState.phase,
                    seedHash: jetState.seedHash,
                    serverSeed: jetState.serverSeed,
                    crashPoint: jetState.crashPoint,
                    houseEdgePercent: jetState.houseEdgePercent,
                    crashedAt: null
                  });
                }}
                className="text-yellow-400 hover:text-yellow-300 font-bold shrink-0"
              >
                Verificar Ronda (SHA-256) →
              </button>
            </div>
          )}

          {/* Two Independent Bet Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {([0, 1] as const).map((slot) => {
              const cfg = slotStates[slot];
              const myBet = myBetsBySlot[slot];
              const liveMult =
                phase === 'CRASHED' ? (jetState?.crashPoint ?? renderTelemetry.multiplier) : renderTelemetry.multiplier;
              const potentialLivePayout = myBet
                ? Math.min(jetConfig.maxWinKz, Math.round(myBet.amount * liveMult))
                : 0;
              const disabledForMode =
                !jetConfig.enabled || (!isDemo && (!jetConfig.realMoneyEnabled || isSelfExcluded));

              return (
                <div
                  key={slot}
                  className={`rounded-2xl p-4 bg-neutral-900 border transition-all space-y-3.5 ${
                    myBet?.status === 'CASHED_OUT'
                      ? 'border-emerald-500/70 shadow-lg shadow-emerald-950/30'
                      : myBet?.status === 'PLACED' && phase === 'FLYING'
                      ? 'border-yellow-500/60 shadow-lg shadow-yellow-950/20'
                      : 'border-neutral-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-white">
                        Aposta {slot + 1}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isDemo
                            ? 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/40'
                            : 'bg-red-600/20 text-red-300 border border-red-600/40'
                        }`}
                      >
                        {isDemo ? 'DEMO' : 'REAL KZ'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => updateSlot(slot, { autoBet: !cfg.autoBet })}
                      className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border transition-all ${
                        cfg.autoBet
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : 'bg-neutral-950 border-neutral-700 text-neutral-400 hover:text-white'
                      }`}
                    >
                      Auto-Apostar: {cfg.autoBet ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Amount Input & Multipliers */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min={jetConfig.minBetKz}
                          max={jetConfig.maxBetKz}
                          step={50}
                          disabled={Boolean(myBet && myBet.status === 'PLACED')}
                          value={cfg.amount}
                          onChange={(e) =>
                            updateSlot(slot, {
                              amount: Math.max(0, Math.round(Number(e.target.value) || 0)),
                              error: null
                            })
                          }
                          className="w-full bg-neutral-950 border border-neutral-700 rounded-xl pl-3 pr-10 py-2.5 text-sm font-mono font-black text-white focus:outline-none focus:border-yellow-500 disabled:opacity-60"
                        />
                        <span className="absolute right-3 top-2.5 text-xs font-bold text-neutral-400">
                          Kz
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={Boolean(myBet && myBet.status === 'PLACED')}
                        onClick={() =>
                          updateSlot(slot, {
                            amount: Math.max(jetConfig.minBetKz, Math.round(cfg.amount / 2)),
                            error: null
                          })
                        }
                        className="px-2.5 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-xs font-black text-neutral-300 disabled:opacity-50"
                      >
                        ½
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(myBet && myBet.status === 'PLACED')}
                        onClick={() =>
                          updateSlot(slot, {
                            amount: Math.min(jetConfig.maxBetKz, Math.max(jetConfig.minBetKz, cfg.amount * 2)),
                            error: null
                          })
                        }
                        className="px-2.5 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-xs font-black text-neutral-300 disabled:opacity-50"
                      >
                        2x
                      </button>
                    </div>

                    {/* Quick Preset Stakes */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {quickPresets.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          disabled={Boolean(myBet && myBet.status === 'PLACED')}
                          onClick={() => updateSlot(slot, { amount: preset, error: null })}
                          className={`py-1 rounded-lg border text-[11px] font-mono font-bold transition-all disabled:opacity-50 ${
                            cfg.amount === preset
                              ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {preset.toLocaleString('pt-AO')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Auto Cashout Configuration */}
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300 font-semibold">
                      <input
                        type="checkbox"
                        checked={cfg.autoCashoutEnabled}
                        disabled={Boolean(myBet && myBet.status === 'PLACED')}
                        onChange={(e) =>
                          updateSlot(slot, { autoCashoutEnabled: e.target.checked, error: null })
                        }
                        className="accent-yellow-500 w-4 h-4 rounded"
                      />
                      <span>Levantar Automático</span>
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1.05}
                        max={1000}
                        step={0.1}
                        disabled={!cfg.autoCashoutEnabled || Boolean(myBet && myBet.status === 'PLACED')}
                        value={cfg.autoCashoutStr}
                        onChange={(e) => updateSlot(slot, { autoCashoutStr: e.target.value, error: null })}
                        className="w-20 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-right text-xs font-mono font-bold text-yellow-400 focus:outline-none focus:border-yellow-500 disabled:opacity-40"
                      />
                      <span className="text-xs font-bold text-neutral-400">x</span>
                    </div>
                  </div>

                  {cfg.error && (
                    <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-600/70 text-[11px] font-bold text-red-200 flex items-center justify-between gap-2">
                      <span>{cfg.error}</span>
                      {!isDemo && activeBalance < cfg.amount && (
                        <button
                          type="button"
                          onClick={() => setActiveTab('wallet')}
                          className="text-yellow-300 underline shrink-0"
                        >
                          Depositar
                        </button>
                      )}
                    </div>
                  )}

                  {/* Primary Action Button */}
                  {myBet && myBet.status === 'PLACED' ? (
                    phase === 'BETTING' ? (
                      <button
                        type="button"
                        disabled={cfg.busy}
                        onClick={() => void handleCancelBet(slot)}
                        className="w-full py-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-red-500/60 text-red-300 font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                      >
                        {cfg.busy
                          ? 'A cancelar...'
                          : `Cancelar Aposta (${myBet.amount.toLocaleString('pt-AO')} Kz)`}
                      </button>
                    ) : phase === 'FLYING' ? (
                      <button
                        type="button"
                        disabled={cfg.busy}
                        onClick={() => void handleCashoutBet(slot, myBet.id)}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:brightness-110 active:scale-[0.98] text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-emerald-950/60 transition-all tabular-nums disabled:opacity-60"
                      >
                        {cfg.busy
                          ? 'A levantar...'
                          : `LEVANTAR ${potentialLivePayout.toLocaleString('pt-AO')} Kz (${liveMult.toFixed(2)}x)`}
                      </button>
                    ) : (
                      <div className="w-full py-3.5 rounded-xl bg-red-950/70 border border-red-700/70 text-center text-xs font-black text-red-300">
                        Voo encerrado · A aguardar próxima ronda
                      </div>
                    )
                  ) : myBet && myBet.status === 'CASHED_OUT' ? (
                    <div className="w-full py-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/70 text-center text-xs font-black text-emerald-300 flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>
                        Levantado em {(myBet.cashoutMultiplier ?? 1).toFixed(2)}x · +
                        {myBet.payout.toLocaleString('pt-AO')} Kz
                      </span>
                    </div>
                  ) : myBet && myBet.status === 'LOST' ? (
                    <div className="w-full py-3.5 rounded-xl bg-red-950/70 border border-red-700/60 text-center text-xs font-bold text-red-300 flex items-center justify-center gap-2">
                      <XCircle className="w-4 h-4 text-red-400" />
                      <span>
                        Crash em {(jetState?.crashPoint ?? 1).toFixed(2)}x · -
                        {myBet.amount.toLocaleString('pt-AO')} Kz
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={cfg.busy || disabledForMode}
                      onClick={() => void handlePlaceManual(slot)}
                      className={`w-full py-3.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-45 ${
                        phase === 'BETTING'
                          ? 'bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 hover:brightness-110 text-white shadow-lg shadow-red-950/60'
                          : cfg.queued
                          ? 'bg-amber-600/30 border border-amber-400 text-amber-200 hover:bg-amber-600/40'
                          : 'bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-neutral-100'
                      }`}
                    >
                      {cfg.busy
                        ? 'A enviar aposta...'
                        : phase === 'BETTING'
                        ? `Apostar ${cfg.amount.toLocaleString('pt-AO')} Kz`
                        : cfg.queued
                        ? `Agendado p/ Próx. Ronda (${cfg.amount.toLocaleString('pt-AO')} Kz) · Cancelar`
                        : `Agendar Próxima Ronda (${cfg.amount.toLocaleString('pt-AO')} Kz)`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Side Column: Live Bets & Table Chat (4 cols) */}
        <div className="xl:col-span-4 rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden flex flex-col h-[520px] xl:h-[650px]">
          <div className="flex border-b border-neutral-800 bg-neutral-950 p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => setFeedTab('bets')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                feedTab === 'bets'
                  ? 'bg-red-600 text-white shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Apostas ({jetState?.bets.length ?? 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setFeedTab('chat')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                feedTab === 'chat'
                  ? 'bg-red-600 text-white shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat da Mesa ({jetState?.chat.length ?? 0})</span>
            </button>
          </div>

          {feedTab === 'bets' ? (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-4 py-2.5 border-b border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400 bg-neutral-950/50">
                <span>Ronda #{jetState?.roundNumber ?? 1}</span>
                <span className="font-mono font-bold text-yellow-400 tabular-nums">
                  Total: {totalRoundStaked.toLocaleString('pt-AO')} Kz
                </span>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-neutral-800/60">
                {(!jetState || jetState.bets.length === 0) ? (
                  <div className="p-8 text-center text-xs text-neutral-500">
                    Nenhuma aposta nesta ronda ainda. Seja o primeiro a descolar!
                  </div>
                ) : (
                  [...jetState.bets]
                    .sort((a, b) => {
                      const aMine = a.userId === currentUser.id ? 1 : 0;
                      const bMine = b.userId === currentUser.id ? 1 : 0;
                      if (aMine !== bMine) return bMine - aMine;
                      return b.amount - a.amount;
                    })
                    .map((bet) => {
                      const isMine = bet.userId === currentUser.id;
                      return (
                        <div
                          key={bet.id}
                          className={`px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs ${
                            isMine ? 'bg-yellow-500/10' : ''
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-bold truncate ${isMine ? 'text-yellow-300' : 'text-white'}`}>
                                {isMine ? `${bet.maskedName} (Você)` : bet.maskedName}
                              </span>
                              {bet.isDemo && (
                                <span className="text-[9px] px-1 py-0.5 rounded bg-neutral-800 text-yellow-400 font-bold">
                                  DEMO
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-neutral-400 tabular-nums">
                              {bet.amount.toLocaleString('pt-AO')} Kz
                            </span>
                          </div>

                          <div className="text-right shrink-0">
                            {bet.status === 'CASHED_OUT' ? (
                              <>
                                <span className="text-[11px] font-mono font-black text-emerald-400 block tabular-nums">
                                  {(bet.cashoutMultiplier ?? 1).toFixed(2)}x
                                </span>
                                <span className="text-[11px] font-bold text-emerald-300 tabular-nums">
                                  +{bet.payout.toLocaleString('pt-AO')} Kz
                                </span>
                              </>
                            ) : bet.status === 'LOST' ? (
                              <span className="text-[11px] font-bold text-red-400">Perdeu</span>
                            ) : (
                              <span className="text-[11px] font-semibold text-amber-300">
                                {phase === 'FLYING' ? 'Em voo' : 'Aguardando'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
                {(!jetState || jetState.chat.length === 0) ? (
                  <p className="text-xs text-neutral-500 text-center py-8">
                    Converse com outros pilotos do Palanca Jet!
                  </p>
                ) : (
                  jetState.chat.map((msg) => {
                    const isMine = msg.userId === currentUser.id;
                    return (
                      <div
                        key={msg.id}
                        className={`p-2.5 rounded-xl text-xs max-w-[88%] ${
                          isMine
                            ? 'ml-auto bg-red-600/80 text-white'
                            : 'mr-auto bg-neutral-950 border border-neutral-800 text-neutral-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[10px] opacity-80 mb-0.5">
                          <span className="font-bold text-yellow-300">{msg.userName}</span>
                          <span>{msg.timestamp}</span>
                        </div>
                        <p className="break-words">{msg.text}</p>
                      </div>
                    );
                  })
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!chatInput.trim()) return;
                  sendJetChat(chatInput);
                  setChatInput('');
                }}
                className="p-3 border-t border-neutral-800 bg-neutral-950 flex gap-2"
              >
                <input
                  type="text"
                  maxLength={180}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Escrever mensagem na mesa..."
                  className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500"
                />
                <button
                  type="submit"
                  aria-label="Enviar mensagem"
                  className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: PROVABLY FAIR VERIFICATION */}
      {verifyModalRound && (
        <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-[#121318] border border-yellow-500/40 rounded-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-black text-white">
                  Verificar Ronda #{verifyModalRound.roundNumber} (Provably Fair)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVerifyModalRound(null)}
                className="text-neutral-400 hover:text-white text-sm font-bold px-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLookupRound} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={verifySearchInput}
                  onChange={(e) => setVerifySearchInput(e.target.value)}
                  placeholder="Nº ou ID da ronda (ex: 12)"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl pl-8 pr-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-yellow-500"
                />
              </div>
              <button
                type="submit"
                disabled={verifyLoading}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white"
              >
                {verifyLoading ? 'A procurar...' : 'Procurar'}
              </button>
            </form>

            {verifyError && (
              <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-600/60 text-xs text-red-200">
                {verifyError}
              </div>
            )}

            <div className="space-y-2.5 text-xs bg-neutral-950 p-4 rounded-xl border border-neutral-800">
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-bold">ID da Ronda</span>
                <span className="font-mono text-neutral-200 break-all">{verifyModalRound.id}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-bold">
                  Hash Publicada Antes da Descolagem (SHA-256)
                </span>
                <span className="font-mono text-yellow-400 break-all">{verifyModalRound.seedHash}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-bold">
                  Semente Secreta do Servidor (Revelada pós-Crash)
                </span>
                <span className="font-mono text-emerald-300 break-all">
                  {verifyModalRound.serverSeed || 'Oculta até o jato cair (ronda em curso)'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-neutral-400 block text-[10px] uppercase font-bold">Ponto de Crash</span>
                  <span className="font-mono font-black text-white text-sm">
                    {verifyModalRound.crashPoint !== null ? `${verifyModalRound.crashPoint.toFixed(2)}x` : 'Em voo'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px] uppercase font-bold">Margem da Casa</span>
                  <span className="font-mono font-bold text-neutral-200 text-sm">
                    {verifyModalRound.houseEdgePercent}% (RTP {(100 - verifyModalRound.houseEdgePercent).toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>

            {cryptoCheck && (
              <div
                className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                  cryptoCheck.seedHashMatch && cryptoCheck.crashMatch
                    ? 'bg-emerald-950/60 border-emerald-500/70 text-emerald-200'
                    : 'bg-red-950/60 border-red-500/70 text-red-200'
                }`}
              >
                <div className="flex items-center gap-2 font-black">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {cryptoCheck.seedHashMatch && cryptoCheck.crashMatch
                      ? 'Verificação Criptográfica Local Válida (SHA-256 Autêntico)'
                      : 'Divergência detetada na verificação'}
                  </span>
                </div>
                <p className="text-[11px] opacity-90">
                  SHA-256(seed) coincide: <b>{cryptoCheck.seedHashMatch ? 'SIM' : 'NÃO'}</b> · Multiplicador calculado:{' '}
                  <b>{cryptoCheck.computedCrashPoint?.toFixed(2)}x</b>
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setVerifyModalRound(null)}
              className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white"
            >
              Fechar Verificação
            </button>
          </div>
        </div>
      )}

      {/* MODAL: REGRAS & RTP */}
      {showRulesModal && (
        <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-[#121318] border border-neutral-700 rounded-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <h3 className="text-base font-black text-white">Regras, Justiça & RTP · Palanca Jet</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="text-neutral-400 hover:text-white text-sm font-bold px-2"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-neutral-300 leading-relaxed">
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Retorno Teórico ao Jogador (RTP):</span>
                  <b className="text-emerald-400">{rtpPercent.toFixed(1)}%</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Margem da Casa (Configurada pelo Admin):</span>
                  <b className="text-yellow-400">{jetConfig.houseEdgePercent}%</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Aposta Mínima / Máxima:</span>
                  <b className="text-white">
                    {jetConfig.minBetKz.toLocaleString('pt-AO')} Kz – {jetConfig.maxBetKz.toLocaleString('pt-AO')} Kz
                  </b>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Ganho Máximo por Aposta:</span>
                  <b className="text-amber-300">{jetConfig.maxWinKz.toLocaleString('pt-AO')} Kz</b>
                </div>
              </div>

              <p>
                <b className="text-white">Como jogar:</b> Durante os {jetConfig.bettingDurationSec} segundos de apostas abertas,
                coloque até <b>2 apostas independentes</b>. Quando o jato descola, o multiplicador sobe a partir de{' '}
                <b>1.00x</b>. Clique em <b>Levantar</b> (ou configure o levantamento automático) antes de o jato desaparecer!
              </p>

              <p>
                <b className="text-white">Sistema Provably Fair (SHA-256):</b> Antes de cada ronda abrir, o servidor gera uma
                semente aleatória criptográfica e publica o seu resumo (<code>SHA-256(serverSeed)</code>). O ponto de crash é
                derivado matematicamente no servidor a partir de <code>serverSeed:roundId:houseEdgePercent</code> e nunca é
                alterado em função das apostas. Após o crash, a semente é revelada para qualquer jogador conferir no botão
                <b> Verificar Ronda</b>.
              </p>

              <p className="text-amber-300 font-semibold">
                +18 · Jogue com responsabilidade. Defina limites diários de entrada e perda nas definições de Jogo Responsável.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowRulesModal(false)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-yellow-500 text-xs font-black text-white uppercase tracking-wider"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* MODAL: JOGO RESPONSÁVEL (+18) */}
      {showRgModal && (
        <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#121318] border border-amber-500/40 rounded-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white">Jogo Responsável (+18)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRgModal(false)}
                className="text-neutral-400 hover:text-white text-sm font-bold px-2"
              >
                ✕
              </button>
            </div>

            {rgMsg && (
              <div
                className={`p-3 rounded-xl border text-xs font-bold ${
                  rgMsg.ok
                    ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200'
                    : 'bg-red-950/70 border-red-500 text-red-200'
                }`}
              >
                {rgMsg.text}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setRgMsg(null);
                if (rgExclusionHours && !rgConfirmExclusion) {
                  setRgConfirmExclusion(true);
                  return;
                }
                setRgSaving(true);
                const parsedEntry = rgDailyEntry.trim() === '' ? null : Number(rgDailyEntry);
                const parsedLoss = rgDailyLoss.trim() === '' ? null : Number(rgDailyLoss);
                const res = await updateResponsibleGaming({
                  dailyEntryLimitKz: parsedEntry,
                  dailyLossLimitKz: parsedLoss,
                  selfExclusionHours: rgExclusionHours || undefined
                });
                setRgSaving(false);
                setRgConfirmExclusion(false);
                if (!res.ok) {
                  setRgMsg({ ok: false, text: res.error || 'Erro ao guardar limites.' });
                  return;
                }
                setRgExclusionHours(null);
                setRgMsg({ ok: true, text: 'Limites de jogo responsável atualizados com segurança!' });
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="font-bold text-neutral-300 block mb-1">
                  Limite Diário de Apostas Reais (KZ):
                </label>
                <input
                  type="number"
                  min={100}
                  step={100}
                  value={rgDailyEntry}
                  onChange={(e) => setRgDailyEntry(e.target.value)}
                  placeholder="Sem limite (deixe vazio)"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-yellow-500"
                />
                <span className="text-[10px] text-neutral-500 block mt-1">
                  Impede novas apostas reais quando o total apostado hoje atingir este valor.
                </span>
              </div>

              <div>
                <label className="font-bold text-neutral-300 block mb-1">
                  Limite Diário de Perdas Líquidas (KZ):
                </label>
                <input
                  type="number"
                  min={100}
                  step={100}
                  value={rgDailyLoss}
                  onChange={(e) => setRgDailyLoss(e.target.value)}
                  placeholder="Sem limite (deixe vazio)"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-yellow-500"
                />
                <span className="text-[10px] text-neutral-500 block mt-1">
                  Bloqueia novas apostas reais caso a perda líquida do dia alcance este valor.
                </span>
              </div>

              <div className="pt-2 border-t border-neutral-800 space-y-2">
                <span className="font-bold text-red-300 block">
                  Autoexclusão Temporária (Pausa Obrigatória):
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Nenhuma', hours: null },
                    { label: '24 Horas', hours: 24 },
                    { label: '7 Dias', hours: 168 },
                    { label: '30 Dias', hours: 720 }
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => {
                        setRgExclusionHours(opt.hours);
                        setRgConfirmExclusion(false);
                      }}
                      className={`py-2 px-1 rounded-xl border text-[11px] font-bold transition-all ${
                        rgExclusionHours === opt.hours
                          ? 'bg-red-600 border-red-500 text-white'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {rgConfirmExclusion && rgExclusionHours && (
                  <p className="p-2.5 rounded-xl bg-red-950/80 border border-red-500 text-red-200 font-bold">
                    Atenção: A autoexclusão bloqueia apostas reais durante {rgExclusionHours} horas e não pode ser removida antes do prazo. Clique novamente em Guardar para confirmar.
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRgModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={rgSaving}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-yellow-500 text-white font-black uppercase tracking-wider disabled:opacity-50"
                >
                  {rgSaving
                    ? 'A guardar...'
                    : rgConfirmExclusion
                    ? 'Confirmar Autoexclusão'
                    : 'Guardar Limites'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
