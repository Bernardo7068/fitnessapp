"""
Esquemas Pydantic para validação de dados de entrada e saída da API.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class EsquemaPerfilEntrada(BaseModel):
    nome: str = "Atleta"
    idade: int = Field(25, ge=14, le=90)
    sexo: str = "masculino"
    altura_cm: float = Field(178.0, ge=120.0, le=240.0)
    peso_atual: float = Field(78.0, ge=35.0, le=250.0)
    peso_alvo: float = Field(85.0, ge=35.0, le=250.0)
    bf_atual: float = Field(15.0, ge=4.0, le=60.0)
    bf_alvo: float = Field(10.0, ge=4.0, le=40.0)
    nivel_experiencia: str = "intermediario"  # "iniciante", "intermediario", "avancado"
    nivel_atividade: str = "moderado"
    dias_treino_semana: int = Field(4, ge=2, le=6)
    tempo_sessao_minutos: int = Field(60, ge=30, le=120)
    fase_atual: Optional[str] = "bulk"
    calorias_atuais: Optional[float] = 2600.0
    projeto_ativo_json: Optional[str] = None
    estrategia_inicial: Optional[str] = "recomposicao"
    chave_api_ia: Optional[str] = None


class EsquemaProjecaoRequisicao(BaseModel):
    peso_atual: float
    altura_cm: float
    idade: int
    sexo: str
    bf_atual: float
    peso_alvo: float
    bf_alvo: float = 10.0
    nivel_experiencia: str = "intermediario"
    nivel_atividade: str = "moderado"
    estrategia_inicial: str = "recomposicao"


class EsquemaSubstituicaoRequisicao(BaseModel):
    alimento_origem_id: str
    gramas_origem: float
    alimento_destino_id: str


class EsquemaGerarTreinoRequisicao(BaseModel):
    dias_semana: int = 4
    tempo_sessao_minutos: int = 60
    nivel_experiencia: str = "intermediario"
    foco: Optional[str] = None


class EsquemaProgressaoCargaRequisicao(BaseModel):
    carga_anterior_kg: float
    repeticoes_feitas: int
    faixa_repeticoes: str = "8-12"
    rpe_atingido: float = 8.5
    tentativas_estagnadas: int = 0


class EsquemaCheckInEntrada(BaseModel):
    peso_medio_atual: float
    peso_medio_anterior: Optional[float] = None
    calorias_atuais: Optional[float] = None
    fase_atual: Optional[str] = None
    nome_fase_projeto: Optional[str] = None
    nome_projeto: Optional[str] = None

    # Composição Corporal & BF
    bf_atual: Optional[float] = None

    # Medidas corporais completas (perímetros em cm)
    cintura_cm: Optional[float] = None
    cintura_anterior_cm: Optional[float] = None
    pescoco_cm: Optional[float] = None       # Pescoço (fórmula US Navy)
    peitoral_cm: Optional[float] = None      # Peito
    ombros_cm: Optional[float] = None        # Ombros
    braco_cm: Optional[float] = None         # Braço
    antebraco_cm: Optional[float] = None     # Antebraço
    coxa_cm: Optional[float] = None          # Pernas / Coxa
    panturrilha_cm: Optional[float] = None   # Panturrilha / Gémeos
    anca_cm: Optional[float] = None          # Anca

    # Estado do indivíduo & Biofeedback
    nivel_energia: Optional[int] = Field(7, ge=1, le=10)
    nivel_fadiga: int = Field(5, ge=1, le=10)
    qualidade_sono: int = Field(7, ge=1, le=10)
    horas_sono: Optional[float] = 7.0
    nivel_stress: Optional[int] = Field(5, ge=1, le=10)
    nivel_fome: int = Field(5, ge=1, le=10)
    estado_digestao: Optional[str] = "normal"  # "excelente", "normal", "inchaco", "dificil"
    dores_ou_queixas: Optional[str] = ""

    # Adesão e hábitos diários
    adesao_percentual: float = Field(90.0, ge=0.0, le=100.0)
    agua_litros: Optional[float] = 2.5
    treino_cumprido: Optional[bool] = True
    progresso_treino: str = "aumentou"  # "aumentou", "manteve", "estagnado", "caiu"
    tentativas_estagnadas_treino: int = 0
    cardio_minutos_realizados: Optional[int] = 0
    passos_diarios: Optional[int] = 8000
    semanas_em_defice_continuo: int = 0
    alimentos_consumidos: Optional[str] = ""
    notas_usuario: Optional[str] = ""
    aplicar_ajustes_automaticamente: Optional[bool] = False
    chave_api_ia: Optional[str] = None


class EsquemaConfiguracaoIA(BaseModel):
    chave_api: str
    provedor: str = "gemini"


class EsquemaSalvarPromptsIA(BaseModel):
    prompt_coach: Optional[str] = None
    prompt_treinador: Optional[str] = None
    prompt_nutricao: Optional[str] = None
    prompt_dieta: Optional[str] = None
    prompt_calibracao_dieta: Optional[str] = None
    prompt_substituicao_alimento: Optional[str] = None
    prompt_substituicao_exercicio: Optional[str] = None


class EsquemaRecomendacaoTreinoIA(BaseModel):
    lesoes_atuais_ou_passadas: Optional[str] = ""
    desproporcoes_pontos_fracos: Optional[str] = ""
    problemas_limitacoes: Optional[str] = ""
    objetivo_especifico: str = "hipertrofia"  # "hipertrofia", "forca", "resistencia", "recuperacao_lesao", "powerbuilding"
    objetivos_detalhados: Optional[str] = ""   # ex: "Hipertrofia máxima mas força pesada no supino, agachamento e terra"
    atividades_secundarias: Optional[str] = ""  # ex: "Boxe 1x por semana, Corrida 2x por semana"
    cadencia_descanso: Optional[str] = "dias_fixos"  # "dias_fixos", "2_treino_1_descanso", "3_treino_1_descanso", "dias_alternados"
    plano_atual_ou_anterior: Optional[str] = ""  # Plano que o utilizador já faz/fazia para auditoria e reestruturação
    dias_semana: int = Field(4, ge=2, le=6)
    duracao_minutos: int = Field(60, ge=30, le=120)
    tipo_divisao_preferida: Optional[str] = "personalizada"
    fase_projeto: Optional[str] = "cut"
    nome_fase_projeto: Optional[str] = ""
    calorias_diarias: Optional[float] = 2200.0
    series_alvo_semana: Optional[int] = 14
    cardio_minutos_semana: Optional[int] = 0
    foco_treino_projeto: Optional[str] = ""
    chave_api_ia: Optional[str] = None


class EsquemaCriarProjeto(BaseModel):
    nome: str
    descricao: Optional[str] = ""
    tipo_intencao: Optional[str] = "Transformação Corporal"
    peso_inicial_kg: float
    peso_alvo_kg: float
    bf_inicial: Optional[float] = 15.0
    bf_alvo: Optional[float] = 10.0
    estrategia_inicial: Optional[str] = "recomposicao"
    duracao_total_semanas: Optional[int] = 12
    fases: List[Dict[str, Any]] = []
    relatorio_completo_json: Optional[str] = None
    ativar_imediatamente: bool = True


class EsquemaAtualizarProjeto(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    status: Optional[str] = None  # 'ativo', 'concluido', 'arquivado'


class EsquemaAtivarFaseProjeto(BaseModel):
    id_projeto: Optional[int] = None
    nome_projeto: Optional[str] = None
    fase_tipo: str
    nome_fase: str
    calorias_diarias: float
    series_alvo_semana: int = 14
    cardio_minutos_semana: int = 60
    foco_treino: str = ""
    projeto_completo_json: Optional[str] = None


class EsquemaRegistarTreino(BaseModel):
    sessao_nome: str = "Treino"
    duracao_minutos: int = 60
    rpe_geral: float = 8.0
    exercicios: List[Dict[str, Any]] = []
    notas: Optional[str] = ""


class EsquemaPrescricaoDietaIA(BaseModel):
    calorias_diarias: Optional[float] = None
    fase_projeto: Optional[str] = "cut"
    nome_fase_projeto: Optional[str] = ""
    alimentos_preferidos: Optional[str] = ""
    alimentos_evitados: Optional[str] = ""
    numero_refeicoes: int = Field(4, ge=3, le=6)
    horario_treino: Optional[str] = "tarde"
    habitos_apetite: Optional[str] = ""
    alimentos_dificeis: Optional[str] = ""
    chave_api_ia: Optional[str] = None


class EsquemaToggleCheckRefeicao(BaseModel):
    data: Optional[str] = None
    item_id: str
    consumido: bool
    calorias: float
    proteina_g: float
    hidratos_g: float
    gordura_g: float


class EsquemaAdicionarItemAvulso(BaseModel):
    data: Optional[str] = None
    nome: str
    gramas: float
    calorias: float
    proteina_g: float
    hidratos_g: float
    gordura_g: float
    refeicao_nome: Optional[str] = "Refeição Avulsa"


class EsquemaSubstituirAlimentoPlano(BaseModel):
    refeicao_index: int
    alimento_index: int
    novo_alimento_id: str
    novo_alimento_nome: Optional[str] = None
    gramas_sugeridas: Optional[float] = None
    motivo: Optional[str] = "Preferência / Ajuste"


class EsquemaSugerirSubstituicaoAlimentoIA(BaseModel):
    alimento_atual: str
    gramas_atuais: float = 100.0
    refeicao_nome: Optional[str] = "Refeição"
    motivo_queixa: Optional[str] = "Digestão pesada / desconforto"
    chave_api_ia: Optional[str] = None


class EsquemaSubstituirExercicioPlano(BaseModel):
    sessao_index: int
    exercicio_index: int
    novo_exercicio_id: Optional[str] = None
    novo_exercicio_nome: Optional[str] = None
    grupo_muscular: Optional[str] = None
    series: Optional[int] = None
    repeticoes_alvo: Optional[str] = None
    rpe_alvo: Optional[float] = None
    descanso_segundos: Optional[int] = None
    carga_sugerida_kg: Optional[float] = None
    motivo: Optional[str] = "Dor articular / Desconforto"
