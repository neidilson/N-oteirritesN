import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { ShieldAlert, Lock, Delete, CheckCircle2, X } from 'lucide-react';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({ isOpen, onClose }) => {
  const { unlockAdmin } = useGame();
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMsg(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setErrorMsg(false);

      // Auto verify when 6 digits are reached
      if (nextPin.length === 6) {
        verify(nextPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setErrorMsg(false);
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg(false);
  };

  const verify = (code: string) => {
    const success = unlockAdmin(code);
    if (success) {
      onClose();
    } else {
      setErrorMsg(true);
      setTimeout(() => {
        setPin('');
      }, 700);
    }
  };

  // Support direct keyboard input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key >= '0' && e.key <= '9') {
      handleDigit(e.key);
    } else if (e.key === 'Backspace') {
      handleDelete();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 outline-none"
    >
      <div className="max-w-sm w-full bg-gradient-to-b from-[#181920] via-[#121318] to-black border-2 border-red-600/60 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with red vault emblem */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-600/20 border-2 border-red-500 flex items-center justify-center shadow-lg shadow-red-950/80 mb-3">
            <Lock className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-xl font-black text-white">PAINEL ADMIN N</h2>
          <span className="text-xs text-yellow-400 font-bold uppercase tracking-wider mt-0.5">
            Acesso Restrito · PIN de Segurança
          </span>
          <p className="text-xs text-neutral-400 mt-2">
            Introduza o PIN de 6 dígitos para aceder às funções de administração e tesouraria.
          </p>
        </div>

        {/* 6 Digit PIN Display */}
        <div className="flex justify-center gap-2.5 sm:gap-3 py-2">
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const hasValue = idx < pin.length;
            return (
              <div
                key={idx}
                className={`w-11 h-12 rounded-xl flex items-center justify-center border-2 transition-all ${
                  hasValue
                    ? 'border-yellow-400 bg-neutral-900 shadow-md shadow-yellow-950/50'
                    : 'border-neutral-800 bg-neutral-950'
                } ${errorMsg ? 'border-red-500 animate-shake' : ''}`}
              >
                {hasValue ? (
                  <div className="w-3.5 h-3.5 rounded-full bg-yellow-400 shadow-sm" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-neutral-700" />
                )}
              </div>
            );
          })}
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-500 text-red-300 text-xs text-center font-bold flex items-center justify-center gap-1.5 animate-pulse">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            PIN incorreto! Acesso reservado ao proprietário.
          </div>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="py-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:scale-95 border border-neutral-800 text-lg font-black text-white transition-all shadow-sm"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="py-3.5 rounded-xl bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 text-xs font-bold text-neutral-400 transition-colors uppercase tracking-wider"
          >
            Limpar
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="py-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:scale-95 border border-neutral-800 text-lg font-black text-white transition-all shadow-sm"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="py-3.5 rounded-xl bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>


        {/* Helper footnote */}
        <div className="text-center text-[11px] text-neutral-500">
          Dica: pode utilizar o teclado numérico físico ou os botões acima.
        </div>
      </div>
    </div>
  );
};
