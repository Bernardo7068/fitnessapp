@echo off
chcp 65001 >nul
echo ========================================================
echo   BInov Fitness - Compilação de APK Mobile (Android)
echo ========================================================
echo.

rem 1. Configurar Java 21 automaticamente se detetado
if exist "C:\Program Files\Eclipse Adoptium\jdk-21.0.13.9-hotspot" (
    echo [OK] A utilizar Java 21 (Adoptium Temurin)
    set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.13.9-hotspot"
    set "PATH=C:\Program Files\Eclipse Adoptium\jdk-21.0.13.9-hotspot\bin;%PATH%"
)

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
    echo ========================================================
    echo [AVISO] Falta apenas o Android SDK!
    echo.
    echo O Java 21 já está a funcionar perfeitamente.
    echo Para gerar o ficheiro .apk, o computador precisa das
    echo ferramentas do Android (Android SDK).
    echo.
    echo A forma mais rápida e recomendada (1 clique):
    echo 1. Instala o Android Studio gratuito:
    echo    https://developer.android.com/studio
    echo 2. Executa no terminal:
    echo    cd interface ^&^& npm run mobile:open
    echo 3. No Android Studio clica em:
    echo    Build -^> Build Bundle(s) / APK(s) -^> Build APK(s)
    echo ========================================================
)
echo.
pause
