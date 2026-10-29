@echo off
echo =======================================================
echo    INICIANDO MOTOR ADAPTATIVO (TREINOS E DIETA)
echo =======================================================
echo.

echo 1. A iniciar o Servidor Python (FastAPI)...
start "Servidor Python (FastAPI)" cmd /k "cd servidor && python iniciar_servidor.py"

timeout /t 2 /nobreak >nul

echo 2. A iniciar a Interface React (Vite)...
start "Interface React (Vite)" cmd /k "cd interface && npm run dev"

echo.
echo Tudo iniciado com sucesso!
echo Servidor:   http://localhost:8000 (Docs: http://localhost:8000/docs)
echo Interface:  http://localhost:5173
echo.
echo Para aceder pelo Telemovel/Celular na mesma rede Wi-Fi:
echo Abre no navegador do tele: http://192.168.1.74:5173
echo =======================================================
