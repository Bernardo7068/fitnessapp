"""
Rotas de Check-in Diário & Acompanhamento de Projeto: Motor Matemático + Coach de IA Cloud.
"""

import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from .ajudantes_rotas import resolver_utilizador_id, obter_ou_criar_perfil
from .rotas_auth import obter_utilizador_opcional, ContaUtilizador
from sqlalchemy.orm import Session
from ..base_dados.conexao import obter_sessao_bd
from ..base_dados.modelos import (
    RegistoCheckIn, PerfilUtilizador, PlanoDietaGuardado, RegistoDiarioConsumo, ProjetoFisiologico,
    PlanoTreinoGuardado
)
from ..esquemas.esquemas import EsquemaCheckInEntrada
from ..motor_matematico import analisar_e_ajustar_dieta
from ..ia_cloud.servico_coach import ServicoCoachIA
from .rotas_ia import obter_prompt_efetivo

roteador_checkin = APIRouter(prefix="/api/checkin", tags=["Check-in e Diagnóstico Adaptativo"])


def sincronizar_ajuste_dieta(
    sessao: Session,
    perfil: Optional[PerfilUtilizador],
    novas_calorias: float,
    novos_macros: Optional[Dict[str, Any]] = None
):
    """
    Sincroniza as novas calorias e macros em todos os pilares do sistema:
    1. Perfil do utilizador (calorias_atuais)
    2. Projeto Ativo JSON (atualiza calorias_diarias e macros da fase atual)
    3. Plano de Dieta Ativo (calorias, macros e calibração das doses das refeições)
    4. Registo Diário de Consumo de hoje (calorias_alvo e macros_alvo)
    """
    calorias_float = round(float(novas_calorias), 0)

    # 1. Perfil
    if perfil:
        perfil.calorias_atuais = calorias_float

        # 2. Projeto Ativo JSON
        if perfil.projeto_ativo_json:
            try:
                proj = json.loads(perfil.projeto_ativo_json)
                fase_atual = perfil.fase_atual or "cut"
                fases = proj.get("fases") or (proj.get("relatorio", {}).get("fases") if isinstance(proj.get("relatorio"), dict) else None)
                if isinstance(fases, list):
                    for f in fases:
                        if f.get("tipo") == fase_atual or len(fases) == 1:
                            f["calorias_diarias"] = calorias_float
                            if novos_macros and "macros" in f and isinstance(f["macros"], dict):
                                if "proteina_g" in novos_macros: f["macros"]["proteina_g"] = float(novos_macros["proteina_g"])
                                if "gordura_g" in novos_macros: f["macros"]["gordura_g"] = float(novos_macros["gordura_g"])
                                if "hidratos_g" in novos_macros: f["macros"]["hidratos_g"] = float(novos_macros["hidratos_g"])
                            break
                if "calorias_diarias" in proj:
                    proj["calorias_diarias"] = calorias_float
                perfil.projeto_ativo_json = json.dumps(proj)
            except Exception as err:
                print(f"[Checkin] Erro ao sincronizar projeto_ativo_json: {err}")

    # 3. Plano de Dieta Ativo
    uid_local = perfil.utilizador_id if perfil else 1
    plano_ativo = sessao.query(PlanoDietaGuardado).filter(PlanoDietaGuardado.ativo == True, PlanoDietaGuardado.utilizador_id == uid_local).first()
    if plano_ativo:
        plano_ativo.calorias = calorias_float
        if novos_macros:
            if "proteina_g" in novos_macros: plano_ativo.proteina_g = float(novos_macros["proteina_g"])
            if "gordura_g" in novos_macros: plano_ativo.gordura_g = float(novos_macros["gordura_g"])
            if "hidratos_g" in novos_macros: plano_ativo.hidratos_g = float(novos_macros["hidratos_g"])
            if "fibras_g" in novos_macros: plano_ativo.fibras_g = float(novos_macros.get("fibras_g", 30.0))

        # Calibrar proporcionalmente as doses dos alimentos nas refeições existentes
        refeicoes = json.loads(plano_ativo.refeicoes_json or "[]")
        if refeicoes:
            servico = ServicoCoachIA()
            fase_proj = perfil.fase_atual if perfil else "cut"
            try:
                res_calib = servico._calibrar_dieta_heuristica_local({
                    "refeicoes_atuais": refeicoes,
                    "calorias_alvo": calorias_float,
                    "fase_projeto": fase_proj,
                    "alimentos_preferidos": "",
                    "alimentos_evitados": "",
                    "historico_alteracoes": json.loads(plano_ativo.historico_alteracoes_json or "[]")
                })
                if res_calib.get("refeicoes"):
                    plano_ativo.refeicoes_json = json.dumps(res_calib["refeicoes"])
            except Exception as err:
                print(f"[Checkin] Erro ao calibrar doses das refeições: {err}")

        plano_ativo.atualizado_em = datetime.utcnow()

    # 4. Registo Diário de Hoje
    data_hoje = datetime.utcnow().strftime("%Y-%m-%d")
    registo_hoje = sessao.query(RegistoDiarioConsumo).filter(RegistoDiarioConsumo.data == data_hoje, RegistoDiarioConsumo.utilizador_id == uid_local).first()
    if registo_hoje:
        registo_hoje.calorias_alvo = calorias_float
        if novos_macros:
            if "proteina_g" in novos_macros: registo_hoje.proteina_alvo_g = float(novos_macros["proteina_g"])
            if "hidratos_g" in novos_macros: registo_hoje.hidratos_alvo_g = float(novos_macros["hidratos_g"])
            if "gordura_g" in novos_macros: registo_hoje.gordura_alvo_g = float(novos_macros["gordura_g"])
        if plano_ativo:
            try:
                from .rotas_nutricao import _reconciliar_e_recalcular_diario
                _reconciliar_e_recalcular_diario(registo_hoje, plano_ativo, sessao)
            except Exception as err:
                print(f"[Checkin] Erro ao reconciliar diário: {err}")

    sessao.commit()


@roteador_checkin.post("/processar")
async def processar_checkin_semanal(
    dados: EsquemaCheckInEntrada,
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """
    1. Executa o diagnóstico matemático cruzando variação de peso, cintura e rendimento no treino.
    2. Aciona o Coach de IA para avaliar se o atleta está no caminho certo e propor ajustes precisos na dieta e treino.
    3. Guarda o registo completo de medidas e biofeedback no histórico.
    4. Opcionalmente aplica os ajustes à dieta ativa de imediato.
    """
    uid = resolver_utilizador_id(usuario)
    perfil = obter_ou_criar_perfil(sessao, uid, nome_padrao=usuario.nome if usuario else "Atleta")
    chave_api = dados.chave_api_ia or (perfil.chave_api_ia if perfil else None)

    # 1. DIAGNÓSTICO MATEMÁTICO PURO
    fase_efetiva = dados.fase_atual
    if perfil and perfil.fase_atual and perfil.projeto_ativo_json:
        # Se há projeto ativo configurado, a fase ativa do projeto no perfil é a autoridade máxima
        if not dados.fase_atual or dados.fase_atual == perfil.fase_atual:
            fase_efetiva = perfil.fase_atual
    elif not fase_efetiva and perfil:
        fase_efetiva = perfil.fase_atual or "bulk"

    ultimo_checkin_registo = sessao.query(RegistoCheckIn).filter(RegistoCheckIn.utilizador_id == uid).order_by(RegistoCheckIn.data.desc()).first()

    # Determinar peso anterior automaticamente se não fornecido
    if dados.peso_medio_anterior is not None:
        peso_ant = dados.peso_medio_anterior
    elif ultimo_checkin_registo:
        peso_ant = ultimo_checkin_registo.peso_medio
    elif perfil and perfil.peso_atual:
        peso_ant = perfil.peso_atual
    else:
        peso_ant = dados.peso_medio_atual

    # Determinar cintura anterior automaticamente se não fornecida
    cintura_ant = dados.cintura_anterior_cm
    if cintura_ant is None and ultimo_checkin_registo and ultimo_checkin_registo.metricas_adicionais_json:
        try:
            m_ant = json.loads(ultimo_checkin_registo.metricas_adicionais_json)
            cintura_ant = m_ant.get("cintura_cm")
        except Exception:
            pass

    calorias_atuais_efetivas = dados.calorias_atuais or (perfil.calorias_atuais if perfil else 2000.0)

    # Extrair informações do projeto ativo e taxa semanal da fase antes de chamar o motor matemático
    taxa_semanal_alvo = None
    if perfil and perfil.projeto_ativo_json:
        try:
            info_proj_tmp = json.loads(perfil.projeto_ativo_json)
            fases_tmp = info_proj_tmp.get("fases", [])
            for f in fases_tmp:
                if f.get("tipo") == fase_efetiva or f.get("nome_exibicao") == (dados.nome_fase_projeto or ""):
                    taxa_semanal_alvo = f.get("taxa_semanal_alvo_kg")
                    break
            if taxa_semanal_alvo is None:
                taxa_semanal_alvo = info_proj_tmp.get("taxa_semanal_alvo_kg")
        except Exception:
            pass

    diagnostico_mat = analisar_e_ajustar_dieta(
        peso_medio_anterior=peso_ant,
        peso_medio_atual=dados.peso_medio_atual,
        calorias_atuais=calorias_atuais_efetivas,
        fase_atual=fase_efetiva,
        adesao_percentual=dados.adesao_percentual,
        semanas_em_defice_continuo=dados.semanas_em_defice_continuo,
        nivel_fadiga=dados.nivel_fadiga,
        progresso_treino=dados.progresso_treino,
        tentativas_estagnadas_treino=dados.tentativas_estagnadas_treino,
        taxa_semanal_alvo_kg=taxa_semanal_alvo
    )

    # Extrair informações do projeto ativo
    info_projeto = {}
    nome_fase_projeto = dados.nome_fase_projeto or ""
    dias_na_fase = 0
    semanas_na_fase = max(1, dados.semanas_em_defice_continuo or 1)
    transicao_fase_info = None

    if perfil and perfil.projeto_ativo_json:
        try:
            info_projeto = json.loads(perfil.projeto_ativo_json)
            if not nome_fase_projeto and info_projeto.get("fases"):
                for f in info_projeto["fases"]:
                    if f.get("tipo") == dados.fase_atual:
                        nome_fase_projeto = f.get("nome_exibicao") or f.get("tipo")
                        break

            # Contabilização real dos dias e semanas passadas na fase
            if info_projeto.get("data_inicio_fase"):
                try:
                    dt_inicio = datetime.fromisoformat(info_projeto["data_inicio_fase"])
                    dias_na_fase = max(0, (datetime.utcnow() - dt_inicio).days)
                    semanas_na_fase = max(1, (dias_na_fase // 7) + 1)
                except Exception:
                    pass

            # Avaliar se a meta da fase atual foi concluída e se deve avançar para a próxima fase
            fases = info_projeto.get("fases", [])
            if fases:
                fase_atual_obj = None
                fase_idx = -1
                for i, f in enumerate(fases):
                    if f.get("tipo") == fase_efetiva or f.get("nome_exibicao") == nome_fase_projeto:
                        fase_atual_obj = f
                        fase_idx = i
                        break

                if fase_atual_obj and fase_idx >= 0 and fase_idx < len(fases) - 1:
                    proxima = fases[fase_idx + 1]
                    peso_alvo_fase = fase_atual_obj.get("peso_fim_estimado_kg")
                    duracao_prevista = fase_atual_obj.get("duracao_semanas", 8)

                    atingiu_peso = False
                    tipo_f = str(fase_atual_obj.get("tipo", "")).lower()
                    if peso_alvo_fase is not None:
                        if "cut" in tipo_f or "defice" in tipo_f:
                            atingiu_peso = dados.peso_medio_atual <= float(peso_alvo_fase)
                        elif "bulk" in tipo_f:
                            atingiu_peso = dados.peso_medio_atual >= float(peso_alvo_fase)

                    atingiu_semanas = semanas_na_fase >= duracao_prevista

                    if atingiu_peso or atingiu_semanas:
                        transitado_automaticamente = False

                        # Se atingiu a meta da balança e está com aplicação automática de ajustes,
                        # o sistema avisa e avança imediatamente para a próxima fase!
                        if atingiu_peso and dados.aplicar_ajustes_automaticamente:
                            try:
                                nova_kcal = float(proxima.get("calorias_diarias", perfil.calorias_atuais))
                                nova_fase_tipo = proxima.get("tipo", perfil.fase_atual)
                                nova_fase_nome = proxima.get("nome_exibicao", "Nova Fase")

                                # 1. Atualizar perfil
                                perfil.fase_atual = nova_fase_tipo
                                perfil.calorias_atuais = nova_kcal

                                # 2. Atualizar projeto ativo
                                proj_ativo = sessao.query(ProjetoFisiologico).filter(ProjetoFisiologico.ativo == True, ProjetoFisiologico.utilizador_id == uid).first()
                                if proj_ativo:
                                    proj_ativo.fase_atual_tipo = nova_fase_tipo
                                    proj_ativo.fase_atual_nome = nova_fase_nome
                                    proj_ativo.data_inicio_fase = datetime.utcnow().isoformat()

                                # 3. Atualizar projeto_ativo_json no perfil
                                info_projeto["fase_tipo"] = nova_fase_tipo
                                info_projeto["nome_fase"] = nova_fase_nome
                                info_projeto["calorias_diarias"] = nova_kcal
                                info_projeto["calorias_base_fase"] = nova_kcal
                                info_projeto["data_inicio_fase"] = datetime.utcnow().isoformat()
                                info_projeto["series_alvo_semana"] = proxima.get("series_trabalho_semana", 14)
                                info_projeto["cardio_minutos_semana"] = proxima.get("cardio_minutos_semana", 100)
                                info_projeto["foco_treino"] = proxima.get("foco_treino", "")
                                perfil.projeto_ativo_json = json.dumps(info_projeto)

                                # 4. Atualizar plano alimentar
                                p_alvo = round(dados.peso_medio_atual * (2.2 if "cut" in nova_fase_tipo else 2.0), 1)
                                g_alvo = round(dados.peso_medio_atual * (0.8 if "cut" in nova_fase_tipo else 0.85), 1)
                                h_alvo = round(max(30.0, (nova_kcal - (p_alvo * 4.0 + g_alvo * 9.0)) / 4.0), 1)
                                macros_nova_fase = {
                                    "proteina_g": p_alvo,
                                    "gordura_g": g_alvo,
                                    "hidratos_g": h_alvo,
                                    "fibras_g": 30.0
                                }
                                sincronizar_ajuste_dieta(sessao, perfil, nova_kcal, macros_nova_fase)

                                # 5. Atualizar plano de treino
                                plano_treino = sessao.query(PlanoTreinoGuardado).filter(
                                    PlanoTreinoGuardado.ativo == True,
                                    PlanoTreinoGuardado.utilizador_id == uid
                                ).first()
                                if plano_treino:
                                    plano_treino.fase_projeto = nova_fase_tipo
                                    plano_treino.nome_fase = nova_fase_nome
                                    try:
                                        sessoes_ck = json.loads(plano_treino.sessoes_json or "[]")
                                        tipo_f_lower = (nova_fase_tipo or "").lower()
                                        ck_is_bulk = any(k in tipo_f_lower for k in ["bulk", "hipertrofia", "ganho", "massa"])
                                        ck_is_cut = any(k in tipo_f_lower for k in ["cut", "defin", "defice", "perda"])
                                        ck_is_deload = any(k in tipo_f_lower for k in ["deload", "readapt", "recup", "manuten"])
                                        for s_ck in sessoes_ck:
                                            for e_idx, ex in enumerate(s_ck.get("exercicios", [])):
                                                if e_idx == 0:
                                                    ex["series"] = max(3, min(5, int(ex.get("series", 3)) + 1)) if ck_is_bulk else (2 if ck_is_deload else 3)
                                                    ex["repeticoes"] = "8-10" if ck_is_deload else "6-8"
                                                    ex["rpe_alvo"] = 6.5 if ck_is_deload else 8.5
                                                elif e_idx == 1:
                                                    ex["series"] = 2 if ck_is_deload else 3
                                                    ex["repeticoes"] = "10-12" if ck_is_deload else "8-10"
                                                    ex["rpe_alvo"] = 6.5 if ck_is_deload else 8.0
                                                elif e_idx == 2:
                                                    ex["series"] = 2 if ck_is_deload else 3
                                                    ex["repeticoes"] = "12-15" if ck_is_deload else "10-12"
                                                    ex["rpe_alvo"] = 6.0 if ck_is_deload else 8.0
                                                else:
                                                    ex["series"] = 2 if ck_is_deload else 3
                                                    ex["repeticoes"] = "12-15"
                                                    ex["rpe_alvo"] = 6.0 if ck_is_deload else 8.5
                                        plano_treino.sessoes_json = json.dumps(sessoes_ck)
                                    except Exception as err_s:
                                        print(f"[Checkin] Erro ao adaptar sessoes do plano: {err_s}")
                                    plano_treino.atualizado_em = datetime.utcnow()

                                sessao.commit()
                                transitado_automaticamente = True
                                fase_efetiva = nova_fase_tipo
                                nome_fase_projeto = nova_fase_nome
                            except Exception as e:
                                print(f"[Checkin] Erro na transição automática de fase: {e}")

                        if transitado_automaticamente:
                            motivo_transicao = (
                                f"🎉 PARABÉNS! Atingiste o objetivo de peso da {fase_atual_obj.get('nome_exibicao')} ({peso_alvo_fase} kg)! "
                                f"O sistema ativou automaticamente a próxima etapa: {proxima.get('nome_exibicao')} ({proxima.get('calorias_diarias')} kcal/dia) "
                                f"e sincronizou a tua dieta e treino para esta nova fase."
                            )
                        elif atingiu_peso:
                            motivo_transicao = (
                                f"🏆 Meta de Balança Atingida! Alcançaste a meta de {peso_alvo_fase} kg. Podes agora avançar para {proxima.get('nome_exibicao')} ({proxima.get('calorias_diarias')} kcal/dia)."
                            )
                        else:
                            motivo_transicao = (
                                f"⏱️ Duração Prevista ({duracao_prevista} semanas) Concluída! Embora ainda não tenhas chegado aos {peso_alvo_fase} kg, completaste o bloco planeado. "
                                f"Podes avançar para o reset metabólico ({proxima.get('nome_exibicao')} a {proxima.get('calorias_diarias')} kcal/dia) para recuperar tiróide e leptina, ou prolongar a fase atual se a tua energia e força ainda estiverem elevadas."
                            )

                        transicao_fase_info = {
                            "pode_avancar": True,
                            "transitado_automaticamente": transitado_automaticamente,
                            "atingiu_peso": atingiu_peso,
                            "atingiu_semanas": atingiu_semanas,
                            "peso_alvo_fase": peso_alvo_fase,
                            "duracao_semanas": duracao_prevista,
                            "semanas_decorridas": semanas_na_fase,
                            "fase_atual": fase_atual_obj,
                            "proxima_fase": proxima,
                            "motivo": motivo_transicao
                        }
        except Exception:
            pass

    # 2. CONSULTORIA QUALITATIVA E AVALIAÇÃO DE PROJETO DA IA
    servico_ia = ServicoCoachIA(chave_api=chave_api)

    bf_final = dados.bf_atual or (perfil.bf_atual if perfil else 15.0)

    dados_para_ia = {
        "sexo": perfil.sexo if perfil else "masculino",
        "idade": perfil.idade if perfil else 25,
        "altura": perfil.altura_cm if perfil else 178.0,
        "peso_atual": dados.peso_medio_atual,
        "peso_anterior": peso_ant,
        "variacao_peso_kg": diagnostico_mat.variacao_peso_kg,
        "bf_atual": bf_final,
        "fase_atual": fase_efetiva,
        "nome_fase_projeto": nome_fase_projeto or fase_efetiva.title(),
        "projeto_ativo": dados.nome_projeto or info_projeto.get("tipo_intencao") or "Projeto Fisiológico",
        "peso_alvo_projeto": info_projeto.get("peso_alvo_kg") or (perfil.peso_alvo if perfil else 70.0),
        "calorias": diagnostico_mat.novas_calorias,
        "calorias_atuais": calorias_atuais_efetivas,
        "proteina_g": diagnostico_mat.novos_macros.proteina_g,
        "gordura_g": diagnostico_mat.novos_macros.gordura_g,
        "hidratos_g": diagnostico_mat.novos_macros.hidratos_g,
        # Medidas corporais completas
        "cintura_cm": dados.cintura_cm,
        "cintura_anterior_cm": cintura_ant,
        "pescoco_cm": dados.pescoco_cm,
        "peitoral_cm": dados.peitoral_cm,
        "ombros_cm": dados.ombros_cm,
        "braco_cm": dados.braco_cm,
        "antebraco_cm": dados.antebraco_cm,
        "coxa_cm": dados.coxa_cm,
        "panturrilha_cm": dados.panturrilha_cm,
        "anca_cm": dados.anca_cm,
        # Biofeedback & Estado do indivíduo
        "nivel_energia": dados.nivel_energia or 7,
        "nivel_fadiga": dados.nivel_fadiga,
        "qualidade_sono": dados.qualidade_sono,
        "horas_sono": dados.horas_sono or 7.0,
        "nivel_stress": dados.nivel_stress or 5,
        "nivel_fome": dados.nivel_fome,
        "estado_digestao": dados.estado_digestao or "normal",
        "dores_ou_queixas": dados.dores_ou_queixas,
        # Adesão e hábitos
        "adesao_percentual": dados.adesao_percentual,
        "agua_litros": dados.agua_litros or 2.5,
        "treino_cumprido": dados.treino_cumprido,
        "progresso_treino": dados.progresso_treino,
        "tentativas_estagnadas_treino": dados.tentativas_estagnadas_treino,
        "cardio_minutos_realizados": dados.cardio_minutos_realizados or 0,
        "passos_diarios": dados.passos_diarios or 8000,
        "notas_usuario": dados.notas_usuario,
        "alimentos_consumidos": dados.alimentos_consumidos
    }

    prompt_coach_custom = obter_prompt_efetivo(perfil, "coach") if perfil else None
    recomendacoes_ia = await servico_ia.obter_recomendacoes_coach(
        dados_para_ia,
        chave_substituta=chave_api,
        prompt_sistema_substituto=prompt_coach_custom
    )

    # 3. ATUALIZAÇÃO DO PERFIL E PLANO (SE APLICÁVEL)
    if perfil:
        perfil.peso_atual = dados.peso_medio_atual
        if dados.bf_atual is not None and dados.bf_atual > 0:
            perfil.bf_atual = dados.bf_atual
        if dados.aplicar_ajustes_automaticamente:
            macros_dict = {
                "proteina_g": diagnostico_mat.novos_macros.proteina_g,
                "gordura_g": diagnostico_mat.novos_macros.gordura_g,
                "hidratos_g": diagnostico_mat.novos_macros.hidratos_g,
                "fibras_g": diagnostico_mat.novos_macros.fibras_g,
            }
            sincronizar_ajuste_dieta(sessao, perfil, diagnostico_mat.novas_calorias, macros_dict)
        else:
            sessao.commit()

    # 4. GUARDAR HISTÓRICO COM TODAS AS MÉTRICAS
    metricas_extras = {
        "cintura_cm": dados.cintura_cm,
        "cintura_anterior_cm": cintura_ant,
        "pescoco_cm": dados.pescoco_cm,
        "peitoral_cm": dados.peitoral_cm,
        "ombros_cm": dados.ombros_cm,
        "braco_cm": dados.braco_cm,
        "antebraco_cm": dados.antebraco_cm,
        "coxa_cm": dados.coxa_cm,
        "panturrilha_cm": dados.panturrilha_cm,
        "anca_cm": dados.anca_cm,
        "bf_atual": bf_final,
        "peso_anterior_automatico": peso_ant,
        "nivel_energia": dados.nivel_energia,
        "horas_sono": dados.horas_sono,
        "nivel_stress": dados.nivel_stress,
        "estado_digestao": dados.estado_digestao,
        "agua_litros": dados.agua_litros,
        "treino_cumprido": dados.treino_cumprido,
        "cardio_minutos_realizados": dados.cardio_minutos_realizados,
        "passos_diarios": dados.passos_diarios,
        "nome_fase_projeto": nome_fase_projeto,
        "nome_projeto": dados.nome_projeto or info_projeto.get("tipo_intencao", ""),
        "dias_na_fase": dias_na_fase,
        "semanas_na_fase": semanas_na_fase
    }

    # Determinar projeto ativo
    proj_ativo = sessao.query(ProjetoFisiologico).filter(ProjetoFisiologico.ativo == True, ProjetoFisiologico.utilizador_id == uid).first()
    id_projeto_ativo = proj_ativo.id if proj_ativo else None
    nome_projeto_ativo = proj_ativo.nome if proj_ativo else (dados.nome_projeto or info_projeto.get("nome_projeto") or info_projeto.get("tipo_intencao", "Projeto Fisiológico"))

    metricas_extras["id_projeto"] = id_projeto_ativo
    metricas_extras["nome_projeto"] = nome_projeto_ativo

    registo = RegistoCheckIn(
        utilizador_id=uid,
        id_projeto=id_projeto_ativo,
        nome_projeto=nome_projeto_ativo,
        peso_medio=dados.peso_medio_atual,
        variacao_peso_kg=diagnostico_mat.variacao_peso_kg,
        fase_atual=fase_efetiva,
        adesao_percentual=dados.adesao_percentual,
        nivel_fadiga=dados.nivel_fadiga,
        qualidade_sono=dados.qualidade_sono,
        nivel_fome=dados.nivel_fome,
        dores_ou_queixas=dados.dores_ou_queixas,
        notas_usuario=dados.notas_usuario,
        diagnostico_matematico_json=json.dumps({
            "peso_medio_anterior": diagnostico_mat.peso_medio_anterior,
            "peso_medio_atual": diagnostico_mat.peso_medio_atual,
            "variacao_peso_kg": diagnostico_mat.variacao_peso_kg,
            "taxa_variacao_percentual": diagnostico_mat.taxa_variacao_percentual,
            "calorias_atuais": diagnostico_mat.calorias_atuais,
            "novas_calorias": diagnostico_mat.novas_calorias,
            "diferenca_calorias": diagnostico_mat.diferenca_calorias,
            "novos_macros": {
                "calorias": diagnostico_mat.novos_macros.calorias,
                "proteina_g": diagnostico_mat.novos_macros.proteina_g,
                "gordura_g": diagnostico_mat.novos_macros.gordura_g,
                "hidratos_g": diagnostico_mat.novos_macros.hidratos_g,
                "fibras_g": diagnostico_mat.novos_macros.fibras_g
            },
            "ajuste_cardio_minutos": diagnostico_mat.ajuste_cardio_minutos,
            "motivo_matematico": diagnostico_mat.motivo_matematico,
            "alerta_estagnacao": diagnostico_mat.alerta_estagnacao,
            "necessita_diet_break": diagnostico_mat.necessita_diet_break,
            "alerta_ganho_gordura_sem_progresso": diagnostico_mat.alerta_ganho_gordura_sem_progresso,
            "ajuste_treino_recomendado": diagnostico_mat.ajuste_treino_recomendado,
            "aviso_proativo_utilizador": diagnostico_mat.aviso_proativo_utilizador
        }),
        recomendacao_ia_json=json.dumps(recomendacoes_ia),
        metricas_adicionais_json=json.dumps(metricas_extras)
    )
    sessao.add(registo)
    sessao.commit()
    sessao.refresh(registo)

    return {
        "id_checkin": registo.id,
        "diagnostico_matematico": diagnostico_mat,
        "recomendacoes_ia": recomendacoes_ia,
        "metricas_adicionais": metricas_extras,
        "transicao_fase": transicao_fase_info
    }


@roteador_checkin.post("/aplicar-ajustes")
def aplicar_ajustes_checkin(
    dados: dict,
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """
    Aplica as calorias e macros recomendadas no check-in diretamente ao perfil,
    ao projeto ativo, ao plano de refeições e ao diário de consumo.
    """
    uid = resolver_utilizador_id(usuario)
    perfil = obter_ou_criar_perfil(sessao, uid, nome_padrao=usuario.nome if usuario else "Atleta")
    if not perfil:
        raise HTTPException(status_code=404, detail="Perfil não encontrado")

    calorias = dados.get("novas_calorias")
    if not calorias:
        raise HTTPException(status_code=400, detail="Calorias não fornecidas")

    macros = dados.get("novos_macros") or {}
    sincronizar_ajuste_dieta(sessao, perfil, float(calorias), macros)

    return {
        "sucesso": True,
        "mensagem": f"Plano de dieta e macronutrientes sincronizados com {int(float(calorias))} kcal com sucesso!"
    }


@roteador_checkin.get("/historico")
def obter_historico_checkins(
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """Retorna o histórico de todos os check-ins realizados com medidas e biofeedback."""
    uid = resolver_utilizador_id(usuario)
    registos = sessao.query(RegistoCheckIn).filter(RegistoCheckIn.utilizador_id == uid).order_by(RegistoCheckIn.data.desc()).all()
    lista = []
    for r in registos:
        metricas_adicionais = {}
        if getattr(r, "metricas_adicionais_json", None):
            try:
                metricas_adicionais = json.loads(r.metricas_adicionais_json)
            except Exception:
                pass

        lista.append({
            "id": r.id,
            "data": r.data.isoformat(),
            "peso_medio": r.peso_medio,
            "variacao_peso_kg": r.variacao_peso_kg,
            "fase_atual": r.fase_atual,
            "adesao_percentual": r.adesao_percentual,
            "nivel_fadiga": r.nivel_fadiga,
            "qualidade_sono": r.qualidade_sono,
            "nivel_fome": r.nivel_fome,
            "dores_ou_queixas": r.dores_ou_queixas,
            "diagnostico_matematico": json.loads(r.diagnostico_matematico_json),
            "recomendacoes_ia": json.loads(r.recomendacao_ia_json),
            "metricas_adicionais": metricas_adicionais
        })
    return lista


def calcular_status_periodico(sessao: Session, usuario: Optional[ContaUtilizador] = None) -> Dict[str, Any]:
    """Calcula o estado de periodicidade do check-up para aviso proativo ao atleta."""
    uid = resolver_utilizador_id(usuario)
    perfil = obter_ou_criar_perfil(sessao, uid, nome_padrao=usuario.nome if usuario else "Atleta")
    cfg = {}
    if perfil and getattr(perfil, "configuracao_checkin_json", None):
        try:
            cfg = json.loads(perfil.configuracao_checkin_json)
        except Exception:
            cfg = {}

    frequencia_dias = int(cfg.get("frequencia_dias", 7))
    dia_semana_preferido = cfg.get("dia_semana_preferido", "qualquer")
    notificacao_ativa = bool(cfg.get("notificacao_ativa", True))

    ultimo_checkin = sessao.query(RegistoCheckIn).filter(RegistoCheckIn.utilizador_id == uid).order_by(RegistoCheckIn.data.desc()).first()

    if ultimo_checkin and ultimo_checkin.data:
        dt_ultimo = ultimo_checkin.data
        dias_decorridos = max(0, (datetime.utcnow() - dt_ultimo).days)
        ultimo_checkin_data = dt_ultimo.isoformat()
        proximo_checkin_dt = dt_ultimo + timedelta(days=frequencia_dias)
        proximo_checkin_str = proximo_checkin_dt.strftime("%d/%m/%Y")
    else:
        proj_ativo = sessao.query(ProjetoFisiologico).filter(ProjetoFisiologico.ativo == True, ProjetoFisiologico.utilizador_id == uid).first()
        if proj_ativo and proj_ativo.data_inicio_fase:
            try:
                dt_inicio = datetime.fromisoformat(proj_ativo.data_inicio_fase)
                dias_decorridos = max(0, (datetime.utcnow() - dt_inicio).days)
            except Exception:
                dias_decorridos = 0
        elif perfil and perfil.criado_em:
            dias_decorridos = max(0, (datetime.utcnow() - perfil.criado_em).days)
        else:
            dias_decorridos = 0

        ultimo_checkin_data = None
        proximo_checkin_dt = datetime.utcnow()
        proximo_checkin_str = "Hoje (Primeiro Check-up)"

    dias_restantes = max(0, frequencia_dias - dias_decorridos)
    checkin_pendente = dias_decorridos >= frequencia_dias

    if dias_decorridos == frequencia_dias:
        nivel_urgencia = "hoje"
    elif dias_decorridos > frequencia_dias:
        nivel_urgencia = "atrasado"
    else:
        nivel_urgencia = "em_dia"

    if checkin_pendente:
        if dias_decorridos > frequencia_dias:
            atraso = dias_decorridos - frequencia_dias
            mensagem_aviso = (
                f"⚠️ Check-up periódico em atraso ({atraso} dia{'s' if atraso > 1 else ''})! "
                f"Já passaram {dias_decorridos} dias desde a última avaliação. "
                f"Atualiza as tuas métricas para o motor adaptar o teu treino e dieta."
            )
        else:
            mensagem_aviso = (
                f"🔔 Hora do Check-up! Completaste o teu ciclo de {frequencia_dias} dias. "
                f"Regista o teu peso e medidas de hoje para o Coach IA avaliar o teu progresso."
            )
    else:
        mensagem_aviso = (
            f"🟢 Check-up em dia! Próxima avaliação recomendada para daqui a {dias_restantes} dia{'s' if dias_restantes > 1 else ''} ({proximo_checkin_str})."
        )

    return {
        "ultimo_checkin_data": ultimo_checkin_data,
        "dias_decorridos": dias_decorridos,
        "frequencia_dias": frequencia_dias,
        "dia_semana_preferido": dia_semana_preferido,
        "dias_restantes": dias_restantes,
        "proximo_checkin_data": proximo_checkin_str,
        "checkin_pendente": checkin_pendente and notificacao_ativa,
        "nivel_urgencia": nivel_urgencia,
        "mensagem_aviso": mensagem_aviso,
        "notificacao_ativa": notificacao_ativa
    }


@roteador_checkin.get("/status-periodico")
def obter_status_checkin_periodico(
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """Retorna o estado da periodicidade do check-up do atleta (dias decorridos, próximo agendamento e alertas)."""
    return calcular_status_periodico(sessao, usuario)


@roteador_checkin.post("/configurar-periodo")
def configurar_periodo_checkin(
    dados: dict,
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """Permite ao atleta configurar o intervalo do check-in (ex: a cada 7 dias) e preferências de aviso."""
    uid = resolver_utilizador_id(usuario)
    perfil = obter_ou_criar_perfil(sessao, uid, nome_padrao=usuario.nome if usuario else "Atleta")
    if not perfil:
        perfil = PerfilUtilizador()
        sessao.add(perfil)

    frequencia = int(dados.get("frequencia_dias", 7))
    if frequencia < 1 or frequencia > 30:
        raise HTTPException(status_code=400, detail="A frequência deve situar-se entre 1 e 30 dias")

    cfg = {
        "frequencia_dias": frequencia,
        "dia_semana_preferido": dados.get("dia_semana_preferido", "qualquer"),
        "notificacao_ativa": bool(dados.get("notificacao_ativa", True))
    }
    perfil.configuracao_checkin_json = json.dumps(cfg)
    sessao.commit()

    return {
        "mensagem": f"Periodicidade de check-up configurada para cada {frequencia} dias com sucesso!",
        "status": calcular_status_periodico(sessao, usuario)
    }


@roteador_checkin.post("/calcular-bf-navy")
def endpoint_calcular_bf_navy(
    dados: dict,
    sessao: Session = Depends(obter_sessao_bd),
    usuario: Optional[ContaUtilizador] = Depends(obter_utilizador_opcional)
):
    """Calcula a estimativa de gordura corporal (% BF) através da fórmula científica da Marinha Americana (US Navy)."""
    uid = resolver_utilizador_id(usuario)
    perfil = obter_ou_criar_perfil(sessao, uid, nome_padrao=usuario.nome if usuario else "Atleta")
    sexo = dados.get("sexo") or (perfil.sexo if perfil else "masculino")
    altura_cm = float(dados.get("altura_cm") or (perfil.altura_cm if perfil else 178.0))
    cintura_cm = float(dados.get("cintura_cm", 80.0))
    pescoco_cm = float(dados.get("pescoco_cm", 38.0))
    anca_cm = float(dados["anca_cm"]) if dados.get("anca_cm") else None

    from ..motor_matematico.composicao_corporal import calcular_bf_us_navy
    bf = calcular_bf_us_navy(
        sexo=sexo,
        altura_cm=altura_cm,
        cintura_cm=cintura_cm,
        pescoco_cm=pescoco_cm,
        anca_cm=anca_cm
    )
    return {
        "bf_calculado": bf,
        "metodo": "US Navy Body Fat Formula",
        "parametros": {
            "sexo": sexo,
            "altura_cm": altura_cm,
            "cintura_cm": cintura_cm,
            "pescoco_cm": pescoco_cm,
            "anca_cm": anca_cm
        }
    }
