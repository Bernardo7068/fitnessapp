"""
Rotas de Autenticação, Registo, Sessão e Gestão de Utilizadores (Admin).
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..base_dados.conexao import obter_sessao_bd
from ..base_dados.modelos import (
    ContaUtilizador, PerfilUtilizador, PlanoTreinoGuardado, PlanoDietaGuardado,
    RegistoTreinoExecutado, RegistoCheckIn, RegistoDiarioConsumo, ProjetoFisiologico,
    ProtocoloBiohacking, RegistoBiofeedback
)
from ..seguranca import gerar_hash_senha, verificar_senha, criar_token_acesso, decifrar_token_acesso

roteador_auth = APIRouter(prefix="/api/auth", tags=["Autenticação & Utilizadores"])


# ==============================================================================
# Esquemas Pydantic
# ==============================================================================

class EsquemaRegisto(BaseModel):
    nome: str
    email: str
    senha: str


class EsquemaLogin(BaseModel):
    email: str
    senha: str


class EsquemaAlterarPapel(BaseModel):
    papel: str  # "admin" ou "atleta"


# ==============================================================================
# Dependências de Autenticação
# ==============================================================================

def extrair_token_cabecalho(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """Extrai o token Bearer do cabeçalho HTTP Authorization."""
    if not authorization:
        return None
    partes = authorization.strip().split()
    if len(partes) == 2 and partes[0].lower() == "bearer":
        return partes[1]
    if len(partes) == 1:
        return partes[0]
    return None


def obter_utilizador_opcional(
    sessao: Session = Depends(obter_sessao_bd),
    authorization: Optional[str] = Header(None)
) -> Optional[ContaUtilizador]:
    """Retorna o utilizador autenticado ou None se não houver token válido."""
    token = extrair_token_cabecalho(authorization)
    if not token:
        return None

    dados = decifrar_token_acesso(token)
    if not dados or "id" not in dados:
        return None

    utilizador = sessao.query(ContaUtilizador).filter(
        ContaUtilizador.id == dados["id"],
        ContaUtilizador.ativo == True
    ).first()
    return utilizador


def obter_utilizador_atual(
    sessao: Session = Depends(obter_sessao_bd),
    authorization: Optional[str] = Header(None)
) -> ContaUtilizador:
    """Dependência estrita que exige token de autenticação válido."""
    utilizador = obter_utilizador_opcional(sessao, authorization)
    if not utilizador:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessão expirada ou não autenticada. Por favor, inicia sessão novamente.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return utilizador


def obter_admin_atual(
    utilizador: ContaUtilizador = Depends(obter_utilizador_atual)
) -> ContaUtilizador:
    """Exige que o utilizador autenticado tenha papel de administrador."""
    if utilizador.papel != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito. Esta ação requer privilégios de Administrador."
        )
    return utilizador


def obter_perfil_utilizador_ativo(sessao: Session, utilizador_id: int, nome_padrao: str = "Atleta") -> PerfilUtilizador:
    """Procura o perfil de um utilizador específico ou inicializa um novo."""
    perfil = sessao.query(PerfilUtilizador).filter(PerfilUtilizador.utilizador_id == utilizador_id).first()
    if not perfil:
        perfil = PerfilUtilizador(utilizador_id=utilizador_id, nome=nome_padrao)
        sessao.add(perfil)
        sessao.commit()
        sessao.refresh(perfil)
    return perfil


# ==============================================================================
# Endpoints de Autenticação
# ==============================================================================

@roteador_auth.post("/registar")
def registar_utilizador(dados: EsquemaRegisto, sessao: Session = Depends(obter_sessao_bd)):
    """Cria uma nova conta de utilizador."""
    email_limpo = dados.email.strip().lower()
    nome_limpo = dados.nome.strip()

    if len(dados.senha) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A palavra-passe deve ter pelo menos 4 caracteres."
        )

    existente = sessao.query(ContaUtilizador).filter(ContaUtilizador.email == email_limpo).first()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe uma conta registada com este email."
        )

    # Se for o primeiríssimo utilizador na app, atribui papel de admin automaticamente
    total_usuarios = sessao.query(ContaUtilizador).count()
    papel_inicial = "admin" if total_usuarios == 0 else "atleta"

    novo_usuario = ContaUtilizador(
        nome=nome_limpo,
        email=email_limpo,
        hash_senha=gerar_hash_senha(dados.senha),
        papel=papel_inicial,
        ativo=True,
        ultimo_login=datetime.utcnow()
    )
    sessao.add(novo_usuario)
    sessao.commit()
    sessao.refresh(novo_usuario)

    # Inicializar perfil fisiológico do utilizador
    obter_perfil_utilizador_ativo(sessao, novo_usuario.id, nome_padrao=novo_usuario.nome)

    token = criar_token_acesso({
        "id": novo_usuario.id,
        "email": novo_usuario.email,
        "nome": novo_usuario.nome,
        "papel": novo_usuario.papel
    })

    return {
        "mensagem": "Conta criada com sucesso!",
        "token": token,
        "utilizador": {
            "id": novo_usuario.id,
            "nome": novo_usuario.nome,
            "email": novo_usuario.email,
            "papel": novo_usuario.papel
        }
    }


@roteador_auth.post("/login")
def login_utilizador(dados: EsquemaLogin, sessao: Session = Depends(obter_sessao_bd)):
    """Autentica o utilizador e devolve o token de sessão."""
    email_limpo = dados.email.strip().lower()
    usuario = sessao.query(ContaUtilizador).filter(ContaUtilizador.email == email_limpo).first()

    if not usuario or not verificar_senha(dados.senha, usuario.hash_senha):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou palavra-passe incorretos."
        )

    if not usuario.ativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta conta encontra-se desativada pelo Administrador."
        )

    usuario.ultimo_login = datetime.utcnow()
    sessao.commit()

    # Garantir que o perfil associado existe
    obter_perfil_utilizador_ativo(sessao, usuario.id, nome_padrao=usuario.nome)

    token = criar_token_acesso({
        "id": usuario.id,
        "email": usuario.email,
        "nome": usuario.nome,
        "papel": usuario.papel
    })

    return {
        "mensagem": "Sessão iniciada com sucesso!",
        "token": token,
        "utilizador": {
            "id": usuario.id,
            "nome": usuario.nome,
            "email": usuario.email,
            "papel": usuario.papel
        }
    }


@roteador_auth.get("/me")
def obter_meu_usuario(utilizador: ContaUtilizador = Depends(obter_utilizador_atual)):
    """Retorna os dados do utilizador atualmente autenticado."""
    return {
        "id": utilizador.id,
        "nome": utilizador.nome,
        "email": utilizador.email,
        "papel": utilizador.papel,
        "criado_em": utilizador.criado_em.isoformat() if utilizador.criado_em else None,
        "ultimo_login": utilizador.ultimo_login.isoformat() if utilizador.ultimo_login else None
    }


# ==============================================================================
# Endpoints de Gestão de Utilizadores (Apenas Administrador)
# ==============================================================================

@roteador_auth.get("/utilizadores")
def listar_todos_utilizadores(
    admin: ContaUtilizador = Depends(obter_admin_atual),
    sessao: Session = Depends(obter_sessao_bd)
):
    """Lista todos os utilizadores da plataforma com métricas básicas de uso (Admin)."""
    usuarios = sessao.query(ContaUtilizador).order_by(ContaUtilizador.id.asc()).all()

    resultado = []
    for u in usuarios:
        total_treinos = sessao.query(RegistoTreinoExecutado).filter(RegistoTreinoExecutado.utilizador_id == u.id).count()
        total_checkins = sessao.query(RegistoCheckIn).filter(RegistoCheckIn.utilizador_id == u.id).count()
        perfil = sessao.query(PerfilUtilizador).filter(PerfilUtilizador.utilizador_id == u.id).first()

        resultado.append({
            "id": u.id,
            "nome": u.nome,
            "email": u.email,
            "papel": u.papel,
            "ativo": u.ativo,
            "criado_em": u.criado_em.strftime("%d/%m/%Y") if u.criado_em else "-",
            "ultimo_login": u.ultimo_login.strftime("%d/%m/%Y %H:%M") if u.ultimo_login else "Nunca",
            "estatisticas": {
                "total_treinos": total_treinos,
                "total_checkins": total_checkins,
                "peso_atual": perfil.peso_atual if perfil else None,
                "fase_atual": perfil.fase_atual if perfil else "Indefinida"
            }
        })

    return {
        "total": len(resultado),
        "utilizadores": resultado
    }


@roteador_auth.put("/utilizadores/{id_utilizador}/papel")
def alterar_papel_utilizador(
    id_utilizador: int,
    dados: EsquemaAlterarPapel,
    admin: ContaUtilizador = Depends(obter_admin_atual),
    sessao: Session = Depends(obter_sessao_bd)
):
    """Promove ou rebaixa o papel de um utilizador ('admin' <-> 'atleta')."""
    if dados.papel not in ["admin", "atleta"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Papel inválido. Deve ser 'admin' ou 'atleta'."
        )

    alvo = sessao.query(ContaUtilizador).filter(ContaUtilizador.id == id_utilizador).first()
    if not alvo:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado.")

    # Impedir que o admin logado se rebaixe se for o único admin
    if alvo.id == admin.id and dados.papel != "admin":
        outros_admins = sessao.query(ContaUtilizador).filter(
            ContaUtilizador.papel == "admin",
            ContaUtilizador.id != admin.id,
            ContaUtilizador.ativo == True
        ).count()
        if outros_admins == 0:
            raise HTTPException(
                status_code=400,
                detail="Não podes retirar privilégios de administrador a ti próprio enquanto fores o único admin."
            )

    alvo.papel = dados.papel
    sessao.commit()
    return {"mensagem": f"Papel do utilizador '{alvo.nome}' alterado para {dados.papel.upper()}."}


@roteador_auth.put("/utilizadores/{id_utilizador}/estado")
def alternar_estado_utilizador(
    id_utilizador: int,
    admin: ContaUtilizador = Depends(obter_admin_atual),
    sessao: Session = Depends(obter_sessao_bd)
):
    """Ativa ou desativa uma conta de utilizador."""
    if id_utilizador == admin.id:
        raise HTTPException(status_code=400, detail="Não podes desativar a tua própria conta.")

    alvo = sessao.query(ContaUtilizador).filter(ContaUtilizador.id == id_utilizador).first()
    if not alvo:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado.")

    alvo.ativo = not alvo.ativo
    sessao.commit()
    estado_str = "ativada" if alvo.ativo else "desativada"
    return {"mensagem": f"Conta de '{alvo.nome}' foi {estado_str} com sucesso.", "ativo": alvo.ativo}


@roteador_auth.delete("/utilizadores/{id_utilizador}")
def eliminar_utilizador(
    id_utilizador: int,
    admin: ContaUtilizador = Depends(obter_admin_atual),
    sessao: Session = Depends(obter_sessao_bd)
):
    """Elimina permanentemente a conta e dados de um utilizador."""
    if id_utilizador == admin.id:
        raise HTTPException(status_code=400, detail="Não podes eliminar a tua própria conta.")

    alvo = sessao.query(ContaUtilizador).filter(ContaUtilizador.id == id_utilizador).first()
    if not alvo:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado.")

    # Limpar dados associados
    sessao.query(PerfilUtilizador).filter(PerfilUtilizador.utilizador_id == id_utilizador).delete()
    sessao.query(PlanoTreinoGuardado).filter(PlanoTreinoGuardado.utilizador_id == id_utilizador).delete()
    sessao.query(PlanoDietaGuardado).filter(PlanoDietaGuardado.utilizador_id == id_utilizador).delete()
    sessao.query(RegistoTreinoExecutado).filter(RegistoTreinoExecutado.utilizador_id == id_utilizador).delete()
    sessao.query(RegistoCheckIn).filter(RegistoCheckIn.utilizador_id == id_utilizador).delete()
    sessao.query(RegistoDiarioConsumo).filter(RegistoDiarioConsumo.utilizador_id == id_utilizador).delete()
    sessao.query(ProjetoFisiologico).filter(ProjetoFisiologico.utilizador_id == id_utilizador).delete()
    sessao.query(ProtocoloBiohacking).filter(ProtocoloBiohacking.utilizador_id == id_utilizador).delete()
    sessao.query(RegistoBiofeedback).filter(RegistoBiofeedback.utilizador_id == id_utilizador).delete()

    sessao.delete(alvo)
    sessao.commit()
    return {"mensagem": f"Utilizador '{alvo.nome}' e respetivos dados foram eliminados permanentemente."}
