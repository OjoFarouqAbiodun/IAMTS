@echo off
title IAMTS - ICT Assets Maintenance System
setlocal
cd /d "%~dp0"

echo ============================================================
echo    IAMTS - ICT Assets Maintenance ^& Tracking System
echo    Standalone Portable Package
echo ============================================================
echo.

REM --- Locate the bundled Node runtime (either in node\ or on PATH)
set "NODE=%~dp0node\node.exe"
if exist "%NODE%" (
    echo [OK] Bundled Node.js runtime found.
) else (
    where node >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Node.js was not found.
        echo This package expects a bundled runtime in the "node" folder.
        echo Re-download the package or install Node.js from https://nodejs.org/
        pause
        exit /b 1
    )
    set "NODE=node"
)

REM --- Ensure a .env file exists
if not exist ".env" (
    echo [ERROR] .env file not found. Run install.bat first to configure it.
    pause
    exit /b 1
)

REM --- Confirm MySQL is reachable before starting
echo [CHECK] Verifying MySQL connection...
"%NODE%" -e "const m=require('mysql2/promise');(async()=>{try{const c=await m.createConnection({host:process.env.DB_HOST||'localhost',port:+process.env.DB_PORT||3306,user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||''});await c.query('SELECT 1');await c.end();console.log('[OK] MySQL connected.');}catch(e){console.error('[ERROR] Cannot reach MySQL: '+e.code);process.exit(1)}})()" < NUL
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] MySQL is not reachable with the credentials in your .env file.
    echo Please make sure MySQL is running and the credentials are correct.
    pause
    exit /b 1
)

echo.
echo [START] Launching IAMTS...
echo (Keep this window open. Close it to stop the server.)
echo.

REM Open the browser shortly after startup
start "" "http://localhost:3000"

"%NODE%" server\app.js < NUL
