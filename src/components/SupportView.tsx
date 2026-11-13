import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { HelpCircle, Send, MessageSquare, ShieldAlert, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

export const SupportView: React.FC = () => {
  const { currentUser, supportTickets, sendSupportMessage } = useGame();
  const [msgInput, setMsgInput] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('Dúvida sobre Depósitos Multicaixa Express / USDT');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const userTicket = supportTickets.find((t) => t.userId === currentUser.id);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgInput.trim()) return;
    sendSupportMessage(msgInput, selectedSubject);
    setMsgInput('');
  };

  const FAQS = [
    {
      q: 'Como funciona a captura de peças no Não Te Irrites?',
      a: 'Quando a sua peça calha exatamente na mesma casa de um adversário (exceto nas casas seguras com estrela ★ e casas de partida), a peça adversária é capturada, enviada de volta à base e você ganha direito a uma jogada extra!'
    },
    {
      q: 'Como funcionam os depósitos em Kwanzas (KZ)?',
      a: 'Aceitamos Multicaixa Express e Transferência Bancária por IBAN (AO06). O jogador introduz a referência da operação e anexa o comprovativo. Após validação pelo departamento de auditoria, o saldo é creditado de imediato.'
    },
    {
      q: 'Quais redes de USDT são suportadas?',
      a: 'Suportamos transferências via TRC20, BEP20 (Binance Smart Chain) e ERC20 através de Binance Pay, Bybit Direct e Airtm.'
    },
    {
      q: 'Qual é o modelo de distribuição de prémios?',
      a: 'Em cada mesa, 75% do total acumulado das apostas de todos os jogadores participantes é entregue integralmente ao vencedor, e 25% corresponde à comissão de manutenção da plataforma N.'
    },
    {
      q: 'O que acontece se a conexão à internet falhar durante a partida?',
      a: 'A plataforma N dispõe de sistema de reconexão automática e substituição por bot com temporizador de 15 segundos para assegurar que a mesa nunca fique bloqueada.'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
          <HelpCircle className="w-7 h-7 text-sky-400" />
          Suporte e Atendimento ao Jogador
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400 mt-1">
          Canal direto de comunicação com os moderadores e equipe financeira de N – NÃO TE IRRITES.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Support Chat Box */}
        <div className="lg:col-span-7 flex flex-col h-[560px] rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden shadow-xl">
          <div className="p-4 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
                N
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Atendimento Oficial N</h3>
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Operadores Online
                </span>
              </div>
            </div>
            {userTicket && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                userTicket.status === 'OPEN'
                  ? 'bg-amber-950 text-yellow-300 border-yellow-800'
                  : 'bg-emerald-950 text-emerald-300 border-emerald-800'
              }`}>
                {userTicket.status === 'OPEN' ? 'Em Atendimento' : 'Resolvido'}
              </span>
            )}
          </div>

          {/* Ticket Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
            {userTicket && userTicket.messages.length > 0 ? (
              userTicket.messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col max-w-[80%] ${
                    m.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                  }`}
                >
                  <div
                    className={`p-3 rounded-2xl ${
                      m.sender === 'user'
                        ? 'bg-red-600 text-white rounded-br-none'
                        : 'bg-neutral-800 text-neutral-200 border border-neutral-700 rounded-bl-none'
                    }`}
                  >
                    <p className="leading-relaxed">{m.text}</p>
                  </div>
                  <span className="text-[10px] text-neutral-500 mt-1 px-1">{m.timestamp}</span>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-neutral-500 space-y-2">
                <MessageSquare className="w-8 h-8 opacity-40" />
                <p>Nenhuma mensagem ainda. Envie a sua dúvida ou reclamação abaixo.</p>
              </div>
            )}
          </div>

          {/* Send Input Form */}
          <form onSubmit={handleSend} className="p-3 border-t border-neutral-800 bg-neutral-950 space-y-2">
            <div className="flex items-center gap-2">
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-[11px] text-neutral-300 focus:outline-none focus:border-yellow-500"
              >
                <option value="Dúvida sobre Depósitos Multicaixa Express / USDT">Dúvidas sobre Depósitos</option>
                <option value="Status de Levantamento">Status de Levantamento</option>
                <option value="Regras do Jogo e Pontuação">Regras do Jogo</option>
                <option value="Denúncia de Jogador ou Conduta">Denunciar Jogador</option>
                <option value="Outro assunto">Outro assunto</option>
              </select>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                placeholder="Escreva a sua mensagem para a administração..."
                className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-yellow-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-yellow-500 text-white font-bold text-xs rounded-xl hover:brightness-110 flex items-center gap-1.5 shadow"
              >
                <Send className="w-3.5 h-3.5" />
                Enviar
              </button>
            </div>
          </form>
        </div>

        {/* FAQs & Direct Contacts */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl p-5 bg-neutral-900 border border-neutral-800 space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Perguntas Frequentes (FAQ)
            </h3>

            <div className="space-y-2">
              {FAQS.map((faq, idx) => (
                <div key={idx} className="rounded-xl border border-neutral-800 bg-neutral-950/60 overflow-hidden text-xs">
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full p-3 text-left font-bold text-neutral-200 flex items-center justify-between hover:text-yellow-400 transition-colors"
                  >
                    <span>{faq.q}</span>
                    {openFaq === idx ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                  </button>
                  {openFaq === idx && (
                    <div className="p-3 pt-0 text-neutral-400 border-t border-neutral-800/60 leading-relaxed text-[11px]">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Institutional Contact Card */}
          <div className="rounded-2xl p-5 bg-neutral-900 border border-neutral-800 text-xs space-y-2.5">
            <h3 className="text-sm font-bold text-white">Canais de Atendimento Angola</h3>
            <div className="space-y-1.5 text-neutral-400 text-[11px]">
              <p>📍 <b>Sede:</b> Luanda, Angola · Bairro Talatona</p>
              <p>📞 <b>Linha Telefónica:</b> +244 923 884 102</p>
              <p>✉️ <b>Email de Compliance:</b> legal@naoteirrites.ao</p>
              <p>🕒 <b>Horário de Atendimento:</b> Segunda a Domingo, 24 horas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
