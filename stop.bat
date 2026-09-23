@echo off
title Stop ResQ Server
cd /d "%~dp0"

echo ======================================================
echo  Stopping ResQ Local Network Server on Port 3000
echo ======================================================

set FOUND=0

for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    echo Terminating PID: %%a
    taskkill /F /PID %%a >nul 2>&1
    set FOUND=1
)

if "%FOUND%"=="1" (
    echo.
    echo [OK] ResQ Server stopped and port 3000 is now free.
) else (
    echo No active process found listening on port 3000.
)

echo.
ping 127.0.0.1 -n 2 >nul
exit /b 0
