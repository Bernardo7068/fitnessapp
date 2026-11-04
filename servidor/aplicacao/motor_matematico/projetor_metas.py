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
    observacoes_contexto: str = ""
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
    estrategia_inicial: str = "recomposicao",
    observacoes_contexto: str = ""
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
    # =========================================================================
    # INTENÇÃO NORMAL 2: GANHAR PESO / HIPERTROFIA (peso_alvo > peso_atual)
    # Suporta 4 estratégias reais adaptadas à condição individual do atleta:
    # 1. retorno_reabilitacao_bulk: Readaptação prévia após paragem/lesão (ex: acromioclavicular)
    # 2. bulk_cut_atletico: Periodização clássica (sobrecarga além da meta + lapidação final)
    # 3. recomposicao: Priming metabólico no peso atual antes do superávit
    # 4. lean_bulk_linear: Subida direta e limpa até à meta com consolidação
    # =========================================================================
    elif delta_peso > 0.5:
        tipo_intencao = "ganho_peso"
        eh_mulher = not eh_homem
        taxa_semanal_ganho = 0.22 if (eh_mulher or idade >= 45) else 0.35
        taxa_ganho = taxa_semanal_ganho
        superavit_base = 220.0 if (eh_mulher or idade >= 45) else 320.0
        gordura_fator = 1.05 if (eh_mulher or idade >= 45) else 0.85

        obs_lower = observacoes_contexto.lower()
        tem_paragem_ou_lesao = any(k in obs_lower for k in [
            "parado", "parada", "estive parado", "meses sem treinar", "tempo sem treinar",
            "voltar a treinar", "retorno", "lesao", "lesão", "acromio", "acromioclavicular",
            "readaptacao", "readaptação", "recuperar", "descondicionado", "reabilita",
            "reabilitar", "reabilitacao", "reabilitação", "fisioterapia", "tendinite", "bursite"
        ])
        tem_acromio = any(k in obs_lower for k in ["acromio", "acromioclavicular", "clavicular"])
        detalhe_clinico = " (com aten??o especial ? articula??o acromioclavicular)" if tem_acromio else ""

        # =========================================================================
        # ESTRAT?GIA 1: BULK & CUT ATL?TICO / PERIODIZA??O AVAN?ADA
        # =========================================================================
        if estrategia_inicial == "bulk_cut_atletico":
            overshoot_kg = 3.0
            peso_pico = round(peso_alvo + overshoot_kg, 1)

            if tem_paragem_ou_lesao:
                diagnostico = (
                    f"Inten??o: Periodiza??o Atl?tica Completa (Bulk & Cut) com Readapta??o Inicial P?s-Les?o/Paragem ({peso_atual} kg -> {peso_alvo} kg a {bf_alvo}% BF). "
                    f"Contexto individual considerado: '{observacoes_contexto}'. "
                    f"O motor inicia com uma Fase 1 de Readapta??o Neuromuscular ({peso_atual} kg est?veis, RPE ? 7.0, cad?ncia 3-0-2-0{detalhe_clinico}) "
                    f"para restaurar tend?es e articula??es. Segue-se a sobrecarga anab?lica atl?tica (+{overshoot_kg} kg de lastro at? aos {peso_pico} kg), "
                    f"pausa metab?lica e o Mini-Cut Final de lapida??o para atingir exatamente {peso_alvo} kg secos a {bf_alvo}% BF."
                )
                # Inserir Fase 1: Readapta??o
                semanas_readapt = 5
                tdee_f1 = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
                calorias_f1 = round(tdee_f1 + 100.0, 0)
                foco_readapt = (
                    "Prote??o acromioclavicular e manguito: Supino em pegada neutra (45?), "
                    "face pulls, cad?ncia exc?ntrica 3-0-2-0 e cargas a RPE ? 7.0."
                    if tem_acromio else
                    "Reativa??o motora e vasculariza??o tendinosa: RPE contido em 7.0, cad?ncia 3-0-2-0."
                )
                fases.append(FaseProjeto(
                    numero_fase=fase_num,
                    tipo="readaptacao_retorno",
                    nome_exibicao=f"Fase 1: Readapta??o Neuromuscular & Prote??o Articular ({peso_cursor} kg Est?veis)",
                    duracao_semanas=semanas_readapt,
                    peso_inicio_kg=peso_cursor,
                    peso_fim_estimado_kg=peso_cursor,
                    bf_fim_estimado=bf_cursor,
                    calorias_diarias=calorias_f1,
                    macros={
                        "proteina_g": round(peso_cursor * 2.2, 1),
                        "gordura_g": round(peso_cursor * gordura_fator, 1),
                        "hidratos_g": round((calorias_f1 - (peso_cursor * 2.2 * 4 + peso_cursor * gordura_fator * 9)) / 4, 1),
                        "fibras_g": 30.0
                    },
                    cardio_minutos_semana=75,
                    series_trabalho_semana=12,
                    descricao_estrategia="Per?odo de transi??o indispens?vel p?s-les?o/paragem: restaura vasculariza??o e colag?nio antes da sobrecarga pesada.",
                    foco_treino=foco_readapt
                ))
                semanas_acumuladas += semanas_readapt
                fase_num += 1
            else:
                diagnostico = (
                    f"Inten??o: Periodiza??o Atl?tica Avan?ada ({peso_atual} kg -> {peso_alvo} kg a {bf_alvo}% BF). "
                    f"Estrat?gia de Alto Rendimento: Ganho de lastro anab?lico ultrapassando a meta (+{overshoot_kg} kg de overshoot at? {peso_pico} kg), "
                    f"seguido de pausa metab?lica e fase de lapida??o para atingir exatamente {peso_alvo} kg extremamente definidos."
                )

            # Fase Bulk de Sobrecarga (Lastro at? peso_pico)
            delta_bulk = round(peso_pico - peso_cursor, 1)
            semanas_bulk = max(16, int(round(delta_bulk / taxa_ganho)))
            tdee_bulk = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            calorias_bulk = round(tdee_bulk + superavit_base + 80.0, 0)
            bf_pico = round(bf_cursor + 3.0, 1)

            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="bulk_sobrecarga",
                nome_exibicao=f"Fase {fase_num}: Bulk de Sobrecarga Anab?lica ({peso_cursor} kg -> {peso_pico} kg)",
                duracao_semanas=semanas_bulk,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_pico,
                bf_fim_estimado=bf_pico,
                calorias_diarias=calorias_bulk,
                macros={
                    "proteina_g": round(peso_cursor * 2.0, 1),
                    "gordura_g": round(peso_cursor * gordura_fator, 1),
                    "hidratos_g": round((calorias_bulk - (peso_cursor * 2.0 * 4 + peso_cursor * gordura_fator * 9)) / 4, 1),
                    "fibras_g": 35.0
                },
                cardio_minutos_semana=60,
                series_trabalho_semana=16,
                descricao_estrategia=f"Constru??o de lastro muscular em super?vit consistente (+{superavit_base+80:.0f} kcal) ultrapassando a meta em +{overshoot_kg} kg.",
                foco_treino="Sobrecarga progressiva pesada nos compostos e volume anab?lico."
            ))
            peso_cursor = peso_pico
            bf_cursor = bf_pico
            semanas_acumuladas += semanas_bulk
            fase_num += 1

            # Fase Pausa & Descompress?o Metab?lica
            semanas_db = 3
            tdee_db = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="diet_break",
                nome_exibicao=f"Fase {fase_num}: Pausa & Descompress?o Metab?lica ({peso_cursor} kg Est?veis)",
                duracao_semanas=semanas_db,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_cursor,
                bf_fim_estimado=round(bf_cursor - 0.5, 1),
                calorias_diarias=round(tdee_db, 0),
                macros={
                    "proteina_g": round(peso_cursor * 2.0, 1),
                    "gordura_g": round(peso_cursor * gordura_fator, 1),
                    "hidratos_g": round((tdee_db - (peso_cursor * 2.0 * 4 + peso_cursor * gordura_fator * 9)) / 4, 1),
                    "fibras_g": 30.0
                },
                cardio_minutos_semana=75,
                series_trabalho_semana=12,
                descricao_estrategia="Descompress?o digestiva para restaurar a sensibilidade dos recetores musculares antes do corte.",
                foco_treino="Volume moderado com ?nfase em descanso do SNC."
            ))
            semanas_acumuladas += semanas_db
            fase_num += 1

            # Fase Cut Final de Lapida??o (peso_pico -> peso_alvo)
            semanas_cut = max(5, int(round(overshoot_kg / 0.50)))
            tdee_cut = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            calorias_cut = round(tdee_cut - 450.0, 0)

            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="cut_final",
                nome_exibicao=f"Fase {fase_num}: Cut Final de Lapida??o ({peso_cursor} kg -> {peso_alvo} kg)",
                duracao_semanas=semanas_cut,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_alvo,
                bf_fim_estimado=bf_alvo,
                calorias_diarias=calorias_cut,
                macros={
                    "proteina_g": round(peso_alvo * 2.3, 1),
                    "gordura_g": round(peso_alvo * gordura_fator, 1),
                    "hidratos_g": round((calorias_cut - (peso_alvo * 2.3 * 4 + peso_alvo * gordura_fator * 9)) / 4, 1),
                    "fibras_g": 35.0
                },
                cardio_minutos_semana=130,
                series_trabalho_semana=14,
                descricao_estrategia=f"Queima da gordura superficial acumulada no bulk at? atingir exatamente {peso_alvo} kg a {bf_alvo}% BF.",
                foco_treino="Preserva??o de cargas e intensidade neuromuscular nos compostos."
            ))
            peso_cursor = peso_alvo
            bf_cursor = bf_alvo
            semanas_acumuladas += semanas_cut
            fase_num += 1

            # Fase Consolida??o Definitiva
            tdee_cons = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="consolidacao",
                nome_exibicao=f"Fase {fase_num}: Consolida??o Definitiva ({peso_alvo} kg Est?veis)",
                duracao_semanas=4,
                peso_inicio_kg=peso_alvo,
                peso_fim_estimado_kg=peso_alvo,
                bf_fim_estimado=bf_alvo,
                calorias_diarias=round(tdee_cons, 0),
                macros={
                    "proteina_g": round(peso_alvo * 2.0, 1),
                    "gordura_g": round(peso_alvo * gordura_fator, 1),
                    "hidratos_g": round((tdee_cons - (peso_alvo * 2.0 * 4 + peso_alvo * gordura_fator * 9)) / 4, 1),
                    "fibras_g": 30.0
                },
                cardio_minutos_semana=70,
                series_trabalho_semana=12,
                descricao_estrategia="Fixa??o da nova composi??o corporal no peso seco conquistado.",
                foco_treino="Treino est?vel de manuten??o e densidade."
            ))
            semanas_acumuladas += 4

        # =========================================================================
        # ESTRAT?GIA 2: RECOMPOSI??O PRIMING + BULK
        # =========================================================================
        elif estrategia_inicial in ["recomposicao", "recomposicao_priming"]:
            if tem_paragem_ou_lesao:
                diagnostico = (
                    f"Inten??o: S?ntese de Recomposi??o Inicial (Priming) + Readapta??o Neuromuscular e Lean Bulk ({peso_atual} kg -> {peso_alvo} kg). "
                    f"Contexto individual considerado: '{observacoes_contexto}'. "
                    f"O motor unificou os dois objetivos na Fase 1: 6 semanas no peso atual para recomposi??o corporal "
                    f"(ganho de massa magra por mem?ria muscular e redu??o de gordura em manuten??o cal?rica) sob protocolo protegido{detalhe_clinico} "
                    f"com RPE ? 7.0 e cad?ncia exc?ntrica 3-0-2-0, preparando as estruturas para a progress?o segura do Lean Bulk."
                )
                nome_fase1 = f"Fase 1: Readapta??o & Recomposi??o Inicial ({peso_cursor} kg Est?veis)"
                desc_fase1 = "Recomposi??o isocal?rica com recupera??o articular: ganho de t?nus e queima de gordura sem sobrecarga mec?nica pesada."
                bf_fase1_fim = round(max(bf_alvo, bf_cursor - 1.0), 1)
            else:
                diagnostico = (
                    f"Inten??o: Recomposi??o Inicial (Priming) + Lean Bulk ({peso_atual} kg -> {peso_alvo} kg). "
                    f"Fase 1 isocal?rica preparat?ria de 6 semanas nos {peso_atual} kg para otimizar sensibilidade insul?nica e densidade "
                    f"antes de iniciar a sobrecarga energ?tica do bulk."
                )
                nome_fase1 = f"Fase 1: Recomposi??o & Priming Metab?lico ({peso_cursor} kg Est?veis)"
                desc_fase1 = "Manuten??o isocal?rica com alta prote?na para melhorar o particionamento de nutrientes antes do ganho de peso."
                bf_fase1_fim = round(max(bf_alvo, bf_cursor - 1.5), 1)

            semanas_recomp = 6
            tdee_f1 = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            foco_f1 = (
                "Prote??o acromioclavicular e manguito: Supino em pegada neutra (45?), face pulls, cad?ncia exc?ntrica 3-0-2-0 e cargas a RPE ? 7.0."
                if (tem_paragem_ou_lesao and tem_acromio) else
                "Reativa??o motora e vasculariza??o tendinosa: RPE contido em 7.0, cad?ncia 3-0-2-0."
                if tem_paragem_ou_lesao else
                "Progress?o de cargas e densidade metab?lica."
            )

            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="readaptacao_recomposicao" if tem_paragem_ou_lesao else "recomposicao_priming",
                nome_exibicao=nome_fase1,
                duracao_semanas=semanas_recomp,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_cursor,
                bf_fim_estimado=bf_fase1_fim,
                calorias_diarias=round(tdee_f1, 0),
                macros={
                    "proteina_g": round(peso_cursor * 2.2, 1),
                    "gordura_g": round(peso_cursor * gordura_fator, 1),
                    "hidratos_g": round((tdee_f1 - (peso_cursor * 2.2 * 4 + peso_cursor * gordura_fator * 9)) / 4, 1),
                    "fibras_g": 30.0
                },
                cardio_minutos_semana=75,
                series_trabalho_semana=12 if tem_paragem_ou_lesao else 14,
                descricao_estrategia=desc_fase1,
                foco_treino=foco_f1
            ))
            bf_cursor = bf_fase1_fim
            semanas_acumuladas += semanas_recomp
            fase_num += 1

            # Fase 2: Lean Bulk Progressivo
            semanas_bulk = max(14, int(round(delta_peso / taxa_ganho)))
            tdee_f2 = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            calorias_f2 = round(tdee_f2 + superavit_base, 0)
            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="bulk_progressivo",
                nome_exibicao=f"Fase 2: Lean Bulk Progressivo ({peso_cursor} kg -> {peso_alvo} kg)",
                duracao_semanas=semanas_bulk,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_alvo,
                bf_fim_estimado=round(bf_cursor + 1.5, 1),
                calorias_diarias=calorias_f2,
                macros={
                    "proteina_g": round(peso_cursor * 2.0, 1),
                    "gordura_g": round(peso_cursor * gordura_fator, 1),
                    "hidratos_g": round((calorias_f2 - (peso_cursor * 2.0 * 4 + peso_cursor * gordura_fator * 9)) / 4, 1),
                    "fibras_g": 30.0
                },
                cardio_minutos_semana=60,
                series_trabalho_semana=14 if (eh_mulher or idade >= 45) else 16,
                descricao_estrategia=f"Subida limpa de peso (+{superavit_base:.0f} kcal) com boa sensibilidade metab?lica.",
                foco_treino="Sobrecarga constante nos compostos base."
            ))
            peso_cursor = peso_alvo
            bf_cursor = round(bf_cursor + 1.5, 1)
            semanas_acumuladas += semanas_bulk
            fase_num += 1

            # Fase 3: Consolida??o
            tdee_f3 = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="consolidacao",
                nome_exibicao=f"Fase 3: Consolida??o Metab?lica ({peso_cursor} kg Est?veis)",
                duracao_semanas=4,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_cursor,
                bf_fim_estimado=bf_alvo,
                calorias_diarias=round(tdee_f3, 0),
                macros={
                    "proteina_g": round(peso_cursor * 2.0, 1),
                    "gordura_g": round(peso_cursor * gordura_fator, 1),
                    "hidratos_g": round((tdee_f3 - (peso_cursor * 2.0 * 4 + peso_cursor * gordura_fator * 9)) / 4, 1),
                    "fibras_g": 30.0
                },
                cardio_minutos_semana=70,
                series_trabalho_semana=12,
                descricao_estrategia=f"Fixa??o permanente da nova composi??o nos {peso_cursor} kg.",
                foco_treino="Treino regular de manuten??o."
            ))
            semanas_acumuladas += 4

        # =========================================================================
        # ESTRAT?GIA 3: RETORNO AOS TREINOS & READAPTA??O P?S-LES?O
        # =========================================================================
        elif estrategia_inicial in ["retorno_reabilitacao", "retorno_reabilitacao_bulk"] or tem_paragem_ou_lesao:
            diagnostico = (
                f"Inten??o: Readapta??o Neuromuscular P?s-Les?o/Paragem e Constru??o Muscular ({peso_atual} kg -> {peso_alvo} kg). "
                f"Contexto individual considerado: '{observacoes_contexto}'. "
                f"O motor introduz uma Fase 1 de transi??o e fortalecimento tendinoso{detalhe_clinico} "
                f"no peso atual para restaurar colag?nio, vasculariza??o e coordena??o motora antes de aplicar super?vit de bulk."
            )
            # Fase 1: Readapta??o
            semanas_readapt = 5
            tdee_f1 = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            calorias_f1 = round(tdee_f1 + 100.0, 0)
            foco_readapt = (
                "Prote??o acromioclavicular e manguito: Supino em pegada neutra (45?), "
                "face pulls, cad?ncia exc?ntrica 3-0-2-0 e cargas a RPE ? 7.0."
                if tem_acromio else
                "Reativa??o motora e vasculariza??o tendinosa: RPE contido em 7.0, cad?ncia 3-0-2-0."
            )
            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="readaptacao_retorno",
                nome_exibicao=f"Fase 1: Readapta??o Neuromuscular & Prote??o Articular ({peso_cursor} kg Est?veis)",
                duracao_semanas=semanas_readapt,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_cursor,
                bf_fim_estimado=bf_cursor,
                calorias_diarias=calorias_f1,
                macros={
                    "proteina_g": round(peso_cursor * 2.2, 1),
                    "gordura_g": round(peso_cursor * gordura_fator, 1),
                    "hidratos_g": round((calorias_f1 - (peso_cursor * 2.2 * 4 + peso_cursor * gordura_fator * 9)) / 4, 1),
                    "fibras_g": 30.0
                },
                cardio_minutos_semana=75,
                series_trabalho_semana=12,
                descricao_estrategia="Per?odo de transi??o indispens?vel ap?s paragem/les?o. Calorias normocal?ricas (+100 kcal) para reativa??o anab?lica sem fadiga articular.",
                foco_treino=foco_readapt
            ))
            semanas_acumuladas += semanas_readapt
            fase_num += 1

            # Fase 2: Lean Bulk Progressivo
            semanas_bulk = max(14, int(round(delta_peso / taxa_ganho)))
            tdee_f2 = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            calorias_f2 = round(tdee_f2 + superavit_base, 0)
            bf_estimado_f2 = round(min(bf_alvo + 2.0, bf_cursor + (delta_peso * 0.30)), 1)

            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="bulk_progressivo",
                nome_exibicao=f"Fase 2: Lean Bulk Progressivo ({peso_cursor} kg -> {peso_alvo} kg)",
                duracao_semanas=semanas_bulk,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_alvo,
                bf_fim_estimado=bf_estimado_f2,
                calorias_diarias=calorias_f2,
                macros={
                    "proteina_g": round(peso_cursor * 2.0, 1),
                    "gordura_g": round(peso_cursor * gordura_fator, 1),
                    "hidratos_g": round((calorias_f2 - (peso_cursor * 2.0 * 4 + peso_cursor * gordura_fator * 9)) / 4, 1),
                    "fibras_g": 30.0
                },
                cardio_minutos_semana=60,
                series_trabalho_semana=14 if (eh_mulher or idade >= 45) else 16,
                descricao_estrategia=f"Subida limpa (+{superavit_base:.0f} kcal/dia) at? {peso_alvo} kg, agora com a articula??o consolidada e resposta neuromuscular reativada.",
                foco_treino="Sobrecarga progressiva constante em exerc?cios biomecanicamente seguros."
            ))
            peso_cursor = peso_alvo
            bf_cursor = bf_estimado_f2
            semanas_acumuladas += semanas_bulk
            fase_num += 1

            # Fase 3: Consolida??o Metab?lica
            semanas_cons = 4
            tdee_f3 = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="consolidacao",
                nome_exibicao=f"Fase 3: Consolida??o & Fixa??o Metab?lica ({peso_cursor} kg Est?veis)",
                duracao_semanas=semanas_cons,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_cursor,
                bf_fim_estimado=bf_alvo,
                calorias_diarias=round(tdee_f3, 0),
                macros={
                    "proteina_g": round(peso_cursor * 2.0, 1),
                    "gordura_g": round(peso_cursor * gordura_fator, 1),
                    "hidratos_g": round((tdee_f3 - (peso_cursor * 2.0 * 4 + peso_cursor * gordura_fator * 9)) / 4, 1),
                    "fibras_g": 30.0
                },
                cardio_minutos_semana=70,
                series_trabalho_semana=12,
                descricao_estrategia=f"Fixa??o permanente da nova composi??o nos {peso_cursor} kg.",
                foco_treino="Manuten??o s?lida de for?a e sa?de articular."
            ))
            semanas_acumuladas += semanas_cons

        # =========================================================================
        # ESTRAT?GIA 4: LEAN BULK LINEAR / BULK DIRETO
        # =========================================================================
        else:
            diagnostico = (
                f"Inten??o: Lean Bulk Linear Direto ({peso_atual} kg -> {peso_alvo} kg). "
                f"Progress?o cont?nua em super?vit moderado (+{superavit_base:.0f} kcal/dia) com foco na hipertrofia limpa, "
                f"seguida de consolida??o metab?lica final."
            )
            semanas_bulk = max(14, int(round(delta_peso / taxa_ganho)))
            tdee_f1 = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            calorias_f1 = round(tdee_f1 + superavit_base, 0)
            bf_estimado_f1 = round(min(bf_alvo + 2.0, bf_cursor + (delta_peso * 0.30)), 1)

            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="bulk_direto",
                nome_exibicao=f"Fase 1: Lean Bulk Linear ({peso_cursor} kg -> {peso_alvo} kg)",
                duracao_semanas=semanas_bulk,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_alvo,
                bf_fim_estimado=bf_estimado_f1,
                calorias_diarias=calorias_f1,
                macros={
                    "proteina_g": round(peso_cursor * 2.0, 1),
                    "gordura_g": round(peso_cursor * gordura_fator, 1),
                    "hidratos_g": round((calorias_f1 - (peso_cursor * 2.0 * 4 + peso_cursor * gordura_fator * 9)) / 4, 1),
                    "fibras_g": 30.0
                },
                cardio_minutos_semana=60,
                series_trabalho_semana=14 if (eh_mulher or idade >= 45) else 16,
                descricao_estrategia=f"Super?vit cal?rico controlado (+{superavit_base:.0f} kcal/dia) para maximizar o ganho de massa magra.",
                foco_treino="Sobrecarga progressiva cont?nua nos exerc?cios multiarticulares."
            ))
            peso_cursor = peso_alvo
            bf_cursor = bf_estimado_f1
            semanas_acumuladas += semanas_bulk
            fase_num += 1

            tdee_f2 = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="consolidacao",
                nome_exibicao=f"Fase 2: Consolida??o Metab?lica ({peso_cursor} kg Est?veis)",
                duracao_semanas=4,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_cursor,
                bf_fim_estimado=bf_alvo,
                calorias_diarias=round(tdee_f2, 0),
                macros={
                    "proteina_g": round(peso_cursor * 2.0, 1),
                    "gordura_g": round(peso_cursor * gordura_fator, 1),
                    "hidratos_g": round((tdee_f2 - (peso_cursor * 2.0 * 4 + peso_cursor * gordura_fator * 9)) / 4, 1),
                    "fibras_g": 30.0
                },
                cardio_minutos_semana=70,
                series_trabalho_semana=12,
                descricao_estrategia=f"Estabiliza??o da massa muscular ganha nos {peso_cursor} kg.",
                foco_treino="Manuten??o e densidade muscular."
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
        observacoes_contexto=observacoes_contexto,
        tipo_intencao=tipo_intencao,
        diagnostico_fisiologico=diagnostico,
        bloqueio_bulk_por_bf=bloqueio_bulk,
        fases=fases
    )

