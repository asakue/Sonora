@echo off
chcp 65001 >nul
echo ========================================================
echo         Запуск нативного плеера Sonora (Electron)
echo ========================================================
echo.

cd /d "%~dp0"

if exist "%~dp0frontend\dist_electron\win-unpacked\Sonora.exe" (
    echo [OK] Найден скомпилированный Sonora.exe!
    echo Запуск приложения...
    start "" "%~dp0frontend\dist_electron\win-unpacked\Sonora.exe"
) else (
    echo [Info] Сборка win-unpacked не найдена, запуск через electron:dev...
    cd /d "%~dp0frontend"
    npm run electron:dev
)

