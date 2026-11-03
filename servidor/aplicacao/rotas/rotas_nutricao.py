"""
Rotas de Nutrição, Dieta Adaptativa, Prescrição com IA, Diário de Consumo e Equivalências.
"""

import json
from datetime import datetime
from typing import Optional
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from .ajudantes_rotas import resolver_utilizador_id, obter_ou_criar_perfil
from .rotas_auth import obter_utilizador_opcional, ContaUtilizador
from sqlalchemy.orm import Session
from ..base_dados.conexao import obter_sessao_bd
from ..base_dados.modelos import PlanoDietaGuardado, PerfilUtilizador, RegistoDiarioConsumo, ProjetoFisiologico
from ..esquemas.esquemas import (
    EsquemaSubstituicaoRequisicao,
    EsquemaPrescricaoDietaIA,
    EsquemaToggleCheckRefeicao,
    EsquemaAdicionarItemAvulso,
    EsquemaSubstituirAlimentoPlano
)
from ..motor_matematico import (
    calcular_composicao_e_tdee,
    calcular_distribuicao_macros,
    calcular_divisao_refeicoes,
    calcular_substituicao_alimento,
    TABELA_ALIMENTOS_EQUIVALENCIAS
)
from ..ia_cloud.servico_coach import ServicoCoachIA
from .rotas_ia import obter_prompt_efetivo

roteador_nutricao = APIRouter(prefix="/api/nutricao", tags=["Nutrição e Dieta"])


@roteador_nutricao.get("/tabela-alimentos")
def obter_tabela_alimentos():
    """Retorna os alimentos da base de equivalências nutricionais."""
    return [{"id": k, **v} for k, v in TABELA_ALIMENTOS_EQUIVALENCIAS.items()]


@roteador_nutricao.post("/calcular-equivalencia")
def calcular_equivalencia(requisicao: EsquemaSubstituicaoRequisicao):
    """Calcula a troca matemática exata de um alimento por outro sem desbalancear os macros."""
    try:
        resultado = calcular_substituicao_alimento(
            alimento_origem_id=requisicao.alimento_origem_id,
            gramas_origem=requisicao.gramas_origem,
            alimento_destino_id=requisicao.alimento_destino_id
        )
        return resultado
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@roteador_nutricao.get("/plano-ativo")
def obter_plano_dieta_ativo(
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """Obtém o plano de dieta atualmente ativo com detalhe completo de alimentos e gramas."""
    uid = resolver_utilizador_id(usuario)
    plano = sessao.query(PlanoDietaGuardado).filter(PlanoDietaGuardado.ativo == True, PlanoDietaGuardado.utilizador_id == uid).first()
    if not plano:
        # Se não existe, obter perfil para gerar automaticamente um plano inicial com alimentos concretos
        perfil = obter_ou_criar_perfil(sessao, uid, nome_padrao=usuario.nome if usuario else "Atleta")
        calorias = perfil.calorias_atuais if perfil else 2500.0
        fase = perfil.fase_atual if perfil else "bulk"
        
        servico = ServicoCoachIA()
        resultado = servico._gerar_dieta_personalizada_heuristica_local({
            "calorias_diarias": calorias,
            "fase_projeto": fase,
            "numero_refeicoes": 4,
            "horario_treino": "tarde"
        })

        plano = PlanoDietaGuardado(
            utilizador_id=uid,
            nome=resultado.get("nome_plano", "Dieta Base Adaptativa"),
            calorias=float(resultado.get("calorias_alvo", calorias)),
            proteina_g=float(resultado.get("proteina_alvo_g", 160.0)),
            gordura_g=float(resultado.get("gordura_alvo_g", 65.0)),
            hidratos_g=float(resultado.get("hidratos_alvo_g", 280.0)),
            fibras_g=float(resultado.get("fibras_alvo_g", 30.0)),
            ativo=True,
            refeicoes_json=json.dumps(resultado.get("refeicoes", []))
        )
        sessao.add(plano)
        sessao.commit()
        sessao.refresh(plano)

    refeicoes = json.loads(plano.refeicoes_json or "[]")
    try:
        historico = json.loads(plano.historico_alteracoes_json or "[]")
    except Exception:
        historico = []

    return {
        "id": plano.id,
        "nome": plano.nome,
        "fase_projeto": plano.fase_projeto,
        "nome_fase": plano.nome_fase,
        "calorias": plano.calorias,
        "macros": {
            "calorias": plano.calorias,
            "proteina_g": plano.proteina_g,
            "gordura_g": plano.gordura_g,
            "hidratos_g": plano.hidratos_g,
            "fibras_g": plano.fibras_g
        },
        "refeicoes": refeicoes,
        "historico_alteracoes": historico,
        "atualizado_em": plano.atualizado_em.strftime("%d/%m/%Y %H:%M") if plano.atualizado_em else None
    }


@roteador_nutricao.post("/prescrever-ia")
async def prescrever_dieta_com_ia(
    dados: EsquemaPrescricaoDietaIA,
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """Gera prescrição alimentar individualizada via IA Cloud / Motor Nutricional."""
    uid = resolver_utilizador_id(usuario)
    perfil = obter_ou_criar_perfil(sessao, uid, nome_padrao=usuario.nome if usuario else "Atleta")

    # 1. Obter o projeto ativo prioritário na base de dados
    proj_ativo = sessao.query(ProjetoFisiologico).filter(
        ProjetoFisiologico.ativo == True,
        ProjetoFisiologico.utilizador_id == uid
    ).first()

    calorias_projeto = None
    fase_projeto = None
    nome_fase = ""
    peso_atleta = perfil.peso_atual or (proj_ativo.peso_inicial_kg if proj_ativo else 75.0)

    if proj_ativo:
        fase_projeto = proj_ativo.fase_atual_tipo
        nome_fase = proj_ativo.fase_atual_nome
        try:
            fases_lista = json.loads(proj_ativo.fases_json or "[]")
            for f in fases_lista:
                if f.get("tipo") == proj_ativo.fase_atual_tipo or f.get("nome_exibicao") == proj_ativo.fase_atual_nome or f.get("nome") == proj_ativo.fase_atual_nome:
                    if f.get("calorias_diarias"):
                        calorias_projeto = float(f.get("calorias_diarias"))
                    break
            if not calorias_projeto and fases_lista and fases_lista[0].get("calorias_diarias"):
                calorias_projeto = float(fases_lista[0].get("calorias_diarias"))
        except Exception:
            pass

    if not calorias_projeto and perfil.projeto_ativo_json:
        try:
            p_json = json.loads(perfil.projeto_ativo_json)
            calorias_projeto = float(p_json.get("calorias_diarias") or p_json.get("calorias_alvo") or 0)
            if not fase_projeto:
                fase_projeto = p_json.get("fase_tipo") or p_json.get("tipo_fase")
            if not nome_fase:
                nome_fase = p_json.get("nome_fase", "")
        except Exception:
            pass

    if not calorias_projeto:
        calorias_projeto = perfil.calorias_atuais or 2500.0
    if not fase_projeto:
        fase_projeto = perfil.fase_atual or "bulk"

    # Prioridade de calorias: respeita o que o projeto ativo exige com os ajustes do atleta
    calorias_finais = float(dados.calorias_diarias or calorias_projeto)
    fase_final = dados.fase_projeto or fase_projeto
    nome_fase_final = dados.nome_fase_projeto or nome_fase or f"Fase {fase_final.title()}"

    # Guardar preferências alimentares no perfil
    prefs = {
        "alimentos_preferidos": dados.alimentos_preferidos or "",
        "alimentos_evitados": dados.alimentos_evitados or "",
        "numero_refeicoes": dados.numero_refeicoes,
        "horario_treino": dados.horario_treino or "tarde",
        "habitos_apetite": dados.habitos_apetite or "",
        "alimentos_dificeis": dados.alimentos_dificeis or ""
    }
    perfil.preferencias_alimentares_json = json.dumps(prefs)
    sessao.commit()

    dados_dieta = {
        "calorias_diarias": calorias_finais,
        "fase_projeto": fase_final,
        "nome_fase_projeto": nome_fase_final,
        "peso_atual": peso_atleta,
        "alimentos_preferidos": dados.alimentos_preferidos or "",
        "alimentos_evitados": dados.alimentos_evitados or "",
        "numero_refeicoes": dados.numero_refeicoes,
        "horario_treino": dados.horario_treino or "tarde",
        "habitos_apetite": dados.habitos_apetite or "",
        "alimentos_dificeis": dados.alimentos_dificeis or ""
    }

    chave_ia = dados.chave_api_ia or perfil.chave_api_ia
    prompt_custom = obter_prompt_efetivo(perfil, "dieta") if perfil else None

    servico_ia = ServicoCoachIA(chave_api=chave_ia)
    resultado = await servico_ia.obter_prescricao_dieta_personalizada(
        dados_dieta=dados_dieta,
        chave_substituta=chave_ia,
        prompt_sistema_substituto=prompt_custom
    )

    # Desativar planos antigos e guardar o novo como ativo
    sessao.query(PlanoDietaGuardado).filter(PlanoDietaGuardado.utilizador_id == uid).update({"ativo": False})
    
    proj_ativo = sessao.query(ProjetoFisiologico).filter(ProjetoFisiologico.ativo == True, ProjetoFisiologico.utilizador_id == uid).first()
    refeicoes = resultado.get("refeicoes", [])
    novo_plano = PlanoDietaGuardado(
        utilizador_id=uid,
        nome=resultado.get("nome_plano", "Dieta Adaptativa IA"),
        id_projeto=proj_ativo.id if proj_ativo else None,
        nome_projeto=proj_ativo.nome if proj_ativo else None,
        fase_projeto=fase_final,
        nome_fase=nome_fase_final or f"Fase {fase_final.title()}",
        calorias=float(resultado.get("calorias_alvo", calorias_finais)),
        proteina_g=float(resultado.get("proteina_alvo_g", 160.0)),
        gordura_g=float(resultado.get("gordura_alvo_g", 65.0)),
        hidratos_g=float(resultado.get("hidratos_alvo_g", 280.0)),
        fibras_g=float(resultado.get("fibras_alvo_g", 30.0)),
        ativo=True,
        refeicoes_json=json.dumps(refeicoes),
        historico_alteracoes_json="[]",
        atualizado_em=datetime.utcnow()
    )
    sessao.add(novo_plano)

    # Atualizar o registo diário de hoje com os novos alvos
    data_hoje = datetime.utcnow().strftime("%Y-%m-%d")
    registo_hoje = sessao.query(RegistoDiarioConsumo).filter(RegistoDiarioConsumo.data == data_hoje, RegistoDiarioConsumo.utilizador_id == uid).first()
    if registo_hoje:
        registo_hoje.calorias_alvo = novo_plano.calorias
        registo_hoje.proteina_alvo_g = novo_plano.proteina_g
        registo_hoje.hidratos_alvo_g = novo_plano.hidratos_g
        registo_hoje.gordura_alvo_g = novo_plano.gordura_g

    sessao.commit()
    sessao.refresh(novo_plano)

    return {
        "mensagem": "Plano alimentar gerado e ativado com sucesso!",
        "plano": {
            "id": novo_plano.id,
            "nome": novo_plano.nome,
            "calorias": novo_plano.calorias,
            "macros": {
                "calorias": novo_plano.calorias,
                "proteina_g": novo_plano.proteina_g,
                "gordura_g": novo_plano.gordura_g,
                "hidratos_g": novo_plano.hidratos_g,
                "fibras_g": novo_plano.fibras_g
            },
            "refeicoes": refeicoes
        },
        "detalhes_ia": {
            "estrategia_fase_projeto": resultado.get("estrategia_fase_projeto"),
            "ajuste_horario_treino": resultado.get("ajuste_horario_treino"),
            "ajuste_apetite_e_saciedade": resultado.get("ajuste_apetite_e_saciedade"),
            "modo_demonstracao": resultado.get("modo_demonstracao", False),
            "aviso_conexao": resultado.get("aviso_conexao")
        }
    }


@roteador_nutricao.get("/preferencias")
def obter_preferencias_nutricao(
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """Retorna as preferências alimentares salvas do utilizador."""
    uid = resolver_utilizador_id(usuario)
    perfil = obter_ou_criar_perfil(sessao, uid)
    if not perfil or not perfil.preferencias_alimentares_json:
        return {
            "alimentos_preferidos": "Arroz, batata, aveia, frango, carne picada, ovos, iogurte, fruta, azeite",
            "alimentos_evitados": "",
            "numero_refeicoes": 4,
            "horario_treino": "tarde",
            "habitos_apetite": "Apetite normal",
            "alimentos_dificeis": ""
        }
    return json.loads(perfil.preferencias_alimentares_json)


def _reconciliar_e_recalcular_diario(
    registo: RegistoDiarioConsumo,
    plano: Optional[PlanoDietaGuardado],
    sessao: Session
) -> dict:
    """
    Recalcula com rigor matemático absoluto os totais consumidos do dia (calorias e macros),
    somando apenas os alimentos que realmente estão checados no plano ativo e os itens avulsos.
    Remove automaticamente chaves órfãs de alimentos que já não existem no plano.
    """
    checks = json.loads(registo.checks_refeicoes_json or "{}")
    itens_avulsos = json.loads(registo.itens_avulsos_json or "[]")

    kcal_total = 0.0
    p_total = 0.0
    h_total = 0.0
    g_total = 0.0

    if plano:
        refeicoes = json.loads(plano.refeicoes_json or "[]")
        ids_validos = set()
        for r in refeicoes:
            for a in r.get("alimentos", []):
                aid = a.get("id_alimento")
                if aid:
                    ids_validos.add(aid)
                    if checks.get(aid) is True:
                        kcal_total += float(a.get("calorias", 0.0))
                        p_total += float(a.get("proteina_g", 0.0))
                        h_total += float(a.get("hidratos_g", 0.0))
                        g_total += float(a.get("gordura_g", 0.0))

        # Purgar chaves órfãs de alimentos que já não existem no plano (ex: substituídos ou excluídos)
        checks_limpos = {k: v for k, v in checks.items() if k in ids_validos}
        if checks_limpos != checks:
            checks = checks_limpos
            registo.checks_refeicoes_json = json.dumps(checks)

    for it in itens_avulsos:
        kcal_total += float(it.get("calorias", 0.0))
        p_total += float(it.get("proteina_g", 0.0))
        h_total += float(it.get("hidratos_g", 0.0))
        g_total += float(it.get("gordura_g", 0.0))

    registo.calorias_consumidas = round(max(0.0, kcal_total), 1)
    registo.proteina_consumida_g = round(max(0.0, p_total), 1)
    registo.hidratos_consumidos_g = round(max(0.0, h_total), 1)
    registo.gordura_consumida_g = round(max(0.0, g_total), 1)

    sessao.commit()
    sessao.refresh(registo)
    return checks


@roteador_nutricao.get("/diario")
def obter_registo_diario(
    data: Optional[str] = None,
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """Retorna o registo de consumo diário (checks do plano e itens avulsos) reconciliado em tempo real."""
    data_str = data or datetime.utcnow().strftime("%Y-%m-%d")
    uid = resolver_utilizador_id(usuario)
    registo = sessao.query(RegistoDiarioConsumo).filter(RegistoDiarioConsumo.data == data_str, RegistoDiarioConsumo.utilizador_id == uid).first()
    
    # Obter perfil para verificar calorias ativas do projeto
    perfil = obter_ou_criar_perfil(sessao, uid)
    calorias_projeto = perfil.calorias_atuais if perfil and perfil.calorias_atuais else None

    # Obter plano ativo para garantir alvos sincronizados
    plano = sessao.query(PlanoDietaGuardado).filter(PlanoDietaGuardado.ativo == True, PlanoDietaGuardado.utilizador_id == uid).first()
    alvo_calorias = calorias_projeto or (plano.calorias if plano else 2500.0)
    alvo_proteina = plano.proteina_g if plano else 160.0
    alvo_hidratos = plano.hidratos_g if plano else 280.0
    alvo_gordura = plano.gordura_g if plano else 65.0

    if not registo:
        registo = RegistoDiarioConsumo(
            utilizador_id=uid,
            data=data_str,
            calorias_alvo=alvo_calorias,
            proteina_alvo_g=alvo_proteina,
            hidratos_alvo_g=alvo_hidratos,
            gordura_alvo_g=alvo_gordura,
            calorias_consumidas=0.0,
            proteina_consumida_g=0.0,
            hidratos_consumidos_g=0.0,
            gordura_consumida_g=0.0,
            checks_refeicoes_json="{}",
            itens_avulsos_json="[]"
        )
        sessao.add(registo)
        sessao.commit()
        sessao.refresh(registo)
    else:
        houve_mudanca = False
        if calorias_projeto and registo.calorias_alvo != calorias_projeto:
            registo.calorias_alvo = calorias_projeto
            houve_mudanca = True
        elif plano and registo.calorias_alvo != plano.calorias:
            registo.calorias_alvo = plano.calorias
            houve_mudanca = True
        if plano:
            if registo.proteina_alvo_g != plano.proteina_g:
                registo.proteina_alvo_g = plano.proteina_g
                houve_mudanca = True
            if registo.hidratos_alvo_g != plano.hidratos_g:
                registo.hidratos_alvo_g = plano.hidratos_g
                houve_mudanca = True
            if registo.gordura_alvo_g != plano.gordura_g:
                registo.gordura_alvo_g = plano.gordura_g
                houve_mudanca = True
        if houve_mudanca:
            sessao.commit()
            sessao.refresh(registo)

    checks = _reconciliar_e_recalcular_diario(registo, plano, sessao)
    itens_avulsos = json.loads(registo.itens_avulsos_json or "[]")

    return {
        "id": registo.id,
        "data": registo.data,
        "calorias_alvo": registo.calorias_alvo or alvo_calorias,
        "proteina_alvo_g": registo.proteina_alvo_g or alvo_proteina,
        "hidratos_alvo_g": registo.hidratos_alvo_g or alvo_hidratos,
        "gordura_alvo_g": registo.gordura_alvo_g or alvo_gordura,
        "calorias_consumidas": round(registo.calorias_consumidas, 1),
        "proteina_consumida_g": round(registo.proteina_consumida_g, 1),
        "hidratos_consumidos_g": round(registo.hidratos_consumidos_g, 1),
        "gordura_consumida_g": round(registo.gordura_consumida_g, 1),
        "checks_refeicoes": checks,
        "itens_avulsos": itens_avulsos,
        "notas_dia": registo.notas_dia
    }


@roteador_nutricao.post("/diario/toggle-check")
def toggle_check_refeicao(
    dados: EsquemaToggleCheckRefeicao,
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """Atualiza o check de um alimento ou refeição e recalcula instantaneamente os totais diários."""
    data_str = dados.data or datetime.utcnow().strftime("%Y-%m-%d")
    uid = resolver_utilizador_id(usuario)
    registo = sessao.query(RegistoDiarioConsumo).filter(RegistoDiarioConsumo.data == data_str, RegistoDiarioConsumo.utilizador_id == uid).first()
    if not registo:
        registo = RegistoDiarioConsumo(data=data_str, utilizador_id=uid)
        sessao.add(registo)
        sessao.commit()
        sessao.refresh(registo)

    plano = sessao.query(PlanoDietaGuardado).filter(PlanoDietaGuardado.ativo == True, PlanoDietaGuardado.utilizador_id == uid).first()
    checks = json.loads(registo.checks_refeicoes_json or "{}")
    checks[dados.item_id] = dados.consumido
    registo.checks_refeicoes_json = json.dumps(checks)
    sessao.commit()

    checks_atualizados = _reconciliar_e_recalcular_diario(registo, plano, sessao)

    return {
        "data": registo.data,
        "calorias_consumidas": registo.calorias_consumidas,
        "proteina_consumida_g": registo.proteina_consumida_g,
        "hidratos_consumidos_g": registo.hidratos_consumidos_g,
        "gordura_consumida_g": registo.gordura_consumida_g,
        "checks_refeicoes": checks_atualizados
    }


@roteador_nutricao.post("/diario/adicionar-item")
def adicionar_item_avulso(
    item: EsquemaAdicionarItemAvulso,
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """Registo Livre: adiciona um alimento avulso consumido ao longo do dia."""
    data_str = item.data or datetime.utcnow().strftime("%Y-%m-%d")
    uid = resolver_utilizador_id(usuario)
    registo = sessao.query(RegistoDiarioConsumo).filter(RegistoDiarioConsumo.data == data_str, RegistoDiarioConsumo.utilizador_id == uid).first()
    if not registo:
        registo = RegistoDiarioConsumo(data=data_str, utilizador_id=uid)
        sessao.add(registo)
        sessao.commit()
        sessao.refresh(registo)

    itens = json.loads(registo.itens_avulsos_json or "[]")
    novo_item = {
        "id": f"avulso_{len(itens) + 1}_{int(datetime.utcnow().timestamp())}",
        "nome": item.nome,
        "gramas": item.gramas,
        "calorias": round(item.calorias, 1),
        "proteina_g": round(item.proteina_g, 1),
        "hidratos_g": round(item.hidratos_g, 1),
        "gordura_g": round(item.gordura_g, 1),
        "refeicao_nome": item.refeicao_nome or "Refeição Avulsa",
        "adicionado_em": datetime.utcnow().strftime("%H:%M")
    }
    itens.append(novo_item)
    
    registo.itens_avulsos_json = json.dumps(itens)
    sessao.commit()

    plano = sessao.query(PlanoDietaGuardado).filter(PlanoDietaGuardado.ativo == True, PlanoDietaGuardado.utilizador_id == uid).first()
    _reconciliar_e_recalcular_diario(registo, plano, sessao)
    
    return {
        "mensagem": "Alimento adicionado ao registo do dia",
        "itens_avulsos": itens,
        "calorias_consumidas": registo.calorias_consumidas,
        "proteina_consumida_g": registo.proteina_consumida_g,
        "hidratos_consumidos_g": registo.hidratos_consumidos_g,
        "gordura_consumida_g": registo.gordura_consumida_g
    }


@roteador_nutricao.delete("/diario/remover-item")
def remover_item_avulso(
    item_index: int,
    data: Optional[str] = None,
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """Remove um item avulso registado livremente."""
    data_str = data or datetime.utcnow().strftime("%Y-%m-%d")
    uid = resolver_utilizador_id(usuario)
    registo = sessao.query(RegistoDiarioConsumo).filter(RegistoDiarioConsumo.data == data_str, RegistoDiarioConsumo.utilizador_id == uid).first()
    if not registo:
        raise HTTPException(status_code=404, detail="Registo do dia não encontrado")

    itens = json.loads(registo.itens_avulsos_json or "[]")
    if item_index < 0 or item_index >= len(itens):
        raise HTTPException(status_code=400, detail="Índice de item inválido")

    itens.pop(item_index)
    registo.itens_avulsos_json = json.dumps(itens)
    sessao.commit()

    plano = sessao.query(PlanoDietaGuardado).filter(PlanoDietaGuardado.ativo == True, PlanoDietaGuardado.utilizador_id == uid).first()
    _reconciliar_e_recalcular_diario(registo, plano, sessao)
    
    return {
        "mensagem": "Item removido com sucesso",
        "itens_avulsos": itens,
        "calorias_consumidas": registo.calorias_consumidas,
        "proteina_consumida_g": registo.proteina_consumida_g,
        "hidratos_consumidos_g": registo.hidratos_consumidos_g,
        "gordura_consumida_g": registo.gordura_consumida_g
    }


@roteador_nutricao.post("/substituir-alimento-refeicao")
def substituir_alimento_refeicao(
    dados: EsquemaSubstituirAlimentoPlano,
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """Substitui um alimento de uma refeição no plano ativo por outro equivalente mantendo o balanço."""
    uid = resolver_utilizador_id(usuario)
    plano = sessao.query(PlanoDietaGuardado).filter(PlanoDietaGuardado.ativo == True, PlanoDietaGuardado.utilizador_id == uid).first()
    if not plano:
        raise HTTPException(status_code=404, detail="Nenhum plano de dieta ativo encontrado")

    refeicoes = json.loads(plano.refeicoes_json or "[]")
    if dados.refeicao_index < 0 or dados.refeicao_index >= len(refeicoes):
        raise HTTPException(status_code=400, detail="Refeição não encontrada")

    refeicao = refeicoes[dados.refeicao_index]
    alimentos = refeicao.get("alimentos", [])
    if dados.alimento_index < 0 or dados.alimento_index >= len(alimentos):
        raise HTTPException(status_code=400, detail="Alimento não encontrado na refeição")

    alim_atual = alimentos[dados.alimento_index]
    alim_origem_id = alim_atual.get("id_alimento", "").rsplit("_", 1)[0]
    if alim_origem_id not in TABELA_ALIMENTOS_EQUIVALENCIAS:
        for k, v in TABELA_ALIMENTOS_EQUIVALENCIAS.items():
            if v["nome"].lower() == alim_atual.get("nome", "").lower() or k in alim_atual.get("id_alimento", ""):
                alim_origem_id = k
                break

    if alim_origem_id not in TABELA_ALIMENTOS_EQUIVALENCIAS:
        alim_origem_id = "arroz_branco_cozido"

    novo_alim_id = dados.novo_alimento_id
    if novo_alim_id not in TABELA_ALIMENTOS_EQUIVALENCIAS:
        for k, v in TABELA_ALIMENTOS_EQUIVALENCIAS.items():
            if k in novo_alim_id or novo_alim_id in k or v["nome"].lower() in novo_alim_id.lower():
                novo_alim_id = k
                break

    if novo_alim_id not in TABELA_ALIMENTOS_EQUIVALENCIAS:
        raise HTTPException(
            status_code=400,
            detail=f"Alimento '{dados.novo_alimento_id}' não suportado na tabela de equivalências."
        )

    troca = calcular_substituicao_alimento(
        alimento_origem_id=alim_origem_id,
        gramas_origem=alim_atual["gramas"],
        alimento_destino_id=novo_alim_id
    )

    novo_alim_info = TABELA_ALIMENTOS_EQUIVALENCIAS[novo_alim_id]
    gramas_novas = round(float(dados.gramas_sugeridas), 1) if (dados.gramas_sugeridas and dados.gramas_sugeridas > 0) else troca["gramas_substituto"]

    alimentos[dados.alimento_index] = {
        "id_alimento": f"{novo_alim_id}_{dados.refeicao_index+1}",
        "nome": novo_alim_info["nome"],
        "gramas": gramas_novas,
        "calorias": round((gramas_novas / 100.0) * novo_alim_info["kcal"], 1),
        "proteina_g": round((gramas_novas / 100.0) * novo_alim_info["proteina"], 1),
        "hidratos_g": round((gramas_novas / 100.0) * novo_alim_info["hidratos"], 1),
        "gordura_g": round((gramas_novas / 100.0) * novo_alim_info["gordura"], 1),
        "consumido": alim_atual.get("consumido", False)
    }

    # Recalcular macros da refeição
    refeicao["calorias"] = round(sum(a["calorias"] for a in alimentos), 1)
    refeicao["proteina_g"] = round(sum(a["proteina_g"] for a in alimentos), 1)
    refeicao["hidratos_g"] = round(sum(a["hidratos_g"] for a in alimentos), 1)
    refeicao["gordura_g"] = round(sum(a["gordura_g"] for a in alimentos), 1)

    # Recalcular macros totais do plano
    plano.calorias = round(sum(r.get("calorias", 0) for r in refeicoes), 1)
    plano.proteina_g = round(sum(r.get("proteina_g", 0) for r in refeicoes), 1)
    plano.hidratos_g = round(sum(r.get("hidratos_g", 0) for r in refeicoes), 1)
    plano.gordura_g = round(sum(r.get("gordura_g", 0) for r in refeicoes), 1)
    plano.refeicoes_json = json.dumps(refeicoes)

    # Registar a alteração no histórico de adaptações da fase (ex: digestão/cair mal)
    try:
        historico = json.loads(plano.historico_alteracoes_json or "[]")
    except Exception:
        historico = []

    novo_registo = {
        "id": f"alt_{int(datetime.utcnow().timestamp())}_{dados.refeicao_index}_{dados.alimento_index}",
        "data_hora": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "tipo": "troca_alimento",
        "refeicao": refeicao.get("nome", f"Refeição {dados.refeicao_index + 1}"),
        "alimento_origem": f"{troca['alimento_origem']} ({troca['gramas_origem']}g)",
        "alimento_substituto": f"{troca['alimento_substituto']} ({troca['gramas_substituto']}g)",
        "diferenca_kcal": troca.get("diferenca_kcal", 0.0),
        "motivo": dados.motivo or "Digestão / Preferência"
    }
    historico.insert(0, novo_registo)
    plano.historico_alteracoes_json = json.dumps(historico)
    plano.atualizado_em = datetime.utcnow()

    sessao.commit()
    sessao.refresh(plano)

    # Sincronizar e reconciliar o registo diário de hoje com o alimento substituído
    data_hoje = datetime.utcnow().strftime("%Y-%m-%d")
    registo_hoje = sessao.query(RegistoDiarioConsumo).filter(RegistoDiarioConsumo.data == data_hoje, RegistoDiarioConsumo.utilizador_id == uid).first()
    if registo_hoje:
        _reconciliar_e_recalcular_diario(registo_hoje, plano, sessao)

    return {
        "mensagem": f"Substituído com sucesso: {troca['alimento_origem']} ({troca['gramas_origem']}g) -> {troca['alimento_substituto']} ({troca['gramas_substituto']}g)",
        "plano": {
            "id": plano.id,
            "nome": plano.nome,
            "fase_projeto": plano.fase_projeto,
            "nome_fase": plano.nome_fase,
            "calorias": plano.calorias,
            "macros": {
                "calorias": plano.calorias,
                "proteina_g": plano.proteina_g,
                "gordura_g": plano.gordura_g,
                "hidratos_g": plano.hidratos_g,
                "fibras_g": plano.fibras_g
            },
            "refeicoes": refeicoes,
            "historico_alteracoes": historico,
            "atualizado_em": plano.atualizado_em.strftime("%d/%m/%Y %H:%M") if plano.atualizado_em else None
        }
    }


@roteador_nutricao.post("/salvar-plano")
def salvar_plano_dieta(
    dados: dict,
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """Guarda ou atualiza o plano de dieta ativo com todas as alterações manuais do atleta."""
    uid = resolver_utilizador_id(usuario)
    plano = sessao.query(PlanoDietaGuardado).filter(PlanoDietaGuardado.ativo == True, PlanoDietaGuardado.utilizador_id == uid).first()
    refeicoes = dados.get("refeicoes", [])

    total_kcal = round(sum(float(r.get("calorias", 0.0)) for r in refeicoes), 1)
    total_p = round(sum(float(r.get("proteina_g", 0.0)) for r in refeicoes), 1)
    total_h = round(sum(float(r.get("hidratos_g", 0.0)) for r in refeicoes), 1)
    total_g = round(sum(float(r.get("gordura_g", 0.0)) for r in refeicoes), 1)

    if not plano:
        plano = PlanoDietaGuardado(ativo=True, utilizador_id=uid)
        sessao.add(plano)

    proj_ativo = sessao.query(ProjetoFisiologico).filter(ProjetoFisiologico.ativo == True, ProjetoFisiologico.utilizador_id == uid).first()
    if proj_ativo and not plano.id_projeto:
        plano.id_projeto = proj_ativo.id
        plano.nome_projeto = proj_ativo.nome

    plano.nome = dados.get("nome", plano.nome or "Plano Personalizado")
    if dados.get("fase_projeto"):
        plano.fase_projeto = dados["fase_projeto"]
    if dados.get("nome_fase"):
        plano.nome_fase = dados["nome_fase"]

    plano.calorias = total_kcal if total_kcal > 0 else float(dados.get("calorias", 2000.0))
    plano.proteina_g = total_p if total_p > 0 else float(dados.get("proteina_g", 150.0))
    plano.hidratos_g = total_h if total_h > 0 else float(dados.get("hidratos_g", 220.0))
    plano.gordura_g = total_g if total_g > 0 else float(dados.get("gordura_g", 60.0))
    plano.fibras_g = float(dados.get("fibras_g", 30.0))
    plano.refeicoes_json = json.dumps(refeicoes)

    if dados.get("motivo_ajuste"):
        try:
            historico = json.loads(plano.historico_alteracoes_json or "[]")
        except Exception:
            historico = []
        historico.insert(0, {
            "id": f"alt_{int(datetime.utcnow().timestamp())}",
            "data_hora": datetime.now().strftime("%d/%m/%Y %H:%M"),
            "tipo": "edicao_manual",
            "refeicao": dados.get("refeicao_editada", "Geral"),
            "alimento_origem": "-",
            "alimento_substituto": "-",
            "diferenca_kcal": 0.0,
            "motivo": dados.get("motivo_ajuste")
        })
        plano.historico_alteracoes_json = json.dumps(historico)

    plano.atualizado_em = datetime.utcnow()

    sessao.commit()
    sessao.refresh(plano)

    # Sincronizar e reconciliar o registo diário de hoje com o alimento substituído
    data_hoje = datetime.utcnow().strftime("%Y-%m-%d")
    registo_hoje = sessao.query(RegistoDiarioConsumo).filter(RegistoDiarioConsumo.data == data_hoje, RegistoDiarioConsumo.utilizador_id == uid).first()
    if registo_hoje:
        _reconciliar_e_recalcular_diario(registo_hoje, plano, sessao)

    try:
        historico = json.loads(plano.historico_alteracoes_json or "[]")
    except Exception:
        historico = []

    return {
        "mensagem": "Plano alimentar guardado com sucesso!",
        "plano": {
            "id": plano.id,
            "nome": plano.nome,
            "fase_projeto": plano.fase_projeto,
            "nome_fase": plano.nome_fase,
            "calorias": plano.calorias,
            "macros": {
                "calorias": plano.calorias,
                "proteina_g": plano.proteina_g,
                "gordura_g": plano.gordura_g,
                "hidratos_g": plano.hidratos_g,
                "fibras_g": plano.fibras_g
            },
            "refeicoes": refeicoes,
            "historico_alteracoes": historico,
            "atualizado_em": plano.atualizado_em.strftime("%d/%m/%Y %H:%M") if plano.atualizado_em else None
        }
    }


@roteador_nutricao.get("/historico-fases")
def obter_historico_fases_dieta(
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """Retorna o histórico de todas as dietas guardadas em cada fase do projeto."""
    uid = resolver_utilizador_id(usuario)
    planos = sessao.query(PlanoDietaGuardado).filter(PlanoDietaGuardado.utilizador_id == uid).order_by(PlanoDietaGuardado.id.desc()).all()
    resultado = []
    for p in planos:
        try:
            refeicoes = json.loads(p.refeicoes_json or "[]")
        except Exception:
            refeicoes = []
        try:
            historico = json.loads(p.historico_alteracoes_json or "[]")
        except Exception:
            historico = []

        resultado.append({
            "id": p.id,
            "nome": p.nome,
            "fase_projeto": p.fase_projeto,
            "nome_fase": p.nome_fase or p.nome,
            "ativo": bool(p.ativo),
            "calorias": p.calorias,
            "macros": {
                "calorias": p.calorias,
                "proteina_g": p.proteina_g,
                "gordura_g": p.gordura_g,
                "hidratos_g": p.hidratos_g,
                "fibras_g": p.fibras_g
            },
            "refeicoes": refeicoes,
            "historico_alteracoes": historico,
            "atualizado_em": p.atualizado_em.strftime("%d/%m/%Y %H:%M") if p.atualizado_em else None,
            "criado_em": p.criado_em.strftime("%d/%m/%Y %H:%M") if p.criado_em else None
        })
    return resultado


@roteador_nutricao.post("/reativar-fase-dieta")
def reativar_fase_dieta(
    dados: dict,
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """Permite reativar uma dieta de uma fase anterior."""
    uid = resolver_utilizador_id(usuario)
    plano_id = dados.get("plano_id")
    plano_alvo = sessao.query(PlanoDietaGuardado).filter(PlanoDietaGuardado.id == plano_id, PlanoDietaGuardado.utilizador_id == uid).first()
    if not plano_alvo:
        raise HTTPException(status_code=404, detail="Plano de dieta não encontrado")

    sessao.query(PlanoDietaGuardado).filter(PlanoDietaGuardado.utilizador_id == uid).update({"ativo": False})
    plano_alvo.ativo = True
    plano_alvo.atualizado_em = datetime.utcnow()

    # Sincronizar o registo diário de hoje
    data_hoje = datetime.utcnow().strftime("%Y-%m-%d")
    registo_hoje = sessao.query(RegistoDiarioConsumo).filter(RegistoDiarioConsumo.data == data_hoje, RegistoDiarioConsumo.utilizador_id == uid).first()
    if registo_hoje:
        registo_hoje.calorias_alvo = plano_alvo.calorias
        registo_hoje.proteina_alvo_g = plano_alvo.proteina_g
        registo_hoje.hidratos_alvo_g = plano_alvo.hidratos_g
        registo_hoje.gordura_alvo_g = plano_alvo.gordura_g

    sessao.commit()
    sessao.refresh(plano_alvo)

    try:
        refeicoes = json.loads(plano_alvo.refeicoes_json or "[]")
    except Exception:
        refeicoes = []
    try:
        historico = json.loads(plano_alvo.historico_alteracoes_json or "[]")
    except Exception:
        historico = []

    return {
        "mensagem": f"Plano '{plano_alvo.nome_fase or plano_alvo.nome}' reativado com sucesso!",
        "plano": {
            "id": plano_alvo.id,
            "nome": plano_alvo.nome,
            "fase_projeto": plano_alvo.fase_projeto,
            "nome_fase": plano_alvo.nome_fase,
            "ativo": True,
            "calorias": plano_alvo.calorias,
            "macros": {
                "calorias": plano_alvo.calorias,
                "proteina_g": plano_alvo.proteina_g,
                "gordura_g": plano_alvo.gordura_g,
                "hidratos_g": plano_alvo.hidratos_g,
                "fibras_g": plano_alvo.fibras_g
            },
            "refeicoes": refeicoes,
            "historico_alteracoes": historico,
            "atualizado_em": plano_alvo.atualizado_em.strftime("%d/%m/%Y %H:%M") if plano_alvo.atualizado_em else None
        }
    }


@roteador_nutricao.post("/calibrar-dieta-ia")
async def calibrar_dieta_com_ia(
    dados: dict,
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """Audita a dieta do atleta e calibra as gramagens para a fase do projeto respeitando preferências e alterações exigidas."""
    uid = resolver_utilizador_id(usuario)
    perfil = obter_ou_criar_perfil(sessao, uid)
    plano_ativo = sessao.query(PlanoDietaGuardado).filter(PlanoDietaGuardado.ativo == True, PlanoDietaGuardado.utilizador_id == uid).first()

    chave_ia = dados.get("chave_api_ia") or (perfil.chave_api_ia if perfil else None)
    prompt_custom = obter_prompt_efetivo(perfil, "calibracao_dieta") if perfil else None

    calorias_alvo = float(dados.get("calorias_alvo") or (perfil.calorias_atuais if perfil else 2000.0))
    fase_projeto = str(dados.get("fase_projeto") or (perfil.fase_atual if perfil else "bulk"))

    prefs_dict = {}
    if perfil and perfil.preferencias_alimentares_json:
        try:
            prefs_dict = json.loads(perfil.preferencias_alimentares_json)
        except Exception:
            prefs_dict = {}

    historico = []
    if plano_ativo and plano_ativo.historico_alteracoes_json:
        try:
            historico = json.loads(plano_ativo.historico_alteracoes_json)
        except Exception:
            historico = []

    alimentos_preferidos = dados.get("alimentos_preferidos") or prefs_dict.get("alimentos_preferidos") or ""
    alimentos_evitados = dados.get("alimentos_evitados") or prefs_dict.get("alimentos_evitados") or ""
    instrucoes_adicionais = dados.get("instrucoes_adicionais") or dados.get("notas_ajuste") or ""

    dados_calibracao = {
        "refeicoes_atuais": dados.get("refeicoes", []),
        "calorias_alvo": calorias_alvo,
        "fase_projeto": fase_projeto,
        "proteina_alvo_g": dados.get("proteina_alvo_g", 160.0),
        "hidratos_alvo_g": dados.get("hidratos_alvo_g", 220.0),
        "gordura_alvo_g": dados.get("gordura_alvo_g", 55.0),
        "alimentos_preferidos": alimentos_preferidos,
        "alimentos_evitados": alimentos_evitados,
        "instrucoes_adicionais": instrucoes_adicionais,
        "historico_alteracoes": historico
    }

    servico_ia = ServicoCoachIA(chave_api=chave_ia)
    resultado = await servico_ia.calibrar_dieta_com_ia(
        dados_calibracao=dados_calibracao,
        chave_substituta=chave_ia,
        prompt_sistema_substituto=prompt_custom
    )

    return resultado


@roteador_nutricao.post("/sugerir-substituicao-ia")
async def sugerir_substituicao_alimento_com_ia(
    dados: dict,
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """Recomenda 2 a 3 alimentos nutricionalmente parecidos para substituir um item na dieta com dose calibrada."""
    uid = resolver_utilizador_id(usuario)
    perfil = obter_ou_criar_perfil(sessao, uid)
    plano_ativo = sessao.query(PlanoDietaGuardado).filter(PlanoDietaGuardado.ativo == True, PlanoDietaGuardado.utilizador_id == uid).first()

    chave_ia = dados.get("chave_api_ia") or (perfil.chave_api_ia if perfil else None)
    prompt_custom = obter_prompt_efetivo(perfil, "substituicao_alimento") if perfil else None

    prefs_dict = {}
    if perfil and perfil.preferencias_alimentares_json:
        try:
            prefs_dict = json.loads(perfil.preferencias_alimentares_json)
        except Exception:
            prefs_dict = {}

    historico = []
    if plano_ativo and plano_ativo.historico_alteracoes_json:
        try:
            historico = json.loads(plano_ativo.historico_alteracoes_json)
        except Exception:
            historico = []

    dados_substituicao = {
        "alimento_atual": dados.get("alimento_atual", "Alimento"),
        "gramas_atuais": float(dados.get("gramas_atuais", 100.0)),
        "motivo_queixa": dados.get("motivo_queixa", "Digestão pesada / desconforto"),
        "refeicao_nome": dados.get("refeicao_nome", "Refeição"),
        "fase_projeto": dados.get("fase_projeto") or (perfil.fase_atual if perfil else "bulk"),
        "alimentos_preferidos": dados.get("alimentos_preferidos") or prefs_dict.get("alimentos_preferidos") or "",
        "alimentos_evitados": dados.get("alimentos_evitados") or prefs_dict.get("alimentos_evitados") or "",
        "historico_alteracoes": historico
    }

    coach = ServicoCoachIA(chave_api=chave_ia)
    resultado = await coach.sugerir_substituicao_alimento_ia(
        dados_substituicao=dados_substituicao,
        chave_substituta=chave_ia,
        prompt_sistema_substituto=prompt_custom
    )
    return resultado
