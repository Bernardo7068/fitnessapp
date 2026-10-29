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

        # CASO 2.1: RECOMPOSIÇÃO INICIAL (Piso nos kg atuais!)
        if estrategia_inicial == "recomposicao":
            diagnostico = (
                f"Intenção Identificada: Construção Muscular com Recomposição Inicial ({peso_atual} kg -> {peso_alvo} kg). "
                f"Piso Mínimo Garantido: {peso_atual} kg (a balança nunca baixa deste valor). "
                f"A Fase 1 mantém os teus {peso_atual} kg estáveis enquanto queima gordura e constrói músculo novo. "
                f"Depois o corpo sobe progressivamente de {peso_atual} kg até aos {peso_alvo} kg."
            )

            semanas_f1 = 10
            tdee_f1 = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            recomp_musculo = 2.5
            lbm_pos_recomp = lbm_cursor + recomp_musculo
            gordura_pos_recomp = (peso_cursor * (bf_cursor / 100.0)) - recomp_musculo
            bf_pos_recomp = round((gordura_pos_recomp / peso_cursor) * 100.0, 1)

            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="recomposicao",
                nome_exibicao=f"Fase 1: Recomposição & Preparação ({peso_cursor} kg Estáveis)",
                duracao_semanas=semanas_f1,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_cursor,
                bf_fim_estimado=bf_pos_recomp,
                calorias_diarias=tdee_f1,
                macros={
                    "proteina_g": round(peso_cursor * 2.4, 1),
                    "gordura_g": round(peso_cursor * 0.85, 1),
                    "hidratos_g": round((tdee_f1 - (peso_cursor * 2.4 * 4 + peso_cursor * 0.85 * 9)) / 4, 1),
                    "fibras_g": 35.0
                },
                cardio_minutos_semana=80,
                series_trabalho_semana=14,
                descricao_estrategia=f"O teu peso mantém-se nos {peso_cursor} kg. O corpo troca gordura por músculo novo em manutenção calórica para preparar a sensibilidade à insulina antes do bulk.",
                foco_treino="Sobrecarga progressiva nos compostos base. Fortalecimento tendinoso."
            ))
            bf_cursor = bf_pos_recomp
            lbm_cursor = lbm_pos_recomp
            semanas_acumuladas += semanas_f1
            fase_num += 1

            salto_f2 = round((peso_alvo - peso_cursor) * 0.50, 1)
            peso_fim_f2 = round(peso_cursor + salto_f2, 1)
            semanas_f2 = max(16, int(round(salto_f2 / 0.40)))
            tdee_f2 = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            calorias_f2 = round(tdee_f2 + 300.0, 0)
            bf_fim_f2 = round(bf_cursor + 2.0, 1)

            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="bulk_1",
                nome_exibicao=f"Fase 2: Lean Bulk 1 / Crescimento ({peso_cursor} kg -> {peso_fim_f2} kg)",
                duracao_semanas=semanas_f2,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_fim_f2,
                bf_fim_estimado=bf_fim_f2,
                calorias_diarias=calorias_f2,
                macros={
                    "proteina_g": round(peso_cursor * 2.1, 1),
                    "gordura_g": round(peso_cursor * 0.95, 1),
                    "hidratos_g": round((calorias_f2 - (peso_cursor * 2.1 * 4 + peso_cursor * 0.95 * 9)) / 4, 1),
                    "fibras_g": 35.0
                },
                cardio_minutos_semana=60,
                series_trabalho_semana=16,
                descricao_estrategia=f"Subida controlada de {peso_cursor} kg para {peso_fim_f2} kg com superávit limpo (+300 kcal/dia).",
                foco_treino="Double Progression ativa nos compostos."
            ))
            peso_cursor = peso_fim_f2
            bf_cursor = bf_fim_f2
            semanas_acumuladas += semanas_f2
            fase_num += 1

            # Mini-Consolidação
            peso_fim_f3 = round(peso_cursor - 2.5, 1)
            semanas_f3 = 5
            tdee_f3 = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)

            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="resensibilizacao",
                nome_exibicao=f"Fase 3: Mini-Consolidação e Limpeza ({peso_cursor} kg -> {peso_fim_f3} kg)",
                duracao_semanas=semanas_f3,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_fim_f3,
                bf_fim_estimado=round(bf_cursor - 1.5, 1),
                calorias_diarias=round(tdee_f3 - 480.0, 0),
                macros={
                    "proteina_g": round(peso_cursor * 2.3, 1),
                    "gordura_g": round(peso_cursor * 0.8, 1),
                    "hidratos_g": round((tdee_f3 - 480.0 - (peso_cursor * 2.3 * 4 + peso_cursor * 0.8 * 9)) / 4, 1),
                    "fibras_g": 30.0
                },
                cardio_minutos_semana=110,
                series_trabalho_semana=12,
                descricao_estrategia="Pausa de 5 semanas para queimar gordura superficial e restabelecer a sensibilidade dos recetores musculares.",
                foco_treino="Volume baixo, foco em força pura."
            ))
            peso_cursor = peso_fim_f3
            bf_cursor = round(bf_cursor - 1.5, 1)
            semanas_acumuladas += semanas_f3
            fase_num += 1

            # Bulk 2
            peso_fim_f4 = round(peso_alvo + 4.5, 1)
            semanas_f4 = max(20, int(round((peso_fim_f4 - peso_cursor) / 0.45)))
            tdee_f4 = calcular_tdee_dinamico(peso_fim_f4 * 0.9, bf_cursor, nivel_atividade)
            calorias_f4 = round(tdee_f4 + 350.0, 0)

            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="bulk_2",
                nome_exibicao=f"Fase 4: Lean Bulk 2 / Densidade Máxima ({peso_cursor} kg -> {peso_fim_f4} kg)",
                duracao_semanas=semanas_f4,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_fim_f4,
                bf_fim_estimado=round(bf_cursor + 2.5, 1),
                calorias_diarias=calorias_f4,
                macros={
                    "proteina_g": round(peso_cursor * 2.0, 1),
                    "gordura_g": round(peso_cursor * 0.95, 1),
                    "hidratos_g": round((calorias_f4 - (peso_cursor * 2.0 * 4 + peso_cursor * 0.95 * 9)) / 4, 1),
                    "fibras_g": 40.0
                },
                cardio_minutos_semana=60,
                series_trabalho_semana=18,
                descricao_estrategia=f"Construção da massa magra final até criar lastro nos {peso_fim_f4} kg para a secagem final.",
                foco_treino="Volume alto (MAV). Deload a cada 5-6 semanas."
            ))
            peso_cursor = peso_fim_f4
            bf_cursor = round(bf_cursor + 2.5, 1)
            semanas_acumuladas += semanas_f4
            fase_num += 1

            # Cut Final
            semanas_f5 = 9
            tdee_f5 = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            calorias_f5 = round(tdee_f5 - 500.0, 0)

            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="cut_final",
                nome_exibicao=f"Fase 5: Cut Final de Lapidação ({peso_cursor} kg -> {peso_alvo} kg)",
                duracao_semanas=semanas_f5,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_alvo,
                bf_fim_estimado=bf_alvo,
                calorias_diarias=calorias_f5,
                macros={
                    "proteina_g": round(peso_alvo * 2.3, 1),
                    "gordura_g": round(peso_alvo * 0.8, 1),
                    "hidratos_g": round((calorias_f5 - (peso_alvo * 2.3 * 4 + peso_alvo * 0.8 * 9)) / 4, 1),
                    "fibras_g": 35.0
                },
                cardio_minutos_semana=150,
                series_trabalho_semana=14,
                descricao_estrategia=f"Derreter a gordura residual até atingir exatamente {peso_alvo} kg com {bf_alvo}% BF.",
                foco_treino="Preservação de cargas nos compostos."
            ))
            semanas_acumuladas += semanas_f5

        # CASO 2.2: LEAN BULK DIRETO
        elif estrategia_inicial == "bulk_direto":
            diagnostico = (
                f"Intenção Identificada: Lean Bulk Imediato ({peso_atual} kg -> {peso_alvo} kg). "
                f"O algoritmo inicia a subida de peso logo a partir dos {peso_atual} kg com superávit controlado."
            )
            peso_meta_b = round(peso_alvo + 3.5, 1)
            semanas_b = max(20, int(round((peso_meta_b - peso_cursor) / 0.38)))
            tdee_b = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)

            fases.append(FaseProjeto(
                numero_fase=1,
                tipo="bulk_1",
                nome_exibicao=f"Fase 1: Lean Bulk Direto ({peso_cursor} kg -> {peso_meta_b} kg)",
                duracao_semanas=semanas_b,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_meta_b,
                bf_fim_estimado=round(bf_cursor + 2.5, 1),
                calorias_diarias=round(tdee_b + 280.0, 0),
                macros={
                    "proteina_g": round(peso_cursor * 2.1, 1),
                    "gordura_g": round(peso_cursor * 0.9, 1),
                    "hidratos_g": round((tdee_b + 280.0 - (peso_cursor * 2.1 * 4 + peso_cursor * 0.9 * 9)) / 4, 1),
                    "fibras_g": 35.0
                },
                cardio_minutos_semana=60,
                series_trabalho_semana=16,
                descricao_estrategia=f"Subida de peso contínua a partir dos {peso_cursor} kg.",
                foco_treino="Double progression constante."
            ))
            semanas_acumuladas += semanas_b

            semanas_cut = 8
            tdee_c = calcular_tdee_dinamico(peso_meta_b, bf_cursor, nivel_atividade)
            fases.append(FaseProjeto(
                numero_fase=2,
                tipo="cut_final",
                nome_exibicao=f"Fase 2: Cut de Lapidação ({peso_meta_b} kg -> {peso_alvo} kg)",
                duracao_semanas=semanas_cut,
                peso_inicio_kg=peso_meta_b,
                peso_fim_estimado_kg=peso_alvo,
                bf_fim_estimado=bf_alvo,
                calorias_diarias=round(tdee_c - 480.0, 0),
                macros={
                    "proteina_g": round(peso_alvo * 2.3, 1),
                    "gordura_g": round(peso_alvo * 0.8, 1),
                    "hidratos_g": round((tdee_c - 480.0 - (peso_alvo * 2.3 * 4 + peso_alvo * 0.8 * 9)) / 4, 1),
                    "fibras_g": 30.0
                },
                cardio_minutos_semana=140,
                series_trabalho_semana=14,
                descricao_estrategia=f"Definição final para atingir {peso_alvo} kg a {bf_alvo}%.",
                foco_treino="Intensidade alta com volume moderado."
            ))
            semanas_acumuladas += semanas_cut

        # CASO 2.3: MINI-CUT PREPARATÓRIO
        else:
            descida_dinamica = round(peso_atual * 0.06, 1)
            peso_fim_f1 = round(peso_cursor - descida_dinamica, 1)
            semanas_f1 = 7
            tdee_f1 = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)

            diagnostico = (
                f"Estratégia Escolhida: Mini-Cut Preparatório Dinâmico ({peso_atual} kg -> {peso_fim_f1} kg). "
                f"Redução calculada de apenas ~{descida_dinamica} kg (6% do teu peso atual) para otimizar o particionamento "
                "de nutrientes antes de iniciar a subida progressiva para os " + str(peso_alvo) + " kg."
            )

            fases.append(FaseProjeto(
                numero_fase=1,
                tipo="cut_inicial",
                nome_exibicao=f"Fase 1: Mini-Cut Preparatório ({peso_cursor} kg -> {peso_fim_f1} kg)",
                duracao_semanas=semanas_f1,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_fim_f1,
                bf_fim_estimado=round(bf_cursor - 4.0, 1),
                calorias_diarias=round(tdee_f1 - 500.0, 0),
                macros={
                    "proteina_g": round(peso_cursor * 2.4, 1),
                    "gordura_g": round(peso_cursor * 0.75, 1),
                    "hidratos_g": round((tdee_f1 - 500.0 - (peso_cursor * 2.4 * 4 + peso_cursor * 0.75 * 9)) / 4, 1),
                    "fibras_g": 30.0
                },
                cardio_minutos_semana=120,
                series_trabalho_semana=12,
                descricao_estrategia=f"Redução temporária de {descida_dinamica} kg para preparar o particionamento antes de iniciar a subida.",
                foco_treino="Volume reduzido, cargas pesadas."
            ))
            peso_cursor = peso_fim_f1
            bf_cursor = round(bf_cursor - 4.0, 1)
            semanas_acumuladas += semanas_f1

            peso_meta_b = round(peso_alvo + 4.0, 1)
            semanas_b = max(24, int(round((peso_meta_b - peso_cursor) / 0.40)))
            tdee_b = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            fases.append(FaseProjeto(
                numero_fase=2,
                tipo="bulk_1",
                nome_exibicao=f"Fase 2: Lean Bulk ({peso_cursor} kg -> {peso_meta_b} kg)",
                duracao_semanas=semanas_b,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_meta_b,
                bf_fim_estimado=round(bf_cursor + 4.0, 1),
                calorias_diarias=round(tdee_b + 300.0, 0),
                macros={
                    "proteina_g": round(peso_cursor * 2.1, 1),
                    "gordura_g": round(peso_cursor * 0.95, 1),
                    "hidratos_g": round((tdee_b + 300.0 - (peso_cursor * 2.1 * 4 + peso_cursor * 0.95 * 9)) / 4, 1),
                    "fibras_g": 35.0
                },
                cardio_minutos_semana=60,
                series_trabalho_semana=16,
                descricao_estrategia=f"Construção limpa até aos {peso_meta_b} kg.",
                foco_treino="Sobrecarga progressiva."
            ))
            semanas_acumuladas += semanas_b

            semanas_c = 8
            tdee_c = calcular_tdee_dinamico(peso_meta_b, bf_cursor, nivel_atividade)
            fases.append(FaseProjeto(
                numero_fase=3,
                tipo="cut_final",
                nome_exibicao=f"Fase 3: Cut Final ({peso_meta_b} kg -> {peso_alvo} kg)",
                duracao_semanas=semanas_c,
                peso_inicio_kg=peso_meta_b,
                peso_fim_estimado_kg=peso_alvo,
                bf_fim_estimado=bf_alvo,
                calorias_diarias=round(tdee_c - 500.0, 0),
                macros={
                    "proteina_g": round(peso_alvo * 2.3, 1),
                    "gordura_g": round(peso_alvo * 0.8, 1),
                    "hidratos_g": round((tdee_c - 500.0 - (peso_alvo * 2.3 * 4 + peso_alvo * 0.8 * 9)) / 4, 1),
                    "fibras_g": 30.0
                },
                cardio_minutos_semana=140,
                series_trabalho_semana=14,
                descricao_estrategia=f"Secagem até fixar em {peso_alvo} kg a {bf_alvo}%.",
                foco_treino="Manutenção rígida de cargas."
            ))
            semanas_acumuladas += semanas_c

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
