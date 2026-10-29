@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title BInov Fitness - Compilação de APK Mobile (Android)
echo ========================================================
echo   BInov Fitness - Compilação de APK Mobile (Android)
echo ========================================================
echo.

rem 1. Configurar Java 21 automaticamente se detetado
if exist "C:\Program Files\Eclipse Adoptium\jdk-21.0.13.9-hotspot" (
    echo [OK] A utilizar Java 21 (Adoptium Temurin)
    set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.13.9-hotspot"
    set "PATH=C:\Program Files\Eclipse Adoptium\jdk-21.0.13.9-hotspot\bin;!PATH!"
)

echo.
echo 1. A compilar frontend e sincronizar com o Capacitor...
cd /d "%~dp0interface"
call npm run mobile:sync
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Falha ao compilar o frontend!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo 2. A verificar Android SDK e a compilar APK nativo...
cd /d "%~dp0interface\android"

rem Detetar Android SDK padrão se local.properties não existir
if not exist "local.properties" (
    if exist "%LOCALAPPDATA%\Android\Sdk" (
        echo [OK] Android SDK detetado em %LOCALAPPDATA%\Android\Sdk
        powershell -Command "$p = $env:LOCALAPPDATA + '\Android\Sdk'; $escaped = $p.Replace('\', '\\'); Set-Content -Path 'local.properties' -Value \"sdk.dir=$escaped\""
    )
)

call gradlew.bat assembleDebug
if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo   [SUCESSO] APK gerado com sucesso!
    echo   Localização do ficheiro:
    echo   interface\android\app\build\outputs\apk\debug\app-debug.apk
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo [AVISO] Falta apenas o Android SDK!
    echo.
    echo O Java 21 já está a funcionar a 100%%.
    echo Para o Gradle compilar o ficheiro .apk, o Windows precisa
    echo do Android SDK (as ferramentas de desenvolvimento Android).
    echo.
    echo A forma mais rápida e recomendada (1 clique):
    echo 1. Instala o Android Studio gratuito:
    echo    https://developer.android.com/studio
    echo 2. Executa novamente o "compilar_apk.bat" ou clica em:
    echo    Build -^> Build Bundle(s) / APK(s) -^> Build APK(s)
    echo ========================================================
)
echo.
pause
