@echo off
title BInov Fitness - Acesso Telemovel Global
echo ==========================================================
echo    INICIANDO BINOV FITNESS COM LINK SEGURO (CLOUDFLARE)
echo ==========================================================
echo.

echo 1. A iniciar o Servidor Python (FastAPI)...
start "Servidor Python (FastAPI)" cmd /k "cd /d "%~dp0servidor" && python iniciar_servidor.py"

timeout /t 2 /nobreak >nul

echo 2. A iniciar a Interface React (Vite)...
start "Interface React (Vite)" cmd /k "cd /d "%~dp0interface" && npm run dev"

timeout /t 3 /nobreak >nul

echo 3. A gerar o Link Seguro HTTPS (Cloudflare Tunnel)...
echo.
echo ==========================================================
echo  INSTRUCOES PARA O TELEMOVEL:
echo  1. Procura a caixa abaixo com o link "https://...trycloudflare.com"
echo  2. Abre esse link no Chrome (Android) ou Safari (iPhone)
echo  3. Toca no botao verde "Instalar BInov no Telemovel"
echo ==========================================================
echo.
npx --yes cloudflared tunnel --url http://localhost:5173
pause
