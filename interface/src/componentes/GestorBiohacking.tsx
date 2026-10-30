import React, { useState, useEffect } from 'react';
import {
  Activity, Zap, Moon, Sun, Dumbbell, ShieldCheck, Flame, Plus, Trash2,
  CheckCircle2, Square, CheckSquare, Save, RefreshCw, BookOpen, Clock,
  TrendingUp, Award, AlertTriangle, X, Sliders, ChevronDown, ChevronUp,
  BatteryCharging, Info, HeartPulse, Search, Sparkles, Filter, ExternalLink
} from 'lucide-react';
import { ServicoApi } from '../servicos/api';
import {
  SubstanciaBiohacking, ProtocoloBiohackingCompleto,
  RegistoBiofeedbackItem, ComparativoEvolucaoBiohacking
} from '../tipos/fitness';

export const GestorBiohacking: React.FC = () => {
  const [carregando, setCarregando] = useState<boolean>(true);
  const [protocolo, setProtocolo] = useState<ProtocoloBiohackingCompleto | null>(null);
  const [catalogo, setCatalogo] = useState<SubstanciaBiohacking[]>([]);
  const [comparativo, setComparativo] = useState<ComparativoEvolucaoBiohacking | null>(null);
  const [historicoBiofeedback, setHistoricoBiofeedback] = useState<RegistoBiofeedbackItem[]>([]);
  
  // Vista Ativa: 'protocolo' ou 'enciclopedia'
  const [vistaAtiva, setVistaAtiva] = useState<'protocolo' | 'enciclopedia'>('protocolo');

  // Filtros & Pesquisa na Enciclopédia
  const [pesquisaEnciclopedia, setPesquisaEnciclopedia] = useState<string>('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos');

  // Feedback e alertas
  const [mensagemSucesso, setMensagemSucesso] = useState<string>('');
  const [mensagemErro, setMensagemErro] = useState<string>('');
  const [salvando, setSalvando] = useState<boolean>(false);
  const [gerandoRecomendacao, setGerandoRecomendacao] = useState<boolean>(false);

  // Modal para Criar Nova Substância
  const [modalCustomVisivel, setModalCustomVisivel] = useState<boolean>(false);
  const [customNome, setCustomNome] = useState<string>('');
  const [customDose, setCustomDose] = useState<string>('');
  const [customHorario, setCustomHorario] = useState<'manha' | 'treino' | 'noite'>('manha');
  const [customCategoria, setCustomCategoria] = useState<'hormonal' | 'sono_recuperacao' | 'energia_mitocondrial' | 'base_saude'>('hormonal');
  const [customPrecisaCiclo, setCustomPrecisaCiclo] = useState<boolean>(false);
  const [customSemanasOn, setCustomSemanasOn] = useState<number>(4);
  const [customSemanasOff, setCustomSemanasOff] = useState<number>(1);
  const [customMecanismo, setCustomMecanismo] = useState<string>('');
  const [customComoTomar, setCustomComoTomar] = useState<string>('');
  const [salvandoCustom, setSalvandoCustom] = useState<boolean>(false);

  // Biofeedback rápido diário
  const [vigor, setVigor] = useState<number>(8);
  const [sono, setSono] = useState<number>(8);
  const [recuperacao, setRecuperacao] = useState<number>(8);
  const [libido, setLibido] = useState<number>(8);
  const [gravandoBiofeedback, setGravandoBiofeedback] = useState<boolean>(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const [protData, catData, compData, bioData] = await Promise.all([
        ServicoApi.obterProtocoloBiohackingAtivo(),
        ServicoApi.obterCatalogoBiohacking(),
        ServicoApi.obterComparativoBiohacking(),
        ServicoApi.obterHistoricoBiofeedback()
      ]);
      setProtocolo(protData);
      setCatalogo(catData);
      setComparativo(compData);
      setHistoricoBiofeedback(bioData);

      const hoje = new Date().toISOString().split('T')[0];
      const registoHoje = bioData.find((b: any) => b.data === hoje);
      if (registoHoje) {
        setVigor(registoHoje.vigor_energia);
        setSono(registoHoje.qualidade_sono);
        setRecuperacao(registoHoje.recuperacao_muscular);
        setLibido(registoHoje.libido_vitalidade);
      }
    } catch (err: any) {
      console.error('Erro ao carregar biohacking:', err);
      setMensagemErro('Falha ao carregar dados de biohacking.');
    } finally {
      setCarregando(false);
    }
  };

  const handleMarcarToma = async (substanciaId: string) => {
    if (!protocolo) return;
    try {
      const res = await ServicoApi.marcarTomaBiohacking(substanciaId);
      const novasSubstancias = protocolo.substancias.map(s => {
        if (s.id === substanciaId) {
          return { ...s, tomado_hoje: res.tomado_hoje };
        }
        return s;
      });
      const novasTomas = res.tomado_hoje
        ? [...protocolo.tomas_hoje, substanciaId]
        : protocolo.tomas_hoje.filter(id => id !== substanciaId);

      setProtocolo({
        ...protocolo,
        substancias: novasSubstancias,
        tomas_hoje: novasTomas
      });
    } catch (err) {
      console.error('Erro ao marcar toma:', err);
    }
  };

  const handleSalvarProtocolo = async () => {
    if (!protocolo) return;
    try {
      setSalvando(true);
      await ServicoApi.salvarProtocoloBiohacking({
        nome: protocolo.nome,
        objetivo: protocolo.objetivo,
        substancias: protocolo.substancias,
        notas_atleta: protocolo.notas_atleta
      });
      setMensagemSucesso('Protocolo e dosagens guardados com sucesso!');
      setTimeout(() => setMensagemSucesso(''), 4000);
    } catch (err) {
      console.error('Erro ao salvar protocolo:', err);
      setMensagemErro('Falha ao guardar protocolo.');
      setTimeout(() => setMensagemErro(''), 4000);
    } finally {
      setSalvando(false);
    }
  };

  const handleGerarRecomendacao = async () => {
    try {
      setGerandoRecomendacao(true);
      const rec = await ServicoApi.gerarRecomendacaoBiohacking();
      if (protocolo) {
        const novoProt = {
          ...protocolo,
          nome: rec.nome,
          objetivo: rec.objetivo,
          substancias: rec.substancias
        };
        setProtocolo(novoProt);
        await ServicoApi.salvarProtocoloBiohacking({
          nome: rec.nome,
          objetivo: rec.objetivo,
          substancias: rec.substancias
        });
        setMensagemSucesso('Stack adaptativo de mínima dose eficaz gerado com base no teu treino e perfil!');
        setTimeout(() => setMensagemSucesso(''), 4500);
      }
    } catch (err) {
      console.error('Erro ao gerar recomendação:', err);
      setMensagemErro('Falha ao gerar prescrição adaptativa.');
      setTimeout(() => setMensagemErro(''), 4000);
    } finally {
      setGerandoRecomendacao(false);
    }
  };

  const handleAdicionarAoProtocolo = (sub: SubstanciaBiohacking) => {
    if (!protocolo) return;
    if (protocolo.substancias.some(s => s.id === sub.id)) {
      setMensagemErro(`${sub.nome} já se encontra no teu protocolo ativo.`);
      setTimeout(() => setMensagemErro(''), 3000);
      return;
    }
    const novaSub: SubstanciaBiohacking = {
      ...sub,
      dose_sugerida: sub.dose_padrao,
      status_ciclo: sub.precisa_ciclo ? 'on' : 'continuo',
      semanas_concluidas: 1,
      tomado_hoje: false
    };
    const novasSubstancias = [...protocolo.substancias, novaSub];
    setProtocolo({ ...protocolo, substancias: novasSubstancias });
    setMensagemSucesso(`${sub.nome} adicionado ao teu protocolo diário!`);
    setTimeout(() => setMensagemSucesso(''), 3500);
  };

  const handleRemoverSubstancia = (subId: string) => {
    if (!protocolo) return;
    const novasSubstancias = protocolo.substancias.filter(s => s.id !== subId);
    setProtocolo({ ...protocolo, substancias: novasSubstancias });
  };

  const handleCriarPersonalizada = async () => {
    if (!customNome.trim() || !customDose.trim()) return;
    try {
      setSalvandoCustom(true);
      const novaSub: Partial<SubstanciaBiohacking> = {
        id: `custom_${Date.now()}`,
        nome: customNome.trim(),
        categoria: customCategoria,
        dose_padrao: customDose.trim(),
        horario_ideal: customHorario,
        precisa_ciclo: customPrecisaCiclo,
        semanas_on: customPrecisaCiclo ? customSemanasOn : 52,
        semanas_off: customPrecisaCiclo ? customSemanasOff : 0,
        mecanismo: customMecanismo.trim() || 'Substância personalizada adicionada pelo atleta.',
        como_tomar: customComoTomar.trim() || 'Tomar conforme indicado pelo rótulo.',
        beneficio: 'Otimização fisiológica individualizada.'
      };

      const res = await ServicoApi.adicionarSubstanciaAoCatalogo(novaSub);
      
      // Atualizar catálogo local
      setCatalogo([...catalogo, res.substancia]);

      // Adicionar também ao protocolo ativo
      if (protocolo) {
        const subProtocolo: SubstanciaBiohacking = {
          ...res.substancia,
          dose_sugerida: res.substancia.dose_padrao,
          status_ciclo: res.substancia.precisa_ciclo ? 'on' : 'continuo',
          semanas_concluidas: 1,
          tomado_hoje: false
        };
        setProtocolo({
          ...protocolo,
          substancias: [...protocolo.substancias, subProtocolo]
        });
      }

      setModalCustomVisivel(false);
      setCustomNome('');
      setCustomDose('');
      setCustomMecanismo('');
      setCustomComoTomar('');
      setMensagemSucesso(`${res.substancia.nome} guardado na biblioteca permanente e adicionado ao protocolo!`);
      setTimeout(() => setMensagemSucesso(''), 4000);
    } catch (err) {
      console.error('Erro ao adicionar substância:', err);
      setMensagemErro('Falha ao adicionar substância à biblioteca.');
      setTimeout(() => setMensagemErro(''), 4000);
    } finally {
      setSalvandoCustom(false);
    }
  };

  const handleGravarBiofeedback = async () => {
    try {
      setGravandoBiofeedback(true);
      await ServicoApi.registarBiofeedback({
        vigor_energia: vigor,
        qualidade_sono: sono,
        recuperacao_muscular: recuperacao,
        libido_vitalidade: libido,
        protocolo_ativo: true
      });
      const compAtualizado = await ServicoApi.obterComparativoBiohacking();
      setComparativo(compAtualizado);
      setMensagemSucesso('Biofeedback de hoje registado no histórico comparativo!');
      setTimeout(() => setMensagemSucesso(''), 3500);
    } catch (err) {
      console.error('Erro ao registar biofeedback:', err);
      setMensagemErro('Falha ao registar biofeedback.');
      setTimeout(() => setMensagemErro(''), 3500);
    } finally {
      setGravandoBiofeedback(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const substancias = protocolo?.substancias || [];
  const subsManha = substancias.filter(s => s.horario_ideal === 'manha');
  const subsTreino = substancias.filter(s => s.horario_ideal === 'treino');
  const subsNoite = substancias.filter(s => s.horario_ideal === 'noite');

  const totalSubs = substancias.length;
  const tomadasHojeCount = substancias.filter(s => s.tomado_hoje).length;
  const pctAdesaoHoje = totalSubs > 0 ? Math.round((tomadasHojeCount / totalSubs) * 100) : 0;
  const ciclicasCount = substancias.filter(s => s.precisa_ciclo).length;

  // Filtragem da Enciclopédia
  const catalogoFiltrado = catalogo.filter(sub => {
    const correspondeCategoria = filtroCategoria === 'todos' || sub.categoria === filtroCategoria;
    const termo = pesquisaEnciclopedia.toLowerCase().trim();
    if (!termo) return correspondeCategoria;
    const correspondeTexto =
      sub.nome.toLowerCase().includes(termo) ||
      sub.mecanismo.toLowerCase().includes(termo) ||
      sub.beneficio.toLowerCase().includes(termo) ||
      sub.como_tomar.toLowerCase().includes(termo);
    return correspondeCategoria && correspondeTexto;
  });

  return (
    <div className="space-y-4 sm:space-y-6 pb-16">
      {/* CABEÇALHO & SELEÇÃO DE VISTAS */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 p-3.5 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-emerald-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5" /> Biohacking & Vitalidade Endócrina
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2">
            <span>{protocolo?.nome || 'Protocolo de Otimização Hormonal'}</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Regulação do sono de ondas lentas, libertação de testosterona livre, controlo de ciclos ON/OFF e biblioteca científica completa de substâncias ativas.
          </p>
        </div>

        {/* NAVEGAÇÃO DE VISTAS (PROTOCOLO VS ENCICLOPÉDIA) */}
        <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800 self-start lg:self-center">
          <button
            onClick={() => setVistaAtiva('protocolo')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
              vistaAtiva === 'protocolo'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>O Meu Protocolo Ativo ({totalSubs})</span>
          </button>

          <button
            onClick={() => setVistaAtiva('enciclopedia')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
              vistaAtiva === 'enciclopedia'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>Enciclopédia de Substâncias ({catalogo.length})</span>
          </button>
        </div>
      </div>

      {mensagemSucesso && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 rounded-xl flex items-center gap-3 text-sm animate-fade-in shadow-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{mensagemSucesso}</span>
        </div>
      )}

      {mensagemErro && (
        <div className="p-4 bg-rose-950/60 border border-rose-500/50 text-rose-300 rounded-xl flex items-center gap-3 text-sm animate-fade-in shadow-md">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{mensagemErro}</span>
        </div>
      )}

            {/* AVISO DE RESPONSABILIDADE INDIVIDUAL E ISENÇÃO MÉDICA */}
      <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-200">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-amber-300 flex items-center gap-2">
            <span>Aviso de Responsabilidade Individual & Isenção Médica</span>
            <span className="px-2 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase font-black">
              Informativo
            </span>
          </div>
          <p className="text-amber-200/90 leading-relaxed">
            As informações, dosagens sugeridas, mecanismos de ação e ciclos presentes neste módulo têm caráter meramente educativo e científico, baseando-se em literatura pública sobre fitoquímicos e suplementação desportiva. A utilização de qualquer substância é da exclusiva responsabilidade individual de cada utilizador. Recomenda-se vivamente consulta e acompanhamento por um médico, endocrinologista ou nutricionista antes de iniciar qualquer protocolo ou alteração metabólica.
          </p>
        </div>
      </div>

{/* ==================================================================== */}
      {/* VISTA 1: O MEU PROTOCOLO ATIVO */}
      {/* ==================================================================== */}
      {vistaAtiva === 'protocolo' && (
        <div className="space-y-6 animate-fade-in">
          {/* BARRA DE AÇÕES DO PROTOCOLO */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 p-3 px-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="font-bold text-white">Objetivo Atual:</span>
              <span className="text-slate-400">{protocolo?.objetivo}</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setModalCustomVisivel(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs flex items-center gap-1.5 transition border border-slate-700"
              >
                <Plus className="w-3.5 h-3.5 text-slate-400" />
                <span>+ Adicionar Nova Substância</span>
              </button>

              <button
                onClick={handleGerarRecomendacao}
                disabled={gerandoRecomendacao}
                className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1.5 transition shadow disabled:opacity-50"
                title="Prescrever combinação de mínima dose eficaz com base no teu treino e check-in"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${gerandoRecomendacao ? 'animate-spin' : ''}`} />
                <span>Prescrever Stack com Motor</span>
              </button>

              <button
                onClick={handleSalvarProtocolo}
                disabled={salvando}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Protocolo</span>
              </button>
            </div>
          </div>

          {/* PAINEL DE MÉTRICAS RÁPIDAS DO PROTOCOLO */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Substâncias Ativas</span>
              </div>
              <div className="text-xl md:text-2xl font-black text-white">
                {totalSubs} <span className="text-xs text-slate-500 font-normal">compostos</span>
              </div>
              <span className="text-xs text-emerald-400/90 font-medium block mt-0.5">
                Mínima dose eficaz
              </span>
            </div>

            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Adesão Diária (Hoje)</span>
              </div>
              <div className="text-xl md:text-2xl font-black text-white">
                {pctAdesaoHoje}% <span className="text-xs text-slate-500 font-normal">({tomadasHojeCount}/{totalSubs})</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div
                  className="bg-teal-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${pctAdesaoHoje}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Controlo de Ciclos</span>
              </div>
              <div className="text-xl md:text-2xl font-black text-white">
                {ciclicasCount} <span className="text-xs text-slate-500 font-normal">cíclicos (ON/OFF)</span>
              </div>
              <span className="text-xs text-amber-400/90 font-medium block mt-0.5">
                {totalSubs - ciclicasCount} de uso contínuo
              </span>
            </div>

            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
                <BatteryCharging className="w-3.5 h-3.5 text-blue-400" />
                <span>Score de Vitalidade</span>
              </div>
              <div className="text-xl md:text-2xl font-black text-white">
                {Math.round(((vigor + sono + recuperacao + libido) / 4) * 10) / 10} <span className="text-xs text-slate-500 font-normal">/ 10</span>
              </div>
              <span className="text-xs text-blue-400/90 font-medium block mt-0.5">
                Biofeedback consolidado
              </span>
            </div>
          </div>

          {/* RITUAIS DE TOMA POR HORÁRIOS BIOLÓGICOS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Rituais de Toma Diária</span>
                <span className="text-xs text-slate-400 font-normal">
                  (Organizado por timing de absorção e biodisponibilidade)
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* BLOCO MANHÃ */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                      <Sun className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Bloco Manhã</h3>
                      <span className="text-xs text-slate-400">Desjejum / Início do Dia</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {subsManha.filter(s => s.tomado_hoje).length}/{subsManha.length}
                  </span>
                </div>

                {subsManha.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4 text-center">
                    Nenhuma substância matinal configurada.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {subsManha.map(sub => (
                      <div
                        key={sub.id}
                        className={`p-3 rounded-xl border transition-all ${
                          sub.tomado_hoje
                            ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-300'
                            : 'bg-slate-950/70 border-slate-800 text-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <button
                              type="button"
                              onClick={() => handleMarcarToma(sub.id)}
                              className="mt-0.5 text-slate-400 hover:text-emerald-400 transition"
                            >
                              {sub.tomado_hoje ? (
                                <CheckSquare className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-500" />
                              )}
                            </button>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-xs font-bold ${sub.tomado_hoje ? 'line-through text-slate-400' : 'text-white'}`}>
                                  {sub.nome}
                                </span>
                                {sub.precisa_ciclo && (
                                  <span className="text-xs font-mono bg-amber-500/15 border border-amber-500/30 text-amber-300 px-1.5 py-0.2 rounded">
                                    ON: Sem {sub.semanas_concluidas || 1}/{sub.semanas_on || 4}
                                  </span>
                                )}
                              </div>
                              <span className="text-emerald-400 text-xs font-black block mt-0.5">
                                {sub.dose_sugerida || sub.dose_padrao}
                              </span>
                              <p className="text-xs text-slate-400 mt-1 leading-tight">
                                💡 {sub.como_tomar}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleRemoverSubstancia(sub.id)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                            title="Remover do protocolo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* BLOCO TREINO */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <Dumbbell className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Bloco Peri-Treino</h3>
                      <span className="text-xs text-slate-400">Pré / Pós-Treino</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {subsTreino.filter(s => s.tomado_hoje).length}/{subsTreino.length}
                  </span>
                </div>

                {subsTreino.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4 text-center">
                    Nenhuma substância peri-treino configurada.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {subsTreino.map(sub => (
                      <div
                        key={sub.id}
                        className={`p-3 rounded-xl border transition-all ${
                          sub.tomado_hoje
                            ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-300'
                            : 'bg-slate-950/70 border-slate-800 text-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <button
                              type="button"
                              onClick={() => handleMarcarToma(sub.id)}
                              className="mt-0.5 text-slate-400 hover:text-emerald-400 transition"
                            >
                              {sub.tomado_hoje ? (
                                <CheckSquare className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-500" />
                              )}
                            </button>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-xs font-bold ${sub.tomado_hoje ? 'line-through text-slate-400' : 'text-white'}`}>
                                  {sub.nome}
                                </span>
                                {sub.precisa_ciclo && (
                                  <span className="text-xs font-mono bg-amber-500/15 border border-amber-500/30 text-amber-300 px-1.5 py-0.2 rounded">
                                    ON: Sem {sub.semanas_concluidas || 1}/{sub.semanas_on || 4}
                                  </span>
                                )}
                              </div>
                              <span className="text-emerald-400 text-xs font-black block mt-0.5">
                                {sub.dose_sugerida || sub.dose_padrao}
                              </span>
                              <p className="text-xs text-slate-400 mt-1 leading-tight">
                                💡 {sub.como_tomar}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleRemoverSubstancia(sub.id)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                            title="Remover do protocolo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* BLOCO NOITE */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
                      <Moon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Bloco Noite / Pré-Sono</h3>
                      <span className="text-xs text-slate-400">30-45 min antes de dormir</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {subsNoite.filter(s => s.tomado_hoje).length}/{subsNoite.length}
                  </span>
                </div>

                {subsNoite.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4 text-center">
                    Nenhuma substância noturna configurada.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {subsNoite.map(sub => (
                      <div
                        key={sub.id}
                        className={`p-3 rounded-xl border transition-all ${
                          sub.tomado_hoje
                            ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-300'
                            : 'bg-slate-950/70 border-slate-800 text-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <button
                              type="button"
                              onClick={() => handleMarcarToma(sub.id)}
                              className="mt-0.5 text-slate-400 hover:text-emerald-400 transition"
                            >
                              {sub.tomado_hoje ? (
                                <CheckSquare className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-500" />
                              )}
                            </button>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-xs font-bold ${sub.tomado_hoje ? 'line-through text-slate-400' : 'text-white'}`}>
                                  {sub.nome}
                                </span>
                                {sub.precisa_ciclo && (
                                  <span className="text-xs font-mono bg-amber-500/15 border border-amber-500/30 text-amber-300 px-1.5 py-0.2 rounded">
                                    ON: Sem {sub.semanas_concluidas || 1}/{sub.semanas_on || 4}
                                  </span>
                                )}
                              </div>
                              <span className="text-emerald-400 text-xs font-black block mt-0.5">
                                {sub.dose_sugerida || sub.dose_padrao}
                              </span>
                              <p className="text-xs text-slate-400 mt-1 leading-tight">
                                💡 {sub.como_tomar}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleRemoverSubstancia(sub.id)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                            title="Remover do protocolo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* MONITOR VISUAL DE CICLOS (ON / OFF) */}
          {ciclicasCount > 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">
                    Monitorização de Ciclos Ativos & Prevenção de Dessensibilização
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  Regra de Proteção do Eixo
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {substancias.filter(s => s.precisa_ciclo).map(sub => {
                  const semOn = sub.semanas_on || 4;
                  const semAtuais = sub.semanas_concluidas || 1;
                  const pctCiclo = Math.min(100, Math.round((semAtuais / semOn) * 100));

                  return (
                    <div key={sub.id} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-white block">{sub.nome}</span>
                          <span className="text-xs text-slate-400">
                            Ciclo: {semOn} semanas ON • {sub.semanas_off || 1} semana(s) OFF
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          FASE ON
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>Semana {semAtuais} de {semOn}</span>
                          <span>{pctCiclo}% concluído</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all"
                            style={{ width: `${pctCiclo}%` }}
                          />
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 leading-tight">
                        🛡️ {sub.mecanismo}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LABORATÓRIO PESSOAL • EVOLUÇÃO COM VS SEM PROTOCOLO */}
          {comparativo && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Laboratório Pessoal • Evolução COM vs. SEM Protocolo
                    </h3>
                    <span className="text-xs text-slate-400">
                      Cruzamento das cargas de treino, check-ins e biofeedback
                    </span>
                  </div>
                </div>
                <span className="text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                  Análise Empírica
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Progressão de Carga</span>
                    <span className="text-xs font-black text-emerald-400">{comparativo.impacto_percentual.forca_progressao}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
                    <div className="text-slate-400">
                      <span className="block text-xs text-slate-500">Sem Protocolo</span>
                      <span className="font-bold text-slate-300">{comparativo.periodo_sem_protocolo.progressao_carga_semanal}</span>
                    </div>
                    <div className="text-right text-emerald-400">
                      <span className="block text-xs text-emerald-500/80">Com Protocolo</span>
                      <span className="font-black text-emerald-300">{comparativo.periodo_com_protocolo.progressao_carga_semanal}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Qualidade do Sono</span>
                    <span className="text-xs font-black text-teal-400">{comparativo.impacto_percentual.sono}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
                    <div className="text-slate-400">
                      <span className="block text-xs text-slate-500">Sem Protocolo</span>
                      <span className="font-bold text-slate-300">{comparativo.periodo_sem_protocolo.qualidade_sono} / 10</span>
                    </div>
                    <div className="text-right text-teal-400">
                      <span className="block text-xs text-teal-500/80">Com Protocolo</span>
                      <span className="font-black text-teal-300">{comparativo.periodo_com_protocolo.qualidade_sono} / 10</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Nível de Fadiga</span>
                    <span className="text-xs font-black text-blue-400">{comparativo.impacto_percentual.fadiga}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
                    <div className="text-slate-400">
                      <span className="block text-xs text-slate-500">Sem Protocolo</span>
                      <span className="font-bold text-slate-300">{comparativo.periodo_sem_protocolo.nivel_fadiga} / 10</span>
                    </div>
                    <div className="text-right text-blue-400">
                      <span className="block text-xs text-blue-500/80">Com Protocolo</span>
                      <span className="font-black text-blue-300">{comparativo.periodo_com_protocolo.nivel_fadiga} / 10</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-emerald-500/20 text-xs text-slate-300 leading-relaxed">
                <strong>🔬 Parecer Fisiológico do Motor:</strong> {comparativo.conclusao_cientifica}
              </div>
            </div>
          )}

          {/* CHECK-UP DE BIOFEEDBACK DIÁRIO (10 SEGUNDOS) */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-rose-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Check-up de Biofeedback Diário (Sensação Real)
                  </h3>
                  <span className="text-xs text-slate-400">
                    Avalia a tua vitalidade para calibrar o impacto das substâncias
                  </span>
                </div>
              </div>

              <button
                onClick={handleGravarBiofeedback}
                disabled={gravandoBiofeedback}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{gravandoBiofeedback ? 'A guardar...' : 'Gravar Hoje'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-400" /> Vigor & Energia
                  </span>
                  <span className="font-mono font-black text-amber-400">{vigor}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={vigor}
                  onChange={(e) => setVigor(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1">
                    <Moon className="w-3.5 h-3.5 text-teal-400" /> Sono & Repouso
                  </span>
                  <span className="font-mono font-black text-teal-400">{sono}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={sono}
                  onChange={(e) => setSono(Number(e.target.value))}
                  className="w-full accent-teal-500 cursor-pointer"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1">
                    <Dumbbell className="w-3.5 h-3.5 text-emerald-400" /> Recuperação Muscular
                  </span>
                  <span className="font-mono font-black text-emerald-400">{recuperacao}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={recuperacao}
                  onChange={(e) => setRecuperacao(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-rose-400" /> Líbido & Eixo
                  </span>
                  <span className="font-mono font-black text-rose-400">{libido}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={libido}
                  onChange={(e) => setLibido(Number(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VISTA 2: ENCICLOPÉDIA COMPLETA DE SUBSTÂNCIAS (LEITURA & APRENDIZAGEM) */}
      {/* ==================================================================== */}
      {vistaAtiva === 'enciclopedia' && (
        <div className="space-y-6 animate-fade-in">
          {/* BARRA DE PESQUISA, FILTROS & CRIAR SUBSTÂNCIA */}
          <div className="bg-slate-900/60 p-4 md:p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-400" />
                  <span>Biblioteca Científica de Substâncias & Mecanismos</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Consulta as fichas completas, dosagens ideais, mecanismos fisiológicos e adiciona compostos ao teu protocolo.
                </p>
              </div>

              <button
                onClick={() => setModalCustomVisivel(true)}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-500/20 active:scale-95 flex-shrink-0"
              >
                <Plus className="w-4 h-4 fill-slate-950" />
                <span>+ Adicionar Nova Substância</span>
              </button>
            </div>

            {/* Barra de Pesquisa e Filtros */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={pesquisaEnciclopedia}
                  onChange={(e) => setPesquisaEnciclopedia(e.target.value)}
                  placeholder="Pesquisar por substância, mecanismo ou benefício (ex: sono, cortisol, testosterona, shbg, articular...)"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition"
                />
                {pesquisaEnciclopedia && (
                  <button
                    onClick={() => setPesquisaEnciclopedia('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs font-bold"
                  >
                    ×
                  </button>
                )}
              </div>

              <span className="text-xs font-mono text-slate-400 self-center hidden md:inline">
                {catalogoFiltrado.length} de {catalogo.length} substâncias
              </span>
            </div>

            {/* Chips de Categoria */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-800/80">
              {[
                { id: 'todos', label: 'Todas as Categorias' },
                { id: 'hormonal', label: '⚡ Eixo Hormonal & Testosterona' },
                { id: 'sono_recuperacao', label: '🌙 Sono Profundo & Cortisol' },
                { id: 'energia_mitocondrial', label: '🔋 Energia, ATP & Força' },
                { id: 'base_saude', label: '🛡️ Articulações, Minerais & Base' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setFiltroCategoria(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filtroCategoria === cat.id
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* GRELHA COMPLETA DE CARTÕES DA ENCICLOPÉDIA */}
          {catalogoFiltrado.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 space-y-2">
              <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-300">Nenhuma substância encontrada</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Não encontrámos compostos correspondentes a &quot;{pesquisaEnciclopedia}&quot;. Podes adicionar uma nova substância personalizada à biblioteca clicando no botão acima.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalogoFiltrado.map(sub => {
                const jaNoProtocolo = protocolo?.substancias.some(s => s.id === sub.id);

                return (
                  <div
                    key={sub.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-3.5 ${
                      jaNoProtocolo
                        ? 'bg-gradient-to-br from-slate-950 via-slate-900/90 to-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
                        : 'bg-slate-900/60 hover:bg-slate-900/90 border-slate-800 hover:border-slate-700/80 shadow-md'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Topo do Cartão: Nome + Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-black text-white text-base leading-tight">
                            {sub.nome}
                          </h3>
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 capitalize">
                              {sub.horario_ideal === 'manha' ? '🌅 Manhã' : sub.horario_ideal === 'treino' ? '⚡ Peri-Treino' : '🌙 Noite'}
                            </span>
                            {sub.precisa_ciclo ? (
                              <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300">
                                Ciclo: {sub.semanas_on} sem ON / {sub.semanas_off} sem OFF
                              </span>
                            ) : (
                              <span className="text-xs font-mono px-2 py-0.5 rounded bg-teal-500/15 border border-teal-500/30 text-teal-300">
                                Uso Contínuo
                              </span>
                            )}
                          </div>
                        </div>

                        {jaNoProtocolo && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex-shrink-0">
                            ✓ Ativo
                          </span>
                        )}
                      </div>

                      {/* Dose Recomendada */}
                      <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                        <span className="text-xs text-slate-500 font-bold block uppercase tracking-wider">
                          Dose de Referência
                        </span>
                        <span className="text-emerald-400 font-black text-xs">
                          {sub.dose_padrao}
                        </span>
                      </div>

                      {/* Ação Fisiológica / Mecanismo */}
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-300 block">
                          🔬 Mecanismo Farmacocinético:
                        </span>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {sub.mecanismo}
                        </p>
                      </div>

                      {/* Como Tomar & Benefício */}
                      <div className="space-y-1 text-xs pt-1 border-t border-slate-800/80">
                        <div className="text-slate-400 leading-snug">
                          <strong className="text-slate-300">💡 Como Tomar:</strong> {sub.como_tomar}
                        </div>
                        <div className="text-slate-400 leading-snug pt-1">
                          <strong className="text-emerald-400">🎯 Benefício Principal:</strong> {sub.beneficio}
                        </div>
                      </div>
                    </div>

                    {/* Botão de Ação */}
                    <div className="pt-2 border-t border-slate-800/80">
                      <button
                        onClick={() => handleAdicionarAoProtocolo(sub)}
                        disabled={jaNoProtocolo}
                        className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          jaNoProtocolo
                            ? 'bg-slate-800/60 text-slate-500 cursor-not-allowed border border-slate-800'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 active:scale-95 shadow-md shadow-emerald-500/10'
                        }`}
                      >
                        {jaNoProtocolo ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Já Adicionado ao Teu Protocolo</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Adicionar ao Meu Protocolo</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: ADICIONAR SUBSTÂNCIA PERSONALIZADA À BIBLIOTECA */}
      {/* ==================================================================== */}
      {modalCustomVisivel && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Criar Nova Substância Personalizada</h3>
              </div>
              <button onClick={() => setModalCustomVisivel(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Nome da Substância *</label>
                <input
                  type="text"
                  value={customNome}
                  onChange={(e) => setCustomNome(e.target.value)}
                  placeholder="Ex: Fadogia Agrestis, Boro Quelato, NAC, Berberina..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Dose Diária Recomendada *</label>
                  <input
                    type="text"
                    value={customDose}
                    onChange={(e) => setCustomDose(e.target.value)}
                    placeholder="Ex: 400mg, 5g, 2 cápsulas..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Horário Ideal de Toma</label>
                  <select
                    value={customHorario}
                    onChange={(e: any) => setCustomHorario(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="manha">🌅 Manhã / Desjejum</option>
                    <option value="treino">⚡ Peri-Treino</option>
                    <option value="noite">🌙 Noite / Pré-Sono</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Categoria Fisiológica</label>
                <select
                  value={customCategoria}
                  onChange={(e: any) => setCustomCategoria(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="hormonal">⚡ Eixo Hormonal & Testosterona</option>
                  <option value="sono_recuperacao">🌙 Sono Profundo & Cortisol</option>
                  <option value="energia_mitocondrial">🔋 Energia, ATP & Força</option>
                  <option value="base_saude">🛡️ Articulações, Minerais & Base</option>
                </select>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={customPrecisaCiclo}
                    onChange={(e) => setCustomPrecisaCiclo(e.target.checked)}
                    className="rounded text-emerald-500"
                  />
                  <span>Requer Ciclo ON / OFF (Prevenção de Saturação de Recetores)</span>
                </label>

                {customPrecisaCiclo && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900">
                    <div>
                      <span className="text-xs text-slate-400 block">Semanas ON (Ativo)</span>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={customSemanasOn}
                        onChange={(e) => setCustomSemanasOn(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">Semanas OFF (Pausa de recetores)</span>
                      <input
                        type="number"
                        min="1"
                        max="8"
                        value={customSemanasOff}
                        onChange={(e) => setCustomSemanasOff(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Mecanismo / Ação Biológica (Opcional)</label>
                <textarea
                  rows={2}
                  value={customMecanismo}
                  onChange={(e) => setCustomMecanismo(e.target.value)}
                  placeholder="Ex: Reduz o SHBG e aumenta a testosterona livre; estimula a via mTOR..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Como Tomar (Instrução Prática)</label>
                <input
                  type="text"
                  value={customComoTomar}
                  onChange={(e) => setCustomComoTomar(e.target.value)}
                  placeholder="Ex: com refeição rica em lípidos, em jejum, sem lacticínios..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setModalCustomVisivel(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleCriarPersonalizada}
                disabled={salvandoCustom || !customNome.trim() || !customDose.trim()}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs transition disabled:opacity-50"
              >
                {salvandoCustom ? 'A guardar...' : 'Guardar na Biblioteca & Protocolo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
