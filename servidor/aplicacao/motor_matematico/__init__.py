"""
Módulo do Motor Matemático
Algoritmos determinísticos e livres de alucinações para biometria, projeção, nutrição e treinos.
"""

from .composicao_corporal import (
    calcular_massa_magra,
    calcular_tmb_katch_mcardle,
    calcular_tmb_mifflin_st_jeor,
    calcular_composicao_e_tdee,
    calcular_distribuicao_macros,
    calcular_bf_us_navy,
    Macros,
    ResultadoComposicao
)

from .projetor_metas import (
    projetar_trajetoria_meta,
    RelatorioProjetoMetas,
    FaseProjeto
)

from .dieta_adaptativa import (
    normalizar_fase,
    analisar_e_ajustar_dieta,
    calcular_divisao_refeicoes,
    calcular_substituicao_alimento,
    DiagnosticoAjusteDieta,
    TABELA_ALIMENTOS_EQUIVALENCIAS
)

from .treino_adaptativo import (
    gerar_plano_treino_otimizado,
    calcular_progressao_carga,
    PlanoTreinoCompleto,
    SessaoTreino,
    ExercicioTreino,
    EXERCICIOS_CATALOGO
)

__all__ = [
    "calcular_massa_magra",
    "calcular_tmb_katch_mcardle",
    "calcular_tmb_mifflin_st_jeor",
    "calcular_composicao_e_tdee",
    "calcular_distribuicao_macros",
    "Macros",
    "ResultadoComposicao",
    "projetar_trajetoria_meta",
    "RelatorioProjetoMetas",
    "FaseProjeto",
    "normalizar_fase",
    "analisar_e_ajustar_dieta",
    "calcular_divisao_refeicoes",
    "calcular_substituicao_alimento",
    "DiagnosticoAjusteDieta",
    "TABELA_ALIMENTOS_EQUIVALENCIAS",
    "gerar_plano_treino_otimizado",
    "calcular_progressao_carga",
    "PlanoTreinoCompleto",
    "SessaoTreino",
    "ExercicioTreino",
    "EXERCICIOS_CATALOGO"
]
