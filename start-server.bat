
@echo off
title PC Maintenance Monitoring - Server

echo ==========================================
echo    PC MAINTENANCE MONITORING SYSTEM
echo ==========================================
echo.

echo [1/2] Menjalankan Backend...
start "PC Maintenance - Backend" cmd /k "cd /d D:\by\pc-maintenance\backend && npm run dev"

timeout /t 3 /nobreak >nul

echo [2/2] Menjalankan Frontend...
start "PC Maintenance - Frontend" cmd /k "cd /d D:\by\pc-maintenance\frontend && npm run dev -- --host 0.0.0.0"

echo.
echo ==========================================
echo Server sedang dijalankan.
echo.
echo Frontend : http://localhost:5173
echo Backend  : http://localhost:8000/api
echo ==========================================
echo.
pause
