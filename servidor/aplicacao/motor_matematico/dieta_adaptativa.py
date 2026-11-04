"""
Motor Matemático - Dieta Adaptativa e Ajustes Fisiológicos Cruzados (Balança vs Treino)
Executa o diagnóstico semanal do peso correlacionado com a sobrecarga progressiva no ginásio.
Deteta acúmulo de gordura sem ganho de força, estagnações, catabolismo e prescreve ações corretivas exatas.
"""

from dataclasses import dataclass
from typing import Dict, List, Any, Optional
from .composicao_corporal import calcular_distribuicao_macros, Macros


@dataclass
class DiagnosticoAjusteDieta:
    peso_medio_anterior: float
    peso_medio_atual: float
    variacao_peso_kg: float
    taxa_variacao_percentual: float
    fase_atual: str  # "cut", "bulk", "manutencao"
    adesao_percentual: float
    calorias_atuais: float
    novas_calorias: float
    diferenca_calorias: float
    novos_macros: Macros
    ajuste_cardio_minutos: int
    motivo_matematico: str
    alerta_estagnacao: bool
    necessita_diet_break: bool
    alerta_ganho_gordura_sem_progresso: bool = False
    ajuste_treino_recomendado: str = ""
    aviso_proativo_utilizador: str = ""


def normalizar_fase(fase: str) -> str:
    """
    Normaliza nomenclaturas dinâmicas de fases (ex: 'cut_primario', 'cut_final', 'bulk_1', 'definicao')
    para as 4 raízes biológicas padrão: 'cut', 'bulk', 'diet_break', 'recomposicao'.
    """
    fase_limpa = (fase or "").strip().lower()
    if any(k in fase_limpa for k in ["cut", "defin", "defice", "perda", "secar", "queima"]):
        return "cut"
    if any(k in fase_limpa for k in ["bulk", "hipertrofia", "ganho", "superavit", "massa"]):
        return "bulk"
    if any(k in fase_limpa for k in ["diet_break", "resensibilizacao", "refeed"]):
        return "diet_break"
    if any(k in fase_limpa for k in ["recomp", "manuten"]):
        return "recomposicao"
    return "recomposicao"


def analisar_e_ajustar_dieta(
    peso_medio_anterior: float,
    peso_medio_atual: float,
    calorias_atuais: float,
    fase_atual: str,
    adesao_percentual: float,
    semanas_em_defice_continuo: int = 0,
    nivel_fadiga: int = 5,  # Escala 1 a 10
    progresso_treino: str = "aumentou",  # "aumentou", "manteve", "estagnado", "caiu"
    tentativas_estagnadas_treino: int = 0,
    taxa_semanal_alvo_kg: Optional[float] = None
) -> DiagnosticoAjusteDieta:
    """
    Algoritmo matemático de calibração adaptativa cruzada.
    Cruza o peso na balança com a evolução real de força no ginásio para impedir que
    o utilizador acumule gordura sem ganhar músculo ou estagne no défice.
    """
    fase_norm = normalizar_fase(fase_atual)
    variacao_peso = round(peso_medio_atual - peso_medio_anterior, 2)
    taxa_percentual = round((variacao_peso / peso_medio_anterior) * 100.0, 2) if peso_medio_anterior > 0 else 0.0
    
    novas_calorias = calorias_atuais
    diferenca_kcal = 0.0
    ajuste_cardio = 0
    alerta_estagnacao = False
    necessita_diet_break = False
    alerta_gordura_sem_progresso = False
    ajuste_treino = "Manter protocolo atual de volume e sobrecarga progressiva."
    aviso_proativo = ""
    motivo = "O teu progresso fisiológico está perfeitamente alinhado com a taxa matemática recomendada."

    # -------------------------------------------------------------------------
    # CASO 0: DESVIO CRÍTICO / GANHO DE PESO EM CUTTING (PERDA DE PESO)
    # Se o utilizador está em corte e o peso subiu
    # -------------------------------------------------------------------------
    if fase_norm == "cut" and variacao_peso > 0.0:
        alerta_estagnacao = True
        if variacao_peso >= 1.0 or taxa_percentual >= 1.2:
            # Subida expressiva: retenção hídrica massiva ou quebra grave do défice
            diferenca_kcal = -250.0
            novas_calorias = max(1300.0, calorias_atuais + diferenca_kcal)
            ajuste_cardio = +35
            ajuste_treino = (
                "Intensificar gasto calórico ativo (manter 8.000 a 10.000 passos diários). "
                "No ginásio, manter cargas pesadas nos compostos para sinalização anti-catabólica."
            )
            aviso_proativo = (
                f"[ALERTA CRÍTICO: DESVIO NO DÉFICE] Subida anómala de {variacao_peso:+.2f} kg ({taxa_percentual:+.2f}%) numa fase de perda de peso.\n"
                "Diagnóstico Fisiológico: Retenção hídrica massiva (refeições ricas em sódio/hidratos, inflamação muscular) ou superavit calórico não contabilizado.\n"
                "Ação Corretiva Imediata: Redução de 250 kcal/dia e +35 min de cardio semanal para restabelecer a oxidação de gordura."
            )
            motivo = aviso_proativo
        elif variacao_peso > 0.2 or taxa_percentual > 0.2:
            # Subida moderada
            if adesao_percentual >= 80.0:
                diferenca_kcal = -175.0
                novas_calorias = max(1300.0, calorias_atuais + diferenca_kcal)
                ajuste_cardio = +25
                motivo = (
                    f"Subida de {variacao_peso:+.2f} kg ({taxa_percentual:+.2f}%) em fase de défice. "
                    f"Com adesão de {adesao_percentual:.0f}%, calibramos com corte de 175 kcal/dia e +25 min de cardio semanal para reiniciar a descida."
                )
            else:
                motivo = (
                    f"O peso aumentou ({variacao_peso:+.2f} kg) e a adesão reportada foi de {adesao_percentual:.0f}%. "
                    "Não reduzimos calorias de imediato; é prioritário cumprir o plano prescrito a 100% primeiro."
                )
        else:
            # Flutuação mínima (0.01 a 0.20 kg): peso praticamente estável
            if adesao_percentual >= 80.0:
                diferenca_kcal = -120.0
                novas_calorias = max(1300.0, calorias_atuais + diferenca_kcal)
                ajuste_cardio = +20
                motivo = (
                    f"Peso estagnado com leve oscilação ({variacao_peso:+.2f} kg). "
                    "Ajuste para retomar a descida: corte suave de 120 kcal/dia e +20 min de cardio."
                )
            else:
                motivo = "Oscilação ligeira de peso. Manter o plano com adesão rigorosa aos macros prescritos."

    # -------------------------------------------------------------------------
    # CASO 1: BULK / MANUTENÇÃO - GANHO DE PESO/GORDURA SEM PROGRESSO DE FORÇA
    # Se o peso subiu E a força no treino estagnou ou caiu
    # -------------------------------------------------------------------------
    elif fase_norm == "bulk" and (taxa_percentual >= 0.30 or variacao_peso >= 0.3) and (progresso_treino in ["estagnado", "caiu"] or tentativas_estagnadas_treino >= 2):
        alerta_gordura_sem_progresso = True
        diferenca_kcal = -200.0
        novas_calorias = calorias_atuais + diferenca_kcal
        ajuste_cardio = +30  # +30 min de cardio LISS semanal
        
        ajuste_treino = (
            "Ajuste no Treino: Redução de 20% no volume de séries de trabalho (eliminar séries redundantes/lixo) "
            "e aumento do descanso entre séries para 2.5 a 3 minutos nos exercícios compostos. "
            "Foco absoluto em qualidade biomecânica e velocidade concêntrica."
        )

        aviso_proativo = (
            f"[ALERTA CRÍTICO: GANHO SEM PROGRESSO DE FORÇA] O teu peso subiu {variacao_peso:+.2f} kg ({taxa_percentual:+.2f}%), "
            f"mas o rendimento no treino está {progresso_treino.upper()} há {tentativas_estagnadas_treino} sessões.\n"
            "Diagnóstico Fisiológico: O excedente calórico não está a gerar síntese proteica miofibrilar; está a ser desviado "
            "para tecido adiposo devido a fadiga acumulada e eventual perda de sensibilidade à insulina.\n"
            "Ação Corretiva: Redução de 200 kcal/dia e +30 min de cardio para proteger a sensibilidade à insulina."
        )
        motivo = aviso_proativo

    # -------------------------------------------------------------------------
    # CASO 2: CUTTING - DIET BREAK POR FADIGA CRÓNICA OU ESTAGNAÇÃO PROLONGADA
    # -------------------------------------------------------------------------
    elif fase_norm == "cut" and semanas_em_defice_continuo >= 8 and (nivel_fadiga >= 8 or taxa_percentual > -0.1):
        necessita_diet_break = True
        diferenca_kcal = +300.0
        novas_calorias = calorias_atuais + diferenca_kcal
        ajuste_treino = "Semana de regeneração neural: manter intensidade de peso com metade do volume de séries."
        motivo = (
            f"Completaste {semanas_em_defice_continuo} semanas consecutivas em corte com nível de fadiga {nivel_fadiga}/10. "
            "A matemática fisiológica prescreve um Diet Break de 7 a 10 dias em calorias de manutenção (+300 kcal) "
            "para restaurar a leptina, tiróide e proteger a massa muscular."
        )

    # -------------------------------------------------------------------------
    # CASO 3: CUTTING NORMAL (PERDA SAUDÁVEL OU ACELERADA OU ESTAGNAÇÃO)
    # -------------------------------------------------------------------------
    elif fase_norm == "cut":
        # Se perdeu menos de 0.2% na semana (ex: -0.19% a 0.0%) e adesão >= 80% -> Estagnação
        if taxa_percentual > -0.2:
            alerta_estagnacao = True
            if adesao_percentual >= 80.0:
                diferenca_kcal = -150.0
                novas_calorias = max(1300.0, calorias_atuais + diferenca_kcal)
                ajuste_cardio = +25
                motivo = (
                    f"Variação de {variacao_peso:+.2f} kg ({taxa_percentual:+.2f}%). Com adesão de {adesao_percentual:.0f}%, "
                    "o teu gasto energético adaptativo desacelerou. Ajuste matemático: corte de 150 kcal/dia e +25 min de cardio."
                )
            else:
                motivo = (
                    f"O peso não baixou ({variacao_peso:+.2f} kg), mas a adesão reportada foi de {adesao_percentual:.0f}%. "
                    "Matematicamente, não devemos cortar calorias; o plano deve ser cumprido a 100% primeiro."
                )
        # Se perdeu peso acentuado (> 1.0% do peso por semana, ex: 1.0 kg em 73 kg)
        elif taxa_percentual < -1.0:
            forca_preservada = progresso_treino in ["aumentou", "manteve"]
            fadiga_controlada = nivel_fadiga < 8
            perda_extrema = taxa_percentual < -1.8 or variacao_peso < -1.8

            # Apenas adverte e aumenta calorias se a margem for extrema (> 1.8% / 1.8 kg) OU se perdeu força/energia
            if perda_extrema or not forca_preservada or not fadiga_controlada:
                diferenca_kcal = +150.0
                novas_calorias = calorias_atuais + diferenca_kcal
                ajuste_cardio = -15
                motivo = (
                    f"Perda acelerada de {abs(variacao_peso):.2f} kg ({taxa_percentual:+.2f}%) combinada com "
                    f"{'queda de rendimento no treino' if not forca_preservada else 'fadiga elevada' if not fadiga_controlada else 'ritmo extremo (> 1.8%/semana)'}. "
                    "Para travar o catabolismo muscular e recuperar o SNC, aumentamos suavemente a energia (+150 kcal/dia)."
                )
            else:
                # Perda rápida mas segura: força no topo e energia boa!
                motivo = (
                    f"Excelente resposta fisiológica: perda de {abs(variacao_peso):.2f} kg ({taxa_percentual:+.2f}%) "
                    f"com força preservada no treino ({progresso_treino.upper()}) e fadiga controlada ({nivel_fadiga}/10). "
                    "A oxidação lipídica e eliminação de água retida estão no ponto ideal. Manter as calorias e o treino inalterados!"
                )
        else:
            # Perda saudável padrão entre -0.2% e -1.0% por semana!
            motivo = (
                f"Excelente evolução: perda saudável de {abs(variacao_peso):.2f} kg ({taxa_percentual:+.2f}%). "
                "O ritmo metabólico está perfeito para oxidação lipídica preservando massa magra. Manter o plano!"
            )

    # -------------------------------------------------------------------------
    # CASO 4: FASE DE BULK (HIPERTROFIA)
    # -------------------------------------------------------------------------
    elif fase_norm == "bulk":
        if variacao_peso < -0.1:
            # Peso caiu em bulk
            diferenca_kcal = +200.0 if adesao_percentual >= 80.0 else 0.0
            novas_calorias = calorias_atuais + diferenca_kcal
            motivo = (
                f"O peso caiu {variacao_peso:+.2f} kg em fase de ganho de massa. "
                "Aumentamos o excedente em +200 kcal/dia para garantir superavit anabólico real."
                if adesao_percentual >= 80.0 else
                "O peso recuou porque a ingestão calórica real ficou aquém da meta estabelecida."
            )
        elif taxa_semanal_alvo_kg is not None and taxa_semanal_alvo_kg > 0:
            meta_alvo = float(taxa_semanal_alvo_kg)
            limite_superior = round(meta_alvo + 0.20, 2)
            limite_inferior = round(max(0.05, meta_alvo * 0.35), 2)

            if variacao_peso < limite_inferior:
                alerta_estagnacao = True
                if adesao_percentual >= 80.0:
                    diferenca_kcal = +150.0
                    novas_calorias = calorias_atuais + diferenca_kcal
                    motivo = (
                        f"Ganho semanal de {variacao_peso:+.2f} kg ficou abaixo da tua meta planeada de +{meta_alvo:.2f} kg/semana. "
                        "Aumentamos o excedente em +150 kcal/dia para apoiar o ritmo anabólico desejado."
                    )
                else:
                    motivo = f"O peso subiu {variacao_peso:+.2f} kg porque a adesão calórica ({adesao_percentual:.0f}%) ficou abaixo do prescrito."
            elif variacao_peso > limite_superior:
                diferenca_kcal = -150.0
                novas_calorias = calorias_atuais + diferenca_kcal
                motivo = (
                    f"Ganho acelerado de {variacao_peso:+.2f} kg, superando a tua meta planeada de +{meta_alvo:.2f} kg/semana. "
                    "Para evitar acúmulo desnecessário de gordura, calibramos o excedente com -150 kcal/dia."
                )
            else:
                motivo = (
                    f"Ritmo perfeito de ganho de massa: {variacao_peso:+.2f} kg esta semana, "
                    f"perfeitamente alinhado com a tua meta personalizada de +{meta_alvo:.2f} kg/semana. "
                    "Manter o plano calórico e focar na sobrecarga progressiva."
                )
        elif taxa_percentual <= 0.05:
            # Estagnação em bulk padrão
            alerta_estagnacao = True
            if adesao_percentual >= 80.0:
                diferenca_kcal = +150.0
                novas_calorias = calorias_atuais + diferenca_kcal
                motivo = (
                    f"O teu peso estagnou em bulk ({variacao_peso:+.2f} kg). "
                    "Para sustentar o crescimento muscular e apoiar treinos pesados, aumentamos o excedente em +150 kcal/dia."
                )
            else:
                motivo = "O peso não subiu porque a ingestão calórica real ficou abaixo da meta."
        elif taxa_percentual > 0.60:
            # Ganho rápido demais padrão
            diferenca_kcal = -150.0
            novas_calorias = calorias_atuais + diferenca_kcal
            motivo = (
                f"Ganho acelerado de {variacao_peso:+.2f} kg ({taxa_percentual:+.2f}%). "
                "Para evitar acúmulo desnecessário de gordura, reduzimos o excedente em 150 kcal/dia."
            )
        else:
            motivo = (
                f"Ritmo perfeito de ganho de massa: {variacao_peso:+.2f} kg ({taxa_percentual:+.2f}%). "
                "Manter o plano calórico e focar na sobrecarga progressiva."
            )

    # -------------------------------------------------------------------------
    # CASO 5: RECOMPOSIÇÃO / MANUTENÇÃO / DIET BREAK
    # -------------------------------------------------------------------------
    else:
        if abs(variacao_peso) >= 1.0:
            diferenca_kcal = -150.0 if variacao_peso > 0 else +150.0
            novas_calorias = calorias_atuais + diferenca_kcal
            motivo = f"Oscilação inesperada de {variacao_peso:+.2f} kg na fase de recomposição/manutenção. Calibramos em {diferenca_kcal:+.0f} kcal."
        else:
            motivo = f"Estabilidade na balança ({variacao_peso:+.2f} kg) ideal para recomposição corporal e consolidação metabólica."

    # Cálculo dos novos macronutrientes com base nas novas calorias e fase normalizada
    novos_macros = calcular_distribuicao_macros(
        calorias_alvo=novas_calorias,
        peso_kg=peso_medio_atual,
        massa_magra_kg=peso_medio_atual * 0.85,
        objetivo=fase_norm
    )

    return DiagnosticoAjusteDieta(
        peso_medio_anterior=peso_medio_anterior,
        peso_medio_atual=peso_medio_atual,
        variacao_peso_kg=variacao_peso,
        taxa_variacao_percentual=taxa_percentual,
        fase_atual=fase_atual,
        adesao_percentual=adesao_percentual,
        calorias_atuais=calorias_atuais,
        novas_calorias=novas_calorias,
        diferenca_calorias=diferenca_kcal,
        novos_macros=novos_macros,
        ajuste_cardio_minutos=ajuste_cardio,
        motivo_matematico=motivo,
        alerta_estagnacao=alerta_estagnacao,
        necessita_diet_break=necessita_diet_break,
        alerta_ganho_gordura_sem_progresso=alerta_gordura_sem_progresso,
        ajuste_treino_recomendado=ajuste_treino,
        aviso_proativo_utilizador=aviso_proativo
    )


def calcular_divisao_refeicoes(calorias_totais: float, macros: Macros, num_refeicoes: int = 4) -> List[Dict[str, Any]]:
    """Distribui calorias e macronutrientes ao longo do dia com ênfase no peri-treino."""
    num_refeicoes = max(3, min(6, num_refeicoes))
    distribuicoes = {
        3: [
            {"nome": "Pequeno-Almoço Energético", "pct_calorias": 0.30, "pct_proteina": 0.30, "pct_hidratos": 0.35, "pct_gordura": 0.35},
            {"nome": "Almoço / Refeição Principal", "pct_calorias": 0.40, "pct_proteina": 0.40, "pct_hidratos": 0.40, "pct_gordura": 0.35},
            {"nome": "Jantar Recuperador", "pct_calorias": 0.30, "pct_proteina": 0.30, "pct_hidratos": 0.25, "pct_gordura": 0.30},
        ],
        4: [
            {"nome": "Refeição 1: Pequeno-Almoço", "pct_calorias": 0.22, "pct_proteina": 0.22, "pct_hidratos": 0.25, "pct_gordura": 0.25},
            {"nome": "Refeição 2: Almoço Completo", "pct_calorias": 0.33, "pct_proteina": 0.30, "pct_hidratos": 0.30, "pct_gordura": 0.35},
            {"nome": "Refeição 3: Lanche Pré-Treino", "pct_calorias": 0.20, "pct_proteina": 0.23, "pct_hidratos": 0.25, "pct_gordura": 0.15},
            {"nome": "Refeição 4: Jantar Pós-Treino", "pct_calorias": 0.25, "pct_proteina": 0.25, "pct_hidratos": 0.20, "pct_gordura": 0.25},
        ],
        5: [
            {"nome": "Refeição 1: Desjejum", "pct_calorias": 0.20, "pct_proteina": 0.20, "pct_hidratos": 0.20, "pct_gordura": 0.20},
            {"nome": "Refeição 2: Almoço", "pct_calorias": 0.30, "pct_proteina": 0.25, "pct_hidratos": 0.25, "pct_gordura": 0.30},
            {"nome": "Refeição 3: Lanche / Pré-Treino", "pct_calorias": 0.15, "pct_proteina": 0.15, "pct_hidratos": 0.25, "pct_gordura": 0.10},
            {"nome": "Refeição 4: Pós-Treino / Jantar", "pct_calorias": 0.25, "pct_proteina": 0.25, "pct_hidratos": 0.25, "pct_gordura": 0.25},
            {"nome": "Refeição 5: Ceia Noturna Anti-Catabólica", "pct_calorias": 0.10, "pct_proteina": 0.15, "pct_hidratos": 0.05, "pct_gordura": 0.15},
        ]
    }

    config = distribuicoes.get(num_refeicoes, distribuicoes[4])
    refeicoes_calculadas = []
    for item in config:
        refeicoes_calculadas.append({
            "nome": item["nome"],
            "calorias": round(calorias_totais * item["pct_calorias"], 0),
            "proteina_g": round(macros.proteina_g * item["pct_proteina"], 1),
            "hidratos_g": round(macros.hidratos_g * item["pct_hidratos"], 1),
            "gordura_g": round(macros.gordura_g * item["pct_gordura"], 1),
        })
    return refeicoes_calculadas


TABELA_ALIMENTOS_EQUIVALENCIAS = {
    # Hidratos
    "arroz_branco_cozido": {"kcal": 130, "proteina": 2.5, "hidratos": 28.2, "gordura": 0.2, "nome": "Arroz Branco Cozido"},
    "arroz_integral_cozido": {"kcal": 124, "proteina": 2.6, "hidratos": 25.8, "gordura": 1.0, "nome": "Arroz Integral Cozido"},
    "batata_doce_cozida": {"kcal": 86, "proteina": 1.6, "hidratos": 20.1, "gordura": 0.1, "nome": "Batata-Doce Cozida"},
    "batata_inglesa_cozida": {"kcal": 77, "proteina": 2.0, "hidratos": 17.5, "gordura": 0.1, "nome": "Batata Inglesa Cozida"},
    "aveia_em_flocos": {"kcal": 368, "proteina": 14.0, "hidratos": 67.0, "gordura": 7.0, "nome": "Aveia em Flocos"},
    "pao_integral": {"kcal": 245, "proteina": 9.0, "hidratos": 46.0, "gordura": 2.5, "nome": "Pão Integral"},
    "massa_cozida": {"kcal": 158, "proteina": 5.8, "hidratos": 31.0, "gordura": 0.9, "nome": "Massa / Esparguete Cozido"},
    "cuscuz_cozido": {"kcal": 112, "proteina": 3.8, "hidratos": 23.2, "gordura": 0.2, "nome": "Cuscuz Cozido"},
    "tapioca_goma": {"kcal": 240, "proteina": 0.5, "hidratos": 60.0, "gordura": 0.1, "nome": "Goma de Tapioca"},
    
    # Frutas
    "banana": {"kcal": 89, "proteina": 1.1, "hidratos": 22.8, "gordura": 0.3, "nome": "Banana"},
    "maca": {"kcal": 52, "proteina": 0.3, "hidratos": 13.8, "gordura": 0.2, "nome": "Maçã"},
    "morangos": {"kcal": 32, "proteina": 0.7, "hidratos": 7.7, "gordura": 0.3, "nome": "Morangos Frescos"},
    "mirtilos": {"kcal": 57, "proteina": 0.7, "hidratos": 14.5, "gordura": 0.3, "nome": "Mirtilos Frescos"},

    # Proteína
    "peito_frango_grelhado": {"kcal": 165, "proteina": 31.0, "hidratos": 0.0, "gordura": 3.6, "nome": "Peito de Frango Grelhado"},
    "peito_peru_grelhado": {"kcal": 135, "proteina": 30.0, "hidratos": 0.0, "gordura": 1.5, "nome": "Peito de Peru Grelhado"},
    "carne_vaca_magra": {"kcal": 180, "proteina": 28.0, "hidratos": 0.0, "gordura": 7.0, "nome": "Carne de Vaca Magra Grelhada"},
    "salmao_grelhado": {"kcal": 206, "proteina": 22.0, "hidratos": 0.0, "gordura": 12.0, "nome": "Salmão Grelhado"},
    "atum_natural": {"kcal": 116, "proteina": 26.0, "hidratos": 0.0, "gordura": 1.0, "nome": "Atum em Lata ao Natural"},
    "claras_ovo": {"kcal": 52, "proteina": 11.0, "hidratos": 0.7, "gordura": 0.2, "nome": "Claras de Ovo"},
    "ovo_inteiro": {"kcal": 143, "proteina": 13.0, "hidratos": 0.7, "gordura": 9.5, "nome": "Ovo Inteiro Cozido"},
    "queijo_fresco_light": {"kcal": 72, "proteina": 12.0, "hidratos": 3.5, "gordura": 0.8, "nome": "Queijo Fresco Batido Light"},
    "iogurte_grego_skyr": {"kcal": 59, "proteina": 10.0, "hidratos": 3.6, "gordura": 0.4, "nome": "Iogurte Grego Ligeiro / Skyr"},
    "whey_protein": {"kcal": 380, "proteina": 78.0, "hidratos": 6.0, "gordura": 4.5, "nome": "Whey Protein 80%"},
    "tofu_firme": {"kcal": 144, "proteina": 15.0, "hidratos": 2.5, "gordura": 8.5, "nome": "Tofu Firme"},

    # Gorduras Saudáveis & Lácteos
    "azeite_oliva": {"kcal": 884, "proteina": 0.0, "hidratos": 0.0, "gordura": 100.0, "nome": "Azeite de Oliva Extra Virgem"},
    "manteiga_amendoim": {"kcal": 588, "proteina": 25.0, "hidratos": 20.0, "gordura": 50.0, "nome": "Manteiga de Amendoim 100%"},
    "abacate": {"kcal": 160, "proteina": 2.0, "hidratos": 8.5, "gordura": 14.7, "nome": "Abacate Fresco"},
    "amendoas_nozes": {"kcal": 579, "proteina": 21.0, "hidratos": 21.6, "gordura": 49.9, "nome": "Amêndoas / Nozes"},
    "leite_magro": {"kcal": 35, "proteina": 3.4, "hidratos": 4.9, "gordura": 0.1, "nome": "Leite Magro"}
}


def calcular_substituicao_alimento(alimento_origem_id: str, gramas_origem: float, alimento_destino_id: str) -> Dict[str, Any]:
    """Calcula matematicamente quantos gramas do alimento destino devem ser consumidos mantendo a equivalência de macros."""
    alimento_orig = TABELA_ALIMENTOS_EQUIVALENCIAS.get(alimento_origem_id)
    alimento_dest = TABELA_ALIMENTOS_EQUIVALENCIAS.get(alimento_destino_id)
    if not alimento_orig or not alimento_dest:
        raise ValueError("Alimento não encontrado na tabela de equivalências.")

    p_orig = alimento_orig["proteina"]
    h_orig = alimento_orig["hidratos"]
    g_orig = alimento_orig["gordura"]

    if g_orig > p_orig and g_orig > h_orig:
        macro_origem_total = (gramas_origem / 100.0) * g_orig
        dest_macro = alimento_dest.get("gordura", 0.0)
        gramas_necessarios = (macro_origem_total / dest_macro) * 100.0 if dest_macro > 0 else gramas_origem
        tipo_macro = "gordura"
    elif h_orig > p_orig:
        macro_origem_total = (gramas_origem / 100.0) * h_orig
        dest_macro = alimento_dest.get("hidratos", 0.0)
        gramas_necessarios = (macro_origem_total / dest_macro) * 100.0 if dest_macro > 0 else gramas_origem
        tipo_macro = "hidratos"
    else:
        macro_origem_total = (gramas_origem / 100.0) * p_orig
        dest_macro = alimento_dest.get("proteina", 0.0)
        gramas_necessarios = (macro_origem_total / dest_macro) * 100.0 if dest_macro > 0 else gramas_origem
        tipo_macro = "proteina"

    gramas_finais = round(max(5.0, gramas_necessarios), 1)
    kcal_origem = round((gramas_origem / 100.0) * alimento_orig["kcal"], 1)
    kcal_destino = round((gramas_finais / 100.0) * alimento_dest["kcal"], 1)

    return {
        "alimento_origem": alimento_orig["nome"],
        "gramas_origem": gramas_origem,
        "kcal_origem": kcal_origem,
        "alimento_substituto": alimento_dest["nome"],
        "gramas_substituto": gramas_finais,
        "kcal_substituto": kcal_destino,
        "diferenca_kcal": round(kcal_destino - kcal_origem, 1),
        "macro_base": tipo_macro
    }
