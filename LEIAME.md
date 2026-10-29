# ⚡ BInov — Plataforma Adaptativa de Fitness, Alta Performance e Biohacking

![BInov Badge](https://img.shields.io/badge/BInov-Fitness%20%26%20Biohacking-6366f1?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18%20(TypeScript)-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4+-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-Base%20de%20Dados-003B57?style=for-the-badge&logo=sqlite&logoColor=white)

Uma plataforma completa para planeamento, periodização e otimização de treino, nutrição metabólica e biohacking natural. Combina um **Motor Matemático Determinístico** (baseado em evidência científica e leis termodinâmicas) com um **Motor Científico Adaptativo** para diagnóstico e prescrição de protocolos de alta performance.

---

## 🎯 Módulos Principais

### 1. 📐 Motor Científico & Algoritmo Adaptativo
* **Projetor de Metas em Fases:** Modelação de fases fisiológicas (*Mini-Cut*, *Consolidação*, *Lean Bulk*, *Cut Final*), projetando com precisão o tempo necessário para alcançar a meta com base na taxa biológica de síntese muscular natural (modelos Alan Aragon & Eric Helms).
* **Calibração Semanal Dinâmica:** Ajuste calórico baseado na variação real de peso ($\Delta W$), adesão à dieta e balanço de 7700 kcal por kg de tecido adiposo.
* **Sobrecarga Progressiva (*Double Progression*):** Monitorização de faixas de repetições e RPE. Recomendações automáticas de incrementos de carga ou protocolos de **Deload** após estagnações com fadiga acumulada.

### 2. 🏋️‍♂️ Gestão e Monitorização de Treinos
* Divisão semanal estruturada (*Push/Pull/Legs*, *Upper/Lower*, *Fullbody* ou personalizada).
* Registo em tempo real de cargas, repetições, RPE e notas técnicas por série.
* Monitorização de volume muscular efetivo (MEV, MAV, MRV).

### 3. 🥗 Nutrição & Equilíbrio Metabólico
* Cálculo automatizado de TMB, TDEE e macronutrientes adaptados ao objetivo e nível de atividade.
* Repartição por refeições diárias e tabela integrada de equivalências alimentares.
* Análise qualitativa de micronutrientes e hidratação.

### 4. 🧬 Biohacking & Otimização Hormonal Natural
* **Enciclopédia Científica (43+ substâncias):** Dossiês completos cobrindo Fitoandrógenos & Eixo HPG, Adaptógenos & Eixo HPA, Minerais & Co-fatores de Otimização e Suporte Cognitivo & Sono.
* **Fichas Técnicas:** Mecanismo de ação, dosagem terapêutica, *timing* ideal, sinergias comprovadas e contraindicações.
* **Protocolos Personalizados:** Criação e acompanhamento de ciclos (semanas ON vs. semanas OFF) e rituais por blocos horários (Manhã, Pré-Treino, Pós-Treino, Noite).
* **Monitor de Biofeedback Diário:** Avaliação de Energia, Qualidade do Sono, Libido, Foco Cognitivo, Recuperação e Stress.
* **Comparativo de Evolução:** Gráficos e correlação estatística de ganhos de força e volume corporal com e sem o protocolo ativo.
* **Adição de Substâncias Personalizadas:** Suporte para cadastrar novos compostos e dosagens customizadas.

### 5. 📸 Avaliação Física & Composição Corporal
* Registo de medidas corporais (peitoral, braços, cintura, coxas, gémeos).
* Histórico fotográfico de evolução com privacidade.
* Gráficos temporais de evolução de peso e estimativa de massa magra / gordura.

---

## 📁 Estrutura do Projeto

```
fitnessapp/
├── servidor/                         # Backend Python (FastAPI + SQLAlchemy)
│   ├── aplicacao/
│   │   ├── base_dados/               # Modelos ORM e conexão SQLite
│   │   ├── esquemas/                 # Validações e modelos Pydantic
│   │   ├── motor_matematico/         # Cálculos científicos (TMB, fases, treinos)
│   │   ├── ia_cloud/                 # Integração com Motor Científico Cloud (Gemini / OpenAI)
│   │   ├── rotas/                    # Endpoints REST (treinos, dieta, biohacking, perfil)
│   │   │   ├── rotas_biohacking.py   # Módulo completo de biohacking e substâncias
│   │   │   ├── rotas_treinos.py      # Gestão de treinos e sobrecarga
│   │   │   ├── rotas_dieta.py        # Gestão de macros e refeições
│   │   │   └── ...
│   │   └── principal.py              # Aplicação principal FastAPI, CORS e rotas
│   ├── iniciar_servidor.py           # Script rápido de inicialização do backend
│   ├── requisitos.txt                # Dependências Python
│   └── .env.example                  # Variáveis de ambiente de exemplo
│
├── interface/                        # Frontend React (TypeScript + Vite + Tailwind)
│   ├── src/
│   │   ├── componentes/
│   │   │   ├── GestorBiohacking.tsx  # Interface completa de Biohacking & Substâncias
│   │   │   ├── GestorTreinos.tsx     # Interface de treinos e execução de séries
│   │   │   ├── GestorNutricao.tsx    # Interface de macros e divisão de refeições
│   │   │   ├── ProjetorMetas.tsx     # Visualizador de fases e projeções futuras
│   │   │   ├── CheckinAdaptativo.tsx # Check-in semanal do atleta
│   │   │   ├── AvaliacaoFisica.tsx   # Registo antropométrico e fotos
│   │   │   └── DefinicoesMotor.tsx   # Configurações do motor e chaves de API
│   │   ├── servicos/                 # Cliente API tipado
│   │   ├── tipos/                    # Definições de tipos TypeScript
│   │   ├── Aplicacao.tsx             # Aplicação mestre e roteamento de abas
│   │   └── indice.css                # Tailwind CSS e regras de acessibilidade visual
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── iniciar_tudo.bat                  # Script Windows para arranque com 1 clique
├── iniciar_com_link_telemovel.bat    # Script para aceder remotamente pelo telemóvel
├── libertar_acesso_telemovel.bat     # Configuração rápida da firewall local
├── .env.example                      # Exemplo de configuração de ambiente raiz
├── .gitignore                        # Ficheiros ignorados pelo Git
├── README.md                         # Documentação principal
└── LEIAME.md                         # Documentação em Português
```

---

## 🚀 Instalação e Execução

### Pré-requisitos
* **Python 3.10+** instalado ([python.org](https://www.python.org/))
* **Node.js 18+** instalado ([nodejs.org](https://www.nodejs.org/))
* **Git** instalado ([git-scm.com](https://git-scm.com/))

---

### Opção 1: Início Rápido (Windows)
Dê um duplo clique no ficheiro `iniciar_tudo.bat`. Ele irá iniciar automaticamente:
1. O backend FastAPI em `http://localhost:8000`
2. A interface React em `http://localhost:5173`

---

### Opção 2: Início Manual por Terminal

#### 1. Configurar e Iniciar o Backend:
```bash
# Entrar na pasta do servidor
cd servidor

# Criar e ativar o ambiente virtual (recomendado)
python -m venv venv
# No Windows:
.\venv\Scripts\activate
# No Linux/Mac:
source venv/bin/activate

# Instalar dependências
pip install -r requisitos.txt

# (Opcional) Configurar variáveis de ambiente
cp .env.example .env

# Iniciar o servidor FastAPI
python iniciar_servidor.py
```
*O servidor estará ativo em `http://localhost:8000` com documentação interativa Swagger em `http://localhost:8000/docs`.*

#### 2. Configurar e Iniciar a Interface Frontend:
```bash
# Abrir um novo terminal e entrar na pasta da interface
cd interface

# Instalar dependências do Node
npm install

# Iniciar o servidor de desenvolvimento Vite
npm run dev
```
*Aceda no navegador a `http://localhost:5173`.*

---

## ⚠️ Avisos e Isenção de Responsabilidade

> [!WARNING]
> **Aplicação em Fase de Desenvolvimento / Testes:**  
> Esta plataforma foi desenhada como ferramenta de organização, planeamento e monitorização de dados de treino e nutrição.

> [!IMPORTANT]
> **Isenção Médica de Biohacking e Suplementação:**  
> As informações relativas a suplementos, vitaminas, fitoquímicos e fitoterápicos contidas no módulo de Biohacking têm caráter meramente educativo e informativo, baseadas em literatura científica pública. A utilização de qualquer substância é da exclusiva responsabilidade individual de cada utilizador. Recomenda-se vivamente a consulta prévia de um profissional de saúde qualificado (médico, endocrinologista ou nutricionista) antes de iniciar qualquer protocolo ou alteração na dieta.
