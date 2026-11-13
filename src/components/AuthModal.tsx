import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Phone, Mail, Lock, User, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login } = useGame();
  const [isRegister, setIsRegister] = useState(false);

  // Form Fields
  const [name, setName] = useState('Kassoma Manuel');
  const [phone, setPhone] = useState('923884102');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('senhasegura');
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [ageVerified, setAgeVerified] = useState(true);

  if (!isOpen) return null;

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister && (!termsAccepted || !ageVerified)) {
      alert('É obrigatório ter no mínimo 18 anos e aceitar os termos de uso.');
      return;
    }

    login({
      name: isRegister ? (name || 'Jogador Angolano') : 'Kassoma Manuel',
      phone: `+244 ${phone}`,
      email: email || 'kassoma.manuel@ao.net',
      isAgeVerified: true,
      isIdentityVerified: true
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gradient-to-b from-[#16171d] via-[#121318] to-black border-2 border-red-600/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Emblem */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 via-neutral-900 to-black border-2 border-yellow-500 flex items-center justify-center shadow-xl shadow-red-950/60 mb-3">
            <span className="font-black text-3xl text-yellow-400">N</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">N – NÃO TE IRRITES</h2>
          <span className="text-xs text-yellow-400 font-semibold tracking-wider uppercase mt-0.5">
            Acesso ao Jogo
          </span>
        </div>

        <form onSubmit={handleSubmitForm} className="space-y-4">
          {isRegister && (
            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">Nome Completo:</label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome oficial"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-neutral-300 block mb-1">
              Número de Telemóvel (+244):
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-neutral-700 bg-neutral-900 text-xs font-bold text-yellow-400 font-mono">
                +244
              </span>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="923 884 102"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-r-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-yellow-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-300 block mb-1">Palavra-passe:</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Palavra-passe"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-400 block mb-1">
              Email <span className="text-[10px] text-yellow-400 font-normal">(Opcional)</span>:
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.ao (opcional)"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500"
              />
            </div>
          </div>

          {isRegister && (
            <div className="space-y-2 pt-2 border-t border-neutral-800 text-xs">
              <label className="flex items-center gap-2 text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="rounded text-red-600 focus:ring-0 bg-neutral-950 border-neutral-700"
                />
                <span>Aceito os Termos de Uso</span>
              </label>
              <label className="flex items-center gap-2 text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ageVerified}
                  onChange={(e) => setAgeVerified(e.target.checked)}
                  className="rounded text-red-600 focus:ring-0 bg-neutral-950 border-neutral-700"
                />
                <span>Declaro ter 18 anos de idade ou mais</span>
              </label>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-yellow-500 text-white font-black text-xs uppercase tracking-wider hover:brightness-110 shadow-lg shadow-red-950 transition-all"
          >
            {isRegister ? 'CADASTRAR E ENTRAR' : 'ENTRAR NO JOGO'}
          </button>

          <div className="text-center pt-2 text-xs text-neutral-400">
            {isRegister ? (
              <span>
                Já possui conta?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegister(false)}
                  className="text-yellow-400 font-bold hover:underline"
                >
                  Faça login
                </button>
              </span>
            ) : (
              <span>
                Não tem conta?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegister(true)}
                  className="text-yellow-400 font-bold hover:underline"
                >
                  Cadastre-se
                </button>
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
