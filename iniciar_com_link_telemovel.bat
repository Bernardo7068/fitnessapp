@echo off
chcp 65001 >nul
title BInov Fitness - Acesso Telemovel Global
echo ==========================================================
echo    INICIANDO BINOV FITNESS COM LINK SEGURO (CLOUDFLARE)
echo ==========================================================
echo.

echo 1. A iniciar o Servidor Python (FastAPI)...
start "Servidor Python (FastAPI)" cmd /k "cd servidor && python iniciar_servidor.py"

timeout /t 2 /nobreak >nul

echo 2. A iniciar a Interface React (Vite)...
start "Interface React (Vite)" cmd /k "cd interface && npm run dev"

timeout /t 3 /nobreak >nul

echo 3. A gerar o Link Seguro HTTPS (Cloudflare Tunnel)...
echo.
echo ==========================================================
echo  INSTRUÇÕES PARA O TELEMÓVEL:
echo  1. Procura a caixa abaixo com o link "https://...trycloudflare.com"
echo  2. Abre esse link no Chrome (Android) ou Safari (iPhone)
echo  3. Toca no botão verde "Instalar BInov no Telemóvel"
echo ==========================================================
echo.
npx --yes cloudflared tunnel --url http://localhost:5173
pause
