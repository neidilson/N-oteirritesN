import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import {
  X,
  User,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Check,
  Sparkles,
  Gamepad2,
  ShieldCheck
} from 'lucide-react';

export const GAME_AVATARS = [
  {
    id: 'king',
    name: 'Rei do Tabuleiro',
    emoji: '👑',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=KingLudo&backgroundColor=ffc300,ff595e'
  },
  {
    id: 'ninja',
    name: 'Ninja dos Dados',
    emoji: '🥷',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=DiceNinja&backgroundColor=1982c4,8ac926'
  },
  {
    id: 'palanca',
    name: 'Palanca Guerreiro',
    emoji: '🦁',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Palanca&backgroundColor=ff595e,ffca3a'
  },
  {
    id: 'wizard',
    name: 'Feiticeiro N',
    emoji: '🧙',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=WizardLudo&backgroundColor=6a4c93,1982c4'
  },
  {
    id: 'robot',
    name: 'Robô Estrategista',
    emoji: '🤖',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CyberPawn&backgroundColor=06d6a0,118ab2'
  },
  {
    id: 'warrior',
    name: 'Guerreiro Luanda',
    emoji: '⚡',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=KassomaGamer&backgroundColor=e76f51,f4a261'
  },
  {
    id: 'fire',
    name: 'Fogo dos 6',
    emoji: '🔥',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=FireLudo&backgroundColor=fb8500,ffb703'
  },
  {
    id: 'diamond',
    name: 'Mestre Diamante',
    emoji: '💎',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=DiamondMaster&backgroundColor=0077b6,90e0ef'
  },
  {
    id: 'queen',
    name: 'Rainha Dourada',
    emoji: '👸',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=QueenWinner&backgroundColor=f72585,7209b7'
  },
  {
    id: 'guardian',
    name: 'Guardião do Tabuleiro',
    emoji: '🛡️',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=GoldenGuard&backgroundColor=ffd166,06d6a0'
  },
  {
    id: 'cyber',
    name: 'Cibernético N',
    emoji: '🎮',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CyberN&backgroundColor=118ab2,073b4c'
  },
  {
    id: 'ace',
    name: 'Ás Vermelho',
    emoji: '🎲',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=AceSix&backgroundColor=d90429,ef233c'
  }
];

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateProfile } = useGame();

  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone.replace('+244', '').trim());
  const [password, setPassword] = useState(currentUser.password || 'senhasegura2026');
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser.avatar);
  const [showPassword, setShowPassword] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Por favor introduza o seu nome.');
      return;
    }
    if (!phone.trim()) {
      alert('Por favor introduza o seu número de telemóvel.');
      return;
    }

    const formattedPhone = phone.trim().startsWith('+244')
      ? phone.trim()
      : `+244 ${phone.trim()}`;

    updateProfile({
      name: name.trim(),
      phone: formattedPhone,
      password: password.trim(),
      avatar: selectedAvatar
    });

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative max-w-xl w-full bg-gradient-to-b from-[#191a24] via-[#121319] to-black border-2 border-red-600/60 rounded-3xl p-6 sm:p-8 shadow-2xl my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-yellow-500 flex items-center justify-center shadow-lg shadow-red-950/50">
            <Gamepad2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white">Editar Perfil de Jogador</h2>
            <p className="text-xs text-neutral-400">
              Personalize o seu boneco de jogo, nome, palavra-passe e telemóvel.
            </p>
          </div>
        </div>

        {saveSuccess && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-bounce">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Perfil atualizado com sucesso no tabuleiro N!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Bonecos de Game (Avatares) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-neutral-200 flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span>Escolha o seu Boneco de Game:</span>
              </label>
              <span className="text-[10px] text-yellow-400 font-bold bg-neutral-900 px-2 py-0.5 rounded-full border border-neutral-800">
                12 Personagens
              </span>
            </div>

            {/* Avatar Preview */}
            <div className="flex items-center gap-4 p-3 bg-neutral-950/80 border border-neutral-800 rounded-2xl mb-3">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-yellow-400 bg-neutral-900 shadow-md shrink-0">
                <img
                  src={selectedAvatar}
                  alt="Avatar Selecionado"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-xs">
                <span className="text-neutral-400 block text-[10px]">Personagem Ativa:</span>
                <span className="text-white font-black text-sm block">
                  {GAME_AVATARS.find(a => a.url === selectedAvatar)?.name || 'Boneco Personalizado'}
                </span>
                <span className="text-yellow-400 text-[10px] font-semibold">
                  Aparece nas peças, mesas e rankings
                </span>
              </div>
            </div>

            {/* Avatar Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 max-h-48 overflow-y-auto p-1 scrollbar-thin">
              {GAME_AVATARS.map((avatar) => {
                const isSelected = selectedAvatar === avatar.url;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setSelectedAvatar(avatar.url)}
                    className={`relative aspect-square rounded-2xl p-1 border-2 transition-all group flex flex-col items-center justify-center ${
                      isSelected
                        ? 'border-yellow-400 bg-yellow-400/20 scale-105 shadow-lg shadow-yellow-500/20 ring-2 ring-yellow-400/40'
                        : 'border-neutral-800 bg-neutral-900/60 hover:border-neutral-600 hover:scale-102'
                    }`}
                    title={avatar.name}
                  >
                    <img
                      src={avatar.url}
                      alt={avatar.name}
                      className="w-full h-full object-contain rounded-xl"
                    />
                    <span className="absolute bottom-1 right-1 text-xs">
                      {avatar.emoji}
                    </span>
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-yellow-400 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-black font-black" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Informações de Jogador */}
          <div className="space-y-4 pt-2 border-t border-neutral-800">
            {/* Nome Completo */}
            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">
                Nome de Jogador:
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Kassoma Manuel"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            {/* Telemóvel (+244) */}
            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">
                Número de Telemóvel (+244 Angola):
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="923 884 102"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-red-500 font-mono"
                />
              </div>
            </div>

            {/* Palavra-passe */}
            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">
                Palavra-passe (Passe):
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl pl-10 pr-11 py-3 text-sm text-white focus:outline-none focus:border-red-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-neutral-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <span className="text-[10px] text-neutral-500 mt-1 block">
                Esta é a sua palavra-passe de acesso ao jogo.
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-yellow-500 text-white font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 shadow-lg shadow-red-950 transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Alterações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
