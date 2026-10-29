@echo off
title Libertar Acesso ao Telemovel - Fitness App
echo ==========================================================
echo    CONFIGURAR FIREWALL DO WINDOWS PARA O TELEMOVEL
echo ==========================================================
echo.
echo A pedir autorizacao de Administrador para permitir o telemovel...
echo (Clica em "SIM" na janela que vai surgir no ecra)
echo.

powershell -Command "Start-Process cmd -ArgumentList '/c netsh advfirewall firewall add rule name=\"Fitness App (Telemovel)\" dir=in action=allow protocol=TCP localport=5173,8000 profile=any & netsh advfirewall firewall add rule name=\"Fitness App Node\" dir=in action=allow program=\"C:\Program Files\nodejs\node.exe\" profile=any' -Verb RunAs"

echo.
echo ==========================================================
echo Regras de rede aplicadas com sucesso!
echo.
echo Agora abre no navegador do telemovel:
echo   http://192.168.1.74:5173
echo ==========================================================
pause
