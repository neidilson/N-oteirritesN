import React, { useState } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="Instalar Aplicação N – Não Te Irrites"
        className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-yellow-500/50 text-neutral-300 hover:text-yellow-400 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
      >
        <Download className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
        <span className="hidden sm:inline">Instalar App</span>
        <span className="sm:hidden">Instalar</span>
      </button>

      {showIOSGuide && (
        <div
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#111218] border border-yellow-500/40 p-5 shadow-2xl space-y-4 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <img
                  src="/icons/icon-192.png"
                  alt="N – Não Te Irrites"
                  className="w-10 h-10 rounded-xl border border-yellow-500/40 shrink-0"
                />
                <div>
                  <h3 className="text-sm font-black text-white">Instalar no iPhone / iPad</h3>
                  <span className="text-[11px] text-neutral-400 block">N – Não Te Irrites</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                aria-label="Fechar"
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5 text-xs text-neutral-200">
              <p className="font-bold text-yellow-400">
                Partilhar → Adicionar ao ecrã principal
              </p>
              <div className="flex items-center gap-2 text-neutral-300">
                <Share className="w-4 h-4 text-sky-400 shrink-0" />
                <span>
                  1. Toque no botão <strong className="text-white">Partilhar</strong> na barra do navegador Safari.
                </span>
              </div>
              <div className="flex items-center gap-2 text-neutral-300">
                <PlusSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  2. Deslize e selecione <strong className="text-white">Adicionar ao ecrã principal</strong>.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
