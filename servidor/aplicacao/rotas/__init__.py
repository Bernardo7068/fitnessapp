"""
Agrupador de Rotas da API.
"""

from .rotas_perfil import roteador_perfil
from .rotas_treinos import roteador_treinos
from .rotas_nutricao import roteador_nutricao
from .rotas_checkin import roteador_checkin
from .rotas_ia import roteador_ia
from .rotas_biohacking import roteador_biohacking

__all__ = [
    "roteador_perfil",
    "roteador_treinos",
    "roteador_nutricao",
    "roteador_checkin",
    "roteador_ia",
    "roteador_biohacking"
]
