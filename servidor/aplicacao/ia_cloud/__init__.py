"""
Módulo de Inteligência Artificial Cloud
Conexão e prompts para consultoria qualitativa em suplementação, vitaminas, cardio e biomecânica.
"""

from .servico_coach import ServicoCoachIA
from .prompts_ia import PROMPT_SISTEMA_COACH, criar_prompt_analise_semanal

__all__ = ["ServicoCoachIA", "PROMPT_SISTEMA_COACH", "criar_prompt_analise_semanal"]
