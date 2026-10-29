"""
Ponto de Entrada Principal da API FastAPI do Servidor.
"""

from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .base_dados.conexao import Base, motor_bd, SessaoLocal
from .base_dados.modelos import ContaUtilizador, PerfilUtilizador
from .seguranca import gerar_hash_senha
from .rotas import (
    roteador_auth,
    roteador_perfil,
    roteador_treinos,
    roteador_nutricao,
    roteador_checkin,
    roteador_ia,
    roteador_biohacking
)

# Criar tabelas da base de dados se não existirem
Base.metadata.create_all(bind=motor_bd)


def _inicializar_seguranca_e_migracoes():
    """Garante tabelas, colunas de utilizador_id e conta inicial de administrador."""
    try:
        with motor_bd.connect() as conn:
            # 1. Garantir coluna id_projeto e nome_projeto
            for tabela in ["planos_treino", "planos_dieta", "registos_checkin"]:
                res = conn.exec_driver_sql(f"PRAGMA table_info({tabela})").fetchall()
                colunas = [row[1] for row in res]
                if "id_projeto" not in colunas:
                    conn.exec_driver_sql(f"ALTER TABLE {tabela} ADD COLUMN id_projeto INTEGER")
                if "nome_projeto" not in colunas:
                    conn.exec_driver_sql(f"ALTER TABLE {tabela} ADD COLUMN nome_projeto VARCHAR(150)")

            # 2. Migrar coluna utilizador_id em todas as tabelas de dados do utilizador
            tabelas_usuario = [
                "perfis_utilizador",
                "planos_treino",
                "planos_dieta",
                "registos_treino",
                "registos_checkin",
                "registos_diario_consumo",
                "projetos_fisiologicos",
                "protocolos_biohacking",
                "registos_biofeedback"
            ]
            for tab in tabelas_usuario:
                res_tab = conn.exec_driver_sql(f"PRAGMA table_info({tab})").fetchall()
                cols_tab = [row[1] for row in res_tab]
                if "utilizador_id" not in cols_tab:
                    conn.exec_driver_sql(f"ALTER TABLE {tab} ADD COLUMN utilizador_id INTEGER")
                    # Se existirem dados anteriores sem utilizador_id, associar ao utilizador 1
                    conn.exec_driver_sql(f"UPDATE {tab} SET utilizador_id = 1 WHERE utilizador_id IS NULL")

            # 3. Migrar colunas de memória e diagnóstico contínuo da IA no perfil
            res_perfil = conn.exec_driver_sql("PRAGMA table_info(perfis_utilizador)").fetchall()
            cols_perfil = [row[1] for row in res_perfil]
            if "memoria_treino_ia_json" not in cols_perfil:
                conn.exec_driver_sql("ALTER TABLE perfis_utilizador ADD COLUMN memoria_treino_ia_json TEXT")
            if "memoria_nutricao_ia_json" not in cols_perfil:
                conn.exec_driver_sql("ALTER TABLE perfis_utilizador ADD COLUMN memoria_nutricao_ia_json TEXT")

            conn.commit()

        # 4. Criar conta Admin padrão se não existir nenhum utilizador no sistema
        sessao = SessaoLocal()
        try:
            total_contas = sessao.query(ContaUtilizador).count()
            if total_contas == 0:
                admin_inicial = ContaUtilizador(
                    id=1,
                    nome="Administrador BInov",
                    email="admin@binov.app",
                    hash_senha=gerar_hash_senha("admin123"),
                    papel="admin",
                    ativo=True,
                    ultimo_login=datetime.utcnow()
                )
                sessao.add(admin_inicial)
                sessao.commit()
                print("[AUTH] Conta de Administrador criada por omissão: admin@binov.app (senha: admin123)")

                # Garantir que o perfil 1 fica associado a este utilizador 1
                perfil_existente = sessao.query(PerfilUtilizador).filter(PerfilUtilizador.id == 1).first()
                if perfil_existente:
                    perfil_existente.utilizador_id = 1
                    perfil_existente.nome = "Administrador BInov"
                    sessao.commit()
                else:
                    perfil_novo = PerfilUtilizador(id=1, utilizador_id=1, nome="Administrador BInov")
                    sessao.add(perfil_novo)
                    sessao.commit()
        finally:
            sessao.close()

    except Exception as err:
        print(f"[BD] Nota sobre migração e inicialização: {err}")


_inicializar_seguranca_e_migracoes()

app = FastAPI(
    title="BInov — Motor Adaptativo de Fitness & Dieta API",
    description="Backend em Python com motor puramente matemático, autenticação multi-utilizador e controlo de acessos Admin.",
    version="2.0.0"
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
app.include_router(roteador_auth)
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
        "autenticacao": "ativa",
        "mensagem": "Servidor BInov em Python a funcionar a 100%"
    }
