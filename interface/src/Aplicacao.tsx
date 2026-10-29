import React, { useState, useEffect } from 'react';
import { Navegacao } from './componentes/Navegacao';
import { ProjetorMetas } from './componentes/ProjetorMetas';
import { GestorTreinos } from './componentes/GestorTreinos';
import { GestorNutricao } from './componentes/GestorNutricao';
import { CheckinAdaptativo } from './componentes/CheckinAdaptativo';
import { GestorBiohacking } from './componentes/GestorBiohacking';
import { DefinicoesIA } from './componentes/DefinicoesIA';
import { AlertCircle, BellRing, CalendarCheck, X } from 'lucide-react';
import { ServicoApi } from './servicos/api';
import { StatusCheckinPeriodico } from './tipos/fitness';

export const Aplicacao: React.FC = () => {
  const [abaAtiva, setAbaAtiva] = useState<string>('metas');
  const [temChaveIA, setTemChaveIA] = useState<boolean>(false);
  const [servidorOnline, setServidorOnline] = useState<boolean>(true);
  const [statusCheckin, setStatusCheckin] = useState<StatusCheckinPeriodico | null>(null);
  const [avisoCheckinFechado, setAvisoCheckinFechado] = useState<boolean>(false);

  useEffect(() => {
    verificarServidor();
    carregarStatusCheckin();
    const intervaloServidor = setInterval(verificarServidor, 10000);
    const intervaloCheckin = setInterval(carregarStatusCheckin, 30000);
    return () => {
      clearInterval(intervaloServidor);
      clearInterval(intervaloCheckin);
    };
  }, []);

  const verificarServidor = async () => {
    try {
      const res = await fetch('/api/saude');
      if (res.ok) {
        setServidorOnline(true);
      } else {
        setServidorOnline(false);
      }
    } catch {
      setServidorOnline(false);
    }
  };

  const carregarStatusCheckin = async () => {
    try {
      const res = await ServicoApi.obterStatusCheckinPeriodico();
      setStatusCheckin(res);
    } catch {
      // Ignora falhas se servidor estiver offline
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Aviso caso o Servidor Python ainda não esteja a correr */}
      {!servidorOnline && (
        <div className="bg-amber-950/80 border-b border-amber-500/30 text-amber-300 px-4 py-2 text-xs flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            A aguardar ligação com o Servidor Python. Certifica-te de executar <code>python iniciar_servidor.py</code> na pasta <code>servidor</code>.
          </span>
        </div>
      )}

      {/* AVISO PERIÓDICO GLOBAL: HORA DO CHECK-UP */}
      {statusCheckin?.checkin_pendente && !avisoCheckinFechado && abaAtiva !== 'checkin' && (
        <div className="bg-gradient-to-r from-amber-950/95 via-amber-900/85 to-slate-900 border-b border-amber-500/40 text-amber-200 px-4 py-2.5 text-xs shadow-lg animate-fade-in sticky top-0 z-40 backdrop-blur">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0 animate-pulse">
                <BellRing className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <span className="font-bold text-white block sm:inline sm:mr-2">Aviso de Check-up Periódico:</span>
                <span className="text-amber-300/90">{statusCheckin.mensagem_aviso}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
              <button
                onClick={() => setAbaAtiva('checkin')}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow flex items-center gap-1.5 active:scale-95"
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Fazer Check-up Agora</span>
              </button>
              <button
                onClick={() => setAvisoCheckinFechado(true)}
                className="p-1.5 text-amber-400/70 hover:text-white rounded-lg hover:bg-white/10 transition"
                title="Fechar aviso nesta sessão"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Navegação Superior */}
      <Navegacao
        abaAtiva={abaAtiva}
        aoMudarAba={setAbaAtiva}
        temChaveIA={temChaveIA}
        checkinPendente={Boolean(statusCheckin?.checkin_pendente)}
      />

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {abaAtiva === 'metas' && (
          <ProjetorMetas
            aoNavegarParaTreinos={() => setAbaAtiva('treinos')}
            aoNavegarParaDieta={() => setAbaAtiva('nutricao')}
            aoNavegarParaCheckin={() => setAbaAtiva('checkin')}
          />
        )}
        {abaAtiva === 'treinos' && <GestorTreinos />}
        {abaAtiva === 'nutricao' && <GestorNutricao />}
        {abaAtiva === 'checkin' && (
          <CheckinAdaptativo
            aoNavegarParaDieta={() => setAbaAtiva('nutricao')}
            aoNavegarParaTreinos={() => setAbaAtiva('treinos')}
            aoConcluirCheckin={carregarStatusCheckin}
          />
        )}
        {abaAtiva === 'biohacking' && <GestorBiohacking />}
        {abaAtiva === 'ia' && <DefinicoesIA aoAtualizarChave={setTemChaveIA} />}
      </main>

      {/* Rodapé Informativo */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <p>BInov © 2026 • Motor Adaptativo de Treinos e Nutrição</p>
      </footer>
    </div>
  );
};
export default Aplicacao;
