import React, { useState, useEffect } from 'react';
import {
  User, Shield, Calendar, Award, Dumbbell, CalendarCheck, Target,
  Zap, Save, Lock, CheckCircle2, AlertCircle, Eye, EyeOff,
  LogOut, ArrowLeft, Activity
} from 'lucide-react';
import { ServicoApi } from '../servicos/api';
import { UtilizadorAutenticado, PerfilUtilizador } from '../tipos/fitness';

interface PropsPainelPerfil {
  utilizador: UtilizadorAutenticado;
  aoAtualizarUtilizador: (u: UtilizadorAutenticado) => void;
  aoFechar: () => void;
  aoTerminarSessao: () => void;
}

interface ResumoCarreira {
  membro_desde: string;
  membro_desde_formatado: string;
  dias_ativo: number;
  semanas_ativo: number;
  total_treinos: number;
  total_checkins: number;
  total_projetos: number;
  projetos_concluidos: number;
  nome_projeto_ativo: string;
  fase_atual: string;
}

export const PainelPerfil: React.FC<PropsPainelPerfil> = ({
  utilizador,
  aoAtualizarUtilizador,
  aoFechar,
  aoTerminarSessao
}) => {
  const [abaAtiva, setAbaAtiva] = useState<'biometria' | 'conta'>('biometria');
  const [carregando, setCarregando] = useState(true);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Dados da Carreira
  const [carreira, setCarreira] = useState<ResumoCarreira | null>(null);

  // Dados Biométricos Base
  const [perfil, setPerfil] = useState<Partial<PerfilUtilizador>>({
    idade: 25,
    sexo: 'masculino',
    altura_cm: 175,
    nivel_experiencia: 'intermediario',
    nivel_atividade: 'moderado',
    dias_treino_semana: 4,
    tempo_sessao_minutos: 60
  });

  // Dados da Conta
  const [nomeConta, setNomeConta] = useState(utilizador.nome || '');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [salvandoConta, setSalvandoConta] = useState(false);
  const [salvandoBio, setSalvandoBio] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [resPerfil, resCarreira] = await Promise.all([
        ServicoApi.obterPerfil().catch(() => null),
        ServicoApi.obterResumoCarreira().catch(() => null)
      ]);

      if (resPerfil?.perfil) {
        setPerfil({
          idade: resPerfil.perfil.idade ?? 25,
          sexo: resPerfil.perfil.sexo || 'masculino',
          altura_cm: resPerfil.perfil.altura_cm ?? 175,
          nivel_experiencia: resPerfil.perfil.nivel_experiencia || 'intermediario',
          nivel_atividade: resPerfil.perfil.nivel_atividade || 'moderado',
          dias_treino_semana: resPerfil.perfil.dias_treino_semana ?? 4,
          tempo_sessao_minutos: resPerfil.perfil.tempo_sessao_minutos ?? 60
        });
      }

      if (resCarreira) {
        setCarreira(resCarreira);
      }
    } catch {
      setErro('Não foi possível carregar todos os dados do perfil.');
    } finally {
      setCarregando(false);
    }
  };

  const handleSalvarBiometria = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoBio(true);
    setErro(null);
    setSucesso(null);
    try {
      await ServicoApi.atualizarPerfil({
        idade: Number(perfil.idade),
        sexo: perfil.sexo,
        altura_cm: Number(perfil.altura_cm),
        nivel_experiencia: perfil.nivel_experiencia,
        nivel_atividade: perfil.nivel_atividade,
        dias_treino_semana: Number(perfil.dias_treino_semana),
        tempo_sessao_minutos: Number(perfil.tempo_sessao_minutos)
      });
      setSucesso('Dados biométricos atualizados com sucesso!');
      setTimeout(() => setSucesso(null), 4000);
    } catch (e: any) {
      setErro(e.message || 'Erro ao guardar dados biométricos.');
    } finally {
      setSalvandoBio(false);
    }
  };

  const handleSalvarConta = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoConta(true);
    setErro(null);
    setSucesso(null);

    if (novaSenha && novaSenha !== confirmarSenha) {
      setErro('A confirmação da nova palavra-passe não coincide.');
      setSalvandoConta(false);
      return;
    }

    try {
      const res = await ServicoApi.atualizarConta({
        nome: nomeConta,
        senha_atual: senhaAtual || undefined,
        nova_senha: novaSenha || undefined
      });

      if (res.utilizador) {
        aoAtualizarUtilizador(res.utilizador);
      }

      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
      setSucesso('Conta e segurança atualizadas com sucesso!');
      setTimeout(() => setSucesso(null), 4000);
    } catch (e: any) {
      setErro(e.message || 'Erro ao atualizar dados da conta.');
    } finally {
      setSalvandoConta(false);
    }
  };

  const eAdmin = utilizador.papel === 'admin';
  const inicial = (utilizador.nome || 'A').charAt(0).toUpperCase();

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Botão Superior para Voltar */}
      <div className="flex items-center justify-between">
        <button
          onClick={aoFechar}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-bold transition active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-400" />
          <span>Voltar à Aplicação</span>
        </button>

        <span className="text-xs font-mono text-slate-500">
          ID Atleta: #{utilizador.id}
        </span>
      </div>

      {/* Hero Card: Informação do Atleta & Resumo de Carreira */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Efeito Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10 text-center sm:text-left">
          {/* Avatar com Inicial */}
          <div className="relative">
            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center font-black text-3xl shadow-xl ${
              eAdmin
                ? 'bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-purple-500/20'
                : 'bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 shadow-emerald-500/20'
            }`}>
              {inicial}
            </div>
            <div className="absolute -bottom-2 -right-2 p-1.5 rounded-xl bg-slate-900 border border-slate-700 shadow">
              {eAdmin ? <Shield className="w-4 h-4 text-purple-400" /> : <Award className="w-4 h-4 text-emerald-400" />}
            </div>
          </div>

          {/* Nome, Email e Status */}
          <div className="flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {utilizador.nome}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                eAdmin
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}>
                {eAdmin ? 'Administrador' : 'Atleta Oficial'}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-400 font-mono">
              {utilizador.email}
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Membro desde: <strong className="text-slate-200">{carreira?.membro_desde_formatado || 'Recente'}</strong></span>
              </span>
              <span className="text-slate-700 hidden sm:inline">•</span>
              <span className="text-emerald-400 font-medium">
                {carreira?.semanas_ativo || 1} {carreira?.semanas_ativo === 1 ? 'semana' : 'semanas'} de consistência
              </span>
            </div>
          </div>
        </div>

        {/* 4 Métricas Rápidas de Carreira */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-slate-400 text-[11px] mb-1">
              <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
              <span>Treinos Realizados</span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-white font-mono">
              {carreira?.total_treinos ?? 0}
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-slate-400 text-[11px] mb-1">
              <CalendarCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>Check-ins Feitos</span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-white font-mono">
              {carreira?.total_checkins ?? 0}
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-slate-400 text-[11px] mb-1">
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span>Projetos Realizados</span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-white font-mono">
              {carreira?.total_projetos ?? 0}
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-slate-400 text-[11px] mb-1">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span>Fase Atual</span>
            </div>
            <p className="text-xs sm:text-sm font-black text-emerald-400 uppercase tracking-wide truncate mt-1">
              {carreira?.fase_atual ? carreira.fase_atual.replace('_', ' ') : 'Manutenção'}
            </p>
          </div>
        </div>
      </div>

      {/* Feedback de Operação */}
      {sucesso && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2.5 animate-fade-in shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="font-medium">{sucesso}</span>
        </div>
      )}

      {erro && (
        <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2.5 animate-fade-in shadow-lg">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="font-medium">{erro}</span>
        </div>
      )}

      {/* Navegação entre Separadores */}
      <div className="flex bg-slate-900/90 border border-slate-800 rounded-2xl p-1.5 gap-2">
        <button
          type="button"
          onClick={() => setAbaAtiva('biometria')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            abaAtiva === 'biometria'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Biometria Base</span>
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva('conta')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            abaAtiva === 'conta'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Conta & Segurança</span>
        </button>
      </div>

      {/* ================================================================= */}
      {/* SEPARADOR 1: BIOMETRIA BASE                                       */}
      {/* ================================================================= */}
      {abaAtiva === 'biometria' && (
        <form onSubmit={handleSalvarBiometria} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Constantes Fisiológicas do Atleta</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Parâmetros fixos utilizados pelo motor científico para calcular a tua taxa metabólica basal e limites adaptativos.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Idade (anos)</label>
              <input
                type="number"
                min="14"
                max="95"
                value={perfil.idade ?? 25}
                onChange={(e) => setPerfil({ ...perfil, idade: parseInt(e.target.value) || 25 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Sexo Biológico</label>
              <select
                value={perfil.sexo ?? 'masculino'}
                onChange={(e) => setPerfil({ ...perfil, sexo: e.target.value as 'masculino' | 'feminino' })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="masculino">Masculino (Fórmula Mifflin-St Jeor)</option>
                <option value="feminino">Feminino (Fórmula Mifflin-St Jeor)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Altura (cm)</label>
              <input
                type="number"
                min="120"
                max="230"
                value={perfil.altura_cm ?? 175}
                onChange={(e) => setPerfil({ ...perfil, altura_cm: parseFloat(e.target.value) || 175 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Experiência com Cargas</label>
              <select
                value={perfil.nivel_experiencia ?? 'intermediario'}
                onChange={(e) => setPerfil({ ...perfil, nivel_experiencia: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="iniciante">Iniciante (&lt; 1 ano de treino consistente)</option>
                <option value="intermediario">Intermédio (1 a 3 anos de treino)</option>
                <option value="avancado">Avançado (&gt; 3 anos com periodização)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Rotina Diária Geral (NEAT)</label>
              <select
                value={perfil.nivel_atividade ?? 'moderado'}
                onChange={(e) => setPerfil({ ...perfil, nivel_atividade: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="sedentario">Sedentário (Trabalho de secretária, poucos passos)</option>
                <option value="leve">Levemente Ativo (Trabalho sentado + caminhadas)</option>
                <option value="moderado">Moderadamente Ativo (Trabalho em pé / ativo)</option>
                <option value="muito_ativo">Muito Ativo (Trabalho braçal / muito movimento)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Frequência Semanal Habitual</label>
              <input
                type="number"
                min="2"
                max="7"
                value={perfil.dias_treino_semana ?? 4}
                onChange={(e) => setPerfil({ ...perfil, dias_treino_semana: parseInt(e.target.value) || 4 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Duração Média da Sessão (minutos)</label>
              <input
                type="number"
                min="30"
                max="180"
                step="5"
                value={perfil.tempo_sessao_minutos ?? 60}
                onChange={(e) => setPerfil({ ...perfil, tempo_sessao_minutos: parseInt(e.target.value) || 60 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={salvandoBio}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/20 flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{salvandoBio ? 'A guardar...' : 'Guardar Dados Biométricos'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ================================================================= */}
      {/* SEPARADOR 2: CONTA, SEGURANÇA & SESSÃO                            */}
      {/* ================================================================= */}
      {abaAtiva === 'conta' && (
        <form onSubmit={handleSalvarConta} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Acesso e Credenciais</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Altera o teu nome de atleta ou atualiza a tua palavra-passe de segurança.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Nome de Atleta</label>
              <input
                type="text"
                value={nomeConta}
                onChange={(e) => setNomeConta(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Email Registado</label>
              <input
                type="email"
                value={utilizador.email}
                disabled
                className="w-full bg-slate-950/50 border border-slate-800/80 rounded-xl px-3 py-2.5 text-xs text-slate-500 cursor-not-allowed font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">O email identifica a tua conta de forma permanente.</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 space-y-4">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Alterar Palavra-passe (Opcional)
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Palavra-passe Atual</label>
                <div className="relative">
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                    placeholder="Deixa em branco se não quiseres alterar a senha"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 pr-10 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Nova Palavra-passe</label>
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Confirmar Nova Palavra-passe</label>
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    placeholder="Repete a nova senha"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={salvandoConta}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/20 flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{salvandoConta ? 'A atualizar...' : 'Guardar Alterações da Conta'}</span>
            </button>
          </div>

          {/* Secção de Encerrar Sessão */}
          <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-300 block">Encerrar Sessão</span>
              <span className="text-[11px] text-slate-500">Irás sair desta conta neste dispositivo.</span>
            </div>
            <button
              type="button"
              onClick={aoTerminarSessao}
              className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Terminar Sessão</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
