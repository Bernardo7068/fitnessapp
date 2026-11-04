"""
Rotas de Treino, Catálogo de Exercícios, Geração Otimizada e Sobrecarga Progressiva.
"""

import json
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from .ajudantes_rotas import resolver_utilizador_id, obter_ou_criar_perfil
from .rotas_auth import obter_utilizador_opcional, ContaUtilizador
from sqlalchemy.orm import Session
from ..base_dados.conexao import obter_sessao_bd
from ..base_dados.modelos import PlanoTreinoGuardado, RegistoTreinoExecutado, PerfilUtilizador, ProjetoFisiologico
from ..esquemas.esquemas import (
    EsquemaGerarTreinoRequisicao,
    EsquemaProgressaoCargaRequisicao,
    EsquemaRecomendacaoTreinoIA,
    EsquemaSubstituirExercicioPlano
)
from ..ia_cloud.servico_coach import ServicoCoachIA
from .rotas_ia import obter_prompt_efetivo
from ..motor_matematico import (
    gerar_plano_treino_otimizado,
    calcular_progressao_carga,
    EXERCICIOS_CATALOGO
)

roteador_treinos = APIRouter(prefix="/api/treinos", tags=["Treinos"])


@roteador_treinos.get("/catalogo")
def obter_catalogo_exercicios():
    """Retorna todos os exercícios disponíveis na biblioteca biomecânica."""
    return [{"id": k, **v} for k, v in EXERCICIOS_CATALOGO.items()]


@roteador_treinos.post("/gerar")
def gerar_plano_recomendado(requisicao: EsquemaGerarTreinoRequisicao):
    """
    Gera um plano de treino.
    - Sem contexto adicional: usa o motor matemático clássico.
    - Com contexto avançado (foco, lesões, limitações, etc.): usa o motor personalizado.
    """
    tem_contexto_personalizado = any([
        bool((requisicao.foco or "").strip()),
        bool((requisicao.lesoes_atuais_ou_passadas or "").strip()),
        bool((requisicao.desproporcoes_pontos_fracos or "").strip()),
        bool((requisicao.problemas_limitacoes or "").strip()),
        bool((requisicao.atividades_secundarias or "").strip()),
        (requisicao.objetivo_especifico or "hipertrofia").strip().lower() != "hipertrofia",
        (requisicao.tipo_divisao_preferida or "personalizada").strip().lower() != "personalizada",
    ])

    if tem_contexto_personalizado:
        coach = ServicoCoachIA()
        return coach._gerar_treino_personalizado_heuristico_local({
            "dias_semana": requisicao.dias_semana,
            "duracao_minutos": requisicao.tempo_sessao_minutos,
            "nivel_experiencia": requisicao.nivel_experiencia,
            "objetivo_especifico": requisicao.objetivo_especifico or "hipertrofia",
            "desproporcoes_pontos_fracos": requisicao.desproporcoes_pontos_fracos or requisicao.foco or "",
            "lesoes_atuais_ou_passadas": requisicao.lesoes_atuais_ou_passadas or "",
            "problemas_limitacoes": requisicao.problemas_limitacoes or "",
            "atividades_secundarias": requisicao.atividades_secundarias or "",
            "cadencia_descanso": requisicao.cadencia_descanso or "dias_fixos",
            "tipo_divisao_preferida": requisicao.tipo_divisao_preferida or "personalizada",
            "fase_projeto": requisicao.fase_projeto or "cut",
            "calorias_diarias": requisicao.calorias_diarias or 2200.0,
            "series_alvo_semana": requisicao.series_alvo_semana or 14,
            "cardio_minutos_semana": requisicao.cardio_minutos_semana or 0,
        })

    plano = gerar_plano_treino_otimizado(
        dias_semana=requisicao.dias_semana,
        tempo_sessao_minutos=requisicao.tempo_sessao_minutos,
        nivel_experiencia=requisicao.nivel_experiencia,
        foco_personalizado=requisicao.foco
    )
    return plano


@roteador_treinos.post("/calcular-progressao")
def calcular_progressao(requisicao: EsquemaProgressaoCargaRequisicao):
    """Calcula o aumento ou ajuste de carga (Double Progression) para a próxima sessão."""
    resultado = calcular_progressao_carga(
        carga_anterior_kg=requisicao.carga_anterior_kg,
        repeticoes_feitas=requisicao.repeticoes_feitas,
        faixa_repeticoes=requisicao.faixa_repeticoes,
        rpe_atingido=requisicao.rpe_atingido,
        tentativas_estagnadas=requisicao.tentativas_estagnadas
    )
    return resultado


@roteador_treinos.post("/salvar-plano")
def salvar_plano_treino(
    dados_plano: dict,
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """Guarda ou atualiza o plano de treino ativo com todas as alterações manuais do atleta."""
    uid = resolver_utilizador_id(usuario)
    plano = sessao.query(PlanoTreinoGuardado).filter(PlanoTreinoGuardado.ativo == True, PlanoTreinoGuardado.utilizador_id == uid).first()
    sessoes_lista = dados_plano.get("sessoes", [])
    dias_calculados = len(sessoes_lista) if sessoes_lista else dados_plano.get("dias_por_semana", 4)
    volume_total = sum(sum(ex.get("series", 3) for ex in s.get("exercicios", [])) for s in sessoes_lista)

    if not plano:
        plano = PlanoTreinoGuardado(ativo=True, utilizador_id=uid)
        sessao.add(plano)

    proj_ativo = sessao.query(ProjetoFisiologico).filter(ProjetoFisiologico.ativo == True, ProjetoFisiologico.utilizador_id == uid).first()
    if dados_plano.get("id_projeto"):
        plano.id_projeto = dados_plano["id_projeto"]
        if dados_plano.get("nome_projeto"):
            plano.nome_projeto = dados_plano["nome_projeto"]
    elif proj_ativo:
        plano.id_projeto = proj_ativo.id
        plano.nome_projeto = proj_ativo.nome

    plano.nome = dados_plano.get("nome_divisao", plano.nome or "Plano Personalizado")
    plano.divisao = dados_plano.get("nome_divisao", plano.divisao or "Personalizada")
    plano.dias_semana = dias_calculados
    plano.tempo_sessao_minutos = dados_plano.get("tempo_sessao_minutos", plano.tempo_sessao_minutos or 60)
    if dados_plano.get("fase_projeto"):
        plano.fase_projeto = dados_plano["fase_projeto"]
    if dados_plano.get("nome_fase"):
        plano.nome_fase = dados_plano["nome_fase"]
    plano.sessoes_json = json.dumps(sessoes_lista)

    if dados_plano.get("motivo_ajuste"):
        try:
            historico = json.loads(plano.historico_alteracoes_json or "[]")
        except Exception:
            historico = []
        historico.insert(0, {
            "id": f"alt_treino_{int(datetime.utcnow().timestamp())}",
            "data_hora": datetime.now().strftime("%d/%m/%Y %H:%M"),
            "tipo": "edicao_manual",
            "sessao": dados_plano.get("sessao_editada", "Geral"),
            "exercicio_origem": "-",
            "exercicio_substituto": "-",
            "grupo_muscular": "-",
            "motivo": dados_plano.get("motivo_ajuste")
        })
        plano.historico_alteracoes_json = json.dumps(historico)

    plano.atualizado_em = datetime.utcnow()
    sessao.commit()
    sessao.refresh(plano)

    try:
        historico = json.loads(plano.historico_alteracoes_json or "[]")
    except Exception:
        historico = []

    return {
        "mensagem": "Plano de treino guardado com sucesso!",
        "plano": {
            "id": plano.id,
            "nome_divisao": plano.nome,
            "fase_projeto": plano.fase_projeto,
            "nome_fase": plano.nome_fase,
            "dias_por_semana": plano.dias_semana,
            "tempo_sessao_minutos": plano.tempo_sessao_minutos,
            "foco_principal": plano.divisao,
            "volume_total_series_semana": volume_total,
            "sessoes": sessoes_lista,
            "historico_alteracoes": historico,
            "atualizado_em": plano.atualizado_em.strftime("%d/%m/%Y %H:%M") if plano.atualizado_em else None
        }
    }


@roteador_treinos.get("/plano-ativo")
def obter_plano_ativo(
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """Recupera o plano de treino atualmente ativo com identificação de fase e histórico de alterações."""
    uid = resolver_utilizador_id(usuario)
    plano = sessao.query(PlanoTreinoGuardado).filter(PlanoTreinoGuardado.ativo == True, PlanoTreinoGuardado.utilizador_id == uid).first()
    if not plano:
        # Se não houver plano guardado, obter perfil limpo e gerar um padrão específico para este utilizador
        perfil = obter_ou_criar_perfil(sessao, uid, nome_padrao=usuario.nome if usuario else "Atleta")
        fase = perfil.fase_atual if perfil else "bulk"
        plano_padrao = gerar_plano_treino_otimizado(dias_semana=4, tempo_sessao_minutos=60)
        from dataclasses import asdict, is_dataclass
        plano_dict = asdict(plano_padrao) if is_dataclass(plano_padrao) else (plano_padrao if isinstance(plano_padrao, dict) else getattr(plano_padrao, "__dict__", {}))
        sessoes_iniciais = plano_dict.get("sessoes", [])
        plano = PlanoTreinoGuardado(
            utilizador_id=uid,
            nome=plano_dict.get("nome_divisao", "Plano Recomendado"),
            divisao=plano_dict.get("nome_divisao", "Upper / Lower"),
            dias_semana=plano_dict.get("dias_por_semana", 4),
            tempo_sessao_minutos=60,
            fase_projeto=fase,
            nome_fase="Fase Inicial",
            ativo=True,
            sessoes_json=json.dumps(sessoes_iniciais),
            historico_alteracoes_json="[]",
            atualizado_em=datetime.utcnow()
        )
        sessao.add(plano)
        sessao.commit()
        sessao.refresh(plano)

    sessoes_carregadas = json.loads(plano.sessoes_json or "[]")
    volume_total = sum(sum(ex.get("series", 3) for ex in s.get("exercicios", [])) for s in sessoes_carregadas)
    try:
        historico = json.loads(plano.historico_alteracoes_json or "[]")
    except Exception:
        historico = []

    return {
        "id": plano.id,
        "nome_divisao": plano.nome,
        "fase_projeto": plano.fase_projeto,
        "nome_fase": plano.nome_fase,
        "dias_por_semana": len(sessoes_carregadas) if sessoes_carregadas else plano.dias_semana,
        "tempo_sessao_minutos": plano.tempo_sessao_minutos,
        "foco_principal": plano.divisao or "Plano Ativo Personalizado",
        "volume_total_series_semana": volume_total,
        "sessoes": sessoes_carregadas,
        "historico_alteracoes": historico,
        "atualizado_em": plano.atualizado_em.strftime("%d/%m/%Y %H:%M") if plano.atualizado_em else None
    }


@roteador_treinos.post("/substituir-exercicio-sessao")
def substituir_exercicio_sessao(
    dados: EsquemaSubstituirExercicioPlano,
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """Substitui um exercício de uma sessão de treino no plano ativo registando o motivo clínico/biomecânico."""
    uid = resolver_utilizador_id(usuario)
    plano = sessao.query(PlanoTreinoGuardado).filter(PlanoTreinoGuardado.ativo == True, PlanoTreinoGuardado.utilizador_id == uid).first()
    if not plano:
        raise HTTPException(status_code=404, detail="Nenhum plano de treino ativo encontrado")

    sessoes = json.loads(plano.sessoes_json or "[]")
    if dados.sessao_index < 0 or dados.sessao_index >= len(sessoes):
        raise HTTPException(status_code=400, detail="Sessão não encontrada")

    sessao_alvo = sessoes[dados.sessao_index]
    exercicios = sessao_alvo.get("exercicios", [])
    if dados.exercicio_index < 0 or dados.exercicio_index >= len(exercicios):
        raise HTTPException(status_code=400, detail="Exercício não encontrado na sessão")

    ex_antigo = exercicios[dados.exercicio_index]
    nome_antigo = ex_antigo.get("nome", "Exercício Anterior")
    grupo_antigo = ex_antigo.get("grupo_muscular", "Geral")

    # Obter dados do novo exercício
    novo_id = dados.novo_exercicio_id or ""
    info_catalogo = EXERCICIOS_CATALOGO.get(novo_id, {})
    novo_nome = dados.novo_exercicio_nome or info_catalogo.get("nome", novo_id.replace("_", " ").title())
    novo_grupo = dados.grupo_muscular or info_catalogo.get("grupo_muscular", grupo_antigo)

    series_finais = dados.series if dados.series is not None else ex_antigo.get("series", 3)
    reps_finais = dados.repeticoes_alvo if dados.repeticoes_alvo is not None else ex_antigo.get("repeticoes_alvo", "8-12")
    rpe_final = dados.rpe_alvo if dados.rpe_alvo is not None else ex_antigo.get("rpe_alvo", 8.0)
    descanso_final = dados.descanso_segundos if dados.descanso_segundos is not None else ex_antigo.get("descanso_segundos", 90)
    carga_final = dados.carga_sugerida_kg if dados.carga_sugerida_kg is not None else ex_antigo.get("carga_sugerida_kg", 0.0)

    # Atualizar o exercício na sessão
    exercicios[dados.exercicio_index] = {
        "id_exercicio": novo_id if novo_id else f"custom_{int(datetime.utcnow().timestamp())}",
        "nome": novo_nome,
        "grupo_muscular": novo_grupo,
        "series": series_finais,
        "repeticoes_alvo": reps_finais,
        "rpe_alvo": rpe_final,
        "descanso_segundos": descanso_final,
        "carga_sugerida_kg": carga_final,
        "notas_execucao": ex_antigo.get("notas_execucao", "")
    }
    plano.sessoes_json = json.dumps(sessoes)

    # Registar a alteração no histórico de adaptações da fase
    try:
        historico = json.loads(plano.historico_alteracoes_json or "[]")
    except Exception:
        historico = []

    novo_registo = {
        "id": f"alt_treino_{int(datetime.utcnow().timestamp())}_{dados.sessao_index}_{dados.exercicio_index}",
        "data_hora": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "tipo": "troca_exercicio",
        "sessao": sessao_alvo.get("dia_nome", f"Sessão {dados.sessao_index + 1}"),
        "exercicio_origem": nome_antigo,
        "exercicio_substituto": novo_nome,
        "grupo_muscular": novo_grupo,
        "motivo": dados.motivo or "Dor articular / Ajuste biomecânico"
    }
    historico.insert(0, novo_registo)
    plano.historico_alteracoes_json = json.dumps(historico)
    plano.atualizado_em = datetime.utcnow()

    sessao.commit()
    sessao.refresh(plano)

    volume_total = sum(sum(ex.get("series", 3) for ex in s.get("exercicios", [])) for s in sessoes)

    return {
        "mensagem": f"Substituído com sucesso: {nome_antigo} -> {novo_nome}",
        "plano": {
            "id": plano.id,
            "nome_divisao": plano.nome,
            "fase_projeto": plano.fase_projeto,
            "nome_fase": plano.nome_fase,
            "dias_por_semana": len(sessoes) if sessoes else plano.dias_semana,
            "tempo_sessao_minutos": plano.tempo_sessao_minutos,
            "foco_principal": plano.divisao or "Plano Ativo Personalizado",
            "volume_total_series_semana": volume_total,
            "sessoes": sessoes,
            "historico_alteracoes": historico,
            "atualizado_em": plano.atualizado_em.strftime("%d/%m/%Y %H:%M") if plano.atualizado_em else None
        }
    }


@roteador_treinos.post("/sugerir-substituicao-ia")
async def sugerir_substituicao_exercicio_com_ia(
    dados: dict,
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """Recomenda 2 a 3 alternativas biomecânicas seguras quando o atleta relata desconforto ou dor num exercício."""
    uid = resolver_utilizador_id(usuario)
    perfil = obter_ou_criar_perfil(sessao, uid)
    chave_ia = dados.get("chave_api_ia") or (perfil.chave_api_ia if perfil else None)
    prompt_custom = obter_prompt_efetivo(perfil, "substituicao_exercicio") if perfil else None

    dados_substituicao = {
        "exercicio_atual": dados.get("exercicio_atual", "Exercício"),
        "grupo_muscular": dados.get("grupo_muscular", "Geral"),
        "queixa_desconforto": dados.get("queixa_desconforto", "Desconforto na execução"),
        "objetivo": dados.get("objetivo", "hipertrofia"),
        "fase": dados.get("fase", perfil.fase_atual if perfil else "cut")
    }

    coach = ServicoCoachIA(chave_api=chave_ia)
    resultado = await coach.sugerir_substituicao_exercicio_ia(
        dados_substituicao=dados_substituicao,
        chave_substituta=chave_ia,
        prompt_sistema_substituto=prompt_custom
    )
    return resultado


@roteador_treinos.get("/historico-fases")
def obter_historico_fases_treino(
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """Retorna o histórico de todos os planos de treino guardados em cada fase do projeto."""
    uid = resolver_utilizador_id(usuario)
    planos = sessao.query(PlanoTreinoGuardado).filter(PlanoTreinoGuardado.utilizador_id == uid).order_by(PlanoTreinoGuardado.id.desc()).all()
    resultado = []
    for p in planos:
        try:
            sessoes = json.loads(p.sessoes_json or "[]")
        except Exception:
            sessoes = []
        try:
            historico = json.loads(p.historico_alteracoes_json or "[]")
        except Exception:
            historico = []

        volume_total = sum(sum(ex.get("series", 3) for ex in s.get("exercicios", [])) for s in sessoes)

        resultado.append({
            "id": p.id,
            "nome_divisao": p.nome,
            "fase_projeto": p.fase_projeto,
            "nome_fase": p.nome_fase or p.nome,
            "ativo": bool(p.ativo),
            "dias_por_semana": len(sessoes) if sessoes else p.dias_semana,
            "tempo_sessao_minutos": p.tempo_sessao_minutos,
            "foco_principal": p.divisao,
            "volume_total_series_semana": volume_total,
            "sessoes": sessoes,
            "historico_alteracoes": historico,
            "atualizado_em": p.atualizado_em.strftime("%d/%m/%Y %H:%M") if p.atualizado_em else None,
            "criado_em": p.criado_em.strftime("%d/%m/%Y %H:%M") if p.criado_em else None
        })
    return resultado


@roteador_treinos.post("/reativar-fase-treino")
def reativar_fase_treino(
    dados: dict,
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """Permite reativar o plano de treino de uma fase anterior."""
    uid = resolver_utilizador_id(usuario)
    plano_id = dados.get("plano_id")
    plano_alvo = sessao.query(PlanoTreinoGuardado).filter(PlanoTreinoGuardado.id == plano_id, PlanoTreinoGuardado.utilizador_id == uid).first()
    if not plano_alvo:
        raise HTTPException(status_code=404, detail="Plano de treino não encontrado")

    sessao.query(PlanoTreinoGuardado).filter(PlanoTreinoGuardado.utilizador_id == uid).update({"ativo": False})
    plano_alvo.ativo = True
    plano_alvo.atualizado_em = datetime.utcnow()

    sessao.commit()
    sessao.refresh(plano_alvo)

    try:
        sessoes = json.loads(plano_alvo.sessoes_json or "[]")
    except Exception:
        sessoes = []
    try:
        historico = json.loads(plano_alvo.historico_alteracoes_json or "[]")
    except Exception:
        historico = []

    volume_total = sum(sum(ex.get("series", 3) for ex in s.get("exercicios", [])) for s in sessoes)

    return {
        "mensagem": f"Plano de treino '{plano_alvo.nome_fase or plano_alvo.nome}' reativado com sucesso!",
        "plano": {
            "id": plano_alvo.id,
            "nome_divisao": plano_alvo.nome,
            "fase_projeto": plano_alvo.fase_projeto,
            "nome_fase": plano_alvo.nome_fase,
            "ativo": True,
            "dias_por_semana": len(sessoes) if sessoes else plano_alvo.dias_semana,
            "tempo_sessao_minutos": plano_alvo.tempo_sessao_minutos,
            "foco_principal": plano_alvo.divisao,
            "volume_total_series_semana": volume_total,
            "sessoes": sessoes,
            "historico_alteracoes": historico,
            "atualizado_em": plano_alvo.atualizado_em.strftime("%d/%m/%Y %H:%M") if plano_alvo.atualizado_em else None
        }
    }


@roteador_treinos.post("/registar-sessao")
def registar_sessao_treino(
    dados: dict,
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """Grava o registo de uma sessão de treino concluída em direto."""
    uid = resolver_utilizador_id(usuario)
    registo = RegistoTreinoExecutado(
        utilizador_id=uid,
        sessao_nome=dados.get("sessao_nome", "Treino"),
        duracao_minutos=dados.get("duracao_minutos", 60),
        rpe_geral=dados.get("rpe_geral", 8.0),
        exercicios_json=json.dumps(dados.get("exercicios", [])),
        notas=dados.get("notas", "")
    )
    sessao.add(registo)
    sessao.commit()
    sessao.refresh(registo)
    return {"mensagem": "Treino registado com sucesso", "id": registo.id}


@roteador_treinos.post("/recomendar-ia")
async def recomendar_treino_com_ia(
    requisicao: EsquemaRecomendacaoTreinoIA,
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """
    Gera uma prescrição de treino altamente individualizada com recurso a IA (Cloud / Heurística),
    analisando o projeto atual, lesões, desproporções musculares, dias e tempo disponíveis.
    """
    uid = resolver_utilizador_id(usuario)
    perfil = obter_ou_criar_perfil(sessao, uid)
    chave_api = requisicao.chave_api_ia or (perfil.chave_api_ia if perfil else None)

    coach = ServicoCoachIA(chave_api=chave_api)
    dados = requisicao.model_dump()
    if perfil:
        dados["idade"] = perfil.idade or 25
        dados["sexo"] = perfil.sexo or "masculino"
        dados["peso_atual"] = perfil.peso_atual or 70.0
        dados["nivel_experiencia"] = perfil.nivel_experiencia or "iniciante"
    if perfil:
        if getattr(perfil, "projeto_ativo_json", None):
            try:
                proj = json.loads(perfil.projeto_ativo_json)
                if not dados.get("fase_projeto"):
                    dados["fase_projeto"] = proj.get("tipo_fase") or perfil.fase_atual
                if not dados.get("nome_fase_projeto"):
                    dados["nome_fase_projeto"] = proj.get("nome_fase")
                if not dados.get("calorias_diarias"):
                    dados["calorias_diarias"] = proj.get("calorias_alvo") or perfil.calorias_atuais
                if not dados.get("foco_treino_projeto"):
                    dados["foco_treino_projeto"] = proj.get("foco_treino")
                if not dados.get("cardio_minutos_semana"):
                    dados["cardio_minutos_semana"] = proj.get("cardio_minutos_semana")
                if not dados.get("series_alvo_semana"):
                    dados["series_alvo_semana"] = proj.get("series_trabalho_alvo")
                obs_proj = proj.get("observacoes_contexto") or ""
                if obs_proj:
                    if not dados.get("lesoes_atuais_ou_passadas"):
                        dados["lesoes_atuais_ou_passadas"] = obs_proj
                    elif obs_proj not in dados["lesoes_atuais_ou_passadas"]:
                        dados["lesoes_atuais_ou_passadas"] = f"{dados['lesoes_atuais_ou_passadas']} | Contexto do Projeto: {obs_proj}"
                    if not dados.get("problemas_limitacoes"):
                        dados["problemas_limitacoes"] = obs_proj
                    elif obs_proj not in dados["problemas_limitacoes"]:
                        dados["problemas_limitacoes"] = f"{dados['problemas_limitacoes']} | Contexto do Projeto: {obs_proj}"
            except Exception:
                pass
        if not dados.get("fase_projeto"):
            dados["fase_projeto"] = perfil.fase_atual
        if not dados.get("calorias_diarias"):
            dados["calorias_diarias"] = perfil.calorias_atuais

    prompt_custom = obter_prompt_efetivo(perfil, "treinador") if perfil else None
    resultado = await coach.obter_recomendacao_treino_personalizado(
        dados,
        chave_substituta=chave_api,
        prompt_sistema_substituto=prompt_custom
    )
    return resultado


@roteador_treinos.get("/historico")
def obter_historico_treinos(
    limite: int = 20,
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """Retorna os últimos registos de treinos executados com cargas e repetições reais."""
    uid = resolver_utilizador_id(usuario)
    registos = (
        sessao.query(RegistoTreinoExecutado)
        .filter(RegistoTreinoExecutado.utilizador_id == uid)
        .order_by(RegistoTreinoExecutado.data.desc())
        .limit(limite)
        .all()
    )
    resultado = []
    for r in registos:
        resultado.append({
            "id": r.id,
            "data": r.data.isoformat(),
            "sessao_nome": r.sessao_nome,
            "duracao_minutos": r.duracao_minutos,
            "rpe_geral": r.rpe_geral,
            "exercicios": json.loads(r.exercicios_json) if r.exercicios_json else [],
            "notas": r.notas
        })
    return resultado


@roteador_treinos.get("/progresso-exercicios")
def obter_progresso_todos_exercicios(
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """
    Retorna a linha do tempo e progressão de cargas de todos os exercícios já registados.
    Indexado por nome e por id para pesquisa instantânea no frontend.
    """
    uid = resolver_utilizador_id(usuario)
    registos = (
        sessao.query(RegistoTreinoExecutado)
        .filter(RegistoTreinoExecutado.utilizador_id == uid)
        .order_by(RegistoTreinoExecutado.data.asc())
        .all()
    )
    mapa_progresso = {}

    for r in registos:
        exs = json.loads(r.exercicios_json) if r.exercicios_json else []
        data_formatada = r.data.strftime("%d/%m/%Y")
        for ex in exs:
            nome = (ex.get("nome") or "").strip()
            ex_id = (ex.get("id_exercicio") or "").strip()
            if not nome and not ex_id:
                continue

            # Obter séries concluídas ou que tenham carga/reps válidas
            series_feitas = [
                s for s in ex.get("series", [])
                if s.get("concluida") or (float(s.get("carga_kg", 0.0)) > 0 and int(s.get("repeticoes", 0)) > 0)
            ]
            if not series_feitas:
                continue

            # Cálculo de métricas da sessão
            cargas = [float(s.get("carga_kg", 0.0)) for s in series_feitas]
            reps = [int(s.get("repeticoes", 0)) for s in series_feitas]
            carga_max = max(cargas) if cargas else 0.0
            vol_total = sum(c * r for c, r in zip(cargas, reps))

            # Encontrar melhor série (maior 1RM estimado)
            melhor_serie_obj = max(
                series_feitas,
                key=lambda s: float(s.get("carga_kg", 0.0)) * (1.0 + int(s.get("repeticoes", 0)) / 30.0)
            )
            melhor_serie_txt = f"{melhor_serie_obj.get('carga_kg', 0)} kg × {melhor_serie_obj.get('repeticoes', 0)} reps"

            entrada_timeline = {
                "registo_id": r.id,
                "data": data_formatada,
                "data_iso": r.data.isoformat(),
                "sessao_nome": r.sessao_nome,
                "carga_maxima_kg": carga_max,
                "volume_total_kg": round(vol_total, 1),
                "melhor_serie": melhor_serie_txt,
                "series": [
                    {
                        "numero_serie": s.get("numero_serie", idx + 1),
                        "carga_kg": float(s.get("carga_kg", 0.0)),
                        "repeticoes": int(s.get("repeticoes", 0)),
                        "rpe": s.get("rpe", 8.0)
                    }
                    for idx, s in enumerate(series_feitas)
                ]
            }

            chaves = set()
            if nome:
                chaves.add(nome.lower())
            if ex_id:
                chaves.add(ex_id.lower())

            for k in chaves:
                if k not in mapa_progresso:
                    mapa_progresso[k] = {
                        "nome": nome,
                        "id_exercicio": ex_id,
                        "grupo_muscular": ex.get("grupo_muscular_primario", ""),
                        "timeline": []
                    }
                mapa_progresso[k]["timeline"].append(entrada_timeline)

    # Computar recorde pessoal e resumo para cada exercício
    for k, v in mapa_progresso.items():
        timeline = v["timeline"]
        if timeline:
            v["ultimo_treino"] = timeline[-1]
            todas_series = [s for t in timeline for s in t["series"]]
            if todas_series:
                melhor_ever = max(
                    todas_series,
                    key=lambda s: float(s["carga_kg"]) * (1.0 + int(s["repeticoes"]) / 30.0)
                )
                v["recorde_pessoal"] = f"{melhor_ever['carga_kg']} kg × {melhor_ever['repeticoes']} reps"
                v["carga_maxima_historica"] = max(s["carga_kg"] for s in todas_series)
            else:
                v["recorde_pessoal"] = "-"
                v["carga_maxima_historica"] = 0.0

            v["total_sessoes"] = len(timeline)
            if len(timeline) > 1:
                v["evolucao_carga_kg"] = round(timeline[-1]["carga_maxima_kg"] - timeline[0]["carga_maxima_kg"], 1)
            else:
                v["evolucao_carga_kg"] = 0.0

    return mapa_progresso
