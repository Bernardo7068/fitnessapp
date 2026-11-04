import React, { useState, useEffect } from 'react';
import {
  Target, Calendar, Flame, Dumbbell, ArrowRight, CheckCircle2, Sparkles, Scale,
  RefreshCw, AlertTriangle, Zap, FolderKanban, Check, ChevronRight, History,
  Info, Award, Plus, Trash2, Edit3, X, Eye, ShieldCheck, Utensils, Clock, Layers, Star,
  TrendingDown, TrendingUp, ChevronDown, ChevronUp, Flag, Milestone, Trophy, ArrowLeft, BookOpen, FileText, Activity, CheckCircle
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
  const [estrategiaInicial, setEstrategiaInicial] = useState<string>('bulk_cut_atletico');
  const [taxaSemanalAlvo, setTaxaSemanalAlvo] = useState<number>(0.30);
  const [modoTaxaPersonalizada, setModoTaxaPersonalizada] = useState<boolean>(false);
  const [observacoesContexto, setObservacoesContexto] = useState<string>('');

  const [relatorioCalculado, setRelatorioCalculado] = useState<RelatorioProjetoMetas | null>(null);
  const [composicaoAtual, setComposicaoAtual] = useState<ComposicaoCorporal | null>(null);

  // ===================================================================
  // ESTADOS DO ASSISTENTE INTEGRADO DE CRIAÇÃO (WIZARD DE 4 PASSOS)
  // ===================================================================
  const [passoWizard, setPassoWizard] = useState<1 | 2 | 3 | 4>(1);

  // Passo 2: Preferências e Plano de Treino da Fase 1
  const [diasSemanaTreino, setDiasSemanaTreino] = useState<number>(4);
  const [tempoSessaoTreino, setTempoSessaoTreino] = useState<number>(60);
  const [divisaoTreino, setDivisaoTreino] = useState<string>('Push / Pull / Legs (PPL)');
  const [pontosFracosTreino, setPontosFracosTreino] = useState<string>('');
  const [equipamentosTreino, setEquipamentosTreino] = useState<string>('ginasio_completo');
  const [planoTreinoGerado, setPlanoTreinoGerado] = useState<any | null>(null);
  const [gerandoTreinoIA, setGerandoTreinoIA] = useState<boolean>(false);
  const [erroTreino, setErroTreino] = useState<string>('');

  // Passo 3: Preferências e Plano de Dieta da Fase 1
  const [numRefeicoesDieta, setNumRefeicoesDieta] = useState<number>(4);
  const [horarioTreinoDieta, setHorarioTreinoDieta] = useState<string>('18:00');
  const [alimentosPreferidosDieta, setAlimentosPreferidosDieta] = useState<string>('Frango, Ovos, Arroz, Aveia, Fruta, Whey Protein, Batata doce');
  const [alimentosEvitadosDieta, setAlimentosEvitadosDieta] = useState<string>('');
  const [habitosApetiteDieta, setHabitosApetiteDieta] = useState<string>('Normal');
  const [planoDietaGerado, setPlanoDietaGerado] = useState<any | null>(null);
  const [gerandoDietaIA, setGerandoDietaIA] = useState<boolean>(false);
  const [erroDieta, setErroDieta] = useState<string>('');

  // Passo 4: Ativação Total do Ecossistema
  const [ativandoEcossistema, setAtivandoEcossistema] = useState<boolean>(false);

  // Dossiê Inicial em 'foco'
  const [mostrarDossieFoco, setMostrarDossieFoco] = useState<boolean>(false);

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

  // Sincronizacao automatica da estrategia e taxa semanal de acordo com os pesos
  useEffect(() => {
    if (typeof pesoAtual !== 'number' || typeof pesoAlvo !== 'number' || isNaN(pesoAtual) || isNaN(pesoAlvo)) return;
    if (pesoAlvo > pesoAtual) {
      if (!['bulk_cut_atletico', 'bulk_linear', 'lean_bulk_linear', 'retorno_reabilitacao_bulk'].includes(estrategiaInicial)) {
        setEstrategiaInicial('bulk_cut_atletico');
      }
      if (!modoTaxaPersonalizada && (taxaSemanalAlvo <= 0 || taxaSemanalAlvo > 0.75)) {
        setTaxaSemanalAlvo(0.30);
      }
    } else if (pesoAlvo < pesoAtual) {
      if (!['cut_com_diet_breaks', 'cut_direto', 'retorno_reabilitacao_cut'].includes(estrategiaInicial)) {
        setEstrategiaInicial('cut_com_diet_breaks');
      }
      if (!modoTaxaPersonalizada && (taxaSemanalAlvo <= 0 || taxaSemanalAlvo > 1.2)) {
        setTaxaSemanalAlvo(0.50);
      }
    } else {
      if (!['recomposicao', 'readaptacao_retorno', 'manutencao_metabolica'].includes(estrategiaInicial)) {
        setEstrategiaInicial('recomposicao');
      }
      setTaxaSemanalAlvo(0.00);
    }
  }, [pesoAtual, pesoAlvo]);

  const atualizarSugestaoNome = () => {}; // Desativado para nao influenciar nem sobrepor o nome escolhido pelo atleta

  // ===================================================================
  // CONTROLADORES DO WIZARD INTEGRADO
  // ===================================================================
  const handleAvancarParaPasso2Treino = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
        observacoes_contexto: observacoesContexto,
        taxa_semanal_alvo_kg: taxaSemanalAlvo
      });
      setRelatorioCalculado(resProj);

      // Ajuste inteligente da sugestão de divisão conforme a Fase 1
      const fase1 = resProj.fases && resProj.fases[0];
      if (fase1) {
        if (fase1.tipo === 'readaptacao' || fase1.tipo === 'lesao' || estrategiaInicial.includes('retorno')) {
          setDivisaoTreino('Upper / Lower');
          setDiasSemanaTreino(4);
        } else if (fase1.tipo === 'bulk') {
          setDivisaoTreino('Push / Pull / Legs (PPL)');
          setDiasSemanaTreino(5);
        } else {
          setDivisaoTreino('Upper / Lower');
          setDiasSemanaTreino(4);
        }
      }

      setPassoWizard(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Se ainda não gerou treino, aciona automaticamente a geração do treino da Fase 1
      if (!planoTreinoGerado && resProj.fases && resProj.fases.length > 0) {
        executarGeracaoTreinoFase1(resProj);
      }
    } catch (err) {
      console.error('Erro ao calcular trajetória:', err);
    } finally {
      setCalculando(false);
    }
  };

  const executarGeracaoTreinoFase1 = async (projRelatorio?: RelatorioProjetoMetas) => {
    const rel = projRelatorio || relatorioCalculado;
    const f1 = rel?.fases?.[0];
    const faseTipo = f1?.tipo || 'bulk';
    const faseNome = f1?.nome_exibicao || 'Fase 1';
    const caloriasF1 = f1?.calorias_diarias || 2500;
    const seriesF1 = f1?.series_trabalho_semana || 16;
    const cardioF1 = f1?.cardio_minutos_semana || 60;
    const focoF1 = f1?.foco_treino || '';

    try {
      setGerandoTreinoIA(true);
      setErroTreino('');
      const res = await ServicoApi.recomendarTreinoIA({
        lesoes_atuais_ou_passadas: observacoesContexto,
        desproporcoes_pontos_fracos: pontosFracosTreino,
        problemas_limitacoes: observacoesContexto,
        objetivo_especifico: `${faseNome} (${rel?.tipo_intencao || 'Transformação'})`,
        dias_semana: diasSemanaTreino,
        duracao_minutos: tempoSessaoTreino,
        tipo_divisao_preferida: divisaoTreino,
        fase_projeto: faseTipo,
        nome_fase_projeto: faseNome,
        calorias_diarias: caloriasF1,
        series_alvo_semana: seriesF1,
        cardio_minutos_semana: cardioF1,
        foco_treino_projeto: focoF1
      });
      setPlanoTreinoGerado(res);
    } catch (err: any) {
      console.error('Erro ao gerar treino da Fase 1:', err);
      setErroTreino(err.message || 'Erro ao gerar treino da Fase 1');
    } finally {
      setGerandoTreinoIA(false);
    }
  };

  const handleAvancarParaPasso3Dieta = async () => {
    setPassoWizard(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Se ainda não gerou dieta, aciona automaticamente a geração da dieta da Fase 1
    if (!planoDietaGerado && relatorioCalculado?.fases && relatorioCalculado.fases.length > 0) {
      executarGeracaoDietaFase1(relatorioCalculado);
    }
  };

  const executarGeracaoDietaFase1 = async (projRelatorio?: RelatorioProjetoMetas) => {
    const rel = projRelatorio || relatorioCalculado;
    const f1 = rel?.fases?.[0];
    const faseTipo = f1?.tipo || 'bulk';
    const faseNome = f1?.nome_exibicao || 'Fase 1';
    const caloriasF1 = f1?.calorias_diarias || 2500;

    try {
      setGerandoDietaIA(true);
      setErroDieta('');
      const res = await ServicoApi.prescreverDietaIA({
        calorias_diarias: caloriasF1,
        fase_projeto: faseTipo,
        nome_fase_projeto: faseNome,
        alimentos_preferidos: alimentosPreferidosDieta,
        alimentos_evitados: alimentosEvitadosDieta,
        numero_refeicoes: numRefeicoesDieta,
        horario_treino: horarioTreinoDieta,
        habitos_apetite: habitosApetiteDieta
      });
      if (res && res.plano) {
        setPlanoDietaGerado(res.plano);
      }
    } catch (err: any) {
      console.error('Erro ao gerar dieta da Fase 1:', err);
      setErroDieta(err.message || 'Erro ao gerar dieta da Fase 1');
    } finally {
      setGerandoDietaIA(false);
    }
  };

  const handleAvancarParaPasso4Revisao = () => {
    setPassoWizard(4);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAtivarEcossistemaCompleto = async () => {
    try {
      setAtivandoEcossistema(true);
      const pAtual = typeof pesoAtual === 'number' && !isNaN(pesoAtual) ? pesoAtual : 70;
      const pAlvo = typeof pesoAlvo === 'number' && !isNaN(pesoAlvo) ? pesoAlvo : 75;
      const bAtual = typeof bfAtual === 'number' && !isNaN(bfAtual) ? bfAtual : 15;
      const bAlvo = typeof bfAlvo === 'number' && !isNaN(bfAlvo) ? bfAlvo : 12;
      const alt = typeof altura === 'number' && !isNaN(altura) ? altura : 175;
      const id = typeof idade === 'number' && !isNaN(idade) ? idade : 25;
      const nomeFinal = nomeProjetoInput.trim() || `Projeto ${pAtual}kg ➔ ${pAlvo}kg`;

      const f1 = relatorioCalculado?.fases?.[0];
      const fase1Tipo = f1?.tipo || 'bulk';
      const fase1Nome = f1?.nome_exibicao || 'Fase 1';
      const fase1Kcal = f1?.calorias_diarias || 2500;

      // 1. Construir Dossiê Inicial Completo para guardar permanentemente
      const dossieInicial = {
        criado_em: new Date().toISOString(),
        metas_fisiologicas: {
          peso_inicial_kg: pAtual,
          peso_alvo_kg: pAlvo,
          bf_inicial: bAtual,
          bf_alvo: bAlvo,
          altura_cm: alt,
          idade: id,
          sexo,
          nivel_experiencia: nivelExperiencia,
          nivel_atividade: nivelAtividade,
          estrategia: estrategiaInicial,
          taxa_semanal_alvo_kg: taxaSemanalAlvo,
          duracao_total_semanas: relatorioCalculado?.semanas_totais_estimadas,
          contexto_clinico_lesoes: observacoesContexto
        },
        fase_1_inicial: {
          nome: fase1Nome,
          tipo: fase1Tipo,
          duracao_semanas: f1?.duracao_semanas,
          calorias_diarias: fase1Kcal,
          series_semana: f1?.series_trabalho_semana,
          cardio_minutos_semana: f1?.cardio_minutos_semana
        },
        treino_configurado: {
          divisao: planoTreinoGerado?.nome_divisao || divisaoTreino,
          dias_por_semana: diasSemanaTreino,
          duracao_minutos: tempoSessaoTreino,
          foco: pontosFracosTreino,
          equipamentos: equipamentosTreino,
          total_sessoes: planoTreinoGerado?.sessoes?.length || 0,
          sessoes: planoTreinoGerado?.sessoes || []
        },
        dieta_configurada: {
          calorias: planoDietaGerado?.calorias || fase1Kcal,
          macros: planoDietaGerado?.macros || { calorias: fase1Kcal, proteina_g: 160, gordura_g: 65, hidratos_g: 280 },
          num_refeicoes: numRefeicoesDieta,
          horario_treino: horarioTreinoDieta,
          alimentos_preferidos: alimentosPreferidosDieta,
          alimentos_evitados: alimentosEvitadosDieta,
          total_refeicoes: planoDietaGerado?.refeicoes?.length || 0,
          refeicoes: planoDietaGerado?.refeicoes || []
        }
      };

      const relatorioComDossie = {
        ...(relatorioCalculado || {}),
        dossie_inicial: dossieInicial
      };

      // 2. Guardar o Projeto na base de dados
      const resCriar = await ServicoApi.criarProjeto({
        nome: nomeFinal,
        descricao: descricaoProjetoInput.trim() || `Estratégia: ${relatorioCalculado?.tipo_intencao || 'Transformação Corporal'}`,
        tipo_intencao: relatorioCalculado?.tipo_intencao || 'Transformação Corporal',
        peso_inicial_kg: pAtual,
        peso_alvo_kg: pAlvo,
        bf_inicial: bAtual,
        bf_alvo: bAlvo,
        estrategia_inicial: estrategiaInicial,
        observacoes_contexto: observacoesContexto,
        duracao_total_semanas: relatorioCalculado?.semanas_totais_estimadas,
        fases: relatorioCalculado?.fases || [],
        relatorio_completo_json: JSON.stringify(relatorioComDossie),
        ativar_imediatamente: ativarImediatamente,
        taxa_semanal_alvo_kg: taxaSemanalAlvo
      });

      const novoProjetoId = resCriar.projeto_id;

      // 3. Salvar o Plano de Treino vinculado ao novo projeto
      if (planoTreinoGerado) {
        try {
          await ServicoApi.salvarPlanoTreino({
            ...planoTreinoGerado,
            id_projeto: novoProjetoId,
            nome_projeto: nomeFinal,
            fase_projeto: fase1Tipo,
            nome_fase: fase1Nome,
            ativo: ativarImediatamente
          });
        } catch (errTreino) {
          console.warn('Aviso ao vincular treino gerado:', errTreino);
        }
      }

      // 4. Salvar o Plano de Dieta vinculado ao novo projeto
      if (planoDietaGerado) {
        try {
          await ServicoApi.salvarPlanoDieta({
            nome: planoDietaGerado.nome || `Dieta Fase 1 - ${nomeFinal}`,
            calorias: planoDietaGerado.calorias || fase1Kcal,
            proteina_g: planoDietaGerado.macros?.proteina_g || 160.0,
            gordura_g: planoDietaGerado.macros?.gordura_g || 65.0,
            hidratos_g: planoDietaGerado.macros?.hidratos_g || 280.0,
            fibras_g: planoDietaGerado.macros?.fibras_g || 30.0,
            refeicoes: planoDietaGerado.refeicoes || [],
            id_projeto: novoProjetoId,
            nome_projeto: nomeFinal,
            fase_projeto: fase1Tipo,
            nome_fase: fase1Nome,
            ativo: ativarImediatamente
          });
        } catch (errDieta) {
          console.warn('Aviso ao vincular dieta gerada:', errDieta);
        }
      }

      // 5. Recarregar lista de projetos
      const projsAtualizados = await ServicoApi.obterProjetos();
      setProjetos(projsAtualizados);
      const novoOuAtivo = projsAtualizados.find((p) => p.id === novoProjetoId) || projsAtualizados.find((p) => p.ativo) || projsAtualizados[0];
      setProjetoAtivo(projsAtualizados.find((p) => p.ativo) || null);
      setProjetoEmFoco(novoOuAtivo);
      if (novoOuAtivo) {
        await carregarDetalhesDoProjeto(novoOuAtivo.id);
      }

      setMensagemSucesso(
        ativarImediatamente
          ? `🎉 Ecossistema Completo Ativado! O projeto "${nomeFinal}", o treino da Fase 1 e a dieta da Fase 1 foram guardados e ativados em perfeita sincronia!`
          : `📁 Projeto "${nomeFinal}", Treino e Dieta guardados com sucesso no teu Portfólio!`
      );
      setTimeout(() => setMensagemSucesso(''), 8000);

      // Reiniciar assistente e ir para a janela principal em foco
      setPassoWizard(1);
      setAbaPrincipal('foco');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Erro ao ativar ecossistema completo:', err);
    } finally {
      setAtivandoEcossistema(false);
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
            {/* DOSSIÊ INICIAL DO PROJETO & PARÂMETROS ESTABELECIDOS     */}
            {/* ========================================================= */}
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <button
                type="button"
                onClick={() => setMostrarDossieFoco(!mostrarDossieFoco)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white flex items-center gap-2">
                      <span>Dossiê Inicial & Parâmetros Estabelecidos</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                        Registo Permanente
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Consulta as decisões de partida, histórico clínico, treino e refeições configuradas na criação deste projeto.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-400 font-semibold text-xs">
                  <span>{mostrarDossieFoco ? 'Ocultar Dossiê' : 'Consultar Dossiê'}</span>
                  {mostrarDossieFoco ? <ChevronUp className="w-4 h-4 text-emerald-400" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {mostrarDossieFoco && (
                <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-950/60 space-y-5 animate-fade-in text-xs">
                  {/* Ponto de Partida vs Metas Estabelecidas */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                      <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5 text-emerald-400" /> Biometria de Arranque
                      </div>
                      <div className="text-white font-extrabold text-sm">
                        {pesoInicial} kg • {bfInicial}% Gordura
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Altura: {altura || 175}cm • Idade: {idade || 25} anos ({sexo === 'masculino' ? 'Homem' : 'Mulher'})
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                      <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-emerald-400" /> Meta Final Estabelecida
                      </div>
                      <div className="text-emerald-400 font-extrabold text-sm">
                        {pesoAlvoProjeto} kg • {bfAlvoProjeto}% Gordura
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Duração Estimada: {projetoEmFoco.duracao_total_semanas || 12} semanas
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                      <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-emerald-400" /> Estratégia & Velocidade
                      </div>
                      <div className="text-white font-extrabold text-sm capitalize">
                        {projetoEmFoco.estrategia_inicial?.replace(/_/g, ' ') || 'Recomposição'}
                      </div>
                      <div className="text-emerald-400 font-semibold text-[11px]">
                        Ritmo Alvo: {projetoEmFoco.taxa_semanal_alvo_kg ? `${projetoEmFoco.taxa_semanal_alvo_kg > 0 ? '+' : ''}${projetoEmFoco.taxa_semanal_alvo_kg.toFixed(2)} kg/semana` : 'Isocalórico (0.00 kg/sem)'}
                      </div>
                    </div>
                  </div>

                  {/* Contexto Clínico & Lesões Reportadas */}
                  <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                    <div className="text-slate-300 font-bold flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Histórico Clínico, Lesões & Salvaguardas Articulares:</span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono">
                      {projetoEmFoco.observacoes_contexto || detalhesProjetoFoco?.relatorio?.dossie_inicial?.metas_fisiologicas?.contexto_clinico_lesoes || 'Sem histórico de lesões ou restrições articulares reportadas no registo inicial (100% Apto).'}
                    </p>
                  </div>

                  {/* Resumo do Treino e Dieta Iniciais */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <Dumbbell className="w-4 h-4 text-emerald-400" /> Treino Inicial da Fase 1
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">
                          {detalhesProjetoFoco?.relatorio?.dossie_inicial?.treino_configurado?.divisao || projetoEmFoco.treino_vinculado_divisao || 'Divisão Personalizada'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 space-y-1">
                        <div><strong>Frequência:</strong> {detalhesProjetoFoco?.relatorio?.dossie_inicial?.treino_configurado?.dias_por_semana || 4} dias/semana ({detalhesProjetoFoco?.relatorio?.dossie_inicial?.treino_configurado?.duracao_minutos || 60} min/sessão)</div>
                        {detalhesProjetoFoco?.relatorio?.dossie_inicial?.treino_configurado?.foco && (
                          <div><strong>Foco Específico:</strong> {detalhesProjetoFoco.relatorio.dossie_inicial.treino_configurado.foco}</div>
                        )}
                        <div><strong>Volume de Partida:</strong> {faseAtivaObj?.series_trabalho_semana || 16} séries/semana • RPE {faseAtivaObj?.rpe_alvo || 7.0}</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <Utensils className="w-4 h-4 text-emerald-400" /> Dieta Inicial da Fase 1
                        </span>
                        <span className="font-mono text-emerald-400 font-bold text-xs">
                          {faseAtivaObj?.calorias_diarias || 2500} kcal/dia
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 space-y-1">
                        <div><strong>Refeições:</strong> {detalhesProjetoFoco?.relatorio?.dossie_inicial?.dieta_configurada?.num_refeicoes || 4} refeições diárias</div>
                        <div><strong>Horário de Treino:</strong> {detalhesProjetoFoco?.relatorio?.dossie_inicial?.dieta_configurada?.horario_treino || '18:00'}</div>
                        {detalhesProjetoFoco?.relatorio?.dossie_inicial?.dieta_configurada?.alimentos_preferidos && (
                          <div className="truncate"><strong>Favoritos:</strong> {detalhesProjetoFoco.relatorio.dossie_inicial.dieta_configurada.alimentos_preferidos}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
      {/* =================================================================== */}
      {/* ABA 3: CRIAR NOVO PROJETO - ASSISTENTE INTEGRADO DE 4 PASSOS */}
      {/* =================================================================== */}
      {abaPrincipal === 'novo' && (
        <div className="bg-slate-900/60 p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-6 max-w-4xl mx-auto animate-fade-in">
          {/* CABEÇALHO DO ASSISTENTE */}
          <div className="border-b border-slate-800 pb-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <FolderKanban className="w-6 h-6 text-emerald-400" />
                Assistente de Criação Integrada do Projeto
              </h2>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider">
                Ecossistema 360° (Metas + Treino + Dieta)
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-1">
              Cria o projeto fisiológico determinístico e configura de imediato o Treino e a Dieta da Fase 1, ativando tudo em simultâneo.
            </p>
          </div>

          {/* INDICADOR DE ETAPAS (STEPPER) */}
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setPassoWizard(1)}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                passoWizard === 1
                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40 shadow-md'
                  : passoWizard > 1
                  ? 'bg-slate-950 border-emerald-500/30 text-slate-300 hover:border-emerald-500/50'
                  : 'bg-slate-950/60 border-slate-800 text-slate-600'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider">
                {passoWizard > 1 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Target className="w-3.5 h-3.5" />}
                <span>Passo 1</span>
              </div>
              <div className="font-extrabold text-xs sm:text-sm text-white truncate">Metas & Fisiologia</div>
            </button>

            <button
              type="button"
              disabled={!relatorioCalculado && passoWizard < 2}
              onClick={() => { if (relatorioCalculado) setPassoWizard(2); }}
              className={`p-2.5 rounded-xl border text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                passoWizard === 2
                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40 shadow-md'
                  : passoWizard > 2
                  ? 'bg-slate-950 border-emerald-500/30 text-slate-300 hover:border-emerald-500/50'
                  : 'bg-slate-950/60 border-slate-800 text-slate-600'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider">
                {passoWizard > 2 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Dumbbell className="w-3.5 h-3.5" />}
                <span>Passo 2</span>
              </div>
              <div className="font-extrabold text-xs sm:text-sm text-white truncate">Treino Fase 1</div>
            </button>

            <button
              type="button"
              disabled={!relatorioCalculado && passoWizard < 3}
              onClick={() => { if (relatorioCalculado) setPassoWizard(3); }}
              className={`p-2.5 rounded-xl border text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                passoWizard === 3
                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40 shadow-md'
                  : passoWizard > 3
                  ? 'bg-slate-950 border-emerald-500/30 text-slate-300 hover:border-emerald-500/50'
                  : 'bg-slate-950/60 border-slate-800 text-slate-600'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider">
                {passoWizard > 3 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Utensils className="w-3.5 h-3.5" />}
                <span>Passo 3</span>
              </div>
              <div className="font-extrabold text-xs sm:text-sm text-white truncate">Dieta Fase 1</div>
            </button>

            <button
              type="button"
              disabled={!relatorioCalculado && passoWizard < 4}
              onClick={() => { if (relatorioCalculado) setPassoWizard(4); }}
              className={`p-2.5 rounded-xl border text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                passoWizard === 4
                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40 shadow-md'
                  : 'bg-slate-950/60 border-slate-800 text-slate-600'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Passo 4</span>
              </div>
              <div className="font-extrabold text-xs sm:text-sm text-white truncate">Revisão & Ativação</div>
            </button>
          </div>

          {/* ========================================================= */}
          {/* PASSO 1: METAS, BIOMETRIA, ESTRATÉGIA E LESÕES */}
          {/* ========================================================= */}
          {passoWizard === 1 && (
            <div className="space-y-5 animate-fade-in">
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
                    placeholder="Ex: Projeto Força & Definição, Preparação 80kg, etc."
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
              <div className="space-y-4 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-200">
                    Estratégia Fisiológica & Periodização:
                  </label>
                  <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                    {Number(pesoAlvo) > Number(pesoAtual)
                      ? '🎯 Meta de Ganho de Massa'
                      : Number(pesoAlvo) < Number(pesoAtual)
                        ? '🎯 Meta de Perda de Gordura'
                        : '🎯 Meta de Recomposição'}
                  </span>
                </div>

                {/* CENÁRIO 1: GANHAR PESO */}
                {Number(pesoAlvo) > Number(pesoAtual) && (
                  <div className="space-y-2.5">
                    <label className={`block p-3.5 rounded-xl border cursor-pointer transition-all ${
                      estrategiaInicial === 'bulk_cut_atletico'
                        ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="estrategia"
                            value="bulk_cut_atletico"
                            checked={estrategiaInicial === 'bulk_cut_atletico'}
                            onChange={() => setEstrategiaInicial('bulk_cut_atletico')}
                            className="accent-emerald-500 mt-0.5"
                          />
                          <span className="text-xs font-bold text-white">
                            🏆 Bulk & Cut Atlético (Ganho de Força + Queima Final de Gordura)
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold shrink-0">
                          Atletas / Estética Máxima
                        </span>
                      </div>
                      <div className="pl-6 mt-1.5 space-y-1">
                        <p className="text-xs text-slate-300 font-medium">
                          Constrói o máximo de massa muscular subindo até aos {Number(pesoAlvo) + 3}kg com lastro anabólico, seguido de um corte rápido de gordura para terminares nos {pesoAlvo}kg seco e com abdominais visíveis.
                        </p>
                        <p className="text-[11px] text-slate-400">
                          💡 <strong className="text-slate-300">Em termos simples:</strong> Ganhas volume muscular com sobra de energia e depois queimas a gordura acumulada, garantindo que o peso final é puro músculo.
                        </p>
                      </div>
                    </label>

                    <label className={`block p-3.5 rounded-xl border cursor-pointer transition-all ${
                      estrategiaInicial === 'bulk_linear' || estrategiaInicial === 'lean_bulk_linear' || estrategiaInicial === 'bulk_direto'
                        ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="estrategia"
                            value="bulk_linear"
                            checked={estrategiaInicial === 'bulk_linear' || estrategiaInicial === 'lean_bulk_linear' || estrategiaInicial === 'bulk_direto'}
                            onChange={() => setEstrategiaInicial('bulk_linear')}
                            className="accent-emerald-500 mt-0.5"
                          />
                          <span className="text-xs font-bold text-white">
                            🟢 Bulk Linear (Subida Direta até à Meta)
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold shrink-0">
                          Subida Direta
                        </span>
                      </div>
                      <div className="pl-6 mt-1.5 space-y-1">
                        <p className="text-xs text-slate-300 font-medium">
                          Subida contínua de peso direto até aos {pesoAlvo}kg. Podes definir a velocidade semanal logo abaixo (de um ganho limpo/lean até um ganho mais rápido/pesado).
                        </p>
                        <p className="text-[11px] text-slate-400">
                          💡 <strong className="text-slate-300">Em termos simples:</strong> Ganhas peso sem oscilações até à meta, escolhendo no seletor abaixo se queres subir devagar e limpo ou de forma mais rápida.
                        </p>
                      </div>
                    </label>

                    <label className={`block p-3.5 rounded-xl border cursor-pointer transition-all ${
                      estrategiaInicial === 'retorno_reabilitacao_bulk'
                        ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="estrategia"
                            value="retorno_reabilitacao_bulk"
                            checked={estrategiaInicial === 'retorno_reabilitacao_bulk'}
                            onChange={() => setEstrategiaInicial('retorno_reabilitacao_bulk')}
                            className="accent-emerald-500 mt-0.5"
                          />
                          <span className="text-xs font-bold text-white">
                            🛡️ Retorno & Reabilitação + Bulk (Readaptação Articular Inicial)
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[10px] font-bold shrink-0">
                          Pós-Lesão ou Paragem
                        </span>
                      </div>
                      <div className="pl-6 mt-1.5 space-y-1">
                        <p className="text-xs text-slate-300 font-medium">
                          Inicia com 4 a 6 semanas no teu peso atual ({pesoAtual}kg, RPE ≤ 7.0, proteção de tendões e manguito) antes de iniciar a subida progressiva de cargas e calorias.
                        </p>
                        <p className="text-[11px] text-slate-400">
                          💡 <strong className="text-slate-300">Em termos simples:</strong> Se estiveste lesionado ou parado há meses, o corpo reaprende os movimentos e lubrifica as articulações antes de puxar peso pesado.
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                {/* CENÁRIO 2: PERDER PESO */}
                {Number(pesoAlvo) < Number(pesoAtual) && (
                  <div className="space-y-2.5">
                    <label className={`block p-3.5 rounded-xl border cursor-pointer transition-all ${
                      estrategiaInicial === 'cut_com_diet_breaks' || estrategiaInicial === 'cut' || estrategiaInicial === 'recomposicao'
                        ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="estrategia"
                            value="cut_com_diet_breaks"
                            checked={estrategiaInicial === 'cut_com_diet_breaks' || estrategiaInicial === 'cut' || estrategiaInicial === 'recomposicao'}
                            onChange={() => setEstrategiaInicial('cut_com_diet_breaks')}
                            className="accent-emerald-500 mt-0.5"
                          />
                          <span className="text-xs font-bold text-white">
                            🟢 Cutting Estruturado com Diet Breaks (Perda de Gordura com Pausas)
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold shrink-0">
                          Recomendado / Preserva Músculo
                        </span>
                      </div>
                      <div className="pl-6 mt-1.5 space-y-1">
                        <p className="text-xs text-slate-300 font-medium">
                          Défice calórico seguro para queimar gordura com semanas programadas de descanso alimentar em manutenção para reativar o metabolismo e proteger a massa muscular.
                        </p>
                        <p className="text-[11px] text-slate-400">
                          💡 <strong className="text-slate-300">Em termos simples:</strong> Emagreces sem desacelerar a tiróide nem perder força. As pausas impedem que o teu corpo estagne.
                        </p>
                      </div>
                    </label>

                    <label className={`block p-3.5 rounded-xl border cursor-pointer transition-all ${
                      estrategiaInicial === 'cut_direto'
                        ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="estrategia"
                            value="cut_direto"
                            checked={estrategiaInicial === 'cut_direto'}
                            onChange={() => setEstrategiaInicial('cut_direto')}
                            className="accent-emerald-500 mt-0.5"
                          />
                          <span className="text-xs font-bold text-white">
                            ⚡ Cutting Linear Direto (Défice Contínuo)
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold shrink-0">
                          Definição Mais Rápida
                        </span>
                      </div>
                      <div className="pl-6 mt-1.5 space-y-1">
                        <p className="text-xs text-slate-300 font-medium">
                          Défice contínuo linear sem interrupções até atingir os {pesoAlvo}kg. Redução de peso focada e objetiva.
                        </p>
                        <p className="text-[11px] text-slate-400">
                          💡 <strong className="text-slate-300">Em termos simples:</strong> Se tens um prazo ou queres atingir a meta mais rapidamente, este plano mantém o défice direto semana após semana.
                        </p>
                      </div>
                    </label>

                    <label className={`block p-3.5 rounded-xl border cursor-pointer transition-all ${
                      estrategiaInicial === 'retorno_reabilitacao_cut'
                        ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="estrategia"
                            value="retorno_reabilitacao_cut"
                            checked={estrategiaInicial === 'retorno_reabilitacao_cut'}
                            onChange={() => setEstrategiaInicial('retorno_reabilitacao_cut')}
                            className="accent-emerald-500 mt-0.5"
                          />
                          <span className="text-xs font-bold text-white">
                            🛡️ Retorno & Reabilitação + Cutting (Readaptação Articular Prévia)
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[10px] font-bold shrink-0">
                          Recuperação + Definição
                        </span>
                      </div>
                      <div className="pl-6 mt-1.5 space-y-1">
                        <p className="text-xs text-slate-300 font-medium">
                          Fase preparatória de 4 semanas no peso atual para recuperar mobilidade articular e tônus motor antes de iniciar o corte calórico.
                        </p>
                        <p className="text-[11px] text-slate-400">
                          💡 <strong className="text-slate-300">Em termos simples:</strong> Evita dores ou lesões ao voltar a treinar em défice. O corpo fortalece-se primeiro e emagrece a seguir.
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                {/* CENÁRIO 3: MANTER PESO / RECOMPOSIÇÃO */}
                {Number(pesoAlvo) === Number(pesoAtual) && (
                  <div className="space-y-2.5">
                    <label className={`block p-3.5 rounded-xl border cursor-pointer transition-all ${
                      estrategiaInicial === 'recomposicao'
                        ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="estrategia"
                            value="recomposicao"
                            checked={estrategiaInicial === 'recomposicao'}
                            onChange={() => setEstrategiaInicial('recomposicao')}
                            className="accent-emerald-500 mt-0.5"
                          />
                          <span className="text-xs font-bold text-white">
                            🔄 Recomposição Corporal Pura (Trocar Gordura por Músculo)
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold shrink-0">
                          Mesmo Peso / Mais Seco
                        </span>
                      </div>
                      <div className="pl-6 mt-1.5 space-y-1">
                        <p className="text-xs text-slate-300 font-medium">
                          Mantém exatamente os {pesoAtual}kg na balança, queimando gordura e construindo massa magra simultaneamente através de calorias isocalóricas e alta proteína.
                        </p>
                        <p className="text-[11px] text-slate-400">
                          💡 <strong className="text-slate-300">Em termos simples:</strong> O teu peso não mexe, mas a tua cintura diminui e os teus ombros e braços ficam mais densos e definidos.
                        </p>
                      </div>
                    </label>

                    <label className={`block p-3.5 rounded-xl border cursor-pointer transition-all ${
                      estrategiaInicial === 'readaptacao_retorno'
                        ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="estrategia"
                            value="readaptacao_retorno"
                            checked={estrategiaInicial === 'readaptacao_retorno'}
                            onChange={() => setEstrategiaInicial('readaptacao_retorno')}
                            className="accent-emerald-500 mt-0.5"
                          />
                          <span className="text-xs font-bold text-white">
                            🛡️ Readaptação Neuromuscular & Proteção Articular
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[10px] font-bold shrink-0">
                          Pós-Lesão ou Paragem
                        </span>
                      </div>
                      <div className="pl-6 mt-1.5 space-y-1">
                        <p className="text-xs text-slate-300 font-medium">
                          Recuperação do padrão motor, tendões e mobilidade sob esforço controlado (RPE ≤ 7.0) sem mexer no peso corporal.
                        </p>
                        <p className="text-[11px] text-slate-400">
                          💡 <strong className="text-slate-300">Em termos simples:</strong> Voltar a treinar sem dores nos ombros, costas ou joelhos, preparando as estruturas para quando quiseres evoluir.
                        </p>
                      </div>
                    </label>

                    <label className={`block p-3.5 rounded-xl border cursor-pointer transition-all ${
                      estrategiaInicial === 'manutencao_metabolica'
                        ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="estrategia"
                            value="manutencao_metabolica"
                            checked={estrategiaInicial === 'manutencao_metabolica'}
                            onChange={() => setEstrategiaInicial('manutencao_metabolica')}
                            className="accent-emerald-500 mt-0.5"
                          />
                          <span className="text-xs font-bold text-white">
                            ⚡ Manutenção Metabólica & Performance
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-bold shrink-0">
                          Estabilidade & Força
                        </span>
                      </div>
                      <div className="pl-6 mt-1.5 space-y-1">
                        <p className="text-xs text-slate-300 font-medium">
                          Fixação rígida do peso corporal para maximizar a energia nos treinos diários, recuperação e rendimento desportivo sustentável.
                        </p>
                        <p className="text-[11px] text-slate-400">
                          💡 <strong className="text-slate-300">Em termos simples:</strong> Nem secar nem engordar. Comer bem, recuperar a 100% e treinar com energia máxima no ginásio.
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                {/* SELETOR DE RITMO SEMANAL */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-emerald-400" />
                      Velocidade do Ritmo Semanal (kg/semana):
                    </label>
                    <div className="flex items-center gap-2">
                      {Number(pesoAlvo) > Number(pesoAtual) && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          taxaSemanalAlvo <= 0.35
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                            : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                        }`}>
                          {taxaSemanalAlvo <= 0.20 ? 'Lean Bulk (Ultra-Limpo)' : taxaSemanalAlvo <= 0.35 ? 'Lean Bulk (Recomendado)' : taxaSemanalAlvo <= 0.50 ? 'Bulk Moderado' : 'Bulk Agressivo / Pesado'}
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black">
                        {Number(pesoAlvo) > Number(pesoAtual)
                          ? `+${taxaSemanalAlvo.toFixed(2)} kg/sem`
                          : Number(pesoAlvo) < Number(pesoAtual)
                            ? `-${Math.abs(taxaSemanalAlvo).toFixed(2)} kg/sem`
                            : '0.00 kg/sem (Estável)'}
                      </span>
                    </div>
                  </div>

                  {Number(pesoAlvo) > Number(pesoAtual) ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => { setTaxaSemanalAlvo(0.15); setModoTaxaPersonalizada(false); }}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            taxaSemanalAlvo === 0.15 && !modoTaxaPersonalizada
                              ? 'bg-emerald-950/60 border-emerald-500 ring-1 ring-emerald-500/40'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="text-[11px] font-bold text-white">+0.15 kg/sem</div>
                          <div className="text-[10px] text-emerald-400 font-semibold">Lean Ultra-Limpo</div>
                          <div className="text-[9px] text-slate-400 mt-0.5">~+150 kcal/dia · Músculo</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setTaxaSemanalAlvo(0.30); setModoTaxaPersonalizada(false); }}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            taxaSemanalAlvo === 0.30 && !modoTaxaPersonalizada
                              ? 'bg-emerald-950/60 border-emerald-500 ring-1 ring-emerald-500/40'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="text-[11px] font-bold text-white">+0.30 kg/sem</div>
                          <div className="text-[10px] text-emerald-400 font-semibold">⭐ Lean Padrão</div>
                          <div className="text-[9px] text-slate-400 mt-0.5">~+300 kcal/dia · Equilíbrio</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setTaxaSemanalAlvo(0.50); setModoTaxaPersonalizada(false); }}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            taxaSemanalAlvo === 0.50 && !modoTaxaPersonalizada
                              ? 'bg-emerald-950/60 border-emerald-500 ring-1 ring-emerald-500/40'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="text-[11px] font-bold text-white">+0.50 kg/sem</div>
                          <div className="text-[10px] text-amber-400 font-semibold">🔥 Bulk Agressivo</div>
                          <div className="text-[9px] text-slate-400 mt-0.5">~+500 kcal/dia · Hardgainer</div>
                        </button>
                      </div>

                      <div className="pt-2 border-t border-slate-800/60">
                        <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
                          <span className="font-semibold">Ajuste fino personalizado:</span>
                          <span className="font-mono text-emerald-400 font-bold">+{taxaSemanalAlvo.toFixed(2)} kg/semana</span>
                        </div>
                        <input
                          type="range"
                          min="0.10"
                          max="0.75"
                          step="0.05"
                          value={taxaSemanalAlvo}
                          onChange={(e) => {
                            setTaxaSemanalAlvo(parseFloat(e.target.value));
                            setModoTaxaPersonalizada(true);
                          }}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                        {taxaSemanalAlvo > 0.35 ? (
                          <p className="text-[10px] text-amber-300/90 mt-1 flex items-center gap-1">
                            ⚠️ <span>Ritmo acima de 0.35 kg/sem: ultrapassa o teto natural de síntese de músculo (~0.25 kg/sem); é esperado ganho associado de gordura.</span>
                          </p>
                        ) : (
                          <p className="text-[10px] text-emerald-400/90 mt-1 flex items-center gap-1">
                            ✓ <span>Ritmo Lean (Limpo): focado em ganho máximo de massa muscular com acumulação mínima de gordura.</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ) : Number(pesoAlvo) < Number(pesoAtual) ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => { setTaxaSemanalAlvo(0.35); setModoTaxaPersonalizada(false); }}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            taxaSemanalAlvo === 0.35 && !modoTaxaPersonalizada
                              ? 'bg-emerald-950/60 border-emerald-500 ring-1 ring-emerald-500/40'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="text-[11px] font-bold text-white">-0.35 kg/sem</div>
                          <div className="text-[10px] text-emerald-400 font-semibold">Preservação</div>
                          <div className="text-[9px] text-slate-400 mt-0.5">~-350 kcal/dia</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setTaxaSemanalAlvo(0.50); setModoTaxaPersonalizada(false); }}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            taxaSemanalAlvo === 0.50 && !modoTaxaPersonalizada
                              ? 'bg-emerald-950/60 border-emerald-500 ring-1 ring-emerald-500/40'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="text-[11px] font-bold text-white">-0.50 kg/sem</div>
                          <div className="text-[10px] text-emerald-400 font-semibold">⭐ Padrão Ouro</div>
                          <div className="text-[9px] text-slate-400 mt-0.5">~-500 kcal/dia</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setTaxaSemanalAlvo(0.75); setModoTaxaPersonalizada(false); }}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            taxaSemanalAlvo === 0.75 && !modoTaxaPersonalizada
                              ? 'bg-emerald-950/60 border-emerald-500 ring-1 ring-emerald-500/40'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="text-[11px] font-bold text-white">-0.75 kg/sem</div>
                          <div className="text-[10px] text-amber-400 font-semibold">⚡ Acelerado</div>
                          <div className="text-[9px] text-slate-400 mt-0.5">~-750 kcal/dia</div>
                        </button>
                      </div>

                      <div className="pt-2 border-t border-slate-800/60">
                        <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
                          <span className="font-semibold">Ajuste fino personalizado:</span>
                          <span className="font-mono text-emerald-400 font-bold">-{taxaSemanalAlvo.toFixed(2)} kg/semana</span>
                        </div>
                        <input
                          type="range"
                          min="0.20"
                          max="1.10"
                          step="0.05"
                          value={taxaSemanalAlvo}
                          onChange={(e) => {
                            setTaxaSemanalAlvo(parseFloat(e.target.value));
                            setModoTaxaPersonalizada(true);
                          }}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Em recomposição ou manutenção o peso alvo semanal é de <strong>0.00 kg</strong> (isocalórico).</span>
                    </div>
                  )}
                </div>
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

              {/* BOTÃO DO PASSO 1: CALCULAR E AVANÇAR */}
              <button
                type="button"
                onClick={handleAvancarParaPasso2Treino}
                disabled={calculando}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 text-sm active:scale-98"
              >
                {calculando ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>A calcular trajetória e periodização...</span>
                  </>
                ) : (
                  <>
                    <span>Avançar para o Treino da Fase 1</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* ========================================================= */}
          {/* PASSO 2: TREINO DA FASE 1 (HERDADO & CONFIGURADO) */}
          {/* ========================================================= */}
          {passoWizard === 2 && (
            <div className="space-y-5 animate-fade-in">
              {/* BANNER DE CONTEXTO DA FASE 1 HERDADA */}
              <div className="p-4 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 rounded-xl border border-emerald-500/40 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-xs font-black uppercase">
                      Fase 1 Inicial
                    </span>
                    <h3 className="font-extrabold text-white text-sm">
                      {relatorioCalculado?.fases?.[0]?.nome_exibicao || 'Fase 1'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    Duração: {relatorioCalculado?.fases?.[0]?.duracao_semanas || 4} semanas
                  </span>
                </div>
                <div className="text-xs text-slate-300 grid grid-cols-3 gap-2 pt-1 border-t border-slate-800">
                  <div><strong>Volume Alvo:</strong> {relatorioCalculado?.fases?.[0]?.series_trabalho_semana || 16} séries/sem</div>
                  <div><strong>Esforço:</strong> RPE ≤ {relatorioCalculado?.fases?.[0]?.rpe_alvo || 7.0}</div>
                  <div><strong>Cardio:</strong> {relatorioCalculado?.fases?.[0]?.cardio_minutos_semana || 60} min/sem</div>
                </div>
                {observacoesContexto && (
                  <div className="p-2.5 bg-slate-950/80 rounded-lg border border-amber-500/30 text-[11px] text-amber-200 flex items-start gap-2 mt-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block">Salvaguardas Articulares Ativas:</strong>
                      <span>{observacoesContexto}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* PREFERÊNCIAS DO ATLETA PARA O TREINO */}
              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-4">
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-emerald-400" /> Preferências de Treino:
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Frequência Semanal:</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[3, 4, 5, 6].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDiasSemanaTreino(d)}
                          className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                            diasSemanaTreino === d
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          {d} Dias
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Duração por Sessão:</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[45, 60, 75, 90].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setTempoSessaoTreino(m)}
                          className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                            tempoSessaoTreino === m
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          {m} min
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Divisão Preferida:</label>
                    <select
                      value={divisaoTreino}
                      onChange={(e) => setDivisaoTreino(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-bold focus:border-emerald-500"
                    >
                      <option value="Push / Pull / Legs (PPL)">Push / Pull / Legs (PPL)</option>
                      <option value="Upper / Lower">Upper / Lower (Superior / Inferior)</option>
                      <option value="Full Body">Full Body (Corpo Inteiro)</option>
                      <option value="ABCDE (Isolada)">ABCDE (Grupos Isolados)</option>
                      <option value="Recomendada pela IA">Deixar a IA Escolher a Melhor Divisão</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Equipamentos Disponíveis:</label>
                    <select
                      value={equipamentosTreino}
                      onChange={(e) => setEquipamentosTreino(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-bold focus:border-emerald-500"
                    >
                      <option value="completo">Ginásio Comercial Completo</option>
                      <option value="halteres_banco">Halteres + Banco Ajustável em Casa</option>
                      <option value="corporal_calistenia">Apenas Peso Corporal / Calistenia</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Foco Prioritário / Pontos Fracos (Opcional):
                  </label>
                  <input
                    type="text"
                    value={pontosFracosTreino}
                    onChange={(e) => setPontosFracosTreino(e.target.value)}
                    placeholder="Ex: Peitoral superior, deltóide lateral, mobilidade escapular..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                {/* BOTÃO GERAR COM IA */}
                <button
                  type="button"
                  onClick={() => executarGeracaoTreinoFase1()}
                  disabled={gerandoTreinoIA}
                  className="w-full py-3 bg-gradient-to-r from-emerald-950 to-teal-950 hover:from-emerald-900 hover:to-teal-900 border border-emerald-500/50 text-emerald-300 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition"
                >
                  {gerandoTreinoIA ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>A prescrever treino da Fase 1 adaptado às lesões...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>{planoTreinoGerado ? 'Regenerar Treino da Fase 1' : 'Gerar Treino da Fase 1 com IA'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* PRÉ-VISUALIZAÇÃO DO TREINO GERADO */}
              {planoTreinoGerado && (
                <div className="p-4 bg-slate-950 rounded-xl border border-emerald-500/40 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div>
                      <span className="text-[10px] text-emerald-400 font-black uppercase">Treino Prescrito da Fase 1</span>
                      <h4 className="text-sm font-extrabold text-white">{planoTreinoGerado.nome_divisao}</h4>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold">
                      {planoTreinoGerado.sessoes?.length || diasSemanaTreino} Sessões Prontas
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                    {planoTreinoGerado.sessoes?.map((sessao: any, sIdx: number) => (
                      <div key={sIdx} className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-white">
                          <span>{sessao.nome || `Sessão ${String.fromCharCode(65 + sIdx)}`}</span>
                          <span className="text-[10px] text-emerald-400 font-normal">{sessao.foco || ''}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 space-y-0.5">
                          {sessao.exercicios?.slice(0, 4).map((ex: any, eIdx: number) => (
                            <div key={eIdx} className="truncate">
                              • <span className="text-slate-300 font-semibold">{ex.nome}</span> ({ex.series}×{ex.repeticoes_alvo || '8-12'})
                            </div>
                          ))}
                          {sessao.exercicios && sessao.exercicios.length > 4 && (
                            <div className="text-[10px] text-slate-500 italic">+ {sessao.exercicios.length - 4} outros exercícios</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* NAVEGAÇÃO DO PASSO 2 */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPassoWizard(1)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar às Metas</span>
                </button>

                <button
                  type="button"
                  onClick={handleAvancarParaPasso3Dieta}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black rounded-xl shadow-lg shadow-emerald-600/20 text-xs flex items-center gap-2 transition active:scale-98"
                >
                  <span>Avançar para a Dieta da Fase 1</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PASSO 3: DIETA DA FASE 1 (HERDADA & CONFIGURADA) */}
          {/* ========================================================= */}
          {passoWizard === 3 && (
            <div className="space-y-5 animate-fade-in">
              {/* BANNER NUTRICIONAL DA FASE 1 */}
              <div className="p-4 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 rounded-xl border border-emerald-500/40 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-xs font-black uppercase">
                      Meta Nutricional da Fase 1
                    </span>
                    <h3 className="font-extrabold text-white text-sm">
                      {relatorioCalculado?.fases?.[0]?.calorias_diarias || 2500} kcal/dia
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    Alinhado ao ritmo de {taxaSemanalAlvo > 0 ? `+${taxaSemanalAlvo.toFixed(2)}` : taxaSemanalAlvo < 0 ? `-${Math.abs(taxaSemanalAlvo).toFixed(2)}` : '0.00'} kg/sem
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  As calorias e os macronutrientes da Fase 1 foram calibrados automaticamente pelo motor fisiológico para garantir o superávit/défice exato da tua estratégia.
                </p>
              </div>

              {/* PREFERÊNCIAS ALIMENTARES */}
              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-4">
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-emerald-400" /> Preferências de Refeições & Horários:
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Número de Refeições Diárias:</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[3, 4, 5, 6].map((nr) => (
                        <button
                          key={nr}
                          type="button"
                          onClick={() => setNumRefeicoesDieta(nr)}
                          className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                            numRefeicoesDieta === nr
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          {nr} Refeições
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Horário de Treino Habitual:</label>
                    <select
                      value={horarioTreinoDieta}
                      onChange={(e) => setHorarioTreinoDieta(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-bold focus:border-emerald-500"
                    >
                      <option value="07:00">Manhã Cedo (07:00)</option>
                      <option value="12:30">Hora de Almoço (12:30)</option>
                      <option value="18:00">Fim de Tarde (18:00 - Padrão)</option>
                      <option value="20:30">Noite (20:30)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Alimentos Preferidos (A IA incluirá estes alimentos):
                  </label>
                  <textarea
                    rows={2}
                    value={alimentosPreferidosDieta}
                    onChange={(e) => setAlimentosPreferidosDieta(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white resize-none"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400">Adicionar favorito:</span>
                    {['Frango', 'Ovos', 'Arroz', 'Aveia', 'Banana', 'Whey Protein', 'Batata doce', 'Azeite'].map((fav) => (
                      <button
                        key={fav}
                        type="button"
                        onClick={() => {
                          if (!alimentosPreferidosDieta.includes(fav)) {
                            setAlimentosPreferidosDieta((prev) => prev ? `${prev}, ${fav}` : fav);
                          }
                        }}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                      >
                        + {fav}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Alimentos a Evitar ou Alergias/Intolerâncias:
                  </label>
                  <input
                    type="text"
                    value={alimentosEvitadosDieta}
                    onChange={(e) => setAlimentosEvitadosDieta(e.target.value)}
                    placeholder="Ex: Sem lactose, sem marisco, sem porco..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>

                {/* BOTÃO GERAR DIETA COM IA */}
                <button
                  type="button"
                  onClick={() => executarGeracaoDietaFase1()}
                  disabled={gerandoDietaIA}
                  className="w-full py-3 bg-gradient-to-r from-emerald-950 to-teal-950 hover:from-emerald-900 hover:to-teal-900 border border-emerald-500/50 text-emerald-300 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition"
                >
                  {gerandoDietaIA ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>A prescrever refeições e quantidades exatas...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>{planoDietaGerado ? 'Regenerar Refeições da Fase 1' : 'Gerar Refeições da Fase 1 com IA'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* PRÉ-VISUALIZAÇÃO DA DIETA GERADA */}
              {planoDietaGerado && (
                <div className="p-4 bg-slate-950 rounded-xl border border-emerald-500/40 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div>
                      <span className="text-[10px] text-emerald-400 font-black uppercase">Plano Nutricional da Fase 1</span>
                      <h4 className="text-sm font-extrabold text-white">{planoDietaGerado.nome || 'Dieta Personalizada'}</h4>
                    </div>
                    <span className="font-mono text-emerald-400 font-black text-xs">
                      {Math.round(planoDietaGerado.calorias || 2500)} kcal/dia
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                    {planoDietaGerado.refeicoes?.map((ref: any, rIdx: number) => (
                      <div key={rIdx} className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-white">
                          <span>{ref.nome}</span>
                          <span className="text-[10px] text-emerald-400 font-mono">{ref.horario || ''}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 space-y-0.5">
                          {ref.alimentos?.slice(0, 3).map((a: any, aIdx: number) => (
                            <div key={aIdx} className="truncate">
                              • <span className="text-slate-300 font-medium">{a.nome}</span> ({a.quantidade_g ? `${a.quantidade_g}g` : a.porcao || ''})
                            </div>
                          ))}
                          {ref.alimentos && ref.alimentos.length > 3 && (
                            <div className="text-[10px] text-slate-500 italic">+ {ref.alimentos.length - 3} outros itens</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* NAVEGAÇÃO DO PASSO 3 */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPassoWizard(2)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar ao Treino</span>
                </button>

                <button
                  type="button"
                  onClick={handleAvancarParaPasso4Revisao}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black rounded-xl shadow-lg shadow-emerald-600/20 text-xs flex items-center gap-2 transition active:scale-98"
                >
                  <span>Avançar para Revisão & Ativação</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PASSO 4: REVISÃO & ATIVAÇÃO COMPLETA DO ECOSSISTEMA */}
          {/* ========================================================= */}
          {passoWizard === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-4 bg-emerald-950/30 rounded-xl border border-emerald-500/40 text-center space-y-1">
                <span className="px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase">
                  Ecossistema Pronto para Lançamento
                </span>
                <h3 className="text-lg font-black text-white">Revisão Integrada do Novo Projeto</h3>
                <p className="text-xs text-slate-300 max-w-xl mx-auto">
                  Ao clicares no botão de ativação abaixo, o sistema guardará e ativará em sincronia os 3 pilares da tua jornada.
                </p>
              </div>

              {/* OS 3 PILARES CONSOLIDADOS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* PILAR 1: PROJETO & METAS */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Target className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white uppercase">1. Metas & Fisiologia</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div><strong>Nome:</strong> {nomeProjetoInput.trim() || `Projeto ${pesoAtual}kg ➔ ${pesoAlvo}kg`}</div>
                    <div><strong>Trajetória:</strong> {pesoAtual}kg ➔ {pesoAlvo}kg ({Number(pesoAlvo) > Number(pesoAtual) ? `+${(Number(pesoAlvo) - Number(pesoAtual)).toFixed(1)}kg` : `-${(Number(pesoAtual) - Number(pesoAlvo)).toFixed(1)}kg`})</div>
                    <div><strong>BF:</strong> {bfAtual}% ➔ {bfAlvo}% Seco</div>
                    <div><strong>Estratégia:</strong> <span className="capitalize">{estrategiaInicial.replace(/_/g, ' ')}</span></div>
                    <div><strong>Ritmo:</strong> {taxaSemanalAlvo > 0 ? `+${taxaSemanalAlvo.toFixed(2)}` : taxaSemanalAlvo < 0 ? `-${Math.abs(taxaSemanalAlvo).toFixed(2)}` : '0.00'} kg/sem</div>
                    <div><strong>Duração:</strong> {relatorioCalculado?.semanas_totais_estimadas || 12} semanas ({relatorioCalculado?.fases?.length || 1} fases)</div>
                    {observacoesContexto && (
                      <div className="text-[11px] text-amber-300/90 pt-1 border-t border-slate-900 truncate">
                        🛡️ Lesões: {observacoesContexto}
                      </div>
                    )}
                  </div>
                </div>

                {/* PILAR 2: TREINO DA FASE 1 */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Dumbbell className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white uppercase">2. Treino Fase 1</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div><strong>Divisão:</strong> {planoTreinoGerado?.nome_divisao || divisaoTreino}</div>
                    <div><strong>Frequência:</strong> {diasSemanaTreino} dias/semana ({tempoSessaoTreino} min)</div>
                    <div><strong>Sessões Prontas:</strong> {planoTreinoGerado?.sessoes?.length || diasSemanaTreino} sessões</div>
                    <div><strong>Volume Semanal:</strong> {relatorioCalculado?.fases?.[0]?.series_trabalho_semana || 16} séries de trabalho</div>
                    <div><strong>Esforço Alvo:</strong> RPE ≤ {relatorioCalculado?.fases?.[0]?.rpe_alvo || 7.0}</div>
                    <div className="text-[11px] text-emerald-400/90 pt-1 border-t border-slate-900">
                      ✓ Ângulos e cargas adaptados às tuas limitações
                    </div>
                  </div>
                </div>

                {/* PILAR 3: DIETA DA FASE 1 */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Utensils className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white uppercase">3. Dieta Fase 1</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div><strong>Energia:</strong> <span className="font-mono text-emerald-400 font-bold">{Math.round(planoDietaGerado?.calorias || relatorioCalculado?.fases?.[0]?.calorias_diarias || 2500)} kcal/dia</span></div>
                    <div><strong>Refeições:</strong> {numRefeicoesDieta} refeições distribuídas</div>
                    <div><strong>Horário de Treino:</strong> {horarioTreinoDieta}</div>
                    <div className="text-[11px] text-slate-400 truncate">
                      <strong>Favoritos:</strong> {alimentosPreferidosDieta || 'Variados'}
                    </div>
                    <div className="text-[11px] text-emerald-400/90 pt-1 border-t border-slate-900">
                      ✓ Refeições e gramas calculadas pela IA
                    </div>
                  </div>
                </div>
              </div>

              {/* OPÇÃO DE ATIVAÇÃO IMEDIATA */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <label className="flex items-center gap-2.5 text-xs text-slate-300 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ativarImediatamente}
                    onChange={(e) => setAtivarImediatamente(e.target.checked)}
                    className="accent-emerald-500 w-4 h-4 rounded"
                  />
                  <span>Definir logo como <strong>Projeto Ativo</strong> (comanda os check-ins semanais e o painel de treinos diários)</span>
                </label>
              </div>

              {/* BOTÃO MESTRE DE ATIVAÇÃO TOTAL */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleAtivarEcossistemaCompleto}
                  disabled={ativandoEcossistema}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black rounded-xl shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2.5 text-base active:scale-98"
                >
                  {ativandoEcossistema ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>A guardar projeto, treino e dieta em simultâneo...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 fill-slate-950" />
                      <span>Confirmar e Ativar Ecossistema Completo (Projeto + Treino + Dieta)</span>
                    </>
                  )}
                </button>

                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={() => setPassoWizard(3)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar à Dieta</span>
                  </button>
                </div>
              </div>
            </div>
          )}
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
