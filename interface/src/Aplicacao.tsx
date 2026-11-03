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
import { PainelPerfil } from './componentes/PainelPerfil';
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
        <img
          src="/icon.svg"
          alt="BInov Fitness"
          className="w-14 h-14 rounded-2xl shadow-xl shadow-emerald-500/20 animate-pulse mb-3 object-contain"
        />
        <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">
          A carregar <span className="text-white">BI</span><span className="text-emerald-400">nov</span>...
        </p>
      </div>
    );
  }

  // Se não estiver autenticado, exibe o ecrã de Login / Registo com o botão de instalação PWA disponível
  if (!utilizador) {
    return (
      <>
        <EcraLogin aoAutenticar={(u) => { setUtilizador(u); setAbaAtiva('metas'); }} />
        <BotaoInstalarPWA />
      </>
    );
  }

  const eAdmin = utilizador.papel === 'admin';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* BANNER GLOBAL: AVISO DE VERSÃO DE TESTES */}
      <div className="bg-slate-900/90 border-b border-slate-800 text-slate-400 px-3 py-1 text-[11px] sm:text-xs flex items-center justify-center gap-1.5 text-center">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        <span className="truncate sm:whitespace-normal">
          <strong className="text-amber-300">Versão de Testes:</strong> Apoio e planeamento desportivo BInov.
        </span>
      </div>

      {/* Aviso caso o Servidor Python não esteja a responder */}
      {!servidorOnline && (
        <div className="bg-amber-950/80 border-b border-amber-500/30 text-amber-300 px-3 py-1.5 text-xs flex items-center justify-center gap-2 text-center">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            A aguardar ligação com o Servidor Python. Certifica-te de que o servidor está a correr.
          </span>
        </div>
      )}

      {/* AVISO PERIÓDICO GLOBAL: HORA DO CHECK-UP */}
      {statusCheckin?.checkin_pendente && !avisoCheckinFechado && abaAtiva !== 'checkin' && (
        <div className="bg-gradient-to-r from-amber-950/95 via-amber-900/85 to-slate-900 border-b border-amber-500/40 text-amber-200 px-3 py-2 text-xs shadow-lg animate-fade-in sticky top-13 sm:top-16 z-30 backdrop-blur">
          <div className="max-w-[1600px] mx-auto px-1 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0 animate-pulse">
                <BellRing className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-left">
                <span className="font-bold text-white block sm:inline sm:mr-2">Aviso de Check-up:</span>
                <span className="text-amber-300/90 text-[11px] sm:text-xs">{statusCheckin.mensagem_aviso}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
              <button
                onClick={() => setAbaAtiva('checkin')}
                className="flex-1 sm:flex-none px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow flex items-center justify-center gap-1.5 active:scale-95"
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Fazer Check-up</span>
              </button>
              <button
                onClick={() => setAvisoCheckinFechado(true)}
                className="p-1 text-amber-400/70 hover:text-white rounded-lg hover:bg-white/10 transition"
                title="Fechar aviso nesta sessão"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Navegação */}
      <Navegacao
        abaAtiva={abaAtiva}
        aoMudarAba={setAbaAtiva}
        temChaveIA={temChaveIA}
        checkinPendente={Boolean(statusCheckin?.checkin_pendente)}
        utilizador={utilizador}
        aoTerminarSessao={handleLogout}
        aoAbrirPerfil={() => setAbaAtiva('perfil')}
      />

      {/* Conteúdo Principal (pb-24 garante que a barra inferior não esconde o fim da página em mobile) */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-2.5 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-24 md:pb-8">
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
        {abaAtiva === 'perfil' && (
          <PainelPerfil
            utilizador={utilizador}
            aoAtualizarUtilizador={setUtilizador}
            aoFechar={() => setAbaAtiva('metas')}
            aoTerminarSessao={handleLogout}
          />
        )}

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
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-[10px] sm:text-xs text-slate-500 mb-14 md:mb-0">
        <p>BInov © 2026 • Motor Adaptativo de Treinos, Nutrição e Biohacking</p>
      </footer>

      {/* Botão Flutuante de Instalação PWA */}
      <BotaoInstalarPWA />
    </div>
  );
};

export default Aplicacao;
