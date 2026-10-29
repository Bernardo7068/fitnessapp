"""
Modelos ORM de Base de Dados para Perfil, Treinos, Nutrição e Check-ins.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, Text, DateTime, Boolean
from .conexao import Base


class PerfilUtilizador(Base):
    __tablename__ = "perfis_utilizador"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), default="Atleta")
    idade = Column(Integer, default=25)
    sexo = Column(String(20), default="masculino")
    altura_cm = Column(Float, default=178.0)
    peso_atual = Column(Float, default=78.0)
    peso_alvo = Column(Float, default=85.0)
    bf_atual = Column(Float, default=15.0)
    bf_alvo = Column(Float, default=10.0)
    nivel_experiencia = Column(String(50), default="intermediario")
    nivel_atividade = Column(String(50), default="moderado")
    dias_treino_semana = Column(Integer, default=4)
    tempo_sessao_minutos = Column(Integer, default=60)
    fase_atual = Column(String(50), default="bulk")
    calorias_atuais = Column(Float, default=2600.0)
    projeto_ativo_json = Column(Text, nullable=True)
    chave_api_ia = Column(String(255), nullable=True)
    prompt_sistema_treinador = Column(Text, nullable=True)
    prompt_sistema_nutricao = Column(Text, nullable=True)
    prompts_customizados_json = Column(Text, nullable=True)
    preferencias_alimentares_json = Column(Text, nullable=True)
    configuracao_checkin_json = Column(Text, nullable=True)
    memoria_treino_ia_json = Column(Text, nullable=True)
    memoria_nutricao_ia_json = Column(Text, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PlanoTreinoGuardado(Base):
    __tablename__ = "planos_treino"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), default="Plano Recomendado")
    divisao = Column(String(50), default="Upper / Lower")
    dias_semana = Column(Integer, default=4)
    tempo_sessao_minutos = Column(Integer, default=60)
    ativo = Column(Boolean, default=True)
    id_projeto = Column(Integer, nullable=True, index=True)
    nome_projeto = Column(String(150), nullable=True)
    fase_projeto = Column(String(50), nullable=True)
    nome_fase = Column(String(100), nullable=True)
    historico_alteracoes_json = Column(Text, default="[]")
    sessoes_json = Column(Text, nullable=False)  # JSON com a lista completa de sessões e exercícios
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PlanoDietaGuardado(Base):
    __tablename__ = "planos_dieta"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), default="Dieta Adaptativa")
    calorias = Column(Float, nullable=False)
    proteina_g = Column(Float, nullable=False)
    gordura_g = Column(Float, nullable=False)
    hidratos_g = Column(Float, nullable=False)
    fibras_g = Column(Float, default=30.0)
    ativo = Column(Boolean, default=True)
    id_projeto = Column(Integer, nullable=True, index=True)
    nome_projeto = Column(String(150), nullable=True)
    fase_projeto = Column(String(50), nullable=True)
    nome_fase = Column(String(100), nullable=True)
    historico_alteracoes_json = Column(Text, default="[]")
    refeicoes_json = Column(Text, nullable=False)  # JSON com as refeições diárias estruturadas
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class RegistoTreinoExecutado(Base):
    __tablename__ = "registos_treino"

    id = Column(Integer, primary_key=True, index=True)
    data = Column(DateTime, default=datetime.utcnow)
    sessao_nome = Column(String(100), nullable=False)
    duracao_minutos = Column(Integer, default=60)
    rpe_geral = Column(Float, default=8.0)
    exercicios_json = Column(Text, nullable=False)  # Séries, cargas levantadas e reps realizadas
    notas = Column(Text, nullable=True)


class RegistoCheckIn(Base):
    __tablename__ = "registos_checkin"

    id = Column(Integer, primary_key=True, index=True)
    id_projeto = Column(Integer, nullable=True, index=True)
    nome_projeto = Column(String(150), nullable=True)
    data = Column(DateTime, default=datetime.utcnow)
    peso_medio = Column(Float, nullable=False)
    variacao_peso_kg = Column(Float, default=0.0)
    fase_atual = Column(String(50), default="bulk")
    adesao_percentual = Column(Float, default=90.0)
    nivel_fadiga = Column(Integer, default=5)
    qualidade_sono = Column(Integer, default=7)
    nivel_fome = Column(Integer, default=5)
    dores_ou_queixas = Column(Text, nullable=True)
    notas_usuario = Column(Text, nullable=True)
    diagnostico_matematico_json = Column(Text, nullable=False)
    recomendacao_ia_json = Column(Text, nullable=False)
    metricas_adicionais_json = Column(Text, nullable=True, default="{}")


class RegistoDiarioConsumo(Base):
    __tablename__ = "registos_diario_consumo"

    id = Column(Integer, primary_key=True, index=True)
    data = Column(String(10), default=lambda: datetime.utcnow().strftime("%Y-%m-%d"), index=True)
    calorias_alvo = Column(Float, default=2000.0)
    proteina_alvo_g = Column(Float, default=150.0)
    hidratos_alvo_g = Column(Float, default=200.0)
    gordura_alvo_g = Column(Float, default=60.0)
    calorias_consumidas = Column(Float, default=0.0)
    proteina_consumida_g = Column(Float, default=0.0)
    hidratos_consumidos_g = Column(Float, default=0.0)
    gordura_consumida_g = Column(Float, default=0.0)
    checks_refeicoes_json = Column(Text, default="{}")  # Mapa de checks: { "id_refeicao_ou_alimento": true }
    itens_avulsos_json = Column(Text, default="[]")     # Lista de alimentos adicionados livremente (ao contrário)
    notas_dia = Column(Text, nullable=True)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ProjetoFisiologico(Base):
    __tablename__ = "projetos_fisiologicos"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(150), nullable=False, default="Projeto de Transformação")
    descricao = Column(Text, nullable=True)
    tipo_intencao = Column(String(100), default="Transformação Corporal")
    ativo = Column(Boolean, default=True)
    status = Column(String(50), default="ativo")  # 'ativo', 'concluido', 'arquivado'

    # Metas e Biometria Inicial
    peso_inicial_kg = Column(Float, nullable=False)
    peso_alvo_kg = Column(Float, nullable=False)
    bf_inicial = Column(Float, default=15.0)
    bf_alvo = Column(Float, default=10.0)
    estrategia_inicial = Column(String(50), default="recomposicao")
    duracao_total_semanas = Column(Integer, default=12)

    # Fase ativa dentro do projeto
    fase_atual_tipo = Column(String(50), default="cut")
    fase_atual_nome = Column(String(100), default="Fase 1")
    data_inicio_fase = Column(String(50), nullable=True)
    data_inicio_projeto = Column(String(50), nullable=True)

    # Dados completos em JSON
    fases_json = Column(Text, nullable=False, default="[]")
    relatorio_completo_json = Column(Text, nullable=True)

    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ProtocoloBiohacking(Base):
    __tablename__ = "protocolos_biohacking"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(150), default="Protocolo de Otimização Hormonal")
    objetivo = Column(String(200), default="Testosterona Livre, Sono & Recuperação")
    ativo = Column(Boolean, default=True)
    data_inicio = Column(String(20), default=lambda: datetime.utcnow().strftime("%Y-%m-%d"))
    substancias_json = Column(Text, nullable=False, default="[]")
    historico_tomas_json = Column(Text, nullable=True, default="{}")
    notas_atleta = Column(Text, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class RegistoBiofeedback(Base):
    __tablename__ = "registos_biofeedback"

    id = Column(Integer, primary_key=True, index=True)
    data = Column(String(20), default=lambda: datetime.utcnow().strftime("%Y-%m-%d"), index=True)
    vigor_energia = Column(Integer, default=7)
    qualidade_sono = Column(Integer, default=7)
    recuperacao_muscular = Column(Integer, default=7)
    libido_vitalidade = Column(Integer, default=7)
    protocolo_ativo = Column(Boolean, default=True)
    notas = Column(Text, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)
