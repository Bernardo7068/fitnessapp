import React from 'react';
import { Dumbbell, Utensils, TrendingUp, CalendarCheck, Sparkles, Activity, Zap, Shield, LogOut, User } from 'lucide-react';
import { UtilizadorAutenticado } from '../tipos/fitness';

interface PropsNavegacao {
  abaAtiva: string;
  aoMudarAba: (aba: string) => void;
  temChaveIA: boolean;
  checkinPendente?: boolean;
  utilizador?: UtilizadorAutenticado | null;
  aoTerminarSessao?: () => void;
}

interface ItemNav {
  id: string;
  rotulo: string;
  rotuloCurto: string;
  icone: any;
  destaque?: boolean;
}

export const Navegacao: React.FC<PropsNavegacao> = ({
  abaAtiva,
  aoMudarAba,
  temChaveIA,
  checkinPendente = false,
  utilizador,
  aoTerminarSessao
}) => {
  const eAdmin = utilizador?.papel === 'admin';

  // Itens padrão de atleta
  const itens: ItemNav[] = [
    { id: 'metas', rotulo: 'Projetor de Metas', rotuloCurto: 'Metas', icone: TrendingUp },
    { id: 'treinos', rotulo: 'Treinos & Cargas', rotuloCurto: 'Treinos', icone: Dumbbell },
    { id: 'nutricao', rotulo: 'Dieta & Macros', rotuloCurto: 'Dieta', icone: Utensils },
    { id: 'checkin', rotulo: 'Check-in Adaptativo', rotuloCurto: 'Check-up', icone: CalendarCheck },
    { id: 'biohacking', rotulo: 'Biohacking & Vitalidade', rotuloCurto: 'Bio', icone: Zap },
  ];

  // Abas exclusivas para Administradores
  if (eAdmin) {
    itens.push(
      { id: 'admin', rotulo: 'Gestão de Atletas', rotuloCurto: 'Admin', icone: Shield },
      { id: 'ia', rotulo: 'Coach IA & Prompts', rotuloCurto: 'Motor IA', icone: Sparkles, destaque: temChaveIA }
    );
  }

  // Primeiro nome para exibição compacta
  const primeiroNome = utilizador?.nome ? utilizador.nome.split(' ')[0] : 'Atleta';

  return (
    <>
      {/* =================================================================== */}
      {/* 1. CABEÇALHO SUPERIOR (SLIM E ELEGANTE EM MOBILE, COMPLETO EM DESKTOP) */}
      {/* =================================================================== */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-13 sm:h-16 gap-2">
            {/* Logo & Marca */}
            <div
              className="flex items-center space-x-2.5 cursor-pointer flex-shrink-0"
              onClick={() => aoMudarAba('metas')}
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0">
                <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-slate-950 stroke-[2.5]" />
              </div>
              <div>
                <span className="text-base sm:text-xl font-black tracking-tight text-white flex items-center gap-1.5 leading-none">
                  BInov
                </span>
                <p className="text-[10px] text-slate-400 font-medium hidden lg:block leading-tight mt-0.5">
                  Coach Adaptativo de Treinos e Nutrição
                </p>
              </div>
            </div>

            {/* Navegação Desktop (Escondida em Mobile) */}
            <nav className="hidden md:flex space-x-1 overflow-x-auto scrollbar-none py-1">
              {itens.map((item) => {
                const Icone = item.icone;
                const ativo = abaAtiva === item.id;
                const eAbaAdmin = item.id === 'admin' || item.id === 'ia';

                return (
                  <button
                    key={item.id}
                    onClick={() => aoMudarAba(item.id)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      ativo
                        ? eAbaAdmin
                          ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-sm'
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icone className={`w-3.5 h-3.5 ${ativo ? (eAbaAdmin ? 'text-purple-400' : 'text-emerald-400') : 'text-slate-400'}`} />
                    <span>{item.rotulo}</span>
                    {item.id === 'checkin' && checkinPendente && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        Pendente
                      </span>
                    )}
                    {item.id === 'ia' && (
                      <span className={`w-2 h-2 rounded-full ${temChaveIA ? 'bg-purple-400 animate-pulse' : 'bg-slate-600'}`} />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Informação do Utilizador & Botão de Sair */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {utilizador && (
                <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-950/70 border border-slate-800 rounded-xl px-2 sm:px-2.5 py-1 sm:py-1.5">
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                    eAdmin ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {eAdmin ? <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                  </div>
                  <div className="text-left">
                    <span className="text-[11px] sm:text-xs font-bold text-white block leading-tight max-w-[80px] sm:max-w-[120px] truncate">
                      {primeiroNome}
                    </span>
                    <span className={`text-[9px] sm:text-[10px] font-black tracking-wider uppercase block leading-none ${
                      eAdmin ? 'text-purple-400' : 'text-emerald-400'
                    }`}>
                      {eAdmin ? 'Admin' : 'Atleta'}
                    </span>
                  </div>
                </div>
              )}

              {aoTerminarSessao && (
                <button
                  onClick={aoTerminarSessao}
                  title="Terminar Sessão"
                  className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 hover:bg-red-500/15 text-slate-400 hover:text-red-400 border border-slate-700/60 hover:border-red-500/30 transition active:scale-95 flex items-center gap-1 text-xs font-bold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* =================================================================== */}
      {/* 2. BARRA DE NAVEGAÇÃO INFERIOR FIXA PARA MOBILE (PADRÃO APP NATIVA) */}
      {/* =================================================================== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 shadow-[0_-8px_25px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-around px-1 pt-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))]">
          {itens.map((item) => {
            const Icone = item.icone;
            const ativo = abaAtiva === item.id;
            const eAbaAdmin = item.id === 'admin' || item.id === 'ia';

            return (
              <button
                key={item.id}
                onClick={() => aoMudarAba(item.id)}
                className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative ${
                  ativo
                    ? eAbaAdmin
                      ? 'text-purple-300 font-black'
                      : 'text-emerald-400 font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {/* Ícone com indicador de estado ativo */}
                <div className={`p-1 rounded-xl transition-all ${
                  ativo
                    ? eAbaAdmin
                      ? 'bg-purple-500/20 text-purple-300 shadow-sm'
                      : 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                    : 'text-slate-400'
                }`}>
                  <Icone className="w-5 h-5 stroke-[2.2]" />
                </div>

                {/* Rótulo curto */}
                <span className={`text-[10px] mt-0.5 tracking-tight ${ativo ? 'font-black text-white' : 'font-medium'}`}>
                  {item.rotuloCurto}
                </span>

                {/* Notificação / Badge de Check-in Pendente */}
                {item.id === 'checkin' && checkinPendente && (
                  <span className="absolute top-1 right-1/4 w-2 h-2 rounded-full bg-amber-400 animate-ping ring-2 ring-slate-950" />
                )}
                {item.id === 'checkin' && checkinPendente && (
                  <span className="absolute top-1 right-1/4 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-slate-950" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
