"""
Motor Matemático - Projetor Dinâmico de Metas Fisiológicas
Identifica automaticamente a intenção real e impõe regras de segurança biológica:
1. ALERTA BF ELEVADO (BF >= 24% Homem / >= 30% Mulher): Bloqueia Bulks e Recomposições estáticas; prescreve Cut imediato.
2. PERDA DE PESO / SECAGEM (peso_alvo < peso_atual) -> Cut Focado com Diet Breaks metabólicos.
3. GANHO DE PESO / HIPERTROFIA (peso_alvo > peso_atual) -> Recomposição nos kg atuais ou Lean Bulk.
4. RECOMPOSIÇÃO NO MESMO PESO (peso_alvo == peso_atual) -> Manutenção com troca de gordura por músculo.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
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
    taxa_semanal_alvo_kg: Optional[float] = None


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
    taxa_semanal_alvo_kg: Optional[float] = None
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
    observacoes_contexto: str = "",
    taxa_semanal_alvo_kg: Optional[float] = None
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

    obs_lower = observacoes_contexto.lower()
    tem_paragem_ou_lesao = any(k in obs_lower for k in [
        "parado", "parada", "estive parado", "meses sem treinar", "tempo sem treinar",
        "voltar a treinar", "retorno", "lesao", "lesão", "acromio", "acromioclavicular",
        "readaptacao", "readaptação", "recuperar", "descondicionado", "reabilita",
        "reabilitar", "reabilitacao", "reabilitação", "fisioterapia", "tendinite", "bursite"
    ]) or any(k in estrategia_inicial for k in ["retorno", "reabilita", "readaptacao"])
    tem_acromio = any(k in obs_lower for k in ["acromio", "acromioclavicular", "clavicular"])
    detalhe_clinico = " (com atenção especial à articulação acromioclavicular)" if tem_acromio else ""

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

        taxa_perda = abs(float(taxa_semanal_alvo_kg)) if (taxa_semanal_alvo_kg and taxa_semanal_alvo_kg > 0) else 0.55
        defice_base = round(taxa_perda * 1000.0, 0)

        # Se o atleta tem paragem/lesão ou selecionou retorno + cut, incluir fase de readaptação inicial
        if tem_paragem_ou_lesao and estrategia_inicial not in ["cut_direto", "cut_linear"]:
            diagnostico = (
                f"Intenção Identificada: Emagrecimento e Definição com Readaptação Inicial ({peso_atual} kg -> {peso_alvo} kg). "
                f"Contexto individual considerado: '{observacoes_contexto}'. "
                f"O motor inicia com uma Fase 1 de Readaptação Neuromuscular ({peso_atual} kg estáveis, RPE ≤ 7.0{detalhe_clinico}) "
                f"para proteger ligamentos e tendões antes de impor a restrição calórica. Segue-se o défice planeado a {taxa_perda:.2f} kg/semana."
            )
            semanas_readapt = 4
            tdee_readapt = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            foco_readapt = (
                "Proteção acromioclavicular e manguito: Supino em pegada neutra (45°), "
                "face pulls, cadência excêntrica 3-0-2-0 e cargas a RPE ≤ 7.0."
                if tem_acromio else
                "Reativação motora e vascularização tendinosa: RPE contido em 7.0, cadência 3-0-2-0."
            )
            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="readaptacao_retorno",
                nome_exibicao=f"Fase 1: Readaptação Neuromuscular & Proteção Articular ({peso_cursor} kg Estáveis)",
                duracao_semanas=semanas_readapt,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_cursor,
                bf_fim_estimado=bf_cursor,
                calorias_diarias=round(tdee_readapt + 50.0, 0),
                macros={
                    "proteina_g": round(peso_cursor * 2.2, 1),
                    "gordura_g": round(peso_cursor * 0.85, 1),
                    "hidratos_g": round(((tdee_readapt + 50.0) - (peso_cursor * 2.2 * 4 + peso_cursor * 0.85 * 9)) / 4, 1),
                    "fibras_g": 30.0
                },
                cardio_minutos_semana=70,
                series_trabalho_semana=12,
                descricao_estrategia="Período preparatório para ativar o sistema neuromuscular e proteger articulações antes da perda calórica.",
                foco_treino=foco_readapt,
                taxa_semanal_alvo_kg=0.0
            ))
            semanas_acumuladas += semanas_readapt
            fase_num += 1
        else:
            diagnostico = (
                f"Intenção Identificada: Emagrecimento e Definição Focada ({peso_atual} kg -> {peso_alvo} kg). "
                f"O objetivo é eliminar {peso_a_perder_total:.1f} kg com ritmo planeado de {taxa_perda:.2f} kg/semana e BF alvo de {bf_alvo}%. "
                "O plano foca-se na oxidação lipídica com preservação rígida da massa magra."
            )

        # Estrutura com Diet Breaks se peso a perder for expressivo (> 6kg) e não for cut direto
        if peso_a_perder_total > 6.0 and estrategia_inicial not in ["cut_direto", "cut_linear"]:
            perda_f1 = round(peso_a_perder_total * 0.60, 1)
            peso_fim_f1 = round(peso_cursor - perda_f1, 1)
            semanas_f1 = max(5, int(round(perda_f1 / taxa_perda)))
            bf_fim_f1 = round(bf_cursor - ((perda_f1 / peso_cursor) * 100 * 0.85), 1)
            tdee_f1 = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            calorias_f1 = round(tdee_f1 - defice_base, 0)

            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="cut_primario",
                nome_exibicao=f"Fase {fase_num}: Queima Ativa de Gordura ({peso_cursor} kg -> {peso_fim_f1} kg)",
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
                descricao_estrategia=f"Défice controlado (-{defice_base:.0f} kcal/dia) para queimar os primeiros {perda_f1} kg a {taxa_perda:.2f} kg/semana.",
                foco_treino="Preservação de cargas nos compostos pesados.",
                taxa_semanal_alvo_kg=-round(taxa_perda, 2)
            ))
            peso_cursor = peso_fim_f1
            bf_cursor = bf_fim_f1
            semanas_acumuladas += semanas_f1
            fase_num += 1

            # Diet break metabólico de 2 semanas
            semanas_f2 = 2
            tdee_f2_teorico = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            tdee_f2_adaptado = round(tdee_f2_teorico * 0.90, 0)
            calorias_f2 = round(min(tdee_f2_adaptado, calorias_f1 + 350.0), 0)

            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="diet_break",
                nome_exibicao=f"Fase {fase_num}: Reset Metabólico (Diet Break nos {peso_cursor} kg)",
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
                descricao_estrategia="Pausa alimentar em manutenção adaptada (+350 kcal) para restaurar a leptina, tiróide e proteger contra estagnação.",
                foco_treino="Treino de manutenção neural com volume reduzido.",
                taxa_semanal_alvo_kg=0.0
            ))
            semanas_acumuladas += semanas_f2
            fase_num += 1

            # Cut final
            perda_f3 = round(peso_cursor - peso_alvo, 1)
            semanas_f3 = max(4, int(round(perda_f3 / taxa_perda)))
            calorias_f3 = round(calorias_f2 - defice_base, 0)

            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="cut_final",
                nome_exibicao=f"Fase {fase_num}: Secagem Final de Lapidação ({peso_cursor} kg -> {peso_alvo} kg)",
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
                foco_treino="Intensidade alta, 150 min de cardio LISS semanal.",
                taxa_semanal_alvo_kg=-round(taxa_perda, 2)
            ))
            semanas_acumuladas += semanas_f3

        else:
            # Cut Linear Direto
            semanas_cut = max(5, int(round(peso_a_perder_total / taxa_perda)))
            tdee_c = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            calorias_c = round(tdee_c - defice_base, 0)

            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="cut_final",
                nome_exibicao=f"Fase {fase_num}: Cut Linear Direto ({peso_cursor} kg -> {peso_alvo} kg)",
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
                descricao_estrategia=f"Défice linear sustentado (-{defice_base:.0f} kcal/dia) a {taxa_perda:.2f} kg/semana com preservação de massa magra.",
                foco_treino="Manutenção rígida de cargas nos compostos.",
                taxa_semanal_alvo_kg=-round(taxa_perda, 2)
            ))
            semanas_acumuladas += semanas_cut

    elif delta_peso > 0.5:
        tipo_intencao = "ganho_peso"
        eh_mulher = not eh_homem

        if taxa_semanal_alvo_kg is not None and taxa_semanal_alvo_kg > 0:
            taxa_ganho = round(float(taxa_semanal_alvo_kg), 2)
            superavit_base = round(taxa_ganho * 1000.0, 0)
        else:
            taxa_semanal_ganho = 0.22 if (eh_mulher or idade >= 45) else 0.35
            taxa_ganho = taxa_semanal_ganho
            superavit_base = 220.0 if (eh_mulher or idade >= 45) else 320.0

        gordura_fator = 1.05 if (eh_mulher or idade >= 45) else 0.85

        # =========================================================================
        # ESTRATÉGIA 1: BULK & CUT ATLÉTICO / PERIODIZAÇÃO AVANÇADA
        # =========================================================================
        if estrategia_inicial == "bulk_cut_atletico":
            overshoot_kg = 3.0
            peso_pico = round(peso_alvo + overshoot_kg, 1)

            if tem_paragem_ou_lesao:
                diagnostico = (
                    f"Intenção: Periodização Atlética Completa (Bulk & Cut) com Readaptação Inicial Pós-Lesão/Paragem ({peso_atual} kg -> {peso_alvo} kg a {bf_alvo}% BF). "
                    f"Contexto individual considerado: '{observacoes_contexto}'. "
                    f"O motor inicia com uma Fase 1 de Readaptação Neuromuscular ({peso_atual} kg estáveis, RPE ≤ 7.0, cadência 3-0-2-0{detalhe_clinico}) "
                    f"para restaurar tendões e articulações. Segue-se a sobrecarga anabólica atlética (+{overshoot_kg} kg de lastro até aos {peso_pico} kg a {taxa_ganho:.2f} kg/semana), "
                    f"pausa metabólica e o Mini-Cut Final de lapidação para atingir exatamente {peso_alvo} kg secos a {bf_alvo}% BF."
                )
                semanas_readapt = 5
                tdee_f1 = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
                calorias_f1 = round(tdee_f1 + 100.0, 0)
                foco_readapt = (
                    "Proteção acromioclavicular e manguito: Supino em pegada neutra (45°), "
                    "face pulls, cadência excêntrica 3-0-2-0 e cargas a RPE ≤ 7.0."
                    if tem_acromio else
                    "Reativação motora e vascularização tendinosa: RPE contido em 7.0, cadência 3-0-2-0."
                )
                fases.append(FaseProjeto(
                    numero_fase=fase_num,
                    tipo="readaptacao_retorno",
                    nome_exibicao=f"Fase 1: Readaptação Neuromuscular & Proteção Articular ({peso_cursor} kg Estáveis)",
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
                    descricao_estrategia="Período de transição indispensável pós-lesão/paragem: restaura vascularização e colagénio antes da sobrecarga pesada.",
                    foco_treino=foco_readapt,
                    taxa_semanal_alvo_kg=0.0
                ))
                semanas_acumuladas += semanas_readapt
                fase_num += 1
            else:
                diagnostico = (
                    f"Intenção: Periodização Atlética Avançada ({peso_atual} kg -> {peso_alvo} kg a {bf_alvo}% BF). "
                    f"Estratégia de Alto Rendimento: Ganho de lastro anabólico ultrapassando a meta (+{overshoot_kg} kg de overshoot até {peso_pico} kg a {taxa_ganho:.2f} kg/semana), "
                    f"seguido de pausa metabólica e fase de lapidação para atingir exatamente {peso_alvo} kg extremamente definidos."
                )

            # Fase Bulk de Sobrecarga (Lastro até peso_pico)
            delta_bulk = round(peso_pico - peso_cursor, 1)
            semanas_bulk = max(8, int(round(delta_bulk / taxa_ganho)))
            tdee_bulk = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            calorias_bulk = round(tdee_bulk + superavit_base + 60.0, 0)
            bf_pico = round(bf_cursor + 3.0, 1)

            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="bulk_sobrecarga",
                nome_exibicao=f"Fase {fase_num}: Bulk de Sobrecarga Anabólica ({peso_cursor} kg -> {peso_pico} kg)",
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
                descricao_estrategia=f"Construção de lastro muscular em superávit consistente (+{superavit_base+60:.0f} kcal) ultrapassando a meta em +{overshoot_kg} kg a {taxa_ganho:.2f} kg/semana.",
                foco_treino="Sobrecarga progressiva pesada nos compostos e volume anabólico.",
                taxa_semanal_alvo_kg=round(taxa_ganho, 2)
            ))
            peso_cursor = peso_pico
            bf_cursor = bf_pico
            semanas_acumuladas += semanas_bulk
            fase_num += 1

            # Fase Pausa & Descompressão Metabólica
            semanas_db = 3
            tdee_db = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="diet_break",
                nome_exibicao=f"Fase {fase_num}: Pausa & Descompressão Metabólica ({peso_cursor} kg Estáveis)",
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
                descricao_estrategia="Descompressão digestiva para restaurar a sensibilidade dos recetores musculares antes do corte.",
                foco_treino="Volume moderado com ênfase em descanso do SNC.",
                taxa_semanal_alvo_kg=0.0
            ))
            semanas_acumuladas += semanas_db
            fase_num += 1

            # Fase Cut Final de Lapidação (peso_pico -> peso_alvo)
            semanas_cut = max(5, int(round(overshoot_kg / 0.50)))
            tdee_cut = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            calorias_cut = round(tdee_cut - 450.0, 0)

            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="cut_final",
                nome_exibicao=f"Fase {fase_num}: Cut Final de Lapidação ({peso_cursor} kg -> {peso_alvo} kg)",
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
                descricao_estrategia=f"Queima da gordura superficial acumulada no bulk até atingir exatamente {peso_alvo} kg a {bf_alvo}% BF.",
                foco_treino="Preservação de cargas e intensidade neuromuscular nos compostos.",
                taxa_semanal_alvo_kg=-0.50
            ))
            peso_cursor = peso_alvo
            bf_cursor = bf_alvo
            semanas_acumuladas += semanas_cut
            fase_num += 1

            # Fase Consolidação Definitiva
            tdee_cons = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="consolidacao",
                nome_exibicao=f"Fase {fase_num}: Consolidação Definitiva ({peso_alvo} kg Estáveis)",
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
                descricao_estrategia="Fixação da nova composição corporal no peso seco conquistado.",
                foco_treino="Treino estável de manutenção e densidade.",
                taxa_semanal_alvo_kg=0.0
            ))
            semanas_acumuladas += 4

        # =========================================================================
        # ESTRATÉGIA 2: RETORNO / REABILITAÇÃO + BULK
        # =========================================================================
        elif estrategia_inicial in ["retorno_reabilitacao_bulk", "readaptacao_bulk"] or (tem_paragem_ou_lesao and estrategia_inicial not in ["bulk_linear", "lean_bulk_linear", "bulk_direto"]):
            diagnostico = (
                f"Intenção: Retorno & Reabilitação + Lean Bulk ({peso_atual} kg -> {peso_alvo} kg). "
                f"Contexto individual considerado: '{observacoes_contexto}'. "
                f"O motor inicia com uma Fase 1 protegida de Readaptação Neuromuscular ({peso_atual} kg estáveis, RPE ≤ 7.0{detalhe_clinico}) "
                f"para restabelecer integridade tendinosa antes da progressão calórica a {taxa_ganho:.2f} kg/semana."
            )
            semanas_readapt = 5
            tdee_f1 = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            calorias_f1 = round(tdee_f1 + 80.0, 0)
            foco_readapt = (
                "Proteção acromioclavicular e manguito: Supino em pegada neutra (45°), face pulls, cadência 3-0-2-0 e RPE ≤ 7.0."
                if tem_acromio else
                "Reativação motora e vascularização tendinosa: RPE contido em 7.0, cadência 3-0-2-0."
            )
            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="readaptacao_retorno",
                nome_exibicao=f"Fase 1: Readaptação Neuromuscular & Proteção Articular ({peso_cursor} kg Estáveis)",
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
                descricao_estrategia="Período de transição indispensável pós-lesão/paragem: restaura vascularização e colagénio antes do superávit pesado.",
                foco_treino=foco_readapt,
                taxa_semanal_alvo_kg=0.0
            ))
            semanas_acumuladas += semanas_readapt
            fase_num += 1

            # Fase 2: Bulk Progressivo
            delta_bulk = round(peso_alvo - peso_cursor, 1)
            semanas_bulk = max(8, int(round(delta_bulk / taxa_ganho)))
            tdee_f2 = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            calorias_f2 = round(tdee_f2 + superavit_base, 0)
            bf_estimado_f2 = round(min(bf_alvo + 2.0, bf_cursor + (delta_bulk * 0.30)), 1)

            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="bulk_progressivo",
                nome_exibicao=f"Fase {fase_num}: Lean Bulk Progressivo ({peso_cursor} kg -> {peso_alvo} kg)",
                duracao_semanas=semanas_bulk,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_alvo,
                bf_fim_estimado=bf_estimado_f2,
                calorias_diarias=calorias_f2,
                macros={
                    "proteina_g": round(peso_alvo * 2.1, 1),
                    "gordura_g": round(peso_alvo * gordura_fator, 1),
                    "hidratos_g": round((calorias_f2 - (peso_alvo * 2.1 * 4 + peso_alvo * gordura_fator * 9)) / 4, 1),
                    "fibras_g": 30.0
                },
                cardio_minutos_semana=60,
                series_trabalho_semana=14,
                descricao_estrategia=f"Superávit calórico controlado (+{superavit_base:.0f} kcal) a {taxa_ganho:.2f} kg/semana.",
                foco_treino="Sobrecarga progressiva constante com boa técnica.",
                taxa_semanal_alvo_kg=round(taxa_ganho, 2)
            ))
            peso_cursor = peso_alvo
            bf_cursor = bf_estimado_f2
            semanas_acumuladas += semanas_bulk
            fase_num += 1

            # Fase 3: Consolidação
            tdee_f3 = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="consolidacao",
                nome_exibicao=f"Fase {fase_num}: Consolidação & Manutenção ({peso_alvo} kg Estáveis)",
                duracao_semanas=4,
                peso_inicio_kg=peso_alvo,
                peso_fim_estimado_kg=peso_alvo,
                bf_fim_estimado=bf_cursor,
                calorias_diarias=round(tdee_f3, 0),
                macros={
                    "proteina_g": round(peso_alvo * 2.0, 1),
                    "gordura_g": round(peso_alvo * gordura_fator, 1),
                    "hidratos_g": round((tdee_f3 - (peso_alvo * 2.0 * 4 + peso_alvo * gordura_fator * 9)) / 4, 1),
                    "fibras_g": 30.0
                },
                cardio_minutos_semana=70,
                series_trabalho_semana=12,
                descricao_estrategia="Estabilização do novo peso corporal para manter o músculo conquistado.",
                foco_treino="Manutenção neural e fixação do peso.",
                taxa_semanal_alvo_kg=0.0
            ))
            semanas_acumuladas += 4

        # =========================================================================
        # ESTRATÉGIA 3: BULK LINEAR (DIRETO E PROGRESSIVO)
        # =========================================================================
        else:
            tipo_bulk_nome = "Lean Bulk Linear (Limpo)" if taxa_ganho <= 0.35 else "Bulk Linear Acelerado"
            diagnostico = (
                f"Intenção: Bulk Linear ({peso_atual} kg -> {peso_alvo} kg). "
                f"Progressão contínua direto até aos {peso_alvo} kg com taxa de {taxa_ganho:.2f} kg/semana "
                f"({'foco em ganho limpo minimizando gordura' if taxa_ganho <= 0.35 else 'ritmo acelerado com maior excedente calórico'}) "
                f"e superávit de +{superavit_base:.0f} kcal/dia, seguido de fase de consolidação metabólica."
            )
            delta_bulk = round(peso_alvo - peso_cursor, 1)
            semanas_bulk = max(6, int(round(delta_bulk / taxa_ganho)))
            tdee_f1 = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            calorias_f1 = round(tdee_f1 + superavit_base, 0)
            bf_estimado_f1 = round(min(bf_alvo + 2.0, bf_cursor + (delta_bulk * 0.30)), 1)

            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="bulk_direto",
                nome_exibicao=f"Fase 1: {tipo_bulk_nome} ({peso_cursor} kg -> {peso_alvo} kg)",
                duracao_semanas=semanas_bulk,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_alvo,
                bf_fim_estimado=bf_estimado_f1,
                calorias_diarias=calorias_f1,
                macros={
                    "proteina_g": round(peso_alvo * 2.1, 1),
                    "gordura_g": round(peso_alvo * gordura_fator, 1),
                    "hidratos_g": round((calorias_f1 - (peso_alvo * 2.1 * 4 + peso_alvo * gordura_fator * 9)) / 4, 1),
                    "fibras_g": 30.0
                },
                cardio_minutos_semana=60,
                series_trabalho_semana=14,
                descricao_estrategia=f"Superávit calórico controlado (+{superavit_base:.0f} kcal) a {taxa_ganho:.2f} kg/semana.",
                foco_treino="Sobrecarga progressiva constante e consistência.",
                taxa_semanal_alvo_kg=round(taxa_ganho, 2)
            ))
            peso_cursor = peso_alvo
            bf_cursor = bf_estimado_f1
            semanas_acumuladas += semanas_bulk
            fase_num += 1

            # Consolidação
            tdee_f2 = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)
            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="consolidacao",
                nome_exibicao=f"Fase 2: Consolidação & Estabilização ({peso_alvo} kg Estáveis)",
                duracao_semanas=4,
                peso_inicio_kg=peso_alvo,
                peso_fim_estimado_kg=peso_alvo,
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
                descricao_estrategia=f"Estabilização da massa muscular ganha nos {peso_cursor} kg.",
                foco_treino="Manutenção e densidade muscular.",
                taxa_semanal_alvo_kg=0.0
            ))
            semanas_acumuladas += 4

    else:
        tipo_intencao = "recomposicao_mesmo_peso"
        tdee_r = calcular_tdee_dinamico(peso_cursor, bf_cursor, nivel_atividade)

        if estrategia_inicial in ["readaptacao_retorno", "retorno_reabilitacao"] or tem_paragem_ou_lesao:
            diagnostico = (
                f"Intenção: Readaptação Neuromuscular & Proteção Articular no Mesmo Peso ({peso_atual} kg). "
                f"Contexto individual considerado: '{observacoes_contexto}'. "
                f"O objetivo é restabelecer tendões e ligações motoras sob RPE ≤ 7.0{detalhe_clinico} "
                f"mantendo exatamente {peso_atual} kg estáveis na balança."
            )
            semanas_f1 = 6
            foco_readapt = (
                "Proteção acromioclavicular e manguito: Supino pegada neutra (45°), face pulls, cadência 3-0-2-0 e RPE ≤ 7.0."
                if tem_acromio else
                "Reativação motora e vascularização tendinosa: RPE contido em 7.0, cadência excêntrica 3-0-2-0."
            )
            fases.append(FaseProjeto(
                numero_fase=1,
                tipo="readaptacao_retorno",
                nome_exibicao=f"Fase 1: Readaptação Neuromuscular & Articular ({peso_cursor} kg Estáveis)",
                duracao_semanas=semanas_f1,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_cursor,
                bf_fim_estimado=bf_cursor,
                calorias_diarias=round(tdee_r + 50.0, 0),
                macros={
                    "proteina_g": round(peso_cursor * 2.2, 1),
                    "gordura_g": round(peso_cursor * 0.85, 1),
                    "hidratos_g": round(((tdee_r + 50.0) - (peso_cursor * 2.2 * 4 + peso_cursor * 0.85 * 9)) / 4, 1),
                    "fibras_g": 30.0
                },
                cardio_minutos_semana=70,
                series_trabalho_semana=12,
                descricao_estrategia="Protocolo de regeneração e vascularização articular com cadência controlada.",
                foco_treino=foco_readapt,
                taxa_semanal_alvo_kg=0.0
            ))
            semanas_acumuladas += semanas_f1
            fase_num += 1

            # Fase 2: Recomposição
            semanas_f2 = 10
            fases.append(FaseProjeto(
                numero_fase=fase_num,
                tipo="recomposicao",
                nome_exibicao=f"Fase {fase_num}: Recomposição Corporal Pós-Readaptação ({peso_cursor} kg Estáveis)",
                duracao_semanas=semanas_f2,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_cursor,
                bf_fim_estimado=bf_alvo,
                calorias_diarias=tdee_r,
                macros={
                    "proteina_g": round(peso_cursor * 2.3, 1),
                    "gordura_g": round(peso_cursor * 0.85, 1),
                    "hidratos_g": round((tdee_r - (peso_cursor * 2.3 * 4 + peso_cursor * 0.85 * 9)) / 4, 1),
                    "fibras_g": 35.0
                },
                cardio_minutos_semana=90,
                series_trabalho_semana=14,
                descricao_estrategia="Manutenção isocalórica com alta proteína para queimar gordura e recuperar volume muscular.",
                foco_treino="Sobrecarga progressiva moderada respeitando as articulações recuperadas.",
                taxa_semanal_alvo_kg=0.0
            ))
            semanas_acumuladas += semanas_f2

        elif estrategia_inicial == "manutencao_metabolica":
            diagnostico = (
                f"Intenção: Manutenção & Otimização Metabólica ({peso_atual} kg). "
                f"Estabilização rigorosa do peso com foco em aumentar o gasto energético diário, digestão e força máxima."
            )
            semanas_manut = 12
            fases.append(FaseProjeto(
                numero_fase=1,
                tipo="manutencao_metabolica",
                nome_exibicao=f"Fase Única: Manutenção & Otimização de Performance ({peso_cursor} kg Estáveis)",
                duracao_semanas=semanas_manut,
                peso_inicio_kg=peso_cursor,
                peso_fim_estimado_kg=peso_cursor,
                bf_fim_estimado=bf_cursor,
                calorias_diarias=tdee_r,
                macros={
                    "proteina_g": round(peso_cursor * 2.0, 1),
                    "gordura_g": round(peso_cursor * 0.90, 1),
                    "hidratos_g": round((tdee_r - (peso_cursor * 2.0 * 4 + peso_cursor * 0.90 * 9)) / 4, 1),
                    "fibras_g": 35.0
                },
                cardio_minutos_semana=80,
                series_trabalho_semana=14,
                descricao_estrategia="Estabilização calórica com ênfase em qualidade nutricional, digestão e rendimento no ginásio.",
                foco_treino="Força máxima e densidade com intensidade nos compostos.",
                taxa_semanal_alvo_kg=0.0
            ))
            semanas_acumuladas = semanas_manut

        else:
            diagnostico = (
                f"Intenção: Recomposição Corporal Pura no Mesmo Peso ({peso_atual} kg). "
                f"O objetivo é manter exatamente {peso_atual} kg na balança enquanto reduzes o BF para {bf_alvo}%, "
                f"trocando gordura diretamente por tecido muscular em calorias isocalóricas."
            )
            semanas_recomp = 16
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
                descricao_estrategia=f"Manutenção isocalórica nos {peso_cursor} kg com alta proteína para queimar gordura e ganhar músculo simultaneamente.",
                foco_treino="Sobrecarga progressiva constante em isocaloria.",
                taxa_semanal_alvo_kg=0.0
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
        taxa_semanal_alvo_kg=taxa_semanal_alvo_kg,
        fases=fases
    )

