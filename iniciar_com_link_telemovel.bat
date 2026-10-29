@echo off
title Fitness App - Acesso Telemovel Global
echo ==========================================================
echo    INICIANDO FIT APP COM LINK SEGURO PARA O TELEMOVEL
echo ==========================================================
echo.

echo 1. A iniciar o Servidor Python (FastAPI)...
start "Servidor Python (FastAPI)" cmd /k "cd servidor && python iniciar_servidor.py"

timeout /t 2 /nobreak >nul

echo 2. A iniciar a Interface React (Vite)...
start "Interface React (Vite)" cmd /k "cd interface && npm run dev"

timeout /t 3 /nobreak >nul

echo 3. A gerar link seguro direto para o teu Telemovel...
echo.
echo ==========================================================
echo  ABRE ESTE LINK NO TEU TELEMOVEL (Funciona em Wi-Fi e 4G/5G):
echo.
npx --yes localtunnel --port 5173 --subdomain fitness-bernardo-app
echo ==========================================================
pause
