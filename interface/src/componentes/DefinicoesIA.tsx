import React, { useState, useEffect } from 'react';
import {
  Key,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  HelpCircle,
  FileText,
  Dumbbell,
  Utensils,
  RotateCcw,
  Save,
  Check,
  Scale,
  Activity,
  Repeat,
  HeartPulse,
  Brain
} from 'lucide-react';
import { ServicoApi } from '../servicos/api';

interface PropsDefinicoesIA {
  aoAtualizarChave: (temChave: boolean) => void;
}

type AbaPromptTipo = 'coach' | 'treinador' | 'exercicio' | 'dieta' | 'calibracao' | 'alimento';

export const DefinicoesIA: React.FC<PropsDefinicoesIA> = ({ aoAtualizarChave }) => {
  const [chaveApi, setChaveApi] = useState<string>('');
  const [provedor, setProvedor] = useState<string>('gemini');
  const [salvando, setSalvando] = useState<boolean>(false);
  const [testando, setTestando] = useState<boolean>(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string>('');
  const [mensagemErro, setMensagemErro] = useState<string>('');
  const [respostaTeste, setRespostaTeste] = useState<any>(null);

  // Gestão de Prompts do Coach IA
  const [abaAtivaPrompt, setAbaAtivaPrompt] = useState<AbaPromptTipo>('coach');
  const [promptCoach, setPromptCoach] = useState<string>('');
  const [promptTreinador, setPromptTreinador] = useState<string>('');
  const [promptDieta, setPromptDieta] = useState<string>('');
  const [promptCalibracaoDieta, setPromptCalibracaoDieta] = useState<string>('');
  const [promptSubstAlimento, setPromptSubstAlimento] = useState<string>('');
  const [promptSubstExercicio, setPromptSubstExercicio] = useState<string>('');

  // Padrões de Fábrica
  const [padraoCoach, setPadraoCoach] = useState<string>('');
  const [padraoTreinador, setPadraoTreinador] = useState<string>('');
  const [padraoDieta, setPadraoDieta] = useState<string>('');
  const [padraoCalibracaoDieta, setPadraoCalibracaoDieta] = useState<string>('');
  const [padraoSubstAlimento, setPadraoSubstAlimento] = useState<string>('');
  const [padraoSubstExercicio, setPadraoSubstExercicio] = useState<string>('');

  // Flags de Customização
  const [customizadoCoach, setCustomizadoCoach] = useState<boolean>(false);
  const [customizadoTreinador, setCustomizadoTreinador] = useState<boolean>(false);
  const [customizadoDieta, setCustomizadoDieta] = useState<boolean>(false);
  const [customizadoCalibracaoDieta, setCustomizadoCalibracaoDieta] = useState<boolean>(false);
  const [customizadoSubstAlimento, setCustomizadoSubstAlimento] = useState<boolean>(false);
  const [customizadoSubstExercicio, setCustomizadoSubstExercicio] = useState<boolean>(false);

  const [carregandoPrompts, setCarregandoPrompts] = useState<boolean>(false);
  const [salvandoPrompts, setSalvandoPrompts] = useState<boolean>(false);
  const [mensagemSucessoPrompts, setMensagemSucessoPrompts] = useState<string>('');
  const [mensagemErroPrompts, setMensagemErroPrompts] = useState<string>('');

  useEffect(() => {
    carregarPerfilChave();
    carregarPrompts();
  }, []);

  const carregarPerfilChave = async () => {
    try {
      const res = await ServicoApi.obterPerfil();
      if (res.perfil?.chave_api_ia) {
        setChaveApi(res.perfil.chave_api_ia);
        aoAtualizarChave(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const carregarPrompts = async () => {
    try {
      setCarregandoPrompts(true);
      const res = await ServicoApi.obterPromptsIA();
      setPromptCoach(res.prompt_coach || res.prompt_nutricao || '');
      setPromptTreinador(res.prompt_treinador || '');
      setPromptDieta(res.prompt_dieta || '');
      setPromptCalibracaoDieta(res.prompt_calibracao_dieta || '');
      setPromptSubstAlimento(res.prompt_substituicao_alimento || '');
      setPromptSubstExercicio(res.prompt_substituicao_exercicio || '');

      setPadraoCoach(res.padrao_coach || res.padrao_nutricao || '');
      setPadraoTreinador(res.padrao_treinador || '');
      setPadraoDieta(res.padrao_dieta || '');
      setPadraoCalibracaoDieta(res.padrao_calibracao_dieta || '');
      setPadraoSubstAlimento(res.padrao_substituicao_alimento || '');
      setPadraoSubstExercicio(res.padrao_substituicao_exercicio || '');

      setCustomizadoCoach(res.customizado_coach || res.customizado_nutricao || false);
      setCustomizadoTreinador(res.customizado_treinador || false);
      setCustomizadoDieta(res.customizado_dieta || false);
      setCustomizadoCalibracaoDieta(res.customizado_calibracao_dieta || false);
      setCustomizadoSubstAlimento(res.customizado_substituicao_alimento || false);
      setCustomizadoSubstExercicio(res.customizado_substituicao_exercicio || false);
    } catch (err: any) {
      console.error('Erro ao carregar diretrizes da IA:', err);
    } finally {
      setCarregandoPrompts(false);
    }
  };

  const handleSalvarChave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chaveApi.trim()) {
      setMensagemErro('Por favor insere uma chave API válida.');
      return;
    }

    try {
      setSalvando(true);
      setMensagemErro('');
      await ServicoApi.salvarChaveIA(chaveApi.trim(), provedor);
      aoAtualizarChave(true);
      setMensagemSucesso('Chave API guardada na base de dados com sucesso!');
      setTimeout(() => setMensagemSucesso(''), 4000);
    } catch (err: any) {
      setMensagemErro(err.message || 'Erro ao guardar chave');
    } finally {
      setSalvando(false);
    }
  };

  const handleTestarConexao = async () => {
    if (!chaveApi.trim()) {
      setMensagemErro('Insere a chave antes de testar.');
      return;
    }

    try {
      setTestando(true);
      setMensagemErro('');
      const res = await ServicoApi.testarConexaoIA(chaveApi.trim(), provedor);
      setRespostaTeste(res.resposta_amostra);
      setMensagemSucesso('Conexão com o Coach IA validada com sucesso!');
      aoAtualizarChave(true);
    } catch (err: any) {
      setMensagemErro(err.message || 'Falha ao conectar à IA');
      setRespostaTeste(null);
    } finally {
      setTestando(false);
    }
  };

  const handleSalvarPrompts = async () => {
    try {
      setSalvandoPrompts(true);
      setMensagemErroPrompts('');
      setMensagemSucessoPrompts('');

      const res = await ServicoApi.salvarPromptsIA({
        prompt_coach: promptCoach,
        prompt_treinador: promptTreinador,
        prompt_dieta: promptDieta,
        prompt_calibracao_dieta: promptCalibracaoDieta,
        prompt_substituicao_alimento: promptSubstAlimento,
        prompt_substituicao_exercicio: promptSubstExercicio
      });

      setCustomizadoCoach(res.customizado_coach);
      setCustomizadoTreinador(res.customizado_treinador);
      setCustomizadoDieta(res.customizado_dieta);
      setCustomizadoCalibracaoDieta(res.customizado_calibracao_dieta);
      setCustomizadoSubstAlimento(res.customizado_substituicao_alimento);
      setCustomizadoSubstExercicio(res.customizado_substituicao_exercicio);

      setMensagemSucessoPrompts('Todas as diretrizes do Coach IA foram guardadas com sucesso! A IA seguirá rigorosamente estas regras em todas as avaliações, treinos e refeições.');
      setTimeout(() => setMensagemSucessoPrompts(''), 5000);
    } catch (err: any) {
      setMensagemErroPrompts(err.message || 'Erro ao guardar diretrizes da IA');
    } finally {
      setSalvandoPrompts(false);
    }
  };

  const handleRestaurarPadraoAbaAtual = () => {
    if (abaAtivaPrompt === 'coach') {
      setPromptCoach(padraoCoach);
    } else if (abaAtivaPrompt === 'treinador') {
      setPromptTreinador(padraoTreinador);
    } else if (abaAtivaPrompt === 'exercicio') {
      setPromptSubstExercicio(padraoSubstExercicio);
    } else if (abaAtivaPrompt === 'dieta') {
      setPromptDieta(padraoDieta);
    } else if (abaAtivaPrompt === 'calibracao') {
      setPromptCalibracaoDieta(padraoCalibracaoDieta);
    } else if (abaAtivaPrompt === 'alimento') {
      setPromptSubstAlimento(padraoSubstAlimento);
    }
  };

  const handleRestaurarTudoPadrao = async () => {
    if (!window.confirm('Tens a certeza de que queres restaurar TODAS as diretrizes padrão de fábrica do Coach IA?')) {
      return;
    }

    try {
      setSalvandoPrompts(true);
      setMensagemErroPrompts('');
      setMensagemSucessoPrompts('');

      const res = await ServicoApi.restaurarPromptsPadraoIA();
      setPromptCoach(res.prompt_coach);
      setPromptTreinador(res.prompt_treinador);
      setPromptDieta(res.prompt_dieta);
      setPromptCalibracaoDieta(res.prompt_calibracao_dieta);
      setPromptSubstAlimento(res.prompt_substituicao_alimento);
      setPromptSubstExercicio(res.prompt_substituicao_exercicio);

      setCustomizadoCoach(false);
      setCustomizadoTreinador(false);
      setCustomizadoDieta(false);
      setCustomizadoCalibracaoDieta(false);
      setCustomizadoSubstAlimento(false);
      setCustomizadoSubstExercicio(false);

      setMensagemSucessoPrompts('Todas as diretrizes padrão de fábrica foram restauradas!');
      setTimeout(() => setMensagemSucessoPrompts(''), 5000);
    } catch (err: any) {
      setMensagemErroPrompts(err.message || 'Erro ao restaurar prompts');
    } finally {
      setSalvandoPrompts(false);
    }
  };

  const injetarRegra = (setTarget: React.Dispatch<React.SetStateAction<string>>, regra: string) => {
    setTarget((prev) => `${prev.trim()}\n\n• REGRA ADICIONAL DO ATLETA: ${regra}`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16 animate-fade-in">
      {/* Cabeçalho */}
      <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-wider">
          <Brain className="w-3.5 h-3.5" /> Central de Inteligência & Prompts
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white">Coach IA & Diretrizes do Sistema</h1>
        <p className="text-slate-400 text-xs md:text-sm leading-relaxed max-w-3xl">
          Aqui tens controlo absoluto sobre <strong>todos os prompts e regras</strong> que a IA segue ao avaliar os teus check-ins, prescrever planos de treino com séries diferenciadas, criar e calibrar a tua dieta e gerir substituições biomecânicas.
        </p>
      </div>

      {mensagemSucesso && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-500 text-emerald-300 rounded-xl flex items-center gap-3 text-xs md:text-sm animate-fade-in shadow-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{mensagemSucesso}</span>
        </div>
      )}

      {mensagemErro && (
        <div className="p-4 bg-red-950/60 border border-red-500 text-red-300 rounded-xl flex items-center gap-3 text-xs md:text-sm animate-fade-in shadow-md">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span>{mensagemErro}</span>
        </div>
      )}

      {/* 1. CARTÃO DE CONEXÃO E CHAVE API */}
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-400" />
            Conexão com o Motor de IA Cloud
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {chaveApi ? '🟢 Chave Configurada' : '⚪ Aguardando Chave'}
          </span>
        </div>

        <form onSubmit={handleSalvarChave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Provedor de IA</label>
              <select
                value={provedor}
                onChange={(e) => setProvedor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-medium focus:border-emerald-500 focus:outline-none"
              >
                <option value="gemini">Google Gemini (Recomendado - Gratuito)</option>
                <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-bold mb-1">Chave de API (API Key)</label>
              <input
                type="password"
                placeholder="Ex: AIzaSy..."
                value={chaveApi}
                onChange={(e) => setChaveApi(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="submit"
              disabled={salvando}
              className="py-2.5 px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition shadow active:scale-95"
            >
              {salvando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Guardar Chave API</span>
            </button>

            <button
              type="button"
              onClick={handleTestarConexao}
              disabled={testando || !chaveApi.trim()}
              className="py-2.5 px-5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition border border-slate-700"
            >
              {testando ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> : <Sparkles className="w-4 h-4 text-emerald-400" />}
              <span>Testar Comunicação</span>
            </button>
          </div>
        </form>

        {respostaTeste && (
          <div className="p-3.5 bg-slate-950 rounded-xl border border-emerald-500/30 text-xs space-y-1 animate-fade-in">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Sparkles className="w-4 h-4" /> Resposta da IA Recebida com Sucesso:
            </div>
            <p className="text-slate-300 italic">"{respostaTeste.mensagem_motivacional_personalizada || respostaTeste.mensagem_coach}"</p>
          </div>
        )}
      </div>

      {/* 2. CENTRAL COMPLETA DE PROMPTS DO COACH IA */}
      <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
              <FileText className="w-3.5 h-3.5" /> Prompt Engineering do Atleta
            </div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              Todas as Diretrizes do Coach IA
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Personaliza o comportamento exato de cada vertente do sistema. Podes editar o texto livremente ou injetar regras rápidas.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleRestaurarPadraoAbaAtual}
              disabled={salvandoPrompts || carregandoPrompts}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
              title="Restaurar padrão apenas desta aba"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Restaurar Esta Aba</span>
            </button>
            <button
              type="button"
              onClick={handleRestaurarTudoPadrao}
              disabled={salvandoPrompts || carregandoPrompts}
              className="px-3 py-1.5 bg-slate-800 hover:bg-red-950 hover:text-red-300 text-slate-400 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
              title="Restaurar todos os prompts originais"
            >
              <span>Restaurar Tudo</span>
            </button>
            <button
              type="button"
              onClick={handleSalvarPrompts}
              disabled={salvandoPrompts || carregandoPrompts}
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1.5 transition shadow"
            >
              {salvandoPrompts ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Guardar Diretrizes</span>
            </button>
          </div>
        </div>

        {mensagemSucessoPrompts && (
          <div className="p-3.5 bg-emerald-950/60 border border-emerald-500 text-emerald-300 rounded-xl flex items-center gap-2.5 text-xs animate-fade-in font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{mensagemSucessoPrompts}</span>
          </div>
        )}

        {mensagemErroPrompts && (
          <div className="p-3.5 bg-red-950/60 border border-red-500 text-red-300 rounded-xl flex items-center gap-2.5 text-xs animate-fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{mensagemErroPrompts}</span>
          </div>
        )}

        {/* NAVEGAÇÃO DE SUB-ABAS DE PROMPTS */}
        <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setAbaAtivaPrompt('coach')}
            className={`pb-3 px-3 text-xs font-black flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              abaAtivaPrompt === 'coach'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            <span>1. Avaliação & Check-in</span>
            <span className={`text-xs px-1.5 py-0.2 rounded font-semibold ${customizadoCoach ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
              {customizadoCoach ? 'Personalizado' : 'Padrão'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtivaPrompt('treinador')}
            className={`pb-3 px-3 text-xs font-black flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              abaAtivaPrompt === 'treinador'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            <span>2. Prescrição de Treinos</span>
            <span className={`text-xs px-1.5 py-0.2 rounded font-semibold ${customizadoTreinador ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
              {customizadoTreinador ? 'Personalizado' : 'Padrão'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtivaPrompt('exercicio')}
            className={`pb-3 px-3 text-xs font-black flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              abaAtivaPrompt === 'exercicio'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Repeat className="w-4 h-4" />
            <span>3. Trocas & Ajustes de Exercício</span>
            <span className={`text-xs px-1.5 py-0.2 rounded font-semibold ${customizadoSubstExercicio ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
              {customizadoSubstExercicio ? 'Personalizado' : 'Padrão'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtivaPrompt('dieta')}
            className={`pb-3 px-3 text-xs font-black flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              abaAtivaPrompt === 'dieta'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>4. Criação de Dieta</span>
            <span className={`text-xs px-1.5 py-0.2 rounded font-semibold ${customizadoDieta ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
              {customizadoDieta ? 'Personalizado' : 'Padrão'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtivaPrompt('calibracao')}
            className={`pb-3 px-3 text-xs font-black flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              abaAtivaPrompt === 'calibracao'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>5. Calibração de Refeições</span>
            <span className={`text-xs px-1.5 py-0.2 rounded font-semibold ${customizadoCalibracaoDieta ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
              {customizadoCalibracaoDieta ? 'Personalizado' : 'Padrão'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtivaPrompt('alimento')}
            className={`pb-3 px-3 text-xs font-black flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              abaAtivaPrompt === 'alimento'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>6. Substituição de Alimentos</span>
            <span className={`text-xs px-1.5 py-0.2 rounded font-semibold ${customizadoSubstAlimento ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
              {customizadoSubstAlimento ? 'Personalizado' : 'Padrão'}
            </span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* CONTEÚDO DE CADA ABA DE PROMPTS */}
        {/* ========================================================= */}
        {carregandoPrompts ? (
          <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
            <span>A carregar diretrizes da base de dados...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* ABA 1: COACH DE AVALIAÇÃO & CHECK-IN */}
            {abaAtivaPrompt === 'coach' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-200">
                    Instruções do Sistema para o Coach de Avaliação e Check-in Semanal
                  </label>
                  <span className="text-xs font-mono text-slate-500">
                    {promptCoach.length} caracteres
                  </span>
                </div>

                <textarea
                  rows={15}
                  value={promptCoach}
                  onChange={(e) => setPromptCoach(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 font-mono leading-relaxed focus:border-emerald-500 focus:outline-none"
                  placeholder="Insere aqui as regras do sistema para a IA avaliar os teus check-ins..."
                />

                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-1.5">
                    ⚡ Injeção Rápida de Diretrizes de Avaliação:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      {
                        label: 'Queima rápida sem perda de força = NO CAMINHO CERTO (Sem alertas falsos)',
                        texto: 'SE O PESO CAIU EXPRESSIVAMENTE (ex: -1.0 a -1.5 kg numa semana) MAS A FORÇA NO GINÁSIO SE MANTEVE OU SUBIU E A ENERGIA ESTÁ BOA: Não dês aviso de alteração de dieta nem treino! Retorna estritamente "no_caminho_certo" com ação "manter". A gordura está a queimar e a força confirma preservação muscular completa.'
                      },
                      {
                        label: 'Subida expressiva no corte = Alerta de retenção/desvio',
                        texto: 'Se o atleta está em fase de perda de peso e o peso subiu >= +1.0 kg ou >= 1.2%: É proibido retornar "no_caminho_certo". Sinaliza desvio detectado e prescreve redução corretiva de 200 kcal e +30 min cardio.'
                      },
                      {
                        label: 'Fadiga alta e sono baixo = Deload e suporte de sono',
                        texto: 'Biofeedback Crítico: Se a fadiga for >= 8/10 ou sono <= 5/10, recomenda deload de volume no treino (-2 séries por grupo) e suplementação com Magnésio Bisglicinato antes de deitar.'
                      },
                      {
                        label: 'Inchaço abdominal = Sugestão de alimentos Low FODMAP',
                        texto: 'Digestão & Intestino: Se o atleta reportar inchaço ou digestão difícil, prescreve redução de alimentos altamente fermentáveis (Low FODMAP) e hidratação longe das refeições principais.'
                      }
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => injetarRegra(setPromptCoach, item.texto)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition border border-slate-700"
                      >
                        + {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ABA 2: TREINADOR DE TREINOS & BIOMECÂNICA */}
            {abaAtivaPrompt === 'treinador' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-200">
                    Instruções do Sistema para o Treinador (Prescrição de Treinos & Cargas)
                  </label>
                  <span className="text-xs font-mono text-slate-500">
                    {promptTreinador.length} caracteres
                  </span>
                </div>

                <textarea
                  rows={15}
                  value={promptTreinador}
                  onChange={(e) => setPromptTreinador(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 font-mono leading-relaxed focus:border-emerald-500 focus:outline-none"
                  placeholder="Insere aqui as regras do sistema para a IA prescrever os teus treinos..."
                />

                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-1.5">
                    ⚡ Injeção Rápida de Diretrizes de Treino:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      {
                        label: 'Hierarquia de Séries Estruturada (4 compostos / 3 isoladores / 2 braços)',
                        texto: 'Regra de Séries Diferenciadas: É proibido atribuir o mesmo número de séries a todos os exercícios. Exercícios compostos base recebem 4 séries; acessórios secundários 3 a 4 séries; isoladores 3 séries; braços e gémeos 2 a 3 séries.'
                      },
                      {
                        label: 'Powerbuilding: Força nos 3 Grandes (5-8 reps, RPE 8.5)',
                        texto: 'Conjugação de Força e Hipertrofia: Prescreve os compostos pesados (Supino, Agachamento, Peso Morto) na faixa de 5 a 8 reps pesadas com RPE 8.0-8.5 e descanso longo (120-150s), seguidos de trabalho acessório a 8-12 reps.'
                      },
                      {
                        label: 'Priorizar Peitoral Superior / Ângulo de 30º',
                        texto: 'Prioridade Clavicular: Iniciar sessões de empurrar com Supino Inclinado com Halteres no ângulo de 30º e Crossover Inclinado no cabo para atacar a porção superior do peito.'
                      },
                      {
                        label: 'Pegada Neutra e Proteção de Ombro',
                        texto: 'Saúde Articular do Ombro: Priorizar pegada neutra com halteres e cabos. Evitar hiperextensão do ombro abaixo do banco no supino reto.'
                      }
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => injetarRegra(setPromptTreinador, item.texto)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition border border-slate-700"
                      >
                        + {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ABA 3: TROCAS & AJUSTES BIOMECÂNICOS DE EXERCÍCIO */}
            {abaAtivaPrompt === 'exercicio' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Repeat className="w-4 h-4 text-emerald-400" />
                    <span>Instruções para Trocas & Recomendações de Exercício (Alívio Articular, Dores e Máquinas Ocupadas)</span>
                  </label>
                  <span className="text-xs font-mono text-slate-500">
                    {promptSubstExercicio.length} caracteres
                  </span>
                </div>

                <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-xs text-slate-300 leading-relaxed">
                  💡 <strong className="text-emerald-400">Quando este motor atua:</strong> Quando estás no separador <strong className="text-white">Treinos</strong> e clicas em <strong className="text-emerald-300">"Substituir Exercício"</strong> ou em <strong className="text-emerald-300">"Pedir Recomendações de Substituição à IA"</strong> por dor, lesão ou falta de equipamento, este prompt analisa a tua queixa biomecânica e prescreve 2 a 3 exercícios substitutos seguros com séries, repetições e RPE equivalentes.
                </div>

                <textarea
                  rows={14}
                  value={promptSubstExercicio}
                  onChange={(e) => setPromptSubstExercicio(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 font-mono leading-relaxed focus:border-emerald-500 focus:outline-none"
                  placeholder="Insere aqui as regras do sistema para a IA prescrever trocas biomecânicas de exercícios..."
                />

                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-1.5">
                    ⚡ Injeção Rápida de Diretrizes de Troca e Ajuste de Exercício:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      {
                        label: 'Dor no Ombro no Supino: Trocar por Floor Press ou Halteres Neutros a 30º',
                        texto: 'Ombro e Supino: Em queixas de dor anterior do ombro ou manguito rotador no supino, sugerir Floor Press com halteres no chão ou Supino Halteres 30º com pegada neutra.'
                      },
                      {
                        label: 'Dor Lombar no Agachamento: Trocar por Agachamento Búlgaro ou Leg Press',
                        texto: 'Lombar e Agachamento: Se houver desconforto lombar ou compressão discal no agachamento livre, recomendar Agachamento Búlgaro com halteres ou Leg Press 45º com apoio lombar perfeito.'
                      },
                      {
                        label: 'Tendinite no Cotovelo: Eliminar Tríceps Testa e Usar Corda na Polia',
                        texto: 'Cotovelo e Tríceps: Em queixas de dor no tendão do tríceps ou epicondilite, nunca prescrever tríceps testa com barra reta; substituir por extensões de tríceps na corda com cotovelos estáveis.'
                      },
                      {
                        label: 'Máquina Ocupada: Sugerir Peso Livre com Perfil de Força Equivalente',
                        texto: 'Equipamento Indisponível: Quando o motivo for máquina ocupada, fornecer alternativa imediata com halteres ou elásticos mantendo a mesma ênfase de tensão muscular.'
                      },
                      {
                        label: 'Desconforto nos Pulsos: Substituir Barra Reta por Barra W ou Pegada Neutra',
                        texto: 'Pulsos e Bíceps: Se o atleta sentir dor nos punhos em roscas com barra reta, substituir imediatamente por Barra EZ / W ou halteres com pegada martelo/semi-supinada.'
                      }
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => injetarRegra(setPromptSubstExercicio, item.texto)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition border border-slate-700"
                      >
                        + {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ABA 4: NUTRIÇÃO - CRIAÇÃO DE DIETA */}
            {abaAtivaPrompt === 'dieta' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-200">
                    Instruções do Sistema para Prescrição de Dieta do Zero (Alimentos Reais & Refeições)
                  </label>
                  <span className="text-xs font-mono text-slate-500">
                    {promptDieta.length} caracteres
                  </span>
                </div>

                <textarea
                  rows={15}
                  value={promptDieta}
                  onChange={(e) => setPromptDieta(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 font-mono leading-relaxed focus:border-emerald-500 focus:outline-none"
                  placeholder="Insere aqui as regras do sistema para a IA criar novos planos alimentares..."
                />

                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-1.5">
                    ⚡ Injeção Rápida de Diretrizes Nutricionais:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      {
                        label: 'Pouco apetite de manhã = Pequeno-almoço líquido/leve (10-15%)',
                        texto: 'Apetite Matinal: Se o atleta tiver pouco apetite ao acordar, prescreve um pequeno-almoço leve (10-15% das calorias diárias, e.g. batido com aveia, whey e fruta) e concentra as calorias no almoço, lanches e jantar.'
                      },
                      {
                        label: 'Máxima saciedade em corte (Batata, claras e legumes)',
                        texto: 'Saciedade em Défice: Em fases de corte com calorias reduzidas, prioriza alimentos de baixa densidade calórica e alto volume gástrico (batata cozida, claras de ovo, abobrinha, brócolos, morangos).'
                      },
                      {
                        label: 'Distribuição peri-treino conforme horário',
                        texto: 'Timing Peri-Treino: Posiciona 40% a 50% dos hidratos de carbono diários nas refeições pré e pós-treino imediato para garantir força e reposição de glicogénio.'
                      }
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => injetarRegra(setPromptDieta, item.texto)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition border border-slate-700"
                      >
                        + {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ABA 4: NUTRIÇÃO - CALIBRAÇÃO DE REFEIÇÕES EXISTENTES */}
            {abaAtivaPrompt === 'calibracao' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-200">
                    Instruções para Calibração de Refeições (Ajuste de Gramagens Sem Mudar Alimentos)
                  </label>
                  <span className="text-xs font-mono text-slate-500">
                    {promptCalibracaoDieta.length} caracteres
                  </span>
                </div>

                <textarea
                  rows={15}
                  value={promptCalibracaoDieta}
                  onChange={(e) => setPromptCalibracaoDieta(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 font-mono leading-relaxed focus:border-emerald-500 focus:outline-none"
                  placeholder="Insere aqui as regras do sistema para a IA auditar e calibrar as refeições do atleta..."
                />

                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-1.5">
                    ⚡ Injeção Rápida de Regras de Calibração:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      {
                        label: 'Blindagem de Alimentos: NUNCA remover alimentos da rotina do atleta',
                        texto: 'Respeito aos Alimentos do Atleta: É estritamente proibido trocar os alimentos que o atleta escolheu. Ajusta apenas as gramagens para bater as calorias e macronutrientes da fase.'
                      },
                      {
                        label: 'Priorizar ajuste de doses nos alimentos favoritos',
                        texto: 'Prioridade de Gramagens: Ao aumentar ou reduzir calorias, faz o ajuste prioritário nos alimentos favoritos declarados pelo atleta (arroz, aveia, azeite, frango).'
                      },
                      {
                        label: 'Proteger histórico de substituições passadas',
                        texto: 'Histórico Intocável: Se o atleta já trocou anteriormente um alimento por má digestão no histórico, nunca sugiras voltar ao alimento original.'
                      }
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => injetarRegra(setPromptCalibracaoDieta, item.texto)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition border border-slate-700"
                      >
                        + {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ABA 6: SUBSTITUIÇÕES INTELIGENTES DE ALIMENTOS */}
            {abaAtivaPrompt === 'alimento' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-emerald-400" />
                    <span>Instruções para Substituições Inteligentes de Alimentos (Equivalências Isocalóricas)</span>
                  </label>
                  <span className="text-xs font-mono text-slate-500">
                    {promptSubstAlimento.length} caracteres
                  </span>
                </div>

                <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-xs text-slate-300 leading-relaxed">
                  💡 <strong className="text-emerald-400">Quando este motor atua:</strong> Quando estás no separador <strong className="text-white">Nutrição</strong> e clicas em <strong className="text-emerald-300">"Substituir Alimento"</strong> numa refeição, este prompt calcula as gramas exatas para preservar os mesmos macronutrientes (proteína, hidratos e gorduras) e calorias da refeição original.
                </div>

                <textarea
                  rows={14}
                  value={promptSubstAlimento}
                  onChange={(e) => setPromptSubstAlimento(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 font-mono leading-relaxed focus:border-emerald-500 focus:outline-none"
                  placeholder="Regras para sugerir alimentos substitutos com cálculo de gramas..."
                />

                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-1.5">
                    ⚡ Injeção Rápida de Diretrizes de Substituição Alimentar:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      {
                        label: 'Intolerância a Laticínios: Trocar Whey por Carne Isolada ou Clara de Ovo',
                        texto: 'Intolerância a Laticínios: Ao trocar Whey ou queijo quark, priorizar fontes isentas de lactose (claras de ovo pasteurizadas, proteína isolada de carne ou vegetal de ervilha/arroz).'
                      },
                      {
                        label: 'Equivalência Isocalórica Rigorosa (Variação Máxima de 5%)',
                        texto: 'Equivalência Isocalórica: A porção do novo alimento não deve desviar mais de 5% das calorias totais e dos gramas de proteína do alimento de origem.'
                      },
                      {
                        label: 'Saciedade Máxima: Em Corte Trocar Arroz por Batata Cozida (3x mais volume)',
                        texto: 'Volume em Défice: Em fases de corte calórico, sugerir fontes de hidratos com maior volume gástrico (ex: substituir 50g de arroz por 180g de batata cozida).'
                      }
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => injetarRegra(setPromptSubstAlimento, item.texto)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition border border-slate-700"
                      >
                        + {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BOTÃO PRINCIPAL DE SALVAMENTO */}
        <div className="pt-3 flex justify-end border-t border-slate-800">
          <button
            type="button"
            onClick={handleSalvarPrompts}
            disabled={salvandoPrompts || carregandoPrompts}
            className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow active:scale-95"
          >
            {salvandoPrompts ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Guardar Todas as Diretrizes do Coach IA</span>
          </button>
        </div>
      </div>

      {/* Ajuda & Instruções de Obtenção da Chave */}
      <div className="bg-slate-900/40 p-5 rounded-2xl border border-dashed border-slate-800 space-y-2.5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-emerald-400" />
          Como obter a tua chave gratuita da Google Gemini API?
        </h3>
        <ol className="text-xs text-slate-400 space-y-1.5 list-decimal list-inside leading-relaxed">
          <li>Acede a <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-semibold">Google AI Studio (aistudio.google.com)</a>.</li>
          <li>Inicia sessão com a tua conta Google normal.</li>
          <li>Clica no botão azul <strong>"Create API Key"</strong>.</li>
          <li>Copia a chave gerada e cola-a no campo acima.</li>
        </ol>
      </div>
    </div>
  );
};
