"""
Rotas de Perfil, Biometria e Projetor de Metas a Longo Prazo.
"""

import json
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from .ajudantes_rotas import resolver_utilizador_id, obter_ou_criar_perfil
from .rotas_auth import obter_utilizador_opcional, ContaUtilizador
from sqlalchemy.orm import Session
from ..base_dados.conexao import obter_sessao_bd
from ..base_dados.modelos import (
    PerfilUtilizador, RegistoDiarioConsumo, PlanoDietaGuardado, PlanoTreinoGuardado,
    ProjetoFisiologico, RegistoCheckIn
)
from ..esquemas.esquemas import (
    EsquemaPerfilEntrada, EsquemaProjecaoRequisicao, EsquemaAtivarFaseProjeto,
    EsquemaCriarProjeto, EsquemaAtualizarProjeto
)
from ..motor_matematico import (
    calcular_composicao_e_tdee,
    calcular_distribuicao_macros,
    projetar_trajetoria_meta
)

roteador_perfil = APIRouter(prefix="/api/perfil", tags=["Perfil e Metas"])


@roteador_perfil.get("/")
def obter_perfil(
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    uid = resolver_utilizador_id(usuario)
    perfil = obter_ou_criar_perfil(sessao, uid, nome_padrao=usuario.nome if usuario else "Atleta")
    
    # Calcular métricas matemáticas atuais
    composicao = calcular_composicao_e_tdee(
        peso_kg=perfil.peso_atual,
        altura_cm=perfil.altura_cm,
        idade=perfil.idade,
        sexo=perfil.sexo,
        nivel_atividade=perfil.nivel_atividade,
        percentual_gordura=perfil.bf_atual
    )
    
    macros = calcular_distribuicao_macros(
        calorias_alvo=perfil.calorias_atuais,
        peso_kg=perfil.peso_atual,
        massa_magra_kg=composicao.massa_magra_kg,
        objetivo=perfil.fase_atual
    )

    return {
        "perfil": perfil,
        "composicao_corporal": composicao,
        "macros_prescritos": macros
    }


@roteador_perfil.post("/atualizar")
def atualizar_perfil(
    dados: EsquemaPerfilEntrada,
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    uid = resolver_utilizador_id(usuario)
    perfil = obter_ou_criar_perfil(sessao, uid, nome_padrao=usuario.nome if usuario else dados.nome)

    perfil.nome = dados.nome
    perfil.idade = dados.idade
    perfil.sexo = dados.sexo
    perfil.altura_cm = dados.altura_cm
    perfil.peso_atual = dados.peso_atual
    perfil.peso_alvo = dados.peso_alvo
    perfil.bf_atual = dados.bf_atual
    perfil.bf_alvo = dados.bf_alvo
    perfil.nivel_experiencia = dados.nivel_experiencia
    perfil.nivel_atividade = dados.nivel_atividade
    perfil.dias_treino_semana = dados.dias_treino_semana
    perfil.tempo_sessao_minutos = dados.tempo_sessao_minutos
    perfil.fase_atual = dados.fase_atual or perfil.fase_atual
    if dados.calorias_atuais is not None:
        perfil.calorias_atuais = dados.calorias_atuais
    if dados.projeto_ativo_json is not None:
        perfil.projeto_ativo_json = dados.projeto_ativo_json
    if dados.chave_api_ia is not None:
        perfil.chave_api_ia = dados.chave_api_ia

    sessao.commit()
    sessao.refresh(perfil)
    return {"mensagem": "Perfil atualizado com sucesso", "perfil": perfil}


@roteador_perfil.post("/ativar-fase-projeto")
def ativar_fase_projeto(
    dados: EsquemaAtivarFaseProjeto,
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """
    Sincroniza imediatamente o perfil do atleta com a fase escolhida do projeto:
    fase atual, calorias diárias e diretrizes de treino/cardio.
    """
    uid = resolver_utilizador_id(usuario)
    perfil = obter_ou_criar_perfil(sessao, uid)

    perfil.fase_atual = dados.fase_tipo
    perfil.calorias_atuais = dados.calorias_diarias
    
    info_anterior = {}
    if perfil.projeto_ativo_json:
        try:
            info_anterior = json.loads(perfil.projeto_ativo_json)
        except Exception:
            info_anterior = {}

    proj_entidade = None
    if dados.id_projeto:
        proj_entidade = sessao.query(ProjetoFisiologico).filter(ProjetoFisiologico.id == dados.id_projeto, ProjetoFisiologico.utilizador_id == uid).first()
    if not proj_entidade:
        proj_entidade = sessao.query(ProjetoFisiologico).filter(ProjetoFisiologico.ativo == True, ProjetoFisiologico.utilizador_id == uid).first()

    info_projeto = {
        "id_projeto": proj_entidade.id if proj_entidade else None,
        "nome_projeto": proj_entidade.nome if proj_entidade else (dados.nome_projeto or "Projeto Fisiológico"),
        "fase_tipo": dados.fase_tipo,
        "nome_fase": dados.nome_fase,
        "calorias_diarias": dados.calorias_diarias,
        "calorias_base_fase": dados.calorias_diarias,
        "data_inicio_fase": datetime.utcnow().isoformat(),
        "data_inicio_projeto": info_anterior.get("data_inicio_projeto") or (proj_entidade.data_inicio_projeto if proj_entidade else None) or datetime.utcnow().isoformat(),
        "series_alvo_semana": dados.series_alvo_semana,
        "cardio_minutos_semana": dados.cardio_minutos_semana,
        "foco_treino": dados.foco_treino,
        "peso_inicial_kg": proj_entidade.peso_inicial_kg if proj_entidade else info_anterior.get("peso_inicial_kg", perfil.peso_atual),
        "peso_atual_kg": proj_entidade.peso_inicial_kg if proj_entidade else info_anterior.get("peso_atual_kg", perfil.peso_atual),
        "peso_alvo_kg": proj_entidade.peso_alvo_kg if proj_entidade else info_anterior.get("peso_alvo_kg", perfil.peso_alvo),
        "bf_inicial": proj_entidade.bf_inicial if proj_entidade else info_anterior.get("bf_inicial", perfil.bf_atual),
        "bf_alvo": proj_entidade.bf_alvo if proj_entidade else info_anterior.get("bf_alvo", perfil.bf_alvo),
        "tipo_intencao": proj_entidade.tipo_intencao if proj_entidade else info_anterior.get("tipo_intencao", "Transformação Corporal"),
        "duracao_total_semanas": proj_entidade.duracao_total_semanas if proj_entidade else info_anterior.get("duracao_total_semanas", 12)
    }

    if proj_entidade:
        proj_entidade.fase_atual_tipo = dados.fase_tipo
        proj_entidade.fase_atual_nome = dados.nome_fase
        proj_entidade.data_inicio_fase = datetime.utcnow().isoformat()
        if not proj_entidade.data_inicio_projeto:
            proj_entidade.data_inicio_projeto = info_projeto["data_inicio_projeto"]

    if dados.projeto_completo_json:
        try:
            relatorio = json.loads(dados.projeto_completo_json)
            if isinstance(relatorio, dict):
                info_projeto["fases"] = relatorio.get("fases", [])
                info_projeto["relatorio"] = relatorio
                info_projeto["tipo_intencao"] = relatorio.get("tipo_intencao", "")
                info_projeto["peso_alvo_kg"] = relatorio.get("peso_alvo_kg", perfil.peso_alvo)
        except Exception:
            pass
    elif "fases" in info_anterior and info_anterior.get("fases"):
        info_projeto["fases"] = info_anterior.get("fases", [])
        info_projeto["relatorio"] = info_anterior.get("relatorio")
        info_projeto["tipo_intencao"] = info_anterior.get("tipo_intencao", "")
        info_projeto["peso_alvo_kg"] = info_anterior.get("peso_alvo_kg", perfil.peso_alvo)
    elif proj_entidade and proj_entidade.fases_json:
        try:
            info_projeto["fases"] = json.loads(proj_entidade.fases_json)
            if proj_entidade.relatorio_completo_json:
                info_projeto["relatorio"] = json.loads(proj_entidade.relatorio_completo_json)
        except Exception:
            pass

    perfil.projeto_ativo_json = json.dumps(info_projeto)

    # 1. Sincronizar imediatamente o registo diário de consumo de hoje
    data_hoje = datetime.utcnow().strftime("%Y-%m-%d")
    registo_hoje = sessao.query(RegistoDiarioConsumo).filter(RegistoDiarioConsumo.data == data_hoje).first()

    peso_ref = perfil.peso_atual or 78.0
    if "cut" in dados.fase_tipo.lower() or "definicao" in dados.fase_tipo.lower():
        p_alvo = round(peso_ref * 2.2, 1)
        g_alvo = round(peso_ref * 0.75, 1)
    else:
        p_alvo = round(peso_ref * 2.0, 1)
        g_alvo = round(peso_ref * 0.9, 1)
    h_alvo = round(max(50.0, (dados.calorias_diarias - (p_alvo * 4.0 + g_alvo * 9.0)) / 4.0), 1)

    if registo_hoje:
        registo_hoje.calorias_alvo = dados.calorias_diarias
        registo_hoje.proteina_alvo_g = p_alvo
        registo_hoje.hidratos_alvo_g = h_alvo
        registo_hoje.gordura_alvo_g = g_alvo
    else:
        novo_registo = RegistoDiarioConsumo(
            data=data_hoje,
            calorias_alvo=dados.calorias_diarias,
            proteina_alvo_g=p_alvo,
            hidratos_alvo_g=h_alvo,
            gordura_alvo_g=g_alvo,
            calorias_consumidas=0.0,
            proteina_consumida_g=0.0,
            hidratos_consumidos_g=0.0,
            gordura_consumida_g=0.0
        )
        sessao.add(novo_registo)

    # 2. Gerir o plano de dieta por fase (preservar dieta e histórico de alterações das fases anteriores)
    plano_ativo = sessao.query(PlanoDietaGuardado).filter(PlanoDietaGuardado.ativo == True).first()

    if plano_ativo and plano_ativo.nome_fase == dados.nome_fase:
        # Já é o plano associado a esta fase! Apenas sincronizar calorias e macros caso difiram
        plano_ativo.fase_projeto = dados.fase_tipo
        if plano_ativo.calorias > 0 and abs(plano_ativo.calorias - dados.calorias_diarias) > 1.0:
            fator_escala = dados.calorias_diarias / plano_ativo.calorias
            plano_ativo.calorias = dados.calorias_diarias
            plano_ativo.proteina_g = p_alvo
            plano_ativo.gordura_g = g_alvo
            plano_ativo.hidratos_g = h_alvo
            try:
                refeicoes = json.loads(plano_ativo.refeicoes_json or "[]")
                for ref in refeicoes:
                    ref["calorias"] = round(ref.get("calorias", 0) * fator_escala, 1)
                    ref["proteina_g"] = round(ref.get("proteina_g", 0) * fator_escala, 1)
                    ref["hidratos_g"] = round(ref.get("hidratos_g", 0) * fator_escala, 1)
                    ref["gordura_g"] = round(ref.get("gordura_g", 0) * fator_escala, 1)
                    for alim in ref.get("alimentos", []):
                        alim["gramas"] = round(max(5.0, alim.get("gramas", 0) * fator_escala), 1)
                        alim["calorias"] = round(alim.get("calorias", 0) * fator_escala, 1)
                        alim["proteina_g"] = round(alim.get("proteina_g", 0) * fator_escala, 1)
                        alim["hidratos_g"] = round(alim.get("hidratos_g", 0) * fator_escala, 1)
                        alim["gordura_g"] = round(alim.get("gordura_g", 0) * fator_escala, 1)
                plano_ativo.refeicoes_json = json.dumps(refeicoes)
            except Exception:
                pass
        plano_ativo.atualizado_em = datetime.utcnow()
    else:
        # Transição de fase: congelar a dieta e histórico da fase anterior e ativar/criar a da nova fase
        plano_existente_fase = sessao.query(PlanoDietaGuardado).filter(
            (PlanoDietaGuardado.nome_fase == dados.nome_fase) | 
            ((PlanoDietaGuardado.fase_projeto == dados.fase_tipo) & (PlanoDietaGuardado.nome_fase != None))
        ).first()

        # Desativar plano anterior mantendo-o intacto
        sessao.query(PlanoDietaGuardado).update({"ativo": False})

        if plano_existente_fase:
            # Reativar a dieta já existente guardada para esta fase
            plano_existente_fase.ativo = True
            plano_existente_fase.atualizado_em = datetime.utcnow()
        else:
            # Criar um novo plano exclusivo para esta nova fase
            # Herdamos os alimentos e distribuição da fase anterior escalados para as kcal da nova fase
            refeicoes_herdadas = []
            if plano_ativo:
                if not plano_ativo.nome_fase:
                    plano_ativo.nome_fase = "Fase Anterior"
                try:
                    refeicoes_herdadas = json.loads(plano_ativo.refeicoes_json or "[]")
                    fator_escala = dados.calorias_diarias / (plano_ativo.calorias if plano_ativo.calorias > 0 else dados.calorias_diarias)
                    for ref in refeicoes_herdadas:
                        ref["calorias"] = round(ref.get("calorias", 0) * fator_escala, 1)
                        ref["proteina_g"] = round(ref.get("proteina_g", 0) * fator_escala, 1)
                        ref["hidratos_g"] = round(ref.get("hidratos_g", 0) * fator_escala, 1)
                        ref["gordura_g"] = round(ref.get("gordura_g", 0) * fator_escala, 1)
                        for alim in ref.get("alimentos", []):
                            alim["gramas"] = round(max(5.0, alim.get("gramas", 0) * fator_escala), 1)
                            alim["calorias"] = round(alim.get("calorias", 0) * fator_escala, 1)
                            alim["proteina_g"] = round(alim.get("proteina_g", 0) * fator_escala, 1)
                            alim["hidratos_g"] = round(alim.get("hidratos_g", 0) * fator_escala, 1)
                            alim["gordura_g"] = round(alim.get("gordura_g", 0) * fator_escala, 1)
                            alim["consumido"] = False
                except Exception:
                    refeicoes_herdadas = []

            novo_plano = PlanoDietaGuardado(
                nome=f"Dieta - {dados.nome_fase}",
                id_projeto=proj_entidade.id if proj_entidade else None,
                nome_projeto=proj_entidade.nome if proj_entidade else (dados.nome_projeto or None),
                fase_projeto=dados.fase_tipo,
                nome_fase=dados.nome_fase,
                calorias=dados.calorias_diarias,
                proteina_g=p_alvo,
                hidratos_g=h_alvo,
                gordura_g=g_alvo,
                fibras_g=30.0,
                ativo=True,
                refeicoes_json=json.dumps(refeicoes_herdadas),
                historico_alteracoes_json="[]",
                atualizado_em=datetime.utcnow()
            )
            sessao.add(novo_plano)

    # 3. Gerir o plano de treino por fase (preservar treino e histórico de adaptações das fases anteriores)
    plano_treino_ativo = sessao.query(PlanoTreinoGuardado).filter(PlanoTreinoGuardado.ativo == True).first()

    if plano_treino_ativo and plano_treino_ativo.nome_fase == dados.nome_fase:
        plano_treino_ativo.fase_projeto = dados.fase_tipo
        plano_treino_ativo.atualizado_em = datetime.utcnow()
    else:
        # Transição de fase no treino
        plano_treino_existente = sessao.query(PlanoTreinoGuardado).filter(
            (PlanoTreinoGuardado.nome_fase == dados.nome_fase) |
            ((PlanoTreinoGuardado.fase_projeto == dados.fase_tipo) & (PlanoTreinoGuardado.nome_fase != None))
        ).first()

        # Desativar treinos anteriores mantendo-os intactos
        sessao.query(PlanoTreinoGuardado).update({"ativo": False})

        if plano_treino_existente:
            plano_treino_existente.ativo = True
            plano_treino_existente.atualizado_em = datetime.utcnow()
        else:
            sessoes_herdadas = []
            divisao_nome = "Plano Adaptativo da Fase"
            dias_treino = 4
            tempo_min = 60
            if plano_treino_ativo:
                if not plano_treino_ativo.nome_fase:
                    plano_treino_ativo.nome_fase = "Fase Anterior"
                try:
                    sessoes_herdadas = json.loads(plano_treino_ativo.sessoes_json or "[]")
                    divisao_nome = plano_treino_ativo.divisao or plano_treino_ativo.nome
                    dias_treino = plano_treino_ativo.dias_semana
                    tempo_min = plano_treino_ativo.tempo_sessao_minutos
                except Exception:
                    sessoes_herdadas = []

            novo_treino = PlanoTreinoGuardado(
                nome=f"Treino - {dados.nome_fase}",
                id_projeto=proj_entidade.id if proj_entidade else None,
                nome_projeto=proj_entidade.nome if proj_entidade else (dados.nome_projeto or None),
                divisao=divisao_nome,
                dias_semana=dias_treino,
                tempo_sessao_minutos=tempo_min,
                fase_projeto=dados.fase_tipo,
                nome_fase=dados.nome_fase,
                ativo=True,
                sessoes_json=json.dumps(sessoes_herdadas),
                historico_alteracoes_json="[]",
                atualizado_em=datetime.utcnow()
            )
            sessao.add(novo_treino)

    sessao.commit()
    sessao.refresh(perfil)
    return {
        "mensagem": f"Fase '{dados.nome_fase}' ativada com sucesso! Treino e Dieta sincronizados a {dados.calorias_diarias} kcal.",
        "perfil": perfil
    }


@roteador_perfil.post("/calcular-projecao")
def calcular_projecao(requisicao: EsquemaProjecaoRequisicao):
    """
    Executa o motor matemático de projeção a longo prazo (Bulk, Cut, Manutenção, Semanas e Kcal).
    """
    relatorio = projetar_trajetoria_meta(
        peso_atual=requisicao.peso_atual,
        altura_cm=requisicao.altura_cm,
        idade=requisicao.idade,
        sexo=requisicao.sexo,
        bf_atual=requisicao.bf_atual,
        peso_alvo=requisicao.peso_alvo,
        bf_alvo=requisicao.bf_alvo,
        nivel_experiencia=requisicao.nivel_experiencia,
        nivel_atividade=requisicao.nivel_atividade,
        estrategia_inicial=requisicao.estrategia_inicial
    )
    return relatorio


# =====================================================================
# GESTÃO COMPLETA DE PROJETOS FISIOLÓGICOS (PORTFÓLIO, HISTÓRICO & ATIVAÇÃO)
# =====================================================================

@roteador_perfil.get("/projetos")
def listar_projetos(
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """
    Lista todos os projetos registados pelo atleta (ativos, concluídos e em teste).
    """
    uid = resolver_utilizador_id(usuario)
    perfil = obter_ou_criar_perfil(sessao, uid, nome_padrao=usuario.nome if usuario else "Atleta")
    projetos = sessao.query(ProjetoFisiologico).filter(ProjetoFisiologico.utilizador_id == uid).order_by(
        ProjetoFisiologico.ativo.desc(),
        ProjetoFisiologico.criado_em.desc()
    ).all()

    # Auto-migração apenas para o Administrador (utilizador 1)
    if uid == 1 and not projetos and perfil and perfil.projeto_ativo_json:
        try:
            info = json.loads(perfil.projeto_ativo_json)
            nome_p = info.get("nome_projeto") or info.get("tipo_intencao") or f"Projeto ({info.get('peso_atual_kg', perfil.peso_atual)}kg ➔ {info.get('peso_alvo_kg', perfil.peso_alvo)}kg)"
            legado = ProjetoFisiologico(
                nome=nome_p,
                descricao="Projeto importado do perfil ativo.",
                tipo_intencao=info.get("tipo_intencao") or "Transformação Corporal",
                ativo=True,
                status="ativo",
                peso_inicial_kg=float(info.get("peso_atual_kg") or perfil.peso_atual or 70.0),
                peso_alvo_kg=float(info.get("peso_alvo_kg") or perfil.peso_alvo or 60.0),
                bf_inicial=float(perfil.bf_atual or 15.0),
                bf_alvo=float(perfil.bf_alvo or 10.0),
                fase_atual_tipo=info.get("fase_tipo") or perfil.fase_atual or "cut",
                fase_atual_nome=info.get("nome_fase") or "Fase 1",
                data_inicio_fase=info.get("data_inicio_fase") or datetime.utcnow().isoformat(),
                data_inicio_projeto=info.get("data_inicio_projeto") or datetime.utcnow().isoformat(),
                fases_json=json.dumps(info.get("fases", [])),
                relatorio_completo_json=json.dumps(info.get("relatorio", {}))
            )
            sessao.add(legado)
            sessao.commit()
            sessao.refresh(legado)

            # Associar planos e check-ins existentes a este projeto
            sessao.query(PlanoTreinoGuardado).update({"id_projeto": legado.id, "nome_projeto": legado.nome})
            sessao.query(PlanoDietaGuardado).update({"id_projeto": legado.id, "nome_projeto": legado.nome})
            sessao.query(RegistoCheckIn).update({"id_projeto": legado.id, "nome_projeto": legado.nome})
            sessao.commit()

            projetos = [legado]
        except Exception as e:
            print(f"[Projetos] Erro na auto-migração de projeto legado: {e}")

    resultado = []
    for p in projetos:
        fases = []
        try:
            fases = json.loads(p.fases_json or "[]")
        except Exception:
            fases = []

        total_checkins = sessao.query(RegistoCheckIn).filter(
            (RegistoCheckIn.id_projeto == p.id) | (RegistoCheckIn.nome_projeto == p.nome)
        ).count()

        ultimo_checkin = sessao.query(RegistoCheckIn).filter(
            (RegistoCheckIn.id_projeto == p.id) | (RegistoCheckIn.nome_projeto == p.nome)
        ).order_by(RegistoCheckIn.data.desc()).first()

        # Treino vinculado
        treino_vinculado = sessao.query(PlanoTreinoGuardado).filter(
            (PlanoTreinoGuardado.id_projeto == p.id) | (PlanoTreinoGuardado.nome_projeto == p.nome)
        ).order_by(PlanoTreinoGuardado.ativo.desc(), PlanoTreinoGuardado.atualizado_em.desc()).first()

        # Dieta vinculada
        dieta_vinculada = sessao.query(PlanoDietaGuardado).filter(
            (PlanoDietaGuardado.id_projeto == p.id) | (PlanoDietaGuardado.nome_projeto == p.nome)
        ).order_by(PlanoDietaGuardado.ativo.desc(), PlanoDietaGuardado.atualizado_em.desc()).first()

        # Semanas decorridas
        semanas_decorridas = 1
        dias_decorridos = 0
        if p.data_inicio_fase:
            try:
                dt_ini = datetime.fromisoformat(p.data_inicio_fase)
                dias_decorridos = max(0, (datetime.utcnow() - dt_ini).days)
                semanas_decorridas = max(1, (dias_decorridos // 7) + 1)
            except Exception:
                pass

        resultado.append({
            "id": p.id,
            "nome": p.nome,
            "descricao": p.descricao or "",
            "tipo_intencao": p.tipo_intencao,
            "ativo": p.ativo,
            "status": p.status,
            "peso_inicial_kg": p.peso_inicial_kg,
            "peso_alvo_kg": p.peso_alvo_kg,
            "bf_inicial": p.bf_inicial,
            "bf_alvo": p.bf_alvo,
            "estrategia_inicial": p.estrategia_inicial,
            "duracao_total_semanas": p.duracao_total_semanas,
            "fase_atual_tipo": p.fase_atual_tipo,
            "fase_atual_nome": p.fase_atual_nome,
            "data_inicio_fase": p.data_inicio_fase,
            "data_inicio_projeto": p.data_inicio_projeto,
            "fases": fases,
            "criado_em": p.criado_em.isoformat() if p.criado_em else None,
            "atualizado_em": p.atualizado_em.isoformat() if p.atualizado_em else None,
            "total_checkins": total_checkins,
            "ultimo_checkin_peso": ultimo_checkin.peso_medio if ultimo_checkin else None,
            "ultimo_checkin_data": ultimo_checkin.data.isoformat() if ultimo_checkin else None,
            "treino_vinculado_nome": treino_vinculado.nome if treino_vinculado else None,
            "treino_vinculado_divisao": treino_vinculado.divisao if treino_vinculado else None,
            "dieta_vinculada_kcal": dieta_vinculada.calorias if dieta_vinculada else None,
            "semanas_decorridas": semanas_decorridas,
            "dias_decorridos": dias_decorridos
        })

    return resultado


@roteador_perfil.post("/projetos")
def criar_projeto(
    dados: EsquemaCriarProjeto,
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """
    Cria e guarda um novo projeto fisiológico com nome identificável, metas e fases.
    Opcionalmente ativa-o de imediato no motor.
    """
    uid = resolver_utilizador_id(usuario)
    perfil = obter_ou_criar_perfil(sessao, uid, nome_padrao=usuario.nome if usuario else "Atleta")

    if dados.ativar_imediatamente:
        # Desativar projetos anteriores do próprio atleta
        sessao.query(ProjetoFisiologico).filter(ProjetoFisiologico.utilizador_id == uid).update({"ativo": False})

    fase1_tipo = "cut"
    fase1_nome = "Fase 1"
    fase1_kcal = 2000.0
    if dados.fases and len(dados.fases) > 0:
        fase1_tipo = dados.fases[0].get("tipo", "cut")
        fase1_nome = dados.fases[0].get("nome_exibicao", "Fase 1")
        fase1_kcal = float(dados.fases[0].get("calorias_diarias", 2000.0))

    novo_projeto = ProjetoFisiologico(
        utilizador_id=uid,
        nome=dados.nome,
        descricao=dados.descricao or "",
        tipo_intencao=dados.tipo_intencao or "Transformação Corporal",
        ativo=dados.ativar_imediatamente,
        status="ativo",
        peso_inicial_kg=dados.peso_inicial_kg,
        peso_alvo_kg=dados.peso_alvo_kg,
        bf_inicial=dados.bf_inicial or 15.0,
        bf_alvo=dados.bf_alvo or 10.0,
        estrategia_inicial=dados.estrategia_inicial or "recomposicao",
        duracao_total_semanas=dados.duracao_total_semanas or 12,
        fase_atual_tipo=fase1_tipo,
        fase_atual_nome=fase1_nome,
        data_inicio_fase=datetime.utcnow().isoformat(),
        data_inicio_projeto=datetime.utcnow().isoformat(),
        fases_json=json.dumps(dados.fases),
        relatorio_completo_json=dados.relatorio_completo_json or "{}"
    )
    sessao.add(novo_projeto)
    sessao.commit()
    sessao.refresh(novo_projeto)

    if dados.ativar_imediatamente:
        # Ativar imediatamente no perfil
        perfil.fase_atual = fase1_tipo
        perfil.calorias_atuais = fase1_kcal
        perfil.peso_alvo = dados.peso_alvo_kg
        perfil.bf_alvo = dados.bf_alvo or 10.0

        relatorio_obj = {}
        try:
            relatorio_obj = json.loads(dados.relatorio_completo_json or "{}")
        except Exception:
            relatorio_obj = {}

        info_projeto = {
            "id_projeto": novo_projeto.id,
            "nome_projeto": novo_projeto.nome,
            "fase_tipo": fase1_tipo,
            "nome_fase": fase1_nome,
            "calorias_diarias": fase1_kcal,
            "calorias_base_fase": fase1_kcal,
            "data_inicio_fase": novo_projeto.data_inicio_fase,
            "data_inicio_projeto": novo_projeto.data_inicio_projeto,
            "fases": dados.fases,
            "relatorio": relatorio_obj,
            "tipo_intencao": novo_projeto.tipo_intencao,
            "peso_atual_kg": dados.peso_inicial_kg,
            "peso_alvo_kg": dados.peso_alvo_kg
        }
        perfil.projeto_ativo_json = json.dumps(info_projeto)
        sessao.commit()

    return {"mensagem": f"Projeto '{novo_projeto.nome}' guardado com sucesso!", "projeto_id": novo_projeto.id}


@roteador_perfil.get("/projetos/{id_proj}/detalhes")
def obter_detalhes_projeto(id_proj: int, sessao: Session = Depends(obter_sessao_bd)):
    """
    Retorna o detalhe aprofundado de um projeto:
    - Informações cadastrais e biometria
    - Relatório matemático completo e fases
    - Planos de treino vinculados
    - Planos de dieta vinculados
    - Check-ins e adaptações realizadas sob a vigência deste projeto
    """
    proj = sessao.query(ProjetoFisiologico).filter(ProjetoFisiologico.id == id_proj).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    fases = []
    try:
        fases = json.loads(proj.fases_json or "[]")
    except Exception:
        fases = []

    relatorio = {}
    try:
        relatorio = json.loads(proj.relatorio_completo_json or "{}")
    except Exception:
        relatorio = {}

    # Planos de Treino vinculados
    planos_treino = sessao.query(PlanoTreinoGuardado).filter(
        (PlanoTreinoGuardado.id_projeto == proj.id) | (PlanoTreinoGuardado.nome_projeto == proj.nome)
    ).order_by(PlanoTreinoGuardado.criado_em.asc()).all()

    treinos_dto = []
    for t in planos_treino:
        sessoes = []
        try:
            sessoes = json.loads(t.sessoes_json or "[]")
        except Exception:
            sessoes = []
        hist_alt = []
        try:
            hist_alt = json.loads(t.historico_alteracoes_json or "[]")
        except Exception:
            hist_alt = []

        treinos_dto.append({
            "id": t.id,
            "nome": t.nome,
            "divisao": t.divisao,
            "dias_semana": t.dias_semana,
            "tempo_sessao_minutos": t.tempo_sessao_minutos,
            "fase_projeto": t.fase_projeto,
            "nome_fase": t.nome_fase,
            "ativo": t.ativo,
            "total_sessoes": len(sessoes),
            "sessoes": sessoes,
            "historico_alteracoes": hist_alt,
            "criado_em": t.criado_em.isoformat() if t.criado_em else None
        })

    # Planos de Dieta vinculados
    planos_dieta = sessao.query(PlanoDietaGuardado).filter(
        (PlanoDietaGuardado.id_projeto == proj.id) | (PlanoDietaGuardado.nome_projeto == proj.nome)
    ).order_by(PlanoDietaGuardado.criado_em.asc()).all()

    dietas_dto = []
    for d in planos_dieta:
        refs = []
        try:
            refs = json.loads(d.refeicoes_json or "[]")
        except Exception:
            refs = []
        hist_alt = []
        try:
            hist_alt = json.loads(d.historico_alteracoes_json or "[]")
        except Exception:
            hist_alt = []

        dietas_dto.append({
            "id": d.id,
            "nome": d.nome,
            "fase_projeto": d.fase_projeto,
            "nome_fase": d.nome_fase,
            "calorias": d.calorias,
            "proteina_g": d.proteina_g,
            "hidratos_g": d.hidratos_g,
            "gordura_g": d.gordura_g,
            "ativo": d.ativo,
            "total_refeicoes": len(refs),
            "refeicoes": refs,
            "historico_alteracoes": hist_alt,
            "criado_em": d.criado_em.isoformat() if d.criado_em else None
        })

    # Check-ins vinculados
    checkins = sessao.query(RegistoCheckIn).filter(
        (RegistoCheckIn.id_projeto == proj.id) | (RegistoCheckIn.nome_projeto == proj.nome)
    ).order_by(RegistoCheckIn.data.asc()).all()

    checkins_dto = []
    for c in checkins:
        diag = {}
        try:
            diag = json.loads(c.diagnostico_matematico_json or "{}")
        except Exception:
            diag = {}
        rec = {}
        try:
            rec = json.loads(c.recomendacao_ia_json or "{}")
        except Exception:
            rec = {}
        met = {}
        try:
            met = json.loads(c.metricas_adicionais_json or "{}")
        except Exception:
            met = {}

        checkins_dto.append({
            "id": c.id,
            "data": c.data.isoformat(),
            "peso_medio": c.peso_medio,
            "variacao_peso_kg": c.variacao_peso_kg,
            "fase_atual": c.fase_atual,
            "adesao_percentual": c.adesao_percentual,
            "nivel_fadiga": c.nivel_fadiga,
            "qualidade_sono": c.qualidade_sono,
            "nivel_fome": c.nivel_fome,
            "dores_ou_queixas": c.dores_ou_queixas,
            "diagnostico_matematico": diag,
            "recomendacoes_ia": rec,
            "metricas_adicionais": met
        })

    return {
        "projeto": {
            "id": proj.id,
            "nome": proj.nome,
            "descricao": proj.descricao or "",
            "tipo_intencao": proj.tipo_intencao,
            "ativo": proj.ativo,
            "status": proj.status,
            "peso_inicial_kg": proj.peso_inicial_kg,
            "peso_alvo_kg": proj.peso_alvo_kg,
            "bf_inicial": proj.bf_inicial,
            "bf_alvo": proj.bf_alvo,
            "estrategia_inicial": proj.estrategia_inicial,
            "duracao_total_semanas": proj.duracao_total_semanas,
            "fase_atual_tipo": proj.fase_atual_tipo,
            "fase_atual_nome": proj.fase_atual_nome,
            "data_inicio_fase": proj.data_inicio_fase,
            "data_inicio_projeto": proj.data_inicio_projeto,
            "fases": fases,
            "criado_em": proj.criado_em.isoformat() if proj.criado_em else None,
            "atualizado_em": proj.atualizado_em.isoformat() if proj.atualizado_em else None
        },
        "relatorio": relatorio,
        "planos_treino": treinos_dto,
        "planos_dieta": dietas_dto,
        "checkins": checkins_dto
    }


@roteador_perfil.put("/projetos/{id_proj}/ativar")
def ativar_projeto_existente(id_proj: int, sessao: Session = Depends(obter_sessao_bd)):
    """
    Torna o projeto selecionado o projeto ativo do motor:
    - Desativa os outros projetos
    - Ativa os planos de dieta e treino associados a ele
    - Atualiza o perfil e o diário diário de consumo
    """
    proj = sessao.query(ProjetoFisiologico).filter(ProjetoFisiologico.id == id_proj).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    perfil = sessao.query(PerfilUtilizador).first()
    if not perfil:
        perfil = PerfilUtilizador()
        sessao.add(perfil)

    # 1. Desativar todos e ativar este
    sessao.query(ProjetoFisiologico).update({"ativo": False})
    proj.ativo = True
    proj.status = "ativo"

    # 2. Atualizar perfil
    fases = []
    try:
        fases = json.loads(proj.fases_json or "[]")
    except Exception:
        fases = []

    fase_atual_obj = None
    if fases:
        for f in fases:
            if f.get("tipo") == proj.fase_atual_tipo or f.get("nome_exibicao") == proj.fase_atual_nome:
                fase_atual_obj = f
                break
        if not fase_atual_obj:
            fase_atual_obj = fases[0]

    calorias_fase = float(fase_atual_obj.get("calorias_diarias", 2000.0)) if fase_atual_obj else 2000.0
    perfil.fase_atual = proj.fase_atual_tipo
    perfil.calorias_atuais = calorias_fase
    perfil.peso_alvo = proj.peso_alvo_kg
    perfil.bf_alvo = proj.bf_alvo

    relatorio_obj = {}
    try:
        relatorio_obj = json.loads(proj.relatorio_completo_json or "{}")
    except Exception:
        relatorio_obj = {}

    info_projeto = {
        "id_projeto": proj.id,
        "nome_projeto": proj.nome,
        "fase_tipo": proj.fase_atual_tipo,
        "nome_fase": proj.fase_atual_nome,
        "calorias_diarias": calorias_fase,
        "calorias_base_fase": calorias_fase,
        "data_inicio_fase": proj.data_inicio_fase or datetime.utcnow().isoformat(),
        "data_inicio_projeto": proj.data_inicio_projeto or datetime.utcnow().isoformat(),
        "fases": fases,
        "relatorio": relatorio_obj,
        "tipo_intencao": proj.tipo_intencao,
        "peso_atual_kg": proj.peso_inicial_kg,
        "peso_alvo_kg": proj.peso_alvo_kg
    }
    perfil.projeto_ativo_json = json.dumps(info_projeto)

    # 3. Ativar Dieta do projeto
    dieta_proj = sessao.query(PlanoDietaGuardado).filter(
        (PlanoDietaGuardado.id_projeto == proj.id) | (PlanoDietaGuardado.nome_projeto == proj.nome)
    ).first()
    if dieta_proj:
        sessao.query(PlanoDietaGuardado).update({"ativo": False})
        dieta_proj.ativo = True
        dieta_proj.atualizado_em = datetime.utcnow()

    # 4. Ativar Treino do projeto
    treino_proj = sessao.query(PlanoTreinoGuardado).filter(
        (PlanoTreinoGuardado.id_projeto == proj.id) | (PlanoTreinoGuardado.nome_projeto == proj.nome)
    ).first()
    if treino_proj:
        sessao.query(PlanoTreinoGuardado).update({"ativo": False})
        treino_proj.ativo = True
        treino_proj.atualizado_em = datetime.utcnow()

    # 5. Sincronizar diário de consumo de hoje
    data_hoje = datetime.utcnow().strftime("%Y-%m-%d")
    registo_hoje = sessao.query(RegistoDiarioConsumo).filter(RegistoDiarioConsumo.data == data_hoje).first()
    if registo_hoje:
        registo_hoje.calorias_alvo = calorias_fase
        if dieta_proj:
            registo_hoje.proteina_alvo_g = dieta_proj.proteina_g
            registo_hoje.hidratos_alvo_g = dieta_proj.hidratos_g
            registo_hoje.gordura_alvo_g = dieta_proj.gordura_g

    sessao.commit()
    sessao.refresh(proj)

    return {"mensagem": f"Projeto '{proj.nome}' ativado com sucesso!", "projeto": proj}


@roteador_perfil.put("/projetos/{id_proj}")
def atualizar_projeto(id_proj: int, dados: EsquemaAtualizarProjeto, sessao: Session = Depends(obter_sessao_bd)):
    """
    Permite renomear o projeto, atualizar a sua descrição ou alterar o status (ativo, concluído, arquivado).
    """
    proj = sessao.query(ProjetoFisiologico).filter(ProjetoFisiologico.id == id_proj).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    nome_antigo = proj.nome
    if dados.nome is not None and dados.nome.strip():
        proj.nome = dados.nome.strip()
    if dados.descricao is not None:
        proj.descricao = dados.descricao.strip()
    if dados.status is not None:
        proj.status = dados.status

    proj.atualizado_em = datetime.utcnow()

    # Se este projeto for o ativo no perfil, sincronizar nome no JSON do perfil
    perfil = sessao.query(PerfilUtilizador).first()
    if proj.ativo and perfil and perfil.projeto_ativo_json:
        try:
            info = json.loads(perfil.projeto_ativo_json)
            info["nome_projeto"] = proj.nome
            perfil.projeto_ativo_json = json.dumps(info)
        except Exception:
            pass

    # Atualizar nome nas tabelas filhas se mudou de nome
    if proj.nome != nome_antigo:
        sessao.query(PlanoTreinoGuardado).filter(PlanoTreinoGuardado.id_projeto == proj.id).update({"nome_projeto": proj.nome})
        sessao.query(PlanoDietaGuardado).filter(PlanoDietaGuardado.id_projeto == proj.id).update({"nome_projeto": proj.nome})
        sessao.query(RegistoCheckIn).filter(RegistoCheckIn.id_projeto == proj.id).update({"nome_projeto": proj.nome})

    sessao.commit()
    return {"mensagem": "Projeto atualizado com sucesso", "projeto": proj}


@roteador_perfil.delete("/projetos/{id_proj}")
def eliminar_projeto(id_proj: int, sessao: Session = Depends(obter_sessao_bd)):
    """
    Elimina ou arquiva um projeto.
    """
    proj = sessao.query(ProjetoFisiologico).filter(ProjetoFisiologico.id == id_proj).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    if proj.ativo:
        # Se for o ativo, tentar ativar outro se existir
        outro = sessao.query(ProjetoFisiologico).filter(ProjetoFisiologico.id != id_proj).first()
        if outro:
            outro.ativo = True

    sessao.delete(proj)
    sessao.commit()
    return {"mensagem": "Projeto removido com sucesso"}


# ==============================================================================
# MEMÓRIA & DIAGNÓSTICO ADAPTATIVO DA IA (TREINO E NUTRIÇÃO)
# ==============================================================================

def _gerar_memoria_treino_padrao(perfil: PerfilUtilizador, plano: PlanoTreinoGuardado = None, checkins = None) -> dict:
    peso = perfil.peso_atual or 70.0
    fase = (perfil.fase_atual or "bulk").upper()
    
    # Detetar se há queixas de articulações em check-ins
    queixas_recentes = []
    if checkins:
        for c in checkins[:4]:
            if c.dores_ou_queixas and c.dores_ou_queixas.strip():
                queixas_recentes.append(c.dores_ou_queixas.strip())

    alteracoes = []
    if plano and plano.historico_alteracoes_json:
        try:
            alteracoes = json.loads(plano.historico_alteracoes_json)
        except Exception:
            alteracoes = []

    substituicoes_txt = f"{len(alteracoes)} exercício(s) adaptado(s) por conforto biomecânico." if alteracoes else "Nenhuma restrição articular crítica detetada."

    return {
        "capacidade_forca": f"Muito Alta para o peso ({peso:.1f} kg). Excelente recrutamento neuromuscular e capacidade de aplicar tensão mecânica real.",
        "tolerancia_volume_e_pump": "Alta necessidade psicológica de pump e densidade metabólica. Excelente tolerância a volume em grupos pequenos (deltóides, braços); risco de estagnação se ultrapassar 10 séries pesadas para o mesmo grupo muscular grande na mesma sessão.",
        "perfil_recuperacao": "Recuperação potente do SNC quando respeitado o descanso de 2.5 a 3 minutos entre séries pesadas. Atenção ao volume cumulativo nos cotovelos e ombros em sessões de empurrar.",
        "pontos_fortes_e_foco": "Cadeia de empurrar (peito e tríceps) com resposta rápida; foco recomendado em peito clavicular (inclinado com alongamento) e deltóide lateral com técnicas de alta densidade.",
        "diretriz_algoritmo": "Satisfazer a mente e o pump do atleta utilizando finalizadores metabólicos (Drop-sets, Myo-reps, Rest-Pause) no último exercício isolador, mantendo as primeiras 3-4 séries pesadas focadas em sobrecarga progressiva limpa.",
        "resumo_transparente": "O sistema reconhece que a tua motivação e adesão aumentam com a sensação de congestão muscular (pump). Para que o teu corpo continue a progredir em hipertrofia sem acumular fadiga excessiva ou sobrecarga articular, as cargas pesadas são concentradas nas primeiras séries e o volume complementar é direcionado para técnicas de alta densidade.",
        "historico_feedbacks": [
            "Excelente adesão a descansos longos (3 min) em compostos pesados",
            "Preferência por faixas de 6-8 reps na base e 12-15 reps nos finalizadores de pump",
            substituicoes_txt
        ],
        "observacoes_atleta": "",
        "atualizado_em": datetime.now().strftime("%d/%m/%Y %H:%M")
    }


def _gerar_memoria_nutricao_padrao(perfil: PerfilUtilizador, plano: PlanoDietaGuardado = None, checkins = None) -> dict:
    fase = (perfil.fase_atual or "bulk").upper()
    calorias = perfil.calorias_atuais or 2400.0

    prefs_dict = {}
    if perfil.preferencias_alimentares_json:
        try:
            prefs_dict = json.loads(perfil.preferencias_alimentares_json)
        except Exception:
            prefs_dict = {}

    habito_apetite = prefs_dict.get("habitos_apetite") or "Pouco apetite matinal / necessidade de digestão leve ao acordar"
    alimentos_pref = prefs_dict.get("alimentos_preferidos") or "Arroz, aveia, batata, frango, ovos, iogurte, azeite"

    alteracoes = []
    if plano and plano.historico_alteracoes_json:
        try:
            alteracoes = json.loads(plano.historico_alteracoes_json)
        except Exception:
            alteracoes = []

    blindagem_txt = f"{len(alteracoes)} troca(s) registada(s) e blindada(s) nesta fase." if alteracoes else "Todos os alimentos da rotina base foram bem tolerados."

    return {
        "padrao_apetite": f"{habito_apetite}. As porções do pequeno-almoço devem ser reduzidas ou fracionadas para não causar peso gástrico.",
        "resposta_digestiva": "Digestão rápida e eficiente com fontes de hidratos complexos limpos (aveia, arroz, batata). Sensibilidade gástrica se houver excesso de gorduras perto do treino.",
        "alimentos_blindados": f"Prioridade aos alimentos preferidos ({alimentos_pref}). {blindagem_txt}",
        "capacidade_metabolica": f"Adesão consistente às metas calóricas ({calorias:.0f} kcal na fase {fase}). Flexibilidade com o sistema de equivalências sem alteração indesejada da composição corporal.",
        "diretriz_algoritmo": "Concentrar a maior densidade energética e hidratos no pré e pós-treino (glicogénio muscular) e no almoço/jantar. Proteger o início do dia com opções leves para respeitar o apetite biológico real.",
        "resumo_transparente": "O sistema registou que refeições volumosas ao acordar prejudicam o teu conforto gástrico. As doses foram calibradas para manter a manhã leve e concentrar a energia nos momentos onde tens mais fome e precisas de combustível para render no treino.",
        "historico_feedbacks": [
            "Regra de alívio matinal ativada para o pequeno-almoço",
            "Alimentos preferidos priorizados nas recalibrações de doses",
            "Blindagem ativa contra reintrodução de alimentos rejeitados"
        ],
        "observacoes_atleta": "",
        "atualizado_em": datetime.now().strftime("%d/%m/%Y %H:%M")
    }


@roteador_perfil.get("/memoria-ia")
def obter_memoria_ia(
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """Retorna o diagnóstico contínuo e a memória que a IA tem guardada sobre o treino e nutrição do atleta."""
    uid = resolver_utilizador_id(usuario)
    perfil = obter_ou_criar_perfil(sessao, uid)
    if not perfil:
        perfil = PerfilUtilizador()
        sessao.add(perfil)
        sessao.commit()
        sessao.refresh(perfil)

    plano_treino = sessao.query(PlanoTreinoGuardado).filter(PlanoTreinoGuardado.ativo == True).first()
    plano_dieta = sessao.query(PlanoDietaGuardado).filter(PlanoDietaGuardado.ativo == True).first()
    checkins = sessao.query(RegistoCheckIn).order_by(RegistoCheckIn.id.desc()).limit(5).all()

    # Memória de Treino
    memoria_treino = None
    if perfil.memoria_treino_ia_json:
        try:
            memoria_treino = json.loads(perfil.memoria_treino_ia_json)
        except Exception:
            memoria_treino = None

    if not memoria_treino:
        memoria_treino = _gerar_memoria_treino_padrao(perfil, plano_treino, checkins)
        perfil.memoria_treino_ia_json = json.dumps(memoria_treino)
        sessao.commit()

    # Memória de Nutrição
    memoria_nutricao = None
    if perfil.memoria_nutricao_ia_json:
        try:
            memoria_nutricao = json.loads(perfil.memoria_nutricao_ia_json)
        except Exception:
            memoria_nutricao = None

    if not memoria_nutricao:
        memoria_nutricao = _gerar_memoria_nutricao_padrao(perfil, plano_dieta, checkins)
        perfil.memoria_nutricao_ia_json = json.dumps(memoria_nutricao)
        sessao.commit()

    return {
        "treino": memoria_treino,
        "nutricao": memoria_nutricao
    }


@roteador_perfil.post("/memoria-ia/atualizar")
def atualizar_memoria_ia(
    dados: dict,
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """Permite ao atleta adicionar notas ou refinar o diagnóstico que a IA tem dele."""
    uid = resolver_utilizador_id(usuario)
    perfil = obter_ou_criar_perfil(sessao, uid)
    if not perfil:
        raise HTTPException(status_code=404, detail="Perfil não encontrado")

    tipo = dados.get("tipo")  # 'treino' ou 'nutricao'
    novos_dados = dados.get("dados") or {}
    observacao = dados.get("observacoes_atleta")

    if tipo == "treino":
        memoria_atual = json.loads(perfil.memoria_treino_ia_json or "{}")
        memoria_atual.update(novos_dados)
        if observacao is not None:
            memoria_atual["observacoes_atleta"] = observacao
        memoria_atual["atualizado_em"] = datetime.now().strftime("%d/%m/%Y %H:%M")
        perfil.memoria_treino_ia_json = json.dumps(memoria_atual)
    elif tipo == "nutricao":
        memoria_atual = json.loads(perfil.memoria_nutricao_ia_json or "{}")
        memoria_atual.update(novos_dados)
        if observacao is not None:
            memoria_atual["observacoes_atleta"] = observacao
        memoria_atual["atualizado_em"] = datetime.now().strftime("%d/%m/%Y %H:%M")
        perfil.memoria_nutricao_ia_json = json.dumps(memoria_atual)
    else:
        raise HTTPException(status_code=400, detail="Tipo deve ser 'treino' ou 'nutricao'")

    sessao.commit()
    return {
        "mensagem": f"Memória de {tipo} atualizada com sucesso",
        "memoria": json.loads(perfil.memoria_treino_ia_json if tipo == "treino" else perfil.memoria_nutricao_ia_json)
    }


@roteador_perfil.post("/memoria-ia/reanalisar")
def reanalisar_memoria_ia(
    dados: dict,
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """Regenera a memória e o diagnóstico da IA cruzando os dados mais recentes de check-ins e planos."""
    uid = resolver_utilizador_id(usuario)
    perfil = obter_ou_criar_perfil(sessao, uid)
    if not perfil:
        raise HTTPException(status_code=404, detail="Perfil não encontrado")

    tipo = dados.get("tipo")  # 'treino', 'nutricao' ou 'todos'
    plano_treino = sessao.query(PlanoTreinoGuardado).filter(PlanoTreinoGuardado.ativo == True).first()
    plano_dieta = sessao.query(PlanoDietaGuardado).filter(PlanoDietaGuardado.ativo == True).first()
    checkins = sessao.query(RegistoCheckIn).order_by(RegistoCheckIn.id.desc()).limit(5).all()

    if tipo in ["treino", "todos"]:
        mem_t = _gerar_memoria_treino_padrao(perfil, plano_treino, checkins)
        perfil.memoria_treino_ia_json = json.dumps(mem_t)

    if tipo in ["nutricao", "todos"]:
        mem_n = _gerar_memoria_nutricao_padrao(perfil, plano_dieta, checkins)
        perfil.memoria_nutricao_ia_json = json.dumps(mem_n)

    sessao.commit()
    return {
        "mensagem": "Diagnóstico e memória da IA recalculados com sucesso",
        "treino": json.loads(perfil.memoria_treino_ia_json or "{}"),
        "nutricao": json.loads(perfil.memoria_nutricao_ia_json or "{}")
    }
