import {
  PerfilUtilizador,
  ComposicaoCorporal,
  Macros,
  RelatorioProjetoMetas,
  PlanoTreinoCompleto,
  RecomendacaoTreinoIARequisicao,
  RecomendacaoTreinoIAResposta,
  RegistoTreinoSalvar,
  RegistoTreinoHistoricoItem,
  PlanoDietaCompleto,
  AlimentoCatalogo,
  DiagnosticoAjusteDieta,
  RecomendacoesIA,
  CheckInHistoricoItem,
  RegistoDiarioConsumo,
  RequisicaoPrescricaoDietaIA,
  PreferenciasAlimentares,
  ProjetoFisiologicoItem,
  DetalhesProjetoFisiologico,
  StatusCheckinPeriodico,
  ConfiguracaoPeriodoCheckin,
  UtilizadorAutenticado,
  RespostaAuth
} from '../tipos/fitness';

// Rota dinâmica: compatível com Navegador/PWA (/api), APK Nativo (IP da máquina) e URL customizado
export const obterApiBase = (): string => {
  // Se não estiver em ambiente Capacitor nativo, no navegador usa sempre '/api' (proxy seguro)
  const isCapacitorNativo = typeof window !== 'undefined' && (
    window.location.protocol === 'capacitor:' ||
    (window.location.hostname === 'localhost' && window.location.port !== '5173') ||
    Boolean((window as any)?.Capacitor?.isNativePlatform?.()) ||
    Boolean((window.navigator as any)?.userAgent?.includes('wv'))
  );

  if (!isCapacitorNativo) {
    return '/api';
  }

  if (typeof localStorage !== 'undefined') {
    const salva = localStorage.getItem('binov_servidor_url');
    if (salva && salva.trim()) {
      const semBarra = salva.trim().replace(/\/+$/, '');
      return semBarra.endsWith('/api') ? semBarra : `${semBarra}/api`;
    }
  }

  // Endereço do túnel Cloudflare seguro ativo por omissão para o APK
  return 'https://senators-jersey-political-pursuit.trycloudflare.com/api';
};

// Objeto com conversão automática para string, garantindo compatibilidade com todas as chamadas ${API_BASE}/...
const API_BASE: any = {
  toString: () => obterApiBase(),
  valueOf: () => obterApiBase()
};

/**
 * Cliente HTTP autenticado com injeção automática de Token Bearer
 */
const fetchComAuth = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('binov_token') : null;
  const headers = new Headers(init?.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const resposta = await fetch(input, { ...init, headers });
  if (resposta.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('binov_token');
    localStorage.removeItem('binov_utilizador');
    window.dispatchEvent(new CustomEvent('binov_desautenticado'));
  }
  return resposta;
};

export const ServicoApi = {
  // PERFIL E METAS
  async obterPerfil(): Promise<{ perfil: PerfilUtilizador; composicao_corporal: ComposicaoCorporal; macros_prescritos: Macros }> {
    const res = await fetchComAuth(`${API_BASE}/perfil/`);
    if (!res.ok) throw new Error('Falha ao obter perfil');
    return res.json();
  },

  async atualizarPerfil(perfil: Partial<PerfilUtilizador>): Promise<{ mensagem: string; perfil: PerfilUtilizador }> {
    const res = await fetchComAuth(`${API_BASE}/perfil/atualizar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(perfil)
    });
    if (!res.ok) throw new Error('Falha ao atualizar perfil');
    return res.json();
  },

  async obterResumoCarreira(): Promise<{
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
  }> {
    const res = await fetchComAuth(`${API_BASE}/perfil/carreira`);
    if (!res.ok) throw new Error('Falha ao obter resumo de carreira');
    return res.json();
  },

  async exportarDadosAtleta(): Promise<any> {
    const res = await fetchComAuth(`${API_BASE}/perfil/exportar`);
    if (!res.ok) throw new Error('Falha ao exportar dados');
    return res.json();
  },

  async atualizarConta(dados: { nome?: string; senha_atual?: string; nova_senha?: string }): Promise<{ mensagem: string; utilizador: any }> {
    const res = await fetchComAuth(`${API_BASE}/auth/atualizar-conta`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Falha ao atualizar dados da conta');
    }
    const data = await res.json();
    if (data.utilizador && typeof localStorage !== 'undefined') {
      localStorage.setItem('binov_utilizador', JSON.stringify(data.utilizador));
    }
    return data;
  },

  async calcularProjecao(dados: {
    peso_atual: number;
    altura_cm: number;
    idade: number;
    sexo: string;
    bf_atual: number;
    peso_alvo: number;
    bf_alvo: number;
    nivel_experiencia: string;
    nivel_atividade: string;
    estrategia_inicial?: string;
  }): Promise<RelatorioProjetoMetas> {
    const res = await fetchComAuth(`${API_BASE}/perfil/calcular-projecao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    if (!res.ok) throw new Error('Falha ao calcular projeção');
    return res.json();
  },

  async ativarFaseProjeto(dados: {
    id_projeto?: number;
    nome_projeto?: string;
    fase_tipo: string;
    nome_fase: string;
    calorias_diarias: number;
    series_alvo_semana: number;
    cardio_minutos_semana: number;
    foco_treino: string;
    projeto_completo_json?: string;
  }): Promise<any> {
    const res = await fetchComAuth(`${API_BASE}/perfil/ativar-fase-projeto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    if (!res.ok) throw new Error('Falha ao ativar fase do projeto');
    return res.json();
  },

  async obterProjetos(): Promise<ProjetoFisiologicoItem[]> {
    const res = await fetchComAuth(`${API_BASE}/perfil/projetos`);
    if (!res.ok) throw new Error('Falha ao obter lista de projetos');
    return res.json();
  },

  async obterDetalhesProjeto(id: number): Promise<DetalhesProjetoFisiologico> {
    const res = await fetchComAuth(`${API_BASE}/perfil/projetos/${id}/detalhes`);
    if (!res.ok) throw new Error('Falha ao obter detalhes do projeto');
    return res.json();
  },

  async criarProjeto(dados: {
    nome: string;
    descricao?: string;
    tipo_intencao?: string;
    peso_inicial_kg: number;
    peso_alvo_kg: number;
    bf_inicial?: number;
    bf_alvo?: number;
    estrategia_inicial?: string;
    duracao_total_semanas?: number;
    fases: any[];
    relatorio_completo_json?: string;
    ativar_imediatamente?: boolean;
  }): Promise<any> {
    const res = await fetchComAuth(`${API_BASE}/perfil/projetos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    if (!res.ok) throw new Error('Falha ao criar projeto');
    return res.json();
  },

  async ativarProjeto(id: number): Promise<any> {
    const res = await fetchComAuth(`${API_BASE}/perfil/projetos/${id}/ativar`, {
      method: 'PUT'
    });
    if (!res.ok) throw new Error('Falha ao ativar projeto');
    return res.json();
  },

  async atualizarProjeto(id: number, dados: { nome?: string; descricao?: string; status?: string }): Promise<any> {
    const res = await fetchComAuth(`${API_BASE}/perfil/projetos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    if (!res.ok) throw new Error('Falha ao atualizar projeto');
    return res.json();
  },

  async eliminarProjeto(id: number): Promise<any> {
    const res = await fetchComAuth(`${API_BASE}/perfil/projetos/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Falha ao eliminar projeto');
    return res.json();
  },

  // MEMÓRIA E DIAGNÓSTICO CONTÍNUO DA IA
  async obterMemoriaIA(): Promise<{ treino: import('../tipos/fitness').MemoriaTreinoIA; nutricao: import('../tipos/fitness').MemoriaNutricaoIA }> {
    const res = await fetchComAuth(`${API_BASE}/perfil/memoria-ia`);
    if (!res.ok) throw new Error('Falha ao obter memória da IA');
    return res.json();
  },

  async atualizarMemoriaIA(dados: {
    tipo: 'treino' | 'nutricao';
    observacoes_atleta?: string;
    dados?: any;
  }): Promise<{ mensagem: string; memoria: any }> {
    const res = await fetchComAuth(`${API_BASE}/perfil/memoria-ia/atualizar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    if (!res.ok) throw new Error('Falha ao atualizar memória da IA');
    return res.json();
  },

  async reanalisarMemoriaIA(tipo: 'treino' | 'nutricao' | 'todos' = 'todos'): Promise<{ treino: import('../tipos/fitness').MemoriaTreinoIA; nutricao: import('../tipos/fitness').MemoriaNutricaoIA }> {
    const res = await fetchComAuth(`${API_BASE}/perfil/memoria-ia/reanalisar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo })
    });
    if (!res.ok) throw new Error('Falha ao reanalisar memória');
    return res.json();
  },

  // BIOHACKING & OTIMIZAÇÃO HORMONAL
  async obterCatalogoBiohacking(): Promise<import('../tipos/fitness').SubstanciaBiohacking[]> {
    const res = await fetchComAuth(`${API_BASE}/biohacking/catalogo`);
    if (!res.ok) throw new Error('Falha ao obter catálogo de biohacking');
    return res.json();
  },

  async adicionarSubstanciaAoCatalogo(dados: Partial<import('../tipos/fitness').SubstanciaBiohacking>): Promise<{ mensagem: string; substancia: import('../tipos/fitness').SubstanciaBiohacking }> {
    const res = await fetchComAuth(`${API_BASE}/biohacking/catalogo/adicionar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    if (!res.ok) throw new Error('Falha ao adicionar substância à biblioteca');
    return res.json();
  },

  async obterProtocoloBiohackingAtivo(): Promise<import('../tipos/fitness').ProtocoloBiohackingCompleto> {
    const res = await fetchComAuth(`${API_BASE}/biohacking/protocolo-ativo`);
    if (!res.ok) throw new Error('Falha ao obter protocolo ativo');
    return res.json();
  },

  async salvarProtocoloBiohacking(dados: {
    nome?: string;
    objetivo?: string;
    substancias: import('../tipos/fitness').SubstanciaBiohacking[];
    notas_atleta?: string;
  }): Promise<{ mensagem: string; protocolo_id: number }> {
    const res = await fetchComAuth(`${API_BASE}/biohacking/salvar-protocolo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    if (!res.ok) throw new Error('Falha ao guardar protocolo de biohacking');
    return res.json();
  },

  async marcarTomaBiohacking(substancia_id: string, data?: string): Promise<{
    mensagem: string;
    substancia_id: string;
    tomado_hoje: boolean;
    total_tomadas_hoje: number;
  }> {
    const res = await fetchComAuth(`${API_BASE}/biohacking/marcar-toma`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ substancia_id, data })
    });
    if (!res.ok) throw new Error('Falha ao marcar toma diária');
    return res.json();
  },

  async gerarRecomendacaoBiohacking(): Promise<{
    nome: string;
    objetivo: string;
    substancias: import('../tipos/fitness').SubstanciaBiohacking[];
    diretriz_geral: string;
  }> {
    const res = await fetchComAuth(`${API_BASE}/biohacking/gerar-recomendacao`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Falha ao gerar prescrição de biohacking');
    return res.json();
  },

  async registarBiofeedback(dados: {
    vigor_energia: number;
    qualidade_sono: number;
    recuperacao_muscular: number;
    libido_vitalidade: number;
    protocolo_ativo?: boolean;
    notas?: string;
  }): Promise<{ mensagem: string; data: string }> {
    const res = await fetchComAuth(`${API_BASE}/biohacking/registo-biofeedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    if (!res.ok) throw new Error('Falha ao registar biofeedback diário');
    return res.json();
  },

  async obterHistoricoBiofeedback(): Promise<import('../tipos/fitness').RegistoBiofeedbackItem[]> {
    const res = await fetchComAuth(`${API_BASE}/biohacking/historico-biofeedback`);
    if (!res.ok) throw new Error('Falha ao obter histórico de biofeedback');
    return res.json();
  },

  async obterComparativoBiohacking(): Promise<import('../tipos/fitness').ComparativoEvolucaoBiohacking> {
    const res = await fetchComAuth(`${API_BASE}/biohacking/comparativo-evolucao`);
    if (!res.ok) throw new Error('Falha ao obter relatório comparativo de biohacking');
    return res.json();
  },

  // TREINOS
  async obterCatalogoExercicios(): Promise<Array<{ id: string; nome: string; primario: string; secundario?: string; tipo: string }>> {
    const res = await fetchComAuth(`${API_BASE}/treinos/catalogo`);
    if (!res.ok) throw new Error('Falha ao carregar catálogo');
    return res.json();
  },

  async gerarPlanoTreino(dias_semana: number, tempo_sessao_minutos: number, nivel_experiencia: string): Promise<PlanoTreinoCompleto> {
    const res = await fetchComAuth(`${API_BASE}/treinos/gerar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dias_semana, tempo_sessao_minutos, nivel_experiencia })
    });
    if (!res.ok) throw new Error('Falha ao gerar treino');
    return res.json();
  },

  async obterPlanoTreinoAtivo(): Promise<PlanoTreinoCompleto> {
    const res = await fetchComAuth(`${API_BASE}/treinos/plano-ativo`);
    if (!res.ok) throw new Error('Falha ao obter plano ativo');
    return res.json();
  },

  async salvarPlanoTreino(plano: PlanoTreinoCompleto): Promise<{ mensagem: string; id: number }> {
    const res = await fetchComAuth(`${API_BASE}/treinos/salvar-plano`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plano)
    });
    if (!res.ok) throw new Error('Falha ao salvar plano');
    return res.json();
  },

  async calcularProgressaoCarga(dados: {
    carga_anterior_kg: number;
    repeticoes_feitas: number;
    faixa_repeticoes: string;
    rpe_atingido: number;
    tentativas_estagnadas: number;
  }): Promise<{ acao: string; carga_anterior_kg: number; nova_carga_sugerida_kg: number; diferenca_kg: number; mensagem: string; precisa_deload: boolean }> {
    const res = await fetchComAuth(`${API_BASE}/treinos/calcular-progressao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    if (!res.ok) throw new Error('Falha ao calcular progressão');
    return res.json();
  },

  async registarSessaoTreino(dados: RegistoTreinoSalvar): Promise<any> {
    const res = await fetchComAuth(`${API_BASE}/treinos/registar-sessao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    if (!res.ok) throw new Error('Falha ao registar treino');
    return res.json();
  },

  async recomendarTreinoIA(dados: RecomendacaoTreinoIARequisicao): Promise<RecomendacaoTreinoIAResposta> {
    const res = await fetchComAuth(`${API_BASE}/treinos/recomendar-ia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    if (!res.ok) throw new Error('Falha ao gerar treino com IA');
    return res.json();
  },

  async obterHistoricoTreinos(limite = 10): Promise<RegistoTreinoHistoricoItem[]> {
    const res = await fetchComAuth(`${API_BASE}/treinos/historico?limite=${limite}`);
    if (!res.ok) throw new Error('Falha ao obter histórico de treinos');
    return res.json();
  },

  async substituirExercicioPlano(dados: {
    sessao_index: number;
    exercicio_index: number;
    novo_exercicio_id?: string;
    novo_exercicio_nome?: string;
    grupo_muscular?: string;
    series?: number;
    repeticoes_alvo?: string;
    rpe_alvo?: number;
    descanso_segundos?: number;
    carga_sugerida_kg?: number;
    motivo?: string;
  }): Promise<any> {
    const res = await fetchComAuth(`${API_BASE}/treinos/substituir-exercicio-sessao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    if (!res.ok) throw new Error('Falha ao substituir exercício no plano');
    return res.json();
  },

  async sugerirSubstituicaoExercicioIA(dados: {
    exercicio_atual: string;
    grupo_muscular: string;
    queixa_desconforto: string;
    objetivo?: string;
    fase?: string;
    chave_api_ia?: string;
  }): Promise<{
    analise_biomecanica: string;
    recomendacoes: Array<{
      id_exercicio: string;
      nome: string;
      grupo_muscular: string;
      series: number;
      repeticoes_alvo: string;
      rpe_alvo: number;
      descanso_segundos: number;
      carga_sugerida_kg: number;
      justificativa_biomecanica: string;
    }>;
    modo_demonstracao?: boolean;
  }> {
    const res = await fetchComAuth(`${API_BASE}/treinos/sugerir-substituicao-ia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    if (!res.ok) throw new Error('Falha ao obter recomendação da IA');
    return res.json();
  },

  async obterHistoricoFasesTreino(): Promise<PlanoTreinoCompleto[]> {
    const res = await fetchComAuth(`${API_BASE}/treinos/historico-fases`);
    if (!res.ok) throw new Error('Falha ao obter histórico de treinos das fases');
    return res.json();
  },

  async reativarFaseTreino(plano_id: number): Promise<any> {
    const res = await fetchComAuth(`${API_BASE}/treinos/reativar-fase-treino`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plano_id })
    });
    if (!res.ok) throw new Error('Falha ao reativar plano de treino da fase');
    return res.json();
  },

  async obterProgressoExercicios(): Promise<Record<string, any>> {
    const res = await fetchComAuth(`${API_BASE}/treinos/progresso-exercicios`);
    if (!res.ok) throw new Error('Falha ao obter histórico de progresso dos exercícios');
    return res.json();
  },

  // NUTRIÇÃO
  async obterTabelaAlimentos(): Promise<AlimentoCatalogo[]> {
    const res = await fetchComAuth(`${API_BASE}/nutricao/tabela-alimentos`);
    if (!res.ok) throw new Error('Falha ao carregar alimentos');
    return res.json();
  },

  async calcularSubstituicao(origemId: string, gramasOrigem: number, destinoId: string): Promise<any> {
    const res = await fetchComAuth(`${API_BASE}/nutricao/calcular-equivalencia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alimento_origem_id: origemId,
        gramas_origem: gramasOrigem,
        alimento_destino_id: destinoId
      })
    });
    if (!res.ok) throw new Error('Falha ao calcular substituição');
    return res.json();
  },

  async obterPlanoDietaAtivo(): Promise<PlanoDietaCompleto> {
    const res = await fetchComAuth(`${API_BASE}/nutricao/plano-ativo`);
    if (!res.ok) throw new Error('Falha ao obter plano de dieta');
    return res.json();
  },

  async gerarPlanoDieta(calorias: number, peso_kg: number, objetivo: string, num_refeicoes: number): Promise<PlanoDietaCompleto> {
    const res = await fetchComAuth(`${API_BASE}/nutricao/gerar-plano`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ calorias, peso_kg, objetivo, num_refeicoes })
    });
    if (!res.ok) throw new Error('Falha ao gerar plano de dieta');
    return res.json();
  },

  async salvarPlanoDieta(plano: any): Promise<any> {
    const res = await fetchComAuth(`${API_BASE}/nutricao/salvar-plano`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plano)
    });
    if (!res.ok) throw new Error('Falha ao salvar dieta');
    return res.json();
  },

  async prescreverDietaIA(dados: RequisicaoPrescricaoDietaIA): Promise<any> {
    const res = await fetchComAuth(`${API_BASE}/nutricao/prescrever-ia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    if (!res.ok) throw new Error('Falha ao prescrever dieta com IA');
    return res.json();
  },

  async calibrarDietaIA(dados: {
    refeicoes: any[];
    calorias_alvo?: number;
    fase_projeto?: string;
    proteina_alvo_g?: number;
    hidratos_alvo_g?: number;
    gordura_alvo_g?: number;
    alimentos_preferidos?: string;
    alimentos_evitados?: string;
    instrucoes_adicionais?: string;
    chave_api_ia?: string;
  }): Promise<any> {
    const res = await fetchComAuth(`${API_BASE}/nutricao/calibrar-dieta-ia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    if (!res.ok) throw new Error('Falha ao calibrar dieta com IA');
    return res.json();
  },

  async obterPreferenciasNutricao(): Promise<PreferenciasAlimentares> {
    const res = await fetchComAuth(`${API_BASE}/nutricao/preferencias`);
    if (!res.ok) throw new Error('Falha ao obter preferências nutricionais');
    return res.json();
  },

  async salvarPreferenciasNutricao(dados: Partial<PreferenciasAlimentares>): Promise<{ mensagem: string; preferencias: PreferenciasAlimentares }> {
    const res = await fetchComAuth(`${API_BASE}/nutricao/preferencias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    if (!res.ok) throw new Error('Falha ao guardar preferências nutricionais');
    return res.json();
  },

  async obterRegistoDiarioConsumo(data?: string): Promise<RegistoDiarioConsumo> {
    const url = data ? `${API_BASE}/nutricao/diario?data=${data}` : `${API_BASE}/nutricao/diario`;
    const res = await fetchComAuth(url);
    if (!res.ok) throw new Error('Falha ao carregar registo diário');
    return res.json();
  },

  async toggleCheckRefeicao(dados: {
    data?: string;
    item_id: string;
    consumido: boolean;
    calorias: number;
    proteina_g: number;
    hidratos_g: number;
    gordura_g: number;
  }): Promise<any> {
    const res = await fetchComAuth(`${API_BASE}/nutricao/diario/toggle-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    if (!res.ok) throw new Error('Falha ao atualizar check de consumo');
    return res.json();
  },

  async adicionarItemAvulso(dados: {
    data?: string;
    nome: string;
    gramas: number;
    calorias: number;
    proteina_g: number;
    hidratos_g: number;
    gordura_g: number;
    refeicao_nome?: string;
  }): Promise<any> {
    const res = await fetchComAuth(`${API_BASE}/nutricao/diario/adicionar-item`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    if (!res.ok) throw new Error('Falha ao adicionar alimento avulso');
    return res.json();
  },

  async removerItemAvulso(item_index: number, data?: string): Promise<any> {
    const url = data
      ? `${API_BASE}/nutricao/diario/remover-item?item_index=${item_index}&data=${data}`
      : `${API_BASE}/nutricao/diario/remover-item?item_index=${item_index}`;
    const res = await fetchComAuth(url, { method: 'DELETE' });
    if (!res.ok) throw new Error('Falha ao remover item');
    return res.json();
  },

  async substituirAlimentoPlano(dados: {
    refeicao_index: number;
    alimento_index: number;
    novo_alimento_id: string;
    novo_alimento_nome?: string;
    gramas_sugeridas?: number;
    motivo?: string;
  }): Promise<any> {
    const res = await fetchComAuth(`${API_BASE}/nutricao/substituir-alimento-refeicao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Falha ao substituir alimento no plano');
    }
    return res.json();
  },

  async sugerirSubstituicaoAlimentoIA(dados: {
    alimento_atual: string;
    gramas_atuais?: number;
    motivo_queixa?: string;
    refeicao_nome?: string;
    fase_projeto?: string;
    chave_api_ia?: string;
  }): Promise<any> {
    const res = await fetchComAuth(`${API_BASE}/nutricao/sugerir-substituicao-ia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Falha ao sugerir substituição com IA');
    }
    return res.json();
  },

  async obterHistoricoFasesDieta(): Promise<PlanoDietaCompleto[]> {
    const res = await fetchComAuth(`${API_BASE}/nutricao/historico-fases`);
    if (!res.ok) throw new Error('Falha ao obter histórico de dietas das fases');
    return res.json();
  },

  async reativarFaseDieta(plano_id: number): Promise<any> {
    const res = await fetchComAuth(`${API_BASE}/nutricao/reativar-fase-dieta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plano_id })
    });
    if (!res.ok) throw new Error('Falha ao reativar dieta da fase');
    return res.json();
  },

  // CHECK-IN & IA
  async processarCheckIn(dados: {
    peso_medio_atual: number;
    peso_medio_anterior?: number;
    bf_atual?: number;
    calorias_atuais?: number;
    fase_atual?: string;
    nome_fase_projeto?: string;
    nome_projeto?: string;
    cintura_cm?: number;
    cintura_anterior_cm?: number;
    pescoco_cm?: number;
    ombros_cm?: number;
    braco_cm?: number;
    antebraco_cm?: number;
    peitoral_cm?: number;
    coxa_cm?: number;
    panturrilha_cm?: number;
    anca_cm?: number;
    nivel_energia?: number;
    nivel_fadiga: number;
    qualidade_sono: number;
    horas_sono?: number;
    nivel_stress?: number;
    nivel_fome: number;
    estado_digestao?: string;
    adesao_percentual: number;
    agua_litros?: number;
    treino_cumprido?: boolean;
    progresso_treino?: string;
    tentativas_estagnadas_treino?: number;
    cardio_minutos_realizados?: number;
    passos_diarios?: number;
    semanas_em_defice_continuo?: number;
    dores_ou_queixas?: string;
    notas_usuario?: string;
    alimentos_consumidos?: string;
    aplicar_ajustes_automaticamente?: boolean;
    chave_api_ia?: string | null;
  }): Promise<{ id_checkin: number; diagnostico_matematico: DiagnosticoAjusteDieta; recomendacoes_ia: RecomendacoesIA; metricas_adicionais?: any; transicao_fase?: any }> {
    const res = await fetchComAuth(`${API_BASE}/checkin/processar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    if (!res.ok) throw new Error('Falha ao processar check-in');
    return res.json();
  },

  async calcularBfNavy(dados: {
    cintura_cm: number;
    pescoco_cm: number;
    anca_cm?: number;
    altura_cm?: number;
    sexo?: string;
  }): Promise<{
    bf_calculado: number;
    categoria: string;
    metodo: string;
    massa_gorda_kg?: number;
    massa_magra_kg?: number;
  }> {
    const res = await fetchComAuth(`${API_BASE}/checkin/calcular-bf-navy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Falha ao calcular BF pela fórmula da Marinha dos EUA');
    }
    return res.json();
  },

  async aplicarAjustesCheckIn(novasCalorias: number, novosMacros?: any): Promise<any> {
    const res = await fetchComAuth(`${API_BASE}/checkin/aplicar-ajustes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ novas_calorias: novasCalorias, novos_macros: novosMacros })
    });
    if (!res.ok) throw new Error('Falha ao aplicar ajustes');
    return res.json();
  },

  async obterHistoricoCheckIns(): Promise<CheckInHistoricoItem[]> {
    const res = await fetchComAuth(`${API_BASE}/checkin/historico`);
    if (!res.ok) throw new Error('Falha ao obter histórico');
    return res.json();
  },

  async obterStatusCheckinPeriodico(): Promise<StatusCheckinPeriodico> {
    const res = await fetchComAuth(`${API_BASE}/checkin/status-periodico`);
    if (!res.ok) throw new Error('Falha ao obter status periódico de check-in');
    return res.json();
  },

  async configurarPeriodoCheckin(dados: ConfiguracaoPeriodoCheckin): Promise<{ mensagem: string; status: StatusCheckinPeriodico }> {
    const res = await fetchComAuth(`${API_BASE}/checkin/configurar-periodo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    if (!res.ok) throw new Error('Falha ao configurar período de check-in');
    return res.json();
  },

  async salvarChaveIA(chave: string, provedor: string = 'gemini'): Promise<any> {
    const res = await fetchComAuth(`${API_BASE}/ia/salvar-chave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chave_api: chave, provedor })
    });
    if (!res.ok) throw new Error('Falha ao guardar chave');
    return res.json();
  },

  async testarConexaoIA(chave: string, provedor: string = 'gemini'): Promise<any> {
    const res = await fetchComAuth(`${API_BASE}/ia/testar-conexao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chave_api: chave, provedor })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Falha na validação da IA');
    }
    return res.json();
  },

  async obterPromptsIA(): Promise<{
    prompt_coach: string;
    prompt_treinador: string;
    prompt_nutricao: string;
    prompt_dieta: string;
    prompt_calibracao_dieta: string;
    prompt_substituicao_alimento: string;
    prompt_substituicao_exercicio: string;
    padrao_coach: string;
    padrao_treinador: string;
    padrao_nutricao: string;
    padrao_dieta: string;
    padrao_calibracao_dieta: string;
    padrao_substituicao_alimento: string;
    padrao_substituicao_exercicio: string;
    customizado_coach: boolean;
    customizado_treinador: boolean;
    customizado_nutricao: boolean;
    customizado_dieta: boolean;
    customizado_calibracao_dieta: boolean;
    customizado_substituicao_alimento: boolean;
    customizado_substituicao_exercicio: boolean;
  }> {
    const res = await fetchComAuth(`${API_BASE}/ia/prompts`);
    if (!res.ok) throw new Error('Falha ao obter diretrizes da IA');
    return res.json();
  },

  async salvarPromptsIA(dados: {
    prompt_coach?: string;
    prompt_treinador?: string;
    prompt_nutricao?: string;
    prompt_dieta?: string;
    prompt_calibracao_dieta?: string;
    prompt_substituicao_alimento?: string;
    prompt_substituicao_exercicio?: string;
  }): Promise<{
    mensagem: string;
    customizado_coach: boolean;
    customizado_treinador: boolean;
    customizado_dieta: boolean;
    customizado_calibracao_dieta: boolean;
    customizado_substituicao_alimento: boolean;
    customizado_substituicao_exercicio: boolean;
  }> {
    const res = await fetchComAuth(`${API_BASE}/ia/salvar-prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    if (!res.ok) throw new Error('Falha ao guardar diretrizes da IA');
    return res.json();
  },

  async restaurarPromptsPadraoIA(): Promise<{
    mensagem: string;
    prompt_coach: string;
    prompt_treinador: string;
    prompt_nutricao: string;
    prompt_dieta: string;
    prompt_calibracao_dieta: string;
    prompt_substituicao_alimento: string;
    prompt_substituicao_exercicio: string;
    customizado_coach: boolean;
    customizado_treinador: boolean;
    customizado_nutricao: boolean;
    customizado_dieta: boolean;
    customizado_calibracao_dieta: boolean;
    customizado_substituicao_alimento: boolean;
    customizado_substituicao_exercicio: boolean;
  }> {
    const res = await fetchComAuth(`${API_BASE}/ia/restaurar-prompts-padrao`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Falha ao restaurar diretrizes padrão');
    return res.json();
  },
  // ===========================================================================
  // AUTENTICAÇÃO E GESTÃO DE UTILIZADORES
  // ===========================================================================
  async login(email: string, senha: string): Promise<RespostaAuth> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Falha ao iniciar sessão');
    }
    const cType = res.headers.get('content-type') || '';
    if (!cType.includes('application/json')) {
      throw new Error('O servidor respondeu com uma página web em vez de JSON. Verifica o endereço do servidor.');
    }
    const data: RespostaAuth = await res.json();
    if (data.token) {
      localStorage.setItem('binov_token', data.token);
      localStorage.setItem('binov_utilizador', JSON.stringify(data.utilizador));
    }
    return data;
  },

  async registar(nome: string, email: string, senha: string): Promise<RespostaAuth> {
    const res = await fetch(`${API_BASE}/auth/registar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Falha ao criar conta');
    }
    const data: RespostaAuth = await res.json();
    if (data.token) {
      localStorage.setItem('binov_token', data.token);
      localStorage.setItem('binov_utilizador', JSON.stringify(data.utilizador));
    }
    return data;
  },

  async obterMeuUsuario(): Promise<UtilizadorAutenticado> {
    const res = await fetchComAuth(`${API_BASE}/auth/me`);
    if (!res.ok) throw new Error('Sessão inválida');
    return res.json();
  },

  async listarUtilizadores(): Promise<{ total: number; utilizadores: UtilizadorAutenticado[] }> {
    const res = await fetchComAuth(`${API_BASE}/auth/utilizadores`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Falha ao obter lista de utilizadores');
    }
    return res.json();
  },

  async alterarPapelUtilizador(id: number, papel: string): Promise<{ mensagem: string }> {
    const res = await fetchComAuth(`${API_BASE}/auth/utilizadores/${id}/papel`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ papel })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Falha ao alterar papel');
    }
    return res.json();
  },

  async alternarEstadoUtilizador(id: number): Promise<{ mensagem: string; ativo: boolean }> {
    const res = await fetchComAuth(`${API_BASE}/auth/utilizadores/${id}/estado`, {
      method: 'PUT'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Falha ao alterar estado do utilizador');
    }
    return res.json();
  },

  async eliminarUtilizador(id: number): Promise<{ mensagem: string }> {
    const res = await fetchComAuth(`${API_BASE}/auth/utilizadores/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Falha ao eliminar utilizador');
    }
    return res.json();
  },

  terminarSessao(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('binov_token');
      localStorage.removeItem('binov_utilizador');
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('binov_desautenticado'));
    }
  },

  obterUrlServidorAtual(): string {
    return obterApiBase();
  },

  definirUrlServidor(url: string): void {
    if (typeof localStorage !== 'undefined') {
      if (!url || !url.trim()) {
        localStorage.removeItem('binov_servidor_url');
      } else {
        localStorage.setItem('binov_servidor_url', url.trim());
      }
    }
  },

  async testarConexaoServidor(urlTestar?: string): Promise<{ ok: boolean; mensagem: string }> {
    try {
      const rawBase = urlTestar && urlTestar.trim() ? urlTestar.trim() : obterApiBase();
      const semBarra = rawBase.replace(/\/+$/, '');
      const base = semBarra.endsWith('/api') ? semBarra : `${semBarra}/api`;
      const res = await fetch(`${base}/saude`, { method: 'GET' });
      const cType = res.headers.get('content-type') || '';
      if (!cType.includes('application/json')) {
        return { ok: false, mensagem: `O servidor respondeu com formato inválido (${res.status}). Verifica se o URL está completo (terminado em .trycloudflare.com).` };
      }
      if (res.ok) {
        const data = await res.json();
        return { ok: true, mensagem: data.mensagem || 'Ligação estabelecida com sucesso!' };
      }
      return { ok: false, mensagem: `Servidor respondeu com código ${res.status}` };
    } catch (e: any) {
      return { ok: false, mensagem: e.message || 'Não foi possível alcançar o servidor. Verifica se o URL está bem escrito.' };
    }
  }
};
