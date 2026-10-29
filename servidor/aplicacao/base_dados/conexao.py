"""
Conexão à Base de Dados SQLite via SQLAlchemy.
"""

import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Garantir caminho absoluto estável para a base de dados SQLite
CAMINHO_FICHEIRO_BD = Path(__file__).resolve().parent.parent.parent / "fitness.db"
CAMINHO_BANCO = f"sqlite:///{CAMINHO_FICHEIRO_BD}"

motor_bd = create_engine(CAMINHO_BANCO, connect_args={"check_same_thread": False})
SessaoLocal = sessionmaker(autocommit=False, autoflush=False, bind=motor_bd)
Base = declarative_base()


def obter_sessao_bd():
    """Dependência para injeção de sessão nos endpoints do FastAPI."""
    sessao = SessaoLocal()
    try:
        yield sessao
    finally:
        sessao.close()
