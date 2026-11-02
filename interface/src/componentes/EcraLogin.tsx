import React, { useState } from 'react';
import { Lock, Mail, User, ShieldAlert, ArrowRight, Eye, EyeOff, CheckCircle2, ShieldCheck, Sparkles, Settings, Wifi } from 'lucide-react';
import { ServicoApi } from '../servicos/api';
import { UtilizadorAutenticado } from '../tipos/fitness';

interface PropsEcraLogin {
  aoAutenticar: (utilizador: UtilizadorAutenticado) => void;
}

export const EcraLogin: React.FC<PropsEcraLogin> = ({ aoAutenticar }) => {
  const [modo, setModo] = useState<'login' | 'registo'>('login');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Configuração do Endereço do Servidor (para APK / Mobile)
  const [mostrarConfigServidor, setMostrarConfigServidor] = useState<boolean>(false);
  const [servidorUrl, setServidorUrl] = useState<string>(() => {
    if (typeof localStorage !== 'undefined') {
      const salva = localStorage.getItem('binov_servidor_url');
      if (salva) return salva;
    }
    return ServicoApi.obterUrlServidorAtual();
  });
  const [statusConexao, setStatusConexao] = useState<{ testando: boolean; ok?: boolean; msg?: string }>({ testando: false });

  const handleTestarConexao = async () => {
    setStatusConexao({ testando: true });
    const res = await ServicoApi.testarConexaoServidor(servidorUrl);
    if (res.ok) {
      ServicoApi.definirUrlServidor(servidorUrl);
    }
    setStatusConexao({ testando: false, ok: res.ok, msg: res.mensagem });
  };

  const handleSalvarServidor = () => {
    ServicoApi.definirUrlServidor(servidorUrl);
    setSucesso('Endereço do servidor guardado com sucesso!');
    setTimeout(() => setSucesso(null), 3000);
  };

  const preencherAdminDemo = () => {
    setEmail('admin@binov.app');
    setSenha('admin123');
    setModo('login');
    setErro(null);
  };

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setSucesso(null);
    setCarregando(true);

    try {
      if (modo === 'login') {
        const res = await ServicoApi.login(email, senha);
        aoAutenticar(res.utilizador);
      } else {
        if (!nome.trim()) {
          setErro('Por favor, indica o teu nome.');
          setCarregando(false);
          return;
        }
        if (senha.length < 4) {
          setErro('A palavra-passe deve ter pelo menos 4 caracteres.');
          setCarregando(false);
          return;
        }
        const res = await ServicoApi.registar(nome, email, senha);
        setSucesso('Conta criada com sucesso!');
        setTimeout(() => {
          aoAutenticar(res.utilizador);
        }, 600);
      }
    } catch (err: any) {
      setErro(err.message || 'Ocorreu um erro ao processar o pedido.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Luzes de Fundo / Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Banner de Aviso de Testes Global */}
      <div className="w-full max-w-md mb-6">
        <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-300">
          <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-200 block">Ambiente em Versão de Testes</span>
            Esta aplicação destina-se a planeamento e validação de treinos, dieta e biohacking. Os dados de cada atleta são mantidos isolados e seguros.
          </div>
        </div>
      </div>

      {/* Caixa Principal de Autenticação */}
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 relative z-10">
        {/* Cabeçalho / Branding Oficial com Logótipo Integrado */}
        <div className="text-center mb-6">
          <img
            src="/icon.svg"
            alt="BInov Fitness"
            className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-3xl shadow-2xl shadow-emerald-500/25 mb-1 object-contain hover:scale-105 transition-transform"
          />
          <p className="text-xs text-slate-400 mt-3 font-medium">
            {modo === 'login' ? 'Inicia sessão para acederes ao teu plano e evolução' : 'Cria a tua conta para começares o teu registo'}
          </p>
        </div>

        {/* Alternador de Modo: Entrar vs Registar */}
        <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => { setModo('login'); setErro(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              modo === 'login'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Iniciar Sessão
          </button>
          <button
            type="button"
            onClick={() => { setModo('registo'); setErro(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              modo === 'registo'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Criar Nova Conta
          </button>
        </div>

        {/* Mensagem de Erro */}
        {erro && (
          <div className="mb-4 bg-red-950/60 border border-red-500/40 text-red-200 text-xs p-3 rounded-xl flex items-center gap-2 animate-fade-in">
            <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {/* Mensagem de Sucesso */}
        {sucesso && (
          <div className="mb-4 bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs p-3 rounded-xl flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{sucesso}</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={submeter} className="space-y-4">
          {modo === 'registo' && (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Nome de Atleta</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Ex: Bernardo Silva"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="atleta@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Palavra-passe</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={mostrarSenha ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                title={mostrarSenha ? 'Ocultar' : 'Mostrar'}
              >
                {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-400 hover:from-emerald-400 hover:to-green-300 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
          >
            {carregando ? (
              <span>A processar...</span>
            ) : (
              <>
                <span>{modo === 'login' ? 'Entrar na Plataforma' : 'Criar Conta de Atleta'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Atalho Prático para Conta Admin Pré-configurada */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="text-left">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Conta Inicial de Testes</span>
              <span className="text-xs font-mono text-emerald-400 font-semibold">admin@binov.app / admin123</span>
            </div>
            <button
              type="button"
              onClick={preencherAdminDemo}
              className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Preencher</span>
            </button>
          </div>
        </div>

        {/* Configuração de Conexão com o Servidor (Especialmente para APK / Rede) */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 text-center">
          <button
            type="button"
            onClick={() => setMostrarConfigServidor(!mostrarConfigServidor)}
            className="text-[11px] text-slate-400 hover:text-emerald-400 transition flex items-center justify-center gap-1.5 mx-auto font-medium"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Configuração de Ligação ao Servidor</span>
          </button>

          {mostrarConfigServidor && (
            <div className="mt-3 p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-left space-y-2.5 animate-fade-in text-xs">
              <label className="block text-[11px] font-bold text-slate-300">
                Endereço IP / URL da API:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={servidorUrl}
                  onChange={(e) => setServidorUrl(e.target.value)}
                  placeholder="http://192.168.1.74:8000"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleTestarConexao}
                  disabled={statusConexao.testando}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shrink-0"
                >
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  <span>{statusConexao.testando ? '...' : 'Testar'}</span>
                </button>
              </div>

              {statusConexao.msg && (
                <div className={`p-2 rounded-lg text-[11px] font-medium flex items-center gap-1.5 ${
                  statusConexao.ok ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30' : 'bg-red-950/60 text-red-300 border border-red-500/30'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${statusConexao.ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  <span>{statusConexao.msg}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                <span>Suporta ligação Cloudflare ou IP local</span>
                <button
                  type="button"
                  onClick={handleSalvarServidor}
                  className="text-emerald-400 font-bold hover:underline"
                >
                  Guardar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Garantia de Isolamento */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-slate-500 text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>Isolamento individual de histórico e treinos</span>
        </div>
      </div>
    </div>
  );
};
