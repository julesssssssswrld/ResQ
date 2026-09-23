@echo off
title ResQ Local Network Server
cd /d "%~dp0"

echo ======================================================
echo  ResQ Local Network Server Launcher
echo ======================================================

:: Verify Node.js is installed and available
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not found in your system PATH.
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

:: Clear any previous instance still holding port 3000
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    echo Port 3000 is occupied by PID %%a. Freeing port...
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo Starting server...
echo (Press Ctrl+C to stop or run stop.bat)
echo.

node server.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Server terminated unexpectedly.
    pause
)
