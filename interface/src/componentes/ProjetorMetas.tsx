import React, { useState, useEffect } from 'react';
import {
  Target, Calendar, Flame, Dumbbell, ArrowRight, CheckCircle2, Sparkles, Scale,
  RefreshCw, AlertTriangle, Zap, FolderKanban, Check, ChevronRight, History,
  Info, Award, Plus, Trash2, Edit3, X, Eye, ShieldCheck, Utensils, Clock, Layers, Star,
  TrendingDown, TrendingUp, ChevronDown, ChevronUp, Flag, Milestone, Trophy
} from 'lucide-react';
import { ServicoApi } from '../servicos/api';
import {
  RelatorioProjetoMetas, ComposicaoCorporal, Macros, FaseProjeto,
  ProjetoFisiologicoItem, DetalhesProjetoFisiologico, StatusCheckinPeriodico
} from '../tipos/fitness';

export interface ProjetorMetasProps {
  aoNavegarParaTreinos?: () => void;
  aoNavegarParaDieta?: () => void;
  aoNavegarParaCheckin?: () => void;
}

export const ProjetorMetas: React.FC<ProjetorMetasProps> = ({
  aoNavegarParaTreinos,
  aoNavegarParaDieta,
  aoNavegarParaCheckin
}) => {
  const [carregando, setCarregando] = useState<boolean>(true);
  const [calculando, setCalculando] = useState<boolean>(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string>('');

  // Controlo de Abas Principais:
  // 'foco' = Projeto Atual em Foco (janela principal completa com timeline e roadmap)
  // 'portfolio' = Meus Projetos / Histórico (para alternar, comparar ou gerir)
  // 'novo' = Criar / Projetar Novo Projeto (calculador)
  const [abaPrincipal, setAbaPrincipal] = useState<'foco' | 'portfolio' | 'novo'>('foco');

  // Projetos
  const [projetos, setProjetos] = useState<ProjetoFisiologicoItem[]>([]);
  const [projetoAtivo, setProjetoAtivo] = useState<ProjetoFisiologicoItem | null>(null);
  const [projetoEmFoco, setProjetoEmFoco] = useState<ProjetoFisiologicoItem | null>(null);
  const [detalhesProjetoFoco, setDetalhesProjetoFoco] = useState<DetalhesProjetoFisiologico | null>(null);

  // Painéis Expansíveis no Projeto em Foco
  const [mostrarCheckinsFoco, setMostrarCheckinsFoco] = useState<boolean>(false);
  const [mostrarTreinosDietasFoco, setMostrarTreinosDietasFoco] = useState<boolean>(false);
  const [statusCheckinPeriodico, setStatusCheckinPeriodico] = useState<StatusCheckinPeriodico | null>(null);

  // Modal de Edição de Nome / Status
  const [modalEditarAberto, setModalEditarAberto] = useState<boolean>(false);
  const [projetoAEditar, setProjetoAEditar] = useState<ProjetoFisiologicoItem | null>(null);
  const [editNome, setEditNome] = useState<string>('');
  const [editDescricao, setEditDescricao] = useState<string>('');
  const [editStatus, setEditStatus] = useState<string>('ativo');
  const [salvandoEdicao, setSalvandoEdicao] = useState<boolean>(false);

  // Formulário do Novo Projeto
  const [nomeProjetoInput, setNomeProjetoInput] = useState<string>('');
  const [descricaoProjetoInput, setDescricaoProjetoInput] = useState<string>('');
  const [ativarImediatamente, setAtivarImediatamente] = useState<boolean>(true);

  // Parâmetros Fisiológicos do Atleta
  const [pesoAtual, setPesoAtual] = useState<number | ''>(78);
  const [pesoAlvo, setPesoAlvo] = useState<number | ''>(85);
  const [bfAtual, setBfAtual] = useState<number | ''>(15);
  const [bfAlvo, setBfAlvo] = useState<number | ''>(10);
  const [altura, setAltura] = useState<number | ''>(178);
  const [idade, setIdade] = useState<number | ''>(25);
  const [sexo, setSexo] = useState<string>('masculino');
  const [nivelExperiencia, setNivelExperiencia] = useState<string>('intermediario');
  const [nivelAtividade, setNivelAtividade] = useState<string>('moderado');
  const [estrategiaInicial, setEstrategiaInicial] = useState<string>('recomposicao');
  const [observacoesContexto, setObservacoesContexto] = useState<string>('');

  const [relatorioCalculado, setRelatorioCalculado] = useState<RelatorioProjetoMetas | null>(null);
  const [composicaoAtual, setComposicaoAtual] = useState<ComposicaoCorporal | null>(null);

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  const carregarDadosIniciais = async () => {
    try {
      setCarregando(true);
      const [perfilRes, projsRes, statusCheckRes] = await Promise.all([
        ServicoApi.obterPerfil().catch(() => null),
        ServicoApi.obterProjetos().catch(() => []),
        ServicoApi.obterStatusCheckinPeriodico().catch(() => null)
      ]);

      if (statusCheckRes) {
        setStatusCheckinPeriodico(statusCheckRes);
      }

      setProjetos(projsRes);
      const ativo = projsRes.find((p) => p.ativo) || projsRes[0] || null;
      setProjetoAtivo(projsRes.find((p) => p.ativo) || null);
      setProjetoEmFoco(ativo);

      if (ativo) {
        carregarDetalhesDoProjeto(ativo.id);
      }

      if (perfilRes && perfilRes.perfil) {
        const p = perfilRes.perfil;
        setPesoAtual(p.peso_atual);
        setPesoAlvo(p.peso_alvo);
        setBfAtual(p.bf_atual);
        setBfAlvo(p.bf_alvo);
        setAltura(p.altura_cm);
        setIdade(p.idade);
        setSexo(p.sexo);
        setNivelExperiencia(p.nivel_experiencia);
        setNivelAtividade(p.nivel_atividade);
        setComposicaoAtual(perfilRes.composicao_corporal);
      }

      // Se há projetos existentes, o foco imediato é a janela do projeto ativo!
      if (projsRes && projsRes.length > 0) {
        setAbaPrincipal('foco');
      } else {
        setAbaPrincipal('novo');
      }

      // nome livre definido pelo atleta
    } catch (err) {
      console.error('Erro ao carregar metas:', err);
    } finally {
      setCarregando(false);
    }
  };

  const carregarDetalhesDoProjeto = async (id: number) => {
    try {
      const det = await ServicoApi.obterDetalhesProjeto(id);
      setDetalhesProjetoFoco(det);
    } catch (e) {
      console.warn('Erro ao obter detalhes do projeto em foco:', e);
    }
  };

  const atualizarSugestaoNome = () => {}; // Desativado para nao influenciar nem sobrepor o nome escolhido pelo atleta

  const handleCalcularENovoProjeto = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCalculando(true);
      const pAtual = typeof pesoAtual === 'number' && !isNaN(pesoAtual) ? pesoAtual : 70;
      const pAlvo = typeof pesoAlvo === 'number' && !isNaN(pesoAlvo) ? pesoAlvo : 75;
      const bAtual = typeof bfAtual === 'number' && !isNaN(bfAtual) ? bfAtual : 15;
      const bAlvo = typeof bfAlvo === 'number' && !isNaN(bfAlvo) ? bfAlvo : 12;
      const alt = typeof altura === 'number' && !isNaN(altura) ? altura : 175;
      const id = typeof idade === 'number' && !isNaN(idade) ? idade : 25;

      // 1. Atualizar perfil
      await ServicoApi.atualizarPerfil({
        peso_atual: pAtual,
        peso_alvo: pAlvo,
        bf_atual: bAtual,
        bf_alvo: bAlvo,
        altura_cm: alt,
        idade: id,
        sexo,
        nivel_experiencia: nivelExperiencia,
        nivel_atividade: nivelAtividade
      });

      // 2. Calcular projeção matemática completa
      const resProj = await ServicoApi.calcularProjecao({
        peso_atual: pAtual,
        altura_cm: alt,
        idade: id,
        sexo,
        bf_atual: bAtual,
        peso_alvo: pAlvo,
        bf_alvo: bAlvo,
        nivel_experiencia: nivelExperiencia,
        nivel_atividade: nivelAtividade,
        estrategia_inicial: estrategiaInicial,
        observacoes_contexto: observacoesContexto
      });
      setRelatorioCalculado(resProj);

      // 3. Criar e guardar o projeto com nome identificável
      const nomeFinal = nomeProjetoInput.trim() || `Projeto ${pAtual}kg ➔ ${pAlvo}kg`;
      const resCriar = await ServicoApi.criarProjeto({
        nome: nomeFinal,
        descricao: descricaoProjetoInput.trim() || `Estratégia: ${resProj.tipo_intencao || 'Transformação Corporal'}`,
        tipo_intencao: resProj.tipo_intencao || 'Transformação Corporal',
        peso_inicial_kg: pAtual,
        peso_alvo_kg: pAlvo,
        bf_inicial: bAtual,
        bf_alvo: bAlvo,
        estrategia_inicial: estrategiaInicial,
        observacoes_contexto: observacoesContexto,
        duracao_total_semanas: resProj.semanas_totais_estimadas,
        fases: resProj.fases || [],
        relatorio_completo_json: JSON.stringify(resProj),
        ativar_imediatamente: ativarImediatamente
      });

      // 4. Recarregar lista de projetos
      const projsAtualizados = await ServicoApi.obterProjetos();
      setProjetos(projsAtualizados);
      const novoOuAtivo = projsAtualizados.find((p) => p.id === resCriar.projeto_id) || projsAtualizados.find((p) => p.ativo) || projsAtualizados[0];
      setProjetoAtivo(projsAtualizados.find((p) => p.ativo) || null);
      setProjetoEmFoco(novoOuAtivo);
      if (novoOuAtivo) {
        await carregarDetalhesDoProjeto(novoOuAtivo.id);
      }

      setMensagemSucesso(
        ativarImediatamente
          ? `🎉 Projeto "${nomeFinal}" criado e ATIVADO com sucesso! Treinos, Dieta e Check-in sincronizados.`
          : `📁 Projeto "${nomeFinal}" criado e guardado com sucesso no teu Portfólio!`
      );
      setTimeout(() => setMensagemSucesso(''), 6000);

      // Leva o utilizador diretamente para a visualização na janela normal!
      setAbaPrincipal('foco');
    } catch (err) {
      console.error('Erro ao calcular e criar projeto:', err);
    } finally {
      setCalculando(false);
    }
  };

  const handleAtivarProjeto = async (id: number) => {
    try {
      await ServicoApi.ativarProjeto(id);
      const projsAtualizados = await ServicoApi.obterProjetos();
      setProjetos(projsAtualizados);
      const ativo = projsAtualizados.find((p) => p.id === id) || projsAtualizados.find((p) => p.ativo) || null;
      setProjetoAtivo(ativo);
      setProjetoEmFoco(ativo);
      if (ativo) {
        await carregarDetalhesDoProjeto(ativo.id);
      }
      setMensagemSucesso(`⚡ Projeto "${ativo?.nome || 'Selecionado'}" ativado com sucesso! Treinos, Dieta e Check-in sincronizados.`);
      setTimeout(() => setMensagemSucesso(''), 6000);
      setAbaPrincipal('foco');
    } catch (err) {
      console.error('Erro ao ativar projeto:', err);
    }
  };

  const handleSelecionarProjetoParaFoco = async (proj: ProjetoFisiologicoItem) => {
    setProjetoEmFoco(proj);
    await carregarDetalhesDoProjeto(proj.id);
    setAbaPrincipal('foco');
  };

  const handleAtivarFase = async (fase: FaseProjeto) => {
    if (!projetoEmFoco) return;
    try {
      await ServicoApi.ativarFaseProjeto({
        id_projeto: projetoEmFoco.id,
        nome_projeto: projetoEmFoco.nome,
        fase_tipo: fase.tipo,
        nome_fase: fase.nome_exibicao,
        calorias_diarias: fase.calorias_diarias,
        series_alvo_semana: fase.series_trabalho_semana,
        cardio_minutos_semana: fase.cardio_minutos_semana,
        foco_treino: fase.foco_treino || '',
        projeto_completo_json: detalhesProjetoFoco?.relatorio ? JSON.stringify(detalhesProjetoFoco.relatorio) : undefined
      });

      const projsAtualizados = await ServicoApi.obterProjetos();
      setProjetos(projsAtualizados);
      const ativo = projsAtualizados.find((p) => p.id === projetoEmFoco.id) || projsAtualizados[0];
      setProjetoEmFoco(ativo);
      setProjetoAtivo(projsAtualizados.find((p) => p.ativo) || null);
      await carregarDetalhesDoProjeto(ativo.id);

      setMensagemSucesso(`Fase "${fase.nome_exibicao}" ativada! Treino e Dieta sincronizados a ${fase.calorias_diarias} kcal.`);
      setTimeout(() => setMensagemSucesso(''), 5000);
    } catch (err) {
      console.error('Erro ao ativar fase do projeto:', err);
    }
  };

  const handleAbrirEdicao = (proj: ProjetoFisiologicoItem) => {
    setProjetoAEditar(proj);
    setEditNome(proj.nome);
    setEditDescricao(proj.descricao || '');
    setEditStatus(proj.status);
    setModalEditarAberto(true);
  };

  const handleSalvarEdicao = async () => {
    if (!projetoAEditar) return;
    try {
      setSalvandoEdicao(true);
      await ServicoApi.atualizarProjeto(projetoAEditar.id, {
        nome: editNome,
        descricao: editDescricao,
        status: editStatus
      });
      const projsAtualizados = await ServicoApi.obterProjetos();
      setProjetos(projsAtualizados);
      const ativo = projsAtualizados.find((p) => p.id === projetoAEditar.id) || projsAtualizados[0];
      if (projetoEmFoco?.id === projetoAEditar.id) {
        setProjetoEmFoco(ativo);
        await carregarDetalhesDoProjeto(ativo.id);
      }
      setProjetoAtivo(projsAtualizados.find((p) => p.ativo) || null);
      setModalEditarAberto(false);
      setMensagemSucesso('Projeto atualizado com sucesso!');
      setTimeout(() => setMensagemSucesso(''), 5000);
    } catch (err) {
      console.error('Erro ao salvar edição:', err);
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const handleEliminarProjeto = async (id: number, nome: string) => {
    if (!window.confirm(`Tens a certeza que desejas eliminar o projeto "${nome}"?`)) return;
    try {
      await ServicoApi.eliminarProjeto(id);
      const projsAtualizados = await ServicoApi.obterProjetos();
      setProjetos(projsAtualizados);
      if (!projsAtualizados || projsAtualizados.length === 0) {
        setProjetoAtivo(null);
        setProjetoEmFoco(null);
        setDetalhesProjetoFoco(null);
        setAbaPrincipal('novo');
      } else {
        const ativo = projsAtualizados.find((p) => p.ativo) || projsAtualizados[0] || null;
        setProjetoAtivo(projsAtualizados.find((p) => p.ativo) || null);
        setProjetoEmFoco(ativo);
        if (ativo) {
          await carregarDetalhesDoProjeto(ativo.id);
        }
      }
      setMensagemSucesso(`Projeto "${nome}" removido.`);
      setTimeout(() => setMensagemSucesso(''), 5000);
    } catch (err) {
      console.error('Erro ao eliminar projeto:', err);
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // Obter fases do projeto em foco (ou do relatório associado)
  const fasesExibicao: FaseProjeto[] = projetoEmFoco?.fases || detalhesProjetoFoco?.projeto.fases || [];
  const relatorioExibicao = detalhesProjetoFoco?.relatorio || relatorioCalculado;
  const isProjetoAtivoNoMotor = projetoEmFoco?.id === projetoAtivo?.id;

  // 1. Dados de Balança e Ponto de Partida vs Hoje vs Meta Final
  const pesoInicial = projetoEmFoco ? Number(projetoEmFoco.peso_inicial_kg) : 75;
  const pesoAlvoProjeto = projetoEmFoco ? Number(projetoEmFoco.peso_alvo_kg) : 60;
  const bfInicial = projetoEmFoco ? Number(projetoEmFoco.bf_inicial) : 20;
  const bfAlvoProjeto = projetoEmFoco ? Number(projetoEmFoco.bf_alvo) : 15;

  // Balança Atual (Hoje): prioriza o último check-in deste projeto, ou o peso do perfil
  const pesoHoje = Number(
    projetoEmFoco?.ultimo_checkin_peso ?? (
      detalhesProjetoFoco?.checkins && detalhesProjetoFoco.checkins.length > 0
        ? detalhesProjetoFoco.checkins[detalhesProjetoFoco.checkins.length - 1].peso_medio
        : pesoAtual
    ) ?? pesoInicial
  );

  const bfHoje = Number(composicaoAtual?.percentual_gordura ?? bfAtual ?? bfInicial);

  const isCutting = pesoAlvoProjeto < pesoInicial;
  const isBulking = pesoAlvoProjeto > pesoInicial;
  const deltaTotalProjeto = Math.round(Math.abs(pesoAlvoProjeto - pesoInicial) * 10) / 10;

  // Variação conquistada (kg perdidos ou ganhos até hoje)
  let variacaoConquistadaKg = 0;
  let pesoRestanteKg = 0;
  let percentagemGlobal = 0;

  if (isCutting) {
    variacaoConquistadaKg = Math.round((pesoInicial - pesoHoje) * 10) / 10;
    pesoRestanteKg = Math.max(0, Math.round((pesoHoje - pesoAlvoProjeto) * 10) / 10);
    percentagemGlobal = deltaTotalProjeto > 0
      ? Math.min(100, Math.max(0, ((pesoInicial - pesoHoje) / deltaTotalProjeto) * 100))
      : 0;
  } else if (isBulking) {
    variacaoConquistadaKg = Math.round((pesoHoje - pesoInicial) * 10) / 10;
    pesoRestanteKg = Math.max(0, Math.round((pesoAlvoProjeto - pesoHoje) * 10) / 10);
    percentagemGlobal = deltaTotalProjeto > 0
      ? Math.min(100, Math.max(0, ((pesoHoje - pesoInicial) / deltaTotalProjeto) * 100))
      : 0;
  } else {
    // Recomposição
    const duracaoSem = projetoEmFoco?.duracao_total_semanas || 12;
    const semDec = projetoEmFoco?.semanas_decorridas || 1;
    percentagemGlobal = Math.min(100, Math.max(0, (semDec / duracaoSem) * 100));
    variacaoConquistadaKg = Math.round(Math.abs(pesoHoje - pesoInicial) * 10) / 10;
    pesoRestanteKg = 0;
  }
  const percentagemGlobalFormatada = Math.round(percentagemGlobal * 10) / 10;

  // Fase Ativa e Progresso Específico da Fase
  const faseAtivaObj = fasesExibicao.find(
    (f) => (projetoEmFoco && f.tipo === projetoEmFoco.fase_atual_tipo) || (projetoEmFoco && f.nome_exibicao === projetoEmFoco.fase_atual_nome)
  ) || fasesExibicao[0];

  let progressoFaseKg = 0;
  let restanteFaseKg = 0;
  let deltaTotalFase = 0;
  let percentagemFase = 0;

  if (faseAtivaObj) {
    const pIniFase = Number(faseAtivaObj.peso_inicio_kg);
    const pFimFase = Number(faseAtivaObj.peso_fim_estimado_kg);
    deltaTotalFase = Math.round(Math.abs(pIniFase - pFimFase) * 10) / 10;

    if (pFimFase < pIniFase) {
      // Fase de corte
      progressoFaseKg = Math.round((pIniFase - pesoHoje) * 10) / 10;
      restanteFaseKg = Math.max(0, Math.round((pesoHoje - pFimFase) * 10) / 10);
      percentagemFase = deltaTotalFase > 0 ? Math.min(100, Math.max(0, (progressoFaseKg / deltaTotalFase) * 100)) : 0;
    } else if (pFimFase > pIniFase) {
      // Fase de ganho
      progressoFaseKg = Math.round((pesoHoje - pIniFase) * 10) / 10;
      restanteFaseKg = Math.max(0, Math.round((pFimFase - pesoHoje) * 10) / 10);
      percentagemFase = deltaTotalFase > 0 ? Math.min(100, Math.max(0, (progressoFaseKg / deltaTotalFase) * 100)) : 0;
    } else {
      // Fase de manutenção / diet break
      progressoFaseKg = 0;
      restanteFaseKg = 0;
      percentagemFase = 50;
    }
  }
  const percentagemFaseFormatada = Math.round(percentagemFase * 10) / 10;

  // Próxima fase após a ativa
  const indiceFaseAtiva = faseAtivaObj ? fasesExibicao.findIndex((f) => f.numero_fase === faseAtivaObj.numero_fase) : -1;
  const proximaFaseObj = (indiceFaseAtiva >= 0 && indiceFaseAtiva < fasesExibicao.length - 1) ? fasesExibicao[indiceFaseAtiva + 1] : null;

  return (
    <div className="space-y-4 sm:space-y-8 pb-16">
      {/* =================================================================== */}
      {/* BARRA SUPERIOR: SELETOR DE MODO (FOCO NO PROJETO vs OUTROS vs NOVO) */}
      {/* =================================================================== */}
      <div className="bg-slate-900/80 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-800 shadow-xl space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider mb-2">
              <FolderKanban className="w-3.5 h-3.5" /> Gestor & Trajetória de Projetos
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white">
              {abaPrincipal === 'foco' ? (projetoEmFoco ? projetoEmFoco.nome : 'Projeto em Curso') : abaPrincipal === 'portfolio' ? 'Os Meus Projetos Fisiológicos' : 'Configurar Novo Projeto'}
            </h1>
            <p className="hidden sm:block text-slate-400 text-xs md:text-sm mt-0.5 max-w-3xl">
              {abaPrincipal === 'foco'
                ? 'Acompanha a linha do tempo completa, metas de peso seco, calorias e periodização da tua jornada ativa.'
                : abaPrincipal === 'portfolio'
                ? 'Gere múltiplos projetos criados ou testados, compara estratégias e troca de projeto com 1 clique.'
                : 'Calcula trajetórias determinísticas para emagrecimento, hipertrofia limpa ou recomposição corporal.'}
            </p>
          </div>

          {/* Abas Superiores de Navegação */}
          <div className="grid grid-cols-3 sm:flex items-center gap-1 sm:gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto shrink-0">
            <button
              onClick={() => setAbaPrincipal('foco')}
              disabled={!projetoEmFoco}
              className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                abaPrincipal === 'foco'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white disabled:opacity-40'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Projeto em Curso</span>
            </button>

            <button
              onClick={() => setAbaPrincipal('portfolio')}
              className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                abaPrincipal === 'portfolio'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Meus Projetos ({projetos.length})</span>
            </button>

            <button
              onClick={() => {
                setAbaPrincipal('novo');
                // nome livre definido pelo atleta
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                abaPrincipal === 'novo'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Projeto</span>
            </button>
          </div>
        </div>

        {/* Notificação Sucesso */}
        {mensagemSucesso && (
          <div className="p-3.5 bg-emerald-950/60 border border-emerald-500 text-emerald-300 rounded-xl flex items-center gap-2.5 text-xs font-bold animate-fade-in shadow-md">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{mensagemSucesso}</span>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* ABA 1: PROJETO EM CURSO (FOCO NA JANELA PRINCIPAL - COM TUDO VISÍVEL) */}
      {/* =================================================================== */}
      {abaPrincipal === 'foco' && projetoEmFoco && (
        <div className="space-y-6 animate-fade-in">
          {/* 1. HERO BANNER DO PROJETO COM STATUS, METAS E BOTÕES DE AÇÃO */}
          <div className={`p-3.5 sm:p-6 rounded-xl sm:rounded-2xl border-2 shadow-2xl relative overflow-hidden space-y-3.5 sm:space-y-5 ${
            isProjetoAtivoNoMotor
              ? 'bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border-emerald-500 shadow-emerald-950/30'
              : 'bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border-amber-500/50 shadow-slate-950/40'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  {isProjetoAtivoNoMotor ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-slate-950 text-xs font-black uppercase tracking-wider shadow">
                      <Star className="w-3.5 h-3.5 fill-slate-950" /> Projeto Ativo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold uppercase tracking-wider">
                      📁 Projeto em Consulta (Não Ativo)
                    </span>
                  )}
                  <span className="text-xs text-slate-400 font-mono">
                    Iniciado em {projetoEmFoco.criado_em ? new Date(projetoEmFoco.criado_em).toLocaleDateString('pt-PT') : 'Recente'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {projetoEmFoco.tipo_intencao}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <h2 className="text-2xl md:text-3xl font-black text-white">
                    {projetoEmFoco.nome}
                  </h2>
                  <button
                    onClick={() => handleAbrirEdicao(projetoEmFoco)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                    title="Editar nome ou notas"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>

                {projetoEmFoco.descricao && (
                  <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                    {projetoEmFoco.descricao}
                  </p>
                )}

                {relatorioExibicao?.diagnostico_fisiologico && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 flex items-start gap-2.5 max-w-3xl">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block mb-0.5">Diagnóstico Fisiológico & Clínico:</span>
                      <p className="leading-relaxed text-slate-300">{relatorioExibicao.diagnostico_fisiologico}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Botão de Ativação caso seja outro projeto em consulta */}
              {!isProjetoAtivoNoMotor && (
                <button
                  type="button"
                  onClick={() => handleAtivarProjeto(projetoEmFoco.id)}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition shrink-0"
                >
                  <Zap className="w-4 h-4" />
                  <span>Ativar Projeto</span>
                </button>
              )}
            </div>

            {/* ========================================================= */}
            {/* MAPA DA JORNADA: DE ONDE COMECEI ➔ ONDE ESTOU HOJE ➔ ONDE QUERO CHEGAR */}
            {/* ========================================================= */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* 1. DE ONDE COMECEI */}
              <div className="bg-slate-950/90 p-4 rounded-xl border border-slate-800 relative overflow-hidden flex flex-col justify-between shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5 text-slate-400" /> De Onde Comecei
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-xs font-bold">
                    Ponto de Partida
                  </span>
                </div>
                <div>
                  <div className="text-xl sm:text-3xl font-black text-white">
                    {pesoInicial} <span className="text-sm font-bold text-slate-400">kg</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                    <span>{bfInicial}% BF</span>
                    <span>•</span>
                    <span>Início: {projetoEmFoco.criado_em ? new Date(projetoEmFoco.criado_em).toLocaleDateString('pt-PT') : 'Recente'}</span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/80 text-xs text-slate-400 flex items-center gap-1.5">
                  <Milestone className="w-3.5 h-3.5 text-slate-500" />
                  <span>Marco inicial estabelecido</span>
                </div>
              </div>

              {/* 2. ONDE ESTOU HOJE (BALANÇA ATUAL) */}
              <div className="bg-gradient-to-br from-emerald-950/80 via-slate-950 to-slate-950 p-4 rounded-xl border-2 border-emerald-500/80 shadow-lg shadow-emerald-500/10 relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-emerald-400" /> Onde Estou Hoje
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black border border-emerald-500/30">
                    Balança Atual
                  </span>
                </div>
                <div>
                  <div className="text-xl sm:text-3xl font-black text-emerald-400 flex items-baseline gap-2">
                    {pesoHoje} <span className="text-sm font-bold text-emerald-300">kg</span>
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-emerald-500 text-slate-950 shadow-sm">
                      {isCutting
                        ? `${variacaoConquistadaKg > 0 ? `-${variacaoConquistadaKg}` : variacaoConquistadaKg} kg`
                        : isBulking
                        ? `+${variacaoConquistadaKg} kg`
                        : `${variacaoConquistadaKg} kg`}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                    <span>{bfHoje}% BF</span>
                    <span>•</span>
                    <span className="text-emerald-300 font-bold">
                      {isCutting
                        ? `${variacaoConquistadaKg} kg eliminados`
                        : isBulking
                        ? `${variacaoConquistadaKg} kg ganhos`
                        : 'Estável'}
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-emerald-500/20 text-xs text-emerald-400/90 font-medium flex items-center justify-between">
                  <span>Semana {projetoEmFoco.semanas_decorridas || 1} em execução</span>
                  <span>{projetoEmFoco.dias_decorridos || 0} dias de disciplina</span>
                </div>
              </div>

              {/* 3. ONDE QUERO CHEGAR (META FINAL) */}
              <div className="bg-slate-950/90 p-4 rounded-xl border border-amber-500/40 relative overflow-hidden flex flex-col justify-between shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-amber-400" /> Onde Quero Chegar
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                    Meta Final
                  </span>
                </div>
                <div>
                  <div className="text-xl sm:text-3xl font-black text-white flex items-baseline gap-2">
                    {pesoAlvoProjeto} <span className="text-sm font-bold text-amber-400">kg</span>
                    {pesoRestanteKg > 0 && (
                      <span className="text-xs font-bold text-amber-300/90">
                        (restam {pesoRestanteKg} kg)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                    <span>{bfAlvoProjeto}% BF seco</span>
                    <span>•</span>
                    <span>{projetoEmFoco.duracao_total_semanas} semanas de plano</span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/80 text-xs text-amber-400/90 font-semibold flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {pesoRestanteKg > 0
                      ? `Faltam ${pesoRestanteKg} kg para a vitória final!`
                      : '🎉 Meta final atingida!'}
                  </span>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* BARRA VISUAL DE PROGRESSÃO GLOBAL DA JORNADA */}
            {/* ========================================================= */}
            <div className="bg-slate-950/90 p-4 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <span className="font-black text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Progresso da Jornada: <strong className="text-emerald-400 text-sm">{percentagemGlobalFormatada}% Concluído</strong>
                </span>
                <span className="text-slate-400 font-mono text-xs">
                  {isCutting
                    ? `${variacaoConquistadaKg} kg de ${deltaTotalProjeto} kg eliminados • Restam ${pesoRestanteKg} kg`
                    : isBulking
                    ? `${variacaoConquistadaKg} kg de ${deltaTotalProjeto} kg ganhos • Restam ${pesoRestanteKg} kg`
                    : `Semana ${projetoEmFoco.semanas_decorridas || 1} de ${projetoEmFoco.duracao_total_semanas} semanas`}
                </span>
              </div>

              {/* Barra com Gradiente e Marcador */}
              <div className="w-full bg-slate-900 rounded-full h-4 overflow-hidden border border-slate-800 p-0.5 relative shadow-inner">
                <div
                  className="bg-gradient-to-r from-emerald-600 via-emerald-400 to-teal-300 h-full rounded-full transition-all duration-700 relative shadow-lg shadow-emerald-500/30"
                  style={{ width: `${Math.max(4, Math.min(100, percentagemGlobalFormatada))}%` }}
                >
                  <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-white/50 rounded-full animate-pulse" />
                </div>
              </div>

              {/* Marcadores de Balança ao Longo da Barra */}
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-0.5 pt-0.5">
                <span className="text-slate-300 font-bold">Início: {pesoInicial} kg</span>
                <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Hoje: {pesoHoje} kg ({percentagemGlobalFormatada}%)
                </span>
                <span className="text-amber-400 font-bold">Meta: {pesoAlvoProjeto} kg</span>
              </div>
            </div>

            {/* ========================================================= */}
            {/* CARD DE PROGRESSO DA FASE ATIVA (FOCO IMEDIATO) */}
            {/* ========================================================= */}
            {faseAtivaObj && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-950 to-slate-950 border border-emerald-500/40 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-xs font-black uppercase tracking-wider">
                      Fase {faseAtivaObj.numero_fase} em Execução
                    </span>
                    <h3 className="font-extrabold text-white text-sm">
                      {faseAtivaObj.nome_exibicao}
                    </h3>
                  </div>

                  <div className="text-xs font-mono text-slate-300 flex items-center gap-2">
                    <span>Meta da Fase:</span>
                    <strong className="text-white">{faseAtivaObj.peso_inicio_kg} kg</strong>
                    <ArrowRight className="w-3 h-3 text-emerald-400" />
                    <strong className="text-emerald-400">{faseAtivaObj.peso_fim_estimado_kg} kg</strong>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">
                      Progresso desta fase: <strong className="text-emerald-400">{progressoFaseKg} kg</strong> de <strong>{deltaTotalFase} kg</strong> atingidos
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      {percentagemFaseFormatada}% concluído
                    </span>
                  </div>

                  {/* Barra da Fase */}
                  <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(3, Math.min(100, percentagemFaseFormatada))}%` }}
                    />
                  </div>
                </div>

                {/* Mensagem de Marco e Teaser da Próxima Fase */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pt-1 text-slate-300">
                  <p className="leading-relaxed">
                    {restanteFaseKg > 0 ? (
                      <>
                        🎯 Faltam <strong className="text-white">{restanteFaseKg} kg</strong> para concluir esta fase e avançar
                        {proximaFaseObj ? <> para a <strong className="text-emerald-400">{proximaFaseObj.nome_exibicao}</strong>!</> : '!'}
                      </>
                    ) : (
                      <>
                        🎉 <strong className="text-emerald-400">Objetivo de peso da fase atingido!</strong> Podes avançar para a próxima etapa no roteiro abaixo.
                      </>
                    )}
                  </p>

                  <div className="flex items-center gap-2 shrink-0 font-mono text-xs bg-slate-900 px-2.5 py-1 rounded border border-slate-800 text-slate-300">
                    <span>{faseAtivaObj.calorias_diarias} kcal/dia</span>
                    <span>•</span>
                    <span>{faseAtivaObj.cardio_minutos_semana}m cardio/sem</span>
                  </div>
                </div>
              </div>
            )}

            {/* PÍLULAS COMPLEMENTARES DE DIAGNÓSTICO */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block font-medium">Duração & Semanas</span>
                <div className="text-base font-black text-white mt-1">
                  Semana {projetoEmFoco.semanas_decorridas || 1} <span className="text-xs text-slate-400">/ {projetoEmFoco.duracao_total_semanas} sem</span>
                </div>
                <span className="text-xs text-slate-400">
                  {projetoEmFoco.dias_decorridos || 0} dias decorridos
                </span>
              </div>

              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block font-medium">Gordura Corporal</span>
                <div className="text-base font-black text-white mt-1">
                  {bfInicial}% <ArrowRight className="inline w-3 h-3 text-emerald-400" /> {bfAlvoProjeto}%
                </div>
                <span className="text-xs text-emerald-400 font-semibold">
                  Hoje: ~{bfHoje}% BF
                </span>
              </div>

              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block font-medium">Fase Ativa</span>
                <div className="text-base font-black text-emerald-400 mt-1 truncate">
                  {projetoEmFoco.fase_atual_nome}
                </div>
                <span className="text-xs text-slate-400">
                  {fasesExibicao.length} fases programadas
                </span>
              </div>

              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 block font-medium">Check-ins & Adaptações</span>
                  {statusCheckinPeriodico && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold border ${
                      statusCheckinPeriodico.checkin_pendente
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    }`}>
                      {statusCheckinPeriodico.checkin_pendente ? 'Pendente' : 'Em dia'}
                    </span>
                  )}
                </div>
                <div className="text-base font-black text-white mt-1">
                  {detalhesProjetoFoco?.checkins?.length || projetoEmFoco.total_checkins || 0} registados
                </div>
                <span className="text-xs text-emerald-400">
                  {statusCheckinPeriodico?.proximo_checkin_data
                    ? (statusCheckinPeriodico.checkin_pendente
                        ? `Aviso: Check-up Pendente (${statusCheckinPeriodico.dias_decorridos}d atrás)`
                        : `Próximo: ${statusCheckinPeriodico.proximo_checkin_data} (${statusCheckinPeriodico.dias_restantes}d)`)
                    : (projetoEmFoco.ultimo_checkin_peso ? `Último: ${projetoEmFoco.ultimo_checkin_peso} kg` : 'Pronto para calibrar')}
                </span>
              </div>
            </div>

            {/* CARTÃO DE LIGAÇÃO RÁPIDA: TREINO & DIETA ASSOCIADOS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-slate-400 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Ligações Ativas:
                </span>
                <span className="text-slate-300">
                  🏋️ <strong>Treino:</strong> {detalhesProjetoFoco?.planos_treino?.[0]?.divisao || projetoEmFoco.treino_vinculado_divisao || projetoEmFoco.treino_vinculado_nome || 'Divisão ativa configurada'}
                </span>
                <span>•</span>
                <span className="text-slate-300">
                  🥗 <strong>Dieta:</strong> {detalhesProjetoFoco?.planos_dieta?.[0]?.calorias ? `${Math.round(detalhesProjetoFoco.planos_dieta[0].calorias)} kcal/dia` : (projetoEmFoco.dieta_vinculada_kcal ? `${Math.round(projetoEmFoco.dieta_vinculada_kcal)} kcal` : 'Calorias da fase')}
                </span>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                {aoNavegarParaTreinos && (
                  <button
                    onClick={aoNavegarParaTreinos}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1"
                  >
                    <span>Ver Treinos</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
                {aoNavegarParaDieta && (
                  <button
                    onClick={aoNavegarParaDieta}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1"
                  >
                    <span>Ver Dieta</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
                {aoNavegarParaCheckin && (
                  <button
                    onClick={aoNavegarParaCheckin}
                    className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold transition flex items-center gap-1"
                  >
                    <span>Fazer Check-in</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 2. DIAGNÓSTICO FISIOLÓGICO & SUMÁRIO DO MOTOR */}
          {relatorioExibicao && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 font-medium block">Duração Total</span>
                <div className="text-xl font-black text-white mt-1">
                  {relatorioExibicao.semanas_totais_estimadas || projetoEmFoco.duracao_total_semanas} <span className="text-xs text-emerald-400 font-semibold">semanas</span>
                </div>
                <span className="text-xs text-slate-500">~{relatorioExibicao.meses_estimados || Math.round(projetoEmFoco.duracao_total_semanas / 4)} meses previstos</span>
              </div>

              <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 font-medium block">Massa Muscular</span>
                <div className="text-xl font-black text-emerald-400 mt-1">
                  +{relatorioExibicao.massa_magra_a_ganhar_kg || 0} <span className="text-xs font-semibold text-slate-300">kg</span>
                </div>
                <span className="text-xs text-slate-500">Tecido muscular protegido</span>
              </div>

              <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 font-medium block">Gordura a Eliminar</span>
                <div className="text-xl font-black text-amber-400 mt-1">
                  -{relatorioExibicao.gordura_a_perder_kg || 0} <span className="text-xs font-semibold text-slate-300">kg</span>
                </div>
                <span className="text-xs text-slate-500">Meta: {projetoEmFoco.bf_alvo}% BF</span>
              </div>

              <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 font-medium block">Fases Programadas</span>
                <div className="text-xl font-black text-indigo-400 mt-1">
                  {fasesExibicao.length} <span className="text-xs font-semibold text-slate-300">fases</span>
                </div>
                <span className="text-xs text-slate-500">Periodização cronológica</span>
              </div>
            </div>
          )}

          {/* 3. ROTEIRO CRONOLÓGICO DE PERIODIZAÇÃO (TIMELINE DAS FASES VISÍVEL NA JANELA PRINCIPAL!) */}
          <div className="space-y-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                  Roteiro Cronológico de Periodização ({fasesExibicao.length} Fases)
                </h3>
                <p className="text-xs text-slate-400">
                  Cada fase prescreve as metas calóricas, macros, cardio e volume de treino para manter o metabolismo a responder.
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-1">
              {fasesExibicao.map((fase) => {
                const isFaseAtiva = (projetoEmFoco.fase_atual_tipo === fase.tipo) || (projetoEmFoco.fase_atual_nome === fase.nome_exibicao);
                return (
                  <div
                    key={fase.numero_fase}
                    className={`p-5 rounded-2xl border transition-all space-y-4 shadow-lg ${
                      isFaseAtiva
                        ? 'bg-slate-950 border-emerald-500 ring-2 ring-emerald-500/30'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-xl font-black flex items-center justify-center text-sm border ${
                          isFaseAtiva
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                            : 'bg-slate-900 text-slate-300 border-slate-700'
                        }`}>
                          {fase.numero_fase}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-white text-base">{fase.nome_exibicao}</h4>
                            {isFaseAtiva && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase border border-emerald-500/40">
                                  ⭐ Fase Ativa Agora
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-emerald-300 text-xs font-mono font-bold border border-slate-700">
                                  {progressoFaseKg} kg / {deltaTotalFase} kg ({percentagemFaseFormatada}%)
                                </span>
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-slate-400">
                            Duração prevista: <strong className="text-slate-200">{fase.duracao_semanas} semanas</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-semibold bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                        <span className="text-slate-400">Balança:</span>
                        <span className="text-white font-bold">{fase.peso_inicio_kg} kg</span>
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300 font-bold">{fase.peso_fim_estimado_kg} kg ({fase.bf_fim_estimado}% BF)</span>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {fase.descricao_estrategia}
                    </p>

                    {fase.foco_treino && (
                      <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                        <Dumbbell className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span><strong>Diretriz de Treino:</strong> {fase.foco_treino}</span>
                      </div>
                    )}

                    {/* Parâmetros Prescritos na Fase */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/90 p-3.5 rounded-xl border border-slate-800/80 text-xs">
                      <div>
                        <span className="text-slate-400 block flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-orange-400" /> Calorias Base
                        </span>
                        <span className="font-bold text-orange-300 text-sm">{fase.calorias_diarias} kcal</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block">Macros Prescritos</span>
                        <span className="font-mono text-slate-200 text-xs">
                          <strong className="text-emerald-400">{fase.macros?.proteina_g || 160}g</strong> P | <strong className="text-blue-400">{fase.macros?.hidratos_g || 200}g</strong> HC | <strong className="text-amber-400">{fase.macros?.gordura_g || 60}g</strong> G
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block flex items-center gap-1">
                          <Dumbbell className="w-3.5 h-3.5 text-emerald-400" /> Volume de Treino
                        </span>
                        <span className="font-bold text-slate-200 text-sm">{fase.series_trabalho_semana} séries/sem</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-indigo-400" /> Cardio Semanal
                        </span>
                        <span className="font-bold text-indigo-300 text-sm">{fase.cardio_minutos_semana} min/sem</span>
                      </div>
                    </div>

                    {/* Botão de Ativação da Fase */}
                    <div className="flex justify-end pt-1">
                      {isFaseAtiva ? (
                        <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                          <Check className="w-4 h-4" /> Fase em Execução Ativa
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAtivarFase(fase)}
                          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 border border-emerald-500/40 text-xs font-black flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Iniciar Fase</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. PAINÉIS EXPANSÍVEIS NA JANELA PRINCIPAL: CHECK-INS E PLANOS LIGADOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CHECK-INS E AJUSTES DESTE PROJETO */}
            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-white text-sm flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-400" />
                  Check-ins & Ajustes Deste Projeto ({detalhesProjetoFoco?.checkins?.length || 0})
                </h4>
                <button
                  onClick={() => setMostrarCheckinsFoco(!mostrarCheckinsFoco)}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-bold"
                >
                  <span>{mostrarCheckinsFoco ? 'Ocultar' : 'Ver Todos'}</span>
                  {mostrarCheckinsFoco ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {detalhesProjetoFoco?.checkins && detalhesProjetoFoco.checkins.length > 0 ? (
                <div className="space-y-2.5">
                  {(mostrarCheckinsFoco ? detalhesProjetoFoco.checkins : detalhesProjetoFoco.checkins.slice(-3)).map((c) => (
                    <div key={c.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">
                          {new Date(c.data).toLocaleDateString('pt-PT')}
                        </span>
                        <span className="font-mono font-bold text-emerald-400">
                          {c.peso_medio} kg ({c.variacao_peso_kg > 0 ? `+${c.variacao_peso_kg}` : c.variacao_peso_kg} kg)
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 line-clamp-2">
                        {c.recomendacoes_ia?.veredito_projeto?.resumo_analise || c.diagnostico_matematico?.motivo_matematico}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-3 text-center">
                  Ainda não foram realizados check-ins neste projeto.
                </p>
              )}
            </div>

            {/* TREINOS E DIETAS VINCULADOS */}
            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-white text-sm flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-emerald-400" />
                  Treinos & Dietas Vinculados
                </h4>
                <button
                  onClick={() => setMostrarTreinosDietasFoco(!mostrarTreinosDietasFoco)}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-bold"
                >
                  <span>{mostrarTreinosDietasFoco ? 'Ocultar' : 'Ver Detalhes'}</span>
                  {mostrarTreinosDietasFoco ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="space-y-2.5">
                {detalhesProjetoFoco?.planos_treino && detalhesProjetoFoco.planos_treino.length > 0 ? (
                  detalhesProjetoFoco.planos_treino.map((t) => (
                    <div key={t.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                      <div>
                        <strong className="text-white block">{t.nome}</strong>
                        <span className="text-slate-400 text-xs">{t.divisao} • {t.total_sessoes} sessões</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 text-xs font-bold">
                        {t.ativo ? 'Em Execução' : 'Fase'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-2 text-center">Nenhum treino específico vinculado.</p>
                )}

                {detalhesProjetoFoco?.planos_dieta && detalhesProjetoFoco.planos_dieta.length > 0 ? (
                  detalhesProjetoFoco.planos_dieta.map((d) => (
                    <div key={d.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                      <div>
                        <strong className="text-white block">{d.nome}</strong>
                        <span className="text-slate-400 text-xs">{d.total_refeicoes} refeições</span>
                      </div>
                      <span className="font-mono text-emerald-400 font-bold">
                        {Math.round(d.calorias)} kcal
                      </span>
                    </div>
                  ))
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* ABA 2: MEUS PROJETOS / PORTFÓLIO (GERIR, COMPARAR & ALTERNAR) */}
      {/* =================================================================== */}
      {abaPrincipal === 'portfolio' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                Portfólio de Projetos Fisiológicos ({projetos.length})
              </h3>
              <p className="text-xs text-slate-400">
                Clica em <strong>"Abrir na Janela Principal"</strong> para consultar a periodização e timeline completa de qualquer projeto, ou <strong>"Tornar Ativo"</strong> para colocá-lo em execução ativa.
              </p>
            </div>

            <button
              onClick={() => {
                setAbaPrincipal('novo');
                // nome livre definido pelo atleta
              }}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow transition"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Projeto</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projetos.map((proj) => {
              const isAtivo = proj.ativo;
              const isEmFoco = projetoEmFoco?.id === proj.id;
              return (
                <div
                  key={proj.id}
                  className={`p-5 rounded-2xl border transition-all space-y-4 shadow-lg ${
                    isAtivo
                      ? 'bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border-emerald-500 ring-1 ring-emerald-500/40'
                      : isEmFoco
                      ? 'bg-slate-900/90 border-slate-600 ring-1 ring-slate-500'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isAtivo ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-xs uppercase border border-emerald-500/40">
                            🌟 Projeto Ativo
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-bold text-xs uppercase">
                            {proj.status === 'concluido' ? '🏆 Concluído' : '📁 Em Espera'}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 font-mono">
                          {proj.criado_em ? new Date(proj.criado_em).toLocaleDateString('pt-PT') : ''}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-white text-base leading-snug">
                        {proj.nome}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {proj.descricao || proj.tipo_intencao}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleAbrirEdicao(proj)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                        title="Editar nome"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleEliminarProjeto(proj.id, proj.nome)}
                        className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
                        title="Eliminar projeto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Resumo Rápido & Barra de Progresso do Portfólio */}
                  {(() => {
                    const pIniProj = Number(proj.peso_inicial_kg);
                    const pAlvoProj = Number(proj.peso_alvo_kg);
                    const pHojeProj = Number(proj.ultimo_checkin_peso || (isAtivo ? pesoHoje : pIniProj));
                    const dTotalProj = Math.abs(pAlvoProj - pIniProj);
                    let pctProj = 0;
                    if (dTotalProj > 0) {
                      if (pAlvoProj < pIniProj) {
                        pctProj = Math.min(100, Math.max(0, ((pIniProj - pHojeProj) / dTotalProj) * 100));
                      } else {
                        pctProj = Math.min(100, Math.max(0, ((pHojeProj - pIniProj) / dTotalProj) * 100));
                      }
                    }
                    const pctProjFormat = Math.round(pctProj * 10) / 10;

                    return (
                      <div className="space-y-2 bg-slate-900/80 p-3 rounded-xl border border-slate-800/80 text-xs">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <span className="text-slate-400 block text-xs">Trajetória</span>
                            <span className="font-bold text-white">{pIniProj} ➔ {pAlvoProj} kg</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-xs">Balança Hoje</span>
                            <span className="font-bold text-emerald-400">{pHojeProj} kg</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-xs">Progresso</span>
                            <span className="font-bold text-emerald-300 font-mono">{pctProjFormat}%</span>
                          </div>
                        </div>
                        {/* Mini Barra de Progresso */}
                        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(3, Math.min(100, pctProjFormat))}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-400 pt-0.5">
                          <span className="truncate max-w-[180px]">{proj.fase_atual_nome}</span>
                          <span>{proj.total_checkins || 0} check-ins</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Ações */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                    <button
                      onClick={() => handleSelecionarProjetoParaFoco(proj)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold rounded-lg text-xs flex items-center gap-1.5 border border-slate-700 transition"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Abrir na Janela Principal</span>
                    </button>

                    {!isAtivo ? (
                      <button
                        onClick={() => handleAtivarProjeto(proj.id)}
                        className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1 transition shadow active:scale-95"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Tornar Ativo</span>
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Ativo Agora
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* ABA 3: CRIAR NOVO PROJETO (CALCULADOR DETERMINÍSTICO) */}
      {/* =================================================================== */}
      {abaPrincipal === 'novo' && (
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-6 max-w-4xl mx-auto animate-fade-in">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" />
              Configurar Novo Projeto Fisiológico
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Introduz os teus dados biométricos e metas. O algoritmo determinístico calcula a periodização completa e adiciona o projeto ao teu portfólio.
            </p>
          </div>

          <form onSubmit={handleCalcularENovoProjeto} className="space-y-5">
            {/* NOME E IDENTIFICAÇÃO DO PROJETO */}
            <div className="p-4 bg-slate-950/80 rounded-xl border border-emerald-500/30 space-y-3">
              <div>
                <label className="block text-xs font-black text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Target className="w-4 h-4" /> Nome Identificável do Projeto:
                </label>
                <input
                  type="text"
                  required
                  value={nomeProjetoInput}
                  onChange={(e) => setNomeProjetoInput(e.target.value)}
                  placeholder="Ex: Projeto For?a & Defini??o, Prepara??o 80kg, etc."
                  className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-white font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Notas / Descrição do Projeto (Opcional):
                </label>
                <input
                  type="text"
                  value={descricaoProjetoInput}
                  onChange={(e) => setDescricaoProjetoInput(e.target.value)}
                  placeholder="Ex: Défice calórico moderado com foco em manter força nos compostos"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 font-semibold cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={ativarImediatamente}
                  onChange={(e) => setAtivarImediatamente(e.target.checked)}
                  className="accent-emerald-500 w-4 h-4 rounded"
                />
                <span>Definir logo como <strong>Projeto Ativo</strong> (comanda os check-ins e treinos diários)</span>
              </label>
            </div>

            {/* PARÂMETROS BIOMÉTRICOS */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Peso Atual (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={pesoAtual}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '') {
                      setPesoAtual('');
                    } else {
                      const n = parseFloat(v);
                      setPesoAtual(isNaN(n) ? '' : n);
                      
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-bold focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Gordura Atual (% BF)</label>
                <input
                  type="number"
                  step="0.5"
                  value={bfAtual}
                  onChange={(e) => {
                    const v = e.target.value;
                    setBfAtual(v === '' ? '' : (parseFloat(v) || 0));
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-bold focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl">
                <label className="block text-xs font-semibold text-emerald-400 mb-1.5">🎯 Peso Alvo (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={pesoAlvo}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '') {
                      setPesoAlvo('');
                    } else {
                      const n = parseFloat(v);
                      setPesoAlvo(isNaN(n) ? '' : n);
                      
                    }
                  }}
                  className="w-full bg-slate-950 border border-emerald-500/40 rounded-lg px-3 py-2 text-emerald-300 font-extrabold focus:outline-none"
                />
              </div>
              <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl">
                <label className="block text-xs font-semibold text-emerald-400 mb-1.5">🎯 BF Alvo (% Seco)</label>
                <input
                  type="number"
                  step="0.5"
                  value={bfAlvo}
                  onChange={(e) => {
                    const v = e.target.value;
                    setBfAlvo(v === '' ? '' : (parseFloat(v) || 0));
                  }}
                  className="w-full bg-slate-950 border border-emerald-500/40 rounded-lg px-3 py-2 text-emerald-300 font-extrabold focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Altura (cm)</label>
                <input
                  type="number"
                  value={altura}
                  onChange={(e) => {
                    const v = e.target.value;
                    setAltura(v === '' ? '' : (parseFloat(v) || 0));
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Idade</label>
                <input
                  type="number"
                  value={idade}
                  onChange={(e) => {
                    const v = e.target.value;
                    setIdade(v === '' ? '' : (parseInt(v) || 0));
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Sexo</label>
                <select
                  value={sexo}
                  onChange={(e) => setSexo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-sm text-slate-200"
                >
                  <option value="masculino">Homem</option>
                  <option value="feminino">Mulher</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Experiência de Treino</label>
                <select
                  value={nivelExperiencia}
                  onChange={(e) => setNivelExperiencia(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
                >
                  <option value="iniciante">Iniciante (&lt; 1 ano)</option>
                  <option value="intermediario">Intermédio (1 a 3 anos)</option>
                  <option value="avancado">Avançado (&gt; 3 anos)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Atividade Diária (PAL)</label>
                <select
                  value={nivelAtividade}
                  onChange={(e) => setNivelAtividade(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
                >
                  <option value="sedentario">Sedentário (Escritório)</option>
                  <option value="leve">Leve (1-3 treinos/sem)</option>
                  <option value="moderado">Moderado (3-5 treinos/sem)</option>
                  <option value="ativo">Ativo (6-7 treinos/sem)</option>
                </select>
              </div>
            </div>

            {/* Estratégia Fisiológica & Periodização */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <label className="block text-xs font-semibold text-slate-300">
                Estratégia Fisiológica & Periodização:
              </label>

              {pesoAlvo < pesoAtual ? (
                <div className="space-y-2">
                  <label className={`block p-3 rounded-xl border cursor-pointer transition-all ${
                    estrategiaInicial === 'cut_com_diet_breaks' || estrategiaInicial === 'cut' || estrategiaInicial === 'recomposicao'
                      ? 'bg-emerald-950/40 border-emerald-500/60 shadow-sm'
                      : 'bg-slate-950 border-slate-800'
                  }`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="estrategia"
                        value="cut_com_diet_breaks"
                        checked={estrategiaInicial === 'cut_com_diet_breaks' || estrategiaInicial === 'cut' || estrategiaInicial === 'recomposicao'}
                        onChange={() => setEstrategiaInicial('cut_com_diet_breaks')}
                        className="accent-emerald-500"
                      />
                      <span className="text-xs font-bold text-white">
                        🟢 Cut Estruturado com Diet Breaks ({pesoAtual}kg → {pesoAlvo}kg)
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 pl-5">
                      Défice progressivo seguro (-500 kcal/dia) com pausas de manutenção metabólica para preservar massa muscular e evitar estagnação.
                    </p>
                  </label>

                  <label className={`block p-3 rounded-xl border cursor-pointer transition-all ${
                    estrategiaInicial === 'cut_direto'
                      ? 'bg-emerald-950/40 border-emerald-500/60 shadow-sm'
                      : 'bg-slate-950 border-slate-800'
                  }`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="estrategia"
                        value="cut_direto"
                        checked={estrategiaInicial === 'cut_direto'}
                        onChange={() => setEstrategiaInicial('cut_direto')}
                        className="accent-emerald-500"
                      />
                      <span className="text-xs font-bold text-white">
                        ⚡ Cut Linear Direto (Sem pausas de manutenção)
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 pl-5">
                      Défice contínuo linear para reduções de peso mais céleres.
                    </p>
                  </label>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className={`block p-3 rounded-xl border cursor-pointer transition-all ${
                    estrategiaInicial === 'lean_bulk_linear' || estrategiaInicial === 'bulk_direto'
                      ? 'bg-emerald-950/40 border-emerald-500/60 shadow-sm'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="estrategia"
                        value="lean_bulk_linear"
                        checked={estrategiaInicial === 'lean_bulk_linear' || estrategiaInicial === 'bulk_direto'}
                        onChange={() => setEstrategiaInicial('lean_bulk_linear')}
                        className="accent-emerald-500"
                      />
                      <span className="text-xs font-bold text-white">
                        🟢 Lean Bulk Linear (Progressivo & Direto)
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 pl-5">
                      Superávit calórico controlado (+250 kcal) subindo limpo direto até aos {pesoAlvo}kg com fase de consolidação metabólica.
                    </p>
                  </label>

                  <label className={`block p-3 rounded-xl border cursor-pointer transition-all ${
                    estrategiaInicial === 'bulk_cut_atletico'
                      ? 'bg-emerald-950/40 border-emerald-500/60 shadow-sm'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="estrategia"
                        value="bulk_cut_atletico"
                        checked={estrategiaInicial === 'bulk_cut_atletico'}
                        onChange={() => setEstrategiaInicial('bulk_cut_atletico')}
                        className="accent-emerald-500"
                      />
                      <span className="text-xs font-bold text-white">
                        🏆 Bulk & Cut Atlético (Sobrecarga de Lastro + Mini-Cut Final)
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 pl-5">
                      Periodização de atleta: sobrecarga de lastro até {Number(pesoAlvo) + 3}kg (+3kg), descompressão metabólica e cut final de lapidação para atingir os {pesoAlvo}kg com {bfAlvo}% BF seco.
                    </p>
                  </label>

                  <label className={`block p-3 rounded-xl border cursor-pointer transition-all ${
                    estrategiaInicial === 'retorno_reabilitacao_bulk'
                      ? 'bg-emerald-950/40 border-emerald-500/60 shadow-sm'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="estrategia"
                        value="retorno_reabilitacao_bulk"
                        checked={estrategiaInicial === 'retorno_reabilitacao_bulk'}
                        onChange={() => setEstrategiaInicial('retorno_reabilitacao_bulk')}
                        className="accent-emerald-500"
                      />
                      <span className="text-xs font-bold text-white">
                        🛡️ Retorno / Reabilitação + Bulk (Pós-Lesão ou Paragem Prolongada)
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 pl-5">
                      Inicia com 4 a 6 semanas de readaptação neuromuscular no peso atual ({pesoAtual}kg, RPE ≤ 7.0, proteção de tendões e manguito) antes do superávit calórico progressivo.
                    </p>
                  </label>

                  <label className={`block p-3 rounded-xl border cursor-pointer transition-all ${
                    estrategiaInicial === 'recomposicao'
                      ? 'bg-emerald-950/40 border-emerald-500/60 shadow-sm'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="estrategia"
                        value="recomposicao"
                        checked={estrategiaInicial === 'recomposicao'}
                        onChange={() => setEstrategiaInicial('recomposicao')}
                        className="accent-emerald-500"
                      />
                      <span className="text-xs font-bold text-white">
                        🔄 Recomposição Inicial (Priming Metabólico) + Bulk
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 pl-5">
                      6 a 8 semanas no peso atual para aumentar sensibilidade à insulina e densidade muscular antes da subida calórica.
                    </p>
                  </label>
                </div>
              )}
            </div>

            {/* Observações de Contexto, Lesões e Histórico Clínico */}
            <div className="space-y-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Contexto Atual, Lesões ou Condições Específicas (Opcional):
                </label>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  Adaptação Biomecânica
                </span>
              </div>
              <textarea
                value={observacoesContexto}
                onChange={(e) => setObservacoesContexto(e.target.value)}
                placeholder="Ex: Tenho 70kg quero chegar aos 80kg mas estou há 3 meses parado por lesão no acromioclavicular. Preciso de tempo para recuperar estímulo e andamento..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none"
              />
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-400">Atalhos rápidos:</span>
                <button
                  type="button"
                  onClick={() => {
                    const texto = 'Estou há 3 meses parado por lesão no acromioclavicular, preciso de tempo para recuperar estímulo e andamento com proteção articular.';
                    setObservacoesContexto((prev) => prev ? `${prev} | ${texto}` : texto);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-[10px] text-emerald-300 hover:bg-emerald-900/60 transition-all"
                >
                  + Lesão Acromioclavicular / Ombro
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const texto = 'Parado há vários meses, preciso de fase de readaptação motora e condicionamento antes de progredir cargas.';
                    setObservacoesContexto((prev) => prev ? `${prev} | ${texto}` : texto);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-[10px] text-slate-300 hover:bg-slate-700 transition-all"
                >
                  + Parado há meses (readaptação)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const texto = 'Sensibilidade ou histórico de dor lombar, evitar sobrecarga axial excessiva.';
                    setObservacoesContexto((prev) => prev ? `${prev} | ${texto}` : texto);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-[10px] text-slate-300 hover:bg-slate-700 transition-all"
                >
                  + Desconforto Lombar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const texto = '100% apto e sem qualquer limitação articular ou dor.';
                    setObservacoesContexto(texto);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-[10px] text-slate-300 hover:bg-slate-700 transition-all"
                >
                  + 100% Apto
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={calculando}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 text-sm"
            >
              {calculando ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>A calcular trajetórias e a guardar projeto...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Guardar Projeto & Ver Roadmap na Janela Principal</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL DE EDIÇÃO DE NOME / NOTAS / STATUS */}
      {/* =================================================================== */}
      {modalEditarAberto && projetoAEditar && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-400" />
                Editar Projeto
              </h3>
              <button onClick={() => setModalEditarAberto(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Nome do Projeto:</label>
                <input
                  type="text"
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Notas / Descrição:</label>
                <textarea
                  rows={3}
                  value={editDescricao}
                  onChange={(e) => setEditDescricao(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Status:</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="ativo">Ativo</option>
                  <option value="concluido">Concluído</option>
                  <option value="arquivado">Arquivado / Em Espera</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setModalEditarAberto(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvandoEdicao}
                onClick={handleSalvarEdicao}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs"
              >
                {salvandoEdicao ? 'A guardar...' : 'Guardar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
