import React, { useState, useEffect } from 'react';
import { Navegacao } from './componentes/Navegacao';
import { ProjetorMetas } from './componentes/ProjetorMetas';
import { GestorTreinos } from './componentes/GestorTreinos';
import { GestorNutricao } from './componentes/GestorNutricao';
import { CheckinAdaptativo } from './componentes/CheckinAdaptativo';
import { GestorBiohacking } from './componentes/GestorBiohacking';
import { DefinicoesIA } from './componentes/DefinicoesIA';
import { PainelAdmin } from './componentes/PainelAdmin';
import { EcraLogin } from './componentes/EcraLogin';
import { BotaoInstalarPWA } from './componentes/BotaoInstalarPWA';
import { AlertCircle, BellRing, CalendarCheck, X, ShieldAlert, Sparkles, Lock } from 'lucide-react';
import { ServicoApi } from './servicos/api';
import { StatusCheckinPeriodico, UtilizadorAutenticado } from './tipos/fitness';

export const Aplicacao: React.FC = () => {
  const [utilizador, setUtilizador] = useState<UtilizadorAutenticado | null>(null);
  const [verificandoAuth, setVerificandoAuth] = useState<boolean>(true);
  const [abaAtiva, setAbaAtiva] = useState<string>('metas');
  const [temChaveIA, setTemChaveIA] = useState<boolean>(false);
  const [servidorOnline, setServidorOnline] = useState<boolean>(true);
  const [statusCheckin, setStatusCheckin] = useState<StatusCheckinPeriodico | null>(null);
  const [avisoCheckinFechado, setAvisoCheckinFechado] = useState<boolean>(false);

  useEffect(() => {
    verificarAutenticacao();
    verificarServidor();

    const handleDesautenticado = () => {
      setUtilizador(null);
    };
    window.addEventListener('binov_desautenticado', handleDesautenticado);

    const intervaloServidor = setInterval(verificarServidor, 10000);
    return () => {
      window.removeEventListener('binov_desautenticado', handleDesautenticado);
      clearInterval(intervaloServidor);
    };
  }, []);

  useEffect(() => {
    if (utilizador) {
      carregarStatusCheckin();
      const intervaloCheckin = setInterval(carregarStatusCheckin, 30000);
      return () => clearInterval(intervaloCheckin);
    }
  }, [utilizador]);

  const verificarAutenticacao = async () => {
    const token = localStorage.getItem('binov_token');
    const uSalvo = localStorage.getItem('binov_utilizador');

    if (token) {
      if (uSalvo) {
        try {
          setUtilizador(JSON.parse(uSalvo));
        } catch {}
      }
      try {
        const uServidor = await ServicoApi.obterMeuUsuario();
        setUtilizador(uServidor);
        localStorage.setItem('binov_utilizador', JSON.stringify(uServidor));
      } catch {
        // Token inválido ou expirado
        localStorage.removeItem('binov_token');
        localStorage.removeItem('binov_utilizador');
        setUtilizador(null);
      }
    } else {
      setUtilizador(null);
    }
    setVerificandoAuth(false);
  };

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

  const handleLogout = () => {
    ServicoApi.terminarSessao();
    setUtilizador(null);
    setAbaAtiva('metas');
  };

  // Ecrã de carregamento inicial
  if (verificandoAuth) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center animate-pulse mb-3">
          <Sparkles className="w-6 h-6 text-emerald-400" />
        </div>
        <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">A carregar BInov...</p>
      </div>
    );
  }

  // Se não estiver autenticado, exibe o ecrã de Login / Registo
  if (!utilizador) {
    return <EcraLogin aoAutenticar={(u) => { setUtilizador(u); setAbaAtiva('metas'); }} />;
  }

  const eAdmin = utilizador.papel === 'admin';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* BANNER GLOBAL: AVISO DE VERSÃO DE TESTES */}
      <div className="bg-slate-900 border-b border-slate-800 text-slate-300 px-4 py-1.5 text-xs flex items-center justify-center gap-2">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        <span>
          <strong className="text-amber-300">Versão de Testes:</strong> Plataforma BInov em validação desportiva. Os planos têm fins de organização e apoio à decisão.
        </span>
      </div>

      {/* Aviso caso o Servidor Python não esteja a responder */}
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
        utilizador={utilizador}
        aoTerminarSessao={handleLogout}
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

        {/* Abas Restritas ao Administrador */}
        {abaAtiva === 'ia' && (
          eAdmin ? (
            <DefinicoesIA aoAtualizarChave={setTemChaveIA} />
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto mb-4">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-white mb-2">Acesso Reservado ao Administrador</h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                As configurações globais do Motor Científico, parâmetros de chaves de API e diretrizes de sistema são calibradas exclusivamente pelo Administrador da plataforma.
              </p>
              <button
                onClick={() => setAbaAtiva('metas')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition"
              >
                Voltar ao Projetor de Metas
              </button>
            </div>
          )
        )}

        {abaAtiva === 'admin' && eAdmin && (
          <PainelAdmin utilizadorAtual={utilizador} />
        )}
      </main>

      {/* Rodapé Informativo */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <p>BInov © 2026 • Motor Adaptativo de Treinos, Nutrição e Biohacking</p>
      </footer>

      {/* Botão Flutuante de Instalação PWA */}
      <BotaoInstalarPWA />
    </div>
  );
};

export default Aplicacao;
