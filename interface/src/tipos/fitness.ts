export interface PerfilUtilizador {
  id?: number;
  nome: string;
  idade: number;
  sexo: string;
  altura_cm: number;
  peso_atual: number;
  peso_alvo: number;
  bf_atual: number;
  bf_alvo: number;
  nivel_experiencia: string;
  nivel_atividade: string;
  dias_treino_semana: number;
  tempo_sessao_minutos: number;
  fase_atual: string;
  calorias_atuais: number;
  projeto_ativo_json?: string | null;
  chave_api_ia?: string | null;
}

export interface ComposicaoCorporal {
  peso_kg: number;
  percentual_gordura: number;
  massa_magra_kg: number;
  massa_gorda_kg: number;
  taxa_metabolica_basal: number;
  gasto_energetico_total: number;
  calorias_manutencao: number;
}

export interface Macros {
  calorias: number;
  proteina_g: number;
  gordura_g: number;
  hidratos_g: number;
  fibras_g: number;
}

export interface FaseProjeto {
  numero_fase: number;
  tipo: string;
  nome_exibicao: string;
  duracao_semanas: number;
  peso_inicio_kg: number;
  peso_fim_estimado_kg: number;
  bf_fim_estimado: number;
  calorias_diarias: number;
  macros: {
    proteina_g: number;
    gordura_g: number;
    hidratos_g: number;
    fibras_g: number;
  };
  cardio_minutos_semana: number;
  series_trabalho_semana: number;
  descricao_estrategia: string;
  foco_treino?: string;
}

export interface RelatorioProjetoMetas {
  peso_atual_kg: number;
  bf_atual_percentual: number;
  massa_magra_atual_kg: number;
  massa_gorda_atual_kg: number;
  peso_alvo_kg: number;
  bf_alvo_percentual: number;
  massa_magra_alvo_kg: number;
  massa_gorda_alvo_kg: number;
  massa_magra_a_ganhar_kg: number;
  gordura_a_perder_kg: number;
  semanas_totais_estimadas: number;
  meses_estimados: number;
  nivel_experiencia: string;
  estrategia_inicial?: string;
  tipo_intencao?: string;
  diagnostico_fisiologico?: string;
  bloqueio_bulk_por_bf?: boolean;
  fases: FaseProjeto[];
}

export interface ProjetoFisiologicoItem {
  id: number;
  nome: string;
  descricao?: string;
  tipo_intencao: string;
  ativo: boolean;
  status: 'ativo' | 'concluido' | 'arquivado';
  peso_inicial_kg: number;
  peso_alvo_kg: number;
  bf_inicial: number;
  bf_alvo: number;
  estrategia_inicial: string;
  duracao_total_semanas: number;
  fase_atual_tipo: string;
  fase_atual_nome: string;
  data_inicio_fase?: string;
  data_inicio_projeto?: string;
  fases: FaseProjeto[];
  criado_em?: string;
  atualizado_em?: string;
  total_checkins?: number;
  ultimo_checkin_peso?: number | null;
  ultimo_checkin_data?: string | null;
  treino_vinculado_nome?: string | null;
  treino_vinculado_divisao?: string | null;
  dieta_vinculada_kcal?: number | null;
  semanas_decorridas?: number;
  dias_decorridos?: number;
}

export interface DetalhesProjetoFisiologico {
  projeto: ProjetoFisiologicoItem;
  relatorio?: RelatorioProjetoMetas;
  planos_treino: any[];
  planos_dieta: any[];
  checkins: any[];
}

export interface ExercicioTreino {
  id_exercicio: string;
  nome: string;
  grupo_muscular_primario: string;
  grupo_muscular_secundario?: string | null;
  series: number;
  repeticoes_alvo: string;
  descanso_segundos: number;
  rpe_alvo: number;
  carga_sugerida_kg?: number;
  notas_execucao?: string;
}

export interface SessaoTreino {
  dia_nome: string;
  foco: string;
  tempo_estimado_minutos: number;
  exercicios: ExercicioTreino[];
}

export interface AlteracaoTreinoItem {
  id: string;
  data_hora: string;
  tipo: string;
  sessao: string;
  exercicio_origem: string;
  exercicio_substituto: string;
  grupo_muscular: string;
  motivo: string;
}

export interface PlanoTreinoCompleto {
  id?: number;
  nome_divisao: string;
  fase_projeto?: string;
  nome_fase?: string;
  ativo?: boolean;
  dias_por_semana: number;
  tempo_sessao_minutos: number;
  foco_principal: string;
  volume_total_series_semana: number;
  cadencia_rotativa?: string;
  analise_biomecanica_ia?: string;
  ajustes_para_lesoes?: string;
  estrategia_pontos_fracos?: string;
  sincronizacao_com_projeto?: string;
  horario_e_compatibilidade_atividades?: string;
  analise_plano_anterior_vs_reestruturado?: string;
  modo_demonstracao?: boolean;
  aviso_conexao?: string;
  sessoes: SessaoTreino[];
  historico_alteracoes?: AlteracaoTreinoItem[];
  atualizado_em?: string;
  criado_em?: string;
}

export interface RecomendacaoTreinoIARequisicao {
  lesoes_atuais_ou_passadas?: string;
  desproporcoes_pontos_fracos?: string;
  problemas_limitacoes?: string;
  objetivo_especifico: string;
  objetivos_detalhados?: string;
  atividades_secundarias?: string;
  cadencia_descanso?: string;
  plano_atual_ou_anterior?: string;
  dias_semana: number;
  duracao_minutos: number;
  tipo_divisao_preferida?: string;
  fase_projeto?: string;
  nome_fase_projeto?: string;
  calorias_diarias?: number;
  series_alvo_semana?: number;
  cardio_minutos_semana?: number;
  foco_treino_projeto?: string;
  chave_api_ia?: string;
}

export interface RecomendacaoTreinoIAResposta extends PlanoTreinoCompleto {}

export interface SerieExecutada {
  numero_serie: number;
  carga_kg: number;
  repeticoes: number;
  concluida: boolean;
  rpe?: number;
}

export interface ExercicioExecutado {
  id_exercicio: string;
  nome: string;
  grupo_muscular_primario: string;
  descanso_segundos: number;
  series: SerieExecutada[];
  notas?: string;
}

export interface RegistoTreinoSalvar {
  sessao_nome: string;
  duracao_minutos: number;
  rpe_geral: number;
  exercicios: ExercicioExecutado[];
  notas?: string;
}

export interface RegistoTreinoHistoricoItem {
  id: number;
  data: string;
  sessao_nome: string;
  duracao_minutos: number;
  rpe_geral: number;
  exercicios: ExercicioExecutado[];
  notas?: string;
}

export interface ProgressoSerieItem {
  numero_serie: number;
  carga_kg: number;
  repeticoes: number;
  rpe?: number;
}

export interface ProgressoSessaoEntrada {
  registo_id: number;
  data: string;
  data_iso: string;
  sessao_nome: string;
  carga_maxima_kg: number;
  volume_total_kg: number;
  melhor_serie: string;
  series: ProgressoSerieItem[];
}

export interface ProgressoExercicioItem {
  nome: string;
  id_exercicio: string;
  grupo_muscular?: string;
  recorde_pessoal?: string;
  carga_maxima_historica?: number;
  total_sessoes?: number;
  evolucao_carga_kg?: number;
  ultimo_treino?: ProgressoSessaoEntrada;
  timeline: ProgressoSessaoEntrada[];
}

export type MapaProgressoExercicios = Record<string, ProgressoExercicioItem>;

export interface AlimentoRefeicao {
  id_alimento: string;
  nome: string;
  gramas: number;
  calorias: number;
  proteina_g: number;
  hidratos_g: number;
  gordura_g: number;
  consumido?: boolean;
}

export interface RefeicaoItem {
  id?: string;
  nome: string;
  horario_sugerido?: string;
  calorias: number;
  proteina_g: number;
  hidratos_g: number;
  gordura_g: number;
  alimentos?: AlimentoRefeicao[];
}

export interface ItemAvulsoConsumo {
  id: string;
  nome: string;
  gramas: number;
  calorias: number;
  proteina_g: number;
  hidratos_g: number;
  gordura_g: number;
  refeicao_nome?: string;
  adicionado_em?: string;
}

export interface RegistoDiarioConsumo {
  id?: number;
  data: string;
  calorias_alvo: number;
  proteina_alvo_g: number;
  hidratos_alvo_g: number;
  gordura_alvo_g: number;
  calorias_consumidas: number;
  proteina_consumida_g: number;
  hidratos_consumidos_g: number;
  gordura_consumida_g: number;
  checks_refeicoes: Record<string, boolean>;
  itens_avulsos: ItemAvulsoConsumo[];
  notas_dia?: string;
}

export interface RequisicaoPrescricaoDietaIA {
  calorias_diarias?: number;
  fase_projeto?: string;
  nome_fase_projeto?: string;
  alimentos_preferidos?: string;
  alimentos_evitados?: string;
  numero_refeicoes: number;
  horario_treino?: string;
  habitos_apetite?: string;
  alimentos_dificeis?: string;
  chave_api_ia?: string;
}

export interface PreferenciasAlimentares {
  alimentos_preferidos: string;
  alimentos_evitados: string;
  numero_refeicoes: number;
  horario_treino: string;
  habitos_apetite: string;
  alimentos_dificeis: string;
}

export interface AlteracaoAlimentoItem {
  id: string;
  data_hora: string;
  tipo: string;
  refeicao: string;
  alimento_origem: string;
  alimento_substituto: string;
  diferenca_kcal: number;
  motivo: string;
}

export interface RecomendacaoSubstituicaoAlimento {
  id_alimento: string;
  nome: string;
  gramas_sugeridas: number;
  calorias: number;
  proteina_g: number;
  hidratos_g: number;
  gordura_g: number;
  justificativa_nutricional: string;
}

export interface RespostaSubstituicaoAlimentoIA {
  analise_nutricional: string;
  alimento_origem: string;
  gramas_origem: number;
  macro_dominante: string;
  recomendacoes: RecomendacaoSubstituicaoAlimento[];
  modo_demonstracao?: boolean;
}

export interface PlanoDietaCompleto {
  id?: number;
  nome: string;
  fase_projeto?: string;
  nome_fase?: string;
  ativo?: boolean;
  calorias: number;
  macros: Macros;
  refeicoes: RefeicaoItem[];
  historico_alteracoes?: AlteracaoAlimentoItem[];
  atualizado_em?: string;
  criado_em?: string;
  detalhes_ia?: {
    estrategia_fase_projeto?: string;
    ajuste_horario_treino?: string;
    ajuste_apetite_e_saciedade?: string;
    modo_demonstracao?: boolean;
    aviso_conexao?: string;
  };
}

export interface AlimentoCatalogo {
  id: string;
  nome: string;
  kcal: number;
  proteina: number;
  hidratos: number;
  gordura: number;
}

export interface DiagnosticoAjusteDieta {
  peso_medio_anterior: number;
  peso_medio_atual: number;
  variacao_peso_kg: number;
  taxa_variacao_percentual: number;
  fase_atual: string;
  adesao_percentual: number;
  calorias_atuais: number;
  novas_calorias: number;
  diferenca_calorias: number;
  novos_macros: Macros;
  ajuste_cardio_minutos: number;
  motivo_matematico: string;
  alerta_estagnacao: boolean;
  necessita_diet_break: boolean;
  alerta_ganho_gordura_sem_progresso?: boolean;
  ajuste_treino_recomendado?: string;
  aviso_proativo_utilizador?: string;
}

export interface VereditoProjetoIA {
  status: 'no_caminho_certo' | 'ajuste_necessario' | 'desvio_detectado';
  titulo: string;
  resumo_analise: string;
  ritmo_progresso?: string;
}

export interface AjusteDietaIA {
  necessita_ajuste: boolean;
  acao: string;
  calorias_recomendadas: number;
  diferenca_kcal: number;
  novos_macros?: {
    proteina_g: number;
    gordura_g: number;
    hidratos_g: number;
    fibras_g?: number;
  };
  motivo_dieta?: string;
  orientacoes_nutricionais?: string;
}

export interface AjusteTreinoIA {
  necessita_ajuste: boolean;
  acao: string;
  ajuste_volume?: string;
  ajuste_cardio_minutos_semana?: number;
  orientacoes_biomecanicas?: string;
}

export interface RecomendacoesIA {
  veredito_projeto?: VereditoProjetoIA;
  ajustes_dieta?: AjusteDietaIA;
  ajustes_treino?: AjusteTreinoIA;
  suplementacao_e_recuperacao?: string;
  mensagem_coach?: string;
  analise_micronutrientes_e_vitaminas?: string;
  recomendacoes_cardio?: string;
  sugestoes_exercicios?: string;
  dicas_nutricionais_qualitativas?: string;
  mensagem_motivacional_personalizada?: string;
  provedor_usado?: string;
  modo_demonstracao?: boolean;
  aviso_configuracao?: string;
  aviso_conexao?: string;
}

export interface MetricasAdicionaisCheckin {
  cintura_cm?: number;
  cintura_anterior_cm?: number;
  braco_cm?: number;
  peitoral_cm?: number;
  coxa_cm?: number;
  anca_cm?: number;
  pescoco_cm?: number;
  ombros_cm?: number;
  antebraco_cm?: number;
  panturrilha_cm?: number;
  bf_atual?: number;
  peso_anterior_automatico?: number;
  nivel_energia?: number;
  horas_sono?: number;
  nivel_stress?: number;
  estado_digestao?: string;
  agua_litros?: number;
  treino_cumprido?: boolean;
  cardio_minutos_realizados?: number;
  passos_diarios?: number;
  nome_fase_projeto?: string;
  nome_projeto?: string;
}

export interface CheckInHistoricoItem {
  id: number;
  data: string;
  peso_medio: number;
  variacao_peso_kg: number;
  fase_atual: string;
  adesao_percentual: number;
  nivel_fadiga: number;
  qualidade_sono: number;
  nivel_fome: number;
  dores_ou_queixas?: string;
  diagnostico_matematico: DiagnosticoAjusteDieta;
  recomendacoes_ia: RecomendacoesIA;
  metricas_adicionais?: MetricasAdicionaisCheckin;
}

export interface StatusCheckinPeriodico {
  ultimo_checkin_data: string | null;
  dias_decorridos: number;
  frequencia_dias: number;
  dia_semana_preferido: string;
  dias_restantes: number;
  proximo_checkin_data: string | null;
  checkin_pendente: boolean;
  nivel_urgencia: 'em_dia' | 'hoje' | 'atrasado';
  mensagem_aviso: string;
  notificacao_ativa: boolean;
}

export interface ConfiguracaoPeriodoCheckin {
  frequencia_dias: number;
  dia_semana_preferido?: string;
  notificacao_ativa?: boolean;
}

export interface MemoriaTreinoIA {
  capacidade_forca: string;
  tolerancia_volume_e_pump: string;
  perfil_recuperacao: string;
  pontos_fortes_e_foco: string;
  diretriz_algoritmo: string;
  resumo_transparente: string;
  historico_feedbacks: string[];
  observacoes_atleta?: string;
  atualizado_em?: string;
}

export interface MemoriaNutricaoIA {
  padrao_apetite: string;
  resposta_digestiva: string;
  alimentos_blindados: string;
  capacidade_metabolica: string;
  diretriz_algoritmo: string;
  resumo_transparente: string;
  historico_feedbacks: string[];
  observacoes_atleta?: string;
  atualizado_em?: string;
}

export interface MemoriaIACheck {
  treino: MemoriaTreinoIA;
  nutricao: MemoriaNutricaoIA;
}

export interface SubstanciaBiohacking {
  id: string;
  nome: string;
  categoria: 'hormonal' | 'sono_recuperacao' | 'energia_mitocondrial' | 'base_saude';
  dose_padrao: string;
  dose_sugerida?: string;
  horario_ideal: 'manha' | 'treino' | 'noite';
  precisa_ciclo: boolean;
  semanas_on?: number;
  semanas_off?: number;
  semanas_concluidas?: number;
  status_ciclo?: 'on' | 'off' | 'continuo';
  mecanismo: string;
  como_tomar: string;
  beneficio: string;
  motivo_prescricao?: string;
  tomado_hoje?: boolean;
}

export interface ProtocoloBiohackingCompleto {
  id: number;
  nome: string;
  objetivo: string;
  ativo: boolean;
  data_inicio: string;
  substancias: SubstanciaBiohacking[];
  tomas_hoje: string[];
  notas_atleta?: string;
  atualizado_em?: string;
}

export interface RegistoBiofeedbackItem {
  data: string;
  vigor_energia: number;
  qualidade_sono: number;
  recuperacao_muscular: number;
  libido_vitalidade: number;
  protocolo_ativo: boolean;
  notas?: string;
}

export interface ComparativoEvolucaoBiohacking {
  periodo_com_protocolo: {
    dias_avaliados: number;
    qualidade_sono: number;
    nivel_fadiga: number;
    progressao_carga_semanal: string;
    recuperacao_muscular: string;
    libido_vigor: string;
  };
  periodo_sem_protocolo: {
    dias_avaliados: number;
    qualidade_sono: number;
    nivel_fadiga: number;
    progressao_carga_semanal: string;
    recuperacao_muscular: string;
    libido_vigor: string;
  };
  impacto_percentual: {
    sono: string;
    fadiga: string;
    forca_progressao: string;
  };
  conclusao_cientifica: string;
}
