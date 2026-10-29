"""
Rotas de Inteligência Artificial Cloud e Configuração de Chave API.
"""

import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..base_dados.conexao import obter_sessao_bd
from ..base_dados.modelos import PerfilUtilizador
from ..esquemas.esquemas import EsquemaConfiguracaoIA, EsquemaSalvarPromptsIA
from ..ia_cloud.servico_coach import ServicoCoachIA
from ..ia_cloud.prompts_ia import (
    PROMPT_SISTEMA_COACH,
    PROMPT_SISTEMA_TREINADOR,
    PROMPT_SISTEMA_PRESCRICAO_DIETA,
    PROMPT_SISTEMA_CALIBRACAO_DIETA,
    PROMPT_SISTEMA_SUBSTITUICAO_ALIMENTO,
    PROMPT_SISTEMA_SUBSTITUICAO_EXERCICIO
)

roteador_ia = APIRouter(prefix="/api/ia", tags=["Inteligência Artificial Cloud"])


def obter_prompt_efetivo(perfil: PerfilUtilizador, tipo: str) -> str:
    """Retorna o prompt configurado pelo atleta no perfil ou o padrão de fábrica."""
    custom_dict = {}
    if perfil and perfil.prompts_customizados_json:
        try:
            custom_dict = json.loads(perfil.prompts_customizados_json)
        except Exception:
            custom_dict = {}

    if tipo == "coach":
        return custom_dict.get("coach") or getattr(perfil, "prompt_sistema_nutricao", None) or PROMPT_SISTEMA_COACH
    elif tipo == "treinador":
        return custom_dict.get("treinador") or getattr(perfil, "prompt_sistema_treinador", None) or PROMPT_SISTEMA_TREINADOR
    elif tipo == "dieta":
        return custom_dict.get("dieta") or PROMPT_SISTEMA_PRESCRICAO_DIETA
    elif tipo == "calibracao_dieta":
        return custom_dict.get("calibracao_dieta") or PROMPT_SISTEMA_CALIBRACAO_DIETA
    elif tipo == "substituicao_alimento":
        return custom_dict.get("substituicao_alimento") or PROMPT_SISTEMA_SUBSTITUICAO_ALIMENTO
    elif tipo == "substituicao_exercicio":
        return custom_dict.get("substituicao_exercicio") or PROMPT_SISTEMA_SUBSTITUICAO_EXERCICIO
    return PROMPT_SISTEMA_COACH


@roteador_ia.post("/salvar-chave")
def salvar_chave_api(dados: EsquemaConfiguracaoIA, sessao: Session = Depends(obter_sessao_bd)):
    """Guarda a chave de API da IA Cloud no perfil do utilizador."""
    perfil = sessao.query(PerfilUtilizador).first()
    if not perfil:
        perfil = PerfilUtilizador()
        sessao.add(perfil)
    
    perfil.chave_api_ia = dados.chave_api.strip()
    sessao.commit()
    sessao.refresh(perfil)
    return {"mensagem": "Chave API guardada com sucesso!", "configurado": True}


@roteador_ia.post("/testar-conexao")
async def testar_conexao_ia(dados: EsquemaConfiguracaoIA):
    """Testa se a chave API fornecida consegue comunicar com o serviço Cloud."""
    servico = ServicoCoachIA(chave_api=dados.chave_api, provedor=dados.provedor)
    dados_teste = {
        "sexo": "masculino",
        "idade": 25,
        "altura": 178,
        "peso_atual": 80.0,
        "variacao_peso_kg": -0.4,
        "bf_atual": 14.0,
        "fase_atual": "cut",
        "calorias": 2200,
        "proteina_g": 180,
        "gordura_g": 60,
        "hidratos_g": 235,
        "nivel_fadiga": 5,
        "qualidade_sono": 8,
        "nivel_fome": 4,
        "dores_ou_queixas": "Nenhuma",
        "notas_usuario": "Teste de conexão da API Cloud."
    }

    try:
        resultado = await servico.obter_recomendacoes_coach(dados_teste)
        return {
            "sucesso": True,
            "mensagem": "Comunicação com a IA Cloud estabelecida com sucesso!",
            "resposta_amostra": resultado
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Falha ao validar a chave API: {str(e)}")


@roteador_ia.get("/prompts")
def obter_prompts_ia(sessao: Session = Depends(obter_sessao_bd)):
    """Retorna todas as diretrizes da IA (personalizadas ou padrão) e os padrões originais."""
    perfil = sessao.query(PerfilUtilizador).first()
    custom_dict = {}
    if perfil and perfil.prompts_customizados_json:
        try:
            custom_dict = json.loads(perfil.prompts_customizados_json)
        except Exception:
            custom_dict = {}

    coach_custom = custom_dict.get("coach") or (perfil.prompt_sistema_nutricao if perfil and perfil.prompt_sistema_nutricao else None)
    treinador_custom = custom_dict.get("treinador") or (perfil.prompt_sistema_treinador if perfil and perfil.prompt_sistema_treinador else None)
    dieta_custom = custom_dict.get("dieta")
    calibracao_custom = custom_dict.get("calibracao_dieta")
    subst_alim_custom = custom_dict.get("substituicao_alimento")
    subst_exerc_custom = custom_dict.get("substituicao_exercicio")

    return {
        # Prompts Ativos (personalizados ou padrão)
        "prompt_coach": coach_custom or PROMPT_SISTEMA_COACH,
        "prompt_treinador": treinador_custom or PROMPT_SISTEMA_TREINADOR,
        "prompt_nutricao": coach_custom or PROMPT_SISTEMA_COACH,
        "prompt_dieta": dieta_custom or PROMPT_SISTEMA_PRESCRICAO_DIETA,
        "prompt_calibracao_dieta": calibracao_custom or PROMPT_SISTEMA_CALIBRACAO_DIETA,
        "prompt_substituicao_alimento": subst_alim_custom or PROMPT_SISTEMA_SUBSTITUICAO_ALIMENTO,
        "prompt_substituicao_exercicio": subst_exerc_custom or PROMPT_SISTEMA_SUBSTITUICAO_EXERCICIO,

        # Padrões de Fábrica
        "padrao_coach": PROMPT_SISTEMA_COACH,
        "padrao_treinador": PROMPT_SISTEMA_TREINADOR,
        "padrao_nutricao": PROMPT_SISTEMA_COACH,
        "padrao_dieta": PROMPT_SISTEMA_PRESCRICAO_DIETA,
        "padrao_calibracao_dieta": PROMPT_SISTEMA_CALIBRACAO_DIETA,
        "padrao_substituicao_alimento": PROMPT_SISTEMA_SUBSTITUICAO_ALIMENTO,
        "padrao_substituicao_exercicio": PROMPT_SISTEMA_SUBSTITUICAO_EXERCICIO,

        # Flags de personalização
        "customizado_coach": bool(coach_custom),
        "customizado_treinador": bool(treinador_custom),
        "customizado_nutricao": bool(coach_custom),
        "customizado_dieta": bool(dieta_custom),
        "customizado_calibracao_dieta": bool(calibracao_custom),
        "customizado_substituicao_alimento": bool(subst_alim_custom),
        "customizado_substituicao_exercicio": bool(subst_exerc_custom)
    }


@roteador_ia.post("/salvar-prompts")
def salvar_prompts_ia(dados: EsquemaSalvarPromptsIA, sessao: Session = Depends(obter_sessao_bd)):
    """Guarda todas as diretrizes personalizadas que o Coach IA deve seguir."""
    perfil = sessao.query(PerfilUtilizador).first()
    if not perfil:
        perfil = PerfilUtilizador()
        sessao.add(perfil)

    custom_dict = {}
    if perfil.prompts_customizados_json:
        try:
            custom_dict = json.loads(perfil.prompts_customizados_json)
        except Exception:
            custom_dict = {}

    if dados.prompt_coach is not None:
        val = dados.prompt_coach.strip()
        custom_dict["coach"] = val if val else None
        perfil.prompt_sistema_nutricao = val if val else None

    if dados.prompt_nutricao is not None and dados.prompt_coach is None:
        val = dados.prompt_nutricao.strip()
        custom_dict["coach"] = val if val else None
        perfil.prompt_sistema_nutricao = val if val else None

    if dados.prompt_treinador is not None:
        val = dados.prompt_treinador.strip()
        custom_dict["treinador"] = val if val else None
        perfil.prompt_sistema_treinador = val if val else None

    if dados.prompt_dieta is not None:
        val = dados.prompt_dieta.strip()
        custom_dict["dieta"] = val if val else None

    if dados.prompt_calibracao_dieta is not None:
        val = dados.prompt_calibracao_dieta.strip()
        custom_dict["calibracao_dieta"] = val if val else None

    if dados.prompt_substituicao_alimento is not None:
        val = dados.prompt_substituicao_alimento.strip()
        custom_dict["substituicao_alimento"] = val if val else None

    if dados.prompt_substituicao_exercicio is not None:
        val = dados.prompt_substituicao_exercicio.strip()
        custom_dict["substituicao_exercicio"] = val if val else None

    # Limpar chaves vazias
    custom_dict = {k: v for k, v in custom_dict.items() if v}
    perfil.prompts_customizados_json = json.dumps(custom_dict) if custom_dict else None

    sessao.commit()
    sessao.refresh(perfil)

    return {
        "mensagem": "Diretrizes e Prompts do Coach IA guardados com sucesso!",
        "customizado_coach": bool(custom_dict.get("coach")),
        "customizado_treinador": bool(custom_dict.get("treinador")),
        "customizado_dieta": bool(custom_dict.get("dieta")),
        "customizado_calibracao_dieta": bool(custom_dict.get("calibracao_dieta")),
        "customizado_substituicao_alimento": bool(custom_dict.get("substituicao_alimento")),
        "customizado_substituicao_exercicio": bool(custom_dict.get("substituicao_exercicio"))
    }


@roteador_ia.post("/restaurar-prompts-padrao")
def restaurar_prompts_padrao(sessao: Session = Depends(obter_sessao_bd)):
    """Restaura todas as diretrizes padrão de fábrica para o Coach IA."""
    perfil = sessao.query(PerfilUtilizador).first()
    if perfil:
        perfil.prompt_sistema_treinador = None
        perfil.prompt_sistema_nutricao = None
        perfil.prompts_customizados_json = None
        sessao.commit()

    return {
        "mensagem": "Todas as diretrizes padrão do Coach IA foram restauradas com sucesso!",
        "prompt_coach": PROMPT_SISTEMA_COACH,
        "prompt_treinador": PROMPT_SISTEMA_TREINADOR,
        "prompt_nutricao": PROMPT_SISTEMA_COACH,
        "prompt_dieta": PROMPT_SISTEMA_PRESCRICAO_DIETA,
        "prompt_calibracao_dieta": PROMPT_SISTEMA_CALIBRACAO_DIETA,
        "prompt_substituicao_alimento": PROMPT_SISTEMA_SUBSTITUICAO_ALIMENTO,
        "prompt_substituicao_exercicio": PROMPT_SISTEMA_SUBSTITUICAO_EXERCICIO,
        "customizado_coach": False,
        "customizado_treinador": False,
        "customizado_nutricao": False,
        "customizado_dieta": False,
        "customizado_calibracao_dieta": False,
        "customizado_substituicao_alimento": False,
        "customizado_substituicao_exercicio": False
    }
