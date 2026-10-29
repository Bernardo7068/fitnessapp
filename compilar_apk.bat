@echo off
chcp 65001 >nul
echo ========================================================
echo   BInov Fitness - Compilação de APK Mobile (Android)
echo ========================================================
echo.
echo 1. A compilar frontend e sincronizar com o Capacitor...
cd interface
call npm run mobile:sync
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Falha ao compilar o frontend!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo 2. A compilar APK nativo via Gradle...
cd android
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
    echo [AVISO] Para gerar o ficheiro .apk diretamente no terminal
    echo é necessário ter o JDK e o Android SDK instalados.
    echo.
    echo Alternativa mais simples (Interface Visual):
    echo Podes abrir o projeto no Android Studio executando:
    echo   cd interface ^&^& npx cap open android
    echo E clicar em: Build -^> Build Bundle(s) / APK(s) -^> Build APK(s)
)
echo.
pause
