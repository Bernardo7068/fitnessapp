"""
Funções Ajudantes Partilhadas para Rotas e Isolamento de Utilizador.
"""

from typing import Optional
from sqlalchemy.orm import Session
from ..base_dados.modelos import PerfilUtilizador, ContaUtilizador


def resolver_utilizador_id(usuario: Optional[ContaUtilizador]) -> int:
    """Retorna o ID do utilizador autenticado ou 1 como fallback."""
    if usuario and usuario.id:
        return usuario.id
    return 1


def obter_ou_criar_perfil(sessao: Session, utilizador_id: int, nome_padrao: str = "Atleta") -> PerfilUtilizador:
    """Garante a existência do perfil limpo para o utilizador fornecido."""
    perfil = sessao.query(PerfilUtilizador).filter(PerfilUtilizador.utilizador_id == utilizador_id).first()
    if not perfil:
        perfil = PerfilUtilizador(
            utilizador_id=utilizador_id,
            nome=nome_padrao,
            idade=None,
            sexo="masculino",
            altura_cm=None,
            peso_atual=None,
            peso_alvo=None,
            bf_atual=None,
            bf_alvo=None,
            fase_atual="manutencao",
            calorias_atuais=None,
            dias_treino_semana=4,
            tempo_sessao_minutos=60,
            nivel_experiencia="iniciante",
            nivel_atividade="moderado",
            projeto_ativo_json=None,
            prompts_customizados_json="{}"
        )
        sessao.add(perfil)
        sessao.commit()
        sessao.refresh(perfil)
    return perfil
