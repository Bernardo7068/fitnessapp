"""
Script de Teste de Validação dos Motores Matemáticos com os dados reais do Utilizador:
Homem, 22 anos, 172cm, 70kg, 20% BF -> Meta: 85kg, 15% BF.
"""

from aplicacao.motor_matematico import (
    calcular_composicao_e_tdee,
    projetar_trajetoria_meta,
    analisar_e_ajustar_dieta
)

def executar_testes():
    print("=================================================================")
    print("1. TESTE DA META REAL DO UTILIZADOR: 70kg 20% BF -> 85kg 15% BF")
    print("=================================================================")
    proj = projetar_trajetoria_meta(
        peso_atual=70.0,
        altura_cm=172.0,
        idade=22,
        sexo="masculino",
        bf_atual=20.0,
        peso_alvo=85.0,
        bf_alvo=15.0,
        nivel_experiencia="intermediario",
        nivel_atividade="moderado"
    )

    print(f"Massa Magra Atual: {proj.massa_magra_atual_kg} kg | Massa Gorda Atual: {proj.massa_gorda_atual_kg} kg")
    print(f"Massa Magra Alvo: {proj.massa_magra_alvo_kg} kg | Massa Gorda Alvo: {proj.massa_gorda_alvo_kg} kg")
    print(f"Delta Massa Magra: +{proj.massa_magra_a_ganhar_kg} kg")
    print(f"Delta Gordura: {proj.gordura_a_perder_kg} kg")
    print(f"Tempo Total Projetado: {proj.semanas_totais_estimadas} semanas (~{proj.meses_estimados} meses)")
    print(f"Número de Fases Ondulatórias: {len(proj.fases)}")
    print("\nDetalhamento das Fases:")
    for f in proj.fases:
        print(f"  [{f.numero_fase}] {f.nome_exibicao}")
        print(f"      Duração: {f.duracao_semanas} semanas | De {f.peso_inicio_kg}kg para {f.peso_fim_estimado_kg}kg ({f.bf_fim_estimado}% BF)")
        print(f"      Calorias: {f.calorias_diarias} kcal | P: {f.macros['proteina_g']}g, G: {f.macros['gordura_g']}g, HC: {f.macros['hidratos_g']}g")
        print(f"      Treino: {f.series_trabalho_semana} séries/sem | Cardio: {f.cardio_minutos_semana} min/sem")
        print(f"      Foco: {f.foco_treino}\n")

    assert proj.semanas_totais_estimadas in range(70, 95), f"Semanas fora do esperado: {proj.semanas_totais_estimadas}"
    assert len(proj.fases) == 5, f"Esperadas 5 fases, obteve {len(proj.fases)}"

    print("=================================================================")
    print("2. TESTE DO MOTOR ADAPTATIVO: ENGORDAR SEM TER PROGRESSO NO TREINO")
    print("=================================================================")
    # Exemplo: Peso subiu de 72kg para 72.6kg (+0.6kg em 1 semana, +0.83%), mas força estagnou há 3 semanas
    diag = analisar_e_ajustar_dieta(
        peso_medio_anterior=72.0,
        peso_medio_atual=72.6,
        calorias_atuais=2800.0,
        fase_atual="bulk",
        adesao_percentual=90.0,
        progresso_treino="estagnado",
        tentativas_estagnadas_treino=3
    )

    print(f"Variação Peso: {diag.variacao_peso_kg:+.2f} kg ({diag.taxa_variacao_percentual:+.2f}%)")
    print(f"Alerta Ganho de Gordura Sem Progresso: {diag.alerta_ganho_gordura_sem_progresso}")
    print(f"Ajuste Calórico: {diag.diferenca_calorias} kcal (Novas: {diag.novas_calorias} kcal)")
    print(f"Ajuste Cardio: +{diag.ajuste_cardio_minutos} min/semana")
    print(f"Ajuste Treino Prescrito: {diag.ajuste_treino_recomendado}")
    print("\nAviso Proativo Emitido ao Utilizador:")
    print(diag.aviso_proativo_utilizador)

    assert diag.alerta_ganho_gordura_sem_progresso == True
    assert diag.diferenca_calorias == -250.0
    assert diag.ajuste_cardio_minutos == 35

    print("\n[OK] TODOS OS TESTES PASSARAM COM RIGOR ABSOLUTO!")

if __name__ == "__main__":
    executar_testes()
