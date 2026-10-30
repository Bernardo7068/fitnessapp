import React, { useState, useEffect, useRef } from 'react';
import {
  Dumbbell, Plus, Trash2, Clock, CheckCircle2, Play, TrendingUp, RefreshCw, Sliders,
  Sparkles, AlertTriangle, ShieldCheck, Save, CheckSquare, Square,
  Timer, Flame, History, Award, X, Calendar, Edit3, Check, FileText, ChevronDown, Target, Zap, ArrowRightLeft
} from 'lucide-react';
import { ServicoApi } from '../servicos/api';
import { PainelMemoriaIA } from './PainelMemoriaIA';
import {
  PlanoTreinoCompleto, SessaoTreino, ExercicioTreino,
  RecomendacaoTreinoIAResposta, RegistoTreinoHistoricoItem, PerfilUtilizador,
  ProgressoExercicioItem, MapaProgressoExercicios
} from '../tipos/fitness';

interface SerieAoVivo {
  numero_serie: number;
  carga_kg: number;
  repeticoes: number;
  rpe: number;
  concluida: boolean;
}

interface ExercicioAoVivo {
  id_exercicio: string;
  nome: string;
  grupo_muscular_primario: string;
  descanso_segundos: number;
  series: SerieAoVivo[];
  notas?: string;
}

export const GestorTreinos: React.FC = () => {
  const [carregando, setCarregando] = useState<boolean>(true);
  const [plano, setPlano] = useState<PlanoTreinoCompleto | null>(null);
  const [catalogo, setCatalogo] = useState<any[]>([]);
  const [sessaoAtivaIndex, setSessaoAtivaIndex] = useState<number>(0);
  const [mensagemSucesso, setMensagemSucesso] = useState<string>('');
  const [perfil, setPerfil] = useState<PerfilUtilizador | null>(null);
  const [alteracoesPendentes, setAlteracoesPendentes] = useState<boolean>(false);

  // Formulário para Adicionar Exercício Personalizado (Escrever Nome & Parâmetros)
  const [mostrarFormCustomEx, setMostrarFormCustomEx] = useState<boolean>(false);
  const [novoExNome, setNovoExNome] = useState<string>('');
  const [novoExGrupo, setNovoExGrupo] = useState<string>('peito');
  const [novoExSeries, setNovoExSeries] = useState<number>(3);
  const [novoExReps, setNovoExReps] = useState<string>('8-12');
  const [novoExDescanso, setNovoExDescanso] = useState<number>(90);
  const [novoExRpe, setNovoExRpe] = useState<number>(8.5);

  // Modal para Adicionar Novo Dia de Treino
  const [mostrarModalNovoDia, setMostrarModalNovoDia] = useState<boolean>(false);
  const [novoDiaNome, setNovoDiaNome] = useState<string>('');
  const [novoDiaFoco, setNovoDiaFoco] = useState<string>('');
  const [novoDiaMinutos, setNovoDiaMinutos] = useState<number>(60);

  // Parâmetros do Gerador Clássico
  const [diasSemana, setDiasSemana] = useState<number>(4);
  const [tempoSessao, setTempoSessao] = useState<number>(60);
  const [nivelExperiencia, setNivelExperiencia] = useState<string>('intermediario');
  const [gerando, setGerando] = useState<boolean>(false);

  // Modal / Prescrição com IA
  const [mostrarModalIA, setMostrarModalIA] = useState<boolean>(false);
  const [gerandoIA, setGerandoIA] = useState<boolean>(false);
  const [lesoesIA, setLesoesIA] = useState<string>('');
  const [pontosFracosIA, setPontosFracosIA] = useState<string>('');
  const [limitacoesIA, setLimitacoesIA] = useState<string>('');
  const [objetivoIA, setObjetivoIA] = useState<string>('hipertrofia');
  const [objetivosDetalhadosIA, setObjetivosDetalhadosIA] = useState<string>('Máxima hipertrofia, mas com foco em força pesada nos 3 grandes (Supino, Agachamento e Peso Morto)');
  const [atividadesSecundariasIA, setAtividadesSecundariasIA] = useState<string>('Boxe 1x por semana, Corrida 2x por semana');
  const [cadenciaDescansoIA, setCadenciaDescansoIA] = useState<string>('dias_fixos');
  const [planoAtualOuAnteriorIA, setPlanoAtualOuAnteriorIA] = useState<string>('');
  const [mostrarAuditoriaPlano, setMostrarAuditoriaPlano] = useState<boolean>(false);
  const [diasSemanaIA, setDiasSemanaIA] = useState<number>(4);
  const [duracaoMinutosIA, setDuracaoMinutosIA] = useState<number>(60);
  const [divisaoIA, setDivisaoIA] = useState<string>('personalizada');
  const [planoRecomendadoIA, setPlanoRecomendadoIA] = useState<RecomendacaoTreinoIAResposta | null>(null);
  const [nomeFaseAtivaProjeto, setNomeFaseAtivaProjeto] = useState<string>('');
  const [focoTreinoProjeto, setFocoTreinoProjeto] = useState<string>('');
  const [seriesAlvoProjeto, setSeriesAlvoProjeto] = useState<number>(14);
  const [cardioMinutosProjeto, setCardioMinutosProjeto] = useState<number>(60);

  // Modo Treino em Direto (Live Workout)
  const [treinoEmCurso, setTreinoEmCurso] = useState<boolean>(false);
  const [tempoSegundos, setTempoSegundos] = useState<number>(0);
  const [sessaoAoVivo, setSessaoAoVivo] = useState<{
    nome: string;
    foco: string;
    exercicios: ExercicioAoVivo[];
  } | null>(null);
  const [notasSessao, setNotasSessao] = useState<string>('');
  const [resumoConcluido, setResumoConcluido] = useState<{
    sessao_nome: string;
    duracao_minutos: number;
    series_feitas: number;
    tonelagem_total_kg: number;
  } | null>(null);

  // Cronómetro de Descanso
  const [cronometroDescanso, setCronometroDescanso] = useState<number | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const restIntervalRef = useRef<any>(null);

  // Histórico
  const [mostrarHistorico, setMostrarHistorico] = useState<boolean>(false);
  const [historicoTreinos, setHistoricoTreinos] = useState<RegistoTreinoHistoricoItem[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState<boolean>(false);

  // Progresso e Linha do Tempo por Exercício
  const [progressoExerciciosMap, setProgressoExerciciosMap] = useState<MapaProgressoExercicios>({});
  const [modalProgressoVisivel, setModalProgressoVisivel] = useState<boolean>(false);
  const [exercicioInspecionadoProgresso, setExercicioInspecionadoProgresso] = useState<ProgressoExercicioItem | null>(null);
  const [filtroExercicioProgresso, setFiltroExercicioProgresso] = useState<string>('');

  // Histórico de Treinos por Fase do Projeto
  const [historicoFasesTreino, setHistoricoFasesTreino] = useState<PlanoTreinoCompleto[]>([]);
  const [modalHistoricoFasesVisivel, setModalHistoricoFasesVisivel] = useState<boolean>(false);
  const [faseInspecionadaTreino, setFaseInspecionadaTreino] = useState<PlanoTreinoCompleto | null>(null);
  const [reativandoFaseTreino, setReativandoFaseTreino] = useState<boolean>(false);
  const [mostrarAdaptacoesTreinoPainel, setMostrarAdaptacoesTreinoPainel] = useState<boolean>(false);

  // Modal de Substituição / Adaptação de Exercício
  const [modalTrocaExercicioVisivel, setModalTrocaExercicioVisivel] = useState<boolean>(false);
  const [trocaExContexto, setTrocaExContexto] = useState<{
    sessaoIndex: number;
    exercicioIndex: number;
    exercicioNome: string;
    grupoMuscular: string;
    series: number;
    repeticoesAlvo: string;
    cargaSugeridaKg: number;
    rpeAlvo: number;
    descansoSegundos: number;
  } | null>(null);
  const [substitutoExId, setSubstitutoExId] = useState<string>('');
  const [substitutoExNomeCustom, setSubstitutoExNomeCustom] = useState<string>('');
  const [substitutoExGrupo, setSubstitutoExGrupo] = useState<string>('peito');
  const [motivoTrocaEx, setMotivoTrocaEx] = useState<string>('Dor articular / desconforto / lesão');
  const [outroMotivoExAtivo, setOutroMotivoExAtivo] = useState<boolean>(false);
  const [motivoExPersonalizado, setMotivoExPersonalizado] = useState<string>('');
  const [substituindoEx, setSubstituindoEx] = useState<boolean>(false);

  // IA Biomecânica / Recomendações de Substituição
  const [queixaDesconforto, setQueixaDesconforto] = useState<string>('Dor no ombro ao descer');
  const [consultandoIA, setConsultandoIA] = useState<boolean>(false);
  const [analiseBiomecanicaIA, setAnaliseBiomecanicaIA] = useState<string>('');
  const [recomendacoesIA, setRecomendacoesIA] = useState<any[]>([]);

  // Calculadora de Double Progression
  const [cargaAnterior, setCargaAnterior] = useState<number>(80);
  const [repsFeitas, setRepsFeitas] = useState<number>(12);
  const [faixaReps, setFaixaReps] = useState<string>('8-12');
  const [rpeAtingido, setRpeAtingido] = useState<number>(8.5);
  const [tentativasEstagnadas, setTentativasEstagnadas] = useState<number>(0);
  const [resultadoProgressao, setResultadoProgressao] = useState<any>(null);

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  // Timer do treino em direto
  useEffect(() => {
    if (treinoEmCurso) {
      timerIntervalRef.current = setInterval(() => {
        setTempoSegundos((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [treinoEmCurso]);

  // Timer do cronómetro de descanso
  useEffect(() => {
    if (cronometroDescanso !== null && cronometroDescanso > 0) {
      restIntervalRef.current = setInterval(() => {
        setCronometroDescanso((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(restIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (cronometroDescanso === 0) {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    }
    return () => {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    };
  }, [cronometroDescanso]);

  const carregarDadosIniciais = async () => {
    try {
      setCarregando(true);
      const [planoRes, catRes, perfilRes, histFasesRes, progressoMapRes] = await Promise.all([
        ServicoApi.obterPlanoTreinoAtivo(),
        ServicoApi.obterCatalogoExercicios(),
        ServicoApi.obterPerfil(),
        ServicoApi.obterHistoricoFasesTreino().catch(() => []),
        ServicoApi.obterProgressoExercicios().catch(() => ({} as MapaProgressoExercicios))
      ]);
      setPlano(planoRes);
      setCatalogo(catRes);
      if (progressoMapRes) {
        setProgressoExerciciosMap(progressoMapRes);
      }
      if (histFasesRes && histFasesRes.length > 0) {
        setHistoricoFasesTreino(histFasesRes);
        setFaseInspecionadaTreino(histFasesRes[0]);
      }
      if (perfilRes.perfil) {
        const p = perfilRes.perfil;
        setPerfil(p);
        setDiasSemanaIA(p.dias_treino_semana || 4);
        setDuracaoMinutosIA(p.tempo_sessao_minutos || 60);

        // Extrair sincronização com o projeto
        if (p.projeto_ativo_json) {
          try {
            const proj = JSON.parse(p.projeto_ativo_json);
            if (proj && proj.fases && proj.fases.length > 0) {
              const faseMatch = proj.fases.find((f: any) => f.tipo === p.fase_atual) || proj.fases[0];
              if (faseMatch) {
                setNomeFaseAtivaProjeto(faseMatch.nome_exibicao || faseMatch.tipo);
                setFocoTreinoProjeto(faseMatch.foco_treino || '');
                setSeriesAlvoProjeto(faseMatch.series_trabalho_semana || 14);
                setCardioMinutosProjeto(faseMatch.cardio_minutos_semana || 60);
              }
            }
          } catch (e) {
            console.warn('Erro ao processar projeto ativo do perfil:', e);
          }
        } else {
          // Heurística baseada na fase atual
          const fase = (p.fase_atual || 'bulk').toLowerCase();
          if (fase.includes('cut') || fase.includes('defice')) {
            setNomeFaseAtivaProjeto('Défice Calórico / Cut');
            setFocoTreinoProjeto('Preservação de massa magra via alta intensidade mecânica');
            setSeriesAlvoProjeto(12);
            setCardioMinutosProjeto(120);
          } else {
            setNomeFaseAtivaProjeto('Superávit / Lean Bulk');
            setFocoTreinoProjeto('Sobrecarga progressiva e hipertrofia miofibrilar');
            setSeriesAlvoProjeto(16);
            setCardioMinutosProjeto(60);
          }
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dados de treino:', err);
    } finally {
      setCarregando(false);
    }
  };

  const obterProgressoParaExercicio = (nome?: string, id?: string): ProgressoExercicioItem | null => {
    if (!progressoExerciciosMap) return null;
    const chaveId = (id || '').toLowerCase().trim();
    const chaveNome = (nome || '').toLowerCase().trim();
    if (chaveId && progressoExerciciosMap[chaveId]) return progressoExerciciosMap[chaveId];
    if (chaveNome && progressoExerciciosMap[chaveNome]) return progressoExerciciosMap[chaveNome];
    return null;
  };

  const handleAbrirProgressoExercicio = (nome: string, id?: string) => {
    const prog = obterProgressoParaExercicio(nome, id);
    if (prog) {
      setExercicioInspecionadoProgresso(prog);
    } else {
      setExercicioInspecionadoProgresso({
        id_exercicio: id || 'custom',
        nome: nome,
        total_sessoes: 0,
        carga_maxima_historica: 0,
        recorde_pessoal: '-',
        evolucao_carga_kg: 0,
        timeline: []
      });
    }
    setModalProgressoVisivel(true);
  };

  const handleGerarNovoPlano = async () => {
    try {
      setGerando(true);
      const novoPlano = await ServicoApi.gerarPlanoTreino(diasSemana, tempoSessao, nivelExperiencia);
      setPlano(novoPlano);
      await ServicoApi.salvarPlanoTreino(novoPlano);
      setAlteracoesPendentes(false);
      setSessaoAtivaIndex(0);
      setMensagemSucesso(`Novo plano ${novoPlano.nome_divisao} gerado e ativado com sucesso!`);
      setTimeout(() => setMensagemSucesso(''), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setGerando(false);
    }
  };

  const carregarHistoricoFasesTreino = async () => {
    try {
      const hist = await ServicoApi.obterHistoricoFasesTreino();
      setHistoricoFasesTreino(hist);
      if (hist.length > 0 && !faseInspecionadaTreino) {
        setFaseInspecionadaTreino(hist[0]);
      }
    } catch (err) {
      console.error('Erro ao carregar histórico de treinos por fase:', err);
    }
  };

  const handleSalvarPlano = async () => {
    if (!plano) return;
    try {
      const volumeTotal = plano.sessoes.reduce(
        (acc, sessao) => acc + sessao.exercicios.reduce((exAcc, ex) => exAcc + ex.series, 0),
        0
      );
      const planoAtualizado = {
        ...plano,
        fase_projeto: plano.fase_projeto || perfil?.fase_atual,
        nome_fase: plano.nome_fase || nomeFaseAtivaProjeto || plano.nome_divisao,
        volume_total_series_semana: volumeTotal,
        dias_por_semana: plano.sessoes.length
      };

      await ServicoApi.salvarPlanoTreino(planoAtualizado);
      setPlano(planoAtualizado);
      setAlteracoesPendentes(false);
      await carregarHistoricoFasesTreino();
      setMensagemSucesso('Plano de treino atualizado e guardado com sucesso!');
      setTimeout(() => setMensagemSucesso(''), 4000);
    } catch (err) {
      console.error('Erro ao salvar plano:', err);
    }
  };

  const handleAbrirTrocaExercicio = (sessaoIdx: number, exercicioIdx: number, ex: ExercicioTreino) => {
    const grupo = (ex.grupo_muscular_primario || 'peito').toLowerCase();
    setTrocaExContexto({
      sessaoIndex: sessaoIdx,
      exercicioIndex: exercicioIdx,
      exercicioNome: ex.nome,
      grupoMuscular: ex.grupo_muscular_primario || 'peito',
      series: ex.series || 3,
      repeticoesAlvo: ex.repeticoes_alvo || '8-12',
      cargaSugeridaKg: ex.carga_sugerida_kg || 0,
      rpeAlvo: ex.rpe_alvo || 8.5,
      descansoSegundos: ex.descanso_segundos || 90
    });
    setSubstitutoExNomeCustom('');
    setSubstitutoExGrupo(ex.grupo_muscular_primario || 'peito');
    setMotivoTrocaEx('Dor articular / desconforto / lesão');
    setOutroMotivoExAtivo(false);
    setMotivoExPersonalizado('');

    const mesmaCategoria = catalogo.filter(
      (c) => (c.primario || '').toLowerCase() === grupo && c.id !== ex.id_exercicio
    );
    if (mesmaCategoria.length > 0) {
      setSubstitutoExId(mesmaCategoria[0].id);
    } else if (catalogo.length > 0) {
      setSubstitutoExId(catalogo[0].id);
    }

    const queixaInicial = grupo === 'peito'
      ? 'Dor / pinçamento no ombro ao descer'
      : grupo === 'quadriceps'
      ? 'Desconforto na lombar / joelho'
      : grupo === 'costas'
      ? 'Dor na lombar ao puxar'
      : 'Desconforto articular na execução';
    setQueixaDesconforto(queixaInicial);
    setAnaliseBiomecanicaIA('');
    setRecomendacoesIA([]);

    setModalTrocaExercicioVisivel(true);
  };

  const handlePedirRecomendacaoIA = async () => {
    if (!trocaExContexto) return;
    try {
      setConsultandoIA(true);
      const res = await ServicoApi.sugerirSubstituicaoExercicioIA({
        exercicio_atual: trocaExContexto.exercicioNome,
        grupo_muscular: trocaExContexto.grupoMuscular,
        queixa_desconforto: queixaDesconforto || motivoTrocaEx,
        fase: perfil?.fase_atual || 'cut'
      });
      setAnaliseBiomecanicaIA(res.analise_biomecanica || '');
      setRecomendacoesIA(res.recomendacoes || []);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao consultar a IA para recomendação.');
    } finally {
      setConsultandoIA(false);
    }
  };

  const handleAplicarRecomendacaoIA = (rec: any) => {
    setSubstitutoExId(rec.id_exercicio);
    setSubstitutoExNomeCustom(rec.nome);
    setSubstitutoExGrupo(rec.grupo_muscular || trocaExContexto?.grupoMuscular || 'peito');
    setMotivoTrocaEx(`Recomendação Biomecânica IA: ${rec.justificativa_biomecanica}`);
    if (trocaExContexto) {
      setTrocaExContexto({
        ...trocaExContexto,
        series: rec.series || trocaExContexto.series,
        repeticoesAlvo: rec.repeticoes_alvo || trocaExContexto.repeticoesAlvo,
        rpeAlvo: rec.rpe_alvo || trocaExContexto.rpeAlvo,
        descansoSegundos: rec.descanso_segundos || trocaExContexto.descansoSegundos,
        cargaSugeridaKg: rec.carga_sugerida_kg || trocaExContexto.cargaSugeridaKg
      });
    }
  };

  const handleExecutarTrocaExercicio = async () => {
    if (!trocaExContexto) return;
    try {
      setSubstituindoEx(true);
      const motivoFinal = outroMotivoExAtivo
        ? (motivoExPersonalizado.trim() || 'Ajuste biomecânico')
        : motivoTrocaEx;

      const infoCatalogo = catalogo.find((c) => c.id === substitutoExId);
      const nomeFinal = substitutoExNomeCustom.trim() || (infoCatalogo ? infoCatalogo.nome : substitutoExId);
      const grupoFinal = infoCatalogo ? infoCatalogo.primario : substitutoExGrupo;

      const res = await ServicoApi.substituirExercicioPlano({
        sessao_index: trocaExContexto.sessaoIndex,
        exercicio_index: trocaExContexto.exercicioIndex,
        novo_exercicio_id: substitutoExId,
        novo_exercicio_nome: nomeFinal,
        grupo_muscular: grupoFinal,
        series: trocaExContexto.series,
        repeticoes_alvo: trocaExContexto.repeticoesAlvo,
        rpe_alvo: trocaExContexto.rpeAlvo,
        descanso_segundos: trocaExContexto.descansoSegundos,
        carga_sugerida_kg: trocaExContexto.cargaSugeridaKg,
        motivo: motivoFinal
      });

      setPlano(res.plano);
      setModalTrocaExercicioVisivel(false);
      setMensagemSucesso(res.mensagem || 'Exercício substituído e adaptação registada com sucesso!');
      await carregarHistoricoFasesTreino();
      setTimeout(() => setMensagemSucesso(''), 5000);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao substituir exercício.');
    } finally {
      setSubstituindoEx(false);
    }
  };

  const handleReativarFaseTreino = async (planoId: number) => {
    try {
      setReativandoFaseTreino(true);
      const res = await ServicoApi.reativarFaseTreino(planoId);
      setPlano(res.plano);
      setModalHistoricoFasesVisivel(false);
      setMensagemSucesso(res.mensagem || 'Plano de treino da fase reativado com sucesso!');
      await carregarHistoricoFasesTreino();
      setTimeout(() => setMensagemSucesso(''), 5000);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao reativar fase de treino.');
    } finally {
      setReativandoFaseTreino(false);
    }
  };

  // =========================================================================
  // GESTÃO DE DIAS (ADICIONAR DIA / REMOVER DIA)
  // =========================================================================
  const handleAbrirModalNovoDia = () => {
    const num = (plano?.sessoes.length || 0) + 1;
    setNovoDiaNome(`Dia ${num}: Sessão Extra`);
    setNovoDiaFoco('Foco Personalizado');
    setNovoDiaMinutos(60);
    setMostrarModalNovoDia(true);
  };

  const handleAdicionarNovoDia = () => {
    if (!plano) return;
    const novoPlano = { ...plano };
    novoPlano.sessoes.push({
      dia_nome: novoDiaNome.trim() || `Dia ${novoPlano.sessoes.length + 1}: Nova Sessão`,
      foco: novoDiaFoco.trim() || 'Foco Personalizado',
      tempo_estimado_minutos: novoDiaMinutos || 60,
      exercicios: []
    });
    novoPlano.dias_por_semana = novoPlano.sessoes.length;
    setPlano(novoPlano);
    setSessaoAtivaIndex(novoPlano.sessoes.length - 1);
    setAlteracoesPendentes(true);
    setMostrarModalNovoDia(false);
  };

  const handleRemoverDia = (diaIdx: number) => {
    if (!plano) return;
    if (plano.sessoes.length <= 1) {
      alert('O plano de treino tem de conter pelo menos 1 dia.');
      return;
    }
    const sessaoARemover = plano.sessoes[diaIdx];
    if (window.confirm(`Tens a certeza que desejas remover o dia "${sessaoARemover.dia_nome}" do teu plano?`)) {
      const novoPlano = { ...plano };
      novoPlano.sessoes.splice(diaIdx, 1);
      novoPlano.dias_por_semana = novoPlano.sessoes.length;
      setPlano(novoPlano);
      setSessaoAtivaIndex(Math.max(0, diaIdx - 1));
      setAlteracoesPendentes(true);
    }
  };

  // =========================================================================
  // ADICIONAR EXERCÍCIO PERSONALIZADO (ESCREVER NOME & PARÂMETROS)
  // =========================================================================
  const handleAdicionarExercicioManual = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!novoExNome.trim()) return;

    const idCustom = `custom_${Date.now()}`;

    // Se estiver no Modo de Treino em Direto
    if (treinoEmCurso && sessaoAoVivo) {
      const novaSessao = { ...sessaoAoVivo };
      const seriesCriadas: SerieAoVivo[] = Array.from({ length: novoExSeries }, (_, i) => ({
        numero_serie: i + 1,
        carga_kg: 0,
        repeticoes: parseInt(novoExReps.split('-')[0]) || 10,
        rpe: novoExRpe,
        concluida: false
      }));

      novaSessao.exercicios.push({
        id_exercicio: idCustom,
        nome: novoExNome.trim(),
        grupo_muscular_primario: novoExGrupo,
        descanso_segundos: novoExDescanso,
        series: seriesCriadas,
        notas: `RPE Alvo: ${novoExRpe}`
      });
      setSessaoAoVivo(novaSessao);
    } else if (plano) {
      // No Plano de Treino Padrão
      const novoPlano = { ...plano };
      const sessao = novoPlano.sessoes[sessaoAtivaIndex];
      if (!sessao) return;

      sessao.exercicios.push({
        id_exercicio: idCustom,
        nome: novoExNome.trim(),
        grupo_muscular_primario: novoExGrupo,
        grupo_muscular_secundario: null,
        series: novoExSeries,
        repeticoes_alvo: novoExReps,
        descanso_segundos: novoExDescanso,
        rpe_alvo: novoExRpe,
        carga_sugerida_kg: 0,
        notas_execucao: `Exercício personalizado (${novoExGrupo})`
      });

      setPlano(novoPlano);
      setAlteracoesPendentes(true);
    }

    // Reset formulário
    setNovoExNome('');
    setMostrarFormCustomEx(false);
  };

  // Prescrição de Treino com IA
  const handleGerarTreinoIA = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGerandoIA(true);
      const res = await ServicoApi.recomendarTreinoIA({
        lesoes_atuais_ou_passadas: lesoesIA,
        desproporcoes_pontos_fracos: pontosFracosIA,
        problemas_limitacoes: limitacoesIA,
        objetivo_especifico: objetivoIA,
        objetivos_detalhados: objetivosDetalhadosIA,
        atividades_secundarias: atividadesSecundariasIA,
        cadencia_descanso: cadenciaDescansoIA,
        plano_atual_ou_anterior: planoAtualOuAnteriorIA,
        dias_semana: diasSemanaIA,
        duracao_minutos: duracaoMinutosIA,
        tipo_divisao_preferida: divisaoIA,
        fase_projeto: perfil?.fase_atual || 'bulk',
        nome_fase_projeto: nomeFaseAtivaProjeto,
        calorias_diarias: perfil?.calorias_atuais || 2500,
        series_alvo_semana: seriesAlvoProjeto,
        cardio_minutos_semana: cardioMinutosProjeto,
        foco_treino_projeto: focoTreinoProjeto
      });
      setPlanoRecomendadoIA(res);
    } catch (err) {
      console.error('Erro ao gerar treino com IA:', err);
    } finally {
      setGerandoIA(false);
    }
  };

  const handleAceitarTreinoIA = async () => {
    if (!planoRecomendadoIA) return;
    try {
      setPlano(planoRecomendadoIA);
      await ServicoApi.salvarPlanoTreino(planoRecomendadoIA);
      setAlteracoesPendentes(false);
      setMostrarModalIA(false);
      setPlanoRecomendadoIA(null);
      setSessaoAtivaIndex(0);
      setMensagemSucesso(`Plano prescrito pela IA (${planoRecomendadoIA.nome_divisao}) ativado com sucesso!`);
      setTimeout(() => setMensagemSucesso(''), 5000);
    } catch (err) {
      console.error('Erro ao aceitar treino da IA:', err);
    }
  };

  // Manipulação de Exercícios no Plano Padrão
  const adicionarExercicioDoCatalogo = (exercicioCatalogo: any) => {
    if (!plano) return;
    const novoPlano = { ...plano };
    const sessao = novoPlano.sessoes[sessaoAtivaIndex];
    if (!sessao) return;

    sessao.exercicios.push({
      id_exercicio: exercicioCatalogo.id,
      nome: exercicioCatalogo.nome,
      grupo_muscular_primario: exercicioCatalogo.primario,
      grupo_muscular_secundario: exercicioCatalogo.secundario,
      series: 3,
      repeticoes_alvo: '8-12',
      descanso_segundos: 90,
      rpe_alvo: 8.5,
      carga_sugerida_kg: 0
    });

    setPlano(novoPlano);
    setAlteracoesPendentes(true);
  };

  const removerExercicio = (exercicioIdx: number) => {
    if (!plano) return;
    const novoPlano = { ...plano };
    const sessao = novoPlano.sessoes[sessaoAtivaIndex];
    if (!sessao) return;

    sessao.exercicios.splice(exercicioIdx, 1);
    setPlano(novoPlano);
    setAlteracoesPendentes(true);
  };

  const alterarSeries = (exercicioIdx: number, delta: number) => {
    if (!plano) return;
    const novoPlano = { ...plano };
    const ex = novoPlano.sessoes[sessaoAtivaIndex]?.exercicios[exercicioIdx];
    if (!ex) return;
    ex.series = Math.max(1, Math.min(8, ex.series + delta));
    setPlano(novoPlano);
    setAlteracoesPendentes(true);
  };

  const alterarCampoExercicio = (exercicioIdx: number, campo: 'repeticoes_alvo' | 'descanso_segundos' | 'rpe_alvo', valor: any) => {
    if (!plano) return;
    const novoPlano = { ...plano };
    const ex = novoPlano.sessoes[sessaoAtivaIndex]?.exercicios[exercicioIdx];
    if (!ex) return;
    (ex as any)[campo] = valor;
    setPlano(novoPlano);
    setAlteracoesPendentes(true);
  };

  // =========================================================================
  // MODO TREINO EM DIRETO (LIVE WORKOUT TRACKER)
  // =========================================================================
  const handleIniciarTreino = (sessao: SessaoTreino) => {
    const exerciciosMapeados: ExercicioAoVivo[] = sessao.exercicios.map((ex) => {
      const prog = obterProgressoParaExercicio(ex.nome, ex.id_exercicio);
      const defaultReps = parseInt(ex.repeticoes_alvo.split('-')[1] || ex.repeticoes_alvo.split('-')[0]) || 10;
      const seriesIniciais: SerieAoVivo[] = Array.from({ length: ex.series }, (_, i) => {
        const serieAnterior = prog?.ultimo_treino?.series?.[i];
        return {
          numero_serie: i + 1,
          carga_kg: serieAnterior ? serieAnterior.carga_kg : (ex.carga_sugerida_kg || 0),
          repeticoes: serieAnterior ? serieAnterior.repeticoes : defaultReps,
          rpe: serieAnterior?.rpe ?? (ex.rpe_alvo || 8.5),
          concluida: false
        };
      });

      return {
        id_exercicio: ex.id_exercicio,
        nome: ex.nome,
        grupo_muscular_primario: ex.grupo_muscular_primario,
        descanso_segundos: ex.descanso_segundos || 90,
        series: seriesIniciais,
        notas: ex.notas_execucao || ''
      };
    });

    setSessaoAoVivo({
      nome: sessao.dia_nome,
      foco: sessao.foco,
      exercicios: exerciciosMapeados
    });
    setTempoSegundos(0);
    setTreinoEmCurso(true);
    setCronometroDescanso(null);
    setResumoConcluido(null);
  };

  const handleToggleSerieAoVivo = (exIdx: number, serieIdx: number) => {
    if (!sessaoAoVivo) return;
    const novaSessao = { ...sessaoAoVivo };
    const serie = novaSessao.exercicios[exIdx].series[serieIdx];
    serie.concluida = !serie.concluida;

    if (serie.concluida) {
      // Disparar automaticamente o cronómetro de descanso
      const descanso = novaSessao.exercicios[exIdx].descanso_segundos || 90;
      setCronometroDescanso(descanso);
    }

    setSessaoAoVivo(novaSessao);
  };

  const handleAlterarCargaAoVivo = (exIdx: number, serieIdx: number, carga: number) => {
    if (!sessaoAoVivo) return;
    const novaSessao = { ...sessaoAoVivo };
    novaSessao.exercicios[exIdx].series[serieIdx].carga_kg = carga;
    setSessaoAoVivo(novaSessao);
  };

  const handleAlterarRepsAoVivo = (exIdx: number, serieIdx: number, reps: number) => {
    if (!sessaoAoVivo) return;
    const novaSessao = { ...sessaoAoVivo };
    novaSessao.exercicios[exIdx].series[serieIdx].repeticoes = reps;
    setSessaoAoVivo(novaSessao);
  };

  const handleAlterarRpeAoVivo = (exIdx: number, serieIdx: number, rpe: number) => {
    if (!sessaoAoVivo) return;
    const novaSessao = { ...sessaoAoVivo };
    novaSessao.exercicios[exIdx].series[serieIdx].rpe = rpe;
    setSessaoAoVivo(novaSessao);
  };

  const handleAdicionarSerieAoVivo = (exIdx: number) => {
    if (!sessaoAoVivo) return;
    const novaSessao = { ...sessaoAoVivo };
    const ex = novaSessao.exercicios[exIdx];
    const ultimaSerie = ex.series[ex.series.length - 1];
    ex.series.push({
      numero_serie: ex.series.length + 1,
      carga_kg: ultimaSerie ? ultimaSerie.carga_kg : 0,
      repeticoes: ultimaSerie ? ultimaSerie.repeticoes : 10,
      rpe: ultimaSerie ? ultimaSerie.rpe : 8.5,
      concluida: false
    });
    setSessaoAoVivo(novaSessao);
  };

  const handleRemoverSerieAoVivo = (exIdx: number, serieIdx: number) => {
    if (!sessaoAoVivo) return;
    const novaSessao = { ...sessaoAoVivo };
    const ex = novaSessao.exercicios[exIdx];
    if (ex.series.length <= 1) return;
    ex.series.splice(serieIdx, 1);
    ex.series.forEach((s, idx) => (s.numero_serie = idx + 1));
    setSessaoAoVivo(novaSessao);
  };

  const handleConcluirTreino = async () => {
    if (!sessaoAoVivo) return;
    try {
      const duracaoMinutos = Math.max(1, Math.round(tempoSegundos / 60));
      let tonelagemTotal = 0;
      let totalSeriesFeitas = 0;
      let somaRpe = 0;
      let contagemRpe = 0;

      sessaoAoVivo.exercicios.forEach((ex) => {
        ex.series.forEach((s) => {
          if (s.concluida) {
            tonelagemTotal += s.carga_kg * s.repeticoes;
            totalSeriesFeitas += 1;
            somaRpe += s.rpe || 8.0;
            contagemRpe += 1;
          }
        });
      });

      const rpeMedio = contagemRpe > 0 ? Math.round((somaRpe / contagemRpe) * 10) / 10 : 8.0;

      await ServicoApi.registarSessaoTreino({
        sessao_nome: sessaoAoVivo.nome,
        duracao_minutos: duracaoMinutos,
        rpe_geral: rpeMedio,
        exercicios: sessaoAoVivo.exercicios,
        notas: notasSessao
      });

      setResumoConcluido({
        sessao_nome: sessaoAoVivo.nome,
        duracao_minutos: duracaoMinutos,
        series_feitas: totalSeriesFeitas,
        tonelagem_total_kg: Math.round(tonelagemTotal)
      });

      setTreinoEmCurso(false);
      setSessaoAoVivo(null);
      setCronometroDescanso(null);
      setMensagemSucesso('🎉 Sessão de treino concluída e gravada com sucesso!');
      setTimeout(() => setMensagemSucesso(''), 6000);

      // Atualizar imediatamente os dados de progresso e cargas
      ServicoApi.obterProgressoExercicios()
        .then((mapa) => setProgressoExerciciosMap(mapa))
        .catch(() => {});
    } catch (err) {
      console.error('Erro ao registar treino:', err);
    }
  };

  const handleCancelarTreino = () => {
    if (window.confirm('Tens a certeza que desejas cancelar este treino? Os dados não serão gravados.')) {
      setTreinoEmCurso(false);
      setSessaoAoVivo(null);
      setCronometroDescanso(null);
    }
  };

  const abrirHistorico = async () => {
    setMostrarHistorico(true);
    setCarregandoHistorico(true);
    try {
      const hist = await ServicoApi.obterHistoricoTreinos(15);
      setHistoricoTreinos(hist);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregandoHistorico(false);
    }
  };

  const handleCalcularProgressao = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await ServicoApi.calcularProgressaoCarga({
        carga_anterior_kg: cargaAnterior,
        repeticoes_feitas: repsFeitas,
        faixa_repeticoes: faixaReps,
        rpe_atingido: rpeAtingido,
        tentativas_estagnadas: tentativasEstagnadas
      });
      setResultadoProgressao(res);
    } catch (err) {
      console.error(err);
    }
  };

  const formatarTempo = (totalSegundos: number) => {
    const mins = Math.floor(totalSegundos / 60);
    const segs = totalSegundos % 60;
    return `${mins.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const sessaoAtual = plano?.sessoes[sessaoAtivaIndex];

  return (
    <div className="space-y-4 sm:space-y-8 pb-12">
      {/* CABEÇALHO & SINCRONIZAÇÃO COM O PROJETO */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/60 p-3.5 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Dumbbell className="w-3.5 h-3.5" /> Periodização de Treino
            </span>
            {perfil?.fase_atual && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold uppercase">
                🎯 Projeto: {perfil.fase_atual} ({perfil.calorias_atuais} kcal)
              </span>
            )}
            {alteracoesPendentes && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                ⚠️ Alterações por Salvar
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            {plano?.nome_divisao || 'Plano de Treino'}
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">
            {plano?.foco_principal} • Volume semanal: <strong className="text-emerald-400">{plano?.volume_total_series_semana} séries</strong> em {plano?.dias_por_semana} dias/semana.
          </p>
        </div>

        {/* Botões de Ação de Cabeçalho */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Botão de Histórico de Fases de Treino */}
          <button
            onClick={() => {
              carregarHistoricoFasesTreino();
              setModalHistoricoFasesVisivel(true);
            }}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all border border-amber-500/30 active:scale-95"
            title="Consultar rotinas e exercícios de fases anteriores"
          >
            <History className="w-4 h-4 text-amber-400" />
            <span>Histórico de Fases ({historicoFasesTreino.length})</span>
          </button>

          {/* Botão de Adaptações Desta Fase */}
          <button
            onClick={() => setMostrarAdaptacoesTreinoPainel(!mostrarAdaptacoesTreinoPainel)}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              mostrarAdaptacoesTreinoPainel
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
            }`}
            title="Ver histórico de exercícios trocados por dor articular, máquina ocupada ou lesão"
          >
            <ArrowRightLeft className="w-4 h-4 text-rose-400" />
            <span>Adaptações Desta Fase ({plano?.historico_alteracoes?.length || 0})</span>
          </button>

          <button
            onClick={() => setMostrarModalIA(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>Prescrever com IA (Lesões & Horas)</span>
          </button>

          <button
            onClick={() => {
              const chaves = Object.keys(progressoExerciciosMap);
              if (chaves.length > 0 && !exercicioInspecionadoProgresso) {
                setExercicioInspecionadoProgresso(progressoExerciciosMap[chaves[0]]);
              }
              setModalProgressoVisivel(true);
            }}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all border border-slate-700"
            title="Consultar evolução de cargas, 1RM e histórico por exercício"
          >
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Evolução de Cargas</span>
          </button>

          <button
            onClick={abrirHistorico}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all border border-slate-700"
          >
            <History className="w-4 h-4 text-emerald-400" />
            <span>Diário de Treinos</span>
          </button>

          {alteracoesPendentes && (
            <button
              onClick={handleSalvarPlano}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
          )}
        </div>
      </div>

      {/* PAINEL DE MEMÓRIA & DIAGNÓSTICO CONTÍNUO DA IA */}
      <PainelMemoriaIA tipo="treino" />

      {/* PAINEL EXPANSÍVEL DE ADAPTAÇÕES & EXERCÍCIOS TROCADOS NA FASE */}
      {mostrarAdaptacoesTreinoPainel && (
        <div className="p-5 bg-slate-950/80 border border-rose-500/30 rounded-2xl space-y-3 animate-fade-in shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-rose-400" />
              <h4 className="text-sm font-bold text-white">
                Registo de Adaptações & Exercícios Trocados na Fase
              </h4>
            </div>
            <span className="text-xs text-slate-400">
              Total de substituições auditadas: {plano?.historico_alteracoes?.length || 0}
            </span>
          </div>

          {!plano?.historico_alteracoes || plano.historico_alteracoes.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">
              Ainda não trocaste nenhum exercício nesta fase. Quando substituíres qualquer exercício (por exemplo, por dor articular ou máquina ocupada), o motivo e a adaptação biomecânica ficam registados aqui automaticamente.
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {plano.historico_alteracoes.map((alt) => (
                <div
                  key={alt.id}
                  className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-xs">
                        {alt.data_hora}
                      </span>
                      <span className="font-bold text-emerald-400">{alt.sessao}</span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 font-semibold text-xs">
                        🩺 {alt.motivo}
                      </span>
                    </div>
                    <div className="text-slate-200 flex items-center gap-2 font-medium">
                      <span className="line-through text-slate-400">{alt.exercicio_origem}</span>
                      <span className="text-emerald-400 font-black">➔</span>
                      <span className="text-white font-bold">{alt.exercicio_substituto}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono text-slate-400 capitalize">
                      {alt.grupo_muscular}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {mensagemSucesso && (
        <div className="p-4 bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 rounded-xl flex items-center gap-3 text-sm animate-fade-in shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{mensagemSucesso}</span>
        </div>
      )}

      {/* BANNER CELEBRATÓRIO DE TREINO CONCLUÍDO */}
      {resumoConcluido && (
        <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-emerald-950/80 p-6 rounded-2xl border border-emerald-500/50 shadow-2xl animate-fade-in space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Sessão Concluída: {resumoConcluido.sessao_nome}</h3>
                <span className="text-xs text-emerald-400 font-semibold">Os dados foram gravados com sucesso no teu histórico.</span>
              </div>
            </div>
            <button onClick={() => setResumoConcluido(null)} className="text-slate-500 hover:text-slate-300">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-xs text-slate-400 block font-medium">Duração</span>
              <span className="text-lg font-black text-white">{resumoConcluido.duracao_minutos} min</span>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-xs text-slate-400 block font-medium">Séries Feitas</span>
              <span className="text-lg font-black text-emerald-400">{resumoConcluido.series_feitas} séries</span>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-xs text-slate-400 block font-medium">Tonelagem</span>
              <span className="text-lg font-black text-white">{resumoConcluido.tonelagem_total_kg} kg</span>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODO ATIVO: TREINO EM DIRETO (SE ESTIVER A DECORRER) */}
      {/* =================================================================== */}
      {treinoEmCurso && sessaoAoVivo ? (
        <div className="bg-slate-900/90 p-6 rounded-2xl border-2 border-emerald-500 shadow-2xl space-y-6 animate-fade-in">
          {/* Barra de Controlo do Treino em Direto */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black animate-pulse uppercase">
                <Flame className="w-3.5 h-3.5" /> Treino em Curso em Direto
              </div>
              <h2 className="text-2xl font-black text-white mt-1">{sessaoAoVivo.nome}</h2>
              <span className="text-xs text-slate-400">{sessaoAoVivo.foco}</span>
            </div>

            <div className="flex items-center gap-4">
              {/* Cronómetro da Sessão */}
              <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                <Clock className="w-5 h-5 text-emerald-400" />
                <span className="text-2xl font-black text-white font-mono">{formatarTempo(tempoSegundos)}</span>
              </div>

              {/* Botões de Conclusão / Cancelamento */}
              <button
                onClick={handleConcluirTreino}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/30"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Concluir Treino</span>
              </button>
              <button
                onClick={handleCancelarTreino}
                className="px-3 py-2.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 font-bold rounded-xl text-xs transition-all border border-red-500/30"
              >
                Cancelar
              </button>
            </div>
          </div>

          {/* CRONÓMETRO DE DESCANSO INTERATIVO */}
          {cronometroDescanso !== null && (
            <div className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              cronometroDescanso === 0
                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 animate-bounce'
                : 'bg-slate-950/90 border-slate-800 text-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <Timer className={`w-6 h-6 ${cronometroDescanso === 0 ? 'text-emerald-400' : 'text-slate-400'}`} />
                <div>
                  <span className="text-xs font-bold block uppercase tracking-wider">
                    {cronometroDescanso === 0 ? '🔔 Descanso Terminado! Próxima Série!' : 'Tempo de Descanso Entre Séries'}
                  </span>
                  <span className="text-2xl font-black font-mono">
                    {formatarTempo(cronometroDescanso)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {[60, 90, 120, 180].map((seg) => (
                  <button
                    key={seg}
                    onClick={() => setCronometroDescanso(seg)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                      cronometroDescanso === seg
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {seg}s
                  </button>
                ))}
                <button
                  onClick={() => setCronometroDescanso(null)}
                  className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}

          {/* LISTA DE EXERCÍCIOS AO VIVO COM RPE EM CADA SÉRIE */}
          <div className="space-y-6">
            {sessaoAoVivo.exercicios.map((ex, exIdx) => {
              const progEx = obterProgressoParaExercicio(ex.nome, ex.id_exercicio);

              return (
              <div key={exIdx} className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-extrabold text-sm flex items-center justify-center border border-emerald-500/30">
                      {exIdx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-bold text-white">{ex.nome}</h4>
                        {progEx && progEx.total_sessoes > 0 && progEx.carga_maxima_historica && progEx.carga_maxima_historica > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1">
                            🏆 PR: {progEx.carga_maxima_historica} kg
                          </span>
                        ) : null}
                      </div>
                      <span className="text-xs text-slate-400 capitalize">{ex.grupo_muscular_primario} • Descanso: {ex.descanso_segundos}s</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAbrirProgressoExercicio(ex.nome, ex.id_exercicio)}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-teal-300 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
                      title="Consultar linha do tempo e cargas passadas deste exercício"
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
                      <span>Evolução</span>
                    </button>
                    <button
                      onClick={() => handleAdicionarSerieAoVivo(exIdx)}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-emerald-400 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Série</span>
                    </button>
                  </div>
                </div>

                {/* Tabela de Séries com Carga, Reps e RPE Individual */}
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 px-3">
                    <div className="col-span-2">Série</div>
                    <div className="col-span-3">Carga (kg)</div>
                    <div className="col-span-3">Reps Feitas</div>
                    <div className="col-span-2">RPE</div>
                    <div className="col-span-2 text-right">Feito</div>
                  </div>

                  {ex.series.map((serie, sIdx) => {
                    const antSerie = progEx?.ultimo_treino?.series?.[sIdx];

                    return (
                    <div
                      key={sIdx}
                      className={`grid grid-cols-12 gap-2 items-center p-2.5 rounded-xl border transition-all ${
                        serie.concluida
                          ? 'bg-emerald-950/30 border-emerald-500/40'
                          : 'bg-slate-900/60 border-slate-800/80'
                      }`}
                    >
                      <div className="col-span-2 font-bold text-xs text-slate-300">
                        <div>#{serie.numero_serie}</div>
                        {antSerie ? (
                          <span className="text-xs text-slate-400 font-mono block leading-tight" title="Carga e reps na última sessão">
                            Ant: {antSerie.carga_kg}k×{antSerie.repeticoes}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 font-mono block leading-tight">
                            Ant: -
                          </span>
                        )}
                      </div>

                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.5"
                          value={serie.carga_kg}
                          onChange={(e) => handleAlterarCargaAoVivo(exIdx, sIdx, parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-sm font-black text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="col-span-3">
                        <input
                          type="number"
                          value={serie.repeticoes}
                          onChange={(e) => handleAlterarRepsAoVivo(exIdx, sIdx, parseInt(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-sm font-black text-white text-center focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Input de RPE por Série */}
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.5"
                          min="5"
                          max="10"
                          value={serie.rpe}
                          onChange={(e) => handleAlterarRpeAoVivo(exIdx, sIdx, parseFloat(e.target.value) || 8.0)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs font-black text-amber-300 text-center focus:outline-none focus:border-amber-400"
                          title="Esforço Percebido RPE (ex: 8 = 2 reps na reserva)"
                        />
                      </div>

                      <div className="col-span-2 flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleSerieAoVivo(exIdx, sIdx)}
                          className={`p-1.5 rounded-lg font-bold flex items-center justify-center transition-all ${
                            serie.concluida
                              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                              : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                          }`}
                          title={serie.concluida ? 'Série concluída' : 'Marcar como concluída'}
                        >
                          {serie.concluida ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </button>

                        {ex.series.length > 1 && (
                          <button
                            onClick={() => handleRemoverSerieAoVivo(exIdx, sIdx)}
                            className="p-1 text-slate-600 hover:text-red-400"
                            title="Remover série"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
              );
            })}
          </div>

          {/* ADICIONAR EXERCÍCIO AO TREINO EM DIRETO: PERSONALIZADO OU CATÁLOGO */}
          <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-400" />
                Adicionar Exercício Durante o Treino:
              </span>
              <button
                type="button"
                onClick={() => setMostrarFormCustomEx(!mostrarFormCustomEx)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-bold underline"
              >
                {mostrarFormCustomEx ? 'Fechar Formulário' : '+ Escrever Exercício Personalizado'}
              </button>
            </div>

            {mostrarFormCustomEx && (
              <form onSubmit={handleAdicionarExercicioManual} className="p-4 bg-slate-900 rounded-xl border border-slate-700 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-5">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Exercício</label>
                    <input
                      type="text"
                      placeholder="Ex: Supino Inclinado na Smith"
                      value={novoExNome}
                      onChange={(e) => setNovoExNome(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      autoFocus
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Grupo Muscular</label>
                    <select
                      value={novoExGrupo}
                      onChange={(e) => setNovoExGrupo(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                    >
                      <option value="peito">Peito</option>
                      <option value="costas">Costas</option>
                      <option value="quadriceps">Quadríceps</option>
                      <option value="isquiotibiais">Isquiotibiais</option>
                      <option value="gluteos">Glúteos</option>
                      <option value="ombros">Ombros</option>
                      <option value="biceps">Bíceps</option>
                      <option value="triceps">Tríceps</option>
                      <option value="deltoide_posterior">Deltoide Post.</option>
                      <option value="gemeos">Gémeos</option>
                      <option value="abdomen">Abdómen</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Séries</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={novoExSeries}
                      onChange={(e) => setNovoExSeries(parseInt(e.target.value) || 3)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white text-center font-bold"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Reps Alvo</label>
                    <input
                      type="text"
                      placeholder="8-12"
                      value={novoExReps}
                      onChange={(e) => setNovoExReps(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white text-center font-bold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-semibold text-slate-300">Descanso (s):</label>
                      <input
                        type="number"
                        step="15"
                        min="30"
                        max="300"
                        value={novoExDescanso}
                        onChange={(e) => setNovoExDescanso(parseInt(e.target.value) || 90)}
                        className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-center font-bold"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-semibold text-slate-300">RPE Alvo:</label>
                      <input
                        type="number"
                        step="0.5"
                        min="5"
                        max="10"
                        value={novoExRpe}
                        onChange={(e) => setNovoExRpe(parseFloat(e.target.value) || 8.5)}
                        className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-amber-300 text-center font-bold"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!novoExNome.trim()}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar ao Treino</span>
                  </button>
                </div>
              </form>
            )}

            {/* Catálogo Rápido */}
            <div className="space-y-1.5">
              <span className="text-xs text-slate-400 block font-medium">Ou escolhe da Biblioteca:</span>
              <div className="flex flex-wrap gap-2">
                {catalogo.slice(0, 10).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setNovoExNome(cat.nome);
                      setNovoExGrupo(cat.primario);
                      handleAdicionarExercicioManual();
                    }}
                    className="text-xs px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg flex items-center gap-1.5 border border-slate-800 transition-all"
                  >
                    <Plus className="w-3 h-3 text-emerald-400" />
                    <span>{cat.nome}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notas do Treino */}
          <div className="pt-2 border-t border-slate-800">
            <label className="block text-xs font-bold text-slate-300 mb-1">Notas da Sessão</label>
            <input
              type="text"
              value={notasSessao}
              onChange={(e) => setNotasSessao(e.target.value)}
              placeholder="Ex: Sem dor no ombro; ótima progressão de carga no peitoral"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
            />
          </div>
        </div>
      ) : (
        /* =================================================================== */
        /* MODO VISUALIZAÇÃO E EDIÇÃO DO PLANO DE TREINO */
        /* =================================================================== */
        <>
          {/* TABS DAS SESSÕES / DIAS DE TREINO */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
              {plano?.sessoes.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setSessaoAtivaIndex(idx)}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex-shrink-0 transition-all ${
                    sessaoAtivaIndex === idx
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {s.dia_nome} ({s.exercicios.length} ex.)
                </button>
              ))}

              {/* BOTÃO PARA ADICIONAR NOVO DIA */}
              <button
                onClick={handleAbrirModalNovoDia}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-900/90 hover:bg-slate-800 text-emerald-400 border border-dashed border-emerald-500/40 flex items-center gap-1 flex-shrink-0 transition-all"
                title="Adicionar mais um dia de treino ao plano"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Dia</span>
              </button>
            </div>

            {sessaoAtual && (
              <div className="flex items-center gap-2 self-end sm:self-center">
                {plano && plano.sessoes.length > 1 && (
                  <button
                    onClick={() => handleRemoverDia(sessaoAtivaIndex)}
                    className="px-3 py-2 bg-red-950/30 hover:bg-red-900/50 text-red-400 border border-red-500/30 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all"
                    title="Remover esta sessão do plano"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remover Dia</span>
                  </button>
                )}

                <button
                  onClick={() => handleIniciarTreino(sessaoAtual)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/30 flex-shrink-0"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Iniciar Treino</span>
                </button>
              </div>
            )}
          </div>

          {/* Detalhes da Sessão Ativa */}
          {sessaoAtual && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold text-white">{sessaoAtual.dia_nome}</h2>
                    <span className="text-xs text-slate-400">{sessaoAtual.foco} • Duração estimada: {sessaoAtual.tempo_estimado_minutos} min</span>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-800 text-slate-300">
                    {sessaoAtual.exercicios.reduce((acc, curr) => acc + curr.series, 0)} séries de trabalho
                  </span>
                </div>

                {/* Lista de Exercícios da Sessão com RPE e Parâmetros Editáveis */}
                <div className="space-y-3">
                  {sessaoAtual.exercicios.length === 0 ? (
                    <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-dashed border-slate-800 text-slate-400 text-xs">
                      Este dia ainda não tem exercícios. Escreve um exercício abaixo ou seleciona da biblioteca!
                    </div>
                  ) : (
                    sessaoAtual.exercicios.map((ex, exIdx) => {
                      const progEx = obterProgressoParaExercicio(ex.nome, ex.id_exercicio);

                      return (
                      <div
                        key={exIdx}
                        className="bg-slate-900/70 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-md bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {exIdx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-white text-sm sm:text-base">{ex.nome}</h4>
                              {progEx && progEx.total_sessoes > 0 && progEx.carga_maxima_historica && progEx.carga_maxima_historica > 0 ? (
                                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-bold">
                                  🏆 PR: {progEx.carga_maxima_historica} kg
                                </span>
                              ) : null}
                            </div>

                            {/* Badge de Histórico de Cargas Passadas */}
                            {progEx && progEx.total_sessoes > 0 && progEx.ultimo_treino ? (
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 rounded bg-slate-950 text-emerald-400 border border-emerald-500/30 text-xs font-mono flex items-center gap-1 font-semibold">
                                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                                  Último: {progEx.ultimo_treino.series.map(s => `${s.carga_kg}kg×${s.repeticoes}`).join(' | ')}
                                </span>
                              </div>
                            ) : (
                              <div className="text-xs text-slate-500 mt-1 italic">
                                Sem treinos registados ainda
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-400">
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 capitalize font-medium">
                                {ex.grupo_muscular_primario}
                              </span>

                              {/* Reps Editáveis */}
                              <div className="flex items-center gap-1">
                                <span className="text-slate-500">Reps:</span>
                                <input
                                  type="text"
                                  value={ex.repeticoes_alvo}
                                  onChange={(e) => alterarCampoExercicio(exIdx, 'repeticoes_alvo', e.target.value)}
                                  className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white text-center font-bold"
                                />
                              </div>

                              {/* Descanso Editável */}
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <input
                                  type="number"
                                  step="15"
                                  value={ex.descanso_segundos}
                                  onChange={(e) => alterarCampoExercicio(exIdx, 'descanso_segundos', parseInt(e.target.value) || 90)}
                                  className="w-14 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white text-center font-bold"
                                />
                                <span>s</span>
                              </div>

                              {/* RPE Alvo Editável no Exercício */}
                              <div className="flex items-center gap-1">
                                <span className="text-amber-400 font-bold">RPE:</span>
                                <input
                                  type="number"
                                  step="0.5"
                                  min="5"
                                  max="10"
                                  value={ex.rpe_alvo}
                                  onChange={(e) => alterarCampoExercicio(exIdx, 'rpe_alvo', parseFloat(e.target.value) || 8.5)}
                                  className="w-14 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-amber-300 text-center font-bold"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Controlo de Séries, Troca & Remoção */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleAbrirProgressoExercicio(ex.nome, ex.id_exercicio)}
                            className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-teal-200 border border-teal-500/30 rounded-lg font-bold flex items-center gap-1 transition"
                            title="Consultar evolução de cargas, repetições e 1RM deste exercício"
                          >
                            <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
                            <span>Progressão</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAbrirTrocaExercicio(sessaoAtivaIndex, exIdx, ex)}
                            className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-amber-500/30 rounded-lg font-bold flex items-center gap-1 transition"
                            title="Trocar este exercício por dor articular, máquina ocupada ou lesão"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                            <span>Trocar</span>
                          </button>

                          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1">
                            <button
                              onClick={() => alterarSeries(exIdx, -1)}
                              className="w-6 h-6 text-slate-400 hover:text-white flex items-center justify-center font-bold"
                            >
                              -
                            </button>
                            <span className="px-2.5 text-xs font-bold text-emerald-400">{ex.series} séries</span>
                            <button
                              onClick={() => alterarSeries(exIdx, 1)}
                              className="w-6 h-6 text-slate-400 hover:text-white flex items-center justify-center font-bold"
                            >
                              +
                            </button>
                          </div>

                          <button
                            onClick={() => removerExercicio(exIdx)}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Remover exercício"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      );
                    })
                  )}
                </div>

                {/* ADICIONAR EXERCÍCIO: FORMULÁRIO PERSONALIZADO & CATÁLOGO */}
                <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-emerald-400" />
                      Adicionar Exercício ao Dia Ativo:
                    </span>
                    <button
                      type="button"
                      onClick={() => setMostrarFormCustomEx(!mostrarFormCustomEx)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-bold underline"
                    >
                      {mostrarFormCustomEx ? 'Fechar Formulário' : '+ Escrever Exercício Personalizado'}
                    </button>
                  </div>

                  {mostrarFormCustomEx && (
                    <form onSubmit={handleAdicionarExercicioManual} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-5">
                          <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Exercício</label>
                          <input
                            type="text"
                            placeholder="Ex: Supino Inclinado na Smith"
                            value={novoExNome}
                            onChange={(e) => setNovoExNome(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            autoFocus
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="block text-xs font-semibold text-slate-300 mb-1">Grupo Muscular</label>
                          <select
                            value={novoExGrupo}
                            onChange={(e) => setNovoExGrupo(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                          >
                            <option value="peito">Peito</option>
                            <option value="costas">Costas</option>
                            <option value="quadriceps">Quadríceps</option>
                            <option value="isquiotibiais">Isquiotibiais</option>
                            <option value="gluteos">Glúteos</option>
                            <option value="ombros">Ombros</option>
                            <option value="biceps">Bíceps</option>
                            <option value="triceps">Tríceps</option>
                            <option value="deltoide_posterior">Deltoide Post.</option>
                            <option value="gemeos">Gémeos</option>
                            <option value="abdomen">Abdómen</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-300 mb-1">Séries</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={novoExSeries}
                            onChange={(e) => setNovoExSeries(parseInt(e.target.value) || 3)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white text-center font-bold"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-300 mb-1">Reps Alvo</label>
                          <input
                            type="text"
                            placeholder="8-12"
                            value={novoExReps}
                            onChange={(e) => setNovoExReps(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white text-center font-bold"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <label className="text-xs font-semibold text-slate-300">Descanso (s):</label>
                            <input
                              type="number"
                              step="15"
                              min="30"
                              max="300"
                              value={novoExDescanso}
                              onChange={(e) => setNovoExDescanso(parseInt(e.target.value) || 90)}
                              className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-center font-bold"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <label className="text-xs font-semibold text-slate-300">RPE Alvo:</label>
                            <input
                              type="number"
                              step="0.5"
                              min="5"
                              max="10"
                              value={novoExRpe}
                              onChange={(e) => setNovoExRpe(parseFloat(e.target.value) || 8.5)}
                              className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-amber-300 text-center font-bold"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={!novoExNome.trim()}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar ao Dia</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Catálogo Rápido */}
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block mb-2">Biblioteca Biomecânica Rápida:</span>
                    <div className="flex flex-wrap gap-2">
                      {catalogo.slice(0, 12).map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => adicionarExercicioDoCatalogo(cat)}
                          className="text-xs px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center gap-1 transition-all"
                        >
                          <Plus className="w-3 h-3 text-emerald-400" />
                          <span>{cat.nome}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Coluna da Direita: Double Progression e Gestão do Plano */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-5">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h3 className="font-bold text-white text-sm">Motor de Sobrecarga Progressiva</h3>
                      <span className="text-xs text-slate-400">Double Progression Científica</span>
                    </div>
                  </div>

                  <form onSubmit={handleCalcularProgressao} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Carga Levantada (kg)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={cargaAnterior}
                        onChange={(e) => setCargaAnterior(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Reps Feitas</label>
                        <input
                          type="number"
                          value={repsFeitas}
                          onChange={(e) => setRepsFeitas(parseInt(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Faixa Alvo</label>
                        <input
                          type="text"
                          value={faixaReps}
                          onChange={(e) => setFaixaReps(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold text-center"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">RPE Atingido</label>
                        <input
                          type="number"
                          step="0.5"
                          value={rpeAtingido}
                          onChange={(e) => setRpeAtingido(parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Sessões Estagnadas</label>
                        <input
                          type="number"
                          value={tentativasEstagnadas}
                          onChange={(e) => setTentativasEstagnadas(parseInt(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold text-center"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs transition-all shadow"
                    >
                      Calcular Próxima Carga
                    </button>
                  </form>

                  {resultadoProgressao && (
                    <div className="p-4 bg-slate-950 rounded-xl border border-emerald-500/30 space-y-2 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-semibold">Carga Sugerida Próxima Sessão:</span>
                        <span className="text-lg font-black text-emerald-400">
                          {resultadoProgressao.nova_carga_sugerida_kg} kg
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed border-t border-slate-800/80 pt-2">
                        {resultadoProgressao.mensagem}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* =================================================================== */}
      {/* MODAL PARA ADICIONAR NOVO DIA DE TREINO */}
      {/* =================================================================== */}
      {mostrarModalNovoDia && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-black text-white">Adicionar Novo Dia ao Plano</h3>
              </div>
              <button onClick={() => setMostrarModalNovoDia(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nome do Dia / Sessão</label>
                <input
                  type="text"
                  value={novoDiaNome}
                  onChange={(e) => setNovoDiaNome(e.target.value)}
                  placeholder="Ex: Dia 5: Braços & Abdómen"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Foco Muscular Principal</label>
                <input
                  type="text"
                  value={novoDiaFoco}
                  onChange={(e) => setNovoDiaFoco(e.target.value)}
                  placeholder="Ex: Bíceps, Tríceps e Core"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Duração Estimada (minutos)</label>
                <input
                  type="number"
                  step="5"
                  value={novoDiaMinutos}
                  onChange={(e) => setNovoDiaMinutos(parseInt(e.target.value) || 60)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleAdicionarNovoDia}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar ao Plano</span>
              </button>
              <button
                type="button"
                onClick={() => setMostrarModalNovoDia(false)}
                className="px-4 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-700"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL DE PRESCRIÇÃO INDIVIDUALIZADA COM IA */}
      {/* =================================================================== */}
      {mostrarModalIA && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h2 className="text-xl font-black text-white">Prescrição de Treino Individualizada com IA</h2>
              </div>
              <button onClick={() => setMostrarModalIA(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CARTÃO DE SINCRONIZAÇÃO COM O PROJETO ATIVO */}
            <div className="p-3.5 bg-slate-950 border border-emerald-500/40 rounded-xl space-y-1.5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-black text-white">
                    Projeto Vinculado: <span className="text-emerald-400">{nomeFaseAtivaProjeto || perfil?.fase_atual?.toUpperCase()}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold text-xs border border-orange-500/30">
                    {perfil?.calorias_atuais || 2200} kcal/dia
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30">
                    ~{seriesAlvoProjeto} séries/músculo
                  </span>
                  {cardioMinutosProjeto > 0 && (
                    <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold text-xs border border-sky-500/30">
                      {cardioMinutosProjeto} min cardio/sem
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {focoTreinoProjeto ? (
                  <><strong>Diretriz do Projeto:</strong> {focoTreinoProjeto}</>
                ) : (
                  <>A IA vai garantir que o volume de séries, o tempo de descanso e a seleção biomecânica respeitam estritamente as calorias ({perfil?.calorias_atuais || 2200} kcal) e a fase do teu projeto.</>
                )}
              </p>
            </div>

            <form onSubmit={handleGerarTreinoIA} className="space-y-4">
              {/* OBJETIVOS DETALHADOS (FORÇA COMPOSTOS + HIPERTROFIA) */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1 flex items-center justify-between">
                  <span>🏋️ Objetivos & Filosofia de Treino (ex: Powerbuilding)</span>
                  <span className="text-xs font-normal text-emerald-400">Personalizável</span>
                </label>
                <textarea
                  rows={2}
                  value={objetivosDetalhadosIA}
                  onChange={(e) => setObjetivosDetalhadosIA(e.target.value)}
                  placeholder="Ex: Quero foco máximo em hipertrofia geral, mas nos exercícios principais como Supino, Agachamento e Terra quero jogar com cargas pesadas a 3-5 reps."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
                <div className="flex flex-wrap gap-1 mt-1">
                  {[
                    'Máxima Hipertrofia com Força (Supino/Terra/Agachamento a 3-5 reps)',
                    'Hipertrofia Pura (8-12 reps)',
                    'Força Máxima / Powerlifting (1-5 reps)',
                    'Recomposição & Definição Atlética'
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setObjetivosDetalhadosIA(tag)}
                      className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors"
                    >
                      +{tag.split('(')[0].trim()}
                    </button>
                  ))}
                </div>
              </div>

              {/* MODALIDADES SECUNDÁRIAS (BOXE, CORRIDA, FUTEBOL...) */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1 flex items-center justify-between">
                  <span>🥊 Modalidades Secundárias & Cardio (com recomendação de horários)</span>
                  <span className="text-xs font-normal text-sky-400">Prevenção do Efeito de Interferência</span>
                </label>
                <textarea
                  rows={2}
                  value={atividadesSecundariasIA}
                  onChange={(e) => setAtividadesSecundariasIA(e.target.value)}
                  placeholder="Ex: Pratico boxe 1 vez por semana e corro 2 vezes por semana. A IA irá aconselhar os melhores horários/dias para não interferir com a recuperação."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
                <div className="flex flex-wrap gap-1 mt-1">
                  {['Boxe 1x/semana', 'Corrida 2x/semana', 'Futebol 1x/semana', 'Natação 2x/semana', 'Artes Marciais / BJJ', 'Nenhuma'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setAtividadesSecundariasIA((prev) => (prev && prev !== 'Nenhuma' ? `${prev}, ${tag}` : tag))}
                      className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-sky-400 transition-colors"
                    >
                      +{tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    🩹 Lesões Atuais ou Passadas
                  </label>
                  <textarea
                    rows={2}
                    value={lesoesIA}
                    onChange={(e) => setLesoesIA(e.target.value)}
                    placeholder="Ex: Tendinite no ombro direito; dor no joelho ao agachar profundo; lombalgia"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {['Tendinite Ombro', 'Dor Lombar', 'Dor Joelho', 'Nenhuma'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setLesoesIA((prev) => (prev ? `${prev}, ${tag}` : tag))}
                        className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors"
                      >
                        +{tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    🎯 Desproporções Musculares & Pontos Fracos
                  </label>
                  <textarea
                    rows={2}
                    value={pontosFracosIA}
                    onChange={(e) => setPontosFracosIA(e.target.value)}
                    placeholder="Ex: Peitoral superior atrasado; deltoides laterais pequenos; pernas"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {['Peitoral Superior', 'Deltoides Laterais', 'Costas/Dorsais', 'Glúteos/Pernas', 'Braços'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setPontosFracosIA((prev) => (prev ? `${prev}, ${tag}` : tag))}
                        className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors"
                      >
                        +{tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  ⚠️ Problemas Médicos / Limitações Posturais
                </label>
                <input
                  type="text"
                  value={limitacoesIA}
                  onChange={(e) => setLimitacoesIA(e.target.value)}
                  placeholder="Ex: Falta de mobilidade de tornozelo; hérnia discal L5-S1; falta de tempo"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                />
              </div>

              {/* CADÊNCIA E DISTRIBUIÇÃO SEMANAL (SEM SIGLAS OBRIGATÓRIAS) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Cadência / Descanso</label>
                  <select
                    value={cadenciaDescansoIA}
                    onChange={(e) => setCadenciaDescansoIA(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                  >
                    <option value="dias_fixos">Dias Semanais Fixos</option>
                    <option value="2_1">2 Treinos / 1 Descanso (2 on, 1 off)</option>
                    <option value="3_1">3 Treinos / 1 Descanso (3 on, 1 off)</option>
                    <option value="alternado">Dias Alternados (1 on, 1 off)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Frequência Semanal</label>
                  <select
                    value={diasSemanaIA}
                    onChange={(e) => setDiasSemanaIA(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                  >
                    <option value={2}>2 Dias por Semana</option>
                    <option value={3}>3 Dias por Semana</option>
                    <option value={4}>4 Dias por Semana</option>
                    <option value={5}>5 Dias por Semana</option>
                    <option value={6}>6 Dias por Semana</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Duração por Treino</label>
                  <select
                    value={duracaoMinutosIA}
                    onChange={(e) => setDuracaoMinutosIA(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                  >
                    <option value={45}>45 minutos</option>
                    <option value={60}>60 minutos</option>
                    <option value={75}>75 minutos</option>
                    <option value={90}>90 minutos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Divisão Preferida</label>
                  <select
                    value={divisaoIA}
                    onChange={(e) => setDivisaoIA(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                  >
                    <option value="personalizada">Automático (IA decide melhor rotação)</option>
                    <option value="upper_lower">Membros Superiores / Inferiores</option>
                    <option value="ppl">Empurrar / Puxar / Pernas</option>
                    <option value="full_body">Corpo Inteiro (Full Body)</option>
                    <option value="arnold">Peito/Costas, Ombros/Braços, Pernas</option>
                  </select>
                </div>
              </div>

              {/* ACCORDION: AUDITORIA E REESTRUTURAÇÃO DE PLANO ANTERIOR */}
              <div className="border border-slate-800 rounded-xl p-3 bg-slate-950/60">
                <button
                  type="button"
                  onClick={() => setMostrarAuditoriaPlano(!mostrarAuditoriaPlano)}
                  className="w-full flex items-center justify-between text-left text-xs font-bold text-slate-300 hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span>Tens um plano que já fazes ou fazias? Queres que a IA o reestruture? <strong className="text-emerald-400">(Opcional)</strong></span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${mostrarAuditoriaPlano ? 'rotate-180' : ''}`} />
                </button>

                {mostrarAuditoriaPlano && (
                  <div className="mt-3 space-y-2 pt-2 border-t border-slate-800/80 animate-fade-in">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Cola aqui o teu plano habitual (exercícios, séries, reps). A IA vai diagnosticar volume desnecessário, desequilíbrios biomecânicos e conflitos de recuperação, reorganizando-o de forma otimizada.
                    </p>
                    <textarea
                      rows={4}
                      value={planoAtualOuAnteriorIA}
                      onChange={(e) => setPlanoAtualOuAnteriorIA(e.target.value)}
                      placeholder="Ex:&#10;Dia A (Peito/Tríceps): Supino Reto 4x8, Supino Inclinado com Halteres 3x10, Crossover 3x12, Tríceps Testa 4x10&#10;Dia B (Costas/Bíceps): Puxada Frente 4x10, Remada Curvada 3x8, Rosca Direta 4x10&#10;Dia C (Pernas/Ombro): Agachamento 4x8, Extensora 3x15, Desenvolvimento Halteres 4x10..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={gerandoIA}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl text-sm transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
              >
                {gerandoIA ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>A formular prescrição biomecânica e compatibilizar desportos...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Gerar Recomendação de Treino com IA</span>
                  </>
                )}
              </button>
            </form>

            {/* PARECER E PRÉ-VISUALIZAÇÃO DO PLANO GERADO PELA IA */}
            {planoRecomendadoIA && (
              <div className="bg-slate-950 p-5 rounded-xl border border-emerald-500/40 space-y-4 animate-fade-in">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
                  <div>
                    <h3 className="text-lg font-black text-white">{planoRecomendadoIA.nome_divisao}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-emerald-400 font-semibold">{planoRecomendadoIA.foco_principal}</span>
                      {planoRecomendadoIA.cadencia_rotativa && (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                          {planoRecomendadoIA.cadencia_rotativa}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                    {planoRecomendadoIA.volume_total_series_semana} séries semanais
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  {/* RECOMENDAÇÃO DE HORÁRIOS & COMPATIBILIDADE DE DESPORTOS */}
                  {planoRecomendadoIA.horario_e_compatibilidade_atividades && (
                    <div className="p-3.5 bg-sky-950/40 border border-sky-500/40 rounded-xl text-sky-200/90 leading-relaxed shadow-sm">
                      <strong className="text-sky-400 flex items-center gap-1.5 mb-1.5 text-xs font-black">
                        🥊 Gestão de Horários & Compatibilidade de Desportos (Boxe / Corrida):
                      </strong>
                      <p className="whitespace-pre-line text-xs leading-relaxed">{planoRecomendadoIA.horario_e_compatibilidade_atividades}</p>
                    </div>
                  )}

                  {/* AUDITORIA E REESTRUTURAÇÃO DO PLANO ANTERIOR */}
                  {planoRecomendadoIA.analise_plano_anterior_vs_reestruturado && (
                    <div className="p-3.5 bg-purple-950/40 border border-purple-500/40 rounded-xl text-purple-200/90 leading-relaxed shadow-sm">
                      <strong className="text-purple-400 flex items-center gap-1.5 mb-1.5 text-xs font-black">
                        ⚖️ Auditoria & Reestruturação do Teu Plano Anterior:
                      </strong>
                      <p className="whitespace-pre-line text-xs leading-relaxed">{planoRecomendadoIA.analise_plano_anterior_vs_reestruturado}</p>
                    </div>
                  )}

                  {planoRecomendadoIA.ajustes_para_lesoes && (
                    <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-xl text-amber-200/90 leading-relaxed">
                      <strong className="text-amber-400 block mb-1">🛡️ Adaptações para Lesões & Biomecânica:</strong>
                      <p className="whitespace-pre-line">{planoRecomendadoIA.ajustes_para_lesoes}</p>
                    </div>
                  )}

                  {planoRecomendadoIA.estrategia_pontos_fracos && (
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 leading-relaxed">
                      <strong className="text-emerald-400 block mb-1">🎯 Foco nos Pontos Fracos:</strong>
                      <p className="whitespace-pre-line">{planoRecomendadoIA.estrategia_pontos_fracos}</p>
                    </div>
                  )}

                  {planoRecomendadoIA.sincronizacao_com_projeto && (
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 leading-relaxed">
                      <strong className="text-teal-400 block mb-1">📊 Sincronização com o Teu Projeto:</strong>
                      <p>{planoRecomendadoIA.sincronizacao_com_projeto}</p>
                    </div>
                  )}
                </div>

                {/* Prévia das Sessões com Detalhes de Repetições e RPE */}
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {planoRecomendadoIA.sessoes.map((s, idx) => (
                    <div key={idx} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-white text-sm">{s.dia_nome} <span className="text-xs font-normal text-slate-400">({s.foco})</span></span>
                        <span className="text-xs font-bold text-emerald-400">{s.exercicios.length} exercícios ({s.exercicios.reduce((acc, curr) => acc + curr.series, 0)} séries)</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {s.exercicios.map((ex, eIdx) => {
                          const isForca = ex.repeticoes_alvo.includes('3-5') || ex.repeticoes_alvo.includes('4-6');
                          return (
                            <div key={eIdx} className="bg-slate-950/80 p-2 rounded-lg border border-slate-800/80 text-xs flex items-center justify-between">
                              <div className="truncate pr-1 flex items-center gap-1.5">
                                {isForca && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Trabalho de Força"></span>}
                                <span className="font-semibold text-slate-200 truncate">{ex.nome}</span>
                              </div>
                              <span className="text-slate-400 shrink-0 font-mono text-xs">
                                {ex.series}x{ex.repeticoes_alvo} • RPE {ex.rpe_alvo ?? 8} • {ex.descanso_segundos}s
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* BOTÃO PARA ACEITAR A RECOMENDAÇÃO DA IA */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleAceitarTreinoIA}
                    className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Aceitar e Ativar Plano Reestruturado</span>
                  </button>
                  <button
                    onClick={() => setPlanoRecomendadoIA(null)}
                    className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm"
                  >
                    Descartar e Manter Atual
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL DE HISTÓRICO DE TREINOS EXECUTADOS */}
      {/* =================================================================== */}
      {mostrarHistorico && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-6 space-y-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-400" />
                <h3 className="text-xl font-black text-white">Histórico de Treinos Registados</h3>
              </div>
              <button onClick={() => setMostrarHistorico(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {carregandoHistorico ? (
              <div className="flex justify-center p-8">
                <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
              </div>
            ) : historicoTreinos.length === 0 ? (
              <div className="text-center p-8 text-slate-400 text-sm">
                Ainda não tens treinos registados em direto. Clica em <strong>Iniciar Treino</strong> para gravar a tua primeira sessão!
              </div>
            ) : (
              <div className="space-y-4">
                {historicoTreinos.map((item) => {
                  const tonelagemTotal = item.exercicios.reduce((acc, ex) => {
                    return acc + ex.series.reduce((sub, s) => {
                      return sub + ((s.concluida || s.carga_kg > 0) ? (s.carga_kg * s.repeticoes) : 0);
                    }, 0);
                  }, 0);

                  return (
                    <div key={item.id} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 shadow-md">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-800/80 pb-3">
                        <div>
                          <span className="font-black text-white text-base">{item.sessao_nome}</span>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">
                            {new Date(item.data).toLocaleDateString('pt-PT')} • {item.duracao_minutos} min • RPE Geral: <strong className="text-emerald-400">{item.rpe_geral}</strong>
                          </div>
                        </div>
                        {tonelagemTotal > 0 && (
                          <div className="text-right">
                            <span className="text-xs text-slate-400 uppercase font-bold block">Tonelagem</span>
                            <span className="text-xs font-black text-emerald-400 font-mono">{Math.round(tonelagemTotal)} kg</span>
                          </div>
                        )}
                      </div>

                      {item.notas && (
                        <p className="text-xs text-slate-300 italic bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                          "{item.notas}"
                        </p>
                      )}

                      {/* Lista de Exercícios com Séries, Cargas e Reps Reais */}
                      <div className="space-y-2 pt-1">
                        {item.exercicios.map((ex, eIdx) => {
                          const seriesValidas = ex.series.filter((s) => s.concluida || s.carga_kg > 0 || s.repeticoes > 0);

                          return (
                            <div key={eIdx} className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-white text-xs">{ex.nome}</span>
                                <button
                                  type="button"
                                  onClick={() => handleAbrirProgressoExercicio(ex.nome, ex.id_exercicio)}
                                  className="text-xs text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 transition"
                                  title="Ver evolução e histórico de cargas deste exercício"
                                >
                                  <TrendingUp className="w-3 h-3 text-teal-400" />
                                  <span>Evolução</span>
                                </button>
                              </div>

                              <div className="flex flex-wrap gap-1.5">
                                {seriesValidas.length > 0 ? (
                                  seriesValidas.map((s, sIdx) => (
                                    <span
                                      key={sIdx}
                                      className="px-2.5 py-1 rounded-lg bg-slate-950 text-slate-200 border border-slate-800 font-mono text-xs flex items-center gap-1.5"
                                    >
                                      <span className="text-slate-400 text-xs">#{s.numero_serie}</span>
                                      <strong className="text-emerald-400 font-black">{s.carga_kg} kg</strong>
                                      <span className="text-slate-400">×</span>
                                      <span className="text-white font-bold">{s.repeticoes} reps</span>
                                      {s.rpe ? <span className="text-amber-400 text-xs">@{s.rpe}</span> : null}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-slate-500 italic">
                                    Sem séries registadas nesta sessão
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      {/* MODAL: TROCA RÁPIDA / ADAPTAÇÃO DE EXERCÍCIO */}
      {modalTrocaExercicioVisivel && trocaExContexto && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Substituir Exercício da Sessão</h3>
              </div>
              <button
                onClick={() => setModalTrocaExercicioVisivel(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">Exercício Atual a Substituir:</span>
                <span className="text-base font-black text-white">
                  {trocaExContexto.exercicioNome}{' '}
                  <span className="text-emerald-400 font-bold capitalize">({trocaExContexto.grupoMuscular})</span>
                </span>
                <p className="text-xs text-slate-400 mt-1">
                  Sentiste dor articular, desconforto biomecânico ou a máquina estava ocupada? A substituição preserva o volume ({trocaExContexto.series} séries) e fica registada no histórico de adaptações da fase.
                </p>
              </div>

              {/* ASSISTENTE DE IA BIOMECÂNICA: RECOMENDAR SUBSTITUIÇÃO */}
              <div className="p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 rounded-xl border border-emerald-500/30 space-y-3 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="font-extrabold text-white text-xs">
                      Consultar IA Biomecânica / Fisioterapeuta
                    </span>
                  </div>
                  <span className="text-xs text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    Recomendação Inteligente
                  </span>
                </div>

                <p className="text-xs text-slate-300">
                  Diz o que estás a sentir ou o que pretendes. A IA diagnostica a articulação e recomenda alternativas biomecanicamente seguras:
                </p>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={queixaDesconforto}
                    onChange={(e) => setQueixaDesconforto(e.target.value)}
                    placeholder="Ex: Sinto dor/pinçamento na frente do ombro ao descer o peso..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />

                  {/* Atalhos Rápidos de Sintomas Frequentes */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Dor no ombro ao descer',
                      'Desconforto / dor na lombar',
                      'Dor no joelho / tendão patelar',
                      'Dor nos pulsos / cotovelos',
                      'Máquina ocupada no ginásio'
                    ].map((sintoma) => (
                      <button
                        key={sintoma}
                        type="button"
                        onClick={() => setQueixaDesconforto(sintoma)}
                        className="px-2 py-1 rounded-lg text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                      >
                        {sintoma}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handlePedirRecomendacaoIA}
                    disabled={consultandoIA}
                    className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 shadow"
                  >
                    {consultandoIA ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>A diagnosticar biomecânica e vetores de força...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 fill-current" />
                        <span>Pedir Recomendações de Substituição à IA</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Exibição das Recomendações Retornadas pela IA */}
                {analiseBiomecanicaIA && (
                  <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2 mt-2 animate-fade-in text-xs">
                    <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Diagnóstico Biomecânico:</span>
                    </div>
                    <p className="text-slate-300 italic">{analiseBiomecanicaIA}</p>

                    <span className="font-bold text-white block pt-1 text-xs">
                      Alternativas Biomecanicamente Seguras Sugeridas:
                    </span>
                    <div className="space-y-2">
                      {recomendacoesIA.map((rec, rIdx) => (
                        <div
                          key={rIdx}
                          className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/30 flex flex-col gap-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-white text-xs">{rec.nome}</span>
                            <button
                              type="button"
                              onClick={() => handleAplicarRecomendacaoIA(rec)}
                              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 transition shadow"
                            >
                              <Check className="w-3 h-3" />
                              <span>Escolher Esta</span>
                            </button>
                          </div>
                          <p className="text-xs text-slate-400">{rec.justificativa_biomecanica}</p>
                          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                            <span>Séries: <strong className="text-emerald-400">{rec.series}</strong></span>
                            <span>Reps: <strong>{rec.repeticoes_alvo}</strong></span>
                            <span>RPE: <strong>{rec.rpe_alvo}</strong></span>
                            <span>Descanso: <strong>{rec.descanso_segundos}s</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-200 mb-1">Ou Escolher da Biblioteca Manualmente:</label>
                <select
                  value={substitutoExId}
                  onChange={(e) => {
                    setSubstitutoExId(e.target.value);
                    const sel = catalogo.find((c) => c.id === e.target.value);
                    if (sel) {
                      setSubstitutoExGrupo(sel.primario);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:border-emerald-500 focus:outline-none"
                >
                  <optgroup label="Exercícios do Mesmo Grupo Muscular">
                    {catalogo
                      .filter((c) => (c.primario || '').toLowerCase() === trocaExContexto.grupoMuscular.toLowerCase())
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome} ({c.primario})
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Todos os Outros Exercícios">
                    {catalogo
                      .filter((c) => (c.primario || '').toLowerCase() !== trocaExContexto.grupoMuscular.toLowerCase())
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome} ({c.primario})
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-200 mb-1">Ou Nome Personalizado (Opcional):</label>
                <input
                  type="text"
                  value={substitutoExNomeCustom}
                  onChange={(e) => setSubstitutoExNomeCustom(e.target.value)}
                  placeholder="Ex: Supino Floor Press com Halteres 30º"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-200 mb-1">
                  Motivo da Substituição (Fica Registado no Histórico):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  {[
                    'Dor articular / desconforto / lesão',
                    'Máquina / equipamento indisponível',
                    'Fadiga excessiva / recuperação insuficiente',
                    'Preferência de estímulo biomecânico'
                  ].map((mot) => (
                    <button
                      key={mot}
                      type="button"
                      onClick={() => {
                        setMotivoTrocaEx(mot);
                        setOutroMotivoExAtivo(false);
                      }}
                      className={`p-2.5 rounded-xl text-left transition border text-xs ${
                        motivoTrocaEx === mot && !outroMotivoExAtivo
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {mot}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setOutroMotivoExAtivo(true)}
                  className={`w-full p-2.5 rounded-xl text-left transition border text-xs ${
                    outroMotivoExAtivo
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Outro motivo personalizado...
                </button>

                {outroMotivoExAtivo && (
                  <input
                    type="text"
                    value={motivoExPersonalizado}
                    onChange={(e) => setMotivoExPersonalizado(e.target.value)}
                    placeholder="Ex: Desconforto na cápsula anterior do ombro na descida"
                    className="w-full mt-2 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setModalTrocaExercicioVisivel(false)}
                className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancelar
              </button>

              <button
                onClick={handleExecutarTrocaExercicio}
                disabled={substituindoEx}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition disabled:opacity-50 shadow"
              >
                {substituindoEx ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>A registar substituição...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirmar & Registar Troca</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: HISTÓRICO DE TREINOS POR FASE DO PROJETO */}
      {modalHistoricoFasesVisivel && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 space-y-5 shadow-2xl animate-fade-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Histórico de Treinos por Fase do Projeto
                  </h3>
                  <p className="text-xs text-slate-400">
                    Consulta exatamente a rotina de treinos que fazias em cada fase anterior e todas as adaptações biomecânicas.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalHistoricoFasesVisivel(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 overflow-hidden">
              {/* Coluna da Esquerda: Lista de Fases Gravadas */}
              <div className="border border-slate-800 rounded-xl p-3 bg-slate-950/60 overflow-y-auto space-y-2 max-h-[60vh]">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Fases de Treino Gravadas ({historicoFasesTreino.length})
                </span>
                {historicoFasesTreino.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-2">Nenhuma fase gravada ainda.</p>
                ) : (
                  historicoFasesTreino.map((fase) => {
                    const isSelecionada = faseInspecionadaTreino?.id === fase.id;
                    return (
                      <button
                        key={fase.id}
                        onClick={() => setFaseInspecionadaTreino(fase)}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${
                          isSelecionada
                            ? 'bg-amber-500/15 border-amber-500 text-white shadow-md'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black truncate max-w-[150px]">
                            {fase.nome_fase || fase.nome_divisao}
                          </span>
                          {fase.ativo ? (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                              Ativa
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-xs">
                              Anterior
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="font-bold text-amber-400">{fase.volume_total_series_semana} séries/sem</span>
                          <span>•</span>
                          <span>{fase.sessoes?.length || 0} dias</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Coluna da Direita (2 cols): Detalhes do Treino da Fase Inspecionada */}
              <div className="md:col-span-2 border border-slate-800 rounded-xl p-4 bg-slate-950/60 overflow-y-auto max-h-[60vh] space-y-4">
                {faseInspecionadaTreino ? (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">
                            {faseInspecionadaTreino.nome_fase || faseInspecionadaTreino.nome_divisao}
                          </h4>
                          {faseInspecionadaTreino.ativo && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                              Plano em vigor
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Divisão: <strong className="text-emerald-400">{faseInspecionadaTreino.nome_divisao}</strong> | Volume total: {faseInspecionadaTreino.volume_total_series_semana} séries semanais em {faseInspecionadaTreino.dias_por_semana} dias.
                        </p>
                      </div>

                      {!faseInspecionadaTreino.ativo && (
                        <button
                          onClick={() => handleReativarFaseTreino(faseInspecionadaTreino.id!)}
                          disabled={reativandoFaseTreino}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 transition disabled:opacity-50 flex-shrink-0 shadow"
                        >
                          {reativandoFaseTreino ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>Reativar Treino Desta Fase</span>
                        </button>
                      )}
                    </div>

                    {/* Sessões e Exercícios que fazias nesta fase */}
                    <div className="space-y-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                        Rotina de Treino Desta Fase:
                      </span>
                      {faseInspecionadaTreino.sessoes?.map((sessao, sIdx) => (
                        <div
                          key={sIdx}
                          className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-white">
                              {sessao.dia_nome} • <span className="text-slate-400 font-normal">{sessao.foco}</span>
                            </span>
                            <span className="text-xs font-bold text-emerald-400">
                              {sessao.exercicios?.reduce((acc, curr) => acc + curr.series, 0) || 0} séries
                            </span>
                          </div>

                          <div className="space-y-1">
                            {sessao.exercicios?.map((ex, exIdx) => (
                              <div
                                key={exIdx}
                                className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded bg-slate-950/60 border border-slate-900"
                              >
                                <div>
                                  <span className="text-slate-200 font-medium">{ex.nome}</span>
                                  <span className="text-xs text-slate-400 ml-2 capitalize">({ex.grupo_muscular_primario || 'peito'})</span>
                                </div>
                                <div className="text-right text-xs font-mono text-slate-300">
                                  <span className="text-emerald-400 font-bold">{ex.series} séries</span> x {ex.repeticoes_alvo} • RPE {ex.rpe_alvo || 8.5}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Histórico de alterações e substituições de exercícios feitas nesta fase */}
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                        Adaptações Biomecânicas e Lesões Registadas:
                      </span>
                      {!faseInspecionadaTreino.historico_alteracoes ||
                      faseInspecionadaTreino.historico_alteracoes.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">
                          Sem registo de substituições nesta fase (rotina executada sem desvios biomecânicos).
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {faseInspecionadaTreino.historico_alteracoes.map((alt) => (
                            <div
                              key={alt.id}
                              className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-lg text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-emerald-400">{alt.sessao}</span>
                                <span className="text-xs text-slate-400 font-mono">
                                  {alt.data_hora}
                                </span>
                              </div>
                              <div className="text-slate-300">
                                <span className="line-through text-slate-400">
                                  {alt.exercicio_origem}
                                </span>{' '}
                                ➔{' '}
                                <span className="text-white font-bold">
                                  {alt.exercicio_substituto}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-rose-300 font-medium">
                                  🩺 Motivo: {alt.motivo}
                                </span>
                                <span className="font-mono text-slate-400 capitalize">
                                  {alt.grupo_muscular}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-400 italic">Seleciona uma fase para consultar.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setModalHistoricoFasesVisivel(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL DE EVOLUÇÃO & LINHA DO TEMPO POR EXERCÍCIO */}
      {/* =================================================================== */}
      {modalProgressoVisivel && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Evolução & Histórico de Cargas</h3>
                  <p className="text-xs text-slate-400">
                    Acompanha a sobrecarga progressiva, repetições e 1RM estimado em cada sessão
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalProgressoVisivel(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Seletor / Filtro de Exercícios */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="text-xs font-bold text-slate-300">
                  Selecionar Exercício para Analisar:
                </label>
                <input
                  type="text"
                  placeholder="Pesquisar exercício..."
                  value={filtroExercicioProgresso}
                  onChange={(e) => setFiltroExercicioProgresso(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 max-w-xs"
                />
              </div>

              {/* Botões rápidos de exercícios com histórico ou presentes no plano */}
              {(() => {
                const listaExercicios = Object.values(progressoExerciciosMap).filter((item, idx, self) =>
                  self.findIndex((t) => t.nome.toLowerCase() === item.nome.toLowerCase()) === idx
                );

                // Também incluir exercícios do plano ativo se ainda não estiverem no histórico
                if (plano) {
                  plano.sessoes.forEach((s) => {
                    s.exercicios.forEach((e) => {
                      if (!listaExercicios.some((ex) => ex.nome.toLowerCase() === e.nome.toLowerCase())) {
                        listaExercicios.push({
                          id_exercicio: e.id_exercicio,
                          nome: e.nome,
                          total_sessoes: 0,
                          carga_maxima_historica: 0,
                          recorde_pessoal: '-',
                          evolucao_carga_kg: 0,
                          timeline: []
                        });
                      }
                    });
                  });
                }

                const filtrados = listaExercicios.filter((ex) =>
                  ex.nome.toLowerCase().includes(filtroExercicioProgresso.toLowerCase())
                );

                if (filtrados.length === 0) {
                  return (
                    <div className="text-xs text-slate-500 italic py-1">
                      Nenhum exercício encontrado com "{filtroExercicioProgresso}".
                    </div>
                  );
                }

                return (
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pt-1">
                    {filtrados.map((exItem, idx) => {
                      const ativo = exercicioInspecionadoProgresso?.nome.toLowerCase() === exItem.nome.toLowerCase();
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const dadosReais = obterProgressoParaExercicio(exItem.nome, exItem.id_exercicio) || exItem;
                            setExercicioInspecionadoProgresso(dadosReais);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            ativo
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                          }`}
                        >
                          {exItem.nome}
                          {exItem.total_sessoes > 0 && (
                            <span className={`ml-1.5 px-1.5 py-0.2 rounded text-xs font-mono ${ativo ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-800 text-emerald-400'}`}>
                              {exItem.total_sessoes}x
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Painel do Exercício Inspecionado */}
            {exercicioInspecionadoProgresso ? (
              <div className="space-y-6">
                {/* Nome do Exercício */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-lg font-black text-white flex items-center gap-2">
                      <Dumbbell className="w-5 h-5 text-emerald-400" />
                      {exercicioInspecionadoProgresso.nome}
                    </h4>
                    <span className="text-xs text-slate-400">
                      Total de treinos realizados com este exercício: <strong className="text-emerald-400">{exercicioInspecionadoProgresso.total_sessoes}</strong>
                    </span>
                  </div>
                </div>

                {/* Destaques de Carga e Recordes */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-center">
                    <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Carga Máxima (PR)</span>
                    <span className="text-2xl font-black text-amber-400 font-mono">
                      {exercicioInspecionadoProgresso.carga_maxima_historica || 0} <span className="text-xs font-normal text-slate-400">kg</span>
                    </span>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-center">
                    <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Recorde Pessoal</span>
                    <span className="text-base font-black text-teal-400 font-mono mt-1 block">
                      {exercicioInspecionadoProgresso.recorde_pessoal || '-'}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-center">
                    <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Evolução de Carga</span>
                    <span className="text-xl font-black text-white font-mono mt-0.5 block">
                      {(exercicioInspecionadoProgresso.evolucao_carga_kg && exercicioInspecionadoProgresso.evolucao_carga_kg > 0)
                        ? `+${exercicioInspecionadoProgresso.evolucao_carga_kg} kg`
                        : `${exercicioInspecionadoProgresso.evolucao_carga_kg || 0} kg`}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-center">
                    <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Sessões Gravadas</span>
                    <span className="text-2xl font-black text-emerald-400 font-mono">
                      {exercicioInspecionadoProgresso.total_sessoes}
                    </span>
                  </div>
                </div>

                {/* Linha do Tempo Cronológica de Séries e Sessões */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <h5 className="text-sm font-bold text-white">Linha do Tempo & Histórico por Sessão</h5>
                  </div>

                  {exercicioInspecionadoProgresso.timeline.length === 0 ? (
                    <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800 text-slate-400 text-xs space-y-2">
                      <p>Ainda não tens treinos gravados para este exercício.</p>
                      <p className="text-slate-500">
                        Ao clicares em <strong>Iniciar Treino</strong> e gravares as séries deste exercício, todas as cargas e repetições aparecerão aqui cronologicamente!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[...exercicioInspecionadoProgresso.timeline].reverse().map((sess, sIdx, arr) => {
                        const sessAnterior = arr[sIdx + 1];
                        const diffCarga = sessAnterior ? Math.round((sess.carga_maxima_kg - sessAnterior.carga_maxima_kg) * 10) / 10 : null;

                        return (
                          <div
                            key={sIdx}
                            className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 shadow-md"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-white text-sm">{sess.sessao_nome}</span>
                                <span className="text-xs text-slate-400 font-mono">
                                  {sess.data}
                                </span>
                                {diffCarga !== null && diffCarga > 0 && (
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-xs font-black border border-emerald-500/30">
                                    +{diffCarga} kg vs anterior 🔥
                                  </span>
                                )}
                                {diffCarga !== null && diffCarga === 0 && (
                                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-xs">
                                    Carga mantida
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3 text-xs font-mono text-slate-300">
                                <span>Máx: <strong className="text-emerald-400">{sess.carga_maxima_kg} kg</strong></span>
                                <span>•</span>
                                <span>Volume: <strong className="text-white">{sess.volume_total_kg} kg</strong></span>
                                {sess.melhor_serie && (
                                  <>
                                    <span>•</span>
                                    <span>Melhor: <strong className="text-amber-400">{sess.melhor_serie}</strong></span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Séries Executadas nessa sessão */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {sess.series.map((sr, srIdx) => (
                                <div
                                  key={srIdx}
                                  className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between"
                                >
                                  <span className="text-xs font-bold text-slate-400">S{sr.numero_serie}</span>
                                  <div className="text-right">
                                    <span className="text-xs font-black text-white font-mono">
                                      {sr.carga_kg} kg <span className="text-slate-400 font-normal">×</span> {sr.repeticoes}
                                    </span>
                                    {sr.rpe ? (
                                      <span className="block text-xs text-amber-400 font-mono">
                                        RPE {sr.rpe}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center p-8 text-slate-400 text-sm">
                Seleciona um exercício acima para consultar a sua evolução.
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setModalProgressoVisivel(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
