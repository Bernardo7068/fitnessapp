import React, { useState, useEffect } from 'react';
import {
  CalendarCheck, Brain, Flame, Activity, Sparkles, CheckCircle2, AlertTriangle,
  Pill, HeartPulse, RefreshCw, Scale, Ruler, Droplets, Moon, History, Target,
  Zap, ChevronDown, ChevronUp, Check, X, ShieldCheck, ArrowRight, BellRing,
  Clock, Sliders, Calendar, Calculator, Percent, Info, TrendingDown, TrendingUp
} from 'lucide-react';
import { ServicoApi } from '../servicos/api';
import {
  DiagnosticoAjusteDieta, RecomendacoesIA, CheckInHistoricoItem, PerfilUtilizador, VereditoProjetoIA,
  StatusCheckinPeriodico
} from '../tipos/fitness';

export interface CheckinAdaptativoProps {
  aoNavegarParaDieta?: () => void;
  aoNavegarParaTreinos?: () => void;
  aoConcluirCheckin?: () => void;
}

export const CheckinAdaptativo: React.FC<CheckinAdaptativoProps> = ({
  aoNavegarParaDieta,
  aoNavegarParaTreinos,
  aoConcluirCheckin
}) => {
  const [carregando, setCarregando] = useState<boolean>(false);
  const [aplicandoAjustes, setAplicandoAjustes] = useState<boolean>(false);
  const [historico, setHistorico] = useState<CheckInHistoricoItem[]>([]);
  const [perfil, setPerfil] = useState<PerfilUtilizador | null>(null);
  const [projetoInfo, setProjetoInfo] = useState<any | null>(null);
  const [faseAtivaProjeto, setFaseAtivaProjeto] = useState<any | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string>('');
  const [mostrarBotaoDietaAviso, setMostrarBotaoDietaAviso] = useState<boolean>(false);
  const [abaAtiva, setAbaAtiva] = useState<'checkin' | 'historico'>('checkin');
  const [transicaoFase, setTransicaoFase] = useState<any | null>(null);
  const [avancandoFase, setAvancandoFase] = useState<boolean>(false);

  // Periodicidade & Acompanhamento de Check-up
  const [statusPeriodico, setStatusPeriodico] = useState<StatusCheckinPeriodico | null>(null);
  const [editandoPeriodo, setEditandoPeriodo] = useState<boolean>(false);
  const [frequenciaEditada, setFrequenciaEditada] = useState<number>(7);
  const [salvandoPeriodo, setSalvandoPeriodo] = useState<boolean>(false);

  // Formulário do Check-in: Balança & Composição
  const [pesoAtual, setPesoAtual] = useState<number>(69.6);
  const [pesoAnteriorRef, setPesoAnteriorRef] = useState<number | null>(null);
  const [bfAtual, setBfAtual] = useState<number | ''>('');
  const [bfAnteriorRef, setBfAnteriorRef] = useState<number | null>(null);
  const [caloriasAtuais, setCaloriasAtuais] = useState<number>(1950);
  const [faseAtual, setFaseAtual] = useState<string>('cut');
  const [nomeFaseProjeto, setNomeFaseProjeto] = useState<string>('');
  const [nomeProjeto, setNomeProjeto] = useState<string>('');
  const [substituirFaseManual, setSubstituirFaseManual] = useState<boolean>(false);

  // Perímetros Musculares & Corporais (cm)
  const [cintura, setCintura] = useState<number | ''>('');
  const [cinturaAnteriorRef, setCinturaAnteriorRef] = useState<number | null>(null);

  const [pescoco, setPescoco] = useState<number | ''>('');
  const [pescocoAnteriorRef, setPescocoAnteriorRef] = useState<number | null>(null);

  const [ombros, setOmbros] = useState<number | ''>('');
  const [ombrosAnteriorRef, setOmbrosAnteriorRef] = useState<number | null>(null);

  const [peitoral, setPeitoral] = useState<number | ''>('');
  const [peitoralAnteriorRef, setPeitoralAnteriorRef] = useState<number | null>(null);

  const [braco, setBraco] = useState<number | ''>('');
  const [bracoAnteriorRef, setBracoAnteriorRef] = useState<number | null>(null);

  const [antebraco, setAntebraco] = useState<number | ''>('');
  const [antebracoAnteriorRef, setAntebracoAnteriorRef] = useState<number | null>(null);

  const [coxa, setCoxa] = useState<number | ''>('');
  const [coxaAnteriorRef, setCoxaAnteriorRef] = useState<number | null>(null);

  const [panturrilha, setPanturrilha] = useState<number | ''>('');
  const [panturrilhaAnteriorRef, setPanturrilhaAnteriorRef] = useState<number | null>(null);

  const [anca, setAnca] = useState<number | ''>('');
  const [ancaAnteriorRef, setAncaAnteriorRef] = useState<number | null>(null);

  // Assistente de % BF (Método da Marinha Americana / U.S. Navy)
  const [mostrarCalculadoraBf, setMostrarCalculadoraBf] = useState<boolean>(false);
  const [calculandoBfNavy, setCalculandoBfNavy] = useState<boolean>(false);
  const [alturaCalculadora, setAlturaCalculadora] = useState<number>(175);
  const [sexoCalculadora, setSexoCalculadora] = useState<'masculino' | 'feminino'>('masculino');
  const [resultadoBfNavy, setResultadoBfNavy] = useState<{
    bf: number;
    categoria: string;
    metodo: string;
    massa_gorda_kg?: number;
    massa_magra_kg?: number;
  } | null>(null);

  // Estado do Indivíduo & Biofeedback
  const [energia, setEnergia] = useState<number>(7);
  const [fadiga, setFadiga] = useState<number>(5);
  const [sono, setSono] = useState<number>(7);
  const [horasSono, setHorasSono] = useState<number>(7.5);
  const [stress, setStress] = useState<number>(5);
  const [fome, setFome] = useState<number>(5);
  const [digestao, setDigestao] = useState<string>('excelente');
  const [dores, setDores] = useState<string>('');

  // Adesão, Treino & Hábitos
  const [adesao, setAdesao] = useState<number>(95);
  const [aguaLitros, setAguaLitros] = useState<number>(3.0);
  const [treinoCumprido, setTreinoCumprido] = useState<boolean>(true);
  const [progressoTreino, setProgressoTreino] = useState<string>('aumentou');
  const [tentativasEstagnadas, setTentativasEstagnadas] = useState<number>(0);
  const [cardioMinutos, setCardioMinutos] = useState<number>(130);
  const [passos, setPassos] = useState<number>(8500);
  const [semanasDefice, setSemanasDefice] = useState<number>(4);
  const [notas, setNotas] = useState<string>('');
  const [alimentos, setAlimentos] = useState<string>('Arroz, Frango, Ovos, Aveia, Azeite, Maçã, Brócolos');
  const [aplicarAjustesAuto, setAplicarAjustesAuto] = useState<boolean>(false);

  // Último resultado gerado
  const [diagnosticoMat, setDiagnosticoMat] = useState<DiagnosticoAjusteDieta | null>(null);
  const [recomendacoesIA, setRecomendacoesIA] = useState<RecomendacoesIA | null>(null);

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  const carregarDadosIniciais = async () => {
    try {
      setCarregando(true);
      const [histRes, perfilRes, statusPeriodicoRes] = await Promise.all([
        ServicoApi.obterHistoricoCheckIns().catch(() => []),
        ServicoApi.obterPerfil().catch(() => null),
        ServicoApi.obterStatusCheckinPeriodico().catch(() => null)
      ]);

      if (statusPeriodicoRes) {
        setStatusPeriodico(statusPeriodicoRes);
        setFrequenciaEditada(statusPeriodicoRes.frequencia_dias || 7);
      }

      setHistorico(histRes);
      if (histRes.length > 0) {
        const ultimo = histRes[0];
        const extras = ultimo.metricas_adicionais || {};
        setDiagnosticoMat(ultimo.diagnostico_matematico);
        setRecomendacoesIA(ultimo.recomendacoes_ia);
        setPesoAnteriorRef(ultimo.peso_medio);

        if (extras.bf_atual != null) setBfAnteriorRef(extras.bf_atual);
        if (extras.cintura_cm != null) setCinturaAnteriorRef(extras.cintura_cm);
        if (extras.pescoco_cm != null) setPescocoAnteriorRef(extras.pescoco_cm);
        if (extras.ombros_cm != null) setOmbrosAnteriorRef(extras.ombros_cm);
        if (extras.peitoral_cm != null) setPeitoralAnteriorRef(extras.peitoral_cm);
        if (extras.braco_cm != null) setBracoAnteriorRef(extras.braco_cm);
        if (extras.antebraco_cm != null) setAntebracoAnteriorRef(extras.antebraco_cm);
        if (extras.coxa_cm != null) setCoxaAnteriorRef(extras.coxa_cm);
        if (extras.panturrilha_cm != null) setPanturrilhaAnteriorRef(extras.panturrilha_cm);
        if (extras.anca_cm != null) setAncaAnteriorRef(extras.anca_cm);

        // Pré-preenchimento inteligente se ainda estiverem vazios
        if (extras.cintura_cm != null) setCintura(extras.cintura_cm);
        if (extras.pescoco_cm != null) setPescoco(extras.pescoco_cm);
        if (extras.ombros_cm != null) setOmbros(extras.ombros_cm);
        if (extras.peitoral_cm != null) setPeitoral(extras.peitoral_cm);
        if (extras.braco_cm != null) setBraco(extras.braco_cm);
        if (extras.antebraco_cm != null) setAntebraco(extras.antebraco_cm);
        if (extras.coxa_cm != null) setCoxa(extras.coxa_cm);
        if (extras.panturrilha_cm != null) setPanturrilha(extras.panturrilha_cm);
        if (extras.anca_cm != null) setAnca(extras.anca_cm);
        if (extras.bf_atual != null) setBfAtual(extras.bf_atual);
      }

      if (perfilRes && perfilRes.perfil) {
        const p = perfilRes.perfil;
        setPerfil(p);
        if (p.peso_atual) {
          setPesoAtual(p.peso_atual);
          setPesoAnteriorRef((prev) => (prev !== null ? prev : p.peso_atual));
        }
        if (p.bf_atual) {
          setBfAtual((prev) => (prev !== '' ? prev : p.bf_atual));
          setBfAnteriorRef((prev) => (prev !== null ? prev : p.bf_atual));
        }
        if (p.calorias_atuais) setCaloriasAtuais(p.calorias_atuais);
        if (p.fase_atual) setFaseAtual(p.fase_atual);
        if (p.altura_cm) setAlturaCalculadora(p.altura_cm);
        if (p.sexo) setSexoCalculadora(p.sexo === 'feminino' ? 'feminino' : 'masculino');

        if (p.projeto_ativo_json) {
          try {
            const proj = JSON.parse(p.projeto_ativo_json);
            setProjetoInfo(proj);
            setNomeProjeto(proj.tipo_intencao || 'Projeto de Transformação Corporal');
            if (proj.fases && proj.fases.length > 0) {
              const faseMatch = proj.fases.find((f: any) => f.tipo === p.fase_atual) || proj.fases[0];
              if (faseMatch) {
                setFaseAtivaProjeto(faseMatch);
                setNomeFaseProjeto(faseMatch.nome_exibicao || faseMatch.tipo);
                setFaseAtual(faseMatch.tipo);
                if (faseMatch.calorias_diarias && !histRes.length) {
                  setCaloriasAtuais(faseMatch.calorias_diarias);
                }
                if (faseMatch.cardio_minutos_semana) {
                  setCardioMinutos(faseMatch.cardio_minutos_semana);
                }
              }
            }

            // Contabilização de dias e semanas passadas com base na data de ativação da fase
            if (proj.data_inicio_fase) {
              const diffMs = Date.now() - new Date(proj.data_inicio_fase).getTime();
              const dias = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
              const semanas = Math.max(1, Math.floor(dias / 7) + 1);
              setSemanasDefice(semanas);
            }
          } catch (e) {
            console.warn('Erro ao processar projeto ativo:', e);
          }
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dados iniciais do check-in:', err);
    } finally {
      setCarregando(false);
    }
  };

  const handleSalvarFrequenciaPeriodica = async (novaFreq: number) => {
    try {
      setSalvandoPeriodo(true);
      const res = await ServicoApi.configurarPeriodoCheckin({
        frequencia_dias: novaFreq,
        notificacao_ativa: true
      });
      setStatusPeriodico(res.status);
      setEditandoPeriodo(false);
      setMostrarBotaoDietaAviso(false);
      setMensagemSucesso(`Configuração guardada: Check-up a cada ${novaFreq} dias!`);
      setTimeout(() => setMensagemSucesso(''), 4000);
      aoConcluirCheckin?.();
    } catch (err: any) {
      alert(err.message || 'Erro ao guardar configuração');
    } finally {
      setSalvandoPeriodo(false);
    }
  };

  const handleCalcularBfNavy = async () => {
    const c = typeof cintura === 'number' ? cintura : parseFloat(String(cintura));
    const p = typeof pescoco === 'number' ? pescoco : parseFloat(String(pescoco));
    const a = typeof anca === 'number' ? anca : parseFloat(String(anca));
    const alt = alturaCalculadora || perfil?.altura_cm || 175;
    const sexo = sexoCalculadora || (perfil?.sexo === 'feminino' ? 'feminino' : 'masculino');

    if (!c || isNaN(c) || !p || isNaN(p)) {
      alert('Para calcular o % de Gordura (BF), preenche a Cintura e o Pescoço na calculadora!');
      return;
    }

    if (sexo === 'feminino' && (!a || isNaN(a))) {
      alert('Para atletas do sexo feminino, a fórmula da Marinha (US Navy) necessita também da medida da Anca.');
      return;
    }

    try {
      setCalculandoBfNavy(true);
      const res = await ServicoApi.calcularBfNavy({
        cintura_cm: c,
        pescoco_cm: p,
        anca_cm: sexo === 'feminino' ? a : undefined,
        altura_cm: alt,
        sexo: sexo
      });
      setResultadoBfNavy({
        bf: res.bf_calculado,
        categoria: res.categoria,
        metodo: res.metodo,
        massa_gorda_kg: res.massa_gorda_kg,
        massa_magra_kg: res.massa_magra_kg
      });
      setBfAtual(res.bf_calculado);
    } catch (err: any) {
      alert(err.message || 'Erro ao calcular percentagem de gordura');
    } finally {
      setCalculandoBfNavy(false);
    }
  };

  const handleSubmitCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCarregando(true);
      const res = await ServicoApi.processarCheckIn({
        peso_medio_anterior: pesoAnteriorRef !== null ? pesoAnteriorRef : pesoAtual,
        peso_medio_atual: pesoAtual,
        bf_atual: typeof bfAtual === 'number' ? bfAtual : undefined,
        calorias_atuais: caloriasAtuais,
        fase_atual: faseAtual,
        nome_fase_projeto: nomeFaseProjeto,
        nome_projeto: nomeProjeto,
        cintura_cm: typeof cintura === 'number' ? cintura : undefined,
        cintura_anterior_cm: cinturaAnteriorRef !== null ? cinturaAnteriorRef : undefined,
        pescoco_cm: typeof pescoco === 'number' ? pescoco : undefined,
        ombros_cm: typeof ombros === 'number' ? ombros : undefined,
        braco_cm: typeof braco === 'number' ? braco : undefined,
        antebraco_cm: typeof antebraco === 'number' ? antebraco : undefined,
        peitoral_cm: typeof peitoral === 'number' ? peitoral : undefined,
        coxa_cm: typeof coxa === 'number' ? coxa : undefined,
        panturrilha_cm: typeof panturrilha === 'number' ? panturrilha : undefined,
        anca_cm: typeof anca === 'number' ? anca : undefined,
        nivel_energia: energia,
        nivel_fadiga: fadiga,
        qualidade_sono: sono,
        horas_sono: horasSono,
        nivel_stress: stress,
        nivel_fome: fome,
        estado_digestao: digestao,
        dores_ou_queixas: dores,
        adesao_percentual: adesao,
        agua_litros: aguaLitros,
        treino_cumprido: treinoCumprido,
        progresso_treino: progressoTreino,
        tentativas_estagnadas_treino: tentativasEstagnadas,
        cardio_minutos_realizados: cardioMinutos,
        passos_diarios: passos,
        semanas_em_defice_continuo: semanasDefice,
        alimentos_consumidos: alimentos,
        notas_usuario: notas,
        aplicar_ajustes_automaticamente: aplicarAjustesAuto
      });

      setDiagnosticoMat(res.diagnostico_matematico);
      setRecomendacoesIA(res.recomendacoes_ia);
      setMostrarBotaoDietaAviso(Boolean(res.transicao_fase?.transitado_automaticamente));
      if (res.transicao_fase) {
        setTransicaoFase(res.transicao_fase);
        if (res.transicao_fase.transitado_automaticamente && res.transicao_fase.proxima_fase) {
          const prox = res.transicao_fase.proxima_fase;
          setFaseAtual(prox.tipo);
          setNomeFaseProjeto(prox.nome_exibicao);
          setCaloriasAtuais(prox.calorias_diarias);
          setFaseAtivaProjeto(prox);
          setSemanasDefice(1);
          setMensagemSucesso(`🏆 META ATINGIDA! Atingiste os ${res.transicao_fase.peso_alvo_fase} kg e o sistema avançou automaticamente para "${prox.nome_exibicao}" (${prox.calorias_diarias} kcal/dia)!`);
          carregarDadosIniciais();
        } else {
          setMensagemSucesso('🎉 Check-up processado com sucesso! A IA cruzou o teu projeto, medidas e biofeedback.');
        }
      } else {
        setMensagemSucesso('🎉 Check-up processado com sucesso! A IA cruzou o teu projeto, medidas e biofeedback.');
      }
      setAbaAtiva('checkin');

      // Atualizar histórico e estado da periodicidade
      ServicoApi.obterHistoricoCheckIns().then((hist) => setHistorico(hist)).catch(() => {});
      ServicoApi.obterStatusCheckinPeriodico().then((st) => setStatusPeriodico(st)).catch(() => {});
      aoConcluirCheckin?.();
      setTimeout(() => setMensagemSucesso(''), 8000);
    } catch (err) {
      console.error('Erro ao processar check-in:', err);
    } finally {
      setCarregando(false);
    }
  };

  const handleAvancarFase = async (proxFase: any) => {
    try {
      setAvancandoFase(true);
      await ServicoApi.ativarFaseProjeto({
        fase_tipo: proxFase.tipo,
        nome_fase: proxFase.nome_exibicao,
        calorias_diarias: proxFase.calorias_diarias,
        series_alvo_semana: proxFase.series_trabalho_semana,
        cardio_minutos_semana: proxFase.cardio_minutos_semana,
        foco_treino: proxFase.foco_treino || '',
        projeto_completo_json: projetoInfo ? JSON.stringify(projetoInfo) : undefined
      });
      setFaseAtual(proxFase.tipo);
      setNomeFaseProjeto(proxFase.nome_exibicao);
      setCaloriasAtuais(proxFase.calorias_diarias);
      setFaseAtivaProjeto(proxFase);
      setSemanasDefice(1);
      setTransicaoFase(null);
      setMostrarBotaoDietaAviso(true);
      setMensagemSucesso(`🎉 Transição concluída! Avançaste para a fase "${proxFase.nome_exibicao}". A dieta e os treinos foram resetados para as metas da nova fase (${proxFase.calorias_diarias} kcal).`);
      setTimeout(() => setMensagemSucesso(''), 8000);
      carregarDadosIniciais();
    } catch (err) {
      console.error('Erro ao avançar fase:', err);
    } finally {
      setAvancandoFase(false);
    }
  };

  const handleAplicarAjustesManualmente = async () => {
    if (!diagnosticoMat) return;
    try {
      setAplicandoAjustes(true);
      const adjDieta = recomendacoesIA?.ajustes_dieta;
      const caloriasParaAplicar = adjDieta?.calorias_recomendadas || diagnosticoMat.novas_calorias;
      const macrosParaAplicar = adjDieta?.novos_macros || {
        proteina_g: diagnosticoMat.novos_macros.proteina_g,
        gordura_g: diagnosticoMat.novos_macros.gordura_g,
        hidratos_g: diagnosticoMat.novos_macros.hidratos_g,
        fibras_g: diagnosticoMat.novos_macros.fibras_g
      };
      await ServicoApi.aplicarAjustesCheckIn(caloriasParaAplicar, macrosParaAplicar);
      setCaloriasAtuais(caloriasParaAplicar);
      setMostrarBotaoDietaAviso(true);
      setMensagemSucesso(`✅ Dieta sincronizada com sucesso para ${Math.round(caloriasParaAplicar)} kcal! A aba Dieta e Macros foi atualizada.`);
      setTimeout(() => setMensagemSucesso(''), 8000);
    } catch (err) {
      console.error('Erro ao aplicar ajustes:', err);
    } finally {
      setAplicandoAjustes(false);
    }
  };

  const varPesoKg = pesoAnteriorRef !== null
    ? Math.round((pesoAtual - pesoAnteriorRef) * 10) / 10
    : null;
  const varBf = (typeof bfAtual === 'number' && bfAnteriorRef !== null)
    ? Math.round((bfAtual - bfAnteriorRef) * 10) / 10
    : null;
  const varCinturaCm = (typeof cintura === 'number' && cinturaAnteriorRef !== null)
    ? Math.round((cintura - cinturaAnteriorRef) * 10) / 10
    : null;

  const calcularVariacao = (atual: number | '', anterior: number | null): number | null => {
    if (typeof atual !== 'number' || anterior === null) return null;
    return Math.round((atual - anterior) * 10) / 10;
  };

  return (
    <div className="space-y-6 pb-16">
      {/* CABEÇALHO & IDENTIFICAÇÃO DO PROJETO */}
      <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider mb-2">
              <CalendarCheck className="w-4 h-4" /> Check-in & Acompanhamento de Projeto
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white">
              Check-up do Atleta & Calibração
            </h1>
            <p className="text-slate-400 text-xs md:text-sm mt-1 max-w-3xl">
              Monitoriza o teu estado físico, balança, medidas corporais e adesão. A IA analisa se estás no <strong>caminho certo</strong> e recomenda ajustes cirúrgicos na dieta e treino.
            </p>
          </div>

          {/* Seletor de Abas */}
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start md:self-center">
            <button
              onClick={() => setAbaAtiva('checkin')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                abaAtiva === 'checkin'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Novo Check-up
            </button>
            <button
              onClick={() => setAbaAtiva('historico')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                abaAtiva === 'historico'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Histórico ({historico.length})</span>
            </button>
          </div>
        </div>

        {/* BANNER DO PROJETO ATIVO */}
        {projetoInfo && (
          <div className="p-4 rounded-xl bg-slate-950/90 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-white text-sm flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-emerald-400" />
                  {nomeProjeto}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 text-xs">
                  Fase Ativa: {nomeFaseProjeto || faseAtual}
                </span>
                {faseAtivaProjeto && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-xs">
                    Semana {semanasDefice} de {faseAtivaProjeto.duracao_semanas || '?'} {projetoInfo.data_inicio_fase ? `(${Math.max(1, Math.floor((Date.now() - new Date(projetoInfo.data_inicio_fase).getTime()) / (1000 * 60 * 60 * 24)))} dias decorridos)` : ''}
                  </span>
                )}
              </div>
              {(() => {
                const pesoInicialProj = Number(projetoInfo?.peso_inicial_kg || projetoInfo?.peso_atual_kg || 75);
                const pesoAlvoProj = Number(projetoInfo?.peso_alvo_kg || 60);
                const pesoAtualNum = Number(pesoAtual || pesoInicialProj);
                const deltaTotal = Math.abs(pesoAlvoProj - pesoInicialProj);
                const isCorte = pesoAlvoProj < pesoInicialProj;
                const progressoKg = Math.round((isCorte ? (pesoInicialProj - pesoAtualNum) : (pesoAtualNum - pesoInicialProj)) * 10) / 10;
                const pctProj = deltaTotal > 0 ? Math.min(100, Math.max(0, (progressoKg / deltaTotal) * 100)) : 0;
                const pctFormat = Math.round(pctProj * 10) / 10;

                return (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-slate-300 text-xs">
                      <span>Ponto de Partida: <strong className="text-white">{pesoInicialProj} kg</strong></span>
                      <span>➔</span>
                      <span>Hoje: <strong className="text-emerald-400">{pesoAtualNum} kg</strong> {progressoKg > 0 ? `(${isCorte ? `-${progressoKg}` : `+${progressoKg}`} kg)` : ''}</span>
                      <span>➔</span>
                      <span>Meta: <strong className="text-amber-400">{pesoAlvoProj} kg</strong></span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs border border-emerald-500/30">
                        {pctFormat}% Concluído
                      </span>
                    </div>

                    {faseAtivaProjeto && (
                      <p className="text-xs text-slate-400">
                        Meta desta fase: <strong className="text-emerald-300">{faseAtivaProjeto.peso_fim_estimado_kg} kg</strong>
                        {faseAtivaProjeto?.descricao_estrategia && (
                          <span className="text-slate-400 ml-2">| {faseAtivaProjeto.descricao_estrategia}</span>
                        )}
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>

            {faseAtivaProjeto && (
              <div className="flex items-center gap-3 font-mono text-xs bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 text-slate-300 self-start sm:self-center">
                <span>Alvo: <strong className="text-emerald-400">{faseAtivaProjeto.calorias_diarias} kcal</strong></span>
                <span>•</span>
                <span>Cardio: <strong className="text-indigo-400">{faseAtivaProjeto.cardio_minutos_semana}m/sem</strong></span>
                <span>•</span>
                <span>Volume: <strong className="text-amber-400">{faseAtivaProjeto.series_trabalho_semana} sér.</strong></span>
              </div>
            )}
          </div>
        )}

        {/* CARD DE TRANSIÇÃO DE FASE DO PROJETO */}
        {(() => {
          const fasesProjeto = projetoInfo?.fases || [];
          const indiceFaseAtual = fasesProjeto.findIndex((f: any) => f.tipo === (faseAtivaProjeto?.tipo || faseAtual));
          const proximaFaseDisponivel = (indiceFaseAtual >= 0 && indiceFaseAtual < fasesProjeto.length - 1)
            ? fasesProjeto[indiceFaseAtual + 1]
            : null;

          const pesoAlvoFase = faseAtivaProjeto?.peso_fim_estimado_kg;
          const atingiuPesoFase = pesoAlvoFase != null
            ? (faseAtual.includes('cut') || faseAtual.includes('defice')
                ? pesoAtual <= pesoAlvoFase
                : (faseAtual.includes('bulk') ? pesoAtual >= pesoAlvoFase : false))
            : false;
          const completouSemanasFase = faseAtivaProjeto?.duracao_semanas
            ? semanasDefice >= faseAtivaProjeto.duracao_semanas
            : false;
          const faseProntaParaAvancar = proximaFaseDisponivel && (atingiuPesoFase || completouSemanasFase || transicaoFase?.pode_avancar);

          if (!faseProntaParaAvancar || !proximaFaseDisponivel) return null;

          return (
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/70 via-slate-900 to-emerald-950/50 border-2 border-amber-500 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs animate-fade-in">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                  <span className="font-black text-white text-sm">
                    {transicaoFase?.transitado_automaticamente ? '🎉 Transição Automática Concluída!' : '🏆 Meta da Fase Concluída!'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-xs border border-amber-500/40">
                    {transicaoFase?.transitado_automaticamente
                      ? 'Nova Fase Ativada Agora'
                      : atingiuPesoFase
                      ? `Peso Alvo (${pesoAlvoFase} kg) Atingido!`
                      : `${semanasDefice} Semanas Concluídas!`}
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed max-w-2xl">
                  {transicaoFase?.transitado_automaticamente ? (
                    <>
                      Atingiste com sucesso o peso alvo de <strong>{pesoAlvoFase} kg</strong>! O sistema ativou automaticamente a próxima etapa: <strong>{proximaFaseDisponivel.nome_exibicao}</strong> ({proximaFaseDisponivel.calorias_diarias} kcal/dia). A tua dieta e o teu plano de treino já foram atualizados.
                    </>
                  ) : atingiuPesoFase ? (
                    <>
                      Atingiste com sucesso o peso alvo de <strong>{pesoAlvoFase} kg</strong>! Podes agora avançar para a próxima etapa: <strong>{proximaFaseDisponivel.nome_exibicao}</strong> ({proximaFaseDisponivel.duracao_semanas} semanas a {proximaFaseDisponivel.calorias_diarias} kcal/dia).
                    </>
                  ) : (
                    <>
                      Completaste as <strong>{faseAtivaProjeto?.duracao_semanas || semanasDefice} semanas</strong> previstas. Podes avançar agora para o reset metabólico <strong>{proximaFaseDisponivel.nome_exibicao}</strong> ({proximaFaseDisponivel.calorias_diarias} kcal/dia) para recuperar leptina e tiróide, ou continuar nesta fase se a tua energia e força ainda estiverem elevadas.
                    </>
                  )}
                </p>
              </div>

              {transicaoFase?.transitado_automaticamente ? (
                <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                  {aoNavegarParaDieta && (
                    <button
                      type="button"
                      onClick={aoNavegarParaDieta}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition shadow"
                    >
                      <span>Ver Nova Dieta</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {aoNavegarParaTreinos && (
                    <button
                      type="button"
                      onClick={aoNavegarParaTreinos}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition border border-slate-700"
                    >
                      <span>Ver Treino</span>
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  disabled={avancandoFase}
                  onClick={() => handleAvancarFase(proximaFaseDisponivel)}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 shrink-0 transition"
                >
                  {avancandoFase ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  <span>Avançar para {proximaFaseDisponivel.nome_exibicao}</span>
                </button>
              )}
            </div>
          );
        })()}

        {/* PAINEL DE PERIODICIDADE & AVISOS DE CHECK-UP */}
        {statusPeriodico && (
          <div className={`p-4 rounded-xl border transition-all ${
            statusPeriodico.checkin_pendente
              ? 'bg-gradient-to-r from-amber-950/70 via-slate-950 to-amber-950/40 border-amber-500/50 shadow-lg'
              : 'bg-slate-950/70 border-slate-800'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    statusPeriodico.nivel_urgencia === 'atrasado'
                      ? 'bg-rose-500 animate-pulse'
                      : statusPeriodico.nivel_urgencia === 'hoje'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-emerald-400'
                  }`} />
                  <span className="font-black text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Periodicidade do Check-up
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-xs border ${
                    statusPeriodico.nivel_urgencia === 'atrasado'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      : statusPeriodico.nivel_urgencia === 'hoje'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {statusPeriodico.nivel_urgencia === 'atrasado'
                      ? 'Pendente / Atrasado'
                      : statusPeriodico.nivel_urgencia === 'hoje'
                      ? 'Hoje é Dia de Check-up'
                      : 'Em Dia'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {statusPeriodico.mensagem_aviso}
                </p>
              </div>

              {/* Métricas Rápidas & Botão de Configuração */}
              <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap text-xs">
                <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-500 block">Frequência</span>
                  <span className="font-bold text-white font-mono">A cada {statusPeriodico.frequencia_dias} dias</span>
                </div>
                <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-500 block">Último Check-up</span>
                  <span className="font-bold text-slate-200 font-mono">
                    {statusPeriodico.ultimo_checkin_data
                      ? `${statusPeriodico.dias_decorridos}d atrás`
                      : 'Nenhum ainda'}
                  </span>
                </div>
                <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-500 block">Próximo Agendado</span>
                  <span className={`font-bold font-mono ${statusPeriodico.checkin_pendente ? 'text-amber-400 font-extrabold' : 'text-emerald-400'}`}>
                    {statusPeriodico.checkin_pendente ? 'Agora' : statusPeriodico.proximo_checkin_data}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditandoPeriodo(!editandoPeriodo)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition border border-slate-700 active:scale-95 shadow"
                >
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{editandoPeriodo ? 'Fechar' : 'Ajustar Ciclo'}</span>
                </button>
              </div>
            </div>

            {/* SELETOR EXPANSÍVEL DE INTERVALO */}
            {editandoPeriodo && (
              <div className="mt-4 pt-3 border-t border-slate-800 space-y-3 animate-fade-in text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Personalizar Intervalo Periódico de Avaliação:</span>
                  <span className="text-xs text-slate-400">O sistema alertará automaticamente na data prevista</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { dias: 3, label: 'A cada 3 dias', desc: 'Acompanhamento intensivo / corte rápido' },
                    { dias: 5, label: 'A cada 5 dias', desc: 'Ciclo curto adaptativo' },
                    { dias: 7, label: 'A cada 7 dias', desc: 'Padrão semanal (Recomendado)', destaque: true },
                    { dias: 14, label: 'A cada 14 dias', desc: 'Manutenção / Bulk longo' }
                  ].map((opcao) => (
                    <button
                      key={opcao.dias}
                      type="button"
                      disabled={salvandoPeriodo}
                      onClick={() => handleSalvarFrequenciaPeriodica(opcao.dias)}
                      className={`p-2.5 rounded-xl text-left border transition ${
                        statusPeriodico.frequencia_dias === opcao.dias
                          ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs">{opcao.label}</span>
                        {statusPeriodico.frequencia_dias === opcao.dias && (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </div>
                      <span className="text-xs text-slate-400 block mt-1 leading-snug">{opcao.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {mensagemSucesso && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-500 text-emerald-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm animate-fade-in shadow-xl">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span className="font-bold">{mensagemSucesso}</span>
          </div>
          {mostrarBotaoDietaAviso && aoNavegarParaDieta && (
            <button
              type="button"
              onClick={aoNavegarParaDieta}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs flex items-center justify-center gap-1.5 transition shadow-sm active:scale-95 shrink-0 self-start sm:self-center"
            >
              <span>Ver Aba Dieta & Macros</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* ABA 1: FORMULÁRIO DO CHECK-UP & RESULTADOS */}
      {/* =================================================================== */}
      {abaAtiva === 'checkin' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* COLUNA ESQUERDA (5 cols): FORMULÁRIO COMPLETO */}
          <div className="lg:col-span-5 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Dados do Check-up
              </h2>
              <span className="text-xs text-slate-400 font-mono">Balança & Medidas</span>
            </div>

            <form onSubmit={handleSubmitCheckin} className="space-y-5">
              {/* BLOCO 1: BALANÇA, BF & COMPOSIÇÃO CORPORAL */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white flex items-center gap-1.5 uppercase tracking-wider">
                    <Scale className="w-4 h-4 text-emerald-400" />
                    Balança & Composição Corporal
                  </span>
                  {varPesoKg !== null && (
                    <span className={`text-xs font-mono font-black px-2.5 py-0.5 rounded-full border ${
                      varPesoKg < 0
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : varPesoKg > 0
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                      {varPesoKg > 0 ? `+${varPesoKg}` : varPesoKg} kg
                    </span>
                  )}
                </div>

                {/* COMPARADOR DE PESO: AUTOMÁTICO */}
                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-4 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                    <span className="block text-xs uppercase font-bold text-slate-400">Último Registo</span>
                    <span className="text-sm font-black text-slate-200 font-mono">
                      {pesoAnteriorRef !== null ? `${pesoAnteriorRef} kg` : 'Primeiro Check-up'}
                    </span>
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-xs font-semibold text-emerald-400 mb-1">
                      Peso Hoje (kg) <span className="text-slate-500 font-normal">*Balança em jejum</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={pesoAtual}
                      onChange={(e) => setPesoAtual(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-emerald-500/80 rounded-lg px-3 py-1.5 text-emerald-300 font-black text-sm shadow-md shadow-emerald-500/10 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>

                  <div className="sm:col-span-3 text-center sm:text-right bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                    <span className="block text-xs uppercase font-bold text-slate-400">Evolução</span>
                    <span className={`text-xs font-mono font-black ${
                      varPesoKg === null ? 'text-slate-400' : varPesoKg < 0 ? 'text-emerald-400' : varPesoKg > 0 ? 'text-amber-400' : 'text-slate-300'
                    }`}>
                      {varPesoKg !== null ? `${varPesoKg > 0 ? `+${varPesoKg}` : varPesoKg} kg` : 'Sem anterior'}
                    </span>
                  </div>
                </div>

                {/* % GORDURA CORPORAL (BF) & ASSISTENTE US NAVY */}
                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5 text-indigo-400" />
                        Gordura Corporal (% BF)
                      </span>
                      <span className="text-xs text-slate-400">Introduz diretamente ou calcula via medidas da Marinha</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setMostrarCalculadoraBf(!mostrarCalculadoraBf)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/40 text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition self-start sm:self-center"
                    >
                      <Calculator className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{mostrarCalculadoraBf ? 'Fechar Calculadora' : 'Calcular BF (US Navy)'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-4 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                      <span className="block text-xs uppercase font-bold text-slate-400">BF Anterior</span>
                      <span className="text-sm font-black text-slate-200 font-mono">
                        {bfAnteriorRef !== null ? `${bfAnteriorRef}%` : 'Sem registo'}
                      </span>
                    </div>

                    <div className="sm:col-span-5">
                      <label className="block text-xs font-semibold text-indigo-300 mb-1">
                        BF Hoje (%) <span className="text-slate-500 font-normal">(Opcional)</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Ex: 14.2"
                        value={bfAtual}
                        onChange={(e) => setBfAtual(e.target.value ? parseFloat(e.target.value) : '')}
                        className="w-full bg-slate-950 border border-indigo-500/60 rounded-lg px-3 py-1.5 text-indigo-200 font-black text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>

                    <div className="sm:col-span-3 text-center sm:text-right bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                      <span className="block text-xs uppercase font-bold text-slate-400">Variação BF</span>
                      <span className={`text-xs font-mono font-black ${
                        varBf === null ? 'text-slate-400' : varBf < 0 ? 'text-emerald-400' : varBf > 0 ? 'text-amber-400' : 'text-slate-300'
                      }`}>
                        {varBf !== null ? `${varBf > 0 ? `+${varBf}` : varBf}%` : '—'}
                      </span>
                    </div>
                  </div>

                  {/* CALCULADORA EXPANSÍVEL US NAVY */}
                  {mostrarCalculadoraBf && (
                    <div className="mt-3 p-4 bg-gradient-to-b from-indigo-950/40 to-slate-950/90 rounded-2xl border border-indigo-500/40 space-y-4 animate-fade-in text-xs shadow-xl">
                      {/* CABEÇALHO DA CALCULADORA COM SELETOR DE GÉNERO INTEGRADO */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-500/20 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 shrink-0">
                            <Calculator className="w-4 h-4" />
                          </div>
                          <div>
                            <strong className="text-white text-xs block font-bold">Fórmula Oficial U.S. Navy</strong>
                            <span className="text-xs text-slate-400">Estima a densidade e % de gordura corporal</span>
                          </div>
                        </div>

                        {/* SELETOR DE GÉNERO EM ABAS / PILLS */}
                        <div className="flex items-center gap-1.5 self-start sm:self-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
                          <span className="text-xs uppercase font-bold text-slate-500 px-2 hidden sm:inline">Género:</span>
                          <button
                            type="button"
                            onClick={() => setSexoCalculadora('masculino')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                              sexoCalculadora === 'masculino'
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                          >
                            <span>Masculino</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSexoCalculadora('feminino')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                              sexoCalculadora === 'feminino'
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                          >
                            <span>Feminino</span>
                          </button>
                        </div>
                      </div>

                      {/* GRELHA DE CAMPOS DA CALCULADORA */}
                      <div className={`grid gap-2.5 text-xs ${
                        sexoCalculadora === 'feminino'
                          ? 'grid-cols-2 sm:grid-cols-4'
                          : 'grid-cols-1 sm:grid-cols-3'
                      }`}>
                        {/* PESCOÇO */}
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs uppercase font-bold text-slate-400 block">Pescoço</label>
                            <span className="text-xs text-indigo-400 font-mono">*</span>
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.5"
                              placeholder="Ex: 38"
                              value={pescoco}
                              onChange={(e) => setPescoco(e.target.value ? parseFloat(e.target.value) : '')}
                              className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-400 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white pr-7"
                            />
                            <span className="absolute right-2 top-1.5 text-xs font-mono text-slate-500 pointer-events-none">cm</span>
                          </div>
                          <span className="text-xs text-slate-500 block leading-tight">Abaixo da maçã de Adão</span>
                        </div>

                        {/* CINTURA */}
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs uppercase font-bold text-slate-400 block">Cintura</label>
                            <span className="text-xs text-indigo-400 font-mono">*</span>
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.5"
                              placeholder="Ex: 82"
                              value={cintura}
                              onChange={(e) => setCintura(e.target.value ? parseFloat(e.target.value) : '')}
                              className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-400 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white pr-7"
                            />
                            <span className="absolute right-2 top-1.5 text-xs font-mono text-slate-500 pointer-events-none">cm</span>
                          </div>
                          <span className="text-xs text-slate-500 block leading-tight">Na linha do umbigo</span>
                        </div>

                        {/* ANCA (APENAS FEMININO) */}
                        {sexoCalculadora === 'feminino' && (
                          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs uppercase font-bold text-slate-400 block">Anca</label>
                              <span className="text-xs text-indigo-400 font-mono">*</span>
                            </div>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.5"
                                placeholder="Ex: 95"
                                value={anca}
                                onChange={(e) => setAnca(e.target.value ? parseFloat(e.target.value) : '')}
                                className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-400 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white pr-7"
                              />
                              <span className="absolute right-2 top-1.5 text-xs font-mono text-slate-500 pointer-events-none">cm</span>
                            </div>
                            <span className="text-xs text-slate-500 block leading-tight">Maior volume dos glúteos</span>
                          </div>
                        )}

                        {/* ALTURA */}
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs uppercase font-bold text-slate-400 block">Altura</label>
                            <span className="text-xs text-indigo-400 font-mono">*</span>
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.5"
                              placeholder="Ex: 175"
                              value={alturaCalculadora}
                              onChange={(e) => setAlturaCalculadora(parseFloat(e.target.value) || 0)}
                              className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-400 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white pr-7"
                            />
                            <span className="absolute right-2 top-1.5 text-xs font-mono text-slate-500 pointer-events-none">cm</span>
                          </div>
                          <span className="text-xs text-slate-500 block leading-tight">Perfil do atleta</span>
                        </div>
                      </div>

                      {/* BOTÃO DE CÁLCULO */}
                      <button
                        type="button"
                        disabled={calculandoBfNavy}
                        onClick={handleCalcularBfNavy}
                        className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-lg shadow-indigo-600/25"
                      >
                        {calculandoBfNavy ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        <span>Calcular & Aplicar % BF ao Check-up</span>
                      </button>

                      {/* RESULTADO CALCULADO */}
                      {resultadoBfNavy && (
                        <div className="p-3 rounded-xl bg-indigo-900/50 border border-indigo-500/40 text-xs text-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Percent className="w-4 h-4 text-emerald-400" />
                            <span>
                              % BF Calculado: <strong className="text-white text-sm font-black">{resultadoBfNavy.bf}%</strong>
                              <span className="text-indigo-300 ml-1.5 font-medium">({resultadoBfNavy.categoria})</span>
                            </span>
                          </div>
                          <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Inserido no campo BF Hoje
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* CALORIAS & FASE */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Calorias Ingeridas (Kcal)</label>
                    <input
                      type="number"
                      value={caloriasAtuais}
                      onChange={(e) => setCaloriasAtuais(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-bold text-xs"
                    />
                  </div>
                  {/* FASE FISIOLÓGICA */}
                  {projetoInfo && !substituirFaseManual ? (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-400">Fase Fisiológica</label>
                        <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Fixado pelo Projeto
                        </span>
                      </div>
                      <div className="w-full bg-slate-900 border border-emerald-500/40 rounded-lg px-2.5 py-1.5 flex items-center justify-between shadow-inner">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                          <span className="text-white font-bold text-xs truncate">
                            {nomeFaseProjeto || (faseAtual === 'cut' ? 'Défice / Cut' : faseAtual === 'bulk' ? 'Superávit / Bulk' : faseAtual === 'manutencao' ? 'Manutenção' : 'Recomposição')}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSubstituirFaseManual(true)}
                          className="text-xs text-slate-400 hover:text-emerald-300 font-medium ml-1 shrink-0 transition"
                          title="Se preferires definir manualmente fora do projeto"
                        >
                          Manual?
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-400">
                          Fase Fisiológica {!projetoInfo && <span className="text-slate-500 font-normal">(Manual)</span>}
                        </label>
                        {projetoInfo ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSubstituirFaseManual(false);
                              if (faseAtivaProjeto) {
                                setFaseAtual(faseAtivaProjeto.tipo);
                                setNomeFaseProjeto(faseAtivaProjeto.nome_exibicao || faseAtivaProjeto.tipo);
                              }
                            }}
                            className="text-xs text-amber-400 hover:text-amber-300 underline font-medium"
                          >
                            Voltar ao Projeto
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500 font-medium">Modo Manual</span>
                        )}
                      </div>
                      <select
                        value={faseAtual}
                        onChange={(e) => {
                          setFaseAtual(e.target.value);
                          if (!projetoInfo) {
                            const mapNomes: Record<string, string> = {
                              cut: 'Défice / Cut (Queima)',
                              bulk: 'Superávit / Bulk (Massa)',
                              recomposicao: 'Recomposição Corporal',
                              manutencao: 'Manutenção Fisiológica'
                            };
                            setNomeFaseProjeto(mapNomes[e.target.value] || e.target.value);
                          }
                        }}
                        className={`w-full bg-slate-900 border rounded-lg px-2.5 py-1.5 text-xs text-white ${
                          substituirFaseManual ? 'border-amber-500/60 ring-1 ring-amber-500/30' : 'border-slate-700'
                        }`}
                      >
                        <option value="cut">Défice / Cut (Queima)</option>
                        <option value="bulk">Superávit / Bulk (Massa)</option>
                        <option value="recomposicao">Recomposição Corporal</option>
                        <option value="manutencao">Manutenção Fisiológica</option>
                      </select>
                      {substituirFaseManual && (
                        <p className="text-xs text-amber-400/90 mt-1 leading-tight">
                          ⚠️ Modo manual ativo: a IA avaliará o check-in com base nesta fase em vez da fase do teu projeto.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* BLOCO 2: PERÍMETROS MUSCULARES & MEDIDAS CORPORAIS */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-white flex items-center gap-1.5 uppercase tracking-wider">
                      <Ruler className="w-4 h-4 text-teal-400" />
                      Circunferências Musculares (cm)
                    </span>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Comparações automáticas com o teu check-up anterior
                    </p>
                  </div>
                  {varCinturaCm !== null && (
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${
                      varCinturaCm < 0
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : varCinturaCm > 0
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      Cintura: {varCinturaCm > 0 ? `+${varCinturaCm}` : varCinturaCm} cm
                    </span>
                  )}
                </div>

                {/* GRELHA DE MEDIDAS: PEITO, OMBROS, CINTURA, BRAÇOS, ANTEBRAÇO, PERNAS, PANTURRILHA, PESCOÇO, ANCA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {[
                    {
                      id: 'cintura',
                      label: 'Cintura / Abdómen',
                      sub: 'Linha do umbigo (essencial)',
                      valor: cintura,
                      setValor: setCintura,
                      anterior: cinturaAnteriorRef,
                      destaque: true
                    },
                    {
                      id: 'pescoco',
                      label: 'Pescoço',
                      sub: 'Abaixo da maçã (para BF)',
                      valor: pescoco,
                      setValor: setPescoco,
                      anterior: pescocoAnteriorRef,
                      destaque: true
                    },
                    {
                      id: 'ombros',
                      label: 'Ombros / Deltoides',
                      sub: 'Maior largura clavicular',
                      valor: ombros,
                      setValor: setOmbros,
                      anterior: ombrosAnteriorRef
                    },
                    {
                      id: 'peitoral',
                      label: 'Peito / Peitoral',
                      sub: 'Tórax na linha dos mamilos',
                      valor: peitoral,
                      setValor: setPeitoral,
                      anterior: peitoralAnteriorRef
                    },
                    {
                      id: 'braco',
                      label: 'Braços (Bíceps)',
                      sub: 'Ponto médio relaxado',
                      valor: braco,
                      setValor: setBraco,
                      anterior: bracoAnteriorRef
                    },
                    {
                      id: 'antebraco',
                      label: 'Antebraço',
                      sub: 'Ponto de maior volume',
                      valor: antebraco,
                      setValor: setAntebraco,
                      anterior: antebracoAnteriorRef
                    },
                    {
                      id: 'coxa',
                      label: 'Pernas / Coxa',
                      sub: 'Ponto médio da coxa',
                      valor: coxa,
                      setValor: setCoxa,
                      anterior: coxaAnteriorRef
                    },
                    {
                      id: 'panturrilha',
                      label: 'Panturrilha / Gémeos',
                      sub: 'Maior perímetro da barriga',
                      valor: panturrilha,
                      setValor: setPanturrilha,
                      anterior: panturrilhaAnteriorRef
                    },
                    {
                      id: 'anca',
                      label: 'Anca / Glúteos',
                      sub: 'Maior circunferência glútea',
                      valor: anca,
                      setValor: setAnca,
                      anterior: ancaAnteriorRef
                    }
                  ].map((m) => {
                    const delta = calcularVariacao(m.valor, m.anterior);
                    return (
                      <div
                        key={m.id}
                        className={`p-2.5 rounded-xl border transition ${
                          m.destaque
                            ? 'bg-slate-900/90 border-teal-500/40'
                            : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <span className="text-xs font-bold text-white block leading-tight">{m.label}</span>
                            <span className="text-xs text-slate-400 block">{m.sub}</span>
                          </div>
                          {delta !== null && (
                            <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                              delta > 0
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : delta < 0
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {delta > 0 ? `+${delta}` : delta} cm
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 relative">
                            <input
                              type="number"
                              step="0.5"
                              placeholder="cm"
                              value={m.valor}
                              onChange={(e) => m.setValor(e.target.value ? parseFloat(e.target.value) : '')}
                              className={`w-full bg-slate-950 border rounded-lg px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:ring-1 ${
                                m.destaque ? 'border-teal-500/50 text-teal-200 focus:ring-teal-400' : 'border-slate-700 focus:ring-emerald-400'
                              }`}
                            />
                            <span className="absolute right-2 top-1 text-xs font-mono text-slate-500 pointer-events-none">cm</span>
                          </div>

                          <div className="text-right text-xs shrink-0 min-w-[62px] bg-slate-950/80 px-2 py-1 rounded border border-slate-800">
                            <span className="block text-slate-500 text-xs uppercase font-bold">Anterior</span>
                            <span className="font-mono font-bold text-slate-300">
                              {m.anterior !== null ? `${m.anterior} cm` : '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* BLOCO 3: ESTADO DO INDIVÍDUO & BIOFEEDBACK */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 space-y-3">
                <span className="text-xs font-black text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <Brain className="w-4 h-4 text-purple-400" />
                  Estado do Indivíduo & Biofeedback
                </span>

                <div className="space-y-2.5 text-xs">
                  {/* Energia */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">Nível de Energia & Disposição:</span>
                      <span className="font-black text-emerald-400">{energia}/10</span>
                    </div>
                    <input
                      type="range" min="1" max="10" value={energia}
                      onChange={(e) => setEnergia(parseInt(e.target.value))}
                      className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg"
                    />
                  </div>

                  {/* Fadiga */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">Nível de Fadiga Física / Dores Musculares:</span>
                      <span className={`font-black ${fadiga >= 8 ? 'text-red-400' : 'text-slate-200'}`}>{fadiga}/10</span>
                    </div>
                    <input
                      type="range" min="1" max="10" value={fadiga}
                      onChange={(e) => setFadiga(parseInt(e.target.value))}
                      className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg"
                    />
                  </div>

                  {/* Sono */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                        <Moon className="w-3 h-3 text-indigo-400" /> Horas Dormidas
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={horasSono}
                        onChange={(e) => setHorasSono(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Qualidade do Sono (1-10)</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={sono}
                        onChange={(e) => setSono(parseInt(e.target.value) || 7)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-bold"
                      />
                    </div>
                  </div>

                  {/* Fome e Stress */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Apetite / Fome (1-10)</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={fome}
                        onChange={(e) => setFome(parseInt(e.target.value) || 5)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Nível de Stress (1-10)</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={stress}
                        onChange={(e) => setStress(parseInt(e.target.value) || 5)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-bold"
                      />
                    </div>
                  </div>

                  {/* Digestão & Inchaço */}
                  <div className="pt-1">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Digestão & Conforto Gastrointestinal:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {[
                        { id: 'excelente', label: '🟢 Excelente', desc: 'Sem inchaço' },
                        { id: 'normal', label: '🟡 Normal', desc: 'Trânsito regular' },
                        { id: 'inchaco', label: '🟠 Inchaço', desc: 'Gases / distensão' },
                        { id: 'dificil', label: '🔴 Difícil', desc: 'Desconforto gástrico' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setDigestao(item.id)}
                          className={`p-2 rounded-lg border text-left transition-all ${
                            digestao === item.id
                              ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-sm'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span className="block text-xs font-bold">{item.label}</span>
                          <span className="block text-xs text-slate-400">{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dores Articulares */}
                  <div className="pt-1">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Dores Articulares ou Queixas de Lesão:
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: ligeiro desconforto no ombro direito ao fazer supino"
                      value={dores}
                      onChange={(e) => setDores(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* BLOCO 4: ADESÃO, RENDIMENTO NO TREINO & HÁBITOS */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 space-y-3">
                <span className="text-xs font-black text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <Flame className="w-4 h-4 text-amber-400" />
                  Adesão & Rendimento
                </span>

                <div className="space-y-3 text-xs">
                  {/* Adesão Slider */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">Adesão à Dieta & Treino:</span>
                      <span className="font-black text-emerald-400">{adesao}%</span>
                    </div>
                    <input
                      type="range" min="30" max="100" value={adesao}
                      onChange={(e) => setAdesao(parseInt(e.target.value))}
                      className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                        <Droplets className="w-3 h-3 text-blue-400" /> Água Ingerida (L)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={aguaLitros}
                        onChange={(e) => setAguaLitros(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Cardio Realizado (min)</label>
                      <input
                        type="number"
                        step="10"
                        value={cardioMinutos}
                        onChange={(e) => setCardioMinutos(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-bold"
                      />
                    </div>
                  </div>

                  {/* Rendimento no Ginásio */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Evolução de Cargas / Força no Ginásio:
                    </label>
                    <select
                      value={progressoTreino}
                      onChange={(e) => setProgressoTreino(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="aumentou">Aumentei cargas ou repetições (Sobrecarga Ativa 🔥)</option>
                      <option value="manteve">Mantive as mesmas cargas e reps com boa técnica</option>
                      <option value="estagnado">Estagnado (Travado nas mesmas cargas há 2+ treinos)</option>
                      <option value="caiu">Perdi força / Falha prematura nos compostos</option>
                    </select>
                  </div>

                  {/* Notas Livres */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Notas do Dia / Alimentos Fora do Plano:
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: comi uma fatia de bolo no aniversário, digestão correu bem"
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* BOTÃO DE SUBMISSÃO */}
              <button
                type="submit"
                disabled={carregando}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black rounded-xl shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 text-sm"
              >
                {carregando ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>A cruzar projeto, medidas e a analisar com IA...</span>
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" />
                    <span>Concluir Check-up & Obter Diagnóstico da IA</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* COLUNA DIREITA (7 cols): RESULTADOS & ANÁLISE COMPLETA DA IA */}
          <div className="lg:col-span-7 space-y-6">
            {diagnosticoMat && recomendacoesIA ? (
              <div className="space-y-6 animate-fade-in">
                {/* 1. CARTÃO PRINCIPAL: VEREDITO DO PROJETO ("ESTÁ NO CAMINHO CERTO?") */}
                {(() => {
                  const veredito: VereditoProjetoIA = recomendacoesIA.veredito_projeto || {
                    status: diagnosticoMat.diferenca_calorias === 0 ? 'no_caminho_certo' : 'ajuste_necessario',
                    titulo: diagnosticoMat.diferenca_calorias === 0
                      ? '🟢 No Caminho Certo! Progresso Alinhado à Fase'
                      : '🟡 Calibração Recomendada para Manter o Ritmo',
                    resumo_analise: diagnosticoMat.motivo_matematico,
                    ritmo_progresso: 'Taxa metabólica calculada com precisão determinística.'
                  };

                  const isVerde = veredito.status === 'no_caminho_certo';
                  const isAmarelo = veredito.status === 'ajuste_necessario';
                  const isVermelho = veredito.status === 'desvio_detectado';

                  return (
                    <div className={`p-6 rounded-2xl border-2 shadow-2xl space-y-4 ${
                      isVerde
                        ? 'bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 border-emerald-500 shadow-emerald-950/30'
                        : isAmarelo
                        ? 'bg-gradient-to-br from-amber-950/80 via-slate-900 to-slate-950 border-amber-500 shadow-amber-950/30'
                        : 'bg-gradient-to-br from-rose-950/90 via-slate-900 to-slate-950 border-rose-500 shadow-rose-950/40 ring-1 ring-rose-500/50'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                        <div className="flex items-center gap-2.5">
                          {isVerde ? (
                            <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                          ) : isAmarelo ? (
                            <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 animate-pulse" />
                          )}
                          <div>
                            <span className="text-xs font-mono text-slate-400 uppercase tracking-widest block font-bold">
                              Diagnóstico de Fase & Projeto
                            </span>
                            <h3 className="text-lg font-black text-white">{veredito.titulo}</h3>
                          </div>
                        </div>

                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider self-start sm:self-center ${
                          isVerde
                            ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                            : isAmarelo
                            ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                            : 'bg-rose-500 text-white shadow-md shadow-rose-500/30 font-extrabold'
                        }`}>
                          {isVerde ? 'No Caminho Certo' : isAmarelo ? 'Ajuste Recomendado' : 'Desvio Crítico'}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                        {veredito.resumo_analise}
                      </p>

                      {veredito.ritmo_progresso && (
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span><strong>Ritmo da Fase:</strong> {veredito.ritmo_progresso}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 2. GRELHA DE RECOMENDAÇÕES CIRÚRGICAS (DIETA vs TREINO) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* COLUNA DIETA: AJUSTAR OU CONTINUAR */}
                  {(() => {
                    const adjDieta = recomendacoesIA.ajustes_dieta;
                    const diffKcal = adjDieta ? adjDieta.diferenca_kcal : diagnosticoMat.diferenca_calorias;
                    const novasCal = adjDieta ? adjDieta.calorias_recomendadas : diagnosticoMat.novas_calorias;
                    const precisaAjuste = diffKcal !== 0;

                    return (
                      <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span className="text-xs font-black text-white flex items-center gap-1.5 uppercase tracking-wider">
                              <Flame className="w-4 h-4 text-amber-400" />
                              Recomendações na Dieta
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-black uppercase ${
                              !precisaAjuste ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {!precisaAjuste ? 'Manter Dieta' : `${diffKcal > 0 ? `+${diffKcal}` : diffKcal} Kcal`}
                            </span>
                          </div>

                          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                            <span className="text-xs text-slate-400 block font-medium">Meta Calórica Prescrita</span>
                            <span className="text-2xl font-black text-emerald-400 font-mono">
                              {Math.round(novasCal)} <span className="text-xs font-normal text-slate-400">kcal/dia</span>
                            </span>
                            <span className="text-xs text-slate-500 block mt-0.5">
                              {!precisaAjuste ? 'Balanço ideal: continuar consistente' : 'Calibração para superar estagnação'}
                            </span>
                          </div>

                          {adjDieta?.motivo_dieta && (
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {adjDieta.motivo_dieta}
                            </p>
                          )}

                          {adjDieta?.orientacoes_nutricionais && (
                            <div className="text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed whitespace-pre-line">
                              {adjDieta.orientacoes_nutricionais}
                            </div>
                          )}
                        </div>

                        {/* Botão de Ação: Sincronizar Dieta */}
                        {precisaAjuste ? (
                          <div className="space-y-2 mt-2">
                            <button
                              type="button"
                              disabled={aplicandoAjustes}
                              onClick={handleAplicarAjustesManualmente}
                              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20"
                            >
                              {aplicandoAjustes ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              <span>Aplicar Ajuste ({Math.round(novasCal)} kcal) à Dieta & Macros</span>
                            </button>
                            {aoNavegarParaDieta && (
                              <button
                                type="button"
                                onClick={aoNavegarParaDieta}
                                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition border border-slate-700 active:scale-95"
                              >
                                <span>Ir para a Aba Dieta & Macros</span>
                                <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-center text-xs text-emerald-400 font-bold">
                            ✨ Dieta perfeita: continuar com o plano atual!
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* COLUNA TREINO & CARDIO: AJUSTAR OU CONTINUAR */}
                  {(() => {
                    const adjTreino = recomendacoesIA.ajustes_treino;
                    const precisaAjusteTreino = adjTreino?.necessita_ajuste || false;

                    return (
                      <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span className="text-xs font-black text-white flex items-center gap-1.5 uppercase tracking-wider">
                              <HeartPulse className="w-4 h-4 text-indigo-400" />
                              Recomendações no Treino
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-black uppercase ${
                              !precisaAjusteTreino ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'
                            }`}>
                              {!precisaAjusteTreino ? 'Manter Treino' : 'Ajuste Ativo'}
                            </span>
                          </div>

                          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                            <span className="text-xs text-slate-400 block font-medium">Volume & Sobrecarga</span>
                            <span className="text-xs font-black text-white block">
                              {adjTreino?.ajuste_volume || diagnosticoMat.ajuste_treino_recomendado || 'Manter protocolo atual de séries.'}
                            </span>
                          </div>

                          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                            <div>
                              <span className="text-xs text-slate-400 block font-medium">Cardio Semanal</span>
                              <span className="text-base font-black text-indigo-400 font-mono">
                                {adjTreino?.ajuste_cardio_minutos_semana || cardioMinutos} min
                              </span>
                            </div>
                            <span className="text-xs text-slate-500">LISS / Baixo Impacto</span>
                          </div>

                          {adjTreino?.orientacoes_biomecanicas && (
                            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
                              <strong className="text-amber-400 block mb-0.5">Orientação Biomecânica / Dores:</strong>
                              {adjTreino.orientacoes_biomecanicas}
                            </div>
                          )}
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-300">
                          💪 Foco: Sobrecarga progressiva nos compostos pesados.
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 3. BLOCO DE SUPLEMENTAÇÃO, DIGESTÃO & MICRONUTRIENTES */}
                <div className="bg-gradient-to-br from-slate-900/90 to-slate-950 p-6 rounded-2xl border border-emerald-500/30 space-y-4 shadow-xl">
                  <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h4 className="font-extrabold text-white text-base">Suplementação, Micronutrientes & Recuperação</h4>
                      <span className="text-xs text-slate-400">Diretrizes para otimizar o descanso biológico do atleta</span>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800/80 text-xs text-slate-200 leading-relaxed whitespace-pre-line space-y-2">
                    {recomendacoesIA.suplementacao_e_recuperacao || recomendacoesIA.analise_micronutrientes_e_vitaminas}
                  </div>

                  {recomendacoesIA.mensagem_coach && (
                    <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-medium italic">
                      "{recomendacoesIA.mensagem_coach}"
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 text-slate-400 space-y-3">
                <Brain className="w-8 h-8 text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-white">Pronto para o teu Check-up</h3>
                <p className="text-xs max-w-md mx-auto">
                  Preenche os teus dados na coluna à esquerda e clica em <strong>Concluir Check-up</strong>. A IA analisará se estás no caminho certo e apresentará recomendações sob medida.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* ABA 2: HISTÓRICO & EVOLUÇÃO TEMPORAL */}
      {/* =================================================================== */}
      {abaAtiva === 'historico' && (
        <div className="space-y-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-lg font-black text-white">Histórico de Check-ups & Evolução</h3>
              <p className="text-xs text-slate-400">Registo de cada veredito, peso, cintura e estado do atleta ao longo do tempo</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded bg-slate-800 text-slate-300">
              Total de registos: {historico.length}
            </span>
          </div>

          {historico.length === 0 ? (
            <div className="text-center p-12 text-slate-400 text-xs">
              Ainda não tens check-ups registados. Faz o teu primeiro check-up na aba ao lado!
            </div>
          ) : (
            <div className="space-y-4">
              {historico.map((item) => {
                const extras = item.metricas_adicionais || {};
                const veredito = item.recomendacoes_ia?.veredito_projeto;
                const statusVeredito = veredito?.status || 'no_caminho_certo';
                const isVerde = statusVeredito === 'no_caminho_certo';
                const isAmarelo = statusVeredito === 'ajuste_necessario';
                const isVermelho = statusVeredito === 'desvio_detectado';

                return (
                  <div key={item.id} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-white text-base">
                            Check-up de {new Date(item.data).toLocaleDateString('pt-PT')}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-black uppercase ${
                            isVerde
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : isAmarelo
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-rose-500/20 text-rose-400 font-extrabold'
                          }`}>
                            {isVerde ? 'No Caminho Certo' : isAmarelo ? 'Ajuste Recomendado' : 'Desvio Crítico'}
                          </span>
                          {extras.nome_fase_projeto && (
                            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              {extras.nome_fase_projeto}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 font-mono">
                          {new Date(item.data).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 sm:gap-4 text-xs font-mono flex-wrap">
                        <div>
                          <span className="text-xs text-slate-400 uppercase font-bold block">Peso</span>
                          <span className="text-sm font-black text-white">{item.peso_medio} kg</span>
                        </div>
                        {extras.bf_atual && (
                          <div>
                            <span className="text-xs text-indigo-400 uppercase font-bold block">BF</span>
                            <span className="text-sm font-black text-indigo-300">{extras.bf_atual}%</span>
                          </div>
                        )}
                        {extras.cintura_cm && (
                          <div>
                            <span className="text-xs text-teal-400 uppercase font-bold block">Cintura</span>
                            <span className="text-sm font-black text-teal-300">{extras.cintura_cm} cm</span>
                          </div>
                        )}
                        <div>
                          <span className="text-xs text-slate-400 uppercase font-bold block">Kcal</span>
                          <span className="text-sm font-black text-emerald-400">
                            {Math.round(item.diagnostico_matematico?.novas_calorias || 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Veredito / Análise */}
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {veredito?.resumo_analise || item.diagnostico_matematico?.motivo_matematico}
                    </p>

                    {/* Perímetros Corporais Registados */}
                    {(extras.peitoral_cm || extras.ombros_cm || extras.braco_cm || extras.antebraco_cm || extras.coxa_cm || extras.panturrilha_cm || extras.pescoco_cm || extras.anca_cm) && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs font-mono">
                        <span className="text-slate-400 font-bold mr-1">Medidas:</span>
                        {extras.pescoco_cm && <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">Pescoço: <strong className="text-teal-300">{extras.pescoco_cm} cm</strong></span>}
                        {extras.ombros_cm && <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">Ombros: <strong className="text-teal-300">{extras.ombros_cm} cm</strong></span>}
                        {extras.peitoral_cm && <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">Peito: <strong className="text-teal-300">{extras.peitoral_cm} cm</strong></span>}
                        {extras.braco_cm && <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">Braço: <strong className="text-teal-300">{extras.braco_cm} cm</strong></span>}
                        {extras.antebraco_cm && <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">Antebraço: <strong className="text-teal-300">{extras.antebraco_cm} cm</strong></span>}
                        {extras.coxa_cm && <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">Coxa: <strong className="text-teal-300">{extras.coxa_cm} cm</strong></span>}
                        {extras.panturrilha_cm && <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">Panturrilha: <strong className="text-teal-300">{extras.panturrilha_cm} cm</strong></span>}
                        {extras.anca_cm && <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">Anca: <strong className="text-teal-300">{extras.anca_cm} cm</strong></span>}
                      </div>
                    )}

                    {/* Pills de Biofeedback & Hábitos */}
                    <div className="flex flex-wrap gap-2 pt-1 text-xs font-mono">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                        Energia: <strong className="text-emerald-400">{extras.nivel_energia || 7}/10</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                        Fadiga: <strong className="text-red-400">{item.nivel_fadiga}/10</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                        Sono: <strong className="text-indigo-400">{extras.horas_sono || 7}h ({item.qualidade_sono}/10)</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                        Adesão: <strong className="text-emerald-400">{item.adesao_percentual}%</strong>
                      </span>
                      {extras.agua_litros && (
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                          Água: <strong className="text-blue-400">{extras.agua_litros}L</strong>
                        </span>
                      )}
                      {extras.estado_digestao && (
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 capitalize">
                          Digestão: <strong className="text-amber-400">{extras.estado_digestao}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};