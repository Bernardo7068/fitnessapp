import React from 'react';
import { Dumbbell, Utensils, TrendingUp, CalendarCheck, Sparkles, Activity, Zap } from 'lucide-react';

interface PropsNavegacao {
  abaAtiva: string;
  aoMudarAba: (aba: string) => void;
  temChaveIA: boolean;
  checkinPendente?: boolean;
}

export const Navegacao: React.FC<PropsNavegacao> = ({ abaAtiva, aoMudarAba, temChaveIA, checkinPendente = false }) => {
  const itens = [
    { id: 'metas', rotulo: 'Projetor de Metas', icone: TrendingUp },
    { id: 'treinos', rotulo: 'Treinos & Cargas', icone: Dumbbell },
    { id: 'nutricao', rotulo: 'Dieta & Macros', icone: Utensils },
    { id: 'checkin', rotulo: 'Check-in Adaptativo', icone: CalendarCheck },
    { id: 'biohacking', rotulo: 'Biohacking & Vitalidade', icone: Zap },
    { id: 'ia', rotulo: 'Coach IA', icone: Sparkles, destaque: temChaveIA },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Marca */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => aoMudarAba('metas')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Activity className="w-6 h-6 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                BInov
              </span>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">Coach Adaptativo Pessoal de Treinos e Nutrição</p>
            </div>
          </div>

          {/* Navegação Desktop */}
          <nav className="hidden md:flex space-x-1">
            {itens.map((item) => {
              const Icone = item.icone;
              const ativo = abaAtiva === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => aoMudarAba(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    ativo
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icone className={`w-4 h-4 ${ativo ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.rotulo}</span>
                  {item.id === 'checkin' && checkinPendente && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      Pendente
                    </span>
                  )}
                  {item.id === 'ia' && (
                    <span className={`w-2 h-2 rounded-full ${temChaveIA ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Navegação Mobile Inferior / Secundária */}
        <div className="md:hidden flex overflow-x-auto py-2.5 space-x-2 scrollbar-none border-t border-slate-800/60">
          {itens.map((item) => {
            const Icone = item.icone;
            const ativo = abaAtiva === item.id;
            return (
              <button
                key={item.id}
                onClick={() => aoMudarAba(item.id)}
                className={`flex-shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold ${
                  ativo
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 bg-slate-900 border border-slate-800'
                }`}
              >
                <Icone className="w-3.5 h-3.5" />
                <span>{item.rotulo}</span>
                {item.id === 'checkin' && checkinPendente && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
