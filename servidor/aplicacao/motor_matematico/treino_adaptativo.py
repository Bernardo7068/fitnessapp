"""
Motor Matemático - Treino Adaptativo, Volume Ótimo (MEV/MAV/MRV) e Sobrecarga Progressiva
Gera planos estruturados por tempo e dias disponíveis, monitoriza a sobrecarga progressiva (Double Progression),
deteta estagnações de carga e ajusta o volume semanal de séries de trabalho.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional


@dataclass
class ExercicioTreino:
    id_exercicio: str
    nome: str
    grupo_muscular_primario: str
    grupo_muscular_secundario: Optional[str]
    series: int
    repeticoes_alvo: str  # ex: "8-12", "6-8", "12-15"
    descanso_segundos: int
    rpe_alvo: float       # Escala RPE 1-10 (RPE 8 = 2 reps na reserva / RIR 2)
    carga_sugerida_kg: float = 0.0
    notas_execucao: str = ""


@dataclass
class SessaoTreino:
    dia_nome: str
    foco: str
    tempo_estimado_minutos: int
    exercicios: List[ExercicioTreino] = field(default_factory=list)


@dataclass
class PlanoTreinoCompleto:
    nome_divisao: str  # "Full Body", "Upper / Lower", "Push / Pull / Legs"
    dias_por_semana: int
    tempo_sessao_minutos: int
    foco_principal: str
    volume_total_series_semana: int
    sessoes: List[SessaoTreino] = field(default_factory=list)


# Base de dados de exercícios com biometria biomecânica
EXERCICIOS_CATALOGO = {
    # PEITO
    "supino_reto_barra": {"nome": "Supino Reto com Barra", "primario": "peito", "secundario": "triceps", "tipo": "composto"},
    "supino_inclinado_halteres": {"nome": "Supino Inclinado com Halteres", "primario": "peito", "secundario": "deltoide_anterior", "tipo": "composto"},
    "supino_halteres_pegada_neutra": {"nome": "Supino com Halteres (Pegada Neutra / Ombros Seguros)", "primario": "peito", "secundario": "triceps", "tipo": "composto"},
    "crucifixo_cabos": {"nome": "Crossover no Cabo / Crucifixo", "primario": "peito", "secundario": None, "tipo": "isolado"},
    "crucifixo_inclinado_cabos": {"nome": "Crucifixo Inclinado no Cabo (Peito Superior)", "primario": "peito", "secundario": None, "tipo": "isolado"},
    "floor_press_halteres": {"nome": "Floor Press com Halteres (Seguro para Ombros)", "primario": "peito", "secundario": "triceps", "tipo": "composto"},
    "fundos_paralelas": {"nome": "Fundos nas Barras Paralelas", "primario": "peito", "secundario": "triceps", "tipo": "composto"},
    
    # COSTAS
    "puxada_frente_polia": {"nome": "Puxada à Frente na Polia (Lat Pulldown)", "primario": "costas", "secundario": "biceps", "tipo": "composto"},
    "remada_curvada_barra": {"nome": "Remada Curvada com Barra", "primario": "costas", "secundario": "biceps", "tipo": "composto"},
    "remada_apoiada_banco": {"nome": "Remada Apoiada no Banco (Protege Lombar)", "primario": "costas", "secundario": "biceps", "tipo": "composto"},
    "remada_unilateral_haltere": {"nome": "Remada Unilateral com Haltere (Serrote)", "primario": "costas", "secundario": "biceps", "tipo": "composto"},
    "puxada_triangulo": {"nome": "Remada Baixa com Triângulo", "primario": "costas", "secundario": "deltoide_posterior", "tipo": "composto"},
    "pullover_cabos": {"nome": "Pullover no Cabo com Corda (Grande Dorsal)", "primario": "costas", "secundario": None, "tipo": "isolado"},
    
    # PERNAS (QUADRÍCEPS / POSTERIOR / GLÚTEOS)
    "agachamento_livre": {"nome": "Agachamento Livre com Barra", "primario": "quadriceps", "secundario": "gluteos", "tipo": "composto"},
    "leg_press_45": {"nome": "Leg Press 45º (Pés Médios)", "primario": "quadriceps", "secundario": "gluteos", "tipo": "composto"},
    "agachamento_bulgaro": {"nome": "Agachamento Búlgaro (Foco Glúteos & Unilateral)", "primario": "quadriceps", "secundario": "gluteos", "tipo": "composto"},
    "extensao_pernas": {"nome": "Cadeira Extensora de Pernas", "primario": "quadriceps", "secundario": None, "tipo": "isolado"},
    "peso_morto_romeno": {"nome": "Peso Morto Romeno (RDL)", "primario": "isquiotibiais", "secundario": "gluteos", "tipo": "composto"},
    "flexao_pernas_deitado": {"nome": "Mesa Flexora de Pernas", "primario": "isquiotibiais", "secundario": None, "tipo": "isolado"},
    "hip_thrust_elevacao_pelvica": {"nome": "Elevação Pélvica / Hip Thrust com Barra", "primario": "gluteos", "secundario": "isquiotibiais", "tipo": "composto"},
    "elevacao_gemeos_pe": {"nome": "Elevação de Gémeos em Pé", "primario": "gemeos", "secundario": None, "tipo": "isolado"},
    
    # OMBROS
    "desenvolvimento_halteres": {"nome": "Desenvolvimento de Ombros com Halteres", "primario": "ombros", "secundario": "triceps", "tipo": "composto"},
    "elevacao_lateral_cabos": {"nome": "Elevações Laterais no Cabo", "primario": "ombros", "secundario": None, "tipo": "isolado"},
    "elevacao_lateral_inclinada": {"nome": "Elevação Lateral Inclinada no Banco (Deltoide Lateral)", "primario": "ombros", "secundario": None, "tipo": "isolado"},
    "face_pull": {"nome": "Face Pulls na Polia Alta (Saúde Articular)", "primario": "deltoide_posterior", "secundario": "trapezio", "tipo": "composto"},
    
    # BRAÇOS (BÍCEPS & TRÍCEPS)
    "curl_biceps_barra_w": {"nome": "Curl Bíceps na Barra W", "primario": "biceps", "secundario": "antebraco", "tipo": "isolado"},
    "curl_martelo_halteres": {"nome": "Curl Martelo com Halteres (Braquial & Antebraço)", "primario": "biceps", "secundario": "braquial", "tipo": "isolado"},
    "curl_inclinado_halteres": {"nome": "Curl Bíceps no Banco Inclinado (Cabeça Longa)", "primario": "biceps", "secundario": None, "tipo": "isolado"},
    "triceps_corda_polia": {"nome": "Tríceps Corda na Polia Alta", "primario": "triceps", "secundario": None, "tipo": "isolado"},
    "triceps_frances_cabos": {"nome": "Tríceps Francês na Polia (Cabeça Longa)", "primario": "triceps", "secundario": None, "tipo": "isolado"},
    "supino_fechado": {"nome": "Supino com Pegada Fechada", "primario": "triceps", "secundario": "peito", "tipo": "composto"}
}


def gerar_plano_treino_otimizado(
    dias_semana: int,
    tempo_sessao_minutos: int = 60,
    nivel_experiencia: str = "intermediario",
    foco_personalizado: Optional[str] = None
) -> PlanoTreinoCompleto:
    """
    Gera matematicamente uma estrutura de treino baseada no volume científico (RP Mike Israetel).
    - 2 a 3 dias: Full Body (frequência alta para máxima síntese de proteína).
    - 4 dias: Upper / Lower (divisão ótima entre tronco e pernas).
    - 5 a 6 dias: Push / Pull / Legs (PPL).
    """
    dias_semana = max(2, min(6, dias_semana))
    
    # Patamares mecânicos de séries por exercício (não uniformes)
    s_composto = 4
    s_secundario = 3
    s_isolador = 3
    s_braco = 3 if tempo_sessao_minutos > 60 else 2
    s_detalhe = 2

    if tempo_sessao_minutos <= 45:
        max_exercicios = 4
        descanso = 90
    elif tempo_sessao_minutos <= 65:
        max_exercicios = 5
        descanso = 105
    else:  # 75 - 90 min
        max_exercicios = 6
        descanso = 120

    sessoes: List[SessaoTreino] = []

    # 1. DIVISÃO 2 OU 3 DIAS: FULL BODY
    if dias_semana <= 3:
        nome_divisao = f"Full Body Frequência {dias_semana}x"
        
        # Dia A
        sessoes.append(SessaoTreino(
            dia_nome="Dia 1: Full Body A",
            foco="Foco Força e Compostos Pesados",
            tempo_estimado_minutos=tempo_sessao_minutos,
            exercicios=[
                ExercicioTreino("agachamento_livre", EXERCICIOS_CATALOGO["agachamento_livre"]["nome"], "quadriceps", "gluteos", s_composto, "6-8", descanso, 8.0),
                ExercicioTreino("supino_reto_barra", EXERCICIOS_CATALOGO["supino_reto_barra"]["nome"], "peito", "triceps", s_composto, "6-8", descanso, 8.0),
                ExercicioTreino("puxada_frente_polia", EXERCICIOS_CATALOGO["puxada_frente_polia"]["nome"], "costas", "biceps", s_secundario, "8-10", descanso, 8.0),
                ExercicioTreino("desenvolvimento_halteres", EXERCICIOS_CATALOGO["desenvolvimento_halteres"]["nome"], "ombros", "triceps", s_secundario, "8-10", 90, 8.5),
                ExercicioTreino("flexao_pernas_deitado", EXERCICIOS_CATALOGO["flexao_pernas_deitado"]["nome"], "isquiotibiais", None, s_isolador, "10-12", 75, 8.5)
            ][:max_exercicios]
        ))
        
        # Dia B
        sessoes.append(SessaoTreino(
            dia_nome="Dia 2: Full Body B",
            foco="Cadeia Posterior e Peitoral Superior",
            tempo_estimado_minutos=tempo_sessao_minutos,
            exercicios=[
                ExercicioTreino("peso_morto_romeno", EXERCICIOS_CATALOGO["peso_morto_romeno"]["nome"], "isquiotibiais", "gluteos", s_composto, "8-10", descanso, 8.0),
                ExercicioTreino("supino_inclinado_halteres", EXERCICIOS_CATALOGO["supino_inclinado_halteres"]["nome"], "peito", "ombros", s_secundario, "8-10", descanso, 8.0),
                ExercicioTreino("remada_curvada_barra", EXERCICIOS_CATALOGO["remada_curvada_barra"]["nome"], "costas", "biceps", s_secundario, "8-10", descanso, 8.0),
                ExercicioTreino("leg_press_45", EXERCICIOS_CATALOGO["leg_press_45"]["nome"], "quadriceps", "gluteos", s_secundario, "10-12", 90, 8.5),
                ExercicioTreino("elevacao_lateral_cabos", EXERCICIOS_CATALOGO["elevacao_lateral_cabos"]["nome"], "ombros", None, s_isolador, "12-15", 60, 9.0)
            ][:max_exercicios]
        ))

        # Dia C (se 3 dias)
        if dias_semana == 3:
            sessoes.append(SessaoTreino(
                dia_nome="Dia 3: Full Body C",
                foco="Hipertrofia e Densidade Muscular",
                tempo_estimado_minutos=tempo_sessao_minutos,
                exercicios=[
                    ExercicioTreino("agachamento_livre", EXERCICIOS_CATALOGO["agachamento_livre"]["nome"], "quadriceps", "gluteos", s_composto, "8-10", descanso, 8.0),
                    ExercicioTreino("remada_unilateral_haltere", EXERCICIOS_CATALOGO["remada_unilateral_haltere"]["nome"], "costas", "biceps", s_secundario, "10-12", 90, 8.5),
                    ExercicioTreino("crucifixo_cabos", EXERCICIOS_CATALOGO["crucifixo_cabos"]["nome"], "peito", None, s_isolador, "12-15", 75, 8.5),
                    ExercicioTreino("face_pull", EXERCICIOS_CATALOGO["face_pull"]["nome"], "deltoide_posterior", "trapezio", s_detalhe, "12-15", 60, 9.0),
                    ExercicioTreino("curl_biceps_barra_w", EXERCICIOS_CATALOGO["curl_biceps_barra_w"]["nome"], "biceps", None, s_braco, "10-12", 60, 9.0)
                ][:max_exercicios]
            ))

    # 2. DIVISÃO 4 DIAS: UPPER / LOWER
    elif dias_semana == 4:
        nome_divisao = "Upper / Lower (Tronco e Pernas 4x)"
        
        sessoes = [
            SessaoTreino("Dia 1: Superior A (Upper Força)", "Peito, Costas e Ombros Pesados", tempo_sessao_minutos, [
                ExercicioTreino("supino_reto_barra", EXERCICIOS_CATALOGO["supino_reto_barra"]["nome"], "peito", "triceps", s_composto, "6-8", descanso, 8.0),
                ExercicioTreino("remada_curvada_barra", EXERCICIOS_CATALOGO["remada_curvada_barra"]["nome"], "costas", "biceps", s_secundario, "6-8", descanso, 8.0),
                ExercicioTreino("desenvolvimento_halteres", EXERCICIOS_CATALOGO["desenvolvimento_halteres"]["nome"], "ombros", "triceps", s_secundario, "8-10", 90, 8.5),
                ExercicioTreino("puxada_triangulo", EXERCICIOS_CATALOGO["puxada_triangulo"]["nome"], "costas", "ombros", s_isolador, "10-12", 75, 8.5),
                ExercicioTreino("triceps_corda_polia", EXERCICIOS_CATALOGO["triceps_corda_polia"]["nome"], "triceps", None, s_braco, "12-15", 60, 9.0)
            ][:max_exercicios]),
            
            SessaoTreino("Dia 2: Inferior A (Lower Foco Quadríceps)", "Agachamento e Quadríceps", tempo_sessao_minutos, [
                ExercicioTreino("agachamento_livre", EXERCICIOS_CATALOGO["agachamento_livre"]["nome"], "quadriceps", "gluteos", s_composto, "6-8", descanso, 8.0),
                ExercicioTreino("peso_morto_romeno", EXERCICIOS_CATALOGO["peso_morto_romeno"]["nome"], "isquiotibiais", "gluteos", s_secundario, "8-10", descanso, 8.0),
                ExercicioTreino("leg_press_45", EXERCICIOS_CATALOGO["leg_press_45"]["nome"], "quadriceps", "gluteos", s_secundario, "10-12", 90, 8.5),
                ExercicioTreino("flexao_pernas_deitado", EXERCICIOS_CATALOGO["flexao_pernas_deitado"]["nome"], "isquiotibiais", None, s_isolador, "10-12", 75, 8.5),
                ExercicioTreino("elevacao_gemeos_pe", EXERCICIOS_CATALOGO["elevacao_gemeos_pe"]["nome"], "gemeos", None, s_detalhe, "12-15", 60, 9.0)
            ][:max_exercicios]),
            
            SessaoTreino("Dia 3: Superior B (Upper Hipertrofia)", "Foco em Deltoides e Bíceps", tempo_sessao_minutos, [
                ExercicioTreino("supino_inclinado_halteres", EXERCICIOS_CATALOGO["supino_inclinado_halteres"]["nome"], "peito", "ombros", s_composto, "8-10", descanso, 8.0),
                ExercicioTreino("puxada_frente_polia", EXERCICIOS_CATALOGO["puxada_frente_polia"]["nome"], "costas", "biceps", s_secundario, "8-10", descanso, 8.0),
                ExercicioTreino("crucifixo_cabos", EXERCICIOS_CATALOGO["crucifixo_cabos"]["nome"], "peito", None, s_isolador, "10-12", 75, 8.5),
                ExercicioTreino("elevacao_lateral_cabos", EXERCICIOS_CATALOGO["elevacao_lateral_cabos"]["nome"], "ombros", None, s_isolador, "12-15", 60, 9.0),
                ExercicioTreino("curl_biceps_barra_w", EXERCICIOS_CATALOGO["curl_biceps_barra_w"]["nome"], "biceps", None, s_braco, "10-12", 60, 9.0)
            ][:max_exercicios]),
            
            SessaoTreino("Dia 4: Inferior B (Lower Foco Isquiotibiais)", "Posterior de Coxa e Glúteos", tempo_sessao_minutos, [
                ExercicioTreino("peso_morto_romeno", EXERCICIOS_CATALOGO["peso_morto_romeno"]["nome"], "isquiotibiais", "gluteos", s_composto, "8-10", descanso, 8.0),
                ExercicioTreino("leg_press_45", EXERCICIOS_CATALOGO["leg_press_45"]["nome"], "quadriceps", "gluteos", s_secundario, "10-12", 90, 8.5),
                ExercicioTreino("extensao_pernas", EXERCICIOS_CATALOGO["extensao_pernas"]["nome"], "quadriceps", None, s_isolador, "12-15", 75, 8.5),
                ExercicioTreino("flexao_pernas_deitado", EXERCICIOS_CATALOGO["flexao_pernas_deitado"]["nome"], "isquiotibiais", None, s_isolador, "10-12", 75, 9.0),
                ExercicioTreino("elevacao_gemeos_pe", EXERCICIOS_CATALOGO["elevacao_gemeos_pe"]["nome"], "gemeos", None, s_detalhe, "12-15", 60, 9.0)
            ][:max_exercicios])
        ]

    # 3. DIVISÃO 5 DIAS: PUSH / PULL / LEGS 5X (PPL + PUSH/PULL)
    elif dias_semana == 5:
        nome_divisao = "Push / Pull / Legs 5x Rotativo (PPL)"
        sessoes = [
            SessaoTreino("Sessão 1: Push A (Peito Reto, Ombros & Tríceps)", "Força Mecânica no Supino", tempo_sessao_minutos, [
                ExercicioTreino("supino_reto_barra", EXERCICIOS_CATALOGO["supino_reto_barra"]["nome"], "peito", "triceps", s_composto, "6-8", descanso, 8.0),
                ExercicioTreino("supino_inclinado_halteres", EXERCICIOS_CATALOGO["supino_inclinado_halteres"]["nome"], "peito", "ombros", s_secundario, "8-10", descanso, 8.0),
                ExercicioTreino("elevacao_lateral_cabos", EXERCICIOS_CATALOGO["elevacao_lateral_cabos"]["nome"], "ombros", None, s_isolador, "12-15", 60, 9.0),
                ExercicioTreino("crucifixo_cabos", EXERCICIOS_CATALOGO["crucifixo_cabos"]["nome"], "peito", None, s_isolador, "10-12", 75, 8.5),
                ExercicioTreino("triceps_corda_polia", EXERCICIOS_CATALOGO["triceps_corda_polia"]["nome"], "triceps", None, s_braco, "10-12", 60, 9.0)
            ][:max_exercicios]),
            
            SessaoTreino("Sessão 2: Pull A (Costas & Bíceps)", "Grande Dorsal e Bíceps", tempo_sessao_minutos, [
                ExercicioTreino("puxada_frente_polia", EXERCICIOS_CATALOGO["puxada_frente_polia"]["nome"], "costas", "biceps", s_composto, "8-10", descanso, 8.0),
                ExercicioTreino("remada_curvada_barra", EXERCICIOS_CATALOGO["remada_curvada_barra"]["nome"], "costas", "biceps", s_secundario, "6-8", descanso, 8.0),
                ExercicioTreino("face_pull", EXERCICIOS_CATALOGO["face_pull"]["nome"], "deltoide_posterior", "trapezio", s_isolador, "12-15", 60, 8.5),
                ExercicioTreino("curl_biceps_barra_w", EXERCICIOS_CATALOGO["curl_biceps_barra_w"]["nome"], "biceps", None, s_braco, "8-10", 75, 8.5),
                ExercicioTreino("curl_martelo_halteres", EXERCICIOS_CATALOGO["curl_martelo_halteres"]["nome"], "biceps", "braquial", s_braco, "10-12", 60, 9.0)
            ][:max_exercicios]),
            
            SessaoTreino("Sessão 3: Legs A (Quadríceps & Isquiotibiais)", "Potência Inferior e Gémeos", tempo_sessao_minutos, [
                ExercicioTreino("agachamento_livre", EXERCICIOS_CATALOGO["agachamento_livre"]["nome"], "quadriceps", "gluteos", s_composto, "6-8", descanso, 8.0),
                ExercicioTreino("peso_morto_romeno", EXERCICIOS_CATALOGO["peso_morto_romeno"]["nome"], "isquiotibiais", "gluteos", s_secundario, "8-10", descanso, 8.0),
                ExercicioTreino("leg_press_45", EXERCICIOS_CATALOGO["leg_press_45"]["nome"], "quadriceps", "gluteos", s_secundario, "10-12", 90, 8.5),
                ExercicioTreino("flexao_pernas_deitado", EXERCICIOS_CATALOGO["flexao_pernas_deitado"]["nome"], "isquiotibiais", None, s_isolador, "10-12", 75, 8.5),
                ExercicioTreino("elevacao_gemeos_pe", EXERCICIOS_CATALOGO["elevacao_gemeos_pe"]["nome"], "gemeos", None, s_detalhe, "12-15", 60, 9.0)
            ][:max_exercicios]),

            SessaoTreino("Sessão 4: Push B (Peito Superior & Ombros)", "Hipertrofia Clavicular e Ombros", tempo_sessao_minutos, [
                ExercicioTreino("supino_inclinado_halteres", EXERCICIOS_CATALOGO["supino_inclinado_halteres"]["nome"], "peito", "ombros", s_composto, "8-10", descanso, 8.0),
                ExercicioTreino("desenvolvimento_halteres", EXERCICIOS_CATALOGO["desenvolvimento_halteres"]["nome"], "ombros", "triceps", s_secundario, "8-10", 90, 8.5),
                ExercicioTreino("crucifixo_inclinado_cabos", EXERCICIOS_CATALOGO["crucifixo_inclinado_cabos"]["nome"], "peito", None, s_isolador, "10-12", 75, 8.5),
                ExercicioTreino("elevacao_lateral_cabos", EXERCICIOS_CATALOGO["elevacao_lateral_cabos"]["nome"], "ombros", None, s_isolador, "12-15", 60, 9.0),
                ExercicioTreino("triceps_frances_cabos", EXERCICIOS_CATALOGO["triceps_frances_cabos"]["nome"], "triceps", None, s_braco, "10-12", 60, 9.0)
            ][:max_exercicios]),

            SessaoTreino("Sessão 5: Pull B (Espessura Dorsal & Braquial)", "Remadas Pesadas e Densidade", tempo_sessao_minutos, [
                ExercicioTreino("remada_unilateral_haltere", EXERCICIOS_CATALOGO["remada_unilateral_haltere"]["nome"], "costas", "biceps", s_composto, "8-10", descanso, 8.0),
                ExercicioTreino("puxada_triangulo", EXERCICIOS_CATALOGO["puxada_triangulo"]["nome"], "costas", "deltoide_posterior", s_secundario, "10-12", 90, 8.5),
                ExercicioTreino("pullover_cabos", EXERCICIOS_CATALOGO["pullover_cabos"]["nome"], "costas", None, s_isolador, "12-15", 75, 8.5),
                ExercicioTreino("face_pull", EXERCICIOS_CATALOGO["face_pull"]["nome"], "deltoide_posterior", "trapezio", s_detalhe, "12-15", 60, 9.0),
                ExercicioTreino("curl_inclinado_halteres", EXERCICIOS_CATALOGO["curl_inclinado_halteres"]["nome"], "biceps", None, s_braco, "10-12", 60, 9.0)
            ][:max_exercicios])
        ]

    # 4. DIVISÃO 6 DIAS: PUSH / PULL / LEGS 6X
    else:
        nome_divisao = "Push / Pull / Legs 6x (PPL)"
        sessoes = [
            SessaoTreino("Sessão 1: Push A (Peito Reto, Ombros & Tríceps)", "Força Mecânica no Supino", tempo_sessao_minutos, [
                ExercicioTreino("supino_reto_barra", EXERCICIOS_CATALOGO["supino_reto_barra"]["nome"], "peito", "triceps", s_composto, "6-8", descanso, 8.0),
                ExercicioTreino("supino_inclinado_halteres", EXERCICIOS_CATALOGO["supino_inclinado_halteres"]["nome"], "peito", "ombros", s_secundario, "8-10", descanso, 8.0),
                ExercicioTreino("elevacao_lateral_cabos", EXERCICIOS_CATALOGO["elevacao_lateral_cabos"]["nome"], "ombros", None, s_isolador, "12-15", 60, 9.0),
                ExercicioTreino("crucifixo_cabos", EXERCICIOS_CATALOGO["crucifixo_cabos"]["nome"], "peito", None, s_isolador, "10-12", 75, 8.5),
                ExercicioTreino("triceps_corda_polia", EXERCICIOS_CATALOGO["triceps_corda_polia"]["nome"], "triceps", None, s_braco, "10-12", 60, 9.0)
            ][:max_exercicios]),
            
            SessaoTreino("Sessão 2: Pull A (Costas & Bíceps)", "Grande Dorsal e Bíceps", tempo_sessao_minutos, [
                ExercicioTreino("puxada_frente_polia", EXERCICIOS_CATALOGO["puxada_frente_polia"]["nome"], "costas", "biceps", s_composto, "8-10", descanso, 8.0),
                ExercicioTreino("remada_curvada_barra", EXERCICIOS_CATALOGO["remada_curvada_barra"]["nome"], "costas", "biceps", s_secundario, "6-8", descanso, 8.0),
                ExercicioTreino("face_pull", EXERCICIOS_CATALOGO["face_pull"]["nome"], "deltoide_posterior", "trapezio", s_isolador, "12-15", 60, 8.5),
                ExercicioTreino("curl_biceps_barra_w", EXERCICIOS_CATALOGO["curl_biceps_barra_w"]["nome"], "biceps", None, s_braco, "8-10", 75, 8.5),
                ExercicioTreino("curl_martelo_halteres", EXERCICIOS_CATALOGO["curl_martelo_halteres"]["nome"], "biceps", "braquial", s_braco, "10-12", 60, 9.0)
            ][:max_exercicios]),
            
            SessaoTreino("Sessão 3: Legs A (Quadríceps & Isquiotibiais)", "Potência Inferior e Gémeos", tempo_sessao_minutos, [
                ExercicioTreino("agachamento_livre", EXERCICIOS_CATALOGO["agachamento_livre"]["nome"], "quadriceps", "gluteos", s_composto, "6-8", descanso, 8.0),
                ExercicioTreino("peso_morto_romeno", EXERCICIOS_CATALOGO["peso_morto_romeno"]["nome"], "isquiotibiais", "gluteos", s_secundario, "8-10", descanso, 8.0),
                ExercicioTreino("leg_press_45", EXERCICIOS_CATALOGO["leg_press_45"]["nome"], "quadriceps", "gluteos", s_secundario, "10-12", 90, 8.5),
                ExercicioTreino("flexao_pernas_deitado", EXERCICIOS_CATALOGO["flexao_pernas_deitado"]["nome"], "isquiotibiais", None, s_isolador, "10-12", 75, 8.5),
                ExercicioTreino("elevacao_gemeos_pe", EXERCICIOS_CATALOGO["elevacao_gemeos_pe"]["nome"], "gemeos", None, s_detalhe, "12-15", 60, 9.0)
            ][:max_exercicios]),

            SessaoTreino("Sessão 4: Push B (Peito Superior & Ombros)", "Hipertrofia Clavicular e Ombros", tempo_sessao_minutos, [
                ExercicioTreino("supino_inclinado_halteres", EXERCICIOS_CATALOGO["supino_inclinado_halteres"]["nome"], "peito", "ombros", s_composto, "8-10", descanso, 8.0),
                ExercicioTreino("desenvolvimento_halteres", EXERCICIOS_CATALOGO["desenvolvimento_halteres"]["nome"], "ombros", "triceps", s_secundario, "8-10", 90, 8.5),
                ExercicioTreino("crucifixo_inclinado_cabos", EXERCICIOS_CATALOGO["crucifixo_inclinado_cabos"]["nome"], "peito", None, s_isolador, "10-12", 75, 8.5),
                ExercicioTreino("elevacao_lateral_cabos", EXERCICIOS_CATALOGO["elevacao_lateral_cabos"]["nome"], "ombros", None, s_isolador, "12-15", 60, 9.0),
                ExercicioTreino("triceps_frances_cabos", EXERCICIOS_CATALOGO["triceps_frances_cabos"]["nome"], "triceps", None, s_braco, "10-12", 60, 9.0)
            ][:max_exercicios]),

            SessaoTreino("Sessão 5: Pull B (Espessura Dorsal & Braquial)", "Remadas Pesadas e Densidade", tempo_sessao_minutos, [
                ExercicioTreino("remada_unilateral_haltere", EXERCICIOS_CATALOGO["remada_unilateral_haltere"]["nome"], "costas", "biceps", s_composto, "8-10", descanso, 8.0),
                ExercicioTreino("puxada_triangulo", EXERCICIOS_CATALOGO["puxada_triangulo"]["nome"], "costas", "deltoide_posterior", s_secundario, "10-12", 90, 8.5),
                ExercicioTreino("pullover_cabos", EXERCICIOS_CATALOGO["pullover_cabos"]["nome"], "costas", None, s_isolador, "12-15", 75, 8.5),
                ExercicioTreino("face_pull", EXERCICIOS_CATALOGO["face_pull"]["nome"], "deltoide_posterior", "trapezio", s_detalhe, "12-15", 60, 9.0),
                ExercicioTreino("curl_inclinado_halteres", EXERCICIOS_CATALOGO["curl_inclinado_halteres"]["nome"], "biceps", None, s_braco, "10-12", 60, 9.0)
            ][:max_exercicios]),

            SessaoTreino("Sessão 6: Legs B (Posterior & Glúteos)", "Foco Isquiotibiais e Glúteos", tempo_sessao_minutos, [
                ExercicioTreino("peso_morto_romeno", EXERCICIOS_CATALOGO["peso_morto_romeno"]["nome"], "isquiotibiais", "gluteos", s_composto, "8-10", descanso, 8.0),
                ExercicioTreino("hip_thrust_elevacao_pelvica", EXERCICIOS_CATALOGO["hip_thrust_elevacao_pelvica"]["nome"], "gluteos", "isquiotibiais", s_secundario, "8-10", 90, 8.5),
                ExercicioTreino("agachamento_bulgaro", EXERCICIOS_CATALOGO["agachamento_bulgaro"]["nome"], "quadriceps", "gluteos", s_secundario, "8-10", 90, 8.5),
                ExercicioTreino("flexao_pernas_deitado", EXERCICIOS_CATALOGO["flexao_pernas_deitado"]["nome"], "isquiotibiais", None, s_isolador, "10-12", 75, 9.0),
                ExercicioTreino("elevacao_gemeos_pe", EXERCICIOS_CATALOGO["elevacao_gemeos_pe"]["nome"], "gemeos", None, s_detalhe, "12-15", 60, 9.0)
            ][:max_exercicios])
        ]

    total_series = sum(sum(ex.series for ex in s.exercicios) for s in sessoes)

    return PlanoTreinoCompleto(
        nome_divisao=nome_divisao,
        dias_por_semana=dias_semana,
        tempo_sessao_minutos=tempo_sessao_minutos,
        foco_principal=foco_personalizado or "Hipertrofia Miofibrilar e Sobrecarga Progressiva",
        volume_total_series_semana=total_series,
        sessoes=sessoes
    )


def calcular_progressao_carga(
    carga_anterior_kg: float,
    repeticoes_feitas: int,
    faixa_repeticoes: str,  # ex: "8-12"
    rpe_atingido: float,    # 1 a 10
    tentativas_estagnadas: int = 0
) -> Dict[str, Any]:
    """
    Algoritmo Matemático de Progressão Dupla (Double Progression).
    Quando atinge o topo das repetições com RIR seguro, calcula matematicamente o incremento de carga.
    Se estagnar mais de 2 sessões seguidas, propõe intervenção matemática (Deload ou Variação de Reps).
    """
    try:
        partes = faixa_repeticoes.split("-")
        rep_min = int(partes[0].strip())
        rep_max = int(partes[1].strip())
    except Exception:
        rep_min, rep_max = 8, 12

    nova_carga = carga_anterior_kg
    acao = "manter_carga"
    mensagem = "Mantém a carga atual e tenta adicionar mais repetições na próxima sessão."
    precisa_deload = False

    # 1. Bateu o limite máximo de repetições com boa reserva (RPE <= 8.5)
    if repeticoes_feitas >= rep_max and rpe_atingido <= 9.0:
        # Incremento padrão: +2.5kg para exercícios superiores, +5kg para inferiores
        incremento = 2.5 if carga_anterior_kg < 50.0 else 5.0
        nova_carga = carga_anterior_kg + incremento
        acao = "subir_carga"
        mensagem = (
            f"Excelente superação! Atingiste {repeticoes_feitas} reps (teto de {rep_max}) com RPE {rpe_atingido}. "
            f"O algoritmo aumentou a carga para {nova_carga} kg (+{incremento} kg) para a próxima sessão."
        )

    # 2. Estagnação prolongada na mesma carga e repetições (>= 3 sessões consecutivas sem subir 1 repetição)
    elif tentativas_estagnadas >= 3:
        if rpe_atingido >= 9.5:
            # Estagnação na falha concêntrica: Sistema nervoso central fadigado
            precisa_deload = True
            nova_carga = round(carga_anterior_kg * 0.9, 1)  # Redução temporária de 10%
            acao = "deload_tecnico"
            mensagem = (
                f"Estagnação identificada em {carga_anterior_kg} kg há 3 sessões com esforço máximo (RPE {rpe_atingido}). "
                "Para reiniciar os ganhos neurais, aplica um mini-deload de 1 semana reduzindo para "
                f"{nova_carga} kg focando na velocidade concêntrica máxima."
            )
        else:
            acao = "variar_faixa_reps"
            mensagem = "Estagnação sem falha. Recomendado alterar temporariamente o estímulo de 8-12 reps para 5-7 reps pesadas."

    return {
        "acao": acao,
        "carga_anterior_kg": carga_anterior_kg,
        "nova_carga_sugerida_kg": nova_carga,
        "diferenca_kg": round(nova_carga - carga_anterior_kg, 1),
        "mensagem": mensagem,
        "precisa_deload": precisa_deload
    }
