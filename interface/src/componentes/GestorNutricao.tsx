import React, { useState, useEffect } from 'react';
import {
  Utensils,
  Flame,
  Sparkles,
  CheckCircle2,
  Square,
  CheckSquare,
  RefreshCw,
  Layers,
  ArrowRightLeft,
  Plus,
  Trash2,
  Clock,
  AlertCircle,
  X,
  Check,
  Save,
  Sliders,
  Edit2,
  PlusCircle,
  History,
  ArrowRight,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import { ServicoApi } from '../servicos/api';
import { PainelMemoriaIA } from './PainelMemoriaIA';
import {
  PlanoDietaCompleto,
  AlimentoCatalogo,
  RegistoDiarioConsumo,
  PreferenciasAlimentares,
  PerfilUtilizador
} from '../tipos/fitness';

interface InfoFaseAtiva {
  nome: string;
  tipo: string;
  calorias: number;
  foco: string;
}

const extrairInfoFaseAtiva = (p: PerfilUtilizador | null, projAtivo: any): InfoFaseAtiva => {
  const fasePadrao = p?.fase_atual || 'bulk';
  const caloriasPadrao = p?.calorias_atuais || 2500;
  const caloriasPerfil = p?.calorias_atuais ? Number(p.calorias_atuais) : 0;

  if (!projAtivo) {
    return {
      nome: `Fase ${String(fasePadrao).toUpperCase()}`,
      tipo: String(fasePadrao),
      calorias: caloriasPadrao,
      foco: ''
    };
  }

  if (projAtivo.nome_fase) {
    return {
      nome: String(projAtivo.nome_fase),
      tipo: String(projAtivo.fase_tipo || fasePadrao),
      calorias: caloriasPerfil || Number(projAtivo.calorias_diarias) || caloriasPadrao,
      foco: String(projAtivo.foco_treino || '')
    };
  }

  const fases = Array.isArray(projAtivo.fases)
    ? projAtivo.fases
    : Array.isArray(projAtivo.relatorio?.fases)
    ? projAtivo.relatorio.fases
    : [];

  if (fases.length > 0) {
    const match = fases.find((f: any) => f?.tipo === fasePadrao) || fases[0];
    if (match) {
      return {
        nome: String(match.nome_exibicao || match.nome || `Fase ${String(match.tipo || fasePadrao).toUpperCase()}`),
        tipo: String(match.tipo || fasePadrao),
        calorias: caloriasPerfil || Number(match.calorias_diarias) || caloriasPadrao,
        foco: String(match.foco_treino || match.descricao_estrategia || '')
      };
    }
  }

  const tipoExtraido = projAtivo.fase_tipo || projAtivo.tipo || fasePadrao;
  return {
    nome: String(projAtivo.nome || projAtivo.nome_exibicao || `Fase ${String(tipoExtraido).toUpperCase()}`),
    tipo: String(tipoExtraido),
    calorias: caloriasPerfil || Number(projAtivo.calorias_diarias) || caloriasPadrao,
    foco: String(projAtivo.foco_treino || '')
  };
};

export const GestorNutricao: React.FC = () => {
  const [carregando, setCarregando] = useState<boolean>(true);
  const [plano, setPlano] = useState<PlanoDietaCompleto | null>(null);
  const [alimentos, setAlimentos] = useState<AlimentoCatalogo[]>([]);
  const [registoDiario, setRegistoDiario] = useState<RegistoDiarioConsumo | null>(null);
  const [perfil, setPerfil] = useState<PerfilUtilizador | null>(null);
  const [projetoAtivo, setProjetoAtivo] = useState<any>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string>('');
  const [mensagemErro, setMensagemErro] = useState<string>('');
  const [salvandoPlano, setSalvandoPlano] = useState<boolean>(false);

  // Modo de visualização: "plano_checks" vs "registo_livre"
  const [modoVisualizacao, setModoVisualizacao] = useState<'plano_checks' | 'registo_livre'>('plano_checks');

  // Modo Edição Manual das Refeições
  const [modoEdicaoAtivo, setModoEdicaoAtivo] = useState<boolean>(false);

  // Modal de Prescrição com IA (Gera dieta nova do zero)
  const [modalIAVisivel, setModalIAVisivel] = useState<boolean>(false);
  const [gerandoIA, setGerandoIA] = useState<boolean>(false);
  const [preferenciasIA, setPreferenciasIA] = useState<PreferenciasAlimentares>({
    alimentos_preferidos: 'Arroz, batata, aveia, frango, carne picada de vaca, ovos, iogurte, banana, azeite',
    alimentos_evitados: '',
    numero_refeicoes: 4,
    horario_treino: 'tarde',
    habitos_apetite: 'Pouco apetite de manhã (refeição leve ao acordar)',
    alimentos_dificeis: ''
  });

  // Modal de Calibração com IA (Mantém os alimentos do utilizador e ajusta apenas doses)
  const [modalCalibrarVisivel, setModalCalibrarVisivel] = useState<boolean>(false);
  const [calibrandoIA, setCalibrandoIA] = useState<boolean>(false);
  const [resultadoCalibracao, setResultadoCalibracao] = useState<any>(null);
  const [instrucoesCalibracao, setInstrucoesCalibracao] = useState<string>('');

  // Modal de Adição de Alimento a uma Refeição
  const [modalAddAlimentoRefIndex, setModalAddAlimentoRefIndex] = useState<number | null>(null);
  const [novoAlimSelecionadoId, setNovoAlimSelecionadoId] = useState<string>('');
  const [novoAlimNome, setNovoAlimNome] = useState<string>('');
  const [novoAlimGramas, setNovoAlimGramas] = useState<number>(100);
  const [novoAlimKcal, setNovoAlimKcal] = useState<number>(0);
  const [novoAlimP, setNovoAlimP] = useState<number>(0);
  const [novoAlimH, setNovoAlimH] = useState<number>(0);
  const [novoAlimG, setNovoAlimG] = useState<number>(0);

  // Modal de Troca Rápida de Alimento
  const [modalTrocaVisivel, setModalTrocaVisivel] = useState<boolean>(false);
  const [trocaContexto, setTrocaContexto] = useState<{
    refeicaoIndex: number;
    alimentoIndex: number;
    alimentoNome: string;
    gramas: number;
  } | null>(null);
  const [novoAlimentoId, setNovoAlimentoId] = useState<string>('batata_doce_cozida');
  const [substituindo, setSubstituindo] = useState<boolean>(false);
  const [motivoTroca, setMotivoTroca] = useState<string>('Estava a cair mal / digestão pesada');
  const [outroMotivoAtivo, setOutroMotivoAtivo] = useState<boolean>(false);
  const [motivoPersonalizado, setMotivoPersonalizado] = useState<string>('');
  const [consultandoSubstituicaoIA, setConsultandoSubstituicaoIA] = useState<boolean>(false);
  const [analiseNutricionalIA, setAnaliseNutricionalIA] = useState<string>('');
  const [recomendacoesAlimentosIA, setRecomendacoesAlimentosIA] = useState<any[]>([]);
  const [gramasSugeridasIA, setGramasSugeridasIA] = useState<number | null>(null);
  const [queixaNutricional, setQueixaNutricional] = useState<string>('Estava a cair mal / digestão pesada');

  // Histórico de Dietas por Fase do Projeto
  const [historicoFases, setHistoricoFases] = useState<PlanoDietaCompleto[]>([]);
  const [modalHistoricoVisivel, setModalHistoricoVisivel] = useState<boolean>(false);
  const [faseInspecionada, setFaseInspecionada] = useState<PlanoDietaCompleto | null>(null);
  const [reativandoFase, setReativandoFase] = useState<boolean>(false);
  const [mostrarAdaptacoesPainel, setMostrarAdaptacoesPainel] = useState<boolean>(false);

  // Registo Livre (Formulário)
  const [itemLivreNome, setItemLivreNome] = useState<string>('');
  const [itemLivreGramas, setItemLivreGramas] = useState<number>(100);
  const [itemLivreKcal, setItemLivreKcal] = useState<number>(0);
  const [itemLivreP, setItemLivreP] = useState<number>(0);
  const [itemLivreH, setItemLivreH] = useState<number>(0);
  const [itemLivreG, setItemLivreG] = useState<number>(0);
  const [itemLivreRefeicao, setItemLivreRefeicao] = useState<string>('Lanche');
  const [alimentoPreDefinidoId, setAlimentoPreDefinidoId] = useState<string>('');

  // Calculadora Rápida de Equivalências
  const [alimentoOrigem, setAlimentoOrigem] = useState<string>('arroz_branco_cozido');
  const [gramasOrigem, setGramasOrigem] = useState<number>(150);
  const [alimentoDestino, setAlimentoDestino] = useState<string>('batata_inglesa_cozida');
  const [resultadoTroca, setResultadoTroca] = useState<any>(null);

  useEffect(() => {
    carregarTudo();
  }, []);

  const carregarTudo = async () => {
    try {
      setCarregando(true);
      const [perfilRes, planoRes, alimentosRes, diarioRes, prefsRes, histFasesRes] = await Promise.all([
        ServicoApi.obterPerfil(),
        ServicoApi.obterPlanoDietaAtivo(),
        ServicoApi.obterTabelaAlimentos(),
        ServicoApi.obterRegistoDiarioConsumo(),
        ServicoApi.obterPreferenciasNutricao().catch(() => null),
        ServicoApi.obterHistoricoFasesDieta().catch(() => [])
      ]);

      setPerfil(perfilRes.perfil);
      if (perfilRes.perfil.projeto_ativo_json) {
        try {
          setProjetoAtivo(JSON.parse(perfilRes.perfil.projeto_ativo_json));
        } catch {
          setProjetoAtivo(null);
        }
      }

      setPlano(planoRes);
      setAlimentos(alimentosRes);
      setRegistoDiario(diarioRes);

      if (histFasesRes && histFasesRes.length > 0) {
        setHistoricoFases(histFasesRes);
        setFaseInspecionada(histFasesRes[0]);
      }

      if (prefsRes) {
        setPreferenciasIA(prefsRes);
      }
    } catch (err) {
      console.error('Erro ao carregar dados de nutrição:', err);
      setMensagemErro('Erro ao carregar os dados de nutrição e diário.');
    } finally {
      setCarregando(false);
    }
  };

  // -------------------------------------------------------------
  // EDIÇÃO MANUAL DO PLANO DE REFEIÇÕES (Modo 1)
  // -------------------------------------------------------------
  const handleAlterarNomeRefeicao = (rIdx: number, novoNome: string) => {
    if (!plano) return;
    const novasRefeicoes = [...plano.refeicoes];
    novasRefeicoes[rIdx] = { ...novasRefeicoes[rIdx], nome: novoNome };
    setPlano({ ...plano, refeicoes: novasRefeicoes });
  };

  const handleAlterarHorarioRefeicao = (rIdx: number, novoHorario: string) => {
    if (!plano) return;
    const novasRefeicoes = [...plano.refeicoes];
    novasRefeicoes[rIdx] = { ...novasRefeicoes[rIdx], horario_sugerido: novoHorario };
    setPlano({ ...plano, refeicoes: novasRefeicoes });
  };

  const handleAdicionarRefeicao = () => {
    if (!plano) return;
    const proximoNum = plano.refeicoes.length + 1;
    const novaRef = {
      id: `refeicao_${proximoNum}_${Date.now()}`,
      nome: `Refeição ${proximoNum}`,
      horario_sugerido: '16:00',
      calorias: 0,
      proteina_g: 0,
      hidratos_g: 0,
      gordura_g: 0,
      alimentos: []
    };
    setPlano({
      ...plano,
      refeicoes: [...plano.refeicoes, novaRef]
    });
    setMensagemSucesso(`Refeição ${proximoNum} adicionada ao plano. Podes agora adicionar alimentos.`);
    setTimeout(() => setMensagemSucesso(''), 4000);
  };

  const handleRemoverRefeicao = (rIdx: number) => {
    if (!plano) return;
    const refRemovida = plano.refeicoes[rIdx];
    const novasRefeicoes = plano.refeicoes.filter((_, idx) => idx !== rIdx);
    
    // Recalcular totais
    const totalKcal = Math.round(novasRefeicoes.reduce((acc, r) => acc + (r.calorias || 0), 0) * 10) / 10;
    const totalP = Math.round(novasRefeicoes.reduce((acc, r) => acc + (r.proteina_g || 0), 0) * 10) / 10;
    const totalH = Math.round(novasRefeicoes.reduce((acc, r) => acc + (r.hidratos_g || 0), 0) * 10) / 10;
    const totalG = Math.round(novasRefeicoes.reduce((acc, r) => acc + (r.gordura_g || 0), 0) * 10) / 10;

    setPlano({
      ...plano,
      calorias: totalKcal,
      macros: {
        ...plano.macros,
        calorias: totalKcal,
        proteina_g: totalP,
        hidratos_g: totalH,
        gordura_g: totalG
      },
      refeicoes: novasRefeicoes
    });
    setMensagemSucesso(`Refeição "${refRemovida.nome}" removida.`);
    setTimeout(() => setMensagemSucesso(''), 3000);
  };

  const handleAlterarGramasAlimento = (rIdx: number, aIdx: number, novasGramas: number) => {
    if (!plano) return;
    const novasRefeicoes = [...plano.refeicoes];
    const refAtual = { ...novasRefeicoes[rIdx] };
    const alimentosRef = [...(refAtual.alimentos || [])];
    const alimAtual = { ...alimentosRef[aIdx] };

    // Tentar obter dados nutricionais por 100g
    const idBase = alimAtual.id_alimento.includes('_')
      ? alimAtual.id_alimento.split('_').slice(0, -1).join('_')
      : alimAtual.id_alimento;
    const alimInfo = alimentos.find((a) => a.id === idBase || a.id === alimAtual.id_alimento || a.nome === alimAtual.nome);

    let fatorKcal = alimInfo ? alimInfo.kcal / 100 : alimAtual.gramas > 0 ? alimAtual.calorias / alimAtual.gramas : 1.5;
    let fatorP = alimInfo ? alimInfo.proteina / 100 : alimAtual.gramas > 0 ? alimAtual.proteina_g / alimAtual.gramas : 0.15;
    let fatorH = alimInfo ? alimInfo.hidratos / 100 : alimAtual.gramas > 0 ? alimAtual.hidratos_g / alimAtual.gramas : 0.2;
    let fatorG = alimInfo ? alimInfo.gordura / 100 : alimAtual.gramas > 0 ? alimAtual.gordura_g / alimAtual.gramas : 0.05;

    alimAtual.gramas = novasGramas;
    alimAtual.calorias = Math.round(novasGramas * fatorKcal * 10) / 10;
    alimAtual.proteina_g = Math.round(novasGramas * fatorP * 10) / 10;
    alimAtual.hidratos_g = Math.round(novasGramas * fatorH * 10) / 10;
    alimAtual.gordura_g = Math.round(novasGramas * fatorG * 10) / 10;

    alimentosRef[aIdx] = alimAtual;
    refAtual.alimentos = alimentosRef;

    // Recalcular refeição
    refAtual.calorias = Math.round(alimentosRef.reduce((acc, a) => acc + a.calorias, 0) * 10) / 10;
    refAtual.proteina_g = Math.round(alimentosRef.reduce((acc, a) => acc + a.proteina_g, 0) * 10) / 10;
    refAtual.hidratos_g = Math.round(alimentosRef.reduce((acc, a) => acc + a.hidratos_g, 0) * 10) / 10;
    refAtual.gordura_g = Math.round(alimentosRef.reduce((acc, a) => acc + a.gordura_g, 0) * 10) / 10;

    novasRefeicoes[rIdx] = refAtual;

    // Recalcular totais do plano
    const totalKcal = Math.round(novasRefeicoes.reduce((acc, r) => acc + r.calorias, 0) * 10) / 10;
    const totalP = Math.round(novasRefeicoes.reduce((acc, r) => acc + r.proteina_g, 0) * 10) / 10;
    const totalH = Math.round(novasRefeicoes.reduce((acc, r) => acc + r.hidratos_g, 0) * 10) / 10;
    const totalG = Math.round(novasRefeicoes.reduce((acc, r) => acc + r.gordura_g, 0) * 10) / 10;

    setPlano({
      ...plano,
      calorias: totalKcal,
      macros: {
        ...plano.macros,
        calorias: totalKcal,
        proteina_g: totalP,
        hidratos_g: totalH,
        gordura_g: totalG
      },
      refeicoes: novasRefeicoes
    });
  };

  const handleRemoverAlimentoRefeicao = (rIdx: number, aIdx: number) => {
    if (!plano) return;
    const novasRefeicoes = [...plano.refeicoes];
    const refAtual = { ...novasRefeicoes[rIdx] };
    const alimentosNovos = (refAtual.alimentos || []).filter((_, idx) => idx !== aIdx);

    refAtual.alimentos = alimentosNovos;
    refAtual.calorias = Math.round(alimentosNovos.reduce((acc, a) => acc + a.calorias, 0) * 10) / 10;
    refAtual.proteina_g = Math.round(alimentosNovos.reduce((acc, a) => acc + a.proteina_g, 0) * 10) / 10;
    refAtual.hidratos_g = Math.round(alimentosNovos.reduce((acc, a) => acc + a.hidratos_g, 0) * 10) / 10;
    refAtual.gordura_g = Math.round(alimentosNovos.reduce((acc, a) => acc + a.gordura_g, 0) * 10) / 10;

    novasRefeicoes[rIdx] = refAtual;

    const totalKcal = Math.round(novasRefeicoes.reduce((acc, r) => acc + r.calorias, 0) * 10) / 10;
    const totalP = Math.round(novasRefeicoes.reduce((acc, r) => acc + r.proteina_g, 0) * 10) / 10;
    const totalH = Math.round(novasRefeicoes.reduce((acc, r) => acc + r.hidratos_g, 0) * 10) / 10;
    const totalG = Math.round(novasRefeicoes.reduce((acc, r) => acc + r.gordura_g, 0) * 10) / 10;

    setPlano({
      ...plano,
      calorias: totalKcal,
      macros: {
        ...plano.macros,
        calorias: totalKcal,
        proteina_g: totalP,
        hidratos_g: totalH,
        gordura_g: totalG
      },
      refeicoes: novasRefeicoes
    });
  };

  const handleAbrirModalAddAlimento = (rIdx: number) => {
    setModalAddAlimentoRefIndex(rIdx);
    setNovoAlimSelecionadoId('');
    setNovoAlimNome('');
    setNovoAlimGramas(100);
    setNovoAlimKcal(0);
    setNovoAlimP(0);
    setNovoAlimH(0);
    setNovoAlimG(0);
  };

  const handleSelecionarNovoAlimCatalogo = (id: string) => {
    setNovoAlimSelecionadoId(id);
    const alim = alimentos.find((a) => a.id === id);
    if (alim) {
      setNovoAlimNome(alim.nome);
      setNovoAlimKcal(Math.round(((novoAlimGramas / 100) * alim.kcal) * 10) / 10);
      setNovoAlimP(Math.round(((novoAlimGramas / 100) * alim.proteina) * 10) / 10);
      setNovoAlimH(Math.round(((novoAlimGramas / 100) * alim.hidratos) * 10) / 10);
      setNovoAlimG(Math.round(((novoAlimGramas / 100) * alim.gordura) * 10) / 10);
    }
  };

  const handleGramasNovoAlimChange = (gramas: number) => {
    setNovoAlimGramas(gramas);
    const alim = alimentos.find((a) => a.id === novoAlimSelecionadoId);
    if (alim) {
      setNovoAlimKcal(Math.round(((gramas / 100) * alim.kcal) * 10) / 10);
      setNovoAlimP(Math.round(((gramas / 100) * alim.proteina) * 10) / 10);
      setNovoAlimH(Math.round(((gramas / 100) * alim.hidratos) * 10) / 10);
      setNovoAlimG(Math.round(((gramas / 100) * alim.gordura) * 10) / 10);
    }
  };

  const handleConfirmarAdicionarAlimentoRefeicao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plano || modalAddAlimentoRefIndex === null || !novoAlimNome.trim()) return;

    const rIdx = modalAddAlimentoRefIndex;
    const novasRefeicoes = [...plano.refeicoes];
    const refAtual = { ...novasRefeicoes[rIdx] };
    const alimentosNovos = [...(refAtual.alimentos || [])];

    const novoItem = {
      id_alimento: novoAlimSelecionadoId ? `${novoAlimSelecionadoId}_${rIdx + 1}` : `custom_${Date.now()}_${rIdx + 1}`,
      nome: novoAlimNome.trim(),
      gramas: novoAlimGramas,
      calorias: novoAlimKcal,
      proteina_g: novoAlimP,
      hidratos_g: novoAlimH,
      gordura_g: novoAlimG,
      consumido: false
    };

    alimentosNovos.push(novoItem);
    refAtual.alimentos = alimentosNovos;

    refAtual.calorias = Math.round(alimentosNovos.reduce((acc, a) => acc + a.calorias, 0) * 10) / 10;
    refAtual.proteina_g = Math.round(alimentosNovos.reduce((acc, a) => acc + a.proteina_g, 0) * 10) / 10;
    refAtual.hidratos_g = Math.round(alimentosNovos.reduce((acc, a) => acc + a.hidratos_g, 0) * 10) / 10;
    refAtual.gordura_g = Math.round(alimentosNovos.reduce((acc, a) => acc + a.gordura_g, 0) * 10) / 10;

    novasRefeicoes[rIdx] = refAtual;

    const totalKcal = Math.round(novasRefeicoes.reduce((acc, r) => acc + r.calorias, 0) * 10) / 10;
    const totalP = Math.round(novasRefeicoes.reduce((acc, r) => acc + r.proteina_g, 0) * 10) / 10;
    const totalH = Math.round(novasRefeicoes.reduce((acc, r) => acc + r.hidratos_g, 0) * 10) / 10;
    const totalG = Math.round(novasRefeicoes.reduce((acc, r) => acc + r.gordura_g, 0) * 10) / 10;

    setPlano({
      ...plano,
      calorias: totalKcal,
      macros: {
        ...plano.macros,
        calorias: totalKcal,
        proteina_g: totalP,
        hidratos_g: totalH,
        gordura_g: totalG
      },
      refeicoes: novasRefeicoes
    });

    setModalAddAlimentoRefIndex(null);
    setMensagemSucesso(`"${novoAlimNome}" adicionado à ${refAtual.nome}.`);
    setTimeout(() => setMensagemSucesso(''), 3000);
  };

  const handleSalvarPlanoManual = async () => {
    if (!plano) return;
    try {
      setSalvandoPlano(true);
      const res = await ServicoApi.salvarPlanoDieta({
        nome: plano.nome,
        calorias: plano.calorias,
        proteina_g: plano.macros.proteina_g,
        gordura_g: plano.macros.gordura_g,
        hidratos_g: plano.macros.hidratos_g,
        fibras_g: plano.macros.fibras_g || 30.0,
        refeicoes: plano.refeicoes
      });
      setPlano(res.plano);
      setMensagemSucesso('Todas as alterações e alimentos do plano foram guardados com sucesso!');
      setTimeout(() => setMensagemSucesso(''), 5000);
    } catch (err: any) {
      console.error(err);
      setMensagemErro(err.message || 'Erro ao guardar plano.');
      setTimeout(() => setMensagemErro(''), 5000);
    } finally {
      setSalvandoPlano(false);
    }
  };

  // -------------------------------------------------------------
  // AUDITORIA E CALIBRAÇÃO COM IA (Mantém alimentos, calibra doses)
  // -------------------------------------------------------------
  const handleAbrirModalCalibracao = () => {
    setResultadoCalibracao(null);
    setModalCalibrarVisivel(true);
  };

  const handleExecutarCalibracaoIA = async () => {
    if (!plano) return;
    try {
      setCalibrandoIA(true);
      const faseInfo = extrairInfoFaseAtiva(perfil, projetoAtivo);

      const res = await ServicoApi.calibrarDietaIA({
        refeicoes: plano.refeicoes,
        calorias_alvo: faseInfo.calorias,
        fase_projeto: faseInfo.tipo,
        alimentos_preferidos: preferenciasIA?.alimentos_preferidos || undefined,
        alimentos_evitados: preferenciasIA?.alimentos_evitados || undefined,
        instrucoes_adicionais: instrucoesCalibracao.trim() || undefined,
        chave_api_ia: perfil?.chave_api_ia || undefined
      });

      setResultadoCalibracao(res);
    } catch (err: any) {
      console.error(err);
      setMensagemErro(err.message || 'Falha ao calibrar dieta com IA.');
      setTimeout(() => setMensagemErro(''), 5000);
    } finally {
      setCalibrandoIA(false);
    }
  };

  const handleAplicarCalibracao = async () => {
    if (!resultadoCalibracao) return;
    try {
      setSalvandoPlano(true);
      const res = await ServicoApi.salvarPlanoDieta({
        nome: resultadoCalibracao.nome_plano || `Dieta Calibrada (${metaKcal} kcal)`,
        calorias: resultadoCalibracao.calorias_alvo,
        proteina_g: resultadoCalibracao.proteina_alvo_g,
        gordura_g: resultadoCalibracao.gordura_alvo_g,
        hidratos_g: resultadoCalibracao.hidratos_alvo_g,
        fibras_g: 30.0,
        refeicoes: resultadoCalibracao.refeicoes
      });

      setPlano(res.plano);
      setModalCalibrarVisivel(false);
      const novoDiario = await ServicoApi.obterRegistoDiarioConsumo().catch(() => null);
      if (novoDiario) setRegistoDiario(novoDiario);
      setMensagemSucesso('Calibração da IA aplicada com sucesso! Os teus alimentos foram mantidos e as doses ajustadas à fase.');
      setTimeout(() => setMensagemSucesso(''), 6000);
    } catch (err: any) {
      console.error(err);
      setMensagemErro(err.message || 'Erro ao aplicar calibração.');
    } finally {
      setSalvandoPlano(false);
    }
  };

  // Toggle do Check de Alimento no Modo 1
  const handleToggleCheckAlimento = async (
    refeicaoIdx: number,
    alimIdx: number,
    item: {
      id_alimento: string;
      nome: string;
      calorias: number;
      proteina_g: number;
      hidratos_g: number;
      gordura_g: number;
    }
  ) => {
    if (!registoDiario) return;

    const estadoAtual = Boolean(registoDiario.checks_refeicoes?.[item.id_alimento]);
    const novoEstado = !estadoAtual;

    const novosChecks = { ...registoDiario.checks_refeicoes, [item.id_alimento]: novoEstado };
    const fator = novoEstado ? 1.0 : -1.0;
    const novasKcal = Math.max(0, Math.round((registoDiario.calorias_consumidas + fator * item.calorias) * 10) / 10);
    const novaP = Math.max(0, Math.round((registoDiario.proteina_consumida_g + fator * item.proteina_g) * 10) / 10);
    const novaH = Math.max(0, Math.round((registoDiario.hidratos_consumidos_g + fator * item.hidratos_g) * 10) / 10);
    const novaG = Math.max(0, Math.round((registoDiario.gordura_consumida_g + fator * item.gordura_g) * 10) / 10);

    setRegistoDiario({
      ...registoDiario,
      checks_refeicoes: novosChecks,
      calorias_consumidas: novasKcal,
      proteina_consumida_g: novaP,
      hidratos_consumidos_g: novaH,
      gordura_consumida_g: novaG
    });

    try {
      const res = await ServicoApi.toggleCheckRefeicao({
        item_id: item.id_alimento,
        consumido: novoEstado,
        calorias: item.calorias,
        proteina_g: item.proteina_g,
        hidratos_g: item.hidratos_g,
        gordura_g: item.gordura_g
      });
      setRegistoDiario((prev) =>
        prev
          ? {
              ...prev,
              checks_refeicoes: res.checks_refeicoes,
              calorias_consumidas: res.calorias_consumidas,
              proteina_consumida_g: res.proteina_consumida_g,
              hidratos_consumidos_g: res.hidratos_consumidos_g,
              gordura_consumida_g: res.gordura_consumida_g
            }
          : null
      );
    } catch (err) {
      console.error('Erro ao alternar check:', err);
      carregarTudo();
    }
  };

  const handleToggleCheckRefeicaoInteira = async (refeicao: any) => {
    if (!registoDiario || !refeicao.alimentos) return;

    const todosChecados = refeicao.alimentos.every(
      (a: any) => Boolean(registoDiario.checks_refeicoes?.[a.id_alimento])
    );
    const novoEstado = !todosChecados;

    for (const alim of refeicao.alimentos) {
      const estadoItem = Boolean(registoDiario.checks_refeicoes?.[alim.id_alimento]);
      if (estadoItem !== novoEstado) {
        await ServicoApi.toggleCheckRefeicao({
          item_id: alim.id_alimento,
          consumido: novoEstado,
          calorias: alim.calorias,
          proteina_g: alim.proteina_g,
          hidratos_g: alim.hidratos_g,
          gordura_g: alim.gordura_g
        });
      }
    }

    const res = await ServicoApi.obterRegistoDiarioConsumo();
    setRegistoDiario(res);
  };

  const handleAbrirTroca = (refeicaoIndex: number, alimentoIndex: number, alimento: any) => {
    setTrocaContexto({
      refeicaoIndex,
      alimentoIndex,
      alimentoNome: alimento.nome,
      gramas: alimento.gramas
    });
    setMotivoTroca('Estava a cair mal / digestão pesada');
    setOutroMotivoAtivo(false);
    setMotivoPersonalizado('');
    setAnaliseNutricionalIA('');
    setRecomendacoesAlimentosIA([]);
    setGramasSugeridasIA(null);
    setQueixaNutricional('Estava a cair mal / digestão pesada');
    const sugestao = alimentos.find((a) => !alimento.id_alimento.includes(a.id));
    if (sugestao) {
      setNovoAlimentoId(sugestao.id);
    }
    setModalTrocaVisivel(true);
  };

  const handlePedirRecomendacoesIA = async () => {
    if (!trocaContexto) return;
    try {
      setConsultandoSubstituicaoIA(true);
      const queixaFinal = outroMotivoAtivo
        ? (motivoPersonalizado.trim() || queixaNutricional)
        : (queixaNutricional || motivoTroca);

      const refeicaoAtual = plano?.refeicoes?.[trocaContexto.refeicaoIndex];
      const faseInfo = extrairInfoFaseAtiva(perfil, projetoAtivo);

      const res = await ServicoApi.sugerirSubstituicaoAlimentoIA({
        alimento_atual: trocaContexto.alimentoNome,
        gramas_atuais: trocaContexto.gramas,
        motivo_queixa: queixaFinal,
        refeicao_nome: refeicaoAtual?.nome || 'Refeição',
        fase_projeto: faseInfo.tipo,
        chave_api_ia: perfil?.chave_api_ia || undefined
      });

      setAnaliseNutricionalIA(res.analise_nutricional || '');
      setRecomendacoesAlimentosIA(res.recomendacoes || []);
    } catch (err: any) {
      console.error(err);
      setMensagemErro(err.message || 'Erro ao consultar recomendações com IA.');
      setTimeout(() => setMensagemErro(''), 5000);
    } finally {
      setConsultandoSubstituicaoIA(false);
    }
  };

  const handleAplicarRecomendacaoAlimentoIA = (rec: any) => {
    setNovoAlimentoId(rec.id_alimento);
    setGramasSugeridasIA(rec.gramas_sugeridas);
    setMotivoTroca(`Substituição IA: ${rec.justificativa_nutricional}`);
    setOutroMotivoAtivo(false);
  };

  const carregarHistoricoFases = async () => {
    try {
      const hist = await ServicoApi.obterHistoricoFasesDieta();
      setHistoricoFases(hist);
      if (hist.length > 0 && !faseInspecionada) {
        setFaseInspecionada(hist[0]);
      }
    } catch (err) {
      console.error('Erro ao carregar histórico de fases:', err);
    }
  };

  const handleExecutarSubstituicao = async () => {
    if (!trocaContexto) return;
    try {
      setSubstituindo(true);
      const motivoFinal = outroMotivoAtivo
        ? (motivoPersonalizado.trim() || 'Ajuste personalizado')
        : motivoTroca;

      const res = await ServicoApi.substituirAlimentoPlano({
        refeicao_index: trocaContexto.refeicaoIndex,
        alimento_index: trocaContexto.alimentoIndex,
        novo_alimento_id: novoAlimentoId,
        gramas_sugeridas: gramasSugeridasIA || undefined,
        motivo: motivoFinal
      });
      setPlano(res.plano);
      setModalTrocaVisivel(false);
      setMensagemSucesso(res.mensagem || 'Alimento substituído e adaptação registada com sucesso!');
      await carregarHistoricoFases();
      const novoDiario = await ServicoApi.obterRegistoDiarioConsumo().catch(() => null);
      if (novoDiario) setRegistoDiario(novoDiario);
      setTimeout(() => setMensagemSucesso(''), 5000);
    } catch (err: any) {
      console.error(err);
      setMensagemErro(err.message || 'Erro ao substituir alimento.');
      setTimeout(() => setMensagemErro(''), 5000);
    } finally {
      setSubstituindo(false);
    }
  };

  const handleReativarFaseDieta = async (planoId: number) => {
    try {
      setReativandoFase(true);
      const res = await ServicoApi.reativarFaseDieta(planoId);
      setPlano(res.plano);
      setModalHistoricoVisivel(false);
      setMensagemSucesso(res.mensagem || 'Plano da fase reativado com sucesso!');
      await carregarHistoricoFases();
      setTimeout(() => setMensagemSucesso(''), 5000);
    } catch (err: any) {
      console.error(err);
      setMensagemErro(err.message || 'Erro ao reativar fase da dieta.');
      setTimeout(() => setMensagemErro(''), 5000);
    } finally {
      setReativandoFase(false);
    }
  };

  const handlePrescreverDietaIA = async () => {
    try {
      setGerandoIA(true);
      const faseInfo = extrairInfoFaseAtiva(perfil, projetoAtivo);
      const caloriasProjeto = faseInfo.calorias;
      const faseProjeto = faseInfo.tipo;
      const nomeFase = faseInfo.nome;

      const res = await ServicoApi.prescreverDietaIA({
        calorias_diarias: caloriasProjeto,
        fase_projeto: faseProjeto,
        nome_fase_projeto: nomeFase,
        alimentos_preferidos: preferenciasIA.alimentos_preferidos,
        alimentos_evitados: preferenciasIA.alimentos_evitados,
        numero_refeicoes: preferenciasIA.numero_refeicoes,
        horario_treino: preferenciasIA.horario_treino,
        habitos_apetite: preferenciasIA.habitos_apetite,
        alimentos_dificeis: preferenciasIA.alimentos_dificeis,
        chave_api_ia: perfil?.chave_api_ia || undefined
      });

      setPlano(res.plano);
      setModalIAVisivel(false);
      const diarioAtualizado = await ServicoApi.obterRegistoDiarioConsumo();
      setRegistoDiario(diarioAtualizado);

      setMensagemSucesso('Nova dieta gerada com IA e sincronizada com sucesso!');
      setTimeout(() => setMensagemSucesso(''), 6000);
    } catch (err: any) {
      console.error(err);
      setMensagemErro(err.message || 'Falha ao gerar dieta com IA.');
      setTimeout(() => setMensagemErro(''), 5000);
    } finally {
      setGerandoIA(false);
    }
  };

  const handleSelecionarAlimentoPreDefinido = (id: string) => {
    setAlimentoPreDefinidoId(id);
    const alim = alimentos.find((a) => a.id === id);
    if (alim) {
      setItemLivreNome(alim.nome);
      setItemLivreKcal(Math.round(((itemLivreGramas / 100) * alim.kcal) * 10) / 10);
      setItemLivreP(Math.round(((itemLivreGramas / 100) * alim.proteina) * 10) / 10);
      setItemLivreH(Math.round(((itemLivreGramas / 100) * alim.hidratos) * 10) / 10);
      setItemLivreG(Math.round(((itemLivreGramas / 100) * alim.gordura) * 10) / 10);
    }
  };

  const handleGramasLivresChange = (novasGramas: number) => {
    setItemLivreGramas(novasGramas);
    const alim = alimentos.find((a) => a.id === alimentoPreDefinidoId);
    if (alim) {
      setItemLivreKcal(Math.round(((novasGramas / 100) * alim.kcal) * 10) / 10);
      setItemLivreP(Math.round(((novasGramas / 100) * alim.proteina) * 10) / 10);
      setItemLivreH(Math.round(((novasGramas / 100) * alim.hidratos) * 10) / 10);
      setItemLivreG(Math.round(((novasGramas / 100) * alim.gordura) * 10) / 10);
    }
  };

  const handleAdicionarItemAvulso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemLivreNome.trim()) return;

    try {
      const res = await ServicoApi.adicionarItemAvulso({
        nome: itemLivreNome.trim(),
        gramas: itemLivreGramas,
        calorias: itemLivreKcal,
        proteina_g: itemLivreP,
        hidratos_g: itemLivreH,
        gordura_g: itemLivreG,
        refeicao_nome: itemLivreRefeicao
      });

      if (registoDiario) {
        setRegistoDiario({
          ...registoDiario,
          itens_avulsos: res.itens_avulsos,
          calorias_consumidas: res.calorias_consumidas,
          proteina_consumida_g: res.proteina_consumida_g,
          hidratos_consumidos_g: res.hidratos_consumidos_g,
          gordura_consumida_g: res.gordura_consumida_g
        });
      }

      setItemLivreNome('');
      setItemLivreKcal(0);
      setItemLivreP(0);
      setItemLivreH(0);
      setItemLivreG(0);
      setAlimentoPreDefinidoId('');
      setMensagemSucesso('Alimento adicionado ao registo de hoje!');
      setTimeout(() => setMensagemSucesso(''), 3000);
    } catch (err: any) {
      console.error(err);
      setMensagemErro(err.message || 'Erro ao adicionar item.');
    }
  };

  const handleRemoverItemAvulso = async (idx: number) => {
    try {
      const res = await ServicoApi.removerItemAvulso(idx);
      if (registoDiario) {
        setRegistoDiario({
          ...registoDiario,
          itens_avulsos: res.itens_avulsos,
          calorias_consumidas: res.calorias_consumidas,
          proteina_consumida_g: res.proteina_consumida_g,
          hidratos_consumidos_g: res.hidratos_consumidos_g,
          gordura_consumida_g: res.gordura_consumida_g
        });
      }
    } catch (err: any) {
      console.error(err);
      setMensagemErro(err.message || 'Erro ao remover item.');
    }
  };

  const handleCalcularTroca = async () => {
    try {
      const res = await ServicoApi.calcularSubstituicao(alimentoOrigem, gramasOrigem, alimentoDestino);
      setResultadoTroca(res);
    } catch (err: any) {
      console.error(err);
    }
  };

  if (carregando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        <p className="text-sm text-slate-400">A carregar plano nutricional e registo diário...</p>
      </div>
    );
  }

  const faseAtivaInfo = extrairInfoFaseAtiva(perfil, projetoAtivo);

  // Metas do dia (prioridade: plano de dieta ativo / calibração recente)
  const metaKcal = plano?.calorias || perfil?.calorias_atuais || faseAtivaInfo.calorias || registoDiario?.calorias_alvo || 2500;
  const metaP = plano?.macros.proteina_g || registoDiario?.proteina_alvo_g || 160;
  const metaH = plano?.macros.hidratos_g || registoDiario?.hidratos_alvo_g || 280;
  const metaG = plano?.macros.gordura_g || registoDiario?.gordura_alvo_g || 65;

  const consumidoKcal = registoDiario?.calorias_consumidas || 0;
  const consumidoP = registoDiario?.proteina_consumida_g || 0;
  const consumidoH = registoDiario?.hidratos_consumidos_g || 0;
  const consumidoG = registoDiario?.gordura_consumida_g || 0;

  const pctKcal = Math.min(100, Math.round((consumidoKcal / metaKcal) * 100));
  const pctP = Math.min(100, Math.round((consumidoP / metaP) * 100));
  const pctH = Math.min(100, Math.round((consumidoH / metaH) * 100));
  const pctG = Math.min(100, Math.round((consumidoG / metaG) * 100));

  return (
    <div className="space-y-4 sm:space-y-6 pb-16">
      {/* CARD 1: Sincronização Estrita com o Projeto Ativo */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5" /> Fase do Projeto Sincronizada
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
            <span>
              {faseAtivaInfo.nome}
              <span className="text-xs font-bold text-slate-400 ml-2">
                ({faseAtivaInfo.calorias} kcal/dia)
              </span>
            </span>
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            {faseAtivaInfo.foco
              ? `Diretriz do Projeto: ${faseAtivaInfo.foco}. A dieta está calibrada para atingir o peso e composição corporal exatos estipulados no Projetor de Metas.`
              : 'As calorias e macronutrientes da dieta respeitam rigorosamente a fase ativa definida no teu Projetor de Metas.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botão de Histórico de Fases */}
          <button
            onClick={() => {
              carregarHistoricoFases();
              setModalHistoricoVisivel(true);
            }}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-xl text-xs flex items-center gap-1.5 transition border border-amber-500/30 active:scale-95"
            title="Ver o que comias em fases anteriores e registo de alterações"
          >
            <History className="w-4 h-4 text-amber-400" />
            <span>Histórico de Fases ({historicoFases.length})</span>
          </button>

          {/* Botão de Auditoria / Calibração da Dieta Atual */}
          <button
            onClick={handleAbrirModalCalibracao}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold rounded-xl text-xs flex items-center gap-1.5 transition border border-emerald-500/30 active:scale-95"
            title="A IA analisa os alimentos que já tens na tua dieta e calibra apenas as doses/gramagens para bater os macros da fase"
          >
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Calibrar Doses com IA</span>
          </button>

          {/* Botão de Prescrever Dieta Nova do Zero com IA */}
          <button
            onClick={() => setModalIAVisivel(true)}
            className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <Sparkles className="w-4 h-4 fill-slate-950" />
            <span>Gerar Nova Dieta IA</span>
          </button>
        </div>
      </div>

      {/* PAINEL DE MEMÓRIA & DIAGNÓSTICO CONTÍNUO DA IA */}
      <PainelMemoriaIA tipo="nutricao" />

      {mensagemSucesso && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 rounded-xl flex items-center gap-3 text-sm animate-fade-in shadow-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{mensagemSucesso}</span>
        </div>
      )}

      {mensagemErro && (
        <div className="p-4 bg-rose-950/60 border border-rose-500/50 text-rose-300 rounded-xl flex items-center gap-3 text-sm animate-fade-in shadow-md">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{mensagemErro}</span>
        </div>
      )}

      {/* CARD 2: Painel de Progresso Diário (Consumido vs Alvo) */}
      <div className="bg-slate-900/70 p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-400" />
              Balanço e Progresso de Hoje
            </h3>
            <span className="text-xs text-slate-400">
              Soma automática das refeições checadas e dos alimentos registados livremente.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">Total Consumido:</span>
            <span className="text-lg font-black text-white">
              {consumidoKcal} / <span className="text-emerald-400">{metaKcal} kcal</span>
            </span>
          </div>
        </div>

        {/* 4 Cards de Macros */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs text-slate-400 font-semibold mb-1">
              <span className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-400" /> Calorias
              </span>
              <span className="text-orange-400 font-bold">{pctKcal}%</span>
            </div>
            <div className="text-xl font-black text-white">
              {consumidoKcal} <span className="text-xs text-slate-400 font-normal">/ {metaKcal} kcal</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-2.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  consumidoKcal > metaKcal ? 'bg-rose-500' : 'bg-orange-500'
                }`}
                style={{ width: `${pctKcal}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs text-slate-400 font-semibold mb-1">
              <span>Proteína</span>
              <span className="text-emerald-400 font-bold">{pctP}%</span>
            </div>
            <div className="text-xl font-black text-emerald-400">
              {consumidoP} <span className="text-xs text-slate-400 font-normal">/ {metaP}g</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${pctP}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs text-slate-400 font-semibold mb-1">
              <span>Hidratos</span>
              <span className="text-blue-400 font-bold">{pctH}%</span>
            </div>
            <div className="text-xl font-black text-blue-400">
              {consumidoH} <span className="text-xs text-slate-400 font-normal">/ {metaH}g</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-blue-500 h-full transition-all duration-500"
                style={{ width: `${pctH}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs text-slate-400 font-semibold mb-1">
              <span>Gorduras</span>
              <span className="text-amber-400 font-bold">{pctG}%</span>
            </div>
            <div className="text-xl font-black text-amber-400">
              {consumidoG} <span className="text-xs text-slate-400 font-normal">/ {metaG}g</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-amber-500 h-full transition-all duration-500"
                style={{ width: `${pctG}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* SELETOR DE MODO */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setModoVisualizacao('plano_checks')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              modoVisualizacao === 'plano_checks'
                ? 'bg-emerald-600 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white bg-slate-950/60'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Modo 1: Refeições Estabelecidas com Checks</span>
          </button>

          <button
            onClick={() => setModoVisualizacao('registo_livre')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              modoVisualizacao === 'registo_livre'
                ? 'bg-emerald-600 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white bg-slate-950/60'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Modo 2: Registo Livre</span>
          </button>
        </div>

        <span className="text-xs text-slate-400 hidden lg:inline-block">
          {modoVisualizacao === 'plano_checks'
            ? '✓ Dá check no que comeste ou edita/adiciona alimentos e horários livremente.'
            : '✍️ Come livremente e vai registando o que consomes ao longo do dia.'}
        </span>
      </div>

      {/* MODO 1: REFEIÇÕES ESTABELECIDAS COM CHECKS & EDIÇÃO MANUAL */}
      {modoVisualizacao === 'plano_checks' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Utensils className="w-5 h-5 text-emerald-400" />
                <span>{plano?.nome || 'Plano de Refeições Prescrito'}</span>
              </h3>
              <span className="text-xs text-slate-400">
                Podes editar nomes, horários, gramagens, adicionar ou remover alimentos e refeições.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Botão de Adaptações Desta Fase */}
              <button
                onClick={() => setMostrarAdaptacoesPainel(!mostrarAdaptacoesPainel)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  mostrarAdaptacoesPainel
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                }`}
                title="Registo de trocas por digestão pesada, saciedade ou rotina"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-rose-400" />
                <span>Adaptações Desta Fase ({plano?.historico_alteracoes?.length || 0})</span>
              </button>

              <button
                onClick={() => setModoEdicaoAtivo(!modoEdicaoAtivo)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  modoEdicaoAtivo
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                }`}
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>{modoEdicaoAtivo ? 'Concluir Edição' : 'Editar Refeições'}</span>
              </button>

              <button
                onClick={handleSalvarPlanoManual}
                disabled={salvandoPlano}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition shadow disabled:opacity-50"
              >
                {salvandoPlano ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Salvar Alterações</span>
              </button>
            </div>
          </div>

          {/* Painel Expansível de Adaptações & Trocas da Fase */}
          {mostrarAdaptacoesPainel && (
            <div className="p-4 bg-slate-950/70 border border-rose-500/30 rounded-2xl space-y-3 animate-fade-in shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-rose-400" />
                  <h4 className="text-sm font-bold text-white">
                    Registo de Adaptações & Alimentos Trocados na Fase
                  </h4>
                </div>
                <span className="text-xs text-slate-400">
                  Total de alterações auditadas: {plano?.historico_alteracoes?.length || 0}
                </span>
              </div>

              {!plano?.historico_alteracoes || plano.historico_alteracoes.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">
                  Ainda não trocaste nenhum alimento nesta fase. Quando substituíres qualquer alimento (por exemplo, por estar a cair mal ou digestão pesada), o motivo e a equivalência ficam gravados aqui automaticamente.
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
                          <span className="font-bold text-emerald-400">{alt.refeicao}</span>
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 font-semibold text-xs">
                            🩺 {alt.motivo}
                          </span>
                        </div>
                        <div className="text-slate-200 flex items-center gap-2 font-medium">
                          <span className="line-through text-slate-400">{alt.alimento_origem}</span>
                          <span className="text-emerald-400 font-black">➔</span>
                          <span className="text-white font-bold">{alt.alimento_substituto}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`text-xs font-mono font-bold ${
                          alt.diferenca_kcal > 0 ? 'text-amber-400' : alt.diferenca_kcal < 0 ? 'text-teal-400' : 'text-slate-400'
                        }`}>
                          {alt.diferenca_kcal > 0 ? `+${alt.diferenca_kcal}` : alt.diferenca_kcal} kcal
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {plano?.refeicoes.map((ref, rIdx) => {
              const alimentosRef = ref.alimentos || [];
              const todosChecados =
                alimentosRef.length > 0 &&
                alimentosRef.every((a) => Boolean(registoDiario?.checks_refeicoes?.[a.id_alimento]));

              return (
                <div
                  key={ref.id || rIdx}
                  className={`p-5 rounded-2xl border transition-all ${
                    todosChecados
                      ? 'bg-emerald-950/20 border-emerald-500/40'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Cabeçalho da Refeição */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3 mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => handleToggleCheckRefeicaoInteira(ref)}
                        className="p-1 rounded-lg text-slate-400 hover:text-emerald-400 transition"
                        title={todosChecados ? 'Desmarcar refeição inteira' : 'Marcar refeição inteira como consumida'}
                      >
                        {todosChecados ? (
                          <CheckSquare className="w-6 h-6 text-emerald-400" />
                        ) : (
                          <Square className="w-6 h-6 text-slate-500 hover:text-slate-300" />
                        )}
                      </button>

                      <div className="flex-1">
                        {modoEdicaoAtivo ? (
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <input
                              type="text"
                              value={ref.nome}
                              onChange={(e) => handleAlterarNomeRefeicao(rIdx, e.target.value)}
                              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-sm font-bold text-white focus:border-emerald-500 focus:outline-none"
                            />
                            <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-700">
                              <Clock className="w-3.5 h-3.5 text-emerald-400" />
                              <input
                                type="text"
                                placeholder="Horário (ex: 08:30)"
                                value={ref.horario_sugerido || ''}
                                onChange={(e) => handleAlterarHorarioRefeicao(rIdx, e.target.value)}
                                className="bg-transparent text-xs text-white font-semibold w-16 text-center focus:outline-none"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-white text-base">{ref.nome}</h4>
                            {ref.horario_sugerido && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                                <Clock className="w-3 h-3 text-emerald-400" />
                                {ref.horario_sugerido}
                              </span>
                            )}
                          </div>
                        )}

                        <span className="text-xs text-slate-400">
                          Total da Refeição: <strong className="text-white">{ref.calorias} kcal</strong> (P: {ref.proteina_g}g | H:{' '}
                          {ref.hidratos_g}g | G: {ref.gordura_g}g)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className="text-xs font-black text-orange-400 bg-orange-950/40 border border-orange-500/20 px-3 py-1 rounded-lg">
                        {ref.calorias} kcal
                      </span>

                      {modoEdicaoAtivo && (
                        <button
                          onClick={() => handleRemoverRefeicao(rIdx)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition"
                          title="Remover esta refeição inteira"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Alimentos concretos com gramas, edição e botão de troca */}
                  {alimentosRef.length > 0 ? (
                    <div className="space-y-2.5">
                      {alimentosRef.map((alim, aIdx) => {
                        const estaChecado = Boolean(registoDiario?.checks_refeicoes?.[alim.id_alimento]);

                        return (
                          <div
                            key={alim.id_alimento || aIdx}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border transition-all gap-2 ${
                              estaChecado
                                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                                : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleToggleCheckAlimento(rIdx, aIdx, alim)}
                                className="flex-shrink-0"
                              >
                                {estaChecado ? (
                                  <CheckSquare className="w-5 h-5 text-emerald-400" />
                                ) : (
                                  <Square className="w-5 h-5 text-slate-600 hover:text-slate-400" />
                                )}
                              </button>

                              <div className="flex items-center gap-2">
                                <span className={`font-bold text-sm ${estaChecado ? 'line-through text-slate-400' : 'text-white'}`}>
                                  {alim.nome}
                                </span>

                                {modoEdicaoAtivo ? (
                                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5">
                                    <input
                                      type="number"
                                      min="5"
                                      step="5"
                                      value={alim.gramas}
                                      onChange={(e) => handleAlterarGramasAlimento(rIdx, aIdx, parseFloat(e.target.value) || 0)}
                                      className="w-16 bg-transparent text-xs text-emerald-400 font-extrabold text-center focus:outline-none"
                                    />
                                    <span className="text-xs text-slate-400 font-semibold">g</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-emerald-400 font-extrabold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                                    {alim.gramas}g
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 text-xs pl-8 sm:pl-0">
                              <div className="flex items-center gap-3 text-slate-400">
                                <span>
                                  <strong className="text-orange-400">{alim.calorias}</strong> kcal
                                </span>
                                <span>
                                  P: <strong className="text-emerald-400">{alim.proteina_g}g</strong>
                                </span>
                                <span>
                                  H: <strong className="text-blue-400">{alim.hidratos_g}g</strong>
                                </span>
                                <span>
                                  G: <strong className="text-amber-400">{alim.gordura_g}g</strong>
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleAbrirTroca(rIdx, aIdx, alim)}
                                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-xs font-semibold flex items-center gap-1 transition"
                                  title="Trocar este alimento por outro equivalente mantendo os macros"
                                >
                                  <ArrowRightLeft className="w-3 h-3 text-emerald-400" />
                                  <span className="hidden sm:inline">Trocar</span>
                                </button>

                                {modoEdicaoAtivo && (
                                  <button
                                    onClick={() => handleRemoverAlimentoRefeicao(rIdx, aIdx)}
                                    className="p-1 text-slate-500 hover:text-rose-400 rounded transition"
                                    title="Remover alimento da refeição"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 text-xs text-slate-400">
                      Nenhum alimento nesta refeição. Clica em "+ Adicionar Alimento" abaixo para incluir comida.
                    </div>
                  )}

                  {/* Botão de Adicionar Alimento à Refeição */}
                  <div className="pt-3 mt-1 flex justify-end">
                    <button
                      onClick={() => handleAbrirModalAddAlimento(rIdx)}
                      className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold rounded-lg border border-slate-800 flex items-center gap-1.5 transition"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Adicionar Alimento a esta Refeição</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botões do Fundo: Adicionar Refeição & Salvar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
            <button
              onClick={handleAdicionarRefeicao}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 font-bold rounded-xl border border-slate-800 text-xs flex items-center justify-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Adicionar Nova Refeição</span>
            </button>

            <button
              onClick={handleSalvarPlanoManual}
              disabled={salvandoPlano}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {salvandoPlano ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>💾 Salvar Alterações do Plano</span>
            </button>
          </div>
        </div>
      )}

      {/* MODO 2: REGISTO LIVRE */}
      {modoVisualizacao === 'registo_livre' && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                Registar Alimento Consumido (Registo Livre)
              </h3>
              <span className="text-xs text-slate-400">
                Come livremente e adiciona aqui o que ingeriste. O sistema contabiliza diretamente nos teus totais diários.
              </span>
            </div>

            <form onSubmit={handleAdicionarItemAvulso} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Escolhe da Tabela de Alimentos (opcional para preenchimento rápido):
                  </label>
                  <select
                    value={alimentoPreDefinidoId}
                    onChange={(e) => handleSelecionarAlimentoPreDefinido(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="">-- Inserir manualmente ou escolher --</option>
                    {alimentos.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nome} ({a.kcal} kcal | P:{a.proteina}g | H:{a.hidratos}g | G:{a.gordura}g /100g)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Refeição / Momento:</label>
                  <select
                    value={itemLivreRefeicao}
                    onChange={(e) => setItemLivreRefeicao(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="Pequeno-Almoço">Pequeno-Almoço</option>
                    <option value="Almoço">Almoço</option>
                    <option value="Lanche / Pré-Treino">Lanche / Pré-Treino</option>
                    <option value="Jantar">Jantar</option>
                    <option value="Ceia">Ceia</option>
                    <option value="Snack Avulso">Snack Avulso</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Alimento:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Iogurte com granola"
                    value={itemLivreNome}
                    onChange={(e) => setItemLivreNome(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Gramas (g):</label>
                  <input
                    type="number"
                    min="1"
                    value={itemLivreGramas}
                    onChange={(e) => handleGramasLivresChange(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white text-center font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-orange-400 mb-1">Calorias (kcal):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={itemLivreKcal}
                    onChange={(e) => setItemLivreKcal(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-orange-400 text-center font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-emerald-400 mb-1">Proteína (g):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={itemLivreP}
                    onChange={(e) => setItemLivreP(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-emerald-400 text-center font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-blue-400 mb-1">Hidratos (g):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={itemLivreH}
                    onChange={(e) => setItemLivreH(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-blue-400 text-center font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar ao Diário</span>
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Alimentos Registados Livremente Hoje ({registoDiario?.itens_avulsos?.length || 0})
            </h4>

            {registoDiario?.itens_avulsos && registoDiario.itens_avulsos.length > 0 ? (
              <div className="space-y-2">
                {registoDiario.itens_avulsos.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{item.nome}</span>
                        <span className="text-xs text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                          {item.gramas}g
                        </span>
                        <span className="text-xs text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {item.refeicao_nome}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 mt-0.5 block">
                        Registado às {item.adicionado_em || '--:--'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right text-xs">
                        <span className="font-bold text-orange-400 block">{item.calorias} kcal</span>
                        <span className="text-slate-400 text-xs">
                          P: {item.proteina_g}g | H: {item.hidratos_g}g | G: {item.gordura_g}g
                        </span>
                      </div>

                      <button
                        onClick={() => handleRemoverItemAvulso(idx)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                        title="Remover este alimento do registo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-slate-950/40 rounded-xl border border-slate-800 text-center text-xs text-slate-500">
                Nenhum alimento avulso registado ainda hoje. Podes adicionar qualquer refeição no formulário acima.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADICIONAR ALIMENTO À REFEIÇÃO */}
      {modalAddAlimentoRefIndex !== null && plano && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                <span>Adicionar Alimento a "{plano.refeicoes[modalAddAlimentoRefIndex]?.nome}"</span>
              </h3>
              <button
                onClick={() => setModalAddAlimentoRefIndex(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmarAdicionarAlimentoRefeicao} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Escolhe da Tabela de Alimentos (opcional):
                </label>
                <select
                  value={novoAlimSelecionadoId}
                  onChange={(e) => handleSelecionarNovoAlimCatalogo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                >
                  <option value="">-- Inserir manualmente ou escolher --</option>
                  {alimentos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome} ({a.kcal} kcal/100g)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nome do Alimento:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Peito de Frango, Arroz, Ovos..."
                  value={novoAlimNome}
                  onChange={(e) => setNovoAlimNome(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Gramas (g):</label>
                  <input
                    type="number"
                    min="5"
                    value={novoAlimGramas}
                    onChange={(e) => handleGramasNovoAlimChange(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-bold text-center"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-orange-400 mb-1">Kcal:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={novoAlimKcal}
                    onChange={(e) => setNovoAlimKcal(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-orange-400 font-bold text-center"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-emerald-400 mb-1">Proteína (g):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={novoAlimP}
                    onChange={(e) => setNovoAlimP(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-emerald-400 font-bold text-center"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-blue-400 mb-1">Hidratos (g):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={novoAlimH}
                    onChange={(e) => setNovoAlimH(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-blue-400 font-bold text-center"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalAddAlimentoRefIndex(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl transition shadow"
                >
                  Adicionar à Refeição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AUDITORIA & CALIBRAÇÃO COM IA (Mantém alimentos, calibra doses) */}
      {modalCalibrarVisivel && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl animate-fade-in my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Auditoria & Calibração da Tua Dieta</h3>
                  <span className="text-xs text-slate-400">
                    A IA mantém os teus alimentos e refeições atuais e ajusta as doses para a meta do projeto ({metaKcal} kcal)
                  </span>
                </div>
              </div>
              <button
                onClick={() => setModalCalibrarVisivel(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <span className="text-slate-300 font-bold block">
                  🎯 Meta da Fase Ativa: <strong className="text-emerald-400">{metaKcal} kcal</strong> ({faseAtivaInfo.nome})
                </span>
                <p className="text-slate-400 leading-relaxed">
                  Não queres uma dieta nova do zero? Perfeito. A IA vai auditar a dieta que já tens configurada ({plano?.refeicoes.length} refeições e todos os teus alimentos) e calcular as gramagens ideais para bateres rigorosamente o défice ou superávit da tua fase.
                </p>
              </div>

              {/* BLOCO DE AJUSTES PERSONALIZADOS / INSTRUÇÕES DE FOME E HORÁRIOS */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white flex items-center gap-1.5 text-xs">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span>Ajustes de Apetite, Fome & Horários (Opcional)</span>
                  </label>
                  <span className="text-xs text-slate-500 font-mono">Feedback para a IA</span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Diz à IA como te estás a sentir nas refeições ou como queres dividir a comida. A IA mantém os teus alimentos e a meta de <strong>{metaKcal} kcal</strong>, adaptando as doses ao teu ritmo biológico real.
                </p>

                <textarea
                  rows={3}
                  value={instrucoesCalibracao}
                  onChange={(e) => setInstrucoesCalibracao(e.target.value)}
                  placeholder="Ex: Não tenho tido fome ao pequeno-almoço, faz algo mais leve e aumenta o lanche da manhã; ou come algo para começar o dia e algum tempo depois come outra dose..."
                  className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-400 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none leading-relaxed resize-none"
                />

                {/* Sugestões rápidas de um clique */}
                <div className="space-y-1.5">
                  <span className="text-xs text-slate-400 block font-semibold">Sugestões rápidas de ajuste:</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { texto: 'Não tenho tido fome ao pequeno-almoço: faz algo mais leve e aumenta o lanche da manhã', label: '🌅 Pouca fome ao pequeno-almoço' },
                      { texto: 'Dividir a manhã: algo muito leve para começar o dia e algum tempo depois comer a refeição substancial', label: '⏱️ Dividir a manhã em 2 momentos' },
                      { texto: 'Concentrar maior parte dos hidratos e calorias perto do horário do treino', label: '⚡ Mais energia perto do treino' },
                      { texto: 'Jantar mais leve e de digestão rápida para não pesar no sono', label: '🌙 Jantar leve para o sono' },
                    ].map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setInstrucoesCalibracao(sug.texto);
                        }}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition ${
                          instrucoesCalibracao === sug.texto
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        {sug.label}
                      </button>
                    ))}
                    {instrucoesCalibracao && (
                      <button
                        type="button"
                        onClick={() => setInstrucoesCalibracao('')}
                        className="px-2 py-1 rounded-lg text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 font-bold transition ml-auto"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {!resultadoCalibracao && (
                <div className="text-center py-6 space-y-4">
                  <button
                    onClick={handleExecutarCalibracaoIA}
                    disabled={calibrandoIA}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-sm flex items-center gap-2 mx-auto transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    {calibrandoIA ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>A auditar e calibrar gramagens...</span>
                      </>
                    ) : (
                      <>
                        <Sliders className="w-4 h-4" />
                        <span>Calibrar Gramagens para {metaKcal} kcal</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {resultadoCalibracao && (
                <div className="space-y-4 animate-fade-in">
                  {/* Parecer Crítico da IA */}
                  <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-2 text-slate-200">
                    <h4 className="font-bold text-emerald-400 text-sm flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" /> Parecer do Coach Nutricional IA
                    </h4>
                    <p>
                      <strong>🌟 Pontos Fortes:</strong> {resultadoCalibracao.analise_critica?.pontos_fortes}
                    </p>
                    <p className="whitespace-pre-line">
                      <strong>⚖️ Ajustes Realizados:</strong> {resultadoCalibracao.analise_critica?.ajustes_realizados}
                    </p>
                    {resultadoCalibracao.analise_critica?.respeito_preferencias_e_adaptacoes && (
                      <p className="text-emerald-300 bg-emerald-950/60 p-2.5 rounded-lg border border-emerald-500/30">
                        <strong>🛡️ Preferências & Histórico Respeitados:</strong> {resultadoCalibracao.analise_critica.respeito_preferencias_e_adaptacoes}
                      </p>
                    )}
                    {resultadoCalibracao.analise_critica?.dicas_timing_e_digestao && (
                      <p>
                        <strong>💡 Dica Prática:</strong> {resultadoCalibracao.analise_critica?.dicas_timing_e_digestao}
                      </p>
                    )}
                  </div>

                  {/* Resumo dos Novos Totais */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-xs text-slate-400 block">Kcal Alvo</span>
                      <span className="font-black text-orange-400 text-base">{resultadoCalibracao.calorias_alvo}</span>
                    </div>
                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-xs text-slate-400 block">Proteína</span>
                      <span className="font-black text-emerald-400 text-base">{resultadoCalibracao.proteina_alvo_g}g</span>
                    </div>
                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-xs text-slate-400 block">Hidratos</span>
                      <span className="font-black text-blue-400 text-base">{resultadoCalibracao.hidratos_alvo_g}g</span>
                    </div>
                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-xs text-slate-400 block">Gordura</span>
                      <span className="font-black text-amber-400 text-base">{resultadoCalibracao.gordura_alvo_g}g</span>
                    </div>
                  </div>

                  {/* Pré-visualização das Refeições Calibradas */}
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {resultadoCalibracao.refeicoes?.map((r: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-white block">{r.nome}</span>
                          <span className="text-slate-400 text-xs">
                            {r.alimentos?.map((a: any) => `${a.nome} (${a.gramas}g)`).join(' • ')}
                          </span>
                        </div>
                        <span className="text-orange-400 font-bold">{r.calorias} kcal</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setModalCalibrarVisivel(false)}
                className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancelar
              </button>

              {resultadoCalibracao && (
                <>
                  <button
                    onClick={() => setResultadoCalibracao(null)}
                    className="px-3.5 py-2 text-slate-300 hover:text-white text-xs font-semibold hover:bg-slate-800 rounded-xl transition border border-slate-700"
                  >
                    ✏️ Reajustar Notas
                  </button>
                  <button
                    onClick={handleAplicarCalibracao}
                    disabled={salvandoPlano}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-500/20"
                  >
                    <Check className="w-4 h-4" />
                    <span>Aceitar e Aplicar Calibração no Plano</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PRESCRIÇÃO COM IA (NOVA DIETA DO ZERO) */}
      {modalIAVisivel && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl animate-fade-in my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Prescrição de Nova Dieta com IA</h3>
                  <span className="text-xs text-slate-400">
                    Cria uma divisão alimentar completa do zero para a fase ativa ({metaKcal} kcal)
                  </span>
                </div>
              </div>

              <button
                onClick={() => setModalIAVisivel(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-200 mb-1">
                  Alimentos que mais gostas e usas no dia a dia:
                </label>
                <textarea
                  rows={2}
                  value={preferenciasIA.alimentos_preferidos}
                  onChange={(e) =>
                    setPreferenciasIA({ ...preferenciasIA, alimentos_preferidos: e.target.value })
                  }
                  placeholder="Ex: Arroz, batata, aveia, carne de vaca, frango, ovos, whey, azeite, fruta..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-200 mb-1">
                  Alimentos que NÃO gostas, evitas ou intolerâncias:
                </label>
                <input
                  type="text"
                  value={preferenciasIA.alimentos_evitados}
                  onChange={(e) =>
                    setPreferenciasIA({ ...preferenciasIA, alimentos_evitados: e.target.value })
                  }
                  placeholder="Ex: Peixe, lactose, claras cruas, brócolos..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-200 mb-1">
                    Horário habitual do teu treino:
                  </label>
                  <select
                    value={preferenciasIA.horario_treino}
                    onChange={(e) =>
                      setPreferenciasIA({ ...preferenciasIA, horario_treino: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                  >
                    <option value="manha">Manhã (ex: 08h-11h)</option>
                    <option value="tarde">Tarde (ex: 15h-18h)</option>
                    <option value="noite">Noite (ex: 19h-22h)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-200 mb-1">
                    Número de refeições desejadas por dia:
                  </label>
                  <select
                    value={preferenciasIA.numero_refeicoes}
                    onChange={(e) =>
                      setPreferenciasIA({
                        ...preferenciasIA,
                        numero_refeicoes: parseInt(e.target.value) || 4
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                  >
                    <option value={3}>3 Refeições</option>
                    <option value={4}>4 Refeições (Recomendado)</option>
                    <option value={5}>5 Refeições</option>
                    <option value={6}>6 Refeições</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-200 mb-1">
                  Hábitos de apetite e saciedade (ex: pouco apetite de manhã):
                </label>
                <input
                  type="text"
                  value={preferenciasIA.habitos_apetite}
                  onChange={(e) =>
                    setPreferenciasIA({ ...preferenciasIA, habitos_apetite: e.target.value })
                  }
                  placeholder="Ex: Pouco apetite de manhã, não como muito ao acordar"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-200 mb-1">
                  Alimentos que te estão a custar comer ou sensação de empanturramento:
                </label>
                <input
                  type="text"
                  value={preferenciasIA.alimentos_dificeis}
                  onChange={(e) =>
                    setPreferenciasIA({ ...preferenciasIA, alimentos_dificeis: e.target.value })
                  }
                  placeholder="Ex: Está a custar comer frango seco ou muito arroz"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setModalIAVisivel(false)}
                className="px-4 py-2.5 text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancelar
              </button>

              <button
                onClick={handlePrescreverDietaIA}
                disabled={gerandoIA}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 transition disabled:opacity-50 shadow-lg shadow-emerald-500/20"
              >
                {gerandoIA ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>A prescrever refeições...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-slate-950" />
                    <span>Gerar Plano Novo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TROCA RÁPIDA DE ALIMENTO NO PLANO */}
      {modalTrocaVisivel && trocaContexto && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Substituir Alimento da Refeição</h3>
              </div>
              <button
                onClick={() => setModalTrocaVisivel(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block mb-0.5">Alimento Atual a Substituir:</span>
                  <span className="text-base font-black text-white">
                    {trocaContexto.alimentoNome}{' '}
                    <span className="text-emerald-400 font-bold">({trocaContexto.gramas}g)</span>
                  </span>
                </div>
                {gramasSugeridasIA && (
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Dose Calibrada IA:</span>
                    <span className="text-sm font-black text-emerald-400">
                      {gramasSugeridasIA}g
                    </span>
                  </div>
                )}
              </div>

              {/* Assistente IA de Substituição Inteligente */}
              <div className="p-3.5 bg-gradient-to-br from-emerald-950/30 to-slate-950 rounded-xl border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                    <Sparkles className="w-4 h-4" />
                    <span>Assistente Nutricional IA (Alimentos Parecidos)</span>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Equi-calórico & Digestão</span>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 font-semibold mb-1">
                    Queixa, Sintoma ou Preferência:
                  </label>
                  <input
                    type="text"
                    value={queixaNutricional}
                    onChange={(e) => setQueixaNutricional(e.target.value)}
                    placeholder="Ex: Cai mal / inchaço, enjoei de frango, intolerância, etc."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Chips de atalhos rápidos */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '🎈 Cai mal / Inchaço', val: 'Estava a cair mal / digestão pesada e inchaço' },
                    { label: '⚡ Digestão Pesada / Azia', val: 'Digestão muito lenta e desconforto gástrico' },
                    { label: '🔄 Enjoei / Variar Sabor', val: 'Enjoei deste alimento, quero variar mantendo os macros' },
                    { label: '⏱️ Opção Prática / Rápida', val: 'Falta de tempo para cozinhar, quero algo prático' },
                    { label: '🥛 Intolerância / Alergia', val: 'Desconforto ou intolerância digestiva' }
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => {
                        setQueixaNutricional(chip.val);
                        setMotivoTroca(chip.val);
                      }}
                      className={`px-2.5 py-1 rounded-lg border text-xs transition ${
                        queixaNutricional === chip.val
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handlePedirRecomendacoesIA}
                  disabled={consultandoSubstituicaoIA}
                  className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                >
                  {consultandoSubstituicaoIA ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>A analisar equivalências e a calibrar doses...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Pedir Recomendações de Alimentos Parecidos à IA</span>
                    </>
                  )}
                </button>

                {/* Diagnóstico Nutricional da IA */}
                {analiseNutricionalIA && (
                  <div className="p-2.5 bg-slate-950/90 rounded-lg border border-emerald-500/30 text-xs text-emerald-200 leading-relaxed animate-fade-in">
                    <strong>💡 Análise do Nutricionista IA:</strong> {analiseNutricionalIA}
                  </div>
                )}

                {/* Cards de Recomendações */}
                {recomendacoesAlimentosIA.length > 0 && (
                  <div className="space-y-2 pt-1 animate-fade-in">
                    <span className="block font-bold text-slate-200 text-xs">
                      Alimentos Sugeridos (Dose Calibrada para os mesmos Macros):
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {recomendacoesAlimentosIA.map((rec: any, idx: number) => {
                        const isSelected = novoAlimentoId === rec.id_alimento;
                        return (
                          <div
                            key={idx}
                            onClick={() => handleAplicarRecomendacaoAlimentoIA(rec)}
                            className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                              isSelected
                                ? 'bg-emerald-500/15 border-emerald-500 shadow-md shadow-emerald-500/10'
                                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-xs">{rec.nome}</span>
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-xs">
                                {rec.gramas_sugeridas}g ({rec.calorias} kcal)
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                              <span>P: <strong className="text-emerald-400">{rec.proteina_g}g</strong></span>
                              <span>•</span>
                              <span>H: <strong className="text-blue-400">{rec.hidratos_g}g</strong></span>
                              <span>•</span>
                              <span>G: <strong className="text-amber-400">{rec.gordura_g}g</strong></span>
                              {isSelected && (
                                <span className="ml-auto text-emerald-400 font-bold text-xs">
                                  ✓ Selecionado
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-1.5 leading-snug">
                              {rec.justificativa_nutricional}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-200 mb-1">
                  Ou selecionar manualmente da tabela de equivalências:
                </label>
                <select
                  value={novoAlimentoId}
                  onChange={(e) => {
                    setNovoAlimentoId(e.target.value);
                    setGramasSugeridasIA(null);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:border-emerald-500 focus:outline-none"
                >
                  {alimentos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome} ({a.kcal} kcal/100g)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-200 mb-1">
                  Motivo da Substituição (Fica Registado no Histórico):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  {[
                    'Estava a cair mal / digestão pesada',
                    'Custava a comer / muito volume',
                    'Preferência de sabor / paladar',
                    'Ajuste de rotina / conveniência'
                  ].map((mot) => (
                    <button
                      key={mot}
                      type="button"
                      onClick={() => {
                        setMotivoTroca(mot);
                        setOutroMotivoAtivo(false);
                      }}
                      className={`p-2.5 rounded-xl text-left transition border text-xs ${
                        motivoTroca === mot && !outroMotivoAtivo
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
                  onClick={() => setOutroMotivoAtivo(true)}
                  className={`w-full p-2.5 rounded-xl text-left transition border text-xs ${
                    outroMotivoAtivo
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Outro motivo personalizado...
                </button>

                {outroMotivoAtivo && (
                  <input
                    type="text"
                    value={motivoPersonalizado}
                    onChange={(e) => setMotivoPersonalizado(e.target.value)}
                    placeholder="Ex: Alergia repentina, azia, intolerância gástrica, etc."
                    className="w-full mt-2 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setModalTrocaVisivel(false)}
                className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancelar
              </button>

              <button
                onClick={handleExecutarSubstituicao}
                disabled={substituindo}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {substituindo ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>A calcular equivalência...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirmar & Registar Troca{gramasSugeridasIA ? ` (${gramasSugeridasIA}g)` : ''}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: HISTÓRICO DE DIETAS POR FASE DO PROJETO */}
      {modalHistoricoVisivel && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 space-y-5 shadow-2xl animate-fade-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Histórico de Dietas por Fase do Projeto
                  </h3>
                  <p className="text-xs text-slate-400">
                    Consulta exatamente o que comias em cada fase anterior e todas as adaptações feitas.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalHistoricoVisivel(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 overflow-hidden">
              {/* Coluna da Esquerda: Lista de Fases Gravadas */}
              <div className="border border-slate-800 rounded-xl p-3 bg-slate-950/60 overflow-y-auto space-y-2 max-h-[60vh]">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Fases Gravadas ({historicoFases.length})
                </span>
                {historicoFases.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-2">Nenhuma fase gravada ainda.</p>
                ) : (
                  historicoFases.map((fase) => {
                    const isSelecionada = faseInspecionada?.id === fase.id;
                    return (
                      <button
                        key={fase.id}
                        onClick={() => setFaseInspecionada(fase)}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${
                          isSelecionada
                            ? 'bg-amber-500/15 border-amber-500 text-white shadow-md'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black truncate max-w-[150px]">
                            {fase.nome_fase || fase.nome}
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
                          <span className="font-bold text-amber-400">{fase.calorias} kcal</span>
                          <span>•</span>
                          <span>{fase.refeicoes?.length || 0} refeições</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Coluna da Direita (2 cols): Detalhes da Fase Inspecionada */}
              <div className="md:col-span-2 border border-slate-800 rounded-xl p-4 bg-slate-950/60 overflow-y-auto max-h-[60vh] space-y-4">
                {faseInspecionada ? (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">
                            {faseInspecionada.nome_fase || faseInspecionada.nome}
                          </h4>
                          {faseInspecionada.ativo && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                              Plano em vigor
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Meta energética:{' '}
                          <strong className="text-amber-400">{faseInspecionada.calorias} kcal</strong>{' '}
                          | P: {faseInspecionada.macros?.proteina_g}g | H:{' '}
                          {faseInspecionada.macros?.hidratos_g}g | G:{' '}
                          {faseInspecionada.macros?.gordura_g}g
                        </p>
                      </div>

                      {!faseInspecionada.ativo && (
                        <button
                          onClick={() => handleReativarFaseDieta(faseInspecionada.id!)}
                          disabled={reativandoFase}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 transition disabled:opacity-50 flex-shrink-0 shadow"
                        >
                          {reativandoFase ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>Reativar Dieta Desta Fase</span>
                        </button>
                      )}
                    </div>

                    {/* Refeições e Alimentos que comia nesta fase */}
                    <div className="space-y-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                        O que comias nesta fase:
                      </span>
                      {faseInspecionada.refeicoes?.map((ref, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-white">
                              {ref.nome}{' '}
                              {ref.horario_sugerido && (
                                <span className="text-slate-400 font-normal">
                                  ({ref.horario_sugerido})
                                </span>
                              )}
                            </span>
                            <span className="text-xs font-bold text-emerald-400">
                              {ref.calorias} kcal{' '}
                              <span className="text-xs text-slate-400 font-normal">
                                (P: {ref.proteina_g}g | H: {ref.hidratos_g}g | G: {ref.gordura_g}g)
                              </span>
                            </span>
                          </div>

                          <div className="space-y-1">
                            {ref.alimentos?.map((alim, aIdx) => (
                              <div
                                key={aIdx}
                                className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-950/60 border border-slate-900"
                              >
                                <span className="text-slate-200">
                                  {alim.nome}{' '}
                                  <span className="text-emerald-400 font-bold">({alim.gramas}g)</span>
                                </span>
                                <span className="text-slate-400 font-mono text-xs">
                                  {alim.calorias} kcal
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Histórico de alterações que foram feitas nesta fase */}
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                        Substituições e Adaptações Feitas Nesta Fase:
                      </span>
                      {!faseInspecionada.historico_alteracoes ||
                      faseInspecionada.historico_alteracoes.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">
                          Sem registo de substituições nesta fase (dieta mantida 100% como planeada).
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {faseInspecionada.historico_alteracoes.map((alt) => (
                            <div
                              key={alt.id}
                              className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-lg text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-emerald-400">{alt.refeicao}</span>
                                <span className="text-xs text-slate-400 font-mono">
                                  {alt.data_hora}
                                </span>
                              </div>
                              <div className="text-slate-300">
                                <span className="line-through text-slate-400">
                                  {alt.alimento_origem}
                                </span>{' '}
                                ➔{' '}
                                <span className="text-white font-bold">
                                  {alt.alimento_substituto}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-rose-300 font-medium">
                                  🩺 Motivo: {alt.motivo}
                                </span>
                                <span className="font-mono text-slate-400">
                                  {alt.diferenca_kcal > 0
                                    ? `+${alt.diferenca_kcal}`
                                    : alt.diferenca_kcal}{' '}
                                  kcal
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
                onClick={() => setModalHistoricoVisivel(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition"
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
