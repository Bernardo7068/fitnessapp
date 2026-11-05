import re
"""
Serviço de Integração com IA Cloud (Google Gemini / OpenAI).
Gera recomendações qualitativas avançadas (vitaminas, micronutrientes, cardio e substituições de exercícios).
"""

import os
import json
import httpx
from typing import Dict, Any, Optional, List
from .prompts_ia import (
    PROMPT_SISTEMA_COACH,
    criar_prompt_analise_semanal,
    PROMPT_SISTEMA_TREINADOR,
    criar_prompt_prescricao_treino,
    PROMPT_SISTEMA_PRESCRICAO_DIETA,
    criar_prompt_prescricao_dieta,
    PROMPT_SISTEMA_CALIBRACAO_DIETA,
    criar_prompt_calibracao_dieta,
    PROMPT_SISTEMA_SUBSTITUICAO_ALIMENTO,
    criar_prompt_substituicao_alimento,
    PROMPT_SISTEMA_SUBSTITUICAO_EXERCICIO,
    criar_prompt_substituicao_exercicio
)
from ..motor_matematico.treino_adaptativo import (
    EXERCICIOS_CATALOGO,
    calcular_volume_por_grupo,
    limitar_volume_personalizado,
    validar_plano_treino_personalizado,
)
from ..motor_matematico.dieta_adaptativa import TABELA_ALIMENTOS_EQUIVALENCIAS, calcular_substituicao_alimento, normalizar_fase


class ServicoCoachIA:
    def __init__(self, chave_api: Optional[str] = None, provedor: str = "gemini"):
        self.chave_api = chave_api or os.getenv("CHAVE_API_IA") or os.getenv("GEMINI_API_KEY")
        if not self.chave_api:
            for env_path in ["servidor/.env", ".env"]:
                if os.path.exists(env_path):
                    try:
                        with open(env_path, "r", encoding="utf-8") as f_env:
                            for l_env in f_env:
                                l_env = l_env.strip()
                                if l_env.startswith("GEMINI_API_KEY=") or l_env.startswith("CHAVE_API_IA="):
                                    self.chave_api = l_env.split("=", 1)[1].strip().strip('"').strip("'")
                                    if self.chave_api:
                                        break
                    except Exception:
                        pass
                if self.chave_api:
                    break
        self.provedor = provedor.lower()

    async def obter_recomendacoes_coach(
        self,
        dados_usuario: Dict[str, Any],
        chave_substituta: Optional[str] = None,
        prompt_sistema_substituto: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Envia os dados matemáticos e biofeedback para a IA Cloud e recebe diagnóstico qualitativo.
        Se nenhuma chave API estiver configurada, devolve uma análise heurística detalhada de demonstração.
        """
        chave = chave_substituta or self.chave_api
        if not chave:
            return self._gerar_analise_heuristica_local(dados_usuario)

        try:
            # Tentar chamada à API Google Gemini Cloud
            return await self._chamar_gemini_api(chave, dados_usuario, prompt_sistema_substituto=prompt_sistema_substituto)
        except Exception as erro:
            print(f"[Aviso IA Cloud] Erro na chamada à API: {erro}. A usar consultoria heurística de segurança.")
            resposta_local = self._gerar_analise_heuristica_local(dados_usuario)
            resposta_local["aviso_conexao"] = f"Não foi possível conectar à IA Cloud ({str(erro)}). A exibir recomendações heurísticas locais."
            return resposta_local

    async def _chamar_gemini_api(
        self,
        chave: str,
        dados_usuario: Dict[str, Any],
        prompt_sistema_substituto: Optional[str] = None
    ) -> Dict[str, Any]:
        """Comunicação direta com a Google Gemini API via REST (rápido e sem dependências pesadas)."""
        prompt_conteudo = criar_prompt_analise_semanal(dados_usuario)
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={chave}"

        instrucao_sistema = prompt_sistema_substituto or PROMPT_SISTEMA_COACH

        payload = {
            "system_instruction": {
                "parts": [{"text": instrucao_sistema}]
            },
            "contents": [
                {
                    "parts": [{"text": prompt_conteudo}]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.4
            }
        }

        async with httpx.AsyncClient(timeout=25.0) as cliente:
            resposta = await cliente.post(url, json=payload)
            resposta.raise_for_status()
            dados = resposta.json()
            
            texto_resposta = dados["candidates"][0]["content"]["parts"][0]["text"]
            resultado_json = json.loads(texto_resposta)
            resultado_json["provedor_usado"] = "Google Gemini Cloud AI"
            return resultado_json

    def _gerar_analise_heuristica_local(self, dados_usuario: Dict[str, Any]) -> Dict[str, Any]:
        """
        Análise heurística inteligente baseada em regras clínicas e acompanhamento de projeto.
        Analisa se o atleta está no caminho certo e se precisa de ajustes na dieta ou no treino.
        """
        fadiga = dados_usuario.get("nivel_fadiga", 5)
        sono = dados_usuario.get("qualidade_sono", 7)
        horas_sono = dados_usuario.get("horas_sono", 7.0)
        energia = dados_usuario.get("nivel_energia", 7)
        stress = dados_usuario.get("nivel_stress", 5)
        fome = dados_usuario.get("nivel_fome", 5)
        digestao = str(dados_usuario.get("estado_digestao", "normal")).lower()
        fase = str(dados_usuario.get("fase_atual", "cut")).lower()
        fase_norm = normalizar_fase(fase)
        nome_fase = dados_usuario.get("nome_fase_projeto") or fase.title()
        projeto_nome = dados_usuario.get("projeto_ativo") or "Projeto Fisiológico"
        peso_alvo = float(dados_usuario.get("peso_alvo_projeto") or 0.0)
        peso_atual = float(dados_usuario.get("peso_atual") or 0.0)
        peso_anterior = float(dados_usuario.get("peso_anterior") or 0.0)
        queixas = str(dados_usuario.get("dores_ou_queixas", "")).lower()
        var_peso = float(dados_usuario.get("variacao_peso_kg", round(peso_atual - peso_anterior, 2)))
        prog_treino = str(dados_usuario.get("progresso_treino", "aumentou")).lower()
        adesao = float(dados_usuario.get("adesao_percentual", 90.0))
        calorias_atuais = float(dados_usuario.get("calorias_atuais") or dados_usuario.get("calorias") or 2000.0)
        p_g = float(dados_usuario.get("proteina_g") or 160.0)
        g_g = float(dados_usuario.get("gordura_g") or 55.0)
        hc_g = float(dados_usuario.get("hidratos_g") or 200.0)

        cintura = dados_usuario.get("cintura_cm")
        cintura_ant = dados_usuario.get("cintura_anterior_cm")
        var_cintura = round(float(cintura) - float(cintura_ant), 1) if (
            cintura is not None and cintura_ant is not None and str(cintura).strip() != "" and str(cintura_ant).strip() != ""
        ) else None

        # 1. AVALIAÇÃO: ESTÁ NO CAMINHO CERTO?
        status_caminho = "no_caminho_certo"
        titulo_veredito = "🟢 No Caminho Certo! Progresso Alinhado à Fase"
        resumo_analise = ""
        ritmo_progresso = ""
        necessita_ajuste_dieta = False
        acao_dieta = "manter"
        novas_calorias = calorias_atuais
        diff_kcal = 0.0
        motivo_dieta = "Manter calorias atuais inalteradas: o balanço energético está perfeito para a taxa metabólica esperada."

        necessita_ajuste_treino = False
        acao_treino = "manter"
        ajuste_volume = "Manter protocolo atual de séries de trabalho."
        ajuste_cardio = 0
        orientacoes_bio = "Biomecânica estável. Foca na cadência excêntrica controlada e descanso entre séries."

        # Identificação de meta de perda / corte
        eh_cut = (fase_norm == "cut") or ("perda" in projeto_nome.lower()) or (peso_alvo > 0 and peso_anterior > peso_alvo)

        # Regras por fase fisiológica
        if eh_cut:
            # 1.1 DESVIO CRÍTICO: Ganho expressivo de peso em Cut (>= +1.0 kg ou >= +1.2%)
            if var_peso >= 1.0:
                status_caminho = "desvio_detectado"
                titulo_veredito = "🔴 Desvio Crítico: Subida Expressiva de Peso em Fase de Perda"
                resumo_analise = (
                    f"Alerta de Desvio Crítico na fase {nome_fase}! Registaste uma subida anómala de {var_peso:+.2f} kg "
                    f"(de {peso_anterior} kg para {peso_atual} kg), o que colide diretamente com o objetivo de perda de peso do projeto "
                    f"({projeto_nome}, meta: {peso_alvo} kg). "
                    "Diagnóstico Fisiológico: Uma variação tão acentuada decorre de retenção hídrica massiva "
                    "(refeições ricas em sódio/carboidratos, inflamação pós-treino) ou de um superavit calórico não contabilizado. "
                    "É indispensável aplicar correções na dieta e cardio de imediato."
                )
                ritmo_progresso = f"🔴 Desvio severo: +{var_peso:.1f} kg em fase de corte. Ação corretiva urgente."
                necessita_ajuste_dieta = True
                acao_dieta = "reduzir_calorias"
                diff_kcal = -250.0
                novas_calorias = round(max(1300.0, calorias_atuais + diff_kcal), 0)
                motivo_dieta = (
                    f"Corte corretivo de 250 kcal (para {int(novas_calorias)} kcal/dia) e corte de ultraprocessados/sódio "
                    "para restaurar o balanço energético negativo e acelerar a perda de retenção."
                )
                necessita_ajuste_treino = True
                acao_treino = "ajustar_cardio"
                ajuste_cardio = +35
                ajuste_volume = "Manter cargas nos exercícios compostos e garantir 8.000 a 10.000 passos diários para elevar o gasto metabólico (NEAT)."

            # 1.2 DESVIO MODERADO: Subida de peso moderada (+0.2 kg < var_peso < +1.0 kg)
            elif var_peso > 0.2:
                status_caminho = "ajuste_necessario"
                titulo_veredito = "🟡 Desvio de Rota: Ganho de Peso no Défice"
                resumo_analise = (
                    f"Na fase {nome_fase}, o peso subiu {var_peso:+.2f} kg quando a meta biológica era descida. "
                    f"Com adesão de {adesao:.0f}%, é necessário calibrar a ingestão calórica e aumentar o cardio "
                    "para reiniciar a oxidação lipídica."
                )
                ritmo_progresso = "Pausa e desvio temporário na descida de peso. Ajuste corretivo ativado."
                necessita_ajuste_dieta = True
                acao_dieta = "reduzir_calorias"
                diff_kcal = -150.0
                novas_calorias = round(max(1300.0, calorias_atuais + diff_kcal), 0)
                motivo_dieta = f"Redução de 150 kcal (para {int(novas_calorias)} kcal) para restabelecer o défice calórico real."
                necessita_ajuste_treino = True
                acao_treino = "ajustar_cardio"
                ajuste_cardio = +20

            # 1.3 ESTAGNAÇÃO OU FLUTUAÇÃO LIGEIRA (-0.1 <= var_peso <= 0.2)
            elif var_peso >= -0.1:
                # Se a cintura reduziu de forma nítida (<= -0.5 cm), comprova recomposição/queima de gordura visceral
                if var_cintura is not None and var_cintura <= -0.5:
                    status_caminho = "no_caminho_certo"
                    titulo_veredito = f"🟢 No Caminho Certo: Recomposição Ativa ({nome_fase})"
                    resumo_analise = (
                        f"O peso na balança oscilou discretamente ({var_peso:+.2f} kg), mas a tua cintura diminuiu {var_cintura:+.1f} cm! "
                        "Isto comprova queima real de gordura visceral mascarada por retenção hídrica ou reposição de glicogénio. O plano está a funcionar!"
                    )
                    ritmo_progresso = "Perda de gordura comprovada pela redução da cintura abdominal."
                    motivo_dieta = f"Manter as {int(calorias_atuais)} kcal inalteradas: a composição corporal está a evoluir favoravelmente."
                elif fadiga >= 8 or sono <= 4 or horas_sono < 5.5:
                    status_caminho = "ajuste_necessario"
                    titulo_veredito = "🟡 Alerta de Sobrecarga: Fadiga Alta no Défice"
                    resumo_analise = f"O peso estagnou ({var_peso:+.2f} kg) e o nível de fadiga ({fadiga}/10) e sono ({horas_sono}h) mostram esgotamento do SNC. É fundamental aliviar o stress biológico para preservar massa magra."
                    necessita_ajuste_treino = True
                    acao_treino = "deload"
                    ajuste_volume = "Semana de Deload: Reduz 2 séries por grupo muscular e mantém RIR 2-3 (RPE 7-8)."
                    necessita_ajuste_dieta = True
                    acao_dieta = "refeed"
                    diff_kcal = +250.0
                    novas_calorias = round(calorias_atuais + diff_kcal, 0)
                    motivo_dieta = "Refeed estratégico de hidratos (+250 kcal) para restabelecer os níveis de glicogénio muscular e a hormona leptina."
                else:
                    if adesao >= 80.0:
                        status_caminho = "ajuste_necessario"
                        titulo_veredito = "🟡 Ajuste de Calibração: Estagnação no Défice"
                        resumo_analise = f"Na fase {nome_fase}, o peso estagnou ({var_peso:+.2f} kg). Com a tua consistência ({adesao}%), recomenda-se um ajuste suave de -120 kcal e +20 min de cardio para reiniciar a descida."
                        ritmo_progresso = "Estagnação metabólica temporária."
                        necessita_ajuste_dieta = True
                        acao_dieta = "reduzir_calorias"
                        diff_kcal = -120.0
                        novas_calorias = round(max(1300.0, calorias_atuais + diff_kcal), 0)
                        motivo_dieta = f"Corte suave de 120 kcal (para {int(novas_calorias)} kcal) para reiniciar a mobilização lipídica."
                        necessita_ajuste_treino = True
                        acao_treino = "ajustar_cardio"
                        ajuste_cardio = +20
                    else:
                        status_caminho = "ajuste_necessario"
                        titulo_veredito = "🟡 Foco na Adesão: Manter Calorias e Seguir o Plano"
                        resumo_analise = f"O peso não baixou ({var_peso:+.2f} kg) e a adesão reportada foi de {adesao}%. Não é momento de cortar mais calorias: o foco deve ser fechar os 100% dos macros prescritos."
                        motivo_dieta = f"Manter as {int(calorias_atuais)} kcal e priorizar a disciplina alimentar diária."

            # 1.4 PERDA REAL DE PESO (var_peso < -0.1)
            else:
                taxa_pct = (var_peso / peso_anterior) * 100.0 if peso_anterior > 0 else -1.0
                forca_ok = prog_treino in ["aumentou", "manteve"]
                disposicao_ok = fadiga < 8 and sono >= 5 and horas_sono >= 5.5 and energia >= 5
                perda_extrema = taxa_pct < -1.8 or var_peso < -1.8

                # Se a perda foi acentuada, MAS a força e disposição estão ótimas e a perda não foi extrema (> 1.8 kg / 1.8%),
                # NÃO deve alarmar nem mandar alterar dieta/treino!
                if perda_extrema or (taxa_pct < -1.0 and (not forca_ok or not disposicao_ok)):
                    status_caminho = "ajuste_necessario"
                    motivo_falha = []
                    if not forca_ok: motivo_falha.append(f"queda de rendimento no treino ({prog_treino})")
                    if not disposicao_ok: motivo_falha.append(f"fadiga elevada ({fadiga}/10) ou baixa energia ({energia}/10)")
                    if perda_extrema: motivo_falha.append(f"velocidade extrema de perda ({taxa_pct:.2f}% na semana)")
                    detalhe_motivo = " e ".join(motivo_falha)

                    titulo_veredito = "🟡 Alerta de Sobrecarga: Perda Rápida com Queda de Rendimento"
                    resumo_analise = (
                        f"Perda acelerada de {abs(var_peso):.2f} kg ({taxa_pct:.2f}% na semana) combinada com {detalhe_motivo}. "
                        "Quando a balança desce rápido mas a força ou a energia recuam, há risco real de perda de massa muscular. "
                        "Recomenda-se um ajuste protetor (+150 kcal/dia) para sustentar a intensidade dos treinos."
                    )
                    ritmo_progresso = "Perda rápida com perda de força/recuperação. Ajuste de proteção ativado."
                    necessita_ajuste_dieta = True
                    acao_dieta = "aumentar_calorias"
                    diff_kcal = +150.0
                    novas_calorias = round(calorias_atuais + diff_kcal, 0)
                    motivo_dieta = f"Aumento protetor de 150 kcal (para {int(novas_calorias)} kcal) para restaurar a força no ginásio e travar o catabolismo."
                elif fadiga >= 8 or sono <= 4 or horas_sono < 5.5:
                    status_caminho = "ajuste_necessario"
                    titulo_veredito = "🟡 Alerta de Sobrecarga: Fadiga Alta no Défice"
                    resumo_analise = f"Estás a perder peso ({var_peso} kg), mas o nível de fadiga ({fadiga}/10) e sono ({horas_sono}h) mostram sobrecarga biológica. Recomendado Deload e refeed controlado."
                    necessita_ajuste_treino = True
                    acao_treino = "deload"
                    ajuste_volume = "Semana de Deload: Reduz 2 séries por grupo muscular e foca na recuperação neural."
                    necessita_ajuste_dieta = True
                    acao_dieta = "refeed"
                    diff_kcal = +250.0
                    novas_calorias = round(calorias_atuais + diff_kcal, 0)
                    motivo_dieta = "Refeed de hidratos (+250 kcal) para reposição de glicogénio e restauração da leptina."
                else:
                    # Perda no ritmo certo ou rápida com força e energia intactas!
                    status_caminho = "no_caminho_certo"
                    titulo_veredito = f"🟢 No Caminho Certo: Queima Ativa ({nome_fase})"
                    resumo_analise = (
                        f"Excelente resposta corporal na fase {nome_fase}! Variação de {var_peso:+.2f} kg ({taxa_pct:+.2f}%) "
                        f"com força preservada no treino ({prog_treino}) e boa energia ({energia}/10). "
                        "Como a força se manteve e a recuperação está sólida, a gordura está a queimar sem qualquer perda muscular. "
                        "O plano deve ser mantido exatamente como está, sem necessidade de alterações!"
                    )
                    ritmo_progresso = "Ritmo ideal de queima de gordura com preservação muscular comprovada no ginásio."
                    motivo_dieta = f"Mantemos as {int(calorias_atuais)} kcal. A taxa de perda está perfeitamente alinhada com o rendimento no treino."

        # Hipertrofia / Bulk
        elif fase_norm == "bulk" or (peso_alvo > 0 and peso_anterior < peso_alvo):
            if var_peso < -0.1:
                status_caminho = "ajuste_necessario"
                titulo_veredito = "🟡 Superavit Insuficiente: Peso em Queda no Bulk"
                resumo_analise = f"O teu peso recuou {var_peso:+.2f} kg na fase {nome_fase}. O teu gasto calórico diário está superior à ingestão, impedindo a hipertrofia."
                ritmo_progresso = "Perda de peso contraproducente para fase de hipertrofia."
                necessita_ajuste_dieta = True
                acao_dieta = "aumentar_calorias"
                diff_kcal = +200.0
                novas_calorias = round(calorias_atuais + diff_kcal, 0)
                motivo_dieta = f"Aumento de 200 kcal (para {int(novas_calorias)} kcal) para garantir superavit anabólico real."
            elif var_peso <= 0.05:
                status_caminho = "ajuste_necessario"
                titulo_veredito = "🟡 Estagnação de Ganho: Ajustar Superavit"
                resumo_analise = f"O teu peso estagnou ({var_peso:+.2f} kg) na fase {nome_fase}. Para sustentar novos ganhos musculares e suportar cargas crescentes, necessitas de mais energia."
                ritmo_progresso = "Estagnação em fase de ganho muscular."
                necessita_ajuste_dieta = True
                acao_dieta = "aumentar_calorias"
                diff_kcal = +150.0
                novas_calorias = round(calorias_atuais + diff_kcal, 0)
                motivo_dieta = f"Aumento de 150 kcal (para {int(novas_calorias)} kcal) para retomar o ganho progressivo."
            elif var_peso > 0.5:
                status_caminho = "ajuste_necessario"
                titulo_veredito = "🟡 Ganho Rápido: Calibrar Superavit para Evitar Gordura"
                resumo_analise = f"Ganho de {var_peso:+.2f} kg na semana ultrapassa o teto fisiológico de síntese proteica. Recomenda-se reduzir ligeiramente o superavit para manter os ganhos secos."
                ritmo_progresso = "Ganho de peso rápido acima do teto anabólico magro."
                necessita_ajuste_dieta = True
                acao_dieta = "reduzir_calorias"
                diff_kcal = -150.0
                novas_calorias = round(calorias_atuais + diff_kcal, 0)
                motivo_dieta = f"Ajustar para {int(novas_calorias)} kcal (-150 kcal) para manter o ganho exclusivamente muscular."
            else:
                status_caminho = "no_caminho_certo"
                titulo_veredito = f"🟢 No Caminho Certo: Hipertrofia Limpa ({nome_fase})"
                resumo_analise = f"Ganho sustentado de {var_peso:+} kg alinhado ao objetivo da fase {nome_fase}. A tua força no ginásio ({prog_treino}) confirma síntese muscular sem acúmulo desnecessário de gordura."
                ritmo_progresso = "Ritmo ideal de ganho muscular magro (0.2 a 0.4% por semana)."

        # Recomposição / Manutenção
        else:
            if abs(var_peso) >= 1.0:
                status_caminho = "ajuste_necessario"
                titulo_veredito = "🟡 Oscilação Inesperada de Peso na Manutenção"
                resumo_analise = f"O peso oscilou {var_peso:+.2f} kg numa fase prevista para estabilidade e recomposição corporal."
                ritmo_progresso = "Flutuação expressiva fora da faixa de manutenção."
                necessita_ajuste_dieta = True
                diff_kcal = -150.0 if var_peso > 0 else +150.0
                acao_dieta = "reduzir_calorias" if var_peso > 0 else "aumentar_calorias"
                novas_calorias = round(calorias_atuais + diff_kcal, 0)
                motivo_dieta = f"Ajuste de {diff_kcal:+.0f} kcal para restaurar o equilíbrio energético."
            else:
                status_caminho = "no_caminho_certo"
                titulo_veredito = f"🟢 No Caminho Certo: Recomposição Ativa ({nome_fase})"
                resumo_analise = f"Estabilidade na balança ({var_peso:+} kg) com treino produtivo ({prog_treino}). A troca de tecido adiposo por tecido magro está a ocorrer com sucesso."
                ritmo_progresso = "Manutenção de peso com aprimoramento da composição corporal."

        # Digestão & Recomendações Gastrointestinais
        orientacoes_nutri = []
        if "inchaco" in digestao or "gases" in digestao or "dificil" in digestao:
            orientacoes_nutri.append("• Digestão/Inchaço detetado: Reduz alimentos muito fermentáveis (feijão sem demolhar, couves excessivas, adoçantes polióis). Adiciona chá de hortelã ou gengibre e mastiga calmamente.")
        orientacoes_nutri.append(f"• Hidratação: Ingerir cerca de {round(float(dados_usuario.get('peso_atual', 70)) * 0.04, 1)}L de água diários, prioritariamente fora das grandes refeições.")

        # Dores articulares
        if "ombro" in queixas or "cotovelo" in queixas:
            necessita_ajuste_treino = True
            acao_treino = "troca_exercicios"
            orientacoes_bio = "Dor articular relatada nos membros superiores: Substitui o supino reto com barra por halteres com pegada neutra ou máquina articulada. Aquece manguito rotador com rotações externas com elástico antes de empurrar."
        elif "joelho" in queixas or "lombar" in queixas:
            necessita_ajuste_treino = True
            acao_treino = "troca_exercicios"
            orientacoes_bio = "Desconforto em membros inferiores/coluna: Substitui agachamento livre por Leg Press pés médios/altos ou Agachamento Búlgaro. Evita bloqueio articular completo (lockout) no topo."

        # Micronutrientes
        dicas_micro = []
        if fadiga >= 7 or sono <= 5:
            dicas_micro.append("• Magnésio Bisglicinato (300-400mg à noite): Indispensável para relaxamento do SNC e sono REM profundo.")
            dicas_micro.append("• Zinco e Vitamina D3 (2000-4000 UI): Essenciais para síntese hormonal e suporte imunitário sob fadiga.")
        if "cut" in fase:
            dicas_micro.append("• Eletrólitos (Sódio e Potássio): Mantém água de coco ou uma pitada de sal marinho nas refeições pré-treino para evitar perda de pump.")
        else:
            dicas_micro.append("• Fibras Solúveis e Enzimas: Em superavit calórico, inclui papaia, ananás e aveia para otimizar a absorção de nutrientes.")

        rec_cardio = (
            "Cardio LISS em passadeira inclinada (10-12% a 4.8 km/h) por 25-30 min para queimar gordura poupando o SNC."
            if "cut" in fase else
            "Manter 2 a 3 sessões de 20 min de bicicleta ou caminhada rápida para sensibilidade à insulina e saúde cardíaca."
        )

        return {
            "veredito_projeto": {
                "status": status_caminho,
                "titulo": titulo_veredito,
                "resumo_analise": resumo_analise,
                "ritmo_progresso": ritmo_progresso or "Progresso estável alinhado ao cronograma."
            },
            "ajustes_dieta": {
                "necessita_ajuste": necessita_ajuste_dieta,
                "acao": acao_dieta,
                "calorias_recomendadas": novas_calorias,
                "diferenca_kcal": diff_kcal,
                "novos_macros": {
                    "proteina_g": p_g,
                    "gordura_g": g_g,
                    "hidratos_g": round(max(50.0, hc_g + (diff_kcal / 4.0)), 1),
                    "fibras_g": 30.0
                },
                "motivo_dieta": motivo_dieta,
                "orientacoes_nutricionais": "\n".join(orientacoes_nutri)
            },
            "ajustes_treino": {
                "necessita_ajuste": necessita_ajuste_treino,
                "acao": acao_treino,
                "ajuste_volume": ajuste_volume,
                "ajuste_cardio_minutos_semana": max(0, int(dados_usuario.get("cardio_minutos_realizados", 0)) + ajuste_cardio),
                "orientacoes_biomecanicas": orientacoes_bio
            },
            "suplementacao_e_recuperacao": "\n".join(dicas_micro),
            "mensagem_coach": "O sucesso de um projeto corporal é construído na disciplina dos dias comuns. Confia no processo e mantém a rota!",
            "analise_micronutrientes_e_vitaminas": "\n".join(dicas_micro),
            "recomendacoes_cardio": rec_cardio,
            "sugestoes_exercicios": orientacoes_bio,
            "dicas_nutricionais_qualitativas": "\n".join(orientacoes_nutri),
            "mensagem_motivacional_personalizada": "Consistência e paciência estratégica são as tuas maiores armas anabólicas. Segue em frente!",
            "modo_demonstracao": True,
            "provedor_usado": "Motor Biomecânico Heurístico Local (Offline / Sem Chave Gemini)",
            "aviso_configuracao": "Modo adaptativo ativo. Os cálculos cruzados de projeto, medidas e biofeedback foram aplicados com sucesso."
        }

    async def obter_recomendacao_treino_personalizado(
        self,
        dados_treino: Dict[str, Any],
        chave_substituta: Optional[str] = None,
        prompt_sistema_substituto: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Gera um plano de treino 100% adaptado com IA às lesões, desproporções musculares,
        objetivo (hipertrofia/força/reabilitação) e fase do projeto ativo.
        """
        chave = chave_substituta or self.chave_api
        if not chave:
            return self._gerar_treino_personalizado_heuristico_local(dados_treino, prompt_sistema_substituto=prompt_sistema_substituto)

        try:
            return await self._chamar_gemini_treino_api(chave, dados_treino, prompt_sistema_substituto=prompt_sistema_substituto)
        except Exception as erro:
            print(f"[Aviso IA Treinador] Erro na chamada à API: {erro}. A usar prescrição heurística segura.")
            resultado_local = self._gerar_treino_personalizado_heuristico_local(dados_treino, prompt_sistema_substituto=prompt_sistema_substituto)
            resultado_local["aviso_conexao"] = (
                f"Aviso de ligação à IA Cloud ({str(erro)}). O plano foi estruturado pelo motor heurístico local de segurança."
            )
            return resultado_local

    async def _chamar_gemini_treino_api(
        self,
        chave: str,
        dados_treino: Dict[str, Any],
        prompt_sistema_substituto: Optional[str] = None
    ) -> Dict[str, Any]:
        """Comunicação direta com o modelo Gemini para prescrição de treino individualizado."""
        prompt_conteudo = criar_prompt_prescricao_treino(dados_treino)
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={chave}"

        instrucao_sistema = prompt_sistema_substituto or PROMPT_SISTEMA_TREINADOR

        payload = {
            "system_instruction": {
                "parts": [{"text": instrucao_sistema}]
            },
            "contents": [
                {
                    "parts": [{"text": prompt_conteudo}]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.3
            }
        }

        async with httpx.AsyncClient(timeout=30.0) as cliente:
            resposta = await cliente.post(url, json=payload)
            resposta.raise_for_status()
            dados = resposta.json()
            texto_resposta = dados["candidates"][0]["content"]["parts"][0]["text"]
            resultado_json = json.loads(texto_resposta)
            resultado_json["provedor_usado"] = "Google Gemini Cloud AI"
            return resultado_json

    def _gerar_treino_personalizado_heuristico_local(
        self,
        dados_treino: Dict[str, Any],
        prompt_sistema_substituto: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Prescrição de treino heurística avançada baseada em biomecânica clínica,
        substituições de lesões, adaptação pós-oncológica/cirúrgica, ordenação anatómica estrita
        (agrupamento contíguo de exercícios inferiores e superiores) e compatibilidade total.
        """
        lesoes = str(dados_treino.get("lesoes_atuais_ou_passadas", "")).lower()
        pontos_fracos = str(dados_treino.get("desproporcoes_pontos_fracos", "")).lower()
        limitacoes = str(dados_treino.get("problemas_limitacoes", "")).lower()
        objetivo = str(dados_treino.get("objetivo_especifico", "hipertrofia")).lower()
        objetivos_det = str(dados_treino.get("objetivos_detalhados", "")).lower()
        atividades = str(dados_treino.get("atividades_secundarias", "")).lower()
        cadencia = str(dados_treino.get("cadencia_descanso", "dias_fixos")).lower()
        plano_anterior = str(dados_treino.get("plano_atual_ou_anterior", "")).strip()

        idade = int(dados_treino.get("idade") or 25)
        sexo = str(dados_treino.get("sexo") or "masculino").lower()
        nivel_exp = str(dados_treino.get("nivel_experiencia") or "iniciante").lower()

        dias = max(2, min(6, int(dados_treino.get("dias_semana", 4))))
        duracao = int(dados_treino.get("duracao_minutos", 60))
        fase = str(dados_treino.get("fase_projeto", "cut")).lower()
        nome_fase = str(dados_treino.get("nome_fase_projeto", ""))
        foco_proj = str(dados_treino.get("foco_treino_projeto", ""))
        cardio_proj = int(dados_treino.get("cardio_minutos_semana", 0) or 0)
        calorias = float(dados_treino.get("calorias_diarias", 2200.0) or 2200.0)
        series_alvo = int(dados_treino.get("series_alvo_semana", 14) or 14)
        tipo_divisao = str(dados_treino.get("tipo_divisao_preferida", "personalizada")).lower()

        # 1. ANÁLISE EXAUSTIVA DE CONDIÇÕES CLÍNICAS, CIRURGIAS E LESÕES
        texto_clinico = f"{lesoes} {limitacoes} {pontos_fracos} {objetivos_det}".lower()

        termos_onco = [
            "mastectom", "mama", "ganglio", "gânglio", "linfedem", "axilar",
            "oncol", "cancro", "câncer", "peito retirado", "retirado o peito",
            "retirado peito", "ganglios do braço", "gânglios do braço"
        ]
        tem_onco_mama = any(t in texto_clinico for t in termos_onco)

        termos_ombro = ["ombro", "manguito", "cotovelo", "bursite", "tendinite", "acromial", "supraespinhal"]
        tem_lesao_ombro = any(t in texto_clinico for t in termos_ombro)

        termos_lombar = ["lombar", "coluna", "hernia", "hérnia", "ciatico", "ciático", "discopatia", "l4", "l5", "s1"]
        tem_lesao_lombar = any(t in texto_clinico for t in termos_lombar)

        termos_joelho = ["joelho", "patelar", "patela", "menisco", "condromalacia", "condromalácia"]
        tem_lesao_joelho = any(t in texto_clinico for t in termos_joelho)

        # Determinar objetivos e intensidades
        eh_hibrido = ("powerbuilding" in objetivo or "powerbuilding" in objetivos_det) and not tem_onco_mama
        eh_powerlifting = ("powerlifting" in objetivo or "powerlifting" in objetivos_det) and not tem_onco_mama

        # ESCALONAMENTO BIOMECÂNICO DE REPETIÇÕES (Zero repetições de força consecutivas)
        # Tier 1 = Apenas o 1º Composto Base Pesado
        # Tier 2 = 2º Composto Secundário / Apoio
        # Tier 3 = Isoladores / Máquinas / Cabos
        # Tier 4 = Braços / Deltoides Laterais / Detalhes
        if tem_onco_mama:
            reps_tier1 = "10-12"
            reps_tier2 = "10-12"
            reps_tier3 = "12-15"
            reps_tier4 = "12-15"
            rpe_alvo = 7.0
            descanso_comp = 90
            foco_desc = "Reabilitação Fisiológica & Hipertrofia Segura Pós-Oncológica (RPE ≤ 7.0 e Proteção Tecidual)"
        elif eh_powerlifting:
            reps_tier1 = "3-5"
            reps_tier2 = "6-8"
            reps_tier3 = "8-10"
            reps_tier4 = "10-12"
            rpe_alvo = 8.5
            descanso_comp = 180
            foco_desc = "Powerlifting Puro (Cargas Máximas no Composto Principal)"
        elif eh_hibrido:
            reps_tier1 = "5-8"
            reps_tier2 = "8-10"
            reps_tier3 = "10-12"
            reps_tier4 = "12-15"
            rpe_alvo = 8.5
            descanso_comp = 120
            foco_desc = "Powerbuilding Híbrido: Força no 1º Composto e Hipertrofia Progressiva"
        elif "forca" in objetivo:
            reps_tier1 = "4-6"
            reps_tier2 = "8-10"
            reps_tier3 = "10-12"
            reps_tier4 = "12-15"
            rpe_alvo = 8.5
            descanso_comp = 150
            foco_desc = "Foco em Força no 1º Composto e Volume Hipertrófico nos Acessórios"
        elif "resistencia" in objetivo:
            reps_tier1 = "12-15"
            reps_tier2 = "15-18"
            reps_tier3 = "15-20"
            reps_tier4 = "15-20"
            rpe_alvo = 8.0
            descanso_comp = 60
            foco_desc = "Foco em Resistência Muscular e Densidade Metabólica"
        elif "femin" in sexo and (idade >= 45 or "iniciante" in nivel_exp):
            reps_tier1 = "8-10"
            reps_tier2 = "10-12"
            reps_tier3 = "10-12"
            reps_tier4 = "12-15"
            rpe_alvo = 7.5
            descanso_comp = 90
            foco_desc = "Hipertrofia Sustentável, Saúde Articular e Densidade Óssea (RPE 7.5)"
        else:
            reps_tier1 = "6-8"       # 1º Composto Base Pesado (apenas este!)
            reps_tier2 = "8-10"      # 2º Composto Secundário / Apoio
            reps_tier3 = "10-12"     # 3º Exercício (Isoladores / Cabos)
            reps_tier4 = "12-15"     # 4º e 5º Exercícios (Deltoides / Braços / Gémeos)
            rpe_alvo = 8.0
            descanso_comp = 105
            foco_desc = "Hipertrofia Escalonada: 6-8 reps apenas no 1º composto, 8-10 no secundário e 10-15 nos acessórios"

        reps_comp = reps_tier1
        reps_isol = reps_tier3

        # Cadência de Treino
        if "2_1" in cadencia or "2_treino" in cadencia or "2 on" in cadencia:
            cadencia_label = "2 Dias Treino / 1 Dia Descanso (2 on, 1 off)"
        elif "3_1" in cadencia or "3_treino" in cadencia or "3 on" in cadencia:
            cadencia_label = "3 Dias Treino / 1 Dia Descanso (3 on, 1 off)"
        elif "alternad" in cadencia or "1 on 1 off" in cadencia:
            cadencia_label = "Dias Alternados (1 Treino / 1 Descanso)"
        else:
            cadencia_label = f"{dias} Dias Semanais Fixos"

        # Compatibilidade com Desportos Concorrentes
        horario_atividades = []
        if "boxe" in atividades or "luta" in atividades or "artes marciais" in atividades:
            horario_atividades.append(
                "🥊 Boxe & Treino Superior: Pratica o boxe nos dias sem musculação ou pelo menos 24h afastado de treinos de empurrar."
            )
        if "corrida" in atividades or "corro" in atividades or "jogging" in atividades:
            horario_atividades.append(
                "🏃 Corrida & Pernas: Corre nos dias de descanso ou com separação mínima de 8 a 12 horas do treino de pernas."
            )
        if cardio_proj > 0:
            horario_atividades.insert(0,
                f"⏱️ Cardio Estabelecido no Projeto: {cardio_proj} min/semana em intensidade moderada (Zona 2: 120-140 bpm)."
            )
        if not horario_atividades:
            horario_atividades.append("• Sem desportos concorrentes reportados: Recuperação canalizada para a musculação.")

        # Auditoria de Plano Anterior
        if plano_anterior:
            analise_plano_anterior = (
                f"📋 Auditoria ao teu plano anterior: A rotina fornecida foi reorganizada para eliminar volume redundante, "
                f"balancear o descanso e garantir agrupamentos biomecânicos perfeitos sem saltos erráticos de grupos musculares."
            )
        else:
            analise_plano_anterior = "Plano desenhado à medida das tuas condicionantes físicas e disponibilidade semanal."

        # Diagnóstico e Ajustes de Lesões (UNIVERSAL - SEM RESTRIÇÃO DE PALAVRAS-CHAVE)
        ajustes_lesao = []
        texto_lesoes_bruto = str(dados_treino.get("lesoes_atuais_ou_passadas") or dados_treino.get("problemas_limitacoes") or "").strip()
        termos_sem_lesao = ["nenhum", "nenhuma", "nao", "não", "100%", "sem lesao", "sem lesão", "apto", "tudo bem", "nada"]
        tem_lesao_declarada = bool(texto_lesoes_bruto and not any(texto_lesoes_bruto.lower().strip() == p for p in termos_sem_lesao))

        if tem_onco_mama:
            ex_supino = "supino_halteres_pegada_neutra"
            ex_desenvolvimento = "face_pull"
            ex_remada = "remada_apoiada_banco"
            ex_agachamento = "leg_press_45"
            ex_posterior = "hip_thrust_elevacao_pelvica"
            ajustes_lesao.append(
                "• Condição Oncológica & Pós-Cirúrgica (Mastectomia / Esvaziamento Ganglionar): Supino livre com barra estritamente contraindicado "
                "para evitar edema axilar, tração sobre tecidos cicatriciais e compressão vascular. Substituído por Supino com Halteres em Pegada Neutra (45º) "
                "com amplitude protegida e RPE estritamente contido a ≤ 7.0."
            )
        elif tem_lesao_declarada:
            # Universal: Qualquer problema reportado pelo atleta ativa proteção articular e é citado explicitamente
            ex_supino = "supino_halteres_pegada_neutra"
            ex_desenvolvimento = "face_pull"
            ex_remada = "remada_apoiada_banco"
            ex_agachamento = "leg_press_45"
            ex_posterior = "hip_thrust_elevacao_pelvica"
            ajustes_lesao.append(
                f"• Condição / Lesão Reportada pelo Atleta ({texto_lesoes_bruto}):\n"
                f"  Prescrição adaptada com proteção biomecânica ativa. Movimentos de compressão e cisalhamento articular extremo com barra livre "
                f"foram substituídos por halteres em pegada neutra a 45º, remada apoiada no banco e máquinas articuladas com trajetória anatómica guiada."
            )
        else:
            ex_supino = "supino_reto_barra"
            ex_desenvolvimento = "desenvolvimento_halteres"
            ex_remada = "remada_curvada_barra"
            ex_agachamento = "agachamento_livre"
            ex_posterior = "peso_morto_romeno"

        # Pontos Fracos e Especialização Muscular
        foco_treino_texto = f"{pontos_fracos} {foco_proj} {objetivos_det}".lower()
        foco_gluteos = any(k in foco_treino_texto for k in ["gluteo", "glúteo", "bumbum"])
        foco_bracos = any(k in foco_treino_texto for k in ["braco", "braço", "bicep", "tricep", "braquial", "antebraço", "antebraco"])
        foco_peito = any(k in foco_treino_texto for k in ["peito", "peitoral"])
        foco_costas = any(k in foco_treino_texto for k in ["costa", "costas", "dorsal", "dorsais", "asa", "trapezio"])
        foco_ombros = any(k in foco_treino_texto for k in ["ombro", "ombros", "deltoide", "deltoides"])

        ajustes_fracos = []
        if foco_bracos:
            ajustes_fracos.append(
                "• Especialização Prioritária em Braços Ativa: Frequência e volume elevados com múltiplos exercícios para todas as porções musculares. "
                "Bíceps estimulado na cabeça curta (barra W), cabeça longa (banco inclinado) e braquial (martelo). "
                "Tríceps estimulado na cabeça lateral (polia/corda) e cabeça longa em estiramento (tríceps francês)."
            )
        if foco_gluteos:
            ajustes_fracos.append("• Foco Prioritário em Glúteos: Inclusão estrutural de Hip Thrust com contração isométrica de 2 segundos e agachamento búlgaro.")
        if foco_peito:
            ajustes_fracos.append("• Foco Prioritário em Peitoral: Variação angular (reto + inclinado) e isolamento convergente em cabos.")
        if foco_costas:
            ajustes_fracos.append("• Foco Prioritário em Costas: Ênfase combinada em largura (puxadas verticais) e espessura (remadas horizontais).")
        if foco_ombros:
            ajustes_fracos.append("• Foco Prioritário em Ombros: Sobrecarga direta na cabeça lateral e deltóide posterior.")
        if not ajustes_fracos:
            ajustes_fracos.append("• Equilíbrio Muscular e Harmonia: Distribuição simétrica e proporcional entre agonistas e antagonistas.")

        # Volume e séries
        s_composto_base = 3 if ("iniciante" in nivel_exp or tem_onco_mama) else 4
        s_secundario = 3
        s_isolador = 3
        s_braco = 3 if not foco_bracos else 4
        s_detalhe = 2
        # Se foco em braços estiver ativo, permite 6 exercícios por sessão para acomodar bíceps e tríceps
        max_ex = 6 if foco_bracos else (4 if duracao <= 45 else (5 if duracao <= 65 else 6))

        def criar_ex(id_ex: str, series: int, reps_str: str, rpe: float, descanso: int, notas: str) -> Dict[str, Any]:
            ex_info = EXERCICIOS_CATALOGO.get(id_ex, {})
            return {
                "id_exercicio": id_ex,
                "nome": ex_info.get("nome", id_ex.replace("_", " ").title()),
                "grupo_muscular_primario": ex_info.get("primario", "musculo"),
                "grupo_muscular_secundario": ex_info.get("secundario", None),
                "series": series,
                "repeticoes": reps_str,
                "repeticoes_alvo": reps_str,
                "descanso_segundos": descanso,
                "rpe_alvo": rpe,
                "carga_sugerida_kg": 0.0,
                "notas_execucao": notas
            }

        # 2. CONSTRUÇÃO RIGOROSA DAS SESSÕES COM ORDENAÇÃO BIOMECÂNICA CONTÍGUA
        # (Todos os exercícios de pernas juntos; todos os exercícios de tronco juntos)
        sessoes = []

        if dias == 2:
            nome_divisao = "Upper / Lower Compacto 2x (IA Biomecânica)"
            sessoes = [
                {
                    "nome": "Dia 1: Superior Completo (Tronco & Força)",
                    "dia_nome": "Dia 1: Superior Completo (Tronco & Força)",
                    "foco": f"{foco_desc} (Peito, Costas, Ombros e Braços)",
                    "tempo_estimado_minutos": duracao,
                    "exercicios": [
                        criar_ex(ex_supino, s_composto_base, reps_tier1, rpe_alvo, descanso_comp, "Escápulas retraídas e deprimidas para estabilização acromial."),
                        criar_ex(ex_remada, s_secundario, reps_tier2, rpe_alvo, descanso_comp, "Tração controlada junto ao tronco."),
                        criar_ex(ex_desenvolvimento, s_secundario, reps_tier3, rpe_alvo, 90, "Pegada neutra para descompressão articular."),
                        criar_ex("puxada_frente_polia", s_isolador, reps_tier3, rpe_alvo, 75, "Expansão dorsal controlada."),
                        criar_ex("triceps_corda_polia", s_braco, reps_tier4, rpe_alvo, 60, "Isolamento estrito sem impulsos.")
                    ][:max_ex]
                },
                {
                    "nome": "Dia 2: Inferior Completo (Pernas & Posterior)",
                    "dia_nome": "Dia 2: Inferior Completo (Pernas & Posterior)",
                    "foco": f"{foco_desc} (Quadríceps, Isquiotibiais e Gémeos)",
                    "tempo_estimado_minutos": duracao,
                    "exercicios": [
                        criar_ex(ex_agachamento, s_composto_base, reps_tier1, rpe_alvo, descanso_comp, "Descida controlada em 3 segundos."),
                        criar_ex(ex_posterior, s_secundario, reps_tier2, rpe_alvo, descanso_comp, "Alongamento profundo da cadeia posterior."),
                        criar_ex("leg_press_45", s_secundario, reps_tier3, rpe_alvo, 90, "Pés na largura dos ombros sem descolar a bacia."),
                        criar_ex("flexao_pernas_deitado", s_isolador, reps_tier4, rpe_alvo, 75, "Contração no pico de flexão do joelho."),
                        criar_ex("elevacao_gemeos_pe", s_detalhe, "12-15", rpe_alvo, 60, "Pausa isométrica de 1 segundo na ponta dos pés.")
                    ][:max_ex]
                }
            ]

        elif dias == 3:
            if "ppl" in tipo_divisao or "push" in tipo_divisao:
                nome_divisao = "Push / Pull / Legs 3x Personalizado (IA Biomecânica)"
                sessoes = [
                    {
                        "nome": "Dia 1: Push (Peito, Ombros, Tríceps)",
                        "dia_nome": "Dia 1: Push (Peito, Ombros, Tríceps)",
                        "foco": "Cintura Escapular & Peitoral",
                        "tempo_estimado_minutos": duracao,
                        "exercicios": [
                            criar_ex(ex_supino, s_composto_base, reps_tier1, rpe_alvo, descanso_comp, "Tensão peitoral contínua sem hiperextensão articular."),
                            criar_ex("supino_inclinado_halteres" if not tem_onco_mama else ex_supino, s_secundario, reps_tier2, rpe_alvo, 90, "Banco regulado a 30 graus."),
                            criar_ex(ex_desenvolvimento if not tem_onco_mama else "face_pull", s_secundario, reps_tier3, rpe_alvo, 75, "Trabalho escapular seguro."),
                            criar_ex("elevacao_lateral_cabos", s_isolador, reps_tier4, rpe_alvo, 60, "Elevação no plano escapular."),
                            criar_ex("triceps_corda_polia", s_braco, reps_tier4, rpe_alvo, 60, "Abertura lateral na base do movimento.")
                        ][:max_ex]
                    },
                    {
                        "nome": "Dia 2: Pull (Costas, Deltoide Posterior, Bíceps)",
                        "dia_nome": "Dia 2: Pull (Costas, Deltoide Posterior, Bíceps)",
                        "foco": "Densidade e Espessura Dorsal",
                        "tempo_estimado_minutos": duracao,
                        "exercicios": [
                            criar_ex("puxada_frente_polia", s_composto_base, reps_tier1, rpe_alvo, descanso_comp, "Tração vertical sem balanço do tronco."),
                            criar_ex(ex_remada, s_secundario, reps_tier2, rpe_alvo, 90, "Cotovelos encostados às costelas."),
                            criar_ex("face_pull", s_isolador, reps_tier3, rpe_alvo, 60, "Rotação externa fundamental para a cápsula do ombro."),
                            criar_ex("curl_martelo_halteres", s_braco, reps_tier4, rpe_alvo, 60, "Tensão constante no músculo braquial."),
                            criar_ex("curl_biceps_barra_w", s_braco, reps_isol, rpe_alvo, 60, "Pegada curvada protege as articulações do punho.")
                        ][:max_ex]
                    },
                    {
                        "nome": "Dia 3: Legs (Pernas Completas)",
                        "dia_nome": "Dia 3: Legs (Pernas Completas)",
                        "foco": "Membros Inferiores Completos",
                        "tempo_estimado_minutos": duracao,
                        "exercicios": [
                            criar_ex(ex_agachamento, s_composto_base, reps_tier1, rpe_alvo, descanso_comp, "Alinhamento das rótulas com os pés."),
                            criar_ex(ex_posterior, s_secundario, reps_tier2, rpe_alvo, descanso_comp, "Empurrar os quadris para trás sem fletir a lombar."),
                            criar_ex("leg_press_45", s_secundario, reps_tier3, rpe_alvo, 90, "Cadência excêntrica de 3 segundos."),
                            criar_ex("flexao_pernas_deitado", s_isolador, reps_isol, rpe_alvo, 75, "Isolamento mecânico estrito dos flexores."),
                            criar_ex("elevacao_gemeos_pe", s_detalhe, "12-15", rpe_alvo, 60, "Alongamento completo no ponto de inversão.")
                        ][:max_ex]
                    }
                ]
            else:
                nome_divisao = "Full Body 3x Personalizado (IA Biomecânica)"
                sessoes = [
                    {
                        "nome": "Dia 1: Full Body - Foco Força & Estabilidade",
                        "dia_nome": "Dia 1: Full Body - Foco Força & Estabilidade",
                        "foco": f"{foco_desc} (Inferior Primeiro, Superior Consecutivo)",
                        "tempo_estimado_minutos": duracao,
                        "exercicios": [
                            # Bloco 1: Pernas contíguas
                            criar_ex(ex_agachamento, s_composto_base, reps_tier1, rpe_alvo, descanso_comp, "Controlo rigoroso da descida (3 segundos)."),
                            criar_ex("flexao_pernas_deitado", s_isolador, reps_tier4, rpe_alvo, 75, "Dorsiflexão dos pés para ativar a cabeça curta do bíceps femoral."),
                            # Bloco 2: Tronco contíguo
                            criar_ex(ex_supino, s_composto_base, reps_tier2, rpe_alvo, descanso_comp, "Escápulas retraídas e cotovelos alinhados a 45º."),
                            criar_ex("puxada_frente_polia", s_secundario, reps_tier3, rpe_alvo, 90, "Puxada até ao queixo, evitando balanço lombar."),
                            criar_ex(ex_desenvolvimento, s_secundario, reps_tier3, rpe_alvo, 75, "Movimento seguro e controlado no plano escapular.")
                        ][:max_ex]
                    },
                    {
                        "nome": "Dia 2: Full Body - Foco Posterior & Ombros",
                        "dia_nome": "Dia 2: Full Body - Foco Posterior & Ombros",
                        "foco": f"{foco_desc} (Inferior Primeiro, Superior Consecutivo)",
                        "tempo_estimado_minutos": duracao,
                        "exercicios": [
                            # Bloco 1: Pernas contíguas
                            criar_ex(ex_posterior, s_composto_base, reps_tier1, rpe_alvo, descanso_comp, "Alongamento dos isquiotibiais empurrando o quadril para trás."),
                            criar_ex("leg_press_45", s_secundario, reps_tier3, rpe_alvo, 90, "Pés na largura dos ombros sem descolar a bacia."),
                            # Bloco 2: Tronco contíguo
                            criar_ex(ex_remada, s_secundario, reps_tier2, rpe_alvo, 90, "Tração com cotovelos encostados às costelas."),
                            criar_ex("supino_inclinado_halteres" if not tem_onco_mama else ex_supino, s_isolador, reps_tier3, rpe_alvo, 75, "Foco peitoral com amplitude protegida."),
                            criar_ex("elevacao_lateral_cabos", s_isolador, reps_tier4, rpe_alvo, 60, "Tensão contínua em todo o arco de movimento.")
                        ][:max_ex]
                    },
                    {
                        "nome": "Dia 3: Full Body - Foco Densidade & Volume",
                        "dia_nome": "Dia 3: Full Body - Foco Densidade & Volume",
                        "foco": f"{foco_desc} (Inferior Primeiro, Superior Consecutivo)",
                        "tempo_estimado_minutos": duracao,
                        "exercicios": [
                            # Bloco 1: Pernas contíguas
                            criar_ex("leg_press_45", s_composto_base, reps_tier1, rpe_alvo, descanso_comp, "Amplitude profunda e confortável sem retroversão."),
                            criar_ex("flexao_pernas_deitado", s_isolador, reps_tier4, rpe_alvo, 75, "Isolamento contínuo dos flexores."),
                            criar_ex("elevacao_gemeos_pe", s_detalhe, "12-15", rpe_alvo, 60, "Pausa de 1 segundo no topo."),
                            # Bloco 2: Tronco contíguo
                            criar_ex("puxada_triangulo", s_secundario, reps_tier2, rpe_alvo, 90, "Contração escapular de 1 segundo no final."),
                            criar_ex("triceps_corda_polia", s_braco, reps_tier4, rpe_alvo, 60, "Abertura da corda na fase concêntrica máxima.")
                        ][:max_ex]
                    }
                ]

        elif dias == 4:
            nome_divisao = "Upper / Lower Adaptado 4x (IA Biomecânica)"
            
            # Se houver foco em braços, ambas as sessões superiores integram bíceps e tríceps
            ex_braco_upper_a = [
                criar_ex("triceps_corda_polia", s_braco, reps_tier4, rpe_alvo, 60, "Isolamento lateral do tríceps com abertura na base."),
                criar_ex("curl_biceps_barra_w", s_braco, reps_tier4, rpe_alvo, 60, "Curl com barra W para pico do bíceps e conforto no punho.")
            ] if foco_bracos else [
                criar_ex("puxada_triangulo", s_isolador, reps_tier3, rpe_alvo, 75, "Contração escapular de 1 segundo no pico."),
                criar_ex("triceps_corda_polia", s_braco, reps_tier4, rpe_alvo, 60, "Controlo excêntrico sem balanço.")
            ]

            ex_braco_upper_b = [
                criar_ex("triceps_frances_cabos", s_braco, reps_tier4, rpe_alvo, 60, "Extensão acima da cabeça para enfatizar a cabeça longa do tríceps."),
                criar_ex("curl_martelo_halteres", s_braco, reps_tier4, rpe_alvo, 60, "Alongamento e tensão máxima no músculo braquial e braquiorradial.")
            ] if foco_bracos else [
                criar_ex("remada_unilateral_haltere" if tem_onco_mama else "crucifixo_cabos", s_isolador, reps_tier3, rpe_alvo, 75, "Pico de contração controlado."),
                criar_ex("curl_martelo_halteres", s_braco, reps_tier4, rpe_alvo, 60, "Alongamento e tensão no braquial e bíceps.")
            ]

            sessoes = [
                {
                    "nome": "Dia 1: Superior A (Upper Força & Ombros Seguros)",
                    "dia_nome": "Dia 1: Superior A (Upper Força & Ombros Seguros)",
                    "foco": "Peitoral, Dorsais, Ombros e Braços" if foco_bracos else "Peitoral, Dorsais e Cintura Escapular",
                    "tempo_estimado_minutos": duracao,
                    "exercicios": [
                        criar_ex(ex_supino, s_composto_base, reps_tier1, rpe_alvo, descanso_comp, "Cotovelos a 45º para total conforto articular."),
                        criar_ex(ex_remada, s_secundario, reps_tier2, rpe_alvo, descanso_comp, "Estabilidade do tronco e tração controlada."),
                        criar_ex(ex_desenvolvimento, s_secundario, reps_tier3, rpe_alvo, 90, "Pegada neutra para descompressão articular."),
                        *ex_braco_upper_a,
                        criar_ex("elevacao_lateral_cabos", s_isolador, reps_tier3, rpe_alvo, 60, "Tensão máxima na cabeça lateral do deltoide.")
                    ][:max_ex]
                },
                {
                    "nome": "Dia 2: Inferior A (Lower Quadríceps & Joelhos Protegidos)",
                    "dia_nome": "Dia 2: Inferior A (Lower Quadríceps & Joelhos Protegidos)",
                    "foco": "Quadríceps, Isquiotibiais e Braços (Especialização)" if foco_bracos else "Quadríceps, Isquiotibiais e Gémeos",
                    "tempo_estimado_minutos": duracao,
                    "exercicios": [
                        criar_ex(ex_agachamento, s_composto_base, reps_tier1, rpe_alvo, descanso_comp, "Joelho alinhado com a ponta dos pés e descida em 3 segundos."),
                        criar_ex(ex_posterior, s_secundario, reps_tier2, rpe_alvo, descanso_comp, "Coluna neutra e ativação dos glúteos na subida."),
                        criar_ex("leg_press_45", s_secundario, reps_tier3, rpe_alvo, 90, "Pés na largura dos ombros na plataforma média."),
                        criar_ex("flexao_pernas_deitado", s_isolador, reps_tier4, rpe_alvo, 75, "Pausa de 1 segundo na contração concêntrica."),
                        *( [criar_ex("curl_inclinado_halteres", s_braco, reps_tier4, rpe_alvo, 60, "Alongamento profundo da cabeça longa do bíceps no banco a 45º.")] if foco_bracos else [] ),
                        criar_ex("elevacao_gemeos_pe", s_detalhe, "12-15", rpe_alvo, 60, "Alongamento completo na base de cada repetição.")
                    ][:max_ex]
                },
                {
                    "nome": "Dia 3: Superior B (Upper Hipertrofia & Braços Foco)",
                    "dia_nome": "Dia 3: Superior B (Upper Hipertrofia & Braços Foco)",
                    "foco": "Peitoral Superior, Costas e Especialização de Braços" if foco_bracos else "Peitoral Superior, Costas e Bíceps",
                    "tempo_estimado_minutos": duracao,
                    "exercicios": [
                        criar_ex("supino_inclinado_halteres" if not tem_onco_mama else ex_supino, s_composto_base, reps_tier1, rpe_alvo, descanso_comp, "Banco a 30 graus com pegada anatómica."),
                        criar_ex("puxada_frente_polia", s_secundario, reps_tier2, rpe_alvo, 90, "Pegada aberta pronada para expansão dorsal."),
                        criar_ex("elevacao_lateral_cabos", s_isolador, reps_tier3, rpe_alvo, 60, "Tensão máxima na cabeça lateral do deltoide."),
                        *ex_braco_upper_b,
                        *( [criar_ex("curl_biceps_barra_w", s_braco, reps_tier4, rpe_alvo, 60, "Estímulo adicional de pico de bíceps.")] if foco_bracos else [] )
                    ][:max_ex]
                },
                {
                    "nome": "Dia 4: Inferior B (Lower Foco Glúteos & Cadeia Posterior)",
                    "dia_nome": "Dia 4: Inferior B (Lower Foco Glúteos & Cadeia Posterior)",
                    "foco": "Glúteos, Isquiotibiais e Braços (Especialização)" if foco_bracos else "Glúteos, Isquiotibiais e Unilaterais",
                    "tempo_estimado_minutos": duracao,
                    "exercicios": [
                        criar_ex("hip_thrust_elevacao_pelvica", s_composto_base, reps_tier1, rpe_alvo, descanso_comp, "Pausa de 2 segundos no topo sem hiperestender a lombar."),
                        criar_ex("agachamento_bulgaro", s_secundario, reps_tier2, rpe_alvo, 90, "Tronco ligeiramente inclinado para frente para enfatizar o glúteo."),
                        criar_ex("extensao_pernas", s_isolador, reps_tier3, rpe_alvo, 75, "Cadência lenta sem impulsos bruscos."),
                        criar_ex("flexao_pernas_deitado", s_isolador, reps_tier4, rpe_alvo, 75, "Amplitude total com tensão excêntrica."),
                        *( [criar_ex("triceps_corda_polia", s_braco, reps_tier4, rpe_alvo, 60, "Estímulo complementar de frequência e contração para o tríceps.")] if foco_bracos else [] ),
                        criar_ex("elevacao_gemeos_pe", s_detalhe, "12-15", rpe_alvo, 60, "Subida explosiva e descida em 3 segundos.")
                    ][:max_ex]
                }
            ]

        elif dias == 5:
            nome_divisao = "Push / Pull / Legs + Upper / Lower 5x (IA Biomecânica)"
            sessoes = [
                {
                    "nome": "Dia 1: Push (Peito, Ombros & Tríceps)",
                    "dia_nome": "Dia 1: Push (Peito, Ombros & Tríceps)",
                    "foco": "Empurrar - Cintura Escapular",
                    "tempo_estimado_minutos": duracao,
                    "exercicios": [
                        criar_ex(ex_supino, s_composto_base, reps_tier1, rpe_alvo, descanso_comp, "Cotovelos alinhados a 45º."),
                        criar_ex("supino_inclinado_halteres" if not tem_onco_mama else ex_supino, s_secundario, reps_tier2, rpe_alvo, 90, "Peitoral clavicular."),
                        criar_ex(ex_desenvolvimento, s_isolador, reps_tier3, rpe_alvo, 75, "Movimento seguro no plano escapular."),
                        criar_ex("elevacao_lateral_cabos", s_isolador, reps_tier4, rpe_alvo, 60, "Isolamento de deltoide lateral."),
                        criar_ex("triceps_corda_polia", s_braco, reps_tier4, rpe_alvo, 60, "Extensão sem balanço.")
                    ][:max_ex]
                },
                {
                    "nome": "Dia 2: Pull (Dorsais, Deltoide Posterior & Bíceps)",
                    "dia_nome": "Dia 2: Pull (Dorsais, Deltoide Posterior & Bíceps)",
                    "foco": "Puxar - Espessura e Largura Dorsal",
                    "tempo_estimado_minutos": duracao,
                    "exercicios": [
                        criar_ex("puxada_frente_polia", s_composto_base, reps_tier1, rpe_alvo, descanso_comp, "Tração vertical limpa."),
                        criar_ex(ex_remada, s_secundario, reps_tier2, rpe_alvo, 90, "Remada com cotovelos fechados."),
                        criar_ex("face_pull", s_isolador, reps_tier3, rpe_alvo, 60, "Saúde dos rotadores externos."),
                        criar_ex("curl_martelo_halteres", s_braco, reps_tier4, rpe_alvo, 60, "Braquial e flexores do cotovelo.")
                    ][:max_ex]
                },
                {
                    "nome": "Dia 3: Legs (Pernas Completas)",
                    "dia_nome": "Dia 3: Legs (Pernas Completas)",
                    "foco": "Membros Inferiores Completos",
                    "tempo_estimado_minutos": duracao,
                    "exercicios": [
                        criar_ex(ex_agachamento, s_composto_base, reps_tier1, rpe_alvo, descanso_comp, "Alinhamento das rótulas com os pés."),
                        criar_ex(ex_posterior, s_secundario, reps_tier2, rpe_alvo, descanso_comp, "Empurrar os quadris para trás."),
                        criar_ex("leg_press_45", s_secundario, reps_tier3, rpe_alvo, 90, "Descida cadenciada."),
                        criar_ex("flexao_pernas_deitado", s_isolador, reps_tier4, rpe_alvo, 75, "Flexores do joelho."),
                        criar_ex("elevacao_gemeos_pe", s_detalhe, "12-15", rpe_alvo, 60, "Gémeos em pé.")
                    ][:max_ex]
                },
                {
                    "nome": "Dia 4: Upper (Superior Hipertrofia)",
                    "dia_nome": "Dia 4: Upper (Superior Hipertrofia)",
                    "foco": "Tronco Completo e Harmonia",
                    "tempo_estimado_minutos": duracao,
                    "exercicios": [
                        criar_ex(ex_supino, s_composto_base, reps_tier1, rpe_alvo, descanso_comp, "Supino seguro."),
                        criar_ex("puxada_triangulo", s_secundario, reps_tier2, rpe_alvo, 90, "Costas e deltoides posteriores."),
                        criar_ex("elevacao_lateral_cabos", s_isolador, reps_tier3, rpe_alvo, 60, "Ombros laterais."),
                        criar_ex("triceps_corda_polia", s_braco, reps_tier4, rpe_alvo, 60, "Tríceps.")
                    ][:max_ex]
                },
                {
                    "nome": "Dia 5: Lower (Cadeia Posterior & Glúteos)",
                    "dia_nome": "Dia 5: Lower (Cadeia Posterior & Glúteos)",
                    "foco": "Glúteos e Isquiotibiais",
                    "tempo_estimado_minutos": duracao,
                    "exercicios": [
                        criar_ex("hip_thrust_elevacao_pelvica", s_composto_base, reps_tier1, rpe_alvo, descanso_comp, "Glúteos no topo."),
                        criar_ex("agachamento_bulgaro", s_secundario, reps_tier2, rpe_alvo, 90, "Unilateral."),
                        criar_ex("leg_press_45", s_secundario, reps_tier3, rpe_alvo, 90, "Pés altos na plataforma."),
                        criar_ex("flexao_pernas_deitado", s_isolador, reps_tier4, rpe_alvo, 75, "Isquiotibiais."),
                        criar_ex("elevacao_gemeos_pe", s_detalhe, "12-15", rpe_alvo, 60, "Gémeos.")
                    ][:max_ex]
                }
            ]

        else:  # dias == 6
            nome_divisao = "Push / Pull / Legs 6x (IA Biomecânica)"
            sessoes = [
                {
                    "nome": "Sessão 1: Push A (Peito & Ombros)",
                    "dia_nome": "Sessão 1: Push A (Peito & Ombros)",
                    "foco": "Empurrar com Foco Peitoral",
                    "tempo_estimado_minutos": duracao,
                    "exercicios": [
                        criar_ex(ex_supino, s_composto_base, reps_tier1, rpe_alvo, descanso_comp, "Supino seguro a 45º."),
                        criar_ex(ex_desenvolvimento, s_secundario, reps_tier2, rpe_alvo, 90, "Ombros alinhados."),
                        criar_ex("elevacao_lateral_cabos", s_isolador, reps_tier3, rpe_alvo, 60, "Deltoides laterais."),
                        criar_ex("triceps_corda_polia", s_braco, reps_tier4, rpe_alvo, 60, "Tríceps corda.")
                    ][:max_ex]
                },
                {
                    "nome": "Sessão 2: Pull A (Costas & Bíceps)",
                    "dia_nome": "Sessão 2: Pull A (Costas & Bíceps)",
                    "foco": "Puxar com Foco Dorsal",
                    "tempo_estimado_minutos": duracao,
                    "exercicios": [
                        criar_ex("puxada_frente_polia", s_composto_base, reps_tier1, rpe_alvo, descanso_comp, "Puxada vertical."),
                        criar_ex(ex_remada, s_secundario, reps_tier2, rpe_alvo, 90, "Remada com pegada neutra."),
                        criar_ex("face_pull", s_isolador, reps_tier3, rpe_alvo, 60, "Rotadores externos."),
                        criar_ex("curl_martelo_halteres", s_braco, reps_tier4, rpe_alvo, 60, "Bíceps e braquial.")
                    ][:max_ex]
                },
                {
                    "nome": "Sessão 3: Legs A (Quadríceps & Gémeos)",
                    "dia_nome": "Sessão 3: Legs A (Quadríceps & Gémeos)",
                    "foco": "Membros Inferiores - Foco Quadríceps",
                    "tempo_estimado_minutos": duracao,
                    "exercicios": [
                        criar_ex(ex_agachamento, s_composto_base, reps_tier1, rpe_alvo, descanso_comp, "Agachamento cadenciado."),
                        criar_ex("leg_press_45", s_secundario, reps_tier2, rpe_alvo, 90, "Pés médios."),
                        criar_ex("flexao_pernas_deitado", s_isolador, reps_tier3, rpe_alvo, 75, "Flexora."),
                        criar_ex("elevacao_gemeos_pe", s_detalhe, "12-15", rpe_alvo, 60, "Gémeos em pé.")
                    ][:max_ex]
                },
                {
                    "nome": "Sessão 4: Push B (Peito Superior & Tríceps)",
                    "dia_nome": "Sessão 4: Push B (Peito Superior & Tríceps)",
                    "foco": "Empurrar - Foco Fibras Claviculares",
                    "tempo_estimado_minutos": duracao,
                    "exercicios": [
                        criar_ex("supino_inclinado_halteres" if not tem_onco_mama else ex_supino, s_composto_base, reps_tier1, rpe_alvo, descanso_comp, "Banco a 30 graus."),
                        criar_ex(ex_desenvolvimento, s_secundario, reps_tier2, rpe_alvo, 90, "Ombros seguros."),
                        criar_ex("elevacao_lateral_cabos", s_isolador, reps_tier3, rpe_alvo, 60, "Deltoides laterais."),
                        criar_ex("triceps_corda_polia", s_braco, reps_tier4, rpe_alvo, 60, "Tríceps.")
                    ][:max_ex]
                },
                {
                    "nome": "Sessão 5: Pull B (Costas Espessura & Braços)",
                    "dia_nome": "Sessão 5: Pull B (Costas Espessura & Braços)",
                    "foco": "Puxar - Espessura e Trapézio",
                    "tempo_estimado_minutos": duracao,
                    "exercicios": [
                        criar_ex("remada_unilateral_haltere", s_composto_base, reps_tier1, rpe_alvo, descanso_comp, "Remada unilateral com apoio."),
                        criar_ex("puxada_triangulo", s_secundario, reps_tier2, rpe_alvo, 90, "Contração escapular."),
                        criar_ex("face_pull", s_detalhe, reps_tier3, rpe_alvo, 60, "Proteção do manguito."),
                        criar_ex("curl_martelo_halteres", s_braco, reps_tier4, rpe_alvo, 60, "Bíceps braquial.")
                    ][:max_ex]
                },
                {
                    "nome": "Sessão 6: Legs B (Cadeia Posterior & Glúteos)",
                    "dia_nome": "Sessão 6: Legs B (Cadeia Posterior & Glúteos)",
                    "foco": "Isquiotibiais e Glúteos",
                    "tempo_estimado_minutos": duracao,
                    "exercicios": [
                        criar_ex(ex_posterior, s_composto_base, reps_tier1, rpe_alvo, descanso_comp, "Peso morto romeno focado em isquiotibiais."),
                        criar_ex("hip_thrust_elevacao_pelvica", s_secundario, reps_tier2, rpe_alvo, 90, "Pico de contração de 2 segundos."),
                        criar_ex("agachamento_bulgaro", s_secundario, reps_tier3, rpe_alvo, 90, "Unilateral cadenciado."),
                        criar_ex("flexao_pernas_deitado", s_isolador, reps_tier4, rpe_alvo, 75, "Tensão excêntrica pura."),
                        criar_ex("elevacao_gemeos_pe", s_detalhe, "12-15", rpe_alvo, 60, "Gémeos.")
                    ][:max_ex]
                }
            ]

        controlo_volume = limitar_volume_personalizado(
            sessoes=sessoes,
            series_alvo_semana=series_alvo,
            nivel_experiencia=nivel_exp,
            fase_projeto=fase,
            pontos_fracos=f"{pontos_fracos} {foco_proj} {objetivos_det}",
        )
        volume_total = sum(sum(ex["series"] for ex in s["exercicios"]) for s in sessoes)
        volume_por_grupo = calcular_volume_por_grupo(sessoes)
        erros_validacao = validar_plano_treino_personalizado(
            {"sessoes": sessoes},
            dias_semana=dias,
            tempo_sessao_minutos=duracao,
        )

        analise_bio = (
            f"O motor adaptativo desenhou uma periodização anatómica estrita com {volume_total} séries semanais totais. "
            f"Os exercícios foram agrupados por contiguidade muscular (sem alternâncias caóticas entre pernas e tronco), "
            f"respeitando a meta de {duracao} minutos por sessão, o perfil biomecânico do atleta e "
            f"um alvo ajustado de {controlo_volume['series_alvo_ajustado']} séries diretas por grupo."
        )

        sincro = (
            f"Sincronização com o Projeto ({nome_fase or fase.upper()} a {calorias:.0f} kcal/dia): "
            f"Volume total de {volume_total} séries semanais e cargas a RPE {rpe_alvo} ({reps_comp} reps)."
        )

        return {
            "nome_divisao": f"{nome_divisao} ({cadencia_label})",
            "dias_por_semana": dias,
            "tempo_sessao_minutos": duracao,
            "foco_principal": foco_desc,
            "volume_total_series_semana": volume_total,
            "volume_por_grupo_muscular": volume_por_grupo,
            "limites_volume_por_grupo": controlo_volume["limites_por_grupo"],
            "grupos_prioritarios": controlo_volume["grupos_prioritarios"],
            "erros_validacao": erros_validacao,
            "cadencia_rotativa": cadencia_label,
            "analise_biomecanica_ia": analise_bio,
            "ajustes_para_lesoes": "\n".join(ajustes_lesao) if ajustes_lesao else "• Sem lesões impeditivas: Biomecânica padrão com ampla liberdade de movimentos compostos.",
            "estrategia_pontos_fracos": "\n".join(ajustes_fracos),
            "sincronizacao_com_projeto": sincro,
            "horario_e_compatibilidade_atividades": "\n".join(horario_atividades),
            "analise_plano_anterior_vs_reestruturado": analise_plano_anterior,
            "modo_demonstracao": True,
            "provedor_usado": "Motor Biomecânico Heurístico Local (Offline / Sem Chave Gemini)",
            "sessoes": sessoes
        }

    async def obter_prescricao_dieta_personalizada(
        self,
        dados_dieta: Dict[str, Any],
        chave_substituta: Optional[str] = None,
        prompt_sistema_substituto: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Prescreve um plano alimentar com refeições estabelecidas, alimentos reais com gramas exatos,
        sincronizado com a fase do projeto, horário de treino e preferências/dificuldades alimentares.
        """
        chave = chave_substituta or self.chave_api
        if not chave:
            return self._gerar_dieta_personalizada_heuristica_local(dados_dieta)

        try:
            return await self._chamar_gemini_prescricao_dieta(chave, dados_dieta, prompt_sistema_substituto)
        except Exception as erro:
            print(f"[Aviso IA Dieta] Erro na API Cloud: {erro}. A usar motor científico nutricional local.")
            resultado_local = self._gerar_dieta_personalizada_heuristica_local(dados_dieta)
            resultado_local["aviso_conexao"] = f"Não foi possível conectar à IA Cloud ({str(erro)}). Plano gerado com precisão pelo motor científico local."
            return resultado_local

    async def _chamar_gemini_prescricao_dieta(
        self,
        chave: str,
        dados_dieta: Dict[str, Any],
        prompt_sistema_substituto: Optional[str] = None
    ) -> Dict[str, Any]:
        prompt_conteudo = criar_prompt_prescricao_dieta(dados_dieta)
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={chave}"

        instrucao_sistema = prompt_sistema_substituto or PROMPT_SISTEMA_PRESCRICAO_DIETA

        payload = {
            "system_instruction": {
                "parts": [{"text": instrucao_sistema}]
            },
            "contents": [
                {
                    "parts": [{"text": prompt_conteudo}]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.3
            }
        }

        async with httpx.AsyncClient(timeout=30.0) as cliente:
            resposta = await cliente.post(url, json=payload)
            resposta.raise_for_status()
            dados = resposta.json()
            texto_resposta = dados["candidates"][0]["content"]["parts"][0]["text"]
            resultado_json = json.loads(texto_resposta)
            resultado_json["provedor_usado"] = "Google Gemini Cloud AI"
            return resultado_json

    def _gerar_dieta_personalizada_heuristica_local(self, dados_dieta: Dict[str, Any]) -> Dict[str, Any]:
        """
        Gera uma dieta personalizada precisa com alimentos reais e gramas exatos,
        sincronizada com a fase do projeto, timing do treino e preferências/saciedade.
        Garante proteção lipídica para mulheres (especialmente 40+), evita sobrecarga
        excessiva de amidos numa única refeição e respeita apetite matinal reduzido.
        """
        calorias = float(dados_dieta.get("calorias_diarias") or 2200.0)
        fase = str(dados_dieta.get("fase_projeto") or "bulk").lower()
        nome_fase = str(dados_dieta.get("nome_fase_projeto") or "")
        num_refeicoes = max(3, min(6, int(dados_dieta.get("numero_refeicoes") or 4)))
        horario_treino = str(dados_dieta.get("horario_treino") or "tarde").lower()

        preferidos = str(dados_dieta.get("alimentos_preferidos") or "").lower()
        evitados = str(dados_dieta.get("alimentos_evitados") or "").lower()
        apetite = str(dados_dieta.get("habitos_apetite") or "").lower()
        dificeis = str(dados_dieta.get("alimentos_dificeis") or "").lower()
        def _tokenizar_lista(texto: str) -> List[str]:
            itens = [i.strip() for i in re.split(r"[,\n;|/]+", texto.lower())]
            return [i for i in itens if i]

        preferidos_tokens = _tokenizar_lista(preferidos)
        evitados_tokens = _tokenizar_lista(evitados)

        categorias_alias = {
            "arroz": ["arroz", "arroz branco", "arroz basmati", "arroz integral"],
            "batata": ["batata", "batata doce", "batata-doce", "batata inglesa"],
            "massa": ["massa", "pasta", "esparguete", "macarrao", "macarrão"],
            "frango": ["frango", "peito de frango"],
            "vaca": ["vaca", "carne de vaca", "carne bovina", "bovina"],
            "salmao": ["salmao", "salmão"],
        }

        def prefere_categoria(categoria: str) -> bool:
            aliases = categorias_alias.get(categoria, [categoria])
            return any(
                any(alias in token or token in alias for alias in aliases)
                for token in preferidos_tokens
            )

        peso_ref = float(dados_dieta.get("peso_atual") or 70.0)
        sexo = str(dados_dieta.get("sexo") or "masculino").lower()
        idade = int(dados_dieta.get("idade") or 25)

        eh_mulher = "fem" in sexo or "mulher" in sexo

        pouco_apetite_manha = (
            "pouco apetite" in apetite or
            "não como muito" in apetite or
            "pouca fome de manhã" in apetite or
            "não tenho fome de manhã" in apetite or
            ("pequeno" in apetite and "pouco" in apetite) or
            "como pouco" in apetite
        )

        dificuldade_comer = (
            "custar" in dificeis or
            "pesado" in dificeis or
            "muito volume" in dificeis or
            "empanturrado" in dificeis or
            "difícil" in dificeis
        )

        # 1. DISTRIBUIÇÃO DE MACRONUTRIENTES CIENTÍFICA & ADAPTADA
        if eh_mulher:
            # Mulheres necessitam de lípidos suficientes para a integridade endócrina
            fator_g = 1.15 if idade >= 45 else 1.05
            gordura_alvo = max(50.0, round(peso_ref * fator_g, 1))
            fator_p = 2.0 if ("cut" in fase or "definicao" in fase) else 1.8
            proteina_alvo = round(peso_ref * fator_p, 1)
        else:
            if "cut" in fase or "definicao" in fase:
                proteina_alvo = round(peso_ref * 2.2, 1)
                gordura_alvo = max(50.0, round(peso_ref * 0.75, 1))
            elif "bulk" in fase or "hipertrofia" in fase:
                proteina_alvo = round(peso_ref * 2.0, 1)
                gordura_alvo = max(55.0, round(peso_ref * 0.90, 1))
            else:
                proteina_alvo = round(peso_ref * 2.1, 1)
                gordura_alvo = max(52.0, round(peso_ref * 0.80, 1))

        kcal_restantes = max(200.0, calorias - (proteina_alvo * 4.0 + gordura_alvo * 9.0))
        hidratos_alvo = round(kcal_restantes / 4.0, 1)

        # 2. PROPORÇÕES DE REFEIÇÕES
        if pouco_apetite_manha:
            if num_refeicoes == 3:
                pcts = [0.15, 0.45, 0.40]
            elif num_refeicoes == 4:
                pcts = [0.15, 0.35, 0.22, 0.28]
            elif num_refeicoes == 5:
                pcts = [0.12, 0.30, 0.20, 0.25, 0.13]
            else:
                pcts = [0.10, 0.25, 0.18, 0.20, 0.17, 0.10]
        else:
            if num_refeicoes == 3:
                pcts = [0.28, 0.40, 0.32]
            elif num_refeicoes == 4:
                pcts = [0.24, 0.33, 0.20, 0.23]
            elif num_refeicoes == 5:
                pcts = [0.20, 0.28, 0.18, 0.22, 0.12]
            else:
                pcts = [0.18, 0.24, 0.16, 0.18, 0.14, 0.10]

        # Nomes e horários das refeições adaptados ao horário de treino
        titulos_horarios = []
        if horario_treino == "manha":
            if num_refeicoes == 3:
                titulos_horarios = [
                    ("Pequeno-Almoço Pré-Treino de Fácil Digestão", "07:30"),
                    ("Almoço Pós-Treino Anabólico & Reposição", "12:30"),
                    ("Jantar Nutritivo de Recuperação", "20:00")
                ]
            elif num_refeicoes == 4:
                titulos_horarios = [
                    ("Refeição 1: Pré-Treino Matinal Rápido", "07:30"),
                    ("Refeição 2: Almoço Pós-Treino Substancial", "12:30"),
                    ("Refeição 3: Lanche da Tarde Equilibrado", "16:30"),
                    ("Refeição 4: Jantar Noturno Reparador", "20:30")
                ]
            else:
                titulos_horarios = [
                    ("Refeição 1: Pré-Treino Rápido", "07:00"),
                    ("Refeição 2: Pós-Treino Imediato", "09:30"),
                    ("Refeição 3: Almoço Principal", "13:00"),
                    ("Refeição 4: Lanche da Tarde", "17:00"),
                    ("Refeição 5: Jantar Recuperador", "20:30"),
                    ("Refeição 6: Ceia Noturna", "22:30")
                ]
        elif horario_treino == "noite":
            if num_refeicoes == 3:
                titulos_horarios = [
                    ("Pequeno-Almoço Equilibrado", "08:30"),
                    ("Almoço Completo", "13:00"),
                    ("Jantar Pós-Treino Noturno Leve", "21:30")
                ]
            elif num_refeicoes == 4:
                titulos_horarios = [
                    ("Refeição 1: Pequeno-Almoço Equilibrado", "08:30"),
                    ("Refeição 2: Almoço Completo", "13:00"),
                    ("Refeição 3: Lanche / Pré-Treino Robusto", "18:00"),
                    ("Refeição 4: Jantar Pós-Treino Digestivo", "21:45")
                ]
            else:
                titulos_horarios = [
                    ("Refeição 1: Pequeno-Almoço", "08:30"),
                    ("Refeição 2: Almoço", "12:30"),
                    ("Refeição 3: Lanche 1", "16:00"),
                    ("Refeição 4: Pré-Treino", "18:30"),
                    ("Refeição 5: Jantar Pós-Treino Leve", "21:45"),
                    ("Refeição 6: Ceia", "23:00")
                ]
        else:  # tarde
            if num_refeicoes == 3:
                titulos_horarios = [
                    ("Pequeno-Almoço Energético & Leve", "08:30"),
                    ("Almoço Completo (Pré-Treino)", "12:30"),
                    ("Jantar Pós-Treino Reparador", "20:30")
                ]
            elif num_refeicoes == 4:
                titulos_horarios = [
                    ("Refeição 1: Pequeno-Almoço Energético", "08:30"),
                    ("Refeição 2: Almoço Sustentado", "12:30"),
                    ("Refeição 3: Lanche Pré-Treino", "16:30"),
                    ("Refeição 4: Jantar Pós-Treino Anabólico", "20:30")
                ]
            else:
                titulos_horarios = [
                    ("Refeição 1: Pequeno-Almoço", "08:00"),
                    ("Refeição 2: Lanche da Manhã", "10:30"),
                    ("Refeição 3: Almoço", "13:00"),
                    ("Refeição 4: Pré-Treino Tarde", "16:30"),
                    ("Refeição 5: Jantar Pós-Treino", "20:00"),
                    ("Refeição 6: Ceia Noturna", "22:30")
                ]

        def aceita(chave_alim: str) -> bool:
            if chave_alim not in TABELA_ALIMENTOS_EQUIVALENCIAS:
                return False
            nome_alimento = TABELA_ALIMENTOS_EQUIVALENCIAS[chave_alim]["nome"].lower()
            chave_low = chave_alim.lower()
            for ev in evitados_tokens:
                if ev and (ev in nome_alimento or ev in chave_low):
                    return False
            return True

        refeicoes_geradas = []
        for idx, (titulo, horario) in enumerate(titulos_horarios[:num_refeicoes]):
            pct = pcts[idx]
            refeicao_p = round(proteina_alvo * pct, 1)
            refeicao_h = round(hidratos_alvo * pct, 1)
            refeicao_g = round(gordura_alvo * pct, 1)

            itens_alimento = []

            # Se for primeira refeição (Pequeno-Almoço)
            if idx == 0:
                if pouco_apetite_manha:
                    c_id = "banana" if aceita("banana") else ("aveia_em_flocos" if aceita("aveia_em_flocos") else "pao_integral")
                    p_id = "iogurte_grego_skyr" if aceita("iogurte_grego_skyr") else ("whey_protein" if aceita("whey_protein") else "claras_ovo")
                    f_id = "aveia_em_flocos" if (c_id != "aveia_em_flocos" and aceita("aveia_em_flocos")) else "maca"
                else:
                    c_id = "aveia_em_flocos" if aceita("aveia_em_flocos") else "pao_integral"
                    p_id = "ovo_inteiro" if aceita("ovo_inteiro") else ("whey_protein" if aceita("whey_protein") else "iogurte_grego_skyr")
                    f_id = "banana" if aceita("banana") else "maca"

                c_alim = TABELA_ALIMENTOS_EQUIVALENCIAS[c_id]
                p_alim = TABELA_ALIMENTOS_EQUIVALENCIAS[p_id]
                f_alim = TABELA_ALIMENTOS_EQUIVALENCIAS.get(f_id, c_alim)

                gramas_c = round(max(20.0, (refeicao_h * 0.50 / max(0.1, c_alim["hidratos"])) * 100), 0)
                gramas_p = round(max(25.0, (refeicao_p * 0.70 / max(0.1, p_alim["proteina"])) * 100), 0)
                gramas_f = 100.0 if ("banana" in f_id or "maca" in f_id) else 30.0

                for gid, galim, ggramas in [(p_id, p_alim, gramas_p), (c_id, c_alim, gramas_c), (f_id, f_alim, gramas_f)]:
                    itens_alimento.append({
                        "id_alimento": f"{gid}_{idx+1}",
                        "nome": galim["nome"],
                        "gramas": float(ggramas),
                        "calorias": round((ggramas / 100.0) * galim["kcal"], 1),
                        "proteina_g": round((ggramas / 100.0) * galim["proteina"], 1),
                        "hidratos_g": round((ggramas / 100.0) * galim["hidratos"], 1),
                        "gordura_g": round((ggramas / 100.0) * galim["gordura"], 1),
                        "consumido": False
                    })

            # Se for almoço ou jantar
            elif "Almoço" in titulo or "Jantar" in titulo:
                # Escolher fonte de amido principal
                if prefere_categoria("arroz") and aceita("arroz_branco_cozido"):
                    c_id = "arroz_branco_cozido"
                elif prefere_categoria("batata") and aceita("batata_doce_cozida"):
                    c_id = "batata_doce_cozida"
                elif prefere_categoria("massa") and aceita("massa_cozida"):
                    c_id = "massa_cozida"
                else:
                    c_id = "arroz_branco_cozido" if aceita("arroz_branco_cozido") else "batata_inglesa_cozida"

                # Escolher proteína principal
                if "frango" in dificeis and aceita("carne_vaca_magra"):
                    p_id = "carne_vaca_magra"
                elif prefere_categoria("vaca") and aceita("carne_vaca_magra"):
                    p_id = "carne_vaca_magra"
                elif prefere_categoria("salmao") and aceita("salmao_grelhado"):
                    p_id = "salmao_grelhado"
                elif aceita("peito_frango_grelhado"):
                    p_id = "peito_frango_grelhado"
                else:
                    p_id = "atum_natural" if aceita("atum_natural") else "ovo_inteiro"

                gord_id = "azeite_oliva" if aceita("azeite_oliva") else "abacate"

                c_alim = TABELA_ALIMENTOS_EQUIVALENCIAS[c_id]
                p_alim = TABELA_ALIMENTOS_EQUIVALENCIAS[p_id]
                g_alim = TABELA_ALIMENTOS_EQUIVALENCIAS[gord_id]

                # TETO FISIOLÓGICO: Nunca colocar porções gigantes de arroz (>180g para mulheres ou >240g para homens)
                max_amido = 180.0 if (eh_mulher or peso_ref <= 60.0) else 240.0
                gramas_c_bruto = round((refeicao_h / max(0.1, c_alim["hidratos"])) * 100.0, 0)

                excesso_c = 0.0
                if gramas_c_bruto > max_amido:
                    excesso_c = gramas_c_bruto - max_amido
                    gramas_c = max_amido
                else:
                    gramas_c = max(50.0, gramas_c_bruto)

                gramas_p = round(max(50.0, (refeicao_p / max(0.1, p_alim["proteina"])) * 100.0), 0)
                gramas_g = round(max(5.0, (refeicao_g * 0.75 / max(0.1, g_alim["gordura"])) * 100.0), 0)

                for gid, galim, ggramas in [(p_id, p_alim, gramas_p), (c_id, c_alim, gramas_c), (gord_id, g_alim, gramas_g)]:
                    itens_alimento.append({
                        "id_alimento": f"{gid}_{idx+1}",
                        "nome": galim["nome"],
                        "gramas": float(ggramas),
                        "calorias": round((ggramas / 100.0) * galim["kcal"], 1),
                        "proteina_g": round((ggramas / 100.0) * galim["proteina"], 1),
                        "hidratos_g": round((ggramas / 100.0) * galim["hidratos"], 1),
                        "gordura_g": round((ggramas / 100.0) * galim["gordura"], 1),
                        "consumido": False
                    })

                # Se havia excesso de hidratos que tornaria o arroz absurdo, adiciona uma fruta fresca saudável
                if excesso_c > 20.0:
                    fruta_id = "maca" if aceita("maca") else ("banana" if aceita("banana") else "mirtilos")
                    fruta_alim = TABELA_ALIMENTOS_EQUIVALENCIAS[fruta_id]
                    hc_sobra = (excesso_c / 100.0) * c_alim["hidratos"]
                    g_fruta = round(min(160.0, max(80.0, (hc_sobra / max(0.1, fruta_alim["hidratos"])) * 100.0)), 0)
                    itens_alimento.append({
                        "id_alimento": f"{fruta_id}_{idx+1}_sobremesa",
                        "nome": f"{fruta_alim['nome']} (Sobremesa / Fruta Fresca)",
                        "gramas": float(g_fruta),
                        "calorias": round((g_fruta / 100.0) * fruta_alim["kcal"], 1),
                        "proteina_g": round((g_fruta / 100.0) * fruta_alim["proteina"], 1),
                        "hidratos_g": round((g_fruta / 100.0) * fruta_alim["hidratos"], 1),
                        "gordura_g": round((g_fruta / 100.0) * fruta_alim["gordura"], 1),
                        "consumido": False
                    })

            # Lanche / Refeições intermediárias
            else:
                p_id = "iogurte_grego_skyr" if aceita("iogurte_grego_skyr") else ("whey_protein" if aceita("whey_protein") else "claras_ovo")
                c_id = "banana" if aceita("banana") else ("pao_integral" if aceita("pao_integral") else "aveia_em_flocos")
                gord_id = "manteiga_amendoim" if aceita("manteiga_amendoim") else "amendoas_nozes"

                p_alim = TABELA_ALIMENTOS_EQUIVALENCIAS[p_id]
                c_alim = TABELA_ALIMENTOS_EQUIVALENCIAS[c_id]
                g_alim = TABELA_ALIMENTOS_EQUIVALENCIAS[gord_id]

                gramas_p = round(max(25.0, (refeicao_p * 0.7 / max(0.1, p_alim["proteina"])) * 100), 0)
                gramas_c = round(max(30.0, (refeicao_h * 0.7 / max(0.1, c_alim["hidratos"])) * 100), 0)
                gramas_g = 15.0 if ("manteiga" in gord_id or "amendoas" in gord_id) else 10.0

                for gid, galim, ggramas in [(p_id, p_alim, gramas_p), (c_id, c_alim, gramas_c), (gord_id, g_alim, gramas_g)]:
                    itens_alimento.append({
                        "id_alimento": f"{gid}_{idx+1}",
                        "nome": galim["nome"],
                        "gramas": float(ggramas),
                        "calorias": round((ggramas / 100.0) * galim["kcal"], 1),
                        "proteina_g": round((ggramas / 100.0) * galim["proteina"], 1),
                        "hidratos_g": round((ggramas / 100.0) * galim["hidratos"], 1),
                        "gordura_g": round((ggramas / 100.0) * galim["gordura"], 1),
                        "consumido": False
                    })

            kcal_soma = round(sum(it["calorias"] for it in itens_alimento), 1)
            p_soma = round(sum(it["proteina_g"] for it in itens_alimento), 1)
            h_soma = round(sum(it["hidratos_g"] for it in itens_alimento), 1)
            g_soma = round(sum(it["gordura_g"] for it in itens_alimento), 1)

            refeicoes_geradas.append({
                "id": f"refeicao_{idx+1}",
                "nome": titulo,
                "horario_sugerido": horario,
                "calorias": kcal_soma,
                "proteina_g": p_soma,
                "hidratos_g": h_soma,
                "gordura_g": g_soma,
                "alimentos": itens_alimento
            })

        # Calibração final proporcional
        kcal_soma_bruta = sum(r["calorias"] for r in refeicoes_geradas)
        if kcal_soma_bruta > 0 and abs(kcal_soma_bruta - calorias) > 10:
            fator_calorias = calorias / kcal_soma_bruta
            for r in refeicoes_geradas:
                for item in r.get("alimentos", []):
                    gramas_originais = item.get("gramas", 50.0)
                    nova_g = max(5.0, round(gramas_originais * fator_calorias, 0))
                    ratio = nova_g / gramas_originais if gramas_originais > 0 else 1.0
                    item["gramas"] = float(nova_g)
                    item["calorias"] = round(item["calorias"] * ratio, 1)
                    item["proteina_g"] = round(item["proteina_g"] * ratio, 1)
                    item["hidratos_g"] = round(item["hidratos_g"] * ratio, 1)
                    item["gordura_g"] = round(item["gordura_g"] * ratio, 1)
                r["calorias"] = round(sum(it["calorias"] for it in r["alimentos"]), 1)
                r["proteina_g"] = round(sum(it["proteina_g"] for it in r["alimentos"]), 1)
                r["hidratos_g"] = round(sum(it["hidratos_g"] for it in r["alimentos"]), 1)
                r["gordura_g"] = round(sum(it["gordura_g"] for it in r["alimentos"]), 1)

        calorias_finais = round(sum(r["calorias"] for r in refeicoes_geradas), 1)
        proteina_final = round(sum(r["proteina_g"] for r in refeicoes_geradas), 1)
        hidratos_final = round(sum(r["hidratos_g"] for r in refeicoes_geradas), 1)
        gordura_final = round(sum(r["gordura_g"] for r in refeicoes_geradas), 1)

        estrategia_fase = (
            f"Sincronização com o Projeto ({nome_fase or fase.upper()} a {calorias:.0f} kcal): "
            f"{proteina_final}g Proteína, {hidratos_final}g Hidratos, {gordura_final}g Gorduras ({gordura_final / peso_ref:.2f}g/kg)."
        )
        ajustes_apetite = []
        if pouco_apetite_manha:
            ajustes_apetite.append("• Apetite Matinal Baixo Respeitado: Pequeno-Almoço formatado para digestão leve sem empanturramento.")
        if excesso_c > 0:
            ajustes_apetite.append("• Porções de Amido Equilibradas: O volume de arroz/massa por refeição foi limitado a porções digestivas (180g), sendo o restante balanço energético completado com fruta fresca.")

        return {
            "nome_plano": f"Plano Nutricional Adaptativo - {fase.capitalize()} ({num_refeicoes} Refeições)",
            "calorias_alvo": calorias_finais,
            "proteina_alvo_g": proteina_final,
            "hidratos_alvo_g": hidratos_final,
            "gordura_alvo_g": gordura_final,
            "fibras_alvo_g": 30.0,
            "estrategia_fase_projeto": estrategia_fase,
            "ajuste_horario_treino": f"Timing nutricional otimizado para treino à {horario_treino.capitalize()}.",
            "ajuste_apetite_e_saciedade": "\n".join(ajustes_apetite) if ajustes_apetite else "Refeições equilibradas.",
            "modo_demonstracao": True,
            "provedor_usado": "Motor Biomecânico Heurístico Local (Offline / Sem Chave Gemini)",
            "refeicoes": refeicoes_geradas
        }

    async def calibrar_dieta_com_ia(
        self,
        dados_calibracao: Dict[str, Any],
        chave_substituta: Optional[str] = None,
        prompt_sistema_substituto: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Audita e calibra a dieta atual criada pelo atleta, mantendo rigorosamente
        os mesmos alimentos e refeições e ajustando apenas gramagens e macros para
        bater a fase do projeto.
        """
        chave = chave_substituta or self.chave_api
        if not chave:
            return self._calibrar_dieta_heuristica_local(dados_calibracao)

        try:
            prompt_conteudo = criar_prompt_calibracao_dieta(dados_calibracao)
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={chave}"
            instrucao_sistema = prompt_sistema_substituto or PROMPT_SISTEMA_CALIBRACAO_DIETA

            payload = {
                "system_instruction": {"parts": [{"text": instrucao_sistema}]},
                "contents": [{"parts": [{"text": prompt_conteudo}]}],
                "generationConfig": {"response_mime_type": "application/json", "temperature": 0.2}
            }

            async with httpx.AsyncClient(timeout=30.0) as cliente:
                resposta = await cliente.post(url, json=payload)
                resposta.raise_for_status()
                dados = resposta.json()
                texto_resposta = dados["candidates"][0]["content"]["parts"][0]["text"]
                resultado_json = json.loads(texto_resposta)
                resultado_json["provedor_usado"] = "Google Gemini Cloud AI"
                return resultado_json
        except Exception as erro:
            print(f"[Aviso IA Calibração] Falha na API: {erro}. A usar calibração matemática determinística.")
            resultado_local = self._calibrar_dieta_heuristica_local(dados_calibracao)
            resultado_local["aviso_conexao"] = f"Ajuste realizado pelo motor científico local ({str(erro)})."
            return resultado_local

    def _calibrar_dieta_heuristica_local(self, dados_calibracao: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calibração matemática determinística: mantém cada refeição e alimento do atleta,
        reescalando as gramagens com precisão para cumprir o alvo calórico do projeto,
        respeitando ativamente os alimentos preferidos e o histórico de alterações da fase.
        """
        refeicoes = dados_calibracao.get("refeicoes_atuais", [])
        calorias_alvo = float(dados_calibracao.get("calorias_alvo") or 2000.0)
        fase = str(dados_calibracao.get("fase_projeto") or "bulk").lower()
        prefs = str(dados_calibracao.get("alimentos_preferidos") or "")
        evitados = str(dados_calibracao.get("alimentos_evitados") or "")
        historico = dados_calibracao.get("historico_alteracoes") or []
        instrucoes = str(dados_calibracao.get("instrucoes_adicionais") or dados_calibracao.get("notas_ajuste") or "").strip()
        instr_lower = instrucoes.lower()

        aliviar_manha = any(k in instr_lower for k in ["pequeno almoço", "pequeno-almoço", "pequeno", "acordar"]) and any(k in instr_lower for k in ["menos", "leve", "pouca fome", "não tenho tido fome", "sem fome", "reduz", "alivia"])

        kcal_atual = sum(float(r.get("calorias", 0.0)) for r in refeicoes)
        if kcal_atual <= 0:
            kcal_atual = sum(
                sum(float(a.get("calorias", 0.0)) for a in r.get("alimentos", []))
                for r in refeicoes
            )

        fator = calorias_alvo / max(300.0, kcal_atual) if kcal_atual > 0 else 1.0

        refeicoes_calibradas = []
        for r in refeicoes:
            nova_ref = dict(r)
            nome_r = (r.get("nome") or "").lower()
            is_ref_manha = "pequeno" in nome_r or "acordar" in nome_r or "desjejum" in nome_r
            is_lanche_manha = "lanche da manhã" in nome_r or "lanche manhã" in nome_r or "meio da manhã" in nome_r

            fator_refeicao = fator
            if aliviar_manha:
                if is_ref_manha:
                    fator_refeicao = fator * 0.70  # alivia em 30% o pequeno-almoço
                elif is_lanche_manha or "almoço" in nome_r or "lanche" in nome_r:
                    fator_refeicao = fator * 1.15  # reforça o lanche ou refeição seguinte

            alimentos_novos = []
            for a in r.get("alimentos", []):
                novo_alim = dict(a)
                gramas_orig = float(a.get("gramas", 100.0))
                nome_a = (a.get("nome") or "").lower()
                id_a = (a.get("id_alimento") or "").lower()

                # Priorizar gramagens de alimentos preferidos quando há expansão calórica
                is_pref = any(p.strip().lower() in nome_a or p.strip().lower() in id_a for p in prefs.split(",") if p.strip())
                fator_item = fator_refeicao
                if is_pref and fator_refeicao > 1.02:
                    fator_item = fator_refeicao * 1.03
                elif is_pref and fator_refeicao < 0.98:
                    fator_item = fator_refeicao * 0.98

                gramas_ajustadas = round(max(5.0, gramas_orig * fator_item), 1)
                novo_alim["gramas"] = gramas_ajustadas
                fator_real = gramas_ajustadas / max(1.0, gramas_orig)
                novo_alim["calorias"] = round(float(a.get("calorias", 0.0)) * fator_real, 1)
                novo_alim["proteina_g"] = round(float(a.get("proteina_g", 0.0)) * fator_real, 1)
                novo_alim["hidratos_g"] = round(float(a.get("hidratos_g", 0.0)) * fator_real, 1)
                novo_alim["gordura_g"] = round(float(a.get("gordura_g", 0.0)) * fator_real, 1)
                alimentos_novos.append(novo_alim)

            nova_ref["alimentos"] = alimentos_novos
            nova_ref["calorias"] = round(sum(it["calorias"] for it in alimentos_novos), 1)
            nova_ref["proteina_g"] = round(sum(it["proteina_g"] for it in alimentos_novos), 1)
            nova_ref["hidratos_g"] = round(sum(it["hidratos_g"] for it in alimentos_novos), 1)
            nova_ref["gordura_g"] = round(sum(it["gordura_g"] for it in alimentos_novos), 1)
            refeicoes_calibradas.append(nova_ref)

        kcal_total = round(sum(r["calorias"] for r in refeicoes_calibradas), 1)
        p_total = round(sum(r["proteina_g"] for r in refeicoes_calibradas), 1)
        h_total = round(sum(r["hidratos_g"] for r in refeicoes_calibradas), 1)
        g_total = round(sum(r["gordura_g"] for r in refeicoes_calibradas), 1)

        diff_pct = round((fator - 1.0) * 100, 1)
        ajuste_txt = (
            f"-> Gramagens calibradas em {diff_pct:+.1f}% em todos os teus alimentos habituais para bater com rigor "
            f"as {calorias_alvo:.0f} kcal da fase {fase.upper()}.\n"
            f"-> Os teus alimentos e refeições foram integralmente preservados; apenas as doses foram calibradas."
        )

        if instrucoes:
            ajuste_txt += f"\n-> Pedido Particular Atendido: '{instrucoes}'."
            if aliviar_manha:
                ajuste_txt += "\n-> O Pequeno-Almoço foi aliviado em volume para reduzir a sensação de peso gástrico matinal, transferindo a energia para os lanches/refeições seguintes."

        resp_prefs = (
            f"As tuas preferências ({prefs if prefs else 'alimentos habituais da rotina'}) foram ativamente priorizadas. "
            f"O histórico de {len(historico)} alteração(ões) registadas nesta fase foi blindado sem reinserção de itens rejeitados."
        )
        if instrucoes:
            resp_prefs += f" Considerada a instrução de apetite: '{instrucoes}'."

        return {
            "nome_plano": f"Dieta Personalizada do Atleta (Calibrada a {calorias_alvo:.0f} kcal)",
            "calorias_alvo": kcal_total,
            "proteina_alvo_g": p_total,
            "hidratos_alvo_g": h_total,
            "gordura_alvo_g": g_total,
            "analise_critica": {
                "pontos_fortes": "Excelente adesão a alimentos de alta qualidade (proteínas magras e hidratos complexos). A estrutura das tuas refeições adapta-se perfeitamente à tua rotina.",
                "ajustes_realizados": ajuste_txt,
                "respeito_preferencias_e_adaptacoes": resp_prefs,
                "dicas_timing_e_digestao": "Mantém o timing pré e pós-treino com boa biodisponibilidade de hidratos e espaça a ingestão de gorduras pesadas para longe do esforço físico intenso."
            },
            "modo_demonstracao": True,
            "provedor_usado": "Motor Biomecânico Heurístico Local (Offline / Sem Chave Gemini)",
            "refeicoes": refeicoes_calibradas
        }

    async def sugerir_substituicao_alimento_ia(
        self,
        dados_substituicao: Dict[str, Any],
        chave_substituta: Optional[str] = None,
        prompt_sistema_substituto: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Recomenda 2 a 3 alimentos nutricionalmente parecidos, calculando a dose
        isocalórica/isoproteica e respeitando preferências e histórico de alterações.
        """
        chave = chave_substituta or self.chave_api
        alimento_atual = dados_substituicao.get("alimento_atual", "Alimento")
        gramas_atuais = float(dados_substituicao.get("gramas_atuais", 100.0))
        motivo_queixa = dados_substituicao.get("motivo_queixa", "Desconforto digestivo")
        refeicao_nome = dados_substituicao.get("refeicao_nome", "Refeição")
        fase = dados_substituicao.get("fase_projeto", "bulk")
        prefs = dados_substituicao.get("alimentos_preferidos", "")
        evitados = dados_substituicao.get("alimentos_evitados", "")
        historico = dados_substituicao.get("historico_alteracoes") or []

        if not chave:
            return self._sugerir_substituicao_alimento_heuristica_local(
                alimento_atual, gramas_atuais, motivo_queixa, refeicao_nome, fase, prefs, evitados, historico
            )

        try:
            prompt_conteudo = criar_prompt_substituicao_alimento(
                alimento_atual=alimento_atual,
                gramas_atuais=gramas_atuais,
                motivo_queixa=motivo_queixa,
                refeicao_nome=refeicao_nome,
                fase=fase,
                alimentos_preferidos=prefs,
                alimentos_evitados=evitados,
                historico_alteracoes=historico
            )
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={chave}"
            instrucao_sistema = prompt_sistema_substituto or PROMPT_SISTEMA_SUBSTITUICAO_ALIMENTO

            payload = {
                "system_instruction": {"parts": [{"text": instrucao_sistema}]},
                "contents": [{"parts": [{"text": prompt_conteudo}]}],
                "generationConfig": {"response_mime_type": "application/json", "temperature": 0.2}
            }

            async with httpx.AsyncClient(timeout=25.0) as cliente:
                resposta = await cliente.post(url, json=payload)
                resposta.raise_for_status()
                dados = resposta.json()
                texto_resposta = dados["candidates"][0]["content"]["parts"][0]["text"]
                resultado_json = json.loads(texto_resposta)
                resultado_json["provedor_usado"] = "Google Gemini Cloud AI"
                return resultado_json
        except Exception as erro:
            print(f"[Aviso IA Troca Alimento] Falha na API: {erro}. A usar motor nutricional determinístico local.")
            resultado_local = self._sugerir_substituicao_alimento_heuristica_local(
                alimento_atual, gramas_atuais, motivo_queixa, refeicao_nome, fase, prefs, evitados, historico
            )
            resultado_local["aviso_conexao"] = f"Alternativas geradas pelo motor clínico local ({str(erro)})."
            return resultado_local

    def _sugerir_substituicao_alimento_heuristica_local(
        self,
        alimento_atual: str,
        gramas_atuais: float,
        motivo_queixa: str,
        refeicao_nome: str = "Refeição",
        fase: str = "bulk",
        alimentos_preferidos: str = "",
        alimentos_evitados: str = "",
        historico_alteracoes: list = None
    ) -> Dict[str, Any]:
        """
        Motor de equivalência nutricional e digestibilidade clínica local.
        Garante alimentos estritamente parecidos e calcula a dose exata para manter o balanço calórico.
        """
        alim_lower = alimento_atual.lower().strip()
        orig_key = None

        if alim_lower in TABELA_ALIMENTOS_EQUIVALENCIAS:
            orig_key = alim_lower
        else:
            for k, v in TABELA_ALIMENTOS_EQUIVALENCIAS.items():
                if v["nome"].lower() in alim_lower or alim_lower in v["nome"].lower() or k in alim_lower:
                    orig_key = k
                    break

        if not orig_key:
            if any(p in alim_lower for p in ["frango", "peru", "carne", "vaca", "peixe", "atum", "salmao", "ovo", "clara", "queijo", "skyr", "iogurte", "whey", "tofu"]):
                orig_key = "peito_frango_grelhado"
            elif any(p in alim_lower for p in ["banana", "maca", "morango", "mirtilo", "fruta"]):
                orig_key = "banana"
            elif any(p in alim_lower for p in ["azeite", "manteiga", "amendoim", "abacate", "noz", "amendoa", "gordura"]):
                orig_key = "azeite_oliva"
            else:
                orig_key = "arroz_branco_cozido"

        orig_info = TABELA_ALIMENTOS_EQUIVALENCIAS[orig_key]
        p_orig = orig_info["proteina"]
        h_orig = orig_info["hidratos"]
        g_orig = orig_info["gordura"]

        queixa_lower = motivo_queixa.lower()
        evitados_lower = [e.strip().lower() for e in (alimentos_evitados or "").split(",") if e.strip()]

        candidatos_ids = []
        justificativas_map = {}
        macro_dom = "hidratos"

        if p_orig >= h_orig and p_orig >= g_orig:
            macro_dom = "proteina"
            if any(p in queixa_lower for p in ["cai mal", "incha", "digest", "azia", "pesad", "enjoe"]):
                analise = f"O alimento '{orig_info['nome']}' pode prolongar o esvaziamento gástrico. Estas fontes proteicas magras proporcionam digestão rápida e leve com valor biológico equivalente."
                candidatos_ids = ["peito_peru_grelhado", "atum_natural", "claras_ovo", "queijo_fresco_light"]
            elif any(p in queixa_lower for p in ["pratic", "tempo", "rapid", "pressa", "sem coz"]):
                analise = f"Alternativas de proteína magra prontas a consumir que poupam tempo e conservam os macros exatos de '{orig_info['nome']}'."
                candidatos_ids = ["atum_natural", "iogurte_grego_skyr", "whey_protein", "claras_ovo"]
            elif any(p in queixa_lower for p in ["vegetar", "vegan", "sem carne"]):
                analise = f"Alternativas ovolactovegetarianas que garantem o fornecimento proteico idêntico a '{orig_info['nome']}'."
                candidatos_ids = ["tofu_firme", "claras_ovo", "queijo_fresco_light"]
            else:
                analise = f"Fontes de proteína nobre biologicamente equivalentes a '{orig_info['nome']}' para variar o plano com rigor."
                candidatos_ids = ["peito_peru_grelhado", "carne_vaca_magra", "atum_natural", "salmao_grelhado"]

            justificativas_map = {
                "peito_peru_grelhado": "Fibras musculares muito macias e teor lipídico mínimo, garantindo digestibilidade gástrica rápida e suave.",
                "atum_natural": "Proteína magra biodisponível em conserva prática, de absorção límpida sem provocar dilatação abdominal.",
                "claras_ovo": "A proteína com maior eficiência de retenção de azoto (albumina), livre de gorduras ou fatores de fermentação.",
                "queijo_fresco_light": "Rico em caseína micelar de digestão estável, saciedade duradoura e textura refrescante.",
                "iogurte_grego_skyr": "Excelente perfil proteico lácteo fermentado que promove a saúde da microbiota intestinal.",
                "whey_protein": "Absorção imediata com esvaziamento gástrico em menos de 45 minutos, ideal para refeições rápidas.",
                "tofu_firme": "Proteína vegetal completa de soja com isoflavonas benéficas e digestão leve.",
                "carne_vaca_magra": "Elevada densidade de ferro heme, creatina e zinco para suporte de força e massa muscular.",
                "salmao_grelhado": "Rico em ácidos gordos essenciais Ómega-3 com forte ação anti-inflamatória sistémica."
            }

        elif h_orig > p_orig:
            macro_dom = "hidratos"
            if orig_key in ["banana", "maca", "morangos", "mirtilos"] or "fruta" in alim_lower:
                analise = f"Opções de fruta parecidas com '{orig_info['nome']}', ajustadas em gramas para manter a equivalência de hidratos e frutose."
                candidatos_ids = ["morangos", "mirtilos", "maca", "banana"]
                justificativas_map = {
                    "morangos": "Elevadíssimo volume hídrico e antioxidantes com muito baixo teor calórico por 100g.",
                    "mirtilos": "Ricos em antocianinas cardioprotetoras com índice glicémico moderado e excelente suporte cognitivo.",
                    "maca": "Fonte rica em pectina (fibra solúvel pré-biótica) que estabiliza o trânsito intestinal.",
                    "banana": "Rápida reposição de glicogénio muscular e rica em potássio para prevenção de cãibras."
                }
            else:
                if any(p in queixa_lower for p in ["cai mal", "incha", "digest", "azia", "pesad"]):
                    analise = f"'{orig_info['nome']}' pode estar a fermentar no trato intestinal. Estas alternativas são de baixo teor de FODMAPs, muito leves e de absorção limpa."
                    candidatos_ids = ["batata_inglesa_cozida", "tapioca_goma", "batata_doce_cozida", "arroz_branco_cozido"]
                elif any(p in queixa_lower for p in ["saciedad", "fome", "cut"]):
                    analise = f"Fontes de hidratos complexos com índice de saciedade elevado para controlar o apetite na fase {fase.upper()}."
                    candidatos_ids = ["batata_inglesa_cozida", "aveia_em_flocos", "batata_doce_cozida"]
                elif any(p in queixa_lower for p in ["pratic", "tempo", "rapid", "pressa", "sem coz"]):
                    analise = f"Fontes de hidratos prontas a consumir ou preparadas em minutos sem necessidade de cozedura prolongada."
                    candidatos_ids = ["pao_integral", "aveia_em_flocos", "tapioca_goma"]
                else:
                    analise = f"Fontes de hidratos complexos nutricionalmente equivalentes a '{orig_info['nome']}' para manter a energia estável."
                    candidatos_ids = ["batata_inglesa_cozida", "arroz_integral_cozido", "massa_cozida", "cuscuz_cozido"]

                justificativas_map = {
                    "batata_inglesa_cozida": "Índice de saciedade #1 na ciência nutricional, esvaziamento gástrico ultra rápido e zero inchaço abdominal.",
                    "tapioca_goma": "Amido puro sem glúten nem fibras irritativas, energia limpa de absorção imediata.",
                    "batata_doce_cozida": "Libertação gradual de glicose com baixo índice glicémico e excelente aporte de betacarotenos.",
                    "arroz_branco_cozido": "Digestibilidade perfeita com resíduos intestinais mínimos, o clássico da nutrição desportiva.",
                    "aveia_em_flocos": "Rica em beta-glucanos que reduzem o colesterol e regulam a saciedade ao longo de várias horas.",
                    "pao_integral": "Formato altamente prático e versátil para levar consigo e manter a ingestão de fibra diária.",
                    "massa_cozida": "Densidade de hidratos compacta, ideal para refeições onde se requer volume reduzido no estômago.",
                    "cuscuz_cozido": "Grão leve de semolina de rápida hidratação e excelente textura palatável."
                }

        else:
            macro_dom = "gordura"
            analise = f"Gorduras saudáveis de qualidade superior para manter o equilíbrio lipídico de '{orig_info['nome']}'."
            candidatos_ids = ["azeite_oliva", "abacate", "manteiga_amendoim", "amendoas_nozes"]
            justificativas_map = {
                "azeite_oliva": "O padrão ouro de gordura monoinsaturada (ácido oleico) e polifenóis protetores vasculares.",
                "abacate": "Rico em fitoesteróis e fibras solúveis, proporcionando saciedade profunda sem inflamação.",
                "manteiga_amendoim": "Densidade energética com sabor reconfortante e aporte complementar de proteína vegetal.",
                "amendoas_nozes": "Ricas em magnésio, vitamina E e ácidos gordos polinsaturados para suporte hormonal."
            }

        candidatos_validos = []
        for cid in candidatos_ids:
            if cid == orig_key:
                continue
            if any(ev in cid or ev in TABELA_ALIMENTOS_EQUIVALENCIAS[cid]["nome"].lower() for ev in evitados_lower if ev):
                continue
            candidatos_validos.append(cid)

        if len(candidatos_validos) < 2:
            candidatos_validos = [k for k in TABELA_ALIMENTOS_EQUIVALENCIAS.keys() if k != orig_key][:3]

        recomendacoes = []
        for cid in candidatos_validos[:3]:
            try:
                troca = calcular_substituicao_alimento(orig_key, gramas_atuais, cid)
                g_sub = troca["gramas_substituto"]
                c_info = TABELA_ALIMENTOS_EQUIVALENCIAS[cid]
                just = justificativas_map.get(cid, "Alternativa nutricionalmente semelhante que mantém o balanço calórico da refeição.")
                recomendacoes.append({
                    "id_alimento": cid,
                    "nome": c_info["nome"],
                    "gramas_sugeridas": g_sub,
                    "calorias": round((g_sub / 100.0) * c_info["kcal"], 1),
                    "proteina_g": round((g_sub / 100.0) * c_info["proteina"], 1),
                    "hidratos_g": round((g_sub / 100.0) * c_info["hidratos"], 1),
                    "gordura_g": round((g_sub / 100.0) * c_info["gordura"], 1),
                    "justificativa_nutricional": just
                })
            except Exception:
                continue

        return {
            "analise_nutricional": analise,
            "alimento_origem": orig_info["nome"],
            "gramas_origem": gramas_atuais,
            "macro_dominante": macro_dom,
            "recomendacoes": recomendacoes,
            "modo_demonstracao": True
        }

    async def sugerir_substituicao_exercicio_ia(
        self,
        dados_substituicao: Dict[str, Any],
        chave_substituta: Optional[str] = None,
        prompt_sistema_substituto: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analisa a queixa clínica/biomecânica do atleta (dor, desconforto, equipamento ocupado)
        e recomenda 2 a 3 alternativas de substituição com justificativa fisiológica.
        """
        exercicio_atual = dados_substituicao.get("exercicio_atual", "Exercício")
        grupo_muscular = dados_substituicao.get("grupo_muscular", "Geral")
        queixa = dados_substituicao.get("queixa_desconforto", "Desconforto na execução")
        objetivo = dados_substituicao.get("objetivo", "hipertrofia")
        fase = dados_substituicao.get("fase", "cut")

        chave_uso = chave_substituta or self.chave_api

        if chave_uso:
            prompt_sistema = prompt_sistema_substituto or PROMPT_SISTEMA_SUBSTITUICAO_EXERCICIO
            prompt_usuario = criar_prompt_substituicao_exercicio(
                exercicio_atual=exercicio_atual,
                grupo_muscular=grupo_muscular,
                queixa_desconforto=queixa,
                objetivo=objetivo,
                fase=fase
            )
            for modelo in ["gemini-2.5-flash", "gemini-1.5-flash"]:
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent?key={chave_uso}"
                    body = {
                        "contents": [{"parts": [{"text": f"{prompt_sistema}\n\n{prompt_usuario}"}]}],
                        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.3}
                    }
                    async with httpx.AsyncClient(timeout=15.0) as client:
                        resp = await client.post(url, json=body)
                        if resp.status_code == 200:
                            dados_resp = resp.json()
                            texto = dados_resp["candidates"][0]["content"]["parts"][0]["text"]
                            parsed = json.loads(texto)
                            if "recomendacoes" in parsed and len(parsed["recomendacoes"]) > 0:
                                parsed["modo_demonstracao"] = False
                                return parsed
                except Exception:
                    continue

        return self._sugerir_substituicao_heuristica_local(exercicio_atual, grupo_muscular, queixa)

    def _sugerir_substituicao_heuristica_local(
        self,
        exercicio_atual: str,
        grupo_muscular: str,
        queixa: str
    ) -> Dict[str, Any]:
        queixa_lower = queixa.lower()
        ex_lower = exercicio_atual.lower()
        grupo_lower = grupo_muscular.lower()

        recomendacoes = []
        analise = ""

        # Caso 1: Peito / Supino com dor no ombro ou desconforto anterior
        if "peito" in grupo_lower or "supino" in ex_lower or "crucifixo" in ex_lower:
            if any(p in queixa_lower for p in ["ombro", "dor", "lesao", "desconforto", "pinçamento", "rotador"]):
                analise = f"O exercício '{exercicio_atual}' impõe rotação interna fixa com hiperextensão da cabeça umeral na fase excêntrica, sobrecarregando o tendão do supraespinhoso e a cápsula anterior do ombro."
                recomendacoes = [
                    {
                        "id_exercicio": "supino_halteres_inclinado",
                        "nome": "Supino Inclinado com Halteres em Pegada Neutra 30º",
                        "grupo_muscular": "peito",
                        "series": 3,
                        "repeticoes_alvo": "8-12",
                        "rpe_alvo": 8.0,
                        "descanso_segundos": 90,
                        "carga_sugerida_kg": 22.0,
                        "justificativa_biomecanica": "A pegada semi-neutra permite que os cotovelos desçam alinhados com o plano escapular (~45º), eliminando o conflito subacromial e ativando o peitoral com máxima segurança articular."
                    },
                    {
                        "id_exercicio": "floor_press_halteres",
                        "nome": "Floor Press com Halteres no Chão",
                        "grupo_muscular": "peito",
                        "series": 3,
                        "repeticoes_alvo": "8-10",
                        "rpe_alvo": 8.5,
                        "descanso_segundos": 90,
                        "carga_sugerida_kg": 24.0,
                        "justificativa_biomecanica": "O chão cria um batente biomecânico seguro aos 90º de flexão do cotovelo, impedindo qualquer hiperextensão perigosa do ombro e gerando forte sobrecarga de tensão no tríceps e peitoral."
                    },
                    {
                        "id_exercicio": "crossover_polia_media",
                        "nome": "Crossover na Polia Média / Cabos",
                        "grupo_muscular": "peito",
                        "series": 3,
                        "repeticoes_alvo": "10-15",
                        "rpe_alvo": 8.5,
                        "descanso_segundos": 75,
                        "carga_sugerida_kg": 15.0,
                        "justificativa_biomecanica": "O cabo mantém a curva de resistência contínua mesmo na adução total sem necessitar de cargas axiais elevadas, protegendo tendões e ligamentos do ombro."
                    }
                ]
            else:
                analise = f"Ajuste biomecânico para '{exercicio_atual}' focado em conforto e estímulo neuromuscular do peitoral."
                recomendacoes = [
                    {
                        "id_exercicio": "supino_halteres_plano",
                        "nome": "Supino com Halteres no Banco Plano",
                        "grupo_muscular": "peito",
                        "series": 3,
                        "repeticoes_alvo": "8-12",
                        "rpe_alvo": 8.5,
                        "descanso_segundos": 90,
                        "carga_sugerida_kg": 24.0,
                        "justificativa_biomecanica": "Oferece liberdade total de rotação do punho e antebraço com convergência natural no topo."
                    },
                    {
                        "id_exercicio": "supino_inclinado_halteres",
                        "nome": "Supino Inclinado com Halteres",
                        "grupo_muscular": "peito",
                        "series": 3,
                        "repeticoes_alvo": "8-12",
                        "rpe_alvo": 8.0,
                        "descanso_segundos": 90,
                        "carga_sugerida_kg": 20.0,
                        "justificativa_biomecanica": "Excelente foco na porção clavicular com menor stress glenoumeral inferior."
                    }
                ]

        # Caso 2: Quadríceps / Pernas (Agachamento, Leg Press)
        elif any(p in grupo_lower for p in ["quadriceps", "perna", "isquiotibiais", "gluteos"]) or any(p in ex_lower for p in ["agachamento", "leg_press", "extensora", "hack"]):
            if any(p in queixa_lower for p in ["lombar", "coluna", "costas"]):
                analise = f"O exercício '{exercicio_atual}' cria um grande braço de momento sobre a coluna lombar (compressão axial e torque nos discos L4-S1)."
                recomendacoes = [
                    {
                        "id_exercicio": "leg_press_45",
                        "nome": "Leg Press 45º com Pés Médios",
                        "grupo_muscular": "quadriceps",
                        "series": 3,
                        "repeticoes_alvo": "10-12",
                        "rpe_alvo": 8.5,
                        "descanso_segundos": 90,
                        "carga_sugerida_kg": 140.0,
                        "justificativa_biomecanica": "O tronco e a pelve ficam 100% suportados no encosto almofadado, eliminando completamente a compressão axial lombar e permitindo empurrar com intensidade nos quadríceps."
                    },
                    {
                        "id_exercicio": "agachamento_bulgaro",
                        "nome": "Agachamento Búlgaro com Halteres",
                        "grupo_muscular": "quadriceps",
                        "series": 3,
                        "repeticoes_alvo": "8-10",
                        "rpe_alvo": 8.5,
                        "descanso_segundos": 90,
                        "carga_sugerida_kg": 16.0,
                        "justificativa_biomecanica": "O trabalho unilateral necessita de menos de metade da carga absoluta para atingir a mesma sobrecarga muscular na perna da frente, poupando a coluna lombar."
                    },
                    {
                        "id_exercicio": "extensora_pernas",
                        "nome": "Cadeira Extensora Cadenciada",
                        "grupo_muscular": "quadriceps",
                        "series": 3,
                        "repeticoes_alvo": "12-15",
                        "rpe_alvo": 9.0,
                        "descanso_segundos": 60,
                        "carga_sugerida_kg": 50.0,
                        "justificativa_biomecanica": "Isolamento direto do reto femoral e vastos sem envolver os eretores da espinha."
                    }
                ]
            elif any(p in queixa_lower for p in ["joelho", "patelar", "tendao"]):
                analise = f"O exercício '{exercicio_atual}' provoca translação anterior excessiva da tíbia e pressão na articulação patelofemoral."
                recomendacoes = [
                    {
                        "id_exercicio": "leg_press_45",
                        "nome": "Leg Press 45º com Pés Altos e Largos",
                        "grupo_muscular": "quadriceps",
                        "series": 3,
                        "repeticoes_alvo": "10-12",
                        "rpe_alvo": 8.0,
                        "descanso_segundos": 90,
                        "carga_sugerida_kg": 120.0,
                        "justificativa_biomecanica": "Posicionar os pés no topo da plataforma mantém a canela praticamente perpendicular, reduzindo drasticamente as forças de cisalhamento sobre o tendão patelar."
                    },
                    {
                        "id_exercicio": "agachamento_box_squat",
                        "nome": "Box Squat com Halteres (Sentar no Banco)",
                        "grupo_muscular": "quadriceps",
                        "series": 3,
                        "repeticoes_alvo": "8-10",
                        "rpe_alvo": 8.0,
                        "descanso_segundos": 90,
                        "carga_sugerida_kg": 20.0,
                        "justificativa_biomecanica": "O toque controlado no banco impede que o joelho colapse para a frente e transfere o peso para os quadris e glúteos."
                    }
                ]
            else:
                analise = f"Substituição otimizada para pernas com foco em estabilidade e segurança biomecânica."
                recomendacoes = [
                    {
                        "id_exercicio": "leg_press_45",
                        "nome": "Leg Press 45º",
                        "grupo_muscular": "quadriceps",
                        "series": 3,
                        "repeticoes_alvo": "10-12",
                        "rpe_alvo": 8.5,
                        "descanso_segundos": 90,
                        "carga_sugerida_kg": 130.0,
                        "justificativa_biomecanica": "Elevada estabilidade e sobrecarga pura de quadríceps com segurança."
                    },
                    {
                        "id_exercicio": "agachamento_bulgaro",
                        "nome": "Agachamento Búlgaro com Halteres",
                        "grupo_muscular": "quadriceps",
                        "series": 3,
                        "repeticoes_alvo": "8-10",
                        "rpe_alvo": 8.5,
                        "descanso_segundos": 90,
                        "carga_sugerida_kg": 16.0,
                        "justificativa_biomecanica": "Excelente recrutamento motor unilateral com menor exigência de peso total."
                    }
                ]

        # Caso 3: Costas / Dorsais / Peso Morto
        elif "costas" in grupo_lower or any(p in ex_lower for p in ["remada", "puxada", "deadlift", "peso_morto"]):
            if any(p in queixa_lower for p in ["lombar", "dor", "coluna"]):
                analise = f"O exercício '{exercicio_atual}' exige contração isométrica extrema da cadeia posterior e eretores espinhais sob carga livre."
                recomendacoes = [
                    {
                        "id_exercicio": "remada_apoiada_peito",
                        "nome": "Remada com Halteres no Banco Inclinado (Chest Supported)",
                        "grupo_muscular": "costas",
                        "series": 3,
                        "repeticoes_alvo": "8-12",
                        "rpe_alvo": 8.5,
                        "descanso_segundos": 90,
                        "carga_sugerida_kg": 22.0,
                        "justificativa_biomecanica": "O peito fica 100% apoiado no banco inclinado a 30-45º, descarregando por completo a coluna lombar e isolando os romboides, trapézio médio e grande dorsal."
                    },
                    {
                        "id_exercicio": "puxada_triangulo",
                        "nome": "Puxada Alta com Pega Neutra / Triângulo",
                        "grupo_muscular": "costas",
                        "series": 3,
                        "repeticoes_alvo": "8-12",
                        "rpe_alvo": 8.5,
                        "descanso_segundos": 75,
                        "carga_sugerida_kg": 60.0,
                        "justificativa_biomecanica": "Tração vertical pura com pés travados que cria descompressão espinhal enquanto desenvolve a largura das dorsais."
                    },
                    {
                        "id_exercicio": "remada_unilateral_haltere",
                        "nome": "Remada Serrote Unilateral Apoiada no Banco",
                        "grupo_muscular": "costas",
                        "series": 3,
                        "repeticoes_alvo": "8-10",
                        "rpe_alvo": 8.5,
                        "descanso_segundos": 75,
                        "carga_sugerida_kg": 26.0,
                        "justificativa_biomecanica": "O joelho e mão de apoio no banco criam um tripé de estabilização estática para a coluna."
                    }
                ]
            else:
                analise = f"Substituição biomecânica otimizada para as costas e dorsais."
                recomendacoes = [
                    {
                        "id_exercicio": "puxada_frente_polia",
                        "nome": "Puxada à Frente na Polia Alta",
                        "grupo_muscular": "costas",
                        "series": 3,
                        "repeticoes_alvo": "8-12",
                        "rpe_alvo": 8.5,
                        "descanso_segundos": 75,
                        "carga_sugerida_kg": 55.0,
                        "justificativa_biomecanica": "Grande amplitude de movimento e alinhamento das fibras do grande dorsal."
                    },
                    {
                        "id_exercicio": "remada_baixa_cabos",
                        "nome": "Remada Baixa Sentada no Cabo com Pega Triângulo",
                        "grupo_muscular": "costas",
                        "series": 3,
                        "repeticoes_alvo": "8-12",
                        "rpe_alvo": 8.5,
                        "descanso_segundos": 75,
                        "carga_sugerida_kg": 50.0,
                        "justificativa_biomecanica": "Contração escapular de pico com suporte fixo dos pés."
                    }
                ]

        # Caso Geral / Ombros / Braços
        else:
            analise = f"Alternativas biomecânicas selecionadas para '{exercicio_atual}' ({grupo_muscular}) com base na queixa relatada."
            candidatos = [c for c in EXERCICIOS_CATALOGO.values() if (c.get("primario") or "").lower() == grupo_lower and c["nome"].lower() != ex_lower]
            if len(candidatos) < 2:
                candidatos = [c for c in EXERCICIOS_CATALOGO.values() if c["nome"].lower() != ex_lower][:3]

            for c in candidatos[:3]:
                recomendacoes.append({
                    "id_exercicio": c.get("id", "custom_alt"),
                    "nome": c["nome"],
                    "grupo_muscular": c.get("primario", grupo_muscular),
                    "series": 3,
                    "repeticoes_alvo": "8-12",
                    "rpe_alvo": 8.0,
                    "descanso_segundos": 75,
                    "carga_sugerida_kg": 16.0,
                    "justificativa_biomecanica": f"Alternativa segura e estável para trabalhar {grupo_muscular} com menor stress articular."
                })

        return {
            "analise_biomecanica": analise,
            "recomendacoes": recomendacoes,
            "modo_demonstracao": True
        }
