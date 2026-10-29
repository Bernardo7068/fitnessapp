"""
Ponto de Entrada Principal da API FastAPI do Servidor.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .base_dados.conexao import Base, motor_bd
from .rotas import (
    roteador_perfil,
    roteador_treinos,
    roteador_nutricao,
    roteador_checkin,
    roteador_ia,
    roteador_biohacking
)

# Criar tabelas da base de dados se não existirem
Base.metadata.create_all(bind=motor_bd)

def _migrar_colunas_projeto_sqlite():
    try:
        with motor_bd.connect() as conn:
            for tabela in ["planos_treino", "planos_dieta", "registos_checkin"]:
                res = conn.exec_driver_sql(f"PRAGMA table_info({tabela})").fetchall()
                colunas = [row[1] for row in res]
                if "id_projeto" not in colunas:
                    conn.exec_driver_sql(f"ALTER TABLE {tabela} ADD COLUMN id_projeto INTEGER")
                if "nome_projeto" not in colunas:
                    conn.exec_driver_sql(f"ALTER TABLE {tabela} ADD COLUMN nome_projeto VARCHAR(150)")

            # Migrar colunas de memória e diagnóstico contínuo da IA
            res_perfil = conn.exec_driver_sql("PRAGMA table_info(perfis_utilizador)").fetchall()
            cols_perfil = [row[1] for row in res_perfil]
            if "memoria_treino_ia_json" not in cols_perfil:
                conn.exec_driver_sql("ALTER TABLE perfis_utilizador ADD COLUMN memoria_treino_ia_json TEXT")
            if "memoria_nutricao_ia_json" not in cols_perfil:
                conn.exec_driver_sql("ALTER TABLE perfis_utilizador ADD COLUMN memoria_nutricao_ia_json TEXT")

            conn.commit()
    except Exception as err:
        print(f"[BD] Nota sobre migração de colunas: {err}")

_migrar_colunas_projeto_sqlite()

app = FastAPI(
    title="Motor Adaptativo de Fitness & Dieta API",
    description="Backend em Python com motor puramente matemático e camada de IA Cloud para consultoria de treinos e nutrição.",
    version="1.0.0"
)

# Configuracao de CORS: seguro e restrito a origem da app e documentacao local
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registar todos os módulos de rotas
app.include_router(roteador_perfil)
app.include_router(roteador_treinos)
app.include_router(roteador_nutricao)
app.include_router(roteador_checkin)
app.include_router(roteador_ia)
app.include_router(roteador_biohacking)


@app.get("/api/saude")
def verificar_saude():
    return {
        "status": "online",
        "motor_matematico": "ativo",
        "ia_cloud": "pronta",
        "mensagem": "Servidor em Python a funcionar a 100%"
    }
