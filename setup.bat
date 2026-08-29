@echo off
title IAMTS Database Setup
echo ========================================
echo   IAMTS - Database Initialization
echo ========================================
echo.

REM Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check .env
if not exist .env (
    echo [ERROR] .env file not found.
    echo Copy .env.example to .env and configure your database credentials.
    pause
    exit /b 1
)

echo Running database initialization...
echo.
node database/init.js %*

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Database initialization failed.
    pause
    exit /b 1
)

echo.
echo Setup complete. You can now run start.bat to launch IAMTS.
pause
