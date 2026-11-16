# Запуск Sonora в PowerShell
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "        Запуск музыкального плеера Sonora" -ForegroundColor Cyan
Write-Host "      (SoundCloud API + MildWave Recommendation)" -ForegroundColor DarkCyan
Write-Host "========================================================" -ForegroundColor Cyan

Write-Host "[1/2] Запуск бэкенда FastAPI..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\backend'; `$env:PYTHONPATH='$Root\backend'; python run.py"

Start-Sleep -Seconds 2

Write-Host "[2/2] Запуск фронтенда React + Vite..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\frontend'; npm run dev"

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  Плеер запущен! Откройте: http://localhost:5173" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green

