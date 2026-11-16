@echo off
chcp 65001 >nul
echo ========================================================
echo         Запуск музыкального плеера Sonora
echo       (SoundCloud API + MildWave Recommendation)
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] Запуск бэкенда FastAPI (порт 8000)...
start "Sonora Backend (FastAPI)" cmd /k "cd /d %~dp0backend && set PYTHONPATH=%~dp0backend && python run.py"

timeout /t 2 /nobreak >nul

echo [2/2] Запуск фронтенда Vite (порт 5173)...
start "Sonora Frontend (React Vite)" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 2 /nobreak >nul

echo.
echo ========================================================
echo  Плеер запущен!
echo  Откройте браузер по адресу: http://localhost:5173
echo ========================================================
echo.
pause

