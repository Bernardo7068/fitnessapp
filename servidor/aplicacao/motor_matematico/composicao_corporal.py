"""
Motor Matemático - Composição Corporal e Gasto Energético (TDEE)
Baseado em modelos científicos consolidados (Katch-McArdle, Mifflin-St Jeor).
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class ResultadoComposicao:
    peso_kg: float
    percentual_gordura: float
    massa_magra_kg: float
    massa_gorda_kg: float
    taxa_metabolica_basal: float
    gasto_energetico_total: float
    calorias_manutencao: float


@dataclass
class Macros:
    calorias: float
    proteina_g: float
    gordura_g: float
    hidratos_g: float
    fibras_g: float


# Multiplicadores de atividade física (Fator PAL)
FATORES_ATIVIDADE = {
    "sedentario": 1.2,          # Pouco ou nenhum exercício
    "leve": 1.375,              # 1-3 dias de treino por semana
    "moderado": 1.55,           # 3-5 dias de treino por semana
    "ativo": 1.725,             # 6-7 dias de treino intenso por semana
    "muito_ativo": 1.9          # Atleta profissional / trabalho físico pesado + treinos
}


def calcular_massa_magra(peso_kg: float, percentual_gordura: float) -> tuple[float, float]:
    """Calcula a massa magra (LBM) e a massa gorda em quilogramas."""
    massa_gorda = peso_kg * (percentual_gordura / 100.0)
    massa_magra = peso_kg - massa_gorda
    return round(massa_magra, 2), round(massa_gorda, 2)


def calcular_tmb_katch_mcardle(massa_magra_kg: float) -> float:
    """
    Fórmula de Katch-McArdle:
    TMB = 370 + (21.6 * Massa Magra em kg)
    Considerada a mais precisa para pessoas que treinam.
    """
    return round(370.0 + (21.6 * massa_magra_kg), 1)


def calcular_tmb_mifflin_st_jeor(peso_kg: float, altura_cm: float, idade: int, sexo: str) -> float:
    """
    Fórmula de Mifflin-St Jeor (usada caso % de gordura não seja conhecido com precisão):
    Homens: (10 * peso) + (6.25 * altura) - (5 * idade) + 5
    Mulheres: (10 * peso) + (6.25 * altura) - (5 * idade) - 161
    """
    ajuste_sexo = 5.0 if sexo.lower() in ["masculino", "homem", "m"] else -161.0
    tmb = (10.0 * peso_kg) + (6.25 * altura_cm) - (5.0 * idade) + ajuste_sexo
    return round(tmb, 1)


def calcular_composicao_e_tdee(
    peso_kg: float,
    altura_cm: float,
    idade: int,
    sexo: str,
    nivel_atividade: str = "moderado",
    percentual_gordura: Optional[float] = None
) -> ResultadoComposicao:
    """Calcula a composição completa do utilizador e as calorias de manutenção diárias."""
    # Se o percentual de gordura não for fornecido, estimamos com fórmula básica do IMC/idade/sexo
    if percentual_gordura is None or percentual_gordura <= 0:
        imc = peso_kg / ((altura_cm / 100.0) ** 2)
        fator_sexo = 1 if sexo.lower() in ["masculino", "homem", "m"] else 0
        # Fórmula de Deurenberg: %BF = 1.20 * IMC + 0.23 * idade - 10.8 * sexo - 5.4
        percentual_gordura = round((1.20 * imc) + (0.23 * idade) - (10.8 * fator_sexo) - 5.4, 1)
        percentual_gordura = max(6.0, min(percentual_gordura, 50.0))

    massa_magra, massa_gorda = calcular_massa_magra(peso_kg, percentual_gordura)
    tmb = calcular_tmb_katch_mcardle(massa_magra)

    fator = FATORES_ATIVIDADE.get(nivel_atividade.lower(), 1.55)
    tdee = round(tmb * fator, 0)

    return ResultadoComposicao(
        peso_kg=peso_kg,
        percentual_gordura=percentual_gordura,
        massa_magra_kg=massa_magra,
        massa_gorda_kg=massa_gorda,
        taxa_metabolica_basal=tmb,
        gasto_energetico_total=tdee,
        calorias_manutencao=tdee
    )


def calcular_distribuicao_macros(
    calorias_alvo: float,
    peso_kg: float,
    massa_magra_kg: float,
    objetivo: str = "manutencao"
) -> Macros:
    """
    Calcula a distribuição rigorosa de macronutrientes:
    - Proteína: 2.0g a 2.4g / kg de peso ou massa magra (preservação muscular máxima).
    - Gorduras: 0.8g a 1.0g / kg de peso (saúde hormonal indispensável).
    - Hidratos de Carbono: calorias restantes divididas por 4 kcal/g.
    - Fibras: 14g por cada 1000 kcal consumidas.
    """
    if objetivo in ["cut", "definicao", "perda"]:
        # Em corte, aumentamos a proteína para saciedade e proteção anticatabólica
        gramas_proteina = round(peso_kg * 2.2, 1)
        gramas_gordura = round(peso_kg * 0.8, 1)
    elif objetivo in ["bulk", "hipertrofia", "ganho"]:
        # Em ganho, 2.0g/kg de proteína é suficiente; priorizamos hidratos para energia e anabolismo
        gramas_proteina = round(peso_kg * 2.0, 1)
        gramas_gordura = round(peso_kg * 0.9, 1)
    else: # manutencao
        gramas_proteina = round(peso_kg * 2.0, 1)
        gramas_gordura = round(peso_kg * 0.85, 1)

    kcal_proteina = gramas_proteina * 4.0
    kcal_gordura = gramas_gordura * 9.0
    kcal_restantes = calorias_alvo - (kcal_proteina + kcal_gordura)

    # Garantir que hidratos não fiquem negativos mesmo em défice extremo
    kcal_hidratos = max(kcal_restantes, 200.0)
    gramas_hidratos = round(kcal_hidratos / 4.0, 1)

    calorias_finais = round((gramas_proteina * 4.0) + (gramas_gordura * 9.0) + (gramas_hidratos * 4.0), 0)
    gramas_fibras = round((calorias_finais / 1000.0) * 14.0, 1)

    return Macros(
        calorias=calorias_finais,
        proteina_g=gramas_proteina,
        gordura_g=gramas_gordura,
        hidratos_g=gramas_hidratos,
        fibras_g=gramas_fibras
    )


def calcular_bf_us_navy(
    sexo: str,
    altura_cm: float,
    cintura_cm: float,
    pescoco_cm: float,
    anca_cm: Optional[float] = None
) -> float:
    """
    Fórmula oficial da Marinha dos EUA (U.S. Navy Body Fat Formula).
    Mede a densidade corporal baseada nos perímetros de pescoço, cintura (e anca para mulheres).
    """
    import math
    is_masculino = sexo.lower() in ["masculino", "homem", "m"]
    try:
        if is_masculino:
            if cintura_cm <= pescoco_cm or altura_cm <= 0:
                return 15.0
            diff = cintura_cm - pescoco_cm
            # %BF = 495 / (1.0324 - 0.19077 * log10(cintura - pescoço) + 0.15456 * log10(altura)) - 450
            bf = 495.0 / (1.0324 - 0.19077 * math.log10(diff) + 0.15456 * math.log10(altura_cm)) - 450.0
        else:
            anca = anca_cm if anca_cm and anca_cm > 0 else (cintura_cm * 1.15)
            soma = cintura_cm + anca - pescoco_cm
            if soma <= 0 or altura_cm <= 0:
                return 22.0
            # %BF = 495 / (1.29579 - 0.35004 * log10(cintura + anca - pescoço) + 0.22100 * log10(altura)) - 450
            bf = 495.0 / (1.29579 - 0.35004 * math.log10(soma) + 0.22100 * math.log10(altura_cm)) - 450.0
        return round(max(4.0, min(bf, 55.0)), 1)
    except Exception:
        return 15.0
