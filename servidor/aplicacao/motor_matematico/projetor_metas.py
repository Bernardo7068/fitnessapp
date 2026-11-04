"""
Motor Matemático - Projetor Dinâmico de Metas Fisiológicas
Identifica automaticamente a intenção real e impõe regras de segurança biológica:
1. ALERTA BF ELEVADO (BF >= 24% Homem / >= 30% Mulher): Bloqueia Bulks e Recomposições estáticas; prescreve Cut imediato.
2. PERDA DE PESO / SECAGEM (peso_alvo < peso_atual) -> Cut Focado com Diet Breaks metabólicos.
3. GANHO DE PESO / HIPERTROFIA (peso_alvo > peso_atual) -> Recomposição nos kg atuais ou Lean Bulk.
4. RECOMPOSIÇÃO NO MESMO PESO (peso_alvo == peso_atual) -> Manutenção com troca de gordura por músculo.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any
from .composicao_corporal import (
    calcular_massa_magra,
    calcular_tmb_katch_mcardle,
    calcular_distribuicao_macros,
    FATORES_ATIVIDADE
)


@dataclass
class FaseProjeto:
    numero_fase: int
    tipo: str  # "cut_primario", "diet_break", "cut_final", "recomposicao", "bulk_1", "resensibilizacao", "bulk_2"
    nome_exibicao: str
    duracao_semanas: int
    peso_inicio_kg: float
    peso_fim_estimado_kg: float
    bf_fim_estimado: float
    calorias_diarias: float
    macros: Dict[str, float]
    cardio_minutos_semana: int
    series_trabalho_semana: int
    descricao_estrategia: str
    foco_treino: str


@dataclass
class RelatorioProjetoMetas:
    peso_atual_kg: float
    bf_atual_percentual: float
    massa_magra_atual_kg: float
    massa_gorda_atual_kg: float
    peso_alvo_kg: float
    bf_alvo_percentual: float
    massa_magra_alvo_kg: float
    massa_gorda_alvo_kg: float
    massa_magra_a_ganhar_kg: float
    gordura_a_perder_kg: float
    semanas_totais_estimadas: int
    meses_estimados: float
    nivel_experiencia: str
    estrategia_inicial: str
    tipo_intencao: str  # "perda_peso", "ganho_peso", "recomposicao_mesmo_peso", "intervencao_bf_alto"
    diagnostico_fisiologico: str
    bloqueio_bulk_por_bf: bool = False
    fases: List[FaseProjeto] = field(default_factory=list)


def calcular_tdee_dinamico(peso_kg: float, bf_percentual: float, nivel_atividade: str = "moderado") -> float:
    """Calcula o TDEE atualizado para qualquer peso e percentual de gordura."""
    massa_magra = peso_kg * (1.0 - (bf_percentual / 100.0))
    tmb = 370.0 + (21.6 * massa_magra)
    fator = FATORES_ATIVIDADE.get(nivel_atividade.lower(), 1.55)
    return round(tmb * fator, 0)


def projetar_trajetoria_meta(
    peso_atual: float,
    altura_cm: float,
    idade: int,
    sexo: str,
    bf_atual: float,
    peso_alvo: float,
    bf_alvo: float = 15.0,
    nivel_experiencia: str = "intermediario",
    nivel_atividade: str = "moderado",
    estrategia_inicial: str = "recomposicao"
) -> RelatorioProjetoMetas:
    """
    Motor 100% dinâmico com proteção metabólica para BF elevado.
    """
    massa_magra_atual, massa_gorda_atual = calcular_massa_magra(peso_atual, bf_atual)
    massa_magra_alvo, massa_gorda_alvo = calcular_massa_magra(peso_alvo, bf_alvo)

    delta_peso = round(peso_alvo - peso_atual, 2)
    delta_massa_magra = round(massa_magra_alvo - massa_magra_atual, 2)
    delta_gordura = round(massa_gorda_alvo - massa_gorda_atual, 2)

    eh_homem = sexo.lower() in ["masculino", "homem", "m"]
    limite_bf_alto = 24.0 if eh_homem else 30.0

    fases: List[FaseProjeto] = []
    semanas_acumuladas = 0
    fase_num = 1

    peso_cursor = peso_atual
    bf_cursor = bf_atual
    lbm_cursor = massa_magra_atual
    bloqueio_bulk = False

    # Mensagem de diagnóstico padrão para garantir integridade
    diagnostico = f"Periodização fisiológica calculada para o perfil de {peso_atual} kg e {bf_atual}% BF."

    # =========================================================================
    # CASO CRÍTICO: REGRA DE BF ELEVADO (ex: 75kg e 30% BF)
    # A fisiologia desportiva PROÍBE bulks e recomposições lentas.
    # É imperativo fazer um corte primário para restaurar a saúde metabólica.
    # =========================================================================
    if bf_atual >= limite_bf_alto:
        bloqueio_bulk = True
        tipo_intencao = "intervencao_bf_alto"
        bf_meta_segura = 16.0 if eh_homem else 23.0
        
        # Gordura que precisa de ser eliminada para entrar na zona anabólica saudável
        peso_meta_cut = round(lbm_cursor / (1.0 - (bf_meta_segura / 100.0)), 1)
        perda_gordura_necessaria = round(peso_cursor - peso_meta_cut, 1)

        diagnostico = (
            f"⚠️ REGRA DE SAÚDE & PARTICIONAMENTO: Percentual de gordura elevado ({bf_atual}% BF). "
            "A fisiologia desportiva contra-indica formalmente qualquer tentativa de Lean Bulk ou recomposição estática. "
            "A resistência periférica à insulina e a atividade da enzima aromatase fariam com que qualquer excedente calórico "
            "fosse desviado diretamente para tecido adiposo visceral e hepático. "
            f"O algoritmo impõe como prioridade absoluta um Défice Calórico Imediato (Cut) de {peso_cursor} kg até aos "
            f"~{peso_meta_cut} kg ({bf_meta_segura}% BF). Só após esta limpeza metabólica o corpo estará biologicamente "
            "recetivo para construir massa magra com segurança."
        )

        # Divisão da descida com Diet Break se a perda for superior a 7kg
        if perda_gordura_necessaria > 7.0:
            perda_f1 = round(perda_gordura_necessaria * 0.65, 1)
            peso_fim_f1 = round(peso_cursor - perda_f1, 1)
            semanas_f1 = max(6, int(round(perda_f1 / 0.60)))
            bf_fim_f1 = round(bf_cursor - ((perda_f1 / peso_cursor) * 100 * 0.85), 1)
            tdee_f1 = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            calorias_f1 = round(tdee_f1 - 520.0, 0)

            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="cut_primario",
                nome_exibicao=f"Fase 1: Queima Primária de Adiposidade ({peso_cursor} kg -> {peso_fim_f1} kg)",
                duracao_semanas=semanas_f1,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_fim_f1,
                bf_fim_estimado=bf_fim_f1,
                calorias_diarias=calorias_f1,
                macros={
                    "proteina_g": round(peso_cursor * 2.3, 1),
                    "gordura_g": round(peso_cursor * 0.75, 1),
                    "hidratos_g": round((calorias_f1 - (peso_cursor * 2.3 * 4 + peso_cursor * 0.75 * 9)) / 4, 1),
                    "fibras_g": 35.0
                },
                cardio_minutos_semana=130,
                series_trabalho_semana=14,
                descricao_estrategia="Défice calórico obrigatório para restaurar sensibilidade à insulina e baixar marcadores inflamatórios.",
                foco_treino="Treino de força composto com alta intensidade para preservar a massa magra."
            ))
            peso_cursor = peso_fim_f1
            bf_cursor = bf_fim_f1
            semanas_acumuladas += semanas_f1
            fase_num += 1

            # Diet break metabólico de 2 semanas com transição adaptada (+350 kcal sobre a fase anterior)
            # Previne choque gastrointestinal, retenção hídrica massiva e respeita a termogénese adaptativa
            tdee_db_teorico = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            tdee_db_adaptado = round(tdee_db_teorico * 0.88, 0)
            calorias_db = round(min(tdee_db_adaptado, calorias_f1 + 350.0), 0)

            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="diet_break",
                nome_exibicao=f"Fase 2: Reset Hormonal e Diet Break ({peso_cursor} kg Estáveis)",
                duracao_semanas=2,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_cursor,
                bf_fim_estimado=bf_cursor,
                calorias_diarias=calorias_db,
                macros={
                    "proteina_g": round(peso_cursor * 2.0, 1),
                    "gordura_g": round(peso_cursor * 0.85, 1),
                    "hidratos_g": round((calorias_db - (peso_cursor * 2.0 * 4 + peso_cursor * 0.85 * 9)) / 4, 1),
                    "fibras_g": 35.0
                },
                cardio_minutos_semana=70,
                series_trabalho_semana=12,
                descricao_estrategia="Transição suave para manutenção adaptada (+350 kcal/dia). Previne choque digestivo, restaura leptina e tiróide e protege contra rebote de peso.",
                foco_treino="Recuperação do sistema nervoso central."
            ))
            semanas_acumuladas += 2
            fase_num += 1

            # Cut 2 até à zona saudável
            perda_f3 = round(peso_cursor - peso_meta_cut, 1)
            semanas_f3 = max(5, int(round(perda_f3 / 0.55)))
            tdee_f3 = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            calorias_f3 = round(tdee_f3 - 500.0, 0)

            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="cut_final",
                nome_exibicao=f"Fase 3: Lapidação para Faixa Anabólica ({peso_cursor} kg -> {peso_meta_cut} kg)",
                duracao_semanas=semanas_f3,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_meta_cut,
                bf_fim_estimado=bf_meta_segura,
                calorias_diarias=calorias_f3,
                macros={
                    "proteina_g": round(peso_meta_cut * 2.3, 1),
                    "gordura_g": round(peso_meta_cut * 0.75, 1),
                    "hidratos_g": round((calorias_f3 - (peso_meta_cut * 2.3 * 4 + peso_meta_cut * 0.75 * 9)) / 4, 1),
                    "fibras_g": 35.0
                },
                cardio_minutos_semana=150,
                series_trabalho_semana=14,
                descricao_estrategia=f"Atingir os {peso_meta_cut} kg ({bf_meta_segura}% BF). A partir daqui o corpo está pronto para construir massa magra limpa.",
                foco_treino="Preservação de cargas nos compostos."
            ))
            semanas_acumuladas += semanas_f3

        else:
            semanas_cut = max(6, int(round(perda_gordura_necessaria / 0.55)))
            tdee_c = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            calorias_c = round(tdee_c - 500.0, 0)

            fases.append(FaseProjeto(
                numero_fase=1,
                tipo="cut_primario",
                nome_exibicao=f"Fase 1: Cut Direto para Normalização do BF ({peso_cursor} kg -> {peso_meta_cut} kg)",
                duracao_semanas=semanas_cut,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_meta_cut,
                bf_fim_estimado=bf_meta_segura,
                calorias_diarias=calorias_c,
                macros={
                    "proteina_g": round(peso_meta_cut * 2.3, 1),
                    "gordura_g": round(peso_meta_cut * 0.8, 1),
                    "hidratos_g": round((calorias_c - (peso_meta_cut * 2.3 * 4 + peso_meta_cut * 0.8 * 9)) / 4, 1),
                    "fibras_g": 35.0
                },
                cardio_minutos_semana=140,
                series_trabalho_semana=14,
                descricao_estrategia=f"Corte linear obrigatório até {peso_meta_cut} kg para restabelecer a saúde metabólica.",
                foco_treino="Cargas pesadas e consistência no cardio."
            ))
            semanas_acumuladas = semanas_cut

    # =========================================================================
    # INTENÇÃO NORMAL 1: PERDER PESO / EMAGRECIMENTO (peso_alvo < peso_atual)
    # =========================================================================
    elif delta_peso < -0.5:
        tipo_intencao = "perda_peso"
        peso_a_perder_total = abs(delta_peso)

        diagnostico = (
            f"Intenção Identificada: Emagrecimento e Definição Focada ({peso_atual} kg -> {peso_alvo} kg). "
            f"O teu objetivo prioritário é eliminar {peso_a_perder_total:.1f} kg de peso e reduzir o BF para {bf_alvo}%. "
            "O algoritmo elimina qualquer fase de ganho de peso (bulk) e foca 100% num défice calórico sustentável."
        )

        if peso_a_perder_total > 7.5:
            perda_f1 = round(peso_a_perder_total * 0.60, 1)
            peso_fim_f1 = round(peso_cursor - perda_f1, 1)
            semanas_f1 = max(6, int(round(perda_f1 / 0.55)))
            bf_fim_f1 = round(bf_cursor - ((perda_f1 / peso_cursor) * 100 * 0.85), 1)
            tdee_f1 = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            calorias_f1 = round(tdee_f1 - 500.0, 0)

            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="cut_primario",
                nome_exibicao=f"Fase 1: Queima Ativa de Gordura ({peso_cursor} kg -> {peso_fim_f1} kg)",
                duracao_semanas=semanas_f1,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_fim_f1,
                bf_fim_estimado=bf_fim_f1,
                calorias_diarias=calorias_f1,
                macros={
                    "proteina_g": round(peso_cursor * 2.3, 1),
                    "gordura_g": round(peso_cursor * 0.75, 1),
                    "hidratos_g": round((calorias_f1 - (peso_cursor * 2.3 * 4 + peso_cursor * 0.75 * 9)) / 4, 1),
                    "fibras_g": 35.0
                },
                cardio_minutos_semana=130,
                series_trabalho_semana=14,
                descricao_estrategia=f"Défice controlado (-500 kcal/dia) para queimar os primeiros {perda_f1} kg com alta proteína.",
                foco_treino="Preservação de cargas nos compostos pesados."
            ))
            peso_cursor = peso_fim_f1
            bf_cursor = bf_fim_f1
            semanas_acumuladas += semanas_f1
            fase_num += 1

            # Diet break metabólico de 2 semanas com transição adaptada (+350 kcal sobre a fase anterior)
            # Previne choque gastrointestinal, hipercompensação hídrica descontrolada e respeita a termogénese adaptativa
            semanas_f2 = 2
            tdee_f2_teorico = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            tdee_f2_adaptado = round(tdee_f2_teorico * 0.88, 0)
            calorias_f2 = round(min(tdee_f2_adaptado, calorias_f1 + 350.0), 0)

            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="diet_break",
                nome_exibicao=f"Fase 2: Reset Metabólico (Diet Break nos {peso_cursor} kg)",
                duracao_semanas=semanas_f2,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_cursor,
                bf_fim_estimado=bf_cursor,
                calorias_diarias=calorias_f2,
                macros={
                    "proteina_g": round(peso_cursor * 2.0, 1),
                    "gordura_g": round(peso_cursor * 0.85, 1),
                    "hidratos_g": round((calorias_f2 - (peso_cursor * 2.0 * 4 + peso_cursor * 0.85 * 9)) / 4, 1),
                    "fibras_g": 35.0
                },
                cardio_minutos_semana=70,
                series_trabalho_semana=12,
                descricao_estrategia="Aumento gradual e controlado (+350 kcal/dia) para manutenção adaptada. Previne choque digestivo, restaura leptina e tiróide e protege contra rebote de peso antes do corte final.",
                foco_treino="Treino de manutenção neural com volume reduzido."
            ))
            semanas_acumuladas += semanas_f2
            fase_num += 1

            # Cut final: reintrodução do défice a partir da manutenção adaptada
            perda_f3 = round(peso_cursor - peso_alvo, 1)
            semanas_f3 = max(4, int(round(perda_f3 / 0.50)))
            calorias_f3 = round(calorias_f2 - 450.0, 0)

            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="cut_final",
                nome_exibicao=f"Fase 3: Secagem Final de Lapidação ({peso_cursor} kg -> {peso_alvo} kg)",
                duracao_semanas=semanas_f3,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_alvo,
                bf_fim_estimado=bf_alvo,
                calorias_diarias=calorias_f3,
                macros={
                    "proteina_g": round(peso_alvo * 2.4, 1),
                    "gordura_g": round(peso_alvo * 0.75, 1),
                    "hidratos_g": round((calorias_f3 - (peso_alvo * 2.4 * 4 + peso_alvo * 0.75 * 9)) / 4, 1),
                    "fibras_g": 35.0
                },
                cardio_minutos_semana=150,
                series_trabalho_semana=14,
                descricao_estrategia=f"Eliminar os últimos {perda_f3} kg de gordura e fixar exatamente {peso_alvo} kg a {bf_alvo}%.",
                foco_treino="Intensidade alta, 150 min de cardio LISS semanal."
            ))
            semanas_acumuladas += semanas_f3

        else:
            semanas_cut = max(6, int(round(peso_a_perder_total / 0.55)))
            tdee_c = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            calorias_c = round(tdee_c - 480.0, 0)

            fases.append(FaseProjeto(
                numero_fase=1,
                tipo="cut_final",
                nome_exibicao=f"Fase Única: Cut Direto de Definição ({peso_cursor} kg -> {peso_alvo} kg)",
                duracao_semanas=semanas_cut,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_alvo,
                bf_fim_estimado=bf_alvo,
                calorias_diarias=calorias_c,
                macros={
                    "proteina_g": round(peso_alvo * 2.3, 1),
                    "gordura_g": round(peso_alvo * 0.8, 1),
                    "hidratos_g": round((calorias_c - (peso_alvo * 2.3 * 4 + peso_alvo * 0.8 * 9)) / 4, 1),
                    "fibras_g": 35.0
                },
                cardio_minutos_semana=140,
                series_trabalho_semana=14,
                descricao_estrategia=f"Défice linear moderado para perder {peso_a_perder_total} kg com preservação de massa magra.",
                foco_treino="Manutenção rígida de cargas nos compostos."
            ))
            semanas_acumuladas = semanas_cut

    # =========================================================================
    # INTENÇÃO NORMAL 2: GANHAR PESO / HIPERTROFIA (peso_alvo > peso_atual)
    # =========================================================================
    elif delta_peso > 0.5:
        tipo_intencao = "ganho_peso"
        eh_mulher = not eh_homem
        # Taxa de ganho de massa magra biologicamente sustentavel (kg/semana)
        # Mulheres ou adultos >= 45 anos tem taxa mais suave para evitar adiposidade visceral
        taxa_semanal_ganho = 0.22 if (eh_mulher or idade >= 45) else 0.35
        superavit_kcal = 220.0 if (eh_mulher or idade >= 45) else 300.0
        gordura_fator = 1.05 if (eh_mulher or idade >= 45) else 0.90

        diagnostico = (
            f"Intenção Identificada: Construção Muscular Limpa ({peso_atual} kg -> {peso_alvo} kg). "
            f"Objetivo linear de ganhar {delta_peso:.1f} kg de massa corporal de forma progressiva e sustentável. "
            f"O algoritmo elimina oscilações e projeta uma trajetória direta de crescimento e consolidação metabólica."
        )

        # CENARIO 1: GANHO MODERADO / PADRAO (ate 8 kg) - 2 a 3 Fases Lineares
        if delta_peso <= 8.0:
            semanas_bulk = max(14, min(24, int(round(delta_peso / taxa_semanal_ganho))))
            tdee_f1 = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            calorias_f1 = round(tdee_f1 + superavit_kcal, 0)
            bf_estimado_pos_bulk = round(min(bf_alvo + 2.0, bf_cursor + (delta_peso * 0.35)), 1)

            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="bulk_progressivo",
                nome_exibicao=f"Fase 1: Lean Bulk Progressivo ({peso_cursor} kg -> {peso_alvo} kg)",
                duracao_semanas=semanas_bulk,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_alvo,
                bf_fim_estimado=bf_estimado_pos_bulk,
                calorias_diarias=calorias_f1,
                macros={
                    "proteina_g": round(peso_cursor * 2.0, 1),
                    "gordura_g": round(peso_cursor * gordura_fator, 1),
                    "hidratos_g": round((calorias_f1 - (peso_cursor * 2.0 * 4 + peso_cursor * gordura_fator * 9)) / 4, 1),
                    "fibras_g": 30.0
                },
                cardio_minutos_semana=60,
                series_trabalho_semana=14 if (eh_mulher or idade >= 45) else 16,
                descricao_estrategia=f"Subida limpa e controlada (+{superavit_kcal:.0f} kcal/dia) de {peso_cursor} kg até {peso_alvo} kg, maximizando síntese proteica sem gordura supérflua.",
                foco_treino="Sobrecarga progressiva estável, prioridade a máquinas guiadas e halteres ergonómicos."
            ))
            peso_cursor = peso_alvo
            bf_cursor = bf_estimado_pos_bulk
            semanas_acumuladas += semanas_bulk
            fase_num += 1

            # Fase 2: Consolidacao Normocalorica (Fixar o peso)
            semanas_cons = 4
            tdee_f2 = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            calorias_f2 = round(tdee_f2, 0)

            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="consolidacao",
                nome_exibicao=f"Fase 2: Consolidação & Fixação Metabólica ({peso_cursor} kg Estáveis)",
                duracao_semanas=semanas_cons,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_cursor,
                bf_fim_estimado=round(bf_cursor - 0.5, 1),
                calorias_diarias=calorias_f2,
                macros={
                    "proteina_g": round(peso_cursor * 2.0, 1),
                    "gordura_g": round(peso_cursor * gordura_fator, 1),
                    "hidratos_g": round((calorias_f2 - (peso_cursor * 2.0 * 4 + peso_cursor * gordura_fator * 9)) / 4, 1),
                    "fibras_g": 30.0
                },
                cardio_minutos_semana=75,
                series_trabalho_semana=12,
                descricao_estrategia=f"Manutenção normocalórica nos {peso_cursor} kg para estabilizar recetores hormonais, densidade muscular e fixar a nova composição corporal.",
                foco_treino="Treino de manutenção de cargas com descanso neuromuscular."
            ))
            semanas_acumuladas += semanas_cons
            fase_num += 1

            # Fase 3 Opcional: Apenas se o BF alvo exigir secagem posterior
            if bf_alvo < (bf_cursor - 2.0):
                semanas_lap = 4
                calorias_f3 = round(calorias_f2 - 350.0, 0)
                fases.append(FaseProjeto(
                    numero_fase=fase_num,
                    tipo="cut_final",
                    nome_exibicao=f"Fase 3: Lapidação Suave ({peso_cursor} kg -> {round(peso_cursor - 0.8, 1)} kg)",
                    duracao_semanas=semanas_lap,
                    peso_inicio_kg=peso_cursor,
                    peso_fim_estimado_kg=round(peso_cursor - 0.8, 1),
                    bf_fim_estimado=bf_alvo,
                    calorias_diarias=calorias_f3,
                    macros={
                        "proteina_g": round(peso_cursor * 2.2, 1),
                        "gordura_g": round(peso_cursor * gordura_fator, 1),
                        "hidratos_g": round((calorias_f3 - (peso_cursor * 2.2 * 4 + peso_cursor * gordura_fator * 9)) / 4, 1),
                        "fibras_g": 30.0
                    },
                    cardio_minutos_semana=110,
                    series_trabalho_semana=12,
                    descricao_estrategia=f"Pequeno polimento de 4 semanas para afinar a definição para os {bf_alvo}% BF sem perder o músculo conquistado.",
                    foco_treino="Preservação estrita das cargas obtidas no bulk."
                ))
                semanas_acumuladas += semanas_lap

        # CENARIO 2: GANHO LONGO (> 8 kg) - Bloco 1 + Diet Break + Bloco 2 + Consolidacao
        else:
            ganho_b1 = round(delta_peso * 0.55, 1)
            peso_fim_b1 = round(peso_cursor + ganho_b1, 1)
            semanas_b1 = max(14, int(round(ganho_b1 / taxa_semanal_ganho)))
            tdee_b1 = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            calorias_b1 = round(tdee_b1 + superavit_kcal, 0)

            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="bulk_1",
                nome_exibicao=f"Fase 1: Lean Bulk - Bloco Inicial ({peso_cursor} kg -> {peso_fim_b1} kg)",
                duracao_semanas=semanas_b1,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_fim_b1,
                bf_fim_estimado=round(bf_cursor + 2.0, 1),
                calorias_diarias=calorias_b1,
                macros={
                    "proteina_g": round(peso_cursor * 2.0, 1),
                    "gordura_g": round(peso_cursor * gordura_fator, 1),
                    "hidratos_g": round((calorias_b1 - (peso_cursor * 2.0 * 4 + peso_cursor * gordura_fator * 9)) / 4, 1),
                    "fibras_g": 35.0
                },
                cardio_minutos_semana=60,
                series_trabalho_semana=14,
                descricao_estrategia=f"Primeiro bloco de crescimento até aos {peso_fim_b1} kg.",
                foco_treino="Sobrecarga progressiva constante."
            ))
            peso_cursor = peso_fim_b1
            semanas_acumuladas += semanas_b1
            fase_num += 1

            # Pausa metabolica de 3 semanas
            semanas_db = 3
            tdee_db = calcular_tdee_dinamico(peso_cursor, bf_cursor + 2.0, nivel_atividade)
            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="diet_break",
                nome_exibicao=f"Fase 2: Pausa & Consolidação Metabólica ({peso_cursor} kg Estáveis)",
                duracao_semanas=semanas_db,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_cursor,
                bf_fim_estimado=round(bf_cursor + 1.5, 1),
                calorias_diarias=round(tdee_db, 0),
                macros={
                    "proteina_g": round(peso_cursor * 2.0, 1),
                    "gordura_g": round(peso_cursor * gordura_fator, 1),
                    "hidratos_g": round((tdee_db - (peso_cursor * 2.0 * 4 + peso_cursor * gordura_fator * 9)) / 4, 1),
                    "fibras_g": 30.0
                },
                cardio_minutos_semana=80,
                series_trabalho_semana=12,
                descricao_estrategia="Descompressão digestiva de 3 semanas para restabelecer a sensibilidade insulínica.",
                foco_treino="Volume moderado com foco em recuperação."
            ))
            semanas_acumuladas += semanas_db
            fase_num += 1

            # Bloco 2 ate a meta final
            semanas_b2 = max(12, int(round((peso_alvo - peso_cursor) / taxa_semanal_ganho)))
            tdee_b2 = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            calorias_b2 = round(tdee_b2 + superavit_kcal, 0)
            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="bulk_2",
                nome_exibicao=f"Fase 3: Lean Bulk - Construção Final ({peso_cursor} kg -> {peso_alvo} kg)",
                duracao_semanas=semanas_b2,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_alvo,
                bf_fim_estimado=bf_alvo,
                calorias_diarias=calorias_b2,
                macros={
                    "proteina_g": round(peso_cursor * 2.0, 1),
                    "gordura_g": round(peso_cursor * gordura_fator, 1),
                    "hidratos_g": round((calorias_b2 - (peso_cursor * 2.0 * 4 + peso_cursor * gordura_fator * 9)) / 4, 1),
                    "fibras_g": 35.0
                },
                cardio_minutos_semana=60,
                series_trabalho_semana=16,
                descricao_estrategia=f"Atingir exatamente a meta de {peso_alvo} kg.",
                foco_treino="Intensidade alta nos compostos."
            ))
            peso_cursor = peso_alvo
            semanas_acumuladas += semanas_b2
            fase_num += 1

            # Consolidacao Final
            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="consolidacao",
                nome_exibicao=f"Fase 4: Consolidação Definitiva ({peso_alvo} kg)",
                duracao_semanas=4,
                peso_inicio_kg=peso_alvo,
                peso_fim_estimado_kg=peso_alvo,
                bf_fim_estimado=bf_alvo,
                calorias_diarias=round(calcular_tdee_dinamico(peso_alvo, bf_alvo, nivel_atividade), 0),
                macros={
                    "proteina_g": round(peso_alvo * 2.0, 1),
                    "gordura_g": round(peso_alvo * gordura_fator, 1),
                    "hidratos_g": round((calcular_tdee_dinamico(peso_alvo, bf_alvo, nivel_atividade) - (peso_alvo * 2.0 * 4 + peso_alvo * gordura_fator * 9)) / 4, 1),
                    "fibras_g": 30.0
                },
                cardio_minutos_semana=70,
                series_trabalho_semana=12,
                descricao_estrategia="Fixação permanente da nova massa corporal.",
                foco_treino="Treino regular equilibrado."
            ))
            semanas_acumuladas += 4

    # =========================================================================
    # INTENÇÃO NORMAL 3: RECOMPOSIÇÃO NO MESMO PESO (peso_alvo == peso_atual)
    # =========================================================================
    else:
        tipo_intencao = "recomposicao_mesmo_peso"
        diagnostico = (
            f"Intenção Identificada: Recomposição Corporal Pura no Mesmo Peso ({peso_atual} kg). "
            f"O objetivo é manter exatamente os teus {peso_atual} kg na balança enquanto reduzes o BF de {bf_atual}% "
            f"para {bf_alvo}%, trocando gordura diretamente por tecido muscular em calorias de manutenção."
        )
        semanas_recomp = 16
        tdee_r = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)

        fases.append(FaseProjeto(
            numero_fase=1,
            tipo="recomposicao",
            nome_exibicao=f"Fase Única: Recomposição Corporal Pura ({peso_cursor} kg Estáveis)",
            duracao_semanas=semanas_recomp,
            peso_inicio_kg=peso_cursor,
            peso_fim_estimado_kg=peso_cursor,
            bf_fim_estimado=bf_alvo,
            calorias_diarias=tdee_r,
            macros={
                "proteina_g": round(peso_cursor * 2.4, 1),
                "gordura_g": round(peso_cursor * 0.85, 1),
                "hidratos_g": round((tdee_r - (peso_cursor * 2.4 * 4 + peso_cursor * 0.85 * 9)) / 4, 1),
                "fibras_g": 35.0
            },
            cardio_minutos_semana=90,
            series_trabalho_semana=14,
            descricao_estrategia=f"Manutenção isocalórica nos {peso_cursor} kg com alta proteína e treino pesado para queimar gordura e ganhar músculo simultaneamente.",
            foco_treino="Sobrecarga progressiva constante em isocaloria."
        ))
        semanas_acumuladas = semanas_recomp

    meses_totais = round(semanas_acumuladas / 4.33, 1)

    return RelatorioProjetoMetas(
        peso_atual_kg=peso_atual,
        bf_atual_percentual=bf_atual,
        massa_magra_atual_kg=massa_magra_atual,
        massa_gorda_atual_kg=massa_gorda_atual,
        peso_alvo_kg=peso_alvo,
        bf_alvo_percentual=bf_alvo,
        massa_magra_alvo_kg=massa_magra_alvo,
        massa_gorda_alvo_kg=massa_gorda_alvo,
        massa_magra_a_ganhar_kg=delta_massa_magra,
        gordura_a_perder_kg=max(0.0, round(massa_gorda_atual - massa_gorda_alvo, 2)),
        semanas_totais_estimadas=semanas_acumuladas,
        meses_estimados=meses_totais,
        nivel_experiencia=nivel_experiencia,
        estrategia_inicial=estrategia_inicial,
        tipo_intencao=tipo_intencao,
        diagnostico_fisiologico=diagnostico,
        bloqueio_bulk_por_bf=bloqueio_bulk,
        fases=fases
    )
